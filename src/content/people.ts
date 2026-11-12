import type { Person, Review } from "./types";

export const people: Person[] = [
  {
    id: "person-roman",
    name: "Роман Пивоваров",
    kind: "team",
    publicRole: "Основатель и модератор",
    sourceIds: ["src-org-contacts"],
  },
  {
    id: "person-irina",
    name: "Ирина Генералова",
    kind: "team",
    publicRole: "Исполнительный продюсер",
    sourceIds: ["src-org-contacts"],
  },
  {
    id: "person-dmitry-lukashev",
    name: "Дмитрий Лукашев",
    kind: "review-author",
    publicRole: "Владелец РА «Mediaseller»",
    sourceIds: ["src-live-2019"],
  },
];

export const reviews: Review[] = [
  {
    id: "review-2019-lukashev",
    editionId: "2019-moscow-practices",
    personId: "person-dmitry-lukashev",
    quote:
      "Агентства были очень открытые. Говорили про деньги. А это значит, что нашим организаторам они доверяют, доверяют тем людям, которые с ними пришли. По градусу открытости это были одни из лучших встреч.",
    sourceIds: ["src-live-2019"],
  },
];
