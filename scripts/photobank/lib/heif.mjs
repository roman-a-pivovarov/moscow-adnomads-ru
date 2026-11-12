import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const decoderScript = path.join(here, "..", "heif_decode.py");
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

export function sniffContainer(filePath) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(16);
    const read = fs.readSync(fd, buf, 0, 16, 0);
    if (read >= 2 && buf[0] === 0xff && buf[1] === 0xd8) return "jpeg";
    if (read >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
    if (read >= 12 && buf.toString("ascii", 4, 8) === "ftyp") {
      const brand = buf.toString("ascii", 8, 12).toLowerCase();
      if (HEIF_BRANDS.has(brand)) return "heif";
    }
    return "other";
  } finally {
    fs.closeSync(fd);
  }
}

function pythonExecutable() {
  const roots = [path.join(here, "..", ".venv")];
  const names = process.platform === "win32"
    ? [path.join("Scripts", "python.exe")]
    : [path.join("bin", "python3"), path.join("bin", "python")];
  for (const root of roots) {
    for (const name of names) {
      const candidate = path.join(root, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return "";
}

export function decodeHeifToPng(inputPath, workDir) {
  const python = pythonExecutable();
  if (!python) {
    throw new Error("heic_decoder_missing:нет scripts/photobank/.venv. См. docs/photobank/install-windows.md");
  }
  if (!fs.existsSync(decoderScript)) throw new Error("heic_decoder_missing:нет heif_decode.py");
  const dir = path.join(workDir || path.join(os.tmpdir(), "moscow-photobank-heif"), "heif-decode");
  fs.mkdirSync(dir, { recursive: true });
  const pngPath = path.join(dir, `${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.png`);
  try {
    const result = spawnSync(python, [decoderScript, inputPath, pngPath], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 180000,
      maxBuffer: 8 * 1024 * 1024,
    });
    const stdout = (result.stdout || "").trim();
    let parsed = null;
    if (stdout) {
      try {
        parsed = JSON.parse(stdout);
      } catch {
        parsed = null;
      }
    }
    if (result.error) throw new Error(`heic_decode_failed:${result.error.message}`);
    if (!parsed || parsed.ok !== true || !fs.existsSync(pngPath)) {
      const message = parsed?.error || (result.stderr || "").trim() || `heic_decode_failed:код ${result.status}`;
      throw new Error(message.startsWith("heic_") ? message : `heic_decode_failed:${message}`);
    }
    return { pngPath, meta: parsed };
  } catch (error) {
    fs.rmSync(pngPath, { force: true });
    throw error;
  }
}
