const EVENT_RE = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

export function inspectSvg(text) {
  const dangers = [];
  if (/<script\b/i.test(text)) dangers.push("script");
  if (/\son[a-z]+\s*=/i.test(text)) dangers.push("event");
  if (/javascript\s*:/i.test(text)) dangers.push("javascript-url");
  if (/<foreignObject\b/i.test(text)) dangers.push("foreignObject");
  if (/<(iframe|embed|object|audio|video)\b/i.test(text)) dangers.push("embedded");
  if (/<!DOCTYPE\b/i.test(text)) dangers.push("doctype");
  if (/<!ENTITY\b/i.test(text)) dangers.push("entity");
  if (/<(?:image|use|feImage)\b[^>]*(?:href|xlink:href)\s*=\s*["']https?:/i.test(text)) dangers.push("external-image");
  if (/url\(\s*["']?https?:/i.test(text)) dangers.push("external-url");
  if (/@import\b/i.test(text)) dangers.push("import");
  return dangers;
}

export function sanitizeSvg(text) {
  const original = inspectSvg(text);
  const blocking = original.filter((item) => !["doctype", "event"].includes(item));
  if (blocking.length) {
    return { ok: false, dangers: original, text: "" };
  }
  let next = text.replace(/<!DOCTYPE[\s\S]*?>/gi, "");
  next = next.replace(EVENT_RE, "");
  next = next.replace(/<svg\b(?![^>]*\sxmlns\s*=)/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  const left = inspectSvg(next);
  if (left.length) return { ok: false, dangers: left, text: "" };
  if (!/<svg\b/i.test(next)) return { ok: false, dangers: ["not-svg"], text: "" };
  return { ok: true, dangers: [], text: next.trim() };
}

export function svgSize(text) {
  const open = text.match(/<svg\b[^>]*>/i)?.[0] || "";
  const width = Number(open.match(/\bwidth\s*=\s*["']([\d.]+)/i)?.[1] || 0);
  const height = Number(open.match(/\bheight\s*=\s*["']([\d.]+)/i)?.[1] || 0);
  const box = open.match(/viewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)/i);
  return {
    width: width || (box ? Number(box[1]) : null),
    height: height || (box ? Number(box[2]) : null),
  };
}

function luminance(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function parseColor(token) {
  const named = { white: [255, 255, 255], black: [0, 0, 0], currentcolor: null };
  const lower = token.toLowerCase();
  if (named[lower] !== undefined) return named[lower];
  const hex = lower.match(/^#([\da-f]{3}|[\da-f]{6})$/);
  if (hex) {
    const raw = hex[1];
    const full = raw.length === 3 ? [...raw].map((ch) => ch + ch).join("") : raw;
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
  }
  const rgb = lower.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

export function suggestSvgPlate(text) {
  const colors = [];
  const re = /(?:fill|stroke)\s*[:=]\s*["']?\s*(#[0-9a-f]{3,8}|rgba?\([^)]+\)|white|black)\b/gi;
  for (const match of text.matchAll(re)) {
    const color = parseColor(match[1]);
    if (color) colors.push(color);
  }
  if (!colors.length) return "checker";
  const lums = colors.map((item) => luminance(...item));
  const light = lums.filter((item) => item > 0.82).length;
  const dark = lums.filter((item) => item < 0.18).length;
  if (light && !dark) return "dark";
  if (dark && !light) return "light";
  if (light > dark * 2) return "dark";
  return "light";
}
