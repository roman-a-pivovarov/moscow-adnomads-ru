import { editions } from "./editions";
import { imagesFor } from "./images";
import { media } from "./media";
import { organizations } from "./organizations";
import { participations } from "./participations";
import { people, reviews } from "./people";
import type { Edition, MediaItem, Organization, Review } from "./types";

export function featuredEdition(): Edition | null {
  const featured = editions.filter((edition) => edition.announcement === "featured");
  if (featured.length > 1) {
    throw new Error("Только один выпуск может быть announcement=featured");
  }
  return featured[0] ?? null;
}

/** Напоминание в логе сборки. Само по себе дату анонса не меняет. */
export function warnIfFeaturedNeedsEditorialSwitch(now = new Date()): void {
  const featured = featuredEdition();
  if (!featured?.endDate) {
    return;
  }
  const end = new Date(`${featured.endDate}T23:59:59+03:00`);
  if (end.getTime() < now.getTime()) {
    console.warn(
      `[editions] У выпуска ${featured.adnomadsId} дата окончания уже прошла. Анонс останется на нём, пока в данных не сменят announcement. Проверки даты при сборке для переключения недостаточно.`,
    );
  }
}

export function completedEditions(): Edition[] {
  return editions
    .filter((edition) => edition.status === "completed")
    .sort((a, b) => b.moscowNumber - a.moscowNumber);
}

export function editionBySlug(slug: string): Edition | undefined {
  return editions.find((edition) => edition.slug === slug);
}

export function organizationById(id: string): Organization | undefined {
  return organizations.find((organization) => organization.id === id);
}

export function hostsOf(editionId: string): Organization[] {
  return participations
    .filter((item) => item.editionId === editionId && item.role === "host")
    .map((item) => organizationById(item.organizationId))
    .filter((item): item is Organization => Boolean(item));
}

export function featuredHasConfirmedHosts(): boolean {
  const featured = featuredEdition();
  return Boolean(featured && hostsOf(featured.id).length > 0);
}

export function pastHostEditions(): Array<{ edition: Edition; hosts: Organization[] }> {
  return editions
    .filter((edition) => edition.status === "completed" && edition.hostListStatus !== "none")
    .sort((a, b) => b.moscowNumber - a.moscowNumber)
    .map((edition) => ({ edition, hosts: hostsOf(edition.id) }));
}

export function coverOf(editionId: string): MediaItem | undefined {
  const fromBank = imagesFor("history", editionId)[0];
  if (fromBank) {
    return {
      id: fromBank.asset_id,
      editionId: fromBank.edition_id,
      src: fromBank.src,
      alt: fromBank.alt,
      kind: "cover",
      caption: fromBank.caption,
      sourcePath: fromBank.source_path ?? fromBank.asset_id,
      sourceIds: fromBank.source_ids ?? ["photobank"],
    };
  }
  return undefined;
}

/** Временные кадры публичной выборки. Не использовать как hero, портрет или состав будущего выпуска. */
export function reportage(): MediaItem[] {
  return media.filter((item) => item.kind === "reportage");
}

export function publicReviews(): Array<Review & { authorName: string; authorRole: string; editionLabel: string }> {
  return reviews.flatMap((review) => {
    const person = people.find((item) => item.id === review.personId);
    const edition = editions.find((item) => item.id === review.editionId);
    if (!person || !edition) {
      return [];
    }
    return [
      {
        ...review,
        authorName: person.name,
        authorRole: person.publicRole ?? "",
        editionLabel: `${edition.dateLabel} · №${edition.adnomadsNumber}`,
      },
    ];
  });
}

export function teamMembers() {
  return people.filter((person) => person.kind === "team");
}

const ordinals = ["", "Первый", "Второй", "Третий", "Четвёртый", "Пятый", "Шестой"];

export function moscowOrdinal(number: number): string {
  return ordinals[number] ?? `${number}-й`;
}
