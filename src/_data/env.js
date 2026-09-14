// Is this build a pre-launch preview, and therefore not to be indexed?
//
// Cloudflare Pages sets CF_PAGES_BRANCH on every build, so any branch that
// isn't the production branch is treated as a preview automatically — no
// dashboard configuration to remember, and no way to accidentally publish an
// indexable pre-launch program. PREVIEW=1 forces it on for local checks.
const PRODUCTION_BRANCH = "main";
const branch = process.env.CF_PAGES_BRANCH;

module.exports = {
  preview:
    process.env.PREVIEW === "1" ||
    (branch !== undefined && branch !== PRODUCTION_BRANCH),
  branch: branch || null,
};
