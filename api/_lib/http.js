"use strict";

class HttpError extends Error {
  constructor(status, code, extra) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra || {};
  }
}

function send(res, status, body, headers) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  Object.entries(headers || {}).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(body));
}

// Verifică metoda și că cererea vine de pe același site (sau dintr-o origine permisă).
// Returnează false (și răspunde) dacă cererea trebuie oprită.
function guard(req, res, methods, env = process.env) {
  if (!methods.includes(req.method)) {
    send(res, 405, { error: "method_not_allowed" }, { Allow: methods.join(", ") });
    return false;
  }
  const origin = req.headers && req.headers.origin;
  if (origin) {
    let host = "";
    try { host = new URL(origin).host; } catch (e) { /* origin invalid */ }
    const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    if (host !== req.headers.host && !allowed.includes(origin)) {
      send(res, 403, { error: "origin_not_allowed" });
      return false;
    }
  }
  return true;
}

async function readRaw(req, limit = 32 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new HttpError(413, "payload_too_large");
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

// Vercel parsează automat JSON; dacă nu a făcut-o, citim corpul manual.
async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const raw = await readRaw(req);
  if (!raw.length) return {};
  try { return JSON.parse(raw.toString("utf8")); }
  catch (e) { throw new HttpError(400, "invalid_json"); }
}

function handleError(res, err) {
  if (err instanceof HttpError) return send(res, err.status, Object.assign({ error: err.code }, err.extra));
  console.error(JSON.stringify({ evt: "unhandled_error", message: String(err && err.message) }));
  return send(res, 500, { error: "internal_error" });
}

module.exports = { HttpError, send, guard, readRaw, readJson, handleError };
