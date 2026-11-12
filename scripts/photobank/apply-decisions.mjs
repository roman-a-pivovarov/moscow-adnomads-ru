import { applyDecisionFile } from "./lib/decisions.mjs";
import { resolveRoot } from "./lib/paths.mjs";

const file = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!file) {
  console.error("Укажите JSON решений: node scripts/photobank/apply-decisions.mjs путь\\к\\photobank-decisions.json");
  process.exit(1);
}

try {
  const result = applyDecisionFile(resolveRoot(), file);
  console.log(`Обновлено решений: ${result.updated}`);
  console.log(`Копия: ${result.audit}`);
  console.log("Каталог пересобран из реестра. Отметки сохранены.");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
