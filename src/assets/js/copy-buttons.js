(function () {
  function buildPlainText(root) {
    const lines = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.replace(/\s+/g, " ").trim();
        if (text) lines[lines.length - 1] = (lines[lines.length - 1] || "") + text;
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName.toLowerCase();
      const block = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "div", "section", "article"];
      const isHeading = /^h[1-6]$/.test(tag);
      if (tag === "li") {
        lines.push("- ");
        for (const child of node.childNodes) walk(child);
        return;
      }
      if (isHeading) {
        lines.push("");
        lines.push("");
        for (const child of node.childNodes) walk(child);
        lines.push("");
        return;
      }
      if (block.includes(tag)) {
        lines.push("");
        for (const child of node.childNodes) walk(child);
        lines.push("");
        return;
      }
      if (tag === "br") {
        lines.push("");
        return;
      }
      for (const child of node.childNodes) walk(child);
    };
    lines.push("");
    walk(root);
    return lines
      .map((l) => l.trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n";
  }

  async function copyFromTarget(button) {
    const selector = button.dataset.copyTarget;
    const target = selector ? document.querySelector(selector) : null;
    if (!target) return false;
    const text = buildPlainText(target);
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (_) {}
      document.body.removeChild(ta);
      return ok;
    }
  }

  function showStatus(button, message) {
    const wrap = button.parentElement;
    const status = wrap ? wrap.querySelector(".copy-status") : null;
    if (!status) return;
    status.textContent = message;
    clearTimeout(status._timer);
    status._timer = setTimeout(() => { status.textContent = ""; }, 2500);
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".copy-btn[data-copy-target]");
    if (!button) return;
    event.preventDefault();
    const ok = await copyFromTarget(button);
    showStatus(button, ok ? "copied ✓" : "copy failed — please select and copy manually");
  });
})();
