# Shop (collection) page reskin — design

**Date:** 2026-06-17
**Scope:** CSS-only reskin of the Shopify Horizon collection page to match the new BFC design
(the homepage "range" grid), applied to the shared `templates/collection.json` so every
collection page (`/collections/shop`, `/collections/shop-by-benefits`, future collections)
gets it.

## Goal

Make the shop/collection page read like the new design's "Boring Foods, Your Way" range
grid, **without** adding any new section or new header content (no kicker / dynamic title /
assurances strip). Keep all Shopify collection functionality (filter sidebar, sort dropdown,
pagination) — restyled to the brand.

## Approach

Pure CSS in `theme/snippets/brand.liquid`, **scoped to the collection template** so no other
page/section/scheme is affected. No template JSON or core-section edits. No new sections.
Fully reversible.

Scope selector: the collection template wrapper (e.g. `body.template-collection` / the
`main-collection` section wrapper — confirm exact class against rendered DOM before writing).

## Changes

1. **Background → Kulfi Malai cream.** The collection grid area is currently Mango Yellow
   (from the section's `color-{scheme}`). Override to `--kulfi-malai` cream, scoped to the
   collection page, with `!important` to beat the `.color-{scheme}` background rule (per the
   known `bfc-section-bg-loses-to-color-scheme` gotcha). Do **not** edit a shared scheme.
   Ensure foreground text stays AA-contrast on cream.

2. **Page title ("Shop") — centered + brand display.** Keep the existing title text and star
   graphic (no new content). Center it and restyle to match the homepage range header:
   Copperplate display weight, brand letter-spacing, matching vertical rhythm. Keep
   `overflow-wrap: break-word` so long collection names don't clip at 360px.

3. **Filter / sort bar — brand-styled.** Restyle Availability/Price filter controls, the
   "N items" results count, the Sort control, and the grid/layout toggle using brand fonts
   and tokens. AA-contrast text on the cream background; ≥44px tap targets on mobile.

4. **Grid spacing + pagination.** Match the homepage range column/row gaps; brand-style
   pagination controls if present.

5. **Product cards — unchanged.** Already reskinned globally via the existing `.product-card`
   brand rules. Verify they still look right on the new cream background.

## Out of scope

- New sections / header content (kicker, dynamic title, assurances strip) — explicitly dropped.
- Editing shared color schemes or any Horizon core section.
- Template JSON changes / admin template binding.

## Verification

- Validate `brand.liquid` via Shopify Dev MCP `validate_theme`.
- Push `snippets/brand.liquid` surgically to draft theme 151032561833; pull back to confirm.
- Playwright screenshots (desktop 1280 + mobile 390) of `/collections/shop` AND a second
  collection (`/collections/shop-by-benefits`) to confirm the shared template looks right on
  both; compare against the homepage range. Check `<h1>` count unaffected and AA contrast.
