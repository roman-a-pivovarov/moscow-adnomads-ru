import { editions } from "./editions";
import { imagesFor, type PublishedImage } from "./images";
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
    .filter((item) => item.editionId === editionId && item.role === "host" && item.organizationId)
    .flatMap((item) => {
      const organization = organizationById(item.organizationId ?? "");
      if (!organization) {
        return [];
      }
      return [{ ...organization, name: item.label || organization.name }];
    });
}

export type PublicParticipant = {
  id: string;
  name: string;
  companyLabel?: string;
  roleLabel?: string;
  city?: string;
};

/** Подтверждённые участники этой поездки. Пустые поля другой поездки сюда не переносятся. */
export function participantsOf(editionId: string): PublicParticipant[] {
  return participations
    .filter((item) => item.editionId === editionId && item.role === "participant" && item.personId)
    .flatMap((item) => {
      const person = people.find((entry) => entry.id === item.personId);
      if (!person) {
        return [];
      }
      return [
        {
          id: person.id,
          name: person.name,
          ...(item.companyLabel ? { companyLabel: item.companyLabel } : {}),
          ...(item.roleLabel ? { roleLabel: item.roleLabel } : {}),
          ...(item.city ? { city: item.city } : {}),
        },
      ];
    });
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

/**
 * Кадр постоянного проекта на первом экране.
 * Это основной hero-кадр последней прошедшей поездки из уже опубликованного отбора.
 * edition_id кадра не меняется и не становится идентификатором ближайшего анонса.
 * Пока нет отдельного файла hero, берётся web того же отбора. Это предложение команды, не выбор Романа.
 */
export function projectStill(): { image: PublishedImage; edition: Edition } | undefined {
  const completed = editions
    .filter((edition) => edition.status === "completed")
    .sort((a, b) => b.moscowNumber - a.moscowNumber);
  for (const edition of completed) {
    const image = imagesFor("hero", edition.id)[0];
    if (image && image.edition_id === edition.id) {
      return { image, edition };
    }
  }
  return undefined;
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
