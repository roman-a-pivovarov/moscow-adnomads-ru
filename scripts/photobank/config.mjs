/**
 * Конфигурация фотобанка. Числа обработки и соответствие пачек выпускам живут здесь.
 * edition_id и canonical_tour_id сверены с src/content/editions.ts (не импортируется, чтобы фотобанк не попал в сборку сайта).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "../..");

export const STATUSES = [
  { id: "unsorted", label: "Не разобрано" },
  { id: "selected", label: "Отобрано" },
  { id: "reserve", label: "Резерв" },
  { id: "do_not_use", label: "Не использовать" },
];

/** Куда можно поставить кадр. Это решение об использовании, не содержание снимка. */
export const PLACEMENTS = [
  { id: "home", label: "На главную" },
  { id: "history", label: "В историю выпуска" },
  { id: "program", label: "Программа" },
  { id: "hosts", label: "Хосты" },
  { id: "team", label: "Команда" },
  { id: "hero", label: "Hero" },
];

/** Содержание кадра. Заполняет редактор, импорт не угадывает. */
export const SCENE_TAGS = [
  { id: "group", label: "Групповое фото" },
  { id: "meeting", label: "Встреча" },
  { id: "city", label: "Город" },
  { id: "informal", label: "Неформальное" },
  { id: "portrait", label: "Портрет" },
  { id: "detail", label: "Деталь" },
];

/**
 * longSide — потолок длинной стороны.
 * maxBytes — мягкий потолок веса. Превышение остаётся предупреждением, кадр не бракуется.
 * minLongSide — ниже этого разрешение не опускаем, даже если вес больше бюджета.
 * Меньший вес, чем targetBytes, допустим. Качество не выкручивается ради ровных 100 КБ.
 */
export const PROFILES = {
  thumb: {
    longSide: 360,
    minLongSide: 360,
    maxBytes: 40 * 1024,
    qualityStart: 68,
    qualityMin: 40,
    qualityStep: 8,
    allowDownscale: false,
  },
  web: {
    longSide: 1400,
    minLongSide: 960,
    maxBytes: 150 * 1024,
    targetBytes: 100 * 1024,
    qualityStart: 78,
    qualityMin: 52,
    qualityStep: 6,
    allowDownscale: true,
  },
  hero: {
    longSide: 1920,
    minLongSide: 1600,
    maxBytes: 300 * 1024,
    targetBytes: 240 * 1024,
    qualityStart: 80,
    qualityMin: 56,
    qualityStep: 4,
    allowDownscale: true,
  },
  portrait: {
    longSide: 1000,
    minLongSide: 800,
    maxBytes: 180 * 1024,
    targetBytes: 120 * 1024,
    qualityStart: 80,
    qualityMin: 58,
    qualityStep: 4,
    allowDownscale: true,
  },
};

/** Ниже этого длинная сторона — пометка small_source, не отказ. */
export const SMALL_SOURCE_LONG_SIDE = 800;

/** Расстояние Хэмминга для подсказки похожести. Не доказательство дубля. */
export const SIMILAR_DISTANCE = 8;

export const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".tif",
  ".tiff",
  ".gif",
  ".avif",
  ".heic",
  ".heif",
  ".bmp",
]);

export const VIDEO_EXTENSIONS = new Set([".mov", ".mp4", ".m4v", ".avi", ".mpg", ".mpeg"]);

export const BATCHES = [
  {
    key: "2019-09",
    aliases: ["2019-09", "2019-moscow-practices", "ADNOMADS-26"],
    edition_id: "2019-moscow-practices",
    canonical_tour_id: "ADNOMADS-26",
    category: "edition",
    person_id: "",
    person_slug: "",
    title: "№26 · Москва · сентябрь 2019",
    year: 2019,
    month: 9,
    album_url: "",
  },
  {
    key: "2021-11",
    aliases: ["2021-11", "2021-moscow", "ADNOMADS-32"],
    edition_id: "2021-moscow",
    canonical_tour_id: "ADNOMADS-32",
    category: "edition",
    person_id: "",
    person_slug: "",
    title: "№32 · Москва · ноябрь 2021",
    year: 2021,
    month: 11,
    album_url: "",
  },
  {
    key: "2026-02",
    aliases: ["2026-02", "2026-moscow-february", "ADNOMADS-49"],
    edition_id: "2026-moscow-february",
    canonical_tour_id: "ADNOMADS-49",
    category: "edition",
    person_id: "",
    person_slug: "",
    title: "№49 · Москва · февраль 2026",
    year: 2026,
    month: 2,
    album_url: "",
  },
  {
    key: "2026-05",
    aliases: ["2026-05", "2026-moscow-may", "ADNOMADS-51"],
    edition_id: "2026-moscow-may",
    canonical_tour_id: "ADNOMADS-51",
    category: "edition",
    person_id: "",
    person_slug: "",
    title: "№51 · Москва · май 2026",
    year: 2026,
    month: 5,
    album_url: "",
  },
  {
    key: "2026-09",
    aliases: ["2026-09", "2026-moscow-september", "ADNOMADS-53"],
    edition_id: "2026-moscow-september",
    canonical_tour_id: "ADNOMADS-53",
    category: "edition",
    person_id: "",
    person_slug: "",
    title: "№53 · Москва · сентябрь 2026",
    year: 2026,
    month: 9,
    album_url: "",
  },
  {
    key: "team-roman",
    aliases: ["team/roman", "team-roman"],
    edition_id: "",
    canonical_tour_id: "",
    category: "team",
    person_id: "person-roman",
    person_slug: "roman",
    title: "Команда · Роман Пивоваров",
    year: null,
    month: null,
    album_url: "",
  },
  {
    key: "team-irina",
    aliases: ["team/irina", "team-irina"],
    edition_id: "",
    canonical_tour_id: "",
    category: "team",
    person_id: "person-irina",
    person_slug: "irina",
    title: "Команда · Ирина Генералова",
    year: null,
    month: null,
    album_url: "",
  },
  {
    key: "shared",
    aliases: ["shared"],
    edition_id: "",
    canonical_tour_id: "",
    category: "shared",
    person_id: "",
    person_slug: "",
    title: "Общие кадры",
    year: null,
    month: null,
    album_url: "",
  },
];

export function batchByKey(key) {
  return BATCHES.find((batch) => batch.key === key) || null;
}

export function matchBatchAlias(name) {
  const normalized = String(name || "")
    .replace(/\\/g, "/")
    .replace(/\.zip$/i, "")
    .replace(/^\/+|\/+$/g, "");
  return (
    BATCHES.find((batch) =>
      batch.aliases.some((alias) => alias.toLowerCase() === normalized.toLowerCase()),
    ) || null
  );
}
