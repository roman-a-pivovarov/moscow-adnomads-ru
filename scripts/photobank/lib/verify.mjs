import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { STATUSES } from "../config.mjs";
import { REPO_ROOT } from "../config.mjs";
import { derivativeMeta, sha256File } from "./image.mjs";
import { absFromRepo, resolvePaths } from "./paths.mjs";
import { loadRegistry } from "./registry.mjs";
import { summarizeRegistry } from "./summary.mjs";

const STATUS_IDS = new Set(STATUSES.map((item) => item.id));

function checkIgnore(repo, relativePath) {
  const result = spawnSync("git", ["check-ignore", "-q", "--", relativePath], { cwd: repo, encoding: "utf8" });
  return result.status === 0;
}

export async function verifyRegistry(root) {
  const paths = resolvePaths(root);
  const registry = loadRegistry(paths);
  const errors = [];
  const ids = new Set();
  const hashes = new Set();
  for (const asset of registry.assets) {
    if (ids.has(asset.asset_id)) errors.push(`${asset.asset_id}: повторяющийся id`);
    ids.add(asset.asset_id);
    if (asset.sha256 && hashes.has(asset.sha256)) errors.push(`${asset.asset_id}: повторяющийся хеш`);
    if (asset.sha256) hashes.add(asset.sha256);
    if (!STATUS_IDS.has(asset.editorial?.status || "unsorted")) {
      errors.push(`${asset.asset_id}: плохой статус`);
    }
    if (asset.paths?.original) {
      const original = absFromRepo(paths, asset.paths.original);
      if (!fs.existsSync(original)) errors.push(`${asset.asset_id}: нет оригинала`);
      else if (sha256File(original) !== asset.sha256) errors.push(`${asset.asset_id}: хеш оригинала не сходится`);
      else if (fs.statSync(original).size !== asset.technical?.source_bytes) {
        errors.push(`${asset.asset_id}: вес оригинала не сходится`);
      }
    }
    if (!asset.technical?.process_error && asset.paths?.web) {
      const web = absFromRepo(paths, asset.paths.web);
      if (!fs.existsSync(web)) errors.push(`${asset.asset_id}: нет веб-версии`);
      else {
        const meta = await derivativeMeta(web);
        if (meta.bytes !== asset.technical.output_bytes) errors.push(`${asset.asset_id}: вес веб-версии не сходится`);
        if (meta.width !== asset.technical.output_width || meta.height !== asset.technical.output_height) {
          errors.push(`${asset.asset_id}: размер веб-версии не сходится`);
        }
        if (meta.exif) errors.push(`${asset.asset_id}: в веб-версии остался EXIF`);
        const longSide = Math.max(meta.width, meta.height);
        if (longSide > 1400) errors.push(`${asset.asset_id}: длинная сторона ${longSide}`);
      }
    }
    if (asset.technical?.process_error && asset.paths?.web) {
      errors.push(`${asset.asset_id}: ошибка обработки помечена как готовая веб-версия`);
    }
  }
  return { ok: errors.length === 0, errors, summary: summarizeRegistry(registry), assets: registry.assets.length };
}

export function verifyRepoGuards(repo = REPO_ROOT) {
  const errors = [];
  const notes = [];
  const ignored = [
    "assets-inbox/2019-09/photo.jpg",
    "assets-inbox/2026-02.zip",
    "assets-raw/editions/2019-moscow-practices/msk-000001.jpg",
    "assets-work/unzip/pack/photo.jpg",
    "docs/photo-review/index.html",
    "scripts/photobank/.venv/pyvenv.cfg",
    "assets-work/heif-decode/frame.png",
  ];
  const visible = [
    "assets-inbox/README.md",
    "data/photobank/registry.json",
    "assets-photobank/.gitkeep",
    "docs/photobank/interface.md",
    "docs/photo-review/README.md",
  ];
  for (const relativePath of ignored) {
    if (!checkIgnore(repo, relativePath)) errors.push(`не игнорируется: ${relativePath}`);
  }
  for (const relativePath of visible) {
    if (checkIgnore(repo, relativePath)) errors.push(`лишнее игнорирование: ${relativePath}`);
  }
  const tracked = spawnSync("git", ["ls-files", "assets-raw", "assets-inbox", "assets-work", "docs/photo-review"], {
    cwd: repo,
    encoding: "utf8",
  });
  const trackedFiles = (tracked.stdout || "").split(/\r?\n/).filter(Boolean);
  const unexpected = trackedFiles.filter((file) => !file.endsWith("README.md") && !file.endsWith(".gitkeep"));
  if (unexpected.length) errors.push(`в git попало сырьё или каталог: ${unexpected.join(", ")}`);

  const workflowPath = path.join(repo, ".github", "workflows", "deploy-reg.yml");
  const workflow = fs.existsSync(workflowPath) ? fs.readFileSync(workflowPath, "utf8") : "";
  if (!workflow.includes("local-dir: ./dist/")) {
    errors.push("FTP снова выгружает не dist/. Сырьё и каталог нужно исключить до публикации.");
  } else {
    notes.push("FTP-деплой выгружает только dist/. assets-raw, assets-inbox, assets-photobank и docs/photo-review сами туда не входят.");
  }
  if (workflow.includes("local-dir: ./") && !workflow.includes("local-dir: ./dist/")) {
    errors.push("local-dir указывает на корень репозитория");
  }
  return { ok: errors.length === 0, errors, notes };
}
