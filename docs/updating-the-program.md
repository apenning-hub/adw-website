# Updating the program

Everything on the program page comes from one spreadsheet file:

```
src/_data/program-2026.csv
```

Change that file, publish, and the website updates. You don't need to touch any
code, and you can't break the site by getting the spreadsheet wrong — more on
that at the end.

---

## Opening it

Double-click `program-2026.csv`. It will open in Excel or Numbers, depending on
what you have. You can also upload it to Google Sheets (**File → Import → Upload**,
then choose **Replace spreadsheet**).

You'll see ten columns on the left, then one column for each day of the festival:

| category | title | ticketed | venue | blurb | link | socials | note | contributors | adw_presented | thu 8 oct | … |
|---|---|---|---|---|---|---|---|---|---|---|---|

**Tip:** freeze the first two columns so the title stays visible as you scroll
sideways. In Excel and Sheets that's **View → Freeze → 2 columns**.

---

## The three rules

Learn these and you know the whole format.

### 1. A day column is either blank or a time

- **Blank** means the event isn't on that day.
- **Any text** means it is on that day, and that text is shown on the website
  exactly as you typed it.

You don't have to write clock times. All of these are fine, because all of them
appear on the printed program:

```
10am - 4pm
(all day)
Lunch / Dinner
6pm - SUPER LATE
at 'ADW OPENING'
```

Different times on different days? Just type different times in each column.
That's the whole mechanism.

### 2. Two sessions in one day go in one cell, separated by a semicolon

`SHOP GENERATOR` runs twice on the Thursday, so its `thu 15 oct` cell reads:

```
8am - 2pm; opening 5pm - 10pm
```

The website shows those as two separate times on the same day.

### 3. One event = one row

Even if an event runs all five days, it gets **one** row. The day columns say
which days. Don't add a second row for the same event — the site will refuse to
publish and tell you which two rows clash.

---

## The other columns

**category** — must be one of these six. Type the short code:

| code | means |
|---|---|
| `EXH` | exhibition |
| `INST` | installation |
| `CONV` | conversation |
| `OPEN` | open studio |
| `TOUR` | tour |
| `WORK` | workshop |

An event can be two things at once — a panel held inside an exhibition, say.
Put both codes in the cell separated by a semicolon, most important first:
`CONV;EXH`. It stays one row and one entry in the program, but it now turns up
under both filters. The first code is the one shown beside the title.

## Linking to one event

Every event has its own address. Open it on the program page and the address
bar updates to match — copy what's there and send it:

    https://everyone.adelaidedesignweek.com.au/program/#slot

The part after the `#` is the event's title, lowercased, with anything that
isn't a letter or number turned into a dash. "THE FRINGE CONDITION : EXTREME
DESIGN" becomes `#the-fringe-condition-extreme-design`.

Following a link like that switches to the right day, clears any category
filter, opens the event and scrolls to it. For an event running several days,
it lands on the first one.

Renaming an event changes its link, so anything already sent out stops working.
If a link has gone out widely, that is a reason to leave the title alone.

**title** — the event name. Leave off the `*`; use the ticketed column instead.

**ticketed** — type `yes` if every day is ticketed. Otherwise leave it empty.
The website adds the `*` for you.

Often only part of the run is ticketed — an exhibition that is free all week with
one ticketed opening. In that case, instead of `yes`, write the days that are
ticketed, exactly as the day columns are headed, separated by semicolons:

```
thu 15 oct
sun 18 oct
wed 14 oct; sat 17 oct
```

The `*` and the booking button then appear **only on those days**. Someone
looking at Friday sees neither. The a–z list still shows the `*`, because it is
not looking at one day.

**venue** — where it is, written how you want it read:
`Coldstore, 66 Wyatt St, Adelaide`

**blurb** — optional. A sentence or two, shown when someone expands the event.
Most rows are empty, and that's fine.

**contributors** — optional. The people involved, separated by semicolons:

```
Martina Beka; Bolaji Teniola; Casey Chong
```

They appear as a list in their own column when the event is expanded. Leave it
empty and no contributors column is shown.

The expanded event lays itself out in up to three columns — details, blurb,
contributors — and only grows as many columns as it has content for. So filling
in a blurb or some contributors makes an event richer without ever leaving an
empty gap on the page.

**link** — optional. A web address for tickets or more information. Include the
`https://`.

**note** — optional. One short line, shown where the booking button sits. Use it
for a prize, or to say a link isn't out yet:

```
WIN: Aesop People's Choice Prize - visit to vote, vote to win
Registration link released soon
```

**socials** — optional. An Instagram handle, written the way it's written
everywhere else:

```
@shopfront_design_sprint
```

It appears as a **follow** line in the event's details, linking to the account.
You can paste a full web address instead if the event lives somewhere other than
Instagram — a Facebook page, say — and that's linked as-is.

---

## Common jobs

### Change a time

Find the event's row, find the day's column, type the new time. Done.

### Add a day to an event

Type a time into that day's column on the event's row. Done — no new row.

### Remove an event from one day

Delete the contents of that day's cell. Leave the row alone.

### Add a whole new event

Add a row at the bottom. Fill in `category`, `title` and `venue` (those three are
required), then put times in each day it runs. Leave `blurb` and `link` empty if
you don't have them. Rows don't need to be in any particular order — the website
sorts them.

### Remove an event entirely

Delete the whole row.

### Change the festival dates

Edit the day column *headings* — for example `wed 14 oct` → `wed 21 oct`. Whatever
you type becomes the label on the website. To add a day, add a column at the far
right. To drop one, delete its column.

---

## Saving it back to CSV

**This is the step that most often goes wrong, so it's worth reading.**

The file has to stay in CSV format. If you save it as `.xlsx` or `.numbers`, the
website won't see your changes.

**Excel** — **File → Save As**, and choose **CSV UTF-8 (Comma delimited) (.csv)**.
There are several CSV options in that menu; pick the one that says **UTF-8**. It
matters: without it, names like `ÉMIGRÉ: SPEAKER SERIES` come out as mojibake.

Excel will warn you something like *"this workbook contains features that won't
work in CSV"*. That's expected. Click **Keep current format** — nothing is lost,
because the file only ever held plain text.

**Numbers** — **File → Export To → CSV**, and set *Text Encoding* to **Unicode
(UTF-8)**. Then rename the exported file to `program-2026.csv` and put it back in
`src/_data/`, replacing the old one.

**Google Sheets** — **File → Download → Comma-separated values (.csv)**. It's
always UTF-8, so there's nothing to set. Then move the downloaded file into
`src/_data/`, replacing the old one.

Whichever you use, the file must end up at `src/_data/program-2026.csv` with that
exact name.

---

## Publishing

Double-click **`push-to-github.command`** in the main project folder.

A black window opens and shows you what changed. Type a short note about what you
did — *"added Sunday tour"* is plenty — and press Enter. Give it a minute or two,
then reload the website.

That's it.

---

## If something's wrong

The website checks the spreadsheet every time it publishes. If something doesn't
add up it stops and tells you, in plain language, naming the row:

```
program-2026.csv — row 14 ("BLOOM") has category "EHX".
It must be one of: EXH, INST, CONV, OPEN, TOUR, WORK.
```

**A rejected change does not break the live site.** The website keeps showing the
last good version of the program until the spreadsheet is fixed. So the worst
case is that your change doesn't appear yet — never that the program page goes
down or half-publishes.

Things it will catch:

- a category code that isn't one of the six
- a row with no title, or no venue
- a row with no times in any day column (it would never show up anywhere)
- the same event title used on two rows
- `ticketed` set to something other than `yes`

Fix the row it names, export to CSV again, and publish again.

### Things it can't catch

It checks the *shape* of the spreadsheet, not the *facts*. It has no way to know
that a talk moved to a different venue, or that a time is wrong. Those still need
a human to read the program page and check it against the printed program.
