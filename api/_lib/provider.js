"use strict";
const { HttpError } = require("./http");

// Alege providerul după AUTOPAY_MODE: "mock" sau "live".
// Implicit: "live" în producție, "mock" în rest (preview / local). Astfel producția nu
// poate ajunge accidental pe providerul simulat.
function getProvider(env = process.env) {
  const mode = env.AUTOPAY_MODE || (env.VERCEL_ENV === "production" ? "live" : "mock");
  if (mode === "mock") return require("./provider-mock");
  if (mode === "live") return require("./provider-live").create(env);
  throw new HttpError(503, "provider_not_configured");
}

module.exports = { getProvider };
