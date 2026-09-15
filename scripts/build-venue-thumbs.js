#!/usr/bin/env node
/**
 * Pre-render one locator map per venue, committed to the repo.
 *
 *     export MAPBOX_TOKEN=pk....
 *     node scripts/build-venue-thumbs.js
 *
 * Rendered from the style published by scripts/publish-map-style.js, so a
 * thumbnail and the live /map/ page are the same drawing at different
 * sizes. Run publish-map-style.js first.
 *
 * Pre-rendering rather than calling the Static Images API from the browser
 * means the program page costs nothing per visitor and keeps working if the
 * token is ever rotated or rate-limited.
 *
 * The asterisk is NOT baked into the PNG. The venue is always dead centre
 * of the frame, and map.css puts the real vector mark there — so it stays
 * crisp at any size and can never drift from the brand.
 *
 * Slugs come from src/_data/mapPoints.js, the same function the map uses.
 * Deriving them separately here is how a thumbnail ends up under a filename
 * no event links to.
 */

const fs = require("fs");
const path = require("path");

require("./load-env.js")();

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "src/assets/images/venue-maps");
const SITE = path.join(ROOT, "src/_data/site.json");
const VENUES = path.join(ROOT, "src/_data/venues.json");

const mapPoints = require("../src/_data/mapPoints.js");

const ZOOM = 15.2;          // close enough to read the street, wide enough to place it
const WIDTH = 640;
const HEIGHT = 320;

function die(message) {
  console.error("\n  " + message.replace(/\n/g, "\n  ") + "\n");
  process.exit(1);
}

async function main() {
  // The build token, not the browser one — see .env.example. This script
  // sends no Referer, so a URL-restricted token is refused with 403.
  const token = process.env.MAPBOX_BUILD_TOKEN ||
                process.env.MAPBOX_PUBLIC_TOKEN || process.env.MAPBOX_TOKEN;
  if (!token) {
    die("No Mapbox token.\n\n" +
        "Put an UNRESTRICTED public token (pk....) in MAPBOX_BUILD_TOKEN\n" +
        "in .env. It must have no URL restriction: this script sends no\n" +
        "Referer header, so a restricted token is refused with 403.");
  }

  if (!fs.existsSync(VENUES)) {
    die("src/_data/venues.json does not exist yet.\n\n" +
        "Run:  npm run geocode-venues");
  }

  const site = JSON.parse(fs.readFileSync(SITE, "utf8"));
  if (!site.mapboxStyle) {
    die("site.json has no mapboxStyle.\n\n" +
        "Run:  MAPBOX_SECRET_TOKEN=sk.... node scripts/publish-map-style.js\n" +
        "Without it these thumbnails would be stock light-v11 and would not\n" +
        "match the map they link to.");
  }

  // mapbox://styles/user/id  ->  user/id
  const styleRef = site.mapboxStyle.replace("mapbox://styles/", "");

  const { venues } = mapPoints();
  const coords = JSON.parse(fs.readFileSync(VENUES, "utf8"));

  fs.mkdirSync(OUT, { recursive: true });

  let written = 0;
  let skipped = 0;

  for (const v of venues) {
    const file = path.join(OUT, `${v.slug}.png`);
    if (fs.existsSync(file) && !process.argv.includes("--refresh")) {
      skipped += 1;
      continue;
    }

    // venues is built from the geojson, so every entry here is locatable.
    const place = coords[v.venue];
    const { lat, lng } = place;

    // attribution and logo are suppressed on the image itself; the program
    // page carries the credit once, near the thumbnails, which is what
    // Mapbox's terms ask for.
    const url = `https://api.mapbox.com/styles/v1/${styleRef}/static/` +
      `${lng},${lat},${ZOOM},0/${WIDTH}x${HEIGHT}@2x` +
      `?access_token=${token}&attribution=false&logo=false`;

    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      die(`Mapbox said ${res.status} for ${v.venue}\n\n${body}`);
    }
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    written += 1;
    process.stdout.write(`  ${v.slug}.png\n`);

    await new Promise((r) => setTimeout(r, 120));   // stay under the rate limit
  }

  const bytes = fs.readdirSync(OUT)
    .reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);

  console.log(`\n  ${written} written, ${skipped} already there`);
  console.log(`  ${OUT.replace(ROOT + "/", "")} is now ` +
              `${(bytes / 1024 / 1024).toFixed(1)} MB`);
  console.log("\n  Pass --refresh to rebuild ones that already exist.\n");
}

main();
