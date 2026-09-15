// Whether the map page is built at all.
//
// The map is not finished, and this repo's `main` deploys straight to the
// live site. Rather than rely on remembering not to push, the page simply
// is not written on a Cloudflare build: permalink false means Eleventy
// produces no file, so there is no URL to find, guess or index.
//
// It is fully available locally — `npm run dev`, then /map/.
//
// To publish it: set navLabel/navOrder in src/map.njk, drop `noindex` there,
// and either delete this file or set MAP=1 in the Cloudflare build.
module.exports = {
  eleventyComputed: {
    permalink: (data) => (data.env.buildMap ? "/map/index.html" : false),
    // Keep it out of collections too, so nothing can link to a page that
    // was never written.
    eleventyExcludeFromCollections: (data) => !data.env.buildMap,
  },
};
