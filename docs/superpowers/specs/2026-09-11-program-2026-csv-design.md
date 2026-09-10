# ADW 2026 program — CSV-driven program page + brand refresh

**Date:** 2026-09-11
**Status:** approved, ready for planning

**Project location:** `~/Dropbox/01_active/every*where/2026/adw-website`
(moved from `every*where/adw-website` on 2026-09-11; git history, remote and
`push-to-github.command` all unaffected — the script resolves its own directory,
and GitHub Pages builds server-side).

## Problem

The 2025 program lives in `src/_data/program2025.js` as a hand-written JavaScript
array. Editing it means editing code, so only one person can safely change the
program, and a mistake breaks the build in ways that are hard to read.

The 2026 program is roughly five times larger — about 90 events, 217 day-entries,
across seven dates. It needs to be editable by a non-developer in a spreadsheet,
and rendered on the site from that spreadsheet.

## Source of truth

`ADW_Everyone*_2026 Program_[A2] [420x594mm] [FA].pdf`, in
`~/Dropbox/01_active/every*where/2026/program/`. Two A2 pages: a day-by-day
program, and an A–Z index of events with venues.

### What the source tells us

- **Seven dates, not five.** Thu 8 Oct and Tue 13 Oct are preview events that run
  before the week proper (Wed 14 – Sun 18 Oct).
- **Organised day by day.** Multi-day events reappear under each day, frequently
  at different times. `OBJECT TO MATERIAL` runs 10am–4pm Wednesday and
  12pm–6pm Friday.
- **Every entry carries a category code:** `EXH` exhibition, `INST` installation,
  `CONV` conversation, `OPEN` open studio, `TOUR` tour, `WORK` workshop.
- **A trailing `*` marks a ticketed event.** 69 of the 217 entries.
- **Times are free text, not parseable times.** `at 'ADW OPENING'`, `(all day)`,
  `Lunch / Dinner`, `6pm - SUPER LATE`, `opening 5pm - 10pm`, `TOUR 2pm - 5pm`.
- **Venue belongs to the event, not to the day.** Page 2's A–Z index lists each
  event exactly once with a single venue, which confirms one-row-per-event as the
  natural unit of the data.

## Architecture

```
src/_data/program-2026.csv   authored in a spreadsheet, exported, committed
        |
src/_data/program2026.js     parses + validates; fails the build on bad data
        |
src/program.njk              /program/ — day sections and an A–Z section
src/assets/js/program.js     progressive enhancement: tabs + filters
src/assets/css/site.css      brand tokens + program styles
src/assets/fonts/            Chroma ST Bold (woff2/woff)
src/assets/images/           every*one lockups
docs/updating-the-program.md plain-English guide for whoever edits the CSV
```

One direction of flow. The CSV is the only file that changes when the program
changes.

## CSV schema

Fixed columns first, then one column per festival date.

| column | required | notes |
|---|---|---|
| `category` | yes | one of `EXH` `INST` `CONV` `OPEN` `TOUR` `WORK` |
| `title` | yes | event name, without the `*` |
| `ticketed` | no | `yes` if ticketed; blank otherwise |
| `venue` | yes | full venue string as printed, e.g. `Coldstore, 66 Wyatt St, Adelaide` |
| `blurb` | no | short description, shown when expanded |
| `link` | no | URL — ticketing or event page |
| *day columns* | — | one per date; see below |

Day columns are **positional**: every column after `link` is treated as a day, in
order, and its header text becomes the label rendered on the page. Shifting the
festival dates means editing the header cells and nothing else. For 2026:

`thu 8 oct`, `tue 13 oct`, `wed 14 oct`, `thu 15 oct`, `fri 16 oct`,
`sat 17 oct`, `sun 18 oct`

### The three rules

1. A **blank** day cell means the event does not run that day. Text in a day cell
   means it runs that day, and the text is shown verbatim as its time.
2. `category` must be one of the six codes.
3. `ticketed` is `yes` or blank.

An event that runs **twice in one day** puts both sessions in the same cell,
separated by a semicolon. `SHOP GENERATOR` on Thursday is the real case:

    8am - 2pm; opening 5pm - 10pm

The page renders these as two lines within the one event.

No IDs, no date syntax, no formulas, nothing to learn beyond those three rules.

### Worked example

```csv
category,title,ticketed,venue,blurb,link,thu 8 oct,tue 13 oct,wed 14 oct,thu 15 oct,fri 16 oct,sat 17 oct,sun 18 oct
OPEN,FROM POLICY TO PLACE,yes,"Nearly Bar, ADL CBD",,,6pm - 8pm,,,,,,
EXH,OBJECT TO MATERIAL,,"19 Twin Street, ADL CBD",,,,,10am - 4pm,10am - 4pm,12pm - 6pm,10am - 4pm,10am - 5pm
INST,CARDENING CLUB,,"Various, ADL CBD",,,,,at 'ADW OPENING',,,,
```

### Why not the alternatives

- *Date range plus overrides* — the overrides cell becomes a syntax to get wrong,
  and roughly a third of multi-day events here vary their times.
- *One row per event-day* — 217 rows, with venue and blurb retyped on every
  repeat, and no single place to correct a venue.

## Validation

`program2026.js` fails the build with a message naming the offending row. A typo
should stop the deploy, not silently drop an event from the program.

- unknown `category` code
- missing `title` or `venue`
- a row with no times in any day column
- duplicate titles (two rows claiming to be the same event), compared
  case-insensitively and ignoring extra whitespace — the poster prints
  `ESTILO x MILLER KNOLL : SIT YOUR BEST` on one day and
  `ESTILO X MILLER KNOLL: SIT YOUR BEST` on another, and these are one event
- `ticketed` set to anything other than `yes` or blank

## Rendering

`/program/` — a new page. `/everywhere-2025/` and the EOI page are untouched.

### Two views, one dataset

- **By day** — a section per date, events grouped by category, each expandable.
- **A–Z** — every event once, alphabetically, each expandable to show the days it
  runs and its times on each.

### Expansion

Each event is a native `<details>`. The `<summary>` is the collapsed row
(category chip, title, ticketed marker, that day's time); the body holds venue,
times across all days, blurb and link. This is the pattern the FAQ and the 2025
block already use: no JavaScript, keyboard- and screen-reader-accessible by
default.

### Progressive enhancement

Every day section and the A–Z list are rendered as plain HTML. `program.js` then
enhances them into tab panels with category filter chips. With JavaScript off or
broken, the page degrades to the complete program as a long readable document —
nothing is hidden behind a script.

### Responsive

Day tabs scroll horizontally on narrow screens. Event rows stack their time
beneath the title below ~560px. The category chip stays inline.

## Brand refresh

Scope: palette, typography and logos — the full 2026 identity, not colours alone.

### Palette

Authoritative source is `2026/Colours/ADW_Colours.pdf`, **not** colours sampled
from the program poster. The poster's rendered values (`#F0F1E7`, `#4D4D4D`,
`#F0F05E`) are rasterisation artefacts and must not be used.

| swatch | hex | brand name |
|---|---|---|
| off white | `#ECEFE8` | Cool Gray 1U |
| grey | `#C9C9CB` | 20% black |
| dark grey | `#747474` | 55% black |
| dark grey | `#333333` | 80% black |
| black | `#000000` | 100% black |
| yellow | `#FEFF35` | PMS 903U |

Two of these are already correct in the stylesheet: `--yellow` is `#FEFF35` and
`--ink` is `#747474`, both exact brand values. Nothing was wrong with them. What
is missing is the off-white paper and the rest of the grey scale.

#### Token mapping

| token | current | 2026 |
|---|---|---|
| `--paper` | `#FFFFFF` (hardcoded `#fff`) | `#ECEFE8` |
| `--ink` | `#747474` | `#333333` |
| `--ink-strong` | `#747474` | `#000000` |
| `--ink-soft` | `#747474` | `#747474` (unchanged) |
| `--line` | `rgba(116,116,116,0.4)` | `#C9C9CB` |
| `--yellow` | `#FEFF35` | `#FEFF35` (unchanged) |

The current stylesheet assigns the same `#747474` to all three ink tokens, so the
existing hierarchy is flat by accident. Mapping them onto the brand's actual grey
scale gives real hierarchy at no cost.

This also fixes an accessibility problem. `#747474` on white is about 4.5:1,
sitting on the WCAG AA boundary. `#333333` on `#ECEFE8` is about 11:1, clearing
AAA. `--ink-soft` at `#747474` on `#ECEFE8` is about 4.7:1, which holds AA for
body text and must not be used below 16px.

### Typography

`2026/Fonts/Chroma/` ships **Chroma ST Bold** in OTF, TTF, WOFF and WOFF2. It is
the display face on the poster.

- **Display and headings:** Chroma ST Bold, served as WOFF2 with WOFF fallback.
- **Body:** Chroma ships **Bold only** and cannot carry body text. The existing
  `Univers LT Std` is also Bold-only, and it is currently doing all body copy —
  which is why the site reads heavy throughout. Setting 217 dense program
  listings in a bold face would be actively hard to read.

  **Recommendation:** move body copy to a Helvetica-led system stack
  (`Helvetica Neue, Helvetica, Arial, sans-serif`). It matches the neutral
  grotesque used for body text on the poster, costs no network request, and
  gives the regular weight neither brand face provides. `Egizio` stays as
  `--font-serif` for existing accent use.

Existing OTF `@font-face` sources should move to WOFF2 in the same pass — OTF is
the wrong delivery format and both current faces ship as raw OTF today.

**Licence check required before deploy.** The fonts are from Source Type, whose
EULA sells the Web/App licence separately from desktop. The kit including WOFF
and WOFF2 is a strong signal a web licence was bought, but this has not been
verified and must be confirmed before the fonts are served from the site.

### Logos

`2026/Logos/` holds six lockups, each in black, yellow and grey (18 files), as
AI, EPS, PDF and PNG:

1. `every*one` in a rounded pill outline
2. compact pill with dates and `adelaide design week`
3. reversed — solid pill, knocked-out wordmark
4. `adw` monogram
5. stacked pill with dates below
6. the asterisk mark alone

These replace the 2025 marks (`adw.svg`, `logo-tagline.svg`, `logo-no-tagline.svg`,
`dates.svg`) in the masthead and footer. Variant 6 becomes the favicon.

**The kit contains no SVG,** and this machine has no vector converter installed
(no `inkscape`, `pdf2svg`, `rsvg-convert` or PyMuPDF). The implementation plan
must resolve this explicitly: either install a converter to produce SVGs from the
PDF or EPS art, or ship the `@2x` PNGs (4116px wide, so they downscale cleanly).
SVG is strongly preferred — these are flat two-colour marks, so the files will be
tiny and stay sharp at every size.

## The editing guide

`docs/updating-the-program.md`, written for someone who has never opened this
repository and does not write code. It is a deliverable of this work, not an
afterthought — the entire point of moving to a CSV is that a non-developer can
change the program, and that only holds if the instructions are good.

It must cover:

- opening `program-2026.csv` in Excel, Numbers or Google Sheets
- the three rules: blank means not running, text means running at that time,
  semicolon separates two sessions in one day
- the six category codes, spelled out in full
- marking an event ticketed
- adding an event, removing an event, changing a time
- **exporting back to CSV** — the step most likely to go wrong, especially in
  Excel, which will offer several CSV flavours and prefer its own
- publishing: double-click `push-to-github.command`, wait a couple of minutes
- what a failed build looks like, what the error message means, and that a
  rejected change means the site keeps serving the last good program rather than
  a broken one

Written in plain language with a worked example for each task. No jargon, no
assumed git knowledge.

## Populating the CSV

The 217 day-entries will be extracted from the PDF programmatically, splitting
the two-column A2 layout by x-coordinate rather than transcribing by hand.

**This output must be proofread against the poster before it goes live.** Column
splitting on a dense two-column layout is the least reliable step in this plan,
and a misattributed venue or time is worse than no listing. The build validation
catches structural errors; it cannot catch a time that parsed into the wrong day.

The extraction must also reconcile the poster's own inconsistencies rather than
propagate them: the same event is titled and punctuated differently across days
(the `ESTILO x MILLER KNOLL` case above), and `AFTERLIFE` is listed at
`Unbuilt, North Adelaide opening` on Friday but `Unbuilt, North Adelaide` in the
A–Z index. Page 2's index is the tiebreaker for titles and venues, since it lists
each event exactly once.

## Flagged for the user

- `site.json` sets `programDates` to `14 – 18 October 2026`, which excludes the
  Thu 8 Oct and Tue 13 Oct preview events. The program page will show all seven
  dates. Whether the site's headline dates should change is a content decision,
  not made here.
- The poster carries no per-event descriptions, so `blurb` will ship empty. The
  column exists so descriptions can be added later without a schema change.
- 2026's theme is `every*one`; 2025's was `every*where`. Site copy outside the
  program page has not been audited for this and is out of scope.
- **Font licensing is unverified.** Source Type sells its Web/App licence
  separately from desktop. Confirm the web licence covers serving Chroma from
  adelaidedesignweek.com before deploy.
- `ADW_Colours.pdf` has a typo: the BLACK swatch lists `RGB 0,0,0` but
  `HEX #E0E0E0`. The swatch renders black, so RGB is correct and the hex label is
  wrong. Worth telling the designer so the guidelines get fixed at source.
- The colour guidelines are headed **"BRAND GUIDELINES 2027"** while sitting in
  the 2026 asset folder. Probably a typo, but confirm these are the current
  2026 colours and not a forward-dated revision.
- `push-to-github.command` tells the user "Cloudflare Pages will redeploy",
  but `.github/workflows/deploy.yml` deploys to GitHub Pages. One of the two is
  out of date. Minor, but it will confuse whoever publishes the program.

## Out of scope

- Generating a print-ready PDF. The designed poster stays a manual job.
- Changing `/everywhere-2025/`, the EOI page, or the sponsor blocks.
- Per-event poster artwork.
- Auditing site-wide copy for the every*where → every*one change.
