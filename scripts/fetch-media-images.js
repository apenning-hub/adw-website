#!/usr/bin/env node
// Fetch og:image (or twitter:image) for every item in src/_data/media.js
// that has a URL, and save it to src/assets/images/media/. The downloaded
// filenames are written to src/_data/mediaImages.json (keyed by URL).
// media.js merges that map in automatically — no need to hand-edit data.
//
// Usage: npm run fetch-media-images
//        Re-runs are idempotent — already-downloaded URLs are skipped
//        unless you delete the corresponding entry in mediaImages.json.

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { URL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const media = require(path.join(ROOT, "src/_data/media.js"));
const imagesDir = path.join(ROOT, "src/assets/images/media");
const mappingFile = path.join(ROOT, "src/_data/mediaImages.json");

let mapping = {};
try {
  mapping = JSON.parse(fs.readFileSync(mappingFile, "utf8"));
} catch (e) {
  mapping = {};
}

function request(url, mode = "text", redirects = 5) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === "https:" ? https : http;
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: mode === "text" ? "text/html,application/xhtml+xml,*/*" : "image/*,*/*",
    };
    const req = lib.get(url, { headers }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        const next = new URL(res.headers.location, url).toString();
        res.resume();
        return resolve(request(next, mode, redirects - 1));
      }
      if (res.statusCode >= 400) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        if (mode === "text") {
          resolve({ body: buffer.toString("utf8"), finalUrl: url });
        } else {
          resolve({ buffer, contentType: (res.headers["content-type"] || "").toLowerCase(), finalUrl: url });
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error("timeout")));
  });
}

function parseImageMeta(html, baseUrl) {
  const tagRe = /<meta\b[^>]*>/gi;
  let m;
  const candidates = { "og:image": null, "twitter:image": null };
  while ((m = tagRe.exec(html))) {
    const tag = m[0];
    const propMatch = tag.match(/(?:property|name)\s*=\s*["']?(og:image(?::secure_url)?|twitter:image(?::src)?)["']?/i);
    if (!propMatch) continue;
    const contentMatch = tag.match(/content\s*=\s*["']([^"']+)["']/i);
    if (!contentMatch) continue;
    const key = propMatch[1].toLowerCase().split(":").slice(0, 2).join(":");
    if (!candidates[key]) candidates[key] = contentMatch[1];
  }
  const url = candidates["og:image"] || candidates["twitter:image"];
  if (!url) return null;
  try {
    return new URL(url, baseUrl).toString();
  } catch (e) {
    return null;
  }
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extFromContentType(ct) {
  if (/jpeg/.test(ct)) return "jpg";
  if (/png/.test(ct)) return "png";
  if (/webp/.test(ct)) return "webp";
  if (/avif/.test(ct)) return "avif";
  if (/gif/.test(ct)) return "gif";
  return "jpg";
}

(async () => {
  fs.mkdirSync(imagesDir, { recursive: true });
  let updated = 0, skipped = 0, failed = 0;

  for (const item of media.items) {
    const tag = `${item.source} · ${item.type} · ${item.date}`;
    if (item.emailOnly || !item.url) { skipped++; continue; }
    if (mapping[item.url]) {
      skipped++;
      continue;
    }
    process.stdout.write(`→ ${tag.padEnd(60)} `);
    try {
      const { body, finalUrl } = await request(item.url, "text");
      const ogUrl = parseImageMeta(body, finalUrl);
      if (!ogUrl) {
        console.log("no og:image found");
        failed++;
        continue;
      }
      const { buffer, contentType } = await request(ogUrl, "binary");
      if (!contentType.startsWith("image/")) {
        console.log(`got ${contentType || "?"} — skipping`);
        failed++;
        continue;
      }
      const ext = extFromContentType(contentType);
      const base = `${slugify(item.source)}-${item.date}-${slugify(item.type)}`;
      const filename = `${base}.${ext}`;
      fs.writeFileSync(path.join(imagesDir, filename), buffer);
      mapping[item.url] = filename;
      console.log(`saved ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
      updated++;
    } catch (e) {
      console.log(`failed: ${e.message}`);
      failed++;
    }
  }

  const sorted = Object.fromEntries(Object.entries(mapping).sort());
  fs.writeFileSync(mappingFile, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`\nMapping written to ${path.relative(ROOT, mappingFile)}`);
  console.log(`Updated: ${updated}  Skipped: ${skipped}  Failed: ${failed}`);
})();
