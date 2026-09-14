# The program updates form

`/program-updates/` is where participants report a change or an error in their
own listing. It is deliberately **not in the navigation and not indexed by
search engines** — the URL is given to participants directly, in the email that
tells them their listing is live.

**The form is built and connected** — Tally form `Ek2Mqq`, published, in the
every*where workspace, with email notifications going to
contact@adelaidedesignweek.com.au. What follows records how it is put together,
so it can be rebuilt or changed.

---

## Why it works this way

The page owns the **list of events**, not Tally. It is generated from
`program-2026.csv` at build time, so it always matches what is published — 87
events today, and whatever the program holds tomorrow, with nothing to maintain
in Tally.

Choosing an event does two things:

1. Shows the participant **what the website currently says** about their event —
   venue, every day and time, ticketed, link, socials, contributors. Most
   "something's wrong" emails turn out to be about something already correct;
   this settles it before anyone writes in.
2. Passes the event name, and that same summary, into the form as hidden
   fields — so every submission arrives knowing which row it belongs to and
   what the row said at the time.

The form appears only after an event is chosen. That is on purpose: changing the
selection afterwards would reload the embedded form and discard anything typed.

---

## How the Tally form is built

Its questions mirror the spreadsheet's columns, because that is what makes a
request something Han can act on rather than interpret.

**Two hidden fields** (in Tally: type `/hidden`). The names must match exactly,
in lower case — the page sends these as URL parameters:

| name | receives |
|---|---|
| `event` | the exact event title, as published |
| `current` | the event's current published values, as one line |

**Then the questions:**

1. **What needs changing? (tick as many as apply)** — multiple choice with
   **Multiple selection** switched on, in the block menu. One report often covers
   two or three fields at once, and splitting that across submissions loses the
   connection between them. Options: days & times · venue · description ·
   contributors · ticket link · socials · event name ·
   category (exhibition, talk, tour…) · the event is cancelled · something else
2. A **text block**, before the next question, carrying the one instruction that
   decides whether a request can be acted on at all: write the corrected wording
   out in full. The fields are replaced wholesale, so an instruction like "delete
   the third line" cannot be applied, and anything omitted disappears. The same
   wording appears on the page above the form.
3. **Days and times** — a text block explaining the convention, then **one short
   answer per festival day**, labelled exactly as the CSV's day columns are:
   `thu 8 oct`, `tue 13 oct`, `wed 14 oct`, `thu 15 oct`, `fri 16 oct`,
   `sat 17 oct`, `sun 18 oct`. All seven optional. A participant fills in only
   the days that change, writing the time exactly as it should read — the same
   free text the CSV takes, semicolon and all, so "10am - 4pm; opening 6pm - 9pm"
   arrives ready to paste. One box per day is what makes "Thursday now has an
   opening at 6pm" expressible at all.
4. **Everything else - What should it say? Write it out in full.** — long answer.
   Optional, since a change to times alone is now covered by the day boxes.
5. **Your name** — short answer. Required.
6. **Your email** — email. Required.
7. **Anything else?** — long answer. Optional.
8. A closing **text block**: changes appear within 24 to 48 hours, and every one
   is read by a person before it goes live.

Questions are **required by default** in Tally. Only "What needs changing?",
"Your name" and "Your email" stay required; the seven day boxes, the catch-all
and "Anything else?" are all optional. Clicking the asterisk badge beside a
question label toggles it — the badge disappears when the question is optional,
and the same toggle also sits in the block menu on the drag handle.

**Multiple selection is not enough to allow more than one answer.** The toggle of
that name appears to work in the editor and does not survive publishing — the
live form kept rendering radio buttons. Use **Turn into → Checkboxes** on the
block menu instead, which does.

**Email notifications** are on, under Settings, sending to
contact@adelaidedesignweek.com.au on every submission.

---

## Connecting it

The form id is the tail of its share link — `https://tally.so/r/Ek2Mqq` — and it
lives in `src/_data/site.json`:

```json
"updatesFormId": "Ek2Mqq",
```

Empty that value and the page still works, showing the picker and explaining
itself, so the site is safe to deploy in either state.

The embed uses `data-tally-src` rather than `src`. Tally only grows an iframe to
fit its content for embeds it has adopted itself, and it adopts them by reading
that attribute; setting `src` directly leaves the form at a fixed height with its
last questions cut off.

---

## Afterwards

Requests arrive in one shape, each naming a real row. That means they can be
worked through in order against the spreadsheet — and, if the volume justifies
it, a script can read a Tally export and apply the straightforward ones to the
CSV directly, leaving a diff to approve rather than a list to retype.
