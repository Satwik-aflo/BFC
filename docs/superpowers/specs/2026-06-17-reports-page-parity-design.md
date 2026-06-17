# Reports page parity with static redesign — design

**Date:** 2026-06-17
**Page:** `/pages/reports` (template `theme/templates/page.reports.json`)
**Goal:** Bring the Shopify reports page closer to the static redesign
(`site/reports.html` / satwik-aflo.github.io/BFC/reports.html) **while keeping the
theme's newer, more stylistic treatment** where it already exceeds the static page.

## Decision context

The static redesign is plain (text hero → Safety/Efficacy pillars → table → green CTA).
The live Shopify page is more elaborate (purple-stamp graphic hero, brand-styled table,
green CTA) but is **missing the pillars** and carries a redundant `main-page` section.

User direction: keep the page in tune with the other theme pages (the newer style); only
adopt the static page's content where Shopify lacks it.

## Changes

### Keep (already on-brand)
- **`lab-report-hero`** stamp-graphic hero — unchanged. It is the more stylistic,
  on-brand treatment; do **not** downgrade to the static page's plain text hero.
- **Reports table** (custom-liquid `custom_liquid_LMhwHG`) — keep its brand styling
  (purple header, yellow shadowed "View Report" buttons, mobile stacked-card layout).
  Only change: **reorder rows to match the static page** — Lakadong Turmeric →
  Karimunda Black Pepper → Moringa → Ashwagandha.
- **Green CTA** (custom-liquid `custom_liquid_reports_cta`) — unchanged; already matches
  the static "Boringly Clean / Proof, Not Promises / Shop the Range".

### Add
- **Safety / Efficacy two-pillar block**, inserted **between the hero and the table**
  (static order). Implemented as a **`custom-liquid` section** for consistency with the
  table and CTA (which are already custom-liquid on this page) and to avoid a new section
  type / two-push sequence. Styling consistent with the table: Kulfi Malai `#FBF3CC`
  background, Copperplate small-caps `<h3>` headings, Aesthet-Nova body, brand colors,
  two columns on desktop collapsing to one on mobile. Content from the static page:
  - **Safety** — "We test for heavy metals and contaminants, so you know exactly what
    you're putting in your body is pure."
  - **Efficacy** — "We verify the active components that actually matter — like curcumin
    in turmeric and withanolides in ashwagandha — so potency isn't just a claim on the
    pack."

### Remove
- The **`main` (`main-page`) section**. It injects `<h1>{{ closest.page.title }}</h1>`
  (the page title) plus page-content between the hero and table. This is not in the static
  design, and the literal `<h1>` duplicates both the hero heading and Horizon's
  visually-hidden header `<h1>` (a duplicate-h1 a11y issue per the repo rule). The hero
  already supplies the page intro.
  - **Caveat:** if the admin page's body content field holds meaningful text, removing this
    section hides it. The static design has no such content; the intro lives in the hero.

### Resulting section order
`lab_report_hero` → pillars (new) → table → CTA.

## Implementation / deploy notes
- Edit only `theme/templates/page.reports.json` (add the new custom-liquid section, reorder
  the table rows, drop `main` from `sections` and `order`).
- Surgical push: `--only templates/page.reports.json`. No new section *type* or setting, so
  a single push suffices (the two-push rule does not apply to custom-liquid content).
- Verify by pulling the file back and grepping, then a visual Playwright pass (desktop 1280
  + mobile 390) against `site/reports.html`.
- All work on `main`; commit straight to `main`.

## Out of scope
- No change to the hero copy/graphic.
- No migration of the table/CTA from custom-liquid to bfc-* sections.
- No admin page→template binding changes.
