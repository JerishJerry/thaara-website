# THAARA

**Creative & digital experiences.** The marketing site for THAARA, a creative studio that makes
interactive wedding invitations and event websites, alongside brand identity, digital design,
website design and motion.

**Live site:** <https://jerishjerry.github.io/thaara-website/>

---

## Highlights

- **Interactive hero.** The invitation in the hero is a 3D envelope rendered with Three.js.
  Selecting it opens a full-screen, scroll-scrubbed flight through two client projects, then lands
  back in place.
- **Services deck.** The five disciplines are cards that pin beneath the header and stack with a
  subtle 3D recession as you scroll.
- **Process journey ticket.** The four stages are stops on an ivory ticket with a route line and
  a tear-off stub, built from the section's own list by `js/process-ticket.js`, with a flat
  envelope intro that plays once.
- **Editorial design system.** A warm near-black palette, a single gold accent, EB Garamond and
  Source Sans 3, all driven by CSS custom properties.
- **Contact form** wired to Web3Forms, with a honeypot, inline validation, and direct email and
  Instagram fallbacks on every failure path.
- **Degrades gracefully.** Reduced motion, no JavaScript, no WebGL2, data-saver mode and short
  viewports each fall back to a complete, readable page.
- **Search and sharing ready.** Canonical URL, Open Graph and Twitter cards, JSON-LD structured
  data, `sitemap.xml` and `robots.txt`.

## Approach

The site is hand-written static HTML, CSS and JavaScript. There is **no framework, no build step
and no `package.json`**, and that is deliberate: the files in this repository are exactly what is
served.

The only third-party code is [Three.js](https://threejs.org) 0.186.1 and
[GSAP](https://gsap.com) 3.15, vendored in `vendor/` and loaded lazily, after the page has loaded,
solely for the hero envelope. Everything else is first-party.

## Getting started

Nothing to install. Serve the folder with any static file server:

```bash
# Python
python -m http.server 4173

# or Node
npx --yes serve .
```

Then open the address it prints (for example <http://localhost:4173>).

> **Serve over HTTP rather than opening `index.html` from disk.** The hero envelope uses ES modules,
> which most browsers block on `file://`.

Useful while developing: add `?static` to the URL to skip the 3D envelope and see the static hero.

## Project structure

```
.
├── index.html                   The whole page (a single file)
├── 404.html                     Styled not-found page
├── styles.css                   Design system and all styles (tokens are section 01)
├── script.js                    Header state, mobile menu, scroll reveals, contact form
├── js/
│   ├── services-deck.js         Services deck: pinning, 3D depth, entry motion
│   ├── process-ticket.js        Process ticket: journey-ticket tabs built from the stages list
│   └── envelope/
│       ├── boot.js              Capability gate and lazy loader for the envelope
│       └── envelope.js          The Three.js hero envelope and its scroll-scrubbed flight
├── vendor/                      Vendored Three.js and GSAP (see vendor/README.md)
├── tools/build-images.js        Image variant generator (build-time only, not part of the site)
├── logo.png                     Brand mark: lossless master, never modify or delete
├── invitation-save-the-date.png Portfolio artwork: lossless master, never modify or delete
├── leo-asnia-source.webp        Source image for the second project
├── studio-poster-source.jpg     Source image for the studio poster
├── *.avif  *.webp  favicon-*  og-image.jpg   Generated responsive images and icons
├── leo-asnia-scroll.mp4         Screen recording shown inside the envelope flight
├── robots.txt  sitemap.xml      Search metadata
├── CLAUDE.md                    Working conventions for contributors and AI assistants
├── THAARA_REBUILD.md            Full project record: audit, design system, decisions
└── THAARA_CHANGELOG.md          Post-review corrections, newest first
```

## How it works

### Design system

Every size, colour, space and duration resolves to a token defined at the top of `styles.css`:
a four-step warm near-black ground, one gold accent, one hairline, a 10-step fluid type scale and
an 11-step spacing scale. Motion uses `transform` and `opacity` only. Gold is reserved for
interactive elements and two accent phrases, so it keeps reading as an accent.

### Progressive enhancement

| Condition | What the visitor gets |
|---|---|
| `prefers-reduced-motion: reduce` | No reveal or depth motion; static hero image; plain card stack |
| JavaScript unavailable | All content visible; static hero image; plain card stack |
| No WebGL2, data-saver on, or `?static` | Static hero image (the envelope never loads) |
| Viewport too short to pin every card | Services render as a plain, fully visible stack |

The Services deck applies its hidden start states from its own script, so if that script fails to
load, nothing in it is left invisible.

### Contact form

The form posts to [Web3Forms](https://web3forms.com), which emails the submission to the address
registered for the access key. Web3Forms answers HTTP 200 with `{"success": false}` when it rejects
a submission, so the handler reads the response body and reports success only on
`success === true`. A hidden honeypot field filters bots. If delivery fails, the visitor is
pointed to direct email and Instagram.

### Images

Photographs are served as responsive `<picture>` elements (AVIF, then WebP, in four widths) with
explicit `width` and `height` so nothing shifts as they load. `tools/build-images.js` regenerates
the variants from the source images using [sharp](https://sharp.pixelplumbing.com), which is a
build-time tool only and must not become a project dependency. Install it outside the repository
and point `NODE_PATH` at it:

```bash
NODE_PATH=/path/to/imgtool/node_modules node tools/build-images.js
```

### SEO and domain

The canonical URL points at the GitHub Pages address. If the site moves to a custom domain, update
it in `index.html` (canonical, `og:url`, `og:image`, `twitter:image`, JSON-LD), `sitemap.xml`,
`robots.txt` and `404.html`.

## Deployment

The site is served by **GitHub Pages from the `main` branch**, and `main` is the only branch. Every
push to `main` builds and publishes automatically, usually within a minute, so there is no staging
step: treat a push to `main` as a production release.

`thaara-creates.netlify.app` serves the original pre-rebuild design and is no longer updated.

## Contributing

Read [`CLAUDE.md`](CLAUDE.md) before changing anything. The rules that matter most:

1. **Keep the stack.** No framework, bundler, preprocessor or new dependency.
2. **Tokens only.** If a size or colour is not in the scale, reconsider rather than hard-code it.
3. **Never invent content.** No testimonials, clients, statistics or dates that are not real; mark
   gaps visibly instead.
4. **Log every correction** in `THAARA_CHANGELOG.md`: the issue, the change, the files and why.
5. **Check before shipping:** no console errors, no failed requests, no horizontal overflow at 320
   and 1920 px, and anchors that clear the fixed header, on both mobile and desktop.

## Status

Content that is still missing is left out rather than filled with placeholders: testimonials,
further projects, and the studio's location, founding year and team. A looping screen recording
for the second project's card, and a move to a custom domain, are the main open items.

## Third-party notices

| Component | Licence |
|---|---|
| [Three.js](https://threejs.org) 0.186.1 | MIT. See `vendor/three/LICENSE`. |
| [GSAP](https://gsap.com) 3.15.0 | GreenSock standard "no charge" licence: <https://gsap.com/standard-license> |
| EB Garamond, Source Sans 3 | Served by Google Fonts |

THAARA's own code, copy and artwork do not carry an open-source licence.

## Contact

Studio enquiries: [hello.thaaracreates@gmail.com](mailto:hello.thaaracreates@gmail.com) ·
Instagram [@thaara.creates](https://www.instagram.com/thaara.creates)
