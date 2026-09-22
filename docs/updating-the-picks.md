# Updating ADW picks

**ADW picks** is the curated list of Adelaide rooms worth being in — the
best-designed pubs, bars and restaurants, plus a few classics that were
never designed by anybody in particular and are wonderful anyway. It appears
as its own tab on the map page, next to the program.

**It is deliberately short.** Thirty-seven, not a directory. Two rules keep
it that way, and both are worth defending when someone asks why their
favourite is not on it:

1. **Every one of them is excellent.** A long list of good places is less
   useful than a short list of great ones.
2. **Every one of them is walkable from the program.** The furthest is
   about 1.2 km from a program venue; most are under 200 m. That is what
   makes it usable during Design Week rather than a guide to South
   Australia. It is why there are no cellar doors on it — the nearest was
   24 km out.

It works exactly like the program: **one spreadsheet is the whole thing.**
You do not need to touch any code, and you cannot break the site by getting
the spreadsheet wrong — if something is wrong, the site keeps showing the
last good version and tells whoever published it what to fix.

The file is `src/_data/picks-2026.csv`. Open it in Excel or Numbers, or
upload it to Google Sheets (**File → Import → Upload**, then **Replace
spreadsheet**).

There are 37 places in it to start with.

---

## The columns

| Column | What goes in it |
| --- | --- |
| `name` | What the place is called. **The only column that is required.** |
| `address` | Street address, with the number. This is how it gets a pin. |
| `kind` | One of: `bar`, `pub`, `restaurant`, `fine dining`, `classic` (also accepted: `cafe`, `cellar door`, `brewery`) |
| `designer` | The practice or person, if it is known. **Leave blank if it isn't.** |
| `year` | When it opened, or when it was fitted out |
| `why` | One line on why it earns a place |
| `hannah_note` | Your own recommendation. Shown as a pull quote, set apart from the research |
| `designer_words` | The designer in their own words, on what the project meant to them |
| `designer_name` | Who said that |
| `link` | Website |
| `socials` | `@handle`, or a full URL |
| `show` | `N` hides a row without deleting it |

Everything except `name` can be empty. A row with only a name still
publishes — it just says less.

### Blank designers are the point

**10 of the 37 have no designer credit, and that is correct.** Ying Chow,
Lucia's, the Exeter, Grace Emily — these were never designed by anyone with
a letterhead, and some of the others have credits nobody has written down
yet.

A blank shows on the page as *"Designer unknown. If this was your work, we
would like to credit it."* That is an invitation, and it is how the list is
meant to fill in. **Please do not fill a blank with a guess** — a wrong
credit is much worse than an honest gap, and harder to notice later.

### The two kinds of quote

`hannah_note` and `designer_words` are deliberately different voices and are
styled differently on the page:

- **`hannah_note`** is you, recommending the place. It gets a yellow rule
  down the side. *"Go on a Tuesday, sit at the bar, order whatever the
  chalkboard says."*
- **`designer_words`** is the designer talking about their own project. It
  gets a shaded block and their name underneath. *"We wanted a room that
  felt found rather than made."*

Fill `designer_name` in too, or the quote runs unattributed.

---

## Getting a designer to write something

The columns are there to be sent out. The shape that works is:

> We're putting [venue] on the ADW picks map for Design Week. Would you write
> two or three sentences about what the project meant to you? It'll run on
> the map with your name on it.

Paste the answer into `designer_words`, their name into `designer_name`.
Keep it to a few sentences — it sits in a sidebar column, not on a page.

---

---

## Getting a pin on the map

Coordinates are **not** in the spreadsheet, on purpose: that way editing the
sheet can never move a pin to the wrong place.

A new row has no pin until somebody runs:

```sh
npm run geocode-picks
```

That looks up only the rows that don't have coordinates yet and writes them
to `src/_data/picks.json`. It never moves a pin that is already right, so it
is safe to run as often as you like.

**A place it cannot find confidently gets no pin at all** and stays in the
list without one. That is deliberate. A missing pin is honest; a pin dropped
in the middle of the city because the address was vague is a guess wearing a
uniform, and nobody can tell the difference by looking.

All 37 are placed at the moment. If you add one without a street number,
expect it to land in this state.

If a pin lands somewhere wrong, fix it by hand in `picks.json` and set
`"source": "manual"`. **Nothing ever overwrites a manual pin.**

---

## Publishing from a Google Sheet

Set `picksSheetCsv` in `src/_data/site.json` to the sheet's CSV export URL —
the same arrangement the program uses:

```
https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0
```

The sheet then becomes the source of truth and the committed CSV is the
safety net: if Google is unreachable at build time, the site builds from the
last committed copy rather than publishing an empty list.

---

## If something is wrong

The build stops and says what and where, in plain English, naming the row:

- a place listed twice — it names both row numbers
- a `kind` that isn't one of the eight — it lists the eight
- a misspelled column heading — it names the heading and lists the real ones
- no `name` column at all

Nothing goes live in that state. The site keeps showing the last good
version until the spreadsheet is fixed.
