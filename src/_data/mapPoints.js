// Map points — the join between the program and the geocoded venues.
//
// Emits GeoJSON for /map/. One feature per EVENT, not per venue: seven
// venues host two categories each (Jam Factory, AGSA, Hebart Hall and the
// rest), and a per-venue feature would have to pick one category and lie
// about the other. Events sharing a coordinate are absorbed by clustering
// on the map instead.
//
// Coordinates come from venues.json, which is committed. Nothing here
// talks to Mapbox. See scripts/geocode-venues.py.

const fs = require("fs");
const path = require("path");

// One icon per category. The asterisk's shape never changes — only its
// fill — so these are six renderings of one mark, not six marks.
const CATEGORY_ICONS = {
  EXH: "ast-exh",
  CONV: "ast-conv",
  INST: "ast-inst",
  OPEN: "ast-open",
  TOUR: "ast-tour",
  WORK: "ast-work",
};

// What map.js must register with addImage() before the symbol layer draws.
// A feature pointing at an unregistered icon renders as nothing at all —
// an event silently missing from the map — so the two lists are checked
// against each other in test/map-points.test.js.
const ICONS = Object.values(CATEGORY_ICONS).concat("ast-plain");

function venueSlug(venue) {
  return venue
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "venue";
}

// Distinct venues must get distinct slugs: the slug is what /map/?venue=
// resolves against, so a collision would open the wrong venue's panel.
// "Studio, ADL" and "Studio — ADL" both reduce to "studio-adl".
function slugsFor(venues) {
  const used = new Map();
  const out = new Map();
  for (const venue of venues) {
    const base = venueSlug(venue);
    const seen = used.get(base) || 0;
    used.set(base, seen + 1);
    out.set(venue, seen ? `${base}-${seen + 1}` : base);
  }
  return out;
}

/**
 * Join events to coordinates.
 *
 * Returns { geojson, dropped }. Everything dropped is returned with a
 * reason — an event that vanishes from the map without a word is a bug,
 * and the Eleventy data function below prints the list at build time.
 */
function buildFeatures(events, venues) {
  const slugs = slugsFor([...new Set(events.map((e) => e.venue))]);
  const features = [];
  const dropped = [];

  for (const event of events) {
    const place = venues[event.venue];

    if (!place) {
      dropped.push({
        title: event.title, venue: event.venue,
        reason: "not geocoded — no entry in venues.json",
      });
      continue;
    }
    if (place.skip) {
      dropped.push({
        title: event.title, venue: event.venue,
        reason: place.reason || "not a location",
      });
      continue;
    }
    if (typeof place.lat !== "number" || typeof place.lng !== "number") {
      dropped.push({
        title: event.title, venue: event.venue,
        reason: "not geocoded — venues.json entry has no coordinates",
      });
      continue;
    }

    features.push({
      type: "Feature",
      // GeoJSON is longitude first. Reversed, Adelaide lands in Asia.
      geometry: { type: "Point", coordinates: [place.lng, place.lat] },
      properties: {
        title: event.title,
        category: event.category,
        categoryLabel: event.categoryLabel,
        venue: event.venue,
        venueSlug: slugs.get(event.venue),
        slug: event.slug,
        ticketed: Boolean(event.ticketed),
        link: event.link || "",
        sessions: event.sessions,
        // The sidebar filters the map by day. A Mapbox filter expression
        // cannot look inside an array of session objects, so the days are
        // flattened here: `days` for JavaScript to read, `dayKeys` for the
        // filter to match on. Every key is fenced by the delimiter so one
        // day's label can never match inside another's.
        days: event.sessions.map(function (s) { return s.day; }),
        dayKeys: "|" + event.sessions.map(function (s) { return s.day; }).join("|") + "|",
        iconKey: CATEGORY_ICONS[event.category] || "ast-plain",
      },
    });
  }

  return { geojson: { type: "FeatureCollection", features }, dropped };
}

/**
 * Every venue on the map, alphabetically, with how many events it holds.
 *
 * map.njk renders this as a visually-hidden list of buttons. Mapbox GL
 * draws its markers to a canvas, where they cannot be tabbed to or read by
 * a screen reader, so this list is the equivalent way in — not an extra.
 */
function venueList(geojson) {
  const byslug = new Map();
  for (const f of geojson.features) {
    const { venueSlug, venue } = f.properties;
    const found = byslug.get(venueSlug);
    if (found) found.count += 1;
    else byslug.set(venueSlug, { slug: venueSlug, venue, count: 1 });
  }
  return [...byslug.values()].sort((a, b) => a.venue.localeCompare(b.venue, "en"));
}

/**
 * venue string -> slug, for every venue that actually reached the map.
 *
 * program.njk uses this to put a locator thumbnail on each event and link
 * it to /map/?venue=. Venues that were dropped are deliberately absent, so
 * an unlocatable event shows no thumbnail rather than a broken image and a
 * panel that cannot open.
 */
function slugByVenue(geojson) {
  const out = {};
  for (const f of geojson.features) {
    out[f.properties.venue] = f.properties.venueSlug;
  }
  return out;
}

/**
 * The Shopfront Design Circuit, as a line and a set of numbered stops.
 *
 * The event has a single venue cell — "Various Locations, East End, ADL CBD"
 * — which is not a place. Its stops are listed in src/_data/circuit.json, in
 * walking order, and drawn as a path connecting them.
 *
 * A stop with no coordinates is returned in `missing` rather than quietly
 * dropped: a path that silently skips a shopfront is worse than no path,
 * because it looks correct.
 */
function buildCircuit(circuit, coords) {
  const empty = { line: null, points: { type: "FeatureCollection", features: [] },
                  missing: [] };
  if (!circuit || !Array.isArray(circuit.stops)) return empty;

  const features = [];
  const missing = [];
  let step = 0;

  for (const stop of circuit.stops) {
    const place = coords[stop.name];
    if (!place || typeof place.lat !== "number" || typeof place.lng !== "number") {
      missing.push(stop.name);
      continue;
    }
    step += 1;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [place.lng, place.lat] },
      properties: {
        name: stop.name,
        designer: stop.designer || "",
        step,
        title: circuit.title || "",
      },
    });
  }

  // Two points make a line; one makes a dot with a misleading tail.
  const line = features.length >= 2
    ? {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: features.map((f) => f.geometry.coordinates),
        },
        properties: { title: circuit.title || "" },
      }
    : null;

  return { line, points: { type: "FeatureCollection", features }, missing };
}

async function mapPoints() {
  const file = path.join(__dirname, "venues.json");

  let venues = {};
  if (fs.existsSync(file)) {
    venues = JSON.parse(fs.readFileSync(file, "utf8"));
  } else {
    // Not fatal. Someone cloning the repo before the geocoding pass has
    // been run should still get a site that builds, with an empty map and
    // a clear reason why.
    console.warn(
      "\n  src/_data/venues.json is missing, so the map will have no pins.\n" +
      "  Run:  MAPBOX_TOKEN=pk.... python3 scripts/geocode-venues.py\n"
    );
  }

  // program2026 reads the Google Sheet, so it resolves asynchronously now.
  let circuit = null;
  const circuitFile = path.join(__dirname, "circuit.json");
  if (fs.existsSync(circuitFile)) {
    circuit = JSON.parse(fs.readFileSync(circuitFile, "utf8"));
  }

  const program = await require("./program2026.js")();
  const { geojson, dropped } = buildFeatures(program.az, venues);
  const circuitParts = buildCircuit(circuit, venues);

  if (circuitParts.missing.length) {
    console.warn(
      `\n  ${circuitParts.missing.length} circuit stops have no coordinates ` +
      `and are not on the path:`);
    for (const name of circuitParts.missing) console.warn(`    ${name}`);
    console.warn("");
  }

  if (dropped.length) {
    console.warn(`\n  ${dropped.length} events are not on the map:`);
    for (const d of dropped) {
      console.warn(`    ${d.title} — ${d.venue}\n      ${d.reason}`);
    }
    console.warn("");
  }

  const venueCount = new Set(
    geojson.features.map((f) => f.properties.venueSlug)).size;

  return {
    geojson,
    dropped,
    venues: venueList(geojson),
    slugByVenue: slugByVenue(geojson),
    days: program.days,
    circuit: {
      title: (circuit && circuit.title) || "",
      line: circuitParts.line,
      points: circuitParts.points,
      missing: circuitParts.missing,
    },
    eventCount: geojson.features.length,
    venueCount,
  };
}

mapPoints.buildFeatures = buildFeatures;
mapPoints.venueSlug = venueSlug;
mapPoints.venueList = venueList;
mapPoints.slugByVenue = slugByVenue;
mapPoints.buildCircuit = buildCircuit;
mapPoints.ICONS = ICONS;
mapPoints.CATEGORY_ICONS = CATEGORY_ICONS;

module.exports = mapPoints;
