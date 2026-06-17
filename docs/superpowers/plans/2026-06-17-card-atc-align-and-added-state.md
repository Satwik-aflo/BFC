# Card Add-to-Cart: Bottom-Align + "Added" State Plan

> Executed inline. Steps use checkbox (`- [ ]`) syntax.

**Goal:** (1) Bottom-align the Add-to-cart button across bundle cards and homepage product cards on desktop + mobile; (2) make card buttons use the live PDP's button (cart icon → checkmark + "Added", i.e. `add-to-cart-icon--added`).

**Findings:** Both bundle cards (`sections/bundles.liquid`) and homepage product cards (`templates/index.json` custom-liquid block) render `snippets/bfc-card-commerce.liquid`. Our `icon-add-to-cart.svg` + `icon-checkmark.svg` are byte-identical to the live PDP's `add-to-cart-icon` / `add-to-cart-icon--added`. `product-form.js` toggles `[data-added]`; base.css drives the older `.add-to-cart__added` burst. We will swap the card button to the `.add-to-cart-text--added` pattern and add a scoped `[data-added]` toggle (cards only — PDP/quick-add untouched).

## Global Constraints
- All work on `main`; commit to `main`.
- Push surgically (`--only` per file), `--path theme`, store `d9v1pv-06`, theme `151032561833 --nodelete`. Never touch live.
- Modern/evergreen CSS OK (`:has()` per CLAUDE.md). Keep ≥44px tap targets; don't reintroduce contrast/size regressions.
- Verify push by pulling back; visual Playwright pass (desktop 1280 + mobile 390) to confirm alignment.

---

### Task 1: New button markup in `bfc-card-commerce.liquid`
**Files:** Modify `theme/snippets/bfc-card-commerce.liquid`

- [ ] Replace the `{% render 'add-to-cart-button' %}` call with inline markup: keep `add-to-cart-component` (ref `addToCartButtonContainer`, `data-add-to-cart-animation`) + `<button ref="addToCartButton" on:click="/handleClick" class="button bfc-card-atc__button">` containing:
  - `<span class="add-to-cart-text">` → `<span class="svg-wrapper add-to-cart-icon">{icon-add-to-cart.svg}</span><span class="add-to-cart-text__content">Add to cart</span>`
  - `<span aria-hidden="true" class="add-to-cart-text--added">` → `<span class="svg-wrapper add-to-cart-icon--added">{icon-checkmark.svg}</span><span>Added</span>`
  - disabled when `v.available == false`.

### Task 2: Scoped CSS in `brand.liquid`
**Files:** Modify `theme/snippets/brand.liquid` (near existing `.bfc-card-commerce` rules ~L730)

- [ ] Added-state toggle (cards only):
  - `.bfc-card-atc__button .add-to-cart-text--added { display:none; align-items:center; justify-content:center; gap:0.4rem; }`
  - `.bfc-card-atc__button[data-added='true'] .add-to-cart-text { display:none; }`
  - `.bfc-card-atc__button[data-added='true'] .add-to-cart-text--added { display:inline-flex; }`
  - `.bfc-card-atc__button .svg-wrapper svg { width:1.05em; height:1.05em; }`
- [ ] Product-card bottom-align (scoped via our commerce block):
  - `.product-grid__item:has(.bfc-card-commerce){ height:100%; }`
  - `product-card:has(.bfc-card-commerce){ display:flex; flex-direction:column; height:100%; }`
  - `.product-card__content:has(.bfc-card-commerce){ height:100%; }`
  - `.product-card__content .bfc-card-commerce{ margin-block-start:auto; }`

### Task 3: Bundle bottom-align in `bundles.liquid`
**Files:** Modify `theme/sections/bundles.liquid` (stylesheet)

- [ ] `.bfc-bundle-card__link { flex: 1 1 auto; }` so the label area fills and price+ATC pin to the card bottom (grid items already stretch; card is `height:100%`).

### Task 4: Validate, push, verify
- [ ] Dev MCP `validate_theme` on the 3 files; `shopify theme check --path theme` (only known false positives).
- [ ] Commit; push `--only snippets/bfc-card-commerce.liquid --only snippets/brand.liquid --only sections/bundles.liquid`.
- [ ] Pull back + grep. Playwright screenshots (desktop 1280 + mobile 390) of homepage bundles + products rows; confirm buttons bottom-aligned and "Added" state markup present.
