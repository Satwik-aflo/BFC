# Home-page & Mobile Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement
> this plan task-by-task (inline execution chosen). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fix five visual defects on the BFC Horizon reskin home page (header-logo spacing,
mobile logo/nav overlap, duplicate heading, ribbon overlap, judge.me review spacing) on draft
theme `#151032561833`, purely additively.

**Architecture:** Edits live in the brand-override layer (`snippets/brand.liquid`), two brand
sections (`boringly-clean-pure.liquid`, `bfc-hero.liquid`), the header section group
(`header-group.json`), and the home template (`templates/index.json`). No pristine Horizon core
section/block is touched. "Tests" in this domain = Shopify Dev MCP validation + pull-back grep +
Playwright screenshots/DOM probes at mobile 390 & desktop 1280 vs the broken baselines, + axe-core.

**Tech Stack:** Shopify Horizon 3.5.1 Liquid/JSON; Shopify CLI (`--path theme`); Playwright +
headless Chromium + axe-core in `/tmp/bfc-qa`; Shopify Dev MCP validator.

**Spec:** `docs/superpowers/specs/2026-06-17-home-mobile-fixes-design.md`

---

## Guardrails (apply to every task)

- Draft theme **`#151032561833`** only. **Never** push/publish the live theme.
- Always `--path theme`; push only touched files (`--only`, `--nodelete`).
- Verify each push by pulling the file back and grepping — never trust the success banner.
- `index.json` app-block validator errors (instafeed, judge.me) are known false positives.

## File responsibilities

| File | Issue(s) | Responsibility |
|------|----------|----------------|
| `theme/snippets/brand.liquid` | 2, 4b, 9 | header-logo breathing room; hide inline nav on mobile; jdgm mobile height-collapse |
| `theme/sections/header-group.json` | 4a | `hide_logo_on_home_page: true` |
| `theme/sections/bfc-hero.liquid` | 4c | mobile hero top-spacing nudge (only if a residual overlap remains) |
| `theme/sections/boringly-clean-pure.liquid` | 8 | mobile padding / badge offset so ribbon clears body |
| `theme/templates/index.json` | 7 | remove standalone heading section; restyle grid header to Copperplate |

Local commits are granular (one per task). A **single combined push** of all touched files +
comprehensive visual QA happens in Task 6 (these five changes are independent, and Shopify pushes
are slow — batching one push cycle is efficient; pull-back grep still confirms each file landed).

---

### Task 1: Header logo breathing room (Issue 2)

**Files:**
- Modify: `theme/snippets/brand.liquid` (header-logo block, around lines 216–223)

- [ ] **Step 1: Read the current rule**

The existing rule is:
```css
  .header-logo__image {
    height: clamp(48px, 4vw, 58px) !important;
    width: auto !important;
    max-width: none;
  }
  .header__column--center .menu-list { gap: clamp(1.8rem, 2.6vw, 2.4rem); }
```
Confirm it's still present before editing (it lives just after the nav-legibility block).

- [ ] **Step 2: Add a top gap so the logo doesn't touch the promo bar**

Insert immediately after the `.header-logo__image` rule:
```css
  /* Issue 2: the compact header packs the logo flush against the promo bar.
     Give the header's top row a little vertical breathing room so the logo
     (and nav) sit a few px below the announcement bar, on every page. */
  .header__row--top { padding-block-start: 6px; }
```

- [ ] **Step 3: Verify (visual)** — covered by the combined push + screenshot in Task 6.
  Acceptance: on desktop 1280 the header logo has a visible gap above it (not touching the
  purple promo bar). If 6px is too small/large, tune to 4–10px and re-screenshot.

- [ ] **Step 4: Commit**

```bash
git add theme/snippets/brand.liquid
git commit -m "fix(header): add breathing room so logo doesn't touch promo bar (#2)"
```

---

### Task 2: Mobile logo overlap + inline nav (Issue 4)

**Files:**
- Modify: `theme/sections/header-group.json` (`_header-logo` block settings)
- Modify: `theme/snippets/brand.liquid` (new mobile media rule)
- Modify (conditional): `theme/sections/bfc-hero.liquid` (mobile top padding)

- [ ] **Step 1: Hide the header logo on the home page (4a)**

In `theme/sections/header-group.json`, find the `_header-logo` block:
```json
    "header-logo": {
     "type": "_header-logo",
     "static": true,
     "settings": {
      "hide_logo_on_home_page": false,
```
Change `false` → `true`:
```json
      "hide_logo_on_home_page": true,
```
(Horizon's core `_header-logo.liquid` already re-shows it once the `sticky='always'` header is
scrolled — no code change needed for the return-on-scroll behavior.)

- [ ] **Step 2: Hide the inline navigation-bar row on mobile (4b)**

In `theme/snippets/brand.liquid`, add (near the nav-legibility block, before the announcement-bar
section):
```css
  /* Issue 4: the navigation-bar second row (.header__navigation-bar-row →
     .menu-list--mobile) renders the menu inline on mobile and lands on top of
     the hero. Hide it on mobile so the menu lives only in the hamburger drawer;
     the top row keeps the hamburger, search, account and cart. */
  @media (max-width: 749px) {
    .header__navigation-bar-row { display: none !important; }
  }
```

- [ ] **Step 3: Commit the logo + nav changes**

```bash
git add theme/sections/header-group.json theme/snippets/brand.liquid
git commit -m "fix(header): hide home logo (returns on scroll) + drop inline nav on mobile (#4)"
```

- [ ] **Step 4: Conditional hero clearance (4c) — decide AFTER the Task 6 screenshot**

After the combined push, look at mobile 390 home. Once the header logo is hidden and the inline
nav row is gone, the hero's big logo should sit centered with only the corner icons (hamburger /
search / account / cart) in the bar. **If** the hero logo still overlaps the icon row, bump the
hero's mobile top padding in `theme/sections/bfc-hero.liquid` — the current rule is:
```css
  .bfc-hero { min-height: 100svh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; position: relative; padding: 7rem var(--gutter) 8rem; color: var(--kulfi-malai); overflow: hidden; }
```
Add a mobile override at the end of the `{% stylesheet %}` block:
```css
  @media (max-width: 749px) { .bfc-hero { padding-top: 9rem; } }
```
Then commit:
```bash
git add theme/sections/bfc-hero.liquid
git commit -m "fix(hero): add mobile top clearance below header icons (#4)"
```
If there is no residual overlap, skip this step and note "no hero change needed" in the report.

---

### Task 3: De-duplicate the "Boring Foods Your Way" heading (Issue 7)

**Files:**
- Modify: `theme/templates/index.json` (remove `section_pemmFU`; restyle `product_list_wE8meU`
  → `static-header` → `text_djKiBH`)

- [ ] **Step 1: Remove the standalone heading section**

In `theme/templates/index.json`:
- Delete the entire `"section_pemmFU": { … }` object from the `"sections"` map.
- Remove the string `"section_pemmFU"` from the `"order"` array (it currently sits between
  `"custom_liquid_CjPRme"` and `"product_list_wE8meU"`).

- [ ] **Step 2: Restyle the product grid's own header to Copperplate**

Still in `index.json`, under
`sections.product_list_wE8meU.blocks["static-header"].blocks.text_djKiBH.settings`, change from:
```json
        "text": "<h3>Boring Foods your way</h3>",
        ...
        "type_preset": "rte",
        "font": "var(--font-body--family)",
        "font_size": "1rem",
        "line_height": "normal",
        ...
        "case": "none",
```
to (mirroring the removed standalone block's brand styling, matching its copy + casing):
```json
        "text": "<h2>Boring Foods, Your Way</h2>",
        ...
        "type_preset": "rte",
        "font": "var(--font-heading--family)",
        "font_size": "var(--text-2xl)",
        "line_height": "tight",
        ...
        "case": "uppercase",
```
Leave the other keys (`width`, `alignment`, `color`, paddings) as-is.

- [ ] **Step 3: Validate JSON parses**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC/theme && python3 -c "import json,re;json.loads(re.sub(r'/\*.*?\*/','',open('templates/index.json').read(),flags=re.S));print('index.json OK')"
```
Expected: `index.json OK`. Also confirm `section_pemmFU` is gone:
```bash
grep -c section_pemmFU theme/templates/index.json   # expect 0
```

- [ ] **Step 4: Commit**

```bash
git add theme/templates/index.json
git commit -m "fix(home): remove duplicate heading; restyle grid header to Copperplate (#7)"
```

---

### Task 4: "Boringly Clean & Pure" ribbon overlap on mobile (Issue 8)

**Files:**
- Modify: `theme/sections/boringly-clean-pure.liquid` (the `@media (max-width: 768px)` block in
  the inline `<style>`, around lines 261–298)

- [ ] **Step 1: Increase the text-blob top padding on mobile so it clears the ribbon**

The current mobile rule is:
```css
      .bc-section__text-blob {
        padding: 70px 30px 50px 30px;
        min-height: auto;
      }
```
The absolutely-positioned badge (`.bc-section__badge-container { top: -30px }`) overlaps the body
because 70px of top padding isn't enough. Increase it:
```css
      .bc-section__text-blob {
        padding: 120px 30px 50px 30px;
        min-height: auto;
      }
```

- [ ] **Step 2: Verify (visual)** — covered by Task 6 (mobile 390 + the 768 breakpoint).
  Acceptance: the purple ribbon + "BORINGLY CLEAN & PURE" text sit clear above the body copy at
  390px and at 768px; no overlap. If 120px is too much/little, tune in the 90–140px range.

- [ ] **Step 3: Commit**

```bash
git add theme/sections/boringly-clean-pure.liquid
git commit -m "fix(boringly-clean): clear ribbon off body copy on mobile (#8)"
```

---

### Task 5: judge.me review carousel — collapse height on mobile (Issue 9)

**Files:**
- Modify: `theme/snippets/brand.liquid` (new mobile media rule for judge.me)

- [ ] **Step 1: Add a mobile height-collapse for the carousel**

In `theme/snippets/brand.liquid`, add a brand-layer rule (place it after the announcement-bar
block, with the other component overrides):
```css
  /* Issue 9: the judge.me featured carousel forces each slide to a fixed
     height (~200px) and stretches the review body to the tallest review, so the
     reviewer name is stranded far below short reviews and each slide carries
     dead space (long mobile scroll). On mobile, collapse the slide + review to
     natural content height so reviews are compact and the name sits directly
     under the text. Desktop keeps equal heights for its side-by-side reviews.
     `!important` beats judge.me's non-important inline heights. */
  @media (max-width: 749px) {
    .jdgm-carousel-item,
    .jdgm-carousel-item__review {
      height: auto !important;
      min-height: 0 !important;
    }
  }
```

- [ ] **Step 2: Verify (visual)** — covered by Task 6 (mobile 390, judge.me section).
  Acceptance: the reviewer name sits directly under the review text (no big gap), the section is
  materially shorter, and the carousel still advances with the ‹ › arrows. Desktop 1280 carousel
  is unchanged.

- [ ] **Step 3: Commit**

```bash
git add theme/snippets/brand.liquid
git commit -m "fix(reviews): collapse judge.me carousel height on mobile (#9)"
```

---

### Task 6: Combined push + full visual QA

**Files:** none edited (push + verification only).

- [ ] **Step 1: Validate the changed Liquid/JSON with the Shopify Dev MCP**

`learn_shopify_api` (api: `liquid`) → reuse/obtain a `conversationId`, then `validate_theme` with
the absolute theme path and the changed files. Treat instafeed/judge.me app-block errors in
`index.json` as known false positives; everything else must pass.

- [ ] **Step 2: Push only the touched files to the draft theme**

```bash
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete \
  --only snippets/brand.liquid \
  --only sections/header-group.json \
  --only sections/boringly-clean-pure.liquid \
  --only templates/index.json
```
(Add `--only sections/bfc-hero.liquid` if Task 2 Step 4 was applied.)

- [ ] **Step 3: Verify each file landed (pull-back + grep, never trust the banner)**

```bash
mkdir -p /tmp/bfc-verify
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com --theme 151032561833 \
  --only snippets/brand.liquid --only sections/header-group.json \
  --only sections/boringly-clean-pure.liquid --only templates/index.json
grep -c "header__navigation-bar-row" /tmp/bfc-verify/snippets/brand.liquid   # expect >=1
grep -c "jdgm-carousel-item__review" /tmp/bfc-verify/snippets/brand.liquid   # expect >=1
grep -c '"hide_logo_on_home_page": true' /tmp/bfc-verify/sections/header-group.json  # expect 1
grep -c "section_pemmFU" /tmp/bfc-verify/templates/index.json                 # expect 0
grep -c "120px 30px 50px 30px" /tmp/bfc-verify/sections/boringly-clean-pure.liquid   # expect 1
```

- [ ] **Step 4: Screenshot QA (mobile 390 + desktop 1280)**

Run the issue probe to capture the home top at both viewports, then inspect:
```bash
cd /tmp/bfc-qa && NODE_PATH=/tmp/node_modules node issue_probe.mjs
```
Plus the judge.me + boringly-clean sections (reuse `jdgm_probe.mjs`; add a boringly-clean shot).
Acceptance checklist (compare to the broken baselines `probe_desktop_top.png` /
`probe_mobile_top.png` / `probe_jdgm_mobile.png`):
  1. Desktop: header logo not touching the promo bar.
  2. Mobile home: exactly ONE logo at the top (hero's); no inline nav over the hero.
  3. Scroll mobile/desktop home down: the compact header logo reappears in the solid header.
  4. Exactly one Copperplate "Boring Foods, Your Way" heading above the grid; no orange dup.
  5. "Boringly Clean & Pure" ribbon clear of the body copy at 390 and 768.
  6. judge.me on mobile: name under text, compact; carousel still swipes; desktop unchanged.

- [ ] **Step 5: axe-core regression check on the home page**

Re-run the home-page axe scan (reuse the scan in `/tmp/bfc-qa/mobile_qa.mjs` or a focused
`axeScan` on `/`). Expected: no new color-contrast or landmark violations vs the prior pass.

- [ ] **Step 6: Confirm interactive bits**

Open the mobile hamburger drawer (tap the toggle) and confirm the menu (Home/Shop/etc.) appears
and cart + search are reachable; confirm the header logo link still navigates home.

- [ ] **Step 7: Final report**

Summarize what changed, paste the acceptance results, and note whether the conditional hero
change (Task 2 Step 4) was applied. Do **not** merge or push to main unless the user asks.

---

## Self-review

**Spec coverage:** Issue 2 → Task 1. Issue 4a/4b/4c → Task 2. Issue 7 → Task 3. Issue 8 → Task 4.
Issue 9 → Task 5. Verification plan + success criteria → Task 6. All spec items covered.

**Placeholder scan:** No TBD/TODO; every code step shows concrete CSS/JSON and the exact target
location. CSS tuning ranges (Task 1 4–10px, Task 4 90–140px) are given with a concrete starting
value + a visual acceptance test, which is the correct form for pixel tuning.

**Consistency:** Selector `.header__navigation-bar-row` (Task 2) matches the probed DOM chain.
`hide_logo_on_home_page` (Task 2) matches the `_header-logo` schema key. `text_djKiBH` /
`section_pemmFU` / `product_list_wE8meU` / `static-header` (Task 3) match `index.json`. judge.me
selectors `.jdgm-carousel-item` / `.jdgm-carousel-item__review` (Task 5) match the probed DOM.
