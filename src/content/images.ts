import published from "../../data/photobank/published.json";

/** Назначения совпадают с scripts/photobank/config.mjs PLACEMENTS. */
export type ImagePlacement = "home" | "history" | "program" | "hosts" | "team" | "hero";

/** Варианты файла. original и сырьё на сайт не попадают. */
export type ImageVariant = "thumb" | "web" | "hero" | "portrait";

export type PublishedImage = {
  asset_id: string;
  edition_id: string;
  person_id: string;
  placement: ImagePlacement;
  variant: ImageVariant;
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  /** Откуда кадр до замены бильд-редактором. У новых публикаций может не быть. */
  source_path?: string;
  source_ids?: string[];
};

const assets = published.assets as PublishedImage[];

function hasSrc(item: PublishedImage): boolean {
  return item.src.startsWith("/") || item.src.startsWith("https://");
}

function matches(item: PublishedImage, placement: ImagePlacement, editionId?: string, personId?: string): boolean {
  if (item.placement !== placement) {
    return false;
  }
  if (editionId && item.edition_id !== editionId) {
    return false;
  }
  if (personId && item.person_id !== personId) {
    return false;
  }
  return hasSrc(item);
}

/**
 * Только записи published.json. Наличие сырья или старых файлов в public/media само по себе кадр не публикует.
 * Для history выпуск обязателен. Если варианта hero ещё нет, берётся web того же отбора.
 * Пустой src не возвращается.
 */
export function imagesFor(placement: ImagePlacement, editionId?: string, personId?: string): PublishedImage[] {
  if (placement === "history" && !editionId) {
    return [];
  }

  const pool = assets.filter((item) => matches(item, placement, editionId, personId));

  if (placement === "hero") {
    const hero = pool.filter((item) => item.variant === "hero");
    if (hero.length > 0) {
      return hero;
    }
    return pool.filter((item) => item.variant === "web");
  }
  if (placement === "team") {
    return pool.filter((item) => item.variant === "portrait" || item.variant === "web");
  }
  return pool.filter((item) => item.variant === "web");
}
