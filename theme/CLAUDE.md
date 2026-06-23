# CLAUDE.md — `theme/` (Boring Foods Shopify reskin)

This file is the brief for an agent working **inside `theme/`** on **visual changes only**.
It is self-contained for that purpose. The full project handbook lives at `../CLAUDE.md`
(CLI/push internals, performance history, full audit) — read it only if you need depth
beyond what's here.

## What this is

A **Shopify Horizon 3.5.1** theme reskinned to the Boring Foods brand. **As of 2026-06-23 the
reskin is LIVE** — it is now the published store, not a draft. It keeps **all** Horizon
storefront functionality (cart, checkout, products, collections, search, accounts, judge.me
reviews, installed apps) and layers the brand look on top. The visual source of truth is the
static site at `../site/` — match it.

- **Live theme (now MAIN):** `#151032561833` ("Boring Foods — New Design"). The reskin was
  **published 2026-06-23** — this theme *is* the live store now. **A `theme push` to it goes
  straight to real customers**, so push only with explicit user approval and always verify by
  pulling back. (Until then this ID was the safe draft — that assumption no longer holds.)
- **Old live / rollback theme:** `#147961872553` ("Horizon", now **UNPUBLISHED**) — the
  pre-reskin store, kept as a backup. Re-publish it from admin → Themes → ⋯ → Publish to roll
  back instantly; nothing is deleted.
- Store permanent domain (for the CLI): **`d9v1pv-06.myshopify.com`** (vanity =
  boringfoodscompany.com — never pass the vanity domain to the CLI).

## This session = VISUAL ONLY

Make CSS/markup/styling changes that affect how the theme **looks**. Do **not** touch
cart / checkout / add-to-cart logic, markup, or JS — it's the vital revenue path and is
currently pristine Horizon. (Functional files: `cart-drawer.js`, `component-cart-items.js`,
`header-actions.liquid`, `quick-add.liquid`, `buy-buttons.liquid`, `product-form.liquid`, etc.)

## Local dev server (how you preview)

We work against a **local hot-reload server** serving the files in this `theme/` directory.
If it isn't already running, start it **from inside `theme/`** (this dir is your cwd, so do
NOT pass `--path theme` — that would resolve to `theme/theme` and error; `--path` defaults to cwd):

```bash
shopify theme dev --store d9v1pv-06.myshopify.com --theme 151032561833
```

- Local URL: **http://127.0.0.1:9292** — open in Chrome. Saving any file under `theme/`
  auto-reloads the page in ~1–2s. No push/pull needed.
- It serves a temporary CLI-session development theme from your **local files**; it does
  **not** touch the live (MAIN) theme `#151032561833`. This is now the *only* fully safe way to
  preview — the dev server is local-only, whereas any `theme push` lands on live. Render reflects
  local `config/settings_data.json` and section JSON (may differ slightly from the live theme's
  admin-edited settings — fine for visual/CSS work).
- If auth fails (401 "Service is not valid for authentication"): `shopify auth logout` then
  re-login as the store owner in a real terminal (interactive — ask the user to run it).
- **Do not run Lighthouse / performance scoring** against the dev server — it injects a
  hot-reload script and distorts perf numbers. Use it for *looks* only.

## Brand system (single source of truth)

Palette: Indian Blue `#5D57C5`, Kulfi Malai `#FBF3CC` (default bg), Ripe Orange `#F84B21`,
Mango Yellow `#F9BF29`, Neem Green `#244F24`, Kohl Black `#000000`.
**Forbidden combos:** no blue-on-red, blue-on-green, green-on-black, black-on-green.

Fonts (80/15/5 rule): **Aesthet Nova** (Light/Medium/Black) = body ~80%; **Copperplate**
(Light/Regular/Heavy) = headings/CTAs/numbers, letterspaced small caps; **Flagflies** = charm
headlines; **Musloner** = cursive accents (#proudlyboring), sparingly; **Mexicana Hollow** =
single display words only, never body. Font files live in `assets/` (served WOFF2-first).

## Where the brand styling lives (read this before changing any look)

The reskin is **purely additive** — Horizon core files are left pristine. The brand layer is
one orchestrator + nine topical partials:

- `layout/theme.liquid` renders `{%- render 'brand' -%}` **after** `color-schemes` (so it wins
  the cascade).
- `snippets/brand.liquid` is a thin **orchestrator**: a single inline `{% style %}` block that
  `{%- render -%}`s nine `snippets/brand-*.liquid` partials **in strict source order** (order is
  load-bearing — later rules override earlier; **do not reorder**), plus the announcement-bar
  marquee `<script>`. The nine partials, in order:
  1. `brand-fonts-and-tokens` — `@font-face` (incl. legacy Copperplate/Flagflies aliases) +
     `:root` tokens. Overrides Horizon's four base font vars: `--font-body--family`,
     `--font-subheading--family`, `--font-heading--family`, `--font-accent--family`. **Change
     global type/tokens here.**
  2. `brand-utilities` — `.bfc-*` helper classes.
  3. `brand-header-nav`
  4. `brand-announcement`
  5. `brand-a11y` — focus ring, heading wrap.
  6. `brand-product-cards`
  7. `brand-cart-search`
  8. `brand-card-commerce` — retro-oval add-to-cart pill (style only; don't change cart logic).
  9. `brand-page-headings` — homepage + collection-page reskin.

**Rules for editing the brand layer:**
- Add new brand CSS **as a partial render** (or into the matching partial) — **never** as a
  separate `{% stylesheet %}`. `{% stylesheet %}` bundles to an external file with different
  load timing and breaks the "wins the cascade" guarantee.
- Each partial is **raw CSS** (no `{% style %}` wrapper) with a `{% doc %}` header. **Avoid
  literal angle-bracket tags in their comments** (e.g. write "the em element", not the literal
  tag) — theme-check parses each partial standalone and treats `<…>` as unclosed HTML.
- `{% style %}` **renders Liquid** (so `asset_url` works for fonts); `{% stylesheet %}` does
  **not**. That's why the brand layer uses `{% style %}`.

## Bespoke brand sections (`bfc-*.liquid`)

Full-width brand sections follow the `bfc-*` pattern: each ports one static section's markup +
`{% stylesheet %}` (referencing brand tokens from `brand.liquid` `:root`) + `{% schema %}`, is
theme-editable, and is wired into a template / section-group JSON. Existing:
`bfc-hero`, `bfc-footer`, `bfc-proudly-banner`, `bfc-recipe-download`, `bfc-recipe-hero`.
Prefer adding/editing a `bfc-*` section over editing Horizon core sections.

- **Hero note (recent):** `bfc-hero.liquid` has two image paths — if the section's "Background
  photo" setting is set, it uses Shopify's responsive `image_tag` (srcset up to 3000w); else it
  falls back to the `assets/hero-powder.webp` (1280px). A high-res 2760px source is bound
  via the picker on the live theme. Keep the `else` fallback asset in place as the safety net.
- **bfc-section bg vs color-scheme gotcha:** a `bfc-*` section that sets its own background AND
  outputs Horizon's `color-{scheme}` class will render the *scheme* background (cascade tie
  resolved by source order). Force the brand bg with `!important` or drop the scheme class.

## Color schemes — the invisible-text trap

`snippets/color-schemes.liquid` emits, per scheme,
`.color-{id}{ color: var(--color-foreground); background-color: var(--color-background); }`, and
components carry that class from a **setting** (cart drawer = `settings.drawer_color_scheme`,
search/popovers = `settings.popover_color_scheme`, sections use their own `color_scheme`). If a
scheme pairs a cream bg with a light fg, inheriting text renders **invisible (white-on-cream)** —
not just off-brand. When text is invisible, suspect the `*_color_scheme` **setting** (repoint it
to a contrasting scheme, usually `scheme-1`), **not** the CSS. Don't edit a shared scheme's
colours (the transparent-header scheme reuses cream/white on purpose for white nav over the hero).
Schemes + global type sizes live in `config/settings_data.json`; base type vars in
`snippets/theme-styles-variables.liquid`.

## Liquid / validation gotchas (visual edits)

- **`inline_richtext` sanitizes hard.** Shopify strips `<span class>` and most attributes from
  `inline_richtext`/announcement values; it keeps `<strong> <em> <i> <b> <a> <br>`. Style via an
  allowed tag (e.g. `.announcement-bar__text em { … }`), not a custom class — the class won't
  survive a push.
- Prefer `image_tag` (with `widths:` + `sizes:`) over hand-written `<img>` — it emits a srcset
  and intrinsic width/height (fixes CLS and the `ImgWidthAndHeight` theme-check error). Images
  referenced via `asset_url` **cannot** be CDN-resized — compress at the source (`sips`).
- Hardcoded `/collections/...` URLs are rejected by the Dev MCP validator — use
  `collections['handle'].url` or `routes.*_url`. Hardcoded `/pages/...` and `/policies/...` are OK.

## Brand QA checklist (apply to every visual change)

From the mobile-first audit — these are the recurring brand defects to keep fixed:
- **Contrast:** orange `#F84B21` on cream `#FBF3CC` fails WCAG AA for small text (3.12:1). Use a
  darker orange / Neem Green for small text; reserve `#F84B21` for ≥24px display or as a bg.
- **Tap targets ≥ 44×44px**; **body/labels ≥ 16px** (bump prices & product names to ≥14px min).
- **Keep a visible `:focus-visible` ring** (in `brand-a11y`); don't let brand CSS suppress it.
- **Long Copperplate/Mexicana headings** need `overflow-wrap:break-word; hyphens:auto`; test 360px.
- **Exactly one `<h1>` per page.** Horizon's header-component already emits the page `<h1>` (the
  shop name) on every page — **do NOT add an `<h1>` to a `bfc-*` homepage section** (duplicate-h1
  a11y bug). Verify `document.querySelectorAll('h1').length === 1`.

## Verifying visually (not by grep)

A passing validator / “it compiled” does **not** mean it looks right. Confirm visually at
**desktop 1280 + mobile 390** against `../site/`. Quickest path this session: open
`http://127.0.0.1:9292` in Chrome and eyeball after the hot reload. For scripted screenshots,
headless Chromium + Playwright are available (resolve `playwright-core` from `/tmp/node_modules`;
Chromium at `~/Library/Caches/ms-playwright/chromium-1223/...`). `loading="lazy"` images below
the fold won't render until scrolled — scroll the full page before a full-page screenshot.

**Two page templates aren't bound to their pages yet** — the `recipes` and `about-us` page
templates now ship on the live theme, but the Pages themselves are still bound to the wrong
template in admin (e.g. the **Recipes page renders the about-us template**, confirmed
2026-06-23). Fixing the binding is an admin step (Online Store → Pages → *page* → Theme
template) and now **takes effect on live immediately** — flag it, don't flip it without
approval. Preview the correct template via the `&view=` param (now renders against the live
MAIN theme directly):
- Recipes: `https://boringfoodscompany.com/pages/recipes?view=recipes`
- About: `https://boringfoodscompany.com/pages/about-us?view=about-us`

## Git

All work happens directly on **`main`** — do **NOT** create feature branches (the live MAIN
theme tracks `main`; branching causes silent push reverts). Commit straight to `main`; push to
`origin` only when the user explicitly asks.

## Suggested skills

- **`shopify-plugin:shopify-liquid`** — invoke before writing/validating any Liquid; it searches
  Shopify docs and validates the code. Treat its validation (and the Dev MCP `validate_theme`) as
  a syntax/schema gate only — **not** proof the page looks right. Visual verification is separate.
