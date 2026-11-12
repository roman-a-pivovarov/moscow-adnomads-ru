# Внутренний каталог отбора

HTML здесь появляется после `node scripts/photobank/catalog.mjs`. Это рабочий инструмент редакции, не страница сайта: его нет в навигации, sitemap и `dist/`.

Открыть локально: `docs/photo-review/index.html`.

Страница не записывает реестр. Порядок такой: отметить кадры, экспортировать JSON, применить `node scripts/photobank/apply-decisions.mjs путь\к\photobank-decisions.json`. Повторная генерация каталога читает уже применённые решения из `data/photobank/registry.json`.
