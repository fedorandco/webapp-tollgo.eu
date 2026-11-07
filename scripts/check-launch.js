"use strict";
// Verifică dacă site-ul este pregătit de producție. Rulează:  npm run check:launch
// Cod de ieșire 1 dacă mai este ceva de făcut. Nu modifică nimic.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const company = require("../legal/company.js");
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "integration", "config.js"), "utf8"), ctx);
const cfg = ctx.window.TOLLGO_CONFIG || {};

const todo = [];

company.REQUIRED.forEach(f => { if (!company[f]) todo.push(`Date firmă: câmpul „${f}” din legal/company.js este gol`); });
if (!company.reviewed) todo.push("Textele juridice nu sunt marcate ca verificate (legal/company.js: reviewed: true, după verificarea de către un jurist)");

const content = fs.readFileSync(path.join(root, "legal", "content.js"), "utf8");
const marks = (content.match(/mark class="todo"/g) || []).length;
if (marks) todo.push(`legal/content.js conține ${marks} marcaje „de confirmat / de completat” (căutați: class="todo")`);

if (cfg.sandbox) todo.push("integration/config.js: sandbox este true (treceți pe false)");
if (cfg.mode === "redirect" && !(cfg.redirect && (cfg.redirect.baseUrl || Object.keys(cfg.redirect.perCountry || {}).length))) {
  todo.push("Modul redirect nu are link de afiliat (integration/config.js: redirect.baseUrl)");
}
if (cfg.mode === "iframe" && !(cfg.iframe && cfg.iframe.src && cfg.iframe.allowedOrigin)) todo.push("Modul iframe nu are src / allowedOrigin");

if (todo.length === 0) {
  console.log("Pregătit de lansare: nu am găsit nimic de rezolvat.");
} else {
  console.log("De rezolvat înainte de lansare:\n" + todo.map(t => " - " + t).join("\n"));
  process.exitCode = 1;
}
