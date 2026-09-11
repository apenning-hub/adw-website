module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/favicon.svg": "favicon.svg" });
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
    templateFormats: ["njk", "md", "html"],
  };
};
