// Gate 5 structural metrics for an ABS draft: the counts grep cannot do.
//
// Usage:  node abs-draft-metrics.mjs <draft.md> [target_words]
//
// Everything above the H1 (the SEO metadata block) and the appended QA Summary
// are excluded, so the word count reflects the article body only.

import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node abs-draft-metrics.mjs <draft.md> [target_words]");
  process.exit(2);
}
const target = Number(process.argv[3]) || null;

const raw = readFileSync(file, "utf8");
const h1 = raw.indexOf("\n# ");
let body = h1 === -1 ? raw : raw.slice(h1);
const qa = body.indexOf("\n## QA Summary");
if (qa !== -1) body = body.slice(0, qa);
body = body.trim();

// Anchor text counts, URLs do not.
const strip = (s) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#*|>`]/g, "");
const words = (s) => strip(s).split(/\s+/).filter(Boolean).length;

const paras = body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
// Bullets and numbered steps are list items, not prose paragraphs. Counting
// them skews the distribution: live-post list items are short, draft numbered
// steps are long, and either way they are not what the rule is about.
const isList = (p) => p.startsWith("- ") || /^\d+\.\s/.test(p);
const prose = paras.filter((p) => !p.startsWith("#") && !p.startsWith("|") && !isList(p));

const bodyWords = words(body);
console.log(`body words:            ${bodyWords}${target ? `  (target ${target}, ${(((bodyWords - target) / target) * 100).toFixed(1)}%)` : ""}`);

const opening = prose[0] ? words(prose[0]) : 0;
console.log(`opening answer words:  ${opening}  ${opening >= 40 && opening <= 60 ? "OK" : "OUT OF RANGE (want 40-60)"}`);

const ktMatch = body.split("## Key Takeaways")[1];
const kt = ktMatch ? (ktMatch.split(/\n## /)[0].match(/^- /gm) || []).length : 0;
console.log(`key takeaway bullets:  ${kt}  ${kt >= 4 && kt <= 6 ? "OK" : "OUT OF RANGE (want 4-6)"}`);

console.log(`tables:                ${(body.match(/^\| ---/gm) || []).length}`);
console.log(`H2 sections:           ${(body.match(/^## /gm) || []).length}`);

const faqBlock = body.split(/^## Frequently Asked Questions.*$/m)[1];
if (faqBlock) {
  const pairs = faqBlock.split(/^### /m).slice(1);
  console.log(`FAQ pairs:             ${pairs.length}  ${pairs.length === 6 ? "OK" : "want 6"}`);
  pairs.forEach((b, i) => {
    const answer = b.split("\n").slice(1).join(" ").trim();
    const n = (answer.match(/[.!?](\s|$)/g) || []).length;
    if (n > 4) console.log(`  FAQ ${i + 1}: ${n} sentences  OVER LIMIT (max 4)`);
  });
} else {
  console.log("FAQ pairs:             none found");
}

// Phase 4 allows long paragraphs at roughly the rate the live posts use them.
const long = prose.filter((p) => strip(p).length > 300);
const longest = prose.length ? Math.max(...prose.map((p) => strip(p).length)) : 0;
const pct = prose.length ? Math.round((long.length / prose.length) * 100) : 0;
console.log(`paragraphs:            ${prose.length}, over 300 chars: ${long.length} (${pct}%), longest ${longest}`);
console.log(`                       ${pct <= 25 && longest <= 470 ? "OK (live posts run 17%, range 12-23%, longest 469)" : "OVER HOUSE NORM: split the longest until <=25% and none over ~470"}`);
if (pct > 25 || longest > 470) {
  for (const p of long.sort((a, b) => strip(b).length - strip(a).length).slice(0, 3)) {
    console.log(`    ${strip(p).length}: ${strip(p).slice(0, 70)}...`);
  }
}
