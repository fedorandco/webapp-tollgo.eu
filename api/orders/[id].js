"use strict";
const { send, guard, handleError, HttpError } = require("../_lib/http");
const { getProvider } = require("../_lib/provider");
const token = require("../_lib/token");

// GET /api/orders/:id?token=...  -> { id, status }
module.exports = async function handler(req, res) {
  if (!guard(req, res, ["GET"])) return;
  try {
    const url = new URL(req.url, "http://localhost");
    const id = (req.query && req.query.id) || decodeURIComponent(url.pathname.split("/").pop() || "");
    const given = (req.query && req.query.token) || url.searchParams.get("token");

    if (!id || !token.verify(id, given)) throw new HttpError(404, "not_found");

    const order = await getProvider().getOrder(id);
    if (!order) throw new HttpError(404, "not_found");

    send(res, 200, { id: order.id, status: order.status });
  } catch (err) {
    handleError(res, err);
  }
};
