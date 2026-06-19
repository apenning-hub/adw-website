// every*where 2025 program — single source of truth.
// Rendered minimally on the EOI accordion (image + title + meta) and in full
// on the /everywhere-2025/ page (also sponsor, description, people).
//
// Fields:
//   image       poster filename in assets/images/program-2025/
//   title       event name (may contain HTML entities)
//   meta        "date · venue" line, may contain <br> — shown everywhere
//   sponsor     optional "Presented by …" line — page only
//   description optional short paragraph — page only
//   people      optional { label, names: [] } — page only

module.exports = [
  {
    image: "motion.avif",
    title: "Motion",
    meta: "20–24 Aug · 145 Franklin St",
    description:
      "every*where's Opening Night — an exhibition of work by 80 South Australian designers and makers. Photographed by Jonathan VDK.",
  },
  {
    image: "clockwork.avif",
    title: "Clockwork",
    meta: "20–24 Aug · SODA Objects &amp; Maz Mis",
  },
  {
    image: "continuum.avif",
    title: "Continuum",
    meta: "20–23 Aug · Beilbys Furniture, Hendon",
  },
  {
    image: "frank-bauer.avif",
    title: "Frank Bauer",
    meta: "20–23 Aug · Samstag Museum of Art",
  },
  {
    image: "shokunin.avif",
    title: "Shokunin",
    meta: "20–23 Aug · Segwood Galleries",
  },
  {
    image: "stu-colwill-tom-golin.avif",
    title: "Stu Colwill & Tom Golin",
    meta: "20–24 Aug · JamFactory Showroom",
  },
  {
    image: "poster-graphic.avif",
    title: "POST(ER) – GRAPHIC",
    meta: "20–24 Aug · FutureJuice",
  },
  {
    image:
      "gallery-one-jamfactory-icon-2025-aunty-ellen-trevorrow-weaving-through-time.avif",
    title: "JamFactory ICON 2025: Aunty Ellen Trevorrow",
    meta: "20–24 Aug · JamFactory Gallery One<br>Weaving Through Time",
  },
  {
    image: "th-brown-showcase.avif",
    title: "TH Brown Showcase",
    meta: "20–23 Aug · 1000 Chairs, Norwood",
  },
  {
    image: "personal-colleague-no-one-is-a-kitchen-island.avif",
    title: "personal colleague; no one is a kitchen island",
    meta: "21–24 Aug · fab workshop, Kent Town",
  },
  {
    image: "clara-adolphs-drew-spangenberg.avif",
    title: "Clara Adolphs & Drew Spangenberg",
    meta: "21–23 Aug · Hugo Michell Gallery",
  },
  {
    image: "angular.avif",
    title: "Angular",
    meta: "21–23 Aug · 4th Floor Elevator",
  },
  {
    image:
      "total-design-the-enduring-legacy-of-knoll-in-contemporary-spaces.avif",
    title: "Total Design: The Enduring Legacy of Knoll",
    meta: "21 Aug · Estilo Furniture + Lighting",
  },
  {
    image: "a-new-normal-adelaide.avif",
    title: "A New Normal Adelaide",
    meta: "22 Aug · Studio Gram, Brompton",
    description:
      "A vision to transform Greater Adelaide from a consumer to a producer city by 2030, with pilot projects briefed to the city's architects, designers and artists.",
    people: {
      label: "Participants",
      names: [
        "2049",
        "Baukultur",
        "Das Studio",
        "Forum Studio",
        "JamFactory",
        "JPE Design Studio",
        "Sans-Arc Studio",
        "Studio Gram",
        "Troppo",
        "Walter Brooke",
        "Woods Bagot",
      ],
    },
  },
  {
    image: "soft.avif",
    title: "Soft",
    meta: "22–23 Aug · Mini Mansion, Pulteney St",
  },
  {
    image: "in-collaboration-with.avif",
    title: "In Collaboration with",
    meta: "23–24 Aug · Household Presents, Jackson Square",
  },
  {
    image: "open-studios.avif",
    title: "Open Studios",
    meta: "23 Aug · architecture, design &amp; craft studios",
    sponsor: "Presented by Allera Lighting",
    description:
      "A look inside Adelaide's architecture, design and craft studios — makers in the morning, architecture and interiors in the afternoon.",
    people: {
      label: "Studios",
      names: [
        "Fallow",
        "Jon Goulder",
        "Creek Collective",
        "JamFactory (Tom Golin & Stu Colwill)",
        "JPE Design Studio",
        "Woods Bagot",
        "GGA",
        "Baukultur",
        "Design by WBL",
      ],
    },
  },
  {
    image: "open-talks.avif",
    title: "Open Talks",
    meta: "24 Aug · Long Play",
    sponsor: "Brought to you by Estilo Furniture + Lighting",
    description:
      "A panel on how place shapes designers — the pull of a city, the value of staying rooted, and where Adelaide fits in the broader story of design practice.",
    people: {
      label: "Speakers",
      names: [
        "Sophia Leopardi (Design by WBL)",
        "Rua Hashlamoun (Brown Falconer)",
        "Jacob Stavrakis (YSG)",
        "Sophie Wilkinson (Renewal SA) — moderator",
      ],
    },
  },
  {
    image: "shopfront-design-sprint.avif",
    title: "Shopfront Design Sprint",
    meta:
      "24 Aug · East End · various Adelaide design studios &amp; retailers<br>Curated by Dre Fuzz &amp; Lara Merrington",
  },
];
