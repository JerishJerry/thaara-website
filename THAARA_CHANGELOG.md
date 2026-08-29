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
