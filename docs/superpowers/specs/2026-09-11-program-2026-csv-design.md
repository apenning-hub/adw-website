# ADW 2026 program — CSV-driven program page + palette refresh

**Date:** 2026-09-11
**Status:** approved, ready for planning

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
src/assets/css/site.css      palette tokens + program styles
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

## Palette

The site is already fully tokenised — three hex values across 951 lines of CSS,
all behind `:root` — so this is a token swap, not a restyle.

| token | current | 2026 | source |
|---|---|---|---|
| `--paper` | `#FFFFFF` | `#F0F1E7` | poster background |
| `--ink`, `--ink-strong`, `--ink-soft` | `#747474` | `#4D4D4D` | poster body text |
| `--yellow` | `#FEFF35` | `#F0F05E` | poster accent |
| `--line` | `rgba(116,116,116,0.4)` | `rgba(77,77,77,0.35)` | derived from `--ink` |

Sampled directly from the final-art PDF. `--paper` is introduced as a token in
this change; it is currently hardcoded as `#fff`.

This also resolves an accessibility problem. `#747474` on white is about 4.5:1,
sitting on the WCAG AA boundary. `#4D4D4D` on `#F0F1E7` is about 7.5:1, clearing
AA comfortably and meeting AAA for body text.

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

## Out of scope

- Generating a print-ready PDF. The designed poster stays a manual job.
- Changing `/everywhere-2025/`, the EOI page, or the sponsor blocks.
- Per-event poster artwork.
