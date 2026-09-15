/* every*one map — markers, clustering, panel.
 *
 * The marking element is the ADW asterisk, the same mark used in the
 * masthead and for "ticketed" throughout the program. It is rasterised here
 * from the #ast sprite that base.njk already puts in every page, so there
 * is exactly one copy of that path in the repo and the map can never drift
 * from the brand.
 *
 * Data comes from src/_data/mapPoints.js as GeoJSON, one feature per event.
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * THE ONE SWITCH
   *
   * true  — six category variants of the asterisk, with a legend.
   * false — every marker is a plain black asterisk, legend hidden.
   *
   * Six variants of a mark whose power is being singular is a real risk:
   * at marker size, tour / installation / conversation are hard to tell
   * apart. If it reads as noise on screen, set this to false. Nothing else
   * needs to change.
   * ------------------------------------------------------------------ */
  var CATEGORY_MARKS = true;

  var root = document.getElementById("adw-map");
  if (!root) return;

  var DATA = JSON.parse(document.getElementById("adw-map-data").textContent);
  var palette = window.ADWMapStyle.palette();

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Adelaide, framed so the CBD cluster and the Port Adelaide and Lynton
  // outliers are all on screen at first paint.
  var HOME = { center: [138.5999, -34.9285], zoom: 11.2 };
  var BOUNDS = [[138.30, -35.40], [139.00, -34.60]];

  // No venue can ever slug to this, so it is the filter that matches
  // nothing — what "no venue is selected" looks like to the highlight layer.
  var NOTHING = "--none--";

  /* ---------------------------------------------------------------- *
   * The marks
   * ---------------------------------------------------------------- */

  // Shape never changes. Only the fill does. These keys must match
  // CATEGORY_ICONS in src/_data/mapPoints.js — test/map-points.test.js
  // checks that every feature points at an icon that exists.
  var MARKS = {
    "ast-exh":   { fill: "inkStrong" },
    "ast-conv":  { fill: "inkStrong", core: "paper" },
    "ast-open":  { fill: "paper", stroke: "inkStrong" },
    "ast-tour":  { fill: "yellow", stroke: "inkStrong" },
    "ast-work":  { fill: "inkSoft" },
    "ast-inst":  { fill: "inkStrong", rotate: 30 },
    "ast-plain": { fill: "inkStrong" },
  };

  var ICON_PX = 26;        // logical size of a marker at icon-size 1
  var CLUSTER_PX = 42;
  var RATIO = 4;           // rasterise at 4x so it stays crisp when scaled up

  /**
   * Build a standalone SVG of the asterisk in one colourway.
   *
   * Reads the path out of the #ast sprite in the page rather than carrying
   * a second copy of it. currentColor is resolved by setting `color` on the
   * root element of the generated SVG.
   */
  function asteriskSvg(spec, px) {
    var symbol = document.getElementById("ast");
    var box = symbol.getAttribute("viewBox").split(/[\s,]+/).map(Number);
    var w = box[2], h = box[3];
    var cx = w / 2, cy = h / 2;
    // Strokes are centred on the path, so the viewBox is padded or the
    // outlined variants lose their outer edge to clipping.
    var pad = spec.stroke ? 90 : 0;

    var inner = symbol.innerHTML;
    if (spec.rotate) {
      inner = '<g transform="rotate(' + spec.rotate + ' ' + cx + ' ' + cy + ')">' +
              inner + "</g>";
    }

    var attrs = 'style="color:' + palette[spec.fill] + '"';
    if (spec.stroke) {
      attrs += ' stroke="' + palette[spec.stroke] + '" stroke-width="110"' +
               ' stroke-linejoin="round"';
    }

    var core = spec.core
      ? '<circle cx="' + cx + '" cy="' + cy + '" r="188" fill="' +
        palette[spec.core] + '"/>'
      : "";

    return '<svg xmlns="http://www.w3.org/2000/svg" ' +
      'viewBox="' + (-pad) + " " + (-pad) + " " + (w + pad * 2) + " " +
      (h + pad * 2) + '" width="' + px * RATIO + '" height="' + px * RATIO +
      '" ' + attrs + ">" + inner + core + "</svg>";
  }

  function rasterise(svg, px) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var size = px * RATIO;
        var canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        resolve(ctx.getImageData(0, 0, size, size));
      };
      img.onerror = reject;
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }

  function addMarks(map) {
    var jobs = Object.keys(MARKS).map(function (key) {
      return rasterise(asteriskSvg(MARKS[key], ICON_PX), ICON_PX)
        .then(function (data) {
          if (!map.hasImage(key)) {
            map.addImage(key, data, { pixelRatio: RATIO });
          }
        });
    });
    // The cluster mark is the same asterisk, just bigger, so the count sits
    // on a brand mark rather than in a generic numbered circle.
    jobs.push(
      rasterise(asteriskSvg(MARKS["ast-plain"], CLUSTER_PX), CLUSTER_PX)
        .then(function (data) {
          if (!map.hasImage("ast-cluster")) {
            map.addImage("ast-cluster", data, { pixelRatio: RATIO });
          }
        })
    );
    return Promise.all(jobs);
  }

  /* ---------------------------------------------------------------- *
   * Venue index — what the panel reads
   * ---------------------------------------------------------------- */

  var byVenue = {};
  DATA.geojson.features.forEach(function (f) {
    var slug = f.properties.venueSlug;
    if (!byVenue[slug]) {
      byVenue[slug] = {
        venue: f.properties.venue,
        coordinates: f.geometry.coordinates,
        events: [],
      };
    }
    byVenue[slug].events.push(f.properties);
  });

  /* ---------------------------------------------------------------- *
   * Panel
   * ---------------------------------------------------------------- */

  var panel = document.getElementById("adw-map-panel");
  var panelBody = panel.querySelector(".map-panel-body");
  var closeBtn = panel.querySelector(".map-panel-close");
  var lastTrigger = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  var ASTERISK = '<svg class="ast ast--sm" aria-hidden="true"><use href="#ast"></use></svg>';

  function eventHtml(ev) {
    // Times are the CSV's own free text — "6pm - SUPER LATE", "(all day)".
    // Shown verbatim, because rewriting them loses the voice and risks
    // saying something the organiser did not.
    var when = ev.sessions.map(function (s) {
      return '<li><span class="map-day">' + esc(s.day) + "</span> " +
             esc(s.times.join("; ")) + "</li>";
    }).join("");

    return '<article class="map-event">' +
      '<h3 class="map-event-title">' +
        '<a href="/program/#' + esc(ev.slug) + '">' + esc(ev.title) + "</a>" +
        (ev.ticketed ? " " + ASTERISK : "") +
      "</h3>" +
      '<p class="map-event-cat">' + esc(ev.categoryLabel) + "</p>" +
      '<ul class="map-when">' + when + "</ul>" +
      (ev.link
        ? '<p class="map-event-link"><a href="' + esc(ev.link) +
          '" target="_blank" rel="noopener noreferrer">tickets &amp; details</a></p>'
        : "") +
      "</article>";
  }

  function openPanel(slug, trigger) {
    var place = byVenue[slug];
    if (!place) return;
    lastTrigger = trigger || null;

    panelBody.innerHTML =
      '<h2 class="map-panel-venue">' + esc(place.venue) + "</h2>" +
      '<p class="map-panel-count">' + place.events.length +
        (place.events.length === 1 ? " event" : " events") + "</p>" +
      place.events.map(eventHtml).join("");

    panel.hidden = false;
    root.classList.add("has-panel");
    closeBtn.focus();

    map.setFilter("venue-selected", ["==", ["get", "venueSlug"], slug]);
    map.easeTo({
      center: place.coordinates,
      zoom: Math.max(map.getZoom(), 14),
      duration: REDUCED ? 0 : 600,
      padding: panelPadding(),
    });

    // Shareable, and what the program page's locator thumbnails link to.
    history.replaceState(null, "", "?venue=" + encodeURIComponent(slug));
  }

  function closePanel() {
    panel.hidden = true;
    root.classList.remove("has-panel");
    map.setFilter("venue-selected", ["==", ["get", "venueSlug"], NOTHING]);
    history.replaceState(null, "", location.pathname);
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  }

  // Keep the selected pin clear of the panel rather than under it.
  function panelPadding() {
    if (window.innerWidth <= 700) {
      return { bottom: Math.round(window.innerHeight * 0.45) };
    }
    return { right: panel.offsetWidth || 0 };
  }

  closeBtn.addEventListener("click", closePanel);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) closePanel();
  });

  /* ---------------------------------------------------------------- *
   * The map
   * ---------------------------------------------------------------- */

  mapboxgl.accessToken = DATA.token;

  var map = new mapboxgl.Map({
    container: root,
    style: window.ADWMapStyle.BASE,
    center: HOME.center,
    zoom: HOME.zoom,
    maxZoom: 18,
    minZoom: 9,
    maxBounds: BOUNDS,
    // The map is a plan, not a view. Tilting it would break the drawing.
    pitchWithRotate: false,
    dragRotate: false,
    touchPitch: false,
    cooperativeGestures: true,   // a scroll down the page must not zoom the map
  });

  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

  map.on("style.load", function () {
    window.ADWMapStyle.applyBrandStyle(map);
  });

  map.on("load", function () {
    addMarks(map).then(function () {
      map.addSource("events", {
        type: "geojson",
        data: DATA.geojson,
        cluster: true,
        clusterRadius: 45,
        // Equal to the map's maxZoom on purpose: clustering never switches
        // off, so several events at one address stay a single mark instead
        // of becoming exactly-overlapping icons where only the top one can
        // be clicked. Distinct venues still separate, because a 45px radius
        // covers less ground the further you zoom in.
        clusterMaxZoom: 18,
      });

      // A yellow ring behind whichever venue's panel is open. Yellow is the
      // only highlight on the page, and this is the one thing highlighted.
      map.addLayer({
        id: "venue-selected",
        type: "circle",
        source: "events",
        filter: ["==", ["get", "venueSlug"], NOTHING],
        paint: {
          "circle-radius": 22,
          "circle-color": palette.yellow,
          "circle-stroke-width": 1,
          "circle-stroke-color": palette.inkStrong,
        },
      });

      map.addLayer({
        id: "clusters",
        type: "symbol",
        source: "events",
        filter: ["has", "point_count"],
        layout: {
          "icon-image": "ast-cluster",
          "icon-allow-overlap": true,
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 15, 1],
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          "text-size": 13,
          "text-allow-overlap": true,
        },
        paint: { "text-color": palette.yellow },
      });

      map.addLayer({
        id: "venues",
        type: "symbol",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": CATEGORY_MARKS ? ["get", "iconKey"] : "ast-plain",
          "icon-allow-overlap": true,
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.7, 14, 1],
        },
      });

      wireInteraction();
      openFromUrl();
    });
  });

  function wireInteraction() {
    ["clusters", "venues"].forEach(function (id) {
      map.on("mouseenter", id, function () {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", id, function () {
        map.getCanvas().style.cursor = "";
      });
    });

    map.on("click", "venues", function (e) {
      openPanel(e.features[0].properties.venueSlug);
    });

    map.on("click", "clusters", function (e) {
      var cluster = e.features[0];
      var source = map.getSource("events");

      source.getClusterLeaves(cluster.properties.cluster_id, 200, 0,
        function (err, leaves) {
          if (err) return;
          var slugs = {};
          leaves.forEach(function (l) { slugs[l.properties.venueSlug] = true; });
          var distinct = Object.keys(slugs);

          // One venue's events at one address. Zooming would do nothing —
          // they can never separate — so show them instead.
          if (distinct.length === 1) {
            openPanel(distinct[0]);
            return;
          }

          source.getClusterExpansionZoom(cluster.properties.cluster_id,
            function (zoomErr, zoom) {
              if (zoomErr) return;
              map.easeTo({
                center: cluster.geometry.coordinates,
                zoom: zoom,
                duration: REDUCED ? 0 : 500,
              });
            });
        });
    });

    // Mapbox GL draws markers to a canvas, so they are unreachable by
    // keyboard and invisible to a screen reader. This list, rendered in
    // map.njk and visually hidden, is the equivalent way in.
    var list = document.getElementById("adw-map-venues");
    if (list) {
      list.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-venue]");
        if (btn) openPanel(btn.dataset.venue, btn);
      });
    }
  }

  function openFromUrl() {
    var slug = new URLSearchParams(location.search).get("venue");
    if (slug && byVenue[slug]) openPanel(slug);
  }
})();
