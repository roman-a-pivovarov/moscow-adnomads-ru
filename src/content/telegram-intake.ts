/**
 * Контракт приёма карточек из Telegram.
 * Сборка сайта эти типы не читает и ничего не публикует сама.
 * Хэштеги не показываются посетителям.
 */

export const telegramIntake = {
  publishHashtag: "#мск_в_эфир",
  correctHashtag: "#мск_исправить",
  ignoredWithoutHashtag: true,
  cadence: "daily",
} as const;

export type IntakeRole = "participant" | "host";

export type IntakeCard = {
  telegramChatId: string;
  telegramMessageId: number;
  stableId: string;
  editionId: string;
  role: IntakeRole;
  name: string;
  title?: string;
  organizationName: string;
  city?: string;
  photoFileId?: string;
  note?: string;
};

export type IntakeStatus = "accepted" | "rejected" | "duplicate" | "corrected";

export type IntakeRecord = {
  stableId: string;
  status: IntakeStatus;
  reason?: string;
  acceptedCard?: IntakeCard;
  previousCard?: IntakeCard;
  processedAt: string;
};
