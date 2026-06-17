# Reports Page Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `/pages/reports` closer to the static redesign by adding the Safety/Efficacy pillars, reordering the table rows, and removing the redundant `main-page` section — keeping the existing stamp hero, table, and CTA styling.

**Architecture:** Single edit to `theme/templates/page.reports.json`. Add a new `custom-liquid` section (pillars) between hero and table, reorder the four table rows inside the existing reports custom-liquid, and drop the `main` section from both `sections` and `order`. No new section type or schema setting, so a single surgical push suffices.

**Tech Stack:** Shopify Horizon 3.5.1 Liquid theme, `custom-liquid` sections, Shopify CLI, Dev MCP validator.

## Global Constraints

- All work on `main`; commit straight to `main`.
- Edit only `theme/templates/page.reports.json`.
- Push surgically: `--only templates/page.reports.json`, `--path theme`, `--store d9v1pv-06.myshopify.com`, `--theme 151032561833 --nodelete`. Never touch the live theme.
- Brand fonts/colors: Kulfi Malai `#FBF3CC`, Indian Blue `#5D57C5`, Ripe Orange/dark `#C2390F`, Neem Green `#244F24`, Mango Yellow `#F9BF29`. Pillar fonts: Copperplate headings (`OPTICopperplate`/`CopperplateCC-Bold`), Aesthet-Nova body — matching the existing table custom-liquid styles.
- Do NOT add an `<h1>` (Horizon header already emits the page `<h1>`).
- Verify the push by pulling back + grep. Final visual check is the user's (Playwright QA skipped at user request).

---

### Task 1: Edit page.reports.json — add pillars, reorder table, remove main

**Files:**
- Modify: `theme/templates/page.reports.json`

**Interfaces:**
- Produces: a new section key `custom_liquid_pillars` (type `custom-liquid`) placed in `order` between `lab_report_hero_qaGwTY` and `custom_liquid_LMhwHG`. Removes section key `main`.

- [ ] **Step 1: Add the pillars custom-liquid section**

Add this section object to `"sections"` in `theme/templates/page.reports.json`:

```json
"custom_liquid_pillars": {
  "type": "custom-liquid",
  "name": "Safety & Efficacy Pillars",
  "settings": {
    "custom_liquid": "<div class=\"bfc-report-pillars\">\n  <div class=\"bfc-report-pillar\">\n    <h3>Safety</h3>\n    <p>We test for heavy metals and contaminants, so you know exactly what you&rsquo;re putting in your body is pure.</p>\n  </div>\n  <div class=\"bfc-report-pillar\">\n    <h3>Efficacy</h3>\n    <p>We verify the active components that actually matter &mdash; like curcumin in turmeric and withanolides in ashwagandha &mdash; so potency isn&rsquo;t just a claim on the pack.</p>\n  </div>\n</div>\n<style>\n  .bfc-report-pillars { background-color: #FBF3CC; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; max-width: 72rem; margin: 0 auto; padding: 1.5rem 1.25rem 2.5rem; }\n  .bfc-report-pillar h3 { font-family: 'OPTICopperplate-Heavy', 'CopperplateCC-Bold', serif; text-transform: uppercase; letter-spacing: 0.06em; font-size: 22px; color: #244F24; margin: 0 0 0.6rem; }\n  .bfc-report-pillar p { font-family: 'Aesthet-Nova', sans-serif; font-size: 16px; line-height: 1.55; color: #000; margin: 0; }\n  @media (max-width: 720px) { .bfc-report-pillars { grid-template-columns: 1fr; gap: 1.25rem; padding: 1rem 1.25rem 2rem; text-align: center; } }\n</style>",
    "color_scheme": "scheme-1",
    "section_width": "full-width",
    "padding-block-start": 0,
    "padding-block-end": 0
  }
},
```

- [ ] **Step 2: Reorder the four table rows in `custom_liquid_LMhwHG`**

In the `custom_liquid` string of `custom_liquid_LMhwHG`, reorder the `<tr>` blocks so the sequence is **Lakadong Turmeric → Karimunda Black Pepper → Moringa → Ashwagandha** (matching the static page). Keep each row's exact cell content/links unchanged — only move the Ashwagandha row from first to last and Turmeric from last to first.

- [ ] **Step 3: Remove the `main` section**

Delete the entire `"main": { ... }` object from `"sections"`.

- [ ] **Step 4: Update the `order` array**

Set `"order"` to:

```json
"order": [
  "lab_report_hero_qaGwTY",
  "custom_liquid_pillars",
  "custom_liquid_LMhwHG",
  "custom_liquid_reports_cta"
]
```

- [ ] **Step 5: Validate with Dev MCP**

Call `learn_shopify_api` (api: `liquid`) for a `conversationId`, then `validate_theme` with the absolute path and `templates/page.reports.json`. Expected: no errors (the `custom_liquid` string is opaque to the validator).

- [ ] **Step 6: theme check**

Run: `shopify theme check --path theme`
Expected: only the known false positives (5 `JSONMissingBlock`, `ValidScopedCSSClass`, `HardcodedRoutes`). No new errors referencing `page.reports.json`.

- [ ] **Step 7: Commit**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC && git add theme/templates/page.reports.json && git commit -m "feat(reports): add Safety/Efficacy pillars, reorder table, drop redundant main section"
```

---

### Task 2: Push and verify on the preview theme

**Files:** none (deploy)

- [ ] **Step 1: Surgical push**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC && shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete --only templates/page.reports.json
```

- [ ] **Step 2: Pull back and verify server-side**

```bash
mkdir -p /tmp/bfc-verify && shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com --theme 151032561833 --only templates/page.reports.json
```

Grep the pulled file for `custom_liquid_pillars`, confirm `main` is absent from `order`, and confirm the row order (Turmeric before Ashwagandha). Expected: all present/correct — Shopify can silently strip; do not trust the success banner.

- [ ] **Step 3: Hand off to the user** with the preview URL (`https://d9v1pv-06.myshopify.com/pages/reports?preview_theme_id=151032561833`) for their own visual check.

---

## Self-Review

- **Spec coverage:** stamp hero kept (untouched ✓), table reorder (Step 2 ✓), pillars added (Step 1 ✓), `main` removed (Steps 3–4 ✓), CTA untouched ✓, single surgical push ✓, pull-back verify ✓.
- **Placeholder scan:** none — full JSON/CSS content inline.
- **Type consistency:** section key `custom_liquid_pillars` used identically in `sections` and `order`.
