# CLAUDE.md — THAARA website

Project instructions. Read this before touching anything.

THAARA is a creative studio: interactive wedding invitations and event websites, plus brand
identity, digital design, website design and motion. This repo is its marketing site.

---

## Where the project currently stands

The site was rebuilt across five phases, all complete. It is **live and feature-complete**.

| Phase | State |
|---|---|
| 1 — Audit | Complete. Original site catalogued; no redesign. |
| 2 — Visual system & structure | Complete. Design tokens, 9-section homepage. |
| 3 — Conversion & trust | Complete. Process, contact form, closing CTA. |
| 4 — Polish, SEO, performance | Complete. 2265 KB → 106 KB, full SEO, a11y. |
| 5 — Final QA | Complete. One defect found and fixed (logo alignment). |
| **6 — Owner review** | **In progress. Awaiting the owner's feedback.** |

**Phase 6 is a feedback-driven phase, not a build phase.** The owner reviews the live site and sends
targeted feedback; you make the smallest effective correction for each item. Do **not** proactively
redesign, add sections, add animations, change the palette, or refactor. If you have no feedback in
hand, there is nothing to build — ask what they'd like changed.

Working rules for Phase 6:

1. Classify each item **Critical** (broken / wrong content / severe responsive) → **Important**
   (poor UX, weak hierarchy, inconsistency) → **Polish** (spacing, timing, detail). Highest impact first.
2. For subjective feedback ("too empty", "not premium"), first identify *which variable* is
   responsible — typography, spacing, composition, contrast, imagery, hierarchy, animation, content
   — then make the smallest change that fixes it.
3. Verify mobile **and** desktop after any layout change. Don't fix one by breaking the other.
4. Log every correction in `THAARA_CHANGELOG.md`: issue, change, files, reason.
5. Report what changed, then stop and wait. Don't volunteer further redesigns.

---

## ⚠️ Pushing deploys the live site

`main` is wired to **GitHub Pages, which builds automatically on push**. There is no staging step.

```
git push origin main   →   https://jerishjerry.github.io/thaara-website/  goes live in ~1 min
```

**Commit freely; push only when the user asks.** If you are unsure whether they want it live, ask.

Two URLs exist, and they do **not** serve the same thing:

| URL | Serves |
|---|---|
| `jerishjerry.github.io/thaara-website/` | **the current site** (canonical, auto-deploys from `main`) |
| `thaara-creates.netlify.app` | **the original pre-rebuild design** — never redeployed |

The Netlify site is stale on purpose. Don't treat it as the source of truth, and don't change
Netlify settings without being asked.

---

## Stack — do not change it

Hand-written static site. **No framework, no build step, no dependencies, no `package.json`.**

```
index.html    the whole page (one file)
404.html      styled 404
styles.css    the entire design system
script.js     nav state, mobile menu, scroll reveals, contact form
```

Open `index.html` in a browser and it runs. Serve locally with any static server:

```bash
py -m http.server 4173
```

This zero-dependency setup is a deliberate asset, not an accident. Do not introduce React, a
bundler, Tailwind, or a CSS preprocessor. If a task seems to need one, say so and ask first.

---

## Hard content rule: never invent

This site is a real business. **Do not fabricate** testimonials, client names, reviews, ratings,
awards, statistics, project results, founder details, years of experience, locations, or dates.

When information is missing, mark it visibly instead:

```html
<span class="needs-input">Testimonials &amp; client permissions — need user input</span>
```

There are currently **0 `needs-input` markers rendered** — both instances are commented out in
`index.html`, hidden on request:

- Work's "More work, once it is supplied" empty state.
- The whole Social Proof / "In Their Words" testimonial section, including the
  `[CLIENT TESTIMONIAL NEEDED]` block and its own marker.

`grep` still counts both, so the source shows two; neither renders. Uncomment the relevant block to
restore either when there's real content for it (further projects, or a real testimonial).

The Nivin & Dhiya case study's own gap notice and marker (what a brief/further visuals would have
added) were removed outright, ahead of a planned multi-project slides layout replacing this
single-project Work section.

Work now carries **two** projects (2026-09-19): Nivin & Dhiya as `.project--feature`, and Leo Ronald
× Asnia as `.project--split`. Both are real and permissioned. Arav & Keerthana, which appears in the
studio's marketing flyer, is a template/demo — **not** a client project, do not list it as work.

That flyer itself is now on the page (2026-09-19), in About as `.about-poster` — the studio's own
collateral, which is real work THAARA made for itself. Its `<figcaption>` is load-bearing: it says
the invitation pictured is a sample. Keep it. The couple's names stay out of the `alt` text so they
never enter machine-readable page text as a project.

Everything currently on the page traces to something real: the studio's own words, or the one
project asset. The wedding date (23 August 2026) and the phrase "an interactive wedding invitation,
designed as a website" are printed in the artwork itself.

---

## Design system

Every size, colour, space and duration resolves to a token defined at the top of `styles.css`
(section 01). **No ad-hoc values.** If you need a size that isn't in the scale, that's a signal to
reconsider, not to hard-code one.

- Palette: warm near-black in four steps, one gold accent, one hairline. `--on-gold` for text on gold.
- Type: EB Garamond (display) + Source Sans 3 (text), 10-step fluid scale.
- Motion: transform/opacity only. No parallax, no cursor effects, no glassmorphism, no gradients
  beyond the existing accents.
- Every element on the page shares **one left edge**. If you change a logo or container width,
  re-check that alignment — it has broken twice. Since 2026-09-22 the hero shares it too; there
  is no longer a centred exception on the page except the closing CTA and 404.

**Gold has two jobs and no more** (2026-09-22). It marks interactive things (links, arrows,
buttons) and exactly two accent phrases — the hero h1 and the closing h2, via `<em class="accent">`.
It was previously on all 8 headings, all 20 index numerals and every eyebrow, which made it the
most-used colour on the page (63 elements vs 54 for primary ink) and stopped it reading as an
accent at all. Don't reintroduce it on numerals, eyebrows or section headings.

**Section headings are not all the same size.** Work, Services and the closing line run at
`--fs-2xl`; Why, Process, About and Contact step down to `--fs-xl`. Seven of eight used to render
at an identical 48px, which left the page with no internal hierarchy. Keep the distinction:
heading size signals which sections carry the argument.

**Body copy is `--fs-base` (17px), not `--fs-sm`.** The token used to be set on `body` and then
overridden to 15px by every real paragraph rule, so the name described nothing. `--fs-sm` is for
genuinely secondary text (captions, chips, tabular values).

The brief throughout: premium, editorial, minimal, personal. Not a generic agency template.

---

## Things that will waste your time if you don't know them

These are real, repeatedly hit, and documented in `THAARA_REBUILD.md` §50.

1. **`[hidden]` loses to any rule that sets `display`.** A `display: grid` component rule silently
   un-hides the element while the attribute still reads as set. A global
   `[hidden]{display:none !important}` is in the reset — keep it. **Assert on computed display, never
   on `el.hidden`.** This shipped once: the form's success message rendered on page load.
2. **The dev server sends `304`s.** An edited `styles.css`/`script.js` keeps executing the old build.
   If a change "does nothing", compare the executed file's size against disk before debugging logic.
   Serving on a fresh port is the reliable cold-cache test.
3. **A collapsed/background browser pane reports `viewport: 0x0`.** Percentage widths collapse,
   images never lay out, and `naturalWidth` reads `0x0` with `complete: true` — indistinguishable
   from a decode failure. Check `window.innerWidth` before trusting geometry.
4. **In a non-compositing tab:** CSS transitions freeze at their start value, `IntersectionObserver`
   never fires (so scroll reveals and lazy images stay unloaded), `requestAnimationFrame` never
   runs, and `.focus()` doesn't set `:focus-visible`. Neutralise transitions or flip `loading` to
   `eager` to test the real behaviour.
5. **Contrast checks must composite alpha.** A ratio of exactly `1.00` means you compared a colour
   with itself — walk up and blend translucent backgrounds first.

---

## The contact form

**Wired to Web3Forms.** Submissions are emailed to the address registered against the access key.

```js
var ENQUIRY_ENDPOINT = "https://api.web3forms.com/submit";
var WEB3FORMS_ACCESS_KEY = "f1a9544f-22f1-4181-85e4-049bb0b9c55b";
```

The access key is **public by design** — Web3Forms documents it as such. It ships in `script.js`,
is visible in page source, and only routes mail to the pre-registered address. It is not a secret;
don't treat leaking it as an incident.

Clearing `ENQUIRY_ENDPOINT` is the safe way to take the form offline: the honest not-connected path
is still in the code and still works.

### The one thing not to break

**Web3Forms answers HTTP 200 with `{"success": false}` when it rejects a submission** — wrong key,
spam block, quota. The handler therefore reads the response body and shows success **only** on
`body.success === true`:

```js
if (!body || typeof body.success === "undefined") throw ...
if (body.success !== true) throw new Error(body.message || ...)
```

Gating on `res.ok` alone would print *"Thank you. We've received your message"* for mail that was
never delivered. That is the exact failure this form exists to prevent. If you refactor the submit
handler, keep the body check.

A hidden `botcheck` honeypot (`#f-botcheck`, `tabindex="-1"`, `aria-hidden`) sits in the form; real
users never see or tab to it, and Web3Forms rejects submissions where it comes back checked.

Two verified contact routes also exist and are shown on the page: **`hello.thaaracreates@gmail.com`**
and Instagram (**`@thaara.creates`**). Both are offered as the fallback on every failure path.

The mailbox is *not* an endpoint. `ENQUIRY_ENDPOINT` is a `fetch()` target and a mailbox cannot
accept a POST — Web3Forms is what forwards to that address.

---

## Images

Responsive `<picture>` with AVIF → WebP, four widths each, generated from the originals.

- `logo.png` and `invitation-save-the-date.png` are the **lossless masters — never modify or
  delete them.** The invitation PNG is no longer served; it's kept as the source.
- `leo-asnia-source.webp` is the source for the second project. Not a lossless master like the
  other two: it is the client site's own cover image, re-exported from the live site because no
  original design file was on hand. Still the single source of truth for `leo-asnia-*` — don't
  re-fetch or swap it casually.
- `studio-poster-source.jpg` is the studio's own marketing poster, shown in About. A social-sized
  export (1145×1374), so 880w is the largest useful variant — don't generate bigger.
- `tools/build-images.js` drives every non-logo image off one `PORTFOLIO` array. Adding an image
  = one entry (`master`, `slug`, `widths`), not new code. The array carries the two Work projects
  **and** the studio poster; the poster's entry is commented as collateral, not a project.
- Regenerate variants with `tools/build-images.js` (needs `sharp` installed anywhere convenient —
  it is a build-time tool only and must **not** become a project dependency).
- Every `<img>` needs `width`/`height` so nothing shifts as it loads.

---

## Before reporting work complete

Check console (expect 0 errors), failed requests (expect 0), horizontal overflow at 320px and
1920px, and that anchors still clear the fixed header. There is no build to run — the files are the
artefact.

---

## Where the detail lives

- **`THAARA_REBUILD.md`** — the full record: Phase 1 audit, the design system, every decision and
  its reasoning, verification results, and what's still missing. Long; read the section you need.
  §50 is the measurement-traps list. §46 and §51 are the open items.
- **`THAARA_CHANGELOG.md`** — post-review corrections, newest first.
- **`README.md`** — short public-facing overview.

## Still open

0. **Leo × Asnia is showing a static cover, not the video the owner wants.** The intended
   presentation is a short loop scrolling through the live invitation, inside the phone-shaped
   frame that is already built. Blocked on the recording itself (the client site's own opening
   video is 11 MB / 4K — too heavy to reuse as-is) and on `ffmpeg`, which is not installed here.
   The swap and the observer logic it needs are spelled out in `THAARA_CHANGELOG.md`, 2026-09-19.
1. Inbox delivery from the live domain is unconfirmed — tested from localhost only.
2. Testimonials, further projects, and About's location / founded / who-is-behind-THAARA.
3. The canonical points at the GitHub Pages URL. Moving to a custom domain means updating it in
   `index.html` (canonical, `og:url`, `og:image`, `twitter:image`, JSON-LD), `sitemap.xml`,
   `robots.txt`, and `404.html`.
4. Nobody has visually reviewed the rendered site or tested it outside one browser engine.
