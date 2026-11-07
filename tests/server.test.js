"use strict";
const test = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { Readable } = require("stream");

const C = require("../api/_lib/catalog");
const { validateOrder, maskPlate, maskEmail } = require("../api/_lib/validate");
const { verifySignature } = require("../api/_lib/signature");
const token = require("../api/_lib/token");
const mock = require("../api/_lib/provider-mock");
const live = require("../api/_lib/provider-live");
const { getProvider } = require("../api/_lib/provider");

const NOW = new Date("2026-11-07T10:00:00Z");
const good = () => ({
  country: "CZE", period: "d10", startDate: "2026-11-10", regCountry: "RO", plate: "b 123 abc",
  vehicleCategory: "car", email: "Test@Example.com", lang: "ro",
  consent: { terms: true }, attribution: { utm_source: "x", evil: "y" }
});

// ---- catalog vs index.html ----
test("catalogul serverului este identic cu constantele din index.html", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const grab = name => {
    const m = new RegExp("const " + name + " = ([\\s\\S]*?);\\n").exec(html);
    assert.ok(m, name + " lipsește din index.html");
    return JSON.parse(JSON.stringify(vm.runInNewContext("(" + m[1] + ")")));
  };
  assert.deepStrictEqual(grab("PERIODS"), C.PERIODS);
  assert.deepStrictEqual(grab("PERIOD_MIN_DAYS"), C.PERIOD_MIN_DAYS);
  assert.deepStrictEqual(grab("REG_CODES"), C.REG_CODES);
  assert.strictEqual(grab("MAX_DAYS_AHEAD"), C.MAX_DAYS_AHEAD);
  assert.ok(html.includes(String(C.PLATE_RE).slice(1, -1).replace(/\\/g, "\\")) || html.includes("[A-Z0-9][A-Z0-9 -]{1,13}[A-Z0-9]"));
});

// ---- validare ----
test("o comandă validă este normalizată", () => {
  const v = validateOrder(good(), NOW);
  assert.ok(v.ok, JSON.stringify(v.errors));
  assert.strictEqual(v.value.plate, "B 123 ABC");
  assert.strictEqual(v.value.email, "test@example.com");
  assert.deepStrictEqual(v.value.attribution, { utm_source: "x" }); // cheia necunoscută e ignorată
});

test("validarea respinge date greșite", () => {
  const bad = (patch, field) => {
    const v = validateOrder(Object.assign(good(), patch), NOW);
    assert.ok(!v.ok && v.errors[field], `ar fi trebuit respins: ${field}`);
  };
  bad({ country: "XXX" }, "country");
  bad({ period: "m99" }, "period");
  bad({ country: "CHE", period: "d10" }, "period"); // Elveția are doar y1
  bad({ startDate: "2026-02-31" }, "startDate");
  bad({ startDate: "2026-12-30" }, "startDate");  // peste 30 de zile
  bad({ startDate: "2026-10-01" }, "startDate");  // în trecut
  bad({ regCountry: "ZZ" }, "regCountry");
  bad({ plate: "!" }, "plate");
  bad({ vehicleCategory: "tank" }, "vehicleCategory");
  bad({ email: "nu-este-email" }, "email");
  bad({ consent: { terms: false } }, "consent");
});

test("Austria: 2 luni / 1 an încep cel mai devreme a 18-a zi; România cere norma de emisii", () => {
  const aut = Object.assign(good(), { country: "AUT", period: "m2", startDate: "2026-11-10" });
  assert.strictEqual(validateOrder(aut, NOW).errors.startDate, "out_of_range");
  assert.ok(validateOrder(Object.assign(aut, { startDate: "2026-11-25" }), NOW).ok);

  const rou = Object.assign(good(), { country: "ROU", period: "d10" });
  assert.strictEqual(validateOrder(rou, NOW).errors.emissionClass, "invalid");
  assert.ok(validateOrder(Object.assign(rou, { emissionClass: "euro5" }), NOW).ok);
  // pentru alte țări norma se ignoră
  assert.strictEqual(validateOrder(Object.assign(good(), { emissionClass: "euro5" }), NOW).value.emissionClass, undefined);
});

test("mascarea datelor personale pentru loguri", () => {
  assert.strictEqual(maskPlate("B123ABC"), "B1***C");
  assert.strictEqual(maskEmail("ion@exemplu.ro"), "i***@exemplu.ro");
});

// ---- provider mock ----
test("mock: processing apoi issued; FAIL* produce failed; id necunoscut => null", async () => {
  const o = await mock.createOrder({ plate: "B123ABC" });
  assert.strictEqual(o.status, "processing");
  assert.strictEqual((await mock.getOrder(o.id)).status, "processing");
  assert.strictEqual((await mock.getOrder(o.id, Date.now() + 10000)).status, "issued");
  const f = await mock.createOrder({ plate: "FAIL123" });
  assert.strictEqual((await mock.getOrder(f.id)).status, "failed");
  assert.strictEqual(await mock.getOrder("altceva"), null);
  assert.strictEqual((await mock.quote({})).price, null); // fără prețuri inventate
});

// ---- selectarea providerului ----
test("în producție, fără configurare, providerul live refuză (nu cade pe mock)", () => {
  assert.strictEqual(getProvider({}).name, "mock");
  assert.throws(() => getProvider({ VERCEL_ENV: "production" }), e => e.status === 503 && e.code === "provider_not_configured");
  assert.throws(() => getProvider({ AUTOPAY_MODE: "live" }), e => e.code === "provider_not_configured");
});

// ---- provider live (cu fetch simulat) ----
test("live: trimite Idempotency-Key și Authorization, mapează răspunsul", async () => {
  let seen;
  const fakeFetch = async (url, opts) => {
    seen = { url, opts };
    return { ok: true, status: 201, json: async () => ({ id: 42, status: "paid", payment_url: "https://pay.example/42", price: "12.5", currency: "EUR" }) };
  };
  const p = live.create({ AUTOPAY_API_BASE: "https://api.example/", AUTOPAY_API_KEY: "k" }, fakeFetch);
  const r = await p.createOrder(validateOrder(good(), NOW).value, { idempotencyKey: "abc-12345" });
  assert.strictEqual(seen.url, "https://api.example/orders");
  assert.strictEqual(seen.opts.headers["Idempotency-Key"], "abc-12345");
  assert.strictEqual(seen.opts.headers.Authorization, "Bearer k");
  assert.deepStrictEqual(r, { id: "42", status: "processing", paymentUrl: "https://pay.example/42", price: 12.5, currency: "EUR" });
});

test("live: erori ale furnizorului devin erori controlate", async () => {
  const mk = f => live.create({ AUTOPAY_API_BASE: "https://a", AUTOPAY_API_KEY: "k" }, f);
  const v = validateOrder(good(), NOW).value;
  await assert.rejects(mk(async () => { throw new Error("boom"); }).createOrder(v), e => e.code === "provider_unreachable");
  await assert.rejects(mk(async () => ({ ok: false, status: 500 })).createOrder(v), e => e.code === "provider_error");
  await assert.rejects(mk(async () => ({ ok: false, status: 422 })).createOrder(v), e => e.code === "provider_rejected");
  assert.strictEqual(await mk(async () => ({ ok: false, status: 404 })).getOrder("x"), null);
});

// ---- token și semnătură ----
test("tokenul de comandă: valid doar pentru id-ul lui", () => {
  const env = { ORDER_TOKEN_SECRET: "s3cret" };
  const t = token.sign("order-1", env);
  assert.ok(token.verify("order-1", t, env));
  assert.ok(!token.verify("order-2", t, env));
  assert.ok(!token.verify("order-1", "", env));
  assert.throws(() => token.sign("x", { VERCEL_ENV: "production" }), e => e.code === "order_token_secret_missing");
});

test("semnătura webhook: hex, base64, prefix sha256=, și respingere", () => {
  const body = Buffer.from('{"orderId":"1","status":"issued"}');
  const hmac = crypto.createHmac("sha256", "wh").update(body);
  const hex = hmac.digest("hex");
  assert.ok(verifySignature(body, hex, "wh"));
  assert.ok(verifySignature(body, "sha256=" + hex, "wh"));
  assert.ok(verifySignature(body, Buffer.from(hex, "hex").toString("base64"), "wh"));
  assert.ok(!verifySignature(body, hex, "altă-cheie"));
  assert.ok(!verifySignature(Buffer.from("alt corp"), hex, "wh"));
  assert.ok(!verifySignature(body, "", "wh"));
  assert.ok(!verifySignature(body, hex, ""));
});

// ---- handlere HTTP ----
function call(handler, { method = "POST", url = "/", headers = {}, body } = {}) {
  const raw = body === undefined ? [] : [Buffer.from(typeof body === "string" ? body : JSON.stringify(body))];
  const req = Object.assign(Readable.from(raw), { method, url, headers: Object.assign({ host: "tollgo.test" }, headers) });
  return new Promise(resolve => {
    const res = { headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { resolve({ status: this.statusCode, headers: this.headers, json: b ? JSON.parse(b) : null }); } };
    Promise.resolve(handler(req, res));
  });
}

test("API: flux complet creare comandă -> citire status, cu protecția tokenului", async () => {
  process.env.ORDER_TOKEN_SECRET = "test-secret";
  delete process.env.AUTOPAY_MODE; delete process.env.VERCEL_ENV;
  const orders = require("../api/orders.js");
  const one = require("../api/orders/[id].js");
  const valid = Object.assign(good(), { startDate: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10) });

  const noKey = await call(orders, { body: valid });
  assert.strictEqual(noKey.status, 400);

  const bad = await call(orders, { body: Object.assign({}, valid, { plate: "!" }), headers: { "idempotency-key": "key-12345" } });
  assert.strictEqual(bad.status, 422);
  assert.ok(bad.json.fields.plate);

  const created = await call(orders, { body: valid, headers: { "idempotency-key": "key-12345" } });
  assert.strictEqual(created.status, 201);
  const { id, accessToken } = created.json;
  assert.ok(id && accessToken);

  const ok = await call(one, { method: "GET", url: `/api/orders/${id}?token=${accessToken}` });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.json.status, "processing");
  assert.deepStrictEqual(Object.keys(ok.json).sort(), ["id", "status"]); // fără date personale

  const wrong = await call(one, { method: "GET", url: `/api/orders/${id}?token=gresit` });
  assert.strictEqual(wrong.status, 404);
  const none = await call(one, { method: "GET", url: `/api/orders/${id}` });
  assert.strictEqual(none.status, 404);
});

test("API: metoda greșită și origine străină sunt respinse", async () => {
  const orders = require("../api/orders.js");
  assert.strictEqual((await call(orders, { method: "GET" })).status, 405);
  const foreign = await call(orders, { body: good(), headers: { origin: "https://evil.example", "idempotency-key": "key-12345" } });
  assert.strictEqual(foreign.status, 403);
  const same = await call(orders, { body: good(), headers: { origin: "https://tollgo.test", "idempotency-key": "key-12345" } });
  assert.notStrictEqual(same.status, 403);
});

test("API: /quote nu returnează preț în mock și validează intrarea", async () => {
  const quote = require("../api/quote.js");
  const r = await call(quote, { body: Object.assign(good(), { consent: undefined, startDate: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10) }) });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.price, null);
  assert.strictEqual((await call(quote, { body: { country: "XXX" } })).status, 422);
});

test("webhook: semnătură corectă => 200; incorectă/lipsă => 401", async () => {
  process.env.AUTOPAY_WEBHOOK_SECRET = "wh-secret";
  const hook = require("../api/webhook.js");
  const body = JSON.stringify({ orderId: "o-1", status: "issued" });
  const sig = crypto.createHmac("sha256", "wh-secret").update(body).digest("hex");
  assert.strictEqual((await call(hook, { body, headers: { "x-signature": sig } })).status, 200);
  assert.strictEqual((await call(hook, { body, headers: { "x-signature": "00" } })).status, 401);
  assert.strictEqual((await call(hook, { body })).status, 401);
  assert.strictEqual((await call(hook, { body: "nu json", headers: { "x-signature": crypto.createHmac("sha256", "wh-secret").update("nu json").digest("hex") } })).status, 400);
  assert.strictEqual(hook.config.api.bodyParser, false);
});
