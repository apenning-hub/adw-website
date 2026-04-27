module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/favicon.svg": "favicon.svg" });
  // To attach a custom domain on GH Pages: create `src/CNAME` containing
  // only the domain (no comments, no trailing newline added by editors)
  // and add: addPassthroughCopy({ "src/CNAME": "CNAME" }); above.

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
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"],
  };
};
