// Datele firmei din spatele tollgo.eu. SINGURUL loc de completat: paginile juridice și
// subsolul site-ului se umplu automat din acest fișier. Câmpurile goale apar pe pagină
// ca „[de completat: …]”, ca să nu rămână neobservate.
//
// Verificare înainte de lansare:  npm run check:launch
(function (root) {
  "use strict";
  const company = {
    name: "Fedor & Co SRL",      // denumirea completă, cu forma juridică
    cui: "48226399",       // cod unic de înregistrare (CUI / CIF), înregistrat la 24.05.2023
    regCom: "J30/511/24.05.2023",    // nr. de ordine în Registrul Comerțului
    euid: "ROONRC.J30/511/2023",     // identificator unic la nivel european (EUID)
    vatId: "",     // codul de TVA (ex. RO12345678), dacă firma este plătitoare de TVA
    address: "Strada Anghel Saligny 32, 440086 Satu Mare, România",   // sediul social
    email: "contact@tollgo.eu",     // adresa pentru întrebări și reclamații
    phone: "",     // telefon (opțional)

    // Treci pe true DOAR după ce un jurist a verificat textele din legal/content.js.
    // Cât timp este false, pagina juridică afișează un avertisment „în curs de revizuire”.
    reviewed: false
  };

  // Câmpurile fără de care nu se lansează (phone și vatId sunt opționale).
  company.REQUIRED = ["name", "cui", "regCom", "address", "email"];

  root.TOLLGO_COMPANY = company;
  if (typeof module === "object" && module.exports) module.exports = company;
})(typeof window !== "undefined" ? window : globalThis);
