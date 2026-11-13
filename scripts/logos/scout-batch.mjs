import fs from "node:fs";
import { FETCH_TIMEOUT_MS, USER_AGENT } from "./config.mjs";

const file = process.argv[2];
const out = process.argv[3] || "data/logos/intake/scout-report.json";
const sites = JSON.parse(fs.readFileSync(file, "utf8"));

const results = [];
let index = 0;
const workers = Array.from({ length: 4 }, () => worker());
await Promise.all(workers);
fs.mkdirSync("data/logos/intake", { recursive: true });
fs.writeFileSync(out, JSON.stringify(results, null, 2));
console.log(`Готово: ${results.length}. Отчёт: ${out}`);

async function worker() {
  while (index < sites.length) {
    const current = sites[index];
    index += 1;
    results.push(await scout(current));
  }
}

async function scout(site) {
  try {
    const response = await fetch(site.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
    });
    if (response.status === 401 || response.status === 403 || response.status === 429) {
      console.log(`blocked ${site.organization_id} ${response.status}`);
      return { ...site, blocked: true, status: response.status, found: [] };
    }
    if (!response.ok) {
      console.log(`http ${site.organization_id} ${response.status}`);
      return { ...site, status: response.status, found: [] };
    }
    const html = await response.text();
    const base = response.url || site.url;
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
      if (/icon/.test(rel) && /\.svg(\?|$)/i.test(href || "")) push(href, "svg-icon");
    }
    const header = html.slice(0, 80000);
    for (const match of header.matchAll(/["']([^"']+\.svg(?:\?[^"']*)?)["']/gi)) {
      const url = match[1];
      if (/logo|brand|wordmark|header/i.test(url)) push(url, "svg-url");
    }
    console.log(`${site.organization_id}: ${found.length}`);
    return { ...site, final_url: base, status: response.status, title: html.match(/<title>([^<]*)/i)?.[1] || "", found };
  } catch (error) {
    console.log(`error ${site.organization_id}: ${error.message}`);
    return { ...site, error: error.message, found: [] };
  }
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return match ? match[2] || match[3] || "" : "";
}
