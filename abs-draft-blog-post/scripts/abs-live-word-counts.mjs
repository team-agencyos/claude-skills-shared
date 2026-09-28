// Live /blog/ body word counts, read straight from the repo data file.
//
// Usage:  node abs-live-word-counts.mjs [repo_root]
// Default repo_root: $ABS_REPO, else ~/repos/abs-website. Works from any cwd.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const root = process.argv[2] || process.env.ABS_REPO || join(homedir(), "repos", "abs-website");
const lines = readFileSync(join(root, "src", "data", "blogPosts.ts"), "utf8").split(/\r?\n/);
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
