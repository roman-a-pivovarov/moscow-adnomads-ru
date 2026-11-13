import zlib from "node:zlib";

function u32(buf, offset) {
  return buf.readUInt32BE(offset);
}

function pngSize(buf) {
  if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: u32(buf, 16), height: u32(buf, 20), bitDepth: buf[24], colorType: buf[25] };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilter(data, height, stride, bpp) {
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    const filter = data[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    const dest = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = data[rowStart + x];
      const left = x >= bpp ? out[dest + x - bpp] : 0;
      const up = y > 0 ? out[dest - stride + x] : 0;
      const ul = y > 0 && x >= bpp ? out[dest - stride + x - bpp] : 0;
      let value = raw;
      if (filter === 1) value = (raw + left) & 255;
      else if (filter === 2) value = (raw + up) & 255;
      else if (filter === 3) value = (raw + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) value = (raw + paeth(left, up, ul)) & 255;
      else if (filter !== 0) return null;
      out[dest + x] = value;
    }
  }
  return out;
}

function readPngPixels(buf) {
  const info = pngSize(buf);
  if (!info || info.bitDepth !== 8) return null;
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[info.colorType];
  if (!channels) return null;
  const chunks = [];
  let offset = 8;
  let palette = null;
  while (offset + 8 <= buf.length) {
    const length = u32(buf, offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === "PLTE") palette = data;
    if (type === "IDAT") chunks.push(data);
    if (type === "IEND") break;
    offset += 12 + length;
  }
  if (!chunks.length) return null;
  let inflated;
  try {
    inflated = zlib.inflateSync(Buffer.concat(chunks));
  } catch {
    return null;
  }
  const stride = info.width * channels;
  const pixels = unfilter(inflated, info.height, stride, channels);
  if (!pixels) return null;
  return { ...info, channels, pixels, palette };
}

function pixelAt(decoded, x, y) {
  const { channels, pixels, colorType, palette, width } = decoded;
  const i = (y * width + x) * channels;
  if (colorType === 3 && palette) {
    const idx = pixels[i] * 3;
    return { r: palette[idx], g: palette[idx + 1], b: palette[idx + 2], a: 255 };
  }
  if (channels === 1) return { r: pixels[i], g: pixels[i], b: pixels[i], a: 255 };
  if (channels === 2) return { r: pixels[i], g: pixels[i], b: pixels[i], a: pixels[i + 1] };
  if (channels === 3) return { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2], a: 255 };
  return { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2], a: pixels[i + 3] };
}

function lum(pixel) {
  return (0.2126 * pixel.r + 0.7152 * pixel.g + 0.0722 * pixel.b) / 255;
}

export function inspectPng(buf) {
  const decoded = readPngPixels(buf);
  const size = pngSize(buf);
  if (!size) return null;
  if (!decoded) {
    return { width: size.width, height: size.height, has_alpha: size.colorType === 4 || size.colorType === 6, plate: "checker" };
  }
  const points = [
    [0, 0],
    [decoded.width - 1, 0],
    [0, decoded.height - 1],
    [decoded.width - 1, decoded.height - 1],
  ].map(([x, y]) => pixelAt(decoded, x, y));
  const transparentCorners = points.filter((item) => item.a < 16).length >= 3;
  let opaque = 0;
  let lumSum = 0;
  const stepX = Math.max(1, Math.floor(decoded.width / 24));
  const stepY = Math.max(1, Math.floor(decoded.height / 24));
  for (let y = 0; y < decoded.height; y += stepY) {
    for (let x = 0; x < decoded.width; x += stepX) {
      const pixel = pixelAt(decoded, x, y);
      if (pixel.a < 128) continue;
      opaque += 1;
      lumSum += lum(pixel);
    }
  }
  const mean = opaque ? lumSum / opaque : 0.5;
  const cornerLum = points.reduce((sum, item) => sum + lum(item), 0) / points.length;
  let plate = "checker";
  if (transparentCorners && mean > 0.78) plate = "dark";
  else if (transparentCorners && mean < 0.35) plate = "light";
  else if (transparentCorners) plate = "checker";
  else if (cornerLum > 0.9) plate = "light";
  else if (cornerLum < 0.12) plate = "dark";
  else plate = "checker";
  return {
    width: decoded.width,
    height: decoded.height,
    has_alpha: decoded.colorType === 4 || decoded.colorType === 6 || points.some((item) => item.a < 250),
    plate,
  };
}

export function inspectJpeg(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < buf.length) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const size = buf.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        width: buf.readUInt16BE(offset + 7),
        height: buf.readUInt16BE(offset + 5),
        has_alpha: false,
        plate: "light",
      };
    }
    offset += 2 + size;
  }
  return { width: null, height: null, has_alpha: false, plate: "light" };
}

export function inspectWebp(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X" && buf.length >= 30) {
    const flags = buf[20];
    const width = 1 + buf.readUIntLE(24, 3);
    const height = 1 + buf.readUIntLE(27, 3);
    return { width, height, has_alpha: Boolean(flags & 16), plate: flags & 16 ? "checker" : "light" };
  }
  if (chunk === "VP8 " && buf.length >= 30) {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff, has_alpha: false, plate: "light" };
  }
  if (chunk === "VP8L" && buf.length >= 25) {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, has_alpha: true, plate: "checker" };
  }
  return { width: null, height: null, has_alpha: false, plate: "checker" };
}

export function inspectRaster(buf, format) {
  if (format === "png") return inspectPng(buf);
  if (format === "jpg" || format === "jpeg") return inspectJpeg(buf);
  if (format === "webp") return inspectWebp(buf);
  if (format === "gif" && buf.toString("ascii", 0, 3) === "GIF") {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8), has_alpha: true, plate: "checker" };
  }
  return null;
}
