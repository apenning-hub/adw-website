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

module.exports = {
  preview:
    process.env.PREVIEW === "1" ||
    (branch !== undefined && branch !== PRODUCTION_BRANCH),
  branch: branch || null,
  local: !onCloudflare,
  // From .env locally, or MAPBOX_PUBLIC_TOKEN in the Cloudflare Pages
  // environment. Falls back to site.json, because a Mapbox *public* token is
  // designed to be handed to every visitor in the page anyway — the thing
  // that protects it is its URL restriction, not secrecy. The secret sk.
  // token is never read here and must never be committed.
  mapboxToken:
    process.env.MAPBOX_PUBLIC_TOKEN ||
    require("./site.json").mapboxToken ||
    null,
};
