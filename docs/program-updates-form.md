# The program updates form

`/program-updates/` is where participants report a change or an error in their
own listing. It is deliberately **not in the navigation and not indexed by
search engines** — the URL is given to participants directly, in the email that
tells them their listing is live.

The page itself is built. It needs one thing to go live: the Tally form.

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

## Building the Tally form

Create a new form in the same Tally account as the EOI form. Its questions
should mirror the spreadsheet's columns, because that is what makes a request
something Han can act on rather than interpret.

**Two hidden fields** (Tally: add a field, choose "Hidden field"). The names
must match exactly, in lower case:

| name | receives |
|---|---|
| `event` | the exact event title, as published |
| `current` | the event's current published values, as one line |

**Then the questions:**

1. **What needs changing?** — multiple choice, one answer:
   days & times · venue · description · contributors · ticket link ·
   socials · event name · category (exhibition, talk, tour…) ·
   the event is cancelled · something else
2. **What should it say?** — long answer. Required.
   Placeholder: *Write the correct details exactly as they should appear on the
   website.*
3. **Your name** — short answer. Required.
4. **Your email** — email. Required. *So we can check with you if anything is
   unclear.*
5. **Anything else?** — long answer. Optional.

Turn on **email notification on submission** in the form's settings, to whoever
is maintaining the program.

---

## Connecting it

Publish the form, take the id out of its URL — in `https://tally.so/r/3xAbC1`
the id is `3xAbC1` — and put it in `src/_data/site.json`:

```json
"updatesFormId": "3xAbC1",
```

Publish the site. Until that value is filled in, the page explains itself and
shows nothing but the event picker, so it is safe to deploy in either state.

---

## Afterwards

Requests arrive in one shape, each naming a real row. That means they can be
worked through in order against the spreadsheet — and, if the volume justifies
it, a script can read a Tally export and apply the straightforward ones to the
CSV directly, leaving a diff to approve rather than a list to retype.
