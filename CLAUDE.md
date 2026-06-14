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

## Git

Remote `origin` = `https://github.com/Satwik-aflo/BFC.git` (private). Default branch `main`.
