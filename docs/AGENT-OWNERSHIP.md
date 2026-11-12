# Полномочия агентов

Чаты друг друга не видят. Общие решения — в `docs/decisions/CURRENT.md`. Запрос на чужую зону — новый файл `docs/requests/<дата>-<агент>-<тема>.md`. Отчёт — новый файл `docs/reports/<дата>-<агент>.md`. Один общий журнал не ведём.

Агент блока сам решает вёрстку, локальные стили и подачу уже лежащих в данных фактов. Он не меняет токены, схемы, зависимости, workflow, соседние секции и глобальные правила. Нужное изменение общего контракта — запрос архитектору, а не правка «заодно».

Пуш в `main` публикует сайт. Его делает только архитектор по просьбе владельца.

## Матрица

| Роль | Может менять | Читает, но не правит |
| --- | --- | --- |
| Архитектор | `src/styles/**`, `src/components/**`, `src/layouts/**`, `src/scripts/**`, `src/content/**` кроме текстов секций, `src/pages/index.astro` только как порядок секций, `astro.config.mjs`, `package.json`, workflow, SEO и единственное подключение Метрики, `docs/ARCHITECTURE.md`, `docs/design/DESIGN.md`, `docs/AGENT-OWNERSHIP.md`, `docs/decisions/**` | тексты в `src/sections/**`, отчёты блоков, `data/photobank/registry.json` |
| Hero и анонс | `src/sections/hero/**`, `src/sections/edition/**` | `editions.ts`, `catalog.ts`, списки хостов |
| Аудитория и суть | `src/sections/audience/**` | даты, номера выпусков, фотобанк |
| Метод | `src/sections/method/**` | календарь конкретного выпуска, `reportage()` |
| Хосты | `src/sections/hosts/PastHosts.astro`, `src/sections/hosts/ConfirmedHosts.astro`, `src/sections/hosts/HostOffer.astro`, `src/sections/hosts/copy.ts` | `participations.ts`, `organizations.ts`, `src/sections/edition/**` |
| Фотобанк / бильд-редактор | `assets-inbox/`, `assets-raw/`, `assets-work/`, `assets-photobank/`, `data/photobank/`, `docs/photo-review/`, `docs/photobank/`, `scripts/photobank/` | `src/**`, `public/**`, workflow |
| Участники | `src/sections/participants/**` | карточки людей, пока их нет в данных |
| История | `src/sections/history/**`, `src/pages/history/**`, `docs/history/**` | `src/content/**`, фотобанк, секции хостов и отзывов |
| Отзывы | `src/sections/reviews/**` | новые цитаты сначала в `people.ts` через запрос |
| Команда и контакты | `src/sections/team/**`, `src/sections/contacts/**` | `contacts.ts` |
| Telegram | `src/content/telegram-intake.ts`, `docs/TELEGRAM-INTAKE.md`, будущий код приёма в `src/integrations/telegram/**` | публикация в `editions.ts` и `participations.ts` до отдельного приёма архитектора |

`src/content/` хранит факты. Текст секции лежит в `src/sections/<блок>/copy.ts` и принадлежит агенту этого блока. Общего файла с текстами всех секций нет.

Фотография на сайте берётся только из `imagesFor()` в `src/content/images.ts`. Этот модуль читает `data/photobank/published.json`. Пока отбор не опубликован, блок рисуется без изображения. Свои копии, свои ресайзы и пути в `assets-raw`, `assets-photobank` или `public/media/editions/` агентам блоков не нужны.

Три списка хостов не смешиваются:

| Задача | Файл | Откуда данные |
| --- | --- | --- |
| Агентства, которые принимали раньше | `src/sections/hosts/PastHosts.astro`, `#past-hosts` | `pastHostEditions()` — только `status: completed` |
| Подтверждённые хосты ближайшего выпуска | `src/sections/hosts/ConfirmedHosts.astro`, `#confirmed-hosts` | `hostsOf(featuredEdition().id)` — только участия с ролью `host` у выпуска с `announcement: featured` |
| Приглашение новым хостам и формат встречи | `src/sections/hosts/HostOffer.astro`, `#hosts` | `hostOffer` в `src/sections/hosts/copy.ts`, без имён из двух списков выше |

Агент ближайшего выпуска ведёт даты и четыре дня в `src/sections/edition/Edition.astro` и не вставляет туда имена хостов. Страницы `src/pages/history/**` ведёт агент истории: там хосты одного прошедшего выпуска, не ближайшего.

Агент истории работает по досье `docs/history/`. Дополнение выпусков, организаций, участий, людей и отзывов он сдаёт одним файлом `docs/history/data-package.md` и сам в `src/content/` не записывает. Архитектор принимает пакет целиком. Пока пакет не принят, страницы берут уже лежащие факты и не заводят второй справочник в текстах секции.

Кадры истории приходят от бильд-редактора: назначение `history`, чтение через `imagesFor("history", editionId)`. История не копирует файлы, не делает ресайзы и не правит реестр фотобанка. Нет кадра — страница без изображения. Обложку другого выпуска подписывать этим выпуском нельзя.

Счётчик Метрики один, в `src/layouts/Layout.astro`. Номер и имена целей — `src/content/analytics.ts`. Блок ставит `data-goal` на свою ссылку или кнопку и не вставляет второй `tag.js` или `ym(..., "init")`. Клик по фотоленте считает общий скрипт, когда ленту листает человек, а не автопрокрутка.

Порядок секций в `src/pages/index.astro` принадлежит архитектору. Новый блок на главную — запросом.

## Готовность блока

- Сборка `npm run build` проходит.
- Нет горизонтального скролла на 360, 390, 430, 1280 и 1440.
- Заголовки на русском переносятся, кнопки не обрезаны.
- Нет цен, выдуманных дат, выдуманных отзывов и смешения прошлых хостов с ближайшим выпуском.
- Нет технических комментариев о каноне, sitemap и «отсутствующих данных» в видимом тексте.
- Нет второго подключения Метрики.
- Нет собственной копии фотографии.
- Локальные стили не попали в `src/styles/global.css`.
