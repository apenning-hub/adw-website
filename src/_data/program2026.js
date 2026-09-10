// every*one 2026 program — parsed from program-2026.csv.
//
// The CSV is the single source of truth and is meant to be edited in a
// spreadsheet by someone who does not write code. See docs/updating-the-program.md.
//
// Shape of the CSV: fixed columns (category, title, ticketed, venue, blurb, link)
// followed by one column per festival day. A blank day cell means the event is
// not on that day; any text means it runs, and that text is shown verbatim as
// its time. Two sessions in one day are separated by a semicolon.

const fs = require("fs");
const path = require("path");

const FIXED = ["category", "title", "ticketed", "venue", "blurb", "link"];
const CATEGORIES = {
  EXH: "exhibition",
  INST: "installation",
  CONV: "conversation",
  OPEN: "open studio",
  TOUR: "tour",
  WORK: "workshop",
};

// Minimal RFC-4180 parser: handles quoted fields, embedded commas and newlines.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function fail(msg) {
  throw new Error(
    `\n\n  program-2026.csv — ${msg}\n\n` +
      `  The program was not published. The site still shows the last good\n` +
      `  version. Fix the spreadsheet, export to CSV again, and re-publish.\n`
  );
}

module.exports = function () {
  const file = path.join(__dirname, "program-2026.csv");
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  if (rows.length < 2) fail("the file is empty, or has only a header row.");

  const header = rows[0].map((h) => h.trim());
  FIXED.forEach((col, i) => {
    if (header[i].toLowerCase() !== col) {
      fail(`column ${i + 1} should be "${col}" but is "${header[i]}". ` +
           `The first six columns must stay in order.`);
    }
  });

  const days = header.slice(FIXED.length).filter((d) => d.trim() !== "");
  if (!days.length) fail("no day columns found. Add at least one column after \"link\".");

  const seen = new Map();
  const events = rows.slice(1).map((cells, n) => {
    const line = n + 2; // 1-indexed, plus header
    const get = (name) => (cells[header.indexOf(name)] || "").trim();

    const category = get("category").toUpperCase();
    const title = get("title");
    const venue = get("venue");
    const ticketed = get("ticketed").toLowerCase();

    if (!title) fail(`row ${line} has no title.`);
    if (!CATEGORIES[category]) {
      fail(`row ${line} ("${title}") has category "${get("category")}". ` +
           `It must be one of: ${Object.keys(CATEGORIES).join(", ")}.`);
    }
    if (!venue) fail(`row ${line} ("${title}") has no venue.`);
    if (ticketed && ticketed !== "yes") {
      fail(`row ${line} ("${title}") has ticketed "${get("ticketed")}". ` +
           `Write "yes", or leave it empty.`);
    }

    const key = title.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) {
      fail(`row ${line} repeats the title "${title}", already used on row ` +
           `${seen.get(key)}. Each event needs one row; use the day columns to ` +
           `say which days it runs.`);
    }
    seen.set(key, line);

    const sessions = days
      .map((day) => {
        const cell = (cells[header.indexOf(day)] || "").trim();
        if (!cell) return null;
        return { day, times: cell.split(";").map((t) => t.trim()).filter(Boolean) };
      })
      .filter(Boolean);

    if (!sessions.length) {
      fail(`row ${line} ("${title}") has no times in any day column, so it would ` +
           `never appear. Add a time, or delete the row.`);
    }

    return {
      category,
      categoryLabel: CATEGORIES[category],
      title,
      venue,
      ticketed: ticketed === "yes",
      blurb: get("blurb"),
      link: get("link"),
      sessions,
      slug: key.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    };
  });

  // day-first view
  const byDay = days.map((day) => ({
    day,
    events: events
      .filter((e) => e.sessions.some((s) => s.day === day))
      .map((e) => ({ ...e, times: e.sessions.find((s) => s.day === day).times }))
      .sort((a, b) =>
        a.category === b.category
          ? a.title.localeCompare(b.title)
          : Object.keys(CATEGORIES).indexOf(a.category) -
            Object.keys(CATEGORIES).indexOf(b.category)
      ),
  })).filter((d) => d.events.length);

  const azSort = (a, b) =>
    a.title.replace(/^[^A-Za-z0-9]+/, "").localeCompare(
      b.title.replace(/^[^A-Za-z0-9]+/, ""), "en");

  return {
    days,
    byDay,
    az: [...events].sort(azSort),
    categories: CATEGORIES,
    count: events.length,
    sessionCount: events.reduce((n, e) => n + e.sessions.length, 0),
  };
};
