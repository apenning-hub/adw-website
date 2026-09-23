// ADW picks — the curated list of Adelaide rooms worth being in.
//
// Same deal as the program: picks-2026.csv is the source of truth and is meant
// to be edited in a spreadsheet by someone who does not write code. See
// docs/updating-the-picks.md.
//
// Columns. Only `name` is required; a row with nothing else still publishes,
// it just says less.
//   name            what it is called
//   address         street address, so the geocoder can place it exactly
//   kind            bar / pub / cafe / restaurant / fine dining / cellar door /
//                   brewery / classic — becomes a filter chip
//   designer        the practice, if it is known. BLANK IS FINE and honest:
//                   most of the classics were never designed by anyone with a
//                   letterhead, and a guess is worse than a gap.
//   year            when the room opened, or when it was fitted out
//   why             one line on why it earns a place
//   hannah_note     an editor's recommendation, shown as a pull quote
//   designer_words  the designer, in their own words, on what it meant to them
//   designer_name   who said that
//   link            website
//   socials         @handle or a URL
//   show            N hides the row without deleting it
//
//   lat, lng        optional. Filled in by the Google Sheet's Publish button,
//                   which geocodes any row whose address has no position yet
//                   and never overwrites one that has. Where they are blank,
//                   the position comes from picks.json (keyed by name, written
//                   by `npm run geocode-picks`), and failing that the pick is
//                   listed with no pin. A pin is never guessed.
//
// Since 24 Sep 2026 the Google Sheet (site.json picksSheetCsv) is the source
// of truth, as it is for the program; this CSV is the fallback when the sheet
// cannot be read.

const fs = require("fs");
const path = require("path");
const site = require("./site.json");
const { parseCsv } = require("./program2026.js");

const COLUMNS = ["name", "address", "kind", "designer", "year", "why",
                 "hannah_note", "designer_words", "designer_name",
                 "link", "socials", "show", "lat", "lng"];

// A position outside South Australia is a geocoder that matched the wrong
// Adelaide, or a typo. Either way it is refused rather than drawn.
const inSA = (lat, lng) => lat < -26 && lat > -38.5 && lng > 129 && lng < 141.1;

// Ordered: this is the order the filter chips appear in.
const KINDS = ["bar", "pub", "cafe", "restaurant", "fine dining",
               "cellar door", "brewery", "classic"];

function fail(msg) {
  throw new Error(
    `\n\n  picks-2026.csv — ${msg}\n\n` +
      `  The picks were not published. The site still shows the last good\n` +
      `  version. Fix the spreadsheet, export to CSV again, and re-publish.\n`
  );
}

const yes = (v) => /^(y|yes|true|1|x)$/i.test((v || "").trim());
const slug = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// An editor types a handle; a poster shows a handle. A full URL is accepted in
// the same cell so a Facebook page can go there without a second column.
function parseSocials(value) {
  const raw = (value || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    return { url: raw, handle: raw.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "") };
  }
  const handle = raw.replace(/^@/, "").replace(/\/$/, "");
  return { url: `https://www.instagram.com/${handle}/`, handle: `@${handle}` };
}

// Eleventy's entry point: the sheet if one is configured, else the committed
// CSV. Same arrangement as readProgram() in program2026.js.
async function load() {
  const csvPath = path.join(__dirname, "picks-2026.csv");
  const local = fs.existsSync(csvPath) ? fs.readFileSync(csvPath, "utf8") : null;
  const url = (site.picksSheetCsv || "").trim();
  if (url) {
    try {
      const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (/^\s*</.test(text) || !/^\s*name\s*,/i.test(text)) {
        throw new Error("that URL did not return the picks as CSV");
      }
      console.log(`[picks] loaded from the Google Sheet (${text.length} bytes)`);
      return build(text);
    } catch (err) {
      console.warn(`[picks] could not read the Google Sheet (${err.message}) — ` +
                   `publishing the last committed picks instead`);
    }
  }
  return local === null ? empty() : build(local);
}

function build(text) {
  if (text === undefined) {
    const csvPath = path.join(__dirname, "picks-2026.csv");
    if (!fs.existsSync(csvPath)) return empty();
    text = fs.readFileSync(csvPath, "utf8");
  }

  const rows = parseCsv(text);
  if (!rows.length) fail("the file is empty");

  const header = rows[0].cells.map((c) => c.trim().toLowerCase());
  for (const need of ["name"]) {
    if (!header.includes(need)) fail(`there is no "${need}" column`);
  }
  const unknown = header.filter((h) => h && !COLUMNS.includes(h));
  if (unknown.length) {
    fail(`this column is not one the site knows about: "${unknown[0]}".\n` +
         `  The ones it reads are: ${COLUMNS.join(", ")}`);
  }
  const at = (cells, col) => {
    const i = header.indexOf(col);
    return i === -1 ? "" : (cells[i] || "").trim();
  };

  const geo = readGeo();
  const seen = new Map();
  const picks = [];

  for (const row of rows.slice(1)) {
    const name = at(row.cells, "name");
    if (!name) continue;                       // a blank spacer row is fine
    if (!yes(at(row.cells, "show") || "y")) continue;

    if (seen.has(name)) {
      fail(`"${name}" is in there twice — row ${seen.get(name)} and row ${row.line}.\n` +
           `  Delete one, or rename it if they really are two different places.`);
    }
    seen.set(name, row.line);

    const kind = at(row.cells, "kind").toLowerCase();
    if (kind && !KINDS.includes(kind)) {
      fail(`row ${row.line} (${name}) has kind "${kind}", which is not one of:\n` +
           `  ${KINDS.join(", ")}`);
    }

    // The sheet's own position wins; picks.json covers rows the sheet has not
    // placed. Both blank or both half-filled is an honest "no pin".
    const latRaw = at(row.cells, "lat");
    const lngRaw = at(row.cells, "lng");
    let place = geo[name] || null;
    if (latRaw || lngRaw) {
      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      if (!latRaw || !lngRaw || !Number.isFinite(lat) || !Number.isFinite(lng) || !inSA(lat, lng)) {
        fail(`row ${row.line} (${name}) has lat "${latRaw}", lng "${lngRaw}", which is ` +
             `not a place in South Australia.\n  Clear both cells and publish again — ` +
             `the sheet's Publish button will look the address up.`);
      }
      place = { lat, lng };
    }
    const words = at(row.cells, "designer_words");

    picks.push({
      name,
      slug: slug(name),
      address: at(row.cells, "address") || null,
      kind: kind || "restaurant",
      designer: at(row.cells, "designer") || null,
      year: at(row.cells, "year") || null,
      why: at(row.cells, "why") || null,
      note: at(row.cells, "hannah_note") || null,
      // Kept together: a quote with no one behind it is not a quote.
      words: words ? { text: words, by: at(row.cells, "designer_name") || null } : null,
      link: at(row.cells, "link") || null,
      socials: parseSocials(at(row.cells, "socials")),
      lat: place ? place.lat : null,
      lng: place ? place.lng : null,
      // A pick with no coordinates is still listed — it just has no pin. That
      // is the same policy the program map uses: omit the pin, never guess it.
      mapped: !!(place && place.lat != null),
    });
  }

  picks.sort((a, b) => a.name.localeCompare(b.name, "en"));

  return {
    picks,
    kinds: KINDS.filter((k) => picks.some((p) => p.kind === k)),
    count: picks.length,
    mappedCount: picks.filter((p) => p.mapped).length,
    // What the sheet is still missing, so the gaps are visible rather than
    // quietly absent.
    openCredits: picks.filter((p) => !p.designer).length,
    withWords: picks.filter((p) => p.words).length,
  };
}

function readGeo() {
  const p = path.join(__dirname, "picks.json");
  if (!fs.existsSync(p)) return {};
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  return Object.fromEntries((raw.venues || []).map((v) => [v.name, v]));
}

const empty = () => ({ picks: [], kinds: [], count: 0,
                       mappedCount: 0, openCredits: 0, withWords: 0 });

module.exports = load;
module.exports.build = build;
module.exports.KINDS = KINDS;
module.exports.COLUMNS = COLUMNS;
