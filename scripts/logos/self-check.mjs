import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { applyDecisionList, validateDecisions } from "./lib/decisions.mjs";
import { prepareCandidateFile } from "./lib/files.mjs";
import { resolvePaths } from "./lib/paths.mjs";
import { buildOrganizationRecords, emptyDecision, readEditions, readOrganizations, readParticipations } from "./lib/source.mjs";
import { sanitizeSvg } from "./lib/svg.mjs";

const paths = resolvePaths();
const organizations = readOrganizations(paths.organizations);
const editions = readEditions(paths.editions);
const participations = readParticipations(paths.participations);
const records = buildOrganizationRecords(organizations, editions, participations);
const ids = new Set(records.map((item) => item.organization_id));
const editionIds = new Set(records.flatMap((item) => item.editions.map((edition) => edition.adnomads_id)));

if (ids.size !== 61) throw new Error(`Ожидалось 61 организация, получено ${ids.size}`);
if (ids.size !== records.length) throw new Error("Повторяющийся organization_id");
if ([...editionIds].sort().join(",") !== "ADNOMADS-26,ADNOMADS-32,ADNOMADS-49,ADNOMADS-51,ADNOMADS-53") {
  throw new Error(`Состав выпусков: ${[...editionIds].join(",")}`);
}
if (!ids.has("org-media-nation") || ids.has("org-medianation-2026") || ids.has("org-yandex-ads")) {
  throw new Error("Склейка Media Nation или Яндекса разошлась с принятыми данными");
}
const yandex = records.find((item) => item.organization_id === "org-yandex");
if (!yandex?.editions.some((edition) => edition.edition_id === "2026-moscow-september" && edition.label === "Яндекс Реклама")) {
  throw new Error("У Яндекса нет сентябрьской подписи участия");
}
if (records.some((item) => item.editions.some((edition) => edition.edition_id === "2027-moscow-february"))) {
  throw new Error("В реестр попал ближайший выпуск");
}
if (records.some((item) => item.decision.priority)) throw new Error("Приоритет назначен автоматически");

const dirty = sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path d="M0 0"/></svg>`);
if (dirty.ok) throw new Error("SVG со скриптом прошёл очистку");
const clean = sanitizeSvg(`<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>`);
if (!clean.ok || /onload|DOCTYPE/i.test(clean.text)) throw new Error("Безопасный SVG не очищен");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "logos-"));
const fakePaths = { root: tmp, raw: path.join(tmp, "raw"), prepared: path.join(tmp, "prepared") };
const safe = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect width="20" height="10" fill="#111"/></svg>`);
const prepared = prepareCandidateFile(tmp, fakePaths, {
  organizationId: "org-agima",
  candidateId: "logo-agima-001",
  buffer: safe,
  sourceExt: "svg",
});
if (!prepared.usable || prepared.plate !== "light") throw new Error("Подготовка тёмного SVG не удалась");

const registry = {
  organizations: [{ organization_id: "org-agima", editions: [{ edition_id: "2026-moscow-may" }], decision: emptyDecision() }],
  candidates: [{ candidate_id: "logo-agima-001", organization_id: "org-agima" }],
};
const decision = {
  organization_id: "org-agima",
  base_updated_at: "",
  primary_candidate_id: "logo-agima-001",
  priority: "first",
  comment: "черновик",
  needs_other: false,
  historical: [],
  rejected_candidate_ids: [],
};
const errors = validateDecisions([decision], registry);
if (errors.length) throw new Error(errors.join("\n"));
applyDecisionList(registry, [decision]);
const stale = { ...decision, base_updated_at: "2000-01-01T00:00:00.000Z", comment: "старый" };
const again = applyDecisionList(registry, [stale]);
if (again.updated !== 0 || again.conflicts.length !== 1) throw new Error("Старый экспорт затёр новое решение");
if (registry.organizations[0].decision.comment !== "черновик") throw new Error("Комментарий потерян");

console.log("Проверка реестра и решений прошла.");
console.log(`Организаций: ${ids.size}. Выпуски: ${[...editionIds].sort().join(", ")}.`);
