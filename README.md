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

## Updating the homepage gallery photos

Six AVIF photos from ADW 2025 live in `src/assets/images/gallery/`
(currently sourced from adelaidedesignweek.com.au). To swap in
different shots:

1. Drop new image files into `src/assets/images/gallery/`.
2. Update the `<img src=...>` paths and `alt` text in `src/index.md`
   to match.

Recommended: 4:3 aspect ratio, AVIF or WebP for size, JPG as a
fallback.

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
