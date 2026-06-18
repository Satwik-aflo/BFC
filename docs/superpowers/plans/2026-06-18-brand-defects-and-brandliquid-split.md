# Brand Defect Fixes + `brand.liquid` Modularization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the concrete brand/perf defects found in the `theme/` audit, then modularize the 1004-line `snippets/brand.liquid` into ordered partials — all with **zero rendered-look change** except where a task explicitly fixes a visible bug.

**Architecture:** Phase 1 (Tasks 1–4) fixes real defects: undefined font names that fall back to serif, mobile image over-fetch, heavy About-page assets, and dead theme assets. Phase 2 (Tasks 5–7) splits `brand.liquid` into topical `snippets/brand/*.liquid` partials rendered **inside one `{% style %}` block in source order**, so the emitted inline CSS is byte-for-byte equivalent and wins the cascade exactly as today.

**Tech Stack:** Shopify Horizon 3.5.1 theme (Liquid), Shopify CLI 4.x, Shopify Dev MCP validator, Playwright + headless Chromium for visual diff. No build step, no unit tests.

## Global Constraints

- **NEVER push or publish to the live theme `#147961872553`.** All pushes target draft `#151032561833` only.
- **Store permanent domain is `d9v1pv-06.myshopify.com`** — always use it with the CLI (never the vanity domain).
- **All work on `main`** — no feature branches (the draft tracks `main`).
- **Run the CLI from repo root with `--path theme`**; `--only` is a full-file replace, not a patch.
- **A new section/snippet *type* or a new setting needs two sequential pushes** (push the new `.liquid` first, verify, then push any JSON that references it).
- **Verify every push by pulling back and grepping** — never trust the success banner.
- **Add/move brand CSS only as inline `{% style %}` output, never `{% stylesheet %}`** (the latter bundles to an external file with different load timing and breaks the "renders after color-schemes → wins the cascade" guarantee; it also can't run `asset_url`).
- **Cart / checkout / add-to-cart logic, markup, and JS stay 100% untouched** (`cart-*.js`, `component-cart-*.js`, `header-actions.liquid`, `quick-add.liquid`, `buy-buttons.liquid`, `product-form.liquid` are pristine Horizon — keep them that way).
- **Forbidden colour combos (brand book p.39):** no blue-on-red, blue-on-green, green-on-black, black-on-green.
- **Validate Liquid edits with the Shopify Dev MCP** (`learn_shopify_api` api:liquid → `conversationId`, then `validate_theme` with the absolute path) before pushing.
- **The refactor tasks (5–7) must produce a pixel-identical screenshot diff** vs the pre-change baseline on home / collection / product / cart-drawer-open / search-modal-open at 1280px and 390px. Any visual diff = revert.

---

## Pre-flight: capture the visual baseline (do once, before Task 1)

This baseline is the ground truth every later screenshot diff compares against. Capture it from the **current** draft before any edit.

- [ ] **Step P.1: Set preview cookie + screenshot the five states at both viewports**

Use the QA harness in `/tmp/bfc-qa/` (Playwright resolves `playwright-core` from `/tmp/node_modules`, Chromium from the `ms-playwright` cache). Visit `https://d9v1pv-06.myshopify.com?preview_theme_id=151032561833` once to set the cookie, then for each viewport in {1280×800, 390×844} capture:
- home `/`
- a collection page (e.g. `/collections/all`)
- a product page (any PDP from `/products.json`)
- cart drawer open (POST `/cart/add.js` `{items:[{id:<variantId>,quantity:1}]}` with a variant id from `/products.json`, then click the cart trigger)
- search modal open (click the search trigger)

Scroll each page fully before the shot so `loading="lazy"` images render.

Save to `/tmp/bfc-qa/baseline/<state>_<vw>.png`.

Expected: 10 baseline PNGs written.

---

## Task 1: Alias the legacy font names so brand headings stop falling back to serif

**Problem:** `index.json`, `page.reports.json`, `page.review-page.json`, and `sections/lab-report-hero.liquid` set `font-family` to names that **no `@font-face` defines** — `OPTICopperplate-Light` / `OPTICopperplate-light`, `CopperplateCC-Bold`, and `flagfies-regular`. These silently resolve to the generic serif fallback, so those headings render in the wrong font instead of Copperplate / Flagflies. Fix centrally by aliasing those names to the existing brand font files in `brand.liquid` (the same pattern already used for the `Aesthet-Nova-*` aliases at `brand.liquid:30-51`). This is the lowest-risk fix and touches one file.

**Files:**
- Modify: `theme/snippets/brand.liquid` (insert new `@font-face` aliases immediately after the Copperplate `@font-face` group ending at line 72, and after the Flagflies block at line 79)

**Interfaces:**
- Consumes: existing font assets `Copperplate-Light.woff2/.otf`, `Copperplate-Heavy.woff2/.otf`, `Flagflies.woff2/.ttf` (already in `theme/assets/`).
- Produces: three new font-family aliases (`OPTICopperplate-Light`, `CopperplateCC-Bold`, `flagfies-regular`) usable by name from any section/template CSS.

- [ ] **Step 1.1: Confirm the exact legacy names and their intent**

Run: `grep -rniE "OPTICopperplate|CopperplateCC|flagfies" theme/sections theme/templates --include='*.liquid' --include='*.json'`
Expected: matches in `index.json`, `page.reports.json`, `page.review-page.json`, `lab-report-hero.liquid`. Note that `OPTICopperplate-Light` and `OPTICopperplate-light` differ only in case — CSS font-family matching is case-insensitive for the generic match but `@font-face` family names are matched case-insensitively by browsers, so one alias covers both. `CopperplateCC-Bold` wants a heavy Copperplate; `flagfies-regular` is a typo for the Flagflies charm face.

- [ ] **Step 1.2: Add the alias `@font-face` rules in `brand.liquid`**

Insert after the existing Copperplate group (after line 72, before the Flagflies block):

```liquid
  /* Legacy Copperplate aliases used by name in custom_liquid (reports table,
     reviews page, index hero, lab-report hero). Map them to the brand
     Copperplate files so those headings render in Copperplate, not the serif
     fallback. font-family matching is case-insensitive, so -Light covers
     -light too. */
  @font-face {
    font-family: "OPTICopperplate-Light";
    src: url({{ 'Copperplate-Light.woff2' | asset_url }}) format("woff2"), url({{ 'Copperplate-Light.otf' | asset_url }}) format("opentype");
    font-weight: 300 500;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: "CopperplateCC-Bold";
    src: url({{ 'Copperplate-Heavy.woff2' | asset_url }}) format("woff2"), url({{ 'Copperplate-Heavy.otf' | asset_url }}) format("opentype");
    font-weight: 600 900;
    font-style: normal;
    font-display: swap;
  }
```

Insert after the Flagflies `@font-face` block (after line 79):

```liquid
  /* Legacy Flagflies alias (typo'd name used in lab-report-hero.liquid). */
  @font-face {
    font-family: "flagfies-regular";
    src: url({{ 'Flagflies.woff2' | asset_url }}) format("woff2"), url({{ 'Flagflies.ttf' | asset_url }}) format("truetype");
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
```

- [ ] **Step 1.3: Validate with the Shopify Dev MCP**

Call `learn_shopify_api` (api: `liquid`) to get a `conversationId`, then `validate_theme` with the absolute path `/Users/saimeda/Documents/Codex/medas/BFC/theme` and file `snippets/brand.liquid`.
Expected: no new errors (the 5 `JSONMissingBlock` app-block errors and `ValidScopedCSSClass` warnings are known false positives).

- [ ] **Step 1.4: Push only `brand.liquid` to the draft**

```bash
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 \
  --nodelete --only snippets/brand.liquid
```

- [ ] **Step 1.5: Verify the push landed (pull back + grep)**

```bash
mkdir -p /tmp/bfc-verify
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com \
  --theme 151032561833 --only snippets/brand.liquid
grep -c 'OPTICopperplate-Light\|CopperplateCC-Bold\|flagfies-regular' /tmp/bfc-verify/snippets/brand.liquid
```
Expected: `3` (the three new alias family names present server-side).

- [ ] **Step 1.6: Visual verification — these headings SHOULD change (defect fix)**

Re-screenshot home, `/pages/reports` (or `?view=reports`), and `/pages/review-page` at 1280 + 390. Compare against baseline: the affected headings should now render in **Copperplate / Flagflies** instead of serif. This is an intended visual change — confirm it matches the static-site intent (`site/`), not pixel-identity.

- [ ] **Step 1.7: Commit**

```bash
git add theme/snippets/brand.liquid
git commit -m "fix(fonts): alias legacy Copperplate/Flagflies names so headings stop falling back to serif

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Stop product-card images over-fetching on mobile

**Problem:** `snippets/card-gallery.liquid:42` hardcodes the mobile `sizes` slot to `100vw` while deriving the desktop slot from `section.settings.columns`. On the homepage 2-up grid (`mobile_columns:2`) and collection grids, the browser fetches a ~832px candidate for a ~416px slot — roughly double the bytes per card image on mobile.

**Files:**
- Modify: `theme/snippets/card-gallery.liquid:40-43`

**Interfaces:**
- Consumes: `section.settings.columns` (existing), `section.settings.mobile_columns` (existing, e.g. `"2"` on the homepage Shop grid, `"1"` on the carousel grid).
- Produces: a mobile-aware `image_sizes` string for the `elsif` branch.

- [ ] **Step 2.1: Read the current branch**

Run: `sed -n '30,45p' theme/snippets/card-gallery.liquid`
Expected: the `elsif section.settings.columns and section.settings.layout_type != 'editorial'` branch assigning `'(min-width: 750px) [viewport_width]vw, 100vw'`.

- [ ] **Step 2.2: Derive the mobile vw from `mobile_columns`**

Replace the `elsif` branch body (lines 41-43) with:

```liquid
    assign viewport_width = 100.0 | divided_by: section.settings.columns
    assign mobile_columns = section.settings.mobile_columns | default: 1 | plus: 0
    assign mobile_viewport_width = 100.0 | divided_by: mobile_columns
    assign sizes_attribute = '(min-width: 750px) [viewport_width]vw, [mobile_viewport_width]vw' | replace: '[viewport_width]', viewport_width | replace: '[mobile_viewport_width]', mobile_viewport_width
    assign image_sizes = sizes_attribute | strip
```

Rationale: `mobile_columns` defaults to `1` when unset → `100vw` (unchanged, safe). A 2-up grid → `50vw`. `| plus: 0` coerces the setting (often a string like `"2"`) to a number for `divided_by`.

- [ ] **Step 2.3: Validate with the Shopify Dev MCP**

Reuse the `conversationId`; `validate_theme` for `snippets/card-gallery.liquid`.
Expected: no new errors.

- [ ] **Step 2.4: Push + verify**

```bash
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 \
  --nodelete --only snippets/card-gallery.liquid
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com \
  --theme 151032561833 --only snippets/card-gallery.liquid
grep -n 'mobile_viewport_width' /tmp/bfc-verify/snippets/card-gallery.liquid
```
Expected: the new `mobile_viewport_width` lines present.

- [ ] **Step 2.5: Verify in-browser the emitted `sizes` shrank (no layout change)**

On the draft homepage at 390px, read a product-card `<img>`'s `sizes` attribute: it should now read `(min-width: 750px) 25vw, 50vw` for the 4-col / 2-mobile grid (was `…, 100vw`). The rendered layout must be **identical** to baseline — only the fetched candidate changes. Diff the home screenshots at 1280 + 390 against baseline → expect pixel-identical.

- [ ] **Step 2.6: Commit**

```bash
git add theme/snippets/card-gallery.liquid
git commit -m "perf(cards): derive mobile image sizes from mobile_columns (was hardcoded 100vw)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Compress the heavy About-page assets

**Problem:** `about-advisor.jpg` (344K), `about-founders.jpg` (164K), and `about-logo-web.png` (124K) are referenced via `asset_url` (so Shopify cannot CDN-resize them) and load on the About page. They must be compressed at the source.

**Files:**
- Modify (replace bytes, same filenames): `theme/assets/about-advisor.jpg`, `theme/assets/about-founders.jpg`, `theme/assets/about-logo-web.png`
- Reference (do not change markup): `sections/about-advisor.liquid`, `sections/about-story-intro.liquid`, `sections/about-story-field.liquid`

**Interfaces:**
- Consumes: nothing new.
- Produces: smaller files at the **same paths** so no `.liquid` reference changes (keep `loading`/`fetchpriority` as-is).

- [ ] **Step 3.1: Find the exact render context + intrinsic display size**

Run: `grep -rn 'about-advisor\|about-founders\|about-logo-web' theme/sections --include='*.liquid'`
Note each image's rendered CSS width so the target raster width is ~2× the largest display width (retina) and no more.

- [ ] **Step 3.2: Re-encode in place with `sips` (keep filename + format)**

For the JPGs (cap longest edge ~1400px, quality ~70):
```bash
sips -Z 1400 -s formatOptions 70 theme/assets/about-advisor.jpg --out theme/assets/about-advisor.jpg
sips -Z 1400 -s formatOptions 70 theme/assets/about-founders.jpg --out theme/assets/about-founders.jpg
```
For the PNG logo (cap to its display box; if it has no transparency it can stay PNG-8 or be re-saved smaller):
```bash
sips -Z 700 theme/assets/about-logo-web.png --out theme/assets/about-logo-web.png
```
Expected: `du -h` shows each file materially smaller (target: advisor < 120K, founders < 90K, logo < 60K). Verify visually it's still crisp at display size.

- [ ] **Step 3.3: Push the three assets + verify size landed**

```bash
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 \
  --nodelete --only assets/about-advisor.jpg --only assets/about-founders.jpg --only assets/about-logo-web.png
```
Then load the About page on the draft and confirm the three images still render correctly (no blur, correct aspect).

- [ ] **Step 3.4: Visual check + commit**

Screenshot the About page at 1280 + 390; confirm no visible quality regression vs the live About page.
```bash
git add theme/assets/about-advisor.jpg theme/assets/about-founders.jpg theme/assets/about-logo-web.png
git commit -m "perf(about): compress advisor/founders/logo assets (asset_url, not CDN-resizable)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Delete the unreferenced bundle JPGs

**Problem:** `bundle-fitness-essentials.jpg`, `bundle-immune-defense.jpg`, `bundle-inflammation-relief.jpg`, `bundle-relaxation-support.jpg` (552K total) have **zero references** in any `.liquid`/`.json` — only the `.webp` versions are used (verified in audit). Dead weight in the theme package.

**Files:**
- Delete: `theme/assets/bundle-fitness-essentials.jpg`, `theme/assets/bundle-immune-defense.jpg`, `theme/assets/bundle-inflammation-relief.jpg`, `theme/assets/bundle-relaxation-support.jpg`

- [ ] **Step 4.1: Re-confirm zero references before deleting**

```bash
for b in bundle-fitness-essentials bundle-immune-defense bundle-inflammation-relief bundle-relaxation-support; do
  echo "$b: $(grep -rl "$b.jpg" theme --include='*.liquid' --include='*.json' | wc -l | tr -d ' ') refs"
done
```
Expected: each `0 refs`. If any is non-zero, STOP and do not delete that file.

- [ ] **Step 4.2: Delete locally and push the deletion to the draft**

```bash
rm theme/assets/bundle-fitness-essentials.jpg theme/assets/bundle-immune-defense.jpg \
   theme/assets/bundle-inflammation-relief.jpg theme/assets/bundle-relaxation-support.jpg
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 \
  --only assets/bundle-fitness-essentials.jpg --only assets/bundle-immune-defense.jpg \
  --only assets/bundle-inflammation-relief.jpg --only assets/bundle-relaxation-support.jpg
```
(Note: omit `--nodelete` here so the push removes the files server-side.)

- [ ] **Step 4.3: Verify bundle cards still render + commit**

Load the homepage bundles section on the draft; the four cards must still show their `.webp` images. Diff home screenshots vs baseline → pixel-identical.
```bash
git add -A theme/assets/
git commit -m "chore(assets): remove 552K of unreferenced bundle JPGs (only WebP is used)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Prove the partial mechanism works (spike before splitting)

**Problem:** The split (Task 6) renders topical partials *inside* the one `{% style %}` block. We must confirm Shopify evaluates `{% render %}` inside `{% style %}` (and that `asset_url` still resolves inside the rendered partial) **before** restructuring the whole file. If it doesn't, the fallback is consecutive `{% style %}` blocks.

**Files:**
- Create: `theme/snippets/brand/_spike.liquid` (temporary; deleted at end of task)
- Modify (temporary): `theme/snippets/brand.liquid` (add one `{% render %}` line, then revert)

**Interfaces:**
- Produces: a verified answer — "render-in-style works" (Task 6 uses `{% render %}`) or "it does not" (Task 6 uses consecutive `{% style %}` blocks).

- [ ] **Step 5.1: Create a trivial CSS partial that uses `asset_url`**

`theme/snippets/brand/_spike.liquid`:
```liquid
.bfc-spike-probe { --probe: url({{ 'Flagflies.woff2' | asset_url }}); }
```

- [ ] **Step 5.2: Render it inside the existing `{% style %}` block**

In `brand.liquid`, add `{%- render 'brand/_spike' -%}` on its own line just before `{% endstyle %}` (line 976).

- [ ] **Step 5.3: Validate + push + pull back + grep the EMITTED head**

Validate via Dev MCP. Push `brand.liquid` + `snippets/brand/_spike.liquid` (two-push: push the partial first, then `brand.liquid`). Then fetch the rendered homepage `<head>` and confirm the probe CSS appears with a resolved CDN font URL:
```bash
curl -s 'https://d9v1pv-06.myshopify.com/?preview_theme_id=151032561833' | grep -o 'bfc-spike-probe[^}]*}' | head
```
Expected: the rule is present AND `--probe: url(//…cdn.shopify.com/…Flagflies.woff2…)` is a resolved absolute URL (not the literal `{{ ... }}`).
- If present + resolved → **render-in-style works.** Task 6 uses `{% render %}`.
- If absent or unresolved → Task 6 uses consecutive `{% style %}` blocks instead.

- [ ] **Step 5.4: Revert the spike (leave `brand.liquid` exactly as it was)**

Remove the `{%- render 'brand/_spike' -%}` line, delete `theme/snippets/brand/_spike.liquid`, push the reverted `brand.liquid` and delete the partial server-side. Confirm `git diff theme/snippets/brand.liquid` is empty.

- [ ] **Step 5.5: Record the verdict**

Write the verdict (works / fallback) into this plan file under Task 6's note, so the implementer of Task 6 knows which mechanism to use. No commit needed (no net file change).

---

## Task 6: Split `brand.liquid` into ordered topical partials

**Problem:** `brand.liquid` is one 1004-line file. Split it into navigable partials **in the current source order** so the emitted inline CSS is identical. Mechanism is decided by Task 5.

**Files:**
- Create: `theme/snippets/brand/fonts-and-tokens.liquid`, `theme/snippets/brand/utilities.liquid`, `theme/snippets/brand/header-nav.liquid`, `theme/snippets/brand/announcement.liquid`, `theme/snippets/brand/a11y.liquid`, `theme/snippets/brand/product-cards.liquid`, `theme/snippets/brand/cart-search.liquid`, `theme/snippets/brand/page-headings.liquid`
- Modify: `theme/snippets/brand.liquid` (becomes the orchestrator)

**Interfaces:**
- Consumes: the exact CSS currently in `brand.liquid` (move verbatim, do not edit rules).
- Produces: 8 partials, each holding one commented section of the current file, plus a slimmed `brand.liquid` that renders them in order and keeps the marquee `<script>`.

**Partial boundaries (by current line ranges in `brand.liquid`):**
- `fonts-and-tokens` ← lines 9–143 (all `@font-face` incl. Task 1 aliases + the `:root` block)
- `utilities` ← lines 145–193 (`.bfc-kicker/.bfc-caps/.bfc-script/.bfc-btn`)
- `header-nav` ← lines 195–282 (nav legibility, logo, sticky/transparent/submenu)
- `announcement` ← lines 284–366 (promo bar + marquee CSS + keyframes)
- `a11y` ← lines 383–396 (focus ring, heading wrap)
- `product-cards` ← lines 398–444 + 729–838 (the `.product-card` reskin AND the retro-oval pill / `bfc-card-*` — they're the card commerce styling)
- `cart-search` ← lines 446–727 (cart bubble, CTAs, drawer, totals, empty states, search modal, focus rings, touch targets)
- `page-headings` ← lines 840–975 (homepage headings, stars, bundles/judge.me titles, collection-page reskin)

> **Mechanism note (filled by Task 5):** _<works → use `{% render %}` inside one `{% style %}`>_ / _<fallback → use consecutive `{% style %}` blocks>_.

- [ ] **Step 6.1: Create each partial with the verbatim CSS from its line range**

For each partial file, copy the **exact** CSS text (no rule edits, no reordering within the range). Example for `theme/snippets/brand/utilities.liquid`:

```liquid
  /* ── Brand utility classes (shared by our custom sections) ──────────── */
  .bfc-kicker { /* …verbatim lines 146-155… */ }
  /* …through line 193 (.bfc-btn--light)… */
```

Repeat for all 8 partials, preserving the leading section comment of each block.

- [ ] **Step 6.2: Rewrite `brand.liquid` as the orchestrator**

If render-in-style works (Task 5 verdict):
```liquid
{% comment %} Boring Foods brand layer — split into snippets/brand/* partials.
   One inline {% style %} block, rendered after color-schemes in theme.liquid,
   so it wins the cascade exactly as the prior monolith did. {% endcomment %}
{% style %}
  {%- render 'brand/fonts-and-tokens' -%}
  {%- render 'brand/utilities' -%}
  {%- render 'brand/header-nav' -%}
  {%- render 'brand/announcement' -%}
  {%- render 'brand/a11y' -%}
  {%- render 'brand/product-cards' -%}
  {%- render 'brand/cart-search' -%}
  {%- render 'brand/page-headings' -%}
{% endstyle %}

{# marquee <script> unchanged — copy lines 978-1004 verbatim #}
```

If fallback (consecutive `{% style %}` blocks): wrap each `{%- render … -%}` in its own `{% style %}…{% endstyle %}` pair, keeping the same order.

- [ ] **Step 6.3: Diff the concatenated partials against the original to prove no CSS was lost**

```bash
git show HEAD:theme/snippets/brand.liquid > /tmp/brand-before.liquid
# Manually concatenate the 8 partials in order into /tmp/brand-after-css.txt and
# diff the CSS bodies (ignoring the wrapping tags) — must be identical sets of rules.
```
Expected: no rule added, removed, or reordered.

- [ ] **Step 6.4: Validate all 9 files via Dev MCP**

`validate_theme` with `snippets/brand.liquid` and the 8 `snippets/brand/*.liquid`.
Expected: no new errors.

- [ ] **Step 6.5: Two-push sequence**

Push the 8 new partials FIRST (new snippet types must exist server-side), verify by pull-back, THEN push the rewritten `brand.liquid`:
```bash
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete \
  --only snippets/brand/fonts-and-tokens.liquid --only snippets/brand/utilities.liquid \
  --only snippets/brand/header-nav.liquid --only snippets/brand/announcement.liquid \
  --only snippets/brand/a11y.liquid --only snippets/brand/product-cards.liquid \
  --only snippets/brand/cart-search.liquid --only snippets/brand/page-headings.liquid
# verify, then:
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 \
  --nodelete --only snippets/brand.liquid
```

- [ ] **Step 6.6: THE GATE — pixel-identical screenshot diff**

Re-screenshot all five states × two viewports and diff against `/tmp/bfc-qa/baseline/` (which already reflects Tasks 1–4). **Every pair must be pixel-identical.** Any diff → revert `brand.liquid` to the monolith and investigate before retrying.

- [ ] **Step 6.7: Commit**

```bash
git add theme/snippets/brand.liquid theme/snippets/brand/
git commit -m "refactor(brand): split brand.liquid into ordered brand/* partials (no visual change)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Update CLAUDE.md to document the new structure

**Problem:** CLAUDE.md describes `brand.liquid` as "one snippet." After Task 6 it's an orchestrator + 8 partials. Future sessions must know the partial layout and that the cascade order lives in `brand.liquid`'s render list.

**Files:**
- Modify: `CLAUDE.md` (the "Architecture of the reskin" section)

- [ ] **Step 7.1: Update the brand-layer description**

Edit the paragraph that says the brand layer "is one snippet" to describe `brand.liquid` as a thin orchestrator that renders `snippets/brand/*` partials in cascade order inside one inline `{% style %}` block, and list the 8 partials with their responsibilities. Keep the existing warnings (`{% style %}` vs `{% stylesheet %}`, render-after-color-schemes).

- [ ] **Step 7.2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: describe brand.liquid orchestrator + brand/* partial layout

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (completed by plan author)

**Spec coverage:** All five audited defects are covered — undefined fonts (Task 1), mobile over-fetch (Task 2), heavy About assets (Task 3), dead JPGs (Task 4), monolith split (Tasks 5–6), docs (Task 7). ✅

**Placeholder scan:** One intentional fill-in — the Task 5 verdict feeds Task 6's mechanism note; that is a deliberate spike→decision handoff, not a TODO. All code steps contain real code. ✅

**Consistency:** Partial names in Task 6's `{% render %}` list match the Create file list exactly (`fonts-and-tokens`, `utilities`, `header-nav`, `announcement`, `a11y`, `product-cards`, `cart-search`, `page-headings`). Line ranges sum to the full file minus the marquee script. ✅

**Risk note:** Tasks 1 and 3 are the only ones that *intentionally* change pixels (font fix, image recompress). Tasks 2, 4, 6 must be pixel-identical to baseline. The cart/checkout path is never touched in any task.
