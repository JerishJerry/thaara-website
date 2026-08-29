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
