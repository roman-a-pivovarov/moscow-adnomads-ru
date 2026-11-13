import fs from "node:fs";
import path from "node:path";
import { FETCH_TIMEOUT_MS, MAX_BYTES, USER_AGENT } from "../config.mjs";
import { sha256, assertCandidateInput, nextCandidateId, prepareCandidateFile, sniffFormat, toStoredPaths } from "./files.mjs";

export async function fetchBuffer(url) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "image/svg+xml,image/png,image/webp,image/*,*/*;q=0.8",
    },
  });
  if (response.status === 401 || response.status === 403 || response.status === 429) {
    const error = new Error(`Источник ограничил доступ: HTTP ${response.status}`);
    error.code = "blocked";
    throw error;
  }
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.code = "http";
    throw error;
  }
  const length = Number(response.headers.get("content-length") || 0);
  if (length > MAX_BYTES) throw new Error("Файл больше 8 МБ");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_BYTES) throw new Error("Файл больше 8 МБ");
  const type = (response.headers.get("content-type") || "").toLowerCase();
  if (type.includes("text/html")) throw new Error("По адресу файла пришла HTML-страница");
  return buffer;
}

export function loadCandidateBytes(input) {
  if (input.file_path) {
    const buffer = fs.readFileSync(input.file_path);
    return { buffer, ext: path.extname(input.file_path).replace(".", "") };
  }
  return null;
}

export async function addCandidate(paths, registry, input) {
  const errors = assertCandidateInput(input);
  if (errors.length) throw new Error(errors.join("; "));
  const org = registry.organizations.find((item) => item.organization_id === input.organization_id);
  if (!org) throw new Error(`Нет организации ${input.organization_id}`);

  let buffer;
  let ext = "";
  if (input.file_path) {
    buffer = fs.readFileSync(input.file_path);
    ext = path.extname(input.file_path).replace(".", "");
  } else {
    buffer = await fetchBuffer(input.file_url);
    ext = sniffFormat(buffer, input.file_url);
  }
  const hash = sha256(buffer);
  const sameOrg = registry.candidates.find(
    (item) => item.organization_id === input.organization_id && item.content_sha256 === hash,
  );
  if (sameOrg) {
    return { skipped: true, reason: "duplicate", candidate_id: sameOrg.candidate_id };
  }
  const otherOrg = registry.candidates.find(
    (item) => item.organization_id !== input.organization_id && item.content_sha256 === hash,
  );

  const candidateId = nextCandidateId(registry, input.organization_id);
  const prepared = prepareCandidateFile(paths.root, paths, {
    organizationId: input.organization_id,
    candidateId,
    buffer,
    sourceExt: ext,
  });
  const stored = toStoredPaths(paths.root, prepared);
  const candidate = {
    candidate_id: candidateId,
    organization_id: input.organization_id,
    source_page: input.source_page,
    file_url: input.file_url || "",
    retrieved_at: new Date().toISOString().slice(0, 10),
    source_type: input.source_type,
    format: prepared.format,
    width: prepared.width,
    height: prepared.height,
    has_alpha: prepared.has_alpha,
    plate: input.plate || prepared.plate,
    variant: input.variant || "primary",
    description: input.description || "",
    presumed_current: input.presumed_current ?? null,
    historical_period: input.historical_period || "",
    historical_basis: input.historical_basis || "",
    ambiguity: [input.ambiguity || "", otherOrg ? `Тот же файл уже лежит у ${otherOrg.organization_id} (${otherOrg.candidate_id}).` : ""]
      .filter(Boolean)
      .join(" "),
    content_sha256: hash,
    bytes: buffer.length,
    raw_path: stored.raw_path,
    prepared_path: stored.prepared_path,
    svg_safe: prepared.svg_safe,
    usable: prepared.usable,
    prepare_note: prepared.note,
  };
  registry.candidates.push(candidate);
  registry.gaps = registry.gaps.filter((gap) => gap.organization_id !== input.organization_id || gap.kind === "partial");
  return { skipped: false, candidate };
}

export function addGap(registry, gap) {
  const id = `${gap.organization_id}:${gap.kind || "missing"}:${gap.note}`;
  if (registry.gaps.some((item) => `${item.organization_id}:${item.kind || "missing"}:${item.note}` === id)) return;
  registry.gaps.push({
    organization_id: gap.organization_id,
    kind: gap.kind || "missing",
    note: gap.note,
    urls: gap.urls || [],
    checked_at: new Date().toISOString().slice(0, 10),
  });
}
