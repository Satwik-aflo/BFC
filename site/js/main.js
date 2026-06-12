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
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

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
