# Hero envelope flight: build plan

**For the OpenCode build agent.** Read this whole file, and `CLAUDE.md`, before you touch anything.

## How to work

- **One step at a time.** When a step is done:
  1. Run its checks.
  2. Commit.
  3. Add one line under **Progress** at the bottom.
  4. Report, and wait before starting the next step.
- If the code doesn't match this file, or something is unclear, stop and ask. Don't guess.
- **Branch:** create `hero-envelope` from `3d-redesign`, which already has `vendor/` and `prototype/`.
  Never push, and never touch `main`. Pushing `main` deploys the live site.

## Owner approval

The owner approved this build. For this task only, it overrides two CLAUDE.md rules:

- "Phase 6 is a feedback-driven phase, not a build phase."
- "Stack: do not change it." The vendored three.js and GSAP in `vendor/` get loaded lazily by the
  live page. There is still **no build step, no `package.json`, no `npm install`**.

Every other CLAUDE.md rule still applies.

## What we're building (locked by the owner)

- **Placement:** the envelope replaces the invitation `<picture>` in the hero's `.hero-visual` slot
  (`index.html:173`).
- **Path:** hero → 01 Nivin × Dhiya → 02 Leo Ronald × Asnia → back to the static hero.
- **Scroll:** locked for the whole flight.
- **Replay:** on every click, and every replay is identical to the first.

## Decisions filled in for you (the owner can change these)

1. **The flight plays in a full-screen overlay.** Scroll is locked, so the page never actually scrolls
   to `#work`. The overlay sits above the page. "01" and "02" mean those projects' visuals, shown
   large: the Nivin × Dhiya card and the Leo × Asnia phone. On landing, the overlay shrinks back into
   the slot and the page is exactly where it was.
2. **No text during the flight.** The page copy stays in the DOM, untouched.
3. **No post-processing (bloom) and no 3D gold dust** in this build. Transparency plus bloom is
   fragile, and the hero already has CSS dust.
4. **The flight runs about 8 s**, with every duration in one config object.
5. **Esc does nothing**, because the owner asked for a full lock. Worth considering: Esc skips to the
   landing.

## Rules that matter most here

- **No new copy.** The only new text is the button label **"Open the envelope"**.
- **Don't change:**
  - copy, alt text or headings
  - the JSON-LD (`index.html:63–99`)
  - `script.js` (not at all), `404.html` or the contact form
- **Colours** come only from the CSS custom properties in `styles.css` section 01, read at runtime.
  - No hex values in JS.
  - Only opaque tokens go into `THREE.Color`; rgba tokens log a console warning.
- **DOM motion:** transform/opacity only.
- **The hero `<img>` is the LCP element.** Don't change its markup, `fetchpriority` or loading.
  Hide it only with `opacity: 0`, never `display: none`, so its layout box and alt text stay.
- **CLAUDE.md traps:**
  - `[hidden]` loses to `display` rules.
  - Dev servers send 304s and serve stale files.
  - Background browser panes report a 0×0 viewport.

## Map of the existing code

**index.html**

| Line | What's there |
|---|---|
| 58 | inline script adding the `js` class; the import map goes right after it |
| 145 | `<section class="hero">` |
| 173–186 | `.hero-visual` with the `<picture>` (the LCP image) |
| 739 | `<script src="script.js" defer></script>` |

**styles.css**

| Line | What's there |
|---|---|
| 25–110 | section 01, the tokens (colours, `--dur`, `--ease`, `--radius` and the rest) |
| 417–452 | `.reveal` and the hero overture (the slot fades in through `.reveal`) |
| 454–467 | reduced motion |
| 701 | `.hero` |
| 731–739 | `.hero-visual picture` and `.hero-visual img` |
| 1634 | NARROW-VIEWPORT REFINEMENTS, the last section. Add section 16 after it, and list it in the contents at the top of the file. |

z-index values already in use: grain 1, sticky CTA 90, header 100, mobile menu 110, menu toggle 120,
skip link 200.

**script.js: don't edit it.** The hero overture (115–132) and the sticky CTA with the dust pause
(454–492) must keep working.

**prototype/proto.js** is the approved look. **Copy the code you need from it; never import it.**

| Line | What's there |
|---|---|
| 60 | tokens |
| 68 | envelope geometry |
| 103 | phone constants |
| 131 | math (`rng`, `invNeutral`) |
| 183–538 | procedural textures (`makeCanvas` … `makeWaxCap`, `traceTri`, `contactShadow`) |
| 679 | boot helpers (`goStatic`, `hasWebGL2`) |
| 895 · 920 · 977 · 983 | renderer · assets · colours · scene |
| 1000 · 1117 · 1273 | materials · envelope · card |
| 1279–1388 | phone |
| 1652 | lights |
| 1748–1950 | framing (`fit`, `mixFrame`, `restBox`, `fitTilted`, `layout`, `resize`) |
| 1951–2092 | timeline (opening, scene 2, fold-back) |
| 2104 | `update()`, the only writer of transforms (fold-back ~2110, beckon ~2137) |
| ~2492 | inputs: the entry gate |
| ~2526–2537 | scroll lock and key filter |
| ~2538 | pointer pick with an 8px drag guard |
| 2636 | loop (`guard`, `frame`) |

Search for `trueColour` and `DECODE_VIDEO_TEXTURE` in proto.js. These are the colour-accuracy fixes
for the card and the phone screen. Keep both exactly as they are.

**Assets:**
- `invitation-1624.webp`: the card
- `leo-asnia-scroll.mp4`: 14.4 s, 1.5 MB
- `leo-asnia-1200.webp`: the video's poster
- `logo-256.png`: the seal
- the libraries in `vendor/`

## Files to create

- `js/envelope/boot.js`, which stays small: the capability gate and the lazy load.
- `js/envelope/envelope.js`, which holds everything else:
  - Keep proto.js's section order: tokens, textures, renderer, materials, envelope, card, phone,
    lights, framing, timeline, update, inputs, loop.
  - Put it all inside one `start()` function, like proto.js `boot()`.
  - Resolve paths from the module, e.g. `new URL('../../invitation-1624.webp', import.meta.url)`.
- `styles.css` section 16, "ENVELOPE".

## Key technique: the slot window (it makes the start and the landing pixel-exact)

Use one renderer and one canvas.

**At rest**, the canvas lives inside `.envelope-stage`, absolutely positioned to fill the slot, so it
scrolls natively with the page. The camera frames the closed envelope inside the slot.

**Starting the flight**, do all of this in the same JS task so nothing flashes:
1. Move the canvas to `document.body`. Moving a canvas keeps its WebGL context.
2. Add `.envelope-canvas--flight`: fixed, full viewport, z-index 95 (above the sticky CTA, below the
   header).
3. `renderer.setSize(innerWidth, innerHeight)`.
4. Render.

**The first full-screen frame must look identical to the slot render.** Keep the rest camera, and use
`setViewOffset` with a "window" that lerps from the slot rectangle to the viewport:

```js
// s = .hero-visual getBoundingClientRect() taken at flight start; w = the expand value, 0..1
const vw = innerWidth, vh = innerHeight;
const fw = lerp(s.width, vw, w), fh = lerp(s.height, vh, w);
camera.aspect = fw / fh;
camera.setViewOffset(fw, fh, lerp(-s.left, 0, w), lerp(-s.top, 0, w), vw, vh);
camera.updateProjectionMatrix();
```

- At `w = 0` the envelope appears exactly where it was in the slot.
- At `w = 1` it is a normal full-screen render.
- For landing, bring `w` back to 0 with the scene in its rest pose. Then, in one task: move the canvas
  back into the slot, `setSize` to the slot, `camera.clearViewOffset()`, and render.

**The backdrop:** create the renderer with `alpha: true` and animate
`renderer.setClearColor(<--bg token>, backdrop)`. It's 0 at rest, rises to about 0.92 during the
flight, and returns to 0 on landing.

## Steps

### Step 1: mount point (markup and CSS only, no behaviour)

1. In `index.html`, right after line 58, add the import map:
   ```html
   <script type="importmap">{"imports":{"three":"./vendor/three/three.module.min.js","three/addons/":"./vendor/three/addons/"}}</script>
   ```
2. Inside `.hero-visual`, after `</picture>`:
   ```html
   <div class="envelope-stage" aria-hidden="true"></div>
   <button class="envelope-open" id="envelopeOpen" type="button" hidden>Open the envelope</button>
   ```
3. After `<script src="script.js" defer></script>`, add
   `<script type="module" src="js/envelope/boot.js"></script>`. Create `js/envelope/boot.js`
   containing only a header comment.
4. In `styles.css` section 16:
   - `.hero-visual { position: relative; }`
   - `.envelope-stage { position: absolute; inset: 0; pointer-events: none; }`
   - `.envelope-open`: visually hidden (1×1px, `clip-path: inset(50%)`, `overflow: hidden`,
     `white-space: nowrap`), like `.enter-proxy` in `prototype/proto.css`.
   - A keyboard focus ring on the slot:
     `.hero-visual:has(.envelope-open:focus-visible) { outline: 2px solid var(--gold); outline-offset: 3px; border-radius: var(--radius); }`

**Don't** touch the `<picture>`, the `reveal` class, or anything else in the hero.

**Done when:**
- With JS and without JS, the hero looks identical to before (screenshot diff at 1440×900 and
  390×844).
- `boot.js` loads with a 200.
- 0 console errors.

### Step 2: lazy boot and a safe fallback (nothing visible changes yet)

In `boot.js`:

1. Do nothing at all, leaving the page exactly as it is, if any of these is true:
   - `prefers-reduced-motion: reduce`
   - no WebGL2 (`document.createElement('canvas').getContext('webgl2')` returns null)
   - `navigator.connection?.saveData` is set
   - the URL has `?static`
2. Otherwise, load once, on whichever comes first:
   - `requestIdleCallback` after the `load` event (timeout 2000; `setTimeout` as fallback)
   - the first `pointerenter` on `.hero-visual`
3. Load GSAP by adding a script tag for `new URL('../../vendor/gsap/gsap.min.js', import.meta.url)`
   and waiting for its load event. Then run
   `const m = await import('./envelope.js'); await m.start();`.
4. Wrap it all in try/catch. On any failure: log one `console.warn` (never `console.error`), remove
   the canvas if one was created, and leave the page untouched.

In `envelope.js`, for this step only: create the renderer, with an `aria-hidden` canvas inside
`.envelope-stage`, and render one transparent frame. **Don't hide the picture yet.**

**Done when:**
- The three.js and GSAP requests start after the `load` event. Compare
  `performance.getEntriesByType('resource')` start times with the navigation entry's `loadEventEnd`.
- The LCP entry's element is still the hero `<img>`.
- `?static`, emulated reduced motion and a blocked WebGL2 each leave: no canvas, no three.js
  requests, 0 console errors.
- A normal load creates the canvas with 0 console errors, and the page looks unchanged.

### Step 3: the envelope at rest

1. Copy into `envelope.js` from proto.js: tokens, math, textures, materials, envelope, card and
   lights (see the map above).
   - Tokens: use the same names from `styles.css` `:root`. If one the prototype uses doesn't exist
     there, stop and ask.
   - Don't port the loader, the intro, the scroll track, the DOM text beats, or scenes 3–8.
2. Frame the closed envelope to fill the slot, with the same footprint as the static invitation
   image. Use proto.js `fit()` with the slot's width and height.
3. Idle motion: the prototype's beckon lean and float, as 3D transforms only.
4. Card texture: `invitation-1624.webp`, loaded during boot (after page load).
5. Render only while `.hero` is on screen (IntersectionObserver) and the tab is visible. Put a
   `ResizeObserver` on `.hero-visual` that resizes the renderer and camera.
6. Quality: desktop uses a pixel ratio up to 2 with antialias; coarse pointers use a pixel ratio up to
   1.5.
7. After the first envelope frame renders:
   - add `envelope-ready` to `<html>`
   - remove `hidden` from `#envelopeOpen`
   - CSS: `.envelope-ready .hero-visual img { opacity: 0; transition: opacity var(--dur) var(--ease); }`
8. Add the `?debug` hook (see below).

**Done when:**
- At 1440×900 and 390×844, the closed envelope sits in the slot where the image was, in the same
  size and place.
- These boxes are identical to before (`getBoundingClientRect`): `.hero-visual`, the `h1`, and both
  hero buttons.
- 0 console errors.

### Step 4: trigger, scroll lock and replay guard (with a stub flight)

1. The flight starts on either:
   - a click or tap on `.hero-visual`, using `pointerup`, and ignored if the pointer moved more than
     8px since `pointerdown` (as at proto.js ~2538)
   - a click on `#envelopeOpen` (Enter and Space work, because it's a button)
2. If a flight is already running, ignore the click.
3. Lock scrolling by adding `envelope-lock` to `<html>`:
   - CSS: `html.envelope-lock { overflow: hidden; scrollbar-gutter: stable; }`. The gutter stops the
     page jumping sideways when the scrollbar disappears.
   - Swallow `wheel` and `touchmove` on `window` (`{ passive: false }` with `preventDefault`).
   - Swallow the keys Space, ArrowUp, ArrowDown, PageUp, PageDown, Home and End, except when the
     event target is INPUT, TEXTAREA, SELECT, BUTTON or A. This is the same filter as proto.js ~2529.
   - Record `scrollY` at the start, and restore it if it has drifted.
4. The stub flight is a 1.2 s GSAP tween: the envelope lifts, then returns. When it completes, unlock
   and focus `#envelopeOpen` with `{ preventScroll: true }`.

**Done when** (all checked automatically):
- During the stub, wheel, PageDown, Space and a touch swipe leave `scrollY` unchanged. Afterwards the
  wheel scrolls again.
- A double-click mid-flight doesn't start a second flight.
- Three clicks in a row each run the stub completely.
- Focus ends on `#envelopeOpen`.
- The lock causes no sideways shift: the hero `h1`'s x-position doesn't change.
- 0 console errors.

### Step 5: the flight

1. Copy the phone from proto.js (1279–1388).
   - Its screen plays `leo-asnia-scroll.mp4` (muted, `playsinline`, looping), loaded through a blob
     URL as the prototype does.
   - Its poster and fallback is `leo-asnia-1200.webp`.
   - Start fetching the video on the first `pointerenter` or focus on the slot, or at flight start,
     whichever comes first. Show the poster until the video plays.
2. Build one GSAP timeline. It stays paused and is played by its own clock (`tl.restart()`), not by
   scroll. Put every duration in one object:
   ```js
   const BEATS = { expand: 0.8, pushPast: 0.6, work01: 1.8, work02: 2.2, flapCard: 1.2, foldBack: 1.2 }; // about 7.8 s
   ```

   | Beat | What happens |
   |---|---|
   | `expand` | The canvas switches to flight mode and `w` goes 0 → 1: the envelope grows out of the slot, and the backdrop starts fading in. |
   | `pushPast` | The envelope moves across the hero copy toward the centre and turns to face the camera (prototype `S.dolly`). The backdrop reaches about 0.92. |
   | `work01` | The flap opens, light spills out, and the Nivin × Dhiya card rises and fills the frame (prototype `S.open`, `S.slide`, `S.push`). A short hold. |
   | `work02` | The card eases aside and the phone turns to face the camera with the recording playing (prototype `S2.leave`, `S2.travel`, `S2.turn`). A short hold. |
   | `flapCard` | The phone and card go back into the envelope and the flap closes (prototype fold-back, `SF.back` 0 → 1). |
   | `foldBack` | The envelope returns to its rest pose, `w` goes 1 → 0, and the backdrop fades to 0. The last frame is the rest frame. |

   - Reuse the prototype's state objects (`S`, `S2`, `SF`) and its `update()` mapping, driven by this
     timeline instead of scroll.
   - Add `W` (the window value `w`) and `B` (the backdrop value).
3. Framing during the flight: use proto.js `fit`, `mixFrame` and `fitTilted` at the viewport size.
   - proto.js `layout()` reads the prototype's DOM text boxes to leave room for text. There's no text
     here, so compute each frame from the viewport alone, minus the header height.
   - The phone is framed in the centre.
4. Landing:
   1. Set `S`, `S2` and `SF` to their rest values. The fold-back pose already matches rest, so this is
      invisible.
   2. Pause the video.
   3. Switch the canvas back into the slot in one task (see the slot window).
   4. Unlock, and focus `#envelopeOpen`.

**Done when:**
- Screenshots of every beat (via the debug hook) at 1440×900 and 390×844 show:
  - no gaps between the flaps
  - no z-fighting
  - a true-colour card and phone screen
  - nothing cut off
- The first flight frame and the last flight frame each match the rest frame: under 0.5% of pixels
  differ by more than 8/255.
- 0 console errors and 0 failed requests.

### Step 6: every replay identical

Every click resets everything before playing:
- kill and rebuild the timeline
- reset every state object to its rest value
- `video.pause()` and `video.currentTime = 0`
- set `W` and `B` to 0

The Nth click must be identical to the first.

**Done when:**
- Three flights run in a row. Screenshots at timeline progress 0.2, 0.5, 0.8 and 1.0 match across
  the three runs, using the same threshold as step 5.
- `renderer.info.memory` geometries and textures don't grow after the first run.
- The page is still at the same scroll position.

### Step 7: final checks and docs

**Checks:**
- 1440×900 and 390×844, plus a look at 768×1024 and 1920×1080.
- No horizontal overflow at 320 and 1920.
- Emulated reduced motion, `?static`, blocked WebGL2 and JS disabled each give: the static picture,
  no canvas, no three.js requests.
- 0 console errors or warnings, and 0 failed requests.
- LCP: the element is the hero `<img>`, and its time is no more than 10% worse than `main`'s. Measure
  with a cold cache, a fresh browser and the same server.
- Every nav anchor still lands with its heading clear of the fixed header.
- The contact form behaves exactly as before. You haven't touched it.

**Docs:**
- `THAARA_CHANGELOG.md`: a new entry with Issue / Change / Files / Reason.
- `CLAUDE.md`:
  - In "Stack", note that vendored three.js and GSAP are loaded lazily, for the hero envelope only,
    with no build step and no `package.json`.
  - Update "Where the project currently stands".

Commit. **Never push.**

## Debug hook (the checks need it)

Only when the URL has `?debug`:

```js
window.__envelope = {
  ready,            // Promise: resolves after the first rest frame
  state(),          // { mode: "rest" | "flight", locked, flying, progress, scrollY }
  setTime(seconds), // freezes idle motion at this time
  seek(p),          // moves the flight timeline to progress 0..1 and renders; plays nothing
  duration          // flight length in seconds
};
```

With `?debug`, idle motion must follow `setTime` instead of the wall clock, so screenshots are
repeatable.

## Testing tips (learned on this project)

- **Headless Chrome renders WebGL in software (SwiftShader).** A frame can take over half a second.
  GSAP's default lag smoothing then makes a 1.4 s tween take about 30 s, so tests look stuck. In
  tests, call `gsap.ticker.lagSmoothing(0)` or use `seek()`. Don't judge frame rate in headless.
- **Use a fresh browser for every test run.**
- **Serve with `node .claude/serve.mjs` and env `PORT=4190`.** It sends no-cache headers and correct
  MIME types; other servers may send 304s and run stale files.
- **The Puppeteer harness**, with puppeteer-core and pngjs installed:
  - folder: `C:\Users\jeris\AppData\Local\Temp\claude\D--Thaara\e633b6ef-59e4-44be-8c5c-02c17899c07a\scratchpad\harness`
  - Chrome: `C:/Program Files/Google/Chrome/Application/chrome.exe`
  - args: `--use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars --force-color-profile=srgb`
- **Check `window.innerWidth > 0`** before trusting any geometry.
- **PowerShell 5.1:** no `&&`; quote any argument containing `#`; for multi-line commit messages, use
  `git commit -F <file>`.

## Stop and ask if

- a colour token you need isn't in `styles.css`
- the rest frame can't match the static image's footprint
- LCP gets worse
- anything would need changes to copy, the form, `script.js` or `main`

## Progress

- (nothing yet)
- Step 1 done: mount point only (import map, `.envelope-stage` + hidden `#envelopeOpen` in `.hero-visual`, `boot.js` comment stub, styles.css section 16). Frozen hero 0 rows differ with/without JS at 1440x900 and 390x844; `boot.js` 200; 0 console errors.
- Step 2 done: lazy boot (gate: reduced-motion/WebGL2/saveData/?static; load after `load` via idle-handle-or-hover; GSAP script tag then `envelope.js`) + transparent renderer frame in slot. Libs start after load (719/727/730 > loadEventEnd 499); LCP still hero IMG; ?static/reduced/no-WebGL2 = no canvas, no lib reqs; frozen hero 0 rows differ (390 needed em-overture freeze; old baseline had caught it mid-fade).
