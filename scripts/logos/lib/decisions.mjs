import fs from "node:fs";
import path from "node:path";
import { DECISIONS_SCHEMA, PRIORITIES } from "../config.mjs";
import { ensureDir, writeJsonAtomic } from "./paths.mjs";
import { buildSelected } from "./selected.mjs";
import { loadRegistry, saveRegistry } from "./registry.mjs";

export function readDecisions(file) {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  if (parsed.schema && parsed.schema !== DECISIONS_SCHEMA) {
    throw new Error(`Ожидалась схема ${DECISIONS_SCHEMA}`);
  }
  const decisions = Array.isArray(parsed) ? parsed : parsed.decisions;
  if (!Array.isArray(decisions)) throw new Error("В файле нет массива decisions");
  return { meta: parsed, decisions };
}

export function validateDecisions(decisions, registry) {
  const errors = [];
  const seen = new Set();
  const candidateIds = new Set(registry.candidates.map((item) => item.candidate_id));
  const orgs = new Map(registry.organizations.map((item) => [item.organization_id, item]));
  for (const decision of decisions) {
    const id = decision?.organization_id || "";
    const org = orgs.get(id);
    if (!org) {
      errors.push(`${id || "без id"}: нет такой организации`);
      continue;
    }
    if (seen.has(id)) errors.push(`${id}: решение повторяется`);
    seen.add(id);
    const editionIds = new Set(org.editions.map((item) => item.edition_id));
    for (const field of ["primary_candidate_id", "dark_candidate_id"]) {
      const value = decision[field];
      if (value && !candidateIds.has(value)) errors.push(`${id}: неизвестный кандидат ${value}`);
      if (value && registry.candidates.find((item) => item.candidate_id === value)?.organization_id !== id) {
        errors.push(`${id}: кандидат ${value} принадлежит другой организации`);
      }
    }
    for (const rejected of decision.rejected_candidate_ids || []) {
      if (!candidateIds.has(rejected)) errors.push(`${id}: неизвестный отклонённый кандидат ${rejected}`);
    }
    for (const historical of decision.historical || []) {
      if (!candidateIds.has(historical.candidate_id)) {
        errors.push(`${id}: неизвестный исторический кандидат ${historical.candidate_id}`);
      }
      for (const editionId of historical.edition_ids || []) {
        if (!editionIds.has(editionId)) errors.push(`${id}: выпуск ${editionId} не связан с организацией`);
      }
    }
    if (decision.priority && !PRIORITIES.includes(decision.priority)) {
      errors.push(`${id}: неизвестный приоритет ${decision.priority}`);
    }
  }
  return errors;
}

export function applyDecisionList(registry, decisions) {
  const now = new Date().toISOString();
  let updated = 0;
  const conflicts = [];
  for (const decision of decisions) {
    const org = registry.organizations.find((item) => item.organization_id === decision.organization_id);
    if (!org) continue;
    const current = org.decision || {};
    if (decision.base_updated_at && current.updated_at && current.updated_at > decision.base_updated_at) {
      conflicts.push({
        organization_id: org.organization_id,
        registry_updated_at: current.updated_at,
        export_base_updated_at: decision.base_updated_at,
      });
      continue;
    }
    const next = { ...current };
    if ("primary_candidate_id" in decision) next.primary_candidate_id = decision.primary_candidate_id || "";
    if ("dark_candidate_id" in decision) next.dark_candidate_id = decision.dark_candidate_id || "";
    if (Array.isArray(decision.historical)) {
      next.historical = decision.historical.map((item) => ({
        candidate_id: item.candidate_id,
        edition_ids: [...(item.edition_ids || [])],
      }));
    }
    if (Array.isArray(decision.rejected_candidate_ids)) {
      next.rejected_candidate_ids = [...decision.rejected_candidate_ids];
    }
    if ("needs_other" in decision) next.needs_other = Boolean(decision.needs_other);
    if ("priority" in decision) next.priority = decision.priority || "";
    if ("sort_order" in decision) {
      next.sort_order = Number.isInteger(decision.sort_order) ? decision.sort_order : null;
    }
    if ("comment" in decision) next.comment = decision.comment || "";
    if (next.primary_candidate_id && next.rejected_candidate_ids?.includes(next.primary_candidate_id)) {
      next.rejected_candidate_ids = next.rejected_candidate_ids.filter((id) => id !== next.primary_candidate_id);
    }
    next.updated_at = now;
    org.decision = next;
    updated += 1;
  }
  return { updated, conflicts };
}

export function applyDecisionFile(paths, file) {
  const registry = loadRegistry(paths);
  if (!registry) throw new Error("Реестр ещё не создан");
  const { decisions } = readDecisions(file);
  const errors = validateDecisions(decisions, registry);
  if (errors.length) {
    const error = new Error(errors.join("\n"));
    error.errors = errors;
    throw error;
  }
  const { updated, conflicts } = applyDecisionList(registry, decisions);
  saveRegistry(paths, registry);
  ensureDir(paths.decisions);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const audit = path.join(paths.decisions, `applied-${stamp}.json`);
  writeJsonAtomic(audit, {
    schema: DECISIONS_SCHEMA,
    applied_at: new Date().toISOString(),
    source_file: file,
    decisions,
    conflicts,
  });
  const selected = buildSelected(paths, registry);
  return { updated, conflicts, audit, registry, selected };
}
