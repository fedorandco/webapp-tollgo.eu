"use strict";
// Server local pentru dezvoltare: servește fișierele statice și rulează funcțiile din /api.
// Pornire: npm run dev  (implicit http://localhost:3000, providerul este "mock")
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT) || 3000;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json" };

function route(pathname) {
  if (pathname === "/api/quote") return require("../api/quote.js");
  if (pathname === "/api/orders") return require("../api/orders.js");
  if (pathname === "/api/webhook") return require("../api/webhook.js");
  if (/^\/api\/orders\/[^/]+$/.test(pathname)) return require("../api/orders/[id].js");
  return null;
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    const handler = route(url.pathname);
    if (!handler) { res.statusCode = 404; return res.end("not found"); }
    return Promise.resolve(handler(req, res)).catch(e => { res.statusCode = 500; res.end(String(e)); });
  }
  const rel = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep) || rel.startsWith("api") || rel.startsWith(".git")) { res.statusCode = 403; return res.end("forbidden"); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.statusCode = 404; return res.end("not found"); }
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(buf);
  });
}).listen(PORT, () => console.log(`tollgo dev server: http://localhost:${PORT}`));
