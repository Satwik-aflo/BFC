# Lighthouse Image-Delivery & LCP Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the homepage's LCP and total image weight by converting the three asset_url-served brand images (hero, hero logo, bundle cards) to right-sized WebP, eliminating the ~679 KiB / ~950 ms the clean Lighthouse run attributed to image delivery.

**Architecture:** The slow images are referenced via `{{ 'name' | asset_url }}`, which Shopify's CDN **cannot** resize or re-format. So we fix them at the source: resize with `sips`, convert to WebP with `cwebp`, drop the new `.webp` files into `theme/assets/`, and repoint the three Liquid/JSON references. No Horizon core files change; all edits are in our `bfc-*` sections and the homepage template JSON. Verification is the project's real QA loop — Dev MCP validate → surgical `--only` push to the **draft** → pull-back grep → Playwright screenshot → re-measure with the perf probe.

**Tech Stack:** Shopify Horizon 3.5.1 (Liquid), `sips` (built-in macOS), `cwebp` (from `brew install webp`), Shopify CLI 4.x, Playwright + headless Chromium (`/tmp/bfc-qa/`).

## Global Constraints

- **Draft theme only: `#151032561833`.** NEVER push or publish to the live theme `#147961872553`.
- Store permanent domain: **`d9v1pv-06.myshopify.com`** (never the vanity domain with the CLI).
- All work on `main` — no feature branches. Commit straight to `main`. Push to `origin` only when the user asks.
- Every CLI push: `--path theme`, run from repo root, `--nodelete`, surgical `--only` (a full-file replace, so the working-tree file must be newest — it always is on `main`).
- **Verify every push by pulling back and grepping** — never trust the "pushed successfully" banner.
- Validate every Liquid edit with the Shopify Dev MCP (`learn_shopify_api` → `validate_theme`) before pushing.
- `{% stylesheet %}` does NOT render Liquid; `asset_url` works in `{% style %}` and in `{{ }}` output only. (Not relevant here — all refs are in markup, not stylesheet blocks.)
- WebP is universally supported by every evergreen browser (Safari 14+); a non-WebP fallback `<img>` is not required, matching the repo's WOFF2-first font pattern.
- **This report measured the LIVE site** (`finalUrl = https://boringfoodscompany.com/?pb=0`, no `preview_theme_id`). The hero, logo, and bundle assets + the `bfc-hero`/`bundles` sections are **shared** with the draft, so fixing the draft directly improves what will be published. All measurements below were the live Horizon theme rendering these same shared assets.

---

## Spec — Findings from the clean Lighthouse run (2026-06-18, mobile, incognito, `pb=0`)

Only the clean second run is in scope. Scores: **Performance 63, Accessibility 91, Best Practices 77, SEO 85.** CWV: FCP 2.0s ✅, **LCP 8.0s ❌ (score 0.02)**, TBT 230ms, CLS 0 ✅, Speed Index 7.0s.

**The single dominant problem is LCP**, and its cause is image delivery:

- **LCP element** = the hero `img.bfc-hero__photo` (`hero-powder.jpg`). LCP sub-part breakdown: TTFB 21ms · **resourceLoadDelay 1160ms** (dominant) · resourceLoadDuration 172ms · elementRenderDelay 59ms.
- **`image-delivery-insight`: est. savings 679 KiB / LCP −950 ms.** Specific offenders, all served via `asset_url` (verified in code):
  - `hero-powder.jpg` — 198 KB JPG, intrinsic 1280×750, served full-bleed. Format-only saving (→ WebP/AVIF) ≈ 151 KB.
  - `logo-web4.png` — 111 KB PNG, intrinsic **1366×768 displayed ~340×190** — wildly oversized. Resize + WebP ≈ 69 KB+.
  - 4× `bundle-*.jpg` — ~140 KB each, intrinsic **800×800 displayed ~352×352**. Resize + WebP ≈ 100 KB each.
- **Out of our control / explicitly out of scope:**
  - Product/collection-card images "832×832 shown 310×310" — these are **Horizon core** product-card images (not our snippets; `bfc-card-commerce.liquid` only emits a 100px add-to-cart thumbnail). Lever is a Horizon setting, not our code → deferred, noted at end.
  - Third-party JS: GTM ~506 KB (loaded 3×) + Facebook ~152 KB, `unused-javascript` ~293 KiB → **business/marketing decision, admin-side, not theme code.** No task.
  - A11y app failures: Judge.me carousel `link-name` (×9), Instafeed `label-content-name-mismatch` → **app-owned**, not our code. Logged, not fixed here.
- **A11y items we own** (small): one content image (`Untitled_design…`) missing `alt` (admin/content), and `identical-links-same-purpose` on the "OUR STORY" link. Addressed in Task 3.

**Definition of done:** re-running the perf probe against the **draft** shows the hero WebP < ~120 KB, logo WebP < ~25 KB, each bundle WebP < ~40 KB, total homepage image bytes down ≥ ~600 KB versus the JPG/PNG baseline, and the hero still renders pixel-correct in a Playwright screenshot.

---

### Task 1: Hero photo + hero logo → right-sized WebP (the LCP fix)

This is the highest-value task: the hero image *is* the LCP element, and the logo sits directly above it in the same section.

**Files:**
- Create: `theme/assets/hero-powder.webp`
- Create: `theme/assets/logo-web4.webp`
- Modify: `theme/sections/bfc-hero.liquid:19` (fallback `<img>` src) and `:36` (logo fallback src)
- Verify with: `/tmp/bfc-qa/perf_probe.mjs`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: the two `.webp` asset filenames (`hero-powder.webp`, `logo-web4.webp`) that must exist in `theme/assets/` before the Liquid that references them is pushed. Later tasks do not depend on this task.

- [ ] **Step 1: Ensure the WebP encoder is installed**

Run:
```bash
which cwebp || brew install webp
cwebp -version
```
Expected: a version string (e.g. `1.4.0`). `cwebp` ships in the `webp` Homebrew formula. If `brew` is unavailable, STOP and ask the user — `sips` on this macOS does not emit WebP, and the format conversion is the core of the win.

- [ ] **Step 2: Convert the hero photo to WebP**

The hero is full-bleed `100vw`; 1280px wide is ample for mobile (the measured viewport) and acceptable behind the dark scrim on desktop. Keep the existing dimensions, just change the format.

Run:
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
cwebp -q 80 theme/assets/hero-powder.jpg -o theme/assets/hero-powder.webp
ls -la theme/assets/hero-powder.webp
```
Expected: a new file roughly **80–130 KB** (down from 198 KB).

- [ ] **Step 3: Resize then convert the logo to WebP**

The logo displays at ~340 CSS px (`width: clamp(200px, 26vw, 340px)`), so 800px wide covers a 2× retina display with margin. Resize first (preserve aspect), then encode.

Run:
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
sips -Z 800 theme/assets/logo-web4.png --out /tmp/logo-web4-800.png
cwebp -q 88 /tmp/logo-web4-800.png -o theme/assets/logo-web4.webp
ls -la theme/assets/logo-web4.webp
```
Expected: a new file roughly **12–25 KB** (down from 111 KB). `-q 88` keeps the wordmark crisp.

- [ ] **Step 4: Repoint the two fallback `<img>` srcs in `bfc-hero.liquid`**

Edit `theme/sections/bfc-hero.liquid`. Change line 19 (the hero photo fallback) from:
```liquid
      <img class="bfc-hero__photo" src="{{ 'hero-powder.jpg' | asset_url }}"
           alt="" loading="eager" fetchpriority="high" width="2400" height="1350">
```
to (note: also correct the intrinsic dimensions to the real 1280×750 so the attributes match the asset and don't mislead CLS math):
```liquid
      <img class="bfc-hero__photo" src="{{ 'hero-powder.webp' | asset_url }}"
           alt="" loading="eager" fetchpriority="high" width="1280" height="750">
```
Change line 36 (the logo fallback) from:
```liquid
    <img class="bfc-hero__logo" src="{{ 'logo-web4.png' | asset_url }}"
         alt="{{ shop.name | escape }}" width="340" height="190">
```
to:
```liquid
    <img class="bfc-hero__logo" src="{{ 'logo-web4.webp' | asset_url }}"
         alt="{{ shop.name | escape }}" width="340" height="190">
```
Also update the two schema `info` hints (lines 141–142) so they read `Defaults to hero-powder.webp` and `Defaults to logo-web4.webp` respectively, keeping the docs honest.

- [ ] **Step 5: Validate the edited Liquid (Dev MCP)**

Call `learn_shopify_api` (api: `liquid`) to get a `conversationId`, then `validate_theme` with the absolute path `/Users/saimeda/Documents/Codex/medas/BFC/theme` and file `sections/bfc-hero.liquid`.
Expected: no errors on `bfc-hero.liquid`. (The 5 `JSONMissingBlock` app-block errors and `ValidScopedCSSClass`/`HardcodedRoutes` warnings are known false positives — ignore.)

- [ ] **Step 6: Push the new assets + section to the DRAFT, then pull back and verify**

Run:
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 \
  --nodelete --only assets/hero-powder.webp --only assets/logo-web4.webp --only sections/bfc-hero.liquid
mkdir -p /tmp/bfc-verify
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com \
  --theme 151032561833 --only sections/bfc-hero.liquid
grep -c "hero-powder.webp\|logo-web4.webp" /tmp/bfc-verify/sections/bfc-hero.liquid
```
Expected: the grep prints `2` (both new refs landed server-side). If it prints `0`, the push silently no-oped — re-check `--path`/`--only` and that you ran from the repo root.

- [ ] **Step 7: Visually verify the hero still renders (Playwright)**

Run the existing harness pattern: set the preview cookie, navigate home, screenshot the hero at mobile (390) and desktop (1280). Use `/tmp/bfc-qa/` (NODE_PATH=/tmp/node_modules, Chromium under `ms-playwright`). A quick inline probe:
```bash
cd /tmp/bfc-qa && NODE_PATH=/tmp/node_modules node --input-type=module -e '
import pkg from "/tmp/node_modules/playwright-core/index.js"; const { chromium, devices } = pkg;
const exe = process.env.HOME + "/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const S = "https://d9v1pv-06.myshopify.com";
const b = await chromium.launch({ executablePath: exe });
for (const [n,d] of [["m",devices["Pixel 7"]],["d",{viewport:{width:1280,height:900}}]]) {
  const c = await b.newContext(d); const p = await c.newPage();
  await p.goto(`${S}/?preview_theme_id=151032561833`,{waitUntil:"domcontentloaded"});
  await p.goto(`${S}/`,{waitUntil:"load",timeout:60000});
  await p.waitForTimeout(2000);
  const lcp = await p.evaluate(()=>{const i=document.querySelector(".bfc-hero__photo");return i?{src:i.currentSrc||i.src,w:i.naturalWidth,shown:i.getBoundingClientRect().width}:null;});
  console.log(n, JSON.stringify(lcp));
  await p.screenshot({ path:`/tmp/bfc-qa/hero_${n}.png` }); await c.close();
}
await b.close();'
```
Expected: logged `src` ends in `hero-powder.webp`, `naturalWidth` 1280, and `hero_m.png`/`hero_d.png` show the hero photo + logo + tagline rendering normally (not blank, not broken-image).

- [ ] **Step 8: Re-measure LCP/weight against the draft**

Run the perf probe (it measures the draft via the preview cookie):
```bash
cd /tmp/bfc-qa && NODE_PATH=/tmp/node_modules node perf_probe.mjs 2>/dev/null | sed -n '/HOME/,/PRODUCT/p'
```
Expected: under the `[DRAFT]` HOME line, image bytes drop versus the prior baseline and the largest-resources list no longer shows `hero-powder.jpg` (198 KB) or `logo-web4.png` (111 KB); they're replaced by the smaller `.webp` files. Record the new LCP/weight numbers for the user.

- [ ] **Step 9: Commit**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
git add theme/assets/hero-powder.webp theme/assets/logo-web4.webp theme/sections/bfc-hero.liquid
git commit -m "perf(hero): serve hero photo + logo as right-sized WebP (LCP fix)

Hero photo 198KB JPG -> WebP; logo 1366x768 111KB PNG -> 800px WebP.
Both were asset_url (un-CDN-resizable); fixed at source. Targets the
clean Lighthouse run's image-delivery insight (-679KiB / -950ms LCP).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Bundle-card images → right-sized WebP

The four bundle cards render via the `image_asset` asset_url fallback (`bundles.liquid:38`, filenames in `templates/index.json:1174-1204`) at 800×800 but display at ~352×352. Resize to 700px (covers 2× at the largest grid cell) and convert to WebP.

**Files:**
- Create: `theme/assets/bundle-inflammation-relief.webp`, `bundle-immune-defense.webp`, `bundle-fitness-essentials.webp`, `bundle-relaxation-support.webp`
- Modify: `theme/templates/index.json:1174,1184,1194,1204` (the four `image_asset` values)
- Modify: `theme/sections/bundles.liquid:228` (schema `info` hint) and `:38` (fallback `<img>` intrinsic dims)
- Verify with: `/tmp/bfc-qa/perf_probe.mjs`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: four `.webp` bundle assets referenced by `index.json`. No later task depends on this.

- [ ] **Step 1: Resize + convert all four bundle images**

Run:
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
for n in inflammation-relief immune-defense fitness-essentials relaxation-support; do
  sips -Z 700 "theme/assets/bundle-$n.jpg" --out "/tmp/bundle-$n-700.jpg"
  cwebp -q 80 "/tmp/bundle-$n-700.jpg" -o "theme/assets/bundle-$n.webp"
done
ls -la theme/assets/bundle-*.webp
```
Expected: four new `.webp` files, each roughly **25–45 KB** (down from ~140 KB).

- [ ] **Step 2: Repoint the four `image_asset` values in `index.json`**

Edit `theme/templates/index.json`. Change each of these four values from `.jpg` to `.webp`:
- line 1174: `"image_asset": "bundle-inflammation-relief.jpg"` → `"bundle-inflammation-relief.webp"`
- line 1184: `"image_asset": "bundle-immune-defense.jpg"` → `"bundle-immune-defense.webp"`
- line 1194: `"image_asset": "bundle-fitness-essentials.jpg"` → `"bundle-fitness-essentials.webp"`
- line 1204: `"image_asset": "bundle-relaxation-support.jpg"` → `"bundle-relaxation-support.webp"`

- [ ] **Step 3: Update the fallback dims + schema hint in `bundles.liquid`**

Edit `theme/sections/bundles.liquid`. On line 38 the intrinsic dims are already `width="600" height="600"` (square) — the resized 700×700 is still square, so **no dim change needed**; leave line 38's attributes as-is. Update only the schema `info` on line 228 from:
```liquid
        { "type": "text", "id": "image_asset", "label": "Image (theme asset filename)", "info": "Fallback when no image is picked above, e.g. bundle-immune-defense.jpg" },
```
to:
```liquid
        { "type": "text", "id": "image_asset", "label": "Image (theme asset filename)", "info": "Fallback when no image is picked above, e.g. bundle-immune-defense.webp" },
```

- [ ] **Step 4: Validate the edited Liquid (Dev MCP)**

`validate_theme` with the absolute theme path and file `sections/bundles.liquid` (reuse the `artifactId` from Task 1's validation, bump `revision`). Expected: no errors on `bundles.liquid`. (`index.json` is template JSON — not Liquid-validated; the push will surface any JSON error.)

- [ ] **Step 5: Push assets + section + template to the DRAFT, pull back, verify**

The `image_asset` setting already exists server-side (no new setting/type), so a single push is safe here. Run:
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete \
  --only assets/bundle-inflammation-relief.webp --only assets/bundle-immune-defense.webp \
  --only assets/bundle-fitness-essentials.webp --only assets/bundle-relaxation-support.webp \
  --only sections/bundles.liquid --only templates/index.json
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com \
  --theme 151032561833 --only templates/index.json
grep -c "bundle-.*\.webp" /tmp/bfc-verify/templates/index.json
```
Expected: the grep prints `4` (all four refs converted server-side). If `0`, the push no-oped — re-check `--path`/repo-root.

- [ ] **Step 6: Visually verify the bundle grid (Playwright)**

Bundle cards are below the fold and `loading="lazy"` — scroll before screenshotting or they render blank.
```bash
cd /tmp/bfc-qa && NODE_PATH=/tmp/node_modules node --input-type=module -e '
import pkg from "/tmp/node_modules/playwright-core/index.js"; const { chromium, devices } = pkg;
const exe = process.env.HOME + "/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const S = "https://d9v1pv-06.myshopify.com";
const b = await chromium.launch({ executablePath: exe }); const c = await b.newContext({...devices["Pixel 7"]}); const p = await c.newPage();
await p.goto(`${S}/?preview_theme_id=151032561833`,{waitUntil:"domcontentloaded"});
await p.goto(`${S}/`,{waitUntil:"load",timeout:60000});
await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,140));}});
const imgs = await p.evaluate(()=>[...document.querySelectorAll(".bfc-bundle-card__media img")].map(i=>({src:(i.currentSrc||i.src).split("/").pop().split("?")[0],w:i.naturalWidth})));
console.log(JSON.stringify(imgs,null,1));
const sec = await p.$("#bundles"); if(sec){await sec.scrollIntoViewIfNeeded(); await p.waitForTimeout(500); await sec.screenshot({path:"/tmp/bfc-qa/bundles.png"});}
await b.close();'
```
Expected: each logged `src` ends in `.webp` with `naturalWidth` 700, and `bundles.png` shows all four framed cards with photos (not blank/broken).

- [ ] **Step 7: Commit**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
git add theme/assets/bundle-*.webp theme/templates/index.json theme/sections/bundles.liquid
git commit -m "perf(bundles): serve bundle-card images as 700px WebP

Four bundle photos were 800x800 ~140KB JPG via asset_url, displayed
~352px. Resized to 700px + WebP (~30KB each). Part of the clean
Lighthouse run's -679KiB image-delivery insight.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Accessibility quick-wins we own

The clean run scored A11y 91. Most remaining failures are **app-owned** (Judge.me `link-name` ×9; Instafeed `label-content-name-mismatch`) or **content/admin** (a `Untitled_design…` content image missing `alt`, set in the page editor) or **Horizon core** (the "More" overflow button `aria-allowed-role`). The only item in our `bfc-*` code is `identical-links-same-purpose` on the "OUR STORY" link, which appears both as the hero's secondary CTA and in the footer pointing to the same destination with the same text.

**Files:**
- Modify: `theme/sections/bfc-hero.liquid:46-48` (give the secondary CTA a disambiguating `aria-label`)
- Verify with: Playwright (accessible-name read) + the user's next Lighthouse run

**Interfaces:**
- Consumes: nothing.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Add a disambiguating `aria-label` to the hero "Our Story" CTA**

Lighthouse flags two links with identical text/purpose. The fix is to give the hero instance a more specific accessible name while keeping the visible text. Edit `theme/sections/bfc-hero.liquid`, changing the secondary CTA (lines 46–48) from:
```liquid
    <a class="bfc-btn bfc-btn--light" href="{{ section.settings.cta2_link | default: '#manifesto' }}">
      <span class="hand">&#9758;</span> {{ section.settings.cta2_label | escape }}
    </a>
```
to:
```liquid
    <a class="bfc-btn bfc-btn--light" href="{{ section.settings.cta2_link | default: '#manifesto' }}"
       aria-label="{{ section.settings.cta2_label | escape }} — jump to our story">
      <span class="hand">&#9758;</span> {{ section.settings.cta2_label | escape }}
    </a>
```

- [ ] **Step 2: Validate, push, pull back**

`validate_theme` for `sections/bfc-hero.liquid` (reuse artifactId, bump revision). Then:
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 \
  --nodelete --only sections/bfc-hero.liquid
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com \
  --theme 151032561833 --only sections/bfc-hero.liquid
grep -c "jump to our story" /tmp/bfc-verify/sections/bfc-hero.liquid
```
Expected: grep prints `1`.

- [ ] **Step 3: Verify the accessible name (Playwright)**

```bash
cd /tmp/bfc-qa && NODE_PATH=/tmp/node_modules node --input-type=module -e '
import pkg from "/tmp/node_modules/playwright-core/index.js"; const { chromium } = pkg;
const exe = process.env.HOME + "/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const S="https://d9v1pv-06.myshopify.com"; const b=await chromium.launch({executablePath:exe}); const c=await b.newContext(); const p=await c.newPage();
await p.goto(`${S}/?preview_theme_id=151032561833`,{waitUntil:"domcontentloaded"});
await p.goto(`${S}/`,{waitUntil:"load",timeout:60000});
console.log(await p.evaluate(()=>document.querySelector(".bfc-hero__cta .bfc-btn--light")?.getAttribute("aria-label")));
await b.close();'
```
Expected: prints `Our Story — jump to our story` (or the configured label). The hero and footer links now have distinct accessible names.

- [ ] **Step 4: Commit**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
git add theme/sections/bfc-hero.liquid
git commit -m "a11y(hero): disambiguate Our Story CTA accessible name

Adds aria-label so the hero CTA and the footer 'Our Story' link no
longer trip Lighthouse identical-links-same-purpose.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Deferred / not in this plan (owner ≠ our theme code)

Surfaced by the clean run but **not actionable as `bfc-*` theme edits** — flag to the user, don't fix here:

1. **Product/collection-card images (832×832 shown 310×310).** These are Horizon's core product card, not our snippet. The lever is a Horizon image-size setting / core `product-card`; editing core sections is against the repo's "purely additive" rule. → Hand to user as an admin/theme-setting decision.
2. **Third-party JS — GTM ~506 KB (loaded 3×) + Facebook ~152 KB, ~293 KiB unused.** Marketing tags injected via `content_for_header`/admin apps, not theme code. → Business decision (consolidate GTM containers, audit Pixel) made in admin, not here.
3. **A11y app failures — Judge.me carousel `link-name` (×9), Instafeed `label-content-name-mismatch`.** Owned by the installed apps. → Configure within the apps, or accept.
4. **Content `alt` text — the `Untitled_design…` image missing `alt`.** Set in the page/section content in admin, not in `bfc-*` markup. → User adds alt text in the editor.
5. **Best Practices 77 — favicon 404, `window.__chromium_devtools_metrics_reporter` console error (Shopify `wpm.js`/`shop-js`), Attribution-Reporting deprecation.** Platform/Shopify-owned. → Only the favicon 404 is plausibly ours (admin → upload a favicon).

---

## Self-Review

- **Spec coverage:** LCP/hero (Task 1) ✅; logo (Task 1) ✅; bundle images (Task 2) ✅; identical-links a11y (Task 3) ✅; product-card images, third-party JS, app a11y, content alt, BP items → explicitly deferred with owner ✅. Every clean-run finding is either a task or a labeled deferral.
- **Placeholder scan:** no TBD/TODO; every code step shows exact before/after and exact commands with expected output.
- **Consistency:** asset filenames (`hero-powder.webp`, `logo-web4.webp`, `bundle-<n>.webp`) are identical between the create step, the Liquid/JSON edit, the push `--only` list, and the verify grep in each task. Line numbers cited match the files read on 2026-06-18.
- **Tooling risk:** Task 1 Step 1 gates on `cwebp` and stops for the user if `brew` is unavailable — the one external dependency is surfaced first, not mid-plan.
