// Tests for the program sheet's column layout.
//
// The program is read from a Google Sheet, with the committed CSV as a
// fallback. Columns were matched by POSITION, which means the sheet, the CSV
// and program2026.js all had to agree exactly or the build failed and the
// program page froze. Adding an `address` column made that fragility real.
//
// So the fixed columns are now matched by NAME, and `address` is optional:
// the sheet can gain the column before or after this code ships, in either
// order, and nothing breaks either way.
//
// Run: npm test

const { test } = require("node:test");
const assert = require("node:assert");

const { parseHeader } = require("../src/_data/program2026.js");

const CORE = ["category", "title", "ticketed", "venue", "blurb", "link",
              "socials", "note", "contributors", "adw_presented"];
const DAYS = ["thu 8 oct", "wed 14 oct", "sat 17 oct"];

test("reads the existing layout, with no address column", () => {
  const { columns, days, hasAddress } = parseHeader([...CORE, ...DAYS]);
  assert.strictEqual(hasAddress, false);
  assert.strictEqual(columns.category, 0);
  assert.strictEqual(columns.venue, 3);
  assert.deepStrictEqual(days.map((d) => d.label), DAYS);
});

test("accepts an address column sitting next to venue", () => {
  // Where an organiser would naturally put it.
  const header = ["category", "title", "ticketed", "venue", "address",
                  "blurb", "link", "socials", "note", "contributors",
                  "adw_presented", ...DAYS];
  const { columns, days, hasAddress } = parseHeader(header);
  assert.strictEqual(hasAddress, true);
  assert.strictEqual(columns.address, 4);
  assert.strictEqual(columns.blurb, 5);
  assert.deepStrictEqual(days.map((d) => d.label), DAYS);
});

test("accepts an address column appended after the other fixed columns", () => {
  const header = [...CORE, "address", ...DAYS];
  const { columns, days, hasAddress } = parseHeader(header);
  assert.strictEqual(hasAddress, true);
  assert.strictEqual(columns.address, 10);
  assert.deepStrictEqual(days.map((d) => d.label), DAYS);
});

test("the fixed columns may be reordered without breaking the day columns", () => {
  // The whole point of matching by name: position stops being load-bearing.
  const header = ["title", "category", "venue", "address", "ticketed",
                  "blurb", "link", "socials", "note", "contributors",
                  "adw_presented", ...DAYS];
  const { columns, days } = parseHeader(header);
  assert.strictEqual(columns.title, 0);
  assert.strictEqual(columns.category, 1);
  assert.strictEqual(columns.address, 3);
  assert.deepStrictEqual(days.map((d) => d.label), DAYS);
});

test("a missing required column is named in plain language", () => {
  const header = CORE.filter((c) => c !== "venue").concat(DAYS);
  assert.throws(() => parseHeader(header), (err) => {
    assert.match(err.message, /venue/);
    assert.doesNotMatch(err.message, /undefined|\[object/);
    return true;
  });
});

test("day columns are everything that is not a known fixed column", () => {
  const { days } = parseHeader([...CORE, ...DAYS]);
  assert.strictEqual(days.length, 3);
  assert.strictEqual(days[0].index, CORE.length);
});

test("two day columns with the same heading are rejected", () => {
  // Otherwise one day silently reads the other's cells.
  const header = [...CORE, "sat 17 oct", "sat 17 oct"];
  assert.throws(() => parseHeader(header), /sat 17 oct/i);
});

test("no day columns at all is rejected", () => {
  assert.throws(() => parseHeader(CORE), /day column/i);
});
