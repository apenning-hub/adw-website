const fs = require("fs");
const path = require("path");

module.exports = function () {
  const dir = path.join(__dirname, "..", "assets", "images", "vibe");
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => /\.(avif|webp|jpe?g|png|gif)$/i.test(f))
    .sort()
    .map((filename) => ({
      filename,
      alt: filename
        .replace(/\.[^.]+$/, "")
        .replace(/^\d+\s*[-_]?\s*/, "")
        .replace(/[-_]+/g, " ")
        .trim(),
    }));
};
