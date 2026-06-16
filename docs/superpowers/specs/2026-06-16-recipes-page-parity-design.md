# Recipes page → static-site visual parity

**Date:** 2026-06-16
**Branch:** feat/theme-reskin-gap-close
**Goal:** Make the Shopify Horizon `theme/` recipes page (`/pages/recipes`) match the
static reference `site/recipes.html`, and apply three pieces of user feedback:
smaller, more legible headings; "Ashwagandha" fits on one line on mobile; replace the
three moringa product images with higher-quality ones from `New Images/`.

## Current state

- `theme/templates/page.recipes.json` renders: `main-page` (bare page-title H1) + three
  `recipe-group` sections (turmeric, moringa, ashwagandha).
- Recipe cards currently have **no images** wired (no `image` set on any block).
- Group color schemes are `scheme-1` / `scheme-3` / `scheme-2` — these do **not** match
  the static per-group colors.
- `recipe-group__title` has no explicit font-size, so it inherits the large `h2` preset —
  too big on mobile; "Ashwagandha" wraps.
- No page-hero kicker, no closing download/sign-off CTA.

Established image pattern in this theme (from commit `ecf982c`, bundle cards): an
`image_asset` text setting rendered via `{{ ... | asset_url }}`, with images committed to
`theme/assets/` and wired in the template JSON. Git-trackable; avoids the admin-overwrites
problem. We reuse this pattern.

## Target structure (`page.recipes.json`)

Top-to-bottom, mirroring `site/recipes.html`:

1. **`recipe-hero`** (new section, first) — kicker "Recipe Guide", single `<h1>`
   ("Simple Ways to Use Power-Packed Ingredients"), intro paragraph. Centered.
2. **`main-page`** — keep, but **remove the `heading` block** so there is no duplicate
   `<h1>`. Retains `page-content` for any CMS page body.
3. **`recipe_group_turmeric` / `_moringa` / `_ashwagandha`** — existing sections, updated.
4. **`recipe-download`** (new section, last) — kicker "The Whole Guide", heading "Take It
   With You", PDF button (existing BFC_Recipe_Guide.pdf URL), and sign-off paragraph
   (`@boringfoodscompany`, "Anvi & Varuni" in script/Musloner accent font).

## Components

### New section: `theme/sections/recipe-hero.liquid`
- Settings: `kicker` (text), `heading` (text), `intro` (richtext/textarea), `color_scheme`
  (default scheme-1), padding top/bottom.
- Markup: `<header class="recipe-hero">` → kicker span, `<h1>`, intro `<p>`.
- Kicker styled like static `.kicker`: Copperplate, uppercase, letterspaced, with the
  flanking 1px rules (`::before`/`::after`). `justify-content:center`.
- H1: Copperplate, neem green, mobile-legible clamp (smaller than static's `text-3xl`),
  `overflow-wrap:break-word; hyphens:auto`.

### New section: `theme/sections/recipe-download.liquid`
- Settings: `kicker`, `heading`, `button_label`, `button_url`, `signoff` (richtext),
  `color_scheme`, padding.
- Markup: centered kicker + heading + `.btn`-style PDF link (with ☞ hand glyph,
  `aria-hidden`) + sign-off paragraph; "Anvi & Varuni" wrapped in the script accent font.

### Updated section: `theme/sections/recipe-group.liquid`
- **Card colors hardcoded to brand cream**, independent of the group color scheme:
  `.recipe-card { background:#fbf3cc; color:#000; }`, title `#244f24`. This keeps cards
  cream on the green moringa band (matching static). Today they inherit `--color-*` and
  would turn green.
- **Group title size reduced**: `font-size: clamp(1.5rem, 1.1rem + 1.8vw, 2.5rem)`,
  `letter-spacing: 0.02em`. At 360–390px this renders ≈24–29px, so "Ashwagandha" (11
  uppercase chars) fits on one line. Keep `overflow-wrap:break-word; hyphens:auto` as a
  safety net.
- **Image support** added to the `recipe` block:
  - New settings: `image_asset` (text, theme-asset filename) and `cutout` (checkbox).
  - Render order matches static: media figure first, then badge, title, ingredients,
    method, hack, etc. Use existing `image` (image_picker) if set, else `image_asset` via
    `asset_url`.
  - Cutout cards (`cutout: true`): `object-fit:contain`, padding ~0.9rem, drop-shadow —
    for product PNGs. Photo cards: `object-fit:cover` (current behavior).

## Color scheme remap (in `page.recipes.json`)

| Group       | Static color           | Theme scheme |
|-------------|------------------------|--------------|
| Turmeric    | Mango Yellow `#F9BF29` | `scheme-2`   |
| Moringa     | Neem Green `#244F24` (cream text) | `scheme-neem` |
| Ashwagandha | Deep cream `#F6EBB4`   | `scheme-1` (base cream `#fbf3cc`; closest available) |

`scheme-neem` already provides cream `foreground`/`foreground_heading` on green — good
contrast for the group heading/intro, and not a forbidden combo.

## Images

Port all recipe photos into `theme/assets/`, renamed `recipe-<slug>.<ext>`:

| Card | Source | Asset name | cutout |
|------|--------|-----------|--------|
| Turmeric Lemonade | site/assets/img/recipes/turmeric-lemonade.jpg | recipe-turmeric-lemonade.jpg | no |
| Turmeric Morning Detox | …/turmeric-detox.jpg | recipe-turmeric-detox.jpg | no |
| **Moringa Latte** | **New Images/ moringalatte.png** | recipe-moringa-latte.png | yes |
| **Moringa Buttermilk** | **New Images/moringabuttermilk.png** | recipe-moringa-buttermilk.png | yes |
| **Moringa Overnight Oats** | **New Images/moringaoats.png** | recipe-moringa-oats.png | yes |
| Moringa Rotis & Dosas | site/…/moringa-dosa.png | recipe-moringa-dosa.png | yes |
| Ashwagandha Protein Shake V1 | site/…/ashwagandha-shake-1.jpg | recipe-ashwagandha-shake-1.jpg | no |
| Ashwagandha Protein Shake V2 | site/…/ashwagandha-shake-2.jpg | recipe-ashwagandha-shake-2.jpg | no |
| Ashwagandha Hot Chocolate | site/…/ashwagandha-hot-chocolate.png | recipe-ashwagandha-hot-chocolate.png | yes |
| Ashwagandha Night Tea | site/…/ashwagandha-night-tea.jpg | recipe-ashwagandha-night-tea.jpg | no |

Note: the New Images latte filename has a leading space — copy to the clean asset name.

## Out of scope
- `New Images/advisor.jpg` (belongs to another page).
- Publishing to the **live** theme. Push only to preview theme `#151032561833`.

## Validation / done criteria
- `validate_theme` (Shopify Dev MCP) passes on the two new sections + edited section + JSON.
- Push only our files to preview theme `#151032561833` with `--nodelete --only …`.
- Visual check at mobile (390px) and desktop against `site/recipes.html`:
  - three colored group bands (mango / green / cream), cream cards on all;
  - all cards show images; moringa/dosa/hot-choc render as cutouts with drop-shadow;
  - group headings smaller; "Ashwagandha" on one line at 390px;
  - hero kicker + H1 + intro at top; download CTA + sign-off at bottom.
