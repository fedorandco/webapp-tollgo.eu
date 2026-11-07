"use strict";
const { send, guard, readJson, handleError, HttpError } = require("./_lib/http");
const { getProvider } = require("./_lib/provider");
const { validateOrder, maskPlate, maskEmail } = require("./_lib/validate");
const token = require("./_lib/token");

// POST /api/orders  (antet obligatoriu: Idempotency-Key)
// -> 201 { id, status, paymentUrl, price, currency, accessToken }
module.exports = async function handler(req, res) {
  if (!guard(req, res, ["POST"])) return;
  try {
    const key = String((req.headers && req.headers["idempotency-key"]) || "");
    if (key.length < 8 || key.length > 80) throw new HttpError(400, "idempotency_key_required");

    const v = validateOrder(await readJson(req));
    if (!v.ok) throw new HttpError(422, "validation", { fields: v.errors });

    const order = await getProvider().createOrder(v.value, { idempotencyKey: key });

    console.log(JSON.stringify({
      evt: "order_created", id: order.id, status: order.status, country: v.value.country,
      period: v.value.period, plate: maskPlate(v.value.plate), email: maskEmail(v.value.email)
    }));

    send(res, 201, {
      id: order.id,
      status: order.status,
      paymentUrl: order.paymentUrl || null,
      price: order.price == null ? null : order.price,
      currency: order.currency || null,
      accessToken: token.sign(order.id)
    });
  } catch (err) {
    handleError(res, err);
  }
};
