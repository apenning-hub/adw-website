// Press / media list rendered on /media/ as a card grid.
// Edit this list to add new items. `image` is an optional filename
// in src/assets/images/media/. `url` blank = card not clickable.
// `emailOnly: true` = newsletter, no live link.
//
// Only items with live links are listed here; email-only newsletters
// are excluded.

// Awards ADW has received. Rendered in their own group above the press
// cards on /awards-and-media/. `type` carries the category + result level.
const awards = [
  {
    date: "2026-06",
    source: "AIA (SA)",
    type: "Creative Collaboration Prize — Commendation",
    url: "https://architectureau.com/articles/2026-south-australian-architecture-awards/",
    image: "/assets/images/vibe/VDK_0977.jpg",
  },
  {
    date: "2025",
    source: "AGDA",
    type: "Brand & Identity, Campaign — Finalist",
    url: "https://agda.com.au/awards/results/8295/",
    image: "/assets/images/vibe/20250819_DSC08726_Adelaide design week opening night at motion exhibition.jpg",
  },
];

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
  {
    date: "2026-06-22",
    source: "Architecture,AU",
    type: "awards article",
    url: "https://architectureau.com/articles/2026-south-australian-architecture-awards/",
    image: "/assets/images/vibe/20250820_DSC09359_Adelaide design week - the architect's dream at SASA gallery.jpg",
  },
  {
    date: "2026-06-22",
    source: "InDaily",
    type: "awards article",
    url: "https://www.indailysa.com.au/news/business/2026/06/22/first-nations-centre-wins-top-sa-prize-as-cost-pressures-bite-architects",
    image: "/assets/images/vibe/20250824_DSC01226_Adelaide design week - open talks at longplay.jpg",
  },
  {
    date: "2026-06-22",
    source: "Glam Adelaide",
    type: "awards article",
    url: "https://glamadelaide.com.au/from-aquatic-centres-to-gelaterias-and-footy-ovals-the-architecture-awards-celebrate-the-states-best-new-spaces/",
    image: "/assets/images/vibe/20250822_DSC09961_Adelaide design week - clockwork exhibition at soda objects.jpg",
  },
];

const monthShort = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

function displayDate(value) {
  const [y, m, d] = String(value).split("-");
  if (!m) return y; // year only, e.g. "2025"
  if (!d) return `${monthShort[parseInt(m, 10) - 1]} ${y}`; // month + year
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

// Also pick up any hand-dropped images that follow the convention
// <source-slug>-<YYYY-MM-DD>-<type-slug>.<ext> in src/assets/images/media/.
// This means you can just save a file named e.g.
// `broadsheet-2025-08-19-article.jpg` into that folder and it shows up
// on the matching card automatically — no edits here needed.
const fs = require("fs");
const path = require("path");
const mediaImagesDir = path.join(__dirname, "..", "assets", "images", "media");

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

let mediaFiles = [];
try {
  mediaFiles = fs.readdirSync(mediaImagesDir);
} catch (e) {
  mediaFiles = [];
}

function imageForItem(it) {
  if (it.image) return it.image;
  if (imageMap[it.url]) return imageMap[it.url];
  const base = `${slugify(it.source)}-${it.date}-${slugify(it.type)}`;
  const match = mediaFiles.find(
    (f) => f.startsWith(base + ".") && /\.(avif|webp|jpe?g|png|gif)$/i.test(f)
  );
  return match || "";
}

// Turn a stored image value into a usable src. Bare filenames live in the
// media folder; values starting with "/" are full site paths (e.g. a gallery
// image reused as a card header) and are used as-is.
function imageSrc(img) {
  if (!img) return "";
  if (img.startsWith("/")) return img;
  return "/assets/images/media/" + img;
}

function enrich(list) {
  return list.map((it) => {
    const image = imageForItem(it);
    return {
      emailOnly: false,
      ...it,
      image,
      imageSrc: imageSrc(image),
      displayDate: displayDate(it.date),
    };
  });
}

// Newest first.
const byDateDesc = (a, b) => String(b.date).localeCompare(String(a.date));

module.exports = {
  awards: enrich([...awards].sort(byDateDesc)),
  items: enrich([...items].sort(byDateDesc)),
};
