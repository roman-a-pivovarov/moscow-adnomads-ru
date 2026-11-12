import type { Participation } from "./types";

function hosts(editionId: string, organizationIds: string[], sourceId: string): Participation[] {
  return organizationIds.map((organizationId) => ({
    id: `${editionId}:${organizationId}`,
    editionId,
    organizationId,
    role: "host",
    sourceIds: [sourceId],
  }));
}

/** Встречи хостов. Неполный список остаётся неполным: недостающие имена не дописываются. */
export const participations: Participation[] = [
  ...hosts(
    "2019-moscow-practices",
    [
      "org-voshod",
      "org-red-keds",
      "org-total-view",
      "org-justnow",
      "org-segmento",
      "org-wonderfull",
      "org-socialist",
      "org-1994lab",
      "org-leo-burnett",
      "org-cros",
      "org-rta",
      "org-digital-audio",
      "org-mailru",
      "org-2sharp",
      "org-media-nation",
    ],
    "src-live-2019",
  ),
  ...hosts(
    "2021-moscow",
    [
      "org-salt",
      "org-possible",
      "org-npf",
      "org-adventum",
      "org-media-nation",
      "org-dpg",
      "org-zebra",
      "org-marylin",
      "org-yandex",
      "org-sinners",
    ],
    "src-live-2021",
  ),
  ...hosts(
    "2026-moscow-february",
    [
      "org-akar",
      "org-rore",
      "org-medianation-2026",
      "org-socialist",
      "org-like",
      "org-setters",
      "org-redday",
      "org-zeytz",
      "org-okkam",
      "org-voshod",
    ],
    "src-live-2026-february",
  ),
  ...hosts(
    "2026-moscow-may",
    [
      "org-agima",
      "org-friends",
      "org-illan",
      "org-didenok",
      "org-hybrid",
      "org-2gis",
      "org-ony",
      "org-vk",
      "org-twiga",
      "org-depot",
      "org-completo",
    ],
    "src-live-2026-may",
  ),
  ...hosts(
    "2026-moscow-september",
    [
      "org-yandex-ads",
      "org-avito-ads",
      "org-d-innovative",
      "org-realweb",
      "org-creative-family",
      "org-nectarine",
      "org-genius",
      "org-red-keds",
      "org-usilitel",
      "org-roden",
    ],
    "src-live-2026-september",
  ),
];
