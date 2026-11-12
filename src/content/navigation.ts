import { goals, type AnalyticsGoal } from "./analytics";

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
  [
    { href: "/#essence", label: "Проект" },
    { href: "/#audience", label: "Для кого" },
    { href: "/#method", label: "Программа", goal: goals.interestProgram },
    { href: "/#past-hosts", label: "Кто принимал" },
    { href: "/#confirmed-hosts", label: "Хосты выпуска" },
    { href: "/#edition", label: "Ближайший выпуск", goal: goals.interestProgram },
  ],
  [
    { href: "/#participants", label: "Участники" },
    { href: "/#history", label: "История", goal: goals.interestHistory },
    { href: "/#reviews", label: "Отзывы" },
    { href: "/#hosts", label: "Хостам" },
    { href: "/#team", label: "Команда" },
    { href: "/#contacts", label: "Контакты" },
  ],
];

export function footerColumns(showConfirmedHosts: boolean): NavLink[][] {
  if (showConfirmedHosts) {
    return footerNavColumns;
  }
  return footerNavColumns.map((column) => column.filter((item) => item.href !== "/#confirmed-hosts"));
}

export const mobileNav = footerNavColumns.flat();
