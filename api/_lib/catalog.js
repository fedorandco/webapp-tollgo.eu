"use strict";
// Catalogul serverului. Oglindește constantele din index.html (PERIODS, PERIOD_MIN_DAYS,
// MAX_DAYS_AHEAD, REG_CODES, regex-ul pentru număr). Testul tests/catalog.test.js
// verifică automat că rămân identice.

const PERIODS = {
  AUT: ["d1", "d10", "m2", "y1"],
  CZE: ["d1", "d10", "m1", "y1"],
  SVK: ["d1", "d10", "m1", "y1"],
  HUN: ["d1", "d10", "m1", "y1"],
  SVN: ["d7", "m1", "y1"],
  CHE: ["y1"],
  BGR: ["d1", "wknd", "d7", "m1", "m3", "y1"],
  ROU: ["d1", "d10", "m1", "d60", "y1"]
};

const PERIOD_MIN_DAYS = { AUT: { m2: 18, y1: 18 } };
const MAX_DAYS_AHEAD = 30;

const REG_CODES = ["AL","AD","AT","BY","BE","BA","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IS","IE","IT","LV","LI","LT","LU","MT","MD","MC","ME","NL","MK","NO","PL","PT","RO","SM","RS","SK","SI","ES","SE","CH","UA","GB","VA"];

const PLATE_RE = /^[A-Z0-9][A-Z0-9 -]{1,13}[A-Z0-9]$/;

const LANGS = ["ro", "de", "cs", "sk", "hu", "sl", "bg", "en"];

// TODO(Autopay): confirmați lista reală de categorii și maparea pe codurile lor.
const VEHICLE_CATEGORIES = ["car", "motorcycle"];

// TODO(Autopay): din 1 oct. 2026 prețul vignetei românești depinde de norma de emisii.
// Confirmați clasele exacte acceptate de API înainte de producție.
const EMISSION_CLASSES = ["euro6", "euro5", "euro4", "euro3", "older", "electric"];
const EMISSION_REQUIRED_FOR = ["ROU"];

// Parametrii de atribuire acceptați din frontend (UTM, click-id-uri).
const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "click_id", "ref"];

// Statusuri normalizate, independente de furnizor.
const ORDER_STATUSES = ["pending_payment", "processing", "issued", "failed", "cancelled"];

module.exports = {
  PERIODS, PERIOD_MIN_DAYS, MAX_DAYS_AHEAD, REG_CODES, PLATE_RE, LANGS,
  VEHICLE_CATEGORIES, EMISSION_CLASSES, EMISSION_REQUIRED_FOR, ATTRIBUTION_KEYS, ORDER_STATUSES
};
