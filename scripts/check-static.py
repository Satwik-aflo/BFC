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
