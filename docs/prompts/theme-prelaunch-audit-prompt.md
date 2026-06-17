# Reusable prompt — "Pre-Launch Audit, parity with Flot's report"

Paste this to run the same audit against any version of the theme (draft or live).

---

You are auditing the Boring Foods Shopify theme for ad-launch readiness, producing a
report structured exactly like `BFC_PreLaunch_Audit_Complete` (Flot's audit):
**Part A Performance, Part B Tracking/Structured-Data/Ad-Readiness, Part C Verification.**

Audit the theme at `theme/` and the **preview theme `#151032561833`** on
`d9v1pv-06.myshopify.com`. Do NOT touch the live theme. Use evidence, not assumptions —
the validator/grep ≠ "looks right" rule applies; **measure**.

**Part A — Performance.** Produce a current-state table with *measured* numbers, not
guesses. Use the QA harness (`/tmp/bfc-qa/`, headless Chrome, mobile emulation, set the
preview cookie via `?preview_theme_id=151032561833`, then full-page scroll to trigger
lazy loads). For homepage AND `/products/turmeric-powder` capture: total transferred
bytes, request count, and a per-type breakdown (video/image/js/css/font/html), plus every
resource > 100 KB. Then walk Flot's seven priorities and for EACH finding tag it:
`[SAME]` (also on live), `[OURS]` (introduced/owned by the reskin), `[APP]` (caused by an
installed app, theme-independent), `[ADMIN]` (store setting, not theme code), or
`[FIXED]` (live finding the reskin already resolves). Specifically check: page weight &
its dominant contributor; autoplaying video/MP4; repeated assets; `asset_url` images that
can't be CDN-resized; `image_tag`+`widths`/`sizes`+width/height (CLS); WOFF2 +
`font-display: swap`; composited-only animations (`transform`/`opacity`, reduced-motion
guards); preconnect/preload; orange-on-cream contrast; heading hierarchy & exactly one
`<h1>` per page (measure h1 count on home AND product).

**Part B — Tracking/Ad-Readiness.** These are mostly `[ADMIN]`/`[APP]` and theme-
independent; report what's observable from the rendered page (Meta Pixel `fbevents.js`,
Judge.me, Instafeed, JSON-LD `application/ld+json` completeness) and flag the OG-image
`http://` vs `https://` issue in `snippets/meta-tags.liquid`. List the admin tasks
(GA4/Google Ads, Merchant Center approval, return/shipping policy pages, WhatsApp opt-in,
UTMs, recipe-PDF link) as carry-over from the live audit.

**Part C — Verification.** Give concrete re-measurement steps and pass thresholds.

End with three lists: **(1)** what the reskin already fixes vs. live, **(2)** what we still
own in theme code (small), **(3)** what dominates but is NOT theme code (apps/admin). Write
the report to `docs/YYYY-MM-DD-theme-prelaunch-audit-draft.md`. Do not push anything.
