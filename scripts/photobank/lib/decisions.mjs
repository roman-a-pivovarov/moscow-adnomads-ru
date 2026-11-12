import fs from "node:fs";
import path from "node:path";
import { PLACEMENTS, SCENE_TAGS, SIMILAR_DISTANCE, STATUSES } from "../config.mjs";
import { buildCatalog } from "./catalog.mjs";
import { similarPairs } from "./image.mjs";
import { ensureDir, resolvePaths, writeJsonAtomic } from "./paths.mjs";
import { loadRegistry, saveRegistry } from "./registry.mjs";

const STATUS_IDS = new Set(STATUSES.map((item) => item.id));
const PLACEMENT_IDS = new Set(PLACEMENTS.map((item) => item.id));
const SCENE_IDS = new Set(SCENE_TAGS.map((item) => item.id));

export function readDecisions(file) {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  const decisions = Array.isArray(parsed) ? parsed : parsed.decisions;
  if (!Array.isArray(decisions)) throw new Error("В файле нет массива decisions");
  return decisions;
}

export function validateDecisions(decisions, registry) {
  const errors = [];
  const seen = new Set();
  for (const decision of decisions) {
    const id = decision?.asset_id || "";
    if (!id || !registry.assets.some((asset) => asset.asset_id === id)) {
      errors.push(`${id || "без id"}: нет такого кадра в реестре`);
      continue;
    }
    if (seen.has(id)) errors.push(`${id}: решение повторяется`);
    seen.add(id);
    if (decision.status && !STATUS_IDS.has(decision.status)) {
      errors.push(`${id}: неизвестный статус ${decision.status}`);
    }
    for (const placement of decision.placements || []) {
      if (!PLACEMENT_IDS.has(placement)) errors.push(`${id}: неизвестное назначение ${placement}`);
    }
    for (const tag of decision.scene_tags || []) {
      if (!SCENE_IDS.has(tag)) errors.push(`${id}: неизвестный сюжет ${tag}`);
    }
  }
  return errors;
}

export function applyDecisionList(registry, decisions) {
  const now = new Date().toISOString();
  let updated = 0;
  for (const decision of decisions) {
    const asset = registry.assets.find((item) => item.asset_id === decision.asset_id);
    if (!asset) continue;
    const editorial = { ...(asset.editorial || {}) };
    if (decision.status) editorial.status = decision.status;
    if (Array.isArray(decision.placements)) editorial.placements = [...decision.placements];
    if (Array.isArray(decision.scene_tags)) editorial.scene_tags = [...decision.scene_tags];
    if ("caption" in decision) editorial.caption = decision.caption || "";
    if ("alt" in decision) editorial.alt = decision.alt || "";
    if ("comment" in decision) editorial.comment = decision.comment || "";
    if ("photographer" in decision) editorial.photographer = decision.photographer || "";
    editorial.updated_at = now;
    asset.editorial = editorial;
    updated += 1;
  }
  return updated;
}

export function applyDecisionFile(root, file, { catalog = true } = {}) {
  const paths = resolvePaths(root);
  const registry = loadRegistry(paths);
  const decisions = readDecisions(file);
  const errors = validateDecisions(decisions, registry);
  if (errors.length) {
    const error = new Error(errors.join("\n"));
    error.errors = errors;
    throw error;
  }
  const updated = applyDecisionList(registry, decisions);
  saveRegistry(paths, registry);
  ensureDir(paths.decisions);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const audit = path.join(paths.decisions, `applied-${stamp}.json`);
  writeJsonAtomic(audit, {
    schema: "moscow-photobank-decisions/v1",
    applied_at: new Date().toISOString(),
    source_file: file,
    decisions,
  });
  if (catalog) buildCatalog(paths, registry, similarPairs(registry.assets, SIMILAR_DISTANCE));
  return { updated, audit, registry, paths };
}
