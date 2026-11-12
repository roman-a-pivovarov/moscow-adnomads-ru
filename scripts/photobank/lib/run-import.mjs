import fs from "node:fs";
import path from "node:path";
import { IMAGE_EXTENSIONS, SIMILAR_DISTANCE } from "../config.mjs";
import {
  derivativeMeta,
  loadOriented,
  perceptualHash,
  renderProfile,
  sha256File,
  similarPairs,
  technicalNotes,
  orientationOf,
} from "./image.mjs";
import { absFromRepo, ensureDir, resolvePaths, writeJsonAtomic } from "./paths.mjs";
import { allocateAssetId, emptyEditorial, loadRegistry, saveRegistry } from "./registry.mjs";
import { summarizeRegistry } from "./summary.mjs";
import {
  discoverBatches,
  findSidecar,
  inspectZip,
  materializeBatch,
  readAlbumUrl,
  readGooglePhotos,
  walkBatch,
} from "./scan.mjs";
import { buildCatalog } from "./catalog.mjs";

function imageFailureCode(ext, error) {
  const message = error.message || "unreadable_image";
  const code = message.split(":")[0];
  if (/^hei[cf]_/.test(code)) return code;
  if (ext === ".heic" || ext === ".heif") return "heic_decode_failed";
  return message;
}

function storageKey(batch) {
  if (batch.category === "team") return `team/${batch.person_slug}`;
  if (batch.category === "shared") return "shared";
  return `editions/${batch.edition_id}`;
}

function rawRelative(batch, assetId, ext) {
  return `assets-raw/${storageKey(batch)}/${assetId}${ext}`;
}

function bankRelative(batch, kind, assetId) {
  return `assets-photobank/${storageKey(batch)}/${kind}/${assetId}.webp`;
}

function assignmentDiffers(asset, batch) {
  return (
    asset.category !== batch.category ||
    (asset.edition_id || "") !== (batch.edition_id || "") ||
    (asset.person_id || "") !== (batch.person_id || "")
  );
}

function rememberSource(asset, batch, relativePath, filename) {
  asset.source.history = asset.source.history || [];
  const known = asset.source.history.some(
    (item) => item.batch_key === batch.key && item.relative_path === relativePath && item.sha256 === asset.sha256,
  );
  if (known) return false;
  asset.source.history.push({
    seen_at: new Date().toISOString(),
    batch_key: batch.key,
    edition_id: batch.edition_id || "",
    canonical_tour_id: batch.canonical_tour_id || "",
    category: batch.category,
    relative_path: relativePath,
    original_filename: filename,
    sha256: asset.sha256,
  });
  if (assignmentDiffers(asset, batch)) asset.source_conflict = true;
  return true;
}

async function writeDerivative(paths, relative, rendered) {
  const abs = absFromRepo(paths, relative);
  ensureDir(path.dirname(abs));
  fs.writeFileSync(abs, rendered.buffer);
  const actual = await derivativeMeta(abs);
  return {
    path: relative,
    width: actual.width,
    height: actual.height,
    bytes: actual.bytes,
    quality: rendered.quality,
    overBudget: rendered.overBudget || actual.bytes > rendered.bytes + 0,
    encoderBytes: rendered.bytes,
    statMatches: actual.bytes === rendered.bytes && actual.width === rendered.width && actual.height === rendered.height,
    exif: actual.exif,
  };
}

async function processOriginal(paths, asset, oriented) {
  const warnings = await technicalNotes(oriented);
  if (oriented.heif?.mirror) warnings.push("heif_mirror_corrected");
  if (oriented.heif?.color_conversion === "no_profile") warnings.push("color_profile_missing");
  let hash = "";
  try {
    hash = await perceptualHash(oriented);
  } catch {
    warnings.push("phash_unavailable");
  }
  const batchShape = {
    category: asset.category,
    edition_id: asset.edition_id,
    person_slug: asset.person_slug,
  };
  let web = null;
  let thumb = null;
  let processError = "";
  try {
    const webRendered = await renderProfile(oriented, "web");
    const thumbRendered = await renderProfile(oriented, "thumb");
    web = await writeDerivative(paths, asset.paths.web, webRendered);
    thumb = await writeDerivative(paths, asset.paths.thumb, thumbRendered);
    if (webRendered.overBudget) warnings.push("over_budget");
    if (thumbRendered.overBudget) warnings.push("thumb_over_budget");
    if (!web.statMatches || !thumb.statMatches) warnings.push("output_stat_mismatch");
    if (web.exif || thumb.exif) warnings.push("exif_not_stripped");
  } catch (error) {
    processError = error.message;
  }

  asset.technical = {
    ...(asset.technical || {}),
    source_format: oriented.format,
    stored_width: oriented.storedWidth,
    stored_height: oriented.storedHeight,
    oriented_width: oriented.width,
    oriented_height: oriented.height,
    exif_orientation: oriented.exifOrientation,
    exif_datetime: oriented.exifDateTime,
    exif_datetime_note: "Дата EXIF не выбирает выпуск и не меняет подтверждённую принадлежность.",
    color_space_in: oriented.heif?.color_in || oriented.space,
    color_conversion: oriented.heif?.color_conversion || "",
    heif: oriented.heif
      ? {
          bit_depth: oriented.heif.bit_depth,
          exif_orientation: oriented.heif.exif_orientation,
          mirror: oriented.heif.mirror || "",
          hdr_gain_map: Boolean(oriented.heif.hdr_gain_map),
          depth_images: oriented.heif.depth_images || 0,
          thumbnails: oriented.heif.thumbnails || [],
          content_light_level: Boolean(oriented.heif.content_light_level),
          primary: Boolean(oriented.heif.primary),
        }
      : null,
    has_alpha: oriented.hasAlpha,
    output_width: web?.width || 0,
    output_height: web?.height || 0,
    output_bytes: web?.bytes || 0,
    output_quality: web?.quality || 0,
    thumb_width: thumb?.width || 0,
    thumb_height: thumb?.height || 0,
    thumb_bytes: thumb?.bytes || 0,
    orientation: orientationOf(web?.width || oriented.width, web?.height || oriented.height),
    perceptual_hash: hash,
    warnings: [...new Set(warnings)],
    process_error: processError,
    process_error_detail: processError ? processError : "",
    processed_at: new Date().toISOString(),
  };
  if (!web) asset.paths.web = "";
  if (!thumb) asset.paths.thumb = "";
  return asset;
}

function externalIdsFromName(name) {
  const match = /^(adn-asset-\d{6})/i.exec(name || "");
  if (!match) return [];
  return [{ system: "go-adnomads", asset_id: match[1].toLowerCase() }];
}

function baseAsset(registry, batch, hash, image, bytes) {
  const assetId = allocateAssetId(registry);
  const ext = image.ext.toLowerCase();
  const asset = {
    asset_id: assetId,
    sha256: hash,
    edition_id: batch.edition_id || "",
    canonical_tour_id: batch.canonical_tour_id || "",
    category: batch.category,
    person_id: batch.person_id || "",
    person_slug: batch.person_slug || "",
    batch_key: batch.key,
    assignment_locked: true,
    source_conflict: false,
    external_ids: externalIdsFromName(image.name),
    source: {
      original_filename: image.name,
      relative_path: image.relative,
      batch_key: batch.key,
      album_url: "",
      supplemental: null,
      history: [],
    },
    paths: {
      original: rawRelative(batch, assetId, ext),
      thumb: bankRelative(batch, "thumb", assetId),
      web: bankRelative(batch, "web", assetId),
      hero: "",
      portrait: "",
    },
    technical: {
      source_bytes: bytes,
      warnings: [],
      process_error: "",
    },
    editorial: emptyEditorial(),
  };
  rememberSource(asset, batch, image.relative, image.name);
  return asset;
}

function copyOriginal(paths, asset, sourceAbs) {
  const dest = absFromRepo(paths, asset.paths.original);
  ensureDir(path.dirname(dest));
  if (fs.existsSync(dest)) {
    const existing = sha256File(dest);
    if (existing !== asset.sha256) {
      throw new Error(`original_protected:${asset.paths.original}`);
    }
    return;
  }
  fs.copyFileSync(sourceAbs, dest);
  const copied = sha256File(dest);
  if (copied !== asset.sha256) throw new Error(`copy_mismatch:${asset.asset_id}`);
}

function attachSidecar(paths, asset, sidecar) {
  if (!sidecar) return;
  const dest = `${absFromRepo(paths, asset.paths.original)}.json`;
  if (!fs.existsSync(dest)) fs.copyFileSync(sidecar.abs, dest);
  const parsed = readGooglePhotos(sidecar.abs);
  asset.source.supplemental = {
    kind: "google_photos_json",
    path: `${asset.paths.original}.json`,
    parsed: parsed.ok ? parsed : null,
    parse_error: parsed.ok ? "" : parsed.error,
    applies_to_edition: false,
  };
  if (parsed.ok && parsed.description && !asset.source.suggested_caption) {
    asset.source.suggested_caption = parsed.description;
  }
}

export async function runImport({ root, batches = [], dryRun = false, rebuild = false, catalog = true } = {}) {
  const paths = resolvePaths(root);
  ensureDir(paths.inbox);
  const discovered = discoverBatches(paths.inbox);
  const selected = discovered.found.filter((item) => !batches.length || batches.includes(item.batch.key) || batches.includes(item.batch.edition_id));
  const registry = loadRegistry(paths);
  const byHash = new Map(registry.assets.map((asset) => [asset.sha256, asset]));
  const report = {
    generated_at: new Date().toISOString(),
    command: dryRun ? "import-dry-run" : "import",
    dry_run: dryRun,
    missing_batches: discovered.missing,
    unknown: discovered.unknown,
    batches: [],
    errors: [],
    source_conflicts: [],
    over_budget: [],
    non_photos: [],
    duplicates: [],
  };

  for (const item of selected) {
    const batchReport = {
      key: item.batch.key,
      edition_id: item.batch.edition_id,
      canonical_tour_id: item.batch.canonical_tour_id,
      kind: item.kind,
      seen: 0,
      new_assets: 0,
      known: 0,
      processed: 0,
      errors: 0,
    };
    if (dryRun && item.kind === "zip") {
      const zip = inspectZip(item.absPath);
      const images = zip.ok
        ? zip.entries.filter((entry) => IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) && !entry.pathError)
        : [];
      batchReport.seen = images.length;
      batchReport.new_assets = images.length;
      if (!zip.ok) report.errors.push({ batch: item.batch.key, file: "", message: zip.error });
      for (const entry of zip.entries || []) {
        if (entry.pathError || entry.encrypted) {
          report.errors.push({ batch: item.batch.key, file: entry.name, message: entry.pathError || "encrypted" });
        }
      }
      report.batches.push(batchReport);
      continue;
    }
    const materialized = materializeBatch(item, paths.work);
    if (materialized.error) {
      batchReport.error = materialized.error;
      report.errors.push({ batch: item.batch.key, file: "", message: materialized.error });
      report.batches.push(batchReport);
      continue;
    }
    for (const rejected of materialized.rejected || []) {
      report.errors.push({ batch: item.batch.key, file: rejected.name, message: rejected.reason });
    }
    const tree = walkBatch(materialized.dir);
    const albumUrl = readAlbumUrl(materialized.dir, item.batch);
    batchReport.seen = tree.images.length;
    for (const video of tree.videos) {
      report.non_photos.push({ batch: item.batch.key, file: video.relative, kind: "video" });
    }
    for (const extra of tree.other) {
      if (extra.kind === "album_url") continue;
      report.non_photos.push({ batch: item.batch.key, file: extra.relative, kind: extra.ext || extra.kind || "other" });
    }

    for (const image of tree.images) {
      const hash = sha256File(image.abs);
      const bytes = fs.statSync(image.abs).size;
      let asset = byHash.get(hash);
      if (asset) {
        batchReport.known += 1;
        const added = rememberSource(asset, item.batch, image.relative, image.name);
        if (added && asset.source.history.length > 1) {
          report.duplicates.push({
            asset_id: asset.asset_id,
            sha256: hash,
            sources: asset.source.history.map((entry) => `${entry.batch_key}:${entry.relative_path}`),
          });
        }
        if (asset.source_conflict) {
          report.source_conflicts.push({
            asset_id: asset.asset_id,
            kept_edition_id: asset.edition_id,
            kept_category: asset.category,
            also_seen_in: item.batch.key,
            file: image.relative,
          });
        }
        if (!dryRun && albumUrl && !asset.source.album_url) asset.source.album_url = albumUrl;
        const needsProcess = rebuild || !asset.paths.web || asset.technical?.process_error;
        if (!dryRun && needsProcess) {
          try {
            copyOriginal(paths, asset, image.abs);
            const oriented = await loadOriented(absFromRepo(paths, asset.paths.original), { workDir: paths.work });
            const owner = {
              category: asset.category,
              edition_id: asset.edition_id,
              person_slug: asset.person_slug,
            };
            if (!asset.paths.web) asset.paths.web = bankRelative(owner, "web", asset.asset_id);
            if (!asset.paths.thumb) asset.paths.thumb = bankRelative(owner, "thumb", asset.asset_id);
            await processOriginal(paths, asset, oriented);
          } catch (error) {
            asset.technical = {
              ...(asset.technical || {}),
              process_error: imageFailureCode(image.ext, error),
              process_error_detail: error.message,
            };
            asset.paths.web = "";
            asset.paths.thumb = "";
          }
        }
        if (asset.technical?.process_error) batchReport.errors += 1;
        else if (asset.paths?.web) batchReport.processed += 1;
        continue;
      }

      if (dryRun) {
        const ghost = {
          sha256: hash,
          edition_id: item.batch.edition_id || "",
          canonical_tour_id: item.batch.canonical_tour_id || "",
          category: item.batch.category,
          person_id: item.batch.person_id || "",
          person_slug: item.batch.person_slug || "",
          source_conflict: false,
          source: { history: [], relative_path: image.relative, original_filename: image.name },
          technical: { source_bytes: bytes },
          paths: {},
          editorial: emptyEditorial(),
        };
        rememberSource(ghost, item.batch, image.relative, image.name);
        byHash.set(hash, ghost);
        batchReport.new_assets += 1;
        continue;
      }

      asset = baseAsset(registry, item.batch, hash, image, bytes);
      asset.technical.source_bytes = bytes;
      if (albumUrl) asset.source.album_url = albumUrl;
      try {
        copyOriginal(paths, asset, image.abs);
        const sidecar = findSidecar(image, tree.sidecars);
        attachSidecar(paths, asset, sidecar);
        const oriented = await loadOriented(absFromRepo(paths, asset.paths.original), { workDir: paths.work });
        await processOriginal(paths, asset, oriented);
      } catch (error) {
        const code = imageFailureCode(image.ext, error);
        asset.technical.process_error = code;
        asset.technical.process_error_detail = error.message;
        asset.paths.web = "";
        asset.paths.thumb = "";
        report.errors.push({ batch: item.batch.key, file: image.relative, asset_id: asset.asset_id, message: code });
      }
      registry.assets.push(asset);
      byHash.set(hash, asset);
      batchReport.new_assets += 1;
      if (asset.technical.process_error) batchReport.errors += 1;
      else batchReport.processed += 1;
      if ((asset.technical.warnings || []).includes("over_budget")) {
        report.over_budget.push({
          asset_id: asset.asset_id,
          bytes: asset.technical.output_bytes,
          width: asset.technical.output_width,
          height: asset.technical.output_height,
          file: image.relative,
        });
      }
    }
    report.batches.push(batchReport);
  }

  report.summary = summarizeRegistry(registry);
  report.similar_hints = similarPairs(registry.assets, SIMILAR_DISTANCE);
  const seenErrors = new Set(report.errors.map((item) => `${item.asset_id || ""}|${item.file}|${item.message}`));
  for (const asset of registry.assets) {
    if (!asset.technical?.process_error) continue;
    const item = {
      batch: asset.batch_key,
      file: asset.source?.relative_path || "",
      asset_id: asset.asset_id,
      message: asset.technical.process_error,
    };
    const key = `${item.asset_id}|${item.file}|${item.message}`;
    if (seenErrors.has(key)) continue;
    seenErrors.add(key);
    report.errors.push(item);
  }
  report.over_budget = registry.assets
    .filter((asset) => (asset.technical?.warnings || []).includes("over_budget"))
    .map((asset) => ({
      asset_id: asset.asset_id,
      bytes: asset.technical.output_bytes,
      width: asset.technical.output_width,
      height: asset.technical.output_height,
      file: asset.source?.relative_path || "",
    }));

  if (!dryRun) {
    saveRegistry(paths, registry);
    ensureDir(paths.reports);
    writeJsonAtomic(path.join(paths.reports, "latest.json"), report);
    if (catalog) buildCatalog(paths, registry, report.similar_hints);
  }
  return { registry, report, paths };
}

export async function deriveOne(paths, registry, asset, profileName) {
  if (!asset.paths?.original) throw new Error("missing_original");
  const original = absFromRepo(paths, asset.paths.original);
  if (!fs.existsSync(original)) throw new Error("original_missing");
  if (sha256File(original) !== asset.sha256) throw new Error("original_hash_mismatch");
  const oriented = await loadOriented(original, { workDir: paths.work });
  const rendered = await renderProfile(oriented, profileName);
  const batchShape = {
    category: asset.category,
    edition_id: asset.edition_id,
    person_slug: asset.person_slug,
  };
  const relative = bankRelative(batchShape, profileName, asset.asset_id);
  const written = await writeDerivative(paths, relative, rendered);
  asset.paths[profileName] = relative;
  asset.technical[profileName] = {
    width: written.width,
    height: written.height,
    bytes: written.bytes,
    quality: written.quality,
    over_budget: Boolean(rendered.overBudget),
    from_original: true,
    created_at: new Date().toISOString(),
  };
  return asset;
}
