export const nav = [
  { href: "/#essence", label: "Проект" },
  { href: "/#method", label: "Программа" },
  { href: "/#hosts", label: "Хосты" },
  { href: "/#edition", label: "Выпуск" },
  { href: "/#history", label: "История" },
  { href: "/#contacts", label: "Контакты" },
] as const;

export const footerNavColumns = [
  [
    { href: "/#essence", label: "Проект" },
    { href: "/#audience", label: "Для кого" },
    { href: "/#method", label: "Программа" },
    { href: "/#past-hosts", label: "Кто принимал" },
    { href: "/#edition", label: "Ближайший выпуск" },
  ],
  [
    { href: "/#participants", label: "Участники" },
    { href: "/#history", label: "История" },
    { href: "/#reviews", label: "Отзывы" },
    { href: "/#hosts", label: "Хостам" },
    { href: "/#team", label: "Команда" },
    { href: "/#contacts", label: "Контакты" },
  ],
] as const;

export const mobileNav = footerNavColumns.flat();
