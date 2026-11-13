import { applyDecisionFile } from "./lib/decisions.mjs";
import { buildCatalog } from "./lib/catalog.mjs";
import { resolvePaths } from "./lib/paths.mjs";

const file = process.argv[2];
if (!file) {
  console.error("Укажите JSON: node scripts/logos/apply-decisions.mjs путь\\к\\logos-decisions.json");
  process.exit(1);
}

try {
  const paths = resolvePaths();
  const result = applyDecisionFile(paths, file);
  buildCatalog(paths, result.registry);
  console.log(`Обновлено решений: ${result.updated}`);
  if (result.conflicts.length) {
    console.log(`Пропущены более новые решения: ${result.conflicts.map((item) => item.organization_id).join(", ")}`);
  }
  console.log(`Копия экспорта: ${result.audit}`);
  console.log(`Выбранные: ${paths.selected}`);
  console.log("Реестр обновлён. Каталог пересобран. Сайт не менялся.");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
