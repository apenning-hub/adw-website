// Read .env into process.env, if there is one.
//
// No dependency: Node has done this natively since 20.12. Deliberately
// quiet and deliberately non-fatal — Cloudflare has no .env file and must
// not care, and the map is local-only anyway.
//
// Values already in the environment win, so a one-off
// `MAPBOX_TOKEN=pk... npm run dev` still overrides the file.
const path = require("path");

module.exports = function loadEnv() {
  const file = path.join(__dirname, "..", ".env");
  try {
    process.loadEnvFile(file);
  } catch (e) {
    // No .env, or a Node too old to read one. Either is fine.
  }
};
