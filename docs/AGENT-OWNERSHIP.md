# Полномочия агентов

Чаты друг друга не видят. Общие решения — в `docs/decisions/CURRENT.md`. Запрос на чужую зону — новый файл `docs/requests/<дата>-<агент>-<тема>.md`. Отчёт — новый файл `docs/reports/<дата>-<агент>.md`. Один общий журнал не ведём.

Агент блока сам решает вёрстку, локальные стили и подачу уже лежащих в данных фактов. Он не меняет токены, схемы, зависимости, workflow, соседние секции и глобальные правила. Нужное изменение общего контракта — запрос архитектору, а не правка «заодно».

Пуш в `main` публикует сайт. Его делает только архитектор по просьбе владельца.

## Матрица

| Роль | Может менять | Читает, но не правит |
| --- | --- | --- |
| Архитектор | `src/styles/**`, `src/components/**`, `src/layouts/**`, `src/scripts/**`, `src/content/**`, `src/pages/index.astro` только как порядок секций, `astro.config.mjs`, `package.json`, workflow, SEO-каркас, `docs/ARCHITECTURE.md`, `docs/design/DESIGN.md`, `docs/AGENT-OWNERSHIP.md`, `docs/decisions/**` | тексты в `src/sections/**`, отчёты блоков |
| Hero и анонс | `src/sections/hero/**`, `src/sections/edition/**` | `editions.ts`, `catalog.ts` |
| Аудитория и суть | `src/sections/audience/**` | даты и номера выпусков |
| Метод | `src/sections/method/**` | календарь конкретного выпуска |
| Хосты | `src/sections/hosts/**` | `participations.ts`, `organizations.ts` |
| Участники | `src/sections/participants/**` | карточки людей, пока их нет в данных |
| История | `src/sections/history/**`, `src/pages/history/**` | `editions.ts`, медиа, участия |
| Отзывы | `src/sections/reviews/**` | новые цитаты сначала в `people.ts` через запрос |
| Команда и контакты | `src/sections/team/**`, `src/sections/contacts/**` | `contacts.ts` |
| Telegram | `src/content/telegram-intake.ts`, `docs/TELEGRAM-INTAKE.md`, будущий код приёма в `src/integrations/telegram/**` | публикация в `editions.ts` и `participations.ts` до отдельного приёма архитектора |

`src/content/` хранит факты. Текст секции лежит в `src/sections/<блок>/copy.ts` и принадлежит агенту этого блока. Общего файла с текстами всех секций нет.

Порядок секций в `src/pages/index.astro` принадлежит архитектору. Новый блок на главную — запросом.

## Готовность блока

- Сборка `npm run build` проходит.
- Нет горизонтального скролла на 360, 390, 430, 1280 и 1440.
- Заголовки на русском переносятся, кнопки не обрезаны.
- Нет цен, выдуманных дат, выдуманных отзывов и смешения прошлых хостов с ближайшим выпуском.
- Нет технических комментариев о каноне в видимом тексте.
- Локальные стили не попали в `src/styles/global.css`.
