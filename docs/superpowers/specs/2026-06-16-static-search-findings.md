# Static Search — tested behaviour (design source for the theme search remap)

Captured 2026-06-16 by reading `site/js/main.js` (the `storefrontUI()` IIFE, lines 149–318) +
`site/css/main.css` `.sf-search` (1207–1291) and **live-testing** the deployed static site
(https://satwik-aflo.github.io/BFC/) with Playwright at 1280 and 390. This is the spec the
theme search must match — the earlier reskin only recoloured Horizon's *centered* modal and
missed the static's **layout + slide animation**, which is the gap the user flagged.

Screenshots (on disk): `/tmp/bfc-qa/ss_desk_open_final.png`, `ss_mob_open_final.png`,
`ss_desk_open_80ms.png` (mid-slide), `ss_desk_chip.png`.

## What the static search actually is

A **full-width panel that slides down from the top of the viewport** with a dimming scrim —
NOT a centered dialog, NOT a product-grid modal. It is a **hollow design shell**: typing
returns **no live results** (verified: 0 product nodes after typing "moringa"); chips only
fill the input. The comment in `main.js` explicitly says to delete this module on the Shopify
port because "Horizon ships native search + cart drawer" (anchor: `SHOPIFY-PLUG`).

### Trigger & open/close
- Trigger: nav icon link `.nav__cta a[aria-label="Search"]` → `preventDefault()` + `openPanel('search')`.
- Open: shows `.sf-scrim`, adds `body.sf-open body.sf-search-open`, sets panel `aria-hidden=false`,
  and **moves focus to the input after ~60 ms**.
- Close: scrim click, the `.sf-close` button, or **Escape** → removes body classes, hides scrim
  after 450 ms, **restores focus** to the previously focused element (`lastFocus`).

### Animation (exact)
- `.sf-search { position: fixed; top:0; left:0; right:0; transform: translateY(-100%); }`
- `body.sf-search-open .sf-search { transform: translateY(0); }`
- Transition: **`transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)`** (the brand `--ease-out`).
- Verified mid-slide frames: 80 ms → `translateY(-213px)`, 300 ms → `translateY(-2.5px)`.

### Layout / look (verified computed values)
- Full-width: panel rect `w=1280` (desk) / `w=390` (mob), anchored `top:0`.
- Background `rgb(251,243,204)` (Kulfi Malai); **1px solid black bottom border**.
- Inner wrapper `max-width: 64rem; margin: 0 auto`.
- Padding `clamp(1.25rem,4vw,2.25rem) var(--gutter) clamp(2rem,5vw,3rem)`.

### Content blocks (top → bottom)
1. **Top row** `.sf-search__top`: title `.sf-search__title` "Search" (Copperplate/`--font-display`,
   700, `--text-xs`, uppercase, letterspaced) + close button `.sf-close` (✕), space-between.
2. **Field** `.sf-search__field`: a `<label>` with **black `border-bottom`** holding a 24px
   magnifier (`Search1.svg`) + `.sf-search__input` (Aesthet Nova/`--font-body`, weight 500,
   `font-size: clamp(1.25rem,1rem+2vw,2rem)` ≈ 24px desktop / ≈24px mob, **no own border** —
   the underline lives on the field wrapper). Placeholder "Search our boring little pantry…".
3. **Hint** `.sf-search__hint`: "Popular" (Copperplate uppercase, **Neem-Green**, letterspaced).
4. **Chips** `.sf-search__chips` of `.sf-chip` pills: **Turmeric · Moringa · Ashwagandha ·
   Black Pepper · Recipes**. Pill = transparent, thin black border, `border-radius:999px`,
   Copperplate uppercase `--text-xs`; **hover = Neem-Green bg + cream text**. Clicking a chip
   only sets the input value (`searchInput.value = term`); no submit, no results.
5. **Empty state** `.sf-search__empty`: "Nothing typed yet — try a spice above. ☞" (charm font
   `--font-charm`, `--text-lg`, ink-soft). Always shown (shell has no results state).

### Mobile (390)
Identical structure; full-width; chips wrap to multiple rows; panel height ≈ 432 px.

---

## DECISION (2026-06-16, user) — empty state is the product grid, NOT chips

After reviewing the live/official search, the user directed: **do not port the static
"Popular" spice chips.** The search panel's empty state must instead be **Horizon's own
empty state — the "Recently Viewed" + "Products" product grid** (cream bg, Neem-Green
Copperplate section headings, uppercase product names, Ripe-Orange prices, framed pack
shots), which we already brand-styled in Wave 1c. Reference screenshot supplied by the user
(official search empty state) — that grid is the target, verbatim.

**Consequences for the plan:**
- The chip work in items 3–5 of "Content blocks" and item 4 of "The remap work" below is
  **cancelled.** No `bfc-search-chips` snippet, **no edit to any Horizon core file**, no
  chip-action decision.
- The empty-state grid (`predictive-search-empty-state.liquid` → `predictive-search-products-list`)
  stays **exactly as-is**; we only verify it still renders correctly inside the new panel.
- The remap is therefore **pure CSS in `brand.liquid`'s `{% style %}` block** (re-anchor +
  animate the modal shell + restyle the input), plus verification. The "Open decisions"
  below are all resolved/moot.

---

## Mapping target & constraints (for the plan)

**Goal:** make Horizon's search modal *look and animate like this static panel* while keeping
Horizon's **real predictive search** (functional results, focus trap, scroll-lock, keyboard).
"New look + slide animation, same floor plan."

**Horizon structure to override (verified earlier):**
- `<dialog-component id="search-modal" class="search-modal">` → `<dialog class="search-modal__content dialog-modal">`
  (currently a centered cmdk modal) → `predictive-search-component.predictive-search.color-{popover_color_scheme}`
  → `form.predictive-search-form` → `.predictive-search-form__header` (input `.search-input#cmdk-input`,
  `.predictive-search__icon`, `.predictive-search__reset-button`) → results
  (`.predictive-search-results__title`, `.predictive-search-results__card`) → footer
  `.predictive-search-form__footer` with `.predictive-search__search-button` ("View all").
- Already brand-styled (prev. work, in `brand.liquid`): input ≥20px, neem-green section titles,
  Copperplate result names, orange-ink prices, yellow `.bfc-btn` "View all".

**The remap work (look + animation), all in `brand.liquid` `{% style %}` unless noted:**
1. Re-anchor the dialog: `.search-modal__content` → `position:fixed; inset:0 0 auto 0;
   width:100%; max-width:none; margin:0; border-radius:0; border-bottom:1.5px solid black;
   background:var(--kulfi-malai)`. Constrain inner content to `max-width:64rem; margin:0 auto`.
2. Slide-down animation on open. Native `<dialog>` opened via `showModal()` — animate with
   `@keyframes` on `[open]` (`translateY(-100%)→0`, 0.5s `--bfc-ease-out`) and style
   `::backdrop` as the scrim. Respect `prefers-reduced-motion`.
3. Field underline look: wrap row with bottom border; magnifier + big input already sized.
4. **"Popular" chips** — the static's signature element, absent in Horizon. Decide source:
   - (A) Hardcode 5 brand terms as links to `/search?q=<term>` (functional — better than the
     static shell, which only filled the input). Lowest effort, faithful look.
   - (B) Drive from a new section setting (merchant-editable list).
   - (C) Reuse Horizon's empty-state suggestions if present.
   Likely **(A)** with terms Turmeric/Moringa/Ashwagandha/Black Pepper/Recipes, rendered in the
   search section's empty state. NOTE: adding chip markup means touching a search snippet or the
   search section's empty-state block (not pure `brand.liquid` CSS) — confirm the least-invasive
   insertion point during planning (`predictive-search-empty-state.liquid` / search section setting).
5. Keep predictive results rendering below the field (functional) — already styled.

**Open decisions — RESOLVED:**
- Chips: **cancelled** (see DECISION above). Empty state = Horizon product grid, kept as-is.
- Chip markup location / core-file edits: **moot** — no markup added, no core file touched.
- Slide-from-top panel vs predictive UX: still verify scroll behaviour inside the panel —
  Horizon's results wrapper is `position:absolute; top:100%` (a dropdown under the input);
  for a full-width top panel the results must flow *inside* the panel and scroll there, not
  hang off the bottom. This is a CSS override in the plan (`predictive-search-form__content-wrapper`
  → in-flow + `max-height` + internal scroll), not an open question.

**Verification (per project rule):** Playwright screenshots of the theme search at 1280 + 390,
opened via the header search trigger, compared against `ss_desk_open_final.png` /
`ss_mob_open_final.png`; confirm slide animation, full-width top panel, chips, big underlined
input, AND that typing still returns live predictive results + "View all" still works.
