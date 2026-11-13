import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { resolveRoot } from "./lib/paths.mjs";

const root = resolveRoot();
const port = Number(process.argv[2] || 4317);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/docs/logos/catalog/index.html";
  const relative = pathname.replace(/^[/\\]+/, "");
  const file = path.resolve(root, relative);
  const rootResolved = path.resolve(root);
  if (file !== rootResolved && !file.startsWith(rootResolved + path.sep)) {
    response.writeHead(403);
    response.end("forbidden");
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404);
    response.end("not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(file).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Каталог: http://127.0.0.1:${port}/docs/logos/catalog/index.html`);
});
