// Is this build a pre-launch preview, and therefore not to be indexed?
//
// Cloudflare Pages sets CF_PAGES_BRANCH on every build, so any branch that
// isn't the production branch is treated as a preview automatically — no
// dashboard configuration to remember, and no way to accidentally publish an
// indexable pre-launch program. PREVIEW=1 forces it on for local checks.
const PRODUCTION_BRANCH = "main";
const branch = process.env.CF_PAGES_BRANCH;

// Cloudflare sets CF_PAGES on every build it runs, so its absence means
// this build is happening on someone's own machine. Work that is not ready
// to be seen by anyone is built only when that is true — see
// src/map.11tydata.js. MAP=1 forces the map into a deployed build when the
// time comes to publish it.
const onCloudflare = process.env.CF_PAGES !== undefined;

module.exports = {
  preview:
    process.env.PREVIEW === "1" ||
    (branch !== undefined && branch !== PRODUCTION_BRANCH),
  branch: branch || null,
  local: !onCloudflare,
  // The map is local-only for now: not built, not linked, not deployed.
  buildMap: !onCloudflare || process.env.MAP === "1",
  // From .env, never from a committed file. Absent means the map page
  // renders its "not switched on yet" notice instead of a blank map.
  mapboxToken: process.env.MAPBOX_PUBLIC_TOKEN || null,
};
