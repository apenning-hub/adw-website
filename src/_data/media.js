// Press / media list rendered on /media/ as a card grid.
// Edit this list to add new items. `image` is an optional filename
// in src/assets/images/media/. `url` blank = card not clickable.
// `emailOnly: true` = newsletter, no live link.
//
// Only items with live links are listed here; email-only newsletters
// are excluded.

const items = [
  {
    date: "2025-07-24",
    source: "ADR",
    type: "article",
    url: "https://www.australiandesignreview.com/featured/adelaide-design-week-arrives-with-vision-guts-and-no-lanyards/",
  },
  {
    date: "2025-08-12",
    source: "Architecture,AU",
    type: "article",
    url: "https://architectureau.com/articles/adelaide-to-launch-first-ever-design-festival/",
  },
  {
    date: "2025-08-13",
    source: "AIA (SA)",
    type: "Instagram",
    url: "https://www.instagram.com/p/DNRpmr2Sqjw/",
  },
  {
    date: "2025-08-13",
    source: "New Norm",
    type: "article",
    url: "https://www.newnormmag.com/adelaide-design-week-everywhere",
  },
  {
    date: "2025-08-13",
    source: "Sitchu",
    type: "article",
    url: "https://sitchu.com.au/adelaide/whats-on/whats-on-in-adelaide-this-month",
  },
  {
    date: "2025-08-18",
    source: "Habitus",
    type: "article",
    url: "https://www.habitusliving.com/articles/adelaide-design-week-2025",
  },
  {
    date: "2025-08-18",
    source: "Homebound",
    type: "article",
    url: "https://homeboundadl.com.au/2025/08/16/introducing-everywhere-adelaide-design-week/",
  },
  {
    date: "2025-08-19",
    source: "Broadsheet",
    type: "article",
    url: "https://www.broadsheet.com.au/adelaide/event/adelaide-design-week-2025",
  },
  {
    date: "2025-08-19",
    source: "CityMag",
    type: "article",
    url: "https://www.indailysa.com.au/citymag/design/2025/08/19/first-ever-design-week-is-the-local-industrys-missing-piece",
  },
  {
    date: "2025-08-26",
    source: "Architecture,AU",
    type: "review article",
    url: "https://architectureau.com/articles/adelaide-design-week-in-review/",
  },
  {
    date: "2025-08-27",
    source: "ADR",
    type: "review",
    url: "https://www.australiandesignreview.com/objects/adelaide-design-week-showcases-sas-culture-of-craftsmanship-and-fabrication/",
  },
  {
    date: "2025-09-19",
    source: "Indesign Live",
    type: "review",
    url: "https://www.indesignlive.com/events/adelaide-design-week-inside/amp",
  },
  {
    date: "2025-10-03",
    source: "New Norm",
    type: "review",
    url: "https://www.newnormmag.com/adelaide-design-week-everywhere-in-review",
  },
  {
    date: "2025-10-17",
    source: "Habitus Living",
    type: "review",
    url: "https://www.habitusliving.com/articles/adelaide-design-week-inside",
  },
];

const monthShort = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

function displayDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${parseInt(d, 10)} ${monthShort[parseInt(m, 10) - 1]} ${y}`;
}

// Optional: merge in images downloaded by `npm run fetch-media-images`.
// That script writes a {url -> filename} map to mediaImages.json so this
// data file stays human-editable without being clobbered on each run.
let imageMap = {};
try {
  imageMap = require("./mediaImages.json");
} catch (e) {
  imageMap = {};
}

module.exports = {
  items: items.map((it) => ({
    image: "",
    emailOnly: false,
    ...it,
    image: it.image || imageMap[it.url] || "",
    displayDate: displayDate(it.date),
  })),
};
