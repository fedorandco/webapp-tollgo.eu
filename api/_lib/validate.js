"use strict";
const C = require("./catalog");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isRealDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function addDays(isoDate, n) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function str(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// Validează și normalizează o comandă primită de la frontend.
// Serverul nu are încredere în validarea din browser.
function validateOrder(input, now = new Date()) {
  const errors = {};
  const src = input && typeof input === "object" ? input : {};

  const country = str(src.country, 3).toUpperCase();
  if (!C.PERIODS[country]) errors.country = "invalid";

  const period = str(src.period, 8);
  if (!errors.country && !C.PERIODS[country].includes(period)) errors.period = "invalid";

  // Toleranță de o zi pentru diferențe de fus orar între client și server (UTC).
  const today = now.toISOString().slice(0, 10);
  const startDate = str(src.startDate, 10);
  if (!isRealDate(startDate)) {
    errors.startDate = "invalid";
  } else if (!errors.country && !errors.period) {
    const minDays = ((C.PERIOD_MIN_DAYS[country] || {})[period]) || 0;
    const min = addDays(today, minDays - 1);
    const max = addDays(today, C.MAX_DAYS_AHEAD + 1);
    if (startDate < min || startDate > max) errors.startDate = "out_of_range";
  }

  const regCountry = str(src.regCountry, 2).toUpperCase();
  if (!C.REG_CODES.includes(regCountry)) errors.regCountry = "invalid";

  const plate = str(src.plate, 15).toUpperCase();
  if (!C.PLATE_RE.test(plate)) errors.plate = "invalid";

  const vehicleCategory = str(src.vehicleCategory, 20);
  if (!C.VEHICLE_CATEGORIES.includes(vehicleCategory)) errors.vehicleCategory = "invalid";

  let emissionClass = str(src.emissionClass, 20);
  if (C.EMISSION_REQUIRED_FOR.includes(country)) {
    if (!C.EMISSION_CLASSES.includes(emissionClass)) errors.emissionClass = "invalid";
  } else {
    emissionClass = "";
  }

  const email = str(src.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) errors.email = "invalid";

  if (!(src.consent && src.consent.terms === true)) errors.consent = "required";

  const lang = C.LANGS.includes(src.lang) ? src.lang : "en";

  const attribution = {};
  const a = src.attribution && typeof src.attribution === "object" ? src.attribution : {};
  C.ATTRIBUTION_KEYS.forEach(k => { if (typeof a[k] === "string" && a[k]) attribution[k] = a[k].slice(0, 200); });

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    value: ok ? {
      country, period, startDate, regCountry, plate, vehicleCategory,
      emissionClass: emissionClass || undefined,
      email, lang, attribution,
      consent: { terms: true, at: now.toISOString() }
    } : null
  };
}

// Pentru loguri: nu scriem numerele de înmatriculare și e-mailurile complete.
function maskPlate(p) {
  const s = String(p || "");
  return s.length <= 3 ? "***" : s.slice(0, 2) + "***" + s.slice(-1);
}
function maskEmail(e) {
  const [u, d] = String(e || "").split("@");
  return d ? (u.slice(0, 1) + "***@" + d) : "***";
}

module.exports = { validateOrder, maskPlate, maskEmail, isRealDate, addDays };
