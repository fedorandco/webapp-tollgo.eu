# Integrare Autopay – ghid de lucru

Stare: **pregătit, neconectat la Autopay.** Toate cele 4 moduri funcționează cu un furnizor simulat (mock).
Tot ce depinde de documentația Autopay este marcat `ASSUMPTION` / `TODO(Autopay)` în cod.

## Modelul

Autopay emite și validează vigneta și oferă suportul. tollgo.eu este doar interfața.
Fluxul din browser trece mereu prin același formular; ce se întâmplă după „Continuă” depinde de `mode`.

| `mode` | Ce face | Are nevoie de la Autopay |
|---|---|---|
| `redirect` | Trimite clientul la Autopay cu linkul de afiliat + UTM | Link afiliat, nume parametri tracking |
| `api` | `POST /api/orders` creează comanda; plată la Autopay (`paymentUrl`) sau status pe site | Documentație API, chei, mediu de test, webhook-uri |
| `iframe` | Checkout-ul Autopay încorporat în pagină | URL checkout, origine, format `postMessage`, permisiune de embed |
| `whitelabel` | Tot fluxul rămâne pe tollgo.eu (comandă + status); plata se montează prin `mountPayment` | Ca la API + modul de plată (câmpuri găzduite / SDK / pagină externă) |

Modul se alege în `integration/config.js` (`mode`). Cât timp `sandbox: true`, se poate încerca și cu `?mode=iframe` în URL.
**Înainte de producție: `sandbox: false`.**

## Structură

```
integration/config.js        configurația browserului (mod, link afiliat, iframe, polling)
integration/adapters.js      cele 4 adaptoare + tracking UTM + urmărirea statusului
integration/i18n-extra.js    texte noi (ro, en, de; restul limbilor cad pe engleză)
api/quote.js                 POST  /api/quote            preț de la furnizor
api/orders.js                POST  /api/orders           creează comanda (Idempotency-Key obligatoriu)
api/orders/[id].js           GET   /api/orders/:id?token status (cu token HMAC)
api/webhook.js               POST  /api/webhook          notificări Autopay (semnătură HMAC)
api/_lib/provider-mock.js    furnizor simulat (fără prețuri inventate)
api/_lib/provider-live.js    adaptor Autopay real – de completat după documentație
api/_lib/validate.js         validare server (nu ne bazăm pe browser)
api/_lib/catalog.js          țări / perioade / reguli (testat să fie identic cu index.html)
```

## Variabile de mediu (Vercel)

| Variabilă | Rol |
|---|---|
| `AUTOPAY_MODE` | `mock` sau `live`. Implicit: `live` în producție, `mock` în rest |
| `AUTOPAY_API_BASE`, `AUTOPAY_API_KEY` | Acces API (doar `live`) |
| `AUTOPAY_WEBHOOK_SECRET` | Cheia pentru semnătura webhook-urilor |
| `AUTOPAY_SIGNATURE_HEADER` | Numele antetului cu semnătura (implicit `x-signature`) |
| `ORDER_TOKEN_SECRET` | Obligatoriu în producție; protejează citirea statusului |
| `ALLOWED_ORIGINS` | Origini suplimentare permise pentru `/api` (opțional) |

Producția nu poate cădea pe mock: fără configurare, API-ul răspunde `503`.

## Rulare locală

```
npm run dev     # http://localhost:3000, provider mock
npm test        # teste unitare (20)
```

Mock: comanda trece din „se procesează” în „emisă” după ~4 secunde. Un număr care începe cu `FAIL` produce status `failed`.

## Ce trebuie confirmat cu Autopay (și unde se schimbă)

1. **Variantele disponibile** (API / iFrame / white-label) și condițiile (volum minim, contract).
2. **Cine este vânzătorul legal și cine facturează**, cine încasează plata → texte legale, TVA.
3. **Autorizarea pentru vigneta austriacă (ASFINAG)** pentru utilizarea tollgo ca interfață.
4. **API:** URL de bază, autentificare, căi, structura cererii/răspunsului, statusuri, erori, limite, mediu de test → `api/_lib/provider-live.js` (`PATHS`, `STATUS_MAP`, `toProviderOrder`, `fromProviderOrder`).
5. **Webhook:** schema semnăturii, antet, structura corpului, IP-uri sursă → `api/_lib/signature.js`, `provider-live.js#parseWebhook`.
6. **Categorii de vehicul** și coduri → `catalog.js` (`VEHICLE_CATEGORIES`), `index.html` (`CATEGORIES`).
7. **Normă de emisii pentru România** (din 1 oct. 2026 prețul depinde de ea): clasele exacte → `catalog.js` (`EMISSION_CLASSES`), `index.html` (`EMISSIONS`).
8. **Afiliere:** linkul, numele parametrilor de tracking (`redirect.params`), regulile de promovare.
9. **iFrame:** URL, origine, format mesaje (`iframe.messages`), `frame-ancestors` permis pentru tollgo.eu, `Permissions-Policy` pentru plăți.
10. **White-label:** cum se face plata → `whitelabel.mountPayment`.
11. **Folosirea mărcii Autopay / ASFINAG** (logo, „partener autorizat”).
12. **Date personale (GDPR):** operator asociat sau împuternicit; ce stocăm la noi (acum nimic).

## Securitate și confidențialitate (deja în cod)

- Validare completă pe server; câmpuri necunoscute ignorate.
- `Idempotency-Key` obligatoriu la creare comandă; aceeași cheie la reîncercare.
- Status comandă doar cu token HMAC; răspunsul nu conține date personale.
- Webhook: semnătură HMAC pe corpul brut, comparație în timp constant.
- Cheile rămân doar în variabile de mediu, niciodată în browser.
- Loguri cu număr de înmatriculare și e-mail mascate.
- URL-ul de redirect conține doar tracking; datele personale doar dacă sunt listate explicit în `prefillParams`.
- `paymentUrl` primit de la server: doar `https`, opțional doar gazde din `api.paymentHosts`.
- iFrame: `sandbox`, `allow="payment"`, mesaje acceptate doar de la originea configurată și de la acel iframe.
- `vercel.json`: antete de securitate și CSP în mod **report-only** (de trecut pe enforce după ce se cunosc domeniile Autopay).

## Ce NU este făcut (intenționat)

- Nicio conexiune reală la Autopay și niciun preț (prețurile vin doar din `/api/quote`).
- Textele legale (termeni, retragere, confidențialitate, date firmă) și contactul `[de completat]`; trebuie completate și verificate de un jurist.
- Persistență (bază de date), e-mailuri tranzacționale, panou „Comanda mea” cu căutare după e-mail. Se adaugă după ce stabilim cu Autopay ce date rămân la noi.
- Rate limiting (recomandat prin Vercel WAF / Firewall înainte de lansare).
- Traduceri pentru cs, sk, hu, sl, bg ale textelor noi (momentan engleză).
- Textul „Plătești cu cardul, Apple Pay sau Google Pay” (pasul 3) trebuie aliniat cu metodele reale de plată Autopay.

## Listă înainte de producție

- [ ] Răspuns scris Autopay (variante, contract, ASFINAG, vânzător legal)
- [ ] `provider-live.js` completat și testat în mediul de test Autopay
- [ ] Variabilele de mediu setate în Vercel (inclusiv `ORDER_TOKEN_SECRET`)
- [ ] `sandbox: false`, `mode` ales
- [ ] Texte legale și contact completate
- [ ] CSP trecut din report-only în enforce
- [ ] Rate limiting activ
- [ ] Test cap-coadă cu o comandă reală de valoare mică
