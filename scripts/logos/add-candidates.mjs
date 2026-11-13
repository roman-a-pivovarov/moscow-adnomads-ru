import fs from "node:fs";
import { addCandidate, addGap } from "./lib/intake.mjs";
import { buildCatalog } from "./lib/catalog.mjs";
import { buildSelected } from "./lib/selected.mjs";
import { resolvePaths } from "./lib/paths.mjs";
import { loadRegistry, saveRegistry } from "./lib/registry.mjs";

const file = process.argv[2];
if (!file) {
  console.error("Укажите JSON: node scripts/logos/add-candidates.mjs путь\\к\\пакету.json");
  process.exit(1);
}

const paths = resolvePaths();
const registry = loadRegistry(paths);
if (!registry) {
  console.error("Сначала выполните node scripts/logos/sync.mjs");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const items = Array.isArray(payload) ? payload : payload.candidates || [];
const gaps = Array.isArray(payload) ? [] : payload.gaps || [];
let added = 0;
let skipped = 0;
const failed = [];

for (const item of items) {
  try {
    const result = await addCandidate(paths, registry, item);
    if (result.skipped) {
      skipped += 1;
      console.log(`дубль ${item.organization_id}: ${result.candidate_id}`);
    } else {
      added += 1;
      const mark = result.candidate.usable ? "готов" : "исходник без подготовленной версии";
      console.log(`${result.candidate.candidate_id} ${mark} ${result.candidate.format}`);
    }
  } catch (error) {
    failed.push({ organization_id: item.organization_id, file_url: item.file_url || item.file_path, error: error.message });
    console.error(`${item.organization_id}: ${error.message}`);
    if (error.code === "blocked") {
      addGap(registry, {
        organization_id: item.organization_id,
        kind: "blocked",
        note: error.message,
        urls: [item.file_url || item.source_page].filter(Boolean),
      });
    }
  }
}

for (const gap of gaps) addGap(registry, gap);
saveRegistry(paths, registry);
buildSelected(paths, registry);
buildCatalog(paths, registry);
console.log(`Добавлено: ${added}. Пропущено дублей: ${skipped}. Ошибок: ${failed.length}.`);
if (failed.length) process.exitCode = 1;
