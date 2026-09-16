// Tests for the Shopfront Design Circuit.
//
// The circuit is one event across eight East End shopfronts whose venue cell
// is "Various Locations, East End, ADL CBD". Neither Mapbox nor OpenStreetMap
// can resolve individual shop numbers on Ebenezer Place — both return the
// street centroid — so three of the eight geocoded to the *same* coordinate
// and the "route" between them was 264m of zigzag across a 96m precinct.
//
// It is therefore drawn as ONE mark on the precinct, with the shops listed.
// That is what the data supports, and what a visitor needs: they walk two
// short streets and look in windows.
//
// Run: npm test

const { test } = require("node:test");
const assert = require("node:assert");

const { buildCircuit } = require("../src/_data/mapPoints.js");

const CIRCUIT = {
  title: "SHOPFRONT DESIGN CIRCUIT",
  stops: [
    { name: "Jewels of Thought Records", designer: "Tom Borgas", address: "15 Ebenezer Place" },
    { name: "Nudie Jeans", designer: "Will Cheeseman", address: "230 Rundle Street" },
    { name: "Aesop", designer: "Andrew Carvolth", address: "232 Rundle Street" },
  ],
};

const COORDS = {
  "Jewels of Thought Records": { lat: -34.9230, lng: 138.6091 },
  "Nudie Jeans": { lat: -34.9224, lng: 138.6081 },
  "Aesop": { lat: -34.9223, lng: 138.6082 },
};

test("produces one marker, not one per shop", () => {
  const { marker } = buildCircuit(CIRCUIT, COORDS);
  assert.strictEqual(marker.type, "Feature");
  assert.strictEqual(marker.geometry.type, "Point");
});

test("the marker sits at the centre of the shops it covers", () => {
  const { marker } = buildCircuit(CIRCUIT, COORDS);
  const [lng, lat] = marker.geometry.coordinates;
  const lats = Object.values(COORDS).map((c) => c.lat);
  const lngs = Object.values(COORDS).map((c) => c.lng);
  assert.ok(lat > Math.min(...lats) - 1e-9 && lat < Math.max(...lats) + 1e-9);
  assert.ok(lng > Math.min(...lngs) - 1e-9 && lng < Math.max(...lngs) + 1e-9);
});

test("carries every shop, in order, for the panel to list", () => {
  const { marker } = buildCircuit(CIRCUIT, COORDS);
  const stops = JSON.parse(marker.properties.stops);
  assert.strictEqual(stops.length, 3);
  assert.strictEqual(stops[0].name, "Jewels of Thought Records");
  assert.strictEqual(stops[0].designer, "Tom Borgas");
  assert.strictEqual(stops[0].address, "15 Ebenezer Place");
});

test("a shop with no coordinates is still listed, just not counted for placing", () => {
  // Shop Pond could not be geocoded at all. It is still one of the eight
  // shopfronts and a visitor still needs to know it is there.
  const withExtra = { ...CIRCUIT, stops: [...CIRCUIT.stops,
    { name: "Shop Pond", designer: "Moraene", address: "Shop 4, 4-10 Ebenezer Place" }] };
  const { marker, missing } = buildCircuit(withExtra, COORDS);
  assert.deepStrictEqual(missing, ["Shop Pond"]);
  assert.strictEqual(JSON.parse(marker.properties.stops).length, 4);
});

test("no locatable shops means no marker at all", () => {
  const { marker, missing } = buildCircuit(CIRCUIT, {});
  assert.strictEqual(marker, null);
  assert.strictEqual(missing.length, 3);
});

test("no circuit configured is not an error", () => {
  const { marker, missing } = buildCircuit(null, COORDS);
  assert.strictEqual(marker, null);
  assert.deepStrictEqual(missing, []);
});

test("the marker knows how many shops it stands for", () => {
  const { marker } = buildCircuit(CIRCUIT, COORDS);
  assert.strictEqual(marker.properties.count, 3);
  assert.strictEqual(marker.properties.title, "SHOPFRONT DESIGN CIRCUIT");
});
