/* every*one map — basemap style rules.
 *
 * One table, two consumers:
 *
 *   transform(style, colours)   a pure function, used by
 *                               scripts/publish-map-style.js to build the
 *                               style that lives on Mapbox. That published
 *                               style is what the live map loads AND what
 *                               the Static Images API renders the program's
 *                               locator thumbnails from, so the two can
 *                               never look like different maps.
 *
 *   applyBrandStyle(map)        the same rules applied at runtime, used
 *                               before the style has been published (or if
 *                               it is ever lost). A fallback, not the path.
 *
 * Deliberately not authored in Mapbox Studio. A Studio style is invisible
 * to git, un-reviewable in a diff and tied to whichever account owns it.
 * Here the rules are the source of truth and Mapbox holds a build artefact.
 *
 * The look: a sheet of paper with the city drawn on it faintly — quiet
 * enough that the asterisks are the only strong marks on the page. Yellow
 * appears nowhere. The site's rule is that yellow is the only highlight;
 * spending it on terrain would leave the markers nothing to be.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ADWMapStyle = api;
})(typeof self !== "undefined" ? self : null, function () {
  "use strict";

  var BASE = "mapbox://styles/mapbox/light-v11";

  // Everything that makes a general-purpose map useful and this one noisy.
  // Matched against layer ids, which survive light-v11's minor revisions in
  // a way that an exhaustive list of ids does not.
  var REMOVE = /poi|transit|airport|aeroway|building|golf|pitch|hillshade|land-structure|landuse|national-park|natural-.*-label|water-point-label|water-line-label|ferry|rail|path|admin-0-boundary-bg/i;

  // Road ids in light-v11 all carry one of these prefixes.
  var ROAD = /^(road|bridge|tunnel)/i;

  // Legible as structure at city zoom, never competing with a marker.
  // Hairlines, not arteries.
  var ROAD_WIDTH = [
    "interpolate", ["linear"], ["zoom"],
    10, 0.3,
    13, 0.6,
    15, 1.1,
    18, 3,
  ];

  /* ------------------------------------------------------------------ *
   * The palette
   * ------------------------------------------------------------------ */

  // site.css is the single source of truth for brand colour. Never
  // re-sample these from the program poster PDF — its rendered values are
  // rasterisation artefacts, not brand values.
  function readTokens(get) {
    return {
      paper: get("--paper", "#ECEFE8"),
      // There is no brand colour for water. Paper, one shade down.
      water: get("--map-water", "#DDE0D9"),
      line: get("--line", "#C9C9CB"),
      ink: get("--ink", "#333333"),
      inkStrong: get("--ink-strong", "#000000"),
      // 5.5:1 on paper. Never use the 55%-black brand grey #747474 here —
      // it is 4.02:1 and fails AA.
      inkSoft: get("--ink-soft", "#5F5F5F"),
      yellow: get("--yellow", "#FEFF35"),
    };
  }

  /** In the browser: whatever the live stylesheet says. */
  function palette() {
    var css = getComputedStyle(document.documentElement);
    return readTokens(function (name, fallback) {
      return (css.getPropertyValue(name) || "").trim() || fallback;
    });
  }

  /** In Node: the same tokens, parsed out of site.css. */
  function paletteFromCss(cssText) {
    return readTokens(function (name, fallback) {
      var match = new RegExp(name + "\\s*:\\s*([^;]+);").exec(cssText);
      return match ? match[1].trim() : fallback;
    });
  }

  /* ------------------------------------------------------------------ *
   * The rules
   * ------------------------------------------------------------------ */

  // What each surviving layer becomes. Returned as {paint, layout} patches
  // so transform() and applyBrandStyle() apply identical decisions by
  // different means — one rewriting JSON, one calling setPaintProperty.
  function rulesFor(layer, c) {
    var id = layer.id;

    if (layer.type === "background") {
      return { paint: { "background-color": c.paper } };
    }

    if (/water/i.test(id)) {
      if (layer.type === "fill") return { paint: { "fill-color": c.water } };
      if (layer.type === "line") return { paint: { "line-color": c.water } };
      return {};
    }

    if (ROAD.test(id)) {
      if (layer.type === "line") {
        return { paint: { "line-color": c.line, "line-width": ROAD_WIDTH } };
      }
      if (layer.type === "fill") return { paint: { "fill-color": c.line } };
      return {};
    }

    if (layer.type === "symbol") {
      // Mapbox serves its own glyph set and Helvetica is not in it;
      // self-hosting a glyph range for one map is not worth the weight.
      // Lowercasing is what actually carries the site's voice here.
      return {
        layout: { "text-transform": "lowercase" },
        paint: {
          "text-color": c.inkSoft,
          "text-halo-color": c.paper,
          "text-halo-width": 1.2,
        },
      };
    }

    if (layer.type === "fill") return { paint: { "fill-color": c.paper } };
    return {};
  }

  function shouldRemove(layer) {
    return REMOVE.test(layer.id);
  }

  /* ------------------------------------------------------------------ *
   * Pure: style document in, style document out
   * ------------------------------------------------------------------ */

  function transform(style, colours) {
    var out = JSON.parse(JSON.stringify(style));   // never mutate the input

    out.layers = (out.layers || [])
      .filter(function (layer) { return !shouldRemove(layer); })
      .map(function (layer) {
        var patch = rulesFor(layer, colours);
        if (patch.paint) {
          layer.paint = Object.assign({}, layer.paint, patch.paint);
        }
        if (patch.layout) {
          layer.layout = Object.assign({}, layer.layout, patch.layout);
        }
        return layer;
      });

    return out;
  }

  /* ------------------------------------------------------------------ *
   * Runtime: the same decisions, applied to a live map
   * ------------------------------------------------------------------ */

  function applyBrandStyle(map) {
    var c = palette();
    var layers = map.getStyle().layers || [];

    layers.forEach(function (layer) {
      if (shouldRemove(layer)) {
        // A style can list a layer it does not carry at this zoom; removing
        // it then throws, and would abort the rest of the pass.
        try { map.removeLayer(layer.id); } catch (e) { /* already gone */ }
        return;
      }
      var patch = rulesFor(layer, c);
      Object.keys(patch.paint || {}).forEach(function (prop) {
        map.setPaintProperty(layer.id, prop, patch.paint[prop]);
      });
      Object.keys(patch.layout || {}).forEach(function (prop) {
        map.setLayoutProperty(layer.id, prop, patch.layout[prop]);
      });
    });
  }

  return {
    BASE: BASE,
    transform: transform,
    applyBrandStyle: applyBrandStyle,
    palette: palette,
    paletteFromCss: paletteFromCss,
    ROAD_WIDTH: ROAD_WIDTH,
  };
});
