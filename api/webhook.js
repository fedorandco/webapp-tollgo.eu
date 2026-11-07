"use strict";
const { send, guard, readRaw, handleError, HttpError } = require("./_lib/http");
const { getProvider } = require("./_lib/provider");
const { verifySignature } = require("./_lib/signature");
const { ORDER_STATUSES } = require("./_lib/catalog");

// POST /api/webhook  — notificări de status de la Autopay.
// Antetul cu semnătura este configurabil (AUTOPAY_SIGNATURE_HEADER, implicit x-signature).
// NOTĂ: fără bază de date, webhook-ul doar validează și loghează. Persistarea și e-mailurile
// (dacă sunt necesare) se adaugă după ce stabilim cu Autopay ce date rămân la noi.
module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" }, { Allow: "POST" });
  try {
    const env = process.env;
    const raw = await readRaw(req);
    const header = req.headers[String(env.AUTOPAY_SIGNATURE_HEADER || "x-signature").toLowerCase()];

    if (!verifySignature(raw, header, env.AUTOPAY_WEBHOOK_SECRET)) throw new HttpError(401, "invalid_signature");

    let event;
    try { event = getProvider().parseWebhook(raw); }
    catch (e) { throw new HttpError(400, "invalid_payload"); }
    if (!event.orderId) throw new HttpError(400, "invalid_payload");

    console.log(JSON.stringify({
      evt: "webhook_received", orderId: event.orderId,
      status: ORDER_STATUSES.includes(event.status) ? event.status : "unknown"
    }));
    send(res, 200, { ok: true });
  } catch (err) {
    handleError(res, err);
  }
};

// Vercel nu trebuie să parseze corpul: semnătura se calculează peste octeții bruți.
module.exports.config = { api: { bodyParser: false } };
