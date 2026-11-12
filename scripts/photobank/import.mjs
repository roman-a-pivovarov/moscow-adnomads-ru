import { resolveRoot } from "./lib/paths.mjs";
import { runImport } from "./lib/run-import.mjs";

function values(flag) {
  return process.argv
    .filter((arg) => arg.startsWith(`${flag}=`))
    .flatMap((arg) => arg.slice(flag.length + 1).split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

const root = resolveRoot();
const batches = values("--batch");
const dryRun = process.argv.includes("--dry-run");
const rebuild = process.argv.includes("--rebuild");

const { report } = await runImport({ root, batches, dryRun, rebuild, catalog: !dryRun });
for (const batch of report.batches) {
  console.log(
    `${batch.key}: видно ${batch.seen}, новых ${batch.new_assets}, уже были ${batch.known}, готовы ${batch.processed}, ошибок ${batch.errors}`,
  );
}
const summary = report.summary;
console.log(
  `Реестр: ${summary.assets} кадров, веб-версий ${summary.processed}, ошибок ${summary.errors}, конфликтов ${summary.conflicts}, сверх бюджета ${summary.over_budget}`,
);
if (summary.web_median_bytes != null) {
  console.log(`Вес веб-версий: медиана ${summary.web_median_bytes} байт, максимум ${summary.web_max_bytes} байт`);
}
if (report.unknown.length) console.log(`Неизвестные пачки пропущены: ${report.unknown.join(", ")}`);
console.log(dryRun ? "Пробный просмотр: файлы фотобанка не изменялись." : `Каталог: docs/photo-review/index.html`);
