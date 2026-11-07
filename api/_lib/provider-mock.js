"use strict";
const crypto = require("crypto");

// Provider simulat pentru dezvoltare și preview. NU conține prețuri inventate și nu
// contactează nicio altă parte. Este fără stare (stateless): statusul se deduce din
// momentul creării, codificat în id.
//   - prima perioadă (PROCESSING_MS): "processing"; apoi "issued"
//   - un număr de înmatriculare care începe cu "FAIL" produce "failed" (test pentru UI)

const PROCESSING_MS = 4000;

function createdAtOf(id) {
  const m = /^mock(fail)?_([0-9a-z]+)_/.exec(String(id));
  return m ? parseInt(m[2], 36) : null;
}

module.exports = {
  name: "mock",

  async quote(order) {
    return { available: true, price: null, currency: null, mock: true, country: order.country, period: order.period };
  },

  async createOrder(order) {
    const fail = order.plate.startsWith("FAIL");
    const id = `mock${fail ? "fail" : ""}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    return { id, status: "processing", paymentUrl: null, price: null, currency: null, mock: true };
  },

  async getOrder(id, now = Date.now()) {
    const created = createdAtOf(id);
    if (created === null) return null;
    if (String(id).startsWith("mockfail_")) return { id, status: "failed", reason: "mock_failure" };
    return { id, status: now - created < PROCESSING_MS ? "processing" : "issued", mock: true };
  },

  // Webhook de test: corp JSON {orderId, status}.
  parseWebhook(rawBody) {
    const data = JSON.parse(rawBody.toString("utf8"));
    return { orderId: String(data.orderId || ""), status: String(data.status || "") };
  }
};
