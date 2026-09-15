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
const site = require("./site.json");

const FIXED = ["category", "title", "ticketed", "venue", "blurb", "link", "socials",
               "note", "contributors", "adw_presented"];
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

// Editors type a handle, not a URL — "@shopfront_design_sprint" is what appears
// on a poster. A full URL is accepted too, so a Facebook page or a website can
// go in the same cell without a second column.
function parseSocials(value) {
  const raw = value.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    const handle = raw.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
    return { url: raw, handle };
  }
  const handle = raw.replace(/^@/, "").replace(/\/$/, "");
  return { url: `https://www.instagram.com/${handle}/`, handle: `@${handle}` };
}

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

// The program lives in a Google Sheet so it can be edited by the people who run
// the festival. The copy committed here is the safety net: if the sheet is
// unreachable, unpublished or slow, the build uses the last known good program
// rather than failing or publishing an empty page.
async function readProgram() {
  const file = path.join(__dirname, "program-2026.csv");
  const local = fs.readFileSync(file, "utf8");
  const url = (site.programSheetCsv || "").trim();
  if (!url) {
    console.log("[program] no sheet configured — using the committed CSV");
    return local;
  }
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    // A sheet that has been unpublished answers with an HTML page, not a CSV.
    if (/^\s*</.test(text) || !/^category\s*,/i.test(text)) {
      throw new Error("that URL did not return the program as CSV");
    }
    console.log(`[program] loaded from the Google Sheet (${text.length} bytes)`);
    return text;
  } catch (err) {
    console.warn(
      `[program] could not read the Google Sheet (${err.message}) — ` +
      `publishing the last committed program instead`
    );
    return local;
  }
}

module.exports = async function () {
  const rows = parseCsv(await readProgram());
  if (rows.length < 2) fail("the file is empty, or has only a header row.");

  const header = rows[0].cells.map((h) => (h || "").trim());
  FIXED.forEach((col, i) => {
    if (!header[i] || header[i].toLowerCase() !== col) {
      fail(
        `column ${i + 1} should be "${col}" but is ` +
        `${header[i] ? `"${header[i]}"` : "missing"}. ` +
        `The first ${FIXED.length} columns must stay in order.`
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
    // Ticketing is often not the whole run: an exhibition can be free all week
    // with one ticketed opening. So "ticketed" is either "yes" for every day, or
    // the days that are ticketed, written exactly as the day columns are headed.
    const ticketedRaw = get("ticketed");
    const ticketed = ticketedRaw.toLowerCase();

    if (!title) fail(`row ${line} has no title.`);
    if (!CATEGORIES[category]) {
      fail(`row ${line} ("${title}") has category "${get("category")}". ` +
           `It must be one of: ${Object.keys(CATEGORIES).join(", ")}.`);
    }
    if (!venue) fail(`row ${line} ("${title}") has no venue.`);
    const ticketedDays = ticketed && ticketed !== "yes"
      ? ticketed.split(";").map((d) => d.trim()).filter(Boolean)
      : [];
    ticketedDays.forEach((d) => {
      if (!days.some((col) => col.label.toLowerCase() === d)) {
        fail(
          `row ${line} ("${title}") has ticketed "${ticketedRaw}". Write "yes" if ` +
          `every day is ticketed, or the days that are — exactly as the day ` +
          `columns are headed, separated by semicolons, e.g. "wed 14 oct". ` +
          `There is no day column called "${d}".`
        );
      }
    });

    // A link without a scheme is resolved against this site, so "www.x.com.au"
    // silently becomes /program/www.x.com.au and the button loops back here.
    const link = get("link");
    if (link && !/^https?:\/\//i.test(link)) {
      fail(
        `row ${line} ("${title}") has link "${link}", which is missing the ` +
        `https:// at the front. Without it the button sends people back to the ` +
        `program instead of out to the ticket page.`
      );
    }

    if (/console\.humanitix\.com/i.test(link)) {
      fail(
        `row ${line} ("${title}") links to console.humanitix.com, which is the ` +
        `organiser's own admin page — anyone clicking it gets a login screen. ` +
        `Use the public ticket page instead, the one starting ` +
        `events.humanitix.com.`
      );
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
        return {
          day: label,
          times: cell.split(";").map((t) => t.trim()).filter(Boolean),
          ticketed: ticketed === "yes" || ticketedDays.includes(label.toLowerCase()),
        };
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
      // True when any day is ticketed — the a–z list has no day to be specific about.
      ticketed: Boolean(ticketed),
      ticketedEveryDay: ticketed === "yes",
      note: get("note"),
      blurb: get("blurb"),
      // A blank line in the cell is a paragraph break. Long blurbs arrive written
      // as several paragraphs and ran together as one block before this.
      blurbParas: get("blurb").split(/\n\s*\n/).map((t) => t.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean),
      link,
      socials: parseSocials(get("socials")),
      // Semicolon-separated, same rule as two sessions in one day.
      contributors: get("contributors").split(";").map((n) => n.trim()).filter(Boolean),
      adwPresented: get("adw_presented").toLowerCase() === "yes",
      sessions,
      slug,
    };
  });

  const byDay = days.map(({ label }) => ({
    day: label,
    events: events
      .filter((e) => e.sessions.some((s) => s.day === label))
      .map((e) => {
        const s = e.sessions.find((x) => x.day === label);
        // In a day's list, "ticketed" means ticketed *that day* — an exhibition
        // with one ticketed opening should not wear the asterisk all week.
        return { ...e, times: s.times, ticketed: s.ticketed, anyTicketed: e.ticketed };
      })
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
    az: [...events].map((e) => ({ ...e, anyTicketed: e.ticketed })).sort(azSort),
    categories: CATEGORIES,
    count: events.length,
    sessionCount: events.reduce((n, e) => n + e.sessions.length, 0),
  };
};
