// every*one 2026 — the ADW picks sheet's Publish menu.
//
// Lives in "ADW 2026 Picks — live map data" (Extensions → Apps Script). The
// website reads this sheet at build time (site.json picksSheetCsv); this script
// is what puts a new place on the map without anyone running code:
//
// - Every edit re-checks the sheet. Bad cells turn pale red with a note.
// - Publish → Publish map to website first gives a position to every row that
//   has an address but no lat/lng, using Google's geocoder. Only an exact
//   match inside greater Adelaide is accepted — anything vaguer turns the
//   address red instead, because a missing pin is honest and a guessed one
//   is not. A lat/lng already in the sheet is never overwritten: to re-place
//   a pin, clear both cells and publish again.
// - Then it checks everything, refuses while anything is red, and triggers
//   the same Cloudflare rebuild as the program sheet.
//
// Keep the rules in step with src/_data/picks2026.js.

const DEPLOY_HOOK = "PASTE_DEPLOY_HOOK_HERE";

const PICKS = {
  columns: ["name", "address", "kind", "designer", "year", "why", "hannah_note",
            "designer_words", "designer_name", "link", "socials", "show", "lat", "lng"],
  kinds: ["bar", "pub", "cafe", "restaurant", "fine dining", "cellar door",
          "brewery", "classic"],
  // Greater Adelaide, generously. The build's own bound is all of SA; this is
  // tighter because a geocoder hit in Mount Gambier is a wrong match here.
  bounds: { south: -35.45, west: 138.35, north: -34.55, east: 139.05 },
  colour: "#f8d0cc",
  mark: "⚠ ",
  store: "flaggedCells",
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Publish")
    .addItem("Publish map to website", "publishMap")
    .addItem("Check the picks", "checkPicksFromMenu")
    .addToUi();
}

function onEdit() {
  checkPicks_([]);
}

function publishMap() {
  const ui = SpreadsheetApp.getUi();
  addPickDropdowns();
  const placed = placeNewPicks_();
  const problems = checkPicks_(placed.problems);
  if (problems.length) {
    alertProblems_(problems, true);
    return;
  }
  const answer = ui.alert(
    "Publish the map?",
    (placed.count ? placed.count + (placed.count === 1 ? " new place was" : " new places were") +
      " given a pin.\n\n" : "") +
    "Everything in this sheet goes live on the map in about a minute.",
    ui.ButtonSet.OK_CANCEL);
  if (answer !== ui.Button.OK) return;

  const res = UrlFetchApp.fetch(DEPLOY_HOOK, { method: "post", muteHttpExceptions: true });
  if (res.getResponseCode() === 200) {
    ui.alert("Publishing. The map will update in about a minute.");
  } else {
    ui.alert("That didn't work. The map has not changed. " +
             "Try again, and if it keeps failing, send Andrew this: " + res.getResponseCode());
  }
}

function checkPicksFromMenu() {
  addPickDropdowns();
  const problems = checkPicks_([]);
  if (problems.length) alertProblems_(problems, false);
  else SpreadsheetApp.getUi().alert("All good — nothing to fix. Publish when you're ready.");
}

function alertProblems_(problems, publishing) {
  const rows = [...new Set(problems.map((p) => p.row))].sort((a, b) => a - b);
  SpreadsheetApp.getUi().alert(
    (publishing ? "Not published — " : "") + problems.length +
    (problems.length === 1 ? " problem" : " problems") + " to fix first",
    "Look for the red cells in row" + (rows.length === 1 ? " " : "s ") + rows.join(", ") +
    ". Hover over a red cell to see what is wrong.\n\n" +
    problems.slice(0, 5).map((p) => "Row " + p.row + ": " + p.msg).join("\n") +
    (problems.length > 5 ? "\n…and " + (problems.length - 5) + " more." : ""),
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function sheet_() {
  // The first tab (gid 384235406) is the one site.json picksSheetCsv reads.
  return SpreadsheetApp.getActive().getSheets()[0];
}

function columns_(header) {
  const col = {};
  header.forEach((h, i) => {
    const key = String(h).trim().toLowerCase();
    if (key && !(key in col)) col[key] = i;
  });
  return col;
}

// Geocode rows with an address and no position. Returns how many were placed,
// and a problem for each address that could not be placed exactly.
function placeNewPicks_() {
  const sheet = sheet_();
  const values = sheet.getDataRange().getDisplayValues();
  const col = columns_(values[0]);
  const out = { count: 0, problems: [] };
  if (!("address" in col) || !("lat" in col) || !("lng" in col)) return out;

  const b = PICKS.bounds;
  const geocoder = Maps.newGeocoder().setRegion("au").setBounds(b.south, b.west, b.north, b.east);
  values.slice(1).forEach((cells, n) => {
    const row = n + 2;
    const name = "name" in col ? String(cells[col.name] || "").trim() : "";
    const address = String(cells[col.address] || "").trim();
    const hasPos = String(cells[col.lat] || "").trim() || String(cells[col.lng] || "").trim();
    if (!name || !address || hasPos) return;

    const res = geocoder.geocode(address);
    const hit = (res.results || []).find((r) => {
      const loc = r.geometry.location;
      return !r.partial_match && r.geometry.location_type !== "APPROXIMATE" &&
        loc.lat > b.south && loc.lat < b.north && loc.lng > b.west && loc.lng < b.east;
    });
    if (!hit) {
      out.problems.push({ row: row, col: col.address,
        msg: "Couldn't find this address exactly, so it has no pin. Add a street " +
             "number and suburb (e.g. \"21 Leigh St, Adelaide SA 5000\"), or type the " +
             "position into lat and lng yourself." });
      return;
    }
    const loc = hit.geometry.location;
    sheet.getRange(row, col.lat + 1).setValue(Math.round(loc.lat * 1e6) / 1e6);
    sheet.getRange(row, col.lng + 1).setValue(Math.round(loc.lng * 1e6) / 1e6);
    out.count++;
  });
  SpreadsheetApp.flush();
  return out;
}

function checkPicks_(extra) {
  const sheet = sheet_();
  const values = sheet.getDataRange().getDisplayValues();
  const header = values[0].map((h) => String(h).trim());
  const col = columns_(header);
  const problems = extra.slice();
  const flag = (row, c, msg) => problems.push({ row: row, col: c, msg: msg });

  header.forEach((h, i) => {
    if (h && PICKS.columns.indexOf(h.toLowerCase()) < 0) {
      flag(1, i, '"' + h + '" isn\'t a column the website knows. The ones it reads are: ' +
           PICKS.columns.join(", ") + ". Rename it, or delete the column.");
    }
  });
  if (!("name" in col)) flag(1, 0, 'There is no "name" column. Every pick needs one.');

  const seen = {};
  const b = { south: -38.5, west: 129, north: -26, east: 141.1 };   // the build's own bound: SA
  values.slice(1).forEach((cells, n) => {
    const row = n + 2;
    const get = (k) => (k in col ? String(cells[col[k]] || "").trim() : "");
    if (cells.every((c) => !String(c).trim())) return;

    const name = get("name");
    if ("name" in col && !name) {
      flag(row, col.name, "No name. Every pick needs one — or clear the row.");
    }
    if (name) {
      if (seen[name]) {
        flag(row, col.name, '"' + name + '" is already in row ' + seen[name] + ". Delete one, " +
             "or rename it if they really are two different places.");
      } else seen[name] = row;
    }

    const kind = get("kind").toLowerCase();
    if (kind && PICKS.kinds.indexOf(kind) < 0) {
      flag(row, col.kind, '"' + get("kind") + '" isn\'t a kind. Use one of: ' +
           PICKS.kinds.join(", ") + ".");
    }

    const show = get("show");
    if (show && !/^(y|yes|n|no|true|false|1|0|x)$/i.test(show)) {
      flag(row, col.show, 'Use Y to show this place on the map, or N to hide it. Blank means Y.');
    }

    const latRaw = get("lat");
    const lngRaw = get("lng");
    if (latRaw || lngRaw) {
      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      if (!latRaw || !lngRaw || !isFinite(lat) || !isFinite(lng) ||
          lat > b.north || lat < b.south || lng < b.west || lng > b.east) {
        flag(row, col.lat,
             "lat and lng need to be a position in South Australia, both filled " +
             "(e.g. -34.9239, 138.5974). Clear both and publish to look the address up again.");
      }
    }

    get("link").split(/\s+/).filter(Boolean).forEach((l) => {
      if (!/^https?:\/\//i.test(l)) {
        flag(row, col.link, 'The link needs to start with https:// — "' + l + '" would ' +
             "send people back to the map instead.");
      }
    });
  });

  paint_(sheet, problems);
  return problems;
}

// Only cells this script flagged are ever changed back.
function paint_(sheet, problems) {
  const props = PropertiesService.getDocumentProperties();
  const before = JSON.parse(props.getProperty(PICKS.store) || "{}");
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
    if (r.getNote().indexOf(PICKS.mark) === 0) r.clearNote();
  });
  Object.keys(byCell).forEach((a1) => {
    const r = sheet.getRange(a1);
    now[a1] = a1 in before ? before[a1] : r.getBackground();
    r.setBackground(PICKS.colour);
    r.setNote(PICKS.mark + byCell[a1].join("\n\n" + PICKS.mark));
  });
  props.setProperty(PICKS.store, JSON.stringify(now));
}

// Dropdowns on kind and show, refreshed on every check and publish. Typing
// something else is still allowed; the check decides what is wrong.
function addPickDropdowns() {
  const sheet = sheet_();
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const col = columns_(header);
  const list = (name, items) => {
    if (!(name in col)) return;
    sheet.getRange(2, col[name] + 1, sheet.getMaxRows() - 1, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(items, true)
        .setAllowInvalid(true).build());
  };
  list("kind", PICKS.kinds);
  list("show", ["Y", "N"]);
}
