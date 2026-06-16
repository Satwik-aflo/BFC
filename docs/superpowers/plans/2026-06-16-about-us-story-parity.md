# Our Story (About Us) Draft-Theme Parity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the draft theme's About Us page render the full Our Story experience from `site/about.html`, with working art.

**Architecture:** Code already exists (4 `about-*` sections + `page.about-us.json`, commit `198619d`). The gap is deploy-side: port 10 renamed image assets, validate, push only brand files to draft `#151032561833`, fix the admin page→template binding, and verify visually.

**Tech Stack:** Shopify Horizon 3.5.1 theme, Liquid, Shopify CLI, Shopify Dev MCP (validation), Admin GraphQL, Playwright (screenshot).

**Spec:** `docs/superpowers/specs/2026-06-16-about-us-story-parity-design.md`

---

### Task 1: Port the 10 Our Story images into the theme

**Files:**
- Create: `theme/assets/about-blob.png`, `about-spark.png`, `about-sign.png`, `about-founders.jpg`, `about-sun.png`, `about-rose.png`, `about-stamp-1.svg`, `about-stamp-2.svg`, `about-starburst.svg`, `about-logo-web.png`
- Source: `site/assets/img/about/*`

- [ ] **Step 1: Copy + rename all 10 source images (absolute paths)**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
cp "site/assets/img/about/Frame_1.png"    theme/assets/about-blob.png
cp "site/assets/img/about/Spark_1.png"    theme/assets/about-spark.png
cp "site/assets/img/about/Gemini_blob.png" theme/assets/about-sign.png
cp "site/assets/img/about/founders.jpg"   theme/assets/about-founders.jpg
cp "site/assets/img/about/Sun.png"        theme/assets/about-sun.png
cp "site/assets/img/about/Rose.png"       theme/assets/about-rose.png
cp "site/assets/img/about/Stamp_1.svg"    theme/assets/about-stamp-1.svg
cp "site/assets/img/about/Stamp_2.svg"    theme/assets/about-stamp-2.svg
cp "site/assets/img/about/Starburst.svg"  theme/assets/about-starburst.svg
cp "site/assets/img/about/logo-web.png"   theme/assets/about-logo-web.png
```

- [ ] **Step 2: Verify every `asset_url` reference now resolves to a real file**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
grep -rhoE "'(about-[^']+\.(png|svg|jpg))' \| asset_url" theme/sections/about-*.liquid \
  | sed -E "s/.*'(.*)'.*/\1/" | sort -u \
  | while read f; do test -f "theme/assets/$f" && echo "OK  $f" || echo "MISS $f"; done
```
Expected: 10 lines, all `OK`, zero `MISS`.

- [ ] **Step 3: Commit**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
git add theme/assets/about-*.png theme/assets/about-*.jpg theme/assets/about-*.svg
git commit -m "feat(about): port Our Story art into theme assets

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Validate the About Us template + sections

**Files (validate, no edits expected):**
- `theme/templates/page.about-us.json`
- `theme/sections/about-story-intro.liquid`, `about-story-field.liquid`, `about-fix-stamp.liquid`, `about-vision-signoff.liquid`

- [ ] **Step 1: Get a Shopify liquid conversationId**

Call MCP `learn_shopify_api` with `api: "liquid"`. Capture `conversationId`.

- [ ] **Step 2: Validate the theme files**

Call MCP `validate_theme` with the `conversationId`, theme path `theme/`, and the 5 files above as the changed files.
Expected: no real errors. The known `JSONMissingBlock` false-positives are judge.me-only (not these files) — if any appear unrelated to these 5 files, ignore per THEME-AUDIT.md.

- [ ] **Step 3: If validation flags a real error in one of the 5 files, fix inline and re-validate**

Only touch the flagged file. Re-run Step 2 until clean. Do not edit Horizon core files.

---

### Task 3: Push the brand files to the draft theme (never live)

**Target:** draft `#151032561833` only. Live theme is off-limits.

- [ ] **Step 1: Confirm CLI auth + that the draft theme exists**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
shopify theme list --store d9v1pv-06.myshopify.com
```
Expected: a list including theme id `151032561833` ("Boring Foods — New Design"). If auth fails with 401, stop and tell the user to run `shopify auth logout` then re-login interactively (`! shopify login --store d9v1pv-06.myshopify.com`).

- [ ] **Step 2: Push only the About Us files (surgical, `--nodelete`)**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete \
  --only templates/page.about-us.json \
  --only sections/about-story-intro.liquid \
  --only sections/about-story-field.liquid \
  --only sections/about-fix-stamp.liquid \
  --only sections/about-vision-signoff.liquid \
  --only assets/about-blob.png --only assets/about-spark.png \
  --only assets/about-sign.png --only assets/about-founders.jpg \
  --only assets/about-sun.png --only assets/about-rose.png \
  --only assets/about-stamp-1.svg --only assets/about-stamp-2.svg \
  --only assets/about-starburst.svg --only assets/about-logo-web.png
```
Expected: push reports the listed files uploaded, no errors. NEVER pass `--theme` for the live theme; never `--publish`.

- [ ] **Step 3: Verify the push landed by pulling the template back**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
mkdir -p /tmp/about-verify
shopify theme pull --path /tmp/about-verify --store d9v1pv-06.myshopify.com --theme 151032561833 \
  --only templates/page.about-us.json --nodelete
diff <(grep -o '"type": "about-[a-z-]*"' theme/templates/page.about-us.json | sort) \
     <(grep -o '"type": "about-[a-z-]*"' /tmp/about-verify/templates/page.about-us.json | sort)
```
Expected: empty diff — the pulled template references all four `about-*` sections (no stripped values, per the two-push memory note). If the diff is non-empty, re-push and recheck.

---

### Task 4: Diagnose and fix the admin page → template binding

**Why:** an "empty" About Us page is most often the admin page assigned to the default `page` template instead of `page.about-us`.

- [ ] **Step 1: Find the About Us page and its current template via Admin GraphQL**

Run an Admin GraphQL query against the store (e.g. `shopify store execute`, or the Admin API with the store session) for pages, reading `handle` and `templateSuffix`:

```graphql
{ pages(first: 50) { nodes { id title handle templateSuffix } } }
```
Expected: locate the page titled "About Us" (or handle `about-us`/`about`). Note its `templateSuffix`. If `templateSuffix` is null/empty → it's on the default `page` template = the empty-page cause.

- [ ] **Step 2: If unbound, set the page's template suffix to `about-us`**

```graphql
mutation {
  pageUpdate(id: "gid://shopify/Page/<ID>", page: { templateSuffix: "about-us" }) {
    page { id templateSuffix }
    userErrors { field message }
  }
}
```
Expected: `templateSuffix: "about-us"`, no `userErrors`.

- [ ] **Step 3: If CLI/API cannot authenticate for Admin GraphQL, hand off**

If store auth is unavailable, stop and give the user the exact admin-UI steps: Online Store → Pages → About Us → Theme template → select `page.about-us` → Save. Do not guess that it's bound.

---

### Task 5: Verify visually against the static site

- [ ] **Step 1: Screenshot the draft About Us page**

Use system Chrome + Playwright (per CLAUDE.md). Open the preview with the About Us URL and the preview cookie:
```
https://d9v1pv-06.myshopify.com/pages/about-us?preview_theme_id=151032561833
```
(Adjust the page handle to the one found in Task 4 Step 1.) Capture full-page screenshots at desktop (1280px) and mobile (390px). Allow ~1.5s for fonts/art to load.

- [ ] **Step 2: Compare each of the 4 story beats to `site/about.html`**

Confirm all four render with art (not broken images): (1) blue blob intro + road-sign + Bihar line; (2) founders photo + sun sticker + field story/list; (3) "SO WE DECIDED TO FIX IT" stamp box; (4) vision + starburst + "Anvi and Varuni" signature. Flag any broken image or missing section.

- [ ] **Step 3: Report result**

State plainly: pushed ✓/✗, bound ✓/✗ (or handed off), renders-with-art ✓/✗, with the screenshots. If anything is broken, do not claim done — diagnose and loop back to the relevant task.

---

## Notes / guardrails
- Live theme is never pushed or published without explicit user approval.
- Header nav label "About Us" → "Our Story" is out of scope (user renames later).
- Copy is already literal-matched in source; no copy edits.
