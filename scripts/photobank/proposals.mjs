import { publishBank } from "./lib/publish.mjs";
import { resolveRoot } from "./lib/paths.mjs";
import { loadRegistry, saveRegistry } from "./lib/registry.mjs";
import { resolvePaths } from "./lib/paths.mjs";

const ALT = "Участники московского выпуска";

const editions = [
  {
    cover: "msk-000006",
    history: ["msk-000001", "msk-000004", "msk-000007", "msk-000024", "msk-000037", "msk-000045"],
    heroPrimary: "msk-000045",
    hero: ["msk-000004", "msk-000007"],
    program: ["msk-000007", "msk-000045"],
    home: ["msk-000006", "msk-000024", "msk-000045"],
  },
  {
    cover: "msk-000271",
    history: ["msk-000229", "msk-000236", "msk-000255", "msk-000257", "msk-000262", "msk-000266"],
    heroPrimary: "msk-000255",
    hero: ["msk-000262", "msk-000271"],
    program: ["msk-000255", "msk-000271"],
    home: ["msk-000257", "msk-000271"],
  },
  {
    cover: "msk-000112",
    history: ["msk-000087", "msk-000099", "msk-000105", "msk-000118", "msk-000130", "msk-000147"],
    heroPrimary: "msk-000105",
    hero: ["msk-000118", "msk-000147"],
    program: ["msk-000105", "msk-000118"],
    home: ["msk-000099", "msk-000112"],
  },
  {
    cover: "msk-000291",
    history: ["msk-000278", "msk-000292", "msk-000304", "msk-000315", "msk-000316", "msk-000320"],
    heroPrimary: "msk-000316",
    hero: ["msk-000278", "msk-000304"],
    program: ["msk-000304", "msk-000316"],
    home: ["msk-000291", "msk-000315"],
  },
  {
    cover: "msk-000183",
    history: ["msk-000156", "msk-000166", "msk-000172", "msk-000207", "msk-000209", "msk-000213"],
    heroPrimary: "msk-000183",
    hero: ["msk-000156", "msk-000213"],
    program: ["msk-000156", "msk-000183"],
    home: ["msk-000183", "msk-000209"],
  },
];

function canPropose(asset) {
  const editorial = asset.editorial || {};
  if ((editorial.status || "unsorted") !== "unsorted") return false;
  if ((editorial.placements || []).length) return false;
  return editorial.proposed_by !== "bild-editor";
}

function add(byId, id, placement, priority) {
  const asset = byId.get(id);
  if (!asset) throw new Error(`Нет кадра ${id}`);
  if (!canPropose(asset)) return;
  const editorial = asset.editorial;
  editorial.status = "selected";
  editorial.proposed_by = "bild-editor";
  if (!editorial.comment) editorial.comment = "Предложение бильд-редактора, не ручной отбор.";
  if (!editorial.alt) editorial.alt = ALT;
  editorial.placements = editorial.placements || [];
  if (!editorial.placements.includes(placement)) editorial.placements.push(placement);
  editorial.priorities = editorial.priorities || {};
  editorial.priorities[placement] = priority;
  editorial.updated_at = new Date().toISOString();
}

const root = resolveRoot();
const paths = resolvePaths(root);
const registry = loadRegistry(paths);
const byId = new Map(registry.assets.map((asset) => [asset.asset_id, asset]));

for (const edition of editions) {
  add(byId, edition.cover, "history", "primary");
  for (const id of edition.history) add(byId, id, "history", "normal");
  add(byId, edition.heroPrimary, "hero", "primary");
  for (const id of edition.hero) add(byId, id, "hero", "normal");
  for (const id of edition.program) add(byId, id, "program", "normal");
  for (const id of edition.home) add(byId, id, "home", "normal");
}

const roman = byId.get("msk-000325");
const irina = byId.get("msk-000326");
if (roman && canPropose(roman)) {
  roman.editorial.alt = "Роман Пивоваров";
  add(byId, "msk-000325", "team", "primary");
}
if (irina && canPropose(irina)) {
  irina.editorial.alt = "Ирина Генералова";
  add(byId, "msk-000326", "team", "primary");
}

saveRegistry(paths, registry);
const result = await publishBank(root);
const mb = (bytes) => (bytes / 1048576).toFixed(2);
console.log(`Опубликовано записей подборок: ${result.published}`);
console.log(`Портретов создано: ${result.derived}`);
console.log(`Файлы: web ${result.copied.web} (${mb(result.weights.web)} МБ), thumb ${result.copied.thumb} (${mb(result.weights.thumb)} МБ), portrait ${result.copied.portrait} (${mb(result.weights.portrait)} МБ), hero ${result.copied.hero} (${mb(result.weights.hero)} МБ)`);
