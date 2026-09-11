# adw-website

Public static site for **Adelaide Design Week 2026 — every\*one**.
Built with [Eleventy](https://www.11ty.dev/), deployed by Cloudflare Pages.

## Local development

```sh
npm install
npm run dev      # http://localhost:8080 with hot reload
npm run build    # output to _site/
```

## Authoring content

Page copy lives in markdown at `src/`. Front-matter controls title, nav
label and nav order. A page appears in the nav only if it has `navOrder`.

Shared values (program dates, contact email, social links) live in
`src/_data/site.json` — change once, used everywhere.

### The program

The 2026 program is **not** hand-written. It comes from a spreadsheet:

```
src/_data/program-2026.csv
```

See **[docs/updating-the-program.md](docs/updating-the-program.md)** — written
for someone who doesn't write code. The build validates the file and refuses to
publish a broken one, so a bad edit leaves the last good program live rather
than taking the page down.

## Deployment

**Cloudflare Pages builds this repo.** There is no other host.

| branch | builds to | indexed |
|---|---|---|
| `main` | the live site — `adelaidedesignweek.com.au` | yes |
| anything else | `<branch>.adw-website.pages.dev` | no |

**Pushing `main` publishes to the live site immediately.** Pre-launch work
belongs on its own branch, which Cloudflare builds to a separate preview URL.

Any branch other than `main` serves `noindex` automatically — `src/_data/env.js`
reads `CF_PAGES_BRANCH`, which Cloudflare sets on every build. Nothing to
configure, and no way to leave an unreleased program indexable. `PREVIEW=1`
forces it on locally.

### Custom domains

Configured **in the Cloudflare dashboard**, not in this repo. A committed
`CNAME` file is a GitHub Pages mechanism and does nothing here — no file in this
repository can decide which hostname serves which branch.

By default a Pages custom domain serves the *production* branch. Pointing one at
a preview branch means a proxied `CNAME` to `<branch>.adw-website.pages.dev`.

### Publishing

Double-click `push-to-github.command` — it commits, pulls, pushes, and
Cloudflare redeploys in a minute or two.

## Structure

Design specs live in `docs/superpowers/specs/`. The 2026 program and brand
refresh is `2026-09-11-program-2026-csv-design.md`.
