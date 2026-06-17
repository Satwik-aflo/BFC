# Theme Performance & A11y Audit Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the P1 (performance) and P2 (a11y/SEO) fixes from the 2026-06-17 independent theme audit — WOFF2 fonts, a responsive hero image, a homepage `<h1>`, and three a11y/CLS micro-fixes — on the **draft** theme only.

**Architecture:** Purely additive edits to **our** theme files (`snippets/brand.liquid`, `sections/bfc-hero.liquid`, plus three older custom sections). No Horizon core files are touched. Each change is verified by the project's established gate (Dev MCP `validate_theme` → `shopify theme check` → surgical push to draft → pull-back grep → headless-Chromium/Playwright probe), then committed.

**Tech Stack:** Shopify Horizon 3.5.1 (Liquid), Shopify CLI, `fonttools`+`brotli` (font conversion), macOS `sips` (image recompress), Playwright + `playwright-core` headless Chromium.

---

## ⚠️ Read first — non-negotiable constraints (from CLAUDE.md)

- **NEVER push or publish to the LIVE theme `#147961872553`.** All work targets **DRAFT `#151032561833`** on store **`d9v1pv-06.myshopify.com`**.
- **Always pass `--path theme`** to every CLI command, and **verify every push by pulling back** (the success banner lies).
- **There is no unit-test suite.** For this theme, "the test" = the verification gate in each task (`validate_theme`, `shopify theme check`, pull-back grep, and a Playwright computed-style/network/screenshot probe). A green validator + a successful push is **not** proof — the Playwright/visual check is the real gate.
- **Scope discipline.** Do ONLY the tasks below. Do **not** edit `snippets/scripts.liquid` (Horizon core), chase the `!important` count, rewrite the announcement JS, add `t:` i18n keys, touch `en.default.schema.json`, or "fix" the 5 Instafeed/Judge.me app-block theme-check errors (false positives — the apps are installed on the shop).

## File Structure (everything this plan touches)

- `theme/assets/*.woff2` — **Create** 9 new WOFF2 font files (converted from the existing `.otf`/`.ttf`).
- `theme/assets/hero-powder.jpg` — **Modify** (recompress in place; reversible via git).
- `theme/snippets/brand.liquid` — **Modify** the 12 `@font-face` `src:` lines (WOFF2-first, `.otf`/`.ttf` fallback retained).
- `theme/sections/bfc-hero.liquid` — **Modify** hero `<img>` → responsive `image_tag`; add a visually-hidden `<h1>` + one schema setting + one CSS rule.
- `theme/sections/boringly-clean-pure.liquid` — **Modify** two `<img>` → `image_tag` (adds `width`/`height`; fixes the 2 `ImgWidthAndHeight` theme-check errors).
- `theme/sections/gg-newsletter.liquid` — **Modify** email input: add `aria-label`.
- `theme/sections/icon-highlight-bar.liquid` — **Modify** decorative separator: `aria-hidden` + empty `alt`.
- QA scripts (Create in `/tmp/bfc-qa/`): `convert_fonts.py`, `font_bytes.mjs`, `hero_img.mjs`, `a11y_probe.mjs`.

## Shared reference (paste into commands as needed)

```
STORE=d9v1pv-06.myshopify.com
DRAFT=151032561833
THEME_ABS=/Users/saimeda/Documents/Codex/medas/BFC/theme
CHROME="$HOME/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
export NODE_PATH=/tmp/node_modules
PREVIEW="https://d9v1pv-06.myshopify.com/?preview_theme_id=151032561833"
```

Dev MCP validation needs a fresh `conversationId` **per session**: call `learn_shopify_api(api: "liquid")` once at the start of execution and reuse the returned id for every `validate_theme` call. Use a stable `artifactId` per file and bump `revision` on retries.

---

### Task 0: Branch setup

**Files:** none (git only)

- [ ] **Step 1: Create a clean branch off main**

The audit fixes are independent of the unmerged `fix/home-mobile-polish` work, so branch off `main` for a self-contained, reviewable unit. Do **not** stage the pre-existing `M CLAUDE.md` or untracked docs/diffs.

Run:
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
git stash push -u -- CLAUDE.md 2>/dev/null || true   # park unrelated CLAUDE.md edit if present
git checkout main && git pull --ff-only
git checkout -b fix/theme-perf-a11y
```
Expected: now on `fix/theme-perf-a11y`, clean working tree (aside from untracked audit/docs files which we leave alone).

- [ ] **Step 2: Confirm QA harness is present**

Run:
```bash
ls "$HOME/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/" >/dev/null && ls /tmp/node_modules/playwright-core >/dev/null && echo "QA harness OK" || echo "MISSING — see CLAUDE.md QA section"
mkdir -p /tmp/bfc-qa
```
Expected: `QA harness OK`. If missing, stop and restore the harness before continuing (the Playwright gates depend on it).

---

### Task 1: Convert brand fonts to WOFF2 (~722 KB → ~360–400 KB, every page)

**Files:**
- Create: `theme/assets/AesthetNova-Black.woff2`, `AesthetNova-Light.woff2`, `AesthetNova-Medium.woff2`, `Copperplate-Heavy.woff2`, `Copperplate-Light.woff2`, `Copperplate-Regular.woff2`, `Flagflies.woff2`, `MexicanaHollow.woff2`, `Musloner.woff2`
- Modify: `theme/snippets/brand.liquid` (12 `@font-face` `src:` lines)
- Create (QA): `/tmp/bfc-qa/convert_fonts.py`, `/tmp/bfc-qa/font_bytes.mjs`

- [ ] **Step 1: Write the conversion script**

Create `/tmp/bfc-qa/convert_fonts.py`:
```python
from fontTools.ttLib import TTFont
import os

SRC = "/Users/saimeda/Documents/Codex/medas/BFC/theme/assets"
FONTS = [
    "AesthetNova-Black.otf", "AesthetNova-Light.otf", "AesthetNova-Medium.otf",
    "Copperplate-Heavy.otf", "Copperplate-Light.otf", "Copperplate-Regular.otf",
    "Flagflies.ttf", "MexicanaHollow.ttf", "Musloner.otf",
]
before = after = 0
for fn in FONTS:
    src = os.path.join(SRC, fn)
    f = TTFont(src)
    f.flavor = "woff2"
    out = os.path.join(SRC, os.path.splitext(fn)[0] + ".woff2")
    f.save(out)
    b, a = os.path.getsize(src), os.path.getsize(out)
    before += b; after += a
    print(f"{fn:28s} {b:>7d} -> {a:>7d}  ({100*a//b}%)")
print(f"TOTAL {before} -> {after} bytes ({100*after//before}% of original)")
```

- [ ] **Step 2: Run the conversion in an isolated venv (avoids PEP 668)**

Run:
```bash
python3 -m venv /tmp/bfc-qa/fontvenv
/tmp/bfc-qa/fontvenv/bin/pip install -q fonttools brotli
/tmp/bfc-qa/fontvenv/bin/python /tmp/bfc-qa/convert_fonts.py
```
Expected: 9 lines each well under 100% (typically ~45–60%), and a `TOTAL ... (~50% of original)` line. The 9 `.woff2` files now exist in `theme/assets/`.

- [ ] **Step 3: Verify the new files exist and are smaller**

Run:
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC/theme
ls -lhS assets/*.woff2
stat -f '%z' assets/*.woff2 | awk '{s+=$1} END {print "WOFF2 total: " s " bytes = " s/1024 " KB"}'
```
Expected: 9 `.woff2` files; total roughly **360–400 KB** (down from 722 KB of OTF/TTF).

- [ ] **Step 4: Point each `@font-face` at WOFF2 first (keep OTF/TTF as fallback)**

In `theme/snippets/brand.liquid`, apply these **9 edits** (use replace-all; some `src:` lines repeat). For each, the pattern is: WOFF2 first, original as fallback.

`.otf` families (`format("woff2")` + `format("opentype")`):
- `src: url({{ 'AesthetNova-Light.otf' | asset_url }}) format("opentype");` → `src: url({{ 'AesthetNova-Light.woff2' | asset_url }}) format("woff2"), url({{ 'AesthetNova-Light.otf' | asset_url }}) format("opentype");`
- `src: url({{ 'AesthetNova-Medium.otf' | asset_url }}) format("opentype");` → `src: url({{ 'AesthetNova-Medium.woff2' | asset_url }}) format("woff2"), url({{ 'AesthetNova-Medium.otf' | asset_url }}) format("opentype");`
- `src: url({{ 'AesthetNova-Black.otf' | asset_url }}) format("opentype");` → `src: url({{ 'AesthetNova-Black.woff2' | asset_url }}) format("woff2"), url({{ 'AesthetNova-Black.otf' | asset_url }}) format("opentype");`
- `src: url({{ 'Copperplate-Light.otf' | asset_url }}) format("opentype");` → `src: url({{ 'Copperplate-Light.woff2' | asset_url }}) format("woff2"), url({{ 'Copperplate-Light.otf' | asset_url }}) format("opentype");`
- `src: url({{ 'Copperplate-Regular.otf' | asset_url }}) format("opentype");` → `src: url({{ 'Copperplate-Regular.woff2' | asset_url }}) format("woff2"), url({{ 'Copperplate-Regular.otf' | asset_url }}) format("opentype");`
- `src: url({{ 'Copperplate-Heavy.otf' | asset_url }}) format("opentype");` → `src: url({{ 'Copperplate-Heavy.woff2' | asset_url }}) format("woff2"), url({{ 'Copperplate-Heavy.otf' | asset_url }}) format("opentype");`
- `src: url({{ 'Musloner.otf' | asset_url }}) format("opentype");` → `src: url({{ 'Musloner.woff2' | asset_url }}) format("woff2"), url({{ 'Musloner.otf' | asset_url }}) format("opentype");`

`.ttf` families (`format("woff2")` + `format("truetype")`):
- `src: url({{ 'Flagflies.ttf' | asset_url }}) format("truetype");` → `src: url({{ 'Flagflies.woff2' | asset_url }}) format("woff2"), url({{ 'Flagflies.ttf' | asset_url }}) format("truetype");`
- `src: url({{ 'MexicanaHollow.ttf' | asset_url }}) format("truetype");` → `src: url({{ 'MexicanaHollow.woff2' | asset_url }}) format("woff2"), url({{ 'MexicanaHollow.ttf' | asset_url }}) format("truetype");`

- [ ] **Step 5: Validate `brand.liquid` (Dev MCP)**

Call `validate_theme` with `absoluteThemePath=/Users/saimeda/Documents/Codex/medas/BFC/theme`, the session `conversationId`, and `filesCreatedOrUpdated=[{path:"snippets/brand.liquid", artifactId:"brand-woff2", revision:1}]`.
Expected: VALID. Fix and re-validate (bump `revision`) if not.

- [ ] **Step 6: Push assets + snippet to the draft (assets first, in one push is fine since `asset_url` resolves at render)**

Run:
```bash
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete \
  --only assets/AesthetNova-Black.woff2 --only assets/AesthetNova-Light.woff2 --only assets/AesthetNova-Medium.woff2 \
  --only assets/Copperplate-Heavy.woff2 --only assets/Copperplate-Light.woff2 --only assets/Copperplate-Regular.woff2 \
  --only assets/Flagflies.woff2 --only assets/MexicanaHollow.woff2 --only assets/Musloner.woff2 \
  --only snippets/brand.liquid
```
Expected: "pushed" banner (do not trust it — verify next).

- [ ] **Step 7: Verify the push by pulling back**

Run:
```bash
mkdir -p /tmp/bfc-verify
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com --theme 151032561833 --only snippets/brand.liquid
grep -c "format(\"woff2\")" /tmp/bfc-verify/snippets/brand.liquid
```
Expected: `9` (one WOFF2 src per physical font). If `0`, the push silently no-opped — re-check `--path theme` and retry.

- [ ] **Step 8: Verify in-browser that WOFF2 is served and OTF/TTF is not (the real gate)**

Create `/tmp/bfc-qa/font_bytes.mjs`:
```js
import { chromium } from 'playwright-core';
const EXEC = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const URL = 'https://d9v1pv-06.myshopify.com/?preview_theme_id=151032561833&_cb=' + Date.now();
const b = await chromium.launch({ executablePath: EXEC, headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const fonts = [];
p.on('response', (r) => {
  const u = r.url();
  if (/\.(woff2|otf|ttf)(\?|$)/i.test(u)) {
    const len = parseInt((r.headers()['content-length'] || '0'), 10);
    fonts.push({ file: u.split('/').pop().split('?')[0], status: r.status(), bytes: len });
  }
});
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(3000);
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } });
await p.waitForTimeout(1500);
const woff2 = fonts.filter(f => /\.woff2$/i.test(f.file));
const legacy = fonts.filter(f => /\.(otf|ttf)$/i.test(f.file));
console.table(fonts);
console.log('WOFF2 fetched:', woff2.length, 'total', woff2.reduce((s, f) => s + f.bytes, 0), 'bytes');
console.log('Legacy OTF/TTF fetched (must be 0):', legacy.length);
await b.close();
```
Run: `node /tmp/bfc-qa/font_bytes.mjs`
Expected: every fetched brand font ends in `.woff2`; **Legacy OTF/TTF fetched: 0**. (If any `.otf`/`.ttf` is fetched, a `src` line was missed — fix in `brand.liquid`, re-push, re-verify.)

- [ ] **Step 9: Commit**

```bash
git add theme/assets/*.woff2 theme/snippets/brand.liquid
git commit -m "perf(fonts): serve brand fonts as WOFF2 (~722KB→~380KB), keep OTF/TTF fallback

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Responsive hero image + compressed fallback + visually-hidden `<h1>`

**Files:**
- Modify: `theme/sections/bfc-hero.liquid` (markup lines ~14–20, add `<h1>` after the logo block ~37, add CSS rule in `{% stylesheet %}`, add one schema setting)
- Modify: `theme/assets/hero-powder.jpg` (recompress in place)
- Create (QA): `/tmp/bfc-qa/hero_img.mjs`

- [ ] **Step 1: Replace the hero `<img>` with a responsive `image_tag` (CDN path) and prioritize the fallback**

In `theme/sections/bfc-hero.liquid`, replace this block:
```liquid
    {%- if section.settings.image -%}
      <img class="bfc-hero__photo" src="{{ section.settings.image | image_url: width: 2400 }}"
           alt="" loading="eager" width="2400" height="1350">
    {%- else -%}
      <img class="bfc-hero__photo" src="{{ 'hero-powder.jpg' | asset_url }}"
           alt="" loading="eager" width="2400" height="1350">
    {%- endif -%}
```
with:
```liquid
    {%- if section.settings.image -%}
      {{ section.settings.image | image_url: width: 3000 | image_tag:
         class: 'bfc-hero__photo', alt: '', loading: 'eager', preload: true,
         widths: '600, 900, 1200, 1600, 2000, 2400, 3000', sizes: '100vw' }}
    {%- else -%}
      <img class="bfc-hero__photo" src="{{ 'hero-powder.jpg' | asset_url }}"
           alt="" loading="eager" fetchpriority="high" width="2400" height="1350">
    {%- endif -%}
```
Notes: `image_tag` auto-emits `width`/`height` (from the 3000px variant's true ratio) and builds `srcset` from `widths`; `preload: true` is Shopify's LCP resource-hint mechanism. The asset fallback can't be CDN-resized, so it keeps `loading="eager" fetchpriority="high"` and is compressed in Step 4.

- [ ] **Step 2: Add a schema setting for the accessible heading**

In the `{% schema %}` `settings` array, immediately after the `logo` `image_picker` object (`{ "type": "image_picker", "id": "logo", ... }`), insert:
```json
    { "type": "text", "id": "heading", "label": "Accessible page heading (visually hidden)", "info": "Hidden <h1> for SEO and screen readers. Defaults to the shop name.", "default": "" },
```
(Ensure the preceding object still ends with a comma and the JSON stays valid.)

- [ ] **Step 3: Add the visually-hidden `<h1>` markup**

Immediately **after** the logo `{%- if section.settings.logo -%}...{%- endif -%}` block and **before** the `<p class="bfc-hero__tag split-lines">` line, insert:
```liquid
  <h1 class="bfc-hero__h1">{{ section.settings.heading | default: shop.name | escape }}</h1>
```

- [ ] **Step 4: Add the visually-hidden CSS rule**

Inside the `{% stylesheet %}` block (anywhere among the `.bfc-hero*` rules), add:
```css
  .bfc-hero__h1 { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0; }
```

- [ ] **Step 5: Back up and recompress the fallback hero image**

Run:
```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
cp theme/assets/hero-powder.jpg /tmp/bfc-qa/hero-powder-original.jpg   # also recoverable via git
sips -Z 2200 -s formatOptions 66 theme/assets/hero-powder.jpg --out theme/assets/hero-powder.jpg >/dev/null
ls -lh theme/assets/hero-powder.jpg
```
Expected: file size drops from ~1.2 MB to **under ~400 KB** (likely ~200–350 KB). If still >400 KB, re-run with `-Z 2000 -s formatOptions 60`. Visual acceptability is checked in Step 8 (it sits behind a dark scrim).

- [ ] **Step 6: Validate (Dev MCP)**

`validate_theme` with `filesCreatedOrUpdated=[{path:"sections/bfc-hero.liquid", artifactId:"bfc-hero-resp", revision:1}]`.
Expected: VALID. Fix + re-validate (bump revision) if the `image_tag`/JSON is off.

- [ ] **Step 7: Push and verify pull-back**

```bash
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete \
  --only sections/bfc-hero.liquid --only assets/hero-powder.jpg
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com --theme 151032561833 --only sections/bfc-hero.liquid
grep -c "bfc-hero__h1" /tmp/bfc-verify/sections/bfc-hero.liquid    # expect >=2 (markup + css)
grep -c "image_tag" /tmp/bfc-verify/sections/bfc-hero.liquid       # expect >=1
```
Expected: counts ≥ shown. New `heading` setting only has a default and isn't referenced by template JSON, so a single section push is sufficient (no two-push needed).

- [ ] **Step 8: Verify responsive behavior + h1 + visual parity (the real gate)**

Create `/tmp/bfc-qa/hero_img.mjs`:
```js
import { chromium } from 'playwright-core';
const EXEC = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const URL = 'https://d9v1pv-06.myshopify.com/?preview_theme_id=151032561833&_cb=' + Date.now();
const b = await chromium.launch({ executablePath: EXEC, headless: true });
async function probe(w, h, mobile, label) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(2500);
  const info = await p.evaluate(() => {
    const img = document.querySelector('.bfc-hero__photo');
    return {
      currentSrc: img && img.currentSrc, naturalWidth: img && img.naturalWidth,
      hasSrcset: !!(img && img.getAttribute('srcset')), loading: img && img.getAttribute('loading'),
      h1count: document.querySelectorAll('h1').length,
      h1text: [...document.querySelectorAll('h1')].map(e => e.textContent.trim()),
    };
  });
  console.log(`--- ${label} ---`, JSON.stringify(info, null, 2));
  await p.screenshot({ path: `/tmp/bfc-qa/hero_${label}.png` });
  await ctx.close();
}
await probe(390, 844, true, 'mobile');
await probe(1280, 900, false, 'desktop');
await b.close();
```
Run: `node /tmp/bfc-qa/hero_img.mjs`
Expected:
- `h1count` is **exactly 1** in both viewports (text = shop name). **If >1**, another homepage section already emits an `<h1>` — switch the hero `<h1>` to a `<p>`/remove it and report; do not ship two h1s.
- When `section.settings.image` is set: `hasSrcset: true` and the **mobile `currentSrc` resolves a smaller `width=` than desktop**. (If no merchant image is set, the fallback renders — confirm `hero_mobile.png`/`hero_desktop.png` look correct and note that responsiveness applies once an image is set in the editor.)
- Eyeball `/tmp/bfc-qa/hero_mobile.png` and `hero_desktop.png`: hero reads the same as before (logo, tagline, CTAs, scrim) — the recompressed fallback shows no obvious artifacts behind the scrim.

- [ ] **Step 9: Commit**

```bash
git add theme/sections/bfc-hero.liquid theme/assets/hero-powder.jpg
git commit -m "perf+a11y(hero): responsive image_tag with preload, compress fallback, add visually-hidden h1

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: A11y + CLS micro-fixes (newsletter label, decorative separator, image dimensions)

**Files:**
- Modify: `theme/sections/gg-newsletter.liquid` (email input)
- Modify: `theme/sections/icon-highlight-bar.liquid` (separator)
- Modify: `theme/sections/boringly-clean-pure.liquid` (two imgs → `image_tag`)
- Create (QA): `/tmp/bfc-qa/a11y_probe.mjs`

- [ ] **Step 1: Give the newsletter email input an accessible name**

In `theme/sections/gg-newsletter.liquid`, replace:
```liquid
        <input
          type="email"
          name="contact[email]"
          placeholder="{{ section.settings.placeholder }}"
          required
        >
```
with:
```liquid
        <input
          type="email"
          name="contact[email]"
          aria-label="{{ section.settings.placeholder | default: 'Email' | escape }}"
          placeholder="{{ section.settings.placeholder }}"
          required
        >
```

- [ ] **Step 2: Mark the decorative separator as decorative**

In `theme/sections/icon-highlight-bar.liquid`, replace:
```liquid
        {% unless forloop.last %}
          <div class="icon-strip__separator">
            {% if section.settings.separator_image %}
              {{ section.settings.separator_image
                | image_url: width: 40
                | image_tag: alt: section.settings.separator_alt, loading: 'lazy'
              }}
```
with:
```liquid
        {% unless forloop.last %}
          <div class="icon-strip__separator" aria-hidden="true">
            {% if section.settings.separator_image %}
              {{ section.settings.separator_image
                | image_url: width: 40
                | image_tag: alt: '', loading: 'lazy'
              }}
```
(`aria-hidden` on the wrapper removes both the image and the `✦` fallback span from the a11y tree; empty `alt` is the correct decorative treatment. The now-unused `separator_alt` setting can stay — harmless.)

- [ ] **Step 3: Add intrinsic dimensions to the two `boringly-clean-pure` images (fixes 2 theme-check errors + CLS)**

In `theme/sections/boringly-clean-pure.liquid`, replace the main image:
```liquid
            <img
              src="{{ section.settings.main_image | image_url: width: 800 }}"
              alt="{{ section.settings.main_image.alt | escape }}"
              loading="lazy"
            >
```
with:
```liquid
            {{ section.settings.main_image | image_url: width: 800 | image_tag: alt: section.settings.main_image.alt, loading: 'lazy' }}
```
and the blob background image:
```liquid
            <img 
              src="{{ section.settings.blob_image | image_url: width: 1000 }}" 
              class="bc-section__blob-bg" 
              alt="" 
              loading="lazy">
```
with:
```liquid
            {{ section.settings.blob_image | image_url: width: 1000 | image_tag: class: 'bc-section__blob-bg', alt: '', loading: 'lazy' }}
```
(Both render inside CSS-forced `object-fit` boxes — `.bc-section__image img { width:100%; height:100% }` and `.bc-section__blob-bg { width:100%; height:100% }` — so `image_tag`'s added `width`/`height` attributes set the aspect ratio without distorting layout.)

- [ ] **Step 4: Validate all three (Dev MCP)**

`validate_theme` with `filesCreatedOrUpdated` listing `sections/gg-newsletter.liquid` (artifactId `gg-news-a11y`), `sections/icon-highlight-bar.liquid` (`icon-sep-a11y`), `sections/boringly-clean-pure.liquid` (`bc-img-dims`), each revision 1.
Expected: all VALID.

- [ ] **Step 5: Theme-check that the 2 `ImgWidthAndHeight` errors are gone**

Run:
```bash
shopify theme check --path theme 2>&1 | grep -c "ImgWidthAndHeight"
```
Expected: `0` (was 2). The 5 `JSONMissingBlock` app-block errors and the 1 `HardcodedRoutes` warning remain — both are out of scope (false positives / dead code).

- [ ] **Step 6: Push and verify pull-back**

```bash
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete \
  --only sections/gg-newsletter.liquid --only sections/icon-highlight-bar.liquid --only sections/boringly-clean-pure.liquid
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com --theme 151032561833 \
  --only sections/gg-newsletter.liquid --only sections/icon-highlight-bar.liquid
grep -c 'aria-label' /tmp/bfc-verify/sections/gg-newsletter.liquid       # expect >=1
grep -c 'aria-hidden="true"' /tmp/bfc-verify/sections/icon-highlight-bar.liquid  # expect >=1
```
Expected: both counts ≥1.

- [ ] **Step 7: Verify h1 + newsletter label in-browser (the real gate)**

Create `/tmp/bfc-qa/a11y_probe.mjs`:
```js
import { chromium } from 'playwright-core';
const EXEC = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const BASE = 'https://d9v1pv-06.myshopify.com';
const PV = 'preview_theme_id=151032561833';
const b = await chromium.launch({ executablePath: EXEC, headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
await p.goto(`${BASE}/?${PV}`, { waitUntil: 'domcontentloaded' });   // set preview cookie
await p.waitForTimeout(1500);
await p.goto(`${BASE}/?${PV}&_cb=${Date.now()}`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);
console.log('HOME h1:', await p.evaluate(() => ({ count: document.querySelectorAll('h1').length, text: [...document.querySelectorAll('h1')].map(h => h.textContent.trim()) })));
// Newsletter lives on the blog template — adjust the blog handle if needed.
await p.goto(`${BASE}/blogs/news?${PV}&_cb=${Date.now()}`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);
console.log('NEWSLETTER email:', await p.evaluate(() => { const i = document.querySelector('.gg-newsletter__field input[type=email]'); return i ? { ariaLabel: i.getAttribute('aria-label') } : 'no gg-newsletter on this URL — try the correct blog handle'; }));
await b.close();
```
Run: `node /tmp/bfc-qa/a11y_probe.mjs`
Expected: HOME h1 `count: 1`; NEWSLETTER email `ariaLabel` is non-null (e.g. "Email"). If the blog URL has no newsletter, find the blog handle via `shopify theme ...` or the admin and re-run; the pull-back grep in Step 6 already confirms the markup landed.

- [ ] **Step 8: Commit**

```bash
git add theme/sections/gg-newsletter.liquid theme/sections/icon-highlight-bar.liquid theme/sections/boringly-clean-pure.liquid
git commit -m "fix(a11y,cls): newsletter input label, decorative separator, hero-clean image dimensions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Final verification + finish the branch

**Files:** none (verification + git)

- [ ] **Step 1: Full theme-check delta**

Run:
```bash
shopify theme check --path theme 2>&1 | tail -8
```
Expected summary: errors down to **5** (all `JSONMissingBlock` app-block false positives — Instafeed/Judge.me), `ImgWidthAndHeight` gone. Warnings ≈ unchanged (25 `ValidScopedCSSClass` + 1 `HardcodedRoutes`, both out of scope). Confirm no **new** error/warning types were introduced by our edits.

- [ ] **Step 2: Homepage visual regression (desktop 1280 + mobile 390) vs `site/`**

Run the existing full-page screenshot harness against the draft homepage at 1280 and 390 (reuse `/tmp/bfc-qa/hero_img.mjs` output plus a full-page shot — scroll first so lazy images render). Eyeball against `site/index.html`:
- Hero, manifesto, "boringly clean", comparison table, footer all render and match the static reference.
- No layout shift / cramming at the announcement bar or hero on load (the prior marquee/first-paint fix is intact).
Expected: no visual regressions vs the pre-change draft and vs `site/`.

- [ ] **Step 3: Confirm fonts win sitewide (spot-check a second template)**

Re-run `node /tmp/bfc-qa/font_bytes.mjs` but point `URL` at a product page (`…/products/<handle>?preview_theme_id=151032561833`) to confirm WOFF2 (not OTF/TTF) is served there too (product pages render `icon-highlight-bar`, exercising more type).
Expected: Legacy OTF/TTF fetched: 0.

- [ ] **Step 4: Finish the development branch**

Announce: "I'm using the finishing-a-development-branch skill to complete this work." Then follow superpowers:finishing-a-development-branch:
- There is no unit-test suite; the "tests" are the per-task verification gates above — confirm they all passed before presenting options.
- Base branch is `main`. Present the standard 4 options (merge locally / push + PR / keep as-is / discard) and execute the user's choice.
- **Do not** merge to `main`, push, or publish to any theme without explicit user confirmation, and **never** publish the draft to live.

---

## Self-Review (performed against the audit spec)

- **Spec coverage:** P1 fonts→WOFF2 (Task 1), P1 responsive hero + compressed fallback (Task 2), P2 homepage h1 (Task 2), P2 newsletter label + separator alt + 2 img dimensions (Task 3). All four audit P1/P2 items are covered. P3 (reports custom-liquid migration, dead-code deletion) and the "do not touch" list are intentionally excluded.
- **Placeholder scan:** every code edit shows exact before/after; every command is concrete with store/theme IDs and expected output. No TBDs.
- **Type/selector consistency:** new `heading` setting id matches `section.settings.heading` usage; `.bfc-hero__h1` class matches between markup and CSS; `image_tag` `class:` values match existing selectors (`bfc-hero__photo`, `bc-section__blob-bg`).
- **Risk checks baked in:** h1-count assertion guards against double-h1; `object-fit` boxes confirmed so `image_tag` dims don't distort; OTF/TTF kept as `@font-face` fallback; fallback hero kept eager + `fetchpriority`; every push verified by pull-back + a browser probe, never the banner.
- **Known follow-ups (out of scope, noted for the user):** the fallback `hero-powder.jpg` is single-resolution (asset images can't be CDN-resized) — fine because production sets a CDN hero; optional later win is preloading the primary Aesthet Nova / Copperplate weight.
