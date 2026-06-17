# Reports Page — Strip to Hero + Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Reduce `/pages/reports` (preview theme `#151032561833`) to exactly the live theme's two content blocks — the purple-stamp "Boring Foods Company Report Library" hero (incl. its "you don't just have to take our word for it:" bottom text) and the lab-report table ("here's the proof." + table) — and nothing else, riding on the preview theme's new header (`header`) + new footer (`bfc-footer`).

**Architecture:** Single edit to `theme/templates/page.reports.json`. Remove the `custom_liquid_pillars` and `custom_liquid_reports_cta` sections (added/kept in the prior pass); keep `lab_report_hero_qaGwTY` and `custom_liquid_LMhwHG`. Revert the table row order to match the live screenshot (Ashwagandha → Black Pepper → Moringa → Turmeric). Header/footer are inherited from the preview theme's section groups (already the new ones) — no template change needed.

**Tech Stack:** Shopify Horizon 3.5.1 Liquid theme, `custom-liquid` sections, Shopify CLI, Dev MCP validator.

## Global Constraints

- All work on `main`; commit straight to `main`.
- Edit only `theme/templates/page.reports.json`.
- Surgical push: `--only templates/page.reports.json --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete`. Never touch the live theme.
- Verify the push by pulling back + grep. Final visual check is the user's.

---

### Task 1: Strip the template to hero + table

**Files:** Modify `theme/templates/page.reports.json`

- [ ] **Step 1:** Delete the `custom_liquid_pillars` section object from `"sections"`.
- [ ] **Step 2:** Delete the `custom_liquid_reports_cta` section object from `"sections"`.
- [ ] **Step 3:** Revert table rows in `custom_liquid_LMhwHG` to live order: Ashwagandha → Karimunda Black Pepper → Moringa → Lakadong Turmeric.
- [ ] **Step 4:** Set `"order"` to `["lab_report_hero_qaGwTY", "custom_liquid_LMhwHG"]`.
- [ ] **Step 5:** Validate JSON parses; Dev MCP `validate_theme`; `shopify theme check --path theme` (only known false positives).
- [ ] **Step 6:** Commit.

### Task 2: Push + verify

- [ ] **Step 1:** Surgical push.
- [ ] **Step 2:** Pull back to `/tmp/bfc-verify`; confirm `order` == hero+table only, pillars/CTA absent, rows in live order.
- [ ] **Step 3:** Hand the preview URL to the user.

## Self-Review
- Keep hero + table ✓; remove pillars + CTA ✓; new header/footer inherited from preview groups ✓; live row order ✓; single surgical push + pull-back ✓.
