// Texte juridice minime pentru tollgo.eu (română și engleză). SCHELET: trebuie verificat de un
// jurist înainte de lansare. Locurile marcate „[de confirmat …]” depind de contractul cu Autopay.
//
// Marcaje {{câmp}} se umplu din legal/company.js. Câmpurile goale apar ca „[de completat: câmp]”.
(function (root) {
  "use strict";

  const FIELDS = ["name", "cui", "regCom", "vatId", "address", "email", "phone"];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Înlocuiește {{câmp}} cu valoarea din date, sau cu un marcaj vizibil dacă lipsește.
  function fill(html, company, lang) {
    const todo = lang === "ro" ? "de completat" : "to be filled in";
    return html.replace(/\{\{(\w+)\}\}/g, (m, key) => {
      const v = company && company[key];
      return v ? esc(v) : '<mark class="todo">[' + todo + ": " + esc(key) + "]</mark>";
    });
  }

  const LEGAL = {
    ro: {
      pageTitle: "Informații juridice – tollgo.eu",
      back: "← Înapoi la site",
      draftBanner: "Document în curs de revizuire. Conținutul poate fi modificat și nu este încă o versiune finală.",
      langNote: "Textele juridice sunt disponibile în română și engleză.",
      sections: [
        {
          id: "date-identificare",
          title: "Date de identificare ale firmei",
          html: `
<p>Site-ul tollgo.eu este operat de <strong>{{name}}</strong>, CUI {{cui}}, înregistrată la Registrul Comerțului cu nr. {{regCom}}, cu sediul în {{address}}. Cod de TVA: {{vatId}}.</p>
<p>Contact: e-mail <strong>{{email}}</strong>, telefon {{phone}}.</p>`
        },
        {
          id: "termeni",
          title: "Termeni și condiții generale",
          html: `
<ol>
<li><strong>Ce este tollgo.eu.</strong> tollgo.eu este un serviciu independent de intermediere: te ajută să alegi țara și perioada de valabilitate și să ajungi la furnizorul care emite vigneta electronică. Nu suntem o autoritate rutieră și nu operăm sistemele de taxare ale statelor.</li>
<li><strong>Cine emite vigneta.</strong> Vigneta este emisă și validată de Autopay Mobility Sp. z o.o. (Sopot, Polonia), vânzător autorizat de viniete. Suportul pentru comenzi și validarea vignetei sunt asigurate de Autopay. <mark class="todo">[de confirmat cu Autopay: cine este vânzătorul în fața clientului, cine încasează plata și cine emite factura]</mark></li>
<li><strong>Datele introduse.</strong> Ești responsabil pentru corectitudinea țării și a numărului de înmatriculare, a categoriei vehiculului, a normei de emisii (unde se cere) și a datei de început. O vignetă emisă pe date greșite poate fi invalidă. Posibilitatea de corectare depinde de condițiile furnizorului.</li>
<li><strong>Prețuri.</strong> Prețurile sunt stabilite de furnizor și pot fi modificate de acesta. Prețul final îl vezi înainte de plată; prețurile afișate în listă sunt orientative.</li>
<li><strong>Plata.</strong> Plata se efectuează în fluxul de comandă, conform metodelor oferite de furnizor. <mark class="todo">[de confirmat cu Autopay]</mark></li>
<li><strong>Răspundere.</strong> În limitele permise de lege, nu răspundem pentru erori ale sistemelor furnizorului sau ale operatorilor de drumuri. Nu sunt afectate drepturile pe care legea ți le recunoaște ca consumator.</li>
<li><strong>Legea aplicabilă.</strong> Legea română, fără a afecta drepturile imperative ale consumatorului conform legii țării sale de reședință.</li>
<li><strong>Modificări.</strong> Putem actualiza acești termeni; versiunea aplicabilă este cea afișată la momentul comenzii.</li>
</ol>`
        },
        {
          id: "revocare",
          title: "Revocare și drept de retragere",
          html: `
<p>În contractele la distanță, consumatorul are, în general, dreptul de a se retrage în 14 zile fără a indica motivul, conform OUG nr. 34/2014 privind drepturile consumatorilor în cadrul contractelor încheiate cu profesioniștii. Legea prevede și excepții.</p>
<p>Vigneta electronică este un serviciu cu o dată sau o perioadă de valabilitate stabilită și cu executare imediată; de aceea dreptul de retragere poate fi limitat sau exclus, iar condițiile concrete de modificare, anulare sau rambursare sunt cele ale furnizorului. <mark class="todo">[de verificat de un jurist și de confirmat cu Autopay]</mark></p>
<p>Pentru solicitări de modificare sau anulare scrie-ne la <strong>{{email}}</strong> și/sau furnizorului vignetei, Autopay, folosind datele din confirmarea comenzii.</p>`
        },
        {
          id: "informatii-consumatori",
          title: "Informații pentru consumatori",
          html: `
<ul>
<li><strong>Caracteristicile serviciului:</strong> vignetă rutieră electronică pentru țara, perioada și vehiculul alese în fluxul de comandă.</li>
<li><strong>Preț și plată:</strong> prețul total este afișat înainte de confirmarea comenzii; vezi și „Termeni și condiții”.</li>
<li><strong>Dreptul de retragere:</strong> vezi „Revocare și drept de retragere”.</li>
<li><strong>Reclamații:</strong> scrie-ne la <strong>{{email}}</strong>. Vom răspunde în cel mai scurt timp posibil.</li>
<li><strong>Autoritatea pentru protecția consumatorilor:</strong> <a href="https://www.anpc.ro/" target="_blank" rel="noopener">ANPC</a>.</li>
<li><strong>Soluționarea alternativă a litigiilor (SAL):</strong> poți depune o cerere la Direcția SAL din cadrul ANPC: <a href="https://reclamatiisal.anpc.ro/" target="_blank" rel="noopener">reclamatiisal.anpc.ro</a>.</li>
</ul>`
        },
        {
          id: "protectia-datelor",
          title: "Protecția datelor (GDPR)",
          html: `
<p><strong>Operator:</strong> {{name}}, contact {{email}}.</p>
<p><strong>Ce date prelucrăm.</strong></p>
<ul>
<li>Preferința de limbă, păstrată în browserul tău (stocare locală).</li>
<li>Parametri de campanie (UTM, identificatori de click) din linkul prin care ai ajuns pe site, păstrați doar pe durata sesiunii, ca să știm de unde provin comenzile.</li>
<li>Când comanzi prin tollgo.eu: țara și numărul de înmatriculare, categoria vehiculului, perioada, data de început, e-mailul și limba.</li>
<li>Date tehnice de conectare (adresa IP, jurnale) la furnizorul de găzduire, Vercel Inc.</li>
<li>Harta încarcă resurse de la unpkg.com și cdn.jsdelivr.net; aceste servicii pot primi adresa ta IP.</li>
</ul>
<p><strong>Scopuri și temeiuri (art. 6 RGPD).</strong> Executarea comenzii și pașii premergători ei (art. 6 alin. 1 lit. b); obligații legale, de exemplu de facturare (lit. c); securitate și prevenirea abuzurilor (lit. f). <mark class="todo">[de verificat: măsurarea provenienței comenzilor și eventual consimțământul]</mark></p>
<p><strong>Destinatari.</strong> Autopay Mobility Sp. z o.o., pentru emiterea vignetei <mark class="todo">[de confirmat: operator sau persoană împuternicită]</mark>; Vercel Inc. pentru găzduire. <mark class="todo">[de confirmat: transferuri în afara SEE și garanțiile aplicabile]</mark></p>
<p><strong>Cookie-uri.</strong> Nu folosim cookie-uri proprii de marketing. Folosim stocare locală și de sesiune, descrise mai sus.</p>
<p><strong>Durata păstrării.</strong> <mark class="todo">[de completat: perioada de păstrare a datelor comenzilor și a documentelor contabile]</mark></p>
<p><strong>Drepturile tale.</strong> Acces, rectificare, ștergere, restricționare, portabilitate și opoziție, precum și dreptul de a depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP): <a href="https://www.dataprotection.ro/" target="_blank" rel="noopener">dataprotection.ro</a>, anspdcp@dataprotection.ro. Pentru a-ți exercita drepturile, scrie-ne la {{email}}.</p>`
        }
      ]
    },

    en: {
      pageTitle: "Legal information – tollgo.eu",
      back: "← Back to the site",
      draftBanner: "This document is under review. The content may change and is not yet a final version.",
      langNote: "Legal texts are available in Romanian and English.",
      sections: [
        {
          id: "date-identificare",
          title: "Company identification",
          html: `
<p>The tollgo.eu website is operated by <strong>{{name}}</strong>, tax ID (CUI) {{cui}}, registered with the Romanian Trade Register under no. {{regCom}}, with its registered office at {{address}}. VAT ID: {{vatId}}.</p>
<p>Contact: email <strong>{{email}}</strong>, phone {{phone}}.</p>`
        },
        {
          id: "termeni",
          title: "General terms and conditions",
          html: `
<ol>
<li><strong>What tollgo.eu is.</strong> tollgo.eu is an independent intermediary service: it helps you choose the country and validity period and reach the provider that issues the electronic vignette. We are not a road authority and we do not operate any state's toll system.</li>
<li><strong>Who issues the vignette.</strong> The vignette is issued and validated by Autopay Mobility Sp. z o.o. (Sopot, Poland), an authorised vignette seller. Order support and validation of the vignette are provided by Autopay. <mark class="todo">[to be confirmed with Autopay: who is the seller towards the customer, who collects the payment and who issues the invoice]</mark></li>
<li><strong>Data you enter.</strong> You are responsible for the correctness of the country and registration number, the vehicle category, the emission standard (where requested) and the start date. A vignette issued on wrong data may be invalid. Whether it can be corrected depends on the provider's conditions.</li>
<li><strong>Prices.</strong> Prices are set by the provider and may be changed by it. You see the final price before paying; prices shown in the list are indicative.</li>
<li><strong>Payment.</strong> Payment is made in the order flow using the methods offered by the provider. <mark class="todo">[to be confirmed with Autopay]</mark></li>
<li><strong>Liability.</strong> To the extent permitted by law, we are not liable for errors in the provider's systems or in those of road operators. Your statutory rights as a consumer are not affected.</li>
<li><strong>Governing law.</strong> Romanian law, without affecting the mandatory consumer rights under the law of your country of residence.</li>
<li><strong>Changes.</strong> We may update these terms; the version displayed at the time of your order applies.</li>
</ol>`
        },
        {
          id: "revocare",
          title: "Withdrawal and right of withdrawal",
          html: `
<p>For distance contracts, consumers generally have the right to withdraw within 14 days without giving a reason, under Romanian Emergency Ordinance no. 34/2014 on consumer rights in contracts concluded with traders. The law also provides for exceptions.</p>
<p>An electronic vignette is a service with a fixed date or validity period and immediate performance; the right of withdrawal may therefore be limited or excluded, and the specific conditions for changes, cancellation or refund are those of the provider. <mark class="todo">[to be checked by a lawyer and confirmed with Autopay]</mark></p>
<p>For change or cancellation requests, write to us at <strong>{{email}}</strong> and/or to the vignette provider, Autopay, using the details in your order confirmation.</p>`
        },
        {
          id: "informatii-consumatori",
          title: "Consumer information",
          html: `
<ul>
<li><strong>Main characteristics of the service:</strong> an electronic road vignette for the country, period and vehicle chosen in the order flow.</li>
<li><strong>Price and payment:</strong> the total price is shown before you confirm the order; see also "General terms and conditions".</li>
<li><strong>Right of withdrawal:</strong> see "Withdrawal and right of withdrawal".</li>
<li><strong>Complaints:</strong> write to us at <strong>{{email}}</strong>. We will reply as soon as possible.</li>
<li><strong>Consumer protection authority (Romania):</strong> <a href="https://www.anpc.ro/" target="_blank" rel="noopener">ANPC</a>.</li>
<li><strong>Alternative dispute resolution (ADR):</strong> you can file a request with the ADR Directorate (SAL) of ANPC: <a href="https://reclamatiisal.anpc.ro/" target="_blank" rel="noopener">reclamatiisal.anpc.ro</a>.</li>
</ul>`
        },
        {
          id: "protectia-datelor",
          title: "Data protection (GDPR)",
          html: `
<p><strong>Controller:</strong> {{name}}, contact {{email}}.</p>
<p><strong>What data we process.</strong></p>
<ul>
<li>Your language preference, stored in your browser (local storage).</li>
<li>Campaign parameters (UTM, click identifiers) from the link that brought you to the site, kept for the session only, so we know where orders come from.</li>
<li>When you order through tollgo.eu: country and registration number, vehicle category, period, start date, email and language.</li>
<li>Technical connection data (IP address, logs) at our hosting provider, Vercel Inc.</li>
<li>The map loads resources from unpkg.com and cdn.jsdelivr.net; these services may receive your IP address.</li>
</ul>
<p><strong>Purposes and legal bases (Art. 6 GDPR).</strong> Performing your order and steps before it (Art. 6(1)(b)); legal obligations, such as invoicing (point c); security and abuse prevention (point f). <mark class="todo">[to be checked: measuring where orders come from, and consent if needed]</mark></p>
<p><strong>Recipients.</strong> Autopay Mobility Sp. z o.o., to issue the vignette <mark class="todo">[to be confirmed: controller or processor]</mark>; Vercel Inc. for hosting. <mark class="todo">[to be confirmed: transfers outside the EEA and the safeguards used]</mark></p>
<p><strong>Cookies.</strong> We do not use our own marketing cookies. We use local and session storage, described above.</p>
<p><strong>Retention.</strong> <mark class="todo">[to be filled in: retention period for order data and accounting documents]</mark></p>
<p><strong>Your rights.</strong> Access, rectification, erasure, restriction, portability and objection, and the right to lodge a complaint with the Romanian National Supervisory Authority for Personal Data Processing (ANSPDCP): <a href="https://www.dataprotection.ro/" target="_blank" rel="noopener">dataprotection.ro</a>, anspdcp@dataprotection.ro. To exercise your rights, write to us at {{email}}.</p>`
        }
      ]
    }
  };

  const api = { LEGAL, FIELDS, fill, esc };
  root.TollgoLegal = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
