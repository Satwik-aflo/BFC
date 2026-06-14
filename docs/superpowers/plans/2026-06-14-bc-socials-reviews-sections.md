# Boringly Clean & Pure + Socials + Reviews Sections — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port three sections from the live Shopify store (boringfoodscompany.com) — "Boringly Clean & Pure" (`bc-section`), "Socials", and the "Let customers speak for us" reviews carousel — into the static marketing site `site/index.html`, rebuilt natively in the site's own brand design system.

**Architecture:** The live sections are Horizon/Shopify markup that depends on app JS (judge.me, nfcube instafeed), a `<marquee-component>` web component, and Horizon CSS — none of which exist in `site/`. So we **reimplement** them natively using the site's existing primitives: `.rule` (pixel divider), `.marquee`/`.marquee__track`/`.marquee__item` (CSS marquee), and the class-based reveal animations (`.reveal`, `.split-lines`, `.img-reveal`, `.stagger`, `.parallax`) that `js/main.js` already wires up by class. All new CSS is appended to `site/css/main.css`; all new markup is inserted into `site/index.html` after the "How We Are Different" section (`#different`) and before the existing `#proudlyboring` marquee. No JS changes are required.

**Content sources (verbatim from live HTML, captured to `/tmp/bfc-home.html`):**
- bc-section copy: "We source directly from farmer groups, ensure controlled processing, and test each batch for safety and potency." + link "Read more here".
- Socials: heading "Socials", handle `@boringfoodscompany` (→ https://www.instagram.com/boringfoodscompany/).
- Reviews: title "Let customers speak for us", rating 5.00 "from 9 reviews", and the 9 real review records (all 5★) listed in Task 4.

**Assets:**
- Farmer photo: download from live CDN → `site/assets/img/photos/boringly-clean.png`.
- Blob background SVG: download from live CDN → `site/assets/img/boringly-blob.svg`.
- Purple ribbon badge SVG (with baked "BORINGLY CLEAN & PURE" text): extract from `/tmp/bfc-home.html` → `site/assets/img/boringly-badge.svg`.
- Roses: reuse existing `site/assets/img/Rose.png`.
- Socials spark: reuse existing `site/assets/img/Spark-1.png`.
- Social grid tiles: reuse existing repo product/bundle imagery (the 6 real Instagram creatives are behind an auth-walled app feed and not downloadable). Tiles link to the Instagram profile.

**Tech Stack:** Static HTML5 + CSS (brand tokens in `tokens.css`), no build step. Verification = serve with `python3 -m http.server` and `curl`/`grep` the rendered HTML + visual browser check (there is no unit-test harness in this repo).

**Placement order (after `#different`, before `#proudlyboring` marquee):**
1. Boringly Clean & Pure (`#boringly-clean`)
2. Socials (`#socials`)
3. Let customers speak for us (`#reviews`)

---

## Task 1: Acquire assets

**Files:**
- Create: `site/assets/img/photos/boringly-clean.png`
- Create: `site/assets/img/boringly-blob.svg`
- Create: `site/assets/img/boringly-badge.svg`

- [ ] **Step 1: Download the farmer photo**

Run:
```bash
curl -sL "https://boringfoodscompany.com/cdn/shop/files/Untitled_design_e60a7444-d0e2-4b71-84b4-3afd51a8107f.png?v=1766407063&width=1200" \
  -o site/assets/img/photos/boringly-clean.png
file site/assets/img/photos/boringly-clean.png
```
Expected: `PNG image data, ... RGB` (a valid PNG, ~600KB+).

- [ ] **Step 2: Download the blob background SVG**

Run:
```bash
curl -sL "https://boringfoodscompany.com/cdn/shop/files/silhouette2_cadb3b9c-51e5-4472-9a4b-6d29d05e0633.svg?v=1766569772" \
  -o site/assets/img/boringly-blob.svg
head -c 120 site/assets/img/boringly-blob.svg; echo
```
Expected: output starts with `<svg` (or `<?xml`). If the file is HTML/404, retry without the version query string.

- [ ] **Step 3: Extract the purple ribbon badge SVG (baked "BORINGLY CLEAN & PURE" text)**

The badge SVG lives at lines 5881–5914 of the captured HTML. Extract it to its own asset file:
```bash
sed -n '5881,5914p' /tmp/bfc-home.html > site/assets/img/boringly-badge.svg
head -c 60 site/assets/img/boringly-badge.svg; echo
tail -c 20 site/assets/img/boringly-badge.svg; echo
```
Expected: starts with `<svg width="472" height="149"`, ends with `</svg>`.
> If `/tmp/bfc-home.html` is gone, re-fetch first: `curl -sL -A "Mozilla/5.0" "https://boringfoodscompany.com" -o /tmp/bfc-home.html` and re-confirm the badge `<svg width="472" height="149"` line number with `grep -n 'width="472" height="149"' /tmp/bfc-home.html`.

- [ ] **Step 4: Verify all three assets exist and are non-empty**

Run:
```bash
ls -l site/assets/img/photos/boringly-clean.png site/assets/img/boringly-blob.svg site/assets/img/boringly-badge.svg
```
Expected: three files, each non-zero size.

- [ ] **Step 5: Commit**

```bash
git add site/assets/img/photos/boringly-clean.png site/assets/img/boringly-blob.svg site/assets/img/boringly-badge.svg
git commit -m "assets: add boringly-clean photo, blob, and badge for new sections"
```

---

## Task 2: Boringly Clean & Pure section

**Files:**
- Modify: `site/index.html` (insert after the `#different` section's closing `</section>`, before `<!-- ===================== Marquee ===================== -->`)
- Modify: `site/css/main.css` (append new CSS block at end of file)

- [ ] **Step 1: Append the CSS block to `site/css/main.css`**

Append at end of file:
```css
/* ==========================================================================
   Boringly Clean & Pure  (#boringly-clean)
   ========================================================================== */
.bc {
  padding: 3.5rem 0 1rem;
}
.bc__rules-top { margin-bottom: 3rem; }
.bc__rules-bottom { margin-top: 3rem; }
.bc__wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
  padding: 0 var(--gutter);
  max-width: 1100px;
  margin: 0 auto;
}
.bc__media {
  position: relative;
  flex: 1 1 420px;
  max-width: 620px;
}
.bc__media img.bc__photo {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border: 3px solid var(--indian-blue);
  border-radius: 16px;
  display: block;
}
.bc__rose {
  position: absolute;
  top: 50%;
  width: 46px;
  height: auto;
  transform: translateY(-50%);
  pointer-events: none;
}
.bc__rose--left  { left: -22px; }
.bc__rose--right { right: -22px; }
.bc__blob {
  position: relative;
  flex: 1 1 320px;
  max-width: 460px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  padding: 4.5rem 3rem 3rem;
  box-sizing: border-box;
}
.bc__blob-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  z-index: 0;
}
.bc__badge {
  position: absolute;
  top: -34px;
  left: 50%;
  transform: translateX(-50%);
  width: 88%;
  max-width: 330px;
  z-index: 2;
  filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.12));
}
.bc__badge img { width: 100%; height: auto; display: block; }
.bc__content {
  position: relative;
  z-index: 1;
  text-align: left;
}
.bc__body {
  font-size: 1.25rem;
  line-height: 1.45;
  margin: 0 0 1.25rem;
  color: var(--kohl-black);
}
.bc__link {
  font-family: var(--font-display);
  letter-spacing: var(--tracking-wide);
  font-weight: 700;
  text-transform: uppercase;
  font-size: var(--text-sm);
  color: var(--indian-blue);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: border-color 0.25s var(--ease-out);
}
.bc__link:hover { border-bottom-color: var(--kohl-black); }
@media (max-width: 768px) {
  .bc__wrap { gap: 3.5rem; }
  .bc__content { text-align: center; }
  .bc__body { font-size: 1.1rem; }
}
```

- [ ] **Step 2: Insert the markup into `site/index.html`**

Insert immediately before the `<!-- ===================== Marquee ===================== -->` comment:
```html
  <!-- ===================== Boringly Clean & Pure ===================== -->
  <section class="bc" id="boringly-clean">
    <div class="rule bc__rules-top reveal" aria-hidden="true"></div>
    <div class="bc__wrap">
      <div class="bc__media img-reveal">
        <img class="bc__photo" src="assets/img/photos/boringly-clean.png" alt="Boring Foods founders with a farmer in the field" />
        <img class="bc__rose bc__rose--left" src="assets/img/Rose.png" alt="" />
        <img class="bc__rose bc__rose--right" src="assets/img/Rose.png" alt="" />
      </div>
      <div class="bc__blob reveal">
        <img class="bc__blob-bg" src="assets/img/boringly-blob.svg" alt="" />
        <div class="bc__badge"><img src="assets/img/boringly-badge.svg" alt="Boringly Clean &amp; Pure" /></div>
        <div class="bc__content">
          <p class="bc__body">We source directly from farmer groups, ensure controlled processing, and test each batch for safety and potency.</p>
          <a class="bc__link" href="reports.html">Read more here <span class="hand">☞</span></a>
        </div>
      </div>
    </div>
    <div class="rule bc__rules-bottom reveal" aria-hidden="true"></div>
  </section>
```

- [ ] **Step 3: Serve and verify the section renders with assets resolving**

Run:
```bash
cd site && python3 -m http.server 8123 >/dev/null 2>&1 &
sleep 1
curl -s "http://localhost:8123/index.html" | grep -c 'id="boringly-clean"'
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8123/assets/img/photos/boringly-clean.png"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8123/assets/img/boringly-blob.svg"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8123/assets/img/boringly-badge.svg"
```
Expected: `1`, then `200`, `200`, `200`.

- [ ] **Step 4: Visual check**

Open `http://localhost:8123/#boringly-clean` in a browser. Confirm: blue pixel rules top and bottom, farmer photo in a blue rounded frame with a rose on each side, yellow blob with the purple "BORINGLY CLEAN & PURE" ribbon overlapping the top, body copy, and a "Read more here ☞" link. Then stop the server: `kill %1` (or `pkill -f "http.server 8123"`).

- [ ] **Step 5: Commit**

```bash
git add site/index.html site/css/main.css
git commit -m "feat: add Boringly Clean & Pure section to static site"
```

---

## Task 3: Socials section

**Files:**
- Modify: `site/index.html` (insert after the `#boringly-clean` `</section>`)
- Modify: `site/css/main.css` (append new CSS block)

- [ ] **Step 1: Append the CSS block to `site/css/main.css`**

Append at end of file:
```css
/* ==========================================================================
   Socials  (#socials)
   ========================================================================== */
.socials { padding: 2.5rem 0 0; }
.socials__head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 var(--gutter);
  max-width: 1100px;
  margin: 0 auto 1.5rem;
}
.socials__title {
  font-family: var(--font-display);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--ripe-orange);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  margin: 0;
}
.socials__spark { width: 38px; height: auto; }
.socials__handles { margin: 0 0 1.25rem; }
.socials__handles .marquee__item {
  text-transform: none;
  letter-spacing: 0;
  font-family: var(--font-body);
}
.socials__handles .marquee__item a {
  color: var(--kohl-black);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.socials__handles .marquee__item::after { content: none; }
.socials__grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0;
}
.socials__grid a {
  display: block;
  aspect-ratio: 1 / 1;
  overflow: hidden;
}
.socials__grid img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s var(--ease-out);
}
.socials__grid a:hover img { transform: scale(1.05); }
@media (max-width: 768px) {
  .socials__grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 480px) {
  .socials__grid { grid-template-columns: repeat(2, 1fr); }
}
```

- [ ] **Step 2: Insert the markup into `site/index.html`** (immediately after the `#boringly-clean` section's closing `</section>`)

```html
  <!-- ===================== Socials ===================== -->
  <section class="socials" id="socials">
    <div class="socials__head reveal">
      <h2 class="socials__title">Socials</h2>
      <img class="socials__spark" src="assets/img/Spark-1.png" alt="" />
    </div>
    <div class="marquee socials__handles" aria-hidden="false">
      <div class="marquee__track">
        <span class="marquee__item"><a href="https://www.instagram.com/boringfoodscompany/" target="_blank" rel="noopener">@boringfoodscompany</a></span>
        <span class="marquee__item"><a href="https://www.instagram.com/boringfoodscompany/" target="_blank" rel="noopener">@boringfoodscompany</a></span>
        <span class="marquee__item"><a href="https://www.instagram.com/boringfoodscompany/" target="_blank" rel="noopener">@boringfoodscompany</a></span>
        <span class="marquee__item"><a href="https://www.instagram.com/boringfoodscompany/" target="_blank" rel="noopener">@boringfoodscompany</a></span>
        <span class="marquee__item"><a href="https://www.instagram.com/boringfoodscompany/" target="_blank" rel="noopener">@boringfoodscompany</a></span>
        <span class="marquee__item"><a href="https://www.instagram.com/boringfoodscompany/" target="_blank" rel="noopener">@boringfoodscompany</a></span>
        <span class="marquee__item"><a href="https://www.instagram.com/boringfoodscompany/" target="_blank" rel="noopener">@boringfoodscompany</a></span>
        <span class="marquee__item"><a href="https://www.instagram.com/boringfoodscompany/" target="_blank" rel="noopener">@boringfoodscompany</a></span>
      </div>
    </div>
    <div class="socials__grid stagger">
      <a href="https://www.instagram.com/boringfoodscompany/" target="_blank" rel="noopener"><img src="assets/img/products/black-pepper.png" alt="Black Pepper post" /></a>
      <a href="https://www.instagram.com/boringfoodscompany/" target="_blank" rel="noopener"><img src="assets/img/products/ashwagandha.png" alt="Ashwagandha post" /></a>
      <a href="https://www.instagram.com/boringfoodscompany/" target="_blank" rel="noopener"><img src="assets/img/products/turmeric.jpg" alt="Turmeric post" /></a>
      <a href="https://www.instagram.com/boringfoodscompany/" target="_blank" rel="noopener"><img src="assets/img/products/immune-defense.jpg" alt="Immune Defense post" /></a>
      <a href="https://www.instagram.com/boringfoodscompany/" target="_blank" rel="noopener"><img src="assets/img/products/moringa.png" alt="Moringa post" /></a>
      <a href="https://www.instagram.com/boringfoodscompany/" target="_blank" rel="noopener"><img src="assets/img/photos/farm.png" alt="From the farm post" /></a>
    </div>
  </section>
```
> Note: the 6 tiles reuse existing repo imagery because the live Instagram creatives are served from an auth-walled app feed. Swap these `src` values for the real creatives later if/when those images are added to the repo.

- [ ] **Step 3: Serve and verify**

Run:
```bash
cd site && python3 -m http.server 8123 >/dev/null 2>&1 &
sleep 1
curl -s "http://localhost:8123/index.html" | grep -c 'id="socials"'
curl -s "http://localhost:8123/index.html" | grep -o '@boringfoodscompany' | wc -l
```
Expected: `1`, and a count `>= 8` (the marquee handles).

- [ ] **Step 4: Visual check**

Open `http://localhost:8123/#socials`. Confirm: orange "Socials" heading with a spark, a scrolling row of underlined `@boringfoodscompany` handles, and a 6-tile image grid. Stop the server: `pkill -f "http.server 8123"`.

- [ ] **Step 5: Commit**

```bash
git add site/index.html site/css/main.css
git commit -m "feat: add Socials section to static site"
```

---

## Task 4: Let customers speak for us (reviews)

**Files:**
- Modify: `site/index.html` (insert after the `#socials` `</section>`)
- Modify: `site/css/main.css` (append new CSS block)

The 9 real reviews (all 5★), from the live judge.me carousel:

| # | Name | Product | Body |
|---|------|---------|------|
| 1 | Ankitha S | Karimunda Black Pepper Powder | This has become a staple in my kitchen. Adds so much flavor to all the dishes. Will be repurchasing soon |
| 2 | Ankitha S | Lakadong Turmeric Powder | The best Turmeric in the market! Smells amazing and one of the purest you can find. I'm definitely repurchasing this soon. |
| 3 | Satwik | Moringa Powder | Has improved my morning energy levels greatly! I make it with the recipe that was included and it tastes delicious! |
| 4 | Satwik | Ashwagandha Root Powder | Helps me sleep a lot better, it tastes great with protein shake and mixes up well in the shaker as well! |
| 5 | Prakhar | Ashwagandha Root Powder | adding this ashwagandha powder to my protein shake daily has really improved my immunity |
| 6 | Sahiti Raju | Lakadong Turmeric Powder | Love it! |
| 7 | Siri Chandana AV | Moringa Powder | loving my moringa oat bowls every morning |
| 8 | Rahul Jain | Karimunda Black Pepper Powder | You open the packet and one whiff and you know it was a good decision. It's super strong and just a pinch is enough to flavor your food. Super quality |
| 9 | Rahul Jain | Ashwagandha Root Powder | Had heard about the benefits of Ashwagandha for a pretty long time but couldn't trust any brand enough to buy it, bought from TBFC after reading about it's quality and i was not disappointed at all. Have been taking it every night and it helps me relax and had improved my quality of sleep |

- [ ] **Step 1: Append the CSS block to `site/css/main.css`**

Append at end of file:
```css
/* ==========================================================================
   Reviews — Let customers speak for us  (#reviews)
   ========================================================================== */
.reviews { padding: 4rem 0; text-align: center; }
.reviews__head { margin-bottom: 2rem; }
.reviews__title {
  font-family: var(--font-display);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  margin: 0 0 0.5rem;
  color: var(--kohl-black);
}
.reviews__stars { color: var(--ripe-orange); font-size: 1.1rem; letter-spacing: 2px; }
.reviews__count {
  display: block;
  font-family: var(--font-display);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  font-size: var(--text-sm);
  margin-top: 0.35rem;
  color: var(--kohl-black);
}
.reviews__track {
  display: flex;
  gap: 1.25rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 0.5rem var(--gutter) 1.5rem;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}
.review-card {
  scroll-snap-align: start;
  flex: 0 0 300px;
  display: flex;
  flex-direction: column;
  text-align: left;
  background: var(--kulfi-deep);
  border: var(--line);
  border-radius: 14px;
  padding: 1.5rem;
}
.review-card__stars { color: var(--ripe-orange); letter-spacing: 2px; margin-bottom: 0.75rem; }
.review-card__body {
  font-size: 1rem;
  line-height: 1.5;
  margin: 0 0 1.25rem;
  flex: 1 1 auto;
  color: var(--kohl-black);
}
.review-card__name {
  font-family: var(--font-display);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  font-size: var(--text-sm);
  margin: 0;
}
.review-card__product {
  font-size: 0.85rem;
  color: var(--indian-blue);
  text-decoration: none;
  margin-top: 0.25rem;
}
.review-card__product:hover { text-decoration: underline; }
@media (max-width: 480px) {
  .review-card { flex-basis: 80vw; }
}
```

- [ ] **Step 2: Insert the markup into `site/index.html`** (immediately after the `#socials` section's closing `</section>`)

```html
  <!-- ===================== Reviews ===================== -->
  <section class="reviews" id="reviews">
    <div class="reviews__head reveal">
      <h2 class="reviews__title">Let customers speak for us</h2>
      <span class="reviews__stars" aria-label="5 out of 5 stars">★★★★★</span>
      <span class="reviews__count">from 9 reviews</span>
    </div>
    <div class="reviews__track">
      <article class="review-card">
        <div class="review-card__stars" aria-label="5 stars">★★★★★</div>
        <p class="review-card__body">This has become a staple in my kitchen. Adds so much flavor to all the dishes. Will be repurchasing soon</p>
        <p class="review-card__name">Ankitha S</p>
        <a class="review-card__product" href="https://boringfoodscompany.com/products/black-pepper-powder" target="_blank" rel="noopener">Karimunda Black Pepper Powder</a>
      </article>
      <article class="review-card">
        <div class="review-card__stars" aria-label="5 stars">★★★★★</div>
        <p class="review-card__body">The best Turmeric in the market! Smells amazing and one of the purest you can find. I'm definitely repurchasing this soon.</p>
        <p class="review-card__name">Ankitha S</p>
        <a class="review-card__product" href="https://boringfoodscompany.com/products/turmeric-powder" target="_blank" rel="noopener">Lakadong Turmeric Powder</a>
      </article>
      <article class="review-card">
        <div class="review-card__stars" aria-label="5 stars">★★★★★</div>
        <p class="review-card__body">Has improved my morning energy levels greatly! I make it with the recipe that was included and it tastes delicious!</p>
        <p class="review-card__name">Satwik</p>
        <a class="review-card__product" href="https://boringfoodscompany.com/products/moringa-powder" target="_blank" rel="noopener">Moringa Powder</a>
      </article>
      <article class="review-card">
        <div class="review-card__stars" aria-label="5 stars">★★★★★</div>
        <p class="review-card__body">Helps me sleep a lot better, it tastes great with protein shake and mixes up well in the shaker as well!</p>
        <p class="review-card__name">Satwik</p>
        <a class="review-card__product" href="https://boringfoodscompany.com/products/ashwagandha-powder" target="_blank" rel="noopener">Ashwagandha Root Powder</a>
      </article>
      <article class="review-card">
        <div class="review-card__stars" aria-label="5 stars">★★★★★</div>
        <p class="review-card__body">adding this ashwagandha powder to my protein shake daily has really improved my immunity</p>
        <p class="review-card__name">Prakhar</p>
        <a class="review-card__product" href="https://boringfoodscompany.com/products/ashwagandha-powder" target="_blank" rel="noopener">Ashwagandha Root Powder</a>
      </article>
      <article class="review-card">
        <div class="review-card__stars" aria-label="5 stars">★★★★★</div>
        <p class="review-card__body">Love it!</p>
        <p class="review-card__name">Sahiti Raju</p>
        <a class="review-card__product" href="https://boringfoodscompany.com/products/turmeric-powder" target="_blank" rel="noopener">Lakadong Turmeric Powder</a>
      </article>
      <article class="review-card">
        <div class="review-card__stars" aria-label="5 stars">★★★★★</div>
        <p class="review-card__body">loving my moringa oat bowls every morning</p>
        <p class="review-card__name">Siri Chandana AV</p>
        <a class="review-card__product" href="https://boringfoodscompany.com/products/moringa-powder" target="_blank" rel="noopener">Moringa Powder</a>
      </article>
      <article class="review-card">
        <div class="review-card__stars" aria-label="5 stars">★★★★★</div>
        <p class="review-card__body">You open the packet and one whiff and you know it was a good decision. It's super strong and just a pinch is enough to flavor your food. Super quality</p>
        <p class="review-card__name">Rahul Jain</p>
        <a class="review-card__product" href="https://boringfoodscompany.com/products/black-pepper-powder" target="_blank" rel="noopener">Karimunda Black Pepper Powder</a>
      </article>
      <article class="review-card">
        <div class="review-card__stars" aria-label="5 stars">★★★★★</div>
        <p class="review-card__body">Had heard about the benefits of Ashwagandha for a pretty long time but couldn't trust any brand enough to buy it, bought from TBFC after reading about it's quality and i was not disappointed at all. Have been taking it every night and it helps me relax and had improved my quality of sleep</p>
        <p class="review-card__name">Rahul Jain</p>
        <a class="review-card__product" href="https://boringfoodscompany.com/products/ashwagandha-powder" target="_blank" rel="noopener">Ashwagandha Root Powder</a>
      </article>
    </div>
  </section>
```

- [ ] **Step 3: Serve and verify**

Run:
```bash
cd site && python3 -m http.server 8123 >/dev/null 2>&1 &
sleep 1
curl -s "http://localhost:8123/index.html" | grep -c 'id="reviews"'
curl -s "http://localhost:8123/index.html" | grep -c 'class="review-card"'
```
Expected: `1`, then `9`.

- [ ] **Step 4: Visual check**

Open `http://localhost:8123/#reviews`. Confirm: "Let customers speak for us" title, 5-star + "from 9 reviews", and a horizontally scrollable row of 9 review cards (stars, body, name, product link). Stop the server: `pkill -f "http.server 8123"`.

- [ ] **Step 5: Commit**

```bash
git add site/index.html site/css/main.css
git commit -m "feat: add customer reviews section to static site"
```

---

## Task 5: Final integration check

- [ ] **Step 1: Confirm section order and that nothing else broke**

Run:
```bash
cd site && python3 -m http.server 8123 >/dev/null 2>&1 &
sleep 1
curl -s "http://localhost:8123/index.html" | grep -nE 'id="different"|id="boringly-clean"|id="socials"|id="reviews"|class="marquee"' | head
pkill -f "http.server 8123"
```
Expected order: `#different` → `#boringly-clean` → `#socials` → `#reviews` → the existing `marquee`/footer.

- [ ] **Step 2: Full-page visual pass**

Open `http://localhost:8123/` and scroll the whole page top to bottom. Confirm the three new sections appear in order between "How We Are Different" and the `#proudlyboring` marquee, reveal animations fire, and no layout overlaps. Stop the server.

- [ ] **Step 3: Final commit (only if any tidy-ups were made)**

```bash
git add -A
git commit -m "chore: finalize bc/socials/reviews sections" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- "Socials" section → Task 3 ✅ (heading + spark, `@boringfoodscompany` marquee, image grid).
- BoringlyCleanSection (`bc-section`) → Task 2 ✅ (pixel rules, framed photo + roses, blob + purple ribbon badge, body copy, "Read more here").
- "Let customers speak for us" → Task 4 ✅ (title, rating, 9 real review cards).

**Known deviations (intentional):**
- Live Instagram creatives are auth-walled → social grid uses existing repo imagery (noted in Task 3, Step 2). Swap later.
- judge.me / instafeed / `<marquee-component>` JS replaced with the site's native `.marquee` + static cards (architecture rationale at top).

**Placeholder scan:** none — all code and content is concrete.

**Type/class consistency:** `.bc__*`, `.socials__*`, `.review-card__*` classes are defined in CSS (Step 1 of each task) and used in the matching markup (Step 2). Reused existing primitives (`.rule`, `.marquee`, `.marquee__track`, `.marquee__item`, `.reveal`, `.img-reveal`, `.stagger`, `.hand`) all exist in `main.css`/`js/main.js`.

