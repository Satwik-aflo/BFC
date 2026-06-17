# Homepage Commerce & Typography (Batch 3) — Card Pricing/Add-to-Cart, Remove Manifesto, Heading Sizing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** (1) On the product grids ("The Range") and the bundles ("Shop by Benefits"), show **price next to net weight** (e.g. `₹289 / 150 g`) and a **direct add-to-cart** control on each card; (2) **remove** the "The Future of Health is Ancient" (`manifesto`) section; (3) tighten **section headings** to 1–2 lines, smaller, with an accent font where markup allows.

**Architecture:** Purely additive / config-level. "The Range" = the two Horizon **core** `product-list` sections — extended by adding Horizon's own card blocks (`buy-buttons`, `custom-liquid`) in `templates/index.json` (NOT by editing core liquid). "Shop by Benefits" = the custom `sections/bundles.liquid` — extended with a product picker + price + add-to-cart. Heading sizing lives in `snippets/brand.liquid` and the custom sections' `{% stylesheet %}`. Each change verified by Dev MCP `validate_theme` → surgical draft push → pull-back grep → Playwright visual/interaction probe → commit to `main`.

**Tech Stack:** Shopify Horizon 3.5.1 (Liquid), Shopify CLI, Playwright + headless Chromium.

---

## ⚠️ Read first — non-negotiable constraints

- **All work on `main`** (project hard rule; draft tracks `main`). Commit each task to `main`.
- **NEVER push/publish to LIVE `#147961872553`.** Target DRAFT **`#151032561833`**, store **`d9v1pv-06.myshopify.com`**.
- **Run CLI from repo root** (`cd /Users/saimeda/Documents/Codex/medas/BFC &&`), **always `--path theme`**; `--only` is a full-file replace; **verify every push by pulling back**.
- **Do NOT edit Horizon core** (`sections/product-list.liquid`, `blocks/_product-card.liquid`, `snippets/product-card.liquid`, etc.). Extend the product grid only by editing **`templates/index.json`** (block instances) and **`snippets/brand.liquid`** (CSS).
- **New section *setting/type* → two pushes.** Adding a `product` setting to the bundles block (Task 3) requires pushing `sections/bundles.liquid` first, verifying, then pushing the JSON/admin that uses it.
- **The "test" = the verification gate** (validate, pull-back grep, Playwright render + add-to-cart interaction, screenshot vs intent). Banner/validator green ≠ done.

## Shared reference
```
STORE=d9v1pv-06.myshopify.com   DRAFT=151032561833
THEME_ABS=/Users/saimeda/Documents/Codex/medas/BFC/theme
REPO=/Users/saimeda/Documents/Codex/medas/BFC
export NODE_PATH=/tmp/node_modules
CHROME="$HOME/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
```
Dev MCP (deferred): `ToolSearch(query="select:mcp__shopify-dev__learn_shopify_api,mcp__shopify-dev__validate_theme", max_results=5)`, then `learn_shopify_api(api:"liquid")` once for a `conversationId`, reuse for `validate_theme`. `/tmp/bfc-qa/shoot.mjs` (from batch 2) is reused for screenshots.

**Locked decisions (with user):** The Range = the two `product-list` grids; Shop by Benefits = the `bundles` section. Net weight = the product **weight field** (`variant.weight` / grams: Turmeric 150 g, Black Pepper 100 g, etc.). Add-to-cart = **direct add** (single-variant products) that updates the cart drawer.

**Confirmed facts (from investigation):**
- Products are single-variant (`Default Title`); price = `variant.price`, weight = `variant.weight` (+ `variant.weight_unit`). Turmeric = ₹289 / 150 g matches exactly.
- Horizon `_product-card` (theme/blocks/_product-card.liquid) allows child blocks: `text, image, buy-buttons, price, review, sku, swatches, _product-card-gallery, product-title, custom-liquid, @app`. The grid card currently uses `block_order: ["product-card-gallery","product_title","price"]`.
- `bundles.liquid` cards are presentational (image/title/subtitle/link only); the 4 bundles (Inflammation Relief, Immune Defense, Fitness Essentials, Relaxation Support) ARE real products with prices.
- Homepage `index.json` order includes: `product_list_wE8meU`, `bundles_brand`, **`manifesto_brand` (= "The Future of Health is Ancient" → remove)**, `product_list_fa6P9H`, `camparision_section`, `boringly_clean_pure`, `marquee_FnfwbK`, `featured_blog_posts`, `bfc_proudly_banner`.

---

### Task 0: Setup + baseline
- [ ] **Step 1:** `cd $REPO && git branch --show-current` (expect `main`), `git status --short` (clean aside from untracked docs). `mkdir -p /tmp/bfc-qa /tmp/bfc-verify`.
- [ ] **Step 2:** Baseline screenshots: `node /tmp/bfc-qa/shoot.mjs '/' b3_before_desktop 1280 0` and `node /tmp/bfc-qa/shoot.mjs '/' b3_before_mobile 390 1`. View both (regression reference).

---

### Task 1: Remove the "The Future of Health is Ancient" section (quick win)

**File:** `theme/templates/index.json` (remove the `manifesto_brand` section).

- [ ] **Step 1:** Read `theme/templates/index.json`. Remove the `"manifesto_brand": { … }` entry from the `"sections"` object AND remove the string `"manifesto_brand"` from the `"order"` array. Keep the leading `/* … */` comment and valid JSON (commas!).
- [ ] **Step 2:** Validate (Dev MCP), `artifactId:"rm-manifesto", revision:1`. (JSON template — expect VALID.)
- [ ] **Step 3:** Push + verify removal:
```bash
cd $REPO
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete --only templates/index.json
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com --theme 151032561833 --only templates/index.json
grep -c 'manifesto_brand' /tmp/bfc-verify/templates/index.json   # expect 0
```
- [ ] **Step 4:** Visual gate: `node /tmp/bfc-qa/shoot.mjs '/' t1_after_desktop 1280 0`; view it — the "The Future of Health is Ancient" block is gone, sections above/below flow normally (bundles → product grid, no gap/orphan).
- [ ] **Step 5:** Commit: `git add theme/templates/index.json && git commit -m "feat(home): remove 'The Future of Health is Ancient' (manifesto) section\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 2: "The Range" product grids — price + net weight inline + direct add-to-cart

**Files:** `theme/templates/index.json` (add card blocks to both `product_list_wE8meU` and `product_list_fa6P9H`), `theme/snippets/brand.liquid` (styling).

Horizon cards already render the `price` block. We add (a) a `custom-liquid` block that prints the net weight beside the price, and (b) a `buy-buttons` block for direct add-to-cart — both as child blocks of each section's `static-product-card`, appended to `block_order`.

- [ ] **Step 1 (SPIKE — confirm `custom-liquid` card context before committing to it):** A `custom-liquid` block inside a product card must be able to read the card's product. Verify which object is in scope. Add a TEMP custom-liquid block to ONE card (in `index.json`, under `product_list_wE8meU` → `static-product-card` → `blocks`) printing a probe:
```json
"weight_probe": { "type": "custom-liquid", "settings": { "custom_liquid": "<span class=\"bfc-cardwt\">[{{ closest.product.title }}|{{ closest.product.selected_or_first_available_variant.weight }}{{ closest.product.selected_or_first_available_variant.weight_unit }}]</span>" } }
```
and add `"weight_probe"` to that card's `block_order`. Push `index.json`, then probe live:
```bash
cd $REPO && shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete --only templates/index.json
node /tmp/bfc-qa/shoot.mjs '/' t2_spike_desktop 1280 0
```
Read the page HTML for `.bfc-cardwt` (or screenshot) — does it print the product title + `150 g`? **If `closest.product` is empty, try `{{ product.… }}` then `{{ card_product.… }}`.** Record which object works; use it in Step 2. (If NONE expose the product to custom-liquid, fall back to the `sku`/`product-custom-property` block or a metafield text block — note and adapt.)
- [ ] **Step 2:** Using the object confirmed in Step 1, for BOTH `product_list_wE8meU` and `product_list_fa6P9H`, replace the temp probe with a real weight block and add a buy-buttons block. Under each section's `static-product-card.blocks`, add:
```json
"net_weight": {
  "type": "custom-liquid",
  "settings": { "custom_liquid": "{%- assign v = closest.product.selected_or_first_available_variant -%}<span class=\"bfc-card-weight\">/ {{ v.weight | round }} {{ v.weight_unit }}</span>" }
},
"card_add": {
  "type": "buy-buttons",
  "settings": { "show_dynamic_checkout": false }
}
```
and set `block_order` to `["product-card-gallery","product_title","price","net_weight","card_add"]` (price and net_weight adjacent so the weight reads as `₹289 / 150 g`). Use the Step-1-confirmed product object if it's not `closest.product`.
- [ ] **Step 3:** Style in `theme/snippets/brand.liquid` (append a clearly-commented block): lay price + weight on one line and make the add-to-cart compact:
```css
  /* Batch 3: product-card price + net weight on one line, compact add-to-cart. */
  .product-card .bfc-card-weight { display: inline; margin-inline-start: 0.25rem; font-size: 0.8em; opacity: 0.8; white-space: nowrap; }
  .product-card :is(.price, .price__container) { display: inline-flex; align-items: baseline; }
  .product-card .buy-buttons, .product-card buy-buttons { margin-block-start: 0.5rem; }
  .product-card .buy-buttons button { width: 100%; }
```
(Adjust selectors to the live card DOM read in Step 1's screenshot/HTML.)
- [ ] **Step 4:** Validate (Dev MCP): `index.json` (`artifactId:"range-cards-json"`) and `brand.liquid` (`artifactId:"range-cards-css"`), revision 1. Expected VALID.
- [ ] **Step 5:** Push + pull-back:
```bash
cd $REPO
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete --only templates/index.json --only snippets/brand.liquid
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com --theme 151032561833 --only templates/index.json
grep -c 'bfc-card-weight\|buy-buttons' /tmp/bfc-verify/templates/index.json   # expect >=1
```
- [ ] **Step 6 (visual + interaction gate):** Create `/tmp/bfc-qa/range_cards.mjs` that loads `/`, scrolls to the first product grid, and (a) screenshots a card, (b) reads a card's rendered text (price + weight), (c) clicks the add-to-cart and asserts `/cart.js` item count increments:
```js
import { chromium } from 'playwright-core';
const EXEC = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const URL='https://d9v1pv-06.myshopify.com/?preview_theme_id=151032561833&_cb='+Date.now();
const b=await chromium.launch({executablePath:EXEC,headless:true});
const ctx=await b.newContext({viewport:{width:1280,height:900}}); const p=await ctx.newPage();
await p.goto(URL,{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForTimeout(2500);
const card=await p.$('.product-card'); await card.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
await card.screenshot({path:'/tmp/bfc-qa/range_card.png'});
console.log('CARD TEXT:', (await card.innerText()).replace(/\n+/g,' | '));
const before=await p.evaluate(()=>fetch('/cart.js').then(r=>r.json()).then(c=>c.item_count));
const addBtn=await card.$('button[name="add"], .buy-buttons button, add-to-cart-component button');
if(addBtn){ await addBtn.click(); await p.waitForTimeout(2000); }
const after=await p.evaluate(()=>fetch('/cart.js').then(r=>r.json()).then(c=>c.item_count));
console.log('cart item_count before/after add:', before, after, after>before?'PASS':'FAIL');
await b.close();
```
Run it. **PASS:** card shows `₹289 / 150 g` (price + weight inline), the add-to-cart control is visible/compact, and the cart count increments after click. View `/tmp/bfc-qa/range_card.png`. Iterate CSS/selectors as needed.
- [ ] **Step 7:** Commit: `git add theme/templates/index.json theme/snippets/brand.liquid && git commit -m "feat(range): product cards show price + net weight inline and a direct add-to-cart\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 3: "Shop by Benefits" bundles — price + direct add-to-cart

**Files:** `theme/sections/bundles.liquid` (markup + schema + CSS), then admin step (assign products), then re-verify.

Bundle cards are presentational; add a per-card `product` picker so each card can render its price and a direct add-to-cart. Weight already appears in the subtitle (e.g. "· 400 g").

- [ ] **Step 1:** In `theme/sections/bundles.liquid` schema `bundle` block `settings`, add a product picker (after `subtitle`):
```json
{ "type": "product", "id": "product", "label": "Linked product (for price + add to cart)" }
```
- [ ] **Step 2:** In the card markup (after the `subtitle` `<p>`), add price + add-to-cart when a product is set:
```liquid
{%- if block.settings.product != blank -%}
  {%- assign bp = block.settings.product -%}
  <p class="bfc-bundle-card__price">{{ bp.price | money }}</p>
  <form method="post" action="{{ routes.cart_add_url }}" class="bfc-bundle-card__form">
    <input type="hidden" name="id" value="{{ bp.selected_or_first_available_variant.id }}">
    <button type="submit" class="bfc-bundle-card__add" aria-label="Add {{ bp.title | escape }} to cart">
      <span class="hand">&#9758;</span> Add to cart
    </button>
  </form>
{%- endif -%}
```
(Direct add via a standard cart form. Optionally enhance with a JS `fetch('/cart/add.js')` + drawer-open in Step 4 styling block, but the form POST is the reliable baseline.)
- [ ] **Step 3:** Add CSS in the `{% stylesheet %}` for `.bfc-bundle-card__price` (Copperplate, ripe-orange or kohl), `.bfc-bundle-card__add` (compact brand button matching `.bfc-btn`). Read the existing card CSS and match tone.
- [ ] **Step 4:** Validate (Dev MCP) `sections/bundles.liquid` (`artifactId:"bundles-commerce", revision:1`). **The `product` setting is NEW → two-push:** push the section liquid FIRST:
```bash
cd $REPO
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete --only sections/bundles.liquid
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com --theme 151032561833 --only sections/bundles.liquid
grep -c 'bfc-bundle-card__add' /tmp/bfc-verify/sections/bundles.liquid   # expect >=1
```
- [ ] **Step 5 (ADMIN step — hand to user, affects draft only):** In the theme editor for the draft, open the Bundles section and set each card's new **Linked product** (Inflammation Relief, Immune Defense, Fitness Essentials, Relaxation Support). This writes the `product` setting into `index.json` server-side. Alternatively, set them by editing `templates/index.json` directly (add `"product": "<product-handle>"` to each bundle block's settings) and push `index.json` as the SECOND push — then `grep -c '"product"' /tmp/bfc-verify/templates/index.json`. Document the exact handles.
- [ ] **Step 6 (visual + interaction gate):** Adapt `/tmp/bfc-qa/range_cards.mjs` to target `.bfc-bundle-card` and its `.bfc-bundle-card__add`. **PASS:** each bundle card shows its price near the weight subtitle + an add-to-cart that increments `/cart.js` count. Screenshot the bundles row.
- [ ] **Step 7:** Commit (and the `index.json` if edited in Step 5): `git add theme/sections/bundles.liquid theme/templates/index.json && git commit -m "feat(bundles): show price + direct add-to-cart on Shop-by-Benefits cards\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 4: Section headings — 1–2 lines, smaller, accent font

**Files:** `theme/snippets/brand.liquid` (global heading rules + per-section overrides); custom section `{% stylesheet %}` where markup access is needed.

Goal: every homepage section heading fits in 1–2 lines, at a reduced size, with an accent font on part of the phrase where the markup allows it (custom sections). Examples: "Boring Foods" (line 1) / "Your Way" (line 2); "How We Are Different" on one line.

- [ ] **Step 1 (inventory):** Read each heading's markup/selector and current rendered size at 390px and 1280px (use a probe that prints `fontSize`, `lineCount`/`getClientRects().length`, and text for `.bfc-bundles__title`, the product-list `_product-list-content` heading, `camparision-section` heading, `.boringly-clean*` heading, etc.). Record which sections are custom (full markup control: bundles, camparision, boringly-clean, bfc-*) vs Horizon (product-list header — CSS-only).
- [ ] **Step 2 (global tightening):** In `brand.liquid`, add rules that constrain homepage section headings to ≤2 lines and a smaller clamp, applied per the selectors found in Step 1. Pattern per heading:
```css
  .SECTION-HEADING-SELECTOR {
    font-size: clamp(1.4rem, 1.1rem + 2vw, 2.4rem) !important;  /* tune per section */
    line-height: 1.1;
    text-wrap: balance;
    max-width: 18ch;            /* forces a tidy 1–2 line wrap */
    margin-inline: auto;
    overflow-wrap: break-word;
  }
```
For one-line headings ("How We Are Different"), use `white-space: nowrap` only if it still fits at 360px; otherwise `text-wrap: balance` + size reduction. Verify at 360/390/1280.
- [ ] **Step 3 (accent font, custom sections only):** Where the heading is in a custom section we control (e.g. `bundles.liquid`, `camparision`, `boringly-clean`, or a product-list header if it accepts richtext), split the phrase so part renders in the accent font. Example for a "Boring Foods, Your Way" style heading we own: wrap the second part in `<span class="bfc-accent">Your Way</span>` and style `.bfc-accent { font-family: var(--font-script); text-transform: none; }` (Musloner) or `var(--font-charm)` (Flagflies) per brand. **Do NOT** add markup to Horizon core headings (product-list static header) — for those, CSS sizing only; note that the two-line/accent split there is limited to what the heading setting + CSS allow.
- [ ] **Step 4:** Validate (Dev MCP) all changed files. Push surgically (`brand.liquid` + any custom sections touched) + pull-back grep for a sentinel from your new CSS.
- [ ] **Step 5 (visual gate):** `node /tmp/bfc-qa/shoot.mjs '/' t4_desktop 1280 0` and `... t4_mobile 390 1`. View both: every section heading is ≤2 lines at both widths, visibly smaller, none clipped/overflowing at 360–390px; accent-font treatment reads correctly where applied. Iterate per-section sizes.
- [ ] **Step 6:** Commit: `git add -A theme && git commit -m "style(home): tighten section headings to 1–2 lines, smaller, accent font where supported\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 5: Final verification
- [ ] **Step 1:** Full homepage regression vs Task-0 baseline: `node /tmp/bfc-qa/shoot.mjs '/' b3_final_desktop 1280 0` and `... b3_final_mobile 390 1`. Confirm: manifesto gone; Range cards show price+weight+add-to-cart; bundles show price+add-to-cart; headings tightened; nothing else regressed (hero, marquee, comparison, boringly-clean, footer, proudly banner all intact).
- [ ] **Step 2:** Add-to-cart sanity: run the cart-increment probe once more on a Range card AND a bundle card; both must increment `/cart.js`. Then empty the test cart (`fetch('/cart/clear.js')`) so the draft cart isn't left populated.
- [ ] **Step 3:** Theme-check delta: `shopify theme check --path theme 2>&1 | tail -6` — still 5 `JSONMissingBlock` app-block false positives, no new error types.
- [ ] **Step 4:** `git log --oneline -6`, `git status --short`. Report commit list; note `main` ahead of `origin/main` (push only if user asks). Hand the user the **admin step** from Task 3 (assigning bundle products) if not done via `index.json`.

---

## Self-Review (against the 3 requests + locked decisions)

- **Coverage:** Item 1 → Task 2 (Range grids: price+weight inline + add-to-cart) and Task 3 (Bundles: price + add-to-cart); Item 2 → Task 1 (remove manifesto); Item 3 → Task 4 (heading sizing/accent). Locked decisions (Range=grids, Benefits=bundles, weight=product weight field, direct add-to-cart) encoded.
- **No core edits:** Range cards are extended via Horizon's own allowed card blocks (`buy-buttons`, `custom-liquid`) in `index.json` + CSS in `brand.liquid` — `product-list.liquid`/`_product-card.liquid` untouched. Verified the allowed block list before relying on it.
- **Honest uncertainty:** Task 2 Step 1 is a SPIKE — whether a `custom-liquid` card block can read the card product (`closest.product` vs `product` vs `card_product`) is verified live before building on it, with named fallbacks. This is the highest-risk item; the spike de-risks it before the real edit. Task 3's bundle→product mapping is an explicit admin/JSON step (data entry), flagged not hidden.
- **Two-push discipline:** Task 3's new `product` setting pushes `bundles.liquid` first, then the product assignments — matching the documented Shopify strip behavior.
- **Verification:** every commerce task asserts the cart count actually increments (not just that a button renders); Task 5 clears the test cart afterward. Heading task verifies ≤2 lines + no overflow at 360–390px.
- **Deferred/limits:** for the Horizon product-list **header** heading, the two-line + accent-font split is CSS-only (no markup injection into core) — noted in Task 4 Step 3; full accent treatment applies to the custom sections we own.
