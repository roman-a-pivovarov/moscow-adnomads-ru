/** Единственный счётчик сайта. Новый не заводить. */
export const metrikaCounterId = 98574202;

export const goals = {
  leadParticipant: "lead_participant",
  leadHost: "lead_host",
  leadParticipantEmail: "lead_participant_email",
  leadHostEmail: "lead_host_email",
  interestHistory: "interest_history",
  interestProgram: "interest_program",
  interestPhoto: "interest_photo",
} as const;

export type AnalyticsGoal = (typeof goals)[keyof typeof goals];
