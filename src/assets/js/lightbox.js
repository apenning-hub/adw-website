(function () {
  "use strict";

  const grid = document.querySelector(".vibe-grid");
  if (!grid) return;

  const links = Array.from(grid.querySelectorAll("a[href]"));
  if (!links.length) return;

  const items = links.map((a) => ({
    src: a.getAttribute("href"),
    alt: a.querySelector("img") ? a.querySelector("img").getAttribute("alt") || "" : "",
  }));

  let idx = 0;
  let touchStartX = null;

  const overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML =
    '<button type="button" class="lightbox-close" aria-label="Close gallery">×</button>' +
    '<button type="button" class="lightbox-prev" aria-label="Previous image">‹</button>' +
    '<button type="button" class="lightbox-next" aria-label="Next image">›</button>' +
    '<figure class="lightbox-figure">' +
      '<img class="lightbox-img" alt="">' +
      '<figcaption class="lightbox-caption"></figcaption>' +
    "</figure>";
  document.body.appendChild(overlay);

  const imgEl = overlay.querySelector(".lightbox-img");
  const capEl = overlay.querySelector(".lightbox-caption");

  function show(i) {
    idx = (i + items.length) % items.length;
    imgEl.src = items[idx].src;
    imgEl.alt = items[idx].alt;
    capEl.textContent = (idx + 1) + " / " + items.length;
  }

  function open(i) {
    show(i);
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function close() {
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    imgEl.src = "";
  }

  links.forEach((a, i) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      open(i);
    });
  });

  overlay.querySelector(".lightbox-close").addEventListener("click", close);
  overlay.querySelector(".lightbox-prev").addEventListener("click", () => show(idx - 1));
  overlay.querySelector(".lightbox-next").addEventListener("click", () => show(idx + 1));

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.classList.contains("lightbox-figure")) {
      close();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (overlay.getAttribute("aria-hidden") !== "false") return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(idx - 1);
    else if (e.key === "ArrowRight") show(idx + 1);
  });

  overlay.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });
  overlay.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
    touchStartX = null;
  });
})();
