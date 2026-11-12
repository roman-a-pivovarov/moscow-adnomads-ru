import fs from "node:fs";
import path from "node:path";
import { BATCHES, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, matchBatchAlias } from "../config.mjs";
import { sha256File } from "./image.mjs";
import { extractZip, listZip } from "./zip.mjs";

const SKIP_NAMES = new Set([".ds_store", "thumbs.db", "desktop.ini"]);

export function discoverBatches(inboxDir) {
  if (!fs.existsSync(inboxDir)) return { found: [], unknown: [], missing: BATCHES.map((batch) => batch.key) };
  const found = [];
  const unknown = [];
  const seen = new Set();

  function addFound(batch, kind, absPath) {
    found.push({ batch, kind, absPath });
    seen.add(batch.key);
  }

  for (const entry of fs.readdirSync(inboxDir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const abs = path.join(inboxDir, entry.name);
    if (entry.isDirectory()) {
      const direct = matchBatchAlias(entry.name);
      if (direct) {
        addFound(direct, "folder", abs);
        continue;
      }
      const children = fs.readdirSync(abs, { withFileTypes: true });
      let nested = 0;
      for (const child of children) {
        if (!child.isDirectory() && !child.name.toLowerCase().endsWith(".zip")) continue;
        const alias = `${entry.name}/${child.name}`;
        const batch = matchBatchAlias(alias);
        if (!batch) continue;
        addFound(batch, child.isDirectory() ? "folder" : "zip", path.join(abs, child.name));
        nested += 1;
      }
      if (nested === 0) unknown.push(toPosixUnknown(entry.name));
      continue;
    }
    if (entry.name.toLowerCase().endsWith(".zip")) {
      const batch = matchBatchAlias(entry.name);
      if (batch) addFound(batch, "zip", abs);
      else unknown.push(entry.name);
    }
  }

  const order = new Map(BATCHES.map((batch, index) => [batch.key, index]));
  found.sort((a, b) => (order.get(a.batch.key) ?? 99) - (order.get(b.batch.key) ?? 99));
  return {
    found,
    unknown,
    missing: BATCHES.filter((batch) => !seen.has(batch.key)).map((batch) => batch.key),
  };
}

function toPosixUnknown(name) {
  return name.replace(/\\/g, "/");
}

export function inspectZip(zipPath) {
  try {
    const entries = listZip(zipPath);
    return { ok: true, entries, error: "" };
  } catch (error) {
    return { ok: false, entries: [], error: error.message };
  }
}

export function materializeBatch(item, workRoot) {
  if (item.kind === "folder") {
    return { dir: item.absPath, extracted: false, rejected: [], error: "" };
  }
  const stamp = sha256File(item.absPath).slice(0, 12);
  const dest = path.join(workRoot, "unzip", item.batch.key, stamp);
  if (fs.existsSync(path.join(dest, ".extract-complete"))) {
    return { dir: dest, extracted: false, rejected: [], error: "", reused: true };
  }
  fs.rmSync(dest, { recursive: true, force: true });
  try {
    const result = extractZip(item.absPath, dest);
    fs.writeFileSync(path.join(dest, ".extract-complete"), new Date().toISOString(), "utf8");
    return { dir: dest, extracted: true, rejected: result.rejected, error: "" };
  } catch (error) {
    return { dir: dest, extracted: false, rejected: [], error: error.message };
  }
}

export function walkBatch(dir) {
  const images = [];
  const sidecars = [];
  const videos = [];
  const other = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      if (SKIP_NAMES.has(entry.name.toLowerCase())) continue;
      if (entry.name.toLowerCase() === "__macosx") continue;
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      const relative = path.relative(dir, abs).replace(/\\/g, "/");
      if (IMAGE_EXTENSIONS.has(ext)) images.push({ abs, relative, ext, name: entry.name });
      else if (entry.name.toLowerCase().endsWith(".json")) sidecars.push({ abs, relative, name: entry.name });
      else if (VIDEO_EXTENSIONS.has(ext)) videos.push({ abs, relative, ext, name: entry.name });
      else if (entry.name.toUpperCase() === "ALBUM_URL.TXT") other.push({ abs, relative, kind: "album_url" });
      else other.push({ abs, relative, ext, name: entry.name, kind: "unsupported" });
    }
  }

  if (fs.existsSync(dir)) walk(dir);
  images.sort((a, b) => a.relative.localeCompare(b.relative, "ru"));
  return { images, sidecars, videos, other };
}

export function findSidecar(image, sidecars) {
  const rel = image.relative;
  const stem = rel.replace(/\.[^.]+$/, "");
  const wanted = new Set([
    `${rel}.json`,
    `${rel}.supplemental-metadata.json`,
    `${stem}.json`,
    `${stem}.supplemental-metadata.json`,
  ]);
  return sidecars.find((sidecar) => wanted.has(sidecar.relative)) || null;
}

export function readAlbumUrl(dir, batch) {
  const file = path.join(dir, "ALBUM_URL.txt");
  if (fs.existsSync(file)) {
    const line = fs.readFileSync(file, "utf8").split(/\r?\n/).map((item) => item.trim()).find(Boolean) || "";
    if (/^https?:\/\//i.test(line)) return line;
  }
  return batch.album_url || "";
}

export function readGooglePhotos(jsonPath) {
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8").replace(/^\uFEFF/, ""));
    const taken = data.photoTakenTime || {};
    return {
      ok: true,
      title: typeof data.title === "string" ? data.title : "",
      description: typeof data.description === "string" ? data.description : "",
      photoTakenTime: taken.formatted || (taken.timestamp ? String(taken.timestamp) : ""),
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
