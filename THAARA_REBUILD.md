# THAARA — Website Rebuild Guide

**Permanent project document.** Created in Phase 1 (audit & preparation). Carry this forward through every later phase.

- **Live site:** https://thaara-creates.netlify.app/
- **Netlify site ID:** `f7abe299-eece-445e-ae3b-0f754d65f8dc` (read from the injected Netlify HUD script)
- **Audit date:** 2026-08-25
- **Phase 1 status:** Complete (audit only, no redesign).
- **Phase 2 status:** Complete (visual system, homepage structure, brand experience).
- **Phase 3 status:** Complete (conversion, trust, client journey).

---

## 0. Important context about this repository

The working directory `D:\Jerin Website` was **completely empty** when Phase 1 began. There was no
source checkout, no git repository, and no copy of the project anywhere on this machine.

Because THAARA is a **hand-written static site with no build step**, the files served by Netlify
*are* the source code — there is no bundling, transpilation, or minification between source and
deploy. Phase 1 therefore restored the project from the live deployment into this directory.

Every restored file was verified **byte-identical (MD5)** to what Netlify serves. One line was
removed: the `<script src="/.netlify/scripts/hud">` tag, which Netlify injects at request time and
which is not part of the source.

> **Confirm before Phase 2:** if a canonical git repository exists elsewhere (GitHub/GitLab, another
> machine), treat that as the source of truth and reconcile it with this restored copy. See
> [MISSING — NEED USER INPUT] in §8.

---

## 1. Brand Direction

THAARA should feel:

- Premium
- Editorial
- Minimal
- Personal
- Creative
- Sophisticated
- Human
- Intentional

Avoid:

- Generic agency style
- SaaS design patterns
- Excessive gradients
- Glassmorphism
- Template-like layouts
- Overuse of animations

**Note on the current build:** the existing design already leans editorial and minimal, which is
correct. Two details work against the brief and should be revisited later: the `backdrop-filter:
blur(14px) saturate(120%)` on the scrolled navigation is a glassmorphism pattern, and the
`radial-gradient` accents on the project cards are already disabled by a later override — so the
gradient layer is dead weight rather than an active design choice.

---

## 2. Main Goals

The redesigned website should:

1. Clearly communicate what THAARA creates.
2. Make the portfolio the strongest proof of quality.
3. Highlight Invitation Experiences as a distinctive offering.
4. Build trust with visitors.
5. Make contacting THAARA simple.
6. Work beautifully on mobile.
7. Be accessible and fast.
8. Feel like a boutique creative studio.

**Largest gaps against these goals today:** goal 2 (one project, no title, no description, no case
study, no link), goal 4 (no named human, no location, no process, no proof), goal 5 (no email — the
only contact route is Instagram), and goal 7 (2.2 MB page weight, three sub-4.5:1 text colours).

---

## 3. Planned Website Structure

Future homepage structure:

1. Header
2. Hero
3. Featured Work
4. Services
5. Why THAARA
6. Process
7. Social Proof
8. About
9. Contact
10. Footer

Mapping from the current six sections to this ten-section target:

| Planned section | Exists today | Notes |
|---|---|---|
| Header | Yes | `header.nav` — reusable |
| Hero | Yes | `section.hero` — reusable |
| Featured Work | Partial | One untitled image, no copy or case study |
| Services | Yes | `section.create` — 4 disciplines, all linking to `#work` |
| Why THAARA | **No** | Content does not exist — needs user input |
| Process | **No** | Content does not exist — needs user input |
| Social Proof | **No** | Content does not exist — needs user input. **Do not fabricate.** |
| About | Yes | `section.about` — 1 short paragraph, no named person |
| Contact | Partial | Copy invites "send us a message" but offers no message channel |
| Footer | Yes | `footer.footer` — reusable |

---

## 4. Development Rules

Maintain:

- Existing framework — **plain static HTML + CSS + vanilla JS, no build step.** Do not introduce a
  framework or bundler without an explicit decision; the current stack is a genuine asset (zero
  dependencies, zero supply-chain risk, instant deploys).
- Reusable components
- Clean architecture
- Existing valuable assets

Never:

- Invent information
- Delete important work
- Add unnecessary features
- Redesign without purpose

---

## 5. Architecture (as verified)

> **Historical record — describes the site as found in Phase 1, before the Phase 2 redesign.**
> For the current state see §16.

### Stack

| Aspect | Finding |
|---|---|
| Framework | **None.** Hand-authored static HTML. |
| Build system | **None.** No `package.json`, no bundler, no transpiler, no CI step. |
| Package manager | Not used — zero npm dependencies. |
| Routing | **None.** Single page, in-page anchors only (`#top`, `#work`, `#about`, `#contact`). |
| Templating / components | **None.** One monolithic `index.html`. |
| TypeScript | Not used. |
| JavaScript | 69 lines of vanilla ES5-style JS in one IIFE, `"use strict"`, no dependencies. |
| Styling | One hand-written `styles.css` (668 lines). No Tailwind, no preprocessor, no CSS modules. |
| Design tokens | CSS custom properties on `:root` — well organised. |
| Animation library | **None.** CSS transitions + one `IntersectionObserver`. |
| Forms | **None.** Zero `<form>` elements. |
| Environment variables | **None required** — no server code, no API calls, no secrets. |
| Netlify config | **No `netlify.toml`, no `_headers`, no `_redirects`.** All Netlify defaults. |
| Deployment | Netlify static hosting. Build command not needed. |

### File inventory

```
D:\Jerin Website\
├── index.html                     62 KB   the entire page (164 lines)
├── styles.css                     17 KB   the entire design system (668 lines)
├── script.js                     2.0 KB   nav scroll state, mobile menu, scroll reveal
├── logo.png                       41 KB   798×614, 8-bit palette PNG + tRNS
├── invitation-save-the-date.png  2.2 MB   1624×969, RGBA PNG  ← 96% of page weight
├── THAARA_REBUILD.md                      this document
└── .claude/launch.json                    local dev-server config (added Phase 1)
```

### `script.js` — three responsibilities

1. **Nav scroll state** — adds `.scrolled` to `#nav` past 12 px (passive listener).
2. **Mobile menu** — toggles `.open` + `aria-expanded` + `aria-hidden`; closes on link click and on
   resize above 760 px.
3. **Scroll reveal** — `IntersectionObserver` (threshold 0.15) adds `.in-view` to `.reveal`
   elements. Correctly honours `prefers-reduced-motion` and falls back to revealing everything when
   `IntersectionObserver` is unavailable.

---

## 6. Website Structure — Phase 1 baseline

> **Historical record — the pre-redesign structure.** Current structure is in §16.

### Header — `header.nav#nav` (`index.html:20`)

- **Logo:** `<img src="logo.png" alt="THAARA">`, `.brand-logo`, 115 px wide (100 px ≤900 px, 88 px
  ≤760 px, 82 px ≤480 px). Wrapped in `<a href="#top" aria-label="THAARA — home">`.
- **Nav items:** Work, About, Contact, Instagram ↗ (external, `target="_blank"`, `rel="noopener
  noreferrer"` — correct).
- **Responsive:** `.desktop-nav` hidden below 760 px; `.menu-toggle` hamburger shown instead.
  Toggle animates into an X via two 1 px spans.
- **Interactions:** fixed position; on scroll gains `rgba(25,22,17,.82)` + 14 px backdrop blur +
  bottom border. Nav links have a left-to-right gold underline sweep on hover. Instagram arrow
  translates `(2px,-2px)` on hover.
- **Height:** 86 px desktop / 80 px ≤900 px / 74 px ≤760 px.

### Hero — `section.hero` (`index.html:46`)

- **Eyebrow:** `THAARA`
- **Headline (H1):** "Creative ideas,<br><em>beautifully</em> brought to life." — `<em>` renders
  italic gold.
- **Supporting text:** "Design, identity, motion and digital experiences crafted with intention."
  (max-width 32ch)
- **CTA:** "Explore our work ↓" → `#work`. Underlined, gold; on hover the gap widens and the arrow
  drops 3 px.
- **Visual:** `invitation-save-the-date.png` inside `.hp-visual`, wrapped in a link to `#work`,
  labelled "View selected work — Nivin and Dhiya invitation experience". Caption: "Selected work ↗".
- **Layout:** 1.25fr / 1fr grid; collapses to one column below 900 px where `.hero-preview` takes
  `order: -1` — **the image appears above the headline on mobile.**
- **Animation:** `.reveal` on the copy, `.reveal.reveal-delay` (150 ms) on the preview.

### Portfolio / Work — `section.work#work` (`index.html:66`)

- **Eyebrow:** `Selected Work` · **H2:** "A project, carefully brought to life."
- **Projects displayed:** exactly **one**, and it is **image-only**.
- **Component:** `article.feature-project` › `.fp-visual` › `img.invitation-image`.
- **Asset:** the same `invitation-save-the-date.png` used in the hero.
- **Alt text:** "Nivin and Dhiya wedding invitation — beach scene with elegant calligraphy, names
  and wedding date" — this alt text is currently the **only** written description of any THAARA
  project anywhere on the site.
- **Project links:** none. No title, no client name, no year, no scope, no case study, no live URL.

### Services — `section.create` (`index.html:80`)

- **Eyebrow:** `What We Create` · **H2:** "Four creative directions.<br><em>One visual language.</em>"
- **Layout:** `.discipline-list`, a hairline-ruled editorial list. Each row is a
  `3rem / 1fr / auto` grid (number, title + description, arrow). On hover the row indents 0.6 rem,
  gains a gold left-fade gradient, the title turns gold, and the arrow translates `(4px,-4px)`.

| # | Service | Description |
|---|---|---|
| 01 | Invitation Experiences | Interactive wedding & event websites |
| 02 | Brand Identity | Logos & visual identities |
| 03 | Digital Design | Websites, landing pages & social media |
| 04 | Motion & Visuals | Animations, promotional visuals & digital experiences |

- **All four rows link to `#work`** — they look like they lead to service detail pages but all land
  on the same single-image section. This is the site's most misleading interaction.

### About — `section.about#about` (`index.html:112`)

- **Eyebrow:** `About` · **H2:** "We create with intention."
- **Body:** "THAARA is a creative space focused on design, visual identity, digital experiences and
  motion — creating work that feels thoughtful, expressive and memorable."
- Centred, max-width 620 px, on `--bg-soft`.
- **No founder name, no team, no photo, no location, no history.** Voice is first-person plural
  ("we") but no person is ever named.

### Instagram — `section.instagram` (`index.html:121`)

- **Eyebrow:** `Follow Along` · **H2:** "More from THAARA."
- **CTA:** pill-shaped `.outline-link` "Follow @thaara.creates ↗"; inverts to solid gold on hover.
- No embedded feed — a single outbound link.

### Contact — `section.contact#contact` (`index.html:132`)

- **Eyebrow:** `Get In Touch` · **H2:** "Have an idea?<br><em>Let's talk.</em>"
- **Body:** "For enquiries, collaborations or anything you'd like to ask, send us a message."
- **Only contact method:** an Instagram link.
- **No email address, no form, no phone, no WhatsApp anywhere in the codebase.** The copy promises
  a message channel the page does not provide.

### Footer — `footer.footer` (`index.html:143`)

- **Logo:** `logo.png` at 105 px, `opacity: .95`.
- **Links:** Work, About, Contact, Instagram ↗.
- **Bottom bar:** `© 2026 THAARA` (left) · `Creative & Digital Experiences` (right), separated by a
  hairline rule. The year is **hardcoded**.

### Social links — complete inventory

Exactly one external destination exists on the entire site, repeated four times (header, mobile
menu, Instagram section, footer):

```
https://www.instagram.com/thaara.creates?igsi=MXE3ZzV1am9ndHhqdw%3D%3D&utm_source=qr
```

Verified reachable (HTTP 200). It carries a stale `igsi` session parameter and `utm_source=qr`
copied from an Instagram QR share — these should be stripped to a clean profile URL.

---

## 7. Visual System — Phase 1 baseline

> **Historical record.** The Phase 2 design system supersedes this; see §16.

### Design tokens (`styles.css:5`)

```css
--bg:        #191611   /* page base — warm near-black          */
--bg-alt:    #211b15   /* Work + Contact sections              */
--bg-soft:   #292219   /* About section                        */
--ink:       #f3ece0   /* primary text — warm off-white        */
--ink-dim:   #a99d8c   /* secondary text                       */
--ink-faint: #7c7266   /* tertiary text — FAILS AA, see §9     */
--gold:      #c9a35e   /* single accent                        */
--gold-soft: rgba(201,163,94,.35)
--line:      rgba(243,236,224,.09)  /* hairline borders        */
```

A disciplined, genuinely well-chosen palette: one warm dark ground in three steps, one accent, one
hairline. **Keep this.**

`<meta name="theme-color" content="#15120e">` does **not** match `--bg` (`#191611`) — the mobile
browser chrome tint is a slightly different colour from the page.

### Typography

| Role | Family | Weight | Size | Line height | Letter spacing |
|---|---|---|---|---|---|
| H1 | Cormorant Garamond | 600 | `clamp(2.3rem, 5vw, 3.8rem)` | 1.08 | −0.01em |
| H2 (section) | Cormorant Garamond | 600 | `clamp(1.7rem, 3vw, 2.5rem)` | 1.15 | — |
| H2 (about) | Cormorant Garamond | 600 | `clamp(1.6rem, 3vw, 2.2rem)` | — | — |
| H2 (contact) | Cormorant Garamond | 600 | `clamp(1.9rem, 3.4vw, 2.6rem)` | — | — |
| `em` in headings | Cormorant Garamond | 600 italic | inherit | — | — |
| Service title | Cormorant Garamond | 400 | `clamp(1.2rem, 2.4vw, 1.7rem)` | — | — |
| Body | Manrope | 400 | 16 px | 1.6 | — |
| Hero text | Manrope | 400 | `clamp(1rem, 1.3vw, 1.15rem)` | 1.6 | — |
| Eyebrow | Manrope | 600 | 0.72 rem | — | 0.18em, uppercase |
| CTA / button | Manrope | 700 | 0.82 rem | — | 0.1em, uppercase |
| Nav link | Manrope | 600 | 0.78 rem | — | 0.06em, uppercase |
| Footer meta | Manrope | 400 | 0.72 rem | — | 0.04em |

**Fonts are loaded from Google Fonts** (`display=swap`, with `preconnect` to both
`fonts.googleapis.com` and `fonts.gstatic.com` — correctly done).

**Requested-vs-used mismatch (verified via `document.fonts`):**

```
Requested: Cormorant Garamond 500, 600, 700, italic-500
           Manrope 400, 500, 600, 700

Used but NOT requested:  Cormorant italic 600  (h1 em, h2 em → substituted with italic 500)
                         Cormorant roman  400  (.d-title, .d-number, .mobile-menu a → substituted with 500)
Requested but NEVER used: Cormorant roman 700
                          Manrope 500
```

So two font weights are downloaded and never rendered, while two rendered weights fall back to a
neighbouring weight. Worth correcting in a later phase — it is a small, precise fix.

### Layout

- Container: `--container: 1180px`
- Inline padding: `--pad-inline: clamp(1.25rem, 5vw, 3rem)`
- Section padding: `--section-pad: clamp(2.25rem, 4.5vw, 3.75rem)`
- Narrow measures: About 620 px, Contact 560 px, hero text 32ch, section H2 24ch
- Border radius: 6 px on cards; 999 px on the Instagram pill
- Breakpoints: **900 px** (hero → 1 col), **760 px** (nav → hamburger), **640 px** (service grid),
  **480 px** (Instagram card stacks)

### Motion

- Shared easing token: `--ease: cubic-bezier(.22,.61,.36,1)`
- Scroll reveal: `opacity 0 → 1`, `translateY(18px) → 0`, 0.7 s, via `IntersectionObserver`
- Nav background/blur transition: 0.4 s
- Mobile menu: `max-height 0 → 320px`, 0.45 s
- Hover: nav underline sweep 0.35 s; card lift `translateY(-4px) scale(1.015)` 0.5 s; feature card
  `scale(1.012)` 0.6 s; service row indent 0.35 s; arrow nudges 0.3 s
- `html { scroll-behavior: smooth }` for anchor navigation
- **`prefers-reduced-motion` is respected in both CSS and JS** — genuinely good work
- No page transitions (single page)

---

## 8. Content Inventory

### Verified information (exists in the project)

| Field | Value |
|---|---|
| Brand name | THAARA |
| Positioning line | Creative & Digital Experiences |
| Page title | THAARA — Creative & Digital Experiences |
| Meta description | THAARA — Creative & Digital Experiences. Invitation experiences, brand identity, digital design and motion. |
| Hero headline | Creative ideas, *beautifully* brought to life. |
| Hero subline | Design, identity, motion and digital experiences crafted with intention. |
| Work headline | A project, carefully brought to life. |
| Services headline | Four creative directions. *One visual language.* |
| Service 01 | Invitation Experiences — Interactive wedding & event websites |
| Service 02 | Brand Identity — Logos & visual identities |
| Service 03 | Digital Design — Websites, landing pages & social media |
| Service 04 | Motion & Visuals — Animations, promotional visuals & digital experiences |
| About headline | We create with intention. |
| About body | THAARA is a creative space focused on design, visual identity, digital experiences and motion — creating work that feels thoughtful, expressive and memorable. |
| Instagram headline | More from THAARA. |
| Contact headline | Have an idea? *Let's talk.* |
| Contact body | For enquiries, collaborations or anything you'd like to ask, send us a message. |
| Instagram handle | @thaara.creates |
| Copyright | © 2026 THAARA (hardcoded) |
| Only project reference | "Nivin and Dhiya wedding invitation — beach scene with elegant calligraphy, names and wedding date" (alt text only) |

### Missing information

Needed to reach the ten-section target structure. **Nothing below may be invented.**

**Contact & identity**
- Email address — `[MISSING — NEED USER INPUT]`
- Phone / WhatsApp, and whether it should be public — `[MISSING — NEED USER INPUT]`
- City / country / timezone / service area — `[MISSING — NEED USER INPUT]`
- Preferred enquiry route (form → inbox, mailto, WhatsApp, Instagram DM) — `[MISSING — NEED USER INPUT]`
- Any social channels beyond Instagram (Behance, Pinterest, LinkedIn, Dribbble) — `[MISSING — NEED USER INPUT]`

**About / Why THAARA**
- Founder or team name(s) and pronouns — `[MISSING — NEED USER INPUT]`
- Founder bio and whether a portrait should appear — `[MISSING — NEED USER INPUT]`
- Studio vs solo practice: "we" is used throughout — is that accurate? — `[MISSING — NEED USER INPUT]`
- Meaning / origin of the name "THAARA" — `[MISSING — NEED USER INPUT]`
- Founding year — `[MISSING — NEED USER INPUT]`
- Genuine differentiators for the "Why THAARA" section — `[MISSING — NEED USER INPUT]`

**Portfolio**
- Real project title for the Nivin & Dhiya piece — `[MISSING — NEED USER INPUT]`
- Its scope, deliverables, date, and whether the couple consented to being named — `[MISSING — NEED USER INPUT]`
- Live URL of that invitation experience, if one is public — `[MISSING — NEED USER INPUT]`
- Any additional projects, plus their assets — `[MISSING — NEED USER INPUT]`
- Whether more work exists on Instagram that should be migrated onto the site — `[MISSING — NEED USER INPUT]`

**Process & proof**
- The actual working process, stage by stage — `[MISSING — NEED USER INPUT]`
- Typical timelines — `[MISSING — NEED USER INPUT]`
- Pricing / packages, or a deliberate decision to omit them — `[MISSING — NEED USER INPUT]`
- Real testimonials with permission to publish — `[MISSING — NEED USER INPUT]`
- Client names that may be shown — `[MISSING — NEED USER INPUT]`

> **Do not invent** clients, testimonials, awards, statistics, founder details, years of
> experience, or project results. If a planned section has no verified content, leave the section
> out rather than filling it.

**Technical / operational**
- Canonical git repository location — `[MISSING — NEED USER INPUT]`
- Custom domain, or intent to stay on `*.netlify.app` — `[MISSING — NEED USER INPUT]`
- Logo in vector form (SVG/AI/PDF) — `[MISSING — NEED USER INPUT]`
- Whether `#c9a35e` gold and Cormorant/Manrope are the official brand standards — `[MISSING — NEED USER INPUT]`
- Source file for `invitation-save-the-date.png` at original quality — `[MISSING — NEED USER INPUT]`
- Netlify account owner / deploy method (git-linked vs drag-and-drop) — `[MISSING — NEED USER INPUT]`
- Analytics requirement — `[MISSING — NEED USER INPUT]`

---

## 9. Issues Found in Phase 1

Every item below was verified against the running site. **None were fixed in Phase 1** — nothing
here prevents the application from running. Severity is for future prioritisation.

### Performance

| # | Severity | Issue |
|---|---|---|
| P1 | **Critical** | `invitation-save-the-date.png` is **2,165 KB** — 96% of the 2,265 KB page. It is a 1624×969 **RGBA** PNG holding what is effectively a photograph. Converting to WebP/AVIF should cut it by ~90%. |
| P2 | High | The favicon is a **55 KB base64 data URI in `<head>`**, byte-identical to `logo.png` (MD5 `add82d51…`) — a 798×614 image used as a favicon. It inflates the critical HTML from ~6 KB to 61 KB and duplicates an asset already fetched separately. Because no icon *file* is shipped, clients that probe `/favicon.ico` directly get a 404 (verified). Fix both with a small real icon set. |
| P3 | High | No `srcset` / `sizes` / `<picture>`. The full 1624 px image is served to a 375 px phone, where it renders at 258×154 (hero) and 336×200 (work). |
| P4 | Medium | `logo.png` is 798×614 (41 KB) but renders at 115×78 — roughly 7× oversized. A logo should be SVG. |
| P5 | Medium | No `width`/`height` attributes on any `<img>` → layout shift (CLS) before images load. |
| P6 | Medium | `load` event at **3.7 s**; the hero image alone took 2.7 s. |
| P7 | Low | Two Cormorant/Manrope weights are downloaded and never used (see §7). |
| P8 | Low | `Cache-Control: public,max-age=0,must-revalidate` on all assets (Netlify default). Filenames are not content-hashed, so this is the *safe* default — but hashed filenames plus a long `max-age` via `_headers` would remove a revalidation round trip for the 2.2 MB image. |
| P9 | Low | Netlify's public HUD script (`/.netlify/scripts/hud`, 10 KB) is injected on the production site. Usually worth disabling in Netlify settings. |

### Accessibility

| # | Severity | Issue |
|---|---|---|
| A1 | **High** | `--ink-faint` (`#7c7266`) on `--bg` (`#191611`) = **3.83:1**, below the WCAG AA 4.5:1 minimum for normal text. Affects service descriptions (13.6 px), footer meta (11.5 px), and the hero caption (10.9 px) — all small text, so none qualify for the large-text exemption. |
| A2 | **High** | The closed mobile menu keeps its 4 links **focusable** (verified: `tabIndex 0`, and `.focus()` succeeds). `max-height:0; overflow:hidden` hides them visually but does not remove them from the tab order — so keyboard users at **every** viewport width tab through 4 invisible links in the header. |
| A3 | **High** | Related ARIA violation: `#mobileMenu` carries `aria-hidden="true"` while containing focusable children. Fix A2 and A3 together with `visibility: hidden` + `inert` (or `display: none`) when closed. |
| A4 | Medium | Touch targets below the 44×44 px guideline: hamburger 40×40, hero CTA 172×**27**, footer links 39×**19**. |
| A5 | Medium | Mobile menu does not close on **Escape** (verified) and does not trap focus. |
| A6 | Medium | No skip-to-content link, despite a fixed 86 px header. |
| A7 | Low | Body copy is set on `font-size: 16px` (absolute) rather than a relative unit, so it ignores the user's browser font-size preference. |

### Robustness

| # | Severity | Issue |
|---|---|---|
| R1 | **High** | **All 12 `.reveal` blocks — the entire main content** (hero copy, hero preview, every section head, the featured project, all 4 service rows, About, Instagram, Contact) — start at `opacity: 0` and are only revealed when JS adds `.in-view`. With JavaScript disabled or broken, the page renders as **header + footer over an empty page**. There is no `<noscript>` fallback. The mechanism works correctly in a normal browser; the risk is the absence of a non-JS floor. Content is present in the HTML, so crawlers that do not execute JS still read it. |

### Correctness / UX bugs

| # | Severity | Issue |
|---|---|---|
| B1 | **High** | **Anchor navigation lands under the fixed header.** No `scroll-margin-top` on sections (verified `0px`) and no `scroll-padding-top` on `html` (`auto`), against an 86 px fixed nav. Jumping to `#work` puts its heading at 54 px from the top and `#about` at 50 px — both behind the nav. `#contact` escapes only because it sits at the end of the document. |
| B2 | **High** | **All four service rows link to `#work`.** They present as links to service detail pages but all land on the same single-image section. |
| B3 | Medium | The Instagram URL carries a stale `igsi=MXE3ZzV1am9ndHhqdw%3D%3D` session token and `utm_source=qr` from a QR share. Should be a clean profile URL. |
| B4 | Medium | Contact copy says "send us a message" but no message channel exists — no email, no form. |
| B5 | Low | The same 2.2 MB image is referenced twice (hero + work), so the featured project *is* the hero image. The "Selected Work" section shows nothing new. |
| B6 | Low | `© 2026` is hardcoded and will silently go stale. |
| B7 | Low | `theme-color` (`#15120e`) does not match `--bg` (`#191611`). |
| B8 | Low | `script.js` guards `toggle`/`menu` for null but dereferences `nav` unguarded — inconsistent, though safe in practice since the script is `defer`red. |

### Code health

| # | Severity | Issue |
|---|---|---|
| C1 | Medium | **13 dead CSS class blocks** (verified by diffing every CSS selector against the HTML and JS). Left over from an earlier "browser-window mockup" treatment that was replaced by the raw invitation image: `hp-browser`, `hp-content`, `hp-dot`, `hp-kicker`, `hp-rule`, `fp-browser`, `fp-content`, `fp-dot`, `fp-cat`, `fp-info`, `fp-kicker`, `fp-meta`, `fp-rule`. |
| C2 | Medium | `styles.css` has three stacked override layers appended after the responsive block — `/* FINAL POLISH */`, `/* INVITATION PROJECT IMAGE */`, and an untitled third — that re-declare `.hp-visual`, `.fp-visual`, `.brand-logo`, `.footer-logo`, and the media queries already defined above. `.hp-visual` width is set **four separate times**. This is patch-on-patch and should be consolidated. |
| C3 | Low | One `!important` (`.hp-browser, .fp-browser { display:none !important }`) targeting classes that no longer exist in the HTML. |
| C4 | Low | Dead decorative CSS: `.hp-visual::after` / `.fp-visual::after` define radial gradients that a later block disables with `display:none`. |
| C5 | Low | Navigation markup is duplicated three times (desktop nav, mobile menu, footer nav) with no shared source — a real maintenance cost with no build step to solve it. |

### SEO

| # | Severity | Issue |
|---|---|---|
| S1 | **High** | **No Open Graph tags at all.** Sharing the link on WhatsApp, Instagram, iMessage, LinkedIn, or Facebook yields no title card, no description, no image. For a studio that markets on Instagram, this is the highest-value SEO fix available. |
| S2 | **High** | **No social preview image** exists in the repository. |
| S3 | High | **No Twitter/X card tags.** |
| S4 | High | **No `rel="canonical"`.** |
| S5 | Medium | **No `robots.txt`** (404). |
| S6 | Medium | **No `sitemap.xml`** (404). |
| S7 | Medium | **No structured data** — no JSON-LD. A `LocalBusiness` / `Organization` / `ProfessionalService` block would suit a boutique studio. |
| S8 | Low | No `404.html`, so Netlify serves its generic default. |
| S9 | Low | Meta description is 132 characters and largely repeats the title. |
| S10 | Low | No `<meta name="robots">` (defaults are fine, but explicit is better). |

**Verified as already correct — do not "fix" these:**

- Heading hierarchy is clean: exactly one `<h1>`, then five `<h2>`s, no skipped levels.
- All four images have descriptive, meaningful `alt` text.
- `<html lang="en">` is set.
- Landmarks are correct: one `<header>`, one `<main>`, one `<footer>`, two labelled `<nav>`s.
- All external links use `rel="noopener noreferrer"`.
- `:focus-visible` styling is defined (1 px gold outline, 3 px offset).
- The hamburger has `aria-label`, `aria-expanded`, and `aria-controls`.
- The hero image is `loading="eager"`; the below-fold one is `loading="lazy"`.
- Viewport meta includes `viewport-fit=cover`.
- No horizontal overflow at 375 px (verified: `scrollWidth === innerWidth`).
- Brotli compression is active on HTML/CSS/JS.
- Zero console errors or warnings, locally and in production.
- No inline styles and no inline event handlers — clean separation of concerns.
- `prefers-reduced-motion` is honoured in both CSS and JS.

**Also noted:** no security headers are set (`X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, CSP). Low risk on a static site with no forms or user
data, but a `_headers` file would be a cheap improvement.

---

## 10. Important Assets — keep and reuse

| Asset | Type | Where used | Reusable? |
|---|---|---|---|
| `invitation-save-the-date.png` | 1624×969 RGBA PNG, 2.2 MB | Hero + Work | **Yes — the single most valuable asset on the site.** It is the only portfolio artwork in existence. **Never delete.** Optimise to WebP/AVIF and keep the original as the master. Request the true source file. |
| `logo.png` | 798×614 palette PNG + alpha, 41 KB | Header, footer, favicon | **Yes.** The brand mark. Needs an SVG version. **Never delete.** |
| Design token block (`styles.css:5-24`) | CSS custom properties | Site-wide | **Yes.** Disciplined and brand-appropriate — carry forward verbatim. |
| Grain overlay (`styles.css:.grain`) | Inline SVG `feTurbulence`, 0 bytes network | Site-wide | **Yes.** Elegant, weightless editorial texture. Keep. |
| `.discipline-list` pattern | CSS | Services | **Yes.** The most editorial, on-brand component on the site. |
| `.reveal` + `IntersectionObserver` | CSS + JS | 12 blocks | **Yes**, with a non-JS floor added (see R1). |
| `--ease` easing token | CSS | All transitions | **Yes.** Consistent motion character. |
| Mobile menu logic | JS | Header | **Yes**, after fixing A2/A3/A5. |
| Verified copy (§8) | Text | Site-wide | **Yes.** Real brand voice — reuse rather than rewrite. |

**Nothing was deleted or replaced in Phase 1.**

---

## 11. Strengths to preserve

Worth stating plainly, because a rebuild can easily destroy these:

1. **Zero dependencies.** No npm tree, no supply-chain risk, no build to break, no framework churn.
   For a site this size that is a real architectural advantage, not a limitation.
2. **A disciplined, genuinely premium palette.** One warm dark ground in three steps, one gold
   accent, one hairline. Restrained in exactly the right way.
3. **A well-judged type pairing.** Cormorant Garamond over Manrope is editorial and appropriate.
4. **Real typographic craft** in the details: 0.18em eyebrow tracking, 1.08 heading line-height,
   `−0.01em` H1 tracking, `ch`-based measures.
5. **Fluid `clamp()` sizing throughout** — no jarring breakpoint jumps.
6. **Motion accessibility handled properly** in both CSS and JS. Frequently skipped; done right here.
7. **Correct semantic HTML** — landmarks, heading order, meaningful alt text, labelled navs.
8. **Restrained hover craft** — the nav underline sweep and service-row indent are subtle and
   confident, not decorative noise.
9. **Clean separation of concerns** — no inline styles, no inline handlers.
10. **A distinctive, defensible niche** — "Invitation Experiences" (interactive wedding/event
    websites) is specific and memorable in a market full of generic design studios.

## 12. Weaknesses to address in later phases

1. **The portfolio is one untitled image.** For a studio site, the portfolio *is* the argument, and
   right now it makes no argument. Highest-impact area by a wide margin.
2. **Nobody is named.** No founder, no team, no location, no face. "We" with no human behind it
   undercuts the "personal / human" brand goal directly.
3. **Contact is a dead end.** The copy invites a message; the page offers only Instagram.
4. **No proof of any kind** — no process, no testimonials, no client names, no timelines.
5. **2.2 MB for one screen of content**, on a site whose audience will mostly arrive from Instagram
   on mobile data.
6. **Sharing the link produces no preview card** — the primary distribution channel is Instagram,
   where a bare URL performs badly.
7. **Invitation Experiences is buried** as list item 01 of 4, despite being the distinctive offering
   the brand should lead with.
8. **CSS has become patch-on-patch**, with three override layers and 13 dead class blocks.
9. **Services promise depth that does not exist** — four links, one destination.
10. **The hero image and the featured project are the same file**, so "Selected Work" reveals
    nothing new as the visitor scrolls.

---

## 13. Running the project

There is no build step. The files are served as-is.

A local dev-server config was added at `.claude/launch.json` (name `thaara-static`, port 4173,
`py -m http.server`). Any static server works:

```bash
py -m http.server 4173
```

Then open `http://localhost:4173`.

**Do not change the deployment configuration.** Netlify publishes the repository root with no build
command, which is correct for this project.

---

## 14. Phase 1 boundary

Phase 1 was audit and preparation only. Deliberately **not** done:

- No redesign of the hero
- No change to the typography system
- No change to colours
- No components rebuilt
- No animations added
- No pages added
- No content invented
- No deployment configuration changed
- **None of the issues in §9 fixed** — nothing there blocks the site from running

**Next step:** answer the `[MISSING — NEED USER INPUT]` items in §8 before Phase 2. The content
gaps, not the code, are what currently limit this site.

---

# PHASE 2 — Core Visual System, Homepage Structure & Brand Experience

Completed 2026-08-25. Framework, deployment setup and all assets preserved. Nothing was rebuilt from
scratch; `index.html`, `styles.css` and `script.js` were rewritten in place as a consolidated
refactor of the same three-file static site.

## 15. Two scope conflicts in the Phase 2 brief, and how they were resolved

**1. Process — required in the nav, deferred as a section.**
The brief lists Process as a navigation item (§4) but defers Process content to Phase 3 (§12).
Shipping the nav item without a destination would have created a dead anchor. Resolution: `#process`
exists as a real section containing the eyebrow, heading and a bordered block stating plainly that
the process is not documented yet, plus the four specific things needed to write it. No process
steps were invented. The nav item works; the section reads as deliberately unfinished.

**2. "Improve other projects" — there are no other projects.**
The brief (§8) asks for variety across multiple projects, using projects "from the repository." The
repository contains exactly one. Nothing was fabricated. Instead:

- The one real project (Nivin × Dhiya) is presented as the flagship.
- Three reusable project layouts were built — `.project--feature` (in use), `.project--split`
  (with `.is-reversed`) and `.project--immersive` — so Phase 3 can vary presentation without new CSS.
- A visually distinct dashed `.slot` block marks where further work goes, labelled as needing input.

## 16. Phase 2 design system

### Token layers (`styles.css` section 01)

| Group | Tokens |
|---|---|
| Colour | `--bg` `--bg-alt` `--bg-soft` `--bg-raise` · `--ink` `--ink-dim` `--ink-faint` · `--gold` `--gold-lift` `--gold-soft` `--gold-haze` · `--line` `--line-firm` |
| Type scale | `--fs-3xs` through `--fs-3xl` (10 fluid steps) |
| Spacing | `--sp-1` through `--sp-11`, plus `--section-y` / `--section-y-sm` |
| Layout | `--container` 1180 · `--container-wide` 1400 · `--container-narrow` 680 · `--gutter` · radii |
| Motion | `--ease` `--ease-out` · `--dur-fast` `--dur` `--dur-slow` |
| Chrome | `--nav-h` (84 / 76 / 68 px), consumed by `scroll-padding-top` |

**Palette carried forward unchanged** except `--ink-faint`, raised from `#7c7266` to `#938878`.
The old value measured 3.83:1 against `--bg` — below the WCAG AA 4.5:1 floor — and it was the
tertiary text colour across the whole site. The new value measures **5.18:1** on `--bg` and
**4.9:1** on `--bg-alt` / `--bg-soft`. Every text/background pair on the page now passes AA
(verified: 10 sampled roles, 0 failures).

### Typography

Every size in the build resolves to a scale token — no ad-hoc values.

| Role | Family / weight | Token |
|---|---|---|
| H1 | Cormorant Garamond 500 · 1.04 lh · −0.012em | `--fs-3xl` (2.5 to 4.5rem) |
| H2 | Cormorant Garamond 500 · 1.1 lh | `--fs-2xl` (2 to 3rem) |
| H3 | Cormorant Garamond 500 · 1.15 lh | `--fs-xl` (1.6 to 2.3rem) |
| H4 / service name | Cormorant Garamond 400 | `--fs-lg` |
| Body | Manrope 400 · 1.65 lh | `--fs-base` (**1.0625rem**, relative — honours user font size) |
| Lead | Manrope 400 · 1.55 lh | `--fs-md` |
| Eyebrow | Manrope 600 · .2em · uppercase | `--fs-2xs` |
| Button / nav | Manrope 700 / 600 · .1em · uppercase | `--fs-xs` |
| Micro label | Manrope 600 · .16em · uppercase | `--fs-3xs` |

Italic gold `em` inside display type is retained as THAARA's signature detail.

**Font request now matches usage.** Phase 1 downloaded Cormorant 700 and Manrope 500 without using
them, while rendering Cormorant italic 600 and roman 400 that were never requested. The request is
now `Cormorant Garamond ital,wght@0,400;0,500;0,600;1,400;1,500` plus `Manrope 400;500;600;700`.

### Buttons

`.btn` supplies shared geometry — 48 px minimum height, pill radius, uppercase Manrope 700, .1em
tracking. Two variants only:

- `.btn--primary` — solid gold on dark, one per view. Lifts 2 px and brightens on hover.
- `.btn--secondary` — outlined, transparent. Border and label go gold on hover.

Both carry hover, `:focus-visible` (2 px gold outline, 3 px offset) and arrow-nudge states. Below
420 px the `.btn-row` stacks and buttons go full width. `.link-rule` covers tertiary text actions.

### Layout primitives

`.container` (plus `--wide` / `--narrow` modifiers), `.section` (plus `--tight` `--alt` `--soft`
`--ruled`), `.section-head` (plus `--split`). Section rhythm is `clamp(4.5rem, 8.5vw, 8rem)` —
roughly double the Phase 1 spacing, which the audit flagged as cramped for an editorial feel.

**Alignment:** `.nav-inner` shares `--container` with content, so the header logo, hero headline,
every section eyebrow and the footer logo all sit on one vertical line (verified: all at x=171 at
1440 px).

### Motion

Reveal-on-scroll is `opacity 0 to 1` plus `translateY(20px) to 0` over `--dur-slow` with
`--ease-out`, driven by one `IntersectionObserver`. Stagger via `data-delay="1..4"`. Hover states
are limited to colour, 1–2 px lift, and small arrow nudges. No parallax, no animated backgrounds,
no cursor effects.

`prefers-reduced-motion` disables reveals, smooth scrolling and all transitions.

**The hidden state is scoped to `.js`.** An inline one-liner in `<head>` adds the class; if
JavaScript never runs, `.reveal` has no hiding rule and the page renders fully. This fixes Phase 1
issue R1, where all main content sat at `opacity: 0` behind JS with no fallback (verified: 0 of 25
blocks hidden with `.js` removed).

A second fallback covers the case where JavaScript *does* run but the observer does not deliver.
After 1500 ms, if **nothing at all** has been revealed, the observer is treated as broken and
everything is shown. It also re-checks on `visibilitychange`.

> **This was wrong on first implementation and is worth remembering.** The original net tested each
> element's position (`box.top < window.innerHeight`) before revealing it. In a tab that has not
> been laid out — a background tab, a headless renderer, a link-preview crawler — every
> `getBoundingClientRect()` reads zero, so the position guard rejected the entire page and revealed
> nothing. It was caught on the deployed site: **0 of 25 blocks revealed.** The net now tests only
> whether *anything* is in view, never geometry. Re-verified in the same failing conditions:
> **25 of 25.** In a normal tab it stays dormant, because above-fold content is in view long before
> the deadline — so the scroll animation is unaffected.
>
> General lesson for later phases: a fallback that depends on layout is not a fallback for
> situations where layout has not happened.

## 17. Homepage structure as built

| # | Section | id | Background | Notes |
|---|---|---|---|---|
| 1 | Header | `#nav` | transparent, solid on scroll | 5 nav items plus Instagram |
| 2 | Hero | — | `--bg` | new headline, 2 CTAs, framed project plate |
| 3 | Featured Work | `#work` | `--bg-alt` | flagship project plus marked slot |
| 4 | Services | `#services` | `--bg` | lead service block plus 3-item ruled list |
| 5 | Why THAARA | `#why` | `--bg-soft` | 4 principles |
| 6 | Process | `#process` | `--bg` | structure only, content pending |
| 7 | About | `#about` | `--bg-alt` | statement, body, facts list |
| 8 | Contact | `#contact` | `--bg` | placeholder area, Instagram only |
| 9 | Footer | — | `--bg` | brand, 6 links, dynamic year |

Heading order verified: one `H1`, then `H2` per section with `H3` beneath. No skipped levels.

### Header

Nav: **Work · Services · About · Process · Contact**, with Instagram set apart behind a hairline
divider in `--ink-dim` — present but secondary. Gold rule sweeps in on hover. Solid `--bg` on
scroll; **the Phase 1 `backdrop-filter` blur was removed**, since the brief excludes glassmorphism.

Mobile menu (up to 900 px) is a full-height panel. Verified behaviour:

| Check | Result |
|---|---|
| Links focusable while closed | **No** — `inert` plus `visibility: hidden` |
| `aria-expanded` / `aria-label` toggle | Yes — `false`/"Open menu" to `true`/"Close menu" |
| Focus moves into panel on open | Yes |
| Escape closes and returns focus to toggle | Yes |
| Tab trapped inside open panel | Yes |
| Background scroll locked while open | Yes |
| Link touch-target height | 60 px |

### Hero

- Headline: **"Digital experiences, *made personal.*"**
- Lead: "THAARA creates distinctive digital experiences, visual identities and motion for weddings,
  events, brands and meaningful moments."
- Primary CTA "Explore our work" to `#work`; secondary "Start a project" to `#contact`.
- Visual: the invitation artwork as a framed editorial plate, captioned "Nivin × Dhiya —
  Invitation Experience", linking to `#work`.

The hero plate renders at **425 px** wide while Featured Work renders the same artwork at
**1082 px** — a 2.5× difference in scale and context. Phase 1 flagged that the hero and featured
project were visually identical; the two readings are now distinct without adding an asset.

Below 1000 px the plate is capped at `min(280px, 78%)` so the separation survives on small
screens — without the percentage term the two visuals collapse to the same width at 320 px.
Measured ratio (Featured Work ÷ hero plate): **1.28× at 320 px · 1.28× at 390 px · 2.42× at
768 px · 2.55× at 1280 px · 2.55× at 1440 px.**

### Featured Work

`.project--feature`: index `01`, name **Nivin × Dhiya**, category **Invitation Experience**, large
visual, then a two-column body — description on the left, a hairline `dl` of design details on the
right (Category, Format, Artwork, Lettering, Year).

Every stated fact traces to the existing asset or its alt text: the names, that it is a wedding
save-the-date (filename), the beach scene, and the hand-lettered calligraphy carrying names and
date. Year and live link are marked as needing input. No client feedback, story, results,
inspiration or statistics were written.

### Services

Invitation Experiences is pulled out of the list into its own `.service-lead` block with a
five-item capability list — the brief asks for it to read as the distinctive offering, and as list
item 01 of 4 it previously did not. The other three follow as a ruled editorial list with
capability chips.

Descriptions unpack only the verified one-liners plus the capabilities named in the Phase 2 brief
for Invitations. **In Phase 1 all four service rows linked to `#work`**, promising depth that did
not exist; they are now non-linked articles carrying their own content instead.

### Why THAARA

Four principles: *Made for the occasion · The story leads · Considered to the last detail · Made to
be moved through.* These are positioning statements about approach, consistent with THAARA's own
verified language ("crafted with intention", "thoughtful, expressive and memorable"). They contain
no factual claims — no client counts, no years, no awards.

### About

Verified paragraph retained verbatim, with a pull-statement and one added paragraph describing the
occasion-led approach. A `dl` carries Focus (derived from real services) plus **Based in**,
**Founded** and **Behind THAARA** as inline needs-input markers.

### Contact

Placeholder area per the brief. Verified copy kept; Instagram is the single CTA; email is marked as
needed and the note states plainly that a form is planned.

## 18. Phase 1 issues closed by the Phase 2 work

Each was a prerequisite of the redesign rather than separate optimisation work.

| Ref | Issue | Resolution |
|---|---|---|
| A1 | `--ink-faint` 3.83:1, below AA | Raised to `#938878` — 5.18:1 / 4.9:1. All roles pass |
| A2 | Closed mobile menu links focusable | `inert` plus `visibility: hidden` |
| A3 | `aria-hidden` over focusable children | `aria-hidden` dropped; `inert` used instead |
| A4 | Touch targets under 44 px | 48 px buttons, 48 px toggle, 44 px links, 60 px menu rows |
| A5 | Menu ignored Escape, no focus trap | Escape closes and restores focus; Tab trapped |
| A6 | No skip link | `.skip-link` added, reveals on focus |
| A7 | `font-size: 16px` absolute | Now `1.0625rem`, honours user preference |
| B1 | Anchors landed under fixed nav | `scroll-padding-top: var(--nav-h)`; verified 158–301 px clear |
| B2 | All 4 service rows pointed at `#work` | Services carry real content, no false links |
| B3 | Instagram URL carried `igsi` and `utm_source=qr` | Clean `instagram.com/thaara.creates` |
| B5 | Hero and featured project visually identical | 425 px plate versus 1082 px feature |
| B6 | Hardcoded copyright year | `#year` set from `getFullYear()` |
| B7 | `theme-color` did not match `--bg` | Both `#191611` |
| B8 | `nav` dereferenced unguarded | Null-guarded |
| C1 | 13 dead CSS class blocks | Gone in the rewrite |
| C2 | Three stacked override layers | Consolidated into one ordered stylesheet |
| C3 | `!important` on non-existent classes | Removed |
| C4 | Dead radial-gradient decoration | Removed |
| P7 | Two font weights fetched unused, two used unfetched | Request matches usage |
| R1 | All main content `opacity: 0` behind JS | Hidden state scoped to `.js` plus timeout safety net |
| — | Glassmorphism nav blur (brief excludes it) | Solid `--bg` on scroll |

## 19. Deliberately still open after Phase 2

Out of scope by the brief. **Do not treat as oversights.**

- **Performance (P1–P6, P8, P9):** the 2.2 MB RGBA PNG, the 55 KB base64 favicon, absent `srcset`,
  the 798×614 logo rendered at ~100 px, missing `width`/`height` attributes, cache headers, Netlify
  HUD. The favicon was re-spliced **byte-identical** rather than optimised, to keep Phase 2 clear of
  performance work.
- **SEO (S1–S10):** no Open Graph, no social image, no Twitter card, no canonical, no `robots.txt`,
  no sitemap, no JSON-LD, no `404.html`.
- **Contact (B4):** no email address, no form.
- **C5 — navigation markup is duplicated three times** (desktop, mobile, footer). Unavoidable
  without a build step; noted rather than solved.
- **Full accessibility audit** — Phase 2 verified contrast, touch targets, focus handling, landmarks
  and heading order, but a complete audit (screen-reader passes, full keyboard traversal) is Phase 3.

## 20. Content still required

Phase 2 added no invented content. Eight inline `.needs-input` markers are rendered on the page:

1. Nivin × Dhiya — **live project link**
2. Nivin × Dhiya — **year**
3. **Further projects and assets** for the work section
4. **Process** — real stages, client involvement, timeline, revisions
5. About — **based in**
6. About — **founded**
7. About — **who is behind THAARA**
8. Contact — **email address**

The full list, including items with no on-page marker (pricing, testimonials, client permissions,
vector logo, custom domain, canonical repo), remains in section 8.

## 21. Phase 2 verification results

Served from `http://localhost:4173` (`py -m http.server`). No build step exists, so the development
and production artefacts are the same five files.

| Check | Result |
|---|---|
| Console errors / warnings | **0** |
| Failed network requests | **0** (all 200/304) |
| Images loading | 4 of 4 |
| Internal anchors resolving | 7 of 7 |
| Heading hierarchy | one H1, H2 per section, no skips |
| Horizontal overflow at 320/375/412/768/1024/1440 | **none** |
| Contrast — 10 sampled text roles | **10 pass, 0 fail** |
| Touch targets | all at least 44 px |
| Mobile menu accessibility | inert when closed, Escape, focus trap, focus return |
| No-JS content visibility | 25 of 25 blocks visible |
| Vertical alignment (logo, h1, eyebrows, footer) | all x=171 at 1440 |
| Assets preserved | `logo.png`, `invitation-save-the-date.png` byte-identical |
| Favicon | byte-identical to Phase 1 |
| Fabricated content | none |

Responsive behaviour at each required width:

| Width | Nav | Hero | Principles | Buttons |
|---|---|---|---|---|
| 320 | hamburger | 1 col | 1 col | stacked, full width |
| 375 / 390 / 412 | hamburger | 1 col | 1 col | stacked below 420, else row |
| 768 | hamburger | 1 col | 2 col | row |
| 1024 | horizontal | 2 col | 2 col | row |
| 1280 / 1440+ | horizontal | 2 col | 4 col | row |

## 22. Housekeeping note

`.phase1-backup/` holds the pre-Phase-2 `index.html`, `styles.css`, `script.js` and the extracted
favicon line. It is a local safety copy — **exclude it from deployment** (gitignore it, or delete it
once Phase 2 is signed off). `.claude/launch.json` is local tooling and likewise should not ship.

## 23. Phase 3 candidates

1. Real contact routes — email address and a working enquiry form.
2. Process content, then replace the pending block with real stages.
3. Social proof — only with genuine, permissioned testimonials.
4. Performance — convert the 2.2 MB PNG to WebP/AVIF with `srcset`, ship a real favicon set, add
   `width`/`height`, an SVG logo, and cache headers.
5. SEO — Open Graph and Twitter cards, a social share image, canonical, `robots.txt`, sitemap,
   JSON-LD, `404.html`.
6. Additional projects, using the `--split` and `--immersive` layouts already built.
7. Full accessibility audit including screen-reader passes.

---

# PHASE 3 — Conversion, Trust & Client Journey

Completed 2026-08-25. Phase 2 visual system left intact — no new colours, type scale, or animation
language. Every size still resolves to a Phase 2 token. Framework unchanged.

## 24. What the page looked like going in

Measured before any edits:

| Symptom | Measurement |
|---|---|
| CTAs on the whole page | **3**, across 7951 px |
| Sections that were dead ends | **5 of 7** — work, services, why, process, about |
| CTA hierarchy | **Inverted** — "Explore our work" was primary, "Start a project" secondary |
| Contact form | **None** (`document.forms.length === 0`) |
| Process section | Placeholder — no real stages |

## 25. Client journey as built

Nine sections, in the order the brief's journey specifies:

| # | Section | Role in the journey | Outbound action |
|---|---|---|---|
| 1 | Hero | Discover | **Start a project** (primary) · Explore our work (secondary) |
| 2 | Work | See the work | Start a project |
| 3 | Services | Understand the offer | See this work — Nivin × Dhiya |
| 4 | Why THAARA | Understand the difference | See how we work |
| 5 | Process | Understand what happens next | Start a project |
| 6 | About | Build trust | Start a project |
| 7 | Social Proof | Build trust | — (deliberately unfilled) |
| 8 | Contact | Start a project | The form itself |
| 9 | Closing CTA | Last chance | Start a project |

No section is a dead end any more. No section was added merely to lengthen the page.

## 26. CTA hierarchy

Audited and reduced to three phrases, used consistently:

- **Primary — "Start a project"**: hero, work, process, about, closing, and the form's submit button.
- **Secondary — "Explore our work"**: hero only.
- **Contextual**: "See this work — Nivin × Dhiya" (services → work), "See how we work" (why →
  process), "Send via Instagram" (form fallback).

The Phase 2 hero had these inverted. "Start a project" is now the primary action everywhere it
appears, and no two phrases compete for the same action.

**No fake project CTA.** The brief suggests "View project" / "Experience the invitation". Neither
was used: there is no live invitation URL in the project, and a CTA whose destination does not exist
is a dead link. The gap is marked instead.

## 27. Process — "How We Work"

Four stages, from the brief, in THAARA's voice. An editorial ruled timeline using the same
hairline-list language as the services section — not a corporate diagram, no connector graphics, no
icons.

| | Stage | Copy |
|---|---|---|
| 01 | Discover | We start with the story. Who it's for, what the occasion is, what it needs to do — and what you already have in mind. |
| 02 | Shape | The creative direction takes form — the visual language, the tone, and the way the experience will unfold. |
| 03 | Create | Design, build, animate. Then refine it, until the details hold up as well as the whole. |
| 04 | Launch | Polished, tested and handed over — ready for the moment it was made for. |

Animation is the existing `.reveal` with a per-stage `data-delay` stagger. Nothing new was added.

**Still missing:** typical timeline from enquiry to delivery, and how revisions are handled. Neither
was invented; the section simply does not claim them.

## 28. Social proof — deliberately unfilled

Nothing in the project verifies a single testimonial, client name, collaboration, logo, rating or
result. Per the brief, the section exists structurally and carries the exact marker
`[CLIENT TESTIMONIAL NEEDED]`, plus a plain-language note explaining why it is empty.

It is kept to one narrow block rather than a three-column testimonial grid, so an unfilled section
reads as honest rather than broken.

**Nothing was fabricated.** Verified absent from the built page: testimonials, awards, years of
experience, client counts, star ratings, "trusted by" claims.

## 29. Nivin × Dhiya case study

Everything stated traces to the asset or its alt text:

| Field | Value | Source |
|---|---|---|
| Name | Nivin × Dhiya | alt text |
| Type | Invitation Experience | matches service 01 |
| Format | Save-the-date invitation | filename + alt text |
| Artwork | Illustrated beach scene | alt text |
| Lettering | Hand-lettered calligraphy | alt text |
| Roles | Design · Illustration · Lettering | evidenced by the artwork itself |
| Year | *needs input* | — |

**Roles deliberately excluded:** Development and Motion. The service description mentions interactive
websites, but the only asset in the project is a static image — nothing evidences a built or animated
deliverable, so neither role is claimed.

**Sections deliberately omitted:** Brief and Approach. The brief asks for them "where sufficient real
information exists." It does not. Rather than write plausible fiction about a real couple's wedding,
the case study states in one line that the brief, approach, further visuals and live link are all
absent, and marks them as needed.

## 30. Services connected to real work

Only **Invitation Experiences** links to a project, because it is the only service with evidence in
the repository. Brand Identity, Digital Design and Motion & Visuals carry no "see this work" link —
adding one would point at nothing.

## 31. Contact and the enquiry form

### The honest-submission problem

There is no email address and no form backend in the project. The brief is explicit: build the form,
but do not pretend it sends. The form therefore has three modes, driven by one constant at the top of
`script.js`:

```js
var ENQUIRY_ENDPOINT = "";
```

| `ENQUIRY_ENDPOINT` | Behaviour |
|---|---|
| `""` (current) | Validates, then states plainly that nothing was sent, keeps the visitor's text in the field, offers **Copy my message** and **Send via Instagram**. **Never shows success.** |
| A real URL | POSTs JSON and reports the true outcome — success only on a successful response, failure with the actual reason otherwise. |

Set the constant and the form works. Until then it tells the truth.

### Fields and states

Name (required) · Email (required) · Project type (select, five options) · About the project
(required) · Timeline (optional) · Budget (optional). Every field has a real `<label>`,
`aria-describedby`, and `aria-required` where applicable.

| State | Implementation | Verified |
|---|---|---|
| Default | Empty, 52 px fields | yes |
| Focus | 2 px gold outline + background shift | yes |
| Validation error | Per-field message + `aria-invalid` + focusable error summary with `role="alert"` linking to each field | 3 of 3 errors, specific wording |
| Submitting | `aria-busy`, disabled, label → "Sending…" | only on the configured path |
| Success | Only on a real successful response | suppressed with no endpoint |
| Failure | Names the actual reason, offers Instagram | reason surfaced verbatim |

Error messages say what to fix, not just that something is wrong — for example *"That email address
looks incomplete — check for a typo."*

### A bug the network log caught

The form initially had no `method`, so it defaulted to **GET**. If the script fails to load, the
browser performs a native submit — and a GET submit puts every field in the query string. It was
visible in the dev-server log during testing:

```
GET /?name=Test+Person&email=not-an-email&details=A+wedding+invitation...
```

That would put a visitor's name, email and message into browser history, referrer headers and server
logs. Fixed with `method="post"`, plus a `<noscript>` block that explains the form needs JavaScript
and points to Instagram.

## 32. Contact methods — what actually exists

**Instagram only.** `@thaara.creates` is the single verified contact route in the project, and it is
the only one used. No email address, phone number, WhatsApp link or booking URL was invented. The
contact section says so in plain language rather than leaving the visitor guessing.

## 33. Phase 3 verification

Served from `http://localhost:4173`. No build step, so development and production artefacts are the
same five files.

| Check | Result |
|---|---|
| Console errors | **0** |
| Failed requests | **0** |
| Sections in journey order | 9 of 9 |
| Dead-end sections | **0** (was 5) |
| Anchor landings clear the fixed nav | 6 of 6, 24 px gap |
| Form validation | 3 of 3 required fields, specific messages |
| Success suppressed with no backend | **yes** |
| Success shown only on real success | verified with a stubbed 200 |
| Failure path | verified with a stubbed 500 |
| Form field contrast | 14.51:1 |
| New components — contrast | 15 sampled, 15 pass |
| Controls under 44 px @ 320/375/390 | **0** |
| Horizontal overflow @ 320/375/390/768/1024/1440 | none |
| Hover-only actions | **0** |
| Mobile menu | opens, inert when closed, Escape closes + returns focus, scroll locked |
| Assets byte-identical | logo + invitation unchanged |
| Favicon | byte-identical |
| Fabricated trust content | none |

### Two measurement traps worth remembering

Both cost real debugging time and both were environment artifacts, not defects:

1. **Frozen transitions.** Form inputs computed a white background at 1.17:1 contrast. The tab was
   not compositing, so `transition: background-color` stayed pinned at its pre-stylesheet start
   value. With transitions neutralised the true value is 14.51:1. Same class of artifact as the
   Phase 2 reveal investigation.
2. **Stale subresource cache.** The dev server answers `304`, so an edited `script.js` kept executing
   the previous build — form validation appeared entirely dead until the loaded file's size was
   compared against the file on disk. Always confirm the executed bundle size matches disk before
   concluding a handler is broken.

Also: `requestAnimationFrame` does not fire in a hidden tab, which stalls the mobile menu's
focus-move in testing only — a real click implies a visible tab.

## 34. Content still required after Phase 3

Eight on-page `.needs-input` markers plus the testimonial placeholder:

1. **Email address** — the single highest-value gap; Instagram is currently the only route
2. **Enquiry endpoint** — one constant away from a working form
3. Testimonials and permission to name clients
4. Nivin × Dhiya — year
5. Nivin × Dhiya — brief, approach, further visuals, live link
6. Further projects and assets
7. About — based in
8. About — founded
9. About — who is behind THAARA

Process timeline and revision policy are also still unknown, though the section no longer depends
on them.

## 35. Phase 4 candidates

1. **Wire the form** — set `ENQUIRY_ENDPOINT` (Netlify Forms, Formspree, or similar) and add a real
   email address. Until then the strongest CTA on the site cannot complete.
2. **Performance** — still untouched by design: the 2.2 MB RGBA PNG, the 55 KB base64 favicon,
   no `srcset`, no `width`/`height`, oversized logo, cache headers.
3. **SEO** — no Open Graph, social image, Twitter card, canonical, `robots.txt`, sitemap, JSON-LD
   or `404.html`.
4. Real testimonials and further projects, using the `--split` and `--immersive` layouts already
   built in Phase 2.
5. Full accessibility audit including screen-reader passes and real keyboard traversal.
6. Deploy: the Netlify site still serves the pre-Phase-2 design.

---

## 36. Post-Phase-3 correction: `[hidden]` was being overridden

Reported from a screenshot of the live site, and worse than it first looked.

On a fresh page load, with nothing submitted, **every form message was rendering** — including the
success confirmation:

| Element | `hidden` attribute | Actually rendered |
|---|---|---|
| `#formErrorSummary` — "Please check the following" | set | **yes**, 82 px |
| `#formNotConnected` — "This form isn't connected yet" | set | **yes**, 199 px |
| `#formSuccess` — "Thank you. We've received your message" | set | **yes**, 107 px |
| `#formFailure` — "That didn't go through" | set | **yes**, 199 px |
| `#e-name` / `#e-email` / `#e-details` | set | **yes**, bare `!` glyphs |

### Cause

`.form-alert { display: grid }` and `.field-error { display: flex }` are more specific than the user
agent's `[hidden] { display: none }`. The attribute was set correctly and read back as set — it
simply had no effect on rendering.

### Why the Phase 3 tests missed it

Every assertion checked the *attribute*:

```js
successHidden: document.getElementById('formSuccess').hidden === true   // passed, and meaningless
```

The attribute was genuinely `true` the whole time. The element was on screen anyway. A visual check
would have caught it in seconds; a property check never could. This is the failure mode that made
"success is suppressed" pass in testing while the page showed a success message to every visitor
who scrolled to the contact section.

### Fix

```css
[hidden]{ display: none !important; }
```

Placed immediately after the reset so no component rule can outrank it.

### Rules taken from this

1. **Assert on computed display, never on the attribute.** `getComputedStyle(el).display !== 'none'
   && el.getBoundingClientRect().height > 0` is the only assertion that means anything.
2. **Any component that sets `display` breaks `[hidden]`** unless a global override exists.
3. A green test suite is not evidence the page looks right. Phase 3 reported "success suppressed —
   verified"; it was not. When the tooling cannot render, say so plainly rather than letting
   property-level checks stand in for having looked.

## 37. Form reduced to a plain contact form

At the user's request the enquiry form was cut back from a project brief to a contact form.

**Removed:** Project type (select, 5 options), Timeline, Budget.
**Kept:** Name (required), Email (required), Message (required).
**Relabelled:** submit button "Start a project" → "Send message"; "About the project" → "Message".

Dead CSS removed with it: `.field .opt`, the entire `.field select` group (shared rule, chevron,
`option`, hover, focus, invalid), and `.field-row`. `script.js` no longer reads `f-type`,
`f-timeline` or `f-budget`, and `asText()` was reduced to name, email and message.

Instagram remains alongside the form as the only verified contact route. The
`ENQUIRY_ENDPOINT` behaviour is unchanged — empty still means the form states plainly that nothing
was sent and never shows success.

### Re-verified on computed display

| Check | Result |
|---|---|
| Messages hidden on fresh load | 7 of 7 `display: none`, 0 px |
| Empty submit | summary + 3 field errors visible **with text** |
| Valid submit, no backend | success **not** rendered; not-connected rendered; text preserved |
| Fields | 3, all 52 px+ |
| Controls under 44 px @ 375 | 0 |
| Horizontal overflow @ 375 | none |
| Console errors | 0 |
