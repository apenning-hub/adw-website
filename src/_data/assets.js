// Content hashes for cached assets.
//
// The CSS is served with a 4-hour cache, so without a fingerprint a
// returning visitor can pair today's HTML with a stylesheet from before
// the last deploy — new markup, old styles, broken layout, for hours.
// Appending a content hash makes the URL change whenever the file does,
// so the browser fetches the matching stylesheet immediately.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const hash = (file) =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(__dirname, "..", file)))
    .digest("hex")
    .slice(0, 8);

module.exports = {
  css: hash("assets/css/site.css"),
  programJs: hash("assets/js/program.js"),
};
