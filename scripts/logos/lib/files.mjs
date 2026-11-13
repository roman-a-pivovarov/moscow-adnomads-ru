import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { VARIANTS, SOURCE_TYPES } from "../config.mjs";
import { inspectRaster } from "./meta.mjs";
import { ensureDir, repoRelative } from "./paths.mjs";
import { sanitizeSvg, suggestSvgPlate, svgSize } from "./svg.mjs";

const SOURCE_IDS = new Set(SOURCE_TYPES.map((item) => item.id));

export function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function sniffFormat(buf, fileUrl = "") {
  const ext = path.extname(new URL(fileUrl, "https://local.invalid").pathname).toLowerCase().replace(".", "");
  if (buf.length >= 8 && buf.toString("ascii", 1, 4) === "PNG") return "png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.length >= 6 && (buf.toString("ascii", 0, 6) === "GIF87a" || buf.toString("ascii", 0, 6) === "GIF89a")) return "gif";
  const head = buf.subarray(0, Math.min(buf.length, 400)).toString("utf8").trim().toLowerCase();
  if (head.startsWith("<svg") || head.includes("<svg")) return "svg";
  if (ext === "svg") return "svg";
  if (ext === "jpeg") return "jpg";
  return ext || "bin";
}

export function prepareCandidateFile(root, paths, { organizationId, candidateId, buffer, sourceExt }) {
  const format = sniffFormat(buffer, `file.${sourceExt || "bin"}`);
  const rawDir = path.join(paths.raw, organizationId);
  const preparedDir = path.join(paths.prepared, organizationId);
  ensureDir(rawDir);
  ensureDir(preparedDir);
  const rawFile = path.join(rawDir, `${candidateId}.${format === "jpeg" ? "jpg" : format}`);
  fs.writeFileSync(rawFile, buffer);

  const result = {
    format: format === "jpeg" ? "jpg" : format,
    width: null,
    height: null,
    has_alpha: false,
    plate: "checker",
    svg_safe: format !== "svg",
    prepared_file: "",
    usable: false,
    note: "",
  };

  if (format === "svg") {
    const text = buffer.toString("utf8");
    const clean = sanitizeSvg(text);
    if (!clean.ok) {
      result.note = `SVG не подготовлен: ${clean.dangers.join(", ")}`;
      result.svg_safe = false;
      return { ...result, raw_file: rawFile };
    }
    const prepared = path.join(preparedDir, `${candidateId}.svg`);
    fs.writeFileSync(prepared, clean.text, "utf8");
    const size = svgSize(clean.text);
    result.width = size.width;
    result.height = size.height;
    result.has_alpha = true;
    result.plate = suggestSvgPlate(clean.text);
    result.prepared_file = prepared;
    result.usable = true;
    result.svg_safe = true;
    return { ...result, raw_file: rawFile };
  }

  const raster = inspectRaster(buffer, format);
  if (!raster) {
    result.note = "Формат не разобран, файл сохранён только как исходник.";
    return { ...result, raw_file: rawFile };
  }
  const prepared = path.join(preparedDir, `${candidateId}.${result.format}`);
  fs.copyFileSync(rawFile, prepared);
  result.width = raster.width;
  result.height = raster.height;
  result.has_alpha = raster.has_alpha;
  result.plate = raster.plate;
  result.prepared_file = prepared;
  result.usable = true;
  return { ...result, raw_file: rawFile };
}

export function assertCandidateInput(input) {
  const errors = [];
  if (!input.organization_id) errors.push("нет organization_id");
  if (!input.source_page) errors.push("нет source_page");
  if (!input.file_url && !input.file_path) errors.push("нет file_url или file_path");
  if (!SOURCE_IDS.has(input.source_type)) errors.push(`неизвестный source_type ${input.source_type || ""}`);
  if (!VARIANTS.includes(input.variant || "primary")) errors.push(`неизвестный variant ${input.variant}`);
  if (input.historical_period && !input.historical_basis) {
    errors.push("historical_period без основания");
  }
  return errors;
}

export function nextCandidateId(registry, organizationId) {
  const slug = organizationId.replace(/^org-/, "");
  const prefix = `logo-${slug}-`;
  let max = 0;
  for (const candidate of registry.candidates) {
    if (!candidate.candidate_id.startsWith(prefix)) continue;
    const num = Number(candidate.candidate_id.slice(prefix.length));
    if (num > max) max = num;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function toStoredPaths(root, prepared) {
  return {
    raw_path: repoRelative(root, prepared.raw_file),
    prepared_path: prepared.prepared_file ? repoRelative(root, prepared.prepared_file) : "",
  };
}
