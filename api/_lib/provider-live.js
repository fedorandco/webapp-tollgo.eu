"use strict";
const { HttpError } = require("./http");

// Adaptor pentru API-ul real Autopay.
//
// !!! IMPORTANT !!!  Autopay nu publică documentația API. Tot ce este marcat
// ASSUMPTION mai jos (căi, autentificare, nume de câmpuri, statusuri) este un loc de
// completat după ce primim documentația și mediul de test. Nimic de aici nu a fost
// verificat contra unui API real. Atât timp cât AUTOPAY_API_BASE sau AUTOPAY_API_KEY
// lipsesc, adaptorul răspunde 503 "provider_not_configured".

// ASSUMPTION: căile endpoint-urilor
const PATHS = {
  quote: () => "/quote",
  createOrder: () => "/orders",
  getOrder: id => `/orders/${encodeURIComponent(id)}`
};

// ASSUMPTION: maparea statusurilor furnizorului pe statusurile noastre normalizate
const STATUS_MAP = {
  pending: "pending_payment",
  awaiting_payment: "pending_payment",
  paid: "processing",
  processing: "processing",
  completed: "issued",
  issued: "issued",
  failed: "failed",
  cancelled: "cancelled",
  canceled: "cancelled"
};

function normalizeStatus(s) {
  return STATUS_MAP[String(s || "").toLowerCase()] || "processing";
}

// ASSUMPTION: structura cererii către Autopay (se ajustează după documentație)
function toProviderOrder(o) {
  return {
    country: o.country,
    period: o.period,
    start_date: o.startDate,
    registration_country: o.regCountry,
    plate: o.plate,
    vehicle_category: o.vehicleCategory,
    emission_class: o.emissionClass,
    email: o.email,
    language: o.lang,
    tracking: o.attribution
  };
}

// ASSUMPTION: structura răspunsului Autopay
function fromProviderOrder(p) {
  return {
    id: String(p.id || p.order_id),
    status: normalizeStatus(p.status),
    paymentUrl: p.payment_url || null,
    price: p.price != null ? Number(p.price) : null,
    currency: p.currency || null
  };
}

function create(env = process.env, fetchImpl = globalThis.fetch) {
  const base = env.AUTOPAY_API_BASE;
  const key = env.AUTOPAY_API_KEY;
  if (!base || !key) throw new HttpError(503, "provider_not_configured");

  async function call(method, path, body, extraHeaders) {
    let res;
    try {
      res = await fetchImpl(base.replace(/\/$/, "") + path, {
        method,
        headers: Object.assign({
          // ASSUMPTION: autentificare Bearer
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        }, extraHeaders || {}),
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000)
      });
    } catch (e) {
      throw new HttpError(502, "provider_unreachable");
    }
    if (res.status === 404) return null;
    if (res.status === 422 || res.status === 400) throw new HttpError(422, "provider_rejected");
    if (!res.ok) throw new HttpError(502, "provider_error", { providerStatus: res.status });
    return res.json();
  }

  return {
    name: "live",

    async quote(order) {
      const r = await call("POST", PATHS.quote(), toProviderOrder(order));
      return r ? { available: true, price: r.price != null ? Number(r.price) : null, currency: r.currency || null } : { available: false };
    },

    async createOrder(order, ctx) {
      const r = await call("POST", PATHS.createOrder(), toProviderOrder(order),
        ctx && ctx.idempotencyKey ? { "Idempotency-Key": ctx.idempotencyKey } : undefined);
      return fromProviderOrder(r);
    },

    async getOrder(id) {
      const r = await call("GET", PATHS.getOrder(id));
      return r ? fromProviderOrder(r) : null;
    },

    // ASSUMPTION: corpul webhook-ului conține id-ul comenzii și statusul
    parseWebhook(rawBody) {
      const d = JSON.parse(rawBody.toString("utf8"));
      return { orderId: String(d.order_id || d.id || ""), status: normalizeStatus(d.status) };
    }
  };
}

module.exports = { create, normalizeStatus, toProviderOrder, fromProviderOrder };
