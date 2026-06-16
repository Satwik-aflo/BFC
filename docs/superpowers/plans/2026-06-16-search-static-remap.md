# Search Static-Panel Remap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin Horizon's centered search modal into the static site's full-width
top-sliding cream panel (slide-down animation + dimming scrim + big underlined input),
while keeping Horizon's predictive search, empty-state product grid, focus trap,
scroll-lock and keyboard behaviour 100% intact.

**Architecture:** Pure CSS, additive, in the existing `{% style %}` block of
`theme/snippets/brand.liquid`. We override the geometry, animation, scrim and input
chrome of `.search-modal__content` (and re-flow the results wrapper to sit *inside* the
panel) using brand tokens already defined in that file's `:root`. **No markup, no JS, no
new section/setting, no Horizon core file is touched** — so no two-push dance is needed
and the live theme is never involved. The empty-state grid ("Recently Viewed" +
"Products") that the user approved stays exactly as Horizon renders it.

**Tech Stack:** Shopify Horizon 3.5.1 theme; Liquid `{% style %}` (renders Liquid);
Shopify Dev MCP `validate_theme`; Shopify CLI (`theme push`/`pull`); Playwright +
headless Chromium for visual QA.

---

## Design source

- Spec: `docs/superpowers/specs/2026-06-16-static-search-findings.md` (read the **DECISION
  (2026-06-16)** section — chips are cancelled; empty state = Horizon product grid).
- Static reference screenshots on disk: `/tmp/bfc-qa/ss_desk_open_final.png` (full-width
  top panel, settled), `/tmp/bfc-qa/ss_desk_open_80ms.png` (mid-slide),
  `/tmp/bfc-qa/ss_mob_open_final.png` (390).
- User-approved empty state = the official search grid the user supplied: "Recently
  Viewed" + "Products", green Copperplate headings, uppercase product names, orange
  prices, framed pack shots on cream. We KEEP this — only the panel shell/animation/input
  change.

## What we are NOT doing (YAGNI)

- No "Popular" spice chips (cancelled by the user — see spec DECISION).
- No edits to `search-modal.liquid`, `predictive-search-empty-state.liquid`,
  `predictive-search-empty.liquid`, `predictive-search.js`, or any other Horizon file.
- No new schema/setting → **single push of `snippets/brand.liquid` only.**
- No change to predictive logic, focus trap, scroll-lock, or "View all".

## Horizon structure being restyled (verified, do not edit — for reference only)

`theme/snippets/search-modal.liquid`:
```
<dialog-component id="search-modal" class="search-modal">
  <dialog class="search-modal__content dialog-modal" scroll-lock>     ← native dialog, opened via showModal()
    <h2 class="visually-hidden">Search</h2>
    <predictive-search-component class="predictive-search color-{scheme}">
      <form class="predictive-search-form" action="{routes.search_url}" method="get">
        <div class="predictive-search-form__header">                  ← input row (boxed border today)
          <div class="predictive-search-form__header-inner">
            <input class="search-input" name="q" ...>
            <span class="predictive-search__icon">…magnifier…</span>
            <button class="predictive-search__reset-button">Clear</button>
          </div>
          <button class="predictive-search__close-modal-button">✕</button>
        </div>
        <div class="predictive-search-form__content-wrapper">          ← position:absolute; top:100% TODAY (dropdown)
          <div class="predictive-search-form__content" ref="predictiveSearchResults">
            {% render 'predictive-search-empty-state' … %}             ← Recently Viewed + Products grid (KEEP)
          </div>
          <div class="predictive-search-form__footer">
            <button class="predictive-search__search-button">View all</button>
          </div>
        </div>
      </form>
    </predictive-search-component>
  </dialog>
</dialog-component>
```
Lifecycle (verified in `predictive-search.js`): typing replaces the content with live
results; clearing the field re-fetches the `predictive-search-empty` section and `morph`s
the empty grid back in. So our empty-state grid auto-hides on type and returns on clear —
no JS needed from us.

## Brand tokens used (already defined in `brand.liquid` `:root`, do not redefine)

`--kulfi-malai` `#fbf3cc` · `--kohl-black` `#000` · `--neem-green` `#244f24` ·
`--ripe-orange-ink` `#c2390f` · `--font-display` (Copperplate) · `--font-body--family`
(Aesthet Nova) · `--tracking-caps` `0.18em` · `--bfc-line` (`1.5px solid black`) ·
`--bfc-ease-out` (`cubic-bezier(0.22,1,0.36,1)`) · `--gutter` (`clamp(1.25rem,4vw,4rem)`).

## File structure

| File | Responsibility | Change |
|---|---|---|
| `theme/snippets/brand.liquid` | Brand override layer (`{% style %}`) | Replace the `/* ── Search modal → static .sf-search. ── */` block (currently lines **465–489**) with the expanded full-panel remap below. Everything else (cart rules, focus ring at 492–497, touch rule at 500–503, `:root`) is untouched. |
| `/tmp/bfc-qa/search_remap_qa.mjs` | Playwright QA harness (before/after, 1280 + 390) | Create. |

---

### Task 1: QA harness + capture the BEFORE state

**Files:**
- Create: `/tmp/bfc-qa/search_remap_qa.mjs`

- [ ] **Step 1: Write the QA script**

Create `/tmp/bfc-qa/search_remap_qa.mjs` with exactly this content:

```js
import { chromium } from 'playwright-core';
const EXEC = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const P = 'https://d9v1pv-06.myshopify.com', ID = '151032561833';
const TAG = process.argv[2] || 'after'; // pass 'before' for baseline
const b = await chromium.launch({ executablePath: EXEC, headless: true });

async function run(width, label) {
  const ctx = await b.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: width < 500 ? 2 : 1 });
  const page = await ctx.newPage();
  // set preview cookie, then land on the storefront
  await page.goto(`${P}/?preview_theme_id=${ID}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);

  // open the native search dialog (same path the header trigger uses)
  await page.evaluate(() => document.querySelector('.search-modal__content')?.showModal?.());
  await page.waitForTimeout(90);
  const mid = await page.evaluate(() => { const d = document.querySelector('.search-modal__content'); return d ? getComputedStyle(d).transform : 'none'; });
  await page.screenshot({ path: `/tmp/bfc-qa/sr_${TAG}_${label}_open_mid.png` });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `/tmp/bfc-qa/sr_${TAG}_${label}_open.png` });

  const probe = await page.evaluate(() => {
    const d = document.querySelector('.search-modal__content');
    if (!d) return { found: false };
    const cs = getComputedStyle(d); const r = d.getBoundingClientRect();
    const wrap = document.querySelector('.predictive-search-form__content-wrapper');
    const wcs = wrap ? getComputedStyle(wrap) : null;
    const inp = document.querySelector('.search-modal__content .search-input');
    return {
      found: true, position: cs.position, top: cs.top,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      bg: cs.backgroundColor, borderBottom: cs.borderBottomWidth + ' ' + cs.borderBottomColor, borderRadius: cs.borderRadius,
      wrapperPosition: wcs ? wcs.position : null,
      inputFontSize: inp ? getComputedStyle(inp).fontSize : null,
      emptyTitles: [...document.querySelectorAll('.predictive-search-results__title')].map(t => t.textContent.trim()),
    };
  });

  // type a query → live predictive results should render in-flow
  await page.fill('.search-modal__content .search-input', 'moringa').catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `/tmp/bfc-qa/sr_${TAG}_${label}_typed.png` });
  const typed = await page.evaluate(() => ({
    productCards: document.querySelectorAll('.search-modal__content .predictive-search-results__card').length,
    viewAllVisible: !!document.querySelector('.predictive-search__search-button') && getComputedStyle(document.querySelector('.predictive-search-form__footer')).display !== 'none',
  }));

  // clear → empty grid should return; Escape → closes
  await page.fill('.search-modal__content .search-input', '').catch(() => {});
  await page.waitForTimeout(900);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const closed = await page.evaluate(() => document.querySelector('.search-modal__content')?.hasAttribute('open'));

  console.log(JSON.stringify({ label, width, mid_transform: mid, probe, typed, stillOpenAfterEscape: closed }, null, 2));
  await ctx.close();
}

await run(1280, 'desk');
await run(390, 'mob');
await b.close();
```

- [ ] **Step 2: Run it against the current (un-changed) theme to capture the BEFORE baseline**

Run: `node /tmp/bfc-qa/search_remap_qa.mjs before`
Expected: JSON prints `probe.position: "fixed"`? **No** — currently `relative`/default
centered modal; `probe.rect.w` ≈ 845 (66dvw), `probe.top` non-zero. Screenshots
`sr_before_desk_open.png` (centered card) saved. This is the baseline we improve on.

- [ ] **Step 3: Commit the harness reference (optional, harness lives in /tmp — no repo commit). Skip git here.**

No commit (the QA script is in `/tmp`, outside the repo).

---

### Task 2: Author the full-width top-panel CSS in `brand.liquid`

**Files:**
- Modify: `theme/snippets/brand.liquid` — replace the block at lines **465–489**
  (the `/* ── Search modal → static .sf-search. ── */` block, which currently only
  recolours the centered modal's input + result type).

- [ ] **Step 1: Locate the exact block to replace**

Open `theme/snippets/brand.liquid`. Find this current block (starts ~line 465, ends ~line
489, immediately before the `/* Focus ring ... */` comment). The text to replace is:

```css
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
```

Keep the `/* Focus ring ... */` rule (lines 491–497) and the touch rule (499–503)
**unchanged** — they stay right after this block.

- [ ] **Step 2: Replace it with the expanded remap (shell + animation + scrim + input + reflow + kept type rules)**

Use Edit to replace the entire block from Step 1 with this:

```css
  /* ── Search modal → static full-width top-sliding panel (.sf-search). ──
     Re-anchors Horizon's centered cmdk modal into the static site's panel that
     slides down from the top of the viewport. Keeps Horizon's predictive search,
     empty-state product grid (Recently Viewed + Products), focus trap,
     scroll-lock and keyboard. CSS only — no markup/JS touched.
     Static ref: site/css/main.css 1207-1291 + /tmp/bfc-qa/ss_desk_open_final.png. */

  /* Shell: full-width, pinned to viewport top, cream, black underline, inner 64rem. */
  .search-modal__content {
    position: fixed !important;
    inset: 0 0 auto 0 !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: clamp(1.25rem, 4vw, 2.25rem) var(--gutter) clamp(2rem, 5vw, 3rem) !important;
    background: var(--kulfi-malai) !important;
    border: none !important;
    border-bottom: var(--bfc-line) !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    max-height: 85dvh;
    overflow: hidden;
  }
  .search-modal__content[open] { display: block !important; }
  .search-modal__content predictive-search-component {
    display: block !important;
    width: 100%;
    max-width: 64rem;
    margin-inline: auto;
    background: transparent !important;
  }

  /* Slide down from the top (static: translateY(-100%)→0, 0.5s brand ease-out). */
  @keyframes bfc-search-slide-down {
    from { transform: translateY(-100%); }
    to   { transform: translateY(0); }
  }
  @keyframes bfc-search-slide-up {
    from { transform: translateY(0); }
    to   { transform: translateY(-100%); }
  }
  .dialog-modal[open].search-modal__content {
    transform-origin: top center !important;
    animation: bfc-search-slide-down 0.5s var(--bfc-ease-out) forwards !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  .dialog-modal.search-modal__content.dialog-closing {
    animation: bfc-search-slide-up 0.35s var(--bfc-ease-out) forwards !important;
  }
  @media (prefers-reduced-motion: reduce) {
    .dialog-modal[open].search-modal__content,
    .dialog-modal.search-modal__content.dialog-closing {
      animation: none !important;
    }
  }

  /* Dimming scrim on every breakpoint (Horizon hides ::backdrop under 750px). */
  .search-modal__content::backdrop { background: rgba(0, 0, 0, 0.38); }
  @media screen and (max-width: 749px) {
    .search-modal__content::backdrop { display: block; }
  }

  /* Field: single black underline (no boxed border), big body-font input. */
  .search-modal__content .predictive-search-form__header,
  .search-modal__content .predictive-search-form__header-inner {
    background: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  .search-modal__content .predictive-search-form__header {
    border-bottom: var(--bfc-line) !important;
    padding: 0 !important;
  }
  .search-modal__content :is(.search-input, input[type="search"], .predictive-search-form__input) {
    font-size: clamp(1.25rem, 1rem + 2vw, 2rem) !important;
    font-family: var(--font-body--family);
    font-weight: 500;
    color: var(--kohl-black);
  }

  /* Results + empty-state grid flow INSIDE the panel and scroll there
     (Horizon hangs them off the input as an absolute dropdown). */
  .search-modal__content .predictive-search-form__content-wrapper {
    position: static !important;
    top: auto;
    width: 100%;
    max-height: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    overflow: visible;
  }
  .search-modal__content .predictive-search-form__content {
    max-height: min(60dvh, 32rem) !important;
    overflow-y: auto;
    background: transparent !important;
    padding-block-start: 1.25rem;
  }
  .search-modal__content .predictive-search-form__footer {
    position: static !important;
    background: none !important;
    padding-block: 1.25rem 0 !important;
  }

  /* Empty-state + predictive result TYPE (kept from Wave 1c — matches the
     user-approved official grid: green Copperplate section titles, uppercase
     product names, WCAG-safe orange prices). */
  .predictive-search-results__title {
    font-family: var(--font-display) !important;
    font-weight: 700;
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
    color: var(--neem-green);
  }
  .predictive-search-results__card .resource-card__title {
    font-family: var(--font-display) !important;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .predictive-search-results__card :is(.resource-card__subtext, .price, .price *) {
    color: var(--ripe-orange-ink) !important;
  }
```

- [ ] **Step 3: Sanity-check the edit kept the rest of the file intact**

Run: `grep -n "bfc-search-slide-down\|Focus ring\|pointer: coarse" theme/snippets/brand.liquid`
Expected: the new keyframe name appears once, and the `Focus ring` comment + `pointer:
coarse` rule still exist after the new block (proves we only replaced the intended block).

- [ ] **Step 4: Validate with the Shopify Dev MCP**

First call `learn_shopify_api` with `api: "liquid"` to get a `conversationId`. Then call
`validate_theme` with:
- `conversationId`: (from the call above)
- absolute theme path: `/Users/saimeda/Documents/Codex/medas/BFC/theme`
- files: `["snippets/brand.liquid"]`

Expected: VALID (no errors). `{% style %}` + CSS only — no Liquid object/URL issues.
If it errors, read the message, fix exactly that, re-run `validate_theme` reusing the
returned `artifactId` and bumping `revision`. Do **not** push until VALID.

- [ ] **Step 5: Commit the CSS**

```bash
git add theme/snippets/brand.liquid
git commit -m "feat(search): remap search modal to static full-width top-sliding panel

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Push to the draft theme + verify by pulling back

**Files:** none (deploy only). Target draft theme **#151032561833** only. **Never the live theme.**

- [ ] **Step 1: Push only the changed brand file (single push — no schema change, no two-push)**

```bash
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 \
  --nodelete --only snippets/brand.liquid
```
Expected: "pushed successfully" banner. **Do not trust it — verify in Step 2.**

- [ ] **Step 2: Pull the file back and grep for the new rule (the banner lies)**

```bash
mkdir -p /tmp/bfc-verify
shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com \
  --theme 151032561833 --only snippets/brand.liquid
grep -c "bfc-search-slide-down" /tmp/bfc-verify/snippets/brand.liquid
```
Expected: grep prints `1` (or more). If `0`, the push silently no-opped — confirm you
passed `--path theme` on the push and that you ran it from the repo root; re-push.

---

### Task 4: Visual QA at 1280 + 390 (the real gate)

**Files:** uses `/tmp/bfc-qa/search_remap_qa.mjs` from Task 1.

- [ ] **Step 1: Capture the AFTER state**

Run: `node /tmp/bfc-qa/search_remap_qa.mjs after`
Expected JSON:
- `probe.position` = `"fixed"`, `probe.top` = `"0px"`, `probe.rect.x` = `0`,
  `probe.rect.w` = `1280` (desk) / `390` (mob) — full-width top panel.
- `probe.bg` = `rgb(251, 243, 204)` (Kulfi Malai); `probe.borderRadius` = `"0px"`;
  `probe.borderBottom` includes `1.5px` + black.
- `probe.wrapperPosition` = `"static"` (results flow inside the panel).
- `probe.inputFontSize` ≈ `32px` desktop.
- `probe.emptyTitles` includes the empty-state grid titles (e.g. "Recently viewed" /
  "Products") — proves the grid still renders.
- `mid_transform` is a `matrix(...)` with a non-zero negative Y at 90 ms (mid slide-down).
- `typed.productCards` > 0 and `typed.viewAllVisible` = `true` — live predictive results +
  "View all" still work in the new layout.
- `stillOpenAfterEscape` = `false` — Escape still closes.

- [ ] **Step 2: Eyeball the screenshots against the static reference**

Open and compare:
- `/tmp/bfc-qa/sr_after_desk_open.png` vs `/tmp/bfc-qa/ss_desk_open_final.png` — full-width
  cream panel pinned to top, black underline under the field, big input, magnifier left,
  ✕ close, and the "Recently Viewed / Products" grid (matching the user's official image).
- `/tmp/bfc-qa/sr_after_mob_open.png` vs `/tmp/bfc-qa/ss_mob_open_final.png` — full-width on
  390, grid cards wrap to 2-up, input legible.
- `/tmp/bfc-qa/sr_after_desk_typed.png` — typing "moringa" shows live predictive product
  results in-flow inside the panel (scrolls internally), green section title, orange
  prices, "View all" button below.

Checklist (all must pass): panel full-width & top-anchored · slides down (not centered
pop) · dim scrim behind · field is a single underline with big input · empty-state grid =
Recently Viewed + Products (per official image) · typing returns live results that scroll
inside the panel · "View all" present & clickable · Escape / ✕ / scrim-click close ·
focus lands in the input on open.

- [ ] **Step 3: If anything is off, fix CSS and redeploy**

If a check fails (e.g. results overflow the panel, underline missing, scrim absent),
adjust the corresponding rule in the Task 2 block, re-validate (Task 2 Step 4), re-push
(Task 3), and re-run this task. Common tuning knobs: `.predictive-search-form__content`
`max-height`; shell `max-height: 85dvh`; scrim opacity `0.38`. Amend the commit or add a
follow-up `fix(search):` commit.

- [ ] **Step 4: Regression check — cart drawer unaffected**

Run: `node /tmp/bfc-qa/cartsearch_current.mjs` (existing harness, 4 surfaces desktop) and
glance at `/tmp/bfc-qa/cur_cart_drawer.png`. Expected: the cart drawer still looks exactly
as before (our search-scoped selectors must not have leaked into the cart). If the cart
changed, a selector is too broad — re-scope it under `.search-modal__content`.

---

### Task 5: Wrap up (commit docs; defer branch finish)

**Files:**
- `docs/superpowers/specs/2026-06-16-static-search-findings.md` (already updated with the DECISION)
- `docs/superpowers/plans/2026-06-16-search-static-remap.md` (this file)

- [ ] **Step 1: Commit the spec + plan if not already committed**

```bash
git add docs/superpowers/specs/2026-06-16-static-search-findings.md \
        docs/superpowers/plans/2026-06-16-search-static-remap.md
git commit -m "docs(search): remap plan + empty-state-grid decision

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 2: Do NOT run finishing-a-development-branch here**

This remap is one item on the in-progress `feat/theme-reskin-gap-close` branch (parent
task #11 "Final: mobile QA + finish branch"). Leave branch-finishing to that umbrella
task so the search work merges together with the rest of the gap-close reskin. Report
completion of the search remap and stop.

---

## Self-review (run against the spec)

**1. Spec coverage:**
- Full-width top panel → Task 2 shell rules. ✓
- Slide-down animation + brand ease-out → Task 2 keyframes/animation rules. ✓
- Dimming scrim → Task 2 `::backdrop` rules. ✓
- Big underlined input → Task 2 header/input rules. ✓
- Keep predictive results + "View all" → not removed; re-flowed in Task 2; verified Task 4. ✓
- Empty state = product grid (DECISION), no chips → no chip code anywhere; type rules kept; verified Task 4 (`emptyTitles`). ✓
- Scroll behaviour inside the fixed panel (the one real open item) → Task 2 content-wrapper
  `position:static` + content `max-height`/`overflow-y:auto`; verified Task 4 Step 1/2. ✓
- Verify visually at 1280 + 390 vs static refs → Task 4. ✓
- No core file / no two-push / draft only → enforced in Tasks 2–3. ✓

**2. Placeholder scan:** No TBD/TODO; every CSS rule and command is concrete. ✓

**3. Consistency:** Keyframe name `bfc-search-slide-down`/`-up` used consistently in Task 2
and grepped in Task 2 Step 3 / Task 3 Step 2. QA script filename
`/tmp/bfc-qa/search_remap_qa.mjs` and screenshot prefixes `sr_before_*`/`sr_after_*` match
between Task 1 and Task 4. Theme id `151032561833` and store `d9v1pv-06.myshopify.com`
consistent throughout. ✓
