import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export function resolveRoot(start = path.resolve(here, "../../..")) {
  let dir = start;
  for (let i = 0; i < 6; i += 1) {
    if (fs.existsSync(path.join(dir, "package.json")) && fs.existsSync(path.join(dir, "src", "content", "organizations.ts"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Корень проекта не найден: нет src/content/organizations.ts");
}

export function resolvePaths(root = resolveRoot()) {
  return {
    root,
    organizations: path.join(root, "src", "content", "organizations.ts"),
    participations: path.join(root, "src", "content", "participations.ts"),
    editions: path.join(root, "src", "content", "editions.ts"),
    data: path.join(root, "data", "logos"),
    registry: path.join(root, "data", "logos", "registry.json"),
    selected: path.join(root, "data", "logos", "selected.json"),
    decisions: path.join(root, "data", "logos", "decisions"),
    inbox: path.join(root, "assets-logos", "inbox"),
    raw: path.join(root, "assets-logos", "raw"),
    prepared: path.join(root, "assets-logos", "prepared"),
    selectedFiles: path.join(root, "assets-logos", "selected"),
    catalogDir: path.join(root, "docs", "logos", "catalog"),
    catalogHtml: path.join(root, "docs", "logos", "catalog", "index.html"),
    uiSource: path.join(root, "scripts", "logos", "ui", "catalog.js"),
  };
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeJsonAtomic(file, value) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, file);
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

export function repoRelative(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}
