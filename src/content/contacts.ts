export const contacts = {
  hello: {
    label: "hello@adnomads.ru",
    href: "mailto:hello@adnomads.ru",
  },
  roman: {
    name: "Роман Пивоваров",
    email: "roman@adnomads.org",
    emailHref: "mailto:roman@adnomads.org",
    telegramHref: "https://adnomads.ru/telegram_roman",
    phone: "+7 903 219-81-60",
    phoneHref: "tel:+79032198160",
    maxHref: "https://adnomads.ru/max_roman",
  },
  irina: {
    name: "Ирина Генералова",
    email: "irina@adnomads.org",
    emailHref: "mailto:irina@adnomads.org",
    telegramHref: "https://adnomads.ru/telegram_irina",
    phone: "+7 925 185-65-36",
    phoneHref: "tel:+79251856536",
    maxHref: "https://adnomads.ru/max_irina",
  },
  participate: {
    label: "Обсудить участие",
    messengerLabel: "Написать в Telegram",
    opener: "В первом сообщении напишите, что хотите участвовать в московской программе.",
    href: "mailto:irina@adnomads.org?subject=%D0%A3%D1%87%D0%B0%D1%81%D1%82%D0%B8%D0%B5%20%D0%B2%20%D0%BC%D0%BE%D1%81%D0%BA%D0%BE%D0%B2%D1%81%D0%BA%D0%BE%D0%B9%20%D0%BF%D1%80%D0%BE%D0%B3%D1%80%D0%B0%D0%BC%D0%BC%D0%B5",
    telegramHref: "https://adnomads.ru/telegram_irina",
  },
  host: {
    label: "Стать хостом",
    messengerLabel: "Написать в Telegram",
    opener: "В первом сообщении напишите, что хотите принять группу в своём агентстве.",
    href: "mailto:irina@adnomads.org?subject=%D0%92%D1%81%D1%82%D1%80%D0%B5%D1%87%D0%B0%20%D1%81%20%D0%B3%D1%80%D1%83%D0%BF%D0%BF%D0%BE%D0%B9%20%D0%B2%20%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B5",
    telegramHref: "https://adnomads.ru/telegram_irina",
  },
  parentSite: {
    label: "ADNOMADS",
    href: "https://adnomads.org",
  },
  historyHome: {
    label: "История ADNOMADS",
    href: "https://adnomads.ru/history",
  },
} as const;
