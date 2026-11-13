import { buildCatalog } from "./lib/catalog.mjs";
import { buildSelected } from "./lib/selected.mjs";
import { resolvePaths } from "./lib/paths.mjs";
import { loadRegistry } from "./lib/registry.mjs";

const paths = resolvePaths();
const registry = loadRegistry(paths);
if (!registry) {
  console.error("Сначала выполните node scripts/logos/sync.mjs");
  process.exit(1);
}
buildSelected(paths, registry);
const catalog = buildCatalog(paths, registry);
console.log(`Каталог: ${catalog.html}`);
console.log(`Организаций: ${catalog.organizations}. С файлом: ${catalog.withCandidates}. Без файла: ${catalog.missing}.`);
