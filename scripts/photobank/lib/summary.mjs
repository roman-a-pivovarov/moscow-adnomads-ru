export function summarizeRegistry(registry) {
  const byEdition = {};
  const webBytes = [];
  let originalBytes = 0;
  let webTotal = 0;
  let overBudget = 0;
  let errors = 0;
  let conflicts = 0;
  for (const asset of registry.assets) {
    const key = asset.edition_id || asset.category || "unknown";
    if (!byEdition[key]) {
      byEdition[key] = { assets: 0, processed: 0, errors: 0, original_bytes: 0, web_bytes: 0 };
    }
    const bucket = byEdition[key];
    bucket.assets += 1;
    const sourceBytes = asset.technical?.source_bytes || 0;
    bucket.original_bytes += sourceBytes;
    originalBytes += sourceBytes;
    if (asset.technical?.process_error) {
      errors += 1;
      bucket.errors += 1;
    } else if (asset.paths?.web) {
      bucket.processed += 1;
      const bytes = asset.technical?.output_bytes || 0;
      bucket.web_bytes += bytes;
      webTotal += bytes;
      webBytes.push(bytes);
    }
    if ((asset.technical?.warnings || []).includes("over_budget")) overBudget += 1;
    if (asset.source_conflict) conflicts += 1;
  }
  const sorted = [...webBytes].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length
    ? sorted.length % 2
      ? sorted[mid]
      : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : null;
  return {
    assets: registry.assets.length,
    processed: webBytes.length,
    errors,
    conflicts,
    over_budget: overBudget,
    original_bytes: originalBytes,
    web_bytes: webTotal,
    web_median_bytes: median,
    web_max_bytes: sorted.length ? sorted[sorted.length - 1] : null,
    by_edition: byEdition,
  };
}
