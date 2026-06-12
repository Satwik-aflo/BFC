# Boring Foods Company — Website Rebuild Plan

## Goal
Rebuild boringfoodscompany.com as a brand-faithful, scroll-driven marketing site,
using the Brand Book as the design source of truth and the flow of
imperialebolgheri.com (full-screen hero → narrative chapters → product showcase →
provenance → contact/footer) as the structural reference.

## 1. Design System (`site/css/tokens.css` + `site/styleguide.html`)
Tokens extracted from the brand book:

**Colors (p.38)**
- `--indian-blue: #5D57C5`
- `--kulfi-malai: #FBF3CC` (default page background)
- `--ripe-orange: #F84B21`
- `--mango-yellow: #F9BF29`
- `--neem-green: #244F24`
- `--kohl-black: #000000`
- Allowed/forbidden combinations per p.39 (no blue-on-red, blue-on-green, green-on-black, black-on-green).

**Typography (p.19–36, cheat sheet p.32: 80/15/5 rule)**
- Aesthet Nova (Light/Medium/Black) — body, long-form (~80%)
- Copperplate (Light/Bold/Heavy) — H1/H2/captions/CTAs, letterspaced small caps; numbers
- Flagflies — charm headlines ("Why Pepper?")
- Musloner — cursive accents, hashtags (#proudlyboring), sparingly
- Mexicana Hollow — single display words only, always with text drop shadow (never hollow, never body)
- Loaded via `@font-face` from `site/assets/fonts/` (copied from Typography/)

**Components**
- Vintage ticket frame (notched-corner border, like brand book frames p.48)
- Yellow "Link ☞" button (Copperplate + pointing-hand motif)
- Badge/stamp (circular rotating text), starburst, spark motifs
- Section rules (thin double lines), footer hairline with page-label style

## 2. Assets
Copy as-is into `site/assets/`:
- `logo-web (4).png` (primary logo), `Rose.png`, `Turmeric Root.png`, `Frame 5.png`,
  `Boringly Clean and Pure.png`, `Spark 1/2.png`
- SVGs: Stamp, Starburst, Sun, Trees, Mountain, Check, Glass, Microscope, Search, Cart,
  Single Origin, Not in the pack, Future of health, silhouette2
- Fonts: Aesthet Nova (3 weights), Copperplate (OPTI Light/Regular/Heavy), Flagflies,
  Musloner, Mexicana Hollow

## 3. Page flow (modeled on Imperiale Bolgheri)
Single page, full-bleed chapters with smooth scroll + reveal animations:
1. **Preloader/Hero** — Kulfi Malai field, primary logo, Mexicana Hollow display word
   "BORING", tagline "The future of health is ancient", scroll cue
2. **Manifesto** — brand positioning copy (p.4), drop-cap "O" treatment, cream on neem green
3. **The Product** — Lakadong Turmeric Powder chapter: ticket frame, mascot/turmeric art,
   8.0% curcumin / 20x absorption stat callouts
4. **Why Pepper?** — Flagflies headline + science copy (p.23/30), curcumin Us-vs-Others
   comparison card
5. **In the Box / Not in the Box** — checklist vs NO-list (icons: Check, Not in the pack)
6. **Provenance** — "From Meghalaya": Mountain, Trees, Sun SVGs, single-origin badges
7. **Values strip** — marquee: #proudlyboring · Support Women SHGs · Support Natural Farming
8. **Footer/Contact** — green field, short-form thank-you stamp, email, nav, legal

Nav: fixed top bar (logo left, Copperplate links, Cart icon), hamburger overlay menu on
mobile — Imperiale-style full-screen overlay.

## 4. Tech
Static site: `site/index.html`, `site/styleguide.html`, `site/css/tokens.css`,
`site/css/main.css`, `site/js/main.js`. No build step. IntersectionObserver reveals,
sticky nav, CSS marquee, smooth anchors. Verified by serving locally and screenshotting.

## 5. Execution order
1. Scaffold dirs, copy fonts + assets
2. tokens.css (design system)
3. index.html + main.css + main.js
4. styleguide.html documenting the system
5. Serve locally, screenshot, fix visual issues
