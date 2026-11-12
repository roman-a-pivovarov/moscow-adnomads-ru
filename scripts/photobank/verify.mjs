import { resolveRoot } from "./lib/paths.mjs";
import { REPO_ROOT } from "./config.mjs";
import { verifyRegistry, verifyRepoGuards } from "./lib/verify.mjs";

const root = resolveRoot();
const registry = await verifyRegistry(root);
const guards = root === REPO_ROOT ? verifyRepoGuards(root) : { ok: true, errors: [], notes: ["Проверка git пропущена: это не корень репозитория."] };

for (const note of guards.notes || []) console.log(note);
for (const error of [...registry.errors, ...guards.errors]) console.error(error);
const summary = registry.summary;
console.log(
  `Кадров ${summary.assets}, веб-версий ${summary.processed}, ошибок обработки ${summary.errors}, оригинал ${summary.original_bytes} байт, веб ${summary.web_bytes} байт`,
);
if (summary.web_median_bytes != null) {
  console.log(`Медиана веб-версии ${summary.web_median_bytes} байт, максимум ${summary.web_max_bytes} байт`);
}
if (!registry.ok || !guards.ok) process.exit(1);
console.log("Целостность фотобанка сходится.");
