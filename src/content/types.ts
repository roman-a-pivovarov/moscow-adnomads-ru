export type DatePrecision = "day-range" | "month";

export type EditionStatus = "completed" | "upcoming";

/** Публичный анонс переключается только этим полем, не сравнением с сегодняшней датой. */
export type AnnouncementRole = "featured" | "none";

export type HostListStatus = "complete" | "partial" | "none";

export type SourceRef = {
  id: string;
  title: string;
  repo?: string;
  path?: string;
  revision?: string;
  url?: string;
  retrieved?: string;
};

export type EditionDay = {
  date: string;
  label: string;
  focus: string;
};

export type Edition = {
  id: string;
  /** Идентификатор события в каноне. Не заменяет id сайта. */
  canonicalId?: string;
  slug: string;
  moscowNumber: number;
  adnomadsNumber: number;
  adnomadsId: string;
  title: string;
  status: EditionStatus;
  announcement: AnnouncementRole;
  year: number;
  month?: number;
  startDate?: string;
  endDate?: string;
  dateLabel: string;
  datePrecision: DatePrecision;
  summary: string;
  hostListStatus: HostListStatus;
  historyPageUrl?: string;
  days?: EditionDay[];
  sourceIds: string[];
};

export type Organization = {
  id: string;
  /** Идентификатор организации в каноне. Публичное имя остаётся в name. */
  canonicalId?: string;
  name: string;
  sourceIds: string[];
};

export type ParticipationRole = "host" | "participant";

export type Participation = {
  id: string;
  editionId: string;
  organizationId?: string;
  personId?: string;
  role: ParticipationRole;
  /** Подпись хоста в этом выпуске, если она отличается от имени организации. */
  label?: string;
  companyLabel?: string;
  roleLabel?: string;
  city?: string;
  canonicalEdgeId?: string;
  sourceIds: string[];
};

export type PersonKind = "team" | "review-author" | "participant";

export type Person = {
  id: string;
  canonicalId?: string;
  name: string;
  kind: PersonKind;
  publicRole?: string;
  sourceIds: string[];
};

export type Review = {
  id: string;
  editionId: string;
  personId: string;
  quote: string;
  sourceIds: string[];
};

export type MediaKind = "cover" | "reportage";

export type MediaItem = {
  id: string;
  editionId: string;
  src: string;
  alt: string;
  kind: MediaKind;
  caption: string;
  sourcePath: string;
  sourceIds: string[];
};
