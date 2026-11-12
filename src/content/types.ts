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
  name: string;
  sourceIds: string[];
};

export type ParticipationRole = "host";

export type Participation = {
  id: string;
  editionId: string;
  organizationId: string;
  role: ParticipationRole;
  sourceIds: string[];
};

export type PersonKind = "team" | "review-author";

export type Person = {
  id: string;
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
