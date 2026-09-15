/* every*one map — basemap style rules.
 *
 * A declarative table, deliberately not a Mapbox Studio style. A Studio
 * style is invisible to git, un-reviewable in a diff and tied to whichever
 * account owns it; this file is none of those things.
 *
 * The approach: load Mapbox's light-v11, then strip it back to land, water,
 * roads and place names, and repaint what is left in ADW's palette. The
 * result is a sheet of paper with the city drawn on it faintly — quiet
 * enough that the asterisks are the only strong marks on the page.
 *
 * Yellow appears nowhere here. The site's rule is that yellow is the only
 * highlight; spending it on terrain would leave the markers nothing to be.
 */
(function (global) {
  "use strict";

  // Brand colours come from site.css, which stays the single source of
  // truth. Never re-sample these from the program poster PDF — its rendered
  // values are rasterisation artefacts, not the brand values.
  function palette() {
    const css = getComputedStyle(document.documentElement);
    const token = (name, fallback) =>
      (css.getPropertyValue(name) || "").trim() || fallback;

    const paper = token("--paper", "#ECEFE8");
    return {
      paper,
      water: token("--map-water", "#DDE0D9"),   // paper, one shade down
      line: token("--line", "#C9C9CB"),
      ink: token("--ink", "#333333"),
      inkStrong: token("--ink-strong", "#000000"),
      // 5.5:1 on paper. Never use the 55%-black brand grey #747474 here —
      // it is 4.02:1 and fails AA.
      inkSoft: token("--ink-soft", "#5F5F5F"),
      yellow: token("--yellow", "#FEFF35"),
    };
  }

  // Everything that makes a general-purpose map useful and this one noisy.
  // Matched against layer ids, which are stable across light-v11's minor
  // revisions in a way that an exhaustive list of ids is not.
  const REMOVE = /poi|transit|airport|aeroway|building|golf|pitch|hillshade|land-structure|landuse|national-park|natural-.*-label|water-point-label|water-line-label|ferry|rail|path|admin-0-boundary-bg/i;

  // Road ids in light-v11 all carry these prefixes.
  const ROAD = /^(road|bridge|tunnel)/i;

  // Widths chosen so the network is legible as structure at city zoom and
  // never competes with a marker. Hairlines, not arteries.
  const ROAD_WIDTH = [
    "interpolate", ["linear"], ["zoom"],
    10, 0.3,
    13, 0.6,
    15, 1.1,
    18, 3,
  ];

  /**
   * Strip and repaint a loaded style in place.
   *
   * Called on the map's "style.load" event. Safe to call again after a
   * style change; it only ever reads the style it is given.
   */
  function applyBrandStyle(map) {
    const c = palette();
    const layers = map.getStyle().layers || [];

    for (const layer of layers) {
      const id = layer.id;

      if (REMOVE.test(id)) {
        // A style can list a layer it does not actually carry at this
        // zoom; removing it then throws and would abort the whole pass.
        try { map.removeLayer(id); } catch (e) { /* already gone */ }
        continue;
      }

      if (layer.type === "background") {
        map.setPaintProperty(id, "background-color", c.paper);
        continue;
      }

      if (/water/i.test(id)) {
        if (layer.type === "fill") map.setPaintProperty(id, "fill-color", c.water);
        if (layer.type === "line") map.setPaintProperty(id, "line-color", c.water);
        continue;
      }

      if (ROAD.test(id)) {
        if (layer.type === "line") {
          map.setPaintProperty(id, "line-color", c.line);
          map.setPaintProperty(id, "line-width", ROAD_WIDTH);
        }
        if (layer.type === "fill") map.setPaintProperty(id, "fill-color", c.line);
        continue;
      }

      if (layer.type === "symbol") {
        // Mapbox serves its own glyph set; Helvetica is not in it and
        // self-hosting a glyph range for one map is not worth the weight.
        // Lowercasing is what actually carries the site's voice here.
        map.setLayoutProperty(id, "text-transform", "lowercase");
        map.setPaintProperty(id, "text-color", c.inkSoft);
        map.setPaintProperty(id, "text-halo-color", c.paper);
        map.setPaintProperty(id, "text-halo-width", 1.2);
        continue;
      }

      if (layer.type === "fill") {
        map.setPaintProperty(id, "fill-color", c.paper);
      }
    }
  }

  global.ADWMapStyle = { applyBrandStyle, palette, BASE: "mapbox://styles/mapbox/light-v11" };
})(window);
