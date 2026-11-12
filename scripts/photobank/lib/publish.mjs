import fs from "node:fs";
import path from "node:path";
import { buildCatalog } from "./catalog.mjs";
import { deriveOne } from "./run-import.mjs";
import { absFromRepo, ensureDir, resolvePaths, writeJsonAtomic } from "./paths.mjs";
import { loadRegistry, saveRegistry } from "./registry.mjs";

const PRIORITY_RANK = { primary: 0, normal: 1, reserve: 2 };

function variantFile(asset, name) {
  if (name === "web") return asset.paths?.web || "";
  if (name === "thumb") return asset.paths?.thumb || "";
  if (name === "hero") return asset.paths?.hero || "";
  if (name === "portrait") return asset.paths?.portrait || "";
  return "";
}

function variantSize(asset, name) {
  if (name === "thumb") {
    return { width: asset.technical?.thumb_width || 0, height: asset.technical?.thumb_height || 0 };
  }
  if (name === "hero" && asset.technical?.hero) return asset.technical.hero;
  if (name === "portrait" && asset.technical?.portrait) return asset.technical.portrait;
  return { width: asset.technical?.output_width || 0, height: asset.technical?.output_height || 0 };
}

function chooseVariant(asset, placement) {
  if (placement === "team" && variantFile(asset, "portrait")) return "portrait";
  if (placement === "hero" && variantFile(asset, "hero")) return "hero";
  if (variantFile(asset, "web")) return "web";
  return "";
}

export function publishedRecords(registry) {
  const records = [];
  for (const asset of registry.assets) {
    const editorial = asset.editorial || {};
    if (editorial.status !== "selected" && editorial.status !== "reserve") continue;
    for (const placement of editorial.placements || []) {
      const variant = chooseVariant(asset, placement);
      if (!variant) continue;
      const size = variantSize(asset, variant);
      const priority = editorial.priorities?.[placement] || (editorial.status === "reserve" ? "reserve" : "normal");
      records.push({
        asset_id: asset.asset_id,
        edition_id: asset.edition_id || "",
        person_id: asset.person_id || "",
        placement,
        variant,
        src: `/media/photobank/${asset.asset_id}/${variant}.webp`,
        width: size.width || 0,
        height: size.height || 0,
        alt: editorial.alt || "",
        caption: editorial.caption || "",
        priority,
      });
    }
  }
  records.sort((a, b) => (
    a.placement.localeCompare(b.placement)
    || a.edition_id.localeCompare(b.edition_id)
    || (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1)
    || a.asset_id.localeCompare(b.asset_id)
  ));
  return records;
}

function copyVariant(paths, asset, name) {
  const relative = variantFile(asset, name);
  if (!relative) return 0;
  const source = absFromRepo(paths, relative);
  if (!fs.existsSync(source)) return 0;
  const dest = path.join(paths.publicMedia, asset.asset_id, `${name}.webp`);
  ensureDir(path.dirname(dest));
  const size = fs.statSync(source).size;
  if (!fs.existsSync(dest) || fs.statSync(dest).size !== size) fs.copyFileSync(source, dest);
  return size;
}

export async function publishBank(root, { copyFiles = true } = {}) {
  const paths = resolvePaths(root);
  const registry = loadRegistry(paths);
  let derived = 0;
  for (const asset of registry.assets) {
    const editorial = asset.editorial || {};
    if (editorial.status !== "selected" || !(editorial.placements || []).includes("team")) continue;
    if (asset.paths?.portrait && asset.technical?.portrait) continue;
    await deriveOne(paths, registry, asset, "portrait");
    derived += 1;
  }
  if (derived) saveRegistry(paths, registry);

  const copied = { web: 0, thumb: 0, portrait: 0, hero: 0 };
  const weights = { web: 0, thumb: 0, portrait: 0, hero: 0 };
  if (copyFiles) {
    for (const asset of registry.assets) {
      if (asset.technical?.process_error || !asset.paths?.web) continue;
      for (const name of ["web", "thumb", "portrait", "hero"]) {
        const bytes = copyVariant(paths, asset, name);
        if (!bytes) continue;
        copied[name] += 1;
        weights[name] += bytes;
      }
    }
  }
  const assets = publishedRecords(registry);
  writeJsonAtomic(path.join(paths.data, "published.json"), {
    schema: "moscow-photobank-published/v1",
    note: "Подборки для сайта. Каталог всех файлов им не является: файл по URL не попадает в блок, пока его нет в этом списке. Порядок внутри назначения — основной, затем обычный, затем резерв, затем asset_id. Обложка выпуска — первый кадр history этого выпуска.",
    assets,
  });
  buildCatalog(paths, registry);
  return { derived, copied, weights, published: assets.length, assets };
}
