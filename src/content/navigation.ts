import { goals, type AnalyticsGoal } from "./analytics";
import { contacts } from "./contacts";

export type NavLink = {
  href: string;
  label: string;
  goal?: AnalyticsGoal;
};

export const nav: NavLink[] = [
  { href: "/#essence", label: "Проект" },
  { href: "/#method", label: "Программа", goal: goals.interestProgram },
  { href: "/#hosts", label: "Хосты" },
  { href: "/#edition", label: "Выпуск", goal: goals.interestProgram },
  { href: "/#history", label: "История", goal: goals.interestHistory },
  { href: "/#contacts", label: "Контакты" },
];

export const footerNavColumns: NavLink[][] = [
  nav,
  [
    { href: contacts.hello.href, label: contacts.hello.label },
    { href: contacts.participate.telegramHref, label: "Telegram" },
    { href: contacts.historyHome.href, label: contacts.historyHome.label },
  ],
];

export function footerColumns(showConfirmedHosts: boolean): NavLink[][] {
  if (showConfirmedHosts) {
    return footerNavColumns;
  }
  return footerNavColumns.map((column) => column.filter((item) => item.href !== "/#confirmed-hosts"));
}

export const mobileNav = footerNavColumns.flat();
