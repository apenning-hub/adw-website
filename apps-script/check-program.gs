// every*one 2026 — spreadsheet-side program check.
//
// Lives in the program Google Sheet (Extensions → Apps Script), next to the
// Publish menu. The website validates the sheet at build time too, but a build
// failure only shows up in the Cloudflare log: the site quietly keeps the last
// good version and nobody editing the sheet finds out. This runs the same rules
// inside the sheet, where the person who made the mistake can see it.
//
// - Every edit re-checks the sheet (simple onEdit trigger, no permissions).
// - Bad cells turn pale red and carry a note saying what is wrong.
// - Fixed cells go back to how they were; nothing else is touched.
// - programIsClean(true) is called at the top of Publish and refuses to publish
//   while anything is flagged.
//
// Keep the rules in step with src/_data/program2026.js. Not ported: the
// times-to-calendar parse (src/_lib/event-times.js) — the build still checks it.

const CHECK = {
  categories: ["EXH", "INST", "CONV", "OPEN", "TOUR", "WORK", "EVENT"],
  fixed: ["category", "title", "ticketed", "venue", "blurb", "link", "socials",
          "note", "contributors", "adw_presented"],
  optional: ["address"],
  colour: "#f8d0cc",
  mark: "⚠ ",                       // notes we wrote start with this
  store: "flaggedCells",            // A1 → original background
};

function onEdit() {
  checkProgram_();
}

// Menu item and the gate for Publish. Returns true when there is nothing wrong.
function programIsClean(publishing) {
  addDropdowns();                    // keeps the lists in step with new days
  const problems = checkProgram_();
  if (!problems.length) return true;
  const rows = [...new Set(problems.map((p) => p.row))].sort((a, b) => a - b);
  SpreadsheetApp.getUi().alert(
    (publishing ? "Not published — " : "") + problems.length +
    (problems.length === 1 ? " problem" : " problems") + " to fix first",
    "Look for the red cells in row" + (rows.length === 1 ? " " : "s ") +
    rows.join(", ") + ". Hover over a red cell to see what is wrong.\n\n" +
    problems.slice(0, 5).map((p) => "Row " + p.row + ": " + p.msg).join("\n") +
    (problems.length > 5 ? "\n…and " + (problems.length - 5) + " more." : ""),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return false;
}

// Publish → Check the program: the same check, without publishing.
function checkProgramFromMenu() {
  if (programIsClean(false)) {
    SpreadsheetApp.getUi().alert("All good — nothing to fix. Publish when you're ready.");
  }
}

function checkProgram_() {
  const sheet = SpreadsheetApp.getActive().getSheetById(0);  // gid=0, the tab the site reads
  const values = sheet.getDataRange().getDisplayValues();
  const header = values[0].map((h) => String(h).trim());
  const col = {};
  const days = [];
  const known = CHECK.fixed.concat(CHECK.optional);
  header.forEach((label, i) => {
    if (!label) return;
    const key = label.toLowerCase();
    if (known.indexOf(key) >= 0) { if (!(key in col)) col[key] = i; }
    else days.push({ label: label, key: key, index: i });
  });

  const problems = [];
  const flag = (row, c, msg) => problems.push({ row: row, col: c, msg: msg });
  const missing = CHECK.fixed.filter((k) => !(k in col));
  if (missing.length) {
    flag(1, 0, "The top row is missing the column" + (missing.length > 1 ? "s " : " ") +
         missing.map((m) => '"' + m + '"').join(", ") + ". Every column name must stay as it is.");
  }

  const seen = {};
  values.slice(1).forEach((cells, n) => {
    const row = n + 2;
    const get = (k) => (k in col ? String(cells[col[k]] || "").trim() : "");
    if (cells.every((c) => !String(c).trim())) return;       // empty row

    const title = get("title");
    if ("title" in col && !title) flag(row, col.title, "No title. Every event needs one.");

    if ("category" in col) {
      const raw = get("category");
      const codes = raw.toUpperCase().split(/[;/]/).map((c) => c.trim()).filter(Boolean);
      const bad = codes.filter((c) => CHECK.categories.indexOf(c) < 0);
      if (!codes.length) {
        flag(row, col.category, "No category. Use one of: " + CHECK.categories.join(", ") + ".");
      } else if (bad.length) {
        flag(row, col.category, '"' + bad.join(", ") + '" is not a category. Use one of: ' +
             CHECK.categories.join(", ") + ". Panels and talks are CONV. " +
             'Two at once: "CONV;EXH".');
      }
    }

    if ("venue" in col && !get("venue")) flag(row, col.venue, "No venue. Every event needs one.");

    if ("ticketed" in col) {
      const t = get("ticketed").toLowerCase();
      if (t && t !== "yes") {
        const wrong = t.split(";").map((d) => d.trim()).filter(Boolean)
          .filter((d) => !days.some((c) => c.key === d));
        if (wrong.length) {
          flag(row, col.ticketed, 'Write "yes" if every day is ticketed, leave it blank if ' +
               "it's free, or list the ticketed days exactly as the day columns are headed " +
               '(e.g. "' + (days[0] ? days[0].label : "wed 14 oct") + '"). "' +
               wrong.join(", ") + '" isn\'t one of those.');
        }
      }
    }

    if ("link" in col) {
      const lines = get("link").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let unnamed = 0;
      lines.forEach((line) => {
        const named = /^(.+?)\s*:\s*(https?:\/\/\S+)$/i.exec(line);
        const bare = /^(https?:\/\/\S+)$/i.exec(line);
        if (!named && !bare) {
          flag(row, col.link, 'The link "' + line + '" needs to start with https:// ' +
               '(or be a name, a colon, then the address: "LAUNCH PARTY : https://...").');
        } else if (/console\.humanitix\.com/i.test(line)) {
          flag(row, col.link, "This is the organiser's Humanitix admin page — visitors get a " +
               "login screen. Use the public page starting events.humanitix.com.");
        }
        if (bare) unnamed++;
      });
      if (lines.length > 1 && unnamed) {
        flag(row, col.link, 'With more than one link, each needs a name in front: ' +
             '"LAUNCH PARTY : https://...".');
      }
    }

    if (title) {
      const key = title.toLowerCase().replace(/\s+/g, " ");
      if (seen[key]) {
        flag(row, col.title, 'Same title as row ' + seen[key] + '. One event is one row — ' +
             "use the day columns for extra days.");
      } else seen[key] = row;
    }

    if (days.length && !days.some((d) => String(cells[d.index] || "").trim())) {
      flag(row, days[0].index, "No times in any day column, so this event would never appear. " +
           "Add a time under the day it runs.");
    }
  });

  paint_(sheet, problems);
  return problems;
}

// Colour and annotate this run's problems; restore cells flagged last time
// that are now fine. Only cells this script flagged are ever changed back.
function paint_(sheet, problems) {
  const props = PropertiesService.getDocumentProperties();
  const before = JSON.parse(props.getProperty(CHECK.store) || "{}");
  const now = {};
  const byCell = {};
  problems.forEach((p) => {
    const a1 = sheet.getRange(p.row, p.col + 1).getA1Notation();
    (byCell[a1] = byCell[a1] || []).push(p.msg);
  });

  Object.keys(before).forEach((a1) => {
    if (byCell[a1]) return;
    const r = sheet.getRange(a1);
    r.setBackground(before[a1] === "#ffffff" ? null : before[a1]);
    if (r.getNote().indexOf(CHECK.mark) === 0) r.clearNote();
  });

  Object.keys(byCell).forEach((a1) => {
    const r = sheet.getRange(a1);
    now[a1] = a1 in before ? before[a1] : r.getBackground();
    r.setBackground(CHECK.colour);
    r.setNote(CHECK.mark + byCell[a1].join("\n\n" + CHECK.mark));
  });

  props.setProperty(CHECK.store, JSON.stringify(now));
}

// Dropdowns on category and ticketed, refreshed on every check and publish so
// a new day column is picked up without anyone re-running setup. The lists
// hold every legitimate value — the seven codes plus any "CONV;EXH"-style pair
// already in use, and "yes" plus each day — so Google's own "Invalid" warning
// never lands on a correct cell. Other values can still be typed; the check
// above decides what is actually wrong.
function addDropdowns() {
  const sheet = SpreadsheetApp.getActive().getSheetById(0);
  const values = sheet.getDataRange().getDisplayValues();
  const header = values[0].map((h) => String(h).trim());
  const lower = header.map((h) => h.toLowerCase());
  const known = CHECK.fixed.concat(CHECK.optional);
  const days = header.filter((h, i) => h && known.indexOf(lower[i]) < 0);
  const inUse = (name, ok) => {
    const i = lower.indexOf(name);
    return values.slice(1).map((r) => String(r[i] || "").trim()).filter((v) => v && ok(v));
  };
  const isCats = (v) => v.toUpperCase().split(/[;/]/).map((c) => c.trim()).filter(Boolean)
    .every((c) => CHECK.categories.indexOf(c) >= 0);
  const isDays = (v) => v.split(";").map((d) => d.trim().toLowerCase()).filter(Boolean)
    .every((d) => days.some((h) => h.toLowerCase() === d));
  const list = (name, items) => {
    const i = lower.indexOf(name);
    if (i < 0) return;
    sheet.getRange(2, i + 1, sheet.getMaxRows() - 1, 1).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList([...new Set(items)], true)
        .setAllowInvalid(true).build());
  };
  list("category", CHECK.categories.concat(inUse("category", isCats)));
  list("ticketed", ["yes"].concat(days, inUse("ticketed", isDays)));
}
