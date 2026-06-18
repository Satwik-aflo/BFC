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
is one orchestrator snippet plus topical partials:

- `theme/layout/theme.liquid` renders `{%- render 'brand' -%}` **after** `color-schemes`
  (so it wins the cascade).
- `theme/snippets/brand.liquid` is a thin **orchestrator**: a single inline `{% style %}`
  block that `{%- render -%}`s nine `theme/snippets/brand-*.liquid` partials **in strict
  source order** (the order is load-bearing — later rules override earlier ones), plus the
  announcement-bar marquee `<script>`. Rendering the partials inside one `{% style %}` keeps
  `asset_url` working for `@font-face` and emits CSS byte-identical to the former monolith.
  **Do not reorder the renders**, and add new brand CSS as a partial render (or into the
  matching partial), never as a separate `{% stylesheet %}` (that bundles to an external file
  with different load timing and breaks the "wins the cascade" guarantee). The nine partials:
  `brand-fonts-and-tokens` (`@font-face` incl. legacy Copperplate/Flagflies aliases + `:root`
  tokens — overrides Horizon's four base font-family vars `--font-body--family`,
  `--font-subheading--family`, `--font-heading--family`, `--font-accent--family`),
  `brand-utilities` (`.bfc-*` helpers), `brand-header-nav`, `brand-announcement`,
  `brand-a11y` (focus ring, heading wrap), `brand-product-cards`, `brand-cart-search`,
  `brand-card-commerce` (retro-oval add-to-cart pill), `brand-page-headings` (homepage +
  collection-page reskin). Each partial is raw CSS (no `{% style %}` wrapper) with a `{% doc %}`
  header; avoid literal `<tag>` text in their comments (theme-check parses each partial
  standalone and treats `<…>` as unclosed HTML).
- Everything else (h1–h6, paragraphs, buttons, cart) inherits from those four variables,
  defined in `theme/snippets/theme-styles-variables.liquid`. Change type/color there or via
  `theme/config/settings_data.json`, not by editing core sections.

Color schemes (scheme-1..6) live in `settings_data.json`; global type sizes are settings
like `type_size_paragraph`. The header nav font is controlled by the `_header-menu` block
(`type_font_primary_link` defaults to `heading` = Copperplate).

**A color scheme controls component text colour, and a mismatched scheme makes text
invisible — not just off-brand.** `snippets/color-schemes.liquid` emits, per scheme,
`.color-{id} { color: var(--color-foreground); background-color: var(--color-background); }`,
and components carry that class from a *setting*: the cart drawer is
`color-{{ settings.drawer_color_scheme }}` (`snippets/header-actions.liquid`), search/popovers/
filters use `settings.popover_color_scheme`, sections use their own `color_scheme`. So if a
scheme pairs a cream background with a light foreground (e.g. the live store once had the cart
drawer + popover pointed at a scheme with `background #fbf3cc` + `foreground #FFFFFFCF`), every
inheriting label renders **white-on-cream**. When text is invisible, suspect the `*_color_scheme`
**setting**, not the CSS — repoint it to a scheme whose fg/bg actually contrast (usually
`scheme-1`), and **don't** edit a shared scheme's colours (the transparent-header scheme reuses a
cream/white pairing on purpose, for white nav over the hero photo).

New full-width brand sections follow a bespoke **`bfc-*.liquid`** pattern (e.g. `bfc-hero`,
`bfc-manifesto`, `bfc-footer`): each ports one static section's markup + `{% stylesheet %}`
(referencing brand tokens already defined in `brand.liquid` `:root`) + `{% schema %}`, is
theme-editable, and is wired into the relevant template / section-group JSON — **retiring**
any legacy `custom-liquid` equivalent. Prefer adding a `bfc-*` section over editing Horizon
core sections.

### Liquid & validation gotchas
- `{% style %}` **renders Liquid** (so `asset_url` works for fonts) — `{% stylesheet %}` does
  **not**. The brand layer uses `{% style %}` for that reason. (`{% stylesheet %}`/`{% javascript %}`
  are fine for static CSS/JS that only reference brand tokens via `var(--…)`.)
- **`inline_richtext` sanitizes hard.** Shopify strips `<span class="…">` and most attributes
  from an `inline_richtext`/announcement value; it keeps `<strong>`, `<em>`, `<i>`, `<b>`,
  `<a>`, `<br>`. Style via the allowed tag (e.g. `.announcement-bar__text em { … }`), not a
  custom `<span class>` — the class won't survive the push.
- **The Dev MCP validator rejects hardcoded `/collections/...` URLs** — use
  `collections['handle'].url` (or `routes.*_url`) instead. Hardcoded `/pages/...` and
  `/policies/...` paths are accepted.

### Performance (brand assets)
- **Brand fonts are served as WOFF2.** `brand.liquid` `@font-face` lists `format("woff2")`
  **first**, with the original `.otf`/`.ttf` kept as a fallback `src` (≈halves font bytes — the 9
  files went ~722 KB → ~300 KB). Adding a weight? Convert it (`fonttools`+`brotli`,
  `f.flavor="woff2"`) and put the `.woff2` `src` before `format("opentype"|"truetype")`. Keep
  `font-display: swap`.
- **Responsive images:** render hero/large images with `image_tag` + `widths:` + `sizes:` so
  Shopify emits a `srcset`, plus `preload: true` on the LCP hero (Shopify's resource hint —
  `image_tag` has **no** `fetchpriority` param). `image_tag` also auto-emits intrinsic
  `width`/`height`, which fixes CLS *and* the `ImgWidthAndHeight` theme-check error — prefer it
  over a hand-written `<img>`. Images referenced via `asset_url` (`{{ 'x.jpg' | asset_url }}`)
  **cannot** be CDN-resized — compress those at the source (`sips`) and keep them
  `loading="eager" fetchpriority="high"`.

### Shopify CLI workflow (hard-won rules)
- Store permanent domain: **`d9v1pv-06.myshopify.com`** (vanity = boringfoodscompany.com).
  **Always use the permanent domain** with the CLI — passing the vanity domain makes the CLI
  append `.myshopify.com` and auth fails.
- Working/preview theme: **`#151032561833`** ("Boring Foods — New Design", a pristine admin
  duplicate of Horizon). Live theme must **NEVER** be pushed/published to without explicit
  user approval.
- **Always pass `--path theme`, run the CLI from the repo root, and remember `--only` pushes the
  *entire* file (a full replace, not a patch).** The theme lives in `theme/`, not the repo root.
  The Bash tool resets cwd to the repo root before every call (so `cd theme && …` doesn't
  persist) — but if a command *does* run with cwd already inside `theme/`, `--path theme` resolves
  to `theme/theme` and the command **errors**; prepend `cd /…/BFC &&` to be safe. Conversely, a
  push/pull that matches **zero** files (wrong `--path`/`--only`) moves nothing — **yet still
  prints "pushed successfully."** And since `--only` is a full-file replace, the working-tree file
  must be the newest version: with all work on `main` (and the draft mirroring `main`) it always
  is, but re-verify after any `git stash`/`checkout`/pull of an older copy.
- **Never re-upload Horizon's core sections.** CLI 4.1.0's validation is stricter than
  Horizon 3.5.1's schema and rejects `product-list`/`product-recommendations` on a full
  push, breaking templates. Push **only our brand files** surgically:

  ```bash
  shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 \
    --nodelete --only snippets/brand.liquid --only config/settings_data.json
  ```
- **Verify every push by pulling back — never trust the success banner.** Shopify reports
  success even when it uploaded nothing or silently stripped a value. Pull the changed files
  to a temp dir and grep. The `--path` dir must already exist or the pull errors:

  ```bash
  mkdir -p /tmp/bfc-verify
  shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com \
    --theme 151032561833 --only snippets/brand.liquid
  ```
- **A new section setting — or a new section *type* — needs two sequential pushes.** Push the
  section `.liquid` first (so the new schema/type is live server-side), verify, then push the
  template / section-group JSON that references it. Pushing both at once makes Shopify
  validate the JSON against the *old* server-side schema and **silently strip** the unknown
  setting or drop the section reference. (Hit with a new `image_asset` setting on bundle cards,
  and again wiring `bfc-footer` into `footer-group.json`.)
- Pull pristine source if needed: `rm -rf theme && shopify theme pull --theme 151032561833`
- Preview: `https://d9v1pv-06.myshopify.com?preview_theme_id=151032561833` (sets a preview
  cookie in *your* browser only — real customers are unaffected; use incognito to see live).
- If auth returns 401 "Service is not valid for authentication": `shopify auth logout` then
  re-login as the store owner (interactive, in a real terminal).
- **Read deployed theme files read-only with `shopify store execute`** (Admin GraphQL) — the
  only way to see what's *actually live* (or to diff live vs preview, or confirm a value landed
  server-side). Auth once (interactive): `shopify store auth --store d9v1pv-06.myshopify.com
  --scopes read_themes`. Then:

  ```bash
  shopify store execute --store d9v1pv-06.myshopify.com -j --query \
    'query { theme(id:"gid://shopify/OnlineStoreTheme/147961872553"){ files(first:1, filenames:["config/settings_data.json"]){ nodes{ body{ ... on OnlineStoreThemeFileBodyText { content } } } } } }'
  ```

  Live theme = **`#147961872553`** ("Horizon", role MAIN). Strip the leading `/* … */` comment
  from theme JSON before parsing. `read_themes` covers theme files only (product/customer reads
  need broader scopes — get purchasable variant ids from the public `/products.json` instead).
- **Live and preview have diverged — the live theme is being hand-edited in admin** in parallel
  with our preview reskin (different drawer/header schemes, transparent-header toggles, homepage
  sections). Before publishing the preview theme, diff live vs preview (query above) so a publish
  doesn't clobber live-only work, or vice-versa. Shopify exposes **no per-file version history via
  API**; the exact who/when of a live edit is only in admin → Themes → ⋯ → Version history.

### Validate before pushing (Shopify Dev MCP)
Validate Liquid/theme edits with the Shopify Dev MCP (`@shopify/dev-mcp`, docs & validation
only — no store access). Call `learn_shopify_api` (api: `liquid`) first to get a
`conversationId`, then `validate_theme` with the **absolute** theme path and the changed
files. On a re-validation after a fix, reuse the returned `artifactId` and bump `revision`.
Treat this (and `curl | grep`) as a syntax/schema gate only — not proof the page looks right.

`shopify theme check --path theme` is a useful second gate, but its **5 `JSONMissingBlock`
errors are false positives** — they're app blocks (Instafeed, Judge.me) that can't resolve
locally yet are installed on the shop. The ~25 `ValidScopedCSSClass` warnings and the lone
`HardcodedRoutes` warning are likewise known/expected — don't chase them. Real, fixable signal
looks like `ImgWidthAndHeight` (→ switch the `<img>` to `image_tag`).

### Verifying theme work = visual, not validator
**A passing validator + a successful push + a `curl | grep` for text markers does NOT mean a
page renders or looks right.** Shopify fails silently: it renders empty product cards, drops
an erroring section, and serves the default template for an unbound page — all without
errors. And much of the "truth" lives in the **admin**, not theme code: page→template
binding, the nav menus, which pages exist, product data, and images. A perfect section stays
invisible until an admin step wires it up.

Always confirm visually with headless Chromium + Playwright screenshots (desktop 1280 +
mobile 390), comparing against `site/`. The QA harness lives in `/tmp/bfc-qa/`; Playwright
resolves `playwright-core` from `/tmp/node_modules`, Chromium from the `ms-playwright` cache.
Set the preview cookie by visiting `?preview_theme_id=151032561833` once, then navigate to
the real URL and screenshot. When a page looks blank despite valid code, suspect an unbound
template or a missing menu/page in admin — and hand the user an explicit admin checklist.
(Storefront pages live store-wide at `/pages/<handle>`, independent of theme; a page set to
**Hidden** returns 404 and is absent from `/sitemap.xml` — that's the usual "my new page
404s" cause, not caching.)

**Preview an unbound or alternate template without touching admin:** append `&view=<suffix>` to
the URL — e.g. `…/pages/recipes?preview_theme_id=151032561833&view=recipes` renders that
template for your request only, no page→template binding required. (Several pages — recipes,
about-us — render the *default* template at their plain URL because the page isn't bound to its
new template yet; that binding is an admin step that affects live, so flag it, don't flip it.)

**Interactive components (cart drawer, search popover) need state to verify.** Drive them with
Playwright: POST `/cart/add.js` `{items:[{id:<variantId>,quantity:1}]}` to populate (variant id
from the public `/products.json`), then click the cart/search trigger and screenshot the open
panel. To dry-run a scheme/CSS fix without writing to the theme, swap the element's class
in-page (`el.className = el.className.replace(/color-scheme-\S+/,'color-scheme-1')`) and
re-read `getComputedStyle(el).color`. `loading="lazy"` images below the fold stay unrendered
until scrolled — scroll the full page before a full-page screenshot (cards looked "imageless"
in screenshots purely from this).

## `site/` — static marketing site

No tooling/build. Serve locally and open in a browser:

```bash
cd site && python3 -m http.server 8000   # then http://localhost:8000
```

Files: `index.html`, `styleguide.html` (documents the design system), `css/tokens.css`
(brand tokens), `css/main.css`, `js/main.js` (IntersectionObserver reveals, sticky nav, CSS
marquee, smooth anchors). `main.js` queries by class (no IDs), so removing/reordering
sections in the HTML won't break it.

### Verifying `site/` visually
Content is **opacity-gated**: `js/main.js` sets `.reveal{opacity:0}` (IntersectionObserver) and
reveals on scroll, so a plain headless full-page screenshot is **blank below the fold**. To capture a
section: no `agent-browser`, but system Chrome + Playwright (`npx --no-install playwright`) are
available — `scrollIntoViewIfNeeded()` + ~1.3s wait per section, or inject
`.reveal{opacity:1!important;transform:none!important}` before shooting. Note: `js/main.js` injects a
fixed **`sf-search`** bar (WIP) that overlaps section tops in screenshots — pre-existing, not a regression.

## Mobile UI/UX audit findings — checklist for the Shopify conversion

Mobile-first audit of `site/` (2026-06-14, rendered at iPhone 390×844 / Android 360×640 +
axe-core). Mobile is the primary purchase device, so treat these as the QA checklist for the
`theme/` reskin. Tagged by where they live:

- **[BRAND]** = rooted in our brand tokens/type/assets → **will recur in `theme/`** unless
  fixed at the source (`settings_data.json`, `theme-styles-variables.liquid`, `brand.liquid`).
- **[STATIC]** = artifact of the hand-built `site/` (custom reveal JS, custom nav, mailto
  form) → Horizon handles natively, so **don't port the bug**; just verify the Horizon
  equivalent is clean.

### Must-fix (conversion blockers on mobile)
1. **[BRAND] Orange-on-cream text fails WCAG AA contrast (3.12:1).** Ripe Orange `#F84B21` on
   Kulfi Malai `#FBF3CC` — used for prices, kickers, small headings, links. Indian-Blue intro
   text on cream is also borderline (~3.81:1). Fix at the token level: darker orange
   (~`#C2390F`) or Neem Green for small text; reserve `#F84B21` for ≥24px display or as a bg.
   In `theme/`, audit every scheme in `settings_data.json` for the same pairing.
2. **[BRAND] Hamburger / icon tap targets < 44×44px** (was 34×26). Ensure Horizon's header
   controls keep ≥44px hit areas after the reskin; don't shrink them via brand CSS.
3. **[BRAND] Nav controls barely visible over the hero photo** (cream glyph on mid-tone photo,
   <3:1 non-text contrast). Keep Horizon's header scrim/contrast treatment; verify over the
   brand hero image.
4. **[BRAND] Widespread sub-16px text** — recipe badges 9.9px, nav/footer/breadcrumb/card-name
   12px, body at Aesthet Nova Light 300. Set mobile minimums in `theme-styles-variables.liquid`
   / type-size settings; bump shopping-critical labels (prices, product names) to ≥14px.
5. **[STATIC] No-JS blank page** — `site/` hides all content behind `.reveal{opacity:0}` with
   no `<noscript>`. Horizon degrades gracefully; just don't reintroduce opacity-gated reveals
   in `brand.liquid` for price/CTA. If we port scroll animations, guard with a `.no-js` class.
6. **[STATIC] Mobile menu can't be closed; no Cart/Search in mobile menu.** Horizon's drawer
   menu + persistent cart icon solve this natively — verify they survive the reskin (the
   `_header-menu` block / header group), don't rebuild a custom overlay.

### High / Medium (verify in theme)
7. **[BRAND] Heading hierarchy** — `site/` index has no `<h1>` and skips H1→H3 on contact/
   reports. Horizon templates are structured, but check any custom brand sections we add use
   sequential headings. **Do NOT add an `<h1>` to a `bfc-*` homepage section — Horizon's
   `header-component` already emits a visually-hidden `<h1>` (the shop name) on every page, so a
   second one is a duplicate-h1 a11y bug. Verify `document.querySelectorAll('h1').length === 1`.**
   (The "`site/` has no h1" finding does NOT apply to the Horizon theme.)
8. **[BRAND] No visible `:focus-visible` indicator** — add a global high-contrast focus ring in
   `brand.liquid` (don't let brand styling suppress Horizon's focus outlines).
9. **[BRAND] PDP: price/CTA pushed far below the fold; no sticky buy bar.** When styling the
   Horizon product template, keep title+price high and consider Horizon's sticky add-to-cart.
10. **[BRAND] Long display headings (Copperplate/Mexicana) overflow & clip at 360px.** Add
    `overflow-wrap:break-word; hyphens:auto` to brand heading styles; test at 360px.
11. **[STATIC] Comparison table cut off** (`min-width:600px`, no scroll affordance), **contact
    form is `mailto:` with no feedback**, **dead `href="#"` search/cart on homepage**,
    **closed overlay keeps focusable links / no scroll-lock / no focus trap**, **fixed nav
    overlaps anchored content (no `scroll-margin-top`)**. All are hand-built `site/` issues;
    rebuild these as Horizon sections/blocks rather than porting the markup.

### Low (cosmetic / polish)
About `.story-list-wrapper` crushed `line-height:6.4px`; "View Report" button 35px tall;
About signature-stamp gap/overflow; empty `<th>` in compare table; decorative glyphs
(`★ ☞ ✦`) not `aria-hidden`; footer meta wraps mid-phrase at 360px.

### Verified GOOD in `site/` — keep these properties in `theme/`
No horizontal page overflow at any viewport · no JS console/network errors · `prefers-reduced-
motion` fully supported · pinch-zoom NOT blocked (no `user-scalable=no`/`maximum-scale`) · all
`<img>` have alt · contact inputs 44px tall with `type="email"` + associated labels (no iOS
zoom-on-focus) · FAQ accordions (native `<details>`) work · reports table → stacked-card
pattern is the model responsive transform · index hero CTA prominent above the fold.

## Git

Remote `origin` = `https://github.com/Satwik-aflo/BFC.git` (private). Default branch `main`.

**HARD RULE: all work happens directly on `main` — do NOT create feature branches.** This is a
single-developer, non-production workflow; pages/sections are worked on independently, so there
is no overlap to isolate and the overhead of branches/PRs isn't warranted. Critically, the
**draft theme tracks `main`**: keeping everything on one branch guarantees the working tree always
matches what the draft should be, so a surgical `--only` push can never revert unmerged work. (On
2026-06-17, splitting work across `main` + a feature branch while the draft tracked the *feature*
branch caused a `main`-based push to silently wipe the marquee announcement bar off the draft —
single-branch eliminates this entire class of bug.) Commit straight to `main`; push to
`origin/main` when the user asks.
