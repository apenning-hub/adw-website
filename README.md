# adw-website

Public static site for **Adelaide Design Week 2026**.
Built with [Eleventy](https://www.11ty.dev/), deployed to GitHub Pages
and Cloudflare Pages from the same `main` branch.

## Local development

```sh
npm install
npm run dev      # http://localhost:8080 with hot reload
npm run build    # output to _site/
```

## Replacing the homepage gallery photos

The homepage gallery currently uses 6 placeholder SVGs at
`src/assets/images/gallery/placeholder-1.svg` … `placeholder-6.svg`.
To swap in real photos:

1. Drop your image files into `src/assets/images/gallery/`.
2. Update the `<img src=...>` paths in `src/index.md` to point at the
   new filenames (e.g. `placeholder-1.svg` → `photo-1.jpg`).
3. Update the `alt` text to describe the photo.

Recommended: 4:3 aspect ratio, ~1200×900px, JPG or WebP.

## Authoring content

All page copy lives in markdown at `src/`. Front-matter controls title,
nav label, and nav order. Edit prose, push to `main`, deploys happen
automatically on both hosts.

Shared values (program dates, EOI form URL, contact email, social links)
live in `src/_data/site.json` — change once, used everywhere.

## Deployment

- **Cloudflare Pages** owns the custom domain. Build command:
  `npm run build`, output dir: `_site`, Node 20.
- **GitHub Pages** mirror via `.github/workflows/deploy.yml` —
  builds on every push to `main`.

The custom domain is set in `src/CNAME` (passthrough-copied into
`_site/CNAME` at build time).

## Structure

See `docs/superpowers/specs/2026-04-27-adw-website-design.md` for the
full design spec.
