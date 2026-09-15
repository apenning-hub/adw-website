// Turning the program's times into calendar entries.
//
// The times column is written by hand for people to read, not for a machine:
// "10am - 5pm", "6pm - SUPER LATE", "(all day)", "Lunch 12pm / Dinner 6pm",
// "at 'BENCHED'". All of it is legitimate — it is what the venue told us — so
// the parser bends to the copy rather than the other way round.
//
// Anything it cannot time becomes an all-day entry carrying the original words,
// which is honest: the visitor still gets the right day and reads "at 'BENCHED'"
// in their calendar.

const MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
                 jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };

// "Thu 15 Oct" -> { y, m, d }
function parseDay(label, year) {
  const m = /(\d{1,2})\s+([a-z]{3})/i.exec(label);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (month === undefined) return null;
  return { y: year, m: month, d: Number(m[1]) };
}

// Every "6pm", "9.30am", "12:15pm", "11:00 AM" in a string, in order.
function clockTimes(text) {
  const out = [];
  const re = /(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/gi;
  let m;
  while ((m = re.exec(text))) {
    let h = Number(m[1]) % 12;
    if (/pm/i.test(m[3])) h += 12;
    out.push({ h, min: m[2] ? Number(m[2]) : 0 });
  }
  return out;
}

// One cell can hold two sittings — "Lunch 12pm / Dinner 6pm", "8am - 2pm
// opening 5pm -10pm" — so split before pairing anything up.
function segments(text) {
  return text.split(/\s*\/\s*|\s+(?=opening\b)/i).filter((s) => /\S/.test(s));
}

function parseSession(dayLabel, text, year) {
  const date = parseDay(dayLabel, year);
  if (!date) return [];
  const entries = [];

  for (const seg of segments(text)) {
    const times = clockTimes(seg);
    if (!times.length) continue;
    const start = times[0];
    let end = times[1] || null;
    if (!end) {
      // "6pm - SUPER LATE" is a party, not an hour-long meeting.
      const hours = /\blate\b/i.test(seg) ? 4 : 1;
      end = { h: Math.min(start.h + hours, 23), min: start.min };
      if (start.h + hours > 23) end = { h: 23, min: 59 };
    }
    // "10am - 12am" style wrap-around: an end before the start is the next day.
    const overnight = end.h * 60 + end.min <= start.h * 60 + start.min;
    entries.push({ date, start, end, overnight, label: seg.trim() });
  }

  // No clock anywhere — "(all day)", "at 'BENCHED'" — so give the day itself.
  if (!entries.length) entries.push({ date, allDay: true, label: text.trim() });
  return entries;
}

module.exports = { parseDay, clockTimes, segments, parseSession };

// --- Formatting -----------------------------------------------------------

const TZ = "Australia/Adelaide";
const pad = (n) => String(n).padStart(2, "0");

function partsIn(ts, tz) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(ts));
  const g = (t) => Number(f.find((p) => p.type === t).value);
  return { y: g("year"), m: g("month") - 1, d: g("day"), h: g("hour") % 24, mi: g("minute") };
}

// A wall-clock time in Adelaide -> the instant it actually happens. Converges
// in two passes, which is enough either side of a daylight-saving change.
function zonedToUTC(y, m, d, h, mi, tz = TZ) {
  let ts = Date.UTC(y, m, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const p = partsIn(ts, tz);
    ts -= Date.UTC(p.y, p.m, p.d, p.h, p.mi) - Date.UTC(y, m, d, h, mi);
  }
  return ts;
}

const localStamp = (y, m, d, h, mi) =>
  `${y}${pad(m + 1)}${pad(d)}T${pad(h)}${pad(mi)}00`;
const dateStamp = (y, m, d) => `${y}${pad(m + 1)}${pad(d)}`;

function utcStamp(ts) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
         `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

// Entry -> the stamps both a calendar file and a Google link need.
function stamps(entry) {
  const { date } = entry;
  if (entry.allDay) {
    const end = new Date(Date.UTC(date.y, date.m, date.d + 1));
    return {
      allDay: true,
      start: dateStamp(date.y, date.m, date.d),
      end: dateStamp(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
      googleStart: dateStamp(date.y, date.m, date.d),
      googleEnd: dateStamp(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
    };
  }
  const endDay = entry.overnight
    ? new Date(Date.UTC(date.y, date.m, date.d + 1))
    : new Date(Date.UTC(date.y, date.m, date.d));
  const e = { y: endDay.getUTCFullYear(), m: endDay.getUTCMonth(), d: endDay.getUTCDate() };
  return {
    allDay: false,
    start: localStamp(date.y, date.m, date.d, entry.start.h, entry.start.min),
    end: localStamp(e.y, e.m, e.d, entry.end.h, entry.end.min),
    googleStart: utcStamp(zonedToUTC(date.y, date.m, date.d, entry.start.h, entry.start.min)),
    googleEnd: utcStamp(zonedToUTC(e.y, e.m, e.d, entry.end.h, entry.end.min)),
  };
}

module.exports.TZ = TZ;
module.exports.stamps = stamps;
module.exports.zonedToUTC = zonedToUTC;
