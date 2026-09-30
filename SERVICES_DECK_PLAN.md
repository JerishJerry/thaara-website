# Services "Deck" — build plan (handover)

**For the OpenCode build agent (Muse Spark 1.3).** Read this whole file and `CLAUDE.md` before you touch anything.
Do what the steps say; do not improvise extra effects. Reference code below is a **starting point that has not
been run** — every step ends with checks you must actually perform.

**Order of work: Step A (worktree + the `thaara-qa` skill) → Step 0 (baseline) → Steps 1–5.** Write **no site code**
until Step A is finished and the skill loads. From then on, every step ends by loading that skill and running its
checklist, so the checks are identical each time instead of being re-derived from memory.

---

## 1. Context

The owner asked for ideas to make the **Services** section ("What We Create", five disciplines) livelier — 3D /
scroll effects, "anything that looks awesome". Three directions were offered (a stacking deck, deck + WebGL
object, a livelier version of the existing list). **The owner chose "The Deck"**:

> Each of the five disciplines becomes a full-width card. Cards pin just under the header and stack as you
> scroll. When the next card slides over, the one below recedes in 3D (leans back, shrinks, dims). Inside each
> card the numeral, the title words and the pills animate in.

The owner also chose to build it on a **new branch cut from `main`** (`services-motion`), independent of the
unmerged envelope work. The owner explicitly approves this animation work, which overrides two `CLAUDE.md` rules
**for the Services section only**: "Phase 6 is feedback-driven, don't add animations" and "No parallax / motion
= transform/opacity only" (the scroll-linked depth is this request). Every other `CLAUDE.md` rule still applies.

### Project analysis (2026-10-01, from the local folder — GitHub Pages is out of date)

| Line of work | Branch | State |
|---|---|---|
| Deployed site | `main` = `origin/main` = `d0ddc00` (2026-09-22) | What GitHub Pages serves. Not touched since 22 Sep. |
| 3D prototype (Phase 7 v2) | `3d-redesign` (17 commits ahead of main) | **Local only, never pushed.** Vendors Three.js + GSAP, `prototype/`. |
| Hero envelope flight | `hero-envelope` (+12 on top of `3d-redesign`, **29 ahead of main**) | **Local only, never pushed.** Scroll-scrubbed 3D envelope in the hero. Steps 1–7 done, now polishing the photo→envelope handoff. |

- The GitHub page is "outdated" because **nothing after 22 Sep was ever pushed to `main`**. The envelope work
  exists only on this PC.
- **Another agent is editing `D:\Thaara` right now** (uncommitted changes in `index.html`, `styles.css`,
  `js/envelope/boot.js`, `js/envelope/envelope.js`, touched within the minute). **Never `git checkout`, `git
  stash`, `git reset` or branch-switch in `D:\Thaara`.** This plan uses a separate git worktree for that reason.
- The Services markup and CSS are **byte-identical on `main` and `hero-envelope`** (verified: no `service` /
  `capability` lines differ), so this change merges into either branch cleanly.
- Stack: hand-written static site, no build, no `package.json`. `index.html` (745 lines) / `styles.css` (1702) /
  `script.js` (498). On `hero-envelope` only: `js/envelope/*` (1.5k lines) + `vendor/` (908 KB Three.js/GSAP).
- Things noticed while reading (not part of this task, don't fix them here; the owner may want them later):
  1. `README.md` is stale: says the live site is Netlify and "three source files"; `CLAUDE.md` says GitHub Pages is
     canonical and Netlify is the stale original.
  2. `script.js` reveal safety net (`script.js` ~159–166) fires `showAll()` if no `.reveal.in-view` exists after
     1.5 s. On a tall first screen nothing below the hero is in view, so it looks like it would pre-empt every scroll
     reveal. **Unverified — worth a 2-minute check.**
  3. `hero-envelope` tracks `prototype/` (~1 MB incl. `proto.js` 130 KB) and `leo-asnia-scroll.mp4` (1.5 MB). If
     merged to `main` they deploy publicly. Decide before merging.
  4. `CLAUDE.md` "Still open #0" says the Leo × Asnia video is blocked; the mp4 now exists on `hero-envelope`.

---

## 2. How to work

- **Branch / location:** never work in `D:\Thaara`. Create a worktree (this is part of Step A):
  ```bash
  git -C D:/Thaara worktree add D:/Thaara-services -b services-motion main
  cd D:/Thaara-services
  ```
  (`main` is `d0ddc00`. Line numbers below are for that commit; if they drift, **find things by selector with
  `grep -n`**, don't trust numbers.) If the owner later says "build it on hero-envelope instead", the same command
  works with `hero-envelope` in place of `main` (committed state only).
- **Never push. Never touch `main`.** Pushing `main` deploys the live site. Commit on `services-motion` only.
- **Preview:** serve the worktree on a fresh port (also a cold-cache test; `CLAUDE.md` trap 2):
  ```bash
  cd D:/Thaara-services && py -m http.server 4190
  ```
  → `http://localhost:4190`. (`.claude/` is gitignored, so the worktree has no `serve.mjs`; use the command above.)
- **One step at a time.** After each step: load the `thaara-qa` skill (`skill({ name: "thaara-qa" })`) and run its
  checklist plus the step's own checks → commit → add one line under **Progress** at the bottom
  of this file (copy this file into the worktree root as `SERVICES_DECK_PLAN.md` in Step 0) → one short report line.
  If you skip or can't run a check, say so in that line; never write "verified" for something you didn't measure.
  Continue to the next step unless a check failed or a **Stop and ask** item applies.
- Commit messages: plain, e.g. `Services deck step 2: pinning and fit check`. Use `git commit -F <file>` if
  multi-line (PowerShell 5.1 has no `&&`; quote args containing `#`).

## 3. Hard rules (from CLAUDE.md, the ones that matter here)

- **No new copy.** Every string in `#services` stays exactly as is. The ghost numerals are the existing 01–05
  repeated as decoration (`aria-hidden`). No new headings, captions, labels.
- **No framework, no dependency, no build step, no `package.json`.** One new plain JS file is allowed
  (`js/services-deck.js`). Do **not** edit `script.js`, `404.html`, the contact form, JSON-LD, images, `vendor/`,
  `prototype/`, `logo.png`, `invitation-save-the-date.png`.
- **Tokens only.** Every size/colour/space/duration resolves to a token in `styles.css` section 01. The new tokens
  are listed in Step 1; add nothing else ad hoc.
- **Gold is for interactive things + two accent phrases only.** Do **not** use gold on ghost numerals, titles,
  numbers or borders. `h3 em` stays `color: inherit` (italic, not gold).
- **Motion = `transform` / `opacity` only.** (The static `box-shadow` on cards is not animated. `--depth` changes
  drive `transform` and `opacity` only.)
- **`[hidden]` and computed display:** assert on computed styles, never on attributes (`CLAUDE.md` trap 1).
- **One shared left edge:** at rest, cards align to `.container`'s left edge like everything else. Receded cards
  shrink from the top centre, that is expected, but the card that is on top must sit exactly on the edge.
- **Progressive enhancement:** with JS off, or `prefers-reduced-motion: reduce`, or a phone too short to pin,
  the section must be a clean, fully visible stack of the five cards.

## 4. What it should look like

```
scroll ↓
 ┌──────────────────────────────┐
 │ 01  Invitation Experiences   │  pinned, flat
 │     — Digital invitations ...│
 └──────────────────────────────┘
      ╲  02 slides up OVER 01
 ┌────────────────────────────┐
 │ 02  Brand Identity         │   01 leans back ~3°, shrinks, dims;
 │     (LOGO) (IDENTITY)      │   a 12px strip of 01's top edge stays visible
 └────────────────────────────┘
        …03, 04, 05 stack the same way; the whole stack leaves together at the end
```
Each card: dark `--bg-alt` panel, hairline border, rounded; a giant, very faint serif numeral cropped at the
card's bottom-right (the ghost); title words rise out of a mask; pills stagger in; hover lights the pills gold
(existing behaviour, keep it).

---

## Step A — Worktree + the `thaara-qa` skill (do this FIRST, before any site code)

Every step below ends with the same verification. Instead of re-reading it from this file each time, it lives in a
**skill** you load on demand. Create and verify it now.

1. **Worktree** (skip if it already exists): run the two commands from Section 2. You can run them from any
   folder; they don't touch `D:\Thaara`'s working tree.
2. **The OpenCode session must have `D:\Thaara-services` as its project root.** Project-scoped skills are found
   relative to it. If this session was started in `D:\Thaara`, stop and ask the owner to start a new session in the
   worktree (don't try to work around it by editing files inside `D:\Thaara`, another agent is working there).
3. **Create the skill** at `D:\Thaara-services\.claude\skills\thaara-qa\SKILL.md` with exactly the content in the
   block below. Why this path: OpenCode looks for `<name>/SKILL.md` in `.opencode/skills/`, `.claude/skills/` and
   `.agents/skills/` (project) and `~/.config/opencode/skills/`, `~/.claude/skills/`, `~/.agents/skills/` (global).
   `.claude/` is **gitignored** in this repo, so the skill can never be committed or shipped by accident. Rules
   that make it load: the file is named exactly `SKILL.md` (capitals); the folder name equals `name:` in the
   frontmatter (lowercase letters, digits, single hyphens); both `name` and `description` are present.
4. **Verify it loads:** call `skill({ name: "thaara-qa" })` and confirm the body comes back. If it doesn't appear:
   check the file name case, that the folder name matches `name:`, that the frontmatter starts on line 1, and that
   `opencode.json` doesn't `deny` it. Give it a few minutes at most. **Fallback:** save the same text as
   `D:\Thaara-services\.claude\thaara-qa.md`, `Read` it at the end of every step, and say so in the first Progress
   line. The checks still happen either way; only how you fetch them changes.
5. `git status` in the worktree must show nothing for the skill (it's ignored). From here on **never `git add -A`**;
   stage files by name.
6. **Progress line:** `Step A done: worktree D:\Thaara-services on services-motion; skill thaara-qa loads (or fallback file).`

### The skill file (write it verbatim)

````markdown
---
name: thaara-qa
description: Verification checklist for the THAARA static site. Load at the end of every build step and before reporting any site change complete. Covers fresh-port serving, the viewport matrix, console/network/overflow checks, anchor clearance, a copy-unchanged check, reduced-motion and JS-off fallbacks, the measurement traps, the Services deck geometry sweep, and the changelog entry format.
---

# THAARA QA

Run this at the end of every step, and before reporting any change complete. Report **measured numbers**, not
"looks fine". If you could not run a check, say so in the report. There is no build step: the files are the artefact.

## 0. Before you measure anything

- **Serve from the worktree on a fresh port** (`py -m http.server <port>`). The dev server answers 304s, so an edited
  `styles.css` / `script.js` can keep executing the old build. If a change "does nothing", compare the executed
  file's size with the file on disk before debugging logic. A fresh port is the reliable cold-cache test.
- **Check `window.innerWidth > 0` first.** A collapsed or background browser pane reports a 0x0 viewport:
  percentage widths collapse, images never lay out, and `naturalWidth` reads 0 with `complete: true` (which looks
  exactly like a decode failure). Geometry measured there is meaningless.
- **A tab that isn't compositing** freezes CSS transitions at their start value, never fires `IntersectionObserver`
  or `requestAnimationFrame`, and `.focus()` doesn't set `:focus-visible`. Don't judge motion there: neutralise the
  transition, flip `loading` to `eager`, or use a visible tab.
- **`[hidden]` loses to any rule that sets `display`.** Assert on `getComputedStyle(el).display`, never on `el.hidden`.
- **Contrast must composite alpha.** A ratio of exactly `1.00` means you compared a colour with itself: blend the
  translucent background onto what is behind it first.

## 1. Always (every step)

Viewport matrix: 1920x1080, 1440x900, 1024x768, 768x1024, 390x844, 375x667, 320x568. A step may use a subset, but
always includes 1440x900, 390x844 and the two overflow widths (320 and 1920).

1. **Console:** 0 errors, 0 warnings from our files.
2. **Network:** 0 failed requests; every file added in this step answers 200.
3. **Horizontal overflow at 320 and 1920:**
   ```js
   ({ innerWidth, scrollWidth: document.documentElement.scrollWidth, ok: document.documentElement.scrollWidth <= innerWidth })
   ```
4. **Anchors clear the fixed header.** html has `scroll-behavior: smooth`, so wait about 1 s after setting the hash:
   ```js
   (() => {
     const nav = document.querySelector('.nav').getBoundingClientRect().bottom;
     const top = document.querySelector('#services .section-head').getBoundingClientRect().top;
     return { navBottom: Math.round(nav), headTop: Math.round(top), clear: top >= nav };
   })()
   ```
   Repeat for `#work h2` and `#contact h2`.
5. **Copy unchanged.** Capture this string on `main` before any change (Step 0, save it as `before.txt` in a scratch
   folder) and again after each step; the two must be equal. It ignores the decorative ghost numerals:
   ```js
   (() => {
     const c = document.querySelector('#services').cloneNode(true);
     c.querySelectorAll('.deck-ghost').forEach(n => n.remove());
     return c.textContent.replace(/\s+/g, ' ').trim();
   })()
   ```
6. **One shared left edge** (once the deck exists). The top card at rest lines up with the container's content edge:
   ```js
   (() => {
     const c = document.querySelector('#services .container');
     const edge = c.getBoundingClientRect().left + parseFloat(getComputedStyle(c).paddingLeft);
     const card = document.querySelector('#serviceDeck .deck-card').getBoundingClientRect().left;
     return { edge, card, aligned: Math.abs(edge - card) < 0.5 };
   })()
   ```
7. **Fallbacks stay clean** (once `js/services-deck.js` exists). With `prefers-reduced-motion: reduce` (DevTools
   Rendering panel, or `page.emulateMedia({ reducedMotion: 'reduce' })`), with JS disabled, and with
   `js/services-deck.js` blocked, the five cards are a fully visible, unpinned stack: no `.deck--pinned`, no
   `.deck--armed`, nothing at `opacity: 0`.
8. **No layout shift from the deck:** `#serviceDeck` `offsetHeight` is the same with and without the `.deck--pinned` class.

## 2. Services deck geometry sweep (Steps 2 to 4)

Run at 1440x900 and 390x844 with the deck pinned. It scrolls in 120 px steps using `setTimeout` (not rAF, which may
not run) and records where every card sits and card 1's `--depth`:

```js
(async () => {
  const deck = document.getElementById('serviceDeck');
  const cards = [...deck.querySelectorAll('.deck-card')];
  const out = { pinned: deck.classList.contains('deck--pinned'), samples: [] };
  if (!out.pinned) return out;
  const root = document.documentElement;
  root.style.scrollBehavior = 'auto';
  const from = deck.getBoundingClientRect().top + scrollY - innerHeight * 0.2;
  const to = deck.getBoundingClientRect().bottom + scrollY;
  for (let y = from; y <= to; y += 120) {
    scrollTo(0, y);
    await new Promise(r => setTimeout(r, 60));
    out.samples.push({
      y: Math.round(y),
      deckBottom: Math.round(deck.getBoundingClientRect().bottom),
      depth0: parseFloat(cards[0].style.getPropertyValue('--depth')) || 0,
      cards: cards.map(c => ({
        top: Math.round(c.getBoundingClientRect().top),
        stick: Math.round(parseFloat(getComputedStyle(c).top))
      }))
    });
  }
  root.style.scrollBehavior = '';
  return out;
})()
```

Assert on the result:
- `depth0` never drops by more than 0.002 as `y` grows, starts at 0, and ends at about 4 (Step 3 onward).
- While `deckBottom` is still below the last card's bottom, every card's `top >= stick - 1` (it sticks; it never
  drifts upward).
- Repeat the sweep in reverse (scroll back up): `depth0` returns to 0, nothing stays stuck.

## 3. Changelog entry format (`THAARA_CHANGELOG.md`, newest first)

```
## YYYY-MM-DD - Title · Critical | Important | Polish

**Issue**    what was raised, in the owner's words
**Change**   what was done, plainly
**Files**    comma-separated list
**Reason**   why this, and why not something bigger
**Verified** the viewports and the measured results
```

## 4. Report format, then stop

**Changed** (files, one line each) · **Measured** (the numbers above) · **Not verified** (anything you could not run).
Then stop and wait. Don't volunteer further redesigns, and never push.
````

## Step 0 — Baseline (before any site change)

1. Start the server from the worktree (Section 2). Copy this plan into the worktree as `SERVICES_DECK_PLAN.md`.
2. Load `thaara-qa`. Open `http://localhost:4190/#services` at 1440×900 and 390×844. **Save a "before" screenshot of
   each** (scratch folder, not in the repo). Run the skill's **copy snippet** (Always #5) and save the resulting
   string as `before.txt` (scratch folder). The left-edge and deck checks don't apply yet — there is no deck.
3. Record: `getComputedStyle(document.body).overflowX` (expected `hidden`) and `getComputedStyle(document.documentElement).overflowX` (expected `visible`). Step 2 depends on this.
4. Commit `SERVICES_DECK_PLAN.md` ("Services deck step 0: plan").

## Step 1 — Markup + static card CSS (no JS, no motion yet)

**Goal:** the five cards as a static, responsive stack that looks right on its own. Nothing pins yet.

### 1a. `index.html` — replace the body of `#services` after the section head

Keep `<section class="section" id="services">`, `.container`, and the whole `.section-head … reveal` block exactly
as is. Delete everything from the `<!-- Lead service … -->` comment through the closing `</div>` of
`.service-list` (main ≈ lines 306–380) and put this in its place. **Copy every string character-for-character
from the old markup** (note the `&nbsp;` before each hyphen and `&amp;` in "Motion &amp; Visuals"):

```html
        <!-- The deck: the five disciplines as cards that pin and stack as the page
             scrolls. 01 is the lead offering. js/services-deck.js adds pinning,
             depth and entry motion; without it this is a plain stack of cards and
             every word is visible. -->
        <div class="deck" id="serviceDeck">

          <article class="deck-card deck-card--lead">
            <span class="deck-ghost" aria-hidden="true">01</span>
            <div class="deck-main">
              <span class="index-num">01</span>
              <h3>Invitation <em>Experiences</em></h3>
              <p class="lead">Interactive wedding and event websites&nbsp;- an invitation that opens as an experience rather than an attachment. The occasion leads the design, and guests move through it instead of simply reading it.</p>

              <!-- The only service with projects in the repository to point at. -->
              <p class="service-evidence">
                <a class="link-rule" href="#work">See this work <i aria-hidden="true">↑</i></a>
              </p>
            </div>
            <ul class="capability-list">
              <li>Digital invitations</li>
              <li>Interactive experiences</li>
              <li>Event websites</li>
              <li>Storytelling experiences</li>
              <li>Save-the-dates</li>
            </ul>
          </article>

          <article class="deck-card">
            <span class="deck-ghost" aria-hidden="true">02</span>
            <div class="deck-main">
              <span class="index-num">02</span>
              <h3>Brand Identity</h3>
              <p class="service-desc">Logos and visual identities&nbsp;- the mark, the lettering and the palette, built so the identity stays recognisable wherever it is used.</p>
            </div>
            <ul class="capability-inline">
              <li>Logo design</li>
              <li>Visual identity</li>
            </ul>
          </article>

          <!-- 03 Digital Design, 04 Website Design, 05 Motion &amp; Visuals: same shape.
               Copy their <h3>, <p class="service-desc"> and <li> text from the old markup. -->
        </div>
```
Write out 03, 04 and 05 in full (same pattern as 02, ghost = `03`/`04`/`05`). No `.reveal` class on cards — the
deck supplies its own motion (only the section head keeps `.reveal`). No inline `style` attributes.

Add the script tag directly after `<script src="script.js" defer></script>` (near the end of `<body>`):
```html
  <script src="js/services-deck.js" defer></script>
```
(The file doesn't exist until Step 2; a 404 here is harmless and gets fixed in the next step, but commit Step 1
and Step 2 back to back. Create an empty `js/services-deck.js` now if you'd rather have 0 failed requests.)

### 1b. `styles.css` — tokens

Append to the `:root` block in section 01, after the `--dur/--stagger` motion tokens:
```css
  /* ---- Services deck ---------------------------------------- */
  --fs-display:   clamp(7rem, 18vw, 15rem);   /* the ghost numeral, and nothing else */
  --ghost:        rgba(243,236,224,.05);      /* ghost numeral ink (a whisper of --ink) */
  --deck-top:     calc(var(--nav-h) + var(--sp-5));
  --deck-step:    var(--sp-3);                /* strip of each buried card left showing */
  --deck-card-h:  clamp(17rem, 38vh, 23rem);  /* minimum card height */
  --deck-persp:   1400px;
  --deck-tilt:    3deg;                       /* lean-back once a card is fully buried */
  --deck-shrink:  .035;                       /* scale lost per card laid on top */
  --deck-dim:     .28;                        /* darkening per card laid on top */
  --deck-dim-max: .7;
  --shadow-deck:  0 -14px 36px rgba(0,0,0,.38);
```
Next to the existing `@media (max-width: 900px){ :root{ --nav-h … } }` block add:
```css
@media (max-width: 600px){ :root{ --deck-step: var(--sp-2); --deck-tilt: 2deg; } }
```

### 1c. `styles.css` — replace section 10 (SERVICES)

Replace everything between the `/* === 10 SERVICES === */` header and the `/* === 11 WHY THAARA === */` header
(main ≈ lines 1021–1107) with the block below. It **ports** the old `.capability-list`, `.capability-inline`,
`.service-desc`, `.service-evidence` rules so the lists look identical; only `.service-lead` / `.service-item` go away.

```css
/* ============================================================
   10  SERVICES — the deck
   ============================================================ */

/* Five cards in a plain block (not grid or flex: the simplest possible
   containing block for the sticky cards). Without script they are an
   ordinary stack. js/services-deck.js adds .deck--pinned only when every
   card fits the viewport, and sets --depth on each card as later cards
   slide over it. */
.deck{ padding-bottom: var(--sp-6); }
.deck-card + .deck-card{ margin-top: var(--sp-6); }

.deck-card{
  --depth: 0;            /* 0 = on top; +1 per card laid over it; written by script */
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-6);
  align-content: center;
  min-height: var(--deck-card-h);
  padding: clamp(var(--sp-6), 4vw, var(--sp-9));
  border: 1px solid var(--line-firm);
  border-radius: var(--radius-lg);
  background: var(--bg-alt);
  overflow: hidden;
  transform-origin: 50% 0;   /* lean back from the top edge, so the edge strip stays put */
}
@media (min-width: 900px){
  .deck-card{ grid-template-columns: 1fr 1fr; gap: var(--sp-9); align-items: center; }
}

/* Content sits above the ghost numeral and below the dimming veil. */
.deck-main,
.deck-card .capability-list,
.deck-card .capability-inline{ position: relative; z-index: 1; }

.deck-main .index-num{ display: block; margin-bottom: var(--sp-4); }   /* block: inline spans can't transform */
.deck-card h3{ margin-bottom: var(--sp-3); }
.deck-card--lead h3{ margin-bottom: var(--sp-5); }
.deck-card:not(.deck-card--lead) h3{ font-size: var(--fs-lg); font-weight: 400; }
.deck-card .lead{ max-width: 44ch; }
.deck-card .service-desc{ font-size: var(--fs-base); color: var(--ink-dim); max-width: 46ch; }
.deck-card .service-evidence{ margin-top: var(--sp-6); }

/* The ghost numeral: decoration only (aria-hidden), ink not gold, cropped by
   the card's own overflow. */
.deck-ghost{
  position: absolute;
  right: var(--sp-5);
  bottom: 0;
  z-index: 0;
  transform: translateY(18%);
  font-family: var(--serif);
  font-size: var(--fs-display);
  font-weight: 500;
  line-height: .8;
  font-variant-numeric: tabular-nums;
  color: var(--ghost);
  pointer-events: none;
  user-select: none;
}

/* Capability list with gold ticks (unchanged from the old section). */
.capability-list{ display: grid; gap: var(--sp-4); align-content: start; }
.capability-list li{
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--sp-4);
  padding-bottom: var(--sp-4);
  border-bottom: 1px solid var(--line);
  font-size: var(--fs-sm);
  color: var(--ink-dim);
}
.capability-list li::before{ content: "—"; color: var(--gold); line-height: 1.65; }

/* Inline pills (unchanged, minus the old grid-column placement). */
.capability-inline{ display: flex; flex-wrap: wrap; gap: var(--sp-2) var(--sp-3); }
.capability-inline li{
  padding: var(--sp-1) var(--sp-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  font-size: var(--fs-3xs);
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--ink-faint);
  transition: border-color var(--dur) var(--ease), color var(--dur) var(--ease);
}
.deck-card:hover .capability-inline li{ border-color: var(--gold-soft); color: var(--ink-dim); }
```
(Gold ticks on `.capability-list li::before` are the existing interactive-ish wayfinding; keep as is.)

In the `NARROW-VIEWPORT REFINEMENTS` block at the end, replace
`.service-lead{ padding: var(--sp-6) var(--sp-5); }` with `.deck-card{ padding: var(--sp-6) var(--sp-5); }`.

### Step 1 checks
- `grep -n "service-lead\|service-item\|service-list" index.html styles.css` → no hits left.
- Copy unchanged: run the `thaara-qa` copy snippet (Always #5); the string equals `before.txt` exactly (the snippet
  already ignores the ghost numerals).
- Looks right at 1440×900, 768×1024, 390×844, and **no horizontal overflow at 320 and 1920**
  (`document.documentElement.scrollWidth <= window.innerWidth`). Check `window.innerWidth > 0` first (trap 3).
- Console: 0 errors. Hover on a card still lights its pills.
- Judge it honestly: if a card reads "too empty" the variable is **composition** (ghost size/contrast, h3 size,
  min-height) — change **one** thing at a time, smallest change. (`CLAUDE.md` Phase 6 rule 2.)
- Commit: `Services deck step 1: cards markup and static CSS`.

---

## Step 2 — Pinning, with a fit check

**Goal:** cards pin under the header and stack, **only** when every card fits. No depth effect yet.

### 2a. CSS — append to section 10

```css
/* Pinned deck. The script adds .deck--pinned only when each card, at its
   sticky offset, fits above the bottom of the screen; otherwise a card taller
   than the room would have its bottom unreachable. */
.deck--pinned .deck-card{
  position: sticky;
  top: calc(var(--deck-top) + var(--i, 0) * var(--deck-step));
  box-shadow: var(--shadow-deck);
  will-change: transform;
}
.deck-card:nth-child(1){ --i: 0; }
.deck-card:nth-child(2){ --i: 1; }
.deck-card:nth-child(3){ --i: 2; }
.deck-card:nth-child(4){ --i: 3; }
.deck-card:nth-child(5){ --i: 4; }
```

### 2b. `js/services-deck.js` (new file; ES5 `var`/IIFE style to match `script.js`)

```js
/* Services deck: pinning, depth and entry motion.

   Progressive enhancement over plain CSS cards. Nothing here is needed for
   the content to be readable: if this file never runs, the five cards are an
   ordinary stack and every word is visible. No dependencies, no build step. */

(function () {
  "use strict";

  var deck = document.getElementById("serviceDeck");
  if (!deck) { return; }

  var cards = Array.prototype.slice.call(deck.querySelectorAll(".deck-card"));
  if (cards.length < 2) { return; }

  // Reduced motion: a plain, fully visible stack. Nothing is pinned or hidden.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { return; }

  var narrow = window.matchMedia("(max-width: 700px)");
  var coarse = window.matchMedia("(pointer: coarse)");
  var CTA_RESERVE = 80;   // mirrors .sticky-cta on phones: 16px gap + 52px bar + room to breathe

  var clamp01 = function (v) { return v < 0 ? 0 : (v > 1 ? 1 : v); };

  /* ---------- Pinning: only when every card fits ---------- */

  var tops = [];      // each card's sticky offset, in px (measured from the pinned layout)
  var heights = [];
  var gap = 0;
  var last = cards.map(function () { return 0; });

  var measure = function () {
    deck.classList.add("deck--pinned");     // measure the real sticky offsets
    tops = cards.map(function (c) { return parseFloat(window.getComputedStyle(c).top); });
    heights = cards.map(function (c) { return c.offsetHeight; });
    gap = parseFloat(window.getComputedStyle(cards[1]).marginTop) || 0;

    var room = window.innerHeight - (narrow.matches ? CTA_RESERVE : 0);
    var fits = cards.every(function (c, i) { return tops[i] + heights[i] <= room; });

    deck.classList.toggle("deck--pinned", fits);
    if (!fits) {
      cards.forEach(function (c, i) { c.style.removeProperty("--depth"); last[i] = 0; });
    }
    update();
  };

  /* ---------- Depth: filled in during Step 3 ---------- */
  var update = function () {};

  var lastWidth = window.innerWidth;
  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    // Phone toolbars resize the viewport height on every scroll; only re-measure
    // those on a width change. Desktop re-measures on any resize.
    if (coarse.matches && window.innerWidth === lastWidth) { return; }
    lastWidth = window.innerWidth;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(measure, 120);
  });
  if (narrow.addEventListener) { narrow.addEventListener("change", measure); }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(measure); }

  measure();
}());
```

### Step 2 checks
- **First, the make-or-break probe.** At 1440×900 scroll slowly through `#services`. Each card must **stick**:
  `getComputedStyle(card).position === 'sticky'` **and** `card.getBoundingClientRect().top` stays equal to
  `tops[i]` while later cards slide over it. If it does **not** stick, the cause is almost certainly an ancestor
  with `overflow` — `body{ overflow-x: hidden }` is the only candidate on `main`. Fix (and only this): change it to
  `overflow-x: clip` in `styles.css` `body{}`, then re-test horizontal overflow at 320 and 1920. If still not
  sticking → **Stop and ask**.
- The stack leaves together after the last card, and the next section (`#why`) follows with correct spacing.
- 1440×900 and 1920×1080: pinned. 390×844: pinned. 375×667 and 320×568: probably **not** pinned (plain stack,
  no cut-off content) — confirm by `deck.classList.contains('deck--pinned')` and that every card's bottom is
  reachable. On phones the fixed "Start a project" bar must not cover a pinned card's bottom content.
- Keyboard: Tab reaches "See this work" (card 01); the focus ring is visible; Enter goes to `#work`.
- `#services` anchor (nav link) still lands with the heading clear of the fixed header.
- Console 0 errors, 0 failed requests (`js/services-deck.js` 200).
- Commit: `Services deck step 2: pinning and fit check`.

---

## Step 3 — Depth (the 3D recession)

**Goal:** as card *j* slides over card *j−1*, everything below it leans back, shrinks and dims.

### 3a. CSS — append to section 10
```css
.deck--pinned .deck-card{
  transform:
    perspective(var(--deck-persp))
    rotateX(calc(min(var(--depth), 1) * var(--deck-tilt) * -1))
    scale(calc(1 - var(--depth) * var(--deck-shrink)));
}
/* A veil in the page colour; opacity only. */
.deck--pinned .deck-card::after{
  content: "";
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: inherit;
  background: var(--bg);
  opacity: min(calc(var(--depth) * var(--deck-dim)), var(--deck-dim-max));
  pointer-events: none;
}
```
Negative `rotateX` about the top edge tips the card's **bottom** away from the viewer. If it tips the wrong way on
your screen, flip the sign — verify visually, don't assume.

### 3b. JS — replace the empty `var update = function () {};` with:
```js
  var update = function () {
    if (!deck.classList.contains("deck--pinned")) { return; }

    var box = deck.getBoundingClientRect();
    if (box.bottom < 0 || box.top > window.innerHeight) { return; }

    // How far card j has travelled from "just below card j-1" to "pinned over it".
    var nowTops = cards.map(function (c) { return c.getBoundingClientRect().top; });   // reads first…
    var cover = [0];
    for (var j = 1; j < cards.length; j += 1) {
      var start = tops[j - 1] + heights[j - 1] + gap;
      cover.push(clamp01((start - nowTops[j]) / (start - tops[j])));
    }

    // …writes after. A card's depth is how many cards are (partly) laid over it.
    for (var i = 0; i < cards.length; i += 1) {
      var depth = 0;
      for (var k = i + 1; k < cards.length; k += 1) { depth += cover[k]; }
      if (Math.abs(depth - last[i]) > 0.002) {
        last[i] = depth;
        cards[i].style.setProperty("--depth", depth.toFixed(3));
      }
    }
  };
```
Add this **before** the `measure();` call at the bottom (`window.addEventListener` goes after `update` is defined,
and `measure` calls `update`):
```js
  // A direct scroll handler, not requestAnimationFrame: rAF never runs in a tab
  // that isn't being composited (CLAUDE.md trap 4), and five rect reads per
  // scroll event are cheap.
  window.addEventListener("scroll", update, { passive: true });
```
(The `scale` shrinks from the top centre, so `getBoundingClientRect().top` of a card is unaffected by its own
transform — no feedback loop. Keep `transform-origin: 50% 0`.)

### Step 3 checks
- Scroll slowly through the deck at 1440×900 and **screenshot at ≥5 positions**; card 01 should visibly lean back,
  shrink and dim as 02 covers it; a thin strip of each buried card stays visible above the next. Scroll back up: it
  returns to flat (`--depth` back to `0.000`, i.e. no stuck state).
- Numeric assertion while scrolling down in steps: card 0's `--depth` is **monotonic non-decreasing**, is `0` before
  card 1 starts covering it, and reaches ≈ `4` by the time card 4 is pinned. The top card at rest is **exactly** on
  the container's left edge (`getBoundingClientRect().left` equals `.container` content-left).
- No layout shift: `.deck` height is identical before/after (`offsetHeight`).
- 390×844: same behaviour (smaller tilt via `--deck-tilt`), no overflow.
- Tune **only the tokens** (`--deck-tilt`, `--deck-shrink`, `--deck-dim`, `--deck-step`) if it looks wrong, not
  ad-hoc values in rules.
- Commit: `Services deck step 3: depth`.

---

## Step 4 — Entry motion inside each card

**Goal:** when a card first comes into view its contents arrive: numeral and text rise, title words rise out of a
mask, list items / pills stagger in, the ghost numeral fades up.

### 4a. CSS — append to section 10
All hidden start states live behind **`.deck--armed`**, a class the script adds itself, so if the script fails to
load nothing is ever hidden (deliberately *not* keyed to `.js`).

```css
/* Entry choreography. */
.deck-ghost,
.deck-main .index-num,
.deck-card .lead,
.deck-card .service-desc,
.deck-card .service-evidence,
.capability-list li{
  transition:
    opacity   var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
}
.capability-inline li{
  transition:
    border-color var(--dur) var(--ease),
    color        var(--dur) var(--ease),
    opacity      var(--dur-slow) var(--ease-out),
    transform    var(--dur-slow) var(--ease-out);
}
.deck--armed .deck-card:not(.is-in) .deck-ghost{ opacity: 0; transform: translateY(45%); }
.deck--armed .deck-card:not(.is-in) .index-num,
.deck--armed .deck-card:not(.is-in) .lead,
.deck--armed .deck-card:not(.is-in) .service-desc,
.deck--armed .deck-card:not(.is-in) .service-evidence{ opacity: 0; transform: translateY(var(--sp-4)); }
.deck--armed .deck-card:not(.is-in) .capability-list li{ opacity: 0; transform: translateX(calc(var(--sp-4) * -1)); }
.deck--armed .deck-card:not(.is-in) .capability-inline li{ opacity: 0; transform: translateY(var(--sp-3)); }

/* Title words rise out of a mask. .w / .w-i only exist after the script splits the h3. */
.w{ display: inline-block; overflow: hidden; vertical-align: top; padding: 0 .06em .12em 0; margin: 0 -.06em -.12em 0; }
.w-i{
  display: inline-block;
  transition: transform var(--dur-slow) var(--ease-out);
  transition-delay: calc(var(--stagger) * .5 * var(--w, 0));
}
.deck--armed .deck-card:not(.is-in) .w-i{ transform: translateY(110%); }

/* Stagger (document order) for list items and pills. */
.deck-card .capability-list li:nth-child(2), .deck-card .capability-inline li:nth-child(2){ transition-delay: calc(var(--stagger) * 1); }
.deck-card .capability-list li:nth-child(3), .deck-card .capability-inline li:nth-child(3){ transition-delay: calc(var(--stagger) * 2); }
.deck-card .capability-list li:nth-child(4){ transition-delay: calc(var(--stagger) * 3); }
.deck-card .capability-list li:nth-child(5){ transition-delay: calc(var(--stagger) * 4); }
```
(The stagger delays also apply to the pills' gold hover transition — if hover feels laggy, scope the delays to
`.deck-card:not(.is-in)` → `.is-in` only, or zero the delay once `.is-in` has settled. Check it.)

### 4b. JS — add above the pinning section (after `clamp01`)
```js
  /* ---------- Entry: each card's contents arrive once, as it comes into view ---------- */

  // Wrap every word of a heading in a mask + inner span so it can rise out of it.
  // Text is preserved (whitespace nodes stay between the words), <em> stays an <em>.
  var splitWords = function (root) {
    var n = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 1) { walk(child); return; }
        if (child.nodeType !== 3) { return; }
        var frag = document.createDocumentFragment();
        child.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (!part) { return; }
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var outer = document.createElement("span");
          var inner = document.createElement("span");
          outer.className = "w";
          inner.className = "w-i";
          inner.style.setProperty("--w", n);
          n += 1;
          inner.textContent = part;
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
        node.replaceChild(frag, child);
      });
    }(root));
  };

  if ("IntersectionObserver" in window) {
    cards.forEach(function (card) { splitWords(card.querySelector("h3")); });
    deck.classList.add("deck--armed");      // start states live behind this class

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    cards.forEach(function (card) { io.observe(card); });
  }
```
(No time-based "safety net" here on purpose — the deck sits far below the fold, so "nothing entered after 1.5 s"
is normal, and a blanket reveal would kill the effect. Without `IntersectionObserver` the deck is simply never
armed, so everything stays visible.)

Word masks change the h3 box slightly. That is already covered: this entry block sits above the final `measure();`
call in the file, so the split happens first and `measure()` sees the final heights (and it re-runs after
`document.fonts.ready`). Don't add another call.

### Step 4 checks
- Scroll down: each card's numeral/text/words/pills arrive once (not again on scroll-back). Words are **not**
  clipped: check descenders (p, y, g, q) and the italic overhang of "Experiences" in the h3s.
- `h3.textContent` of each card is **identical** to before (`"Invitation Experiences"`, `"Motion & Visuals"` …).
  Re-run the copy check against `before.txt`.
- Block the script (e.g. delete the `<script src="js/services-deck.js">` line in a scratch copy, or simulate a 404):
  the five cards are fully visible and unpinned. JS disabled: same.
- Reduced motion (DevTools rendering panel, or `page.emulateMedia({ reducedMotion: 'reduce' })`): no
  `.deck--pinned`, no `.deck--armed`, all visible, no transforms.
- Hover: pills still light gold on card hover with no sluggish delay.
- Commit: `Services deck step 4: entry motion`.

---

## Step 5 — Full QA, docs, stop

1. **Run `thaara-qa` in full:** every item in its section 1 across its whole viewport matrix, plus the section 2
   geometry sweep at 1440×900 and 390×844. (It encodes `CLAUDE.md`'s "Before reporting work complete": console 0
   errors, 0 failed requests, no horizontal overflow at 320px and 1920px, anchors clear the fixed header.) Also jump
   through the nav "Services" link and the "See this work" → `#work` link.
2. Viewports: 1920×1080, 1440×900, 1024×768, 768×1024, 390×844, 375×667, 320×568. Screenshots of the deck at
   start / mid / end of the scroll at 1440 and 390 for the report.
3. Cold cache: a fresh port (`py -m http.server 4191`), hard reload, re-run the pinned geometry check.
4. Reduced motion, JS-off, script-blocked: clean static stack (Step 4 checks).
5. Performance sanity: scroll the deck with the Performance panel; no long tasks from `update()`; it should be
   sub-millisecond per call. Page weight: only `js/services-deck.js` (~4 KB) added; no images, no libraries.
6. `git diff main --stat` touches only: `index.html`, `styles.css`, `js/services-deck.js`,
   `THAARA_CHANGELOG.md`, `SERVICES_DECK_PLAN.md` (and `CLAUDE.md` if you add the note below).
7. **`THAARA_CHANGELOG.md`:** add an entry at the top, newest first, same format as the others:
   `## 2026-10-01 — Services section: stacking deck · Important` with **Issue** (owner asked to make Services livelier
   with 3D/scroll effects), **Change**, **Files**, **Reason**, **Verified**. State explicitly: no copy changed; the
   approved exception to "no parallax / transform-opacity only" is scoped to this section; `script.js` untouched;
   one new file `js/services-deck.js`; pinned only when cards fit; reduced-motion/JS-off fall back to a plain stack.
8. **`CLAUDE.md`:** add **one** short bullet under "Design system" → Motion: "Exception (2026-10-01, owner-approved):
   the Services deck uses scroll-linked 3D depth (`js/services-deck.js`); everywhere else the rule stands." Keep it
   to that — `hero-envelope`'s `CLAUDE.md` has other edits, so a bigger change risks a merge conflict.
9. Commit: `Services deck step 5: QA and docs`. **Do not push.** Report (what changed, screenshots, the measured
   checks) and **stop**. Don't volunteer further redesigns.

### Merging later (owner's call, not yours)
`git merge services-motion` into `hero-envelope` (or `main`). Expected conflicts: only `THAARA_CHANGELOG.md` and
maybe `CLAUDE.md` (both sides add entries near the top) — resolve by keeping both. The Services markup is identical
on both branches, so `index.html`/`styles.css` should merge cleanly.

---

## Stop and ask if

- the sticky probe still fails after the one `overflow-x: clip` fix;
- you need to change any copy, `script.js`, the contact form, JSON-LD, or an image;
- you feel you need a library (GSAP/Three/anything) or a build step;
- a card's bottom can't be made reachable at 390×844 with the fixed CTA bar;
- LCP / page weight visibly worsens, or `js/services-deck.js` grows past ~150 lines;
- the look is off in a way tokens can't fix (describe it with a screenshot instead of guessing).

## Out of scope (don't build, just know it exists)

- The "Deck + 3D object" idea (a sticky WebGL object that morphs per discipline, reusing the vendored Three.js and
  `js/envelope/boot.js`'s lazy gate). The deck markup leaves room for it later; don't build it now.
- Cursor tilt, parallax, horizontal scroll-jacking, sound, any other section's animation.
- The pre-existing oddities in Section 1 ("Things noticed") — mention them in your report only if you confirm one.

## Progress

- Step A done: worktree D:\Thaara-services on services-motion; skill thaara-qa loads.
- Step 0 done: baseline on services-motion @ d0ddc00 served at http://localhost:4192 (4190 in use); viewport 1000x700 (no viewport-resize tool, matrix viewports not set); console 0 warn/err, network 0 failed / 0 non-200 (10 reqs); body overflow-x hidden, html visible; copy saved to scratch before.txt (1131 chars); screenshots not taken (no visible desktop window for capture).
- Step 1 done: deck markup + static card CSS; copy equal main 1131 = worktree 1131 (node-verified, ghost-stripped); left edge aligned (418.5 = 418.5 @1936w); anchor #services clears header (nav 85, head 826); console 0, network 0 failed incl. js/services-deck.js placeholder 200. Not verified: 320/390/768/1024/1440 viewports (no resize tool), live pill hover (rule present in CSS, normal-state computed style sane), screenshots (no visible window).
- Step 2 done: pinning + fit check on http://localhost:4193 @1936x1246: deck--pinned, sticky tops 108/120/132/144/156; sweep scroll sticks (card tops never above stick-1, no overflow fix needed); stack leaves together (#why 128px after deck); offsetHeight pinned = unpinned = 2074; anchor clears (nav 85, head 257); copy 1131 = before.txt; console 0, network 0 failed, services-deck.js 200. Not verified: 390/375/320 pinned-or-stack behaviour (no viewport-resize tool), live Tab ring (link focusable, :focus-visible rule untouched; programmatic focus doesn't paint :focus-visible in a background tab), screenshots.
- Step 3 done: depth on http://localhost:4194 @1936x1246. Background tab dispatches no scroll events (trap-4 family), so the sweep scrolls + dispatches a synthetic scroll per step (exercises the real handler end to end). depth0 0 -> 4 exactly, monotonic maxDrop 0; mid [2.539,1.539,0.539,0,0], end [4,3,2,1,0]; sticks hold at 108/120/132/144/156 even while transformed (no feedback loop); reverse sweep back to all-0 at rest; left edge exact at rest (418.5 = 418.5); veil clamps at 0.7; offsetHeight 2074 = 2074; copy 1131; console 0, network 0 failed. Lean-back sign by rotation math (negative rotateX about the top edge puts the bottom away), not eyeballed. Not verified: 390 behaviour, screenshots, visual lean direction on a real screen.
