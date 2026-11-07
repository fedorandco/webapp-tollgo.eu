"use strict";
const test = require("node:test");
const assert = require("node:assert");

const { _test } = require("../integration/adapters.js");
const { buildRedirectUrl, currentMode, safeUrl } = _test;

test("redirect: doar parametrii de tracking, fără date personale implicit", () => {
  const order = { plate: "B123ABC", email: "a@b.ro", country: "AUT" };
  const url = buildRedirectUrl("https://aff.example/go?pid=7", order, {}, { utm_source: "blog", click_id: "c1" });
  const u = new URL(url);
  assert.strictEqual(u.searchParams.get("pid"), "7");
  assert.strictEqual(u.searchParams.get("utm_source"), "blog");
  assert.strictEqual(u.searchParams.get("click_id"), "c1");
  assert.ok(!url.includes("B123ABC") && !url.includes("a%40b.ro"));
});

test("redirect: redenumirea parametrilor și prefill explicit", () => {
  const url = buildRedirectUrl("https://aff.example/", { plate: "B1", country: "AUT" },
    { params: { utm_source: "src" }, prefillParams: { country: "c" } }, { utm_source: "blog" });
  const u = new URL(url);
  assert.strictEqual(u.searchParams.get("src"), "blog");
  assert.strictEqual(u.searchParams.get("c"), "AUT");
  assert.strictEqual(u.searchParams.get("plate"), null);
});

test("redirect: bază goală sau nesigură => null", () => {
  assert.strictEqual(buildRedirectUrl("", {}, {}, {}), null);
  assert.strictEqual(buildRedirectUrl("javascript:alert(1)", {}, {}, {}), null);
  assert.strictEqual(buildRedirectUrl("nu e url", {}, {}, {}), null);
});

test("modul activ: ?mode= funcționează doar în sandbox", () => {
  assert.strictEqual(currentMode({ mode: "api", sandbox: false }, "?mode=iframe"), "api");
  assert.strictEqual(currentMode({ mode: "api", sandbox: true }, "?mode=iframe"), "iframe");
  assert.strictEqual(currentMode({ mode: "api", sandbox: true }, "?mode=hack"), "api");
  assert.strictEqual(currentMode({ mode: "ceva" }, ""), "redirect");
  assert.strictEqual(currentMode(undefined, ""), "redirect");
});

test("safeUrl: doar https și, dacă e setată, doar gazde permise", () => {
  assert.ok(safeUrl("https://pay.example/x"));
  assert.strictEqual(safeUrl("http://pay.example/x"), null);
  assert.strictEqual(safeUrl("javascript:alert(1)"), null);
  assert.strictEqual(safeUrl("https://evil.example/", ["pay.example"]), null);
  assert.ok(safeUrl("https://pay.example/", ["pay.example"]));
});
