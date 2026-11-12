import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import { REPO_ROOT } from "./config.mjs";
import { applyDecisionFile } from "./lib/decisions.mjs";
import { derivativeMeta } from "./lib/image.mjs";
import { resolvePaths } from "./lib/paths.mjs";
import { loadRegistry } from "./lib/registry.mjs";
import { deriveOne, runImport } from "./lib/run-import.mjs";
import { crc32 } from "./lib/zip.mjs";
import { verifyRegistry, verifyRepoGuards } from "./lib/verify.mjs";

const root = path.join(os.tmpdir(), "moscow-photobank-selfcheck");
const failures = [];

function check(name, condition, detail = "") {
  const ok = Boolean(condition);
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

function jpegWithOrientation(jpeg, orientation) {
  const tiff = Buffer.alloc(26);
  tiff.write("II", 0, "ascii");
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8);
  tiff.writeUInt16LE(0x0112, 10);
  tiff.writeUInt16LE(3, 12);
  tiff.writeUInt32LE(1, 14);
  tiff.writeUInt16LE(orientation, 18);
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "ascii"), tiff]);
  const segment = Buffer.alloc(4 + payload.length);
  segment[0] = 0xff;
  segment[1] = 0xe1;
  segment.writeUInt16BE(payload.length + 2, 2);
  payload.copy(segment, 4);
  return Buffer.concat([jpeg.subarray(0, 2), segment, jpeg.subarray(2)]);
}

function makeZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const method = file.method ?? 8;
    const stored = method === 0 ? file.data : zlib.deflateRawSync(file.data);
    const crc = crc32(file.data);
    const flags = 0x800;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(stored.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const localBuf = Buffer.concat([local, name, stored]);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(stored.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(localBuf);
    centrals.push(Buffer.concat([central, name]));
    offset += localBuf.length;
  }
  const centralDir = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDir, eocd]);
}

async function solid(width, height, color, file) {
  await sharp({ create: { width, height, channels: 3, background: color } }).jpeg({ quality: 90 }).toFile(file);
}

async function noiseJpeg(width, height, file) {
  let seed = 42;
  const data = Buffer.alloc(width * height * 3);
  for (let i = 0; i < data.length; i += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = seed & 255;
  }
  await sharp(data, { raw: { width, height, channels: 3 } }).jpeg({ quality: 95 }).toFile(file);
}

fs.rmSync(root, { recursive: true, force: true });
const inbox = path.join(root, "assets-inbox");
const batch = path.join(inbox, "2019-09");
fs.mkdirSync(path.join(batch, "a"), { recursive: true });
fs.mkdirSync(path.join(batch, "b"), { recursive: true });
fs.mkdirSync(path.join(batch, "c"), { recursive: true });
fs.mkdirSync(path.join(inbox, "2021-11"), { recursive: true });

await solid(1200, 800, { r: 40, g: 90, b: 160 }, path.join(batch, "landscape.jpg"));
const portraitBase = await sharp({
  create: { width: 640, height: 360, channels: 3, background: { r: 180, g: 40, b: 40 } },
}).jpeg().toBuffer();
fs.writeFileSync(path.join(batch, "portrait-exif.jpg"), jpegWithOrientation(portraitBase, 6));
await solid(120, 80, { r: 20, g: 120, b: 20 }, path.join(batch, "small.jpg"));
await sharp({
  create: { width: 400, height: 300, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{
    input: await sharp({
      create: { width: 40, height: 40, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
    }).png().toBuffer(),
    left: 180,
    top: 130,
  }])
  .png()
  .toFile(path.join(batch, "alpha.png"));
await solid(500, 400, { r: 10, g: 10, b: 200 }, path.join(batch, "a", "shot.jpg"));
await solid(500, 400, { r: 200, g: 180, b: 10 }, path.join(batch, "b", "shot.jpg"));
await solid(640, 480, { r: 80, g: 80, b: 80 }, path.join(batch, "a", "dup.jpg"));
fs.copyFileSync(path.join(batch, "a", "dup.jpg"), path.join(batch, "c", "dup.jpg"));
fs.copyFileSync(path.join(batch, "landscape.jpg"), path.join(inbox, "2021-11", "from-2019.jpg"));
fs.writeFileSync(path.join(batch, "broken.jpg"), Buffer.from("this is not a jpeg"));
fs.writeFileSync(path.join(batch, "frame.heic"), Buffer.from("not a real heic"));
fs.copyFileSync(path.join(batch, "landscape.jpg"), path.join(batch, "frame-jpeg.HEIC"));
await solid(300, 200, { r: 0, g: 0, b: 0 }, path.join(batch, "dark.jpg"));
await noiseJpeg(1400, 1000, path.join(batch, "noise.jpg"));
await solid(800, 600, { r: 90, g: 140, b: 90 }, path.join(batch, "captioned.jpg"));
fs.writeFileSync(path.join(batch, "captioned.jpg.json"), JSON.stringify({
  title: "captioned.jpg",
  description: "Подпись из альбома, не для автопубликации",
  photoTakenTime: { formatted: "12 янв. 2012 г., 10:00:00 UTC" },
}));
fs.writeFileSync(path.join(batch, "ALBUM_URL.txt"), "https://photos.google.com/album/example\n");
fs.writeFileSync(path.join(batch, "clip.mov"), Buffer.from("video"));

const zipJpeg = await sharp({
  create: { width: 900, height: 600, channels: 3, background: { r: 30, g: 30, b: 30 } },
}).jpeg().toBuffer();
fs.writeFileSync(path.join(inbox, "2026-05.zip"), makeZip([
  { name: "Альбом/кадр 1.jpg", data: zipJpeg, method: 8 },
  { name: "../evil.jpg", data: zipJpeg, method: 0 },
]));

const exifMeta = await sharp(path.join(batch, "portrait-exif.jpg")).metadata();
check("fixture exif orientation 6", exifMeta.orientation === 6 && exifMeta.width > exifMeta.height, `${exifMeta.width}x${exifMeta.height} o=${exifMeta.orientation}`);

const dry = await runImport({ root, dryRun: true, catalog: false });
check("dry-run не создаёт реестр", !fs.existsSync(resolvePaths(root).registry));
check("dry-run видит новые файлы", dry.report.batches.some((item) => item.new_assets > 0));

const first = await runImport({ root, catalog: true });
const registry = loadRegistry(resolvePaths(root));
const byName = (name) => registry.assets.filter((asset) => asset.source?.original_filename === name);

const landscape = byName("landscape.jpg")[0];
const portrait = byName("portrait-exif.jpg")[0];
const small = byName("small.jpg")[0];
const alpha = byName("alpha.png")[0];
const shots = byName("shot.jpg");
const dups = byName("dup.jpg");
const broken = byName("broken.jpg")[0];
const heic = byName("frame.heic")[0];
const jpegNamedHeic = byName("frame-jpeg.HEIC")[0];
const dark = byName("dark.jpg")[0];
const noise = byName("noise.jpg")[0];
const captioned = byName("captioned.jpg")[0];
const zipAsset = registry.assets.find((asset) => asset.batch_key === "2026-05");

check("обычный jpeg получил веб-версию", landscape && !landscape.technical.process_error && landscape.paths.web);
check("id постоянный и короткий", /^msk-\d{6}$/.test(landscape.asset_id));
const landscapeFile = path.join(root, ...landscape.paths.web.split("/"));
const landscapeMeta = await derivativeMeta(landscapeFile);
check("вес веб-версии равен файлу", landscapeMeta.bytes === landscape.technical.output_bytes, String(landscapeMeta.bytes));
check("размер веб-версии равен файлу", landscapeMeta.width === landscape.technical.output_width && landscapeMeta.height === landscape.technical.output_height);
check("длинная сторона не больше 1400", Math.max(landscapeMeta.width, landscapeMeta.height) <= 1400);
check("из веб-версии убран EXIF", landscapeMeta.exif === false);

check("портрет после EXIF вертикальный", portrait.technical.output_height > portrait.technical.output_width, `${portrait.technical.output_width}x${portrait.technical.output_height}`);
check("портрет не увеличен сверх исходника", Math.max(portrait.technical.output_width, portrait.technical.output_height) <= 640);
const portraitMeta = await derivativeMeta(path.join(root, ...portrait.paths.web.split("/")));
check("у повёрнутого файла нет EXIF", portraitMeta.exif === false);

check("маленький снимок не увеличен", small.technical.output_width === 120 && small.technical.output_height === 80, `${small.technical.output_width}x${small.technical.output_height}`);
check("маленький снимок только помечен", small.technical.warnings.includes("small_source") && small.editorial.status === "unsorted");

const alphaMeta = await derivativeMeta(path.join(root, ...alpha.paths.web.split("/")));
check("прозрачный PNG сохранил альфа", alphaMeta.hasAlpha === true);

check("одинаковые имена — разные кадры", shots.length === 2 && shots[0].asset_id !== shots[1].asset_id);
check("оригиналы с одинаковым именем не затёрли друг друга", shots[0].sha256 !== shots[1].sha256 && fs.existsSync(path.join(root, ...shots[0].paths.original.split("/"))) && fs.existsSync(path.join(root, ...shots[1].paths.original.split("/"))));
check("точный дубль — один кадр", dups.length === 1 && dups[0].source.history.length === 2);

check("битый файл не выдаётся за успех", broken && broken.technical.process_error && !broken.paths.web);
check("битый оригинал сохранён", broken && fs.existsSync(path.join(root, ...broken.paths.original.split("/"))));
check("поддельный HEIC не выдаётся за успех", heic && heic.technical.process_error === "heic_decode_failed" && !heic.paths.web && fs.existsSync(path.join(root, ...heic.paths.original.split("/"))));
check("JPEG с расширением HEIC обрабатывается как JPEG", jpegNamedHeic && !jpegNamedHeic.technical.process_error && jpegNamedHeic.paths.web && jpegNamedHeic.technical.source_format === "jpeg");
check("тёмный кадр не забракован", dark.editorial.status === "unsorted" && !dark.technical.process_error && dark.technical.warnings.includes("dark"));
check("шум либо уложился, либо честно помечен", noise.editorial.status === "unsorted" && (noise.technical.output_bytes <= 150 * 1024 || noise.technical.warnings.includes("over_budget")));
check("шум не опустился ниже порога", Math.max(noise.technical.output_width, noise.technical.output_height) >= 960);
check("Google Photos не сменил выпуск", captioned.edition_id === "2019-moscow-practices" && captioned.canonical_tour_id === "ADNOMADS-26");
check("подпись JSON не стала редакцией", captioned.editorial.caption === "" && captioned.source.suggested_caption.includes("альбома"));
check("ссылка альбома сохранена", captioned.source.album_url.startsWith("https://"));
check("видео не стало кадром", !registry.assets.some((asset) => asset.source?.original_filename === "clip.mov"));
check("ZIP с корневой папкой и кириллицей импортирован", zipAsset && zipAsset.edition_id === "2026-moscow-may" && zipAsset.source.relative_path.includes("кадр 1.jpg"));
check("ZIP не вышел за рабочую папку", !fs.existsSync(path.join(root, "evil.jpg")) && !fs.existsSync(path.join(root, "assets-work", "evil.jpg")));
check("повтор в другом выпуске — конфликт, выпуск прежний", landscape.source_conflict === true && landscape.edition_id === "2019-moscow-practices" && landscape.source.history.some((item) => item.batch_key === "2021-11"));

const decisions = {
  schema: "moscow-photobank-decisions/v1",
  decisions: [{
    asset_id: landscape.asset_id,
    status: "selected",
    placements: ["home", "history"],
    scene_tags: ["meeting"],
    caption: "Встреча в Москве",
    alt: "Участники за столом",
    comment: "На главную и в историю",
    photographer: "Роман Пивоваров",
  }],
};
const decisionFile = path.join(root, "decisions.json");
fs.writeFileSync(decisionFile, JSON.stringify(decisions));
applyDecisionFile(root, decisionFile, { catalog: true });

await solid(320, 240, { r: 12, g: 80, b: 12 }, path.join(batch, "extra.jpg"));
fs.copyFileSync(path.join(batch, "small.jpg"), path.join(batch, "small-again.jpg"));
const beforeIds = new Set(loadRegistry(resolvePaths(root)).assets.map((asset) => asset.asset_id));
await runImport({ root, catalog: true });
const again = loadRegistry(resolvePaths(root));
const againLandscape = again.assets.find((asset) => asset.asset_id === landscape.asset_id);
const extra = again.assets.find((asset) => asset.source?.original_filename === "extra.jpg");
check("повторный импорт сохранил id", againLandscape && beforeIds.has(againLandscape.asset_id));
check("повторный импорт сохранил отбор", againLandscape.editorial.status === "selected" && againLandscape.editorial.comment === "На главную и в историю" && againLandscape.editorial.placements.includes("home"));
check("новый файл в старой пачке получил свой id", extra && !beforeIds.has(extra.asset_id) && extra.sha256 !== small.sha256);
check("повтор байтов small не создал второй кадр", again.assets.filter((asset) => asset.sha256 === small.sha256).length === 1);
check("опасный путь ZIP отклонён", first.report.errors.some((item) => item.message === "path_traversal"));

const webBefore = againLandscape.technical.output_bytes;
const editorialBefore = JSON.stringify(againLandscape.editorial);
await deriveOne(resolvePaths(root), again, againLandscape, "hero");
check("hero сделан из оригинала и не шире 1920", againLandscape.technical.hero.width <= 1920 && againLandscape.paths.hero.endsWith(".webp"));
check("hero не затёр веб-версию и редактуру", againLandscape.technical.output_bytes === webBefore && JSON.stringify(againLandscape.editorial) === editorialBefore);

const html = fs.readFileSync(path.join(root, "docs", "photo-review", "index.html"), "utf8");
const dataJs = fs.readFileSync(path.join(root, "docs", "photo-review", "catalog-data.js"), "utf8");
check("каталог объясняет экспорт", html.includes("Эта страница не записывает файлы проекта") && html.includes("apply-decisions.mjs"));
check("каталог показывает применённый комментарий", dataJs.includes("На главную и в историю"));

const inboxCheck = spawnSync(process.execPath, [path.join(REPO_ROOT, "scripts", "photobank", "check-inbox.mjs"), `--root=${root}`], { encoding: "utf8" });
check("команда проверки входящих завершается", inboxCheck.status === 0, inboxCheck.stderr || "");

const verified = await verifyRegistry(root);
check("проверка целостности выборки", verified.ok, verified.errors.join("; "));
const guards = verifyRepoGuards(REPO_ROOT);
check("исключения git и граница деплоя", guards.ok, guards.errors.join("; "));

if (failures.length) {
  console.error(`\nНе прошло проверок: ${failures.length}`);
  process.exit(1);
}
console.log("\nСамопроверка фотобанка прошла.");
