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

  // Rasterise at the display's own pixel density, not at a fixed 4x.
  // Mapbox uploads the icon as a GL texture and filters it linearly with no
  // mipmaps, so a 4x image shown at 1x is downsampled 4:1 in one step — which
  // is exactly what made the asterisk's points look chewed. Matching device
  // pixels means the texture is drawn 1:1 at icon-size 1 and the browser's
  // own SVG rasteriser does the anti-aliasing, which it is good at.
  var RATIO = Math.max(1, Math.min(4, window.devicePixelRatio || 1));

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

    // The sprite was exported from Inkscape and carries inkscape:* attributes.
    // Inline in the page that is harmless — HTML parsing ignores unknown
    // prefixes. In a data: URL the SVG is parsed as XML, where an undeclared
    // namespace prefix is a fatal error: the image silently fails to load and
    // the whole map ends up blank. Strip them.
    var inner = symbol.innerHTML.replace(/\s[a-zA-Z-]+:[a-zA-Z-]+="[^"]*"/g, "");
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
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
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
   * The list
   *
   * Two ways of reading the same program — by place, or by show — and a
   * day filter across both. The filter drives the map as well as the list:
   * picking a day removes the pins that are not on that day, rather than
   * leaving the map contradicting the list beside it.
   * ---------------------------------------------------------------- */

  var side = document.getElementById("adw-map-side");
  var listEl = document.getElementById("adw-map-list");
  var countEl = document.getElementById("adw-map-count");
  var detailEl = document.getElementById("adw-map-detail");
  var detailBody = detailEl.querySelector(".map-detail-body");
  var backBtn = detailEl.querySelector(".map-detail-back");

  var mode = "venues";     // or "shows"
  var day = "";            // "" means every day
  var selectedSlug = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  var ASTERISK = '<svg class="ast ast--sm" aria-hidden="true"><use href="#ast"></use></svg>';

  function onDay(props) {
    return !day || props.days.indexOf(day) !== -1;
  }

  function shownEvents() {
    return DATA.geojson.features
      .map(function (f) { return f.properties; })
      .filter(onDay);
  }

  function shownVenues() {
    var seen = {};
    var out = [];
    shownEvents().forEach(function (ev) {
      if (!seen[ev.venueSlug]) {
        seen[ev.venueSlug] = { slug: ev.venueSlug, venue: ev.venue, count: 0 };
        out.push(seen[ev.venueSlug]);
      }
      seen[ev.venueSlug].count += 1;
    });
    return out.sort(function (a, b) { return a.venue.localeCompare(b.venue, "en"); });
  }

  /* ---- rendering ---------------------------------------------------- */

  /**
   * One short line saying when an event is on.
   *
   * With a day selected that is simply that day's times. With every day
   * selected it is the span, not every session concatenated: an exhibition
   * open five days would otherwise read "9am - 5pm / 9am - 5pm / 9am - 5pm
   * / 9am - 5pm / 9am - 5pm", which is noise and forced the title into a
   * column three words wide.
   */
  function whenSummary(ev) {
    if (day) {
      var here = ev.sessions.filter(function (s) { return s.day === day; })[0];
      return here ? here.times.join(" / ") : "";
    }
    if (ev.sessions.length === 1) {
      return ev.sessions[0].day + "  " + ev.sessions[0].times.join(" / ");
    }
    var first = ev.sessions[0].day;
    var last = ev.sessions[ev.sessions.length - 1].day;
    // "Wed 14 Oct" and "Sun 18 Oct" share the month; say it once.
    var tail = last.split(" ");
    var head = first.split(" ");
    if (head[head.length - 1] === tail[tail.length - 1]) {
      first = head.slice(0, -1).join(" ");
    }
    return first + " – " + last;
  }

  function eventHtml(ev) {
    // Everything here is printed exactly as the program sheet has it —
    // the titles are upper case there, and they stay upper case. Nothing is
    // re-cased on the way to the screen: the sheet is what the organisers
    // wrote, and the map is not the place to quietly edit it.
    var when = ev.sessions.map(function (s) {
      return '<li><span class="map-day">' + esc(s.day) + "</span>" +
             '<span class="map-times">' + esc(s.times.join(" / ")) +
             (s.ticketed ? " " + ASTERISK : "") + "</span></li>";
    }).join("");

    return '<article class="map-event">' +
      '<p class="map-event-head">' +
        '<span class="map-cat" title="' + esc(ev.categoryLabel) + '">' +
          esc(ev.category) + "</span>" +
        '<span class="map-event-title">' +
          // The program page's a-z anchors are "az-<slug>", not "<slug>".
          // Linking to the bare slug matches nothing and silently drops the
          // reader at the top of a 88-event page.
          '<a href="/program/#az-' + esc(ev.slug) + '">' + esc(ev.title) + "</a>" +
          (ev.ticketed ? ASTERISK : "") +
        "</span>" +
      "</p>" +
      '<ul class="map-when">' + when + "</ul>" +
      (ev.link
        ? '<p class="map-event-link"><a href="' + esc(ev.link) +
          '" target="_blank" rel="noopener noreferrer">' +
          (ev.ticketed ? "book tickets" : "event details") +
          ' <span aria-hidden="true">&rarr;</span></a></p>'
        : "") +
      "</article>";
  }

  function renderList() {
    var rows;
    if (mode === "venues") {
      var venues = shownVenues();
      rows = venues.map(function (v) {
        return '<li><button type="button" data-venue="' + esc(v.slug) + '">' +
          '<span class="row-name">' + esc(v.venue) + "</span>" +
          '<span class="row-meta">' + v.count + "</span>" +
          "</button></li>";
      }).join("");
      countEl.textContent = venues.length +
        (venues.length === 1 ? " place" : " places") +
        (day ? " on " + day : "");
    } else {
      var events = shownEvents().slice().sort(function (a, b) {
        return a.title.localeCompare(b.title, "en");
      });
      rows = events.map(function (ev) {
        return '<li><button type="button" data-venue="' + esc(ev.venueSlug) +
          '" data-slug="' + esc(ev.slug) + '">' +
          '<span class="row-cat">' + esc(ev.category) + "</span>" +
          '<span class="row-name">' + esc(ev.title) +
            (ev.ticketed ? ASTERISK : "") +
            '<span class="row-venue">' + esc(ev.venue) + "</span>" +
            '<span class="row-meta">' + esc(whenSummary(ev)) + "</span>" +
          "</span>" +
          "</button></li>";
      }).join("");
      countEl.textContent = events.length +
        (events.length === 1 ? " show" : " shows") +
        (day ? " on " + day : "");
    }

    listEl.innerHTML = rows
      ? '<ul class="map-rows">' + rows + "</ul>"
      : '<p class="map-empty">Nothing on that day.</p>';
    markSelected();
  }

  function markSelected() {
    var buttons = listEl.querySelectorAll("button[data-venue]");
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].dataset.venue === selectedSlug;
      buttons[i].classList.toggle("is-selected", on);
      buttons[i].setAttribute("aria-current", on ? "true" : "false");
    }
  }

  /* ---- detail ------------------------------------------------------- */

  function showDetail(slug) {
    var place = byVenue[slug];
    if (!place) return;
    selectedSlug = slug;

    var events = place.events.filter(onDay).sort(function (a, b) {
      return a.title.localeCompare(b.title, "en");
    });

    detailBody.innerHTML =
      '<h2 class="map-panel-venue">' + esc(place.venue) + "</h2>" +
      '<p class="map-panel-count">' + events.length +
        (events.length === 1 ? " event" : " events") +
        (day ? " on " + esc(day) : "") + "</p>" +
      events.map(eventHtml).join("");

    detailEl.hidden = false;
    listEl.hidden = true;
    countEl.hidden = true;
    backBtn.focus();

    if (map.getLayer && map.getLayer("venue-selected")) {
      map.setFilter("venue-selected", ["==", ["get", "venueSlug"], slug]);
      map.easeTo({
        center: place.coordinates,
        zoom: Math.max(map.getZoom(), 15),
        duration: REDUCED ? 0 : 600,
      });
    }

    // Shareable, and what the program page's locator thumbnails link to.
    history.replaceState(null, "", "?venue=" + encodeURIComponent(slug));
  }

  function backToList() {
    detailEl.hidden = true;
    listEl.hidden = false;
    countEl.hidden = false;
    selectedSlug = null;
    if (map.getLayer && map.getLayer("venue-selected")) {
      map.setFilter("venue-selected", ["==", ["get", "venueSlug"], NOTHING]);
    }
    history.replaceState(null, "", location.pathname);
    renderList();
  }

  backBtn.addEventListener("click", backToList);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !detailEl.hidden) backToList();
  });

  /* ---- the controls -------------------------------------------------- */

  side.querySelector(".pg-views").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-mode]");
    if (!btn) return;
    mode = btn.dataset.mode;
    side.querySelectorAll("button[data-mode]").forEach(function (b) {
      b.setAttribute("aria-selected", String(b === btn));
      b.classList.toggle("is-on", b === btn);
    });
    if (!detailEl.hidden) backToList();
    else renderList();
  });

  side.querySelector(".pg-days").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-day]");
    if (!btn) return;
    day = btn.dataset.day;
    side.querySelectorAll("button[data-day]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b === btn));
      b.classList.toggle("is-on", b === btn);
    });
    applyDayToMap();
    if (!detailEl.hidden) showDetail(selectedSlug);
    else renderList();
  });

  listEl.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-venue]");
    if (btn) showDetail(btn.dataset.venue);
  });

  // Render straight away. The list is the program in words and does not
  // depend on a single tile arriving — if the map fails, or is slow, or the
  // network is hostile, the page is still completely usable.
  renderList();
  openFromUrl();

  /**
   * Filter the pins to match the list.
   *
   * The source clusters, and a layer filter does not re-cluster — the counts
   * would keep claiming events that are no longer shown. Replacing the
   * source's data does re-cluster, so the numbers stay honest.
   */
  function applyDayToMap() {
    var src = map.getSource("events");
    if (!src) return;
    src.setData({
      type: "FeatureCollection",
      features: DATA.geojson.features.filter(function (f) {
        return onDay(f.properties);
      }),
    });
  }

  /* ---------------------------------------------------------------- *
   * The map
   * ---------------------------------------------------------------- */

  mapboxgl.accessToken = DATA.token;

  // The style published by scripts/publish-map-style.js, which is also what
  // the program's locator thumbnails are rendered from. Falling back to
  // light-v11 + a runtime restyle means the map still looks right before
  // that script has ever been run.
  var PUBLISHED = DATA.style || null;

  var map = new mapboxgl.Map({
    container: root,
    style: PUBLISHED || window.ADWMapStyle.BASE,
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

  // Mapbox reports tile and style failures through this event and nowhere
  // else. Without it, a map that cannot load its data renders as blank paper
  // with an empty console, which is indistinguishable from a styling bug.
  map.on("error", function (e) {
    console.error("[adw map] mapbox:", (e && e.error && e.error.message) || e);
  });
  // A map that fails to load its style renders as an empty rectangle with a
  // clean console — indistinguishable from a styling bug, and the thing that
  // has cost the most time on this page. If the style has not loaded after a
  // reasonable wait, say so on the page instead of showing blank paper.
  var loadWatch = setTimeout(function () {
    // Re-check at fire time: a cold cache can legitimately take a while, and
    // a false "it failed" on a map that is merely slow is worse than silence.
    if (map.loaded() || map.isStyleLoaded()) return;
    root.classList.add("is-stalled");
    console.error("[adw map] the basemap did not load. The list still works. " +
                  "styleLoaded=" + map.isStyleLoaded() +
                  " sourceLoaded=" + map.isSourceLoaded("composite"));
  }, 20000);

  function mapIsFine() {
    clearTimeout(loadWatch);
    root.classList.remove("is-stalled");
  }
  map.on("load", mapIsFine);
  map.on("idle", mapIsFine);

  map.on("style.load", function () {
    // A published style already carries these decisions; applying them
    // again would only remove layers Mapbox has already dropped.
    if (!PUBLISHED) window.ADWMapStyle.applyBrandStyle(map);
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

      // The Shopfront Design Circuit: one event spread across eight East End
      // shopfronts. Its own venue cell says "Various Locations", so without
      // this it is the one event with nothing to point at. Drawn first, so
      // the path sits under every marker rather than across them.
      addCircuit();

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
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.85, 15, 1],
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
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.75, 14, 1],
        },
      });

      wireInteraction();
      // The deep-linked venue is already open in the list; now that the map
      // exists, move it there too.
      openFromUrl();
    }).catch(function (err) {
      // Without this the map renders as blank paper with no explanation:
      // a rejected image means no source and no layers were ever added.
      console.error("[adw map] markers could not be built — the map will be "
                    + "empty.", err);
    });
  });

  function addCircuit() {
    var circuit = DATA.circuit;
    if (!circuit || !circuit.points || !circuit.points.features.length) return;

    if (circuit.line) {
      map.addSource("circuit-line", { type: "geojson", data: circuit.line });
      map.addLayer({
        id: "circuit-path",
        type: "line",
        source: "circuit-line",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": palette.inkStrong,
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1, 16, 2.5],
          // Dashed, because it is a walk between shops and not a road.
          "line-dasharray": [1.5, 2],
          "line-opacity": 0.8,
        },
      });
    }

    map.addSource("circuit-stops", { type: "geojson", data: circuit.points });
    map.addLayer({
      id: "circuit-stops",
      type: "symbol",
      source: "circuit-stops",
      layout: {
        "icon-image": "ast-plain",
        "icon-allow-overlap": true,
        "icon-size": ["interpolate", ["linear"], ["zoom"], 12, 0.6, 16, 0.85],
        // The number is the order of the walk, set beside the mark rather
        // than on it so the asterisk stays the asterisk.
        "text-field": ["to-string", ["get", "step"]],
        "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
        "text-size": 11,
        "text-offset": [0.95, 0],
        "text-anchor": "left",
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": palette.inkStrong,
        "text-halo-color": palette.paper,
        "text-halo-width": 1.5,
      },
    });
  }

  function circuitHtml(stop) {
    return '<article class="map-event">' +
      '<p class="map-event-head">' +
        '<span class="map-cat">' + esc(String(stop.step)) + "</span>" +
        '<span class="map-event-title">' + esc(stop.name) + "</span>" +
      "</p>" +
      (stop.designer
        ? '<p class="map-circuit-designer">with ' + esc(stop.designer) + "</p>"
        : "") +
      "</article>";
  }

  function openCircuitPanel(step) {
    var stops = DATA.circuit.points.features.map(function (f) { return f.properties; });
    var here = stops.filter(function (s) { return s.step === step; })[0];
    if (!here) return;

    panelBody.innerHTML =
      '<h2 class="map-panel-venue">' + esc(DATA.circuit.title) + "</h2>" +
      '<p class="map-panel-count">stop ' + here.step + " of " + stops.length +
        " &mdash; the numbered path on the map</p>" +
      circuitHtml(here) +
      '<p class="map-circuit-all">' + stops.map(function (s) {
        return s.step === here.step
          ? "<strong>" + esc(s.name) + "</strong>"
          : esc(s.name);
      }).join(" &middot; ") + "</p>";

    panel.hidden = false;
    root.classList.add("has-panel");
    closeBtn.focus();
  }

  function wireInteraction() {
    ["clusters", "venues", "circuit-stops"].forEach(function (id) {
      if (!map.getLayer(id)) return;
      map.on("mouseenter", id, function () {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", id, function () {
        map.getCanvas().style.cursor = "";
      });
    });

    if (map.getLayer("circuit-stops")) {
      map.on("click", "circuit-stops", function (e) {
        openCircuitPanel(e.features[0].properties.step);
      });
    }

    map.on("click", "venues", function (e) {
      showDetail(e.features[0].properties.venueSlug);
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
            showDetail(distinct[0]);
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

    // The list is already on screen; it was rendered before the map loaded.
  }

  function openFromUrl() {
    var slug = new URLSearchParams(location.search).get("venue");
    if (slug && byVenue[slug]) showDetail(slug);
  }
})();
