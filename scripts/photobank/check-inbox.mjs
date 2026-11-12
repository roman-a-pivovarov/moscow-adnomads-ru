import { discoverBatches, inspectZip, walkBatch } from "./lib/scan.mjs";
import { resolvePaths, resolveRoot } from "./lib/paths.mjs";
import { IMAGE_EXTENSIONS } from "./config.mjs";
import path from "node:path";

const root = resolveRoot();
const paths = resolvePaths(root);
const discovered = discoverBatches(paths.inbox);

console.log(`Входящие: ${paths.inbox}`);
if (!discovered.found.length) console.log("Пачек пока нет.");
for (const item of discovered.found) {
  if (item.kind === "zip") {
    const zip = inspectZip(item.absPath);
    if (!zip.ok) {
      console.log(`- ${item.batch.key}: ZIP не читается (${zip.error})`);
      continue;
    }
    const images = zip.entries.filter((entry) => IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()));
    const unsafe = zip.entries.filter((entry) => entry.pathError || entry.encrypted);
    console.log(`- ${item.batch.key}: ZIP, изображений ${images.length}, опасных путей ${unsafe.length}`);
    for (const entry of unsafe) console.log(`    ${entry.name}: ${entry.pathError || "encrypted"}`);
    continue;
  }
  const tree = walkBatch(item.absPath);
  console.log(`- ${item.batch.key}: папка, изображений ${tree.images.length}, видео ${tree.videos.length}, прочих ${tree.other.length}`);
}
if (discovered.unknown.length) console.log(`Неизвестные имена, пропущены: ${discovered.unknown.join(", ")}`);
console.log(`Ещё не переданы: ${discovered.missing.join(", ") || "нет"}`);
console.log("Проверка ничего не записала.");
