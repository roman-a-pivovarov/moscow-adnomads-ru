import fs from "node:fs";
import path from "node:path";
import { PRIORITY_LABELS, SCHEMA, SOURCE_TYPES } from "../config.mjs";
import { ensureDir } from "./paths.mjs";

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCatalog(paths, registry) {
  ensureDir(paths.catalogDir);
  fs.copyFileSync(paths.uiSource, path.join(paths.catalogDir, "catalog.js"));
  const editions = [];
  const seen = new Set();
  for (const org of registry.organizations) {
    for (const edition of org.editions) {
      if (seen.has(edition.edition_id)) continue;
      seen.add(edition.edition_id);
      editions.push({
        edition_id: edition.edition_id,
        adnomads_id: edition.adnomads_id,
        date_label: edition.date_label,
        host_list_status: edition.host_list_status,
      });
    }
  }
  editions.sort((a, b) => a.adnomads_id.localeCompare(b.adnomads_id));
  const payload = {
    schema: SCHEMA,
    registry_version: registry.version,
    updated_at: registry.updated_at,
    source_fingerprint: registry.source_fingerprint,
    asset_root: "../../../",
    source_types: SOURCE_TYPES,
    priorities: PRIORITY_LABELS,
    editions,
    gaps: registry.gaps,
    organizations: registry.organizations.map((org) => ({
      organization_id: org.organization_id,
      name: org.name,
      distinction: org.distinction || "",
      editions: org.editions,
      decision: org.decision,
      candidates: registry.candidates
        .filter((item) => item.organization_id === org.organization_id)
        .map((item) => ({ ...item })),
      gaps: registry.gaps.filter((item) => item.organization_id === org.organization_id),
    })),
  };
  const withCandidates = payload.organizations.filter((org) => org.candidates.some((item) => item.usable)).length;
  const missing = payload.organizations.length - withCandidates;
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Логотипы московских хостов — выбор</title>
<style>
  :root { color-scheme: light; --ink:#111; --muted:#5c564e; --line:#e4ddd4; --paper:#fffefd; --accent:#a57149; --dark:#161616; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px/1.45 "Segoe UI", sans-serif; color: var(--ink); background: #f6f3ee; }
  header, main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; }
  header { padding: 28px 0 8px; }
  h1 { font-size: 28px; font-weight: 600; margin: 0 0 8px; }
  h2 { font-size: 22px; margin: 0; }
  p { margin: 0 0 8px; }
  .muted, .note { color: var(--muted); }
  .note { font-size: 14px; }
  .toolbar { position: sticky; top: 0; z-index: 2; background: #f6f3ee; padding: 12px 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; border-bottom: 1px solid var(--line); }
  input[type="search"], select, textarea, input[type="number"] { font: inherit; border: 1px solid #d9d0c6; background: white; border-radius: 8px; padding: 8px 10px; }
  input[type="search"] { min-width: min(280px, 100%); }
  button, .file { font: inherit; border: 1px solid #d9d0c6; background: white; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
  button.primary { background: var(--ink); color: white; border-color: var(--ink); }
  .stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
  .stat { background: white; border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; font-size: 14px; }
  .card { background: white; border: 1px solid var(--line); border-radius: 16px; padding: 18px; margin: 14px 0 18px; }
  .head { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: flex-start; }
  .editions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chip { font-size: 13px; background: #f3eee8; border-radius: 999px; padding: 3px 8px; }
  .priority { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
  .priority label, .check { display: flex; gap: 6px; align-items: center; font-size: 14px; }
  .variants { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
  .variant { border: 1px solid var(--line); border-radius: 12px; padding: 12px; background: #fcfbf9; }
  .variant.rejected { opacity: 0.45; }
  .plates { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; margin-bottom: 8px; }
  .plate { display: grid; place-items: center; border-radius: 8px; border: 1px solid #ddd; overflow: hidden; }
  .plate img { width: 86%; height: 78%; object-fit: contain; }
  .plate.large { width: min(320px, 100%); height: 128px; }
  .plate.site { width: 168px; height: 56px; }
  .plate.light { background: var(--paper); }
  .plate.dark { background: var(--dark); }
  .plate.checker { background-color: #f7f4ef; background-image: linear-gradient(45deg, #e7e1d8 25%, transparent 25%), linear-gradient(-45deg, #e7e1d8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e7e1d8 75%), linear-gradient(-45deg, transparent 75%, #e7e1d8 75%); background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0; }
  .badge { display: inline-block; font-size: 12px; border-radius: 999px; padding: 2px 8px; margin-right: 4px; background: #eee; }
  .badge.official { background: #e5f2e8; }
  .badge.side { background: #f8ead8; }
  .badge.warn { background: #f8e4e0; }
  .actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 8px 0; }
  textarea { width: 100%; min-height: 64px; }
  .strip { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 12px; border-radius: 12px; margin: 8px 0 16px; }
  .strip.light { background: var(--paper); border: 1px solid var(--line); }
  .strip.dark { background: var(--dark); }
  .strip .cell { width: 168px; height: 56px; display: grid; place-items: center; }
  .strip img { max-width: 148px; max-height: 44px; object-fit: contain; }
  .strip .textname { font-size: 13px; text-align: center; }
  .strip.dark .textname { color: white; }
  a { color: var(--accent); }
  .hidden { display: none !important; }
  @media (max-width: 640px) {
    header, main { width: min(100% - 20px, 1180px); }
    h1 { font-size: 24px; }
    .plate.large { height: 104px; }
  }
</style>
</head>
<body>
<header>
  <h1>Логотипы московских хостов</h1>
  <p class="note">Каталог для выбора. Он не публикует сайт и не меняет реестр, пока экспорт не применён скриптом. Приоритет — это место в показе, не оценка агентства.</p>
  <p class="note">В реестре ${payload.organizations.length} организаций. Пригодные файлы есть у ${withCandidates}. Без файла: ${missing}. Реестр версии ${registry.version}.</p>
</header>
<main>
  <div class="toolbar">
    <input data-search type="search" placeholder="Название агентства">
    <select data-edition><option value="">Все выпуски</option>${editions
      .map((item) => `<option value="${esc(item.edition_id)}">${esc(item.adnomads_id)} · ${esc(item.date_label)}</option>`)
      .join("")}</select>
    <select data-filter>
      <option value="all">Все карточки</option>
      <option value="unsorted">Ещё не разобрано</option>
      <option value="decided">Выбор сделан</option>
      <option value="missing">Логотип не найден</option>
      <option value="clarify">Требуется уточнение</option>
    </select>
    <button type="button" data-view-toggle>Только выбранные</button>
    <button type="button" class="primary" data-export>Экспортировать JSON</button>
    <label class="file">Загрузить экспорт<input data-import type="file" accept="application/json,.json" hidden></label>
    <button type="button" data-forget>Сбросить черновик браузера</button>
  </div>
  <p class="note" data-draft hidden></p>
  <p class="note" data-export-state></p>
  <div data-stats class="stats"></div>
  <div data-selected class="hidden"></div>
  <div data-grid></div>
  <p class="note">Сохранено в браузере — только на этом компьютере. Экспортировано — файл JSON. Применено в реестре — после <code>node scripts/logos/apply-decisions.mjs путь\\к\\logos-decisions.json</code>. Повторный поиск не стирает уже применённые решения. Более новый выбор в реестре старый экспорт не затирает.</p>
</main>
<script>window.LOGOS_DATA = ${JSON.stringify(payload).replace(/</g, "\\u003c")};</script>
<script src="./catalog.js"></script>
</body>
</html>
`;
  fs.writeFileSync(paths.catalogHtml, html, "utf8");
  return { html: paths.catalogHtml, organizations: payload.organizations.length, withCandidates, missing };
}
