# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Two deliverables for **The Boring Foods Company** (boringfoodscompany.com), driven by the
same brand system (`Boring Foods Brand Book.pdf`, fonts in `Typography/`, art in
`Icons and elements /`):

1. **`site/`** — the original standalone static marketing site (Phase 1, complete). Pure
   HTML/CSS/JS, **no build step**. Scroll-driven, Imperiale-Bolgheri-style single page.
2. **`theme/`** — a **Shopify Horizon 3.5.1** theme (Phase 2, in progress). This is the
   *actual replacement* for the live store: a reskin of Horizon that keeps all existing
   storefront functionality (cart, checkout, products, collections, search, accounts,
   judge.me, apps) while applying the brand look. `site/` is the design reference / source
   of brand CSS, JS, fonts, and assets to port into `theme/`.

`PLAN.md` documents the Phase 1 static-site design system and page flow.

## Brand system (single source of truth)

Palette: Indian Blue `#5D57C5`, Kulfi Malai `#FBF3CC` (default bg), Ripe Orange `#F84B21`,
Mango Yellow `#F9BF29`, Neem Green `#244F24`, Kohl Black `#000000`. Forbidden combos
(brand book p.39): no blue-on-red, blue-on-green, green-on-black, black-on-green.

Fonts (80/15/5 rule): **Aesthet Nova** (Light/Medium/Black) = body ~80%; **Copperplate**
(Light/Regular/Heavy) = headings/CTAs/numbers, letterspaced small caps; **Flagflies** =
charm headlines; **Musloner** = cursive accents (#proudlyboring), sparingly; **Mexicana
Hollow** = single display words only, never body. The 9 font files live in both
`site/assets/fonts/` and `theme/assets/`.

## `theme/` — Shopify Horizon reskin (the important part)

### Architecture of the reskin
The reskin is **purely additive** — Horizon's core files are left pristine. The brand layer
is one snippet:

- `theme/layout/theme.liquid` renders `{%- render 'brand' -%}` **after** `color-schemes`
  (so it wins the cascade).
- `theme/snippets/brand.liquid` is the entire brand override: `@font-face` for the 5 brand
  fonts + overrides of Horizon's four base font-family CSS variables
  (`--font-body--family`, `--font-subheading--family`, `--font-heading--family`,
  `--font-accent--family`), plus targeted component fixes (e.g. nav legibility).
- Everything else (h1–h6, paragraphs, buttons, cart) inherits from those four variables,
  defined in `theme/snippets/theme-styles-variables.liquid`. Change type/color there or via
  `theme/config/settings_data.json`, not by editing core sections.

Color schemes (scheme-1..6) live in `settings_data.json`; global type sizes are settings
like `type_size_paragraph`. The header nav font is controlled by the `_header-menu` block
(`type_font_primary_link` defaults to `heading` = Copperplate).

### Liquid gotcha that matters here
`{% style %}` **renders Liquid** (so `asset_url` works for fonts) — `{% stylesheet %}` does
**not**. The brand layer uses `{% style %}` for that reason.

### Shopify CLI workflow (hard-won rules)
- Store permanent domain: **`d9v1pv-06.myshopify.com`** (vanity = boringfoodscompany.com).
  **Always use the permanent domain** with the CLI — passing the vanity domain makes the CLI
  append `.myshopify.com` and auth fails.
- Working/preview theme: **`#151032561833`** ("Boring Foods — New Design", a pristine admin
  duplicate of Horizon). Live theme must **NEVER** be pushed/published to without explicit
  user approval.
- **Never re-upload Horizon's core sections.** CLI 4.1.0's validation is stricter than
  Horizon 3.5.1's schema and rejects `product-list`/`product-recommendations` on a full
  push, breaking templates. Push **only our brand files** surgically:

  ```bash
  shopify theme push --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete \
    --only snippets/brand.liquid --only config/settings_data.json
  ```
- Pull pristine source if needed: `rm -rf theme && shopify theme pull --theme 151032561833`
- Preview: `https://d9v1pv-06.myshopify.com?preview_theme_id=151032561833` (sets a preview
  cookie in *your* browser only — real customers are unaffected; use incognito to see live).
- If auth returns 401 "Service is not valid for authentication": `shopify auth logout` then
  re-login as the store owner (interactive, in a real terminal).

### Validate before pushing
Liquid/theme edits should be validated with the Shopify Dev MCP (`@shopify/dev-mcp`, docs
& validation only — no store access). Call `learn_shopify_api` (api: `liquid`) first to get
a `conversationId`, then `validate_theme` with the theme path and changed files.

## `site/` — static marketing site

No tooling/build. Serve locally and open in a browser:

```bash
cd site && python3 -m http.server 8000   # then http://localhost:8000
```

Files: `index.html`, `styleguide.html` (documents the design system), `css/tokens.css`
(brand tokens), `css/main.css`, `js/main.js` (IntersectionObserver reveals, sticky nav, CSS
marquee, smooth anchors). `main.js` queries by class (no IDs), so removing/reordering
sections in the HTML won't break it.

### Verifying `site/` visually
Content is **opacity-gated**: `js/main.js` sets `.reveal{opacity:0}` (IntersectionObserver) and
reveals on scroll, so a plain headless full-page screenshot is **blank below the fold**. To capture a
section: no `agent-browser`, but system Chrome + Playwright (`npx --no-install playwright`) are
available — `scrollIntoViewIfNeeded()` + ~1.3s wait per section, or inject
`.reveal{opacity:1!important;transform:none!important}` before shooting. Note: `js/main.js` injects a
fixed **`sf-search`** bar (WIP) that overlaps section tops in screenshots — pre-existing, not a regression.

## Mobile UI/UX audit findings — checklist for the Shopify conversion

Mobile-first audit of `site/` (2026-06-14, rendered at iPhone 390×844 / Android 360×640 +
axe-core). Mobile is the primary purchase device, so treat these as the QA checklist for the
`theme/` reskin. Tagged by where they live:

- **[BRAND]** = rooted in our brand tokens/type/assets → **will recur in `theme/`** unless
  fixed at the source (`settings_data.json`, `theme-styles-variables.liquid`, `brand.liquid`).
- **[STATIC]** = artifact of the hand-built `site/` (custom reveal JS, custom nav, mailto
  form) → Horizon handles natively, so **don't port the bug**; just verify the Horizon
  equivalent is clean.

### Must-fix (conversion blockers on mobile)
1. **[BRAND] Orange-on-cream text fails WCAG AA contrast (3.12:1).** Ripe Orange `#F84B21` on
   Kulfi Malai `#FBF3CC` — used for prices, kickers, small headings, links. Indian-Blue intro
   text on cream is also borderline (~3.81:1). Fix at the token level: darker orange
   (~`#C2390F`) or Neem Green for small text; reserve `#F84B21` for ≥24px display or as a bg.
   In `theme/`, audit every scheme in `settings_data.json` for the same pairing.
2. **[BRAND] Hamburger / icon tap targets < 44×44px** (was 34×26). Ensure Horizon's header
   controls keep ≥44px hit areas after the reskin; don't shrink them via brand CSS.
3. **[BRAND] Nav controls barely visible over the hero photo** (cream glyph on mid-tone photo,
   <3:1 non-text contrast). Keep Horizon's header scrim/contrast treatment; verify over the
   brand hero image.
4. **[BRAND] Widespread sub-16px text** — recipe badges 9.9px, nav/footer/breadcrumb/card-name
   12px, body at Aesthet Nova Light 300. Set mobile minimums in `theme-styles-variables.liquid`
   / type-size settings; bump shopping-critical labels (prices, product names) to ≥14px.
5. **[STATIC] No-JS blank page** — `site/` hides all content behind `.reveal{opacity:0}` with
   no `<noscript>`. Horizon degrades gracefully; just don't reintroduce opacity-gated reveals
   in `brand.liquid` for price/CTA. If we port scroll animations, guard with a `.no-js` class.
6. **[STATIC] Mobile menu can't be closed; no Cart/Search in mobile menu.** Horizon's drawer
   menu + persistent cart icon solve this natively — verify they survive the reskin (the
   `_header-menu` block / header group), don't rebuild a custom overlay.

### High / Medium (verify in theme)
7. **[BRAND] Heading hierarchy** — `site/` index has no `<h1>` and skips H1→H3 on contact/
   reports. Horizon templates are structured, but check any custom brand sections we add use
   one `<h1>` and sequential headings.
8. **[BRAND] No visible `:focus-visible` indicator** — add a global high-contrast focus ring in
   `brand.liquid` (don't let brand styling suppress Horizon's focus outlines).
9. **[BRAND] PDP: price/CTA pushed far below the fold; no sticky buy bar.** When styling the
   Horizon product template, keep title+price high and consider Horizon's sticky add-to-cart.
10. **[BRAND] Long display headings (Copperplate/Mexicana) overflow & clip at 360px.** Add
    `overflow-wrap:break-word; hyphens:auto` to brand heading styles; test at 360px.
11. **[STATIC] Comparison table cut off** (`min-width:600px`, no scroll affordance), **contact
    form is `mailto:` with no feedback**, **dead `href="#"` search/cart on homepage**,
    **closed overlay keeps focusable links / no scroll-lock / no focus trap**, **fixed nav
    overlaps anchored content (no `scroll-margin-top`)**. All are hand-built `site/` issues;
    rebuild these as Horizon sections/blocks rather than porting the markup.

### Low (cosmetic / polish)
About `.story-list-wrapper` crushed `line-height:6.4px`; "View Report" button 35px tall;
About signature-stamp gap/overflow; empty `<th>` in compare table; decorative glyphs
(`★ ☞ ✦`) not `aria-hidden`; footer meta wraps mid-phrase at 360px.

### Verified GOOD in `site/` — keep these properties in `theme/`
No horizontal page overflow at any viewport · no JS console/network errors · `prefers-reduced-
motion` fully supported · pinch-zoom NOT blocked (no `user-scalable=no`/`maximum-scale`) · all
`<img>` have alt · contact inputs 44px tall with `type="email"` + associated labels (no iOS
zoom-on-focus) · FAQ accordions (native `<details>`) work · reports table → stacked-card
pattern is the model responsive transform · index hero CTA prominent above the fold.

## Git

Remote `origin` = `https://github.com/Satwik-aflo/BFC.git` (private). Default branch `main`.
