// Is this build a pre-launch preview, and therefore not to be indexed?
//
// Cloudflare Pages sets CF_PAGES_BRANCH on every build, so any branch that
// isn't the production branch is treated as a preview automatically — no
// dashboard configuration to remember, and no way to accidentally publish an
// indexable pre-launch program. PREVIEW=1 forces it on for local checks.
const PRODUCTION_BRANCH = "main";
const branch = process.env.CF_PAGES_BRANCH;

// Cloudflare sets CF_PAGES on every build it runs, so its absence means this
// build is happening on someone's own machine.
const onCloudflare = process.env.CF_PAGES !== undefined;

/**
 * Should the map page be built at all?
 *
 * Three answers, and the middle one is the point:
 *
 *   locally          yes — `npm run dev`, /map/
 *   a preview branch yes — so the work can be shared on its own pages.dev
 *                          URL, which env.preview already marks noindex
 *   main             NO  — main is what Cloudflare builds for production,
 *                          and pushing it publishes to the live site
 *                          immediately. The map is not finished.
 *
 * MAP=1 overrides the last one, for the day it is ready. Nothing else does:
 * the override is compared against exactly "1" so that a stray "0" or
 * "false" left in the dashboard cannot publish an unfinished page.
 *
 * Pure, and tested in test/map-visibility.test.js — this function is the
 * only thing standing between an unfinished map and the live site.
 */
function shouldBuildMap({ onCloudflare, branch, override }) {
  if (!onCloudflare) return true;
  if (branch !== PRODUCTION_BRANCH) return true;
  return override === "1";
}

module.exports = {
  preview:
    process.env.PREVIEW === "1" ||
    (branch !== undefined && branch !== PRODUCTION_BRANCH),
  branch: branch || null,
  local: !onCloudflare,
  // Local and preview branches yes, production no. See shouldBuildMap above.
  buildMap: shouldBuildMap({
    onCloudflare,
    branch,
    override: process.env.MAP,
  }),
  // From .env, never from a committed file. Absent means the map page
  // renders its "not switched on yet" notice instead of a blank map.
  mapboxToken: process.env.MAPBOX_PUBLIC_TOKEN || null,
};

module.exports.shouldBuildMap = shouldBuildMap;
