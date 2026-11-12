import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buffer) {
  let c = ~0;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function decodeZipName(nameBuf, flags, extra) {
  const unicode = readUnicodePath(extra, nameBuf);
  if (unicode) return unicode;
  if (flags & 0x800) return nameBuf.toString("utf8");
  const asUtf8 = nameBuf.toString("utf8");
  if (!asUtf8.includes("\uFFFD")) return asUtf8;
  try {
    return new TextDecoder("ibm866").decode(nameBuf);
  } catch {
    return asUtf8;
  }
}

function readUnicodePath(extra, nameBuf) {
  let cursor = 0;
  while (cursor + 4 <= extra.length) {
    const id = extra.readUInt16LE(cursor);
    const size = extra.readUInt16LE(cursor + 2);
    const body = extra.subarray(cursor + 4, cursor + 4 + size);
    cursor += 4 + size;
    if (id !== 0x7075 || body.length < 5) continue;
    if (crc32(nameBuf) !== body.readUInt32LE(1)) continue;
    return body.subarray(5).toString("utf8");
  }
  return "";
}

export function safeZipPath(name) {
  const normalized = String(name || "").replace(/\\/g, "/");
  if (normalized.startsWith("/") || normalized.startsWith("//") || /^[a-zA-Z]:/.test(normalized)) {
    throw new Error("absolute_path");
  }
  const parts = [];
  for (const part of normalized.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") throw new Error("path_traversal");
    parts.push(part);
  }
  if (!parts.length) throw new Error("empty_path");
  return parts.join("/");
}

function readCentralDirectory(fd, size) {
  const tailLen = Math.min(size, 22 + 65535);
  const tail = Buffer.alloc(tailLen);
  fs.readSync(fd, tail, 0, tailLen, size - tailLen);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i -= 1) {
    if (tail.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("zip_eocd_not_found");
  const cdSize = tail.readUInt32LE(eocd + 12);
  const cdOffset = tail.readUInt32LE(eocd + 16);
  if (cdOffset === 0xffffffff || cdSize === 0xffffffff) throw new Error("zip64_unsupported");
  const cd = Buffer.alloc(cdSize);
  fs.readSync(fd, cd, 0, cdSize, cdOffset);
  const entries = [];
  let cursor = 0;
  while (cursor + 46 <= cd.length) {
    if (cd.readUInt32LE(cursor) !== 0x02014b50) break;
    const flags = cd.readUInt16LE(cursor + 8);
    const method = cd.readUInt16LE(cursor + 10);
    const crc = cd.readUInt32LE(cursor + 16);
    const compSize = cd.readUInt32LE(cursor + 20);
    const uncompSize = cd.readUInt32LE(cursor + 24);
    const nameLen = cd.readUInt16LE(cursor + 28);
    const extraLen = cd.readUInt16LE(cursor + 30);
    const commentLen = cd.readUInt16LE(cursor + 32);
    const localOffset = cd.readUInt32LE(cursor + 42);
    const nameBuf = cd.subarray(cursor + 46, cursor + 46 + nameLen);
    const extra = cd.subarray(cursor + 46 + nameLen, cursor + 46 + nameLen + extraLen);
    entries.push({
      name: decodeZipName(nameBuf, flags, extra),
      flags,
      method,
      crc,
      compSize,
      uncompSize,
      localOffset,
    });
    cursor += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function readEntryData(fd, entry) {
  const header = Buffer.alloc(30);
  const headerBytes = fs.readSync(fd, header, 0, 30, entry.localOffset);
  if (headerBytes !== 30 || header.readUInt32LE(0) !== 0x04034b50) {
    throw new Error("bad_local_header");
  }
  const nameLen = header.readUInt16LE(26);
  const extraLen = header.readUInt16LE(28);
  const dataStart = entry.localOffset + 30 + nameLen + extraLen;
  const compressed = Buffer.alloc(entry.compSize);
  const got = entry.compSize ? fs.readSync(fd, compressed, 0, entry.compSize, dataStart) : 0;
  if (got !== entry.compSize) throw new Error("truncated_entry");
  if (entry.method === 0) return compressed;
  if (entry.method === 8) return zlib.inflateRawSync(compressed);
  throw new Error(`method_${entry.method}`);
}

function openZip(zipPath) {
  const fd = fs.openSync(zipPath, "r");
  try {
    const size = fs.fstatSync(fd).size;
    return { fd, entries: readCentralDirectory(fd, size) };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

export function listZip(zipPath) {
  const opened = openZip(zipPath);
  fs.closeSync(opened.fd);
  return opened.entries.map((entry) => {
    let safe = "";
    let pathError = "";
    try {
      if (!entry.name.endsWith("/")) safe = safeZipPath(entry.name);
    } catch (error) {
      pathError = error.message;
    }
    return {
      name: entry.name,
      safePath: safe,
      pathError,
      method: entry.method,
      bytes: entry.uncompSize,
      encrypted: Boolean(entry.flags & 1),
      directory: entry.name.endsWith("/"),
    };
  });
}

export function extractZip(zipPath, destDir) {
  const opened = openZip(zipPath);
  const extracted = [];
  const rejected = [];
  try {
    fs.mkdirSync(destDir, { recursive: true });
    const destRoot = path.resolve(destDir);
    for (const entry of opened.entries) {
      if (entry.name.endsWith("/")) continue;
      let relative = "";
      try {
        relative = safeZipPath(entry.name);
      } catch (error) {
        rejected.push({ name: entry.name, reason: error.message });
        continue;
      }
      if (entry.flags & 1) {
        rejected.push({ name: entry.name, reason: "encrypted" });
        continue;
      }
      if (entry.method !== 0 && entry.method !== 8) {
        rejected.push({ name: entry.name, reason: `method_${entry.method}` });
        continue;
      }
      let data;
      try {
        data = readEntryData(opened.fd, entry);
      } catch (error) {
        rejected.push({ name: entry.name, reason: error.message });
        continue;
      }
      if ((entry.crc >>> 0) !== crc32(data)) {
        rejected.push({ name: entry.name, reason: "crc_mismatch" });
        continue;
      }
      const out = path.resolve(destRoot, ...relative.split("/"));
      const prefix = destRoot.endsWith(path.sep) ? destRoot : destRoot + path.sep;
      if (out !== destRoot && !out.startsWith(prefix)) {
        rejected.push({ name: entry.name, reason: "path_escape" });
        continue;
      }
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, data);
      extracted.push({ relative, absolute: out, bytes: data.length });
    }
  } finally {
    fs.closeSync(opened.fd);
  }
  return { extracted, rejected };
}
