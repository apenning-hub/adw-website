// every*one 2026 program — parsed from program-2026.csv.
//
// The CSV is the single source of truth and is meant to be edited in a
// spreadsheet by someone who does not write code. See docs/updating-the-program.md.
//
// Shape of the CSV: fixed columns (category, title, ticketed, venue, blurb, link)
// followed by one column per festival day. A blank day cell means the event is
// not on that day; any text means it runs, and that text is shown verbatim as
// its time. Two sessions in one day are separated by a semicolon.
//
// Every failure here must produce a plain-language message naming the
// spreadsheet row, never a stack trace: the people editing this file are not
// developers, and a build that dies obscurely is worse than no validation.

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

// Preview days (a single launch event, say) sit before the festival proper.
// Landing the day view on one of those shows a near-empty program, so the
// default day is the first that carries a real share of the largest day.
const MAIN_DAY_SHARE = 0.25;

function fail(msg) {
  throw new Error(
    `\n\n  program-2026.csv — ${msg}\n\n` +
      `  The program was not published. The site still shows the last good\n` +
      `  version. Fix the spreadsheet, export to CSV again, and re-publish.\n`
  );
}

// Minimal RFC-4180 parser: handles quoted fields, embedded commas and newlines.
// Each row keeps its original 1-based file line so error messages match what
// the editor sees in their spreadsheet, even after blank rows are dropped.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else {
        if (c === "\n") line++;
        field += c;
      }
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") {
      row.push(field);
      rows.push({ cells: row, line: rowLine });
      row = []; field = ""; line++; rowLine = line;
    } else if (c !== "\r") field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push({ cells: row, line: rowLine });
  }
  // An unclosed quote swallows everything after it into one field, which would
  // otherwise publish a handful of events and silently drop the rest.
  if (quoted) {
    fail(
      `there is an unclosed quotation mark (") somewhere from row ${rowLine} onwards.\n` +
      `  Every " must be paired. If a venue or blurb needs a literal quote mark,\n` +
      `  the spreadsheet will handle it for you — just retype the cell and export again.`
    );
  }
  return rows.filter((r) => r.cells.some((v) => v.trim() !== ""));
}

module.exports = function () {
  const file = path.join(__dirname, "program-2026.csv");
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  if (rows.length < 2) fail("the file is empty, or has only a header row.");

  const header = rows[0].cells.map((h) => (h || "").trim());
  FIXED.forEach((col, i) => {
    if (!header[i] || header[i].toLowerCase() !== col) {
      fail(
        `column ${i + 1} should be "${col}" but is ` +
        `${header[i] ? `"${header[i]}"` : "missing"}. ` +
        `The first six columns must stay in order.`
      );
    }
  });

  // Day columns are positional: everything after the fixed columns, in order.
  // Keep the index alongside the label so two columns sharing a heading can be
  // caught rather than silently reading the same cell twice.
  const days = [];
  header.slice(FIXED.length).forEach((label, i) => {
    const name = (label || "").trim();
    if (!name) return;
    if (days.some((d) => d.label.toLowerCase() === name.toLowerCase())) {
      fail(`there are two day columns both headed "${name}". Give each day its own heading.`);
    }
    days.push({ label: name, index: FIXED.length + i });
  });
  if (!days.length) fail('no day columns found. Add at least one column after "link".');

  // Fixed columns were verified to be in order above, so index by position.
  const COL = Object.fromEntries(FIXED.map((c, i) => [c, i]));

  const seen = new Map();
  const slugs = new Map();
  const events = rows.slice(1).map(({ cells, line }) => {
    const get = (name) => (cells[COL[name]] || "").trim();

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
      .map(({ label, index }) => {
        const cell = (cells[index] || "").trim();
        if (!cell) return null;
        return { day: label, times: cell.split(";").map((t) => t.trim()).filter(Boolean) };
      })
      .filter(Boolean);

    if (!sessions.length) {
      fail(`row ${line} ("${title}") has no times in any day column, so it would ` +
           `never appear. Add a time, or delete the row.`);
    }

    // Slugs drive the anchor ids used for deep links. Titles differing only in
    // punctuation collapse to the same slug, so disambiguate rather than emit
    // duplicate DOM ids.
    let slug = key.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "event";
    const taken = slugs.get(slug);
    if (taken) slug = `${slug}-${taken + 1}`;
    slugs.set(slug.replace(/-\d+$/, ""), (taken || 0) + 1);

    return {
      category,
      categoryLabel: CATEGORIES[category],
      title, venue,
      ticketed: ticketed === "yes",
      blurb: get("blurb"),
      link: get("link"),
      sessions,
      slug,
    };
  });

  const byDay = days.map(({ label }) => ({
    day: label,
    events: events
      .filter((e) => e.sessions.some((s) => s.day === label))
      .map((e) => ({ ...e, times: e.sessions.find((s) => s.day === label).times }))
      .sort((a, b) =>
        a.category === b.category
          ? a.title.localeCompare(b.title)
          : Object.keys(CATEGORIES).indexOf(a.category) -
            Object.keys(CATEGORIES).indexOf(b.category)
      ),
  })).filter((d) => d.events.length);

  const busiest = Math.max(...byDay.map((d) => d.events.length));
  const defaultDay = (byDay.find((d) => d.events.length >= busiest * MAIN_DAY_SHARE)
    || byDay[0]).day;

  const azSort = (a, b) =>
    a.title.replace(/^[^A-Za-z0-9]+/, "").localeCompare(
      b.title.replace(/^[^A-Za-z0-9]+/, ""), "en");

  return {
    days: days.map((d) => d.label),
    byDay,
    defaultDay,
    az: [...events].sort(azSort),
    categories: CATEGORIES,
    count: events.length,
    sessionCount: events.reduce((n, e) => n + e.sessions.length, 0),
  };
};
