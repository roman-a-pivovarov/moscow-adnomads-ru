# Входящие фотографии

Сюда Роман кладёт пачки. Папка не коммитится и не публикуется. Исходные ZIP и альбомы после импорта не удаляются: локальная копия не заменяет резерв в Google Photos.

Ожидаемые имена:

| Куда положить | Выпуск |
| --- | --- |
| `assets-inbox/2019-09/` или `2019-09.zip` | 2019-moscow-practices · ADNOMADS-26 |
| `assets-inbox/2021-11/` или `2021-11.zip` | 2021-moscow · ADNOMADS-32 |
| `assets-inbox/2026-02/` или `2026-02.zip` | 2026-moscow-february · ADNOMADS-49 |
| `assets-inbox/2026-05/` или `2026-05.zip` | 2026-moscow-may · ADNOMADS-51 |
| `assets-inbox/2026-09/` или `2026-09.zip` | 2026-moscow-september · ADNOMADS-53 |
| `assets-inbox/team/roman/` | person-roman |
| `assets-inbox/team/irina/` | person-irina |
| `assets-inbox/shared/` | общие кадры |

Подойдут вложенные папки, ZIP с лишней корневой папкой, кириллица и одинаковые имена. Дата файла не выбирает выпуск.

Если есть ссылка на альбом Google Photos, положите её одной строкой в `ALBUM_URL.txt` внутри пачки. JSON-sidecar Google Photos можно не отделять: импорт сохранит его рядом с оригиналом и не перепишет выпуск.

Проверка без записи:

```powershell
node scripts/photobank/check-inbox.mjs
```

Импорт:

```powershell
node scripts/photobank/import.mjs
node scripts/photobank/import.mjs --batch=2019-09
```

Перед первым запуском один раз: `npm install --prefix scripts/photobank`.
