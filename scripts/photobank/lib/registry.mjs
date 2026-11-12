import { readJson, writeJsonAtomic } from "./paths.mjs";

export const SCHEMA = "moscow-photobank/v1";

export function emptyEditorial() {
  return {
    status: "unsorted",
    placements: [],
    scene_tags: [],
    caption: "",
    alt: "",
    comment: "",
    photographer: "",
    updated_at: "",
  };
}

export function emptyRegistry() {
  return {
    schema: SCHEMA,
    note: "Единственный реестр фотобанка. Импорт обновляет technical и paths. Решения редактора лежат в editorial и при повторном импорте не затираются. Импорт не публикует кадры на сайте.",
    updated_at: "",
    next_asset_seq: 1,
    assets: [],
  };
}

export function loadRegistry(paths) {
  const registry = readJson(paths.registry, emptyRegistry());
  if (!Array.isArray(registry.assets)) registry.assets = [];
  if (!registry.next_asset_seq) registry.next_asset_seq = 1;
  registry.schema = SCHEMA;
  return registry;
}

export function saveRegistry(paths, registry) {
  registry.updated_at = new Date().toISOString();
  registry.schema = SCHEMA;
  writeJsonAtomic(paths.registry, registry);
}

export function allocateAssetId(registry) {
  let seq = Number(registry.next_asset_seq) || 1;
  const used = new Set(registry.assets.map((asset) => asset.asset_id));
  let id = "";
  do {
    id = `msk-${String(seq).padStart(6, "0")}`;
    seq += 1;
  } while (used.has(id));
  registry.next_asset_seq = seq;
  return id;
}

export function getAsset(registry, assetId) {
  return registry.assets.find((asset) => asset.asset_id === assetId) || null;
}

/**
 * Краткая карточка для других агентов. Пути относительны к корню репозитория.
 * Публичный URL появится только после отдельного экспорта выбранных версий.
 */
export function projectAsset(asset) {
  if (!asset) return null;
  const version = (rel, width, height, bytes) =>
    rel
      ? { path: rel, width: width || 0, height: height || 0, bytes: bytes || 0 }
      : null;
  return {
    asset_id: asset.asset_id,
    sha256: asset.sha256,
    edition_id: asset.edition_id || "",
    canonical_tour_id: asset.canonical_tour_id || "",
    category: asset.category || "",
    person_id: asset.person_id || "",
    assignment_locked: Boolean(asset.assignment_locked),
    source_conflict: Boolean(asset.source_conflict),
    original_filename: asset.source?.original_filename || "",
    orientation: asset.technical?.orientation || "",
    process_error: asset.technical?.process_error || "",
    warnings: asset.technical?.warnings || [],
    versions: {
      original: asset.paths?.original || "",
      thumb: version(asset.paths?.thumb, asset.technical?.thumb_width, asset.technical?.thumb_height, asset.technical?.thumb_bytes),
      web: version(asset.paths?.web, asset.technical?.output_width, asset.technical?.output_height, asset.technical?.output_bytes),
      hero: version(asset.paths?.hero, asset.technical?.hero?.width, asset.technical?.hero?.height, asset.technical?.hero?.bytes),
      portrait: version(
        asset.paths?.portrait,
        asset.technical?.portrait?.width,
        asset.technical?.portrait?.height,
        asset.technical?.portrait?.bytes,
      ),
    },
    editorial: {
      status: asset.editorial?.status || "unsorted",
      placements: asset.editorial?.placements || [],
      scene_tags: asset.editorial?.scene_tags || [],
      caption: asset.editorial?.caption || "",
      alt: asset.editorial?.alt || "",
      comment: asset.editorial?.comment || "",
      photographer: asset.editorial?.photographer || "",
    },
    external_ids: asset.external_ids || [],
  };
}

export function filterAssets(registry, query) {
  return registry.assets.filter((asset) => {
    if (query.edition && asset.edition_id !== query.edition) return false;
    if (query.category && asset.category !== query.category) return false;
    if (query.person && asset.person_id !== query.person) return false;
    if (query.status && asset.editorial?.status !== query.status) return false;
    if (query.placement && !(asset.editorial?.placements || []).includes(query.placement)) return false;
    return true;
  });
}
