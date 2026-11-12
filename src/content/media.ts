import type { MediaItem } from "./types";

/**
 * Временные обложки прошедших выпусков из публичной выборки.
 * Новый кадр сюда не копировать: его публикует фотобанк в data/photobank/published.json.
 * Эти файлы не портреты и не состав ближайшего выпуска.
 */

export const media: MediaItem[] = [
  {
    id: "media-2019-cover",
    editionId: "2019-moscow-practices",
    src: "/media/editions/2019-moscow-practices/cover.webp",
    alt: "Обложка московского выпуска ADNOMADS 2019",
    kind: "cover",
    caption: "2019 · №26",
    sourcePath: "public/assets/tours/2019-moscow-practices/cover/adn_2019_moscow_2019-moscow-practices_cover_001.webp",
    sourceIds: ["src-public-assets"],
  },
  {
    id: "media-2019-r1",
    editionId: "2019-moscow-practices",
    src: "/media/editions/2019-moscow-practices/reportage-001.webp",
    alt: "Встреча группы ADNOMADS в московском агентстве, 2019",
    kind: "reportage",
    caption: "Москва, 2019",
    sourcePath:
      "public/assets/tours/2019-moscow-practices/reportage/adn_2019_moscow_practices_moscow_reportage_001.webp",
    sourceIds: ["src-public-assets"],
  },
  {
    id: "media-2019-r4",
    editionId: "2019-moscow-practices",
    src: "/media/editions/2019-moscow-practices/reportage-004.webp",
    alt: "Кадр московской программы ADNOMADS, 2019",
    kind: "reportage",
    caption: "Москва, 2019",
    sourcePath:
      "public/assets/tours/2019-moscow-practices/reportage/adn_2019_moscow_practices_moscow_reportage_004.webp",
    sourceIds: ["src-public-assets"],
  },
  {
    id: "media-2021-cover",
    editionId: "2021-moscow",
    src: "/media/editions/2021-moscow/cover.webp",
    alt: "Обложка московского выпуска ADNOMADS 2021",
    kind: "cover",
    caption: "2021 · №32",
    sourcePath: "public/assets/tours/2021-moscow/cover/adn_2021_moscow_2021-moscow_cover_001.webp",
    sourceIds: ["src-public-assets"],
  },
  {
    id: "media-2026-02-cover",
    editionId: "2026-moscow-february",
    src: "/media/editions/2026-moscow-february/cover.webp",
    alt: "Обложка московского выпуска ADNOMADS, февраль 2026",
    kind: "cover",
    caption: "февраль 2026 · №49",
    sourcePath: "public/assets/tours/2026-moscow-february/cover/adn_2026_moscow_2026-moscow-february_cover_001.webp",
    sourceIds: ["src-public-assets"],
  },
  {
    id: "media-2026-02-r1",
    editionId: "2026-moscow-february",
    src: "/media/editions/2026-moscow-february/reportage-001.webp",
    alt: "Кадр московской программы ADNOMADS, февраль 2026",
    kind: "reportage",
    caption: "Москва, февраль 2026",
    sourcePath:
      "public/assets/tours/2026-moscow-february/reportage/adn_2026_moscow_february_moscow_reportage_001.webp",
    sourceIds: ["src-public-assets"],
  },
  {
    id: "media-2026-05-cover",
    editionId: "2026-moscow-may",
    src: "/media/editions/2026-moscow-may/cover.webp",
    alt: "Обложка московского выпуска ADNOMADS, май 2026",
    kind: "cover",
    caption: "май 2026 · №51",
    sourcePath: "public/assets/tours/2026-moscow-may/cover/adn_2026_moscow_2026-moscow-may_cover_001.webp",
    sourceIds: ["src-public-assets"],
  },
  {
    id: "media-2026-05-r1",
    editionId: "2026-moscow-may",
    src: "/media/editions/2026-moscow-may/reportage-001.webp",
    alt: "Кадр московской программы ADNOMADS, май 2026",
    kind: "reportage",
    caption: "Москва, май 2026",
    sourcePath: "public/assets/tours/2026-moscow-may/reportage/adn_2026_moscow_may_moscow_reportage_001.webp",
    sourceIds: ["src-public-assets"],
  },
  {
    id: "media-2026-05-r2",
    editionId: "2026-moscow-may",
    src: "/media/editions/2026-moscow-may/reportage-002.webp",
    alt: "Кадр московской программы ADNOMADS, май 2026",
    kind: "reportage",
    caption: "Москва, май 2026",
    sourcePath: "public/assets/tours/2026-moscow-may/reportage/adn_2026_moscow_may_moscow_reportage_002.webp",
    sourceIds: ["src-public-assets"],
  },
];
