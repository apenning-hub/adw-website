// The whole program as one calendar, at /program/every-one-2026.ics
//
// This is the file to subscribe to rather than download. A subscription is
// re-fetched by the calendar app, so a time corrected in the spreadsheet on
// Tuesday reaches everyone who subscribed; a downloaded file never changes
// again, because importing copies the events in and the link is forgotten.

const ics = require("./_lib/ics.js");

module.exports = class {
  data() {
    return {
      permalink: "/program/every-one-2026.ics",
      eleventyExcludeFromCollections: true,
    };
  }

  render({ program2026, site }) {
    const base = (site.siteUrl || "").replace(/\/$/, "");
    return ics.calendar(program2026.az, base, "every*one — Adelaide Design Week 2026");
  }
};
