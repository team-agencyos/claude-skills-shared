---
name: abs-draft-blog-post
description: Draft an ABS Commercial Cleaning blog post directly from a local clone of the abs-website repo. The repo is the source of truth for URLs, voice, terminology, trust claims, phone numbers, and word-count targets. NeuronWriter and a research report are both optional enhancements, not prerequisites. Use this skill whenever the user wants to draft an ABS blog post, write an ABS article for a keyword, add a post to the ABS blog cluster, or produce an ABS content draft. Also triggers for "draft ABS blog post", "write ABS blog for [keyword]", "create ABS article for [keyword]", "abs blog post", or "/abs-draft-blog-post Keyword: ...".
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch, WebSearch, AskUserQuestion
---

# ABS Commercial Cleaning Blog Post Drafting

Draft a blog post for ABS Commercial Cleaning using the live `abs-website` repo as the source of truth. Produce a reviewable markdown draft plus FAQ schema in `content-drafts/`. Never publish, never push.

**Project root (the only path that matters):** your local clone of the `abs-website` repo. Resolve it first:

```bash
ABS="${ABS_REPO:-$HOME/repos/abs-website}"
test -f "$ABS/scripts/check-claims.mjs" && echo "ABS repo: $ABS" || echo "ABS repo not found at $ABS"
```

If it is not found, ask the user where their clone lives (or have them set `ABS_REPO`) before going further. Referred to below as `$ABS`. Shell variables do not persist between Bash calls, so substitute the resolved absolute path into later commands. Every path in this skill is relative to `$ABS` unless stated otherwise.

**Bundled scripts** live in `scripts/` beside this SKILL.md. The commands below assume the standard install at `~/.claude/skills/abs-draft-blog-post/`. If the skill is installed elsewhere, use the `scripts/` folder next to this file instead.

---

## What This Skill Needs

**Required:** a topic. That is all.

**Optional, used when present:**

| Input | Effect when present | Effect when absent |
|---|---|---|
| NeuronWriter query ID | Keyword ranges, competitor word counts, NeuronWriter PAA | Draft is labelled `NeuronWriter optimization pending` |
| `research-report-*.md` | Primary source for facts, stats, and external links | Tell the user to run `/research-for-blog-post` first, then offer to continue from repo + SERP |
| Plane task ID (e.g. `ABS-51`) | Names the draft folder | Folder named from the topic |

**Never block on a missing file.** The old pipeline required `fetch_neuronwriter.py`, `fetch_serp_titles.py`, `upload_to_neuronwriter.py`, `config.json`, `Content brain/contentbrain.md`, `Content brain/ai-buzzwords.md`, and `internal_urls.csv`. Do not assume any of them exist; none are required. Everything they used to provide is derived from the repo instead. Do not check for them, and do not stop because they are missing.

### Accepted invocation

```
/abs-draft-blog-post
Keyword: commercial cleaning checklist
Title: The Complete Commercial Cleaning Checklist
URL: /blog/commercial-cleaning-checklist/
```

Any subset works. `/abs-draft-blog-post office cleaning frequency` is enough. Parse these keys case-insensitively when present, and infer the rest:

- `Keyword:` primary keyword. If only a title is given, derive the keyword from it.
- `Title:` proposed H1. If absent, write one in Phase 5.
- `URL:` or `Slug:` target path. If absent, derive `/blog/<keyword-slugified>/`.
- `Query ID:` NeuronWriter query ID. Optional.
- `Task:` Plane work item ID. Optional.

Only ask the user a question when the topic itself is ambiguous, or when Phase 1 finds a slug collision. Do not ask for a query ID.

---

## Phase 0: Orient in the Repo

Run these before writing anything.

```bash
cd "$ABS"
git branch --show-current
git status --short
```

Record the branch and `git rev-parse --short HEAD` in the QA summary as the **base branch**: the checkout the URL inventory, claims gate, and word counts were measured against. It is not necessarily the branch the draft will be committed to. Drafts are often committed to a new cluster branch cut after drafting (ABS-52 drafts were written on `content/abs-51-commercial-cleaning`, then committed to `content/abs-52-post-construction-drafts`), so never label the base as "the branch this draft lives on". If the user later commits the drafts to a different branch, name that branch separately in the handoff README. **The URL inventory reflects the checked-out branch only.** Pages built on a preview branch are absent from other branches. As of the last check, the near-me hubs (`/services/commercial-cleaning-near-me` and six siblings) live on `preview/abs-34-near-me-hubs`, not on `main`. If the topic wants a page that is not in the inventory, say so rather than inventing the URL.

Then read, in this order:

1. **`src/data/blogPosts.ts`** — the 10 posts served at `/blog/<slug>`. This is the house style. Read at least two bodies in full. Note the HTML vocabulary: `<p>`, `<h2>`, `<h3>`, `<ul><li><p>`, `<table>`, `<strong>`. No markdown.
2. **`src/data/posts.ts`** — 22 older WordPress ports at root level. Useful for slug collision checks. Weaker style; do not imitate.
3. **`content-drafts/`** — any existing cluster folder and its `README-*-HANDOFF.md`. The handoff README documents naming, QC table format, and open decisions. Follow its conventions.
4. **`scripts/check-claims.mjs`** — read the comment block at the top. It is the definitive list of what ABS may and may not claim.
5. **`src/data/locations.ts`** — cities and their phone numbers.
6. **`src/lib/schema.ts`** — `faqSchema()` shows the exact FAQ JSON-LD shape.
7. **`src/data/servicePages.ts`, `src/data/facilities.ts`** — scope and wording of the pages you will link to. Grep rather than reading whole files; `servicePages.ts` is over 5,000 lines.

### Optional Content Brain

A Content Brain PDF named `content-brain-abs-commercial-cleaning-a4.pdf` may exist on this machine, commonly in `~/Downloads/`. Read it if you can find it, for voice and positioning only. If it is not there, skip it.

**Where the Content Brain and the repo disagree, the repo wins.** The Content Brain is known to be out of date on at least these points:

| Content Brain says | Repo truth |
|---|---|
| Phone (800) 640-9446 | Retired answering-service number. Use the city phone from `src/data/locations.ts`; blog defaults to Austin, **(737) 289-0337** |
| "500+ facilities cleaned daily" | Blocked by the claims gate. Use **"over 5 million square feet cleaned daily"** |
| "20+ years of combined experience" | Blocked. Use **"20+ years of experience"** |
| "100+ Google reviews", "4.9-star average" | Review counts blocked; "5-star" blocked |
| "less than 1-hour average response" | Blocked. Response time is **within 24 hours** |
| "licensed, bonded and insured" | "Licensed" is blocked. Texas does not license janitorial companies. Use **"Insured & Bonded"** |
| Hub pages at `/services/office-cleaning-austin/` etc. | Verify every URL against the Phase 1 inventory; several Content Brain URLs do not exist |

The Content Brain's forbidden-terms list still stands, though. Those rules carry over into Phase 4.

---

## Phase 1: Build the URL Inventory and the Word-Count Target

### 1.1 Internal link inventory

This replaces `internal_urls.csv`.

```bash
bash "$HOME/.claude/skills/abs-draft-blog-post/scripts/abs-url-inventory.sh" "$ABS" > /tmp/abs-urls.txt
wc -l /tmp/abs-urls.txt
```

The script reads the same data files `src/app/sitemap.ts` spreads, so the result matches what the site actually routes. Roughly 160 URLs on a current branch: about 50 `/services/` (30 with literal slugs plus 20 built as base by city), 63 `/facilities/` (9 hubs from `facilities.ts` plus 54 city and near-me variants from `src/data/*Cities.ts`), 5 city pages, 22 root-level posts, 10 `/blog/` posts, plus 10 static routes. Last verified against the live `abscleaning.com/sitemap.xml`: 160 URLs, 63 facility pages, exact match. A branch cut before the facility city pages landed shows about 106 URLs with only 9 facility pages; that means the branch is stale, not that the script is broken.

**Every internal link in the draft must appear in this file.** No exceptions, no placeholders, no guessed URLs.

### 1.2 Slug collision check

```bash
grep -x "/blog/PROPOSED-SLUG" /tmp/abs-urls.txt || echo "blog slug is free"
grep -x "/PROPOSED-SLUG" /tmp/abs-urls.txt || echo "root slug is free"
```

If the slug is taken, **stop and ask the user**. This is a live risk: `/blog/commercial-cleaning-checklist` already exists, so a post targeting "commercial cleaning checklist" would cannibalize it. Offer three options: update the existing post, target a distinct sub-intent, or confirm a deliberate replacement.

### 1.3 Word-count target

```bash
node "$HOME/.claude/skills/abs-draft-blog-post/scripts/abs-live-word-counts.mjs" "$ABS"
```

Prints the body word count of every live `/blog/` post, plus min, max, average, and a suggested target. At last run: n=10, min 1,122, max 1,952, avg 1,656, suggested **1,650 words**.

If a NeuronWriter query ID was supplied and the data is reachable, average the top 5 competitors (word count between 500 and 5,000) and reconcile with the live range. Where they conflict, prefer the live range: it is what the site's own readers and rankings reflect.

**Present the target to the user and get a yes before writing.** Show the live range, the suggested target, and the competitor average if you have one. Stay within 10% of whatever is approved.

### 1.4 Hub and spoke selection

Pick from `/tmp/abs-urls.txt`:

- **One parent hub.** The service or facility page the post supports. Map the keyword to it: office or janitorial to `/services/office-cleaning-<city>`, floor or VCT to floor care, carpet to `/services/commercial-carpet-cleaning-<city>`, window to window cleaning, post-construction to `/services/post-construction-cleaning-<city>`, pressure washing to its own pages.
- **At least one `/facilities/` page** when the topic has a facility angle: `church-cleaning-services`, `school-cleaning-services`, `medical-office-cleaning`, `industrial-cleaning-services`, `warehouse-cleaning-services`, `gym-and-fitness-center-cleaning`, `daycare-and-childcare-cleaning`, `retail-store-cleaning`, `restaurant-and-food-service-cleaning`.
- **City pages** where the topic is location-relevant: `/commercial-cleaning-austin`, `-houston`, `-san-antonio`, `-dallas`, `-fort-worth`.
- **Sibling blog posts** on adjacent intent.

Target 12 to 15 internal links, matching the density of the existing cluster drafts. Confirm the hub and facility choices in the same message as the word-count approval, so there is one gate rather than three.

---

## Phase 2: Optional Enhancements

### 2.1 NeuronWriter (optional)

If the user supplied a query ID, try the NeuronWriter MCP tools (`mcp__neuronwriter__get-query`, `get-content`, `get-competitors-content`). If they return data, use `content_basic_w_ranges` as hard upper limits, `content_extended_w_ranges` for 60%+ coverage, and the PAA for FAQ questions.

If no query ID was given, or the integration returns nothing, or no ABS project exists in NeuronWriter: **continue without it.** Note it once, do not retry, and label the output (Phase 7.5).

The legacy scripts `fetch_neuronwriter.py` and `upload_to_neuronwriter.py` are not part of this skill. Do not attempt to run them.

### 2.2 Research report (optional)

```bash
ls "$ABS"/research-report-*.md 2>/dev/null
ls research-report-*.md 2>/dev/null
```

If one exists, read it in full and use its sections B, C, and D for facts, statistics, and external source links.

If none exists, tell the user plainly:

> No research report found. Run `/research-for-blog-post` first for a fact-rich draft with cited statistics. I can draft from the repo and live SERP now if you prefer.

Then continue if they want it. A draft without a research report is a valid output; it just carries fewer external citations. Do not fail the skill.

### 2.3 SERP and PAA (optional)

`fetch_serp_titles.py` does not exist here. Use `WebSearch` on the primary keyword for competitor framing and People Also Ask style questions. If search is unavailable, derive FAQ questions from the keyword's natural sub-questions and from what the existing cluster drafts answer.

---

## Phase 3: Content Brief

Write a short brief before the article. H1, then each H2 with two to six bullets of substance underneath, plus notes marking where the hub link, facility link, trust signal, local section, and CTA go. Leave the FAQ section titled but unfilled.

Keep the brief in the response, not in a file. It exists so the user can redirect before 1,650 words get written.

Structure the topic so it does not overlap an existing post. Check the H2s of the nearest live post and make sure yours do not collide. The ABS-51 handoff README documents how four near-identical topics were separated by intent: pillar, comparison, scope, cost. Apply the same discipline.

---

## Phase 4: House Style

Derived from the live posts in `src/data/blogPosts.ts` and the existing cluster drafts. This is what the draft must read like.

### Voice

First person plural for ABS ("we clean", "our crews"). Second person for the reader ("your facility"). Never "I". Never third person in body copy. Never "they" for ABS.

Tone order: confident, direct, approachable, caring, professional, solution-focused. Let metrics carry the confidence. Contractions are fine.

### Structure

- **H1** in Title Case, primary keyword near the front.
- **Opening answer, 40 to 60 words.** The first paragraph answers the title question outright as a complete statement. No throat-clearing.
- **Second paragraph** carries a trust signal and the care-first differentiator: ABS invests in its team members, which is why service quality holds.
- **`## Key Takeaways`** immediately after the intro. Four to six bullets, one short standalone fact each, no links, no bold.
- **Body H2 sections.** Open each with a semantic triple: subject entity, verb, specific value.
- **At least one table.** The live posts lean on comparison tables. Use one for a service comparison, a facility-type breakdown, or an included-versus-quoted-separately split.
- **A CTA H2** near the end. Soft, not a pitch. Must carry the city phone number.
- **`## Frequently Asked Questions About [Topic]`** with each question as an H3 (`###`) and a plain paragraph answer. Six pairs. Maximum four sentences per answer. Answers open with the subject entity, never "Yes" or "Great question".
- **No horizontal rules** anywhere in the article body.

### Formatting

- Title Case for H1 and H2; sentence case fine for H3.
- Oxford comma.
- **No em dashes or en dashes anywhere.** Comma, colon, or a new sentence.
- Short paragraphs, two to four sentences. Aim under 300 characters, but this is a distribution target, not a hard cap. Measured across the 10 live posts, counting prose paragraphs only and excluding bullet list items, 17% run over 300 (per-post range 12% to 23%, median 16%, longest 469). Keep the draft at or under roughly 25% over 300 with nothing over about 470. Splitting every long paragraph produces choppier prose than ABS actually publishes. Gate 5 measures it.
- Spell out one through nine; numerals for 10+; always numerals for metrics.
- Bold only for first-mention differentiators and key metrics.
- Acronym in full on first use: "vinyl composite tile (VCT)".
- Maximum one exclamation mark per post, in the CTA only.
- Sentence length varies: mix 8-to-12-word sentences with 15-to-25-word ones. Rarely exceed 30.
- Never start three consecutive sentences the same way.

### Phone number

Read from `src/data/locations.ts`. Blog posts resolve to Austin as the default location, so use **(737) 289-0337** unless the post targets a specific city:

| City | Phone |
|---|---|
| Austin, and every page with no city of its own, including blog | (737) 289-0337 |
| Houston | (713) 267-4611 |
| San Antonio | (210) 503-1970 |
| Dallas | (972) 970-7110 |
| Fort Worth | (972) 970-7110 |

Always formatted `(737) 289-0337`. Never `737-289-0337`.

### Approved claims only

The only approved credential claims are: **Insured & Bonded, BBB Accredited Business, A+ BBB Rated, ISSA Member, OSHA-trained crews.** The approved scale metrics are **"over 5 million square feet cleaned daily"**, **"20+ years of experience"**, and **"five Texas markets"**. Response time is **within 24 hours**.

Anything else about scale, counts, ratings, licensing, availability, or superiority is out. Phase 6 enforces this mechanically.

### No pricing figures

Never quote a dollar amount, a rate, or a range. Use "a customized plan built around your facility's size, schedule, and needs". Cost-topic posts explain the drivers and route the reader to a walkthrough.

### Terminology

Never: maid, cheap, cheapest, discount, budget, janitor as a job title, cleaner as a job title, customer, contract (use plan or agreement), workers, employees, residential, home cleaning, house cleaning, any competitor name, "touch base", "state-of-the-art", "world-class", "cutting-edge", "synergy".

Use instead: client, team member, cleaning professional, crew, plan, service agreement.

### Banned AI phrasing

No "in today's fast-paced", "it's important to note", "when it comes to", "in the realm of", "let's dive in", "look no further", "at the end of the day", "navigating the landscape", "a testament to", "in conclusion" as a heading, "rest assured".

No: delve, leverage, utilize, facilitate, foster, harness, underscore, elevate, empower, streamline, unleash, robust, seamless, pivotal, transformative, groundbreaking, unprecedented, paramount, meticulous, myriad, plethora, boasts, holistic, bustling, tapestry, paradigm, ecosystem, cornerstone, showcasing, comprehensive, innovative.

No transition-word scaffolding: moreover, furthermore, consequently, hence, notably, nevertheless, nonetheless.

Cleaning-specific slop, also banned: "sparkling clean", "leave your space spotless", "crystal clear results", "a clean space is a productive space", "clean is more than a look", "we take pride in every detail".

If a sentence could appear in any AI article on any topic, replace it with something specific to the facility type, the service, the compliance context, or the Texas market.

### Conditional sections

**City-targeted posts** get a local section that is genuinely local, not template-swapped. Austin: tech campuses, state government offices, The Domain, downtown corridors. Houston: Texas Medical Center, energy sector offices, Ship Channel industrial parks. San Antonio: military-adjacent facilities, Riverwalk hospitality, healthcare. Dallas and Fort Worth: corporate parks, DFW logistics corridors, financial district offices.

**Facility-targeted posts** get a compliance section. Healthcare: OSHA standards, infection control, EPA-registered disinfectants, patient-area access. Schools: child safety, after-hours scheduling. Churches: event-driven flexibility, multi-use spaces, weekend scheduling. Industrial and warehouse: OSHA standards, floor slip resistance, equipment-safe cleaning. Daycare: child-safe products, health department compliance. Gym: sanitization frequency, equipment and locker rooms.

Use "disinfect" for healthcare and compliance contexts, "sanitize" for general commercial. They are not interchangeable.

---

## Phase 5: Write the Draft

Write to the approved word count in markdown, with the SEO metadata block above the H1, matching the existing cluster drafts exactly:

```
**SEO Title (primary):** [60 chars max, primary keyword first, parenthetical reader benefit]

**SEO Title Option 2:** [different angle, 60 chars max]
**SEO Title Option 3:** [different angle, 60 chars max]

**URL Slug:** /blog/SLUG/

**Meta Description Option 1:** [155 chars max, benefit + keyword + trust signal. Ends: Call (737) 289-0337.]

**Meta Description Option 2:** [155 chars max, different angle. Ends: Call (737) 289-0337.]

# H1 in Title Case
```

SEO titles carry no "| ABS Commercial Cleaning" suffix; the blog route supplies its own. `seoTitle` and the H1 are allowed to differ, and usually should.

Internal links are markdown, root-relative, with descriptive anchors of one to four words. Roughly 60% keyword-rich anchors, 40% natural. Links go in body paragraphs only, never in a heading. The hub link belongs in the first third.

---

## Phase 6: QA Gates

**All of these are mandatory. Run them as commands. Do not assert a result by eye.**

### Gate 1: The repo claims gate (blocking)

The most important check in this skill, because it is the same gate that runs on `prebuild` and can fail a Vercel deploy.

```bash
bash "$HOME/.claude/skills/abs-draft-blog-post/scripts/abs-claims-check.sh" "PATH/TO/draft.md" "$ABS"
```

Exit 0 is clean. Exit 1 lists every retired or unapproved claim with the reason. Fix each one and re-run until clean.

**Known false positive:** the unverified-count pattern matches any number followed by `facilities`, `buildings`, `clients`, or `customers`, including ordinary editorial prose. "Two buildings of identical size can buy commercial cleaning" trips it, and that sentence makes no claim about ABS. When a hit is genuinely editorial, reword to sidestep the pattern, or keep it and record it in the QA summary as a reviewed false positive with the reason. Never silently ignore a hit.

Then confirm you left nothing behind in the repo:

```bash
cd "$ABS" && npm run check:claims
```

### Gate 2: Internal links resolve

```bash
grep -oE '\]\(/[a-z0-9/-]*\)' "PATH/TO/draft.md" | sed 's/^](//; s/)$//' | sort -u > /tmp/draft-links.txt
comm -23 /tmp/draft-links.txt /tmp/abs-urls.txt
```

Any output is a link that does not resolve on this branch. Triage each one into exactly one of three buckets and record which:

- **Sibling in the same unpublished cluster.** Legitimate, but the cluster must ship together or the link must be stripped from whichever post goes live first. Say so in the handoff.
- **Branch-dependent page.** The page exists on another branch. Name the branch and flag it as a sequencing dependency. Running this gate against the existing ABS-51 drafts surfaces `/services/commercial-cleaning-near-me`, which lives on `preview/abs-34-near-me-hubs`.
- **Genuinely missing.** Fix it. Before concluding a URL is missing, check it is not one the inventory script cannot see: `src/data/services/index.ts` builds the `newServicePages` slugs as `${svc.base}-${citySlug}`, so they exist as no literal anywhere in the repo. The script expands base by city to cover them. If a new service family is added that builds slugs some other way, the script needs the same treatment or every link to it will read as broken.

Record the total link count and the count of each bucket.

### Gate 3: Terminology and dashes

```bash
grep -nioE "\b(maid|cheap(est)?|discount|budget|janitor|customer|contract|workers?|employees?|residential|home cleaning|house cleaning|licensed|combined experience|best|top-rated|award-winning|most trusted|5-star)\b" "PATH/TO/draft.md"
grep -nF -e "—" -e "–" "PATH/TO/draft.md"
```

Review every hit. "Contract" is allowed in "contract cleaning" as an industry term only. Dash output must be empty.

### Gate 4: AI buzzwords

```bash
grep -nioE "\b(delve|leverage|utilize|facilitate|foster|harness|underscore|elevate|empower|streamline|unleash|robust|seamless|pivotal|transformative|groundbreaking|unprecedented|paramount|meticulous|myriad|plethora|boasts|holistic|bustling|tapestry|paradigm|synergy|ecosystem|cornerstone|showcasing|comprehensive|innovative|moreover|furthermore|consequently|hence|notably|nevertheless|nonetheless)\b" "PATH/TO/draft.md"
grep -nioE "(in today's|it's important to note|when it comes to|in the realm of|let's dive|look no further|at the end of the day|a testament to|rest assured|sparkling clean|crystal clear)" "PATH/TO/draft.md"
```

Must be empty. Replace hits with concrete language, not another buzzword.

### Gate 5: Structure and counts

```bash
grep -cE '^### ' "PATH/TO/draft.md"                      # FAQ question count, expect 6
grep -nE '^[[:space:]]*(---|\*\*\*|___)[[:space:]]*$' "PATH/TO/draft.md"   # horizontal rules, must be empty
grep -noE '\$[0-9]' "PATH/TO/draft.md"                   # pricing, must be empty
grep -c '(737) 289-0337' "PATH/TO/draft.md"              # phone present
```

Then measure the counts the greps cannot. This script prints every one of them, including the paragraph-length distribution from Phase 4:

```bash
node "$HOME/.claude/skills/abs-draft-blog-post/scripts/abs-draft-metrics.mjs" "PATH/TO/draft.md"
```

Record body word count against target (within 10%), opening answer 40 to 60 words, Key Takeaways 4 to 6 bullets, no FAQ answer over four sentences, at least one table, and the share of paragraphs over 300 characters (at or under roughly 25%, none over about 470).

### Gate 6: Cannibalization

Compare the draft's H2 headings against the nearest live posts. Zero H2 collisions. If the topic sits close to a live post, compute five-gram overlap as the ABS-51 handoff did and report it.

### Gate 7 (only if NeuronWriter data is available)

Keyword ranges as hard upper limits, with substring awareness: a compound keyword increments every parent substring. Extended keyword coverage at or above 60%. Skip any NeuronWriter keyword that violates the terminology rules and say which ones were skipped.

Loop gates 1 through 5 up to three times. If something still fails, show the user what remains rather than shipping it quietly.

---

## Phase 7: Output

### 7.1 Draft location

```
$ABS/content-drafts/TASK-ID-topic-cluster/NN-slug.md
```

Follow the existing convention: `content-drafts/ABS-51-commercial-cleaning-cluster/97-what-is-meant-by-commercial-cleaning.md`. Without a task ID, use `content-drafts/topic-YYYY-MM-DD/`. Number files sequentially, continuing the existing series where one applies.

### 7.2 FAQ schema

Write `faq-schema/NN-faq-schema.json` beside the draft, matching the shape `faqSchema()` in `src/lib/schema.ts` produces:

```json
{
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "...", "acceptedAnswer": { "@type": "Answer", "text": "..." } }
  ]
}
```

Question and answer text must match the article's H3 FAQ section word for word. Note in the handoff that the blog route does not currently emit FAQ schema, so a developer decision is needed on where this goes.

### 7.3 QA summary

Append a `## QA Summary` section to the end of the draft file and repeat it in the response. Table format, one row per gate, with the measured value, not a tick:

| Check | Result |
|---|---|
| Base branch (inventory measured on) | `<git branch --show-current>` @ `<short SHA>` |
| Body word count / target | 1,688 / 1,650 |
| Opening answer word count (40-60) | 52 |
| Internal links / broken | 14 / 0 |
| Slug collision | none |
| FAQ pairs / answers over 4 sentences | 6 / 0 |
| Repo claims gate | passed |
| Claims gate false positives reviewed | 1 (editorial "two buildings") |
| Terminology violations | 0 |
| AI buzzword violations | 0 |
| Em/en dashes | 0 |
| Pricing figures | 0 |
| Phone (737) 289-0337 present | yes |
| H2 collisions with live posts | 0 |
| NeuronWriter | **optimization pending** (no ABS project) |

### 7.4 Handoff README

When the draft is part of a cluster, create or update `README-TASK-ID-HANDOFF.md` in the same folder, modelled on `README-ABS-51-HANDOFF.md`: what is in the folder, the QC table, how each post was kept distinct, decisions needing sign-off, what could not be run and why, and the developer handoff notes.

Developer handoff notes must state: entries go in `src/data/blogPosts.ts` with `slug, seoTitle, title, description, date, hero, body`; `body` is HTML, not markdown; hero images go in `public/images/blog/<slug>/` and are not yet created; adding the entry picks up `sitemap.ts` automatically.

### 7.5 NeuronWriter labelling

When NeuronWriter was not used, the draft's QA summary and the handoff README both carry:

> **NeuronWriter optimization pending.** This draft has not been scored against NeuronWriter keyword ranges. The word count target was set from the live `/blog/` range instead of competitor averages. If ABS should run through NeuronWriter, a project needs creating and this draft can be scored and adjusted afterwards.

---

## Phase 8: Report Back

In the response, give:

- Draft path, slug, SEO title, H1, primary keyword
- Word count against target
- Internal links used, as a list of paths
- External links used, if any
- Hub page, facility page, city page
- The QA summary table
- Open questions and anything needing sign-off
- Explicit confirmation that nothing was published or pushed

---

## Hard Rules

1. **Never publish, deploy, or push.** No `git push`, no `vercel`, no edits to `src/`, no changes to `blogPosts.ts`. This skill writes to `content-drafts/` and nowhere else. The only touch inside `src/` is the claims-check temp file, which the wrapper script removes on exit.
2. **Never commit** unless the user asks.
3. **The repo outranks the Content Brain** on URLs, phone numbers, trust claims, and terminology. The Content Brain is a voice reference that is known to be stale.
4. **The claims gate is not advisory.** A draft that fails it would fail the build. Fix it.
5. **Every internal link comes from the inventory.** Never write a URL you have not grepped.
6. **No prerequisite file check.** Missing scripts, config, or CSVs never stop this skill.
7. **NeuronWriter is optional** and never blocks drafting.
8. **A missing research report is a note, not a failure.**
9. **No pricing figures, ever.**
10. **Verify with commands.** Word counts, link resolution, and claim checks are measured, never estimated.
11. **Care-first identity** belongs in every post: ABS invests in its team members, and that is why service quality holds.
12. **Ask once.** Bundle the word-count target, hub selection, and any slug collision into a single approval message rather than three separate stops.

---

## Bundled Scripts

In `scripts/` beside this file:

| Script | Purpose |
|---|---|
| `abs-url-inventory.sh` | Builds the internal link inventory from the repo data files. Replaces `internal_urls.csv`. |
| `abs-live-word-counts.mjs` | Prints live `/blog/` body word counts and a suggested target. Takes the repo root as an argument (default `$ABS_REPO`, else `~/repos/abs-website`); works from any directory. |
| `abs-claims-check.sh` | Runs the repo's own claims gate against a draft in `content-drafts/`, then cleans up. |
| `abs-draft-metrics.mjs` | Gate 5 structural metrics: body word count, opening answer, Key Takeaways, FAQ pairs, paragraph-length distribution. |
