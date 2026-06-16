# Our Story (About Us) — draft theme parity

**Date:** 2026-06-16
**Branch:** `feat/theme-reskin-gap-close`
**Goal:** Make the draft theme's "About Us" page render the full Our Story
experience from `site/about.html`. The page currently appears empty on the
draft.

## Diagnosis (the real gap)

The Our Story page is **already built in source** (commit `198619d`):

- `theme/templates/page.about-us.json` wires four sections in order:
  `about-story-intro` → `about-story-field` → `about-fix-stamp` →
  `about-vision-signoff`.
- Each section has literal copy that matches `site/about.html` and loads art
  via `{{ '...' | asset_url }}`.

So this is **not** a missing-code problem. It is three deploy-side gaps:

1. **Missing assets.** The sections reference 10 `about-*` images that do not
   exist in `theme/assets/`. The source art lives in `site/assets/img/about/`
   under different filenames. Without these, art is broken even where the page
   renders.
2. **Not deployed.** The sections/template/assets need to be pushed to the
   draft theme `#151032561833`.
3. **Admin binding (most likely cause of "empty").** If the admin "About Us"
   page is assigned the default `page` template instead of `page.about-us`,
   only the title renders — an empty-looking page.

## Plan

### 1. Port assets → `theme/assets/`

| Source (`site/assets/img/about/`) | → Theme asset (`theme/assets/`) |
|---|---|
| `Frame_1.png` | `about-blob.png` |
| `Spark_1.png` | `about-spark.png` |
| `Gemini_blob.png` | `about-sign.png` |
| `founders.jpg` | `about-founders.jpg` |
| `Sun.png` | `about-sun.png` |
| `Rose.png` | `about-rose.png` |
| `Stamp_1.svg` | `about-stamp-1.svg` |
| `Stamp_2.svg` | `about-stamp-2.svg` |
| `Starburst.svg` | `about-starburst.svg` |
| `logo-web.png` | `about-logo-web.png` |

Mapping is derived from `asset_url` references in the four `about-*` sections.

### 2. Validate

Validate the four `about-*` sections + `page.about-us.json` with the Shopify
Dev MCP (`learn_shopify_api` api=`liquid` → `validate_theme`).

### 3. Push surgically (draft only)

Push **only** our brand files to draft `#151032561833`, `--nodelete`, never the
live theme, never a full push (CLI 4.1.0 rejects Horizon core sections):

```bash
shopify theme push --store d9v1pv-06.myshopify.com --theme 151032561833 --nodelete \
  --only templates/page.about-us.json \
  --only sections/about-story-intro.liquid \
  --only sections/about-story-field.liquid \
  --only sections/about-fix-stamp.liquid \
  --only sections/about-vision-signoff.liquid \
  --only assets/about-blob.png --only assets/about-spark.png \
  --only assets/about-sign.png --only assets/about-founders.jpg \
  --only assets/about-sun.png --only assets/about-rose.png \
  --only assets/about-stamp-1.svg --only assets/about-stamp-2.svg \
  --only assets/about-starburst.svg --only assets/about-logo-web.png
```

(Run with `--path theme` or from the theme dir — push silently no-ops from repo
root.)

### 4. Diagnose + fix admin binding via CLI/API

Determine which template the admin "About Us" page uses. If it is not
`page.about-us`, reassign it (admin GraphQL / CLI as far as auth allows). Flag
any step that is strictly admin-UI-only.

### 5. Verify visually

Screenshot the preview (`https://d9v1pv-06.myshopify.com?preview_theme_id=151032561833`,
About Us URL) and compare to `site/about.html`. A green push is not proof the
page looks right.

## Out of scope

- Header nav label "About Us" → "Our Story" (user will rename in admin later).
- Any copy edits — copy already matches the static site.

## Risks / notes

- Live theme must never be pushed/published without explicit approval.
- New section settings can need two pushes; here the template already exists in
  source so a single push of template + sections should bind, but verify the
  pulled-back template retains all section references.
