export const SCHEMA = "moscow-logos/v1";
export const DECISIONS_SCHEMA = "moscow-logos-decisions/v1";
export const SELECTED_SCHEMA = "moscow-logos-selected/v1";

export const SOURCE_TYPES = [
  { id: "official-site", label: "официальный сайт", official: true },
  { id: "brandbook", label: "брендбук или материалы для СМИ", official: true },
  { id: "official-page", label: "официальная страница", official: true },
  { id: "industry", label: "отраслевое издание", official: false },
  { id: "project-archive", label: "материалы проекта", official: false },
  { id: "other", label: "другой источник", official: false },
];

export const VARIANTS = [
  "primary",
  "horizontal",
  "compact",
  "on-light",
  "on-dark",
  "historical",
  "wordmark",
  "other",
];

export const PRIORITIES = ["", "first", "normal", "reserve"];

export const PRIORITY_LABELS = {
  "": "не задан",
  first: "первая группа показа",
  normal: "обычный показ",
  reserve: "резерв",
};

/** Подсказки выбора. Это не новые факты и не слияние карточек. */
export const DISTINCTIONS = {
  "org-media-nation":
    "В принятых данных это одна организация для 2019, 2021 и февраля 2026. Файл с medianation.ru лежит на этой карточке после склейки архитектора.",
  "org-yandex":
    "Имя организации — Яндекс. В сентябре 2026 подпись участия — «Яндекс Реклама». Отдельного знака рекламы в каталоге нет.",
  "org-mailru": "Имя в данных — Mail.Ru Group. Знак VK на эту карточку не переносить.",
  "org-vk": "Карточка VK. Не использовать как логотип Mail.Ru Group.",
  "org-avito-ads":
    "В данных это «Авито Реклама». Если отдельного знака рекламы нет, общий знак Авито помечать как неоднозначный.",
  "org-okkam":
    "Карточка группы Okkam. Знак Okkam Creative — отдельный бренд и без пометки сюда не кладётся.",
};

export const SITE_PLATE = { width: 168, height: 56 };
export const LARGE_PLATE = { width: 320, height: 128 };

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const MAX_BYTES = 8 * 1024 * 1024;
export const FETCH_TIMEOUT_MS = 20000;
