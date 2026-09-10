// Cloudflare Pages sets branch-scoped environment variables. Set PREVIEW=1 on
// the Preview environment so pre-launch deployments are never indexed, and
// leave it unset on Production.
module.exports = { preview: process.env.PREVIEW === "1" };
