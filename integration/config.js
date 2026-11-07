// Configurația integrării cu Autopay (partea de browser). Nu pune aici chei secrete:
// cheile API stau doar în variabilele de mediu de pe Vercel (vezi docs/INTEGRARE-AUTOPAY.md).
//
// mode:
//   "redirect"   – afiliere: trimitem clientul la Autopay cu linkul de afiliat
//   "api"        – tollgo creează comanda prin /api/orders; plata la Autopay (paymentUrl) sau status pe site
//   "iframe"     – checkout-ul Autopay încorporat în pagină
//   "whitelabel" – tot fluxul pe tollgo.eu (comandă + status), furnizorul rămâne în spate
window.TOLLGO_CONFIG = {
  mode: "redirect",

  // true = afișează „Versiune de test” și permite ?mode=... în URL pentru încercări.
  // Pune false înainte de producție.
  sandbox: true,

  redirect: {
    // TODO(Autopay): linkul de afiliat primit după aprobare. Gol = se folosește data-url de pe carduri.
    baseUrl: "",
    // Linkuri diferite per țară (opțional), ex: { AUT: "https://..." }
    perCountry: {},
    // TODO(Autopay): numele parametrilor de tracking acceptați (nume client -> nume la Autopay).
    // Implicit transmitem UTM-urile și click-id-urile cu același nume.
    params: {},
    // Completarea datelor în URL (conține date personale!). Implicit oprită.
    // Format: { plate: "numele_parametrului", country: "..." }
    prefillParams: {}
  },

  api: { base: "/api" },

  iframe: {
    // TODO(Autopay): URL-ul checkout-ului încorporabil și originea lui (ex. "https://checkout.exemplu.eu")
    src: "",
    allowedOrigin: "",
    height: 640,
    // TODO(Autopay): formatul mesajelor postMessage (ASSUMPTION)
    messages: { resize: "resize", completed: "order_completed", error: "error" }
  },

  whitelabel: {
    // Plata: după ce Autopay confirmă cum se face plata în white-label (câmpuri găzduite, SDK,
    // pagină externă), se montează aici. Primește (element, comandă) și întoarce o funcție de curățare.
    mountPayment: null
  },

  poll: { everyMs: 3000, maxMs: 120000 }
};
