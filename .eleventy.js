require("./scripts/load-env.js")();

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/favicon.svg": "favicon.svg" });

  // Mapbox GL is served from this origin rather than a CDN: the version is
  // pinned by package-lock.json, so a library update can never arrive on the
  // live site without a commit.
  //
  // Pinned to v2, deliberately. v3 loads an "iconset.pbf" and then stalls on
  // this account: the style never finishes loading, no sources load, and the
  // map renders as blank paper with an empty console. Measured against the
  // same token and the same style:
  //     v3.30.0  styleLoaded=false  sourceLoaded=false
  //     v3.9.0   styleLoaded=false  sourceLoaded=false
  //     v2.15.0  styleLoaded=true   sourceLoaded=true
  // Everything this map uses — clustering, getClusterLeaves, addImage with a
  // pixelRatio, cooperativeGestures — exists in v2. Retry v3 only with that
  // measurement repeated, not on the assumption that newer is better.
  eleventyConfig.addPassthroughCopy({
    "node_modules/mapbox-gl/dist/mapbox-gl.js": "assets/js/mapbox-gl.js",
    "node_modules/mapbox-gl/dist/mapbox-gl.css": "assets/css/mapbox-gl.css",
  });

  // This site deploys via Cloudflare Pages, which builds `main` for
  // production and every other branch to its own preview URL.
  //
  // Custom domains are configured in the Cloudflare dashboard, not here.
  // A committed `CNAME` file is a GitHub Pages mechanism and does nothing
  // on Cloudflare — there is no file in this repo that can decide which
  // hostname serves which branch.

  eleventyConfig.addCollection("nav", (collectionApi) =>
    collectionApi
      .getAll()
      .filter((item) => item.data.navOrder !== undefined)
      .sort((a, b) => a.data.navOrder - b.data.navOrder)
  );

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    pathPrefix: process.env.PATH_PREFIX || "/",
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    // "11ty.js" is here for the per-event calendar files: iCalendar is fussy
    // about CRLF line endings and folding, which is far easier to get right in
    // JavaScript than in a template language.
    templateFormats: ["njk", "md", "html", "11ty.js"],
  };
};
