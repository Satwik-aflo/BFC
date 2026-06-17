# BFC Footer — Static Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current ad-hoc multi-section Shopify footer with one bespoke `bfc-footer` section that visually matches the static site's `.footer` (green band, spinning sun stamp, "Boring is the new super." CTA + email + Write-to-Us button, nav, policies row, bottom meta line), keeping social icons integrated cleanly and dropping the yellow "Support Women SHGs" marquee band.

**Architecture:** Purely-additive reskin pattern (same as `bfc-hero`, `bfc-manifesto`). One new section file `theme/sections/bfc-footer.liquid` carries markup + `{% stylesheet %}` CSS (referencing brand tokens already defined in `snippets/brand.liquid` `:root`) + `{% schema %}`. The footer section group (`theme/sections/footer-group.json`) is rewired to render only this section, retiring the two `custom-liquid` blocks, the native Horizon `footer` block, and the "Policies" group section. Links are hardcoded to verified storefront routes (no admin menu setup required); copy/headline/email/CTA/meta are theme-editable settings.

**Tech Stack:** Shopify Horizon 3.5.1, Liquid, brand tokens from `brand.liquid`. Verification via Shopify Dev MCP `validate_theme`, surgical `shopify theme push --path theme`, pull-back grep, and Playwright + headless Chromium screenshot vs the live static site.

---

## Reference: source of truth

Static footer (live: https://satwik-aflo.github.io/BFC/ ; CSS `site/css/main.css:473-533`):

- `.footer` — `background: var(--neem-green)` (#244f24), `color: var(--kulfi-malai)` (#fbf3cc), `padding: var(--space-6) var(--gutter) var(--space-3)`.
- `.footer__top` — `grid-template-columns: auto 1fr auto; gap: clamp(2rem,6vw,6rem); align-items:center; padding-bottom: var(--space-5)`.
  - LEFT: `.footer__stamp` — sun SVG, `width: clamp(110px,12vw,160px); animation: spin 36s linear infinite`.
  - CENTER: `.footer__cta` — `h2` in `var(--font-charm)` (Flagflies) with `.script` span (`var(--font-script)` Musloner, mango-yellow); email line; "Write to Us" `.btn`.
  - RIGHT: `.footer__nav` — grid of links, `var(--font-display)` (Copperplate), 12px, 700, uppercase, `letter-spacing: var(--tracking-caps)` (0.18em).
- `.footer__policies` — flex row, `gap: 0.5rem 1.4rem`, same display type, `opacity:.85`.
- `.footer__bottom` — `border-top:1px solid rgba(251,243,204,.3)`, flex `space-between`, display type 12px uppercase, `opacity:.85`. Three spans.

Nav (per the user's reference screenshot, which adds FAQ): **Our Story · Shop · Reports · Recipes · FAQ**.
Policies: **Privacy Policy · Return & Refund · Shipping Policy · Terms & Conditions · Contact**.
Bottom: **© 2026 The Boring Foods Company** · **Agsto Foods Pvt Ltd, Gurugram, Haryana** · **The Future of Health is Ancient**.

Verified storefront routes (all HTTP 200):
- `/pages/about-us` (Our Story), `/collections/shop` (Shop), `/pages/reports`, `/pages/recipes`, `/pages/faqs` (FAQ — note the `s`), `/pages/contact`.
- `/policies/privacy-policy`, `/policies/refund-policy`, `/policies/shipping-policy`, `/policies/terms-of-service`.

Brand tokens already in `theme/snippets/brand.liquid` `:root` (do NOT redefine): `--neem-green:#244f24`, `--kulfi-malai:#fbf3cc`, `--mango-yellow:#f9bf29`, `--font-charm` (Flagflies), `--font-script` (Musloner), `--font-display` (=Copperplate heading), `--tracking-caps:0.18em`, `--gutter`. The `.bfc-btn` / `.hand` / `.bfc-script` classes also come from `brand.liquid`.

Social SVG markup (LinkedIn + Instagram) is preserved verbatim from the existing `custom_liquid_jjP6hf` block in `theme/sections/footer-group.json` — links: `https://www.linkedin.com/company/the-boring-foods-company/` and `https://www.instagram.com/boringfoodscompany`.

---

## Task 1: Add the sun-stamp asset

**Files:**
- Create: `theme/assets/sun-stamp.svg` (copy of `site/assets/img/Sun1.svg`)

- [ ] **Step 1: Copy the asset**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
cp site/assets/img/Sun1.svg theme/assets/sun-stamp.svg
```

- [ ] **Step 2: Verify it copied and is valid SVG**

```bash
head -c 120 theme/assets/sun-stamp.svg
```
Expected: starts with `<?xml version="1.0"` and contains `<svg`.

- [ ] **Step 3: Commit**

```bash
git add theme/assets/sun-stamp.svg
git commit -m "feat(footer): add sun-stamp.svg asset for footer"
```

---

## Task 2: Build the `bfc-footer` section

**Files:**
- Create: `theme/sections/bfc-footer.liquid`

- [ ] **Step 1: Write the section file**

Create `theme/sections/bfc-footer.liquid` with exactly this content:

```liquid
{% comment %}
  Boring Foods footer. Ports the static-site .footer (site/css/main.css:473-533):
  green band, spinning sun stamp, "Boring is the new super." charm headline with a
  Musloner script accent, email line, Write-to-Us CTA, social icons, link nav, a
  policies row, and a three-part bottom meta line. Brand tokens (--neem-green,
  --kulfi-malai, --mango-yellow, --font-charm, --font-script, --font-display,
  --tracking-caps, --gutter) and .bfc-btn / .bfc-script / .hand come from brand.liquid.
{% endcomment %}

<footer class="bfc-footer" id="contact" role="contentinfo">
  <div class="bfc-footer__inner">
    <div class="bfc-footer__top">
      <img class="bfc-footer__stamp" src="{{ 'sun-stamp.svg' | asset_url }}"
           alt="" width="160" height="156" aria-hidden="true" loading="lazy">

      <div class="bfc-footer__cta">
        <h2 class="bfc-footer__head">{{ section.settings.heading | escape }} <span class="bfc-script">{{ section.settings.heading_accent | escape }}</span></h2>
        {%- if section.settings.email != blank -%}
          <p class="bfc-footer__contact">{{ section.settings.contact_prefix | escape }} <a href="mailto:{{ section.settings.email }}">{{ section.settings.email }}</a></p>
        {%- endif -%}
        <p class="bfc-footer__btn-wrap">
          <a class="bfc-btn" href="{% if section.settings.cta_link != blank %}{{ section.settings.cta_link }}{% else %}mailto:{{ section.settings.email }}{% endif %}">
            <span class="hand">&#9758;</span> {{ section.settings.cta_label | escape }}
          </a>
        </p>
        {%- if section.settings.show_socials -%}
          <div class="bfc-footer__socials">
            <a href="https://www.linkedin.com/company/the-boring-foods-company/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.731-2.004 1.438-.103.25-.129.599-.129.948v5.419h-3.554s.05-8.736 0-9.646h3.554v1.364c.429-.658 1.196-1.593 2.905-1.593 2.12 0 3.714 1.388 3.714 4.373v5.502zM5.337 8.855c-1.144 0-1.915-.758-1.915-1.704 0-.962.77-1.704 1.956-1.704 1.187 0 1.915.742 1.937 1.704 0 .946-.75 1.704-1.978 1.704zm1.581 11.597H3.635V9.859h3.283v10.593zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>
            </a>
            <a href="https://www.instagram.com/boringfoodscompany" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.057-1.645.069-4.849.069-3.204 0-3.584-.012-4.849-.069-3.259-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.756 0 8.331.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.331 0 8.756 0 12c0 3.244.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0z"/><path d="M12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a4 4 0 110-8 4 4 0 010 8z"/><circle cx="18.406" cy="5.594" r="1.44"/></svg>
            </a>
          </div>
        {%- endif -%}
      </div>

      <nav class="bfc-footer__nav" aria-label="Footer">
        <a href="/pages/about-us">Our Story</a>
        <a href="/collections/shop">Shop</a>
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

    <div class="bfc-footer__bottom">
      <span>&copy; {{ 'now' | date: '%Y' }} {{ section.settings.legal_name | escape }}</span>
      <span>{{ section.settings.legal_address | escape }}</span>
      <span>{{ section.settings.legal_tagline | escape }}</span>
    </div>
  </div>
</footer>

{% stylesheet %}
  .bfc-footer { background: var(--neem-green, #244f24); color: var(--kulfi-malai, #fbf3cc); padding: 4.5rem var(--gutter, 1.5rem) 1.5rem; }
  .bfc-footer__inner { max-width: 72rem; margin: 0 auto; }
  .bfc-footer__top { display: grid; grid-template-columns: auto 1fr auto; gap: clamp(2rem, 6vw, 6rem); align-items: center; padding-bottom: 3rem; }
  .bfc-footer__stamp { width: clamp(110px, 12vw, 160px); height: auto; animation: bfc-footer-spin 36s linear infinite; }
  .bfc-footer__head { font-family: var(--font-charm, Georgia); font-weight: 400; font-size: clamp(2rem, 5vw, 3.25rem); line-height: 1.15; margin: 0 0 1rem; }
  .bfc-footer__head .bfc-script { color: var(--mango-yellow, #f9bf29); font-size: 1.05em; }
  .bfc-footer__contact { font-size: 1rem; line-height: 1.5; margin: 0 0 1.5rem; }
  .bfc-footer__contact a { color: var(--kulfi-malai, #fbf3cc); text-underline-offset: 3px; }
  .bfc-footer__contact a:hover { color: var(--mango-yellow, #f9bf29); }
  .bfc-footer__btn-wrap { margin: 0; }
  .bfc-footer__socials { display: flex; gap: 1rem; margin-top: 1.5rem; }
  .bfc-footer__socials a { color: var(--kulfi-malai, #fbf3cc); display: inline-flex; transition: color 0.2s, transform 0.2s; }
  .bfc-footer__socials a:hover { color: var(--mango-yellow, #f9bf29); transform: translateY(-2px); }
  .bfc-footer__nav { display: grid; gap: 0.8rem; justify-items: start; }
  .bfc-footer__nav a { font-family: var(--font-display); font-size: 0.75rem; font-weight: 700; letter-spacing: var(--tracking-caps, 0.18em); text-transform: uppercase; text-decoration: none; color: var(--kulfi-malai, #fbf3cc); }
  .bfc-footer__nav a:hover { color: var(--mango-yellow, #f9bf29); }
  .bfc-footer__policies { display: flex; flex-wrap: wrap; gap: 0.5rem 1.4rem; padding-bottom: 1rem; }
  .bfc-footer__policies a { font-family: var(--font-display); font-size: 0.75rem; letter-spacing: var(--tracking-caps, 0.18em); text-transform: uppercase; text-decoration: none; color: var(--kulfi-malai, #fbf3cc); opacity: 0.85; }
  .bfc-footer__policies a:hover { color: var(--mango-yellow, #f9bf29); opacity: 1; }
  .bfc-footer__bottom { border-top: 1px solid rgb(251 243 204 / 0.3); padding-top: 1rem; display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; font-family: var(--font-display); font-size: 0.75rem; letter-spacing: var(--tracking-caps, 0.18em); text-transform: uppercase; opacity: 0.85; }
  @keyframes bfc-footer-spin { to { transform: rotate(360deg); } }
  @media (max-width: 749px) {
    .bfc-footer__top { grid-template-columns: 1fr; justify-items: center; text-align: center; }
    .bfc-footer__nav { justify-items: center; }
    .bfc-footer__policies { justify-content: center; }
    .bfc-footer__socials { justify-content: center; }
    .bfc-footer__bottom { justify-content: center; text-align: center; letter-spacing: 0.08em; }
  }
  @media (prefers-reduced-motion: reduce) { .bfc-footer__stamp { animation: none; } }
{% endstylesheet %}

{% schema %}
{
  "name": "BFC Footer",
  "settings": [
    { "type": "text", "id": "heading", "label": "Heading", "default": "Boring is the new" },
    { "type": "text", "id": "heading_accent", "label": "Heading accent (script)", "default": "super." },
    { "type": "text", "id": "contact_prefix", "label": "Contact line prefix", "default": "Questions, feedback, or proof requests —" },
    { "type": "text", "id": "email", "label": "Contact email", "default": "team@boringfoodscompany.com" },
    { "type": "text", "id": "cta_label", "label": "CTA label", "default": "Write to Us" },
    { "type": "url", "id": "cta_link", "label": "CTA link", "info": "Leave blank to use a mailto: link to the contact email." },
    { "type": "checkbox", "id": "show_socials", "label": "Show social icons", "default": true },
    { "type": "header", "content": "Bottom meta line" },
    { "type": "text", "id": "legal_name", "label": "Company name", "default": "The Boring Foods Company" },
    { "type": "text", "id": "legal_address", "label": "Address", "default": "Agsto Foods Pvt Ltd, Gurugram, Haryana" },
    { "type": "text", "id": "legal_tagline", "label": "Tagline", "default": "The Future of Health is Ancient" }
  ],
  "presets": [{ "name": "BFC Footer" }]
}
{% endschema %}
```

- [ ] **Step 2: Validate Liquid with Shopify Dev MCP**

Call `learn_shopify_api` (api: `liquid`) to get a `conversationId`, then `validate_theme` with `themePath` = absolute path to `theme/` and `filePaths` = `["sections/bfc-footer.liquid"]`.
Expected: no errors (warnings about unused settings are acceptable).

- [ ] **Step 3: Commit**

```bash
git add theme/sections/bfc-footer.liquid
git commit -m "feat(footer): add bfc-footer section matching static footer"
```

---

## Task 3: Rewire the footer section group

**Files:**
- Modify: `theme/sections/footer-group.json` (replace the whole `sections` map + `order` array)

- [ ] **Step 1: Replace the file contents**

Overwrite `theme/sections/footer-group.json` with exactly:

```json
/*
 * ------------------------------------------------------------
 * IMPORTANT: The contents of this file are auto-generated.
 *
 * This file may be updated by the Shopify admin theme editor
 * or related systems. Please exercise caution as any changes
 * made to this file may be overwritten.
 * ------------------------------------------------------------
 */
{
  "type": "footer",
  "name": "Footer",
  "sections": {
    "bfc_footer": {
      "type": "bfc-footer",
      "name": "BFC Footer",
      "settings": {}
    }
  },
  "order": [
    "bfc_footer"
  ]
}
```

This retires `custom_liquid_bfcfooter` (marquee + old CTA band), `custom_liquid_jjP6hf` (social-icon hack — socials now live inside `bfc-footer`), the native `footer` block, and the "Policies" group section. Empty `settings: {}` means `bfc-footer` renders its schema defaults.

- [ ] **Step 2: Validate the section group JSON**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
python3 -c "import json,re,sys; s=open('theme/sections/footer-group.json').read(); s=re.sub(r'/\*.*?\*/','',s,flags=re.S); json.loads(s); print('JSON OK')"
```
Expected: `JSON OK`.

- [ ] **Step 3: Commit**

```bash
git add theme/sections/footer-group.json
git commit -m "feat(footer): render only bfc-footer in footer group"
```

---

## Task 4: Push and verify on the draft theme

**Files:** none (deploy + verify only). Draft theme `#151032561833`, store `d9v1pv-06.myshopify.com`.

> Order matters (two pushes): the section TYPE `bfc-footer` must exist on the theme BEFORE the group JSON that references it, or Shopify drops the reference.

- [ ] **Step 1: Push the section + asset first**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete \
  --only sections/bfc-footer.liquid --only assets/sun-stamp.svg
```
Expected: push reports both files uploaded.

- [ ] **Step 2: Push the footer group JSON**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
shopify theme push --path theme --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete \
  --only sections/footer-group.json
```
Expected: push reports `footer-group.json` uploaded.

- [ ] **Step 3: Pull-back and confirm both landed (don't trust the banner)**

```bash
cd /Users/saimeda/Documents/Codex/medas/BFC
rm -rf /tmp/bfc-verify && shopify theme pull --path /tmp/bfc-verify --store d9v1pv-06.myshopify.com --theme 151032561833 \
  --only sections/footer-group.json --only sections/bfc-footer.liquid --only assets/sun-stamp.svg
echo "--- group order ---"; grep -A4 '"order"' /tmp/bfc-verify/sections/footer-group.json
echo "--- section exists ---"; grep -c "bfc-footer__top" /tmp/bfc-verify/sections/bfc-footer.liquid
echo "--- asset exists ---"; ls -la /tmp/bfc-verify/assets/sun-stamp.svg
```
Expected: `order` contains only `bfc_footer`; section grep returns `1`; asset listed.

---

## Task 5: Visual QA vs the static site

**Files:**
- Create: `/tmp/bfc-qa/footerqa.mjs` (Playwright screenshot harness)

> Per project memory: validator/push/grep ≠ "looks right". Screenshot the rendered footer and compare to the static site.

- [ ] **Step 1: Write the screenshot harness**

Create `/tmp/bfc-qa/footerqa.mjs`:

```javascript
import { chromium } from 'playwright-core';
const EXEC = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const browser = await chromium.launch({ executablePath: EXEC, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

// Static reference footer
await page.goto('https://satwik-aflo.github.io/BFC/', { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => document.querySelectorAll('.reveal').forEach(e => { e.style.opacity = '1'; e.style.transform = 'none'; }));
await page.locator('footer.footer').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.locator('footer.footer').screenshot({ path: '/tmp/bfc-qa/footer_static.png' });

// Draft theme footer (set preview cookie, then load home)
await page.goto('https://d9v1pv-06.myshopify.com/?preview_theme_id=151032561833', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1500);
await page.goto('https://d9v1pv-06.myshopify.com/', { waitUntil: 'networkidle', timeout: 60000 });
await page.locator('footer.bfc-footer').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.locator('footer.bfc-footer').screenshot({ path: '/tmp/bfc-qa/footer_theme.png' });

const data = await page.evaluate(() => {
  const f = document.querySelector('footer.bfc-footer');
  if (!f) return { found: false };
  const cs = getComputedStyle(f);
  const nav = [...f.querySelectorAll('.bfc-footer__nav a')].map(a => a.textContent.trim());
  const pol = [...f.querySelectorAll('.bfc-footer__policies a')].map(a => a.textContent.trim());
  const bottom = [...f.querySelectorAll('.bfc-footer__bottom span')].map(a => a.textContent.trim());
  return { found: true, bg: cs.backgroundColor, color: cs.color, nav, pol, bottom, hasStamp: !!f.querySelector('.bfc-footer__stamp'), hasSocials: !!f.querySelector('.bfc-footer__socials a') };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
```

- [ ] **Step 2: Run it**

```bash
cd /tmp/bfc-qa && NODE_PATH=/tmp/node_modules node footerqa.mjs
```
Expected JSON: `found: true`, `bg` = `rgb(36, 79, 36)`, `color` = `rgb(251, 243, 204)`, `nav` = `["Our Story","Shop","Reports","Recipes","FAQ"]`, `pol` = the five policy labels, `bottom` = the three meta strings, `hasStamp: true`, `hasSocials: true`.

- [ ] **Step 3: Compare the two screenshots**

Read `/tmp/bfc-qa/footer_static.png` and `/tmp/bfc-qa/footer_theme.png`. Confirm: green band, spinning sun on the left, charm headline with yellow script "super.", email line, Write-to-Us button, right-aligned nav, policies row, bottom meta line. Note any discrepancy (spacing, font, color, missing element).

- [ ] **Step 4: Fix discrepancies if any**

If the screenshot differs from static, edit `theme/sections/bfc-footer.liquid` CSS, re-run Task 4 Step 1 + Task 5 Step 2-3, iterate until it matches. Commit each fix:

```bash
git add theme/sections/bfc-footer.liquid
git commit -m "fix(footer): <specific adjustment>"
```

---

## Self-review notes

- **Spec coverage:** sun stamp (Task 2), CTA+email+button (Task 2), nav incl. FAQ (Task 2), policies row (Task 2), bottom meta (Task 2), socials kept (Task 2 `show_socials`), marquee dropped (Task 3 removes `custom_liquid_bfcfooter`), green band styling (Task 2 stylesheet), deploy (Task 4), visual parity (Task 5). ✅
- **Native footer removal caveat:** retiring Horizon's native `footer` block drops its payment-icons / localization-selector / newsletter affordances. The static footer has none of these, and localization already lives in the header — acceptable per the "match static" goal. Flagged here so it's a conscious choice, not a silent regression.
- **Asset/handle facts** all verified live (HTTP 200) before writing; no placeholders.
```

