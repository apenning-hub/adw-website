// Program updates — the participant-facing correction form.
//
// The event list is rendered from the published program, so a request always
// names a row that exists. The Tally form is only embedded once an event has
// been chosen: loading it up front and then changing its prefill would reload
// the iframe and throw away anything already typed.
(function () {
  const root = document.querySelector("[data-updates]");
  if (!root) return;

  const data = JSON.parse(document.getElementById("pu-data").textContent);
  const select = root.querySelector("#pu-event");
  const current = root.querySelector("[data-current]");
  const mount = root.querySelector("[data-form]");
  const formId = root.dataset.formId;

  const byTitle = new Map(data.events.map((e) => [e.title, e]));

  // What is published right now, so someone can see whether the thing they are
  // about to report is actually wrong, and so the request carries its own
  // before-and-after.
  function summarise(e) {
    const lines = [`venue: ${e.venue}`];
    e.sessions.forEach((s) => lines.push(`${s.day}: ${s.times.join(" / ")}`));
    lines.push(`ticketed: ${e.ticketed ? "yes" : "no"}`);
    if (e.link) lines.push(`link: ${e.link}`);
    if (e.socials) lines.push(`socials: ${e.socials}`);
    if (e.contributors.length) lines.push(`contributors: ${e.contributors.join("; ")}`);
    return lines;
  }

  function render(title) {
    current.innerHTML = "";
    mount.innerHTML = "";
    if (!title) return;

    const event = byTitle.get(title);
    let prefill = title;

    if (event) {
      const lines = summarise(event);
      const dl = document.createElement("ul");
      dl.className = "pu-current-list";
      lines.forEach((line) => {
        const li = document.createElement("li");
        const [label, ...rest] = line.split(": ");
        li.innerHTML = `<span>${label}</span> ${rest.join(": ")}`;
        dl.appendChild(li);
      });
      const h = document.createElement("h3");
      h.className = "pu-current-head";
      h.textContent = "what the website says now";
      current.append(h, dl);
      prefill = `${title}\n${lines.join("\n")}`;
    }

    if (!formId) {
      mount.innerHTML =
        '<p class="pu-unset">The form is not connected yet — ' +
        'add the Tally form id to <code>site.json</code>.</p>';
      return;
    }

    const params = new URLSearchParams({
      alignLeft: "1",
      hideTitle: "1",
      transparentBackground: "1",
      dynamicHeight: "1",
      event: title,
      current: event ? summarise(event).join(" | ") : "",
    });
    // Tally grows the iframe to fit its content only for embeds it has adopted
    // itself, which it does by reading data-tally-src. Setting src directly
    // leaves the form at a fixed height with its last questions cut off.
    const iframe = document.createElement("iframe");
    const src = `https://tally.so/embed/${formId}?${params}`;
    iframe.dataset.tallySrc = src;
    iframe.loading = "lazy";
    iframe.width = "100%";
    iframe.height = "320";
    iframe.frameBorder = "0";
    iframe.marginHeight = "0";
    iframe.marginWidth = "0";
    iframe.title = `Report a change to ${title}`;
    iframe.className = "pu-frame";
    mount.appendChild(iframe);

    // If Tally's script is blocked or slow, show the form anyway at a fixed
    // height rather than an empty box.
    if (window.Tally) window.Tally.loadEmbeds();
    else setTimeout(() => {
      if (window.Tally) window.Tally.loadEmbeds();
      else if (!iframe.src) { iframe.src = src; iframe.height = "900"; }
    }, 1500);
  }

  select.addEventListener("change", () => render(select.value));
})();
