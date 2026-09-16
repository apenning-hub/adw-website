// Tests for the Shopfront Design Circuit path.
//
// The circuit is one program event whose venue cell is "Various Locations,
// East End, ADL CBD" — not a place, so it cannot be pinned. Its stops live in
// the contributors column. This builds them into a line on the map.
//
// Run: npm test

const { test } = require("node:test");
const assert = require("node:assert");

const { buildCircuit } = require("../src/_data/mapPoints.js");

const CIRCUIT = {
  title: "SHOPFRONT DESIGN CIRCUIT",
  stops: [
    { name: "Jewels of Thought Records", designer: "Tom Borgas" },
    { name: "Nudie Jeans", designer: "Will Cheeseman" },
    { name: "Aesop", designer: "Andrew Carvolth" },
  ],
};

const COORDS = {
  "Jewels of Thought Records": { lat: -34.9235, lng: 138.6100 },
  "Nudie Jeans": { lat: -34.9228, lng: 138.6085 },
  "Aesop": { lat: -34.9220, lng: 138.6070 },
};

test("draws one line through the stops, in the order listed", () => {
  const { line } = buildCircuit(CIRCUIT, COORDS);
  assert.strictEqual(line.geometry.type, "LineString");
  assert.deepStrictEqual(line.geometry.coordinates, [
    [138.6100, -34.9235],
    [138.6085, -34.9228],
    [138.6070, -34.9220],
  ]);
});

test("gives every stop a point, numbered along the walk", () => {
  const { points } = buildCircuit(CIRCUIT, COORDS);
  assert.strictEqual(points.features.length, 3);
  assert.deepStrictEqual(points.features.map((f) => f.properties.step), [1, 2, 3]);
  assert.strictEqual(points.features[0].properties.name, "Jewels of Thought Records");
  assert.strictEqual(points.features[0].properties.designer, "Tom Borgas");
});

test("a stop with no coordinates is reported, never silently skipped", () => {
  const { line, points, missing } = buildCircuit(CIRCUIT, {
    "Nudie Jeans": { lat: -34.9228, lng: 138.6085 },
  });
  assert.deepStrictEqual(missing, ["Jewels of Thought Records", "Aesop"]);
  assert.strictEqual(points.features.length, 1);
  // One point is not a path.
  assert.strictEqual(line, null);
});

test("the numbering follows the walk, not the data", () => {
  // Reordering the list reorders the walk. That is the whole contract.
  const reversed = { ...CIRCUIT, stops: [...CIRCUIT.stops].reverse() };
  const { points } = buildCircuit(reversed, COORDS);
  assert.strictEqual(points.features[0].properties.name, "Aesop");
  assert.strictEqual(points.features[0].properties.step, 1);
});

test("no circuit configured is not an error", () => {
  const { line, points, missing } = buildCircuit(null, COORDS);
  assert.strictEqual(line, null);
  assert.strictEqual(points.features.length, 0);
  assert.deepStrictEqual(missing, []);
});
