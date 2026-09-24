// Live /blog/ body word counts, read straight from the repo data file.
import { readFileSync } from "node:fs";

const lines = readFileSync("src/data/blogPosts.ts", "utf8").split("\n");
const rows = [];
let slug = null;

for (const line of lines) {
  const s = line.match(/^\s+slug:\s*"([a-z0-9-]+)"/);
  if (s) slug = s[1];
  const b = line.match(/^\s+body:\s*"(.*)",\s*$/);
  if (b && slug) {
    const words = b[1].replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    rows.push({ slug, words });
    slug = null;
  }
}

rows.sort((a, b) => a.words - b.words);
for (const r of rows) console.log(String(r.words).padStart(6), r.slug);

const w = rows.map((r) => r.words);
const avg = Math.round(w.reduce((a, b) => a + b, 0) / w.length);
console.log(`\nn=${w.length}  min=${w[0]}  max=${w[w.length - 1]}  avg=${avg}`);
console.log(`Suggested target: ${Math.round(avg / 50) * 50} words (stay inside ${w[0]}-${w[w.length - 1]})`);
