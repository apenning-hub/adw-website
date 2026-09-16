// Tests for src/_data/mapPoints.js — the join between the program and the
// geocoded venues. The pure join is exported separately from the Eleventy
// data function so it can be tested without a real venues.json.
//
// Run: npm test

const { test } = require("node:test");
const assert = require("node:assert");

const { buildFeatures, venueSlug, ICONS } = require("../src/_data/mapPoints.js");

// Two events at one venue, plus one elsewhere, plus one nowhere.
const EVENTS = [
  {
    title: "10 x 10", category: "EXH", categoryLabel: "exhibition",
    venue: "Jam Factory, ADL CBD", slug: "10-x-10", link: "",
    ticketed: false,
    sessions: [{ day: "sat 17 oct", times: ["6pm - 9pm"], ticketed: false }],
  },
  {
    title: "A Panel", category: "CONV", categoryLabel: "conversation",
    venue: "Jam Factory, ADL CBD", slug: "a-panel",
    link: "https://events.humanitix.com/x", ticketed: true,
    sessions: [{ day: "fri 16 oct", times: ["2pm"], ticketed: true }],
  },
  {
    title: "Out West", category: "OPEN", categoryLabel: "open studio",
    venue: "SODA, West Croyden", slug: "out-west", link: "", ticketed: false,
    sessions: [{ day: "sun 18 oct", times: ["(all day)"], ticketed: false }],
  },
  {
    title: "On The Move", category: "TOUR", categoryLabel: "tour",
    venue: "Travelling between events!", slug: "on-the-move", link: "",
    ticketed: false,
    sessions: [{ day: "sat 17 oct", times: ["10am"], ticketed: false }],
  },
];

const VENUES = {
  "Jam Factory, ADL CBD": { lat: -34.9205, lng: 138.5936, source: "mapbox", confidence: 0.9 },
  "SODA, West Croyden": { lat: -34.8865, lng: 138.5566, source: "manual" },
  "Travelling between events!": { skip: true, reason: "not a location" },
};

test("emits one feature per event, not per venue", () => {
  const { geojson } = buildFeatures(EVENTS, VENUES);
  // Three locatable events share two venues — per-venue would give 2.
  assert.strictEqual(geojson.features.length, 3);
});

test("a venue hosting two categories keeps both", () => {
  const { geojson } = buildFeatures(EVENTS, VENUES);
  const atJamFactory = geojson.features.filter(
    (f) => f.properties.venue === "Jam Factory, ADL CBD");
  assert.deepStrictEqual(
    atJamFactory.map((f) => f.properties.category).sort(), ["CONV", "EXH"]);
});

test("is a valid GeoJSON FeatureCollection with lng,lat in that order", () => {
  const { geojson } = buildFeatures(EVENTS, VENUES);
  assert.strictEqual(geojson.type, "FeatureCollection");
  const f = geojson.features[0];
  assert.strictEqual(f.type, "Feature");
  assert.strictEqual(f.geometry.type, "Point");
  // GeoJSON is longitude first. Getting this backwards puts Adelaide in Asia.
  assert.strictEqual(f.geometry.coordinates[0], 138.5936);
  assert.strictEqual(f.geometry.coordinates[1], -34.9205);
});

test("events at a skipped venue are dropped and reported, never silent", () => {
  const { geojson, dropped } = buildFeatures(EVENTS, VENUES);
  assert.ok(!geojson.features.some((f) => f.properties.title === "On The Move"));
  assert.strictEqual(dropped.length, 1);
  assert.strictEqual(dropped[0].title, "On The Move");
  assert.match(dropped[0].reason, /not a location/i);
});

test("events at a venue missing from venues.json are dropped and reported", () => {
  const { geojson, dropped } = buildFeatures(EVENTS, {});
  assert.strictEqual(geojson.features.length, 0);
  assert.strictEqual(dropped.length, 4);
  assert.match(dropped[0].reason, /not geocoded/i);
});

test("carries the properties the map and panel need", () => {
  const { geojson } = buildFeatures(EVENTS, VENUES);
  const p = geojson.features.find((f) => f.properties.title === "A Panel").properties;
  assert.strictEqual(p.category, "CONV");
  assert.strictEqual(p.categoryLabel, "conversation");
  assert.strictEqual(p.venue, "Jam Factory, ADL CBD");
  assert.strictEqual(p.venueSlug, "jam-factory-adl-cbd");
  assert.strictEqual(p.ticketed, true);
  assert.strictEqual(p.link, "https://events.humanitix.com/x");
  assert.strictEqual(p.slug, "a-panel");
  assert.deepStrictEqual(p.sessions, [{ day: "fri 16 oct", times: ["2pm"], ticketed: true }]);
});

test("every feature's iconKey is a registered icon", () => {
  const { geojson } = buildFeatures(EVENTS, VENUES);
  for (const f of geojson.features) {
    assert.ok(ICONS.includes(f.properties.iconKey),
      `${f.properties.iconKey} is not in ICONS`);
  }
});

test("venueSlug is url-safe and stable", () => {
  assert.strictEqual(venueSlug("Jam Factory, ADL CBD"), "jam-factory-adl-cbd");
  assert.strictEqual(venueSlug("Coldstore, 66 Wyatt St, Adelaide"),
    "coldstore-66-wyatt-st-adelaide");
  assert.strictEqual(venueSlug("Immersive Art & Installation"),
    "immersive-art-installation");
});

test("two venues cannot collide on one slug", () => {
  const events = [
    { ...EVENTS[0], venue: "Studio, ADL" },
    { ...EVENTS[1], venue: "Studio — ADL" },
  ];
  const venues = {
    "Studio, ADL": { lat: -34.9, lng: 138.6 },
    "Studio — ADL": { lat: -34.8, lng: 138.5 },
  };
  const { geojson } = buildFeatures(events, venues);
  const slugs = geojson.features.map((f) => f.properties.venueSlug);
  assert.strictEqual(new Set(slugs).size, 2, "distinct venues need distinct slugs");
});

// The venue list is what map.njk renders as the visually-hidden, keyboard
// reachable equivalent of the markers. Every venue on the map must be in it,
// or some venues are unreachable without a mouse.
const { venueList } = require("../src/_data/mapPoints.js");

test("venueList covers every venue on the map, once each", () => {
  const { geojson } = buildFeatures(EVENTS, VENUES);
  const list = venueList(geojson);
  assert.strictEqual(list.length, 2);
  assert.deepStrictEqual(
    list.map((v) => v.slug).sort(),
    [...new Set(geojson.features.map((f) => f.properties.venueSlug))].sort());
});

test("venueList is alphabetical and counts events per venue", () => {
  const { geojson } = buildFeatures(EVENTS, VENUES);
  const list = venueList(geojson);
  assert.deepStrictEqual(list.map((v) => v.venue),
    ["Jam Factory, ADL CBD", "SODA, West Croyden"]);
  assert.strictEqual(list[0].count, 2);
  assert.strictEqual(list[1].count, 1);
});

// program.njk needs to get from an event's venue string to its slug, so each
// entry can show a locator thumbnail and link into /map/?venue=.
const { slugByVenue } = require("../src/_data/mapPoints.js");

test("slugByVenue maps every mapped venue string to its slug", () => {
  const { geojson } = buildFeatures(EVENTS, VENUES);
  const lookup = slugByVenue(geojson);
  assert.strictEqual(lookup["Jam Factory, ADL CBD"], "jam-factory-adl-cbd");
  assert.strictEqual(lookup["SODA, West Croyden"], "soda-west-croyden");
});

test("slugByVenue omits venues that never made it onto the map", () => {
  // Otherwise the program page would link to a thumbnail that was never
  // rendered and a panel that cannot open.
  const { geojson } = buildFeatures(EVENTS, VENUES);
  const lookup = slugByVenue(geojson);
  assert.ok(!("Travelling between events!" in lookup));
});

// The sidebar filters the map by day. Mapbox filter expressions cannot look
// inside an array of session objects, so each feature carries a flat list of
// its day labels and a delimited string version for the filter to match on.
test("each feature carries the days it runs", () => {
  const { geojson } = buildFeatures(EVENTS, VENUES);
  const panel = geojson.features.find((f) => f.properties.title === "A Panel");
  assert.deepStrictEqual(panel.properties.days, ["fri 16 oct"]);
});

test("a multi-day event lists every day", () => {
  const events = [{
    ...EVENTS[0],
    sessions: [
      { day: "sat 17 oct", times: ["6pm"], ticketed: false },
      { day: "sun 18 oct", times: ["12pm"], ticketed: false },
    ],
  }];
  const { geojson } = buildFeatures(events, VENUES);
  assert.deepStrictEqual(geojson.features[0].properties.days,
    ["sat 17 oct", "sun 18 oct"]);
});

test("dayKeys is delimited so a day cannot match a substring of another", () => {
  const { geojson } = buildFeatures(EVENTS, VENUES);
  const p = geojson.features.find((f) => f.properties.title === "A Panel").properties;
  // Bare substring matching would make "fri 16 oct" match inside "fri 16 october",
  // so every key is fenced by the delimiter.
  assert.strictEqual(p.dayKeys, "|fri 16 oct|");
  assert.ok(p.dayKeys.includes("|fri 16 oct|"));
  assert.ok(!p.dayKeys.includes("|sat 17 oct|"));
});
