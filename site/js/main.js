// The Boring Foods Company — interactions

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// Sticky nav state
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---------------------------------------------------------------------------
// Overlay menu
const burger = document.getElementById('burger');
const menu = document.getElementById('menu');
const setMenu = (open) => {
  document.body.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-hidden', String(!open));
};
burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
// Tap the empty overlay background (not a link) to dismiss
menu.addEventListener('click', (e) => { if (e.target === menu) setMenu(false); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

// ---------------------------------------------------------------------------
// PDP sticky buy bar: reveal once the inline Add-to-Cart scrolls out of view
const stickybar = document.querySelector('.pdp-stickybar');
const inlineBuy = document.querySelector('.pdp__buy');
if (stickybar && inlineBuy) {
  const buyObserver = new IntersectionObserver(
    ([entry]) => {
      const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      stickybar.classList.toggle('is-active', show);
      stickybar.setAttribute('aria-hidden', String(!show));
    },
    { threshold: 0 }
  );
  buyObserver.observe(inlineBuy);
}

// ---------------------------------------------------------------------------
// Line splitter (Imperiale-style o-text-reveal-lines)
// Wraps each *rendered* line of a .split-lines element in mask spans.
function splitLines(el) {
  if (reduceMotion) return;
  const original = el.cloneNode(true);
  // Tokenize into words, preserving child elements (e.g. .script spans) whole.
  const tokens = [];
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent.split(/\s+/).filter(Boolean).forEach((w) => tokens.push(w));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      tokens.push(node);
    }
  });
  el.textContent = '';
  const wordSpans = tokens.map((t) => {
    const s = document.createElement('span');
    s.style.display = 'inline-block';
    if (typeof t === 'string') s.textContent = t;
    else s.appendChild(t);
    el.appendChild(s);
    el.appendChild(document.createTextNode(' '));
    return s;
  });
  // Group words by rendered line (offsetTop buckets)
  const lines = [];
  let lastTop = null;
  wordSpans.forEach((s) => {
    const top = s.offsetTop;
    if (top !== lastTop) { lines.push([]); lastTop = top; }
    lines[lines.length - 1].push(s);
  });
  if (lines.length === 0) { el.replaceWith(original); return; }
  el.textContent = '';
  lines.forEach((words, i) => {
    const line = document.createElement('span');
    line.className = 'line';
    const inner = document.createElement('span');
    inner.className = 'line-inner';
    inner.style.setProperty('--line-i', i);
    words.forEach((w, j) => {
      w.style.display = 'inline';
      inner.appendChild(w);
      if (j < words.length - 1) inner.appendChild(document.createTextNode(' '));
    });
    line.appendChild(inner);
    el.appendChild(line);
  });
}
const splitEls = [...document.querySelectorAll('.split-lines')];
const doSplit = () => splitEls.forEach(splitLines);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(doSplit);
else doSplit();

// ---------------------------------------------------------------------------
// Stagger groups: assign incremental reveal delays to children
document.querySelectorAll('.stagger').forEach((group) => {
  [...group.children].forEach((child, i) => {
    child.style.setProperty('--reveal-delay', `${i * 0.12}s`);
    child.classList.add('reveal');
    child.querySelectorAll('.img-reveal').forEach((m) => m.style.setProperty('--reveal-delay', `${i * 0.12}s`));
  });
});

// ---------------------------------------------------------------------------
// Scroll reveals (text masks, curtains, fades share one observer)
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }
);
const observeAll = () =>
  document.querySelectorAll('.reveal, .split-lines, .img-reveal').forEach((el) => observer.observe(el));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(observeAll);
else observeAll();

// ---------------------------------------------------------------------------
// Parallax drift for photos (rAF, Imperiale-style slow counter-scroll)
const parallaxEls = [...document.querySelectorAll('.parallax')];
if (!reduceMotion && parallaxEls.length) {
  let ticking = false;
  const update = () => {
    const vh = window.innerHeight;
    parallaxEls.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const progress = (r.top + r.height / 2 - vh / 2) / vh; // -0.5 … 0.5-ish
      const speed = parseFloat(el.dataset.speed || '0.12');
      el.style.transform = `translateY(${(progress * speed * 100).toFixed(2)}%)`;
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
}

// ===========================================================================
// Storefront UI — Search overlay + Cart drawer  (HOLLOW / design reference)
// ---------------------------------------------------------------------------
// Brand-styled, NON-FUNCTIONAL shells injected on every page. No backend, no
// real cart state — quantity/remove only mutate the DOM so both the populated
// and empty states are reviewable. When the static design is ported into the
// Shopify Horizon theme, delete this module: Horizon ships native search +
// cart drawer. Search-and-replace anchor for the dev who wires it up: SHOPIFY-PLUG.
// ===========================================================================
(function storefrontUI() {
  // --- Placeholder cart contents (design dummy data) -----------------------
  const demoLines = [
    { name: 'Lakadong Turmeric', variant: '150 g · Whole', price: 289, img: 'assets/img/products/turmeric.jpg' },
    { name: 'Moringa Powder', variant: '100 g', price: 349, img: 'assets/img/products/moringa.png' },
  ];
  const popular = ['Turmeric', 'Moringa', 'Ashwagandha', 'Black Pepper', 'Recipes'];
  const inr = (n) => '₹ ' + n.toLocaleString('en-IN');

  // --- Build markup --------------------------------------------------------
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="sf-scrim" data-sf-close hidden></div>

    <aside class="sf-search" id="sf-search" role="dialog" aria-modal="true"
           aria-label="Search the store" aria-hidden="true">
      <div class="sf-search__inner">
        <div class="sf-search__top">
          <h2 class="sf-search__title">Search</h2>
          <button class="sf-close" type="button" data-sf-close aria-label="Close search"></button>
        </div>
        <label class="sf-search__field">
          <img src="assets/img/Search1.svg" alt="" aria-hidden="true" />
          <input class="sf-search__input" type="search" id="sf-search-input"
                 placeholder="Search our boring little pantry…" autocomplete="off"
                 aria-label="Search products" />
        </label>
        <p class="sf-search__hint">Popular</p>
        <div class="sf-search__chips">
          ${popular.map((p) => `<button class="sf-chip" type="button" data-sf-term="${p}">${p}</button>`).join('')}
        </div>
        <p class="sf-search__empty">Nothing typed yet — try a spice above. <span class="hand">☞</span></p>
      </div>
    </aside>

    <aside class="sf-cart" id="sf-cart" role="dialog" aria-modal="true"
           aria-label="Your cart" aria-hidden="true">
      <div class="sf-cart__head">
        <h2 class="sf-cart__title">Cart <span class="sf-cart__count" data-sf-headcount></span></h2>
        <button class="sf-close" type="button" data-sf-close aria-label="Close cart"></button>
      </div>

      <div class="sf-cart__empty">
        <div class="sf-cart__empty-mark">Boringly empty.</div>
        <p class="sf-cart__empty-text">Nothing in the basket yet. Good things are worth adding.</p>
        <button class="btn" type="button" data-sf-close>Start Shopping <span class="hand">☞</span></button>
      </div>

      <div class="sf-cart__items" data-sf-items></div>

      <div class="sf-cart__foot">
        <dl class="sf-cart__subtotal">
          <dt>Subtotal</dt>
          <dd data-sf-subtotal></dd>
        </dl>
        <p class="sf-cart__note">Shipping &amp; taxes calculated at checkout.</p>
        <!-- SHOPIFY-PLUG: point at Horizon /checkout (or Storefront cart.checkoutUrl) -->
        <button class="btn" type="button" data-sf-checkout>Checkout <span class="hand">☞</span></button>
      </div>
    </aside>`;
  document.body.appendChild(wrap);

  const body = document.body;
  const scrim = wrap.querySelector('.sf-scrim');
  const searchPanel = wrap.querySelector('#sf-search');
  const cartPanel = wrap.querySelector('#sf-cart');
  const itemsBox = wrap.querySelector('[data-sf-items]');
  const subtotalEl = wrap.querySelector('[data-sf-subtotal]');
  const headCountEl = wrap.querySelector('[data-sf-headcount]');
  const searchInput = wrap.querySelector('#sf-search-input');

  // --- Render line items ---------------------------------------------------
  const lineMarkup = (l, i) => `
    <div class="sf-line" data-sf-line="${i}" data-price="${l.price}">
      <img class="sf-line__thumb" src="${l.img}" alt="${l.name}" />
      <div>
        <p class="sf-line__name">${l.name}</p>
        <p class="sf-line__variant">${l.variant}</p>
        <div class="sf-stepper">
          <button type="button" data-sf-dec aria-label="Decrease quantity">−</button>
          <span data-sf-qty>1</span>
          <button type="button" data-sf-inc aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div class="sf-line__right">
        <span class="sf-line__price" data-sf-lineprice>${inr(l.price)}</span>
        <button class="sf-line__remove" type="button" data-sf-remove>Remove</button>
      </div>
    </div>`;
  itemsBox.innerHTML = demoLines.map(lineMarkup).join('');

  // --- Totals + badge + empty state ---------------------------------------
  const navCartLink = document.querySelector('.nav__cta a[aria-label="Cart"]');
  let badge = null;
  if (navCartLink) {
    badge = document.createElement('span');
    badge.className = 'sf-badge';
    navCartLink.appendChild(badge);
  }
  function recalc() {
    let count = 0;
    let total = 0;
    itemsBox.querySelectorAll('.sf-line').forEach((line) => {
      const qty = parseInt(line.querySelector('[data-sf-qty]').textContent, 10);
      const price = parseInt(line.dataset.price, 10);
      count += qty;
      total += qty * price;
      line.querySelector('[data-sf-lineprice]').textContent = inr(qty * price);
    });
    subtotalEl.textContent = inr(total);
    headCountEl.textContent = count ? `(${count})` : '';
    body.classList.toggle('sf-cart-empty', count === 0);
    if (badge) { badge.textContent = count; badge.hidden = count === 0; }
  }

  // --- Open / close --------------------------------------------------------
  let lastFocus = null;
  function openPanel(which) {
    lastFocus = document.activeElement;
    scrim.hidden = false;
    body.classList.add('sf-open', `sf-${which}-open`);
    const panel = which === 'search' ? searchPanel : cartPanel;
    panel.setAttribute('aria-hidden', 'false');
    setTimeout(() => (which === 'search' ? searchInput : panel.querySelector('.sf-close')).focus(), 60);
  }
  function closePanel() {
    body.classList.remove('sf-open', 'sf-search-open', 'sf-cart-open');
    searchPanel.setAttribute('aria-hidden', 'true');
    cartPanel.setAttribute('aria-hidden', 'true');
    setTimeout(() => { scrim.hidden = true; }, 450);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // --- Wire nav triggers (intercept the external store links) --------------
  const navSearch = document.querySelector('.nav__cta a[aria-label="Search"]');
  if (navSearch) navSearch.addEventListener('click', (e) => { e.preventDefault(); openPanel('search'); });
  if (navCartLink) navCartLink.addEventListener('click', (e) => { e.preventDefault(); openPanel('cart'); });

  // --- Delegated interactions ---------------------------------------------
  wrap.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-sf-close]')) { closePanel(); return; }
    if (t.closest('[data-sf-checkout]')) { /* SHOPIFY-PLUG: real checkout redirect */ return; }
    const term = t.closest('[data-sf-term]');
    if (term) { searchInput.value = term.dataset.term; searchInput.focus(); return; }

    const line = t.closest('.sf-line');
    if (!line) return;
    const qtyEl = line.querySelector('[data-sf-qty]');
    let qty = parseInt(qtyEl.textContent, 10);
    if (t.closest('[data-sf-inc]')) qtyEl.textContent = qty + 1;
    else if (t.closest('[data-sf-dec]')) qtyEl.textContent = Math.max(1, qty - 1);
    else if (t.closest('[data-sf-remove]')) line.remove();
    recalc();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && body.classList.contains('sf-open')) closePanel();
  });

  recalc();
})();
