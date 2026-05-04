const fs = require("fs");
const path = require("path");

let meta = {};
try {
  meta = require("./vibeMeta.json");
} catch (e) {
  meta = {};
}

module.exports = function () {
  const dir = path.join(__dirname, "..", "assets", "images", "vibe");
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => /\.(avif|webp|jpe?g|png|gif)$/i.test(f))
    .sort()
    .map((filename) => {
      const m = meta[filename] || {};
      const exhibition = (m.exhibition || "").trim();
      const credit = (m.credit || "").trim();
      const altFromName = filename
        .replace(/\.[^.]+$/, "")
        .replace(/^\d+\s*[-_]?\s*/, "")
        .replace(/[-_]+/g, " ")
        .trim();
      return {
        filename,
        exhibition,
        credit,
        alt: exhibition || altFromName,
      };
    });
};
