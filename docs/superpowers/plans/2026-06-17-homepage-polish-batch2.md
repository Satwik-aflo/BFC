# Homepage Polish (Batch 2) — Footer, Header-Scroll, Search, Icon Marquee, Proudly-Boring Banner

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land five homepage fixes on the **draft** theme — (1) compact mobile footer with our-links-left / policy-links-right, (2) fix white-on-white header nav when scrolling on the home page, (3) un-clip the search placeholder on mobile, (4) center + scroll the yellow icon marquee, (5) add a new scrolling "Support Natural Farming · Proudly Boring · Backed by Science" banner above the footer.

**Architecture:** All edits are to **our** files — `snippets/brand.liquid` (header/search CSS), `sections/bfc-footer.liquid`, `sections/marquee-images.liquid`, a new `sections/bfc-proudly-banner.liquid`, and `templates/index.json` (wire the banner in). No Horizon core files. Each change is verified by the project gate: Dev MCP `validate_theme` → surgical push to draft → pull-back grep → headless-Chromium/Playwright visual probe → commit.

**Tech Stack:** Shopify Horizon 3.5.1 (Liquid), Shopify CLI, Playwright + `playwright-core` headless Chromium.

---

## ⚠️ Read first — non-negotiable constraints

- **All work happens directly on `main` — do NOT create a feature branch** (project hard rule; the draft tracks `main`). Commit each task straight to `main`.
- **NEVER push or publish to the LIVE theme `#147961872553`.** All work targets **DRAFT `#151032561833`** on store **`d9v1pv-06.myshopify.com`**.
- **Run every CLI command from the repo root** (`cd /Users/saimeda/Documents/Codex/medas/BFC &&`) and **always pass `--path theme`**. `--only` is a **full-file replace** — verify every push by pulling back and grepping; the success banner lies.
- **The "test" = the verification gate in each task** (Dev MCP validate, pull-back grep, and a Playwright computed-style/screenshot probe vs the intended look). A green validator + successful push is NOT proof.
- **A new section *type* needs two sequential pushes:** push `sections/bfc-proudly-banner.liquid` first (registers the type server-side), verify, then push `templates/index.json` that references it — else Shopify validates the JSON against the old schema and silently drops the section.

## Shared reference

```
STORE=d9v1pv-06.myshopify.com
DRAFT=151032561833
THEME_ABS=/Users/saimeda/Documents/Codex/medas/BFC/theme
REPO=/Users/saimeda/Documents/Codex/medas/BFC
CHROME="$HOME/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
export NODE_PATH=/tmp/node_modules
PREVIEW="https://d9v1pv-06.myshopify.com/?preview_theme_id=151032561833"
```

Dev MCP: the tools are deferred — load them with `ToolSearch(query="select:mcp__shopify-dev__learn_shopify_api,mcp__shopify-dev__validate_theme", max_results=5)`, then call `learn_shopify_api(api:"liquid")` once for a fresh `conversationId` and reuse it for every `validate_theme`. Use a stable `artifactId` per file, bump `revision` on retries.

**Design decisions locked with the user:** footer split is **mobile-only** (desktop unchanged); the new banner sits **just above the footer**; in the banner, **"Proudly Boring" renders in cursive Musloner** while the other two phrases are Copperplate caps, with ✦ separators.

---

### Task 0: Setup + baselines

**Files:** none (QA only)

- [ ] **Step 1: Confirm clean tree on `main` + QA harness**

Run:
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
git branch --show-current   # expect: main
git status --short          # expect: clean (ignore any pre-existing untracked docs)
ls "$HOME/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/" >/dev/null && ls /tmp/node_modules/playwright-core >/dev/null && echo "QA harness OK"
mkdir -p /tmp/bfc-qa /tmp/bfc-verify
```

- [ ] **Step 2: Capture BEFORE baselines (for regression comparison)**

Create `/tmp/bfc-qa/shoot.mjs` (reused by every task):
```js
import { chromium } from 'playwright-core';
const EXEC = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const [,, urlPath='/', label='home', wStr='1280', mobile='0'] = process.argv;
const w = parseInt(wStr, 10), isM = mobile === '1';
const URL = `https://d9v1pv-06.myshopify.com${urlPath}${urlPath.includes('?')?'&':'?'}preview_theme_id=151032561833&_cb=${Date.now()}`;
const b = await chromium.launch({ executablePath: EXEC, headless: true });
const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: isM?2:1, isMobile: isM, hasTouch: isM });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(2500);
await p.evaluate(async () => { for (let y=0;y<document.body.scrollHeight;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,120));} window.scrollTo(0,0); });
await p.waitForTimeout(1000);
await p.screenshot({ path: `/tmp/bfc-qa/${label}.png`, fullPage: true });
console.log('shot', label, URL);
await b.close();
```
Run:
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
node /tmp/bfc-qa/shoot.mjs '/' before_home_desktop 1280 0
node /tmp/bfc-qa/shoot.mjs '/' before_home_mobile 390 1
```
Keep `before_home_desktop.png` as the **desktop footer parity baseline** for Task 1 and the **overall regression baseline** for Task 6. View both to confirm they captured.

---

### Task 1: Compact mobile footer (our-links left / policy-links right)

**Files:**
- Modify: `theme/sections/bfc-footer.liquid` (markup ~L38–52 + `{% stylesheet %}`)

Current structure: `.bfc-footer__top` is a desktop grid `auto 1fr auto` = stamp | cta | `.bfc-footer__nav` (our 5 links). `.bfc-footer__policies` (5 policy links) is a separate full-width flex row below. On mobile both collapse to centered full-width stacks → very tall. Desktop must stay **unchanged**.

- [ ] **Step 1: Wrap nav + policies in a shared directory container**

In `theme/sections/bfc-footer.liquid`, the two `<nav>` blocks currently look like:
```liquid
      <nav class="bfc-footer__nav" aria-label="Footer">
        <a href="/pages/about-us">Our Story</a>
        <a href="{{ collections['shop'].url | default: routes.all_products_collection_url }}">Shop</a>
        <a href="/pages/reports">Reports</a>
        <a href="/pages/recipes">Recipes</a>
        <a href="/pages/faqs">FAQ</a>
      </nav>
    </div>

    <nav class="bfc-footer__policies" aria-label="Policies">
      <a href="/policies/privacy-policy">Privacy Policy</a>
      <a href="/policies/refund-policy">Return &amp; Refund</a>
      <a href="/policies/shipping-policy">Shipping Policy</a>
      <a href="/policies/terms-of-service">Terms &amp; Conditions</a>
      <a href="/pages/contact">Contact</a>
    </nav>
```
Leave `.bfc-footer__nav` exactly where it is (inside `.bfc-footer__top`, so desktop is untouched). The mobile two-column layout is achieved **purely in CSS** by re-flowing the existing `.bfc-footer__inner` children — `.bfc-footer__nav` is nested in `.bfc-footer__top`, so a cross-parent grid is not possible; instead, on mobile we (a) keep `.bfc-footer__nav` rendered by `.bfc-footer__top` on the **left**, and (b) absolutely/grid-place `.bfc-footer__policies` to the **right** of it. The robust way is a small markup move: relocate `.bfc-footer__policies` to sit immediately **after** `.bfc-footer__nav`, both wrapped in a `.bfc-footer__directory` div, and give that wrapper `display: contents` on **desktop** (so nav + policies behave exactly as today) and `display: grid` two-column on **mobile**.

Replace the two `<nav>` blocks above with:
```liquid
      <div class="bfc-footer__directory">
        <nav class="bfc-footer__nav" aria-label="Footer">
          <a href="/pages/about-us">Our Story</a>
          <a href="{{ collections['shop'].url | default: routes.all_products_collection_url }}">Shop</a>
          <a href="/pages/reports">Reports</a>
          <a href="/pages/recipes">Recipes</a>
          <a href="/pages/faqs">FAQ</a>
        </nav>
        <nav class="bfc-footer__policies" aria-label="Policies">
          <a href="/policies/privacy-policy">Privacy Policy</a>
          <a href="/policies/refund-policy">Return &amp; Refund</a>
          <a href="/policies/shipping-policy">Shipping Policy</a>
          <a href="/policies/terms-of-service">Terms &amp; Conditions</a>
          <a href="/pages/contact">Contact</a>
        </nav>
      </div>
    </div>
```
**Important:** the closing `</div>` that ended `.bfc-footer__top` must now come AFTER the new `.bfc-footer__directory` (i.e. the directory lives inside `.bfc-footer__top`). Read the file and place the braces precisely — the directory and its two navs sit as the 3rd grid cell of `.bfc-footer__top`.

- [ ] **Step 2: Desktop = `display: contents` (zero visual change); mobile = two-column**

In the `{% stylesheet %}` block, the current mobile media query is `@media (max-width: 749px)`. Add a desktop rule that makes the wrapper transparent to layout, and rework the mobile rule. Add:
```css
  /* Desktop: directory is layout-transparent so nav stays the __top grid's 3rd
     cell exactly as before; policies still flow as the full-width row below. */
  @media (min-width: 750px) { .bfc-footer__directory { display: contents; } }
```
Then inside the existing `@media (max-width: 749px)` block, ADD:
```css
    .bfc-footer__directory {
      display: grid;
      grid-template-columns: auto auto;
      justify-content: space-between;
      align-items: start;
      gap: 1.5rem 1rem;
      width: 100%;
      text-align: left;
    }
    .bfc-footer__nav { justify-items: start; text-align: left; }
    .bfc-footer__policies {
      flex-direction: column;
      align-items: flex-end;
      text-align: right;
      gap: 0.55rem;
    }
    /* De-emphasize the boilerplate policy links: lighter + smaller. */
    .bfc-footer__policies a {
      font-weight: 400;
      font-size: 0.62rem;
      opacity: 0.7;
      letter-spacing: 0.12em;
    }
    /* Keep our links the visual priority. */
    .bfc-footer__nav a { font-size: 0.8rem; }
```
Note: the desktop `display: contents` makes `.bfc-footer__policies` re-parent to `.bfc-footer__top` on desktop — which would change desktop. To prevent that, the desktop rule must instead keep policies as a full-width row. **Use this safer desktop rule instead of `display: contents`:** on desktop, take `.bfc-footer__policies` out of the grid flow and restore its original placement:
```css
  @media (min-width: 750px) {
    .bfc-footer__directory { display: contents; }       /* nav -> stays __top cell 3 */
  }
```
`display: contents` on desktop dissolves the wrapper so BOTH navs become children of `.bfc-footer__top`. Since `.bfc-footer__top` is `grid-template-columns: auto 1fr auto` (3 columns) and already has stamp+cta+nav, the policies nav becomes a 4th grid item and wraps to a new full-width-ish row — **visually approximating** the current "policies below" layout but not identical. **This is the one place desktop parity must be confirmed by screenshot (Step 5); iterate the desktop rule (e.g. force `.bfc-footer__policies { grid-column: 1 / -1; }`) until `after_footer_desktop.png` matches `before_home_desktop.png`'s footer.**

- [ ] **Step 3: Validate (Dev MCP)**

`validate_theme`, `filesCreatedOrUpdated=[{path:"sections/bfc-footer.liquid", artifactId:"footer-mobile", revision:1}]`. Expected VALID.

- [ ] **Step 4: Push + pull-back verify**
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete --only sections/bfc-footer.liquid
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com --theme 151032561833 --only sections/bfc-footer.liquid
grep -c 'bfc-footer__directory' /tmp/bfc-verify/sections/bfc-footer.liquid   # expect >=2 (markup + css)
```

- [ ] **Step 5: Visual gate — desktop parity + mobile two-column**
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
node /tmp/bfc-qa/shoot.mjs '/' after_footer_desktop 1280 0
node /tmp/bfc-qa/shoot.mjs '/' after_footer_mobile 390 1
```
View all four. **Pass criteria:** `after_footer_desktop.png` footer ≈ `before_home_desktop.png` footer (no desktop regression); `after_footer_mobile.png` shows our 5 links left-aligned on the left, the 5 policy links smaller/lighter and right-aligned on the right, and a clearly shorter footer. Iterate the CSS (Step 2) until both hold.

- [ ] **Step 6: Commit**
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
git add theme/sections/bfc-footer.liquid
git commit -m "fix(footer): compact mobile layout — our links left, policy links right (smaller/lighter)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Fix white-on-white header nav when scrolling on the home page

**Files:**
- Modify: `theme/snippets/brand.liquid` (header nav color rules, ~L237–266)

Root cause: brand.liquid pins nav color by the `<header-component>` `transparent` attribute — `header-component:not([transparent])` → black; `header-component[transparent]` → Kulfi cream + shadow (for over-hero legibility). On the **home** page the header is transparent over the hero; when you scroll, Horizon gives the header a solid (cream/scheme) background but the `[transparent]` attribute (and thus the cream text rule) persists → cream-on-cream, invisible. Recipes/About have no transparent header, so `:not([transparent])` black always applies and they're fine.

- [ ] **Step 1: Inspect the scrolled-state DOM (find the real selector)**

Create `/tmp/bfc-qa/header_scroll.mjs`:
```js
import { chromium } from 'playwright-core';
const EXEC = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const URL = 'https://d9v1pv-06.myshopify.com/?preview_theme_id=151032561833&_cb=' + Date.now();
const b = await chromium.launch({ executablePath: EXEC, headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(2000);
const read = async (label) => console.log(label, JSON.stringify(await p.evaluate(() => {
  const hc = document.querySelector('header-component');
  const link = document.querySelector('.menu-list__link');
  const header = document.querySelector('.header') || hc;
  return {
    hcAttrs: hc ? [...hc.attributes].map(a => `${a.name}=${a.value}`) : null,
    hcClass: hc && hc.className,
    headerBg: header && getComputedStyle(header).backgroundColor,
    linkColor: link && getComputedStyle(link).color,
  };
}, ), null, 2));
await read('TOP   ');
await p.evaluate(() => window.scrollTo(0, 1200));
await p.waitForTimeout(1200);
await read('SCROLLED');
await p.screenshot({ path: '/tmp/bfc-qa/header_scrolled.png', clip: { x:0, y:0, width:1280, height:140 } });
await b.close();
```
Run `node /tmp/bfc-qa/header_scroll.mjs`. **Record:** does `header-component` keep `transparent` after scroll? What is the scrolled `headerBg` (a light cream?) and `linkColor` (a light cream — confirming the bug)? Note any scroll-state class/attr Horizon adds (e.g. `data-scroll-direction`, `.scrolled-past-header`, a `--header-background` change). This determines the exact selector in Step 2.

- [ ] **Step 2: Add the scrolled-state override**

In `theme/snippets/brand.liquid`, immediately AFTER the existing `header-component[transparent] .menu-list__link { … }` rule (~L256), add a rule that forces dark nav + icons once the header is scrolled past the hero. Use whichever signal Step 1 revealed. The most likely (Horizon keeps `[transparent]` but adds a scrolled class on a wrapper):
```css
  /* Home page only: once the transparent header gains its solid background on
     scroll, Horizon keeps the [transparent] attribute but the cream nav rule
     above then renders cream-on-cream. Force dark nav + icons in the scrolled
     state so the header stays legible (sub-pages already use the :not([transparent])
     black rule). Selector confirmed live in Step 1. */
  .scrolled-past-header header-component[transparent] :is(.menu-list__link, .header-actions__action, .header__icon, svg) {
    color: #000 !important;
    text-shadow: none !important;
    fill: currentColor !important;
  }
```
If Step 1 shows Horizon instead **removes** `[transparent]` on scroll, then the existing `:not([transparent])` black rule should already win — in that case the bug is the icons (not `.menu-list__link`); extend the `:not([transparent])` rule to include `.header-actions__action, .header__icon, svg`. **Adapt the selector to the Step-1 finding; do not ship the guess blindly.**

- [ ] **Step 3: Validate (Dev MCP)** — `artifactId:"header-scroll", revision:1`. Expected VALID.

- [ ] **Step 4: Push + pull-back verify**
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete --only snippets/brand.liquid
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com --theme 151032561833 --only snippets/brand.liquid
grep -c 'scrolled' /tmp/bfc-verify/snippets/brand.liquid   # expect >= the count you added
```

- [ ] **Step 5: Visual gate — re-run the scroll probe + check sub-pages unaffected**

Re-run `node /tmp/bfc-qa/header_scroll.mjs`: scrolled `linkColor` must now be **dark** (`rgb(0,0,0)`); eyeball `header_scrolled.png` — nav legible. Then confirm the **transparent (top, over hero)** state is still cream (not blackened) and **About/Recipes unaffected**:
```bash
node /tmp/bfc-qa/shoot.mjs '/pages/about-us' check_about 1280 0
node /tmp/bfc-qa/shoot.mjs '/pages/recipes' check_recipes 1280 0
```
Pass: home scrolled nav = dark/legible; home at-top nav still cream over hero; About/Recipes headers unchanged.

- [ ] **Step 6: Commit**
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
git add theme/snippets/brand.liquid
git commit -m "fix(header): legible nav when scrolling on home (was cream-on-cream in the scrolled transparent header)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Un-clip the search placeholder on mobile

**Files:**
- Modify: `theme/snippets/brand.liquid` (search input font-size, ~L646–651)

Root cause: the search input is `font-size: clamp(1.25rem, 1rem + 2vw, 2rem) !important` (~24px at 390px), so the placeholder "Search our boring little pantry" overflows and clips. Fix: lower the input font-size on mobile to ~16px (the iOS no-zoom floor) so the full placeholder fits, while keeping the larger desktop size.

- [ ] **Step 1: Add a mobile font-size override**

In `theme/snippets/brand.liquid`, find the existing rule:
```css
  .search-modal__content :is(.search-input, input[type="search"], .predictive-search-form__input) {
    font-size: clamp(1.25rem, 1rem + 2vw, 2rem) !important;
    font-family: var(--font-body--family);
    font-weight: 500;
    color: var(--kohl-black);
  }
```
Immediately AFTER it, add:
```css
  /* Mobile: the brand body font at clamp(~24px) clips the long placeholder
     ("Search our boring little pantry"). Drop to 16px (iOS no-zoom floor) so the
     full placeholder is visible. */
  @media (max-width: 749px) {
    .search-modal__content :is(.search-input, input[type="search"], .predictive-search-form__input) {
      font-size: 1rem !important;
    }
  }
```

- [ ] **Step 2: Validate (Dev MCP)** — `artifactId:"search-mobile", revision:1`. Expected VALID. (Note: this is a second `brand.liquid` change — fine to push after Task 2's commit; one file, sequential.)

- [ ] **Step 3: Push + pull-back verify**
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete --only snippets/brand.liquid
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com --theme 151032561833 --only snippets/brand.liquid
grep -c 'iOS no-zoom floor' /tmp/bfc-verify/snippets/brand.liquid   # expect 1
```

- [ ] **Step 4: Visual gate — open the search popover on mobile, read the full placeholder**

Create `/tmp/bfc-qa/search_mobile.mjs`:
```js
import { chromium } from 'playwright-core';
const EXEC = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const URL = 'https://d9v1pv-06.myshopify.com/?preview_theme_id=151032561833&_cb=' + Date.now();
const b = await chromium.launch({ executablePath: EXEC, headless: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(2000);
// open search: click the search trigger (adapt selector if needed)
const trigger = await p.$('[aria-label*="Search" i], a[href*="/search"], .header-actions__action[href*="search"], button[aria-label*="Search" i]');
if (trigger) { await trigger.click(); await p.waitForTimeout(1200); }
const info = await p.evaluate(() => {
  const i = document.querySelector('.search-modal__content :is(.search-input, input[type=search], .predictive-search-form__input)');
  if (!i) return 'no search input found — adapt the trigger selector';
  return { placeholder: i.placeholder, fontSize: getComputedStyle(i).fontSize, scrollW: i.scrollWidth, clientW: i.clientWidth, clipped: i.scrollWidth > i.clientWidth + 2 };
});
console.log('SEARCH INPUT:', JSON.stringify(info, null, 2));
await p.screenshot({ path: '/tmp/bfc-qa/search_mobile.png' });
await b.close();
```
Run `node /tmp/bfc-qa/search_mobile.mjs`. **Pass:** `fontSize` ≈ `16px`, and the screenshot shows the full "Search our boring little pantry" placeholder (not clipped). If still clipped, drop to `0.95rem` and re-verify (accept the minor iOS-zoom tradeoff only if needed; prefer 16px).

- [ ] **Step 5: Commit**
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
git add theme/snippets/brand.liquid
git commit -m "fix(search): show full placeholder on mobile (shrink input font to 16px)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Center + scroll the yellow icon marquee

**Files:**
- Modify: `theme/sections/marquee-images.liquid` (`{% stylesheet %}` block)

The homepage "Scrolling Image Marquee" (`marquee-images`) stacks each icon image above its caption with `.marquee-item__text { padding-top: 25px }` and `.marquee-item__image { max-height: 90px }`. The asymmetric padding + tall items make the icons sit high / clip at the top of the yellow bar and read as un-centered (per screenshot). Fix: vertically center each image+label unit within a consistent row height and confirm the horizontal scroll animation runs (incl. mobile).

- [ ] **Step 1: Inspect the live marquee (centering + is it animating?)**

Create `/tmp/bfc-qa/marquee_imgs.mjs`:
```js
import { chromium } from 'playwright-core';
const EXEC = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const URL = 'https://d9v1pv-06.myshopify.com/?preview_theme_id=151032561833&_cb=' + Date.now();
const b = await chromium.launch({ executablePath: EXEC, headless: true });
for (const [w,isM,label] of [[1280,false,'desk'],[390,true,'mob']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: isM?2:1, isMobile: isM, hasTouch: isM });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(2500);
  const el = await p.$('marquee-component, .marquee__repeated-items');
  if (el) await el.scrollIntoViewIfNeeded();
  await p.waitForTimeout(1500);
  const info = await p.evaluate(() => {
    const wrap = document.querySelector('.marquee__wrapper');
    const anim = wrap && getComputedStyle(wrap).animationName;
    const item = document.querySelector('.marquee-item');
    return { animationName: anim, itemHeight: item && item.getBoundingClientRect().height };
  });
  console.log(label, JSON.stringify(info));
  const sec = await p.$('marquee-component');
  if (sec) await sec.screenshot({ path: `/tmp/bfc-qa/marquee_imgs_${label}.png` });
  await ctx.close();
}
await b.close();
```
Run `node /tmp/bfc-qa/marquee_imgs.mjs`. Note whether `animationName` is `marquee-motion` (scrolling) or `none`, and eyeball the screenshots for the top-clipping / off-center look.

- [ ] **Step 2: Fix vertical centering + guarantee equal item height**

In `theme/sections/marquee-images.liquid` `{% stylesheet %}`, change the item/text/image rules. Replace:
```css
  .marquee-item__image {
    max-height: 90px;
    width: auto;
    display: block;
  }

  .marquee-item__text {
    margin: 0;
    padding-top:25px;
    font-size: 0.85rem;
    white-space: nowrap;
  }
```
with:
```css
  .marquee-item {
    justify-content: center;   /* center the image+label unit vertically */
    gap: 10px;
  }
  .marquee-item__image {
    max-height: 64px;
    width: auto;
    display: block;
  }
  .marquee-item__text {
    margin: 0;
    padding-top: 0;            /* was 25px — caused the off-center / clipped look */
    font-size: 0.85rem;
    white-space: nowrap;
  }
```
And in the existing `@media (max-width: 768px)` block, change the `.marquee-item__text { padding-top: 6px … }` to `padding-top: 4px` and keep the 48px image. The `.marquee-item` already has `display:inline-flex; flex-direction:column; align-items:center` — adding `justify-content:center` + removing the big `padding-top` centers it in the bar.

- [ ] **Step 3: (If Step 1 showed `animationName: none`) ensure the marquee scrolls**

If the probe showed no animation, the marquee's `marquee.js` needs the duplicated content it clones at runtime; confirm the section isn't `[data-disabled]`. This is Horizon's `marquee-component` behavior — do NOT edit `marquee.js` (core asset). If it doesn't animate, verify in the theme editor that the section has enough blocks to overflow (the animation only runs when content width > viewport). Note findings; if it animates on desktop but not mobile, that's expected when content fits — not a bug to force.

- [ ] **Step 4: Validate (Dev MCP)** — `artifactId:"marquee-imgs", revision:1`. Expected VALID.

- [ ] **Step 5: Push + pull-back verify + visual gate**
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete --only sections/marquee-images.liquid
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com --theme 151032561833 --only sections/marquee-images.liquid
grep -c 'justify-content: center' /tmp/bfc-verify/sections/marquee-images.liquid   # expect >=1
node /tmp/bfc-qa/marquee_imgs.mjs
```
View `marquee_imgs_desk.png` / `marquee_imgs_mob.png`: icons vertically centered in the yellow bar (no top clipping), label directly under each icon, row reads tidy. **Pass:** centered + not clipped on both viewports.

- [ ] **Step 6: Commit**
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
git add theme/sections/marquee-images.liquid
git commit -m "fix(marquee-images): vertically center icons in the bar (drop asymmetric padding-top)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: New "Proudly Boring" scrolling banner above the footer

**Files:**
- Create: `theme/sections/bfc-proudly-banner.liquid`
- Modify: `theme/templates/index.json` (append the section to the homepage order — **two-push**)

Port `site/`'s `.marquee` strip (mango-yellow bg, black Copperplate caps, ✦ ripe-orange separators, one cursive item). Phrases: **Support Natural Farming** · **Proudly Boring** (Musloner script) · **Backed by Science**, repeated for a seamless `translateX(-50%)` loop.

- [ ] **Step 1: Create the section**

Create `theme/sections/bfc-proudly-banner.liquid`:
```liquid
{%- comment -%}
  BFC proudly-boring scrolling banner. Ports site/ .marquee (main.css L440-468):
  mango-yellow bar, Copperplate caps items, one Musloner script item, ✦ separators.
{%- endcomment -%}
<div class="bfc-proudly" aria-hidden="true">
  <div class="bfc-proudly__track">
    {%- for n in (1..2) -%}
      <span class="bfc-proudly__item">{{ section.settings.phrase_1 | escape }}</span>
      <span class="bfc-proudly__item bfc-proudly__item--script">{{ section.settings.phrase_2 | escape }}</span>
      <span class="bfc-proudly__item">{{ section.settings.phrase_3 | escape }}</span>
    {%- endfor -%}
  </div>
</div>

{% stylesheet %}
  .bfc-proudly {
    background: var(--mango-yellow, #f9bf29);
    border-top: 2px solid var(--kohl-black, #000);
    border-bottom: 2px solid var(--kohl-black, #000);
    overflow: hidden;
    padding: 0.9rem 0;
  }
  .bfc-proudly__track {
    display: flex;
    gap: 3rem;
    width: max-content;
    animation: bfc-proudly-scroll 28s linear infinite;
  }
  .bfc-proudly:hover .bfc-proudly__track { animation-play-state: paused; }
  .bfc-proudly__item {
    display: flex;
    align-items: center;
    gap: 3rem;
    font-family: var(--font-heading--family);
    font-weight: 700;
    font-size: clamp(0.9rem, 0.7rem + 1vw, 1.25rem);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    white-space: nowrap;
    color: var(--kohl-black, #000);
  }
  .bfc-proudly__item::after { content: '✦'; color: var(--ripe-orange, #f84b21); }
  .bfc-proudly__item--script {
    font-family: var(--font-accent--family);
    text-transform: none;
    letter-spacing: 0;
    font-size: 1.4em;
    font-weight: 400;
  }
  @keyframes bfc-proudly-scroll { to { transform: translateX(-50%); } }
  @media (prefers-reduced-motion: reduce) { .bfc-proudly__track { animation: none; } }
{% endstylesheet %}

{% schema %}
{
  "name": "BFC Proudly Banner",
  "settings": [
    { "type": "text", "id": "phrase_1", "label": "Phrase 1", "default": "Support Natural Farming" },
    { "type": "text", "id": "phrase_2", "label": "Phrase 2 (script)", "default": "Proudly Boring" },
    { "type": "text", "id": "phrase_3", "label": "Phrase 3", "default": "Backed by Science" }
  ],
  "presets": [{ "name": "BFC Proudly Banner" }]
}
{% endschema %}
```
Notes: `--font-heading--family` = Copperplate, `--font-accent--family` = Musloner (both defined in brand.liquid). The `(1..2)` duplication makes the track 2× content so `translateX(-50%)` loops seamlessly. `aria-hidden` since it's decorative repetition.

- [ ] **Step 2: Validate (Dev MCP)** — `artifactId:"proudly-banner", revision:1`. Expected VALID.

- [ ] **Step 3: FIRST push — the section only (registers the type)**
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete --only sections/bfc-proudly-banner.liquid
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com --theme 151032561833 --only sections/bfc-proudly-banner.liquid
grep -c 'bfc-proudly__track' /tmp/bfc-verify/sections/bfc-proudly-banner.liquid   # expect >=2
```
Verify it renders standalone via the alternate-view trick is not applicable (it's a section, not template); proceed to wiring.

- [ ] **Step 4: Wire into the homepage, just above the footer**

Read `theme/templates/index.json`. It has a `"sections"` map and an `"order"` array. Add a new entry to `sections` and append its id as the **last** element of `order` (the footer renders from `footer-group.json`, which is after all index sections, so "last in order" = directly above the footer):
```json
    "bfc_proudly_banner": {
      "type": "bfc-proudly-banner",
      "settings": {}
    }
```
and append `"bfc_proudly_banner"` to the end of the `"order"` array. Preserve the leading auto-generated `/* … */` comment and valid JSON.

- [ ] **Step 5: SECOND push — index.json (now the type exists server-side)**
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete --only templates/index.json
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com --theme 151032561833 --only templates/index.json
grep -c 'bfc-proudly-banner' /tmp/bfc-verify/templates/index.json   # expect 1 (NOT 0 — 0 means Shopify stripped it; re-check the two-push order)
```

- [ ] **Step 6: Visual gate — banner renders, scrolls, sits above footer**
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
node /tmp/bfc-qa/shoot.mjs '/' after_banner_desktop 1280 0
node /tmp/bfc-qa/shoot.mjs '/' after_banner_mobile 390 1
```
View both: a mango-yellow bar with black caps "SUPPORT NATURAL FARMING ✦", cursive "Proudly Boring ✦", "BACKED BY SCIENCE ✦", scrolling, positioned directly above the green footer. **Pass:** present, correct text/fonts/colors, above footer, scrolling. (If the pre-existing Horizon `marquee` text section creates visual redundancy nearby, note it for the user — do not remove it without approval.)

- [ ] **Step 7: Commit**
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
git add theme/sections/bfc-proudly-banner.liquid theme/templates/index.json
git commit -m "feat(home): add proudly-boring scrolling banner above the footer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Final verification

**Files:** none

- [ ] **Step 1: Full homepage regression vs the Task-0 baseline**
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
node /tmp/bfc-qa/shoot.mjs '/' final_home_desktop 1280 0
node /tmp/bfc-qa/shoot.mjs '/' final_home_mobile 390 1
```
View both against `before_home_desktop.png` / `before_home_mobile.png`. Confirm: footer compact on mobile (Task 1) with desktop footer unchanged; icon marquee centered (Task 4); proudly banner above footer (Task 5); hero/product-grid/comparison/etc. otherwise unchanged.

- [ ] **Step 2: Confirm the two header/search fixes hold together**

Re-run `node /tmp/bfc-qa/header_scroll.mjs` (scrolled nav dark) and `node /tmp/bfc-qa/search_mobile.mjs` (placeholder full at 16px) — both still pass after all pushes.

- [ ] **Step 3: Theme-check delta (no new offenses)**
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
shopify theme check --path theme 2>&1 | tail -6
```
Expected: 5 `JSONMissingBlock` app-block false positives (unchanged), no NEW error types from our edits. `ValidScopedCSSClass`/`HardcodedRoutes` warnings ≈ unchanged.

- [ ] **Step 4: Confirm clean git state on `main`**
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
git log --oneline -6
git status --short
```
All five fixes committed on `main` (5 commits). `main` is ahead of `origin/main` and unpushed — report this; push only if the user asks.

- [ ] **Step 5: Report to the user** — summarize each of the 5 fixes with its visual gate result, note the unpushed `main` commits, and flag any deferred item (e.g. the pre-existing Horizon `marquee` text section if it looked redundant near the new banner).

---

## Self-Review (against the 5 requests + locked decisions)

- **Coverage:** (1) footer mobile two-col + lighter policies → Task 1; (2) home scrolled white-on-white nav → Task 2; (3) mobile search placeholder clip → Task 3; (4) icon marquee center + scroll → Task 4; (5) proudly-boring banner above footer, Musloner "Proudly Boring" → Task 5. All five covered; locked decisions (mobile-only footer, above-footer placement, script accent) encoded.
- **No placeholders:** every task has concrete edits + exact commands + a Playwright gate. The two *bug* tasks (2 header, 4 marquee) include a live-DOM inspection step **before** the fix because the exact selector/animation state must be read from the running theme, not guessed — the fix CSS is given with explicit "adapt to Step-1 finding" instructions (this is honest, not a placeholder).
- **Risk checks:** Task 1 keeps desktop via a screenshot-parity gate (the riskiest spot — `display:contents` re-parenting is called out to iterate on); Task 5 follows the two-push rule for the new section type with a `grep -c …=1` strip-detection check; every push is pull-back-verified; nothing touches the live theme; all commits land on `main` per the hard rule.
- **Selector/token consistency:** `--font-heading--family` (Copperplate) and `--font-accent--family` (Musloner) match brand.liquid's variables; `.bfc-proudly*` classes are self-consistent between markup and CSS; the search override targets the exact existing `:is(.search-input, input[type="search"], .predictive-search-form__input)` selector.
- **Deferred / out of scope:** not removing the pre-existing Horizon `marquee` text section (flag only); "scrolling like the official website" for Task 4 is interpreted as center + smooth horizontal scroll of the existing component (no JS changes to Horizon core `marquee.js`).
