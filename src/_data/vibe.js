const fs = require("fs");
const path = require("path");
const { imageSize } = require("image-size");

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

function deriveCredit(filename) {
  if (/_?VDK[_\d]/i.test(filename)) {
    return "Jonathan VDK Studio (@jonathanvdk_studio)";
  }
  if (/DSC\d+/i.test(filename)) {
    return "Christopher Arblaster (@christopherarblaster)";
  }
  return "";
}

function shapeFor(fullPath) {
  try {
    const { width, height } = imageSize(fs.readFileSync(fullPath));
    if (!width || !height) return "square";
    const r = width / height;
    if (r >= 1.1) return "landscape";
    if (r <= 0.9) return "portrait";
    return "square";
  } catch (e) {
    return "square";
  }
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
      const credit = (o.credit !== undefined ? o.credit : deriveCredit(filename)).trim();
      return {
        filename,
        exhibition,
        credit,
        shape: shapeFor(path.join(dir, filename)),
        alt: exhibition || filename.replace(/\.[^.]+$/, ""),
      };
    });
};
