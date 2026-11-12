# Установка фотобанка на Windows

Фотобанк не входит в сборку сайта. Зависимости Astro и workflow деплоя для него не меняются.

## Node

Нужен Node.js 22 или новее. Из корня репозитория:

```powershell
npm install --prefix scripts/photobank
```

`sharp` ставится только в `scripts/photobank` и читает JPEG, PNG, WebP и остальные форматы, которые он сам открывает.

## HEIC и HEIF

Настоящий HEIC декодирует Python 3.13 и готовые колёса Pillow и pillow-heif. На этой машине Python 3.15.2 есть, но колеса `pillow-heif` для него нет. Используется Python 3.13.16.

Окружение одно, локальное, в git не входит:

```powershell
& "$env:APPDATA\uv\python\cpython-3.13.16-windows-x86_64-none\python.exe" -m venv scripts\photobank\.venv
scripts\photobank\.venv\Scripts\python.exe -m pip install -r scripts\photobank\requirements.txt
```

Если интерпретатор 3.13 доступен как `py -3.13`, ту же команду можно начать с `py -3.13 -m venv scripts\photobank\.venv`.

Проверенные версии в `scripts/photobank/requirements.txt`: Pillow 13.0.0, pillow-heif 1.8.1. Собирать libheif или libvips из исходников не нужно.

Скрипт `scripts/photobank/heif_decode.py` берёт основное изображение, переводит ICC-профиль в sRGB и пишет временный PNG в `assets-work/heif-decode/`. Импорт и `derive.mjs` удаляют этот PNG и после успеха, и после ошибки. Промежуточный JPEG не создаётся.

## Команды

Из корня репозитория:

```powershell
node scripts/photobank/check-inbox.mjs
node scripts/photobank/import.mjs
node scripts/photobank/catalog.mjs
node scripts/photobank/derive.mjs --profile=hero --id=msk-000001
node scripts/photobank/verify.mjs
```

Каталог для просмотра: `docs/photo-review/index.html`. Он не страница сайта.

## Что не попадает на хостинг

`assets-inbox`, `assets-raw`, `assets-work`, `scripts/photobank/.venv` и `docs/photo-review` в git и в `dist/` не входят. Деплой выгружает только `dist/` после сборки Astro. Готовый кадр появляется на сайте только после записи в `data/photobank/published.json`.
