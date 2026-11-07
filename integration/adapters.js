// Adaptoare client pentru integrarea cu Autopay: redirect (afiliere), API, iFrame, white-label.
// Index.html apelează doar TollgoIntegration.render(...); restul rămâne în acest fișier.
(function (root) {
  "use strict";

  const MODES = ["redirect", "api", "iframe", "whitelabel"];
  const ATTR_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "click_id", "ref"];
  const TERMINAL = ["issued", "failed", "cancelled"];

  function getConfig() { return root.TOLLGO_CONFIG || {}; }

  // Modul activ. În sandbox se poate forța cu ?mode=iframe etc. (doar pentru încercări).
  function currentMode(cfg, search) {
    cfg = cfg || {};
    if (cfg.sandbox && search) {
      const m = new URLSearchParams(search).get("mode");
      if (MODES.includes(m)) return m;
    }
    return MODES.includes(cfg.mode) ? cfg.mode : "redirect";
  }

  // ---------- Atribuire (UTM, click-id-uri) ----------
  function captureAttribution(search) {
    try {
      const p = new URLSearchParams(search !== undefined ? search : root.location.search);
      const found = {};
      ATTR_KEYS.forEach(k => { const v = p.get(k); if (v) found[k] = v.slice(0, 200); });
      if (Object.keys(found).length) root.sessionStorage.setItem("tollgo_attr", JSON.stringify(found));
    } catch (e) { /* storage indisponibil */ }
  }
  function getAttribution() {
    try { return JSON.parse(root.sessionStorage.getItem("tollgo_attr") || "{}"); }
    catch (e) { return {}; }
  }

  // ---------- URL-uri ----------
  // Construiește linkul către Autopay. Implicit adaugă doar parametrii de tracking;
  // datele personale se pun în URL doar dacă sunt listate explicit în prefillParams.
  function buildRedirectUrl(base, order, rcfg, attribution) {
    if (!base) return null;
    let u;
    try { u = new URL(base); } catch (e) { return null; }
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const rename = (rcfg && rcfg.params) || {};
    Object.keys(attribution || {}).forEach(k => u.searchParams.set(rename[k] || k, attribution[k]));
    const pre = (rcfg && rcfg.prefillParams) || {};
    Object.keys(pre).forEach(field => {
      if (order && order[field] != null && order[field] !== "") u.searchParams.set(pre[field], String(order[field]));
    });
    return u.toString();
  }

  // Acceptă doar https (și, opțional, doar gazde din listă) pentru linkuri primite de la server.
  function safeUrl(url, allowedHosts) {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:") return null;
      if (allowedHosts && allowedHosts.length && !allowedHosts.includes(u.host)) return null;
      return u.toString();
    } catch (e) { return null; }
  }

  // ---------- Helperi DOM / rețea ----------
  function el(tag, cls, text) {
    const e = root.document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function uuid() {
    if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
    return "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }

  async function apiFetch(url, opts) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    let res;
    try {
      res = await fetch(url, Object.assign({}, opts, {
        signal: ctrl.signal,
        headers: Object.assign({ Accept: "application/json" }, opts && opts.headers)
      }));
    } catch (e) {
      throw Object.assign(new Error("network"), { code: "network" });
    } finally {
      clearTimeout(timer);
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* fără corp JSON */ }
    if (!res.ok) throw Object.assign(new Error("http"), { code: (data && data.error) || "http", status: res.status, fields: data && data.fields });
    return data;
  }

  function payload(order) {
    return {
      country: order.country, period: order.period, startDate: order.startDate,
      regCountry: order.regCountry, plate: order.plate, vehicleCategory: order.vehicleCategory,
      emissionClass: order.emissionClass, email: order.email, lang: order.lang,
      attribution: getAttribution(), consent: { terms: true }
    };
  }

  function apiBase(cfg) { return ((cfg.api && cfg.api.base) || "/api").replace(/\/$/, ""); }

  // Cotație (preț) de la server; null dacă nu e disponibilă. Nu blochează fluxul.
  async function quote(order) {
    const cfg = getConfig();
    const mode = currentMode(cfg, root.location && root.location.search);
    if (mode !== "api" && mode !== "whitelabel") return null;
    try {
      const r = await apiFetch(apiBase(cfg) + "/quote", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(order))
      });
      return r && r.available ? r : null;
    } catch (e) { return null; }
  }

  // ---------- Urmărirea comenzii ----------
  function track(box, h, ref, cfg) {
    const wrap = el("div", "order-status");
    wrap.appendChild(el("strong", null, h.t("orderStatusTitle")));
    wrap.appendChild(el("p", null, h.t("orderIdLabel") + " " + ref.id));
    const line = el("p", "order-status-line");
    wrap.appendChild(line);
    wrap.appendChild(el("p", "test-note", h.t("supportNote")));
    box.appendChild(wrap);

    const every = (cfg.poll && cfg.poll.everyMs) || 3000;
    const max = (cfg.poll && cfg.poll.maxMs) || 120000;
    const started = Date.now();
    let timer = null;
    let stopped = false;

    function show(status) {
      line.dataset.status = status;
      line.textContent = h.t("status_" + status);
    }
    async function tick() {
      if (stopped) return;
      try {
        const r = await apiFetch(apiBase(cfg) + "/orders/" + encodeURIComponent(ref.id) + "?token=" + encodeURIComponent(ref.accessToken));
        if (stopped) return;
        show(r.status);
        if (TERMINAL.includes(r.status)) return;
      } catch (e) { /* încercăm din nou */ }
      if (Date.now() - started > max) { line.textContent = h.t("orderTimeout"); return; }
      timer = setTimeout(tick, every);
    }
    show(ref.status || "processing");
    timer = setTimeout(tick, every);
    return function dispose() { stopped = true; clearTimeout(timer); };
  }

  // ---------- Modul REDIRECT (afiliere) ----------
  function renderRedirect(order, box, h, cfg) {
    const r = cfg.redirect || {};
    const base = (r.perCountry && r.perCountry[order.country]) || r.baseUrl || h.fallbackUrl || "";
    const url = buildRedirectUrl(base, order, r, getAttribution());
    if (!url) { box.textContent = h.t("noLink", { c: h.countryName }); return { dispose() {} }; }
    const a = el("a", "btn", h.t("continueProvider"));
    a.href = url; a.target = "_blank"; a.rel = "noopener sponsored";
    box.appendChild(a);
    return { dispose() {} };
  }

  // ---------- Modurile API și WHITE-LABEL ----------
  // API: după creare, clientul merge la plată (paymentUrl) sau vede statusul.
  // White-label: rămâne mereu pe site; plata se montează prin cfg.whitelabel.mountPayment.
  function renderOrderFlow(order, box, h, cfg, whiteLabel) {
    const key = uuid(); // aceeași cheie la reîncercări => fără comenzi duplicate
    const cleanups = [];
    let busy = false;

    const btn = el("button", "btn", h.t("btnConfirm"));
    btn.type = "button";
    const msg = el("p", "form-error");
    msg.hidden = true;
    box.appendChild(btn);
    box.appendChild(msg);

    btn.addEventListener("click", async () => {
      if (busy) return;
      busy = true; btn.disabled = true; btn.textContent = h.t("orderCreating"); msg.hidden = true;
      try {
        const ref = await apiFetch(apiBase(cfg) + "/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": key },
          body: JSON.stringify(payload(order))
        });
        btn.remove(); msg.remove();
        const payUrl = ref.paymentUrl && safeUrl(ref.paymentUrl, cfg.api && cfg.api.paymentHosts);
        const mount = whiteLabel && cfg.whitelabel && cfg.whitelabel.mountPayment;
        if (mount) {
          const slot = el("div", "pay-slot");
          box.appendChild(slot);
          const c = mount(slot, ref);
          if (typeof c === "function") cleanups.push(c);
        } else if (payUrl) {
          const a = el("a", "btn", h.t("btnContinuePay"));
          a.href = payUrl; a.rel = "noopener";
          box.appendChild(a);
        }
        cleanups.push(track(box, h, ref, cfg));
      } catch (e) {
        busy = false; btn.disabled = false; btn.textContent = h.t("btnConfirm");
        msg.textContent = e.code === "network" ? h.t("errNetwork") : h.t("errServer");
        msg.hidden = false;
      }
    });
    return { dispose() { cleanups.forEach(fn => { try { fn(); } catch (e) { /* ignor */ } }); } };
  }

  // ---------- Modul IFRAME ----------
  function renderIframe(order, box, h, cfg) {
    const c = cfg.iframe || {};
    let origin = "";
    try { origin = new URL(c.allowedOrigin).origin; } catch (e) { /* neconfigurat */ }
    const src = buildRedirectUrl(c.src, order, { params: c.params, prefillParams: c.prefillParams }, getAttribution());
    if (!src || !origin || new URL(src).origin !== origin) {
      box.textContent = h.t("noLink", { c: h.countryName });
      return { dispose() {} };
    }

    const frame = el("iframe");
    frame.title = h.t("iframeTitle");
    frame.src = src;
    frame.loading = "lazy";
    frame.setAttribute("allow", "payment");
    frame.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation");
    frame.style.cssText = "width:100%;border:0;border-radius:8px;height:" + (c.height || 640) + "px";
    box.appendChild(frame);
    const info = el("p", "test-note", h.t("supportNote"));
    box.appendChild(info);

    const M = c.messages || {};
    function onMessage(ev) {
      if (ev.origin !== origin || ev.source !== frame.contentWindow) return;
      const d = ev.data;
      if (!d || typeof d !== "object") return;
      if (d.type === M.resize && Number.isFinite(d.height)) {
        frame.style.height = Math.min(Math.max(d.height, 300), 2000) + "px";
      } else if (d.type === M.completed) {
        info.textContent = h.t("status_processing") + (typeof d.orderId === "string" ? " (" + d.orderId.slice(0, 40) + ")" : "");
      }
    }
    root.addEventListener("message", onMessage);
    return { dispose() { root.removeEventListener("message", onMessage); } };
  }

  // ---------- Punct de intrare ----------
  // h: { t, countryName, fallbackUrl }
  function render(order, box, h) {
    const cfg = getConfig();
    const mode = currentMode(cfg, root.location && root.location.search);
    box.innerHTML = "";
    if (mode === "api") return renderOrderFlow(order, box, h, cfg, false);
    if (mode === "whitelabel") return renderOrderFlow(order, box, h, cfg, true);
    if (mode === "iframe") return renderIframe(order, box, h, cfg);
    return renderRedirect(order, box, h, cfg);
  }

  const api = {
    render, quote, captureAttribution, getAttribution,
    isSandbox() { return !!getConfig().sandbox; },
    mode() { return currentMode(getConfig(), root.location && root.location.search); },
    _test: { buildRedirectUrl, currentMode, safeUrl }
  };
  root.TollgoIntegration = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
