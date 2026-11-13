import fs from "node:fs";
import { SELECTED_SCHEMA } from "../config.mjs";
import { readJson } from "./paths.mjs";

export function loadSelected(paths) {
  const selected = readJson(paths.selected);
  if (selected.schema !== SELECTED_SCHEMA) throw new Error(`Неизвестная схема выбранных логотипов: ${selected.schema}`);
  return selected;
}

/** Выбранный набор одной организации. Пустой primary означает текстовое название. */
export function logosFor(selected, organizationId) {
  return selected.items.find((item) => item.organization_id === organizationId) || null;
}

export function selectedWithFiles(selected) {
  return selected.items.filter((item) => item.primary);
}

export function readSelectedFile(paths) {
  if (!fs.existsSync(paths.selected)) return null;
  return loadSelected(paths);
}
