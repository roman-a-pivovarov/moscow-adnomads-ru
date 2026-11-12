# Пакет дополнений истории

Статус на 13 ноября 2026. Пакет принят архитектором в `src/content/`. Каталог доступен через `hostsOf()` и `participantsOf()`. Страницы читают его и не держат второй список компаний и людей.

Предыдущая сдача 12 ноября приняла десять хостов сентября из видимого текста S5. Этот пакет её уточняет: списки хостов берутся из RPKB, статья остаётся источником рассказа, а не поводом сократить канон.

## Версия

| Поле | Значение |
| --- | --- |
| package_id | `rpkb-moscow-history-20261113` |
| Разрешение | `src-owner-moscow-participants-handoff-20261113` |
| Факты, PR #107 | `61e7e09cc6f1cdf75aa7fb017bb384aa52c45bff` |
| Итоговый main RPKB, PR #108 | `dd54257b962338f82279d54702c2e0c3353db174` |
| base_main_sha манифеста | `eb55fc167b600415035cc1cbaa34c44db3bceef1` |

PR #108 меняет статус и контрольные суммы, не состав хостов, участников, ID и программу. Шесть файлов переданного архива совпали с SHA-256 в `manifest.json`: `00-version.md`, `01-hosts.md`, `02-participants-026.md`, `03-participants-other.md`, `04-program-053.md`, `README.md`. Текст отчёта `Moscow_ADNOMADS_History.md` совпадает с этими файлами. Репозиторий RPKB в сборку и деплой сайта не подключался и в этот репозиторий не копировался.

Соответствие выпусков:

| Канон | id сайта |
| --- | --- |
| ADNOMADS-26, `rpkb-event-adnomads-026` | `2019-moscow-practices` |
| ADNOMADS-32, `rpkb-event-adnomads-032` | `2021-moscow` |
| ADNOMADS-49, `rpkb-event-adnomads-049` | `2026-moscow-february` |
| ADNOMADS-51, `rpkb-event-adnomads-051` | `2026-moscow-may` |
| ADNOMADS-53, `rpkb-event-adnomads-053` | `2026-moscow-september` |

Welcome to Russia в пакет не входит и выпуском не становится.

## Что добавить в схему

Не заводить новые rpkb-id. Сайтовые id ниже сохраняются. Рядом хранится id канона.

- У `Organization` поле `canonicalId`.
- У `Person` поле `canonicalId`. Существующий `person-dmitry-lukashev` получает `rpkb-person-dmitriy-lukashev`, второй человек не создаётся.
- `ParticipationRole`: кроме `host` значение `participant`.
- У участия хоста: `canonicalEdgeId`. У участия участника: `personId`, исторические `companyLabel`, `roleLabel`, `city`. Компания участника не становится организацией-хостом.
- `hostsOf()` по-прежнему возвращает только `role: "host"`. Иначе работодатели участников попадут в «Кто уже принимал».
- Новая выборка `participantsOf(editionId)` для страниц истории: имя, компания, должность и город этой поездки. Пустые поля не заполнять из другой поездки и не из отзыва.
- `PersonKind` для новых людей: не `review-author`. Дмитрий Лукашев остаётся автором отзыва; участие 2019 года — отдельная связь.
- UUID людей не генерировать.

Источники, которые нужно завести в `sources.ts`, не подменяя прежние:

| id | Что это |
| --- | --- |
| `go-20261010-company-engagements` | Хосты №26, №32, №49, №51 |
| `src-adnomads-moscow-program-2026-20261112` | Хосты и программа №53, вкладка «сентябрь 2026», gid 1126709930 |
| `src-sales1820-file-6-20261014` | Именные строки MSP №26, строки 5–25 |
| `rpkb-source-live-adnomads-participants-2026-10-11` | Подтверждённые участники №32, №49, №51 и часть №26 |
| `src-owner-moscow-participants-handoff-20261113` | Разрешение этой передачи |

После импорта у всех пяти выпусков `hostListStatus: "complete"`. Это полнота списка хостов, не число визитов и не число участников. На странице число людей не выводить: в пакете нет отдельного проверенного показателя посещаемости. 21, 18 и 10 для 2019 года — разные уровни свидетельств, не счётчик группы.

## Хосты: дополнения

Публичное имя уже существующей организации не переписывать. Новая организация получает имя из пакета. Каноническое имя, если оно отличается, остаётся в колонке «имя канона».

### №26, сейчас 15, станет 19

Оставить текущие 15 участий. Добавить:

| Сайтовый id | Имя | canonicalId | edge_id |
| --- | --- | --- | --- |
| `org-actis-wunderman` | Actis Wunderman | `rpkb-org-go-actis_wunderman` | `rpkb-edge-adnomads-host-ce-actis_wunderman-t26` |
| `org-banana-trends` | Banana Trends | `rpkb-org-go-banana_trends` | `rpkb-edge-adnomads-host-ce-banana_trends-t26` |
| `org-cms-magazine` | CMS Magazine | `rpkb-org-go-cms_magazine` | `rpkb-edge-adnomads-host-ce-cms_magazine-t26` |
| `org-andriyashkin` | Andriyashkin & Partners | `rpkb-org-go-andriyashkin_partners` | `rpkb-edge-adnomads-host-ce-andriyashkin_partners-t26` |

У существующих проставить `canonicalId`, не меняя `name`: Восход = `rpkb-org-go-voskhod` (канон: Voskhod), Red Keds, Total View, JustNow, Segmento, Wonderfull, Socialist, 1994Lab, Leo Burnett = `rpkb-org-go-leo_burnett_moscow` (канон: Leo Burnett Moscow), Cros Digital, R:TA = `rpkb-org-go-r_ta`, Digital Audio, Mail.Ru Group = `rpkb-org-go-mail_ru_group`, 2Sharp = `rpkb-org-go-2sharp`, Media Nation = `rpkb-org-go-media_nation`. Источник связей — `go-20261010-company-engagements`.

Запись от 12 ноября «не добавлять Actis Wunderman и Banana Trends» этим пакетом снята: они есть в каноне хостов, а не только в краткой статье.

### №32, сейчас 10, станет 14

Добавить: Rodnya `org-rodnya` / `rpkb-org-go-rodnya`; KB—12 `org-kb-12` / `rpkb-org-go-kb_12`; Aori `org-aori` / `rpkb-org-go-aori`; GetResponse Russia `org-getresponse-russia` / `rpkb-org-go-getresponse_russia`. Рёбра: `rpkb-edge-adnomads-host-ce-rodnya-t32`, `rpkb-edge-adnomads-host-ce-kb_12-t32`, `rpkb-edge-adnomads-host-ce-aori-t32`, `rpkb-edge-adnomads-host-ce-getresponse_russia-t32`.

Яндекс остаётся `org-yandex`, canonicalId `rpkb-org-go-yandex`. Marylin не переименовывать.

### №49, сейчас 10, станет 13

Добавить участия: `org-adventum` (уже есть), SUNLIGHT `org-sunlight` / `rpkb-org-go-sunlight`, TRENDFOX `org-trendfox` / `rpkb-org-go-trendfox`. Рёбра: `rpkb-edge-adnomads-host-ce-adventum-t49`, `rpkb-edge-adnomads-host-ce-sunlight-t49`, `rpkb-edge-adnomads-host-ce-trendfox-t49`.

Февральскую связь `org-medianation-2026` заменить на `org-media-nation`. В пакете это один `rpkb-org-go-media_nation`, имя канона Media Nation. Отдельную организацию `org-medianation-2026` после переноса участия удалить, чтобы не осталось дубля. Числа 24, 14 и 13 из старой карточки по-прежнему не публиковать: 13 здесь — длина списка хостов, не фраза «ещё 14».

### №51, сейчас 11, станет 12

Добавить участие `org-rore` с ребром `rpkb-edge-adnomads-host-ce-rore_group-t51`. Отдельную организацию «Родная Речь» не создавать. Рассказ страницы по-прежнему описывает экспертную встречу Ирины Козловой из репортажа; это не второй хост и не запись в `people.ts`.

VK остаётся `org-vk`, canonicalId `rpkb-org-go-vk_group` (имя канона VK group). DIDENOK team = `rpkb-org-go-didenok`. 2ГИС = `rpkb-org-go-2gis`.

### №53, программа вместо списка S5

11 хостов. Red Keds снять с этого выпуска: в программе её нет, в №26 организация остаётся. `org-yandex-ads` снять с выпуска и удалить, если других связей нет. Сентябрьская «Яндекс Реклама» — тот же `rpkb-org-go-yandex`, что ноябрьский Яндекс. Участие: `org-yandex`, публичная подпись этой поездки «Яндекс Реклама», ребро `rpkb-edge-adnomads-host-program-yandex-t53`. Для подписи нужен необязательный `label` у участия, иначе ноябрь тоже станет «Яндекс Реклама».

Оставить и связать с каноном: Авито Реклама `org-avito-ads` / `rpkb-org-adnomads-avito_reklama`; D Innovative Group `org-d-innovative` / `rpkb-org-adnomads-d_innovative_group`; Realweb `org-realweb` / `rpkb-org-adnomads-realweb`; Creative Family `org-creative-family` / `rpkb-org-adnomads-creative_family`; Nectarine `org-nectarine` / `rpkb-org-adnomads-nektarin` (канон: НЕКТАРИН); Genius Group `org-genius` / `rpkb-org-adnomads-genius` (канон: GENIUS); Усилитель вкуса `org-usilitel` / `rpkb-org-adnomads-usilitel_vkusa`; RODEN media `org-roden` / `rpkb-org-adnomads-roden_media`.

Добавить: `org-2sharp` с ребром `rpkb-edge-adnomads-host-program-2sharp-t53`; DDVB `org-ddvb` / `rpkb-org-adnomads-ddvb`, ребро `rpkb-edge-adnomads-host-program-ddvb-t53`. Повтор 2SHARP в программе — один блок, вторую встречу не создавать.

Источник всех сентябрьских рёбер: `src-adnomads-moscow-program-2026-20261112`. `historyPageUrl` на S5 можно оставить: это опубликованный рассказ, не список хостов.

## Участники, которых можно публиковать

Организаторов в этих таблицах нет. Роман и Ирина остаются командой. Плательщики и продавцы не добавляются. Список на странице неполный: подпись «Это не весь состав группы», без числа.

Один человек — одна запись `people`. Разные компания, должность и город живут на участии конкретного выпуска.

### №26, десять подтверждённых

Должностей в пакете нет, не дописывать. Компания и город — подпись 2019 года.

| Сайтовый id | canonicalId | Имя | Компания | Город |
| --- | --- | --- | --- | --- |
| `person-olga-kovalchuk` | `rpkb-person-olga-kovalchuk` | Ольга Ковальчук | Virgo Group | Находка |
| `person-vadim-tylik` | `rpkb-person-vadim-tylik` | Вадим Тылик | RMAA Regions | Хабаровск / Москва |
| `person-ayder-bekirov` | `rpkb-person-ayder-bekirov` | Айдер Бекиров | Европа плюс Киргизия | Бишкек |
| `person-dmitry-lukashev` | `rpkb-person-dmitriy-lukashev` | Дмитрий Лукашев | Медиаселлер | Краснодар |
| `person-mariya-kirsanova` | `rpkb-person-mariya-kirsanova` | Мария Кирсанова | Медиахолдинг Радиосити | Подмосковье |
| `person-dzhamilya-sadek` | `rpkb-person-dzhamilya-sadek` | Джамиля Садэк | Европа плюс Киргизия | Бишкек |
| `person-marina-buzubaeva` | `rpkb-person-marina-buzubaeva` | Марина Бузубаева | ТВ Медиа Диджитал | Алматы |
| `person-mariya-grokh` | `rpkb-person-google-contacts-gc1578` | Мария Грох | — | — |
| `person-olga-gavrilova` | `rpkb-person-google-contacts-gc1838` | Ольга Гаврилова | — | — |
| `person-viktoriya-strelkova` | `rpkb-person-google-contacts-gc0893` | Виктория Стрелкова | — | — |

### Не публиковать как факт приезда на №26

Одиннадцать именных строк MSP без дополнительного подтверждения посещения. Записи людей и участия не создавать. Это не утверждение, что их не было.

Борис Левин `rpkb-person-flock-f459c8bd536a`; Никита Маршумов `rpkb-person-flock-90728add9fbc`; Юрий Стоян `rpkb-person-flock-e77556e1b920`; Исмаил Сулейманов `rpkb-person-google-contacts-gc1375`; Сергей Искорнев `rpkb-person-flock-e2e7a7537ee4`; Асхат Ниязов `rpkb-person-flock-50c369d2ef53`; Ольга Слинкина `rpkb-person-flock-89d59efa9716`; Дмитрий Кудрин `rpkb-person-flock-9b8505d8b4de`; Мухаммад Али Шакиров `rpkb-person-flock-689845d31f29`; Анна Цветкова `rpkb-person-flock-821441b62ad3`; Александр Полубатонов `rpkb-person-flock-7bc5f4bea4ee`.

Отзывы Ольги Слинкиной и Бориса Левина по-прежнему не добавлять.

### №32, восемь человек, не полный список

Вадим Тылик — тот же `person-vadim-tylik`. На этой поездке компания RMAA, должность владелец, город Москва.

| Сайтовый id | canonicalId | Имя | Компания | Должность | Город |
| --- | --- | --- | --- | --- | --- |
| `person-viktor-zhukov` | `rpkb-person-viktor-zhukov` | Виктор Жуков | «Вебэлемент» | директор | Пятигорск |
| `person-vladimir-gannenko` | `rpkb-person-vladimir-gannenko` | Владимир Ганненко | Два Слона | генеральный директор | Ярославль |
| `person-ilya-saykov` | `rpkb-person-ilya-saykov` | Илья Сайков | MegaArtDigital | владелец | Нижний Новгород |
| `person-marina-plyashechnik` | `rpkb-person-marina-plyashechnik` | Марина Пляшечник | «Антанта» | коммерческий директор | Ростов-на-Дону |
| `person-mariya-bubnova` | `rpkb-person-mariya-bubnova` | Мария Бубнова | Два Слона | коммерческий директор | Ярославль |
| `person-olga-glukhova` | `rpkb-person-olga-glukhova` | Ольга Глухова | «Виват» | владелец | Казань |
| `person-yuliya-belashevskaya` | `rpkb-person-yuliya-belashevskaya` | Юлия Белашевская | «Река» | директор | Самара |

### №49, тринадцать человек, без должностей и городов

Те же люди, если id уже есть: Владимир Ганненко, Мария Бубнова, Юлия Белашевская. Новые: Алексей Махнев `person-aleksey-makhnev` / `rpkb-person-aleksey-makhnev`; Владимир Савин `person-vladimir-savin` / `rpkb-person-vladimir-savin`; Евгений Соловьев `person-evgeny-soloviev` / `rpkb-person-evgeny-soloviev`; Елена Шабурова `person-elena-shaburova` / `rpkb-person-elena-shaburova`; Игорь Кузнецов `person-igor-kuznetsov` / `rpkb-person-igor-kuznetsov`; Милан Радакович `person-milan-radakovich` / `rpkb-person-milan-radakovich`; Сергей Маямсин `person-sergey-mayamsin` / `rpkb-person-sergey-mayamsin`; Александра Монастыршина `person-aleksandra-monastyrshina` / `rpkb-person-amocrm-53705893`; Марина Щербакова `person-marina-shcherbakova` / `rpkb-person-marina-shcherbakova`; Павел Боревич `person-pavel-borevich` / `rpkb-person-amocrm-52669245`.

Компанию и должность не подставлять. Игорю Кузнецову не приписывать агентство из видеоотзыва.

### №51, девять человек

Уже заведённые: Алексей Махнев, Владимир Ганненко, Владимир Савин, Игорь Кузнецов, Мария Бубнова, Александра Монастыршина. Новые: Мария Головко `person-mariya-golovko` / `rpkb-person-mariya-golovko`; Наталья Шеремет `person-natalya-sheremet` / `rpkb-person-natalya-sheremet`; Сергей Глухов `person-sergey-glukhov` / `rpkb-person-amocrm-58632073`. Компаний и должностей в этом срезе нет. Сергею Глухову не приписывать подпись видеоотзыва.

### №53

Подтверждённых участников в пакете нет. Блок участников не рисовать.

## Программа №53

Часы — расписание программы, не журнал фактического начала. Внутренние сессии не хосты. Записать в `days` выпуска `2026-moscow-september`:

| label | focus |
| --- | --- |
| 23 сентября, 10:00 | Стартовая сессия: знакомство, задачи, настройка, фокус |
| 23 сентября, 13:00 | Яндекс Реклама |
| 23 сентября, 16:00 | RODEN media |
| 23 сентября, 19:00 | Усилитель вкуса |
| 24 сентября, 10:00 | Нектарин |
| 24 сентября, 12:00 | Creative Family |
| 24 сентября, 15:00 | D Innovative Group |
| 24 сентября, 17:00 | Авито Реклама |
| 24 сентября, 19:00 | Realweb |
| 25 сентября, 10:00 | 2Sharp |
| 25 сентября, 13:30 | Genius |
| 25 сентября, 16:30 | DDVB |
| 26 сентября, 11:00 | Итоговая шеринг-сессия и воркшоп: что увидели, что забираем себе, что будем пробовать |

Имена собеседников в программе нет. На фотографии имена не назначать.

## Что уже сделано на страницах истории

Списки компаний из абзацев №32 и №49 убраны: чипы остаются единственным списком и читают `hostsOf()`. Со страницы №26 сняты «19 участников» и «15 визитов»: пакетом они не заданы как показатель посещаемости. Если у выпуска заполнены `days`, страница показывает программу. Участников страница покажет после `participantsOf()`; до импорта блок не из чего собрать, и отдельный список в текст не вписан.

Отзывы, тексты главной вне блока истории, дизайн и деплой не менялись.
