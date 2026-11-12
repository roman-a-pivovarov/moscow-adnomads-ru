import { SIMILAR_DISTANCE } from "./config.mjs";
import { buildCatalog } from "./lib/catalog.mjs";
import { similarPairs } from "./lib/image.mjs";
import { resolvePaths, resolveRoot } from "./lib/paths.mjs";
import { loadRegistry } from "./lib/registry.mjs";

const paths = resolvePaths(resolveRoot());
const registry = loadRegistry(paths);
const summary = buildCatalog(paths, registry, similarPairs(registry.assets, SIMILAR_DISTANCE));
console.log(`Каталог: ${paths.catalog}/index.html`);
console.log(`Кадров в реестре: ${summary.assets}`);
