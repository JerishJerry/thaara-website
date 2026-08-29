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

**Not yet confirmed:** end-to-end delivery to the owner's inbox — that needs a real submission.

---

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
