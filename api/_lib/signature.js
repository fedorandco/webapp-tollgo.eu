"use strict";
const crypto = require("crypto");

// Verifică semnătura HMAC-SHA256 (hex sau base64) a unui webhook, peste corpul brut.
// ASSUMPTION: Autopay semnează cu HMAC-SHA256; schema reală se confirmă din documentație.
function verifySignature(rawBody, headerValue, secret) {
  if (!secret || !headerValue) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest();
  const given = String(headerValue).replace(/^sha256=/i, "").trim();
  const candidates = [digest.toString("hex"), digest.toString("base64")];
  return candidates.some(c => {
    const a = Buffer.from(c);
    const b = Buffer.from(given);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

module.exports = { verifySignature };
