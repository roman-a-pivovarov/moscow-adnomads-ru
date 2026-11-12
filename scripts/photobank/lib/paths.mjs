import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../config.mjs";

export function resolveRoot(argv = process.argv, env = process.env) {
  const flag = argv.find((arg) => arg.startsWith("--root="));
  if (flag) return path.resolve(flag.slice("--root=".length));
  if (env.PHOTOBANK_ROOT) return path.resolve(env.PHOTOBANK_ROOT);
  return REPO_ROOT;
}

export function resolvePaths(root = REPO_ROOT) {
  const abs = path.resolve(root);
  return {
    root: abs,
    inbox: path.join(abs, "assets-inbox"),
    raw: path.join(abs, "assets-raw"),
    work: path.join(abs, "assets-work"),
    bank: path.join(abs, "assets-photobank"),
    data: path.join(abs, "data", "photobank"),
    registry: path.join(abs, "data", "photobank", "registry.json"),
    reports: path.join(abs, "data", "photobank", "reports"),
    decisions: path.join(abs, "data", "photobank", "decisions"),
    catalog: path.join(abs, "docs", "photo-review"),
    publicMedia: path.join(abs, "public", "media", "photobank"),
    publicReview: path.join(abs, "public", "photo-review"),
  };
}

export function toPosix(value) {
  return String(value || "").replace(/\\/g, "/");
}

export function relPosix(root, absPath) {
  return toPosix(path.relative(root, absPath));
}

export function absFromRepo(paths, rel) {
  if (!rel) return "";
  return path.join(paths.root, ...String(rel).split("/"));
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeJsonAtomic(file, data) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  fs.rmSync(file, { force: true });
  fs.renameSync(tmp, file);
}

export function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}
