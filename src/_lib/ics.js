// Building iCalendar files.
//
// Shared by the per-event downloads and the whole-program feed, so both escape,
// fold and stamp the same way. iCalendar is unforgiving about all three.

const { TZ } = require("./event-times.js");

// RFC 5545: backslash, semicolon and comma are escaped; newlines become \n.
const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

// Lines wrap at 75 octets, continuations begin with a single space.
function fold(line) {
  const out = [];
  let buf = "";
  let bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch, "utf8");
    if (bytes + n > 74) { out.push(buf); buf = " "; bytes = 1; }
    buf += ch;
    bytes += n;
  }
  out.push(buf);
  return out.join("\r\n");
}

const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZ}`,
  "BEGIN:STANDARD",
  "DTSTART:19700405T030000",
  "TZOFFSETFROM:+1030",
  "TZOFFSETTO:+0930",
  "TZNAME:ACST",
  "RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SU",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "DTSTART:19701004T020000",
  "TZOFFSETFROM:+0930",
  "TZOFFSETTO:+1030",
  "TZNAME:ACDT",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=1SU",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
];

// One VEVENT per sitting of one event.
function veventsFor(event, base, stamp, withVenue) {
  const url = `${base}/program/#${event.slug}`;
  const blurb = event.blurbParas && event.blurbParas.length ? event.blurbParas[0] : "";
  const description = [blurb, event.link ? `Tickets: ${event.link}` : "", `Details: ${url}`]
    .filter(Boolean)
    .join("\n\n");

  const lines = [];
  event.calendar.entries.forEach((c, i) => {
    lines.push(
      "BEGIN:VEVENT",
      fold(`UID:${event.slug}-${i + 1}@everyone.adelaidedesignweek.com.au`),
      `DTSTAMP:${stamp}`,
      `LAST-MODIFIED:${stamp}`,
      c.allDay ? `DTSTART;VALUE=DATE:${c.start}` : `DTSTART;TZID=${TZ}:${c.start}`,
      c.allDay ? `DTEND;VALUE=DATE:${c.end}` : `DTEND;TZID=${TZ}:${c.end}`,
      fold(`SUMMARY:${esc(event.title)}`),
      // No LOCATION until the venue addresses are confirmed — site.json's
      // calendarVenues. Better an event with no address than one with the
      // wrong address sitting in someone's calendar.
      ...(withVenue ? [fold(`LOCATION:${esc(event.venue)}`)] : []),
      fold(`DESCRIPTION:${esc(description)}`),
      fold(`URL:${esc(url)}`),
      // The times column sometimes says more than a clock can — "at 'BENCHED'",
      // "6pm - SUPER LATE" — so keep the original words alongside.
      fold(`X-ADW-TIMES:${esc(c.label)}`),
      "END:VEVENT"
    );
  });
  return lines;
}

// `name` shows as the calendar's title when someone subscribes.
function calendar(events, base, name, withVenue) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Adelaide Design Week//every*one 2026//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${esc(name)}`),
    `X-WR-TIMEZONE:${TZ}`,
    // Ask subscribing clients to look again every few hours, so a change to
    // the program reaches someone's calendar the same day it is published.
    "REFRESH-INTERVAL;VALUE=DURATION:PT4H",
    "X-PUBLISHED-TTL:PT4H",
    ...VTIMEZONE,
  ];
  events.forEach((e) => lines.push(...veventsFor(e, base, stamp, withVenue)));
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

module.exports = { esc, fold, VTIMEZONE, veventsFor, calendar };
