import fs from "node:fs";
import path from "node:path";
import { PRIORITIES, SELECTED_SCHEMA } from "../config.mjs";
import { ensureDir, repoRelative, writeJsonAtomic } from "./paths.mjs";

const PRIORITY_RANK = { first: 0, normal: 1, reserve: 2, "": 3 };

function copyRole(root, paths, candidate, organizationId, filename) {
  if (!candidate?.prepared_path || !candidate.usable) return null;
  const source = path.join(root, candidate.prepared_path);
  if (!fs.existsSync(source)) return null;
  const ext = path.extname(source);
  const destDir = path.join(paths.selectedFiles, organizationId);
  ensureDir(destDir);
  const dest = path.join(destDir, `${filename}${ext}`);
  fs.copyFileSync(source, dest);
  return {
    candidate_id: candidate.candidate_id,
    src: repoRelative(root, dest),
    format: candidate.format,
    width: candidate.width,
    height: candidate.height,
    plate: candidate.plate,
    variant: candidate.variant,
    presumed_current: candidate.presumed_current,
    historical_period: candidate.historical_period || "",
  };
}

export function buildSelected(paths, registry) {
  const byId = new Map(registry.candidates.map((item) => [item.candidate_id, item]));
  const items = registry.organizations.map((org) => {
    const decision = org.decision || {};
    const primary = copyRole(paths.root, paths, byId.get(decision.primary_candidate_id), org.organization_id, "primary");
    const dark = copyRole(paths.root, paths, byId.get(decision.dark_candidate_id), org.organization_id, "dark");
    const historical = (decision.historical || [])
      .map((item, index) => {
        const file = copyRole(
          paths.root,
          paths,
          byId.get(item.candidate_id),
          org.organization_id,
          `historical-${index + 1}`,
        );
        if (!file) return null;
        return { ...file, edition_ids: [...(item.edition_ids || [])] };
      })
      .filter(Boolean);
    return {
      organization_id: org.organization_id,
      name: org.name,
      editions: org.editions.map((edition) => ({
        edition_id: edition.edition_id,
        adnomads_id: edition.adnomads_id,
        date_label: edition.date_label,
        label: edition.label || "",
        role: edition.role,
      })),
      priority: PRIORITIES.includes(decision.priority) ? decision.priority : "",
      sort_order: Number.isInteger(decision.sort_order) ? decision.sort_order : null,
      primary,
      dark,
      historical,
      text_fallback: org.name,
      comment: decision.comment || "",
      needs_other: Boolean(decision.needs_other),
    };
  });
  items.sort((a, b) => {
    const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (rank) return rank;
    const orderA = a.sort_order ?? 100000;
    const orderB = b.sort_order ?? 100000;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, "ru");
  });
  const selected = {
    schema: SELECTED_SCHEMA,
    generated_at: new Date().toISOString(),
    registry_version: registry.version,
    note: "Рабочий набор выбранных файлов лежит в assets-logos/selected и не публикуется, пока архитектор не подтвердит путь. Наличие записи не подтверждает хоста ближайшего выпуска и не делает организацию спонсором. Пустой primary означает текстовое название.",
    items,
  };
  writeJsonAtomic(paths.selected, selected);
  return selected;
}
