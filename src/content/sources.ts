import type { SourceRef } from "./types";

/** Публичная выборка. Закрытые материалы RPKB сюда не копируются. */
export const importMeta = {
  importedOn: "2026-11-12",
  note: "Снимок публичных идентификаторов и дат. Следующее обновление заменяет этот манифест и связанные записи, а не заводит второй реестр.",
} as const;

export const sources = {
  goCsv: {
    id: "src-go-csv",
    title: "Публичный реестр поездок",
    repo: "roman-a-pivovarov/go-adnomads",
    path: "data/tours-canonical.csv",
    revision: "ae304156f01101b04e006cd58996430f5828bf73",
  },
  goDec089: {
    id: "src-dec-089",
    title: "DEC-089: №53 состоялся 23–26 сентября 2026; №55 — 17–20 февраля 2027",
    repo: "roman-a-pivovarov/go-adnomads",
    path: "docs/knowledge/canonical-decisions.md",
    revision: "ae304156f01101b04e006cd58996430f5828bf73",
  },
  goDec090: {
    id: "src-dec-090",
    title: "DEC-090: Welcome to Russia 9–12 сентября 2026 отменён и не имеет номера",
    repo: "roman-a-pivovarov/go-adnomads",
    path: "docs/knowledge/canonical-decisions.md",
    revision: "ae304156f01101b04e006cd58996430f5828bf73",
  },
  goDec031: {
    id: "src-dec-031",
    title: "DEC-031: даты и хосты №26 и №51 по живым страницам history",
    repo: "roman-a-pivovarov/go-adnomads",
    path: "docs/knowledge/archive/derived/history-reconciliation-report.md",
    revision: "ae304156f01101b04e006cd58996430f5828bf73",
  },
  goMoscowLanding: {
    id: "src-go-moscow-53",
    title: "Карточка обычного московского тура №53",
    repo: "roman-a-pivovarov/go-adnomads",
    path: "src/data/tours.ts",
    revision: "ae304156f01101b04e006cd58996430f5828bf73",
  },
  orgTrips: {
    id: "src-org-trips",
    title: "Месяцы завершённых проектов на adnomads.org",
    repo: "roman-a-pivovarov/adnomads-org",
    path: "src/content/trips.ts",
    revision: "c00ed3e5c83c3a6e8d7a5a3c9ea2c7ab5d4e7932",
  },
  orgContacts: {
    id: "src-org-contacts",
    title: "Публичные контакты Романа и Ирины",
    repo: "roman-a-pivovarov/adnomads-org",
    path: "src/content/site.ts",
    revision: "c00ed3e5c83c3a6e8d7a5a3c9ea2c7ab5d4e7932",
  },
  live2019: {
    id: "src-live-2019",
    title: "Публичная страница выпуска 2019",
    url: "https://adnomads.ru/history/2019-moscow",
    retrieved: "2026-11-12",
  },
  live2021: {
    id: "src-live-2021",
    title: "Публичная карточка №32",
    url: "https://adnomads.ru/history/2021-moscow",
    retrieved: "2026-11-12",
  },
  liveFebruary: {
    id: "src-live-2026-february",
    title: "Публичная карточка №49",
    url: "https://adnomads.ru/history/2026-moscow-february",
    retrieved: "2026-11-12",
  },
  liveMay: {
    id: "src-live-2026-may",
    title: "Подробный репортаж мая 2026. Краткая статья 2026-moscow-may список хостов не задаёт: он совпадает с февральским",
    url: "https://adnomads.ru/history/2026-may-moscow",
    retrieved: "2026-11-12",
  },
  liveSeptember: {
    id: "src-live-2026-september",
    title: "Статья №53. Видимый текст и список хостов; SEO-метаданные статьи ошибочно взяты от мая и в данные не входят",
    url: "https://adnomads.ru/history/sz0debeso1-53-moskva-rossiya",
    retrieved: "2026-11-12",
  },
  companyEngagements: {
    id: "go-20261010-company-engagements",
    title: "Канон компаний-хостов московских выпусков",
    repo: "roman-a-pivovarov/rpkb",
    revision: "61e7e09cc6f1cdf75aa7fb017bb384aa52c45bff",
  },
  septemberProgram: {
    id: "src-adnomads-moscow-program-2026-20261112",
    title: "Программа московского выпуска, сентябрь 2026",
    revision: "61e7e09cc6f1cdf75aa7fb017bb384aa52c45bff",
  },
  salesMsp: {
    id: "src-sales1820-file-6-20261014",
    title: "Именные строки участников выпуска 2019, только разрешённые поля",
    revision: "61e7e09cc6f1cdf75aa7fb017bb384aa52c45bff",
  },
  liveParticipants: {
    id: "rpkb-source-live-adnomads-participants-2026-10-11",
    title: "Подтверждённые участия в прошедших выпусках",
    revision: "61e7e09cc6f1cdf75aa7fb017bb384aa52c45bff",
  },
  participantHandoff: {
    id: "src-owner-moscow-participants-handoff-20261113",
    title: "Разрешение владельца на публикацию отобранных полей участников",
    revision: "dd54257b962338f82279d54702c2e0c3353db174",
  },
  publicAssets: {
    id: "src-public-assets",
    title: "Публичные обложки и репортажные кадры со статусом public",
    repo: "roman-a-pivovarov/go-adnomads",
    path: "data/assets-manifest.csv",
    revision: "ae304156f01101b04e006cd58996430f5828bf73",
  },
} as const satisfies Record<string, SourceRef>;
