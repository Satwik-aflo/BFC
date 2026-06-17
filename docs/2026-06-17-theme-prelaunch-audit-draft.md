# BFC Draft Theme — Pre-Launch Audit (parity pass vs. live audit)

**For:** Developer
**Date:** June 2026
**Theme:** "Boring Foods — New Design" draft `#151032561833` (Horizon 3.5.1 reskin)
**Store:** d9v1pv-06.myshopify.com
**Method:** Static code inspection + measured network capture on the preview theme
(headless Chrome, Pixel-7 emulation, full-page scroll to trigger lazy loads).

**Why this exists:** Flot's May-2026 audit (`BFC_PreLaunch_Audit_Complete`) graded the
**live** theme. This re-runs the same checklist against **our draft reskin** so we know
which of those findings we inherited, which the reskin already fixed, and which are new.

**Tagging:** `[SAME]` also present on live · `[OURS]` introduced/owned by the reskin ·
`[APP]` caused by an installed app, theme-independent · `[ADMIN]` store/admin setting,
not theme code · `[FIXED]` live finding the reskin already resolves.

---

## Part A: Performance

### Current State (measured, mobile emulation, preview theme)

| Metric | Live audit (May) | **Draft, measured (Jun)** | Target | Status |
|---|---|---|---|---|
| Homepage total weight | 19.6 MB | **19.97 MB** | < 3 MB | ❌ 6.6× over |
| Homepage requests | n/a | **406** | < 50 | ❌ 8× over |
| — of which **video** | (1 MP4) | **13.2 MB** (3 Instagram reels) | — | ❌ dominant |
| — of which **images** | — | **4.0 MB** | — | ❌ |
| — of which **JS** | — | **2.2 MB** | — | ❌ |
| — of which **fonts** | — | **482 KB** | — | ⚠️ ours |
| — of which **CSS** | — | 233 KB | — | ✅ |
| Product page weight | n/a | **4.89 MB / 391 req** | < 3 MB | ❌ |
| CLS | 0 (perfect) | not regressed (img width/height emitted) | < 0.1 | ✅ |

**Bottom line: the reskin did not add the weight.** ~17 MB of the 20 MB homepage is the
**Instafeed app** (Instagram videos + full-res feed images) plus app/Horizon JS. Our
brand layer's own footprint is small and mostly clean.

### Priority 1 — Cut page weight (biggest lever) `[APP]` + `[OURS]`
- **`[APP]` Instafeed is the root cause (~17 MB).** The homepage Instagram feed pulls 3
  full Instagram reel `.mp4` files (13.2 MB) and ~4 MB of full-resolution Instagram JPGs.
  The `<video>` tags carry `preload="metadata"`/`"none"` and `autoplay=false`, so this is
  triggered on scroll-into-view — but it still dominates the page. **Action:** in the
  Instafeed app config, disable inline video / load thumbnails only, cap the number of
  posts, and lazy-load the whole block. This is an app setting, not theme code, and it
  affects live too. Single biggest win available.
- **`[OURS]` `hero-powder.jpg` ships at 333 KB via `asset_url`.** The `bfc-hero` fallback
  image is being served (so no CDN image is set in the theme editor for the hero), and
  `asset_url` assets **cannot** be CDN-resized. **Action:** either set a hero image in the
  theme editor (then `image_tag` + `widths` kicks in and emits a `srcset`), or compress
  `hero-powder.jpg` at source with `sips` to < 200 KB.
- **`[ADMIN]` `logo-web.svg` is 135 KB and loads on every page.** Large for an SVG; likely
  an uploaded logo in Settings → files. **Action:** optimize/replace it (SVGO, or a small
  PNG/WebP).
- **`[FIXED]` Stamp.svg ×4.** Live loaded the same stamp 4× (once per product card). Our
  footer stamp (`sun-stamp.svg`) loads **once**, lazily. No repetition. ✅

### Priority 2 — Audit installed apps `[APP]` `[ADMIN]`
- Observed loading on the draft: **Instafeed** (heaviest), **Judge.me** reviews,
  **Meta Pixel** (`fbevents.js` present). **Action:** same as the live audit — uninstall
  (don't just deactivate) anything not driving revenue; set Judge.me + Instafeed to
  lazy-load on scroll; defer chat/popup apps. Theme-independent; do once in admin.

### Priority 3 — Render-blocking resources `[OURS, minor]`
- No `preconnect`/`preload` hints in `theme/layout/theme.liquid`. **Mostly N/A:** Shopify
  auto-preconnects `cdn.shopify.com`, and our fonts are self-hosted on that same CDN (no
  Google/Adobe Fonts to preconnect). Real available win: **preload the 1–2 above-the-fold
  font faces** (Copperplate for nav/headings, Aesthet Nova body). Minor.

### Priority 4 — Fonts `[FIXED]` (mostly)
- **`[FIXED]`** All 12 `@font-face` blocks are **WOFF2-first** with `.otf`/`.ttf`
  fallback, and **all 12 carry `font-display: swap`.** Self-hosted in `assets/`. This is
  exactly what the live audit asked for — already done. Total font payload 482 KB across
  5 families/weights.
- **`[OURS, optional]`** Subsetting (glyphhanger) could shave the 482 KB further, and a
  preload on the two critical faces would cut the first-paint swap. Nice-to-have.

### Priority 5 — JS & animations `[FIXED]` (ours) / `[APP]` (the rest)
- **`[FIXED]` Every brand animation is GPU-composited.** Marquees use `translate3d`/
  `translateX`, the footer stamp uses `rotate`, the proudly-banner uses `translateX` —
  no `left/top/width/margin` animations anywhere in our CSS, and all carry
  `prefers-reduced-motion` guards. The live audit's "9 non-composited animations" are not
  ours; they come from apps/Horizon.
- **`[APP]`** The 2.2 MB JS is Horizon hydration (`hydrate.js`, `vendor.js`) + app bundles
  (Judge.me, Instafeed, fbevents). Trim via the Priority-2 app cull.

### Priority 6 — Best practices `[ADMIN]`
- HSTS/CSP/COOP headers and deprecated-API/console-error fixes are platform/admin-level and
  apply to both themes equally. No theme-code action for us beyond not introducing console
  errors (our QA runs show none on the brand pages).

### Priority 7 — Accessibility & SEO `[SAME]` `[OURS]`
- **`[SAME]` Contrast.** Ripe Orange `#F84B21` on Kulfi cream is ~3.1:1 (fails AA for small
  text). Already on our known list — audit every scheme in `settings_data.json`; darken
  small orange text to ~`#C2390F` or use Neem Green; reserve `#F84B21` for ≥24px/bg.
- **`[OURS] HIGH — Product page has zero `<h1>`.** Measured: the product title renders as
  `DIV.view-product-title`, and the page has **no `<h1>` at all** (home correctly has
  exactly one — the shop name). Product pages should expose the product name as the page
  `<h1>` for SEO and a11y. **Action:** verify the product-title block's heading-tag setting
  / Horizon product template binding in admin; confirm one `<h1>` = product name on PDPs.
- **`[OURS]` Heading hierarchy in `bfc-*` sections** — keep sequential, don't add a second
  `<h1>` (Horizon's header already emits the page `<h1>`; verified 1 on home).
- Non-descriptive link text + `:focus-visible` ring — re-verify on brand sections.

---

## Part B: Tracking, Structured Data & Ad-Readiness `[ADMIN]` (theme-independent)

These are store-wide and apply to **both** themes — publishing our reskin changes none of
them. Observable from the draft:
- **Meta Pixel:** `fbevents.js` loads → pixel appears installed. Verify events in Events
  Manager (PageView/ViewContent/AddToCart/InitiateCheckout/Purchase).
- **Structured data (JSON-LD):** Horizon emits product `structured_data`
  (`product-information.liquid`). Verify completeness (name/image/sku/brand/offers/
  aggregateRating) in Google Rich Results Test.
- **Google Ads/GA4, Merchant Center approval, return/shipping policy pages, WhatsApp
  opt-in, UTMs, Recipe-PDF link `target="_blank"`** — all admin/app tasks identical to the
  live audit. Our recent footer work added the policy links + legal block, which helps the
  Merchant-Center "visible policy" requirement.
- **`[SAME]` OG image uses `http://`.** `theme/snippets/meta-tags.liquid:64` emits
  `content="http:{{ page_image | image_url }}"` (Horizon core). One-line fix to `https:` —
  same finding as the live audit, and it's in our theme too.

---

## Part C: Verification

1. After the Instafeed cull, re-measure homepage weight (target ≪ 20 MB; aim < 3 MB).
   Re-run `/tmp/bfc-qa/weight_probe.mjs`.
2. Re-run PageSpeed Insights (mobile) on home + `/products/turmeric-powder`; screenshot.
3. Confirm CLS stays ~0 (our `image_tag` width/height emission protects it).
4. Confirm product page exposes exactly one `<h1>` = product name.
5. Confirm OG image is `https://` after the meta-tags fix.

---

## What the reskin already fixes vs. live
✅ WOFF2 + `font-display: swap` (Priority 4) · ✅ composited animations + reduced-motion
(Priority 5) · ✅ Stamp.svg loaded once not 4× (Priority 1) · ✅ `image_tag` with
`widths`/`sizes` + width/height on brand images (Priority 1 + CLS) · ✅ single `<h1>` on home.

## What we still own (theme-code, small)
`hero-powder.jpg` 333 KB → compress or set CDN hero · OG image `http→https` · product-page
`<h1>` · optional font preload/subset · orange-on-cream contrast in schemes.

## What dominates and is NOT theme code
Instafeed video+images (~17 MB) `[APP]` · app JS `[APP]` · all of Part B `[ADMIN]`.
