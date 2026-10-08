# Picks update, October 2026: friends' recommendations

`src/_data/picks-2026.csv` on this branch is the finished picks list. It has
the new `recommended` column, 23 new places, and recommendations on 9 existing
picks. The live map reads the Google Sheet **"ADW 2026 Picks — live map data"**
(id `1XjPUME_9GOwL7zbs3UwVxkCU4--Nf_SzLqUxAh4nhpg`), so the sheet has to match
this CSV before anything shows.

## To finish (needs the Google Sheets connector)

1. Confirm the Apps Script in the sheet has `"recommended"` in `PICKS.columns`.
   Without it, Publish refuses the new column. The repo copy is in
   `apps-script/picks-sheet.gs`.
2. In the sheet, add the header `recommended` in column O.
3. Fill `recommended` for the existing rows, and append the new rows. Take
   `name`, `address`, `kind`, `link`, `show` and `recommended` from the CSV,
   and leave `lat`/`lng` blank so Publish geocodes them.
   - **Crown & Anchor Hotel:** set the address to `233 Currie St, Adelaide SA 5000`,
     put the pop-up line at the front of `why`, and **clear its lat and lng**.
     Publish never moves a pin that already has coordinates.
   - Inside a cell, recommendations are separated by real line breaks.
4. Hannah or Andrew presses **Publish → Publish map to website**.
5. Read the sheet back. Copy its `lat`/`lng` into this CSV, add those two
   columns, and update the test in `test/picks.test.js` that expects 30–45
   picks, all of them pinned. The list is no longer capped, and BBQ City,
   Southern Noodle Bar and Ajisen Ramen have no confirmed address, so they
   have no pin. Then merge to `main`.

## Decisions already made

- **Far away is fine.** Willunga and Piccadilly are on the map.
- **Duplicates:** one pin per place, with every person's recommendation on it.
- **Names:** a person's name where they gave it, their Instagram handle
  otherwise. Their words are kept as they wrote them.
- **Maddie & Conor's order is Ying Chow.**
- **The Cranker** is placed at its Ed Castle pop-up, with a note.
- **"Nanas buns"** is Nanna Hot Bake at the Central Market.
- **Left out:** zenessa__'s "my home"/"my car", "RIP SUPER" (closed, and the
  venue isn't clear), and @aliceiscool12 and @adelaidearchitect on "BBC"
  (the venue isn't clear).
