# Home-page & Mobile Polish — Design

**Date:** 2026-06-17
**Branch:** `fix/home-mobile-polish`
**Scope:** Five visual defects on the BFC Horizon reskin, found on the draft theme
(`#151032561833`). All fixes are **purely additive** to the brand layer / brand sections /
template JSON — no pristine Horizon core section or block is edited. The live theme is never
touched; all work and verification happen on draft `#151032561833`.

## Guardrails (non-negotiable)

- Work only on draft theme **`#151032561833`**. **Never** push/publish to the live theme.
- Always pass `--path theme` to the Shopify CLI. Push only the touched files (`--only`,
  `--nodelete`).
- **Verify every push by pulling the file back and grepping** — never trust the success banner.
- Verification is **visual** (Playwright screenshots at mobile 390 + desktop 1280, compared to
  the broken baselines) **plus** axe-core on the home page — not validator/grep alone.
- Prefer editing `snippets/brand.liquid` (the documented brand-override layer) over template
  JSON where a change can live in either, because `templates/index.json` is auto-generated and
  can be overwritten by the admin theme editor.

## The five issues, root causes, and fixes

### Issue 2 — Header logo touches the promo bar (global; desktop + mobile)
**Root cause.** The header is `section_height: compact`; the logo is sized
`height: clamp(48px, 4vw, 58px)` (brand.liquid) with `padding-block-start: 0`, so it fills the
header and butts directly against the announcement (promo) bar above it, with no gap.

**Fix.** In `snippets/brand.liquid`, give the header logo a small amount of top breathing room
(e.g. a `padding-block-start` / `margin-block-start` on `.header-logo`, or a touch of header
top padding) so it no longer kisses the promo bar. Applies on every page. Keep the logo within
the header (don't let added spacing overflow the bar or shift the nav).

### Issue 4 — Two logos overlap + nav over hero (home page, mobile)
**Root cause.** On the index page the header is transparent and `position: absolute` over the
hero. The hero (`bfc-hero`) renders its **own** big logo (≈200×112 at the top-center), while the
Horizon header **also** renders its logo (≈85×48, centered on mobile) in the same spot → the two
overlap (measured: header logo y≈147–195, hero logo y≈161–273). The header's inline navigation
row (the `navigation_bar` second row) is also shown on mobile and lands on top of the hero logo.

**Fix — three coordinated changes.**
1. `sections/header-group.json`: set the `_header-logo` block's `hide_logo_on_home_page: true`.
   This hides the header logo at the top of the home page (the hero's big logo becomes the sole
   mark) and — via Horizon's existing core CSS for `sticky='always'` — **reappears automatically
   once the user scrolls** into the solid sticky header. This is an existing setting on an
   existing block, so it is a single safe push.
2. `snippets/brand.liquid`: hide the inline navigation row on mobile (`@media (max-width:749px)`)
   so the menu lives only in the hamburger drawer. The cart + search icons stay in the bar. The
   exact selector for the inline nav row is confirmed by a live DOM probe during implementation.
3. `sections/bfc-hero.liquid`: after 1 + 2, confirm by screenshot that the hero's big logo +
   tagline clear the header icon row on mobile; nudge the hero's mobile top spacing only if an
   overlap remains.

**Out of scope / preserved:** the account icon stays (prior eyes-open user decision); the
transparent-over-photo header aesthetic stays; the hamburger drawer, cart, and search must keep
working.

### Issue 7 — "Boring Foods Your Way" heading appears twice
**Root cause.** Two sections render the phrase back-to-back:
- `section_pemmFU` ("BFC Heading"): a standalone section whose `text` block is
  `<h2>Boring Foods, Your Way</h2>`, correctly styled in Copperplate (`--font-heading--family`,
  uppercase, dark foreground). This is the dark heading.
- `product_list_wE8meU` (the product grid): its built-in `static-header` block `text_djKiBH` is
  `<h3>Boring Foods your way</h3>`, but configured with `--font-body--family` at `1rem` /
  `type_preset: rte` in the orange foreground → the mismatched orange heading.

**Fix (user decision: "Drop standalone, restyle grid header").** In `templates/index.json`:
- Remove the standalone section `section_pemmFU` (delete it from both `sections` and `order`).
- Restyle the product grid's header `text_djKiBH` to match the brand heading: `font` →
  `var(--font-heading--family)`, `font_size` → `var(--text-2xl)`, `case` → `uppercase`, and the
  appropriate heading `type_preset` (mirroring the standalone block's settings). Keep the text
  copy (decide casing — match the standalone's "Boring Foods, Your Way").

**Push caution.** `index.json` contains installed-app blocks (instafeed, judge.me) that the Dev
MCP validator cannot resolve — those errors are known false positives and unrelated to this
edit. We are editing existing settings only (no new schema), so a single push is safe; verify by
pulling `index.json` back and grepping for the new font value + the absence of `section_pemmFU`.

### Issue 8 — "Boringly Clean & Pure" ribbon overlaps the body text (mobile ≤768px)
**Root cause.** In `sections/boringly-clean-pure.liquid`, the badge (ribbon SVG + heading) is
`position: absolute; top: -30px` (mobile) over a flex `.bc-section__text-blob` whose mobile
`padding-top` is only `70px` — not enough to clear the ribbon, so the ribbon overlaps the body
copy. (The section also uses an inline `<style>` block and a system font rather than brand
tokens, but the user's complaint is strictly the overlap.)

**Fix.** In the section's mobile media block (`@media (max-width:768px)`), increase
`.bc-section__text-blob` top padding and/or adjust the `.bc-section__badge-container` top offset
so the ribbon sits clear of the body text. Scope strictly to mobile; do not change the desktop
layout. Confirm by screenshot at 390 and at the 768 breakpoint.

### Issue 9 — Review name stranded at the bottom / long mobile scroll (mobile only)
**Root cause.** The judge.me featured carousel fixes each slide to ≈200px and stretches
`.jdgm-carousel-item__review` to the tallest review (≈178px), so the reviewer name
(`.jdgm-carousel-item__reviewer-name-wrapper`) sits far below short reviews, and each slide
carries large dead vertical space → long mobile scroll.

**Fix (user priority: shortest possible mobile scroll).** In `snippets/brand.liquid`, under a
mobile media query (`@media (max-width:749px)`), collapse the carousel slide to its natural
content height — override the app's forced heights with `height: auto !important;
min-height: 0 !important` on `.jdgm-carousel-item` and `.jdgm-carousel-item__review`. Each review
then takes only the space it needs, the name lands directly under the text, and the section's
mobile footprint shrinks. **Desktop is left untouched** (side-by-side reviews still benefit from
equal heights). `!important` in the stylesheet overrides judge.me's non-`!important` inline
heights regardless of when the app's JS applies them. Accepted trade-off: a slide may change
height as the user swipes — negligible in a one-at-a-time mobile carousel.

## Files touched (summary)

| File | Issue(s) | Change |
|------|----------|--------|
| `snippets/brand.liquid` | 2, 4, 9 | header-logo top spacing; hide inline nav on mobile; jdgm mobile height-collapse |
| `sections/header-group.json` | 4 | `hide_logo_on_home_page: true` |
| `sections/bfc-hero.liquid` | 4 | mobile hero top-spacing nudge (only if needed after 4.1/4.2) |
| `sections/boringly-clean-pure.liquid` | 8 | mobile padding / badge offset |
| `templates/index.json` | 7 | remove standalone heading section; restyle grid header to Copperplate |

No new section types and no new settings are introduced, so the two-push rule does not apply;
each file is a single surgical push verified by pull-back.

## Verification plan (per change + final)

1. Validate edited Liquid/JSON with the Shopify Dev MCP `validate_theme` (treating app-block
   errors in `index.json` as known false positives).
2. Push only the touched files: `shopify theme push --path theme --store d9v1pv-06.myshopify.com
   --theme 151032561833 --nodelete --only <file> …`.
3. Pull each changed file back to a temp dir and grep to confirm the value landed.
4. Playwright screenshots at **mobile 390** and **desktop 1280** of the home page (and the
   judge.me + boringly-clean sections), compared against the broken baselines in `/tmp/bfc-qa/`.
5. Re-run axe-core on the home page — expect no new contrast or landmark violations.
6. Confirm interactive bits still work: hamburger drawer opens, cart + search reachable, header
   logo reappears on scroll, carousel still swipes.

## Success criteria

- Header logo has clear space below the promo bar on all pages (no touching).
- Home mobile: exactly one logo visible at the top (the hero's); no inline nav over the hero; on
  scroll the compact header logo reappears.
- Exactly one correctly-branded (Copperplate) "Boring Foods Your Way" heading above the grid.
- "Boringly Clean & Pure" ribbon never overlaps the body copy at any width ≤768px.
- judge.me reviews on mobile are compact, name directly under the text, materially shorter
  scroll; desktop unchanged.
- No live-theme changes; no axe-core regressions on home.
