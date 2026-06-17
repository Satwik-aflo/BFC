# Search + Cart Brand Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin Horizon's native search modal, predictive results, cart drawer, and cart page to match the static site's `.sf-search` / `.sf-cart` design — keeping all Shopify functionality (predictive search, AJAX cart, quantity, discounts, checkout) byte-for-byte unchanged ("new look, same floor plan").

**Architecture:** Purely additive CSS. All rules go in the existing "Search + cart reskin" block at the end of `theme/snippets/brand.liquid` (replacing the current minimal block), targeting Horizon's stable class names — no edits to Horizon section/snippet markup or JS. One data-level change in `templates/cart.json` switches the cart-page summary from the yellow scheme-2 to the cream scheme-1 so the brand button reads consistently (matching the static cream `.sf-cart__foot`).

**Tech Stack:** Shopify Horizon 3.5.1, Liquid `{% style %}` block, brand tokens already defined in `brand.liquid` `:root`. Verification via Shopify Dev MCP `validate_theme`, surgical `shopify theme push --path theme`, pull-back grep, and Playwright + headless Chromium screenshots of all four surfaces (desktop 1280 + mobile 390) vs the static design.

---

## Design source of truth

Static mock CSS in `site/css/main.css`:
- **Search** `.sf-search` (1207–1291): cream panel, black bottom border; title Copperplate uppercase `--text-xs`; big **underlined** input (`.sf-search__field` black `border-bottom`, `.sf-search__input` body font, `clamp(1.25rem,1rem+2vw,2rem)`, no box); section hint Copperplate uppercase **neem-green**; suggestion chips = pill, thin border, hover neem-green bg + cream; empty state in charm font / ink-soft.
- **Cart** `.sf-cart` (1296–1442): cream panel; head title Copperplate uppercase + **ripe-orange** count; line item `.sf-line` grid `64px 1fr auto`, thumb 64px with black border on `--kulfi-deep`, name Copperplate uppercase `0.06em`, variant ink-soft `--text-xs`, **stepper** = pill (`border-radius:999px`, thin border) with +/- hover ripe-orange, price Copperplate, **remove** = underlined ink-soft hover ripe-orange; empty state charm/neem-green; **foot** `--kulfi-deep` bg + black top border, subtotal label Copperplate uppercase + value Copperplate large, **`.btn` full-width centered** (= the brand button).
- **Primary button** = static `.btn`, already ported as `.bfc-btn` (`brand.liquid:171–193`): mango-yellow fill, black text, `--bfc-line` border + 1px black outline `offset:3px`, Copperplate uppercase letterspaced, hover `translate(-2px,-2px)` + `4px 4px 0` black shadow.

Brand tokens available in `brand.liquid` `:root` (verified): `--kulfi-malai #fbf3cc`, `--kulfi-deep #f6ebb4`, `--ripe-orange #f84b21`, `--ripe-orange-ink #c2390f` (AA on cream), `--mango-yellow #f9bf29`, `--neem-green #244f24`, `--kohl-black`, `--ink-soft rgba(0,0,0,.72)`, `--font-display` (Copperplate), `--font-charm` (Flagflies), `--font-body--family` (Aesthet Nova), `--text-xs .75rem`, `--text-sm .875rem`, `--tracking-caps .18em`, `--bfc-line 1.5px solid black`, `--bfc-ease-out`.

## Horizon → static class map (verified in theme files)

| Surface element | Horizon selector |
|---|---|
| Checkout button | `#checkout.cart__checkout-button` (+ `.button-text`) |
| Predictive "View all" | `.predictive-search__search-button` |
| Empty-cart button | `.cart-items__empty-button` |
| Cart drawer heading | `.cart-drawer__heading`, `.cart-drawer__header .h4` |
| Cart drawer footer | `.cart-drawer__summary` |
| Line row | `.cart-items__table-row` |
| Line media img | `.cart-items__media-container img` |
| Line title | `.cart-items__title` |
| Line variant | `.cart-items__variant`, `.cart-items__variants` |
| Quantity stepper | `.cart-items__quantity-controls` (buttons inside) |
| Remove button | `.cart-items__remove` |
| Line price | `.cart-items__price` |
| Totals labels/values | `.cart-totals__total-label`, `.cart-totals__total`, `.cart-totals__original-label` |
| Cart-bubble count | `.cart-bubble__background`, `.cart-bubble__text` (already styled) |
| Empty drawer heading | `.cart-drawer__heading--empty` |
| Search input | `.search-modal__content .search-input` / `input[type="search"]` / `.predictive-search-form__input` |
| Predictive section title | `.predictive-search-results__title` |
| Predictive result card | `.predictive-search-results__card` → `.resource-card__title`, `.resource-card__subtext` |
| Predictive footer (view-all wrap) | `.predictive-search-form__footer` |
| Cart-page summary wrapper | `.cart-page__summary` (scheme set in `templates/cart.json`) |

---

## Task 1: Replace the search + cart CSS block in brand.liquid

**Files:**
- Modify: `theme/snippets/brand.liquid` (replace the block at lines ~348–375, between the product-card block and `{% endstyle %}`)

- [ ] **Step 1: Replace the existing block**

Find this current block (ends right before `{% endstyle %}`):

```css
  /* ── Search + cart reskin (native components, visual only) ───────────
     Panels are made cream via popover_color_scheme / drawer_color_scheme =
     scheme-1 in settings_data.json. These rules add the brand accents on
     top: Ripe-Orange cart count, deeper-cream cart footer, and a ≥16px
     search input (no iOS zoom-on-focus). Horizon's search/cart logic is
     untouched. */
  .cart-bubble__background {
    background: var(--ripe-orange) !important;
    border: 1px solid var(--kohl-black);
  }
  .cart-bubble__text {
    color: var(--kulfi-malai) !important;
    font-family: var(--font-heading--family);
    font-weight: 700;
  }
  .cart-drawer__summary {
    background: var(--kulfi-deep);
    border-top: var(--bfc-line);
  }
  .cart-drawer__heading,
  .cart-drawer__header .h4 {
    font-family: var(--font-heading--family);
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps);
  }
  .search-modal__content :is(input[type="search"], .search-input, .predictive-search-form__input) {
    font-size: 16px;
  }
```

Replace it with (keep the closing `{% endstyle %}` after it):

```css
  /* ── Search + cart reskin → match static .sf-search / .sf-cart ───────
     Panels are already cream via popover_color_scheme / drawer_color_scheme
     = scheme-1. These rules port the static mock's brand treatment onto
     Horizon's native components. CSS only — search/cart logic, forms, and
     markup are 100% untouched. Static reference: site/css/main.css 1207-1442. */

  /* Cart-count bubble: Ripe-Orange chip, cream Copperplate count. */
  .cart-bubble__background {
    background: var(--ripe-orange) !important;
    border: 1px solid var(--kohl-black);
  }
  .cart-bubble__text {
    color: var(--kulfi-malai) !important;
    font-family: var(--font-display);
    font-weight: 700;
  }

  /* Primary CTAs → static .btn (= .bfc-btn): mango-yellow, black text,
     double black border, Copperplate uppercase, hover lift + hard shadow.
     Applies to checkout, predictive "View all", and the empty-cart button. */
  #checkout.cart__checkout-button,
  .predictive-search__search-button,
  .cart-items__empty-button {
    font-family: var(--font-display) !important;
    font-weight: 700 !important;
    letter-spacing: var(--tracking-caps) !important;
    text-transform: uppercase !important;
    color: var(--kohl-black) !important;
    background: var(--mango-yellow) !important;
    border: var(--bfc-line) !important;
    outline: 1px solid var(--kohl-black);
    outline-offset: 3px;
    border-radius: 0 !important;
    box-shadow: none;
    transition: transform 0.25s var(--bfc-ease-out), box-shadow 0.25s var(--bfc-ease-out);
  }
  #checkout.cart__checkout-button:hover,
  .predictive-search__search-button:hover,
  .cart-items__empty-button:hover {
    transform: translate(-2px, -2px);
    box-shadow: 4px 4px 0 var(--kohl-black);
  }
  #checkout.cart__checkout-button { width: 100%; justify-content: center; }
  .cart__checkout-button .button-text { color: var(--kohl-black) !important; }
  .predictive-search-form__footer { display: flex; justify-content: center; }

  /* Cart drawer / page headings → Copperplate uppercase. */
  .cart-drawer__summary {
    background: var(--kulfi-deep);
    border-top: var(--bfc-line);
  }
  .cart-drawer__heading,
  .cart-drawer__header .h4 {
    font-family: var(--font-display);
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps);
  }

  /* Line items → static .sf-line. */
  .cart-items__title {
    font-family: var(--font-display) !important;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .cart-items__media-container img,
  .cart-items__media img {
    border: var(--bfc-line);
    background: var(--kulfi-deep);
    border-radius: 0;
  }
  .cart-items__variant,
  .cart-items__variants {
    color: var(--ink-soft);
    font-size: var(--text-xs);
  }
  .cart-items__quantity-controls {
    border: 1px solid var(--kohl-black);
    border-radius: 999px;
    overflow: hidden;
  }
  .cart-items__quantity-controls button:hover,
  .cart-items__quantity-controls .quantity-selector__button:hover {
    color: var(--ripe-orange);
  }
  .cart-items__remove {
    color: var(--ink-soft) !important;
    text-underline-offset: 3px;
  }
  .cart-items__remove:hover { color: var(--ripe-orange) !important; }
  .cart-items__price {
    font-family: var(--font-display);
    font-weight: 700;
  }

  /* Totals → static .sf-cart__subtotal. */
  .cart-totals__total-label,
  .cart-totals__original-label {
    font-family: var(--font-display);
    font-weight: 700;
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }
  .cart-totals__total,
  .cart-totals__total-value {
    font-family: var(--font-display);
    font-weight: 700;
  }

  /* Empty states → static charm/neem-green. */
  .cart-drawer__heading--empty {
    font-family: var(--font-charm);
    text-transform: none;
    letter-spacing: normal;
    color: var(--neem-green);
  }

  /* ── Search modal → static .sf-search. ── */
  /* Big underlined input (≥20px, no iOS zoom), body font. */
  .search-modal__content :is(.search-input, input[type="search"], .predictive-search-form__input) {
    font-size: clamp(1.25rem, 1rem + 1vw, 1.75rem) !important;
    font-family: var(--font-body--family);
    font-weight: 500;
    color: var(--kohl-black);
  }
  /* Section title ("PRODUCTS" / "SUGGESTIONS") → Copperplate uppercase neem-green. */
  .predictive-search-results__title {
    font-family: var(--font-display) !important;
    font-weight: 700;
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
    color: var(--neem-green);
  }
  /* Predictive result card name + WCAG-safe price. */
  .predictive-search-results__card .resource-card__title {
    font-family: var(--font-display) !important;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .predictive-search-results__card :is(.resource-card__subtext, .price, .price *) {
    color: var(--ripe-orange-ink) !important;
  }

  /* Focus ring (don't suppress Horizon's; make it brand + high-contrast). */
  .search-modal__content :is(input, button, a):focus-visible,
  .cart-drawer__dialog :is(input, button, a):focus-visible,
  .cart-page__summary :is(input, button, a):focus-visible {
    outline: 2px solid var(--ripe-orange-ink);
    outline-offset: 2px;
  }

  /* Touch: keep cart stepper / remove ≥44px (WCAG 2.5.5). */
  @media (pointer: coarse) {
    .cart-items__quantity-controls button { min-width: 44px; min-height: 44px; }
    .cart-items__remove { min-height: 44px; }
  }
```

- [ ] **Step 2: Validate with Shopify Dev MCP**

Call `learn_shopify_api` (api: `liquid`) for a `conversationId` (reuse the session's if present), then `validate_theme` with `absoluteThemePath` = `/Users/saimeda/Documents/Codex/medas/BFC/theme` and `filesCreatedOrUpdated` = `[{ "path": "snippets/brand.liquid" }]`.
Expected: ✅ VALID. If it flags a selector/syntax issue, fix and re-validate (reuse `artifactId`, bump `revision`).

- [ ] **Step 3: Commit**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
git add theme/snippets/brand.liquid
git commit -m "feat(cart+search): reskin to static .sf-cart/.sf-search look (CSS only)"
```

---

## Task 2: Make the cart-page summary cream (so the brand button pops)

**Files:**
- Modify: `theme/templates/cart.json` (the `cart-page-summary` block: `color_scheme` `scheme-2` → `scheme-1`)

> The cart page summary renders mango-yellow today (block `cart-page-summary`, `color_scheme: "scheme-2"`, `inherit_color_scheme: false`). The static `.sf-cart__foot` is cream with a yellow button. Switching to `scheme-1` (the same cream the drawer uses) makes the yellow checkout button read consistently on both surfaces. `scheme-1` already exists, so this is a single-value change (no two-push needed).

- [ ] **Step 1: Edit the value**

In `theme/templates/cart.json`, inside the `cart-page-summary` block settings, change:

```json
            "inherit_color_scheme": false,
            "color_scheme": "scheme-2",
```
to:
```json
            "inherit_color_scheme": false,
            "color_scheme": "scheme-1",
```

- [ ] **Step 2: Validate JSON**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
python3 -c "import json; json.load(open('theme/templates/cart.json')); print('JSON OK')"
```
Expected: `JSON OK`.

- [ ] **Step 3: Commit**

```bash
git add theme/templates/cart.json
git commit -m "fix(cart): cream cart-page summary (scheme-1) so brand checkout button pops"
```

---

## Task 3: Push to the draft theme and verify it landed

**Files:** none (deploy + verify). Draft theme `#151032561833`, store `d9v1pv-06.myshopify.com`.

- [ ] **Step 1: Push both files**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete \
  --only snippets/brand.liquid --only templates/cart.json
```
Expected: success banner listing both files.

- [ ] **Step 2: Pull back and confirm (don't trust the banner)**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
rm -rf /tmp/bfc-verify && mkdir -p /tmp/bfc-verify
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com --theme 151032561833 \
  --only snippets/brand.liquid --only templates/cart.json
echo "--- checkout button rule present? ---"; grep -c "cart__checkout-button" /tmp/bfc-verify/snippets/brand.liquid
echo "--- cart-page summary scheme ---"; grep -A2 '"cart-page-summary"' /tmp/bfc-verify/templates/cart.json | grep color_scheme || grep -n "scheme-1" /tmp/bfc-verify/templates/cart.json | head
```
Expected: checkout grep ≥ 1; cart.json shows the summary on `scheme-1`.

---

## Task 4: Visual QA of all four surfaces (desktop + mobile)

**Files:**
- Modify: `/tmp/bfc-qa/cartsearch_current.mjs` (reuse; it already captures the four surfaces) — add a 390px mobile pass.

> Per project rule (validator/push/grep ≠ "looks right"): screenshot and compare to the static `.sf-cart`/`.sf-search`.

- [ ] **Step 1: Run the existing desktop harness (re-captures populated cart drawer, search modal, cart page, search page)**

```bash
cd /tmp/bfc-qa && NODE_PATH=/tmp/node_modules node cartsearch_current.mjs 2>&1 | tail -6
```
Expected: `add-to-cart` ok, screenshots written to `/tmp/bfc-qa/cur_*.png`.

- [ ] **Step 2: Capture mobile (390) for the cart page + search page**

Create `/tmp/bfc-qa/cartsearch_mobile.mjs`:

```javascript
import { chromium } from 'playwright-core';
const EXEC = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const P = 'https://d9v1pv-06.myshopify.com', ID = '151032561833';
const b = await chromium.launch({ executablePath: EXEC, headless: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(`${P}/?preview_theme_id=${ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1000);
await page.evaluate(async () => { const r = await fetch('/products.json?limit=20'); const j = await r.json(); for (const p of j.products) { const v = (p.variants||[]).find(x=>x.available); if (v) { await fetch('/cart/add.js', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id:v.id, quantity:1 }) }); break; } } });
await page.goto(`${P}/cart`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/bfc-qa/m_cart_page.png' });
await page.goto(`${P}/`, { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => document.querySelector('.cart-drawer__dialog')?.showModal?.());
await page.waitForTimeout(600);
const cd = page.locator('.cart-drawer__dialog');
if (await cd.count()) await cd.first().screenshot({ path: '/tmp/bfc-qa/m_cart_drawer.png' });
await b.close();
console.log('mobile done');
```

```bash
cd /tmp/bfc-qa && NODE_PATH=/tmp/node_modules node cartsearch_mobile.mjs 2>&1 | tail -3
```
Expected: `mobile done`; `m_cart_page.png`, `m_cart_drawer.png` written.

- [ ] **Step 3: Inspect the screenshots**

Read `/tmp/bfc-qa/cur_cart_drawer.png`, `cur_search_modal.png`, `cur_cart_page.png`, `cur_search_page.png`, `m_cart_page.png`, `m_cart_drawer.png`. Confirm against the static mock:
- Checkout + "View all" are **mango-yellow brand buttons** (Copperplate uppercase, black border, hover lift), full-width checkout.
- Cart-page summary is **cream**, not yellow; the yellow button pops.
- Line item: Copperplate uppercase name, framed thumb, pill stepper, underlined remove, Copperplate price.
- Search input is the **large underlined** field; section titles neem-green Copperplate; predictive prices are `--ripe-orange-ink` (readable on cream).
- No layout breakage; nothing overflows at 390.

- [ ] **Step 4: Fix discrepancies and re-verify**

For any gap, edit the block in `theme/snippets/brand.liquid`, then re-run Task 3 Step 1 + Task 4 Steps 1–3. Commit each fix:

```bash
git add theme/snippets/brand.liquid
git commit -m "fix(cart+search): <specific adjustment>"
```

---

## Self-review notes

- **Spec coverage:** primary CTAs (Task 1 checkout/view-all/empty), drawer line items (Task 1), totals (Task 1), search input + predictive cards + WCAG price (Task 1), empty states (Task 1), cart-page cream surface (Task 2), deploy (Task 3), visual parity desktop+mobile (Task 4). ✅
- **Functionality untouched:** every change is a CSS property or a color-scheme value; no Horizon `.liquid`/`.js`/form/markup edits. Predictive search, AJAX cart, quantity, discount, and checkout flows are unchanged. ✅
- **WCAG:** predictive prices use `--ripe-orange-ink` (#c2390f, AA on cream); checkout uses black-on-yellow (passes); input ≥20px (no iOS zoom); tap targets ≥44px on coarse pointers; brand focus ring added, not suppressed.
- **No undefined tokens:** every `var(--…)` used is confirmed in `brand.liquid` `:root`.
- **Risk:** `!important` is scoped to cart/search selectors only. The quantity stepper button hover selector covers both a bare `button` and `.quantity-selector__button`; if Horizon's stepper uses a different inner class, Step 3 of Task 4 will catch it visually and Task 4 Step 4 fixes it.
```
