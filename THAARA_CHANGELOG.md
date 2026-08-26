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
