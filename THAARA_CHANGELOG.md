# THAARA — Change Log

Targeted corrections made in response to review feedback (Phase 6 onward).

Each entry records the **issue** as raised, the **change** made, the **files** touched, and the
**reason**. One entry per correction. Newest first.

Design decisions and phase-level rationale live in `THAARA_REBUILD.md`; this file is only the record
of post-review corrections.

**Classification** — Critical (broken functionality, incorrect content, severe responsive issue) ·
Important (poor UX, weak hierarchy, confusing interaction, visual inconsistency) · Polish (spacing,
typography, animation timing, minor visual detail).

---

## 2026-09-19 — Website Design added as a fifth discipline · Critical

**Issue**
The studio's marketing flyer sells five services; the site said "Four disciplines" and folded
website work into others. The owner confirmed Website Design is a standalone offering, scoped
to **business and brand sites** — so the site was understating what THAARA sells.

**Change**
- New `04 Website Design` service item, placed **between** Digital Design and Motion rather than
  appended, so the two services that could blur sit adjacent and resolve in one read. Motion &
  Visuals moves 04 → 05.
- `03 Digital Design` hands websites over: description now "Landing pages and social media&nbsp;-
  the same typographic care applied to a single post as to a full page", and the `Websites` chip
  is gone. `01 Invitation Experiences` keeps `Event websites` — there the site *is* the invitation.
- Swept every other place the disciplines are enumerated: the H2, the hero lead (which listed
  exactly 02/03/04 and would have silently become incomplete), the hero capability strip, the
  JSON-LD `OfferCatalog`, the About fact list, the meta/og/twitter descriptions.
- Hero strip separators bound to the preceding word with `&nbsp;` — with a fifth item, 320px
  wrapped a bare `·` onto the start of line 2.
- Two stale CSS comments ("the four real services", "Remaining three services").

**Files**
`index.html`, `styles.css`, `CLAUDE.md`, `README.md`

**Reason**
Appending at 05 would have left Motion sitting between the two services a reader most needs to
tell apart. Insertion cost one character. `.service-list` needed no CSS — it is a bare wrapper
with a hairline; `.service-item` carries its own grid and border, so a fourth row just flows.

**Left alone deliberately**
`<title>` / og:title / twitter:title. They read "Invitation Experiences, Brand Identity & Motion"
and already omit Digital Design, so they were never an exhaustive list and nothing became false.
At 56 characters the title is already at the SERP limit; adding ", Website Design" would push it
to 72 and get it truncated. Also untouched: `index.html:404` "Four stages" — that is Process, not
services, and is a trap for a careless find-and-replace.

**Verified**
JSON-LD parses; all five Services present in page order. Four `.service-item` numerals share one
left edge at x=90.5. No horizontal overflow at 320px (`scrollWidth === innerWidth === 320`); the
strip wraps to 3 lines there with no line beginning on a separator. 0 console errors.

---

## 2026-09-22 — Design audit: hierarchy, accent discipline, hero · Important

**Issue**
Owner's verdict on the live site: "it looks like AI slop." An audit of the rendered DOM found the
cause was structural repetition, not any single defect. Measured, not guessed:

- **8 of 8 headings** used the identical "plain phrase + italic gold `<em>`" construction. Three
  of them also opened with a spelled-out number plus plural noun — "Two projects," / "Five
  disciplines," / "Four stages,".
- **7 of 8 section headings rendered at exactly 48px.** 68% of all text (128 of 187 elements) was
  15px or smaller. The middle of the 10-step scale was nearly empty, so the page had two volumes:
  shout and whisper.
- **Gold was the most-used text colour** — 63 elements against 54 for primary ink — doing seven
  different jobs: heading emphasis, 20 numerals, arrows, links, eyebrows, category labels and form
  asterisks.
- **Every section had pixel-identical padding**, so nothing read as more or less important.
- **`.service-item` and `.stage` were the same component** — same grid, padding and hairline —
  so Services and Process were one texture rendered twice.
- **3 images in 9,859px of page**, and none at all in the hero. A design studio was arguing for
  itself in words.
- `--fs-base` (17px) was set on `body` and then overridden to 15px everywhere, so the token
  described nothing. `h4` was dead CSS — no `<h4>` exists in the document.

**Change**
- Gold restricted to interactive elements plus two accent phrases (hero h1, closing h2) via a new
  `<em class="accent">` opt-in. Removed from every other heading, from `.index-num`, `.stage-num`,
  `.eyebrow` and the mobile-menu numerals. **63 gold elements → 27.**
- Section headings now vary: Work/Services/closing stay at `--fs-2xl`, Why/Process/About/Contact
  step down to `--fs-xl`.
- Body copy raised from `--fs-sm` to `--fs-base` in `.service-desc`, `.principle p`,
  `.stage-body p` — the token now means what it says, and 17px is a fairer size on a dark ground.
- Process rebuilt as a horizontal four-column progression with a single rule across the top,
  instead of a third vertical ruled list. **1,266px → 589px.**
- `#why` and `#process` now use `--section-y-sm`, so the page has pacing.
- Dropped the redundant `Why THAARA` eyebrow — the heading already answers it.
- Hero rebuilt: left-aligned and asymmetric, with the flagship invitation artwork beside the copy.
- Deleted the dead `h4` rule.

**Files**
`index.html`, `styles.css`, `CLAUDE.md`

**Reason**
The individual pieces were well made — the comments, the image pipeline, the honest form-failure
states are genuinely careful work. But the page was one section template instantiated eight times,
and that is what reads as machine-made. Every change here is about restoring difference:
between sections, between levels of importance, and between what is an accent and what is ordinary.

**Not done**
Copy was left alone on the owner's instruction. Still outstanding there: the "X, not Y"
construction appears **nine times** across hero, three service descriptions, three principles and
About; `meaningful` appears 4 times; and `thoughtful, expressive` appears twice inside a single
viewport in About (the gold pull-quote and the first body paragraph beside it).

**Known compromise**
The hero reuses the Nivin & Dhiya artwork, which also appears in Work. All three images on the
site were already spoken for, so any hero image duplicates something. It reads as a signature
piece rather than an error, and the two share one download — but a dedicated hero frame would be
better.

**Verified**
Every element on the page now shares **one** left edge (170.5 at 1440px) — the hero included,
which was previously the documented exception. No horizontal overflow at 320/375/1440. 0 console
errors, 0 failed requests. Page height 9,859px → 8,971px.

---

## 2026-09-19 — Poster-to-statement gap fixed (double-spaced) · Polish

**Issue**
Owner reviewed the live poster and reported "a huge gap" above it. `.about-grid`'s own `gap:
var(--sp-10)` (80px) already spaces the statement and poster, since they land in adjacent grid
rows (statement row 1, poster row 2, both column 1) — `.about-poster` also carried its own
`margin: var(--sp-8) 0 0` (48px) on top, doubling it to 128px.

**Change**
`.about-poster{ margin: var(--sp-8) 0 0; }` → `margin: 0;`. Grid gap alone now sets the spacing.

**Files**
`styles.css`

**Reason**
The margin was redundant from the start — added out of habit rather than checked against what
the grid already provided. One property, not a new token or a magic number.

**Verified**
Measured gap 128px → 80px at 1280px, matching the row rhythm used elsewhere on the page. No
change to left-edge alignment (still 20/90.5 depending on viewport) or overflow at 375px.

---

## 2026-09-19 — Studio poster added to About · Important

**Issue**
About was the emptiest area on the page: at 1280px its left column held only the pull-quote and
left **580.7px of measured dead space** beside the prose. Work was the only section on the whole
site carrying any imagery. The owner supplied the studio's marketing poster to fill it.

**Change**
- New `<figure class="about-poster">` in About's left column, under the statement. `<figure>` is
  new to this codebase — used because the caption is a required disclaimer, and `figcaption` is
  programmatically tied to the image for assistive tech.
- `styles.css`: one new token `--poster-w: 440px`; a small rule block in section 13; and two
  explicit grid placements at ≥900px.
- `tools/build-images.js`: one entry → `studio-poster-{480,880}.{avif,webp}`.
- New master `studio-poster-source.jpg` at repo root.

**Files**
`index.html`, `styles.css`, `tools/build-images.js`, `CLAUDE.md`, plus the new image assets

**Reason — and the bug this caught**
A third child in `.about-grid` does **not** land under the statement. The grid is `1fr 1fr` with
`align-items: start`; auto-placement put the poster in column 2 and pushed the prose down into
column 1. Measured, not assumed — the first render had the poster at x=672.5 and the body at 90.5.
Fixed with `.about-poster{ grid-column: 1 }` and `.about-body{ grid-column: 2; grid-row: 1/span 2 }`,
scoped to the ≥900px query so mobile still stacks.

The caption is content, not a system state, so it is a plain sentence — **not** `.needs-input` or
`.slot`. Those mark *missing* content; this is finished work with nothing pending, and CLAUDE.md
records the invariant that 0 `needs-input` markers render. Rendering one would falsify that.

The couple's names are deliberately **absent from the `alt` text**. A sighted visitor sees them in
the artwork — that is the poster. But putting them in `alt` writes non-client names into
machine-readable text that can be indexed and quoted as a project, which CLAUDE.md forbids. The
caption already carries the necessary fact for an assistive-tech user. This is a decision, not an
oversight.

**Flagged, not changed**
The poster prints `hello.thaara.creates@gmail.com`; the site uses `hello.thaaracreates@gmail.com`
in six places. Gmail ignores dots so both deliver to the same inbox, but a visitor now sees two
spellings in one viewport. Worth settling on one spelling in the next export of the artwork — the
Instagram handle already matches exactly.

**Weight, honestly**
Critical text payload (the figure the 2265 KB → 106 KB record actually tracks) moves ~106 → ~108 KB.
The image itself is the page's third lazy, below-the-fold asset: 36 KB (480w AVIF) at phone sizes,
85.6 KB (880w) at desktop — nothing for a visitor who never reaches About. Repo grows ~470 KB
including the master.

**Verified**
One left edge holds: `#about` head, statement, poster and caption all at x=90.5 at 1280px (body at
672.5 in column 2, as intended); at 320px poster and statement both at x=20. Caption contrast
measured on its real painted background (`--bg-alt`, not the section default): **4.9:1**, passes AA
for 11px text. No horizontal overflow at 320px. Browser picks 480w AVIF at 320px and 880w at
desktop. 0 console errors, 0 failed requests.

Note for whoever verifies next: the page renders **blank** in a non-compositing browser pane —
`.reveal` transitions freeze at opacity 0 (CLAUDE.md §50 trap 4). Inject
`.reveal{opacity:1!important;transform:none!important}` before screenshotting or you will think
the section is broken.

---

## 2026-09-19 — Second project added: Leo Ronald × Asnia · Important

**Issue**
Work showed one project. The owner supplied a second real, permissioned
project — an interactive wedding invitation built as its own website, live at
`leoronaldasniaweddinginvitation.vercel.app` — and asked for the section to
adapt to carry recent work. (Arav & Keerthana, seen in the studio's marketing
flyer, was confirmed a template/demo, not a client project: not listed.)

**Change**
- `index.html`: new `article.project.project--split` as project `02`, using the
  split layout that has sat unused since Phase 3. Portrait cover left, text
  right, real outbound link to the live invitation (`target="_blank"
  rel="noopener noreferrer"`, matching every other external link on the page).
  Section H2 `A single project…` → `Two projects, each carried all the way
  through.` Services cross-link no longer names one project.
- `styles.css`: one new token `--phone-w: 320px`; `.project-visual--portrait`
  (phone-width, 9:16, `object-fit: cover`); `.project-link` spacing; `--split`
  added to the existing `--feature` hover rule rather than duplicating it.
- `tools/build-images.js`: the hardcoded single portfolio image became a
  `PORTFOLIO` array with per-image widths. Existing `invitation-*` output is
  byte-for-byte unchanged.
- New assets: `leo-asnia-source.webp` (source) → `leo-asnia-{480,800,1200}.{avif,webp}`.

**Files**
`index.html`, `styles.css`, `tools/build-images.js`, `tools/` image outputs

**Reason**
`.project--split` was kept in Phase 3 for exactly this, and `.project + .project`
already draws the divider — so a second project needed almost no new CSS. The
piece was designed for a phone, so it is shown at a phone's width rather than
stretched across half a 1180px container; left-aligned, never centred, so the
page keeps its one left edge.

**Not done — next step**
The owner wants this shown as a **video scrolling through the live site**, not a
static cover. Not shipped: no screen recording in hand, and the client site's own
opening video is 11 MB at 4K, far past what this page should carry. Needs either
the owner's own recording or `ffmpeg` (not installed here) to cut a short,
downscaled, silent loop. When it lands, swap the `<picture>` inside
`.project-visual--portrait` for a `<video>` (`muted loop playsinline
preload="none"` + poster) and add an IntersectionObserver that attaches `src`
near-viewport, pauses off-screen, and does not autoplay under
`prefers-reduced-motion` — same shape as the `dust-paused` observer in
`script.js`. The frame and its aspect ratio already fit a video unchanged.

**Verified**
Served on fresh port 4188. One left edge: `#work .container` children all at
x=90.5 (section head, both project heads, both visuals, section action). No
horizontal overflow at 320px (`scrollWidth === innerWidth === 320`); split
layout goes two-column at ≥900px, stacks below. 0 console errors, 0 failed
requests. Browser picks `leo-asnia-480.avif` (37 KB) for the 320px box.

---

## 2026-09-13 — Welcome name set in gold (no hero logo) · Polish

**Issue**
Owner asked whether the logo belongs in the hero for brand visibility.
Advised against duplicating the fixed header mark; agreed instead on
emphasising the name in text (option B).

**Change**
- `index.html`: welcome line becomes `Welcome to <em>THAARA</em>`.
- `styles.css`: `.hero-eyebrow .welcome em` in `--gold`, upright rather
  than italic so it reads as emphasis instead of echoing the headline's
  italic gold phrase. No layout, token, or asset changes.

**Files**
`index.html`, `styles.css`

**Reason**
Eye on the name with zero duplication, zero downloads, zero layout risk.

**Verified**
CSS braces balanced (366/366), `node --check script.js` passes, `/`
serves HTTP 200 on a fresh port (4202).

---

## 2026-09-13 — Sitemap lastmod refreshed (spec audit fix) · Polish

**Issue**
A spec-driven audit (anchors, assets, placeholders, metadata, JS/CSS) found
one real defect: `sitemap.xml` still carried `<lastmod>2026-08-25` although
the page has changed in every push since. Everything else passed — all
anchors resolve, all 15 referenced assets exist, JSON-LD parses, JS and CSS
validate, no TODO/lorem/dev URLs, and the new sticky-CTA/dust-pause observer
logic re-checked clean (hidden-by-default, menu-safe, no-JS-safe).

**Change**
- `sitemap.xml`: `<lastmod>` → `2026-09-13`, matching the actual last change.

**Files**
`sitemap.xml`

**Reason**
Stale crawl metadata is the only necessary fix the audit surfaced. All other
spec items are either already shipped or blocked on real inputs (see report).

**Verified**
Audit script: JSON-LD OK, 0 missing anchors, 0 missing assets, placeholder
scan clean apart from CSS comments and `::placeholder`.

---

## 2026-09-13 — Enquiry bridge line removed · Polish

**Issue**
Owner asked to remove the "Want one like Nivin × Dhiya's?" bridge line from
the hero.

**Change**
- `index.html`: deleted the `p.hero-bridge` line. `styles.css`: deleted its
  rule. The capability strip, both CTAs, and the scroll hint stay — the form
  remains one tap away everywhere.

**Files**
`index.html`, `styles.css`

**Reason**
Owner-directed removal; smallest possible change with its rule.

**Verified**
No `hero-bridge` / "Want one like" remains in shipping files. CSS braces
balanced (365/365).

---

## 2026-09-13 — Sticky mobile enquiry bar · Important

**Issue**
On phones (the Instagram traffic), once the hero scrolls away there is no
persistent path to the form until the closing section.

**Change**
- `index.html`: one `#stickyCta` anchor (`Start a project` → `#contact`)
  after the footer. Phones only via CSS.
- `styles.css`: fixed bottom bar (52px target, pill, gold, safe-area aware),
  slide-up reveal; `visibility: hidden` while hidden keeps it out of the tab
  order, mirroring the mobile-menu pattern.
- `script.js`: one `IntersectionObserver` on hero + contact — shows past the
  hero, hides at the contact section so it never covers the form or footer.
  No-JS / no-observer state is hidden, changing nothing.

**Files**
`index.html`, `styles.css`, `script.js`

**Reason**
Owner-approved conversion lever for the enquiry goal (flagged openly as
slightly less editorial). Smallest persistent-CTA form that respects the
form, footer, and tab order.

**Verified**
`node --check script.js` passes; hooks counted in all three files; `/`
serves HTTP 200 on a fresh port (4201). Not verified: show/hide behaviour
and safe-area clearance on a real phone — owner to confirm.

---

## 2026-09-13 — Dust pauses off-screen + petal depth · Polish

**Issue**
50 perpetual animations ran even with the hero off-screen (phone battery),
and all petals rendered at near-identical sharpness (one flat layer).

**Change**
- `script.js`: the page observer toggles `dust-paused` on `<html>` while the
  hero is out of view; `styles.css` freezes the spans via
  `animation-play-state: paused`. Runs-by-default design, so background tabs
  and missing observers behave exactly as before; reduced-motion already
  hides dust entirely.
- `styles.css`: four group overrides after the track rules (equal
  specificity, later wins) — every 7th span shrinks (.6/.7, far), every 5th
  grows (1.3/1.4, near). No keyframe or markup changes.

**Files**
`styles.css`, `script.js`

**Reason**
Free battery saving plus a near/far illusion without `filter` blur, which
would cost the compositor budget the motion rules protect.

**Verified**
`node --check script.js` passes, CSS braces balanced (366/366). Not verified:
paused/running flip observed live — owner to confirm on scroll.

---

## 2026-09-13 — Passive scroll hint in the hero · Polish

**Issue**
With the full-page hero and the cue deleted, nothing hints that Work sits
below except the secondary button.

**Change**
- `index.html`: one `aria-hidden` `.scroll-hint` hairline pinned to hero
  bottom-centre. `styles.css`: a slow `scaleY` draw-and-fade loop
  (`hint-pulse`, transform/opacity only), hidden on short viewports
  (never crowds buttons) and under `prefers-reduced-motion`. Deliberately
  textless — distinct from the deleted cue, not a resurrection of it.

**Files**
`index.html`, `styles.css`

**Reason**
Smallest scroll-affordance restoration that respects the deletion decision.

**Verified**
CSS braces balanced, `/` serves HTTP 200 on a fresh port (4201). Not
verified: rendered position across viewport heights — owner to confirm.

---

## 2026-09-13 — Hero composition: lead, caps strip, enquiry bridge · Important

**Issue**
The hero stated a mood, not the product — a wedding couple had to read the
small print to learn THAARA makes invitations, and nothing connected "I want
one" to the form.

**Change**
- `index.html` lead now opens with the product: "Interactive wedding and
  event invitations your guests enter, not just open&nbsp;- plus visual
  identities, digital design and motion for meaningful moments." Every claim
  traces to the four real services; hyphen style matches house punctuation.
- `index.html`: one centred `.hero-caps` line (the four real services, zero
  invention) sharing the buttons' reveal beat, plus one centred
  `.hero-bridge` link ("Want one like Nivin × Dhiya's?" → `#contact`, real
  project, real destination). `styles.css`: two small rules reusing `.meta`
  / `.link-rule` treatments.
- Stack order: welcome → headline → product-led sub → buttons → services →
  bridge. No size, colour, or token changes.

**Files**
`index.html`, `styles.css`

**Reason**
Enquiry-goal conversion pass: state the offer above the fold and give desire
a one-tap path to the form.

**Verified**
New hooks counted in both files; `/` serves HTTP 200 on a fresh port (4201).
Line measures and wrap at 320px need the owner's eye on the preview.

---

## 2026-09-13 — Header logo enlarged (88px → 96px) · Polish

**Issue**
Owner felt the header logo read too small in the nav bar.

**Change**
- `styles.css` (`.brand-logo` only): width `clamp(78px, 8vw, 88px)` →
  `clamp(84px, 9vw, 96px)`, `max-height` 68px → 74px. The caps move together
  per the Phase 5 lesson: 96 ÷ 1.30 aspect ≈ 73.8px, so the natural height
  still lands exactly on the cap — no letterbox, left edge stays glued.
- Added a ≤600px guard (width 84px, max-height 64px) since the small-screen
  nav is only 68px tall. Footer logo and all nav links untouched.

**Files**
`styles.css`

**Reason**
Owner-directed; "little larger" capped at 96px because 104px would leave
~2px clearance in the 84px bar. Smallest change that answers it.

**Verified**
CSS braces balanced (345/345), `node --check script.js` passes, `/` and
`/styles.css` serve HTTP 200 on a fresh port (4199). Not verified: rendered
mark-vs-box alignment at desktop + 360px on a real device — owner to confirm
no letterbox regression from the preview.

---

## 2026-09-13 — Hero enlarged to one full page · Important

**Issue**
Owner asked for the hero to fill one full page, so the Work section starts
below the fold.

**Change**
- `styles.css`: `.hero` gains `min-height: 100svh` (same unit as the 404
  page) with `display: grid; align-content: center`, so the centred copy
  sits in the middle of the viewport. `min-height` — not `height` — lets the
  content grow past it on small screens instead of clipping or overlapping.
  Existing top padding still clears the fixed nav (`box-sizing: border-box`
  keeps it inside the 100svh).
- `styles.css` (dust): fall path extended (`38vh` → `50vh` midpoint,
  `78vh` → `102vh` exit) so petals traverse the full-page hero rather than
  fading out three-quarters down.

**Files**
`styles.css`

**Reason**
Owner-directed layout change; smallest change that delivers it. No markup,
token, palette, or motion-language changes.

**Verified**
CSS braces balanced (343/343), `node --check script.js` passes, `/` and
`/styles.css` serve HTTP 200 on a fresh port (4198). Not verified: rendered
fold position at 320/1920px on a real device — owner to confirm Work now
starts below the fold.

---

## 2026-09-13 — Welcome divider line removed · Polish

**Issue**
Owner asked to remove the short divider line above "Welcome to THAARA".

**Change**
- `index.html`: deleted the `span.rule` from the hero eyebrow.
- `styles.css`: deleted the `.hero-eyebrow .rule` rule plus its now-dead
  overture (draw-from-centre) and reduced-motion rules. The eyebrow is now
  just the welcome line with the descriptor beneath it; beat 0 of the
  overture is the eyebrow reveal itself.

**Files**
`index.html`, `styles.css`

**Reason**
Owner-directed removal; smallest possible change with its dead CSS.

**Verified**
No `hero-eyebrow .rule` / `class="rule"` remains in shipping files. CSS
braces balanced (343/343), `node --check script.js` passes, `/` serves
HTTP 200 on a fresh port (4197).

---

## 2026-09-13 — 50 unique petal tracks + two-line welcome eyebrow · Important

**Issue**
Owner could only see ~10 petals: the 50 spans shared 10 choreography tracks
(`10n+1` … `10n`), so five petals fell down each of 10 columns. Separately,
owner asked for a larger company line reading "Welcome to THAARA" with the
positioning line kept small beneath it, and for the headline + sub-text to sit
properly below that.

**Change**
- `styles.css` (dust): replaced the 10 cycling track rules with 50 unique
  `nth-child(1–50)` rules — own left (1–98% spread), duration (10–19s),
  delay, sway, rotation, scale each. Same keyframe, tokens, and 8×12px
  geometry; mobile still shows 20.
- `index.html` (hero eyebrow): single meta line replaced with a `welcome`
  span ("Welcome to THAARA") plus the existing `meta` span ("Creative &
  Digital Experiences") beneath it.
- `styles.css` (eyebrow): `.hero-eyebrow` is now a centred column — divider
  rule on top, welcome in serif display at `--fs-lg` in ink, descriptor
  unchanged as the micro line. Welcome kept on one line (`nowrap`; fits at
  320px). Headline, lead, and button row were already centred with proper
  `ch` measures and rhythm, so no further changes there.

**Files**
`index.html`, `styles.css`

**Reason**
Owner-directed: full-width festive field instead of 10 columns, and a proper
welcome-led hero stack (welcome → headline → sub-text → buttons) matching the
reference composition.

**Verified**
50 unique dust tracks counted in CSS, braces balanced (347/347),
`node --check script.js` passes, `/` and `/styles.css` serve HTTP 200 on a
fresh port (4196). Not verified: rendered paint at 320/1920px on a real
device — owner to confirm from the preview.

---

## 2026-09-13 — Hero centred; plate and scroll cue deleted · Important

**Issue**
Owner asked to remove the hero invitation plate and the "Selected work below"
cue, and to centre the hero like the BEMYINVITE reference (centred headline,
sub-text, buttons). Permanent delete, not comment-out.

**Change**
- `index.html`: deleted the `div.hero-cue` scroll cue and the entire
  `figure.hero-figure` block (plate link, picture, caption). `.hero-grid` now
  holds only `.hero-copy`.
- `styles.css`: `.hero-grid` is a single centred column at every width (the
  1000px two-column rule is gone); eyebrow, `h1`, `.lead`, and `.btn-row` all
  centre. Deleted the now-unreferenced `.hero-figure` / `.hero-plate` /
  `figcaption` / plate-cap / `.hero-cue` rules plus the overture's beat-5 and
  cue-line rules and their reduced-motion counterparts; the eyebrow rule now
  draws from the centre. Net CSS weight goes down.
- Left-edge discipline gains a documented exception for the hero — same
  precedent as the centred closing CTA and 404. Work down keeps the edge.

**Files**
`index.html`, `styles.css`

**Reason**
Owner-directed layout change toward the reference. Deletion (not commenting)
was explicitly requested. Both CTAs stay, so no section becomes a dead end;
the invitation artwork still appears once, large, in Work.

**Verified**
No `hero-figure` / `hero-plate` / `hero-cue` / `data-delay="5"` remains in
shipping files (only historical changelog entries). CSS braces balanced
(306/306), `node --check script.js` passes, `/` and `/styles.css` serve
HTTP 200 on a fresh port (4195). Not verified: rendered centring at
320/1920px on a real device — owner to confirm from the preview.

---

## 2026-09-13 — Gold-dust drift in the hero (50 petals) · Polish

**Issue**
Owner asked for BEMYINVITE-style hero motion — petals falling plus mouse-follow
motion. The mouse-following blobs were declined (cursor effects/parallax and
pink-purple gradients are excluded by the brief); the falling motion was accepted
as gold dust in THAARA's palette. Owner chose elongated petal shapes, then asked
for bigger petals × 50 after the first 10 were too subtle to see.

**Change**
- `index.html`: one `div.dust` (aria-hidden, 50 empty spans) as the first child
  of `section.hero`. No content, invisible to assistive tech.
- `styles.css`: `.hero` gains `position: relative`; new `.dust` layer
  (`absolute inset 0, overflow hidden, pointer-events none`) with a single
  `dust-fall` keyframe — transform/opacity only, linear timing. Petals are
  `var(--sp-2)` (8px) wide × 12px with a petal border-radius, alternating
  `--gold-soft` / `--gold-haze` at up to .85 opacity; ten choreography sets
  cycle across the 50 spans (`10n+1` … `10n`) with 10–19s durations and
  negative delays so the field is full on load. 30 spans hidden under 700px
  (20 on mobile). Reduced-motion block hides `.dust`.
- `script.js`: untouched — dust spans are not `.reveal`, so the overture,
  observer list, and safety net are unaffected.

**Files**
`index.html`, `styles.css`

**Reason**
Smallest translation of the requested motion into the existing system: no new
dependencies, no palette change, no cursor/parallax effects, ~1KB added.

**Verified**
CSS braces balanced (325/325), `node --check script.js` passes, 10 spans in
the dust layer, `/` and `/styles.css` serve HTTP 200 on a fresh port (4193).
Not verified: the running animation painting (transitions/animations freeze in
a non-compositing tab); timing, layering, and kill-switch confirmed from code.
Check 320/1920px overflow and reduced-motion on a real device on review.

---

## 2026-09-13 — Type pairing swapped to EB Garamond + Source Sans 3 · Important

**Issue**
Owner felt the type looked AI-made and asked for a normal font, choosing EB Garamond +
Source Sans 3 (option 1 of 3 offered) for a classic wedding feel, applied to both headings
and body.

**Change**
- `index.html` + `404.html`: Google Fonts request swapped from
  `Cormorant Garamond + Manrope` to `EB Garamond (400..800 + italics) + Source Sans 3
  (200..900 + italics)`, `display=swap` and preconnects untouched.
- `styles.css`: `--serif` → `"EB Garamond"`, `--sans` → `"Source Sans 3"`. No scale,
  spacing, colour, or weight changes — both new families cover the existing 400/500/600/700
  usage, so no synthesized weights.
- `CLAUDE.md`, `README.md`: font-pairing lines updated to match. `THAARA_REBUILD.md`
  left as historical record.

**Files**
`index.html`, `404.html`, `styles.css`, `CLAUDE.md`, `README.md`

**Reason**
Owner-directed; smallest fix for the AI look is the typeface itself. Cormorant's thin
high-contrast fashion serif + gold italic is the AI-luxury signal; EB Garamond reads as
real print. Variable ranges keep request = usage.

**Verified**
Google Fonts CSS for the new request returns both families (400..800 / 200..900).
No `Cormorant`/`Manrope` remains in `index.html`, `404.html`, `styles.css`, `script.js`.
`node --check script.js` passes, CSS braces balanced (303/303), `/`, `/styles.css`,
`/404.html` all serve HTTP 200 locally. Not verified: rendered visual QA at 320/1920px —
owner to confirm the new look.

---

## Baseline — 2026-08-26

Phase 6 review opened against commit `4cd037b`, deployed and live at
<https://jerishjerry.github.io/thaara-website/>.

State at the start of review:

| | |
|---|---|
| Structure | 9 sections — hero, work, services, why, process, about, proof, contact, closing |
| Cold page weight | 106 KB |
| Contrast | 152 elements checked, 0 failures |
| Responsive | verified 320 → 1920, no overflow, no control under 44 px |
| Console | 0 errors, 0 failed requests |
| Build | static, no build step |

Known-open items carried in, not defects to re-report:

- The enquiry form cannot send — `ENQUIRY_ENDPOINT` is empty and no email address exists.
- Seven `needs-input` markers and one `[CLIENT TESTIMONIAL NEEDED]` block are publicly visible.
- The canonical points at the GitHub Pages address rather than a custom domain.
- Rendered visual QA and cross-browser testing have not been done.

---

## 2026-08-29 — Hero entrance given its own authored overture · Polish

**Issue**
Owner asked for animation on the opening of the page. The hero already animated — every element
carried `.reveal` with a 4-step, 90 ms stagger — but it was revealed by the same
`IntersectionObserver` that serves the rest of the page, so its timing was incidental rather than
composed, and the two hairlines and the gold italic had no beat of their own.

**Change**
Three coordinated changes, kept to one moving idea rather than more animation:

- **Hero runs on its own clock.** New `.hero-ready` class on `<html>`, released by `script.js`
  60 ms after it runs. Hero `.reveal` elements are filtered out of the observer's list entirely
  (`.filter(el => !el.closest(".hero"))`), so the sequence is authored, not dependent on when the
  observer decides to fire. New `--dur-hero: .9s` and `--stagger: .12s` tokens; hero-scoped
  `data-delay` rules compute their delay as `calc(var(--stagger) * n)`. Beats now run
  0 / .12 / .24 / .36 / .48 / .60 s.
- **"made personal." arrives on its own beat** (beat 3, .36 s). **Opacity only, deliberately** —
  transforming an inline `<em>` needs `display: inline-block`, which would make the phrase
  unbreakable and overflow the `h1` at 320 px.
- **The two hairlines draw rather than fade.** `.hero-eyebrow .rule` runs `scaleX(0→1)` from
  `transform-origin: left`; `.hero-cue .line` runs `scaleY(0→1)` from `top`. Both are flex children,
  so they are blockified and transformable.

Markup change was two attributes: `.btn-row` 3→4 and `.hero-cue` 4→5, freeing beat 3 for the `<em>`.

**Files**
`styles.css` (motion tokens, hero overture block, reduced-motion additions), `script.js`
(observer filter + `startOverture`), `index.html` (two `data-delay` values)

**Reason**
Owner-directed. Checked against the `ui-ux-pro-max` dataset first, which changed the design:
`excessive-motion` ("animate 1–2 key elements per view max", High) ruled out giving the `<em>` a
translate of its own, so it is opacity-only and the only genuinely new moving parts are the two
hairlines. `duration-timing` (Medium) is why `--dur-hero` is a separate token rather than reusing
`--dur-slow`, which is doing scroll-reveal duty below the fold. `easing` confirmed the existing
`--ease-out` deceleration curve was already correct for an entrance.

Two defensive choices worth keeping: the overture is released by `setTimeout`, **not**
`requestAnimationFrame`, because rAF never runs in a tab that is not being composited and the hero
would be stranded at `opacity: 0` (`THAARA_REBUILD.md` §50.4); and the reduced-motion block now
carries the hero's start states explicitly, so the hero never depends on JavaScript having released
`.hero-ready`. `showAll()` also calls `startOverture()` as a safety net.

**Verified**
Served on a cold port (4188) — all assets returned fresh `200`s, no `304` staleness.

- All 15 hero transitions reported `playState: "running"` via `getAnimations()`, at exactly the
  intended delays (0 / 120 / 240 / 360 / 480 / 600 ms), all 900 ms on `cubic-bezier(.16,1,.3,1)`.
  The `<em>` reports an opacity entry and **no transform entry**, confirming the wrapping risk is
  avoided.
- Start state confirmed with transitions suppressed: `em` opacity 0, `.btn-row` opacity 0,
  `.rule` `scaleX(0)`, `.line` `scaleY(0)`. End state with `.hero-ready`: all 1.
- Observer path intact — all 26 non-hero reveals still receive `.in-view` on scroll.
- Reduced-motion rules parse and win on order: `.js .hero h1 em{opacity:1}`,
  `.rule{scaleX(1)}`, `.line{scaleY(1)}`, all `transition: none`.
- No horizontal overflow at 320 px or 1920 px. At 320 px the `<em>` stays `display: inline` and does
  not overrun the `h1`.
- Shared left edge intact — logo, eyebrow rule, `h1`, lead, button row, cue line and the Work
  section all measured at exactly 123 px, spread 0.
- 0 console errors, 0 failed requests.

Not verified: the running animation was never observed painting. The Browser pane was hidden for the
whole session, and transitions freeze at their start value in a non-compositing tab
(`THAARA_REBUILD.md` §50.4) — the first screenshot caught exactly that. Timing, start state, end
state and easing are confirmed programmatically, but nobody has watched it play.

---

## 2026-08-29 — Social Proof section hidden · Important

**Issue**
Owner asked to hide the "In Their Words" testimonial section — the `[CLIENT TESTIMONIAL NEEDED]`
placeholder quote, its explanatory note, and the `needs-input` badge.

**Change**
Wrapped the entire `<section id="proof">...</section>` in an HTML comment, following the same
pattern already established for Work's commented-out "more work" empty state: dated explanatory
comment at the top, restore by removing the comment wrapper. No CSS/nav changes needed — nothing
links to `#proof`, and the section held nothing else worth preserving separately.

**Files**
`index.html`, `CLAUDE.md` (needs-input marker count corrected — both remaining markers are now
commented out, 0 render)

**Reason**
Owner-directed; matches the existing "commented out, not deleted" convention so it costs nothing to
render, leaves nothing in the accessibility tree, and is trivially restorable once a real
testimonial exists.

**Verified**
Rendered at 375px and 1024px with a headless browser — Process's "Start a Project" link flows
straight into Contact with normal spacing, no gap or leftover whitespace, 0 console errors, 0 failed
requests. `#proof` locator returns 0 matches.

---

## 2026-08-29 — Removed the Nivin & Dhiya description, tags and detail list · Important

**Issue**
Continuing the previous removal, the owner asked to remove the rest of the case study's body
content ahead of the planned multi-project slides layout: the description paragraph, the Design /
Illustration / Lettering tag pills, and the Category / Format / Artwork / Lettering / Occasion
detail list. Confirmed scope with the owner first — body text and detail list only, keeping the
image, project title ("Nivin × Dhiya"), and category label above it.

**Change**
- Removed the entire `<div class="project-body">` block from the case study `<article>` — its
  description `<div>` (lead paragraph + `.role-list` tag pills) and its `<dl class="detail-list">`.
- Removed the now-fully-unused `.project-body`, `.detail-list`, and `.role-list` CSS rules (none of
  the three classes remain anywhere in `index.html`). Left `.project--split` and other
  "alternate layout, ready for real projects" CSS in place — unrelated scaffolding for future
  multi-project layouts, not dead code from this change.

**Files**
`index.html`, `styles.css`

**Reason**
Owner-directed removal ahead of the planned multi-project slides feature — not a fix, a deliberate
content decision, same rationale as the prior gap-notice removal.

**Verified**
Rendered the case study at 375px and 1024px with a headless browser — image, title and category
label remain, no leftover spacing where the removed content was, 0 console errors, 0 failed
requests.

---

## 2026-08-29 — Removed the case-study gap notice from Nivin & Dhiya · Important

**Issue**
The owner is planning to replace the single-project Work section with a slides layout covering
multiple projects, and wants the case study's "what's missing" disclaimer (a `.project-gap`
paragraph plus its `needs-input` badge) removed now rather than carried into that redesign.

**Change**
- Removed the `<div class="project-actions">` wrapper and its two children (the `.project-gap`
  paragraph and the `needs-input` badge) from the Nivin & Dhiya case study — it held nothing else,
  so the empty wrapper was removed too rather than left dead.
- Removed the now-unused `.project-actions` and `.project-gap` CSS rules. Left the shared
  `.needs-input` styling in place — still used by the testimonials marker and the commented-out
  "more work" slot.
- Corrected `CLAUDE.md`'s `needs-input` marker count, which was already stale before this change
  (documented as "5 markers, source shows six"; actual state was 2 rendered + 1 commented). It now
  reads 1 rendered (testimonials) + 1 commented out (the "more work" slot), and notes this case
  study's marker was removed outright.

**Files**
`index.html`, `styles.css`, `CLAUDE.md`

**Reason**
Owner-directed removal ahead of the planned multi-project slides feature — not a fix, a deliberate
content decision.

**Verified**
Rendered the case study card with a headless browser at 375px and 1024px — ends cleanly after the
Design/Illustration/Lettering tag pills, no leftover spacing, 0 console errors. Grepped
`project-actions`, `project-gap`, `needs-input` in `index.html` to confirm only the testimonials
instance and the commented-out slot remain.

---

## 2026-08-29 — "One occasion" phrase kept intact in the Why THAARA heading · Polish

**Issue**
After the previous orphaned-hyphen fix, the "Why THAARA" heading could wrap with the emphasised
phrase split across two lines ("Work made for one" / "occasion - not adapted from..."), separating
"one" from "occasion" even though they're styled together as one italic unit. Gluing the hyphen to
"occasion" (previous fix) meant that whenever the combined "occasion -" didn't fit at the end of a
line, "occasion" moved down alone, leaving "one" behind.

**Change**
Added `&nbsp;` between "one" and "occasion" inside the `<em>` in the h2 (`Work made for
one&nbsp;occasion</em>&nbsp;- not adapted...`), so the whole emphasised phrase is one unbreakable
unit and always wraps as a pair.

**Files**
`index.html`

**Reason**
The italic "one occasion" is meant to read as a single emphasised phrase; letting it split across
lines undercut that. This keeps it intact regardless of wrap point.

**Verified**
Rendered the heading with a headless browser at 320, 375, 480, 700, 1024 and 1920px — "one occasion"
stays on one line and the hyphen never starts a line at any width.

---

## 2026-08-29 — Orphaned hyphens fixed after the em-dash swap · Important

**Issue**
Owner flagged the "Why THAARA" heading ("Work made for *one occasion* - not adapted from someone
else's.") rendering with a lone `-` at the start of the second line, reading like a stray bullet.
Root cause: a plain hyphen surrounded by regular spaces is a valid line-break point, so the
previous em-dash-to-hyphen swap (see below) could strand the `-` at the start of any wrapped line,
anywhere the browser chose to break there. An em dash didn't have this problem — visually it never
reads as a bullet even when it starts a line.

**Change**
In the 24 lines of rendered copy containing ` - `, replaced the space *before* the hyphen with
`&nbsp;`, e.g. `occasion - not` → `occasion&nbsp;- not`. This makes "word&nbsp;-" one unbreakable
unit, so the line can only wrap at the space *after* the hyphen — the hyphen now always stays
attached to the end of the previous line, never starts a new one. Left untouched: `<title>`/meta/OG
tags, the `aria-label`, and HTML comments — none of those wrap on-screen, so they weren't at risk.

**Files**
`index.html`

**Reason**
Fixes a regression introduced by the earlier site-wide em-dash-to-hyphen change, rather than
reverting the owner's punctuation preference.

**Verified**
`git diff` shows only the 24 targeted lines changed, each a `&nbsp;` insertion before its hyphen(s).
Confirmed CRLF line endings and other entities untouched.

---

## 2026-08-29 — Em dashes replaced with hyphens site-wide · Polish

**Issue**
Owner asked for every em dash (—, `&mdash;`) across the page to be replaced with a plain hyphen.

**Change**
Swapped all 36 instances (28 literal `—` characters, 8 `&mdash;` entities) for `-`, in visible copy, meta/title/OG tags, and HTML comments. Every occurrence was already space-separated, so no spacing adjustments were needed.

**Files**
`index.html`

**Reason**
Direct owner preference on punctuation style.

**Verified**
Grepped for `—` and `&mdash;` in `index.html` — zero remaining. Confirmed other entities (`&rsquo;`, `&times;`, arrows) and CRLF line endings untouched; `git diff` shows only the intended dash-to-hyphen swaps.

---

## 2026-08-29 — Fill in About section facts · Important

**Issue**
The About fact list (`Based in`, `Founded`, `Behind THAARA`) showed the `needs-input` placeholder badge for all three rows. Owner supplied the real values.

**Change**
Replaced the three placeholder badges with plain text:
- Based in → Tamil Nadu, India
- Founded → 2025
- Behind THAARA → Jerin — Founder & Creative Director

**Files**
`index.html` — About section `<dl class="fact-list">`

**Reason**
Owner-supplied content replacing honest placeholders, per the site's no-fabrication rule. Live `needs-input` markers drop from 5 to 2 (Work case study, testimonial block); one further instance stays commented out (the hidden "more work" slot).

**Verified**
Grepped `needs-input` in `index.html` — 2 live occurrences remain, matching the expected count.

---

## 2026-08-26 — Connect the enquiry form to Web3Forms · Critical

**Issue**
The contact form validated but could not send — `ENQUIRY_ENDPOINT` was empty and no inbox existed.
The strongest CTA on the site could not complete. Owner supplied a Web3Forms access key.

**Change**
- Wired `ENQUIRY_ENDPOINT` to `https://api.web3forms.com/submit` with the supplied access key.
- Payload adds Web3Forms' reserved fields: `subject`, `from_name`, `replyto` (set to the visitor's
  address so Reply goes to them, not the form), and `botcheck`.
- **Fixed a latent fake-success bug.** The handler gated on `res.ok`, but Web3Forms returns
  HTTP 200 with `{"success": false}` on rejection — wrong key, spam block, quota. As written, a
  rejected submission would have displayed *"Thank you. We've received your message."* The handler
  now parses the body and shows success only on `body.success === true`, surfacing the API's own
  error message otherwise. This bug was unreachable until a real endpoint existed.
- Added a hidden `botcheck` honeypot: `tabindex="-1"`, `aria-hidden`, clipped to 1×1. Not in the
  tab order, invisible to people, filled by bots.
- Contact copy updated — the `Email address — need user input` marker was removed, since the form
  is now a working contact route. Markers down from 7 to 6.

**Files**
`script.js` — endpoint, access key, subject constant, payload, body-based success check, honeypot read
`index.html` — honeypot field, contact caveat copy
`styles.css` — `.hp-field` clip-based hiding
`CLAUDE.md` — form section rewritten; open-items list corrected

**Reason**
Smallest change that makes the form actually send. The success check had to move from status to body
or the form would lie about delivery, which is the one guarantee the whole design rests on.

**Verified**
Four response paths against stubs — genuine success (shown, form reset), **HTTP 200 with
`success:false` (failure shown, success suppressed)**, non-JSON response (failure), network error
(failure). Real endpoint probed with a deliberately invalid key: reachable, CORS-permitted, returns
JSON. Honeypot confirmed out of the tab order and 1×1. No console errors, no failed requests, no
overflow.

**End-to-end test (2026-08-26).** One real submission fired through the page's own form, not a
direct API call. `POST https://api.web3forms.com/submit` returned **HTTP 200 in 1512 ms** and the
UI rendered the success state — which, given the stub tests prove `success:false` at HTTP 200
produces a *failure*, confirms the API returned `success: true`. Form reset, submit button
restored, no console errors. Web3Forms accepted and queued the message; final inbox delivery is
the owner's to confirm.

---

## 2026-08-26 — Work empty state hidden  ·  Important

**Issue**
"Hide this for now" — the "More work, once it is supplied" placeholder block in Work.

**Change**
The block is wrapped in an HTML comment in `index.html`, not deleted. Work now ends on the
Nivin × Dhiya project followed by the "Start a project" link.

Commented out rather than given `[hidden]` or `display: none`: a comment costs nothing to render,
leaves nothing in the accessibility tree, and cannot be resurrected by a later component rule that
sets `display` — the failure mode recorded in `THAARA_REBUILD.md` §36.

**Files**
`index.html` — the `.project > .slot` block commented out, with a note on how to restore it.
`CLAUDE.md` — publicly visible marker count 6 → 5, plus a warning that `grep` still counts the
commented markup, so the source reads six while only five render.

**Reason**
The block was scaffolding announcing absent work. Hiding it removes the announcement without
claiming anything false — the section simply shows the one project that exists. Keeping the markup
in place means restoring it is deleting two comment lines, not rewriting it, which matters because
it is the marker for work not yet supplied.

No other change was needed: `.project + .project` carried the divider and spacing, so with one
project left there is no orphan rule, and `.section-action` supplies its own margin. The Work
heading ("A single project, carried all the way through") was already accurate and is untouched.

**Verified**
Chromium at 320/375/768/1280/1920 with real webfonts. Slot absent from the DOM and from rendered
text; 1 `.project` in Work; no orphan `.project + .project` divider; 5 rendered `needs-input`
markers; "Start a project" sits 40–48 px below the project on the section's left edge; no
horizontal overflow; 0 console errors; 0 failed requests.


## 2026-08-26 — Studio email address supplied and published  ·  Critical

**Issue**
`hello.thaaracreates@gmail.com` — "need to add this email id".

**Change**
The address is now a published contact route everywhere the site previously had none.

- Contact section: the two direct routes (email, Instagram) sit in a `.contact-routes` stack on the
  page's single left edge. The `needs-input` marker and the sentence "Instagram is the only contact
  route verified in this project" are gone — the latter was no longer true. The caveat now says why
  the direct routes matter: the form still isn't wired to an inbox.
- Footer "Get in touch": the address sits above the Instagram handle.
- Form fallbacks: the not-connected and failure states, and the `<noscript>` message, now offer
  email alongside Instagram. Previously Instagram was the only handoff they could name.
- `JSON-LD`: `email` added to the Organization node — a verified fact, so it belongs in structured
  data.

`ENQUIRY_ENDPOINT` is deliberately still empty. A mailbox cannot accept a POST, so the address is
not a valid value for it; the form still does not claim to send.

**Files**
`index.html` — email in six places: JSON-LD, contact routes, `<noscript>`, not-connected actions,
failure actions, footer.
`styles.css` — `.contact-routes` grid; `.link-rule--mail` (keeps the address in its own case rather
than the component's tracked uppercase, since an address is a literal string people retype);
`.footer-mail` sharing the footer reach-link treatment. `overflow-wrap: anywhere` on both mail links
— the address is one unbreakable word and browsers do not break at `.` or `@`.
`script.js` — comment only. Records that the studio mailbox is **not** what goes in
`ENQUIRY_ENDPOINT`, so a future reader does not paste it there and break every submission.
`CLAUDE.md`, `README.md`, `THAARA_REBUILD.md` — current-state claims that said no email exists.
Marker count 7 → 6. The Phase 4 snapshot in §46 is annotated, not rewritten.

**Reason**
Adding the address to the contact block alone would have left four places still telling visitors
Instagram was the only way to reach the studio — including the fallback the form shows every time
someone tries to send. The gap was never one marker; it was that the page had no email anywhere.
No layout, palette, type or section change was needed: both new links reuse existing components.

**Verified**
Rendered in Chromium at 320/360/375/414/768/1024/1280/1920 with the real webfonts served locally
(cold cache, fresh port). No horizontal overflow at any width; both contact routes share the page's
single left edge at every width; 0 console errors; 0 failed requests; all mail links ≥ 44 px.
Form submitted with valid input at each width: the not-connected state opens (asserted on computed
display, not `el.hidden`), the success box stays `display: none`, and the visitor's text is kept.
<!-- New entries go directly below this line, newest first.

## YYYY-MM-DD — <short title>  ·  <Critical | Important | Polish>

**Issue**
<the feedback, as given>

**Change**
<what was actually altered>

**Files**
`file` — <what changed in it>

**Reason**
<why this was the smallest effective correction>

-->
