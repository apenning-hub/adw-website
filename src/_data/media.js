// Press / media list rendered on /media/ as a card grid.
// Edit this list to add new items. `image` is an optional filename
// in src/assets/images/media/. `url` blank = card not clickable.
// `emailOnly: true` = newsletter, no live link.

const items = [
  { date: "2025-07-24", source: "ADR",              type: "article" },
  { date: "2025-07-25", source: "ADR",              type: "Instagram" },
  { date: "2025-08-12", source: "Architecture,AU",  type: "article" },
  { date: "2025-08-13", source: "Interiors,AU",     type: "newsletter",       emailOnly: true },
  { date: "2025-08-13", source: "AIA (SA)",         type: "Instagram" },
  { date: "2025-08-13", source: "New Norm",         type: "article" },
  { date: "2025-08-13", source: "Sitchu",           type: "article" },
  { date: "2025-08-17", source: "Sitchu",           type: "Instagram" },
  { date: "2025-08-18", source: "Habitus",          type: "article" },
  { date: "2025-08-18", source: "Habitus",          type: "newsletter",       emailOnly: true },
  { date: "2025-08-18", source: "Habitus",          type: "Instagram",        emailOnly: true },
  { date: "2025-08-18", source: "Homebound",        type: "article" },
  { date: "2025-08-18", source: "Homebound",        type: "Instagram" },
  { date: "2025-08-19", source: "Broadsheet",       type: "article" },
  { date: "2025-08-19", source: "CityMag",          type: "article" },
  { date: "2025-08-19", source: "CityMag",          type: "Instagram" },
  { date: "2025-08-19", source: "AIA (SA)",         type: "newsletter",       emailOnly: true },
  { date: "2025-08-21", source: "ABC Radio",        type: "interview (w/ Lara)" },
  { date: "2025-08-26", source: "Architecture,AU",  type: "review newsletter",emailOnly: true },
  { date: "2025-08-26", source: "Architecture,AU",  type: "review article" },
  { date: "2025-08-27", source: "ADR",              type: "review" },
  { date: "2025-09-19", source: "Indesign Live",    type: "review" },
  { date: "2025-10-03", source: "New Norm",         type: "review" },
  { date: "2025-10-17", source: "Habitus Living",   type: "review" },
  { date: "2025-10-21", source: "Habitus Living",   type: "review newsletter",emailOnly: true },
];

const monthShort = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

function displayDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${parseInt(d, 10)} ${monthShort[parseInt(m, 10) - 1]} ${y}`;
}

module.exports = {
  items: items.map((it) => ({
    url: "",
    image: "",
    emailOnly: false,
    ...it,
    displayDate: displayDate(it.date),
  })),
};
