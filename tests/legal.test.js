"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const { LEGAL, FIELDS, fill } = require("../legal/content.js");
const company = require("../legal/company.js");

const indexHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("fiecare link legal din index.html are o secțiune în ro și en", () => {
  const ids = [...indexHtml.matchAll(/href="legal\.html#([\w-]+)"/g)].map(m => m[1]);
  assert.ok(ids.length >= 5, "ar trebui să existe cel puțin 5 linkuri legale");
  ["ro", "en"].forEach(lang => {
    const have = LEGAL[lang].sections.map(s => s.id);
    ids.forEach(id => assert.ok(have.includes(id), `${lang}: lipsește secțiunea ${id}`));
  });
});

test("index.html nu mai conține linkuri către ancore inexistente (#termeni etc.)", () => {
  assert.ok(!/href="#(termeni|revocare|protectia-datelor|date-identificare|informatii-consumatori|protectia-anularii|newsletter)"/.test(indexHtml));
});

test("ro și en au aceleași secțiuni, în aceeași ordine", () => {
  assert.deepStrictEqual(LEGAL.ro.sections.map(s => s.id), LEGAL.en.sections.map(s => s.id));
});

test("toate marcajele {{câmp}} din texte sunt câmpuri cunoscute", () => {
  ["ro", "en"].forEach(lang => LEGAL[lang].sections.forEach(s => {
    [...s.html.matchAll(/\{\{(\w+)\}\}/g)].forEach(m => assert.ok(FIELDS.includes(m[1]), `${lang}/${s.id}: câmp necunoscut ${m[1]}`));
  }));
  FIELDS.forEach(f => assert.ok(f in company, `company.js nu are câmpul ${f}`));
});

test("fill: valorile se scapă HTML, iar lipsurile devin marcaje vizibile", () => {
  const out = fill("<p>{{name}} / {{cui}}</p>", { name: "A <b>&</b> B", cui: "" }, "ro");
  assert.ok(out.includes("A &lt;b&gt;&amp;&lt;/b&gt; B"));
  assert.ok(out.includes('<mark class="todo">[de completat: cui]</mark>'));
  assert.ok(fill("{{cui}}", {}, "en").includes("[to be filled in: cui]"));
  assert.ok(!/\{\{/.test(fill(LEGAL.ro.sections.map(s => s.html).join(""), {}, "ro")), "nu trebuie să rămână {{ }}");
});

test("textele nu trimit la platforma europeană ODR (închisă la 20 iulie 2025)", () => {
  const all = JSON.stringify(LEGAL);
  assert.ok(!/ec\.europa\.eu\/consumers\/odr/.test(all));
});

test("legăturile externe din texte sunt https și au rel=noopener", () => {
  const all = ["ro", "en"].flatMap(l => LEGAL[l].sections.map(s => s.html)).join("");
  [...all.matchAll(/<a [^>]*>/g)].forEach(m => {
    assert.ok(/href="https:\/\//.test(m[0]), m[0]);
    assert.ok(/rel="noopener"/.test(m[0]), m[0]);
  });
});

test("câmpurile obligatorii sunt declarate și phone/vatId sunt opționale", () => {
  assert.deepStrictEqual(company.REQUIRED, ["name", "cui", "regCom", "address", "email"]);
});
