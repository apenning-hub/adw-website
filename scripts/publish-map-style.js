#!/usr/bin/env node
/**
 * Publish the repo's basemap rules to Mapbox as a style.
 *
 * The rules in src/assets/js/map-style.js are the source of truth. This
 * script fetches Mapbox's light-v11, runs it through those rules, and
 * uploads the result to your Mapbox account. What lives on Mapbox is a
 * build artefact — regenerate it any time by running this again.
 *
 * Why it has to exist: the Static Images API, which renders the locator
 * thumbnails on the program page, can only draw a style that Mapbox holds.
 * Without this the thumbnails would come back as stock grey light-v11 and
 * visibly not match the map they link to.
 *
 *     export MAPBOX_SECRET_TOKEN=sk....     # needs styles:write + styles:read
 *     node scripts/publish-map-style.js
 *
 * On success it writes the style URL into src/_data/site.json as
 * mapboxStyle, which is what map.js and the thumbnail script both read.
 */

const fs = require("fs");
const path = require("path");

require("./load-env.js")();

const ROOT = path.join(__dirname, "..");
const SITE = path.join(ROOT, "src/_data/site.json");
const CSS = path.join(ROOT, "src/assets/css/site.css");
const MAP_CSS = path.join(ROOT, "src/assets/css/map.css");

const { transform, paletteFromCss } = require("../src/assets/js/map-style.js");

const STYLE_NAME = "every*one 2026";

// Fields Mapbox owns. Sending them back is either rejected or silently
// creates a style that claims to have been made by someone else.
const READ_ONLY = ["id", "owner", "created", "modified", "visibility",
                   "draft", "protected", "url"];

function die(message) {
  console.error("\n  " + message.replace(/\n/g, "\n  ") + "\n");
  process.exit(1);
}

/**
 * Mapbox tokens carry their owner in the payload, so the username does not
 * have to be typed (and cannot be typed wrong).
 */
function usernameFrom(token) {
  if (process.env.MAPBOX_USERNAME) return process.env.MAPBOX_USERNAME;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString("utf8"));
    if (payload.u) return payload.u;
  } catch (e) { /* fall through to the message below */ }
  die("Could not read your Mapbox username out of the token.\n" +
      "Set MAPBOX_USERNAME=yourname and run this again.");
}

async function mapbox(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text();
    die(`Mapbox said ${res.status} for\n  ${url.replace(/access_token=[^&]+/, "access_token=…")}\n\n${body}`);
  }
  return res.json();
}

async function main() {
  const token = process.env.MAPBOX_SECRET_TOKEN || process.env.MAPBOX_TOKEN;
  if (!token) {
    die("MAPBOX_SECRET_TOKEN is not set.\n\n" +
        "cp .env.example .env  and put a secret token (sk....) in\n" +
        "MAPBOX_SECRET_TOKEN. It needs the scopes styles:write and\n" +
        "styles:read — make one at\n" +
        "https://account.mapbox.com/access-tokens/\n\n" +
        "It is used here only, never sent to the browser, and .env is\n" +
        "gitignored.");
  }
  if (!token.startsWith("sk.")) {
    die("That looks like a public token (pk....).\n" +
        "Publishing a style needs a secret token with styles:write.");
  }

  const user = usernameFrom(token);

  // Both stylesheets, because --map-water is defined in map.css.
  const css = fs.readFileSync(CSS, "utf8") + fs.readFileSync(MAP_CSS, "utf8");
  const colours = paletteFromCss(css);

  console.log(`\n  palette: paper ${colours.paper}, water ${colours.water}, ` +
              `roads ${colours.line}, labels ${colours.inkSoft}`);

  const base = await mapbox(
    `https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=${token}`);
  console.log(`  light-v11 has ${base.layers.length} layers`);

  const styled = transform(base, colours);
  READ_ONLY.forEach((key) => delete styled[key]);
  styled.name = STYLE_NAME;

  console.log(`  ${STYLE_NAME} has ${styled.layers.length} — ` +
              `${base.layers.length - styled.layers.length} stripped`);

  const site = JSON.parse(fs.readFileSync(SITE, "utf8"));
  const existing = site.mapboxStyle;
  const existingId = existing && existing.split("/").pop();

  let result;
  if (existingId) {
    console.log(`  updating ${existing}`);
    result = await mapbox(
      `https://api.mapbox.com/styles/v1/${user}/${existingId}?access_token=${token}`,
      { method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(styled) });
  } else {
    console.log(`  creating a new style on ${user}`);
    result = await mapbox(
      `https://api.mapbox.com/styles/v1/${user}?access_token=${token}`,
      { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(styled) });
  }

  const url = `mapbox://styles/${user}/${result.id}`;
  site.mapboxStyle = url;
  fs.writeFileSync(SITE, JSON.stringify(site, null, 2) + "\n");

  console.log(`\n  published ${url}`);
  console.log(`  written to src/_data/site.json as mapboxStyle\n`);
  console.log("  The live map and the locator thumbnails now draw the same");
  console.log("  style. Re-run this whenever the rules in map-style.js change.\n");
}

main();
