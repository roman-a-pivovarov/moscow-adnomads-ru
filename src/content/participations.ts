import type { Participation } from "./types";

const go = "go-20261010-company-engagements";
const program = "src-adnomads-moscow-program-2026-20261112";
const confirmed = "rpkb-source-live-adnomads-participants-2026-10-11";
const msp = "src-sales1820-file-6-20261014";
const handoff = "src-owner-moscow-participants-handoff-20261113";

function host(
  editionId: string,
  organizationId: string,
  edgeId: string,
  sourceId: string,
  label?: string,
): Participation {
  return {
    id: edgeId,
    editionId,
    organizationId,
    role: "host",
    ...(label ? { label } : {}),
    canonicalEdgeId: edgeId,
    sourceIds: [sourceId],
  };
}

function guest(
  editionId: string,
  personId: string,
  sourceIds: string[],
  details: { companyLabel?: string; roleLabel?: string; city?: string } = {},
): Participation {
  return {
    id: `${editionId}:${personId}`,
    editionId,
    personId,
    role: "participant",
    ...details,
    sourceIds,
  };
}

const edition26 = "2019-moscow-practices";
const edition32 = "2021-moscow";
const edition49 = "2026-moscow-february";
const edition51 = "2026-moscow-may";
const edition53 = "2026-moscow-september";

/** Встречи хостов и подтверждённые участия. Неподтверждённые именные строки в этот файл не входят. */
export const participations: Participation[] = [
  host(edition26, "org-cros", "rpkb-edge-adnomads-host-ce-cros_digital-t26", go),
  host(edition26, "org-justnow", "rpkb-edge-adnomads-host-ce-justnow-t26", go),
  host(edition26, "org-1994lab", "rpkb-edge-adnomads-host-ce-1994lab-t26", go),
  host(edition26, "org-actis-wunderman", "rpkb-edge-adnomads-host-ce-actis_wunderman-t26", go),
  host(edition26, "org-banana-trends", "rpkb-edge-adnomads-host-ce-banana_trends-t26", go),
  host(edition26, "org-red-keds", "rpkb-edge-adnomads-host-ce-red_keds-t26", go),
  host(edition26, "org-total-view", "rpkb-edge-adnomads-host-ce-total_view-t26", go),
  host(edition26, "org-wonderfull", "rpkb-edge-adnomads-host-ce-wonderfull-t26", go),
  host(edition26, "org-socialist", "rpkb-edge-adnomads-host-ce-socialist-t26", go),
  host(edition26, "org-mailru", "rpkb-edge-adnomads-host-ce-mail_ru_group-t26", go),
  host(edition26, "org-digital-audio", "rpkb-edge-adnomads-host-ce-digital_audio-t26", go),
  host(edition26, "org-cms-magazine", "rpkb-edge-adnomads-host-ce-cms_magazine-t26", go),
  host(edition26, "org-andriyashkin", "rpkb-edge-adnomads-host-ce-andriyashkin_partners-t26", go),
  host(edition26, "org-rta", "rpkb-edge-adnomads-host-ce-r_ta-t26", go),
  host(edition26, "org-2sharp", "rpkb-edge-adnomads-host-ce-2sharp-t26", go),
  host(edition26, "org-segmento", "rpkb-edge-adnomads-host-ce-segmento-t26", go),
  host(edition26, "org-media-nation", "rpkb-edge-adnomads-host-ce-media_nation-t26", go),
  host(edition26, "org-leo-burnett", "rpkb-edge-adnomads-host-ce-leo_burnett_moscow-t26", go),
  host(edition26, "org-voshod", "rpkb-edge-adnomads-host-ce-voskhod-t26", go),

  host(edition32, "org-salt", "rpkb-edge-adnomads-host-ce-salt-t32", go),
  host(edition32, "org-possible", "rpkb-edge-adnomads-host-ce-possible_group-t32", go),
  host(edition32, "org-npf", "rpkb-edge-adnomads-host-ce-npf_creative_group-t32", go),
  host(edition32, "org-adventum", "rpkb-edge-adnomads-host-ce-adventum-t32", go),
  host(edition32, "org-media-nation", "rpkb-edge-adnomads-host-ce-media_nation-t32", go),
  host(edition32, "org-dpg", "rpkb-edge-adnomads-host-ce-dpg_russia-t32", go),
  host(edition32, "org-zebra", "rpkb-edge-adnomads-host-ce-zebra_hero-t32", go),
  host(edition32, "org-marylin", "rpkb-edge-adnomads-host-ce-marylin-t32", go),
  host(edition32, "org-yandex", "rpkb-edge-adnomads-host-ce-yandex-t32", go),
  host(edition32, "org-sinners", "rpkb-edge-adnomads-host-ce-sinners-t32", go),
  host(edition32, "org-rodnya", "rpkb-edge-adnomads-host-ce-rodnya-t32", go),
  host(edition32, "org-kb-12", "rpkb-edge-adnomads-host-ce-kb_12-t32", go),
  host(edition32, "org-aori", "rpkb-edge-adnomads-host-ce-aori-t32", go),
  host(edition32, "org-getresponse-russia", "rpkb-edge-adnomads-host-ce-getresponse_russia-t32", go),

  host(edition49, "org-akar", "rpkb-edge-adnomads-host-ce-akar-t49", go),
  host(edition49, "org-rore", "rpkb-edge-adnomads-host-ce-rore_group-t49", go),
  host(edition49, "org-media-nation", "rpkb-edge-adnomads-host-ce-media_nation-t49", go),
  host(edition49, "org-socialist", "rpkb-edge-adnomads-host-ce-socialist-t49", go),
  host(edition49, "org-like", "rpkb-edge-adnomads-host-ce-like_retail_media-t49", go),
  host(edition49, "org-setters", "rpkb-edge-adnomads-host-ce-setters-t49", go),
  host(edition49, "org-redday", "rpkb-edge-adnomads-host-ce-redday-t49", go),
  host(edition49, "org-zeytz", "rpkb-edge-adnomads-host-ce-zeytz-t49", go),
  host(edition49, "org-okkam", "rpkb-edge-adnomads-host-ce-okkam-t49", go),
  host(edition49, "org-voshod", "rpkb-edge-adnomads-host-ce-voskhod-t49", go),
  host(edition49, "org-sunlight", "rpkb-edge-adnomads-host-ce-sunlight-t49", go),
  host(edition49, "org-trendfox", "rpkb-edge-adnomads-host-ce-trendfox-t49", go),
  host(edition49, "org-adventum", "rpkb-edge-adnomads-host-ce-adventum-t49", go),

  host(edition51, "org-agima", "rpkb-edge-adnomads-host-ce-agima-t51", go),
  host(edition51, "org-friends", "rpkb-edge-adnomads-host-ce-friends-t51", go),
  host(edition51, "org-didenok", "rpkb-edge-adnomads-host-ce-didenok-t51", go),
  host(edition51, "org-illan", "rpkb-edge-adnomads-host-ce-illan-t51", go),
  host(edition51, "org-hybrid", "rpkb-edge-adnomads-host-ce-hybrid-t51", go),
  host(edition51, "org-ony", "rpkb-edge-adnomads-host-ce-ony-t51", go),
  host(edition51, "org-2gis", "rpkb-edge-adnomads-host-ce-2gis-t51", go),
  host(edition51, "org-rore", "rpkb-edge-adnomads-host-ce-rore_group-t51", go),
  host(edition51, "org-vk", "rpkb-edge-adnomads-host-ce-vk_group-t51", go),
  host(edition51, "org-depot", "rpkb-edge-adnomads-host-ce-depot-t51", go),
  host(edition51, "org-twiga", "rpkb-edge-adnomads-host-ce-twiga-t51", go),
  host(edition51, "org-completo", "rpkb-edge-adnomads-host-ce-completo-t51", go),

  host(edition53, "org-yandex", "rpkb-edge-adnomads-host-program-yandex-t53", program, "Яндекс Реклама"),
  host(edition53, "org-roden", "rpkb-edge-adnomads-host-program-roden_media-t53", program),
  host(edition53, "org-usilitel", "rpkb-edge-adnomads-host-program-usilitel_vkusa-t53", program),
  host(edition53, "org-nectarine", "rpkb-edge-adnomads-host-program-nektarin-t53", program),
  host(edition53, "org-creative-family", "rpkb-edge-adnomads-host-program-creative_family-t53", program),
  host(edition53, "org-d-innovative", "rpkb-edge-adnomads-host-program-d_innovative_group-t53", program),
  host(edition53, "org-avito-ads", "rpkb-edge-adnomads-host-program-avito_reklama-t53", program),
  host(edition53, "org-realweb", "rpkb-edge-adnomads-host-program-realweb-t53", program),
  host(edition53, "org-2sharp", "rpkb-edge-adnomads-host-program-2sharp-t53", program),
  host(edition53, "org-genius", "rpkb-edge-adnomads-host-program-genius-t53", program),
  host(edition53, "org-ddvb", "rpkb-edge-adnomads-host-program-ddvb-t53", program),

  guest(edition26, "person-olga-kovalchuk", [msp, confirmed], { companyLabel: "Virgo Group", city: "Находка" }),
  guest(edition26, "person-vadim-tylik", [msp, confirmed], { companyLabel: "RMAA Regions", city: "Хабаровск / Москва" }),
  guest(edition26, "person-ayder-bekirov", [msp, confirmed], { companyLabel: "Европа плюс Киргизия", city: "Бишкек" }),
  guest(edition26, "person-dmitry-lukashev", [msp, confirmed], { companyLabel: "Медиаселлер", city: "Краснодар" }),
  guest(edition26, "person-mariya-kirsanova", [msp, handoff], { companyLabel: "Медиахолдинг Радиосити", city: "Подмосковье" }),
  guest(edition26, "person-dzhamilya-sadek", [msp, handoff], { companyLabel: "Европа плюс Киргизия", city: "Бишкек" }),
  guest(edition26, "person-marina-buzubaeva", [msp, confirmed], { companyLabel: "ТВ Медиа Диджитал", city: "Алматы" }),
  guest(edition26, "person-mariya-grokh", [msp, handoff]),
  guest(edition26, "person-olga-gavrilova", [msp, handoff]),
  guest(edition26, "person-viktoriya-strelkova", [msp, handoff]),

  guest(edition32, "person-vadim-tylik", [confirmed], { companyLabel: "RMAA", roleLabel: "владелец", city: "Москва" }),
  guest(edition32, "person-viktor-zhukov", [confirmed], { companyLabel: "«Вебэлемент»", roleLabel: "директор", city: "Пятигорск" }),
  guest(edition32, "person-vladimir-gannenko", [confirmed], { companyLabel: "Два Слона", roleLabel: "генеральный директор", city: "Ярославль" }),
  guest(edition32, "person-ilya-saykov", [confirmed], { companyLabel: "MegaArtDigital", roleLabel: "владелец", city: "Нижний Новгород" }),
  guest(edition32, "person-marina-plyashechnik", [confirmed], { companyLabel: "«Антанта»", roleLabel: "коммерческий директор", city: "Ростов-на-Дону" }),
  guest(edition32, "person-mariya-bubnova", [confirmed], { companyLabel: "Два Слона", roleLabel: "коммерческий директор", city: "Ярославль" }),
  guest(edition32, "person-olga-glukhova", [confirmed], { companyLabel: "«Виват»", roleLabel: "владелец", city: "Казань" }),
  guest(edition32, "person-yuliya-belashevskaya", [confirmed], { companyLabel: "«Река»", roleLabel: "директор", city: "Самара" }),

  guest(edition49, "person-aleksey-makhnev", [confirmed]),
  guest(edition49, "person-vladimir-gannenko", [confirmed]),
  guest(edition49, "person-vladimir-savin", [confirmed]),
  guest(edition49, "person-evgeny-soloviev", [confirmed]),
  guest(edition49, "person-elena-shaburova", [confirmed]),
  guest(edition49, "person-igor-kuznetsov", [confirmed]),
  guest(edition49, "person-mariya-bubnova", [confirmed]),
  guest(edition49, "person-milan-radakovich", [confirmed]),
  guest(edition49, "person-sergey-mayamsin", [confirmed]),
  guest(edition49, "person-yuliya-belashevskaya", [confirmed]),
  guest(edition49, "person-aleksandra-monastyrshina", [confirmed]),
  guest(edition49, "person-marina-shcherbakova", [confirmed]),
  guest(edition49, "person-pavel-borevich", [confirmed]),

  guest(edition51, "person-aleksey-makhnev", [confirmed]),
  guest(edition51, "person-vladimir-gannenko", [confirmed]),
  guest(edition51, "person-vladimir-savin", [confirmed]),
  guest(edition51, "person-igor-kuznetsov", [confirmed]),
  guest(edition51, "person-mariya-bubnova", [confirmed]),
  guest(edition51, "person-mariya-golovko", [confirmed]),
  guest(edition51, "person-natalya-sheremet", [confirmed]),
  guest(edition51, "person-aleksandra-monastyrshina", [confirmed]),
  guest(edition51, "person-sergey-glukhov", [confirmed]),
];
