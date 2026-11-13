import { FETCH_TIMEOUT_MS, USER_AGENT } from "./config.mjs";

const page = process.argv[2];
if (!page) {
  console.error("Укажите страницу: node scripts/logos/scout.mjs https://example.com");
  process.exit(1);
}

try {
  const response = await fetch(page, {
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
  });
  if (response.status === 401 || response.status === 403 || response.status === 429) {
    console.log(JSON.stringify({ page, blocked: true, status: response.status }, null, 2));
    process.exit(2);
  }
  if (!response.ok) {
    console.log(JSON.stringify({ page, blocked: false, status: response.status, found: [] }, null, 2));
    process.exit(1);
  }
  const html = await response.text();
  const base = response.url || page;
  const found = [];
  const seen = new Set();
  const push = (url, why) => {
    if (!url || url.startsWith("data:")) return;
    let absolute = "";
    try {
      absolute = new URL(url, base).href;
    } catch {
      return;
    }
    if (seen.has(absolute)) return;
    seen.add(absolute);
    found.push({ url: absolute, why });
  };

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const src = attr(tag, "src") || attr(tag, "data-src") || attr(tag, "data-original");
    const hint = `${attr(tag, "class")} ${attr(tag, "alt")} ${attr(tag, "id")} ${src}`.toLowerCase();
    if (/logo|brand|wordmark/.test(hint)) push(src, "img");
  }
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = attr(tag, "rel").toLowerCase();
    const href = attr(tag, "href");
    if (/icon/.test(rel) && /\.svg($|\?)/i.test(href)) push(href, "svg-icon");
  }
  for (const match of html.matchAll(/<svg\b[\s\S]{0,20000}?<\/svg>/gi)) {
    const svg = match[0];
    const around = html.slice(Math.max(0, match.index - 180), match.index).toLowerCase();
    if (!/logo|brand/.test(around) && !/logo|brand/.test(svg.slice(0, 200).toLowerCase())) continue;
    if (svg.length < 80 || svg.length > 20000) continue;
    found.push({ inline_svg: true, bytes: Buffer.byteLength(svg), why: "inline-svg", preview: svg.slice(0, 120) });
  }
  console.log(JSON.stringify({ page: base, status: response.status, title: html.match(/<title>([^<]*)/i)?.[1] || "", found }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ page, error: error.message, found: [] }, null, 2));
  process.exit(1);
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return match ? match[2] || match[3] || "" : "";
}
