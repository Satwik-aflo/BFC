# Prototype verdict — announcement bar

**Question:** What should the announcement bar look like? (The old 4-line bar ate
~145px on mobile and broke header/logo layout on load.)

**Variants tried** (`_prototype-announcement-bar.html`, toggle from the dock):
0 Current (145px) · 1 Slim single-line · 2 Rotating · 3 Marquee · 4 Dismissible · 5 Micro

**Key finding:** Copperplate caps fit only ~28–30 chars on a 390px line, so a single
STATIC line can show only ONE message (shipping OR code) without truncating. To keep
BOTH offers while staying slim (~40px), you need Rotating or Marquee.

**DECISION (user, 2026-06-17): Variant 3 — Marquee.** Continuous horizontal scroll,
~40px tall, keeps the full copy (no truncation), pauses on hover.

Implemented in theme/snippets/brand.liquid (CSS + clone-for-seamless-loop JS) +
theme/sections/header-group.json (slim padding/size). Prototype can be deleted once
the live marquee is confirmed on device.
