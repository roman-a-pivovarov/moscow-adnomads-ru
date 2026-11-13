import { buildCatalog } from "./lib/catalog.mjs";
import { resolvePaths } from "./lib/paths.mjs";
import { emptyRegistry, loadRegistry, mergeOrganizations, saveRegistry } from "./lib/registry.mjs";
import { buildSelected } from "./lib/selected.mjs";
import { buildOrganizationRecords, readEditions, readOrganizations, readParticipations, sourceFingerprint } from "./lib/source.mjs";

const MOVES = {
  "org-medianation-2026": "org-media-nation",
  "org-yandex-ads": "org-yandex",
};

function rebindRemovedCards(registry) {
  for (const candidate of registry.candidates) {
    const next = MOVES[candidate.organization_id];
    if (!next) continue;
    candidate.organization_id = next;
    if (next === "org-media-nation" && !String(candidate.ambiguity || "").includes("medianation.ru")) {
      const note = "Файл с medianation.ru. Архитектор склеил февральскую карточку с org-media-nation.";
      candidate.ambiguity = [candidate.ambiguity, note].filter(Boolean).join(" ");
    }
  }
  for (const gap of registry.gaps) {
    const next = MOVES[gap.organization_id];
    if (!next) continue;
    gap.organization_id = next;
    if (next === "org-yandex") {
      gap.note = "Отдельной карточки «Яндекс Реклама» больше нет: сентябрьская подпись относится к org-yandex. Отдельный знак рекламы не найден.";
    }
  }
  for (const [fromId, toId] of Object.entries(MOVES)) {
    const from = registry.organizations.find((item) => item.organization_id === fromId);
    const to = registry.organizations.find((item) => item.organization_id === toId);
    if (!from?.decision?.updated_at || !to) continue;
    if (to.decision?.updated_at && to.decision.updated_at > from.decision.updated_at) continue;
    to.decision = { ...from.decision };
  }
}

const paths = resolvePaths();
const organizations = readOrganizations(paths.organizations);
const editions = readEditions(paths.editions);
const participations = readParticipations(paths.participations);
const fingerprint = sourceFingerprint([paths.organizations, paths.participations, paths.editions]);
const records = buildOrganizationRecords(organizations, editions, participations);
const registry = loadRegistry(paths) || emptyRegistry(fingerprint);
rebindRemovedCards(registry);
const dropped = mergeOrganizations(registry, records, fingerprint);
saveRegistry(paths, registry);
buildSelected(paths, registry);
const catalog = buildCatalog(paths, registry);
const unique = new Set(records.map((item) => item.organization_id));
console.log(`Уникальных организаций: ${unique.size}`);
console.log(`Участий хостов: ${participations.length}`);
console.log(`Кандидатов в реестре: ${registry.candidates.length}`);
console.log(`Каталог: ${catalog.html}`);
if (dropped.length) console.log(`Больше нет в общих данных: ${dropped.join(", ")}`);
