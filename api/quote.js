"use strict";
const { send, guard, readJson, handleError, HttpError } = require("./_lib/http");
const { getProvider } = require("./_lib/provider");
const { validateOrder } = require("./_lib/validate");

// POST /api/quote  -> { available, price, currency }
// Prețul vine întotdeauna de la furnizor, nu este scris în cod.
module.exports = async function handler(req, res) {
  if (!guard(req, res, ["POST"])) return;
  try {
    const v = validateOrder(Object.assign({}, await readJson(req), { consent: { terms: true } }));
    if (!v.ok) throw new HttpError(422, "validation", { fields: v.errors });
    const q = await getProvider().quote(v.value);
    send(res, 200, { available: !!q.available, price: q.price == null ? null : q.price, currency: q.currency || null });
  } catch (err) {
    handleError(res, err);
  }
};
