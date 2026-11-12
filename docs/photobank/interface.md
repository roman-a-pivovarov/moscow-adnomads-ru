# Фотобанк: интерфейс для архитектора

Фотобанк — единственный источник кадров проекта. Агенты блоков берут фотографию по `asset_id` из `data/photobank/registry.json` и не делают собственные копии и ресайзы.

Импорт не публикует кадр. Пока редактор не отобрал фотографии, в `src/content/media.ts` и `public/` ничего из новой пачки не пишется.

## Чьи файлы

Фотобанк ведёт:

- `assets-inbox/`, `assets-raw/`, `assets-work/`
- `assets-photobank/`
- `data/photobank/`
- `docs/photo-review/`
- `docs/photobank/`
- `scripts/photobank/`

Не трогает страницы, стили, тексты, `src/content/*`, `public/` и workflow деплоя. `sharp` стоит отдельно в `scripts/photobank/package.json`, чтобы сборка сайта его не тянула.

## Как получить кадр

```powershell
node scripts/photobank/query.mjs msk-000001
node scripts/photobank/query.mjs --edition=2019-moscow-practices --status=selected --placement=history
```

Ответ — JSON. Версии лежат в `versions`:

| Ключ | Что это |
| --- | --- |
| `original` | путь к неизменённому оригиналу, не для сайта |
| `thumb` | каталожная WebP, длинная сторона около 360 |
| `web` | основная WebP, длинная сторона до 1400 |
| `hero` | только по запросу, до 1920, не для всего архива |
| `portrait` | только по запросу, до 1000, без квадратной обрезки |

У `web`, `hero` и `portrait` есть `width`, `height`, `bytes`. Статус и назначения — в `editorial.status` и `editorial.placements`. Содержание кадра — в `editorial.scene_tags`, это не место на сайте.

`edition_id` совпадает с `Edition.id` в `src/content/editions.ts`. `canonical_tour_id` совпадает с `Edition.adnomadsId`. Команда: `person-roman`, `person-irina`.

Назначения, которые уже можно запрашивать: `home`, `history`, `program`, `hosts`, `team`, `hero`.

Публичный адрес появится только после экспорта отобранного кадра в `data/photobank/published.json`. До этого блок обходится без изображения и не берёт внутренний путь реестра.

## Деплой

Проверено по `.github/workflows/deploy-reg.yml`: на FTP уходит `./dist/` после `astro build`. `assets-raw`, `assets-inbox`, `assets-work`, `assets-photobank` и `docs/photo-review` в `public/` не копируются, поэтому в `dist/` не попадают.

Просьба к архитектору: не возвращать выгрузку корня репозитория и не добавлять в сборку копирование сырья, ZIP, рабочего каталога распаковки и внутреннего HTML-каталога. Текущие файлы в `public/media/` — прежние заглушки, не реестр фотобанка.

## HEIC

Настоящий HEIC/HEIF читается отдельным декодером Python в `scripts/photobank/.venv`. JPEG, PNG и остальные форматы по-прежнему идут через sharp. Файл с расширением `.HEIC`, внутри которого JPEG, обрабатывается как JPEG. Установка на Windows: `docs/photobank/install-windows.md`.

Декодирование не выбирает кадр и не пишет `published.json`. Временный PNG удаляется сразу после кадра. Оригинал HEIC остаётся в `assets-raw`.

## Повторный импорт

`asset_id` вида `msk-000001` не зависит от имени файла и не начинается заново на каждой пачке. Одинаковые байты не создают второй оригинал. Совпавшее имя другого файла не затирает уже сохранённый оригинал. `editorial` при импорте не меняется. Тот же файл в другом выпуске даёт `source_conflict` и не переписывает уже назначенный `edition_id`.

## Принято архитектором, 2026-11-12

Интерфейс выше принят. Уточнение для публикации, чтобы блоки не читали внутренний реестр:

- Сайт не импортирует `registry.json` и не ссылается на `assets-raw`, `assets-work`, `assets-photobank`.
- Отобранный кадр фотобанк записывает в `data/photobank/published.json` и кладёт файл в `public/media/photobank/<asset_id>/<variant>.webp`.
- Схема записи: `asset_id`, `edition_id`, `person_id`, `placement`, `variant`, `src`, `width`, `height`, `alt`, `caption`.
- В публикацию попадает кадр со статусом `selected`. У записи обязательно есть `edition_id`, а у портрета ещё и `person_id`. Назначение `history` без выпуска кадры разных поездок не разделяет.
- `imagesFor(placement, editionId?, personId?)` применяет эти фильтры вместе. Для `history` вызов без `editionId` ничего не возвращает. Если варианта `hero` ещё нет, страница берёт `web` того же отбора. Пустой или посторонний `src` не попадает в разметку.
- Пока в `published.json` нет отобранных кадров, страницы остаются без фотографии. Файлы в `public/media/editions/` и сырьё в реестре сами по себе на сайт не выходят.
- Архивный кадр с `edition_id` прошедшего выпуска не назначать портретом и не назначать составом будущего выпуска. Для истории выпуска у него назначение `history`.
- Корень репозитория на FTP не возвращаем. Сырьё, ZIP, рабочая распаковка и внутренний каталог в сборку не входят.
