# Boring Foods Theme Reskin — Gap-Close Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the in-progress Horizon reskin (`theme/`) to visual parity with the latest static `site/` design, preserving all native Shopify storefront functionality.

**Architecture:** Purely-additive reskin. Brand changes live in `theme/snippets/brand.liquid`, `theme/config/settings_data.json`, `theme/snippets/theme-styles-variables.liquid`, and our own custom sections/templates. Horizon core sections/snippets stay pristine. Native search/cart logic is reskinned, never rebuilt.

**Tech Stack:** Shopify Horizon 3.5.1, Liquid, `{% style %}` (renders Liquid for `asset_url`), CSS custom properties, Shopify CLI 4.1.0, `shopify-liquid` skill (search+validate), Shopify Dev MCP.

**Spec:** `docs/superpowers/specs/2026-06-15-theme-reskin-gap-close-design.md`

---

## Conventions used in EVERY task

**Validation (required before every commit that changes a `.liquid`/`.json` theme file):**
Use the `shopify-liquid` skill loop. For files on disk:
```
node ~/.claude/plugins/cache/shopify-ai-toolkit/shopify-plugin/1.4.1/skills/shopify-liquid/scripts/validate.mjs \
  --theme-path /Users/saimeda/Documents/Codex/medas/BFC/theme \
  --files <comma,separated,relative,paths> \
  --user-prompt-base64 <b64> --model claude-opus-4-8 --client-name claude-code \
  --client-version 1.0 --artifact-id <stable-id> --revision <n>
```
Before authoring an unfamiliar tag/object, run `scripts/search_docs.mjs "<topic>"` first. Fix → re-validate (≤3 retries). Also acceptable: Shopify Dev MCP `learn_shopify_api`(api:`liquid`) → `validate_theme`.

**Preview push (after validation passes, surgical only — NEVER full push, NEVER live theme):**
```
shopify theme push --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete \
  --only <path1> --only <path2> ...
```
Verify at `https://d9v1pv-06.myshopify.com?preview_theme_id=151032561833` (incognito confirms live is untouched).

**Commit** after each task on branch `feat/theme-reskin-gap-close`. End messages with the Co-Authored-By trailer.

**Brand tokens (from `site/css/tokens.css`):** Indian Blue `#5D57C5`, Kulfi Malai `#FBF3CC`, Ripe Orange `#F84B21`, Mango Yellow `#F9BF29`, Neem Green `#244F24`, Kohl Black `#000000`, Kulfi Deep `#F6EBB4`, Ink Soft `rgba(0,0,0,.72)`. WCAG-safe small-text orange: `#C2390F`.

**Shared-file rule:** `brand.liquid`, `settings_data.json`, `index.json` are single-owner serialization points. Wave 0 owns the first edits. Wave 1 tasks 1b/1c append CSS to `brand.liquid` **sequentially**, not concurrently.

---

# WAVE 0 — Foundation (one owner, do first)

### Task 0.1: WCAG fix + type-size floor in settings_data.json

**Files:**
- Modify: `theme/config/settings_data.json:40` (`type_size_h5`), `:43` (`type_size_h6`), `:362-366` (scheme `scheme-586e3a18-…` foreground)

- [ ] **Step 1: Raise sub-16px heading floors.** Change `"type_size_h5": "14"` → `"16"` and `"type_size_h6": "12"` → `"14"`.

- [ ] **Step 2: Fix the failing orange-on-cream scheme.** In `scheme-586e3a18-0ec1-42b1-aba4-67be3c2c6f92` (the scheme used by the Shop product-list header), change `"foreground": "#f84b21"` → `"foreground": "#c2390f"`. Leave `background: #fbf3cc`. (This raises 3.12:1 → ≥4.5:1 AA.)

- [ ] **Step 3: Validate.** `validate.mjs --files config/settings_data.json` → expect pass (JSON well-formed).

- [ ] **Step 4: Push + eyeball.** Push `--only config/settings_data.json`; confirm the Shop section kicker/price now reads as a deep brick orange, page otherwise unchanged.

- [ ] **Step 5: Commit.**
```bash
git add theme/config/settings_data.json
git commit -m "fix(theme): WCAG orange-on-cream -> #c2390f; raise h5/h6 size floor"
```

### Task 0.2: Add a Neem-Green color scheme

**Files:**
- Modify: `theme/config/settings_data.json` (insert a new scheme inside `current.color_schemes`, after `scheme-586e3a18-…` closes at `:367`; mirror scheme-1's full key set)

- [ ] **Step 1: Insert scheme `scheme-neem`.** Copy the complete settings key-set from `scheme-1` (`:89-126`) and change only these: `background` `#244f24`, `foreground_heading` `#fbf3cc`, `foreground` `#fbf3ccf2`, `primary` `#fbf3cc`, `primary_hover` `#ffffff`, `border` `#fbf3cc3d`, `primary_button_background` `#f9bf29`, `primary_button_text` `#000000`, `primary_button_border` `#f9bf29`, `primary_button_hover_background` `#fbf3cc`, `primary_button_hover_text` `#000000`, `secondary_button_text` `#fbf3cc`, `secondary_button_border` `#fbf3cc`, `input_text_color` `#fbf3cc`, `input_border_color` `#fbf3cc66`. Keep every other key identical to scheme-1.
  - Brand-rule check: green bg uses cream/mango foregrounds only — no black-on-green, no blue-on-green. ✓

- [ ] **Step 2: Validate.** `validate.mjs --files config/settings_data.json` → pass.

- [ ] **Step 3: Commit.**
```bash
git add theme/config/settings_data.json
git commit -m "feat(theme): add Neem-Green color scheme for bundles/CTAs"
```
(No visible change yet — consumed by Wave 2 Bundles + Reports CTA.)

### Task 0.3: brand.liquid — font aliases, script/poster vars, focus ring, heading wrap

**Files:**
- Modify: `theme/snippets/brand.liquid` (add `@font-face` aliases after `:71`; extend `:root` `:73-78`; add new CSS rules before `{% endstyle %}` `:119`)

- [ ] **Step 1: Add hyphenated Aesthet-Nova aliases** (the comparison table forces these family names). After the existing Aesthet Nova faces, add inside `{% style %}`:
```liquid
  @font-face {
    font-family: "Aesthet-Nova-Light";
    src: url({{ 'AesthetNova-Light.otf' | asset_url }}) format("opentype");
    font-weight: 300; font-style: normal; font-display: swap;
  }
  @font-face {
    font-family: "Aesthet-Nova";
    src: url({{ 'AesthetNova-Medium.otf' | asset_url }}) format("opentype");
    font-weight: 400 700; font-style: normal; font-display: swap;
  }
  @font-face {
    font-family: "Aesthet-Nova-Medium";
    src: url({{ 'AesthetNova-Medium.otf' | asset_url }}) format("opentype");
    font-weight: 500; font-style: normal; font-display: swap;
  }
```

- [ ] **Step 2: Bind script + poster families.** In the `:root` block, add:
```liquid
    --font-script: "Musloner", cursive;
    --font-poster: "Mexicana Hollow", "Copperplate BFC", serif;
```

- [ ] **Step 3: Add global focus ring + heading wrap.** Before `{% endstyle %}`:
```liquid
  :where(a, button, summary, input, select, textarea, [tabindex]):focus-visible {
    outline: 2px solid #5D57C5;
    outline-offset: 2px;
    border-radius: 2px;
  }
  h1, h2, h3, h4, .h1, .h2, .h3, .h4 {
    overflow-wrap: break-word;
    hyphens: auto;
  }
```

- [ ] **Step 4: Validate.** `validate.mjs --files snippets/brand.liquid` → pass. If it flags `{% style %}`/`asset_url`, that's expected-valid (search `"style tag asset_url"` to confirm).

- [ ] **Step 5: Push + eyeball.** Push `--only snippets/brand.liquid`; tab through homepage to confirm a blue focus ring appears; confirm no layout regression.

- [ ] **Step 6: Commit.**
```bash
git add theme/snippets/brand.liquid
git commit -m "feat(theme): font aliases, script/poster vars, focus-visible ring, heading wrap"
```

---

# WAVE 1 — Parallel fan-out (after Wave 0)

> 1a and 1d touch independent files → fully parallel. 1b and 1c both append to `brand.liquid` → run **sequentially** (1b then 1c), or hand their CSS deltas to one owner.

### Task 1a: Restore hero + upgrade heading blocks

**Files:**
- Read source: `site/index.html` (`.hero` block) + `site/css/main.css` (`.hero*` rules)
- Modify: `theme/templates/index.json` (`custom_liquid_CjPRme` settings → replace stale hero markup; `section_pemmFU`, `section_PWFkyK`, `section_HmpREz` heading blocks)
- Assets: confirm `logo-web4.png` + `hero-powder.jpg` exist as store `shop_images` (else upload via admin or `theme/assets`)

- [ ] **Step 1: Extract the current hero.** From `site/index.html`, copy the `.hero` markup verbatim: the `logo-web4.png` lockup, the tagline ("…boring on the outside, powerful on the inside" copy as written), the two `☞`-prefixed CTAs (Shop / Our Story → `#manifesto`), and the Single-Origin / Lab-Tested side-meta list. Note its CSS in `site/css/main.css`.

- [ ] **Step 2: Replace stale hero markup.** In `index.json`, swap the `custom_liquid_CjPRme` `custom_liquid` value for the extracted markup, repointing image URLs to the theme equivalents (`hero-powder.jpg`, `logo-web4.png`). Remove the old `logo-web.png` + WhatsApp-image references. Keep it as `custom-liquid` (don't introduce new logic).

- [ ] **Step 3: Upgrade heading blocks.** For `section_pemmFU` ("Boring Foods, Your Way"), `section_PWFkyK` ("How We Are Different"), `section_HmpREz` ("Socials"): change the rendered heading from body-font `<h3>`@1rem to the brand kicker + display-H2 pattern — set the block's font to `heading` (Copperplate) and size to the H2 token, add the Copperplate small-caps kicker line above each (per `site/index.html` `.kicker`/`.section-head`). Re-add the spark image on "How We Are Different".

- [ ] **Step 4: Validate.** `validate.mjs --files templates/index.json` → pass.

- [ ] **Step 5: Push + compare.** Push `--only templates/index.json`; compare hero + the three section heads against `site/` at desktop and 360px. Confirm CTAs link correctly and headings don't clip.

- [ ] **Step 6: Commit.**
```bash
git add theme/templates/index.json
git commit -m "feat(theme): restore current hero + brand kicker/display headings"
```

### Task 1b: Brand product/bundle card reskin + retire custom-product-section

**Files:**
- Read source: `site/css/main.css` (`.card`, `.card__media`, `.card__label`, `.card__label::before`, `.card__name`, `.card__weight`, hover rules) + `site/index.html` (`.card` markup)
- Inspect: `theme/snippets/product-card.liquid` (Horizon native — DO NOT EDIT) to learn its real class names (`.product-card`, `.product-card__content`, title/price wrappers)
- Modify: `theme/snippets/brand.liquid` (append a card-reskin block)
- Modify: `theme/templates/index.json` (delete the disabled `custom_product_section_PnFTdK` entry + its `order` reference)
- Optional delete: `theme/sections/custom-product-section.liquid`

- [ ] **Step 1: Map native classes.** Open `theme/snippets/product-card.liquid`; record the actual wrapper/title/price/image selectors. (Search `"product card classes Horizon"` if unclear.)

- [ ] **Step 2: Author the brand card CSS** in `brand.liquid` targeting the native selectors. Recreate the site card spec: square image top with `border-radius:12px`; an Indian-Blue label panel (`background:#5D57C5`, cream `#FBF3CC` text) holding the Copperplate uppercase name + weight line; an inset dotted cream border via `::before { inset:7px; border:1.6px dotted rgba(251,243,204,.7); }`; hover `transform: translateY(-4px)` + label `box-shadow: 5px 5px 0 #000` + image `scale(1.05)`. **Keep Horizon's price** but restyle it (Copperplate, cream on the blue panel or under the photo — match `site/` placement; do not hide it). Use `var(--font-heading--family)` for the name. Pseudocode of structure (fill exact native selectors from Step 1):
```liquid
  .product-card { transition: transform .35s var(--ease, ease); }
  .product-card:hover { transform: translateY(-4px); }
  .product-card__content { /* the blue label panel */
    position: relative; background:#5D57C5; color:#FBF3CC; border-radius:12px;
  }
  .product-card__content::before {
    content:""; position:absolute; inset:7px; border:1.6px dotted rgba(251,243,204,.7);
    border-radius:8px; pointer-events:none;
  }
  .product-card__title { font-family:var(--font-heading--family); text-transform:uppercase; }
```

- [ ] **Step 3: Retire `custom-product-section`.** In `index.json`, remove the `custom_product_section_PnFTdK` section object and delete its id from `order`. (It is already `disabled`, so no visual change.) Optionally `git rm theme/sections/custom-product-section.liquid`.

- [ ] **Step 4: Validate.** `validate.mjs --files snippets/brand.liquid,templates/index.json` → pass.

- [ ] **Step 5: Push + verify everywhere.** Push the two files; check brand cards on homepage Shop grid AND on a collection page AND in search results (all use the native card now). Confirm price is visible and on-brand, dotted border renders, hover works, tap target ≥44px.

- [ ] **Step 6: Commit.**
```bash
git add theme/snippets/brand.liquid theme/templates/index.json
git rm theme/sections/custom-product-section.liquid 2>/dev/null; true
git commit -m "feat(theme): brand-style native product cards; retire custom-product-section"
```

### Task 1c: Search overlay + cart drawer reskin (native, visual only)

**Files:**
- Read source: `site/js/main.js` (sf-search/sf-cart shells), `site/css/main.css:1204-1462`
- Inspect (DO NOT EDIT logic): `theme/snippets/search-modal.liquid`, `theme/snippets/header-actions.liquid` (`<cart-drawer-component>`), `theme/snippets/cart-products.liquid`, `theme/snippets/cart-summary.liquid`, `theme/snippets/cart-bubble.liquid`
- Modify: `theme/config/settings_data.json` (`current` block: set `popover_color_scheme` + `drawer_color_scheme` to a cream scheme, e.g. `scheme-1`; set `empty_state_collection` to a curated "popular" collection)
- Modify: `theme/snippets/brand.liquid` (append a search+cart reskin block)

- [ ] **Step 1: Point colors via settings.** Add/confirm in `current`: `"popover_color_scheme": "scheme-1"`, `"drawer_color_scheme": "scheme-1"`. Set `"empty_state_collection"` to the popular collection handle/id (confirm the setting key by searching `"predictive search empty state collection"`).

- [ ] **Step 2: Cart reskin CSS** in `brand.liquid` (target native classes; do not alter markup): `.cart-bubble__background` → Ripe Orange `#F84B21` pill with `1px solid #000`, `.cart-bubble__text` Copperplate; `.cart-drawer__summary` → `#F6EBB4` (kulfi-deep) bg + top `1.5px solid #000`; quantity widget in `.cart-items__table-row` → pill stepper; `#checkout.cart__checkout-button` → brand primary look. Keep ≥44px touch targets.

- [ ] **Step 3: Search reskin CSS** in `brand.liquid`: `.search-modal__content` cream background; `.search-input` Aesthet Nova ≥16px (no iOS zoom); `.predictive-search__icon`/close button kohl-black; style the empty-state carousel header in Copperplate. (Accept Horizon's native bottom slide / collection carousel — do not rebuild term chips.)

- [ ] **Step 4: Validate.** `validate.mjs --files snippets/brand.liquid,config/settings_data.json` → pass.

- [ ] **Step 5: Push + functional check.** Push both files. On preview: open search (carousel shows, cream styled, input ≥16px), add a product to cart, open the drawer (orange bubble, kulfi-deep footer, working stepper, checkout button reaches real checkout). **Confirm add-to-cart and checkout still work** — logic must be untouched.

- [ ] **Step 6: Commit.**
```bash
git add theme/snippets/brand.liquid theme/config/settings_data.json
git commit -m "feat(theme): brand reskin of native predictive search + cart drawer"
```

### Task 1d: Reports table + review-page fix + About template cleanup

**Files:**
- Read source: `site/reports.html` + `site/css/pages.css` (`.reports-table`, `data-label` stacked-card rules, green CTA)
- Modify: `theme/templates/page.reports.json` (swap the `custom-liquid` table for `sections/reports-table-section.liquid`; add green "Shop the Range" CTA section using `scheme-neem`)
- Modify: `theme/templates/page.review-page.json` (replace About-copy content with a judge.me reviews block, mirroring the homepage `featured_carousel` app block; or delete the template if reviews stay homepage-only — confirm with user default = add judge.me block)
- Modify: `theme/templates/page.json`, `page.about-us.json` (resolve the 3 About templates: make the ported version canonical; ensure one `<h1>` per interior page by re-enabling the `main-page` title block on About/FAQ/Reports)

- [ ] **Step 1: Reports table.** Inspect `theme/sections/reports-table-section.liquid`; confirm it produces the `data-label` stacked-card responsive pattern from `site/reports.html`. Repoint `page.reports.json` to use it instead of the raw `custom-liquid` table. Add a green CTA section (`scheme-neem`) with the "Proof, Not Promises / Shop the Range" copy + button.

- [ ] **Step 2: Review page.** Replace `page.review-page.json` body (currently an About copy) with the judge.me reviews block used on the homepage. Validate the app block type by checking `index.json`'s `judge_me_reviews_featured_carousel_*` entry.

- [ ] **Step 3: About cleanup + h1.** Decide canonical About = the fully-ported `page.json` version; ensure the Shopify About page points at it. Re-enable the `main-page` `<h1>` block (un-`disabled`) on About, FAQ, Reports so each page has exactly one `<h1>` and sequential headings.

- [ ] **Step 4: Validate.** `validate.mjs --files templates/page.reports.json,templates/page.review-page.json,templates/page.json,templates/page.about-us.json` → pass.

- [ ] **Step 5: Push + check.** Push changed templates. On preview at 360px: reports table becomes stacked cards (no horizontal scroll), green CTA shows; review page shows real reviews; About/FAQ/Reports each have a visible single `<h1>`.

- [ ] **Step 6: Commit.**
```bash
git add theme/templates/page.reports.json theme/templates/page.review-page.json theme/templates/page.json theme/templates/page.about-us.json
git commit -m "fix(theme): responsive reports table + CTA, real reviews page, About h1/canonical"
```

---

# WAVE 2 — New content sections

### Task 2a: Bundles ("Blends With a Purpose") section

**Files:**
- Read source: `site/index.html` (`#bundles` block, `.card--bundle`), `site/css/main.css`
- Create: `theme/sections/bundles.liquid` (custom section, `{% schema %}` validated against `schemas/section.json`; uses `scheme-neem`; renders bundle products/collection via brand card markup with a composition subtitle, e.g. "Turmeric + Moringa")
- Modify: `theme/templates/index.json` (insert the section into `order` between the Shop grid and the Different/comparison section)

- [ ] **Step 1: Search.** `search_docs.mjs "section schema collection product list settings"` to confirm the collection/product block setting types.

- [ ] **Step 2: Author `bundles.liquid`.** Title "Blends With a Purpose" (Copperplate display), green section (`color-{{ section.settings.color_scheme }}` → `scheme-neem`). Loop bundle products from a chosen collection; render the same brand card look as Task 1b with the composition string in the weight/subtitle slot. Include `{% schema %}` with `color_scheme`, `collection`, `heading`, and `blocks` for cards, plus a `presets` entry. Add `{{ block.shopify_attributes }}` on card wrappers.

- [ ] **Step 3: Validate.** `validate.mjs --files sections/bundles.liquid` → pass; fix schema errors via `search_docs`.

- [ ] **Step 4: Wire into homepage.** Add the section to `index.json` `order` + `sections`. Validate `templates/index.json`.

- [ ] **Step 5: Push + check.** Push `--only sections/bundles.liquid --only templates/index.json`; confirm green bundles section renders with brand cards, 2-up on mobile, AA contrast.

- [ ] **Step 6: Commit.**
```bash
git add theme/sections/bundles.liquid theme/templates/index.json
git commit -m "feat(theme): add Bundles (Blends With a Purpose) section"
```

### Task 2b: Manifesto section

**Files:**
- Read source: `site/index.html` (`#manifesto` block — "The Future of Health is Ancient" + body + `#proudlyboring`)
- Create: `theme/sections/manifesto.liquid`
- Modify: `theme/templates/index.json` (insert into `order`; the hero "Our Story" CTA links to `#manifesto`)

- [ ] **Step 1: Author `manifesto.liquid`.** Display heading in Copperplate/`--font-poster`; body in Aesthet Nova; the `#proudlyboring` accent in `var(--font-script)` (Musloner). Give the section an anchor id `manifesto` so the hero CTA resolves; add `scroll-margin-top` to clear the sticky header. Include `{% schema %}` (heading, body richtext, color_scheme) + preset.

- [ ] **Step 2: Validate.** `validate.mjs --files sections/manifesto.liquid` → pass.

- [ ] **Step 3: Wire + validate index.** Add to `index.json`; validate.

- [ ] **Step 4: Push + check.** Push both; click hero "Our Story" → scrolls to manifesto with header clearance; Musloner renders on `#proudlyboring`.

- [ ] **Step 5: Commit.**
```bash
git add theme/sections/manifesto.liquid theme/templates/index.json
git commit -m "feat(theme): add Manifesto section with Musloner #proudlyboring accent"
```

### Task 2c: Recipes page (highest effort)

**Files:**
- Read source: `site/recipes.html` + `site/css/pages.css` (3 ingredient groups — Turmeric/Moringa/Ashwagandha — 10 recipe cards: badge, ingredients `<ul>`, method, hack, PDF CTA, sign-off)
- Create: `theme/sections/recipe-group.liquid` (one ingredient group with nested recipe-card blocks)
- Create: `theme/templates/page.recipes.json` (assembles the groups)
- Verify: the nav/footer "Recipes" link points at the page handle this template binds to (fixes the current 404)

- [ ] **Step 1: Search.** `search_docs.mjs "section blocks nested recipe card schema"` + `"page template json section order"`.

- [ ] **Step 2: Author `recipe-group.liquid`.** Group heading + intro; `blocks` of type `recipe` each with: badge text, image, ingredients (richtext/list), method (richtext), "Boring Hack" callout, optional PDF download (`url`/`file` setting), sign-off line. Brand type/colors; `{{ block.shopify_attributes }}` on cards; `{% schema %}` + preset. Ensure ≥16px body, one `<h1>` comes from the page title block, group headings are `<h2>`.

- [ ] **Step 3: Validate.** `validate.mjs --files sections/recipe-group.liquid` → pass.

- [ ] **Step 4: Build `page.recipes.json`.** Reference `main-page` (title `<h1>`) + three `recipe-group` instances populated with the site's recipe content. Validate `templates/page.recipes.json`.

- [ ] **Step 5: Push + bind page.** Push `--only sections/recipe-group.liquid --only templates/page.recipes.json`. In admin, ensure a "Recipes" page uses this template and the nav link resolves (no 404). Check mobile 2-up cards, PDF link works.

- [ ] **Step 6: Commit.**
```bash
git add theme/sections/recipe-group.liquid theme/templates/page.recipes.json
git commit -m "feat(theme): build Recipes page (recipe-group section + template)"
```

---

# Final: full QA pass + finish branch

### Task 3.0: Mobile QA checklist + comparison-table verification

- [ ] **Step 1: Comparison table sanity** — confirm the `Aesthet-Nova`/`Aesthet-Nova-Light` aliases from Task 0.3 make the comparison cells render in Aesthet Nova (not system-ui); confirm the 5 `shop_images` (Check.svg, question-mark.svg, no-cross png, silhouette1.svg, logo-web.png) are uploaded and render.
- [ ] **Step 2: Run the CLAUDE.md mobile checklist** at 360px + 390px on preview: AA contrast on every scheme; ≥44px tap targets; ≥16px shopping labels; visible focus ring; no heading clip; one `<h1>` + sequential headings per page; reports stacked-card; native cart/search reachable + functional; no horizontal page overflow; no console/network errors.
- [ ] **Step 3: Record results** (screenshots via system Chrome + Playwright per CLAUDE.md) and note any residual gaps.
- [ ] **Step 4: Commit** any fixes; then use **superpowers:finishing-a-development-branch** to choose merge/PR. Do NOT publish to the live theme without explicit user approval.

---

## Self-Review

**Spec coverage:** §4 stale Hero/headings → 1a ✓; product/bundle cards + retire custom-product-section → 1b ✓; search/cart reskin → 1c ✓; reports table + review-page + About → 1d ✓; WCAG/focus/heading-wrap/type-floor/fonts → 0.1+0.3 ✓; Neem-Green scheme → 0.2 ✓; Bundles → 2a ✓; Manifesto → 2b ✓; Recipes → 2c ✓; comparison verify + mobile QA → 3.0 ✓. All spec requirements mapped.

**Placeholder scan:** Card CSS in 1b and bundle/recipe schemas in 2a/2c reference exact source file:line locations to port from plus inline design specs (hover values, dotted-border insets, colors) — these are port instructions, not TBDs. No "TODO/handle edge cases/similar to Task N" remain.

**Type consistency:** Scheme id `scheme-neem` used consistently (0.2 → 2a, 1d). Token hexes match `tokens.css`. Native selector names in 1b/1c are marked "confirm from the actual snippet in Step 1" because Horizon's exact class names must be read at execution — flagged explicitly rather than guessed.
