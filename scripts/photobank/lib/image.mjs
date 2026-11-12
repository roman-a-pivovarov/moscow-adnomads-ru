import fs from "node:fs";
import crypto from "node:crypto";
import sharp from "sharp";
import { PROFILES, SMALL_SOURCE_LONG_SIDE } from "../config.mjs";
import { decodeHeifToPng, sniffContainer } from "./heif.mjs";

sharp.cache(false);

export function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

export function orientationOf(width, height) {
  if (!width || !height) return "unknown";
  const ratio = width / height;
  if (ratio > 1.12) return "landscape";
  if (ratio < 0.89) return "portrait";
  return "square";
}

function exifDateTime(meta) {
  if (!meta.exif) return "";
  const text = meta.exif.toString("latin1");
  const match = text.match(/(?:19|20)\d{2}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}/);
  if (!match) return "";
  return match[0].replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
}

async function loadSharpOriented(inputPath) {
  const meta = await sharp(inputPath, { failOn: "none" }).metadata();
  if (!meta.width || !meta.height) throw new Error("unreadable_image");
  const { data, info } = await sharp(inputPath, { failOn: "none" })
    .rotate()
    .toColorspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (!info.width || !info.height) throw new Error("unreadable_image");
  return {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
    format: meta.format || "",
    hasAlpha: Boolean(meta.hasAlpha) || info.channels === 4,
    exifOrientation: meta.orientation || 1,
    exifDateTime: exifDateTime(meta),
    storedWidth: meta.width,
    storedHeight: meta.height,
    pages: meta.pages || 1,
    space: meta.space || "",
    heif: null,
  };
}

export async function loadOriented(inputPath, options = {}) {
  if (sniffContainer(inputPath) !== "heif") return loadSharpOriented(inputPath);
  const decoded = decodeHeifToPng(inputPath, options.workDir);
  try {
    const oriented = await loadSharpOriented(decoded.pngPath);
    const meta = decoded.meta;
    oriented.format = "heic";
    oriented.storedWidth = meta.width;
    oriented.storedHeight = meta.height;
    oriented.exifOrientation = 1;
    oriented.exifDateTime = meta.exif_datetime || "";
    oriented.space = meta.color_conversion === "icc_to_srgb" ? "srgb" : oriented.space;
    oriented.heif = meta;
    if (oriented.width !== meta.width || oriented.height !== meta.height) {
      throw new Error(`heic_decode_failed:размер png ${oriented.width}x${oriented.height}, ожидался ${meta.width}x${meta.height}`);
    }
    return oriented;
  } finally {
    fs.rmSync(decoded.pngPath, { force: true });
  }
}

async function encodeRaw(oriented, longSide, quality) {
  const { data, info } = await sharp(oriented.data, {
    raw: { width: oriented.width, height: oriented.height, channels: oriented.channels },
    failOn: "none",
  })
    .resize({
      width: longSide,
      height: longSide,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });
  return {
    buffer: data,
    width: info.width,
    height: info.height,
    bytes: data.length,
    quality,
  };
}

export async function renderProfile(oriented, profileName) {
  const profile = PROFILES[profileName];
  if (!profile) throw new Error(`unknown_profile:${profileName}`);
  const sourceLong = Math.max(oriented.width, oriented.height);
  let longSide = Math.min(profile.longSide, sourceLong);
  const floor = profile.allowDownscale ? Math.min(profile.minLongSide, sourceLong) : longSide;
  let best = null;

  while (longSide >= 1) {
    for (let quality = profile.qualityStart; quality >= profile.qualityMin; quality -= profile.qualityStep) {
      const encoded = await encodeRaw(oriented, longSide, quality);
      if (!best || encoded.bytes < best.bytes) best = { ...encoded, longSide };
      if (encoded.bytes <= profile.maxBytes) {
        return { ...encoded, longSide, overBudget: false, profile: profileName };
      }
    }
    if (!profile.allowDownscale || longSide <= floor) break;
    const next = Math.max(floor, Math.round(longSide * 0.9));
    if (next === longSide) break;
    longSide = next;
  }

  if (!best) throw new Error("encode_failed");
  return { ...best, overBudget: best.bytes > profile.maxBytes, profile: profileName };
}

export async function technicalNotes(oriented) {
  const notes = [];
  const longSide = Math.max(oriented.width, oriented.height);
  if (longSide < SMALL_SOURCE_LONG_SIDE) notes.push("small_source");
  if (oriented.hasAlpha) notes.push("has_alpha");
  if ((oriented.pages || 1) > 1) notes.push("gif_first_frame");
  if ((oriented.exifOrientation || 1) > 1) notes.push("exif_oriented");

  try {
    const stats = await sharp(oriented.data, {
      raw: { width: oriented.width, height: oriented.height, channels: oriented.channels },
      failOn: "none",
    })
      .resize(48, 48, { fit: "fill" })
      .removeAlpha()
      .stats();
    const channels = (stats.channels || []).slice(0, 3);
    const mean = channels.length
      ? channels.reduce((sum, channel) => sum + (channel.mean ?? 0), 0) / channels.length
      : 128;
    const stdev = channels.length
      ? channels.reduce((sum, channel) => sum + (channel.stdev ?? 0), 0) / channels.length
      : 0;
    if (mean < 28) notes.push("dark");
    if (mean > 232) notes.push("bright");
    if (stdev < 12) notes.push("low_contrast");
  } catch {
    notes.push("stats_unavailable");
  }
  return notes;
}

export async function perceptualHash(oriented) {
  const { data } = await sharp(oriented.data, {
    raw: { width: oriented.width, height: oriented.height, channels: oriented.channels },
    failOn: "none",
  })
    .greyscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bits = "";
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      bits += data[y * 9 + x] < data[y * 9 + x + 1] ? "1" : "0";
    }
  }
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += Number.parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

export function hammingHex(left, right) {
  if (!left || !right || left.length !== right.length) return 64;
  let distance = 0;
  for (let i = 0; i < left.length; i += 1) {
    let value = Number.parseInt(left[i], 16) ^ Number.parseInt(right[i], 16);
    while (value) {
      distance += value & 1;
      value >>= 1;
    }
  }
  return distance;
}

export function similarPairs(assets, maxDistance) {
  const ready = assets.filter((asset) => asset.technical?.perceptual_hash && !asset.technical?.process_error);
  const pairs = [];
  for (let i = 0; i < ready.length; i += 1) {
    for (let j = i + 1; j < ready.length; j += 1) {
      const distance = hammingHex(ready[i].technical.perceptual_hash, ready[j].technical.perceptual_hash);
      if (distance <= maxDistance) {
        pairs.push({
          asset_ids: [ready[i].asset_id, ready[j].asset_id],
          distance,
          note: "Подсказка похожести, не основание удалять кадр.",
        });
      }
    }
  }
  pairs.sort((a, b) => a.distance - b.distance || a.asset_ids[0].localeCompare(b.asset_ids[0]));
  return pairs;
}

export async function derivativeMeta(filePath) {
  const stat = fs.statSync(filePath);
  const meta = await sharp(filePath).metadata();
  return {
    bytes: stat.size,
    width: meta.width || 0,
    height: meta.height || 0,
    hasAlpha: Boolean(meta.hasAlpha),
    exif: Boolean(meta.exif),
    space: meta.space || "",
  };
}
