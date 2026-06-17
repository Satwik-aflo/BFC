# Theme Audit — `theme/` (Boring Foods — New Design, draft #151032561833)

> Purpose: understand the whole theme before more rebrand work. Goal of the
> rebrand = **keep the commerce backend intact, restyle the frontend.** This
> doc maps what is load-bearing functionality vs. previous-dev custom vs. our
> brand layer, and the exact lint state. Snapshot: 2026-06-16, branch
> `feat/theme-reskin-gap-close`.

## 1. The mental model — three layers

The theme is a **Shopify Horizon 3.5.1** duplicate. ~95% of it shipped in the
initial pull (`ec732de`). Three layers stacked on top of each other:

| Layer | What it is | Who owns it | Rule |
|---|---|---|---|
| **A. Horizon engine** | 39 core sections, ~100 snippets, ~95 blocks, the commerce templates | Shopify | **Keep pristine.** This is the "backend" we preserve. Don't fork; restyle via the brand layer only. |
| **B. Previous dev's custom** | 17 custom sections built for the *live* store (turmeric story, comparison, lab reports, about) + 2 app sections | Us now (dev is gone) | Ours to fix or delete. Most are **orphaned** on this draft. |
| **C. Our brand layer** | `brand.liquid` + 10 sections + settings/template wiring | This branch | Active rebrand work. |

Inventory: **68 sections, 104 snippets, 95 blocks, 20 templates, 2 layouts,
2 config, 134 assets, 51 locales.**

## 2. The backend to preserve (functionality)

These are the commerce-critical pieces. The rebrand must not break them.

**Templates (20):** `404, article, blog, cart, collection, gift_card,
index, list-collections, page (+ about-us, about-2, contact, faq, recipes,
reports, review-page), password, product, search`.

**Critical commerce flows (all Horizon-native — restyle only, never rebuild):**
- **PDP** — `sections/product-information.liquid` (Horizon core) = gallery,
  title, price, variant picker, add-to-cart. The single most important file.
- **Cart** — cart drawer + `cart.json` + `snippets/cart-summary.liquid`.
- **Search** — `search.json`, `snippets/search-modal.liquid`, predictive
  search snippets.
- **Account** — `<shopify-account>` web component in the header (renders the
  person/avatar icon; not a plain `/account` link).
- **Collections/PLP** — `collection.json` + Horizon `_product-card` block.

**Apps wired in (preserve; don't hand-edit their blocks):**
- **Judge.me reviews** — `shopify://apps/judge-me-reviews` (4 refs): review
  widget + preview badge on `product.json`, carousel on `index.json`, widget
  on `page.review-page.json`. These produce the 5 `JSONMissingBlock` lint
  errors — **false positives** (the block bodies live in the app, not in the
  theme repo). Verify they render on preview; do not "fix" by editing.
- **Instafeed** — `shopify://apps/instafeed` (1 ref) + `ss-instafeed-2.liquid`
  (orphaned).

## 3. Previous dev's custom sections (Bucket B) — used vs orphaned

> **Status (2026-06-16, commit `f9ba7a6`):** the 11 orphaned sections below
> were **deleted**. The 5 "used" ones remain, to be retired as each page is
> redesigned (un-wire → replace → delete). Theme Check: 14→7 errors.

17 sections. Only 5 are still wired into a template on this draft; **11 are
orphaned** (they were the *live* store's pages, which our redesign replaced).

| Section | Schema name | Used in | Disposition |
|---|---|---|---|
| `boringly-clean-pure` | Boringly clean & pure | **index.json** | used → **fix** (has 2 img errors) |
| `camparision-section` | Comparison Table *(sic)* | **index.json** | used → review vs our own compare |
| `gg-newsletter` | GG Newsletter | **blog.json** | used |
| `icon-highlight-bar` | Icon highlight bar | **product.json** | used |
| `lab-report-hero` | Lab Report – Intro | **page.reports.json** | used |
| `about-us-custom1` | About Us (Custom) | — | orphaned → delete |
| `cultivated-farmers-section` | Turmeric story section | — | orphaned → delete (1 img err) |
| `how-we-are-different` | How we are different | — | orphaned → delete |
| `icon-grid` | Icon Grid | — | orphaned → delete |
| `pure-organic-section` | Turmeric quality section | — | orphaned → delete |
| `reports-table-section` | (blank) | — | orphaned → delete (1 img err) |
| `ss-instafeed-2` | SS – Instafeed #2 | — | orphaned (app) → delete (2 errs) |
| `stamp-next-box` | Stamp Text (Final) | — | orphaned → delete |
| `story-with-image` | Story with Image | — | orphaned → delete |
| `turmeric-hero-section` | Turmeric hero | — | orphaned → delete (3 img errs) |
| `visionAndSighOff` | Vision & Sign-off *(sic)* | — | orphaned → delete |

> ⚠️ Some orphaned sections hold real **content/copy** (turmeric story, lab
> reports) we may want to port into our brand sections. Mine them for content
> before deleting.

## 4. Our brand layer (Bucket C — this branch)

- **`snippets/brand.liquid`** — the entire brand override (fonts, palette
  tokens, type vars, component reskins). Rendered after `color-schemes` in
  `theme.liquid`.
- **Sections (10):** `about-story-intro`, `about-story-field`,
  `about-fix-stamp`, `about-vision-signoff`, `bundles`, `manifesto`,
  `product-in-the-box`, `product-how-to-use`, `product-origin`, `recipe-group`.
- **Assets:** `hero-powder.jpg`, `logo-web4.png`, `about-*`.
- **Wiring (modified):** `settings_data.json`, `header-group.json`,
  `footer-group.json`, several template JSONs, `page.recipes.json` (new).
- **Fragile spot:** the homepage hero is a 4.4 KB inline HTML/CSS/JS blob
  inside `templates/index.json` `custom-liquid`. Should become a real
  `sections/bfc-hero.liquid` (validate/edit normally + theme-editor settings).

## 5. Current page composition (the hybrid state)

**Homepage `index.json`** (top→bottom) — *a mix of our sections, Horizon
grids, and 2 leftover custom sections:*
1. custom-liquid → **our hero**
2. BFC Heading *(ours)*
3. product-list "products grid" *(Horizon)*
4. marquee-images
5. **bundles** *(ours)*
6. **manifesto** *(ours)*
7. product-list "Featured collection" *(Horizon)*
8. image-with-text *(Horizon)*
9. BFC Heading *(ours)*
10. **camparision-section** *(prev-dev custom)*
11. **boringly-clean-pure** *(prev-dev custom — has the img errors)*
12. BFC Heading *(ours)*
13. marquee *(Horizon)*
14. blocks ×2 (one = Judge.me "Review Home Page")
15. featured-blog-posts *(Horizon)*

**PDP `product.json`:**
1. **product-information** *(Horizon core — the buy box)*
2. product-in-the-box · product-how-to-use · product-origin *(ours)*
3. product-recommendations "Suggestions" *(Horizon)*
4. icon-highlight-bar *(prev-dev custom)*
5. product-recommendations *(Horizon)*
6. blocks (Judge.me review widget)

## 6. Theme Check — precise error → file → bucket map

`shopify theme check --path theme` → **14 errors, 37 warnings.**

### Errors (14)
| File | Errors | Bucket | Action |
|---|---|---|---|
| `sections/boringly-clean-pure.liquid` | ImgWidthAndHeight ×2 (L27, L42) | B, **used** | **Fix** (add width/height) |
| `sections/turmeric-hero-section.liquid` | ImgWidthAndHeight ×3 | B, orphaned | **Delete** |
| `sections/cultivated-farmers-section.liquid` | ImgWidthAndHeight ×1 | B, orphaned | **Delete** |
| `sections/reports-table-section.liquid` | ImgWidthAndHeight ×1 | B, orphaned | **Delete** |
| `sections/ss-instafeed-2.liquid` | ImgWidthAndHeight + ParserBlockingScript | C app, orphaned | **Delete** |
| `templates/index.json` | JSONMissingBlock ×2 | Judge.me | False positive — verify render |
| `templates/product.json` | JSONMissingBlock ×2 | Judge.me | False positive — verify render |
| `templates/page.review-page.json` | JSONMissingBlock ×1 | Judge.me | False positive — verify render |

→ **No errors in Horizon core, none in our brand layer.** 9 real errors all sit
in prev-dev sections; 8 of those resolve by **deleting orphans**, leaving only
`boringly-clean-pure` to actually fix. 5 errors are Judge.me false positives.

### Warnings (37)
- **ValidScopedCSSClass ×29** — Horizon's scoped-CSS convention; spread across
  prev-dev + core sections. Cosmetic; address only in files we keep/edit.
- **DeprecatedFilter ×4** — `img_url` → `image_url`. Fix in files we keep.
- **RemoteAsset ×2, HardcodedRoutes ×1, UndefinedObject ×1** — triage per file.

## 7. Implications for the rebrand

1. **The backend is healthy.** Zero lint errors in Horizon core or our layer.
   The commerce engine (PDP, cart, search, account, collections) is intact —
   the rebrand really is "restyle the frontend," as intended.
2. **Most "theme errors" are dead weight.** Deleting 11 orphaned prev-dev
   sections clears 8 of 9 real errors and shrinks the surface we must reason
   about. Mine them for content first.
3. **Two prev-dev sections are still on our homepage** (`camparision-section`,
   `boringly-clean-pure`). Decide: restyle-and-keep, or replace with brand
   sections. They are the main inconsistency in the current homepage.
4. **Judge.me/Instafeed lint is noise** — verify on preview, then ignore.
5. **Stabilize before redesigning:** delete orphans → fix `boringly-clean-pure`
   + deprecated filters in kept files → move hero into a real section → then
   resume design parity.
