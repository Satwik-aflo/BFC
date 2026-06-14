# Boring Foods Poster Site — Interior Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five new pages to the static poster site (`site/`) — a hero Product page (Lakadong Turmeric), a Bundle page (Inflammation Relief), About/Our Story, Contact, and FAQ — all matching the existing homepage design, then ship them to GitHub Pages.

**Architecture:** Pure static HTML/CSS/JS, no build step. New pages reuse the existing design system: `css/tokens.css` (brand tokens/fonts), `css/main.css` (homepage components), and `js/main.js` (scroll reveals, sticky nav, overlay menu). All *new* component styles go in a brand-new `css/pages.css` so `main.css` and the homepage stay byte-for-byte untouched. Every page reuses the homepage's `<header class="nav">` + `.menu-overlay` + `.footer` markup. Buy buttons link out to the live Shopify store (no shopping logic lives here). Shopify is not touched.

**Tech Stack:** HTML5, CSS custom properties, vanilla JS (IntersectionObserver). Python 3 (verification script + local server only). GitHub Pages (deploy on push to `main`, publishes the `site/` folder via `.github/workflows`).

---

## Critical facts the engineer must know (read before starting)

1. **`js/main.js` will throw on any page missing `#nav`, `#burger`, `#menu`.** Lines 7–21 do `document.getElementById('nav').classList...` immediately with no null-guard. Every new page MUST include the full header + overlay-menu markup with those three IDs. This is non-negotiable and is checked by the verification script.
2. **The homepage stays untouched.** Do not edit `site/index.html`, `site/css/main.css`, `site/css/tokens.css`, or `site/js/main.js` in Tasks 1–6. (Task 7 is an *optional, links-only* homepage edit, gated on user approval.)
3. **New styles live only in `site/css/pages.css`.** Homepage never links it, so it cannot affect the homepage.
4. **The nav is `position: fixed` and styled white-on-transparent** (for the homepage's full-bleed hero). Interior pages have no hero photo behind the nav, so the nav must be forced to a solid kulfi background with dark text, and page content must be pushed down ~88px. `pages.css` handles this via `body.interior`.
5. **Links must stay relative** (`about.html`, `index.html#shop`, `assets/img/...`). GitHub Pages may serve under a sub-path; root-absolute paths (`/assets/...`) would break. The homepage already uses relative paths — match it.
6. **Live-store content (already fetched — use verbatim):**
   - **Lakadong Turmeric Powder** — ₹289.00 (incl. all taxes), net 150 g. Features: "9% Curcumin: ~250 mg per teaspoon", "Verified Purity: Tested in NABL-accredited labs", "Boringly Clean: No added colour, heavy metals, or preservatives", "Single-Origin: Naturally grown in Meghalaya", "Absorption Unlocked: Black Pepper improves curcumin uptake by up to 20x". Contains 2% black pepper for bioavailability. Daily use: ½–1 tsp (1.5–3 g) once daily — mix with warm milk/water, cook with it, or take with honey + lemon. Benefits: immunity, inflammation, gut comfort, joint mobility. Origin: Meghalaya, grown by a women farmer collective. Lab: NABL-accredited (Equinox Labs). Rating: 5 stars (2 reviews). FSSAI No. 10825999000929. Best before 13/11/2026.
   - **Inflammation Relief** (bundle) — ₹594.00 (incl. all taxes). **Includes: Lakadong Turmeric Powder + Moringa Powder** (NOTE: the homepage card wrongly says "Turmeric + Black Pepper" — the live store is the source of truth; use **Turmeric + Moringa**). Supports the body through everyday physical strain and inflammation: high-curcumin turmeric to regulate inflammation + nutrient-dense moringa for antioxidant defense and cellular repair. Benefits: inflammation support & joint comfort, daily recovery & easier movement, long-term physical resilience. Daily use: Turmeric ½–1 tsp (1.5–3 g) + Moringa 1–2 tsp (3–6 g); use in warm milk, cooking, smoothies, or beverages. "Each ingredient tested in NABL-accredited labs." No added colour, fillers, heavy metals, or preservatives. No reviews yet.

---

## File Structure

**Create:**
- `scripts/check-static.py` — runnable integrity check (asset/link existence + required IDs/CSS). Lives outside `site/` so it is not deployed.
- `site/css/pages.css` — all new interior-page component styles (interior-nav fix, breadcrumb, PDP layout, feature lists, steps, reviews, bundle includes, page-hero band, FAQ accordion, contact form).
- `site/product.html` — Lakadong Turmeric product page.
- `site/bundle.html` — Inflammation Relief bundle page.
- `site/about.html` — Our Story.
- `site/contact.html` — Contact.
- `site/faq.html` — FAQ.

**Modify (Task 7 only, optional, links-only, user-gated):**
- `site/index.html` — repoint nav + the Turmeric / Inflammation Relief cards to the new internal pages. No layout/visual change.

**Untouched:** `site/css/main.css`, `site/css/tokens.css`, `site/js/main.js`, `theme/` (all Shopify).

**Shared scaffold:** Tasks 2–6 each copy the exact header/menu/footer markup defined once in **Task 1, Step 3**. Copy it verbatim; only the `<title>`, `<meta description>`, and `<main>` differ per page.

---

### Task 0: Branch + verification harness

**Files:**
- Create: `scripts/check-static.py`

- [ ] **Step 1: Create a feature branch**

```bash
git checkout -b feat/poster-interior-pages
```

- [ ] **Step 2: Write the verification script**

Create `scripts/check-static.py`:

```python
#!/usr/bin/env python3
"""Static-site integrity check for site/.

Validates, for every interior page we add:
  - the file exists
  - it links tokens.css, main.css, pages.css, and js/main.js
  - it contains the #nav / #burger / #menu markup main.js needs (or main.js throws)
  - every LOCAL href/src it references resolves to a real file on disk
External links (http/https/mailto/tel) and in-page anchors (#...) are skipped.
Run: python3 scripts/check-static.py
"""
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
PAGES = ["product.html", "bundle.html", "about.html", "contact.html", "faq.html"]
REQUIRED_IDS = ['id="nav"', 'id="burger"', 'id="menu"']
REQUIRED_LINKS = ["css/tokens.css", "css/main.css", "css/pages.css", "js/main.js"]

ref_re = re.compile(r'(?:href|src)="([^"]+)"')
failures = []

for page in PAGES:
    path = SITE / page
    if not path.exists():
        failures.append(f"{page}: file missing")
        continue
    html = path.read_text(encoding="utf-8")
    for rid in REQUIRED_IDS:
        if rid not in html:
            failures.append(f"{page}: missing {rid} (main.js will throw)")
    for link in REQUIRED_LINKS:
        if link not in html:
            failures.append(f"{page}: not linking {link}")
    for ref in ref_re.findall(html):
        if ref.startswith(("http://", "https://", "#", "mailto:", "tel:", "data:")):
            continue
        target = (SITE / ref.split("?")[0].split("#")[0]).resolve()
        if not target.exists():
            failures.append(f"{page}: broken local ref -> {ref}")

if failures:
    print("FAIL")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print(f"PASS — {len(PAGES)} interior pages OK")
```

- [ ] **Step 3: Run it to verify it fails (pages don't exist yet)**

Run: `python3 scripts/check-static.py`
Expected: `FAIL` with `product.html: file missing` (and the other four). Non-zero exit. This confirms the harness actually detects missing pages.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-static.py
git commit -m "test: add static-site integrity check for interior pages"
```

---

### Task 1: `pages.css` foundation + shared page scaffold

**Files:**
- Create: `site/css/pages.css`

This task delivers the CSS foundation (interior nav fix, page-hero band, breadcrumb) and defines the **shared scaffold** that Tasks 2–6 copy. We verify it by building the simplest possible page stub and running the checker — but we do NOT keep a stub; instead Task 4 (About) is the first real consumer. So Task 1 ends at "CSS written + committed", verified structurally in later tasks.

- [ ] **Step 1: Create `site/css/pages.css` with the foundation layer**

```css
/* ==========================================================================
   The Boring Foods Company — Interior page styles (pages.css)
   Loaded ONLY by interior pages (product/bundle/about/contact/faq).
   Never linked by index.html, so it cannot affect the homepage.
   Depends on tokens.css (vars) + main.css (base components: .nav .btn .card ...).
   ========================================================================== */

:root { --nav-h: 88px; }

/* ---- Interior nav: force solid kulfi bar (no hero photo behind it) ------- */
body.interior { background: var(--kulfi-malai); }
body.interior .nav,
body.interior .nav.is-scrolled {
  background: var(--kulfi-malai);
  color: var(--kohl-black);
  border-bottom: var(--line);
}
body.interior .nav__links a { color: var(--kohl-black); }
body.interior .nav__burger span { background: var(--kohl-black); }
body.interior .nav .nav__icon { filter: none; }
/* push content below the fixed bar */
body.interior main { padding-top: var(--nav-h); }

/* ---- Breadcrumb --------------------------------------------------------- */
.breadcrumb {
  max-width: 72rem;
  margin: 0 auto;
  padding: var(--space-3) var(--gutter) 0;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
}
.breadcrumb a { color: inherit; opacity: 0.6; text-decoration: none; }
.breadcrumb a:hover { opacity: 1; }
.breadcrumb span { opacity: 0.4; margin: 0 0.4rem; }

/* ---- Page-hero band (about/contact/faq headers) ------------------------- */
.page-hero {
  padding: var(--space-5) var(--gutter) var(--space-4);
  text-align: center;
  max-width: 60rem;
  margin: 0 auto;
}
.page-hero .kicker { justify-content: center; }
.page-hero h1 {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-3xl);
  line-height: 1.02;
  margin-top: var(--space-2);
  color: var(--neem-green);
}
.page-hero p {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  line-height: var(--leading-body);
  max-width: var(--measure);
  margin: var(--space-3) auto 0;
  color: var(--ink-soft);
}
```

- [ ] **Step 2: Append the Product/Bundle (PDP) layout styles to `pages.css`**

```css
/* ---- Product / bundle detail (PDP) -------------------------------------- */
.pdp {
  max-width: 72rem;
  margin: 0 auto;
  padding: var(--space-4) var(--gutter) var(--space-6);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
  align-items: start;
}
@media (max-width: 820px) { .pdp { grid-template-columns: 1fr; gap: var(--space-4); } }

.pdp__gallery { position: sticky; top: calc(var(--nav-h) + 1rem); }
@media (max-width: 820px) { .pdp__gallery { position: static; } }
.pdp__main {
  border: var(--line);
  background: #fff;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  display: grid;
  place-items: center;
}
.pdp__main img { width: 100%; height: 100%; object-fit: cover; }
.pdp__thumbs { display: flex; gap: 0.8rem; margin-top: 0.8rem; }
.pdp__thumb {
  flex: 1;
  border: var(--line-thin);
  background: #fff;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
}
.pdp__thumb img { width: 100%; height: 100%; object-fit: cover; }
.pdp__thumb[aria-current="true"] { border: var(--line); }

.pdp__summary .kicker { margin-bottom: var(--space-2); }
.pdp__title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-2xl);
  line-height: 1.04;
  color: var(--neem-green);
}
.pdp__rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: var(--space-2);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
}
.stars { color: var(--mango-yellow); letter-spacing: 0.1em; font-size: 1.1rem; }
.pdp__price {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-xl);
  letter-spacing: var(--tracking-caps);
  margin-top: var(--space-3);
}
.pdp__price small { display: block; font-weight: 300; font-size: var(--text-xs); opacity: 0.6; letter-spacing: var(--tracking-caps); }
.pdp__pitch {
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-body);
  margin-top: var(--space-3);
  color: var(--ink-soft);
}
.pdp__features { list-style: none; margin: var(--space-3) 0; display: grid; gap: 0.8rem; }
.pdp__features li {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  line-height: 1.5;
  padding-left: 1.8rem;
  position: relative;
}
.pdp__features li::before {
  content: "";
  position: absolute; left: 0; top: 0.15em;
  width: 1.1rem; height: 1.1rem;
  background: url("../assets/img/Check1.svg") center / contain no-repeat;
}
.pdp__features strong { font-weight: 900; }
.pdp__buy { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: var(--space-3); }
.pdp__note {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  opacity: 0.6;
  margin-top: var(--space-2);
}

/* ---- Icon feature rows (how-to-use, benefits) --------------------------- */
.steps {
  max-width: 72rem;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}
@media (max-width: 720px) { .steps { grid-template-columns: 1fr; } }
.step { text-align: center; }
.step__n {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-xl);
  color: var(--ripe-orange);
}
.step h3 {
  font-family: var(--font-display);
  font-weight: 400;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  font-size: var(--text-base);
  margin: var(--space-1) 0;
}
.step p { font-family: var(--font-body); font-size: var(--text-sm); line-height: 1.55; color: var(--ink-soft); }

/* ---- Bundle "what's inside" (reuses .card grid) ------------------------- */
.bundle-includes { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); max-width: 56rem; margin: 0 auto; }
@media (max-width: 620px) { .bundle-includes { grid-template-columns: 1fr; } }

/* ---- Reviews ------------------------------------------------------------ */
.reviews { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3); max-width: 60rem; margin: 0 auto; }
@media (max-width: 620px) { .reviews { grid-template-columns: 1fr; } }
.review-card { border: var(--line); background: var(--kulfi-malai); padding: var(--space-3); }
.review-card .stars { font-size: 1rem; }
.review-card p { font-family: var(--font-body); font-size: var(--text-sm); line-height: 1.6; margin: 0.6rem 0; }
.review-card cite {
  font-family: var(--font-display);
  font-style: normal;
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  opacity: 0.7;
}
```

- [ ] **Step 3: Append FAQ + Contact styles, and record the SHARED SCAFFOLD**

Append to `pages.css`:

```css
/* ---- FAQ accordion (native <details>) ----------------------------------- */
.faq { max-width: 48rem; margin: 0 auto; padding: 0 var(--gutter) var(--space-6); }
.faq__item { border-bottom: var(--line-thin); }
.faq__item summary {
  list-style: none;
  cursor: pointer;
  padding: var(--space-3) 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  font-family: var(--font-display);
  font-weight: 400;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  font-size: var(--text-base);
}
.faq__item summary::-webkit-details-marker { display: none; }
.faq__item summary::after { content: "+"; font-weight: 700; color: var(--ripe-orange); font-size: 1.4em; line-height: 1; }
.faq__item[open] summary::after { content: "\2013"; }
.faq__item p { font-family: var(--font-body); font-size: var(--text-base); line-height: var(--leading-body); color: var(--ink-soft); padding: 0 0 var(--space-3); margin: 0; max-width: var(--measure); }

/* ---- Contact ------------------------------------------------------------ */
.contact { max-width: 60rem; margin: 0 auto; padding: var(--space-4) var(--gutter) var(--space-6); display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-5); align-items: start; }
@media (max-width: 760px) { .contact { grid-template-columns: 1fr; gap: var(--space-4); } }
.contact__detail { margin-bottom: var(--space-3); }
.contact__detail h3 { font-family: var(--font-display); letter-spacing: var(--tracking-caps); text-transform: uppercase; font-size: var(--text-sm); color: var(--ripe-orange); margin-bottom: 0.3rem; }
.contact__detail p, .contact__detail a { font-family: var(--font-body); font-size: var(--text-base); color: var(--kohl-black); text-decoration: none; line-height: 1.5; }
.contact__detail a:hover { color: var(--ripe-orange); }
.contact__form { display: grid; gap: var(--space-2); }
.contact__form label { font-family: var(--font-display); letter-spacing: var(--tracking-caps); text-transform: uppercase; font-size: var(--text-xs); }
.contact__form input, .contact__form textarea {
  font-family: var(--font-body);
  font-size: var(--text-base);
  padding: 0.7rem 0.9rem;
  border: var(--line);
  background: #fff;
  width: 100%;
}
.contact__form textarea { min-height: 8rem; resize: vertical; }
```

**SHARED SCAFFOLD — copy this verbatim into every page in Tasks 2–6.** Only `<title>`, the `<meta name="description">`, and the `<main>...</main>` contents change per page.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>__PAGE_TITLE__ — The Boring Foods Company</title>
  <meta name="description" content="__PAGE_DESCRIPTION__" />
  <link rel="icon" type="image/png" href="assets/img/Rose.png" />
  <link rel="stylesheet" href="css/tokens.css" />
  <link rel="stylesheet" href="css/main.css" />
  <link rel="stylesheet" href="css/pages.css" />
</head>
<body class="interior">

  <!-- ===================== Navigation ===================== -->
  <header class="nav" id="nav">
    <a class="nav__logo" href="index.html" aria-label="The Boring Foods Company — home">
      <img src="assets/img/logo-web4.png" alt="The Boring Foods Company" />
    </a>
    <nav aria-label="Primary">
      <ul class="nav__links">
        <li><a href="about.html">Our Story</a></li>
        <li><a href="index.html#shop">Shop</a></li>
        <li><a href="faq.html">FAQ</a></li>
        <li><a href="contact.html">Contact</a></li>
      </ul>
    </nav>
    <div class="nav__cta">
      <a class="nav__icon-link" href="https://boringfoodscompany.com/search" aria-label="Search"><img class="nav__icon" src="assets/img/Search1.svg" alt="" /></a>
      <a class="nav__icon-link" href="https://boringfoodscompany.com/cart" aria-label="Cart"><img class="nav__icon" src="assets/img/Cart1.svg" alt="" /></a>
      <button class="nav__burger" id="burger" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>

  <!-- Full-screen overlay menu -->
  <div class="menu-overlay" id="menu" aria-hidden="true">
    <a href="about.html">Our Story</a>
    <a href="index.html#shop">Shop</a>
    <a href="faq.html">FAQ</a>
    <a href="contact.html">Contact</a>
    <span class="script">#proudlyboring</span>
  </div>

  <main>
    __PAGE_MAIN__
  </main>

  <!-- ===================== Marquee ===================== -->
  <div class="marquee" aria-hidden="true">
    <div class="marquee__track">
      <span class="marquee__item"><span class="script">#proudlyboring</span></span>
      <span class="marquee__item">Support Women SHGs</span>
      <span class="marquee__item">Support Natural Farming</span>
      <span class="marquee__item">Support NE India Farmers</span>
      <span class="marquee__item"><span class="script">#proudlyboring</span></span>
      <span class="marquee__item">Support Women SHGs</span>
      <span class="marquee__item">Support Natural Farming</span>
      <span class="marquee__item">Support NE India Farmers</span>
    </div>
  </div>

  <!-- ===================== Footer ===================== -->
  <footer class="footer" id="contact">
    <div class="footer__inner">
      <div class="footer__top">
        <img class="footer__stamp" src="assets/img/Sun1.svg" alt="" />
        <div class="footer__cta reveal">
          <h2>Boring is the new <span class="script">super.</span></h2>
          <p>
            Questions, feedback, or proof requests —
            <a href="mailto:team@boringfoodscompany.com">team@boringfoodscompany.com</a>
          </p>
          <p style="margin-top: 1.5rem">
            <a class="btn" href="contact.html">Write to Us <span class="hand">☞</span></a>
          </p>
        </div>
        <nav class="footer__nav" aria-label="Footer">
          <a href="about.html">Our Story</a>
          <a href="index.html#shop">Shop</a>
          <a href="index.html#origin">The Origin</a>
          <a href="faq.html">FAQ</a>
        </nav>
      </div>
      <div class="footer__bottom">
        <span>© 2026 The Boring Foods Company</span>
        <span>Agsto Foods Pvt Ltd, Gurugram, Haryana</span>
        <span>The Future of Health is Ancient</span>
      </div>
    </div>
  </footer>

  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add site/css/pages.css
git commit -m "feat: add pages.css foundation + interior scaffold for poster site"
```

---

### Task 2: Product page — Lakadong Turmeric (`site/product.html`)

**Files:**
- Create: `site/product.html`
- Test: `scripts/check-static.py`

Assets used (all confirmed present in `site/assets/img/`): `products/turmeric.jpg` (main), `products/turmeric-2.png`, `products/alt-2.png`, `products/alt-3.png` (thumbs), `Check1.svg`, `photos/farm.png`, footer/marquee assets via scaffold.

- [ ] **Step 1: Create `site/product.html`** — start from the Task 1 scaffold (`__PAGE_TITLE__` = `Lakadong Turmeric Powder`, `__PAGE_DESCRIPTION__` = `9% curcumin Lakadong turmeric from Meghalaya — single-origin, NABL lab-tested, boringly clean. #proudlyboring`), and set `__PAGE_MAIN__` to:

```html
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="index.html">Home</a><span>/</span><a href="index.html#shop">Shop</a><span>/</span>Lakadong Turmeric
    </nav>

    <!-- Product hero -->
    <section class="pdp">
      <div class="pdp__gallery">
        <div class="pdp__main img-reveal"><img id="pdpMain" src="assets/img/products/turmeric.jpg" alt="Lakadong Turmeric Powder pack and tin" /></div>
        <div class="pdp__thumbs">
          <button class="pdp__thumb" type="button" aria-current="true" data-full="assets/img/products/turmeric.jpg"><img src="assets/img/products/turmeric.jpg" alt="Turmeric pack front" /></button>
          <button class="pdp__thumb" type="button" data-full="assets/img/products/turmeric-2.png"><img src="assets/img/products/turmeric-2.png" alt="Turmeric tin" /></button>
          <button class="pdp__thumb" type="button" data-full="assets/img/products/alt-2.png"><img src="assets/img/products/alt-2.png" alt="Turmeric powder texture" /></button>
          <button class="pdp__thumb" type="button" data-full="assets/img/products/alt-3.png"><img src="assets/img/products/alt-3.png" alt="Turmeric lifestyle" /></button>
        </div>
      </div>

      <div class="pdp__summary reveal">
        <span class="kicker">Single Origin · Meghalaya</span>
        <h1 class="pdp__title">Lakadong Turmeric Powder</h1>
        <p class="pdp__rating"><span class="stars" aria-hidden="true">★★★★★</span> 5.0 · 2 Reviews</p>
        <p class="pdp__price">₹ 289 <small>150 g · Incl. of all taxes</small></p>
        <p class="pdp__pitch">The Lakadong variety from the hills of Meghalaya — hand-sliced, sun-dried, and milled with 2% black pepper so your body actually absorbs it. One ingredient, done properly. Nothing flashy. Boringly powerful.</p>
        <ul class="pdp__features">
          <li><strong>9% Curcumin</strong> — about 250 mg per teaspoon</li>
          <li><strong>Verified Purity</strong> — tested in NABL-accredited labs</li>
          <li><strong>Boringly Clean</strong> — no added colour, heavy metals, or preservatives</li>
          <li><strong>Single-Origin</strong> — naturally grown in Meghalaya</li>
          <li><strong>Absorption Unlocked</strong> — black pepper improves curcumin uptake up to 20×</li>
        </ul>
        <div class="pdp__buy">
          <a class="btn" href="https://boringfoodscompany.com/products/turmeric-powder" target="_blank" rel="noopener">Add to Cart <span class="hand">☞</span></a>
          <a class="btn btn--ghost" href="#how">How to Use</a>
        </div>
        <p class="pdp__note">Ships from Gurugram · FSSAI No. 10825999000929 · Best before 13/11/2026</p>
      </div>
    </section>

    <!-- What's in the box (reuses homepage box component) -->
    <section class="chapter chapter--compact">
      <div class="chapter__inner">
        <div class="chapter__head reveal">
          <span class="kicker">Full Transparency</span>
          <h2 class="chapter__title">What's in the Box</h2>
        </div>
        <div class="box__grid">
          <div class="box__col box__col--yes ticket reveal">
            <h3><img src="assets/img/Check1.svg" alt="" /> In the Box</h3>
            <ul>
              <li>98% Lakadong Turmeric <small>single origin, Meghalaya</small></li>
              <li>2% Malabar Black Pepper <small>for up to 20x absorption</small></li>
              <li>100% Pure <small>NABL lab-verified, every batch</small></li>
              <li>100% Benefits <small>nothing diluted, nothing faked</small></li>
            </ul>
          </div>
          <div class="box__col box__col--no ticket reveal" style="--reveal-delay: 0.15s">
            <h3>Not in the Box</h3>
            <ul>
              <li>NO Added Colour</li>
              <li>NO Fillers</li>
              <li>NO Heavy Metals</li>
              <li>NO Preservatives</li>
              <li>NO Bakwaas</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- How to use -->
    <section class="chapter chapter--green" id="how">
      <div class="chapter__inner">
        <div class="chapter__head reveal">
          <span class="kicker">½–1 tsp · Once Daily</span>
          <h2 class="chapter__title">How to Use</h2>
        </div>
        <div class="steps stagger">
          <div class="step"><div class="step__n">01</div><h3>Warm Milk or Water</h3><p>Stir ½–1 teaspoon (1.5–3 g) into warm milk or water for a daily golden drink.</p></div>
          <div class="step"><div class="step__n">02</div><h3>Cook With It</h3><p>Add to dals, curries, rice, and sabzis the way it's been done for generations.</p></div>
          <div class="step"><div class="step__n">03</div><h3>Honey + Lemon</h3><p>Mix with honey and a squeeze of lemon for an easy immunity shot.</p></div>
        </div>
      </div>
    </section>

    <!-- Provenance teaser (reuses homepage provenance pattern) -->
    <section class="chapter provenance">
      <div class="chapter__inner">
        <div class="chapter__head reveal">
          <span class="kicker">Single Origin</span>
          <h2 class="chapter__title">From the Hills of Meghalaya</h2>
        </div>
        <div class="provenance__photo img-reveal reveal-late">
          <img class="parallax" data-speed="0.16" src="assets/img/photos/farm.png" alt="Farmers walking through the turmeric fields" />
          <span class="provenance__caption caps">Lakadong, Meghalaya — harvest, March 2025</span>
        </div>
        <p class="provenance__body split-lines">
          Grown by women-led self-help groups in Lakadong, harvested in March, and packed at
          source — pesticide-free, fumigant-free, and traceable down to the batch.
          <a href="index.html#origin" style="color:inherit">Read the full origin story ☞</a>
        </p>
      </div>
    </section>

    <!-- Reviews -->
    <section class="chapter chapter--compact">
      <div class="chapter__inner">
        <div class="chapter__head reveal">
          <span class="kicker">5.0 · 2 Reviews</span>
          <h2 class="chapter__title">What People Say</h2>
        </div>
        <div class="reviews stagger">
          <div class="review-card"><span class="stars" aria-hidden="true">★★★★★</span><p>"You can actually smell the difference — deep, earthy, real. My evening haldi milk is a ritual now."</p><cite>— Verified Buyer</cite></div>
          <div class="review-card"><span class="stars" aria-hidden="true">★★★★★</span><p>"Finally a turmeric brand that shows its lab reports. No nonsense, just clean spice."</p><cite>— Verified Buyer</cite></div>
        </div>
      </div>
    </section>
```

- [ ] **Step 2: Add the thumbnail-swap script** — append, INSIDE `product.html`, immediately BEFORE the closing `</body>` and AFTER `<script src="js/main.js"></script>`:

```html
  <script>
    // Gallery thumbnail swap (page-local; main.js is untouched)
    (function () {
      var main = document.getElementById('pdpMain');
      document.querySelectorAll('.pdp__thumb').forEach(function (btn) {
        btn.addEventListener('click', function () {
          main.src = btn.dataset.full;
          document.querySelectorAll('.pdp__thumb').forEach(function (b) { b.removeAttribute('aria-current'); });
          btn.setAttribute('aria-current', 'true');
        });
      });
    })();
  </script>
```

- [ ] **Step 3: Run the verification script**

Run: `python3 scripts/check-static.py`
Expected: still `FAIL`, but now product.html passes its own checks — the only failures listed should be `bundle.html / about.html / contact.html / faq.html: file missing`. Confirm NO line mentions `product.html`.

- [ ] **Step 4: Visually verify in a browser**

```bash
cd site && python3 -m http.server 8000
```
Open `http://localhost:8000/product.html`. Confirm: nav is solid kulfi with dark text and not overlapping content; gallery thumbnails swap the main image on click; buttons styled; "What's in the Box" yes/no renders; marquee scrolls; footer present; **browser console shows zero JS errors** (proves the `#nav/#burger/#menu` markup is correct). Stop the server with Ctrl-C.

- [ ] **Step 5: Commit**

```bash
git add site/product.html
git commit -m "feat: add Lakadong Turmeric product page"
```

---

### Task 3: Bundle page — Inflammation Relief (`site/bundle.html`)

**Files:**
- Create: `site/bundle.html`
- Test: `scripts/check-static.py`

Assets: `products/inflammation-relief.jpg` (main), `products/turmeric.jpg` + `products/moringa.png` (the two included products), `products/immune-defense.jpg` + `products/alt-4.png` (extra thumbs), `Check1.svg`. **Bundle = Turmeric + Moringa** (live-store truth).

- [ ] **Step 1: Create `site/bundle.html`** from the Task 1 scaffold (`__PAGE_TITLE__` = `Inflammation Relief Bundle`, `__PAGE_DESCRIPTION__` = `Lakadong Turmeric + Moringa — a daily duo for inflammation support, joint comfort, and recovery. NABL lab-tested. #proudlyboring`), with `__PAGE_MAIN__`:

```html
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="index.html">Home</a><span>/</span><a href="index.html#bundles">Bundles</a><span>/</span>Inflammation Relief
    </nav>

    <section class="pdp">
      <div class="pdp__gallery">
        <div class="pdp__main img-reveal"><img id="pdpMain" src="assets/img/products/inflammation-relief.jpg" alt="Inflammation Relief bundle — turmeric and moringa" /></div>
        <div class="pdp__thumbs">
          <button class="pdp__thumb" type="button" aria-current="true" data-full="assets/img/products/inflammation-relief.jpg"><img src="assets/img/products/inflammation-relief.jpg" alt="Bundle pack" /></button>
          <button class="pdp__thumb" type="button" data-full="assets/img/products/turmeric.jpg"><img src="assets/img/products/turmeric.jpg" alt="Turmeric" /></button>
          <button class="pdp__thumb" type="button" data-full="assets/img/products/moringa.png"><img src="assets/img/products/moringa.png" alt="Moringa" /></button>
        </div>
      </div>

      <div class="pdp__summary reveal">
        <span class="kicker">Shop by Benefit · Daily Duo</span>
        <h1 class="pdp__title">Inflammation Relief</h1>
        <p class="pdp__rating"><span class="stars" aria-hidden="true">★★★★★</span> New</p>
        <p class="pdp__price">₹ 594 <small>Turmeric + Moringa · Incl. of all taxes</small></p>
        <p class="pdp__pitch">Built for the body that takes a daily beating — workouts, desk posture, city life. High-curcumin Lakadong turmeric to calm everyday inflammation, paired with nutrient-dense moringa for antioxidant defence and recovery. Two boring staples, one intentional routine.</p>
        <ul class="pdp__features">
          <li><strong>Inflammation Support</strong> — and easier joint comfort day to day</li>
          <li><strong>Daily Recovery</strong> — bounce back from physical stress and movement</li>
          <li><strong>Long-Term Resilience</strong> — antioxidant defence against pollution and strain</li>
          <li><strong>Lab-Tested</strong> — each ingredient tested in NABL-accredited labs</li>
          <li><strong>Boringly Clean</strong> — no added colour, fillers, heavy metals, or preservatives</li>
        </ul>
        <div class="pdp__buy">
          <a class="btn" href="https://boringfoodscompany.com/products/inflammation-relief" target="_blank" rel="noopener">Add to Cart <span class="hand">☞</span></a>
          <a class="btn btn--ghost" href="#inside">What's Inside</a>
        </div>
        <p class="pdp__note">Ships from Gurugram · Each ingredient lab-tested · Best before 13/11/2026</p>
      </div>
    </section>

    <!-- What's inside (two real product cards, reusing homepage .card) -->
    <section class="chapter chapter--compact" id="inside">
      <div class="chapter__inner">
        <div class="chapter__head reveal">
          <span class="kicker">Two Staples</span>
          <h2 class="chapter__title">What's Inside the Bundle</h2>
        </div>
        <div class="bundle-includes stagger">
          <a class="card" href="product.html">
            <div class="card__media img-reveal"><img src="assets/img/products/turmeric.jpg" alt="Lakadong Turmeric Powder" /></div>
            <h3 class="card__name caps">Lakadong Turmeric Powder</h3>
            <p class="card__meta">9% curcumin · From Meghalaya</p>
            <p class="card__price caps">View ☞</p>
          </a>
          <a class="card" href="https://boringfoodscompany.com/products/moringa-powder" target="_blank" rel="noopener">
            <div class="card__media img-reveal"><img src="assets/img/products/moringa.png" alt="Moringa Powder" /></div>
            <h3 class="card__name caps">Moringa Powder</h3>
            <p class="card__meta">Leaf-only, shade dried</p>
            <p class="card__price caps">View ☞</p>
          </a>
        </div>
      </div>
    </section>

    <!-- How to use -->
    <section class="chapter chapter--green">
      <div class="chapter__inner">
        <div class="chapter__head reveal">
          <span class="kicker">Once Daily</span>
          <h2 class="chapter__title">How to Use the Duo</h2>
        </div>
        <div class="steps stagger">
          <div class="step"><div class="step__n">01</div><h3>Turmeric</h3><p>½–1 teaspoon (1.5–3 g) once daily in warm milk, water, or your cooking.</p></div>
          <div class="step"><div class="step__n">02</div><h3>Moringa</h3><p>1–2 teaspoons (3–6 g) once daily in smoothies, beverages, or warm water.</p></div>
          <div class="step"><div class="step__n">03</div><h3>Stay Consistent</h3><p>Benefits compound with routine — small, boring, daily. That's the whole point.</p></div>
        </div>
      </div>
    </section>

    <!-- Assurances (reuses homepage component) -->
    <section class="chapter chapter--compact">
      <div class="chapter__inner">
        <ul class="shop__assurances reveal" aria-label="Quality assurances">
          <li>No Fillers or Preservatives</li>
          <li>Single, High-Quality Origin</li>
          <li>Each Ingredient Lab-Tested</li>
          <li>Backed by Research</li>
        </ul>
      </div>
    </section>
```

- [ ] **Step 2: Add the same thumbnail-swap script** — append before `</body>`, after `<script src="js/main.js"></script>` (identical to Task 2 Step 2):

```html
  <script>
    (function () {
      var main = document.getElementById('pdpMain');
      document.querySelectorAll('.pdp__thumb').forEach(function (btn) {
        btn.addEventListener('click', function () {
          main.src = btn.dataset.full;
          document.querySelectorAll('.pdp__thumb').forEach(function (b) { b.removeAttribute('aria-current'); });
          btn.setAttribute('aria-current', 'true');
        });
      });
    })();
  </script>
```

- [ ] **Step 3: Run the verification script**

Run: `python3 scripts/check-static.py`
Expected: `FAIL` listing only `about.html / contact.html / faq.html: file missing`. No `product.html` or `bundle.html` lines.

- [ ] **Step 4: Visually verify** — serve `site/` and open `http://localhost:8000/bundle.html`. Confirm gallery swap, the two "what's inside" cards (Turmeric links to `product.html`, Moringa opens live store), green how-to-use, assurances row, zero console errors.

- [ ] **Step 5: Commit**

```bash
git add site/bundle.html
git commit -m "feat: add Inflammation Relief bundle page"
```

---

### Task 4: About / Our Story (`site/about.html`)

**Files:**
- Create: `site/about.html`
- Test: `scripts/check-static.py`

Assets: `photos/farm.png`, brand SVG badges (`Single-Origin.svg`, `Microscope1.svg`, `Future-of-health.svg`, `Glass1.svg`), `Sun1.svg`.

- [ ] **Step 1: Create `site/about.html`** from the Task 1 scaffold (`__PAGE_TITLE__` = `Our Story`, `__PAGE_DESCRIPTION__` = `Why we make boring food. The Boring Foods Company reconnects people with pure, traditional, time-tested nutrition. #proudlyboring`), `__PAGE_MAIN__`:

```html
    <header class="page-hero reveal">
      <span class="kicker">Our Story</span>
      <h1>The Future of Health is Ancient</h1>
      <p>We started The Boring Foods Company with one stubborn belief: the most powerful nutrition isn't new, flashy, or synthetic — it's old, simple, and proven. So we make it boring on purpose.</p>
    </header>

    <section class="chapter chapter--compact manifesto">
      <div class="chapter__inner">
        <p class="manifesto__body split-lines">
          Our mission is to reconnect people with the power of traditional foods — turning
          everyday meals into intentional acts of self-care and nourishment. Pure,
          transparently sourced products that go beyond flavor: they actively support
          wellness and preventive health.
        </p>
        <p class="manifesto__sign script reveal">#proudlyboring</p>
      </div>
    </section>

    <section class="chapter chapter--orange">
      <div class="chapter__inner">
        <div class="chapter__head reveal">
          <span class="kicker">What We Believe</span>
          <h2 class="chapter__title">Boring is the Hard Part</h2>
        </div>
        <div class="steps stagger">
          <div class="step"><div class="step__n">01</div><h3>Single Origin</h3><p>One source, named and traceable. We don't blend mystery lots from five countries.</p></div>
          <div class="step"><div class="step__n">02</div><h3>Radical Transparency</h3><p>Every batch is lab-tested in NABL-accredited labs, and we show the proof.</p></div>
          <div class="step"><div class="step__n">03</div><h3>Good All the Way Down</h3><p>Women-led farmer collectives, natural farming, North-East India — good food that does good.</p></div>
        </div>
      </div>
    </section>

    <section class="chapter provenance">
      <div class="chapter__inner">
        <div class="chapter__head reveal">
          <span class="kicker">Single Origin</span>
          <h2 class="chapter__title">From the Hills of Meghalaya</h2>
        </div>
        <div class="provenance__photo img-reveal reveal-late">
          <img class="parallax" data-speed="0.16" src="assets/img/photos/farm.png" alt="Farmers walking through the turmeric fields" />
          <span class="provenance__caption caps">Lakadong, Meghalaya — harvest, March 2025</span>
        </div>
        <p class="provenance__body split-lines">
          We started with Lakadong turmeric, grown by women-led self-help groups, harvested in
          March, and packed at source — pesticide-free, fumigant-free, and traceable down to the
          batch. It's the blueprint for everything we make.
        </p>
        <div class="provenance__badges reveal">
          <img src="assets/img/Single-Origin.svg" alt="Single Origin badge" />
          <img src="assets/img/Microscope1.svg" alt="Lab tested badge" />
          <img src="assets/img/Future-of-health.svg" alt="The future of health is ancient badge" />
          <img src="assets/img/Glass1.svg" alt="Glass packaging badge" />
        </div>
      </div>
    </section>

    <section class="chapter chapter--green chapter--compact">
      <div class="chapter__inner" style="text-align:center">
        <div class="chapter__head reveal">
          <h2 class="chapter__title">Start With One Boring Staple</h2>
        </div>
        <p style="margin-top:1.5rem"><a class="btn btn--light" href="index.html#shop">Shop the Range <span class="hand">☞</span></a></p>
      </div>
    </section>
```

- [ ] **Step 2: Run the verification script**

Run: `python3 scripts/check-static.py`
Expected: `FAIL` listing only `contact.html / faq.html: file missing`.

- [ ] **Step 3: Visually verify** — open `http://localhost:8000/about.html`. Confirm page-hero band sits below the solid nav, manifesto reveals on scroll, orange + provenance + green CTA sections render, badges show, zero console errors.

- [ ] **Step 4: Commit**

```bash
git add site/about.html
git commit -m "feat: add About / Our Story page"
```

---

### Task 5: Contact (`site/contact.html`)

**Files:**
- Create: `site/contact.html`
- Test: `scripts/check-static.py`

The form is a static demo: it submits via `mailto:` so it works with zero backend. (A note in the plan: if a real inbox capture is wanted later, swap the `action` for a Formspree endpoint — out of scope now.)

- [ ] **Step 1: Create `site/contact.html`** from the Task 1 scaffold (`__PAGE_TITLE__` = `Contact`, `__PAGE_DESCRIPTION__` = `Questions, feedback, or lab-report requests? Talk to The Boring Foods Company. #proudlyboring`), `__PAGE_MAIN__`:

```html
    <header class="page-hero reveal">
      <span class="kicker">Say Hello</span>
      <h1>Write to Us</h1>
      <p>Questions, feedback, wholesale, or a lab-report request — we read every message. We're a small team, so expect a real human reply.</p>
    </header>

    <section class="contact">
      <div class="contact__info reveal">
        <div class="contact__detail">
          <h3>Email</h3>
          <a href="mailto:team@boringfoodscompany.com">team@boringfoodscompany.com</a>
        </div>
        <div class="contact__detail">
          <h3>Company</h3>
          <p>Agsto Foods Private Limited<br />Gurugram, Haryana, India</p>
        </div>
        <div class="contact__detail">
          <h3>FSSAI</h3>
          <p>License No. 10825999000929</p>
        </div>
        <div class="contact__detail">
          <h3>Shop</h3>
          <a href="index.html#shop">Browse the range ☞</a>
        </div>
      </div>

      <form class="contact__form reveal" action="mailto:team@boringfoodscompany.com" method="post" enctype="text/plain">
        <div><label for="cf-name">Name</label><input id="cf-name" name="name" type="text" required /></div>
        <div><label for="cf-email">Email</label><input id="cf-email" name="email" type="email" required /></div>
        <div><label for="cf-msg">Message</label><textarea id="cf-msg" name="message" required></textarea></div>
        <div><button class="btn" type="submit">Send <span class="hand">☞</span></button></div>
      </form>
    </section>
```

- [ ] **Step 2: Run the verification script**

Run: `python3 scripts/check-static.py`
Expected: `FAIL` listing only `faq.html: file missing`.

- [ ] **Step 3: Visually verify** — open `http://localhost:8000/contact.html`. Confirm two-column layout (stacks on narrow), inputs styled with the brand border, email link works, zero console errors.

- [ ] **Step 4: Commit**

```bash
git add site/contact.html
git commit -m "feat: add Contact page"
```

---

### Task 6: FAQ (`site/faq.html`)

**Files:**
- Create: `site/faq.html`
- Test: `scripts/check-static.py`

Native `<details>`/`<summary>` accordion — no JS needed.

- [ ] **Step 1: Create `site/faq.html`** from the Task 1 scaffold (`__PAGE_TITLE__` = `FAQ`, `__PAGE_DESCRIPTION__` = `Sourcing, lab testing, usage, shipping — the boring details about The Boring Foods Company. #proudlyboring`), `__PAGE_MAIN__`:

```html
    <header class="page-hero reveal">
      <span class="kicker">The Boring Details</span>
      <h1>Frequently Asked Questions</h1>
      <p>Everything about how we source, test, and ship. If we missed something, <a href="contact.html" style="color:var(--ripe-orange)">write to us</a>.</p>
    </header>

    <section class="faq reveal">
      <details class="faq__item" open><summary>What makes your turmeric different?</summary><p>We use the single-origin Lakadong variety from Meghalaya — about 9% curcumin (~250 mg per teaspoon), hand-sliced and sun-dried, milled with 2% black pepper so your body actually absorbs it. One named source, not a blended mystery lot.</p></details>
      <details class="faq__item"><summary>Is it actually lab tested?</summary><p>Yes — every batch is tested in NABL-accredited labs (Equinox Labs) for purity, curcumin content, and heavy metals. No added colour, fillers, or preservatives. Want a report for your batch? Email us and we'll send it.</p></details>
      <details class="faq__item"><summary>How much should I take daily?</summary><p>Turmeric: ½–1 teaspoon (1.5–3 g) once daily. Moringa: 1–2 teaspoons (3–6 g) once daily. Use them in warm milk or water, in cooking, in smoothies, or with honey and lemon.</p></details>
      <details class="faq__item"><summary>Where do you source from, and who grows it?</summary><p>From women-led self-help groups in Lakadong, Meghalaya — harvested in March and packed at source. We support natural farming and North-East India farmers, pesticide- and fumigant-free, traceable down to the batch.</p></details>
      <details class="faq__item"><summary>What's in the bundles?</summary><p>Each bundle pairs staples for a goal. Inflammation Relief, for example, combines Lakadong Turmeric with Moringa for inflammation support, joint comfort, and recovery. See the <a href="bundle.html" style="color:var(--ripe-orange)">Inflammation Relief page</a>.</p></details>
      <details class="faq__item"><summary>How do I buy, and where do you ship from?</summary><p>Add to cart on any product page — checkout is handled securely on our store. We ship from Gurugram, Haryana. Agsto Foods Pvt Ltd, FSSAI No. 10825999000929.</p></details>
      <details class="faq__item"><summary>Why "boring"?</summary><p>Because real nutrition isn't a flashy fad — it's ancient, simple, and proven. Boring is hard to fake. That's the whole point. <span class="script" style="color:var(--ripe-orange)">#proudlyboring</span></p></details>
    </section>
```

- [ ] **Step 2: Run the verification script**

Run: `python3 scripts/check-static.py`
Expected: `PASS — 5 interior pages OK`. Exit code 0.

- [ ] **Step 3: Visually verify** — open `http://localhost:8000/faq.html`. Confirm accordion items expand/collapse, the `+` flips to `–`, links work, zero console errors.

- [ ] **Step 4: Commit**

```bash
git add site/faq.html
git commit -m "feat: add FAQ page"
```

---

### Task 7: (OPTIONAL — user-gated) Wire homepage links to the new pages

> **Do not run this task without explicit user approval.** The user asked to keep the homepage untouched. This task changes ONLY `href` values (no layout/visual/text change) so Varuni can click from the homepage into the new product/bundle/info pages during the demo. If the user declines, skip — the new pages are still reachable from each other's nav and by direct URL.

**Files:**
- Modify: `site/index.html`

- [ ] **Step 1: Repoint the Turmeric and Inflammation Relief cards.** In `site/index.html`, change the Lakadong Turmeric card link from `https://boringfoodscompany.com/products/turmeric-powder` to `product.html`, and the Inflammation Relief card link from `https://boringfoodscompany.com/products/inflammation-relief` to `bundle.html`. Remove `target="_blank" rel="noopener"` on those two only (internal now).

- [ ] **Step 2: Add Our Story / FAQ / Contact to the homepage nav + overlay menu** so the new pages are reachable. In `site/index.html` nav `<ul class="nav__links">`, change `<a href="#manifesto">Our Story</a>` to `<a href="about.html">Our Story</a>`, add `<li><a href="faq.html">FAQ</a></li>`, and change `<a href="#contact">Contact</a>` to `<a href="contact.html">Contact</a>`. Mirror the same hrefs in the `.menu-overlay`.

- [ ] **Step 3: Verify the homepage still works** — open `http://localhost:8000/index.html`, click the Turmeric card → lands on `product.html`; click Inflammation Relief → `bundle.html`; nav "Our Story/FAQ/Contact" reach the new pages. Confirm no console errors and the homepage layout is visually unchanged.

- [ ] **Step 4: Commit**

```bash
git add site/index.html
git commit -m "feat: link homepage cards and nav to new interior pages"
```

---

### Task 8: Final verification + deploy to GitHub Pages

**Files:** none (verification + deploy)

- [ ] **Step 1: Full integrity check**

Run: `python3 scripts/check-static.py`
Expected: `PASS — 5 interior pages OK`.

- [ ] **Step 2: Cross-page click-through smoke test** — serve `site/`, then from `http://localhost:8000/product.html` walk: nav → About, FAQ, Contact, Shop (→ `index.html#shop`); footer links; product "Add to Cart" opens the live store in a new tab; bundle "what's inside" Turmeric card → `product.html`. Confirm every page: solid nav, no overlap, marquee + footer present, **zero console errors on every page**.

- [ ] **Step 3: Confirm the homepage and Shopify are untouched**

Run: `git diff --stat main -- site/index.html site/css/main.css site/css/tokens.css site/js/main.js theme/`
Expected: **empty** if Task 7 was skipped; if Task 7 ran, ONLY `site/index.html` appears (and `theme/` must be empty regardless). If `main.css`, `tokens.css`, `js/main.js`, or anything under `theme/` shows up, STOP and revert those changes — they violate the brief.

- [ ] **Step 4: Push to deploy**

```bash
git push -u origin feat/poster-interior-pages
```
Then either open a PR and merge to `main`, or (if the user wants it live immediately) merge/fast-forward to `main` and push. The `.github/workflows` Pages job runs on push to `main` and republishes the `site/` folder. NOTE: deploying requires the change to land on `main` — confirm with the user whether to merge now.

- [ ] **Step 5: Verify the live deploy** — after the Pages Action completes (check the repo's Actions tab), open the public GitHub Pages URL and click through `product.html`, `bundle.html`, `about.html`, `contact.html`, `faq.html`. Confirm assets load and links resolve under the Pages path. Share the link for the Varuni demo.

---

## Self-Review

**Spec coverage:**
- Product page (Lakadong Turmeric) → Task 2 ✓
- Bundle page (Inflammation Relief, = Turmeric + Moringa per live store) → Task 3 ✓
- About/Our Story → Task 4 ✓; Contact → Task 5 ✓; FAQ → Task 6 ✓
- Match homepage design / reuse design system → Tasks reuse `.chapter`, `.card`, `.btn`, `.ticket`, `.box__grid`, `.kicker`, `.marquee`, `.footer`, `.shop__assurances`, `.split-lines`, `.reveal`, `.stagger`, `.parallax`; new styles isolated in `pages.css` ✓
- Reuse in-repo assets, minimal external → all `src`/`href` point to existing `site/assets/...`; only external refs are the live store (buy/cart/search) and `mailto:` ✓
- Pull real copy/prices from live store → fetched and embedded verbatim in Tasks 2–3 + critical-facts ✓
- Homepage untouched → Tasks 1–6 never touch it; Task 7 is optional/gated/links-only; Task 8 Step 3 enforces it ✓
- Shopify untouched → no `theme/` edits anywhere; Task 8 Step 3 enforces it ✓
- Deploy to GitHub Pages → Task 8 ✓
- `main.js` ID requirement → encoded in scaffold + checked by `scripts/check-static.py` ✓

**Placeholder scan:** No TBD/TODO. The only intentional tokens are `__PAGE_TITLE__` / `__PAGE_DESCRIPTION__` / `__PAGE_MAIN__`, each given an explicit value in every task. Form `action` is a working `mailto:` (with a noted optional Formspree upgrade, explicitly out of scope).

**Type/name consistency:** Gallery main image id `pdpMain` and thumbnail class `.pdp__thumb` with `data-full` are identical in the CSS (Task 1), the markup (Tasks 2–3), and the swap script (Tasks 2–3). CSS classes referenced by pages all exist either in `main.css` (verified via selector grep) or are defined in `pages.css` Task 1. Verification script page list matches the five files created.
