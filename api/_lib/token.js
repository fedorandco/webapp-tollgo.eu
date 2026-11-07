"use strict";
const crypto = require("crypto");
const { HttpError } = require("./http");

// Token de acces pentru o comandă: doar cine a creat comanda (și primește tokenul)
// poate citi statusul ei. Id-ul singur nu este suficient.
function secret(env) {
  if (env.ORDER_TOKEN_SECRET) return env.ORDER_TOKEN_SECRET;
  if (env.VERCEL_ENV === "production") throw new HttpError(503, "order_token_secret_missing");
  return "dev-only-secret"; // doar pentru dezvoltare / preview
}

function sign(orderId, env = process.env) {
  return crypto.createHmac("sha256", secret(env)).update(String(orderId)).digest("base64url").slice(0, 32);
}

function verify(orderId, token, env = process.env) {
  const expected = Buffer.from(sign(orderId, env));
  const given = Buffer.from(String(token || ""));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

module.exports = { sign, verify };
