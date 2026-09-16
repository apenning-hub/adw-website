# every*one map — design

**Date:** 2026-09-15
**Branch:** `2026-map`
**Status:** approved design, not yet planned

A 2D Mapbox map of every event venue in the Adelaide Design Week 2026
(**every\*one**) program, styled from the site's own brand tokens, using the ADW
asterisk as the marking element.

---

## 1. Goals

1. A `/map/` page showing all 2026 program venues, visually continuous with the
   rest of the site — same palette, same faces, same lowercase voice.
2. The brand asterisk is the marker. Not a pin, not a dot.
3. Every program entry gets a small locator map of its own venue.
4. No per-visitor Mapbox cost beyond map loads. All geocoding and all thumbnail
   rendering happens at build time and is committed.

### Non-goals (explicitly out of scope)

- Day-of-week or category filter controls on the map.
- Walking routes or directions between venues.
- "Near me" / geolocation.
- Any change to how the program list itself is built or filtered, beyond adding
  the locator thumbnail to each entry.

---

## 2. Source data, as it actually is

`src/_data/program-2026.csv` — 95 events, columns
`category,title,ticketed,venue,blurb,link,socials,note,contributors,adw_presented`
plus seven positional day columns (`thu 8 oct` … `sun 18 oct`) holding free text
(`"6pm - 9pm"`, `"(all day)"`, `"6pm - SUPER LATE"`).

- **69 unique venue strings. None have coordinates.**
- Venue strings are human-written and inconsistent:
  `"Coldstore, 66 Wyatt St, Adelaide"` (a real address),
  `"Jam Factory, ADL CBD"` (a name plus shorthand),
  `"Thebarton"` (a suburb only),
  `"Travelling between events!"` (not a place at all).
- Categories: `EXH` 47, `CONV` 21, `OPEN` 7, `TOUR` 5, `WORK` 4, `INST` 3.
- **7 of 69 venues host more than one category** — EST Studio, Dental School,
  AGSA, Jam Factory, Immersive Art and Installation, Hebart Hall, Mid-Century
  House.

That last fact drives the feature granularity decision in §4.

---

## 3. Architecture

```
src/_data/program-2026.csv
        │
        ├──▶ scripts/geocode-venues.py ──▶ src/_data/venues.json      (committed)
        │                                          │
        │    scripts/build-venue-thumbs.py ◀───────┤
        │              │                           │
        │              ▼                           │
        │    src/assets/images/venue-maps/*.png    │   (committed)
        │                                          │
src/_data/program2026.js ─────────────────────────┴──▶ src/_data/mapPoints.js
                                                              │
                                                    GeoJSON FeatureCollection
                                                              │
                                        ┌─────────────────────┴──────────────┐
                                        ▼                                    ▼
                                   src/map.njk                        src/program.njk
                              (+ assets/js/map.js,                 (locator thumbnails)
                               assets/js/map-style.js,
                               assets/css/map.css)
```

Each unit has one job and can be understood without reading the others:

| Unit | Does | Depends on |
|---|---|---|
| `geocode-venues.py` | venue string → lat/lng | Mapbox Geocoding v6, `MAPBOX_TOKEN` env |
| `venues.json` | the committed truth about where venues are | nothing (plain data) |
| `build-venue-thumbs.py` | venue → static PNG | `venues.json`, Static Images API |
| `mapPoints.js` | join events to coords, emit GeoJSON | `program2026.js`, `venues.json` |
| `map-style.js` | basemap paint rules | nothing (pure data table) |
| `map.js` | render, cluster, panel, deep links | `mapPoints` GeoJSON, `map-style.js` |

---

## 4. Data pipeline

### 4.1 `scripts/geocode-venues.py`

One-off, re-runnable, **idempotent**.

1. Read the CSV, collect unique `venue` strings.
2. **Normalise ADW shorthand** before querying. Table-driven, not ad hoc:
   - `ADL CBD` → `Adelaide CBD, SA`
   - `ADL Uni` / `Adelaide University` → `University of Adelaide`
   - trailing `ADL` → `Adelaide`
   - `CBD, ADL` → `Adelaide CBD, SA`
3. Query Mapbox Geocoding v6 with `country=AU`, a greater-Adelaide bounding box,
   and `proximity` biased to the CBD (`138.5999,-34.9285`).
4. Write `src/_data/venues.json`, keyed by the **raw** venue string. Shape only
   — the coordinates below are illustrative, not looked-up values:

```json
{
  "Jam Factory, ADL CBD": {
    "lat": -34.9205,
    "lng": 138.5936,
    "matched_address": "19 Morphett St, Adelaide SA 5000",
    "confidence": 0.87,
    "source": "mapbox"
  },
  "Travelling between events!": { "skip": true, "reason": "not a location" }
}
```

**Idempotency rule:** an entry with `"source": "manual"` is never re-queried and
never overwritten. Hand-corrections survive every future run. This is the single
most important property of the script — the vague venues *will* need hand
correction, and that work must only happen once.

**Review output:** the script prints a table of every venue that returned
nothing, returned more than one plausible match, or scored `confidence < 0.7`,
so the hand-correction pass is a short explicit list rather than a hunt. A
venue string that is a bare suburb (`"Thebarton"`) is always listed for review
regardless of score, because a confident suburb-centroid match is still the
wrong pin.

### 4.2 `src/_data/mapPoints.js`

Eleventy data file. Joins `program2026.js` events to `venues.json` and emits a
GeoJSON `FeatureCollection`.

**One feature per event (95), not per venue (69).** Because seven venues host
two categories each, a per-venue feature would have to pick one category and lie
about the other. Per-event features keep it honest, and co-located events are
then absorbed by clustering (§5.1) for free.

Feature properties: `title`, `category`, `venue`, `venueSlug`, `days[]`,
`times[]`, `ticketed`, `link`, `iconKey`.

Events whose venue is `skip: true` or missing from `venues.json` are omitted
**and reported at build time** — a silently-vanishing event is a bug, so the
build logs a count and the titles.

---

## 5. Map rendering

### 5.1 Clustering

Mapbox GL clustering, `clusterRadius: 45`, `clusterMaxZoom: 15`.

The cluster marker **is the asterisk**, scaled up, with the count set in Chroma
ST in brand yellow at the mark's solid core — not a numbered circle. A generic
count badge would be the one element on the page that isn't ADW's.

- Click a cluster → `getClusterExpansionZoom`, fly to it.
- **When a cluster cannot split** (several events at one venue, one coordinate),
  clicking opens that venue's panel listing all of them, instead of zooming
  uselessly. This is the normal case for Jam Factory, AGSA and the other
  multi-event venues, not an edge case.
- A cluster of one category takes that category's fill; a mixed cluster is black.

### 5.2 Category encoded in the mark

The asterisk's **shape never changes**. Category is carried by fill, using brand
colours only:

| Category | n | Treatment |
|---|---|---|
| `EXH` | 47 | solid black |
| `CONV` | 21 | black, paper-coloured core |
| `OPEN` | 7 | paper fill, black outline |
| `TOUR` | 5 | yellow fill, black outline |
| `WORK` | 4 | solid `#5F5F5F` |
| `INST` | 3 | solid black, rotated 30° |

A lowercase Chroma ST legend sits beneath the map.

**Recorded reservation.** At ~22px, `TOUR` / `INST` / `CONV` will be hard to
tell apart, and six variants dilute a mark whose power is being singular. The
design proceeds as specified, but the scheme sits behind **one config constant**
(`CATEGORY_MARKS`, at the top of `src/assets/js/map.js`). Setting it `false`
renders every marker as a plain black asterisk and hides the legend — a config
change, not a rewrite. Decide after seeing it on screen (§8).

To be explicit: turning `CATEGORY_MARKS` off does **not** add filter controls.
Filters remain out of scope (§1); they would be a separate, later decision.

Implementation: each variant is rasterised from `src/assets/images/asterisk.svg`
(which already uses `fill="currentColor"`) to a canvas at 2x and registered with
`map.addImage()`. A single symbol layer uses `icon-image: ['get', 'iconKey']`,
`icon-allow-overlap: true`, and `icon-size` interpolated by zoom.

### 5.3 Basemap style — stripped editorial

The style is a **declarative rules table in the repo** (`map-style.js`), not a
Mapbox Studio style. Studio styles are invisible to git, un-reviewable in a diff,
and tied to account state. On `load`, the module deletes every POI, transit,
building-fill and terrain layer from `light-v11` and repaints the survivors:

| Element | Value | Token |
|---|---|---|
| land | `#ECEFE8` | `--paper` |
| water, Torrens | `#DDE0D9` | paper, one shade down |
| roads | `#C9C9CB`, three weights, hairline at low zoom | `--line` |
| labels | `#5F5F5F`, Helvetica, lowercase | `--ink-soft` |
| POIs, buildings, terrain | removed | — |

Yellow appears **nowhere** in the basemap. The site's palette rule is that yellow
is the only highlight; spending it on terrain would kill the markers.

Values are read from the same CSS custom properties defined in
`src/assets/css/site.css` — the stylesheet stays the single source of truth for
brand colour. Do not re-sample brand colours from the program poster PDF; its
rendered values are rasterisation artefacts.

---

## 6. Pages and interaction

### 6.1 `/map/`

`src/map.njk`, `navLabel: map`, full-bleed below the sticky masthead
(`--header-h`).

**Panel.** Clicking an asterisk opens a panel — right-hand side on desktop,
bottom sheet below 700px. Contents: venue name in Chroma ST lowercase, then per
event: title, category label, the CSV's free-text day/time lines verbatim,
ticketed asterisk, outbound link.

**Deep links.** `/map/?venue=<slug>` opens that venue's panel and flies to it.
This is the target of the locator thumbnails in §6.2.

**Accessibility.**
- Mapbox GL markers are not keyboard-reachable. A visually-hidden list of venue
  buttons precedes the map and opens the same panel, giving keyboard and screen
  reader users equivalent access.
- `Esc` closes the panel; focus returns to the trigger.
- `prefers-reduced-motion: reduce` disables `flyTo` easing (jump instead).
- Label colour `#5F5F5F` on `#ECEFE8` is 5.5:1. Never use the 55%-black brand
  grey `#747474` here — it is 4.02:1 and fails AA.

### 6.2 Locator thumbnails in the program

`scripts/build-venue-thumbs.py` pre-renders one static map per locatable venue
via the Mapbox Static Images API, using the same style, with the asterisk
overlaid, at 640×320 @2x. Output committed to `src/assets/images/venue-maps/<slug>.png`.

Rendered inside each program entry, `loading="lazy"`, wrapped in a link to
`/map/?venue=<slug>`.

Pre-rendering rather than live Static API calls means zero per-visitor cost and
the thumbnails keep working if the token is ever rotated or rate-limited.

**Known cost:** ~69 PNGs, roughly 4 MB, on a repo already near 49 MB. Pushing
requires the existing workaround `git config http.postBuffer 524288000`; the
default buffer fails with HTTP 400.

---

## 7. Credentials

| Token | Where | Scope |
|---|---|---|
| public `pk.*` | committed in `src/_data/site.json` as `mapboxToken` | URL-restricted to `adelaidedesignweek.com.au`. Safe to commit **only** while restricted. |
| build token | `MAPBOX_TOKEN` env var, read by both scripts | never committed, never referenced in built output |

Cloudflare Pages does not need the build token: `venues.json` and the thumbnails
are committed artefacts, so production builds make no Mapbox API calls.

---

## 8. Testing

**`geocode-venues.py`**
- shorthand normalisation table maps each known ADW abbreviation correctly
- an entry marked `source: manual` survives a re-run unchanged (the idempotency
  guarantee — this is the test that matters most)
- `"Travelling between events!"` lands in the skip list, not the output
- a venue that returns nothing is reported, not silently dropped

**`mapPoints.js`**
- emits 95 features minus skips; the difference is logged with titles
- output validates as GeoJSON
- all 7 multi-category venues produce features of both categories
- every feature's `iconKey` resolves to a registered image

**`map.js` / rendering**
- a cluster that cannot split opens the panel rather than zooming
- `/map/?venue=<slug>` opens the right panel on load
- the hidden venue list reaches every venue the markers do

**Visual**
- screenshot `/map/` at desktop width and at 400px
- confirm no horizontal scroll on the program page with thumbnails added
- confirm the six category marks are distinguishable at render size — **this is
  the check that decides whether `CATEGORY_MARKS` stays on** (§5.2)

---

## 9. Deploy

All work lands on **`2026-map`**. Review at `2026-map.adw-website.pages.dev` —
the branch alias is the only honest view of what a branch builds.

`main` is what Cloudflare Pages builds for production, and **pushing `main`
publishes to the live site immediately**. Nothing merges to `main` without
explicit approval.

Cloudflare cannot serve a custom domain from a preview branch — proven, do not
retry. Use the `pages.dev` branch alias for review. `src/_data/env.js` already
emits `noindex` for any branch other than `main`, so the preview will not be
indexed.
