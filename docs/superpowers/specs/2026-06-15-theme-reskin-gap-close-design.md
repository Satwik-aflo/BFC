# Boring Foods — Horizon Theme Reskin: Gap-Close Design

**Date:** 2026-06-15
**Status:** Design — pending user approval
**Target theme:** `theme/` (Shopify Horizon 3.5.1), preview theme `#151032561833` ("Boring Foods — New Design").
**Design source of truth:** `site/` (static marketing site).

## 1. Goal

Bring the in-progress Horizon reskin (`theme/`) into parity with the latest `site/` design,
**preserving all existing Shopify storefront functionality** (cart, checkout, products,
collections, search, accounts, judge.me, apps). This is a **gap-close**, not a rebuild: the
theme is a full Horizon install with the additive brand layer already wired up and most of the
homepage assembled. We port only the deltas between the current theme and the latest `site/`.

## 2. Hard constraints (non-negotiable)

1. **Reskin is purely additive.** Horizon core sections/snippets stay pristine. Brand changes
   live in `theme/snippets/brand.liquid`, `theme/config/settings_data.json`, and
   `theme/snippets/theme-styles-variables.liquid`, plus our *own* custom sections.
2. **Never touch the live theme.** All work targets preview theme `#151032561833`. No
   push/publish to the live theme without explicit user approval.
3. **Preserve working functionality.** Search, cart, and checkout keep Horizon's native logic.
   We restyle native components; we do **not** rebuild their behavior.
4. **Surgical CLI pushes only.** Push only our brand files (`--only`), never a full theme push
   (CLI 4.1.0 validation rejects Horizon core sections). Pull pristine if needed.
5. **Validate every Liquid file before pushing** using the `shopify-liquid` skill's
   search→write→validate loop (`scripts/search_docs.mjs` + `scripts/validate.mjs --theme-path`)
   and/or the Shopify Dev MCP `validate_theme`.

## 3. Decisions (locked with user, 2026-06-15)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Round scope | **Everything, including the missing Recipes page** (Waves 0–2). |
| 2 | Product-card price | **Show price, restyled** to the brand dotted-blue-label look (not hidden). |
| 3 | `custom-product-section` (Arial / yellow SHOP pill, currently `disabled`) | **Retire it.** Remove from `index.json`; style Horizon's native `product-list` instead so the brand card appears on homepage, PLP, search, and recommendations. |
| 4 | Search overlay default state | **Native predictive-search collection carousel, branded** (point at a curated "popular" collection). No custom term-chip JS. |
| 5 | Search/cart treatment | **Visual reskin of Horizon's native** predictive-search + cart-drawer. Logic untouched. |

## 4. Current-state gap map (from 4-agent audit, 2026-06-15)

### Solid — keep, verify only
- **Comparison table** (`sections/camparision-section.liquid`) — faithful, parameterized port
  of the latest site table; mobile horizontal-scroll + sticky column preserved. *Verify only:*
  that an `Aesthet-Nova`/`Aesthet-Nova-Light` `@font-face` family alias actually exists (the
  cells hard-force those names with `!important`), and that the 5 referenced `shop_images`
  (Check.svg, question-mark.svg, no-cross png, silhouette1.svg, logo-web.png) are uploaded.
- **Contact** (native `contact-form` — fixes the `mailto:` bug), **FAQ** (native accordion),
  **Boringly Clean & Pure**, **Socials/Instagram** (`ss-instafeed-2` on homepage), **Reviews**
  (judge.me on homepage), **About** (ported brand sections via `page.json`).

### Stale — ported but outdated
- **Hero** (`custom_liquid_CjPRme` inline markup): old `logo-web.png` + WhatsApp bg, no
  tagline, no `☞` CTAs, no Single-Origin/Lab-Tested side meta. (Unused `sections/hero.liquid`
  exists.)
- **"BFC Heading" blocks** (Shop / How We're Different / Socials): render as body-font `<h3>`
  at `1rem`, losing the Copperplate kicker + display-`<h2>` treatment; "How We're Different"
  is missing its spark image.
- **Product/bundle cards:** Horizon native `product-list` is live but **unstyled** by the
  brand layer; the off-brand `custom-product-section` is dead/disabled (to be retired).
- **Reports table** (`page.reports.json`): a raw `custom-liquid` horizontal-scroll table, not
  the site's `data-label` stacked-card responsive transform; purpose-built
  `sections/reports-table-section.liquid` is unused. Green "Shop the Range" CTA not ported.

### Missing
- **Bundles** ("Blends With a Purpose", green scheme) — biggest content gap. Requires a
  **Neem-Green color scheme** (none exists today).
- **Manifesto** ("The Future of Health is Ancient" + `#proudlyboring`) — requires
  **Musloner → `--font-script`** and **Mexicana Hollow → `--font-poster`** wired into vars
  (fonts are loaded in `brand.liquid` but bound to no variable).
- **Recipes page** — entirely absent; nav links to it (currently 404). New
  `templates/page.recipes.json` + a recipe-group/recipe-card section required.
- **`page.review-page.json`** — broken: it is a copy of the About page (no reviews).

### Global brand-layer gaps (recur everywhere unless fixed at source)
- **WCAG:** scheme `scheme-586e3a18-…` pairs Ripe Orange `#F84B21` foreground on cream
  `#FBF3CC` (3.12:1 fail). Fix → `#C2390F` (or Neem Green `#244F24`).
- No global `:focus-visible` ring in `brand.liquid`.
- No `overflow-wrap: break-word; hyphens: auto` on display headings (clips at 360px).
- `type_size_h5: 14` / `type_size_h6: 12` (sub-16px) in `settings_data.json`.
- Musloner + Mexicana Hollow loaded but unbound to any CSS variable.

## 5. Architecture & shared-file strategy

The reskin remains a thin brand layer over pristine Horizon. Three files are **shared
serialization points** that many tasks edit and that therefore must not be worked on in
parallel by multiple agents:

- `theme/snippets/brand.liquid` — fonts, font-family vars, global CSS (focus ring, heading
  wrap), and all native-component reskins (cards, search, cart badge/drawer).
- `theme/config/settings_data.json` — color schemes (incl. new Neem-Green), type-size floors,
  search/cart color-scheme assignments (`popover_color_scheme`, `drawer_color_scheme`).
- `theme/templates/index.json` — homepage section wiring (retire `custom-product-section`,
  heading blocks).

**Consequence:** all edits to `brand.liquid` and `settings_data.json` happen in **Wave 0**
(one owner). Later waves that need brand CSS additions hand their CSS deltas back to be applied
to `brand.liquid` in a controlled, serialized way (or are sequenced, not parallelized, on that
file). Custom *section* files (`hero`, bundles, manifesto, recipes, reports-table) are
independent and safely parallel.

## 6. Work plan (waves)

### Wave 0 — Foundation (single owner; edits shared files first)
All in `brand.liquid` + `settings_data.json` + `theme-styles-variables.liquid`:
1. Fix WCAG scheme `#F84B21` → `#C2390F` foreground on cream.
2. Add a **Neem-Green** color scheme (bg `#244F24`, cream foreground) for Bundles/CTAs; verify
   no forbidden combos (no green-on-black, black-on-green, blue-on-green).
3. Bind **Musloner → `--font-script`** and **Mexicana Hollow → `--font-poster`**; confirm/add
   `Aesthet-Nova` / `Aesthet-Nova-Light` family aliases the comparison table depends on.
4. Add global `:focus-visible` ring (Indian Blue, 2px, 2px offset).
5. Add `overflow-wrap: break-word; hyphens: auto` to brand heading selectors.
6. Raise `type_size_h5`/`h6` toward a ≥14px floor for shopping-critical labels.

### Wave 1 — Parallel fan-out (depends on Wave 0; one subagent per item)
- **1a. Hero + heading blocks:** restore hero to current design (logo-web4, hero-powder bg,
  tagline, two `☞` CTAs, Single-Origin/Lab-Tested meta) via `sections/hero.liquid` or new
  custom Liquid; upgrade BFC Heading blocks to Copperplate kicker + display `<h2>`; re-add the
  spark on "How We're Different".
- **1b. Product/bundle card reskin:** add brand card CSS targeting Horizon's `.product-card`
  (photo + Indian-blue label panel + inset dotted cream border + Copperplate name/weight +
  `translateY(-4px)` / `5px 5px 0` black shadow hover), **keeping price** restyled. Retire
  `custom-product-section` from `index.json`. CSS delta applied to `brand.liquid` (serialized).
- **1c. Search + cart reskin:** point `popover_color_scheme` + `drawer_color_scheme` at a cream
  scheme; brand CSS for cart bubble (Ripe Orange), drawer footer (kulfi-deep), quantity pill
  stepper, checkout button, Flagflies empty state. Default search state = branded native
  collection carousel. CSS delta to `brand.liquid` (serialized).
- **1d. Reports + review-page + About cleanup:** swap reports `custom-liquid` table for
  `reports-table-section.liquid` (or add `data-label` stacked-card CSS); port green CTA; fix
  `page.review-page.json` (judge.me block or delete); resolve the three About templates and
  re-enable one `<h1>` per interior page.

### Wave 2 — New content sections
- **2a. Bundles** ("Blends With a Purpose") — new section, green scheme, brand cards, live
  collection.
- **2b. Manifesto** ("The Future of Health is Ancient" + `#proudlyboring` in Musloner).
- **2c. Recipes page** — `templates/page.recipes.json` + a reusable recipe-group/recipe-card
  section (badge, ingredients list, method, hack, PDF CTA, sign-off). Highest effort.

## 7. Validation, push & QA

- **Per file:** `shopify-liquid` skill loop — `search_docs.mjs` before authoring, then
  `validate.mjs --theme-path theme --files <changed>` until clean (≤3 retries). Cross-check
  with Shopify Dev MCP `validate_theme` for schema-level issues.
- **Push:** surgical, e.g.
  `shopify theme push --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete
  --only snippets/brand.liquid --only config/settings_data.json --only templates/index.json …`
  (one `--only` per changed file). Never a full push.
- **Preview:** `https://d9v1pv-06.myshopify.com?preview_theme_id=151032561833` (incognito to
  confirm live is unaffected).
- **Mobile QA checklist** (from CLAUDE.md audit) at 360px / 390px: AA contrast on every scheme,
  ≥44px tap targets, ≥16px shopping labels, visible focus ring, no heading clip, one `<h1>` +
  sequential headings per page, reports stacked-card transform, native cart/search reachable.
- **User performs final acceptance testing** on the preview theme.

## 8. Out of scope (this round)
- Publishing to / modifying the live theme.
- Rebuilding any Horizon search/cart/checkout logic.
- New storefront functionality beyond visual parity with `site/`.
- FAQ content reconciliation beyond cleaning the 22-vs-7 divergence noted by the audit
  (data hygiene only; copy decisions deferred to the user).

## 9. Success criteria
- Preview theme visually matches the latest `site/` across homepage, PDP/collection cards,
  search, cart, and all interior pages (About, Contact, FAQ, Reports, Recipes, Reviews).
- No live theme changes; all storefront functions still work on preview.
- Mobile QA checklist passes at 360/390px.
- Every changed Liquid file passes Shopify validation before push.
