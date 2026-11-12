import { PROFILES } from "./config.mjs";
import { deriveOne } from "./lib/run-import.mjs";
import { resolvePaths, resolveRoot } from "./lib/paths.mjs";
import { getAsset, loadRegistry, saveRegistry } from "./lib/registry.mjs";

const root = resolveRoot();
const profile = (process.argv.find((arg) => arg.startsWith("--profile=")) || "--profile=hero").slice("--profile=".length);
const ids = process.argv.filter((arg) => arg.startsWith("--id=")).map((arg) => arg.slice("--id=".length));
if (!PROFILES[profile] || (profile !== "hero" && profile !== "portrait")) {
  console.error("Укажите --profile=hero или --profile=portrait и --id=msk-000001");
  process.exit(1);
}
if (!ids.length) {
  console.error("Нужен хотя бы один --id=. Массовая генерация всего архива не выполняется.");
  process.exit(1);
}

const paths = resolvePaths(root);
const registry = loadRegistry(paths);
for (const id of ids) {
  const asset = getAsset(registry, id);
  if (!asset) {
    console.error(`Нет кадра ${id}`);
    process.exit(1);
  }
  const before = JSON.stringify(asset.editorial);
  await deriveOne(paths, registry, asset, profile);
  if (JSON.stringify(asset.editorial) !== before) {
    console.error("Производная затронула редактуру. Файл не сохранён.");
    process.exit(1);
  }
  const info = asset.technical[profile];
  console.log(`${id} ${profile}: ${info.width}×${info.height}, ${info.bytes} байт${info.over_budget ? " (сверх бюджета)" : ""}`);
}
saveRegistry(paths, registry);
