import fs from "node:fs";
import path from "node:path";
import { VARIANTS } from "./config.mjs";
import { addCandidate } from "./lib/intake.mjs";
import { buildCatalog } from "./lib/catalog.mjs";
import { ensureDir, resolvePaths } from "./lib/paths.mjs";
import { loadRegistry, saveRegistry } from "./lib/registry.mjs";
import { buildSelected } from "./lib/selected.mjs";

const VARIANT_ALIAS = {
  primary: "primary",
  main: "primary",
  dark: "on-dark",
  "on-dark": "on-dark",
  light: "on-light",
  "on-light": "on-light",
  horizontal: "horizontal",
  compact: "compact",
  historical: "historical",
  wordmark: "wordmark",
  other: "other",
};

const FILE_RE = /^(.+?)(?:__([a-z-]+))?(?:--(\d+))?\.(svg|png|webp|jpe?g|gif)$/i;

const ALIASES = {
  avito: "org-avito-ads",
  "avito-reklama": "org-avito-ads",
  actis: "org-actis-wunderman",
  wunderman: "org-actis-wunderman",
  banana: "org-banana-trends",
  cms: "org-cms-magazine",
  getresponse: "org-getresponse-russia",
  medianation: "org-media-nation",
  "media-nation": "org-media-nation",
  redkeds: "org-red-keds",
  "red-keds": "org-red-keds",
  voshod: "org-voshod",
  voskhod: "org-voshod",
  rore: "org-rore",
  illan: "org-illan",
  usilitel: "org-usilitel",
};

function organizationIdFromStem(stem, registry) {
  const key = stem.toLowerCase().trim();
  if (ALIASES[key]) return ALIASES[key];
  const direct = key.startsWith("org-") ? key : `org-${key}`;
  if (registry.organizations.some((item) => item.organization_id === direct)) return direct;
  return "";
}

const paths = resolvePaths();
const inbox = paths.inbox;
const done = path.join(inbox, "done");
ensureDir(inbox);
ensureDir(done);

const registry = loadRegistry(paths);
if (!registry) {
  console.error("Сначала выполните node scripts/logos/sync.mjs");
  process.exit(1);
}

const names = fs.readdirSync(inbox).filter((name) => {
  const absolute = path.join(inbox, name);
  return fs.statSync(absolute).isFile();
});

let added = 0;
let skipped = 0;
const held = [];

for (const name of names) {
  if (name.startsWith(".")) continue;
  const match = name.match(FILE_RE);
  if (!match) {
    if (!/\.(txt|md)$/i.test(name)) held.push(`${name}: имя не разобрано`);
    continue;
  }
  const organizationId = organizationIdFromStem(match[1], registry);
  if (!organizationId) {
    held.push(`${name}: нет такой организации`);
    continue;
  }
  const variant = VARIANT_ALIAS[(match[2] || "primary").toLowerCase()] || "";
  if (!VARIANTS.includes(variant)) {
    held.push(`${name}: неизвестный вариант ${match[2]}`);
    continue;
  }
  const notePath = path.join(inbox, name.replace(/\.[^.]+$/, ".txt"));
  const note = fs.existsSync(notePath) ? fs.readFileSync(notePath, "utf8").trim() : "";
  const sourcePage = note.split(/\r?\n/).find((line) => /^https?:\/\//i.test(line)) || "inbox";
  const filePath = path.join(inbox, name);
  try {
    const result = await addCandidate(paths, registry, {
      organization_id: organizationId,
      source_page: sourcePage,
      file_path: filePath,
      file_url: "",
      source_type: "other",
      variant,
      description: `Файл из инбокса${match[3] ? `, вариант ${match[3]}` : ""}.`,
      presumed_current: null,
      ambiguity: note
        ? "Файл принёс Роман. Ссылка записана из соседней заметки."
        : "Файл принёс Роман. Страница источника в заметке не указана.",
    });
    if (result.skipped) {
      skipped += 1;
      console.log(`дубль ${name}: ${result.candidate_id}`);
    } else {
      added += 1;
      console.log(`${result.candidate.candidate_id} ← ${name}`);
    }
    const target = path.join(done, name);
    fs.renameSync(filePath, fs.existsSync(target) ? path.join(done, `${Date.now()}-${name}`) : target);
    if (fs.existsSync(notePath)) {
      const noteTarget = path.join(done, path.basename(notePath));
      fs.renameSync(notePath, fs.existsSync(noteTarget) ? path.join(done, `${Date.now()}-${path.basename(notePath)}`) : noteTarget);
    }
  } catch (error) {
    held.push(`${name}: ${error.message}`);
    console.error(`${name}: ${error.message}`);
  }
}

if (added || skipped) {
  saveRegistry(paths, registry);
  buildSelected(paths, registry);
  buildCatalog(paths, registry);
}
console.log(`Добавлено: ${added}. Дублей: ${skipped}. Не разобрано: ${held.length}.`);
for (const line of held) console.log(line);
if (held.length) process.exitCode = 1;
