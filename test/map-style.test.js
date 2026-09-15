// Tests for src/assets/js/map-style.js — the basemap rules.
//
// transform() is the pure half: it takes a Mapbox style document and returns
// a rebranded one. scripts/publish-map-style.js uses it to publish the style
// to Mapbox so the static locator thumbnails match the live map exactly, and
// map.js uses the same rules at runtime when no published style is set.
// One table, both paths — they cannot drift.
//
// Run: npm test

const { test } = require("node:test");
const assert = require("node:assert");

const { transform, paletteFromCss } = require("../src/assets/js/map-style.js");

const COLOURS = {
  paper: "#ECEFE8",
  water: "#DDE0D9",
  line: "#C9C9CB",
  ink: "#333333",
  inkStrong: "#000000",
  inkSoft: "#5F5F5F",
  yellow: "#FEFF35",
};

// A miniature of light-v11's real shape: the layer ids are the ones Mapbox
// actually ships.
const STYLE = {
  version: 8,
  name: "Light",
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  sprite: "mapbox://sprites/mapbox/light-v11",
  sources: { composite: { type: "vector", url: "mapbox://mapbox.mapbox-streets-v8" } },
  layers: [
    { id: "land", type: "background", paint: { "background-color": "#f8f8f8" } },
    { id: "landuse", type: "fill", paint: { "fill-color": "#eee" } },
    { id: "national-park", type: "fill", paint: { "fill-color": "#e0f0d0" } },
    { id: "water", type: "fill", paint: { "fill-color": "#a0c8f0" } },
    { id: "waterway", type: "line", paint: { "line-color": "#a0c8f0" } },
    { id: "building", type: "fill", paint: { "fill-color": "#ddd" } },
    { id: "road-primary", type: "line", paint: { "line-color": "#fff", "line-width": 4 } },
    { id: "bridge-motorway", type: "line", paint: { "line-color": "#fff" } },
    { id: "poi-label", type: "symbol", paint: { "text-color": "#666" }, layout: {} },
    { id: "transit-label", type: "symbol", paint: { "text-color": "#666" }, layout: {} },
    { id: "airport-label", type: "symbol", paint: { "text-color": "#666" }, layout: {} },
    { id: "road-label", type: "symbol", paint: { "text-color": "#666" }, layout: {} },
    { id: "settlement-label", type: "symbol", paint: { "text-color": "#333" }, layout: {} },
  ],
};

const ids = (style) => style.layers.map((l) => l.id);

test("strips the layers that make a general-purpose map noisy", () => {
  const out = transform(STYLE, COLOURS);
  for (const gone of ["poi-label", "transit-label", "airport-label",
                      "building", "landuse", "national-park"]) {
    assert.ok(!ids(out).includes(gone), `${gone} should have been removed`);
  }
});

test("keeps land, water, roads and place names", () => {
  const out = transform(STYLE, COLOURS);
  for (const kept of ["land", "water", "waterway", "road-primary",
                      "bridge-motorway", "road-label", "settlement-label"]) {
    assert.ok(ids(out).includes(kept), `${kept} should have been kept`);
  }
});

test("land becomes paper", () => {
  const out = transform(STYLE, COLOURS);
  const land = out.layers.find((l) => l.id === "land");
  assert.strictEqual(land.paint["background-color"], "#ECEFE8");
});

test("water becomes paper one shade down, as fill and as line", () => {
  const out = transform(STYLE, COLOURS);
  assert.strictEqual(
    out.layers.find((l) => l.id === "water").paint["fill-color"], "#DDE0D9");
  assert.strictEqual(
    out.layers.find((l) => l.id === "waterway").paint["line-color"], "#DDE0D9");
});

test("roads become hairlines in the rule grey", () => {
  const out = transform(STYLE, COLOURS);
  const road = out.layers.find((l) => l.id === "road-primary");
  assert.strictEqual(road.paint["line-color"], "#C9C9CB");
  assert.ok(Array.isArray(road.paint["line-width"]), "width should be a zoom ramp");
  assert.strictEqual(road.paint["line-width"][0], "interpolate");
});

test("labels are lowercased and set in the accessible grey", () => {
  const out = transform(STYLE, COLOURS);
  const label = out.layers.find((l) => l.id === "settlement-label");
  assert.strictEqual(label.layout["text-transform"], "lowercase");
  // #5F5F5F is 5.5:1 on paper. The 55%-black brand grey #747474 is 4.02:1
  // and fails AA, so it must never end up here.
  assert.strictEqual(label.paint["text-color"], "#5F5F5F");
  assert.strictEqual(label.paint["text-halo-color"], "#ECEFE8");
});

test("yellow is spent nowhere on the basemap", () => {
  const out = transform(STYLE, COLOURS);
  // Yellow is the only highlight on the site. If the terrain wears it, the
  // asterisks have nothing left to be.
  assert.ok(!JSON.stringify(out).toUpperCase().includes("FEFF35"));
});

test("does not mutate the style it was given", () => {
  const before = JSON.stringify(STYLE);
  transform(STYLE, COLOURS);
  assert.strictEqual(JSON.stringify(STYLE), before);
});

test("carries sources, glyphs and sprite through untouched", () => {
  const out = transform(STYLE, COLOURS);
  assert.deepStrictEqual(out.sources, STYLE.sources);
  assert.strictEqual(out.glyphs, STYLE.glyphs);
  assert.strictEqual(out.sprite, STYLE.sprite);
});

test("reads the brand palette out of site.css", () => {
  const css = `:root {
    --paper: #ECEFE8;        /* off white */
    --yellow: #FEFF35;
    --ink: #333333;
    --ink-strong: #000000;
    --ink-soft: #5F5F5F;
    --line: #C9C9CB;
  }`;
  const p = paletteFromCss(css);
  assert.strictEqual(p.paper, "#ECEFE8");
  assert.strictEqual(p.inkSoft, "#5F5F5F");
  assert.strictEqual(p.line, "#C9C9CB");
  assert.strictEqual(p.yellow, "#FEFF35");
  // Derived, not a brand value — there is no brand colour for water.
  assert.strictEqual(p.water, "#DDE0D9");
});
