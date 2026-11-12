import { applyDecisionFile } from "./lib/decisions.mjs";
import { publishBank } from "./lib/publish.mjs";
import { resolveRoot } from "./lib/paths.mjs";

const file = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!file) {
  console.error("Укажите JSON решений: node scripts/photobank/apply-decisions.mjs путь\\к\\photobank-decisions.json");
  process.exit(1);
}

try {
  const root = resolveRoot();
  const result = applyDecisionFile(root, file, { catalog: false });
  await publishBank(root, { copyFiles: true });
  console.log(`Обновлено решений: ${result.updated}`);
  if (result.conflicts?.length) {
    console.log(`Пропущены более новые решения: ${result.conflicts.map((item) => item.asset_id).join(", ")}`);
  }
  console.log(`Копия: ${result.audit}`);
  console.log("Каталог и подборки пересобраны из реестра. Отметки сохранены.");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
