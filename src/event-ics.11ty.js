// One .ics per event, at /program/<slug>.ics
//
// An event open five days holds five VEVENTs, so a single download puts the
// whole run in someone's calendar and they can delete the days they can't make.
// Written as a JS template rather than Nunjucks because iCalendar is fussy
// about line endings and folding, and that is easier to get right in code.

const ics = require("./_lib/ics.js");

module.exports = class {
  data() {
    return {
      pagination: { data: "program2026.az", size: 1, alias: "event" },
      permalink: (data) => `/program/${data.event.slug}.ics`,
      eleventyExcludeFromCollections: true,
    };
  }

  render({ event, site }) {
    const base = (site.siteUrl || "").replace(/\/$/, "");
    return ics.calendar([event], base, `${event.title} — Adelaide Design Week`, site.calendarVenues);
  }
};
