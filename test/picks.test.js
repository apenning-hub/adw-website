// Tests for src/_data/picks2026.js — the ADW picks spreadsheet.
//
// The picks sheet is edited by hand by people who are not developers, so the
// contract worth testing is: a wrong sheet fails loudly and in plain English,
// and a sheet that is merely INCOMPLETE — no designer, no coordinates, no
// address — publishes anyway. Most of the classics on this list were never
// designed by anyone with a letterhead; a parser that insisted otherwise
// would throw away the best half of the list.
//
// Run: npm test

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const MODULE = path.join(__dirname, "..", "src", "_data", "picks2026.js");
const CSV = path.join(__dirname, "..", "src", "_data", "picks-2026.csv");
const GEO = path.join(__dirname, "..", "src", "_data", "picks.json");

// The module reads two fixed paths, so a case swaps the files, runs, restores.
function withSheet(csv, geo, fn) {
  const csvWas = fs.readFileSync(CSV, "utf8");
  const geoWas = fs.readFileSync(GEO, "utf8");
  fs.writeFileSync(CSV, csv);
  if (geo !== null) fs.writeFileSync(GEO, JSON.stringify(geo));
  try {
    delete require.cache[require.resolve(MODULE)];
    return fn(require(MODULE));
  } finally {
    fs.writeFileSync(CSV, csvWas);
    fs.writeFileSync(GEO, geoWas);
    delete require.cache[require.resolve(MODULE)];
  }
}

const HEAD = "name,address,kind,designer,year,why,hannah_note,designer_words," +
             "designer_name,link,socials,show";

test("a pick with nothing but a name still publishes", () => {
  withSheet(`${HEAD}\nYing Chow,,,,,,,,,,,`, { venues: [] }, (build) => {
    const out = build();
    assert.strictEqual(out.count, 1);
    assert.strictEqual(out.picks[0].name, "Ying Chow");
    assert.strictEqual(out.picks[0].designer, null);
    assert.strictEqual(out.picks[0].mapped, false);
  });
});

test("an uncredited pick is counted as an open credit, not an error", () => {
  withSheet(`${HEAD}\nYing Chow,,classic,,1994,,,,,,,\n` +
            `Africola,,restaurant,Studio Gram,2014,,,,,,,,`,
    { venues: [] }, (build) => {
      assert.strictEqual(build().openCredits, 1);
    });
});

test("coordinates come from picks.json, never from the spreadsheet", () => {
  const geo = { venues: [{ name: "Ying Chow", lat: -34.93, lng: 138.595 }] };
  withSheet(`${HEAD}\nYing Chow,114 Gouger St,classic,,1994,,,,,,,`, geo, (build) => {
    const p = build().picks[0];
    assert.strictEqual(p.lat, -34.93);
    assert.strictEqual(p.mapped, true);
  });
});

test("a pick with no coordinates is listed but not mapped", () => {
  withSheet(`${HEAD}\nSomewhere New,,bar,,,,,,,,,`, { venues: [] }, (build) => {
    const out = build();
    assert.strictEqual(out.count, 1);
    assert.strictEqual(out.mappedCount, 0);
    assert.strictEqual(out.picks[0].mapped, false);
  });
});

test("show=N hides a row without deleting it", () => {
  withSheet(`${HEAD}\nGone,,bar,,,,,,,,,N\nHere,,bar,,,,,,,,,Y`,
    { venues: [] }, (build) => {
      const out = build();
      assert.deepStrictEqual(out.picks.map((p) => p.name), ["Here"]);
    });
});

test("a blank show column means show it", () => {
  withSheet(`${HEAD}\nHere,,bar,,,,,,,,,`, { venues: [] }, (build) => {
    assert.strictEqual(build().count, 1);
  });
});

test("the designer's words and their name are kept together", () => {
  withSheet(`${HEAD}\nA,,bar,,,,,"We wanted a room that felt found.",Matiya,,,`,
    { venues: [] }, (build) => {
      const w = build().picks[0].words;
      assert.strictEqual(w.text, "We wanted a room that felt found.");
      assert.strictEqual(w.by, "Matiya");
    });
});

test("words with nobody behind them are still shown, unattributed", () => {
  withSheet(`${HEAD}\nA,,bar,,,,,Something they said.,,,,`,
    { venues: [] }, (build) => {
      assert.strictEqual(build().picks[0].words.by, null);
    });
});

test("no words at all is null, not an empty quote", () => {
  withSheet(`${HEAD}\nA,,bar,,,,,,,,,`, { venues: [] }, (build) => {
    assert.strictEqual(build().picks[0].words, null);
  });
});

test("the same place twice is named, with both row numbers", () => {
  withSheet(`${HEAD}\nA,,bar,,,,,,,,,\nA,,pub,,,,,,,,,`, { venues: [] }, (build) => {
    assert.throws(() => build(), (err) => {
      assert.match(err.message, /"A" is in there twice/);
      assert.match(err.message, /row 2 and row 3/);
      return true;
    });
  });
});

test("an unknown kind is rejected and the valid ones listed", () => {
  withSheet(`${HEAD}\nA,,nightclub,,,,,,,,,`, { venues: [] }, (build) => {
    assert.throws(() => build(), (err) => {
      assert.match(err.message, /kind "nightclub"/);
      assert.match(err.message, /cellar door/);
      return true;
    });
  });
});

test("a misspelled column is named rather than silently ignored", () => {
  withSheet(`name,adress\nA,somewhere,,,,,,,,,,`, { venues: [] }, (build) => {
    assert.throws(() => build(), /not one the site knows about: "adress"/);
  });
});

test("a sheet with no name column is rejected", () => {
  withSheet(`address,kind\nsomewhere,bar,,,,,,,,,,`, { venues: [] }, (build) => {
    assert.throws(() => build(), /there is no "name" column/);
  });
});

test("every failure says the picks were not published", () => {
  withSheet(`address\nx,,,,,,,,,,,`, { venues: [] }, (build) => {
    assert.throws(() => build(), /The picks were not published/);
  });
});

test("blank rows are skipped, not counted as nameless picks", () => {
  withSheet(`${HEAD}\nA,,bar,,,,,,,,,\n,,,,,,,,,,,\nB,,bar,,,,,,,,,`,
    { venues: [] }, (build) => {
      assert.strictEqual(build().count, 2);
    });
});

test("a handle becomes an Instagram URL; a URL is left alone", () => {
  withSheet(`${HEAD}\nA,,bar,,,,,,,,@pinkmoonsaloon,\n` +
            `B,,bar,,,,,,,,https://example.com/x,,`, { venues: [] }, (build) => {
      const [a, b] = build().picks;
      assert.strictEqual(a.socials.url, "https://www.instagram.com/pinkmoonsaloon/");
      assert.strictEqual(a.socials.handle, "@pinkmoonsaloon");
      assert.strictEqual(b.socials.url, "https://example.com/x");
    });
});

test("only kinds something actually uses become filter chips", () => {
  withSheet(`${HEAD}\nA,,bar,,,,,,,,,\nB,,pub,,,,,,,,,`, { venues: [] }, (build) => {
    assert.deepStrictEqual(build().kinds, ["bar", "pub"]);
  });
});

test("picks are sorted by name", () => {
  withSheet(`${HEAD}\nZuma,,bar,,,,,,,,,\nAfricola,,bar,,,,,,,,,`,
    { venues: [] }, (build) => {
      assert.deepStrictEqual(build().picks.map((p) => p.name), ["Africola", "Zuma"]);
    });
});

test("the real spreadsheet parses, and most of it is on the map", () => {
  delete require.cache[require.resolve(MODULE)];
  const out = require(MODULE)();
  // Deliberately a short list: 30-40 excellent rooms, not a directory.
  assert.ok(out.count >= 30 && out.count <= 45,
            `expected 30-45 picks, got ${out.count}`);
  // Every one of them is walkable from the program, so they all place.
  assert.strictEqual(out.mappedCount, out.count,
            `${out.count - out.mappedCount} picks have no pin`);
  // Every mapped pick must be somewhere in South Australia. A geocoder that
  // silently returns the wrong hemisphere is the failure worth catching.
  for (const p of out.picks.filter((x) => x.mapped)) {
    assert.ok(p.lat < -33 && p.lat > -36.5 && p.lng > 137 && p.lng < 141,
              `${p.name} is at ${p.lat},${p.lng} — not in South Australia`);
  }
});
