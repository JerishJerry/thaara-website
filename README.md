# THAARA — Creative &amp; Digital Experiences

Website for THAARA, a creative studio working on invitation experiences, brand identity,
digital design, website design and motion.

**Live site:** https://thaara-creates.netlify.app/

---

## What this is

A hand-written static site — no framework, no build step, no dependencies. Three source files plus
two images. Open `index.html` in a browser and it runs.

```
index.html                     the whole page
404.html                       styled 404
styles.css                     design system + all styles
script.js                      nav state, mobile menu, scroll reveals, contact form
logo.png                       brand mark (lossless master)
invitation-save-the-date.png   portfolio artwork (lossless master)
invitation-*.avif / .webp      generated responsive variants
logo-*.webp / .png             generated logo variants
favicon-*.png, og-image.jpg    generated icons and social card
robots.txt, sitemap.xml        search metadata
tools/build-images.js          regenerates the image variants (build-time only)

CLAUDE.md                      instructions for AI assistants — read first
THAARA_REBUILD.md              full project guide: audit, design system, decisions
THAARA_CHANGELOG.md            post-review corrections
```

## Running it locally

There is nothing to install. Any static file server works:

```bash
py -m http.server 4173
```

Then open <http://localhost:4173>.

Python not handy? Either of these does the same job:

```bash
npx --yes serve .
```

Or just double-click `index.html` — the only caveat is that `file://` blocks nothing here, so it
works fine.

## Tech notes

- **Fonts:** EB Garamond (display) + Source Sans 3 (text), via Google Fonts.
- **Design tokens:** CSS custom properties at the top of `styles.css` — colour, a 10-step fluid
  type scale, an 11-step spacing scale, layout widths and motion timings. Every size in the build
  resolves to a token.
- **Motion:** one `IntersectionObserver` drives scroll reveals. `prefers-reduced-motion` is
  honoured. The hidden state is scoped to a `.js` class, so with JavaScript unavailable the page
  still renders fully rather than blank.
- **Accessibility:** skip link, `inert` mobile menu when closed, Escape-to-close with focus return,
  focus trap, 44px+ touch targets, and all text passing WCAG AA contrast.
- **Deployment:** Netlify, publishing the repository root. No build command needed.

## Project history

The commit history shows the rebuild:

1. **Original site as deployed** — the version that was live before the rebuild.
2. **Phase 2 rebuild** — new design system, homepage structure and brand experience.

`THAARA_REBUILD.md` is the full project guide: the Phase 1 audit of the original site, the Phase 2
design system, every decision and its reasoning, and what still needs input before Phase 3.

## Status

Some content is genuinely still missing and is marked on the page itself rather than filled with
placeholder text — testimonials, further projects, the case study's brief and live link, and the
studio's location, founding year and the people behind it. See §46 of `THAARA_REBUILD.md` for the
complete list.
