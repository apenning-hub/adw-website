# every*where 2025 page — design

**Date:** 2026-06-19
**Status:** Approved pending spec review

## Problem

1. **Broken grant link (priority).** The "Full 2025 program" link in `src/eoi.md`
   points to the dead external URL `https://adelaidedesignweek.com.au/programs/`.
   This link is needed for a grant and must work.
2. **No dedicated 2025 archive.** The 2025 program only exists as a hidden
   `<details>` accordion on the EOI page. There is no standalone page that
   presents the 2025 program, locations and people as a record of what happened.
3. **Factual errors** in several program entries.

## Goal

Create a standalone `/everywhere-2025/` page archiving every*where 2025
(20–24 August 2025), repoint the broken link to it, and correct the factual
errors — making each fix in one place so the EOI accordion and the new page
stay in sync.

## Decisions (from brainstorming)

- **Page contents:** 19-event program grid + all-locations map + team &
  2025 contributors. (No media-coverage strip.)
- **Relationship to EOI accordion:** Keep the collapsible grid on the EOI page
  *and* build the standalone page. To avoid duplicated content drifting out of
  sync, the event list and contributor list move into shared `_data` files that
  both pages render.
- **Navigation:** Add to the main nav as `2025` (navOrder 5).

## Design

### 1. Shared data files

- `src/_data/program2025.js` — array of 19 event objects:
  ```
  {
    slug, image, title,
    meta,         // "date · venue" — rendered everywhere (EOI + new page)
    sponsor,      // optional, e.g. "Presented by Allera Lighting"
    description,  // optional short paragraph — new page only
    people        // optional { label, names: [] }, e.g. participants/speakers — new page only
  }
  ```
  One source of truth for the grid. The **EOI accordion renders only**
  `image` + `title` + `meta` (stays minimal); the **standalone page**
  additionally renders `sponsor`, `description` and `people`.
- `src/_data/contributors2025.js` — array of `{ name, handle, url }` for the
  2025 contributors list (currently inline in `team.md`).

Putting these in `_data` lets `eoi.md`, `everywhere-2025.njk` and `team.md`
loop over the same data; factual fixes are made once.

Descriptions are kept short (1–3 sentences) — enough to convey each event,
not full marketing copy. Only some events have description/people content;
the templates render those fields conditionally.

### 2. New page — `src/everywhere-2025.njk`

Front matter: `title: every*where 2025`, `navLabel: 2025`, `navOrder: 5`,
`permalink: /everywhere-2025/`, `layout: base.njk`, a `description` for SEO/grant.

Sections, top to bottom:

1. **Intro** — short prose: every*where 2025 ran 20–24 August 2025 across
   19 events city-wide under the theme *every*where*; this page is the record.
2. **All-locations map** — `<img>` of the converted map graphic, with a
   "download the full map (PDF)" link below it.
3. **Program grid** — loops `program2025` into the existing
   `.program-grid` / `.program-card` / `.program-poster` markup. No new CSS
   needed (styles already exist in `site.css`).
4. **Team & 2025 contributors** — the current team (Hannah White, Dre Fuzz,
   Lara Merrington, Bronwyn Marshall) and the `contributors2025` list, reusing
   `.streams` / `.contributors` styles.

### 3. EOI page change

`eoi.md`: the inline `<ul class="program-grid">` (19 hand-written `<li>`s) is
replaced with a `{% for %}` over `program2025`. The "Full 2025 program" line
(currently the dead external link) is repointed to `/everywhere-2025/`:

> Full 2025 program: [see every*where 2025 →](/everywhere-2025/)

### 4. Map conversion

Convert `graphics/Map/adelaide-design-week-2025-everywhere-all-location-map — update.pdf`
to a web image (`src/assets/images/program-2025/all-locations-map.avif`, with a
PNG fallback if AVIF export is unavailable). Copy the source PDF into
`src/assets/` (e.g. `all-locations-map-2025.pdf`) so the download link resolves.

### 5. Factual fixes (made once in `program2025.js`)

| Event | Change |
|---|---|
| **Open Studios** | meta → `23 Aug · Fallow, Jon Goulder, Creek Collective, JamFactory, JPE, WBL and others` (now names design studios) |
| **Shopfront Design Sprint** | meta → `24 Aug · East End · Various Adelaide design studios and retailers · Curated by Dre Fuzz & Lara Merrington` (was "Cumulus Studio & collaborators") |
| **Motion** | remove `Curated by Rachel Leppinus` (on poster) |
| **POST(ER) – GRAPHIC** | remove `Curated by FUTUREJUICE & 2049©` (on poster) |
| **Open Talks** | remove `Curated by Hannah White & Bronwyn Marshall`; add speakers (see appendix) |

Rationale for curator removals: curators are already printed on each event
poster (shown in the card), so repeating them in text is redundant. Design
Sprint keeps its curators because they are not on that poster.

## Appendix — captured 2025 event content

Concise content supplied by Andrew, to populate the new fields on the
standalone page. Trimmed to "enough to get an idea of the event."

**Motion** — Opening Night
- description: every*where's Opening Night — an exhibition of work by 80 South
  Australian designers and makers. Photographed by Jonathan VDK.

**A New Normal Adelaide**
- description: A vision to transform Greater Adelaide from a consumer to a
  producer city by 2030, with pilot projects briefed to the city's architects,
  designers and artists.
- people: { label: "Participants", names: [2049, Baukultur, Das Studio,
  Forum Studio, JamFactory, JPE Design Studio, Sans-Arc Studio, Studio Gram,
  Troppo, Walter Brooke, Woods Bagot] }

**Open Studios**
- sponsor: Presented by Allera Lighting
- description: A look inside Adelaide's architecture, design and craft studios —
  makers in the morning, architecture and interiors in the afternoon.
- people: { label: "Studios", names: [Fallow, Jon Goulder, Creek Collective,
  JamFactory (Tom Golin & Stu Colwill), JPE Design Studio, Woods Bagot, GGA,
  Baukultur, Design by WBL] }
- meta still names a representative subset (see factual fix above).

**Open Talks**
- sponsor: Brought to you by Estilo Furniture + Lighting
- description: A panel on how place shapes designers — the pull of a city, the
  value of staying rooted, and where Adelaide fits in design practice.
- people: { label: "Speakers", names: [Sophia Leopardi (Design by WBL),
  Rua Hashlamoun (Brown Falconer), Jacob Stavrakis (YSG),
  Sophie Wilkinson (Renewal SA) — moderator] }

All other events keep title + meta only unless/until Andrew supplies copy.

## Out of scope

- Media-coverage strip on the new page (the `/media` page already covers this).
- Restyling the program grid or any existing component.
- A per-event detail page or interactive map.
