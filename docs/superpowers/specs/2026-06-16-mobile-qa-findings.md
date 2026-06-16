# Mobile QA pass — Horizon reskin (draft theme #151032561833)

**Date:** 2026-06-16 · **Branch:** `feat/theme-reskin-gap-close` · **Umbrella task #11.**

## Method

Playwright + headless Chromium against the draft theme (preview cookie via
`?preview_theme_id=151032561833`), at **mobile 390×844** and **desktop 1280×800**,
across **home / collection (`/collections/all`) / product (`/products/turmeric-powder`) /
cart**, plus the **mobile menu drawer** and the **search modal**. Each page: full-page
screenshot + **axe-core** WCAG scan + targeted probes (horizontal overflow, h1 count,
header tap-target sizes, min price/name font, PDP above-the-fold). Harness:
`/tmp/bfc-qa/mobile_qa.mjs` → `/tmp/bfc-qa/mqa/`. Screenshots compared against `site/`.

Per project rule: validator + push + grep ≠ "looks right" — every fix below was
re-screenshotted and re-scanned after pushing.

## Fixes applied (brand-layer regressions) — all pushed + re-verified

1. **`sections/product-how-to-use.liquid`** — the section element carried both `.phow`
   (neem-green bg) and Horizon's `color-{scheme}` class; the scheme (cream) won the
   cascade, so the whole "How to Use" block rendered **cream text on cream** and the mango
   step number was **1.5:1**. Forced `background-color: var(--neem-green) !important`.
   Now: dark-green band, cream text + mango numbers fully legible.
2. **`sections/bundles.liquid`** — `.bfc-bundle-card__sub` used `opacity:0.85`, dropping
   full cream to `#e3dccb` on Indian-Blue = **4.22:1** (AA fail). Set `opacity:1` →
   cream-on-blue **5.18:1**.
3. **`sections/bfc-footer.liquid`** — element was `<footer id="contact" role="contentinfo">`
   nested inside the layout's own `<footer>` (`layout/theme.liquid:129`) → duplicate +
   nested contentinfo landmark (3 axe violations). Demoted to `<div class="bfc-footer"
   id="contact">`. `#contact` anchor + styling unchanged.
4. **`sections/camparision-section.liquid` + `templates/index.json`** — comparison-table
   column headers used `heading_color #ff4d1c` (orange) on cream = **3.01:1** at 18px bold
   (AA fail). Changed the stored value + schema default to the AA-safe ink **`#c2390f`**.

**After:** color-contrast = **0** on home/collection/cart at both viewports; **all** footer
landmark violations gone everywhere; home `<h1>` present; no horizontal overflow on any
page/viewport; cart drawer regression clean.

## Verified GOOD (keep)

- Mobile menu drawer: cream, big Copperplate nav, **closable** (✕), generous spacing.
- Search modal: full-width top-sliding cream panel (search remap) intact on mobile.
- Header controls (search/cart/hamburger) ≥44px hit area. `--minimum-touch-target:44px`.
- Prices ≥14px, product names ≥16px. Focus ring present (brand override).

## Residuals — Horizon-core / app-native, NOT reskin regressions (left as-is)

Editing these means touching pristine Horizon core or third-party app blocks, which the
additive-reskin rule forbids. Documented so they aren't re-litigated:

- **No `<h1>` on product/collection.** Horizon's `blocks/product-title.liquid` (and
  `collection-title.liquid`) hardcode `<p role="heading" aria-level="3">`; the `type_preset`
  setting only changes typography, not the tag. The title **is** still a programmatic
  heading to AT — just not level-1. Fixing the tag = core edit.
- **Product variant `<select>` `#108474` = 4.1:1** (near-miss; not a brand token; Horizon).
- **judge.me review timestamps `#7b7b7b` = 3.78:1**, judge.me carousel `link-name` (app).
- **`.sticky-add-to-cart__button` has no accessible name**; slideshow `aria-selected` /
  `scrollable-region-focusable`; product-recommendations skeleton `aria-*`; marquee
  `aria-hidden-focus`; facets/overflow `list` role — all Horizon core.
- **`#PBarNextFrame` iframe missing title** — installed app.
- **PDP price/CTA below the mobile fold** — mitigated: Horizon's sticky add-to-cart bar is
  present (it carries the button-name issue above).
- **Drawer nav links 34px tall** — passes WCAG 2.2 §2.5.8 (24px min); 44px (§2.5.5) is AAA.

## Not in scope this pass

- Header link-spread parity (`~/.claude/plans/nested-gliding-blossom.md`) — desktop nav gap
  + an admin 6-item menu change; unrelated to mobile QA.
- Rebuilding the comparison table as a native Horizon block (audit item #11).
