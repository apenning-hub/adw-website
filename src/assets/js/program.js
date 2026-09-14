/* Program page enhancement.
 *
 * The page ships as plain HTML: every day rendered in full, one after another,
 * plus the A-Z list. That is a complete, readable program on its own. This
 * script folds it into tabs and filters. If it never runs, nothing is lost and
 * nothing is hidden -- the controls stay `hidden` until we take over.
 */
(function () {
  "use strict";
  var pg = document.querySelector(".pg");
  if (!pg) return;

  var viewBar = pg.querySelector("[data-views]");
  var dayBar = pg.querySelector("[data-days]");
  var filterBar = pg.querySelector("[data-filters]");
  var empty = pg.querySelector("[data-empty]");
  var panels = pg.querySelectorAll("[data-panel]");
  var daySections = pg.querySelectorAll(".pg-day");

  var view = "day";
  var initial = pg.querySelector(".pg-daybtn.is-on");
  var day = initial ? initial.dataset.day
          : (daySections.length ? daySections[0].dataset.day : null);
  var cat = "all";

  function setPressed(nodes, isOn) {
    Array.prototype.forEach.call(nodes, function (n) {
      var on = isOn(n);
      n.classList.toggle("is-on", on);
      if (n.hasAttribute("role")) n.setAttribute("aria-selected", on ? "true" : "false");
      else n.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function render() {
    Array.prototype.forEach.call(panels, function (p) {
      p.hidden = p.dataset.panel !== view;
    });
    dayBar.hidden = view !== "day";

    Array.prototype.forEach.call(daySections, function (s) {
      s.hidden = view === "day" && s.dataset.day !== day;
    });

    var shown = 0;
    var scope = view === "day"
      ? pg.querySelector('.pg-day[data-day="' + (day || "") + '"]')
      : pg.querySelector('[data-panel="az"]');
    if (scope) {
      Array.prototype.forEach.call(scope.querySelectorAll(".pg-item"), function (li) {
        var show = cat === "all" || li.dataset.cat === cat;
        li.hidden = !show;
        if (show) shown++;
      });
    }
    if (empty) empty.hidden = shown !== 0;

    setPressed(pg.querySelectorAll(".pg-view"), function (n) { return n.dataset.view === view; });
    setPressed(pg.querySelectorAll(".pg-daybtn"), function (n) { return n.dataset.day === day; });
    setPressed(pg.querySelectorAll(".pg-chip"), function (n) { return n.dataset.cat === cat; });

    // The day strip scrolls sideways on narrow screens; keep the active day
    // visible when it was chosen by a link rather than a tap.
    var active = pg.querySelector(".pg-daybtn.is-on");
    if (active && dayBar.scrollWidth > dayBar.clientWidth) {
      var l = active.offsetLeft, r = l + active.offsetWidth;
      if (l < dayBar.scrollLeft || r > dayBar.scrollLeft + dayBar.clientWidth) {
        dayBar.scrollLeft = l - (dayBar.clientWidth - active.offsetWidth) / 2;
      }
    }
  }

  pg.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !pg.contains(b)) return;
    if (b.dataset.view) { view = b.dataset.view; render(); }
    else if (b.dataset.day) { day = b.dataset.day; render(); }
    else if (b.dataset.cat) { cat = b.dataset.cat; render(); }
  });

  // A link to a specific event should open it, whichever view it lives in.
  function openFromHash() {
    if (!location.hash) return;
    var el = document.getElementById(location.hash.slice(1));
    if (!el) return;
    var section = el.closest(".pg-day");
    if (section) { view = "day"; day = section.dataset.day; }
    else view = "az";
    cat = "all";
    render();
    el.open = true;
    el.scrollIntoView({ block: "center" });
  }
  window.addEventListener("hashchange", openFromHash);

  // Arrow keys move between tabs, as the tablist role promises.
  viewBar.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    var tabs = Array.prototype.slice.call(viewBar.querySelectorAll(".pg-view"));
    var i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    var next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    view = next.dataset.view;
    render();
    next.focus();
  });

  viewBar.hidden = false;
  dayBar.hidden = false;
  filterBar.hidden = false;
  render();
  openFromHash();
})();
