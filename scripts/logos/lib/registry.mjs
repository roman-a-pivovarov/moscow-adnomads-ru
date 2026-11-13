import fs from "node:fs";
import { SCHEMA } from "../config.mjs";
import { emptyDecision } from "./source.mjs";
import { readJson, writeJsonAtomic } from "./paths.mjs";

export function emptyRegistry(fingerprint) {
  return {
    schema: SCHEMA,
    version: 0,
    updated_at: new Date().toISOString(),
    source_fingerprint: fingerprint,
    note: "Список организаций читается из принятых src/content. Исторические факты здесь не дублируются. Наличие логотипа не подтверждает хоста ближайшего выпуска и не делает организацию спонсором.",
    organizations: [],
    candidates: [],
    gaps: [],
  };
}

export function loadRegistry(paths) {
  if (!fs.existsSync(paths.registry)) return null;
  const registry = readJson(paths.registry);
  if (registry.schema !== SCHEMA) throw new Error(`Неизвестная схема реестра: ${registry.schema}`);
  registry.organizations ||= [];
  registry.candidates ||= [];
  registry.gaps ||= [];
  return registry;
}

export function saveRegistry(paths, registry) {
  registry.schema = SCHEMA;
  registry.version = Number(registry.version || 0) + 1;
  registry.updated_at = new Date().toISOString();
  writeJsonAtomic(paths.registry, registry);
  return registry;
}

export function mergeOrganizations(registry, records, fingerprint) {
  const previous = new Map(registry.organizations.map((item) => [item.organization_id, item]));
  const nextIds = new Set(records.map((item) => item.organization_id));
  registry.organizations = records.map((record) => {
    const old = previous.get(record.organization_id);
    return {
      ...record,
      decision: old?.decision ? { ...emptyDecision(), ...old.decision } : emptyDecision(),
    };
  });
  const dropped = [...previous.keys()].filter((id) => !nextIds.has(id));
  registry.source_fingerprint = fingerprint;
  return dropped;
}
