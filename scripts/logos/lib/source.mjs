import crypto from "node:crypto";
import fs from "node:fs";
import { DISTINCTIONS } from "../config.mjs";

function grab(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1] : "";
}

export function readOrganizations(file) {
  const text = fs.readFileSync(file, "utf8");
  const items = [];
  const re = /\{\s*id:\s*"([^"]+)"\s*,\s*canonicalId:\s*"([^"]+)"\s*,\s*name:\s*"([^"]+)"\s*,\s*sourceIds:\s*\[([^\]]*)\]\s*\}/g;
  for (const match of text.matchAll(re)) {
    items.push({
      organization_id: match[1],
      canonical_id: match[2],
      name: match[3],
      source_ids: [...match[4].matchAll(/"([^"]+)"/g)].map((item) => item[1]),
    });
  }
  if (!items.length) throw new Error(`Не разобраны организации: ${file}`);
  return items;
}

export function readEditions(file) {
  const text = fs.readFileSync(file, "utf8");
  const items = [];
  const re = /\{\s*id:\s*"([^"]+)"[\s\S]*?\n {2}\}/g;
  for (const match of text.matchAll(re)) {
    const block = match[0];
    const id = match[1];
    if (!id.startsWith("20")) continue;
    items.push({
      edition_id: id,
      adnomads_id: grab(block, /adnomadsId:\s*"([^"]+)"/),
      adnomads_number: Number(grab(block, /adnomadsNumber:\s*(\d+)/)),
      moscow_number: Number(grab(block, /moscowNumber:\s*(\d+)/)),
      date_label: grab(block, /dateLabel:\s*"([^"]+)"/),
      status: grab(block, /status:\s*"([^"]+)"/),
      host_list_status: grab(block, /hostListStatus:\s*"([^"]+)"/),
    });
  }
  if (items.length < 5) throw new Error(`Не разобраны выпуски: ${file}`);
  return items;
}

export function readParticipations(file) {
  const text = fs.readFileSync(file, "utf8");
  const constants = new Map();
  for (const match of text.matchAll(/const\s+([A-Za-z0-9_]+)\s*=\s*"([^"]+)"/g)) {
    constants.set(match[1], match[2]);
  }
  const items = [];
  const re = /host\(\s*([A-Za-z0-9_]+|"[^"]+")\s*,\s*"(org-[^"]+)"\s*,\s*"[^"]+"\s*,\s*[A-Za-z0-9_]+(?:\s*,\s*"([^"]*)")?\s*\)/g;
  for (const match of text.matchAll(re)) {
    const token = match[1];
    const editionId = token.startsWith('"') ? token.slice(1, -1) : constants.get(token);
    if (!editionId) throw new Error(`Участие без выпуска: ${token}`);
    items.push({
      edition_id: editionId,
      organization_id: match[2],
      role: "host",
      label: match[3] || "",
    });
  }
  if (!items.length) throw new Error(`Не разобраны участия: ${file}`);
  return items;
}

export function sourceFingerprint(files) {
  const hash = crypto.createHash("sha256");
  for (const file of files) hash.update(fs.readFileSync(file));
  return hash.digest("hex").slice(0, 16);
}

export function buildOrganizationRecords(organizations, editions, participations) {
  const editionById = new Map(editions.map((item) => [item.edition_id, item]));
  const byOrg = new Map();
  for (const org of organizations) {
    byOrg.set(org.organization_id, {
      organization_id: org.organization_id,
      canonical_id: org.canonical_id || "",
      name: org.name,
      source_ids: org.source_ids,
      distinction: DISTINCTIONS[org.organization_id] || "",
      editions: [],
      decision: emptyDecision(),
    });
  }
  for (const participation of participations) {
    const org = byOrg.get(participation.organization_id);
    if (!org) throw new Error(`Участие без организации: ${participation.organization_id}`);
    const edition = editionById.get(participation.edition_id);
    if (!edition) throw new Error(`Участие без выпуска: ${participation.edition_id}`);
    if (edition.status !== "completed") {
      throw new Error(`${participation.organization_id} привязан к незавершённому выпуску ${edition.edition_id}`);
    }
    org.editions.push({
      edition_id: edition.edition_id,
      adnomads_id: edition.adnomads_id,
      adnomads_number: edition.adnomads_number,
      moscow_number: edition.moscow_number,
      date_label: edition.date_label,
      role: participation.role,
      label: participation.label || "",
      host_list_status: edition.host_list_status,
    });
  }
  for (const org of byOrg.values()) {
    if (!org.editions.length) throw new Error(`Организация без московского участия: ${org.organization_id}`);
    org.editions.sort((a, b) => a.adnomads_number - b.adnomads_number);
  }
  return [...byOrg.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function emptyDecision() {
  return {
    primary_candidate_id: "",
    dark_candidate_id: "",
    historical: [],
    rejected_candidate_ids: [],
    needs_other: false,
    priority: "",
    sort_order: null,
    comment: "",
    updated_at: "",
  };
}
