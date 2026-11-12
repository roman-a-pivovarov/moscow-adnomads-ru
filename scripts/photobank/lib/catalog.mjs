import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BATCHES, PLACEMENTS, PRIORITIES, SCENE_TAGS, SIMILAR_DISTANCE, STATUSES } from "../config.mjs";
import { similarPairs } from "./image.mjs";
import { ensureDir } from "./paths.mjs";
import { summarizeRegistry } from "./summary.mjs";

const uiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../ui");

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scriptJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

function editionLabel(asset) {
  const batch = BATCHES.find((item) => item.edition_id && item.edition_id === asset.edition_id)
    || BATCHES.find((item) => item.person_id && item.person_id === asset.person_id)
    || BATCHES.find((item) => item.category === asset.category && !item.edition_id && !item.person_id);
  return batch?.title || asset.edition_id || asset.category || "";
}

export function catalogPayload(registry, pairs) {
  const similar = pairs || similarPairs(registry.assets, SIMILAR_DISTANCE);
  return {
    generated_at: new Date().toISOString(),
    summary: summarizeRegistry(registry),
    statuses: STATUSES.filter((status) => status.id !== "reserve"),
    placements: PLACEMENTS,
    priorities: PRIORITIES,
    sceneTags: SCENE_TAGS,
    similar,
    assets: registry.assets.map((asset) => ({
      asset_id: asset.asset_id,
      edition_id: asset.edition_id || "",
      canonical_tour_id: asset.canonical_tour_id || "",
      category: asset.category || "",
      person_id: asset.person_id || "",
      edition_label: editionLabel(asset),
      filename: asset.source?.original_filename || "",
      relative_path: asset.source?.relative_path || "",
      thumb: asset.paths?.thumb || "",
      web: asset.paths?.web || "",
      width: asset.technical?.output_width || 0,
      height: asset.technical?.output_height || 0,
      bytes: asset.technical?.output_bytes || 0,
      orientation: asset.technical?.orientation || "",
      status: asset.editorial?.status || "unsorted",
      placements: asset.editorial?.placements || [],
      priorities: asset.editorial?.priorities || {},
      scene_tags: asset.editorial?.scene_tags || [],
      caption: asset.editorial?.caption || "",
      alt: asset.editorial?.alt || "",
      comment: asset.editorial?.comment || "",
      photographer: asset.editorial?.photographer || "",
      proposed_by: asset.editorial?.proposed_by || "",
      updated_at: asset.editorial?.updated_at || "",
      warnings: asset.technical?.warnings || [],
      process_error: asset.technical?.process_error || "",
      source_conflict: Boolean(asset.source_conflict),
      source_count: asset.source?.history?.length || 1,
      suggested_caption: asset.source?.suggested_caption || "",
      exif_datetime: asset.technical?.exif_datetime || "",
    })),
  };
}

function pageHtml({ title, depth, page, nav, site = false }) {
  const prefix = site ? "/photo-review" : (`${"../".repeat(depth)}`.replace(/\/$/, "") || ".");
  const root = site ? "" : (`${"../".repeat(depth + 2)}`.replace(/\/$/, ""));
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${esc(title)} — фотобанк</title>
  <link rel="stylesheet" href="${prefix}/catalog.css">
</head>
<body>
  <header>
    <h1>${esc(title)}</h1>
    <p class="lead">${site ? "Отбор кадров Московских практик. Страницы нет в меню и в sitemap." : "Внутренний каталог отбора. В меню сайта и в публикацию не входит."}</p>
    <ol class="steps">
      <li>Отметьте статус, назначения и комментарий.</li>
      <li>Нажмите «Экспортировать решения» и сохраните JSON.</li>
      <li>Примените файл: <code>node scripts/photobank/apply-decisions.mjs путь\\к\\photobank-decisions.json</code></li>
    </ol>
    <p class="note">Эта страница не записывает файлы проекта. localStorage хранит только черновик браузера.</p>
    <p data-draft hidden></p>
    <p data-export-state hidden></p>
    <nav>${nav}</nav>
  </header>
  <div class="toolbar">
    <input data-search type="search" placeholder="${site ? "Поиск по asset_id" : "ID или имя файла"}">
    ${page.view === "all" ? `<select data-edition><option value="">Все выпуски</option>${BATCHES.filter((batch) => batch.edition_id).map((batch) => `<option value="${esc(batch.edition_id)}">${esc(batch.title)}</option>`).join("")}</select>` : ""}
    <select data-orientation>
      <option value="">Любая ориентация</option>
      <option value="landscape">Горизонтальные</option>
      <option value="portrait">Вертикальные</option>
      <option value="square">Квадратные</option>
    </select>
    <select data-status>
      <option value="">Любой статус</option>
      ${STATUSES.filter((status) => status.id !== "reserve").map((status) => `<option value="${esc(status.id)}">${esc(status.label)}</option>`).join("")}
    </select>
    <select data-placement>
      <option value="">Любое назначение</option>
      ${PLACEMENTS.map((item) => `<option value="${esc(item.id)}">${esc(item.label)}</option>`).join("")}
    </select>
    <select data-priority>
      <option value="">Любой приоритет</option>
      ${PRIORITIES.map((item) => `<option value="${esc(item.id)}">${esc(item.label)}</option>`).join("")}
    </select>
    <select data-group>
      <option value="">Выпуски, команда и общие</option>
      <option value="edition">Только выпуски</option>
      <option value="team">Команда</option>
      <option value="shared">Общие</option>
    </select>
    <select data-proposed>
      <option value="">Любое происхождение</option>
      <option value="bild-editor">Предложено бильд-редактором</option>
      <option value="manual">Без этой пометки</option>
    </select>
    <span data-count></span>
    <button type="button" data-undo>Отменить</button>
    <button class="primary" type="button" data-export>Экспортировать решения</button>
    <label>Загрузить JSON <input data-import type="file" accept="application/json,.json"></label>
    <button type="button" data-forget>Забыть черновик браузера</button>
  </div>
  <div class="bulk">
    <label class="check"><input data-pick-visible type="checkbox"> Отметить показанные</label>
    <select data-bulk-status>
      <option value="">Статус для отмеченных</option>
      ${STATUSES.filter((status) => status.id !== "reserve").map((status) => `<option value="${esc(status.id)}">${esc(status.label)}</option>`).join("")}
    </select>
    <select data-bulk-placement>
      <option value="">Добавить назначение</option>
      ${PLACEMENTS.map((item) => `<option value="${esc(item.id)}">${esc(item.label)}</option>`).join("")}
    </select>
    <select data-bulk-priority>
      <option value="normal">Обычный</option>
      ${PRIORITIES.filter((item) => item.id !== "normal").map((item) => `<option value="${esc(item.id)}">${esc(item.label)}</option>`).join("")}
    </select>
    <button type="button" data-bulk-apply>Применить к отмеченным</button>
    <span data-picked></span>
  </div>
  <main><div class="grid" data-grid></div></main>
  <div class="lightbox" data-lightbox>
    <div class="stage" data-stage></div>
    <div class="panel" data-panel></div>
    <div class="row" style="grid-column: 1 / -1">
      <button type="button" data-prev>Предыдущий</button>
      <button type="button" data-next>Следующий</button>
      <button type="button" data-close>Закрыть</button>
    </div>
  </div>
  <footer>Полароидные рамки и чёрно-белые эффекты — оформление сайта, в файлы фотографий они не встраиваются.</footer>
  <script>window.PHOTOBANK_PAGE = ${scriptJson(page)}; window.PHOTOBANK_ROOT = ${scriptJson(root)};</script>
  <script src="${prefix}/catalog-data.js"></script>
  <script src="${prefix}/catalog.js"></script>
</body>
</html>`;
}

function writePage(dir, name, html) {
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, name), html, "utf8");
}

export function buildCatalog(paths, registry, pairs) {
  const payload = catalogPayload(registry, pairs);
  ensureDir(paths.catalog);
  fs.copyFileSync(path.join(uiDir, "catalog.css"), path.join(paths.catalog, "catalog.css"));
  fs.copyFileSync(path.join(uiDir, "catalog.js"), path.join(paths.catalog, "catalog.js"));
  fs.writeFileSync(
    path.join(paths.catalog, "catalog-data.js"),
    `window.PHOTOBANK_DATA = ${scriptJson(payload)};\n`,
    "utf8",
  );

  const nav = [
    `<a href="index.html">Все</a>`,
    ...BATCHES.filter((batch) => batch.edition_id).map(
      (batch) => `<a href="editions/${esc(batch.edition_id)}.html">${esc(batch.title)}</a>`,
    ),
    `<a href="team/roman.html">Роман</a>`,
    `<a href="team/irina.html">Ирина</a>`,
    `<a href="shared.html">Общие</a>`,
    `<a href="similar.html">Похожие</a>`,
  ].join("");

  writePage(paths.catalog, "index.html", pageHtml({
    title: "Фотобанк Московских практик",
    depth: 0,
    page: { view: "all", title: "Фотобанк" },
    nav,
  }));

  for (const batch of BATCHES.filter((item) => item.edition_id)) {
    writePage(path.join(paths.catalog, "editions"), `${batch.edition_id}.html`, pageHtml({
      title: batch.title,
      depth: 1,
      page: { view: "edition", editionId: batch.edition_id, title: batch.title },
      nav: `<a href="../index.html">Весь фотобанк</a>`,
    }));
  }

  for (const batch of BATCHES.filter((item) => item.category === "team")) {
    writePage(path.join(paths.catalog, "team"), `${batch.person_slug}.html`, pageHtml({
      title: batch.title,
      depth: 1,
      page: { view: "team", personId: batch.person_id, title: batch.title },
      nav: `<a href="../index.html">Весь фотобанк</a>`,
    }));
  }

  writePage(paths.catalog, "shared.html", pageHtml({
    title: "Общие кадры",
    depth: 0,
    page: { view: "shared", title: "Общие кадры" },
    nav: `<a href="index.html">Весь фотобанк</a>`,
  }));
  writePage(paths.catalog, "similar.html", pageHtml({
    title: "Похожие кадры",
    depth: 0,
    page: { view: "similar", title: "Похожие кадры" },
    nav: `<a href="index.html">Весь фотобанк</a>`,
  }));
  writePublicReview(paths, registry);
  return payload.summary;
}

export function writePublicReview(paths, registry) {
  const payload = catalogPayload(registry);
  payload.assets = payload.assets.map((asset) => ({
    asset_id: asset.asset_id,
    edition_id: asset.edition_id,
    category: asset.category,
    person_id: asset.person_id,
    edition_label: asset.edition_label,
    thumb: `/media/photobank/${asset.asset_id}/thumb.webp`,
    web: `/media/photobank/${asset.asset_id}/web.webp`,
    width: asset.width,
    height: asset.height,
    bytes: asset.bytes,
    orientation: asset.orientation,
    status: asset.status,
    placements: asset.placements,
    priorities: asset.priorities,
    scene_tags: asset.scene_tags,
    caption: asset.caption,
    alt: asset.alt,
    comment: asset.comment,
    photographer: asset.photographer,
    proposed_by: asset.proposed_by,
    updated_at: asset.updated_at,
  }));
  payload.similar = [];
  ensureDir(paths.publicReview);
  fs.copyFileSync(path.join(uiDir, "catalog.css"), path.join(paths.publicReview, "catalog.css"));
  fs.copyFileSync(path.join(uiDir, "catalog.js"), path.join(paths.publicReview, "catalog.js"));
  fs.writeFileSync(
    path.join(paths.publicReview, "catalog-data.js"),
    `window.PHOTOBANK_DATA = ${scriptJson(payload)};\n`,
    "utf8",
  );
  writePage(paths.publicReview, "index.html", pageHtml({
    title: "Отбор фотографий",
    depth: 0,
    site: true,
    page: { view: "all", title: "Отбор", public: true },
    nav: `<a href="/photo-review/">Все кадры</a>`,
  }));
}
