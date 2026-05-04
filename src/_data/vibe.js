const fs = require("fs");
const path = require("path");

let overrides = {};
try {
  overrides = require("./vibeMeta.json");
} catch (e) {
  overrides = {};
}

function deriveExhibition(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/^\d{8}_DSC\d+_?/i, "")
    .replace(/^_?VDK_?\d+/, "")
    .replace(/^adelaide design week\s*-?\s*/i, "")
    .replace(/\s+\d+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = function () {
  const dir = path.join(__dirname, "..", "assets", "images", "vibe");
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => /\.(avif|webp|jpe?g|png|gif)$/i.test(f))
    .sort()
    .map((filename) => {
      const o = overrides[filename] || {};
      const exhibition = (o.exhibition !== undefined ? o.exhibition : deriveExhibition(filename)).trim();
      return {
        filename,
        exhibition,
        alt: exhibition || filename.replace(/\.[^.]+$/, ""),
      };
    });
};
