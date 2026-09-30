/* ============================================================
   THAARA prototype: "The invitation opens"

   One full-screen WebGL scene. Scrolling drives a paused GSAP timeline that
   tweens two things only: the plain `S` object (normalized 0..1 params) and
   the DOM text beats. The render loop is the only writer of scene transforms:
   it maps `S` to positions and rotations with viewport-aware framing math,
   recomputed on resize.

    Scene 2 (timeline 1..1.8): the settled card eases aside and the camera
    travels to a phone showing the live Leo Ronald x Asnia invitation, a looping
    screen recording of the real site.

    Scene 3 (timeline 1.8..2.6): the phone eases aside and the camera
    travels to a material library - five tablets, one per discipline -
    dollying along the arc as each beat arrives.

    Scene 4 (timeline 2.6..3.3): the arc sinks away and the camera rises
    to four gold rings, one per principle, turning slowly as each beat arrives.

    Scene 5 (timeline 3.3..4.0): the rings rise away and the camera
    travels forward through four portal stations joined by a gold path.

    Scene 6 (timeline 4.0..4.7): the stations sink away and the camera
    glides on to a warm lit doorway, settling facing the light.

    Scene 7 (timeline 4.7..5.4): a floating invitation card drifts before
    the door; the camera settles on the card with the light behind it.

    Scene 8 (timeline 5.4..TOTAL): the card drifts ahead into the lit opening
    and the camera follows to the threshold, settling inside the warmth.

   ?capture   no loop, no loader, no intro; exposes window.__proto for
              deterministic frame capture (verification and video);
              renderFrame(progress, seconds, videoTime?) also seeks the
              phone's screen video and waits for the frame
   ?static    force the static fallback
   ============================================================ */

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAPass } from "three/addons/postprocessing/FXAAPass.js";

window.__protoBooted = true;

const root = document.documentElement;
const params = new URLSearchParams(location.search);
const CAPTURE = params.has("capture");
const FORCE_STATIC = params.has("static");
const ASSETS = window.PROTO_ASSETS || {};
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const COARSE = matchMedia("(pointer: coarse)").matches;
const FINE = matchMedia("(pointer: fine)").matches;

/* ---- Brand tokens, read from proto.css (no colour literals in JS) ---- */
const css = getComputedStyle(root);
const TOK = {};
for (const n of ["bg", "bg-alt", "bg-soft", "bg-raise", "ink", "ink-dim", "ink-faint", "gold", "gold-lift", "on-gold"]) {
  TOK[n] = css.getPropertyValue("--" + n).trim();
}
const col = (name) => new THREE.Color(TOK[name]); // sRGB hex -> linear working colour

/* ---- Envelope geometry (world units) ---- */
const W = 3.4, H = 2.3, HW = W / 2, HH = H / 2;
const CARD_W = 3.08, CARD_H = 1.838, CARD_T = 0.008, CARD_ASPECT = CARD_W / CARD_H;
const SIDE_APEX = 0.14;     // side flap apexes at x = +-0.14, y = 0
const BOTTOM_APEX = 0.18;   // bottom flap apex at y = +0.18
const TOP_APEX = -0.18;     // top flap apex at y = -0.18
const Z_BACK = 0.005;       // front face of the back panel (the liner)
const Z_GLOW = 0.0065;      // light spill, between the liner and the card
const Z_CARD = 0.012;
const Z_SIDE_SHADOW = 0.019;
const Z_SIDE = 0.022;
const Z_BOTTOM_SHADOW = 0.024;
const Z_BOTTOM = 0.026;
const Z_TOP_SHADOW = 0.028;
const Z_TOP = 0.03;         // top flap hinge (closed)
const Z_TOP_OPEN = 0.006;   // hinge rolls back as the flap opens so the card rises in front of it
const FLAP_OPEN = -3.26;    // rad; just past flat, so the open flap leans back behind the card
const SLIDE_UP = 1.27;      // the card rises half out of the envelope
const REST = { rx: 0.22, ry: -0.38, rz: -0.06 };
const FOV = 35;
/* Light balance. Lit paper sits near 0.5 linear so only metal highlights and
   the light spill cross the bloom threshold. */
const LIGHT = {
  env: 0.24,         // RoomEnvironment PMREM
  key: 5.6,          // warm raking key, upper-left-front
  pool: [3.0, 0.58], // key falloff across the subject: radius, floor
  rim: 30,           // gold rim, behind-right
  hemi: 0.16,        // low fill
  inner: 0.5,        // warm point light inside the envelope (x open)
  glow: 1.35,        // additive spill over the liner
  plume: 1.05,       // additive plume above the open throat
  bloom: [0.3, 0.45, 0.42, 0.86], // base strength, extra when open, radius, threshold
};
const VH1 = 2 * Math.tan((FOV * Math.PI) / 360); // visible height per unit distance

/* ---- Scene 2: the phone (world units). The screen matches the recording's
   frame, a 390x844 phone viewport. ---- */
const SCREEN_ASPECT = 720 / 1558;
const PH_W = 1.22, PH_D = 0.13, PH_BEZEL = 0.052, PH_R = 0.17, PH_BEVEL = 0.03;
const PH_SW = PH_W - 2 * PH_BEZEL, PH_SH = PH_SW / SCREEN_ASPECT, PH_H = PH_SH + 2 * PH_BEZEL;
const PHONE_AT = { x: 5.6, y: 1.43, z: -0.4 };       // the settled card sits at (0, 1.43, 0.86)
const PH_REST = { rx: 0.08, ry: -0.74, rz: -0.03 };  // three-quarter view, screen toward the text
/* ---- Product depot: everything after the opening derives from this list.
   Product 01 is the letter itself (fixed opening 0..1, never shifts).
   Products 02..N take 0.8 slices from P2 on; the fold leg, S3 and every
   later scene start, plus TOTAL, follow automatically.
   To add product 03: append { id: "p3", len: 0.8 } (+ beats markup, bespoke
   3D, move the previous product's exits to the new slice start, and +280vh
   on the .track fallback in proto.css). S3.travel is deliberately delayed
   past the fold release so the pull-back starts from clear space. ---- */
const PRODUCTS = [
  { id: "p1", len: 1.0 },
  { id: "p2", len: 0.8 },
];
const P2 = 1.0;
const FOLD = 0.7; // fold-back leg: products return to the envelope, P_END..O3
const P_END = +(P2 + PRODUCTS.slice(1).reduce((n, p) => n + p.len, 0)).toFixed(2); // products end: 1.8
const O3 = +(P_END + FOLD).toFixed(2);
const O4 = +(O3 + 0.8).toFixed(2), O5 = +(O4 + 0.7).toFixed(2), O6 = +(O5 + 0.7).toFixed(2),
  O7 = +(O6 + 0.7).toFixed(2), O8 = +(O7 + 0.7).toFixed(2);
const TOTAL = +(O8 + 0.7).toFixed(2); // 6.8 today
const TP = (b, o) => +(b + o).toFixed(2); // timeline position: exact decimals, no float drift

/* ---- Small math ---- */
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 1831565813) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* The final OutputPass applies Khronos PBR Neutral tone mapping. This is its exact
   inverse (toe and shoulder). Feeding a colour through it first means the tone
   mapper hands back the original value, so the backdrop lands on --bg and the
   card lands on the photo's own pixels. */
function invNeutral(c) {
  let r = Math.min(c.r, 0.996), g = Math.min(c.g, 0.996), b = Math.min(c.b, 0.996);
  const np = Math.max(r, g, b);
  if (np >= 0.76) {
    const peak = 0.0576 / (1 - np) + 0.52;
    const k = 1 - 1 / (0.15 * (peak - np) + 1);
    const s = peak / np;
    r = Math.max(0, ((r - k * np) / (1 - k)) * s);
    g = Math.max(0, ((g - k * np) / (1 - k)) * s);
    b = Math.max(0, ((b - k * np) / (1 - k)) * s);
  }
  const m = Math.min(r, g, b);
  const off = m >= 0.04 ? 0.04 : 0.4 * Math.sqrt(Math.max(m, 0)) - m;
  return new THREE.Color(r + off, g + off, b + off);
}
const INV_NEUTRAL_GLSL = /* glsl */ `
vec3 invNeutral( vec3 o ) {
  vec3 c = clamp( o, 0.0, 0.996 );
  float np = max( c.r, max( c.g, c.b ) );
  if ( np >= 0.76 ) {
    float peak = 0.0576 / ( 1.0 - np ) + 0.52;
    float k = 1.0 - 1.0 / ( 0.15 * ( peak - np ) + 1.0 );
    c = max( ( c - k * np ) / ( 1.0 - k ) * ( peak / np ), 0.0 );
  }
  float m = min( c.r, min( c.g, c.b ) );
  float off = m >= 0.04 ? 0.04 : 0.4 * sqrt( max( m, 0.0 ) ) - m;
  return c + off;
}`;

/* ============================================================
   Procedural PBR maps (the Substance approach, generated on canvases)
   baseColor in sRGB, data maps linear; normals from height by finite
   differences, OpenGL convention (+Y up).
   ============================================================ */

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function canvasTex(cv, srgb, aniso, repeat) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
  }
  t.anisotropy = aniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

// Tileable value noise, smoothstep-interpolated.
function noiseTile(size, period, rnd) {
  const lat = new Float32Array(period * period);
  for (let i = 0; i < lat.length; i++) lat[i] = rnd();
  const out = new Float32Array(size * size);
  const s = period / size;
  for (let y = 0; y < size; y++) {
    const fy = y * s, iy = fy | 0, ty = fy - iy, sy = ty * ty * (3 - 2 * ty);
    const r0 = (iy % period) * period, r1 = ((iy + 1) % period) * period;
    const row = y * size;
    for (let x = 0; x < size; x++) {
      const fx = x * s, ix = fx | 0, tx = fx - ix, sx = tx * tx * (3 - 2 * tx);
      const c0 = ix % period, c1 = (ix + 1) % period;
      const a = lat[r0 + c0], b = lat[r0 + c1], c = lat[r1 + c0], d = lat[r1 + c1];
      const top = a + (b - a) * sx, bot = c + (d - c) * sx;
      out[row + x] = top + (bot - top) * sy;
    }
  }
  return out;
}

function fbm(size, period, octaves, rnd, gain = 0.5) {
  const out = new Float32Array(size * size);
  let amp = 1, norm = 0, p = period;
  for (let o = 0; o < octaves && p <= size; o++, p *= 2) {
    const n = noiseTile(size, p, rnd);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    norm += amp;
    amp *= gain;
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

// Separable running-sum box blur, in place.
function boxBlur(src, size, radius, wrap) {
  const tmp = new Float32Array(src.length);
  const inv = 1 / (radius * 2 + 1);
  const idx = wrap ? (i) => ((i % size) + size) % size : (i) => (i < 0 ? 0 : i >= size ? size - 1 : i);
  for (let y = 0; y < size; y++) {
    const row = y * size;
    let acc = 0;
    for (let k = -radius; k <= radius; k++) acc += src[row + idx(k)];
    for (let x = 0; x < size; x++) {
      tmp[row + x] = acc * inv;
      acc += src[row + idx(x + radius + 1)] - src[row + idx(x - radius)];
    }
  }
  for (let x = 0; x < size; x++) {
    let acc = 0;
    for (let k = -radius; k <= radius; k++) acc += tmp[idx(k) * size + x];
    for (let y = 0; y < size; y++) {
      src[y * size + x] = acc * inv;
      acc += tmp[idx(y + radius + 1) * size + x] - tmp[idx(y - radius) * size + x];
    }
  }
  return src;
}

// Height field -> tangent-space normal map. The canvas is uploaded with flipY, so
// canvas-down is -v: n = (-dh/du, -dh/dv, 1) = (-dx, +dy, 1).
function normalCanvas(h, size, strength, wrap) {
  const cv = makeCanvas(size, size);
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const at = wrap ? (i) => ((i % size) + size) % size : (i) => (i < 0 ? 0 : i >= size ? size - 1 : i);
  for (let y = 0; y < size; y++) {
    const yu = at(y - 1) * size, yd = at(y + 1) * size, row = y * size;
    for (let x = 0; x < size; x++) {
      const dx = (h[row + at(x + 1)] - h[row + at(x - 1)]) * 0.5 * strength;
      const dy = (h[yd + x] - h[yu + x]) * 0.5 * strength;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const o = (row + x) * 4;
      d[o] = (-dx * inv * 0.5 + 0.5) * 255;
      d[o + 1] = (dy * inv * 0.5 + 0.5) * 255;
      d[o + 2] = (inv * 0.5 + 0.5) * 255;
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

// Up to three float fields (0..1) -> RGB canvas.
function fieldCanvas(size, r, g, b) {
  const cv = makeCanvas(size, size);
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let i = 0, n = size * size; i < n; i++) {
    const o = i * 4;
    d[o] = clamp(r[i], 0, 1) * 255;
    d[o + 1] = clamp((g || r)[i], 0, 1) * 255;
    d[o + 2] = clamp((b || g || r)[i], 0, 1) * 255;
    d[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/* Ivory paper: cotton fibres (canvas strokes, wrapped so the tile repeats),
   low-frequency mottling and a fine tooth. Roughness 0.78..0.9, metalness 0. */
function makePaper(size, aniso) {
  const rnd = rng(7);
  const n = size * size;
  const cv = makeCanvas(size, size);
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "gray";
  ctx.fillRect(0, 0, size, size);
  ctx.lineCap = "round";
  const k = size / 1024;
  const count = Math.round(15000 * k * k);
  for (let i = 0; i < count; i++) {
    const x = rnd() * size, y = rnd() * size;
    const len = (4 + 36 * rnd() * rnd()) * k;
    const ang = rnd() * Math.PI * 2;
    const bend = (rnd() - 0.5) * len * 0.8;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const ex = x + ca * len, ey = y + sa * len;
    const mx = x + ca * len * 0.5 - sa * bend, my = y + sa * len * 0.5 + ca * bend;
    ctx.globalAlpha = 0.05 + 0.2 * rnd();
    ctx.strokeStyle = rnd() < 0.58 ? "white" : "black";
    ctx.lineWidth = (0.5 + 2.0 * rnd() * rnd()) * k;
    const minx = Math.min(x, ex, mx) - 3, maxx = Math.max(x, ex, mx) + 3;
    const miny = Math.min(y, ey, my) - 3, maxy = Math.max(y, ey, my) + 3;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const dx = ox * size, dy = oy * size;
        if (maxx + dx < 0 || minx + dx > size || maxy + dy < 0 || miny + dy > size) continue;
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy);
        ctx.quadraticCurveTo(mx + dx, my + dy, ex + dx, ey + dy);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  const px = ctx.getImageData(0, 0, size, size).data;
  const fib = new Float32Array(n);
  for (let i = 0; i < n; i++) fib[i] = px[i * 4] / 255 - 0.502;
  const mott = fbm(size, 4, 5, rnd);
  const cockle = fbm(size, 2, 3, rnd);
  const tooth = new Float32Array(n);
  for (let i = 0; i < n; i++) tooth[i] = rnd();
  boxBlur(tooth, size, 1, true);

  const h = new Float32Array(n), rough = new Float32Array(n), base = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    h[i] = fib[i] + (mott[i] - 0.5) * 0.45 + (tooth[i] - 0.5) * 0.5 + (cockle[i] - 0.5) * 1.6;
    rough[i] = clamp(0.84 + (mott[i] - 0.5) * 0.14 - fib[i] * 0.1 + (tooth[i] - 0.5) * 0.05, 0.78, 0.9);
    base[i] = 0.955 + (mott[i] - 0.5) * 0.07 + fib[i] * 0.035 + (cockle[i] - 0.5) * 0.03;
  }
  const rep = 1 / 1.7;
  return {
    map: canvasTex(fieldCanvas(size, base), true, aniso, rep),
    normal: canvasTex(normalCanvas(h, size, 5.5 * k, true), false, aniso, rep),
    rough: canvasTex(fieldCanvas(size, rough), false, aniso, rep),
  };
}

/* Gold liner and foil: a fine engraved diamond lattice over a soft hammered
   field, in both the normal and the roughness (0.22..0.38) maps. Metalness 1. */
function makeGold(size, aniso) {
  const rnd = rng(11);
  const n = size * size;
  const ham = fbm(size, 16, 3, rnd);
  const fine = fbm(size, 64, 2, rnd);
  const h = new Float32Array(n), rough = new Float32Array(n);
  const cells = 20, w = 0.06;
  for (let y = 0; y < size; y++) {
    const v = ((y + 0.5) / size) * cells;
    for (let x = 0; x < size; x++) {
      const u = ((x + 0.5) / size) * cells;
      const a = u + v, b = u - v;
      const fa = Math.abs(a - Math.round(a)), fb = Math.abs(b - Math.round(b));
      const g = Math.max(1 - smooth(0, w, fa), 1 - smooth(0, w, fb));
      const i = y * size + x;
      h[i] = 0.6 - 0.45 * g + (ham[i] - 0.5) * 0.4 + (fine[i] - 0.5) * 0.08;
      rough[i] = clamp(0.26 + 0.12 * g + (ham[i] - 0.5) * 0.1 + (fine[i] - 0.5) * 0.06, 0.22, 0.38);
    }
  }
  const rep = 1 / 1.7;
  return {
    normal: canvasTex(normalCanvas(h, size, 4.2 * (size / 1024), true), false, aniso, rep),
    rough: canvasTex(fieldCanvas(size, rough), false, aniso, rep),
  };
}

// Separable max filter: thickens thin strokes so they survive minification.
function dilate(src, size, radius) {
  const tmp = new Float32Array(src.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let m = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < size) m = Math.max(m, src[y * size + xx]);
      }
      tmp[y * size + x] = m;
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let m = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < size) m = Math.max(m, tmp[yy * size + x]);
      }
      src[y * size + x] = m;
    }
  }
  return src;
}

/* Wax seal cap. The THAARA logo's alpha (the mark and wordmark; the tagline row is
   cropped off, it is sub-pixel noise at seal size) becomes a raised relief inside a
   pressed stamp well, with a squeezed-out outer ring and wax irregularity.
   ORM-style data map: G = roughness, B = metalness. */
function makeWaxCap(size, logoImg, aniso) {
  const rnd = rng(23);
  const n = size * size;
  const lc = makeCanvas(size, size);
  const lctx = lc.getContext("2d", { willReadFrequently: true });
  const sw = logoImg.naturalWidth || logoImg.width;
  const shFull = logoImg.naturalHeight || logoImg.height;
  const sh = Math.round(shFull * 0.874);
  const dw = size * 0.54, dh = (dw * sh) / sw;
  lctx.drawImage(logoImg, 0, 0, sw, sh, (size - dw) / 2, (size - dh) / 2 + size * 0.012, dw, dh);
  const la = lctx.getImageData(0, 0, size, size).data;
  const logo = new Float32Array(n);
  for (let i = 0; i < n; i++) logo[i] = la[i * 4 + 3] / 255;
  dilate(logo, size, 1);
  boxBlur(logo, size, 1, false);
  boxBlur(logo, size, 1, false);
  const noise = fbm(size, 8, 4, rnd);
  const fine = fbm(size, 64, 2, rnd);
  const h = new Float32Array(n), rough = new Float32Array(n), metal = new Float32Array(n);
  for (let y = 0; y < size; y++) {
    const dy = ((y + 0.5) / size) * 2 - 1;
    for (let x = 0; x < size; x++) {
      const dx = ((x + 0.5) / size) * 2 - 1;
      const r = Math.sqrt(dx * dx + dy * dy);
      const i = y * size + x;
      const rim = smooth(0.7, 0.86, r);
      const well = 1 - rim;
      const relief = logo[i] * well;
      h[i] = 0.3 + rim * 0.45 + relief * 0.55 + (noise[i] - 0.5) * (0.05 + 0.22 * rim) + (fine[i] - 0.5) * 0.035;
      rough[i] = clamp(0.46 - relief * 0.2 - well * 0.04 + (noise[i] - 0.5) * 0.1, 0.2, 0.6);
      metal[i] = 0.3 + relief * 0.06;
    }
  }
  return {
    normal: canvasTex(normalCanvas(h, size, 16 * (size / 512), false), false, aniso, 0),
    orm: canvasTex(fieldCanvas(size, rough, rough, metal), false, aniso, 0),
  };
}

// Tileable, subtle irregularity for the seal's wall and lip.
function makeWaxNoise(size, aniso) {
  const rnd = rng(31);
  const h = fbm(size, 8, 4, rnd);
  return canvasTex(normalCanvas(h, size, 3, true), false, aniso, 1);
}

// Radial gradient on black, used as a colour multiplier by additive glows
// and as an alpha map by the contact shadows. Stops are [position, level].
function radialCanvas(w, h, cx, cy, r, stops) {
  const cv = makeCanvas(w, h);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(cx * w, cy * h, 0, cx * w, cy * h, r * Math.max(w, h));
  for (const [p, v] of stops) {
    const c = Math.round(v * 255);
    g.addColorStop(p, "rgb(" + c + "," + c + "," + c + ")");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return cv;
}

/* ---- Flap outlines: triangles with softly rounded apexes. The same tracer
   draws into a THREE.Shape and into a canvas (for the contact shadows). */
function traceTri(p, ax, ay, px, py, bx, by, r, oy = 0) {
  const la = Math.hypot(ax - px, ay - py), lb = Math.hypot(bx - px, by - py);
  const p1x = px + ((ax - px) / la) * r, p1y = py + ((ay - py) / la) * r;
  const p2x = px + ((bx - px) / lb) * r, p2y = py + ((by - py) / lb) * r;
  p.moveTo(ax, ay + oy);
  p.lineTo(p1x, p1y + oy);
  p.quadraticCurveTo(px, py + oy, p2x, p2y + oy);
  p.lineTo(bx, by + oy);
  p.lineTo(ax, ay + oy);
}
const TOP_TIP = -(HH - TOP_APEX); // top flap apex in hinge space (y = -1.33)
const FLAP = {
  left: (p, oy) => traceTri(p, -HW, HH, -SIDE_APEX, 0, -HW, -HH, 0.22, oy),
  right: (p, oy) => traceTri(p, HW, -HH, SIDE_APEX, 0, HW, HH, 0.22, oy),
  bottom: (p, oy) => traceTri(p, HW, -HH, 0, BOTTOM_APEX, -HW, -HH, 0.32, oy),
  top: (p, oy) => traceTri(p, -HW, 0, 0, TOP_TIP, HW, 0, 0.34, oy), // hinge space
};

/* Soft contact shadow of one or more flaps, as an alpha map covering the
   envelope face exactly (so nothing falls outside the paper). Drawn with the
   canvas shadow trick: the shape is painted off-canvas and only its blurred
   shadow lands on the texture. */
function contactShadow(traces, ox, oy, blur, aniso) {
  const cw = 1024, ch = Math.round((1024 * H) / W);
  const cv = makeCanvas(cw, ch);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, cw, ch);
  const sx = cw / W, sy = ch / H, far = cw * 3;
  ctx.shadowColor = "white";
  ctx.shadowBlur = blur * sx;
  ctx.shadowOffsetX = far + ox * sx;
  ctx.shadowOffsetY = -oy * sy;
  ctx.setTransform(sx, 0, 0, -sy, cw / 2 - far, ch / 2);
  ctx.fillStyle = "white";
  for (const [trace, dy] of traces) {
    ctx.beginPath();
    trace(ctx, dy);
    ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvasTex(cv, false, aniso, 0);
}

/* ============================================================
   Shaders
   ============================================================ */

const DUST_VS = /* glsl */ `
uniform float uTime;
uniform float uDrift;
uniform float uViewH;
uniform float uFocus;
uniform float uAperture;
uniform float uMaxSize;
uniform float uFade;
uniform float uFar0;
uniform float uFar1;
uniform vec2 uWrap;
uniform vec3 uPoolNdc;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
attribute vec4 aSeed;
varying vec3 vColor;
varying float vAlpha;
varying float vSoft;
void main() {
  vec3 p = position;
  float t = uTime * uDrift;
  p.y = uWrap.x + mod( p.y - uWrap.x + t * ( 0.035 + 0.075 * aSeed.y ), uWrap.y );
  p.x += sin( t * ( 0.11 + 0.17 * aSeed.w ) + aSeed.z * 6.2832 ) * 0.28 * uDrift;
  p.z += cos( t * ( 0.09 + 0.13 * aSeed.y ) + aSeed.z * 4.37 ) * 0.18 * uDrift;
  vec4 mv = modelViewMatrix * vec4( p, 1.0 );
  gl_Position = projectionMatrix * mv;
  float depth = max( -mv.z, 0.05 );
  float pxPerUnit = projectionMatrix[ 1 ][ 1 ] * 0.5 * uViewH / depth;
  float core = ( 0.0045 + 0.012 * aSeed.x * aSeed.x ) * pxPerUnit;
  float coc = uAperture * abs( depth - uFocus ) / depth * uViewH;
  float size = clamp( 2.0 * core + coc + 1.25, 1.25, uMaxSize );
  gl_PointSize = size;
  vSoft = smoothstep( 2.5, 14.0, coc );
  float e = ( 2.0 * core + 1.25 ) / size;
  float a = mix( 0.85, 0.022 + 0.28 * e, vSoft );
  float tw = 0.5 + 0.5 * sin( t * ( 0.7 + 1.9 * aSeed.w ) + aSeed.z * 31.0 );
  a *= mix( 0.35 + 0.65 * tw, 1.0, vSoft );
  float wy = ( p.y - uWrap.x ) / uWrap.y;
  a *= smoothstep( 0.0, 0.05, wy ) * ( 1.0 - smoothstep( 0.95, 1.0, wy ) );
  a *= 1.0 - smoothstep( uFar0, uFar1, depth );
  a *= smoothstep( 0.35, 1.4, depth );
  vec2 ndc = gl_Position.xy / gl_Position.w - uPoolNdc.xy;
  ndc.x *= uPoolNdc.z;
  float nearSubject = exp( -dot( ndc, ndc ) * 0.9 );
  a *= mix( 0.3, 1.0, nearSubject ); // dust catches the light near the subject
  a *= 1.0 - vSoft * smoothstep( 0.35, 0.9, nearSubject ) * 0.85; // big bokeh keep off the subject, like a lens smudge would not
  vAlpha = a * uFade;
  vec3 c = mix( uColA, uColB, aSeed.w );
  vColor = mix( c, uColC, step( 0.9, aSeed.x ) * 0.5 );
}`;

const DUST_FS = /* glsl */ `
uniform float uBoost;
varying vec3 vColor;
varying float vAlpha;
varying float vSoft;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot( q, q );
  if ( r2 > 1.0 ) discard;
  float spark = exp( -r2 * 6.0 );
  float r = sqrt( r2 );
  float disc = ( 1.0 - smoothstep( 0.8, 1.0, r ) ) * ( 0.62 + 0.38 * smoothstep( 0.5, 0.94, r ) );
  gl_FragColor = vec4( vColor * uBoost, vAlpha * mix( spark, disc, vSoft ) );
}`;

const BACKDROP_VS = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

const BACKDROP_FS = /* glsl */ `
uniform vec3 uBg;
uniform vec3 uPool;
uniform vec2 uCenter;
uniform float uScale;
uniform float uAspect;
uniform float uRadius;
uniform float uAmt;
varying vec2 vUv;
void main() {
  vec2 p = ( vUv * 2.0 - 1.0 ) * uScale;
  vec2 d = ( p - uCenter ) * vec2( uAspect, 1.0 );
  float r = length( d ) / ( uRadius * min( uAspect, 1.0 ) );
  float pool = exp( -r * r * 1.6 );
  gl_FragColor = vec4( mix( uBg, uPool, pool * uAmt ), 1.0 );
}`;

// Display-space finish, after OutputPass: vignette, film grain, and a
// half-step dither so the dark gradients never band.
const FinishShader = {
  name: "FinishShader",
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uVignette: { value: 0.4 },
    uGrain: { value: 0.03 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    varying vec2 vUv;
    float hash12( vec2 p ) {
      vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
      p3 += dot( p3, p3.yzx + 33.33 );
      return fract( ( p3.x + p3.y ) * p3.z );
    }
    void main() {
      vec4 c = texture2D( tDiffuse, vUv );
      vec2 q = vUv - 0.5;
      q.x *= uRes.x / uRes.y;
      float v = smoothstep( 0.5, 1.3, length( q ) * 1.3 );
      c.rgb *= 1.0 - uVignette * v;
      vec2 fc = gl_FragCoord.xy;
      float f = floor( uTime * 24.0 );
      float n = hash12( fc + f * vec2( 37.0, 17.0 ) ) + hash12( fc * 1.37 + 11.0 + f ) - 1.0;
      float l = dot( c.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
      c.rgb += n * uGrain * ( 0.4 + 0.6 * ( 1.0 - l ) );
      c.rgb += ( hash12( fc + 0.5 ) - 0.5 ) / 255.0;
      gl_FragColor = c;
    }`,
};

/* ============================================================
   Boot
   ============================================================ */

const readyHandlers = {};
const readyPromise = new Promise((res) => (readyHandlers.resolve = res));
if (CAPTURE) window.__proto = { ready: readyPromise };

function goStatic(reason) {
  root.dataset.scene = "static";
  root.dataset.staticReason = reason || "";
  readyHandlers.resolve({ static: true, reason });
}

function hasWebGL2() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
    return true;
  } catch (e) {
    return false;
  }
}

if (FORCE_STATIC) goStatic("forced");
else if (!window.gsap) goStatic("no-gsap");
else if (!hasWebGL2()) goStatic("no-webgl2");
else {
  boot().catch((err) => {
    console.error("[proto] boot failed, showing the static page:", err);
    goStatic("error");
  });
}

async function boot() {
  const gsap = window.gsap;
  const canvas = document.querySelector(".scene-canvas");
  const headerEl = document.querySelector(".top");
  const heroEl = document.querySelector(".hero");
  const heroIn = document.querySelector(".hero-in");
  const lineEls = [...document.querySelectorAll(".hero .line")];
  const hintEl = document.querySelector(".hint");
  const hintIn = document.querySelector(".hint-in");
  const leadEl = document.querySelector(".lead");
  const leadIn = document.querySelector(".lead-in");
  const outroEl = document.querySelector(".outro");
  const projectEl = document.querySelector(".project");
  const outroCta = document.querySelector(".outro-cta");
  const topCta = document.querySelector(".top-cta");
  const topCtaLink = document.querySelector(".top-cta a");
  const brandEl = document.querySelector(".brand");
  const workIn = document.querySelector(".work-in");
  const p2El = document.querySelector(".p2");
  const p2Head = document.querySelector(".p2-head");
  const p2Lead = document.querySelector(".p2-lead");
  const p2Link = document.querySelector(".p2-link");
  const s3El = document.querySelector(".s3");
  const s3Head = document.querySelector(".s3-head");
  const s3ds = [...document.querySelectorAll(".s3d")];
  const s4El = document.querySelector(".s4");
  const s4Head = document.querySelector(".s4-head");
  const s4ds = [...document.querySelectorAll(".s4d")];
  const s5El = document.querySelector(".s5");
  const s5Head = document.querySelector(".s5-head");
  const s5ds = [...document.querySelectorAll(".s5d")];
  const s6El = document.querySelector(".s6");
  const s6Head = document.querySelector(".s6-head");
  const s6ds = [...document.querySelectorAll(".s6d")];
  const s7El = document.querySelector(".s7");
  const s7Head = document.querySelector(".s7-head");
  const s7ds = [...document.querySelectorAll(".s7d")];
  const s7t3 = document.querySelector(".s7t3");
  const s8El = document.querySelector(".s8");
  const s8ds = [...document.querySelectorAll(".s8d")];

  /* ---- Enquiry form (scene 7's staying beat) ----
     Mirrors the live form's behavior (script.js): same fields, same
     validation strings, same honest outcome states. Two deliberate
     differences: ENQUIRY_ENDPOINT is empty, so the prototype never sends
     mail — the not-connected path always runs; and nothing calls
     scrollIntoView, which in a scroll-driven page would yank the timeline
     mid-reading. Alerts carry role=alert/status and take focus with
     preventScroll instead; the beats are already in view. */
  const ENQUIRY_ENDPOINT = "";
  const enquiryForm = document.getElementById("enquiryForm");
  if (enquiryForm) {
    const submitBtn = document.getElementById("formSubmit");
    const errorBox = document.getElementById("formErrorSummary");
    const errorList = document.getElementById("formErrorList");
    const notConnected = document.getElementById("formNotConnected");
    const successBox = document.getElementById("formSuccess");
    const failureBox = document.getElementById("formFailure");
    const failureText = document.getElementById("formFailureReason");
    const copyBtn = document.getElementById("copyMessage");
    const RULES = [
      {
        id: "f-name", label: "Name",
        validate: (v) => !v ? "Enter your name so we know who we are replying to." : null
      },
      {
        id: "f-email", label: "Email",
        validate: (v) => {
          if (!v) return "Enter your email address so we can reply.";
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "That email address looks incomplete — check for a typo.";
          return null;
        }
      },
      {
        id: "f-details", label: "Message",
        validate: (v) => {
          if (!v) return "Add a message, even just a sentence.";
          if (v.length < 10) return "A little more detail would help.";
          return null;
        }
      }
    ];
    const hide = (el) => { if (el) el.hidden = true; };
    const clearOutcomes = () => { hide(notConnected); hide(successBox); hide(failureBox); };
    const msgFor = (rule) => document.getElementById("e-" + rule.id.replace(/^f-/, ""));
    const clearFieldError = (rule) => {
      const input = document.getElementById(rule.id), msg = msgFor(rule);
      if (input) input.removeAttribute("aria-invalid");
      if (msg) { msg.hidden = true; msg.textContent = ""; }
    };
    const showFieldError = (rule, message) => {
      const input = document.getElementById(rule.id), msg = msgFor(rule);
      if (input) input.setAttribute("aria-invalid", "true");
      if (msg) { msg.hidden = false; msg.textContent = message; }
    };
    const validate = () => {
      const failures = [];
      for (const rule of RULES) {
        const input = document.getElementById(rule.id);
        if (!input) continue;
        const error = rule.validate(input.value.trim());
        if (error) { showFieldError(rule, error); failures.push({ rule, message: error }); }
        else clearFieldError(rule);
      }
      if (failures.length) {
        errorList.innerHTML = "";
        for (const f of failures) {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = "#" + f.rule.id;
          a.textContent = f.rule.label + " — " + f.message;
          a.addEventListener("click", (e) => {
            e.preventDefault();
            const el = document.getElementById(f.rule.id);
            if (el) el.focus({ preventScroll: true });
          });
          li.appendChild(a);
          errorList.appendChild(li);
        }
        errorBox.hidden = false;
        errorBox.focus({ preventScroll: true });
      } else errorBox.hidden = true;
      return failures.length === 0;
    };
    for (const rule of RULES) {
      const input = document.getElementById(rule.id);
      if (!input) continue;
      input.addEventListener("input", () => {
        if (input.getAttribute("aria-invalid") === "true" && !rule.validate(input.value.trim())) clearFieldError(rule);
      });
    }
    const readForm = () => {
      const get = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
      const honeypot = document.getElementById("f-botcheck");
      return { name: get("f-name"), email: get("f-email"), message: get("f-details"), botcheck: honeypot ? honeypot.checked : false };
    };
    const asText = (d) => ["Name: " + d.name, "Email: " + d.email, "", d.message].join("\n");
    enquiryForm.addEventListener("submit", (e) => {
      e.preventDefault();
      clearOutcomes();
      if (!validate()) return;
      // No endpoint: say so. Do not pretend anything was sent.
      if (!ENQUIRY_ENDPOINT) {
        notConnected.hidden = false;
        notConnected.focus({ preventScroll: true });
        return;
      }
    });
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const text = asText(readForm());
        const label = copyBtn.querySelector(".btn-label");
        const done = (ok) => {
          if (!label) return;
          label.textContent = ok ? "Copied" : "Press Ctrl+C to copy";
          window.setTimeout(() => { label.textContent = "Copy my message"; }, 2400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
        } else {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          let ok = false;
          try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
          document.body.removeChild(ta);
          done(ok);
        }
      });
    }
  }
  const loaderFill = document.querySelector(".loader-fill");
  const setLoad = (p) => loaderFill && loaderFill.style.setProperty("--p", p.toFixed(3));
  const yieldUI = CAPTURE ? () => Promise.resolve() : () => wait(0);

  /* ---- Renderer ---- */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  const DPR_MAX = Math.min(window.devicePixelRatio || 1, COARSE ? 1.5 : 2);
  let dpr = DPR_MAX; // lowered by the frame-time guard in the loop if a device struggles
  const SAMPLES = COARSE ? 0 : 4;
  const SHADOWS = !COARSE;
  renderer.setPixelRatio(dpr);
  renderer.setSize(canvas.clientWidth || innerWidth, canvas.clientHeight || innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = CAPTURE ? 1 : 0;
  renderer.shadowMap.enabled = SHADOWS;
  // PCFSoftShadowMap was removed in r186 (it warns and falls back); PCF with a
  // radius is the soft path now.
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const gl = renderer.getContext();
  const maxPoint = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] || 64;

  /* ---- Assets ---- */
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => setLoad(0.08 + (0.5 * loaded) / total);
  setLoad(0.05);
  const fontsReady = document.fonts
    ? Promise.all([
        document.fonts.load('500 1em "EB Garamond"'),
        document.fonts.load('italic 500 1em "EB Garamond"'),
        document.fonts.load('400 1em "EB Garamond"'),
        document.fonts.load('600 1em "Source Sans 3"'),
        document.fonts.load('700 1em "Source Sans 3"'),
      ]).catch(() => {})
    : Promise.resolve();
  const [invTex, logoImg, posterTex] = await Promise.all([
    new THREE.TextureLoader(manager).loadAsync(ASSETS.invitation),
    new THREE.ImageLoader(manager).loadAsync(ASSETS.logo),
    new THREE.TextureLoader(manager).loadAsync(ASSETS.phonePoster),
  ]);
  await Promise.race([fontsReady, wait(4000)]);
  invTex.colorSpace = THREE.SRGBColorSpace;
  invTex.anisotropy = aniso;
  // The poster (the invitation's 9:16 opening screen) is cover-fitted to the phone screen.
  posterTex.colorSpace = THREE.SRGBColorSpace;
  posterTex.anisotropy = aniso;
  {
    const a = posterTex.image.width / posterTex.image.height;
    if (a > SCREEN_ASPECT) {
      posterTex.repeat.set(SCREEN_ASPECT / a, 1);
      posterTex.offset.set((1 - SCREEN_ASPECT / a) / 2, 0);
    } else {
      posterTex.repeat.set(1, a / SCREEN_ASPECT);
      posterTex.offset.set(0, (1 - a / SCREEN_ASPECT) / 2);
    }
  }

  const TEX = COARSE ? 512 : 1024;
  const paper = makePaper(TEX, aniso);
  setLoad(0.7);
  await yieldUI();
  const gold = makeGold(TEX, aniso);
  setLoad(0.78);
  await yieldUI();
  const wax = makeWaxCap(512, logoImg, aniso);
  const waxNoise = makeWaxNoise(256, aniso);
  const glowTex = canvasTex(
    radialCanvas(512, 347, 0.5, 0.36, 0.5, [[0, 1], [0.18, 0.62], [0.4, 0.25], [0.7, 0.06], [1, 0]]), false, aniso, 0);
  const spillTex = canvasTex(
    radialCanvas(512, 320, 0.5, 0.98, 0.5, [[0, 1], [0.2, 0.5], [0.45, 0.16], [0.75, 0.03], [1, 0]]), false, aniso, 0);
  const sealShadowTex = canvasTex(
    radialCanvas(256, 256, 0.5, 0.5, 0.5, [[0, 1], [0.5, 0.85], [0.66, 0.35], [0.82, 0.08], [1, 0]]), false, aniso, 0);
  // Contact shadows. Key light is upper-left, so they fall slightly down-right.
  const shSide = contactShadow([[FLAP.left, 0], [FLAP.right, 0]], 0.012, -0.016, 0.05, aniso);
  const shBottom = contactShadow([[FLAP.bottom, 0]], 0.012, -0.018, 0.05, aniso);
  const shTop = contactShadow([[FLAP.top, HH]], 0.014, -0.022, 0.06, aniso);
  setLoad(0.86);
  await yieldUI();

  /* ---- Colours ---- */
  const cBg = col("bg"), cBgRaise = col("bg-raise"), cBgSoft = col("bg-soft");
  const cInk = col("ink"), cGold = col("gold"), cGoldLift = col("gold-lift"), cOnGold = col("on-gold");
  const bgComp = invNeutral(cBg); // lands exactly on --bg after tone mapping
  const poolComp = invNeutral(cBgRaise.clone().lerp(cGold, 0.1));

  /* ---- Scene ---- */
  const scene = new THREE.Scene();
  scene.background = bgComp;
  scene.fog = new THREE.Fog(bgComp, 18, 44);
  renderer.setClearColor(bgComp, 1);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envRT = pmrem.fromScene(roomEnv, 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = LIGHT.env;
  roomEnv.dispose();
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(FOV, (canvas.clientWidth || 1) / (canvas.clientHeight || 1), 0.1, 60);
  scene.add(camera);

  /* ---- Materials ---- */
  const paperMat = new THREE.MeshStandardMaterial({
    name: "paper",
    color: cInk.clone().lerp(cGoldLift, 0.1),
    map: paper.map,
    normalMap: paper.normal,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: paper.rough,
    roughness: 1,
    metalness: 0,
    shadowSide: THREE.DoubleSide,
  });
  const linerMat = new THREE.MeshStandardMaterial({
    name: "liner",
    color: cGold,
    metalness: 1,
    roughness: 1,
    roughnessMap: gold.rough,
    normalMap: gold.normal,
    normalScale: new THREE.Vector2(0.6, 0.6),
    envMapIntensity: 1.5,
    shadowSide: THREE.DoubleSide,
  });
  const linerBackMat = linerMat.clone();
  linerBackMat.side = THREE.BackSide;
  const foilMat = new THREE.MeshStandardMaterial({
    name: "foil",
    color: cGoldLift,
    metalness: 1,
    roughness: 0.34,
    envMapIntensity: 3.5,
    normalMap: gold.normal,
    normalScale: new THREE.Vector2(0.2, 0.2),
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  });
  // Deep bronze wax: gold multiplied by itself (the colour of light after two gold
  // bounces), eased a quarter of the way back toward the token.
  const waxColor = cGold.clone().multiply(cGold).lerp(cGold, 0.25);
  const waxCapMat = new THREE.MeshStandardMaterial({
    name: "wax-cap",
    color: waxColor,
    metalness: 1,
    roughness: 1,
    metalnessMap: wax.orm,
    roughnessMap: wax.orm,
    normalMap: wax.normal,
    normalScale: new THREE.Vector2(1, 1),
  });
  const waxBodyMat = new THREE.MeshStandardMaterial({
    name: "wax",
    color: waxColor,
    metalness: 0.3,
    roughness: 0.4,
    normalMap: waxNoise,
    normalScale: new THREE.Vector2(0.45, 0.45),
  });
  /* Key-light falloff. A directional key lights a flat envelope evenly; a soft
     world-space pool on the key's contribution alone (not the fill, rim or
     spill) gives the studio falloff from upper-left to lower-right. */
  const poolU = {
    uPoolCentre: { value: new THREE.Vector3() },
    uPoolRadius: { value: LIGHT.pool[0] },
    uPoolFloor: { value: LIGHT.pool[1] },
  };
  const keyChunk = THREE.ShaderChunk.lights_fragment_begin.replace(
    "getDirectionalLightInfo( directionalLight, directLight );",
    "getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= poolF;"
  );
  const keyPool = (mat) => {
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, poolU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vPoolPos;")
        .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvPoolPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vPoolPos;\nuniform vec3 uPoolCentre;\nuniform float uPoolRadius;\nuniform float uPoolFloor;")
        .replace("#include <lights_fragment_begin>",
          "vec3 poolD = vPoolPos - uPoolCentre;\nfloat poolF = mix( uPoolFloor, 1.0, exp( -dot( poolD, poolD ) / ( uPoolRadius * uPoolRadius ) ) );\n" + keyChunk);
    };
    mat.customProgramCacheKey = () => "key-pool";
    return mat;
  };
  [paperMat, linerMat, linerBackMat, foilMat, waxCapMat, waxBodyMat].forEach(keyPool);

  const shadowMat = (tex, opacity) =>
    new THREE.MeshBasicMaterial({ color: cOnGold, alphaMap: tex, transparent: true, opacity, depthWrite: false, fog: false });

  // The card reads like a lit screen: unlit, and pre-inverted through the tone
  // mapper as it fills the frame, so the final image is the photo's own pixels.
  const cardU = { uTrue: { value: 0 }, uBright: { value: 0.6 }, uBias: { value: 0 } };
  const cardMat = new THREE.MeshBasicMaterial({ name: "card", map: invTex, fog: false });
  const trueColour = (mat, U) => (mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTrue;\nuniform float uBright;\nuniform float uBias;\n" + INV_NEUTRAL_GLSL)
      .replace(
        "#include <map_fragment>",
        [
          // Stock sampling, kept verbatim so r186's video decode survives:
          // video maps upload as RGBA8 and rely on DECODE_VIDEO_TEXTURE,
          // which a hand-rolled sample would silently drop (washed-out screen).
          "#ifdef USE_MAP",
          "  vec4 sampledDiffuseColor = texture2D( map, vMapUv, uBias );",
          "  #ifdef DECODE_VIDEO_TEXTURE",
          "    sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );",
          "  #endif",
          "  diffuseColor *= sampledDiffuseColor;",
          "#endif",
          "diffuseColor.rgb *= uBright;",
          "diffuseColor.rgb = mix( diffuseColor.rgb, invNeutral( diffuseColor.rgb ), uTrue );",
        ].join("\n")
      );
  });
  trueColour(cardMat, cardU);

  /* ---- Envelope ---- */
  const rig = new THREE.Group();
  scene.add(rig);
  const env = new THREE.Group();
  rig.add(env);

  // World-unit UVs, so every paper and gold surface shares one texel density.
  const worldUV = (geo) => {
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getY(i));
    uv.needsUpdate = true;
    return geo;
  };
  const shapeGeo = (trace, oy = 0) => {
    const s = new THREE.Shape();
    trace(s, oy);
    return new THREE.ShapeGeometry(s, 18);
  };
  const enable = (m, cast = true, receive = true) => {
    m.castShadow = cast && SHADOWS;
    m.receiveShadow = receive && SHADOWS;
    return m;
  };

  const edgeMat = new THREE.MeshStandardMaterial({ name: "paper-edge", color: paperMat.color, roughness: 0.88, metalness: 0 });
  keyPool(edgeMat);
  const back = enable(new THREE.Mesh(worldUV(new THREE.BoxGeometry(W, H, 0.016)),
    [edgeMat, edgeMat, edgeMat, edgeMat, linerMat, paperMat]));
  back.position.z = Z_BACK - 0.008;
  env.add(back);

  const glowMat = new THREE.MeshBasicMaterial({
    color: cGoldLift.clone().multiplyScalar(LIGHT.glow), map: glowTex, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.985, H * 0.985), glowMat);
  glow.position.z = Z_GLOW;
  glow.renderOrder = 1;
  env.add(glow);

  const sideShadow = new THREE.Mesh(new THREE.PlaneGeometry(W, H), shadowMat(shSide, 0.5));
  sideShadow.position.z = Z_SIDE_SHADOW;
  sideShadow.renderOrder = 2;
  const left = enable(new THREE.Mesh(shapeGeo(FLAP.left), paperMat));
  const right = enable(new THREE.Mesh(shapeGeo(FLAP.right), paperMat));
  left.position.z = right.position.z = Z_SIDE;
  const bottomShadow = new THREE.Mesh(new THREE.PlaneGeometry(W, H), shadowMat(shBottom, 0.5));
  bottomShadow.position.z = Z_BOTTOM_SHADOW;
  bottomShadow.renderOrder = 3;
  const bottom = enable(new THREE.Mesh(shapeGeo(FLAP.bottom), paperMat));
  bottom.position.z = Z_BOTTOM;
  const topShadowMat = shadowMat(shTop, 0.55);
  const topShadow = new THREE.Mesh(new THREE.PlaneGeometry(W, H), topShadowMat);
  topShadow.position.z = Z_TOP_SHADOW;
  topShadow.renderOrder = 4;
  env.add(sideShadow, left, right, bottomShadow, bottom, topShadow);

  // Folds: the paper wraps from the back panel up to each flap, closing the rim.
  // Without them the envelope's edge is an open slot you can see through.
  const foldGeo = new THREE.PlaneGeometry(1, 1);
  const fold = (w, h, x, y, z, rx, ry) => {
    const m = enable(new THREE.Mesh(foldGeo, edgeMat), false, true);
    m.scale.set(w, h, 1);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    env.add(m);
    return m;
  };
  fold(Z_SIDE - Z_BACK, H, -HW, 0, (Z_SIDE + Z_BACK) / 2, 0, -Math.PI / 2);
  fold(Z_SIDE - Z_BACK, H, HW, 0, (Z_SIDE + Z_BACK) / 2, 0, Math.PI / 2);
  fold(W, Z_BOTTOM - Z_BACK, 0, -HH, (Z_BOTTOM + Z_BACK) / 2, Math.PI / 2, 0);
  const topFold = fold(W, Z_TOP - Z_BACK, 0, HH, (Z_TOP + Z_BACK) / 2, -Math.PI / 2, 0);

  // Top flap: hinged at the top edge. Outer face paper, inner face liner.
  const pivot = new THREE.Group();
  pivot.position.set(0, HH, Z_TOP);
  env.add(pivot);
  const topGeo = shapeGeo(FLAP.top);
  pivot.add(enable(new THREE.Mesh(topGeo, paperMat)), enable(new THREE.Mesh(topGeo, linerBackMat)));

  // Gold foil strips along the flap's two diagonal edges.
  const foilStrip = (ax, ay, bx, by, inset, width, t0, t1) => {
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    let nx = -uy, ny = ux;
    const mx = ax + dx * 0.5, my = ay + dy * 0.5;
    if (nx * (0 - mx) + ny * (TOP_TIP / 3 - my) < 0) { nx = -nx; ny = -ny; }
    const s = new THREE.Shape();
    const P = (t, o) => [ax + ux * len * t + nx * o, ay + uy * len * t + ny * o];
    s.moveTo(...P(t0, inset));
    s.lineTo(...P(t1, inset));
    s.lineTo(...P(t1, inset + width));
    s.lineTo(...P(t0, inset + width));
    s.lineTo(...P(t0, inset));
    return new THREE.ShapeGeometry(s, 1);
  };
  for (const sx of [-1, 1]) {
    const strip = enable(new THREE.Mesh(foilStrip(sx * HW, 0, 0, TOP_TIP, 0.06, 0.016, 0.035, 0.8), foilMat), false, true);
    strip.position.z = 0.0015;
    pivot.add(strip);
  }

  // Wax seal: a cylinder with a torus lip for the soft wax edge, and a cap that
  // carries the embossed logo. Child of the flap pivot so it rides the flap.
  const seal = new THREE.Group();
  {
    const R = 0.26, T = 0.05, TUBE = 0.022;
    const warp = (geo) => {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), a = Math.atan2(y, x);
        const k = 1 + 0.018 * Math.sin(3 * a + 1.3) + 0.011 * Math.sin(5 * a + 0.4) + 0.006 * Math.sin(9 * a + 2.2);
        p.setXY(i, x * k, y * k);
      }
      p.needsUpdate = true;
      return geo;
    };
    const body = new THREE.CylinderGeometry(R, R * 1.03, T, 96, 1, true);
    body.rotateX(Math.PI / 2);
    body.translate(0, 0, T / 2);
    const lip = new THREE.TorusGeometry(R - TUBE * 0.55, TUBE, 20, 96);
    lip.translate(0, 0, T - TUBE * 0.35);
    const cap = new THREE.CircleGeometry(R - TUBE * 0.4, 96);
    cap.translate(0, 0, T - TUBE * 0.55);
    const base = new THREE.CircleGeometry(R * 1.03, 96);
    base.rotateY(Math.PI); // faces the flap, so the seal reads solid from behind once the flap flips
    base.translate(0, 0, 0.0004);
    seal.add(
      enable(new THREE.Mesh(warp(body), waxBodyMat)),
      enable(new THREE.Mesh(warp(lip), waxBodyMat)),
      enable(new THREE.Mesh(warp(cap), waxCapMat)),
      enable(new THREE.Mesh(warp(base), waxBodyMat))
    );
    const sealShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.86), shadowMat(sealShadowTex, 0.62));
    sealShadow.position.set(0.035, -0.05, 0.0012);
    sealShadow.renderOrder = 5;
    seal.add(sealShadow);
  }
  seal.position.set(0, TOP_TIP + 0.3, 0.0005); // the rounded tip sits ~0.105 above TOP_TIP; ~0.065 overhang
  seal.rotation.z = -0.05;
  pivot.add(seal);

  // Light spill: an additive glow over the liner (behind the card), a soft
  // plume above the open throat, and a warm point light inside.
  const spillMat = new THREE.MeshBasicMaterial({
    color: cGoldLift.clone().multiplyScalar(LIGHT.plume), map: spillTex, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.2, 2.3), spillMat);
  spill.position.set(0, HH + 1.0, 0.004);
  spill.renderOrder = 6;
  env.add(spill);
  const innerLight = new THREE.PointLight(cGoldLift, 0, 4.5, 2);
  innerLight.position.set(0, 0.55, 0.34);
  env.add(innerLight);

  /* ---- Card ---- */
  const card = enable(new THREE.Mesh(new THREE.BoxGeometry(CARD_W, CARD_H, CARD_T),
    [edgeMat, edgeMat, edgeMat, edgeMat, cardMat, paperMat]), true, false);
  card.position.set(0, -0.12, Z_CARD);
  rig.add(card);

  /* ---- Scene 2: the phone ----
     Graphite glass front and back in a champagne metal frame. The screen is
     unlit and pre-inverted through the tone mapper like the card, so it shows
     true colour; a black additive glass layer over it carries only reflections. */
  const roundRect = (w, h, r) => {
    const sh = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r;
    sh.moveTo(-x, -h / 2);
    sh.lineTo(x, -h / 2);
    sh.absarc(x, -y, r, -Math.PI / 2, 0, false);
    sh.lineTo(w / 2, y);
    sh.absarc(x, y, r, 0, Math.PI / 2, false);
    sh.lineTo(-x, h / 2);
    sh.absarc(-x, y, r, Math.PI / 2, Math.PI, false);
    sh.lineTo(-w / 2, -y);
    sh.absarc(-x, -y, r, Math.PI, Math.PI * 1.5, false);
    return sh;
  };
  // A flat rounded rectangle with 0..1 UVs across its bounds.
  const flatGeo = (w, h, r) => {
    const geo = new THREE.ShapeGeometry(roundRect(w, h, r), 24);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
    uv.needsUpdate = true;
    return geo;
  };
  const graphiteMat = keyPool(new THREE.MeshPhysicalMaterial({
    name: "graphite", color: cBgRaise.clone().lerp(cInk, 0.04), metalness: 0.25, roughness: 0.36,
    clearcoat: 1, clearcoatRoughness: 0.08,
  }));
  const champagneMat = keyPool(new THREE.MeshStandardMaterial({
    name: "champagne", color: cGold.clone().lerp(cInk, 0.32), metalness: 1, roughness: 0.3, envMapIntensity: 2.4,
  }));
  const pillMat = keyPool(new THREE.MeshStandardMaterial({ name: "pill", color: cOnGold, metalness: 0, roughness: 0.3 }));
  const glassMat = keyPool(new THREE.MeshStandardMaterial({
    name: "glass", color: new THREE.Color(0, 0, 0), metalness: 0, roughness: 0.07, envMapIntensity: 3.2,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  const screenU = { uTrue: { value: 1 }, uBright: { value: 1 }, uBias: { value: 0 } };
  const screenMat = new THREE.MeshBasicMaterial({ name: "screen", map: posterTex, fog: false });
  trueColour(screenMat, screenU);

  const phone = new THREE.Group();   // placement and idle float
  const handset = new THREE.Group(); // the turn
  phone.add(handset);
  scene.add(phone);
  {
    const inner = PH_D - 2 * PH_BEVEL;
    const bodyGeo = new THREE.ExtrudeGeometry(roundRect(PH_W - 2 * PH_BEVEL, PH_H - 2 * PH_BEVEL, PH_R - PH_BEVEL), {
      depth: inner, bevelEnabled: true, bevelThickness: PH_BEVEL, bevelSize: PH_BEVEL, bevelSegments: 6, curveSegments: 20,
    });
    bodyGeo.translate(0, 0, -inner / 2); // front face at z = +PH_D / 2
    const body = new THREE.Mesh(bodyGeo, [graphiteMat, champagneMat]); // front and back caps, then the frame band
    const screen = new THREE.Mesh(flatGeo(PH_SW, PH_SH, PH_R - PH_BEZEL), screenMat);
    screen.position.z = PH_D / 2 + 0.0006;
    const pill = new THREE.Mesh(flatGeo(0.27, 0.076, 0.038), pillMat); // the camera pill
    pill.position.set(0, PH_SH / 2 - 0.064, PH_D / 2 + 0.0011);
    const glass = new THREE.Mesh(flatGeo(PH_W - 2 * PH_BEVEL, PH_H - 2 * PH_BEVEL, PH_R - PH_BEVEL), glassMat);
    glass.position.z = PH_D / 2 + 0.0017;
    glass.renderOrder = 7;
    // Side buttons: flattened capsules standing slightly proud of the frame.
    const button = (len, side, y) => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.017, len, 4, 12), champagneMat);
      m.scale.set(0.62, 1, 1.35);
      m.position.set(side * (PH_W / 2 - 0.002), PH_H / 2 - y, 0);
      return m;
    };
    handset.add(body, screen, pill, glass,
      button(0.09, -1, 0.42), button(0.2, -1, 0.66), button(0.2, -1, 0.93), button(0.32, 1, 0.78));
  }
  phone.visible = false;

  // The live screen: a looping recording of the real invitation, fetched once the
  // opening nears its end. It plays from a blob URL, so it loops and seeks on any
  // host (Safari will not play media from a server without byte ranges).
  // Reduced motion, and any failure, keep the poster.
  let video = null, videoTex = null, videoOk = false, videoAsked = false, askVideo = () => {};
  const videoReady = new Promise((resolve) => {
    if (REDUCED || !ASSETS.phoneVideo) return resolve(false);
    video = document.createElement("video");
    video.muted = video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.preload = "auto";
    video.addEventListener("loadeddata", () => {
      videoTex = new THREE.VideoTexture(video);
      videoTex.colorSpace = THREE.SRGBColorSpace;
      videoTex.anisotropy = aniso;
      videoTex.generateMipmaps = true; // the 1558 px frame is shown at a fraction of that
      videoTex.minFilter = THREE.LinearMipmapLinearFilter;
      screenMat.map = videoTex;
      videoOk = true;
      resolve(true);
    }, { once: true });
    const fail = () => {
      videoOk = false;
      screenMat.map = posterTex;
      resolve(false);
    };
    video.addEventListener("error", fail, { once: true });
    askVideo = () => {
      if (videoAsked) return;
      videoAsked = true;
      fetch(ASSETS.phoneVideo)
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error("HTTP " + r.status))))
        .then((b) => { video.src = URL.createObjectURL(b); })
        .catch(fail);
    };
  });

  /* ---- Scene 3: the material library ----
     Five tablets in a shallow arc, one per discipline, each in the scene's
     own matter: ivory paper, bronze wax with a gold seal, graphite with gold
     rules, clearcoat glass, champagne gold with a ribbon. Numeral + name
     labels are canvas textures (page fonts, CSS-token colours). */
  const S3 = { leave: 0, travel: 0, focus: 0 }; // owned by the timeline
  const TW = 0.95, TH = 1.5, TD = 0.07, TBEV = 0.02;
  const ARC = { x: 6.0, y: 1.35, z: -1.7, r: 2.7 };
  const S3T = { tiltX: 0 }; // portrait only: tip faces down toward the low camera
  const S3_LABELS = [
    { num: "01", lines: ["Invitation", "Experiences"] },
    { num: "02", lines: ["Brand", "Identity"] },
    { num: "03", lines: ["Digital", "Design"] },
    { num: "04", lines: ["Website", "Design"] },
    { num: "05", lines: ["Motion &", "Visuals"] },
  ];
  const labelTex = (num, lines) => {
    const cv = makeCanvas(512, 384), g = cv.getContext("2d");
    g.clearRect(0, 0, 512, 384);
    g.textAlign = "center";
    g.fillStyle = TOK.gold;
    g.font = '600 168px "EB Garamond", serif';
    g.fillText(num, 256, 178);
    g.fillStyle = TOK.ink;
    g.font = '600 47px "Source Sans 3", sans-serif';
    try { g.letterSpacing = "5px"; } catch (e) { /* older canvas: no tracking */ }
    lines.forEach((ln, k) => g.fillText(ln, 256, 262 + k * 60));
    return canvasTex(cv, true, aniso);
  };
  const s3 = new THREE.Group(); // placement of the whole arc
  const s3tabs = [];
  {
    // Tablet 5 gets its own deep-bronze face: a light gold face washes out
    // the ivory label text, while polished metal mirror-flares at close
    // range. Dark bronze + ivory text, with the ribbon's jewel gold above it.
    const champagneSoft = keyPool(new THREE.MeshStandardMaterial({
      name: "champagne-soft", color: cGold.clone().lerp(cBgRaise, 0.52), metalness: 0.35, roughness: 0.55, envMapIntensity: 0.8,
    }));
    const faceMats = [paperMat, waxBodyMat, graphiteMat, graphiteMat, champagneSoft];
    for (let i = 0; i < 5; i++) {
      const grp = new THREE.Group();
      const bodyGeo = new THREE.ExtrudeGeometry(roundRect(TW - 2 * TBEV, TH - 2 * TBEV, 0.09), {
        depth: TD - 2 * TBEV, bevelEnabled: true, bevelThickness: TBEV, bevelSize: TBEV, bevelSegments: 3, curveSegments: 16,
      });
      bodyGeo.translate(0, 0, -(TD - 2 * TBEV) / 2);
      const body = new THREE.Mesh(bodyGeo, [faceMats[i], graphiteMat]);
      grp.add(body);
      const lab = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 0.6),
        new THREE.MeshBasicMaterial({ name: "s3label" + i, map: labelTex(S3_LABELS[i].num, S3_LABELS[i].lines), transparent: true, fog: false })
      );
      lab.position.set(0, 0.38, TD / 2 + 0.021);
      grp.add(lab);
      if (i === 1) { // brand: gold seal ring + wax centre, low on the face
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.21, 48), linerMat);
        ring.position.set(0, -0.38, TD / 2 + 0.021);
        const dot = new THREE.Mesh(new THREE.CircleGeometry(0.14, 48), waxCapMat);
        dot.position.set(0, -0.38, TD / 2 + 0.022);
        grp.add(ring, dot);
      }
      if (i === 2) { // digital: three fine gold rules
        for (let k = 0; k < 3; k++) {
          const rule = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.018, 0.012), linerMat);
          rule.position.set(0, -0.18 - k * 0.2, TD / 2 + 0.02);
          grp.add(rule);
        }
      }
      if (i === 3) { // website: a glass pane over the face
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(TW - 0.1, TH - 0.1), glassMat);
        pane.position.set(0, 0, TD / 2 + 0.012);
        pane.renderOrder = 7;
        grp.add(pane);
      }
      s3.add(grp);
      s3tabs.push({ grp, base: new THREE.Vector3(), rotY: 0 });
    }
    // Motion's ribbon: a champagne torus floating over the fifth tablet.
    var ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.038, 12, 72), champagneMat);
    ribbon.position.set(0, 2.6, 0);
    s3.add(ribbon);
    // A shared dark plinth grounds the arc; its width follows the layout.
    var plinth = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 0.55), graphiteMat);
    plinth.position.set(0, 0, 0);
    s3.add(plinth);
  }
  s3.visible = false;
  scene.add(s3);
  const layoutArc = () => {
    const tight = L.portrait ? 0.55 : 1;
    const cy = L.portrait ? ARC.y + 0.95 : ARC.y;
    S3T.tiltX = L.portrait ? 0.38 : 0;
    let x0 = Infinity, x1 = -Infinity;
    for (let i = 0; i < 5; i++) {
      const a = ((-36 + i * 18) * Math.PI) / 180;
      const x = ARC.x + ARC.r * Math.sin(a) * tight;
      const z = ARC.z - ARC.r * (1 - Math.cos(a));
      s3tabs[i].base.set(x, cy, z);
      s3tabs[i].rotY = -a * 0.55;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      s3tabs[i].grp.position.copy(s3tabs[i].base);
      s3tabs[i].grp.rotation.set(0, s3tabs[i].rotY, 0);
    }
    const span = x1 - x0 + TW;
    plinth.scale.x = span + 0.5;
    plinth.position.set((x0 + x1) / 2, cy - TH / 2 - 0.12, ARC.z + 0.1);
    ribbon.position.set(s3tabs[4].base.x, cy + TH / 2 + 0.3, s3tabs[4].base.z);
    return { cx: (x0 + x1) / 2, cy, cz: ARC.z - 0.3, w: span, h: TH + 0.9 };
  };
  const ARC_POOL = new THREE.Vector3(ARC.x, ARC.y + 0.9, ARC.z + 0.8);
  const ARC_TGT = new THREE.Vector3(ARC.x, ARC.y, ARC.z);
  const ARC_RIM = new THREE.Vector3(ARC.x + 2.6, ARC.y + 1.4, ARC.z - 1.5);

  /* ---- Scene 4: the ascent ----
     Four champagne rings at increasing heights in a gentle spiral, one per
     principle. Pure form, no text: the words live in the DOM beats. */
  const S4 = { leave: 0, travel: 0, focus: 0 }; // owned by the timeline
  const RINGS = { x: 6.0, y0: 0.7, dy: 0.9, z: -1.6, dx: 0.55 };
  const s4 = new THREE.Group();
  const s4rings = [];
  {
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 16, 100), champagneMat);
      ring.position.set(RINGS.x + (i - 1.5) * RINGS.dx, RINGS.y0 + i * RINGS.dy, RINGS.z - i * 0.15);
      ring.rotation.x = 0.45;
      s4.add(ring);
      s4rings.push(ring);
    }
  }
  s4.visible = false;
  scene.add(s4);
  const RINGS_C = new THREE.Vector3(RINGS.x, RINGS.y0 + 1.5 * RINGS.dy, RINGS.z - 0.2);
  const RINGS_RIM = new THREE.Vector3(RINGS.x + 2.2, RINGS.y0 + 1.5 * RINGS.dy + 1.2, RINGS.z - 1.2);

  /* ---- Scene 5: stations along a path ----
     Four graphite portals with gold thresholds joined by a gold path line,
     laid on a gentle S-curve; the camera travels the same curve through them. */
  const S5 = { leave: 0, travel: 0, focus: 0 }; // owned by the timeline
  const PATH = { x: 6.0, y: 0.9, z: -2.2, dx: 0.8, dy: 0.35, dz: 3.0 };
  const S5_NUMS = ["01", "02", "03", "04"];
  const S5_NAMES = ["Discover", "Shape", "Create", "Launch"];
  const pathPt = (f) => ({
    x: PATH.x + Math.sin(f * 0.9) * PATH.dx,
    y: PATH.y + f * PATH.dy,
    z: PATH.z - f * PATH.dz,
  });
  const s5 = new THREE.Group();
  {
    for (let i = 0; i < 4; i++) {
      const p = pathPt(i);
      const g = new THREE.Group();
      // Stations stand on the travelled line, right of the camera: the frame's
      // lateral offset carries the camera past them with clearance, so the
      // journey glides by each portal instead of through it.
      g.position.set(p.x, p.y, p.z);
      g.rotation.y = -0.3;
      const pilGeo = new THREE.BoxGeometry(0.18, 2.2, 0.18);
      const pl = new THREE.Mesh(pilGeo, graphiteMat); pl.position.set(-0.75, 0, 0); g.add(pl);
      const pr = new THREE.Mesh(pilGeo, graphiteMat); pr.position.set(0.75, 0, 0); g.add(pr);
      const lin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.18), graphiteMat);
      lin.position.set(0, 1.1, 0); g.add(lin);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.34), linerMat);
      sill.position.set(0, -1.1, 0); g.add(sill);
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(0.85, 0.64),
        new THREE.MeshBasicMaterial({ name: "s5plate" + i, map: labelTex(S5_NUMS[i], [S5_NAMES[i]]), transparent: true, fog: false })
      );
      plate.position.set(0, 1.72, 0);
      g.add(plate);
      s5.add(g);
    }
    // The gold path: straight runs joining consecutive stations.
    const seg = (a, b) => {
      const va = new THREE.Vector3(a.x, a.y - 1.2, a.z), vb = new THREE.Vector3(b.x, b.y - 1.2, b.z);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, va.distanceTo(vb)), linerMat);
      m.position.copy(va).lerp(vb, 0.5);
      m.lookAt(vb);
      s5.add(m);
    };
    for (let i = 0; i < 3; i++) seg(pathPt(i), pathPt(i + 1));
  }
  s5.visible = false;
  scene.add(s5);
  // The last station: the journey ends looking through its portal.
  const ST3 = pathPt(3);
  const PATH_MID = new THREE.Vector3(PATH.x + 0.5, PATH.y + 0.5, PATH.z - 4.5);
  const PATH_RIM = new THREE.Vector3(PATH.x + 2.2, PATH.y + 1.7, PATH.z - 5.5);

  /* ---- Scene 6: a warm doorway ----
     A dark wall with a lit opening: graphite piers and header around a real
     gap, a warm glowing plane set behind it, a gold threshold step, and one
     amber practical light spilling out. The studio as a place you enter. */
  const S6 = { leave: 0, travel: 0, focus: 0 }; // owned by the timeline
  const DOOR = { x: 5.2, y: 1.0, z: -16.5 };
  const s6 = new THREE.Group();
  {
    // The wall is matte dark graphite: the shared graphite's clearcoat would
    // mirror the room environment into a grey wash at head-on angles.
    const wallMat = graphiteMat.clone();
    wallMat.name = "doorwall"; wallMat.clearcoat = 0; wallMat.metalness = 0.1; wallMat.roughness = 0.8;
    wallMat.needsUpdate = true;
    const pierGeo = new THREE.BoxGeometry(1.45, 3.4, 0.3);
    const pl = new THREE.Mesh(pierGeo, wallMat); pl.position.set(-1.375, 0.5, 0); s6.add(pl);
    const pr = new THREE.Mesh(pierGeo, wallMat); pr.position.set(1.375, 0.5, 0); s6.add(pr);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 0.3), wallMat);
    hd.position.set(0, 1.6, 0); s6.add(hd);
    // The lit interior: a radial warm gradient (bright core, amber falloff),
    // so the opening reads as light within, not a flat card.
    const glowCv = makeCanvas(256, 320), gg = glowCv.getContext("2d");
    const grad = gg.createRadialGradient(128, 195, 12, 128, 185, 225);
    grad.addColorStop(0, "#fff6e2");
    grad.addColorStop(0.45, TOK["gold-lift"]);
    grad.addColorStop(1, "#7a4d16");
    gg.fillStyle = grad; gg.fillRect(0, 0, 256, 320);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 2.2),
      new THREE.MeshBasicMaterial({ name: "s6glow", map: canvasTex(glowCv, true, aniso), fog: false, toneMapped: false })
    );
    glow.position.set(0, -0.1, -0.45);
    s6.add(glow);
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.6), linerMat);
    step.position.set(0, -1.26, 0.3); s6.add(step);
  }
  s6.position.set(DOOR.x, DOOR.y, DOOR.z);
  s6.visible = false;
  scene.add(s6);
  // Amber practical just inside the opening: warms the reveals and the step
  // without washing the wall face.
  const doorLight = new THREE.PointLight(0xffc98a, 25, 6, 2);
  doorLight.position.set(DOOR.x, DOOR.y + 0.3, DOOR.z - 0.1);
  scene.add(doorLight);
  const DOOR_C = new THREE.Vector3(DOOR.x, DOOR.y + 0.2, DOOR.z);
  const DOOR_RIM = new THREE.Vector3(DOOR.x + 2.2, DOOR.y + 1.4, DOOR.z - 1.0);

  /* ---- Scene 7: a floating invitation card ----
     A small cream card with a gold seal hovers before the lit door, gently
     bobbing: the visitor's message-to-be. */
  const S7 = { leave: 0, travel: 0, focus: 0 }; // owned by the timeline
  const S8 = { leave: 0, travel: 0, focus: 0 }; // owned by the timeline
  const SF = { back: 0 }; // fold-back: 0 journey, 1 loop rest (envelope home, states untouched)
  // Before the doorway and left of it, so the lit door rises behind the card.
  const CARD = { x: 5.6, y: 1.2, z: -14.3 };
  const s7 = new THREE.Group();
  {
    const note = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.6, 0.025), paperMat);
    s7.add(note);
    // The seal uses its own softly emissive gold so it reads as gold from
    // every angle; a bare metal goes black when it reflects the dark room.
    const sealMat = new THREE.MeshStandardMaterial({
      color: 0xd8b45c, metalness: 0.7, roughness: 0.35,
      emissive: 0x3a2a08, emissiveIntensity: 0.55
    });
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.035, 24), sealMat);
    seal.rotation.x = Math.PI / 2;
    seal.position.set(0, 0, 0.03);
    s7.add(seal);
  }
  s7.position.set(CARD.x, CARD.y, CARD.z);
  s7.rotation.x = -0.06;
  s7.visible = false;
  scene.add(s7);
  const CARD_C = new THREE.Vector3(CARD.x, CARD.y, CARD.z);
  const CARD_RIM = new THREE.Vector3(CARD.x + 2.2, CARD.y + 1.2, CARD.z - 1.0);

  /* ---- Lights ---- */
  const KEY_DIR = new THREE.Vector3(-0.62, 0.66, 0.42).normalize();
  const key = new THREE.DirectionalLight(cInk.clone().lerp(cGoldLift, 0.3), LIGHT.key);
  key.position.copy(KEY_DIR).multiplyScalar(12);
  scene.add(key, key.target);
  if (SHADOWS) {
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -3.1; sc.right = 3.1; sc.top = 3.3; sc.bottom = -3.1; sc.near = 4; sc.far = 22;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.012;
    key.shadow.radius = 5;
  }
  const rim = new THREE.PointLight(cGold, LIGHT.rim, 16, 2);
  rim.position.set(3.6, 1.5, -0.9);
  scene.add(rim);
  const hemi = new THREE.HemisphereLight(cInk, cBgSoft, LIGHT.hemi);
  scene.add(hemi);

  /* ---- Backdrop: a very subtle warm pool, pinned behind the subject ---- */
  const backdropU = {
    uBg: { value: bgComp },
    uPool: { value: poolComp },
    uCenter: { value: new THREE.Vector2(0.3, 0.1) },
    uScale: { value: 1.3 },
    uAspect: { value: 1 },
    uRadius: { value: 1.05 },
    uAmt: { value: 1 },
  };
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({ uniforms: backdropU, vertexShader: BACKDROP_VS, fragmentShader: BACKDROP_FS, depthWrite: false, fog: false }));
  backdrop.position.z = -40;
  backdrop.renderOrder = -1;
  backdrop.frustumCulled = false;
  camera.add(backdrop);

  /* ---- Gold dust: near bokeh, mid sparkles, far motes fading into the fog ---- */
  const DUST = COARSE ? 600 : 1500;
  const dustRnd = rng(101);
  const dPos = new Float32Array(DUST * 3), dSeed = new Float32Array(DUST * 4);
  for (let i = 0; i < DUST; i++) {
    const band = dustRnd();
    let z, spread;
    if (band < 0.07) { z = 5 + dustRnd() * 4.5; spread = 0.4; }         // near: a few large soft bokeh
    else if (band < 0.62) { z = -3.5 + dustRnd() * 8; spread = 1; }     // around the subject
    else { z = -18 + dustRnd() * 14.5; spread = 1.9; }                   // far, into the fog
    dPos[i * 3] = (dustRnd() * 2 - 1) * 7.5 * spread;
    dPos[i * 3 + 1] = -6.5 + dustRnd() * 15;
    dPos[i * 3 + 2] = z;
    dSeed[i * 4] = dustRnd();
    dSeed[i * 4 + 1] = dustRnd();
    dSeed[i * 4 + 2] = dustRnd();
    dSeed[i * 4 + 3] = dustRnd();
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
  dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(dSeed, 4));
  const dustU = {
    uTime: { value: 0 },
    uDrift: { value: REDUCED ? 0 : 1 },
    uViewH: { value: 900 },
    uFocus: { value: 10 },
    uAperture: { value: 0.011 },
    uMaxSize: { value: 120 },
    uFade: { value: CAPTURE ? 1 : 0 },
    uFar0: { value: 14 },
    uFar1: { value: 34 },
    uWrap: { value: new THREE.Vector2(-6.5, 15) },
    uPoolNdc: { value: new THREE.Vector3(0, 0, 1) },
    uColA: { value: cGold },
    uColB: { value: cGoldLift },
    uColC: { value: cInk },
    uBoost: { value: 1.7 },
  };
  const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
    uniforms: dustU, vertexShader: DUST_VS, fragmentShader: DUST_FS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  dust.frustumCulled = false;
  dust.renderOrder = 10;
  scene.add(dust);

  /* ---- Post: multisampled HalfFloat -> Render -> Bloom -> Output -> Finish ---- */
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: SAMPLES });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(dpr);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), LIGHT.bloom[0], LIGHT.bloom[2], LIGHT.bloom[3]);
  const finish = new ShaderPass(FinishShader);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const fxaa = new FXAAPass(); // on top of MSAA on desktop; the only AA on phones
  composer.addPass(fxaa);
  composer.addPass(finish);

  /* ============================================================
     Layout: screen rects (CSS px) that each beat's subject must fit.
     ============================================================ */
  const L = { vw: 1, vh: 1, aspect: 1, portrait: false, tiltK: 1 };
  const F0 = {}, F1 = {}, F2 = {}, F3 = {}, FA = {}, FB = {}, FP = {}, FC = {}, FQ = {}, FD = {}, FR = {}, FE = {}, FS = {}, FT = {}, FG = {}, FH = {}, FF = {}, FENTER = {};
  const DBG = {}; // scratchpad introspection: update() stashes the live camera frame here
  const eul = new THREE.Euler(), m4 = new THREE.Matrix4(), v3 = new THREE.Vector3();

  function fit(rect, w, h, cx, cy, cz, out) {
    const fw = (rect.r - rect.l) / L.vw, fh = (rect.b - rect.t) / L.vh;
    out.d = Math.max(w / (fw * VH1 * L.aspect), h / (fh * VH1));
    out.x = cx; out.y = cy; out.z = cz;
    out.sx = (rect.l + rect.r) / L.vw - 1;
    out.sy = 1 - (rect.t + rect.b) / L.vh;
    return out;
  }
  function mixFrame(a, b, t, o) {
    o.x = lerp(a.x, b.x, t); o.y = lerp(a.y, b.y, t); o.z = lerp(a.z, b.z, t);
    o.d = Math.exp(lerp(Math.log(a.d), Math.log(b.d), t));
    o.sx = lerp(a.sx, b.sx, t); o.sy = lerp(a.sy, b.sy, t);
    return o;
  }
  const scaleIn = (rect, w, h) => Math.min((rect.r - rect.l) / w, (rect.b - rect.t) / h);

  function restBox(k) {
    eul.set(REST.rx * k, REST.ry * k, REST.rz * k);
    m4.makeRotationFromEuler(eul);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of [[-HW, -HH], [HW, -HH], [HW, HH], [-HW, HH]]) {
      v3.set(x, y, 0).applyMatrix4(m4);
      x0 = Math.min(x0, v3.x); x1 = Math.max(x1, v3.x);
      y0 = Math.min(y0, v3.y); y1 = Math.max(y1, v3.y);
    }
    return { w: x1 - x0, h: y1 - y0 };
  }

  // The tilted rest pose is fitted through the real perspective: project the
  // rotated corners with the frame's own camera, then correct the distance and
  // the screen offset until the projected box sits inside the rect.
  const CORNERS = [[-HW, -HH], [HW, -HH], [HW, HH], [-HW, HH]];
  function fitTilted(rect, k, margin, out) {
    const rest = restBox(k);
    fit(rect, rest.w * margin, rest.h * margin, 0, 0, 0, out);
    eul.set(REST.rx * k, REST.ry * k, REST.rz * k);
    m4.makeRotationFromEuler(eul);
    for (let it = 0; it < 5; it++) {
      const halfH = (VH1 * out.d) / 2, halfW = halfH * L.aspect;
      const cx = out.x - out.sx * halfW, cy = out.y - out.sy * halfH, cz = out.z + out.d;
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const [x, y] of CORNERS) {
        v3.set(x, y, 0).applyMatrix4(m4);
        const depth = cz - v3.z;
        const nx = (v3.x - cx) / ((depth * VH1 * L.aspect) / 2);
        const ny = (v3.y - cy) / ((depth * VH1) / 2);
        x0 = Math.min(x0, nx); x1 = Math.max(x1, nx);
        y0 = Math.min(y0, ny); y1 = Math.max(y1, ny);
      }
      const bl = ((x0 + 1) / 2) * L.vw, br = ((x1 + 1) / 2) * L.vw;
      const bt = ((1 - y1) / 2) * L.vh, bb = ((1 - y0) / 2) * L.vh;
      const scale = margin * Math.max((br - bl) / (rect.r - rect.l), (bb - bt) / (rect.b - rect.t));
      out.d *= scale;
      out.sx += (((rect.l + rect.r) / 2 - (bl + br) / 2) / L.vw) * 2;
      out.sy -= (((rect.t + rect.b) / 2 - (bt + bb) / 2) / L.vh) * 2;
    }
    return out;
  }

  function layout() {
    const vw = canvas.clientWidth || innerWidth, vh = canvas.clientHeight || innerHeight;
    L.vw = vw; L.vh = vh; L.aspect = vw / vh;
    L.portrait = L.aspect < 0.9;
    L.tiltK = L.portrait ? 0.7 : 1;
    const g = clamp(vw * 0.05, 20, 48);
    const header = headerEl.getBoundingClientRect().height;
    const heroTop = heroEl.getBoundingClientRect().top;
    const heroRight = Math.max(...lineEls.map((el) => el.getBoundingClientRect().right));
    const leadR = leadEl.getBoundingClientRect();
    const outroH = outroEl.getBoundingClientRect().height;
    const gap = clamp(vh * 0.026, 16, 28);
    const rest = restBox(L.tiltK);
    rest.w *= 1.08; rest.h *= 1.08;

    // Rest: landscape, right of centre above (or beside) the headline; portrait, upper-middle.
    let r0;
    if (L.portrait) {
      const inset = vw * 0.05;
      r0 = { l: g + inset, r: vw - g - inset, t: header + vh * 0.03, b: heroTop - vh * 0.035 };
    } else {
      const above = { l: vw * 0.47, r: vw - g, t: header + vh * 0.02, b: heroTop - vh * 0.04 };
      const beside = { l: Math.max(vw * 0.5, heroRight + vw * 0.04), r: vw - g, t: header + vh * 0.02, b: vh - g };
      r0 = scaleIn(above, rest.w, rest.h) >= scaleIn(beside, rest.w, rest.h) ? above : beside;
    }
    // Dolly: facing the camera, centred, with room above for the opening flap.
    const r1 = L.portrait
      ? { l: g, r: vw - g, t: header + vh * 0.06, b: vh * 0.7 }
      : { l: vw * 0.17, r: vw * 0.83, t: header + vh * 0.03, b: vh - vh * 0.07 };
    // Card half out: the envelope, the open flap and the card; the lead line gets the rest.
    const r2 = L.portrait
      ? { l: g, r: vw - g, t: header, b: leadR.top - vh * 0.03 }
      : { l: Math.max(vw * 0.42, leadR.right + vw * 0.035), r: vw - g, t: header - vh * 0.01, b: vh - g };
    // Final: the card, contain-fit, with the project label beneath it.
    let r3;
    if (!L.portrait) {
      r3 = { l: g, r: vw - g, t: header + vh * 0.005, b: vh - g - outroH - gap };
    } else {
      let ch = (vw - 2 * g) / CARD_ASPECT;
      const avail = vh - g - header - gap - outroH;
      if (ch > avail) ch = avail;
      const top = header + Math.max(0, (avail - ch) * 0.5);
      r3 = { l: (vw - ch * CARD_ASPECT) / 2, r: (vw + ch * CARD_ASPECT) / 2, t: top, b: top + ch };
    }
    L.r3 = r3;
    fitTilted(r0, L.tiltK, 1.05, F0);
    fit(r1, W * 1.04, 3.2, 0, 0.45, 0, F1); // headroom above for the flap as it swings open
    fit(r2, W * 1.02, 3.66, 0, 0.66, 0, F2);
    // Entry: the big envelope. Full frame below the header, fit tighter
    // than the dolly start so the click dives inward, handing off to the
    // scroll-driven dolly as it begins.
    const rE = { l: g, r: vw - g, t: header + vh * 0.02, b: vh - g };
    fit(rE, W * 0.9, 2.62, 0, 0.12, 0, FENTER);

    // Where the card lands on screen, for the label and CTA beneath it.
    const rw = r3.r - r3.l, rh = r3.b - r3.t;
    let cw = rw, ch = rw / CARD_ASPECT;
    if (ch > rh) { ch = rh; cw = rh * CARD_ASPECT; }
    const cx = (r3.l + r3.r) / 2, cy = (r3.t + r3.b) / 2;
    L.cardRect = { l: cx - cw / 2, r: cx + cw / 2, t: cy - ch / 2, b: cy + ch / 2 };
    root.style.setProperty("--card-l", L.cardRect.l.toFixed(1) + "px");
    root.style.setProperty("--card-r", L.cardRect.r.toFixed(1) + "px");
    root.style.setProperty("--card-b", L.cardRect.b.toFixed(1) + "px");

    // Scene 2: the phone beside its text (landscape) or above it (portrait).
    const p2R = p2El.getBoundingClientRect();
    const rP = L.portrait
      ? { l: g, r: vw - g, t: header + vh * 0.012, b: p2R.top - vh * 0.03 }
      : { l: Math.max(vw * 0.46, p2R.right + vw * 0.05), r: vw * 0.9, t: header + vh * 0.02, b: vh - g };
    fit(rP, PH_W * 1.12, PH_H * 1.04, PHONE_AT.x, PHONE_AT.y, PHONE_AT.z + PH_D / 2, FP);

    // Scene 3: the material arc beside its text (landscape) or above it (portrait).
    const s3R = s3El.getBoundingClientRect();
    const arc = layoutArc();
    const rQ = L.portrait
      ? { l: g, r: vw - g, t: header + vh * 0.012, b: s3R.top - vh * 0.03 }
      : { l: Math.max(vw * 0.42, s3R.right + vw * 0.05), r: vw - g, t: header + vh * 0.02, b: vh - g };
    fit(rQ, arc.w * (L.portrait ? 1.45 : 1.1), arc.h * 1.15, arc.cx, arc.cy, arc.cz, FQ);

    // Scene 4: the rings right of the text (landscape) or above it (portrait).
    const s4R = s4El.getBoundingClientRect();
    const rR = L.portrait
      ? { l: g, r: vw - g, t: header + vh * 0.012, b: s4R.top - vh * 0.03 }
      : { l: Math.max(vw * 0.42, s4R.right + vw * 0.05), r: vw - g, t: header + vh * 0.02, b: vh - g };
    fit(rR, 3.4, 4.1, RINGS_C.x, RINGS_C.y, RINGS_C.z, FR);

    // Scene 5: the first station right of the text (landscape) or above it (portrait).
    const s5R = s5El.getBoundingClientRect();
    const rS = L.portrait
      ? { l: g, r: vw - g, t: header + vh * 0.012, b: s5R.top - vh * 0.03 }
      : { l: Math.max(vw * 0.42, s5R.right + vw * 0.05), r: vw - g, t: header + vh * 0.02, b: vh - g };
    fit(rS, 2.4, 4.4, PATH.x, PATH.y + 0.3, PATH.z, FS);

    // Scene 6: the doorway right of the text (landscape) or above it (portrait).
    const s6R = s6El.getBoundingClientRect();
    const rT = L.portrait
      ? { l: g, r: vw - g, t: header + vh * 0.012, b: s6R.top - vh * 0.03 }
      : { l: Math.max(vw * 0.42, s6R.right + vw * 0.05), r: vw - g, t: header + vh * 0.02, b: vh - g };
    fit(rT, 4.6, 3.8, DOOR.x, DOOR.y + 0.3, DOOR.z, FT);

    // Scene 7: the card right of the text (landscape) or above it (portrait).
    const s7R = s7El.getBoundingClientRect();
    const rG = L.portrait
      ? { l: g, r: vw - g, t: header + vh * 0.012, b: s7R.top - vh * 0.03 }
      : { l: Math.max(vw * 0.42, s7R.right + vw * 0.05), r: vw - g, t: header + vh * 0.02, b: vh - g };
    const cardX = L.portrait ? 2.0 : CARD.x, cardY = L.portrait ? 1.7 : CARD.y;
    fit(rG, 2.2, 2.2, cardX, cardY + 0.3, CARD.z, FG);

    // Scene 8: through the doorway — the card and the opening together.
    // Landscape holds the composite; portrait stays on the card with the
    // glow at the frame edge, like scene 7.
    const s8R = s8El.getBoundingClientRect();
    const rH = L.portrait
      ? { l: g, r: vw - g, t: header + vh * 0.012, b: s8R.top - vh * 0.03 }
      : { l: Math.max(vw * 0.42, s8R.right + vw * 0.05), r: vw - g, t: header + vh * 0.02, b: vh - g };
    fit(rH, 2.4, 2.4, L.portrait ? cardX + 0.4 : 5.4, L.portrait ? cardY + 0.2 : 1.6, L.portrait ? CARD.z + 0.6 : -15.2, FH);
  }

  let needsResize = true;
  function resize() {
    needsResize = false;
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const bh = VH1 * 40 * backdropU.uScale.value;
    backdrop.scale.set(bh * camera.aspect, bh, 1);
    backdropU.uAspect.value = camera.aspect;
    dustU.uViewH.value = h * dpr;
    dustU.uMaxSize.value = Math.min(maxPoint, h * dpr * 0.16);
    finish.uniforms.uRes.value.set(w * dpr, h * dpr);
    layout();
    layout(); // the outro's height depends on the width the first pass wrote
  }

  /* ============================================================
     The sequence: one paused timeline, scrubbed by scroll.
     ============================================================ */
  const S = { dolly: 0, open: 0, slide: 0, away: 0, push: 0 }; // owned by the timeline
  const S2 = { leave: 0, travel: 0, turn: 0 };                  // scene 2, also the timeline's
  const I = { exposure: CAPTURE ? 1 : 0, rise: CAPTURE ? 1 : 0, dust: CAPTURE ? 1 : 0 }; // owned by the intro
  const E = { enter: 0 }; // owned by the entry gate: the click-driven dive into the big envelope
  let entered = false, entering = false; // entry gate state (behavior wired in Inputs)
  let headerWas = true; // header visibility cache (scrub-safe application below)
  let hover = 0, hoverT = 0; // envelope hover/focus lean, smoothed in frame()

  const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  tl.to(S, { dolly: 1, duration: 0.2, ease: "power2.inOut" }, 0.1)
    .to(S, { open: 1, duration: 0.17, ease: "power2.inOut" }, 0.27)
    .to(S, { slide: 1, duration: 0.23, ease: "power2.inOut" }, 0.35)
    .to(S, { away: 1, duration: 0.23, ease: "power2.in" }, 0.57)
    .to(S, { push: 1, duration: 0.26, ease: "power2.inOut" }, 0.6);
  // DOM beats. Text keeps plain opacity (it stays in the accessibility tree);
  // links use autoAlpha so an invisible link is never focusable.
  tl.fromTo(hintEl, { opacity: 1 }, { opacity: 0, duration: 0.04, ease: "power1.in" }, 0)
    .fromTo(heroIn, { opacity: 1, yPercent: 0 }, { opacity: 0, yPercent: -32, duration: 0.12, ease: "power2.in" }, 0.06)
    .fromTo(leadIn, { opacity: 0, yPercent: 14 }, { opacity: 1, yPercent: 0, duration: 0.05, ease: "power3.out" }, 0.43)
    .fromTo(leadIn, { opacity: 1, yPercent: 0 }, { opacity: 0, yPercent: -10, duration: 0.035, ease: "power2.in", immediateRender: false }, 0.52)
    .fromTo(topCta, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.04, ease: "power1.in" }, 0.79)
    .fromTo(projectEl, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.06, ease: "power3.out" }, 0.8)
    .fromTo(outroCta, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.06, ease: "power3.out" }, 0.83)
    // Scene 2. The label and the gold CTA leave first, the header's CTA returns
    // (never two CTAs at once), and the second project's beats arrive with the phone.
    .fromTo(projectEl, { opacity: 1, y: 0 }, { opacity: 0, y: -14, duration: 0.035, ease: "power2.in", immediateRender: false }, TP(P2, 0))
    .fromTo(outroCta, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(P2, 0))
    .fromTo(topCta, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05, ease: "power3.out", immediateRender: false }, TP(P2, 0.07))
    .fromTo(workIn, { opacity: 0, yPercent: 12 }, { opacity: 1, yPercent: 0, duration: 0.06, ease: "power3.out" }, TP(P2, 0.1))
    .fromTo(workIn, { opacity: 1, yPercent: 0 }, { opacity: 0, yPercent: -8, duration: 0.035, ease: "power2.in", immediateRender: false }, TP(P2, 0.25))
    .fromTo(p2Head, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.06, ease: "power3.out" }, TP(P2, 0.33))
    .fromTo(p2Lead, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.06, ease: "power3.out" }, TP(P2, 0.36))
    .fromTo(p2Link, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.06, ease: "power3.out" }, TP(P2, 0.39))
    // Scene 3. The phone's beats leave first; the section beat arrives and
    // stays while the five discipline beats cycle beneath it; the last stays.
    .fromTo(p2Head, { opacity: 1, y: 0 }, { opacity: 0, y: -14, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(P_END, 0))
    .fromTo(p2Lead, { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(P_END, 0))
    .fromTo(p2Link, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(P_END, 0))
    .fromTo(s3Head, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.06, ease: "power3.out" }, TP(O3, 0.08))
    .fromTo(s3ds[0], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O3, 0.17))
    .fromTo(s3ds[0], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O3, 0.26))
    .fromTo(s3ds[1], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O3, 0.28))
    .fromTo(s3ds[1], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O3, 0.37))
    .fromTo(s3ds[2], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O3, 0.39))
    .fromTo(s3ds[2], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O3, 0.48))
    .fromTo(s3ds[3], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O3, 0.5))
    .fromTo(s3ds[3], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O3, 0.59))
    .fromTo(s3ds[4], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O3, 0.61))
    // Scene 4. The arc's beats leave first; the section beat arrives and
    // stays while the four principle beats cycle beneath it; the last stays.
    .fromTo(s3Head, { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O4, 0))
    .fromTo(s3ds[4], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O4, 0))
    .fromTo(s4Head, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.06, ease: "power3.out" }, TP(O4, 0.08))
    .fromTo(s4ds[0], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O4, 0.17))
    .fromTo(s4ds[0], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O4, 0.26))
    .fromTo(s4ds[1], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O4, 0.28))
    .fromTo(s4ds[1], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O4, 0.37))
    .fromTo(s4ds[2], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O4, 0.39))
    .fromTo(s4ds[2], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O4, 0.48))
    .fromTo(s4ds[3], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O4, 0.5))
    // Scene 5. The rings' beats leave first; the section beat arrives and
    // stays while the four stage beats cycle beneath it; the last stays.
    .fromTo(s4Head, { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O5, 0))
    .fromTo(s4ds[3], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O5, 0))
    .fromTo(s5Head, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.06, ease: "power3.out" }, TP(O5, 0.08))
    .fromTo(s5ds[0], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O5, 0.17))
    .fromTo(s5ds[0], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O5, 0.26))
    .fromTo(s5ds[1], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O5, 0.28))
    .fromTo(s5ds[1], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O5, 0.37))
    .fromTo(s5ds[2], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O5, 0.39))
    .fromTo(s5ds[2], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O5, 0.48))
    .fromTo(s5ds[3], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O5, 0.5))
    // Scene 6. The path's beats leave first; the section beat arrives and
    // stays while the two body beats and the fact list arrive beneath it;
    // the facts stay.
    .fromTo(s5Head, { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O6, 0))
    .fromTo(s5ds[3], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O6, 0))
    .fromTo(s6Head, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.06, ease: "power3.out" }, TP(O6, 0.08))
    .fromTo(s6ds[0], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O6, 0.17))
    .fromTo(s6ds[0], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O6, 0.26))
    .fromTo(s6ds[1], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O6, 0.28))
    .fromTo(s6ds[1], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O6, 0.37))
    .fromTo(s6ds[2], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O6, 0.39))
    // Scene 7. The door's beats leave first; the section beat arrives and
    // stays while the two route beats and the caveat arrive beneath it;
    // the caveat stays.
    .fromTo(s6Head, { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O7, 0))
    .fromTo(s6ds[2], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O7, 0))
    .fromTo(s7Head, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.06, ease: "power3.out" }, TP(O7, 0.08))
    .fromTo(s7ds[0], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O7, 0.17))
    .fromTo(s7ds[0], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O7, 0.26))
    .fromTo(s7ds[1], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O7, 0.28))
    .fromTo(s7ds[1], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O7, 0.37))
    .fromTo(s7ds[2], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O7, 0.39))
    // The enquiry arrives last in scene 7 and stays with the caveat; the
    // head leaves to give it room. Both exit when scene 8 arrives.
    .fromTo(s7Head, { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O7, 0.46))
    .fromTo(s7t3, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O7, 0.46))
    .fromTo(s7t3, { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O8, 0))
    // Scene 8. The contact beats leave first; the footer beats arrive and
    // all stay, like a footer. Nothing exits: the journey ends in the light.
    // (The head already left when the form arrived; the caveat leaves now.)
    .fromTo(s7ds[2], { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.03, ease: "power2.in", immediateRender: false }, TP(O8, 0))
    .fromTo(s8ds[0], { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.06, ease: "power3.out" }, TP(O8, 0.08))
    .fromTo(s8ds[1], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O8, 0.17))
    .fromTo(s8ds[2], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05, ease: "power3.out" }, TP(O8, 0.26))
    .set({}, {}, TOTAL);
  tl.to(S2, { leave: 1, duration: 0.24, ease: "power2.inOut" }, TP(P2, 0.02))
    .to(S2, { travel: 1, duration: 0.3, ease: "power2.inOut" }, TP(P2, 0.03))
    .to(S2, { turn: 1, duration: 0.36, ease: "power2.inOut" }, TP(P2, 0.2));
  // Fold-back: the products return to the envelope without touching S/S2
  // (downstream scenes are choreographed on their end values). SF.back
  // overrides envelope, flap, card, rig tilt and camera toward hero rest,
  // then releases as services arrive — the envelope sinks aside again.
  tl.to(SF, { back: 1, duration: 0.5, ease: "power2.inOut" }, TP(P_END, 0.02))
    .to(SF, { back: 0, duration: 0.15, ease: "power2.inOut" }, TP(O3, 0));
  // The hero title returns with the envelope so the loop rest is the hero;
  // it leaves again as services arrive. immediateRender:false throughout:
  // nothing may pre-apply at build.
  tl.fromTo(heroIn, { opacity: 0, yPercent: -32 }, { opacity: 1, yPercent: 0, duration: 0.08, ease: "power3.out", immediateRender: false }, TP(P_END, 0.5))
    .fromTo(heroIn, { opacity: 1, yPercent: 0 }, { opacity: 0, yPercent: -32, duration: 0.1, ease: "power2.in", immediateRender: false }, TP(O3, 0.02));
  tl.to(S3, { leave: 1, duration: 0.24, ease: "power2.inOut" }, TP(O3, 0.02))
    .to(S3, { travel: 1, duration: 0.2, ease: "power2.inOut" }, TP(O3, 0.2))
    .to(S3, { focus: 4, duration: 0.45, ease: "none" }, TP(O3, 0.25));
  tl.to(S4, { leave: 1, duration: 0.24, ease: "power2.inOut" }, TP(O4, 0.02))
    .to(S4, { travel: 1, duration: 0.3, ease: "power2.inOut" }, TP(O4, 0.03))
    .to(S4, { focus: 3, duration: 0.55, ease: "none" }, TP(O4, 0.1));
  tl.to(S5, { leave: 1, duration: 0.24, ease: "power2.inOut" }, TP(O5, 0.02))
    .to(S5, { travel: 1, duration: 0.3, ease: "power2.inOut" }, TP(O5, 0.03))
    .to(S5, { focus: 3, duration: 0.5, ease: "none" }, TP(O5, 0.1));
  tl.to(S6, { leave: 1, duration: 0.24, ease: "power2.inOut" }, TP(O6, 0.02))
    .to(S6, { travel: 1, duration: 0.3, ease: "power2.inOut" }, TP(O6, 0.03))
    .to(S6, { focus: 2, duration: 0.5, ease: "none" }, TP(O6, 0.1));
  tl.to(S7, { leave: 1, duration: 0.24, ease: "power2.inOut" }, TP(O7, 0.02))
    .to(S7, { travel: 1, duration: 0.3, ease: "power2.inOut" }, TP(O7, 0.03))
    .to(S7, { focus: 2, duration: 0.5, ease: "none" }, TP(O7, 0.1));
  tl.to(S8, { leave: 1, duration: 0.24, ease: "power2.inOut" }, TP(O8, 0.02))
    .to(S8, { travel: 1, duration: 0.3, ease: "power2.inOut" }, TP(O8, 0.03))
    .to(S8, { focus: 2, duration: 0.5, ease: "none" }, TP(O8, 0.1));

  /* ============================================================
     Render-loop mapping: state -> transforms. The only writer.
     ============================================================ */
  let time = 0;
  const ptr = { x: 0, y: 0 }, ptrT = { x: 0, y: 0 };
  const PARALLAX = FINE && !COARSE && !REDUCED && !CAPTURE;
  const qOrbit = new THREE.Quaternion(), eOrbit = new THREE.Euler(0, 0, 0, "YXZ");
  const focus = new THREE.Vector3(), off = new THREE.Vector3();
  const HERO_TGT = new THREE.Vector3(); // fold scratch: hero key-target

  function update() {
    const { dolly: d, open: o, slide: s, away: a, push: p } = S;
    const t = time;
    const idle = REDUCED ? 0 : (1 - 0.72 * d) * (1 - p);
    const k = L.tiltK * (1 - d);
    const rise = 1 - I.rise;
    // Fold-back override: SF.back eases envelope, flap, card, rig tilt and
    // camera back to hero rest without touching S/S2 (downstream scenes are
    // choreographed on their end values). oe/ae/se are the effective states.
    const be = SF.back;
    const oe = o * (1 - be), ae = a * (1 - be), se = s * (1 - be);

    // Rig: rest tilt -> facing the camera, idle float, intro rise.
    rig.rotation.set(
      REST.rx * k + idle * 0.035 * Math.sin(t * 0.61 + 0.7) + rise * 0.32,
      REST.ry * k + idle * 0.06 * Math.sin(t * 0.43),
      REST.rz * k + idle * 0.018 * Math.sin(t * 0.52 + 2.1)
    );
    rig.position.set(0, idle * 0.07 * Math.sin(t * 0.83) - rise * 1.15, 0);
    if (be > 0) {
      // Blend the rig back to its hero-rest pose (d=0, idle full).
      const ih = REDUCED ? 0 : 1;
      rig.rotation.set(
        lerp(rig.rotation.x, REST.rx * L.tiltK + ih * 0.035 * Math.sin(t * 0.61 + 0.7), be),
        lerp(rig.rotation.y, REST.ry * L.tiltK + ih * 0.06 * Math.sin(t * 0.43), be),
        lerp(rig.rotation.z, REST.rz * L.tiltK + ih * 0.018 * Math.sin(t * 0.52 + 2.1), be)
      );
      rig.position.set(
        lerp(rig.position.x, 0, be),
        lerp(rig.position.y, ih * 0.07 * Math.sin(t * 0.83), be),
        lerp(rig.position.z, 0, be)
      );
    }
    // Entry beckon: the closed envelope rocks gently until entered. Live
    // only — capture never enters, so approved pixels are untouched.
    const beckon = (!CAPTURE && !entered) ? 1 : 0;
    rig.rotation.z += beckon * 0.012 * Math.sin(t * 0.9);
    rig.position.y += beckon * 0.03 * Math.sin(t * 1.1 + 1);
    rig.position.z += hover * 0.18; // lean toward the visitor on hover/focus

    // Top flap and its hinge.
    // Once the envelope starts to fall away, the unsupported flap flops back
    // behind it instead of standing up into the frame on its own.
    pivot.rotation.x = FLAP_OPEN * oe - 1.45 * smooth(0.05, 0.5, ae);
    pivot.position.z = lerp(Z_TOP, Z_TOP_OPEN, smooth(0.35, 0.9, oe));
    topFold.scale.y = Math.max(0.0005, pivot.position.z - Z_BACK); // the top fold rolls with the hinge
    topFold.position.z = (pivot.position.z + Z_BACK) / 2;
    topShadowMat.opacity = 0.55 * (1 - smooth(0, 0.12, oe));

    // Light spill.
    const lit = smooth(0.08, 0.7, oe);
    glowMat.opacity = lit * (1 - 0.6 * ae);
    spillMat.opacity = lit * (1 - smooth(0.05, 0.55, p));
    innerLight.intensity = lit * LIGHT.inner * (1 - smooth(0, 0.6, a));

    // Card: half out, then forward once the envelope has dropped clear.
    card.position.set(0, -0.12 + SLIDE_UP * se + 0.28 * ae, Z_CARD + 0.85 * smooth(0.32, 1, ae));
    card.rotation.x = -0.1 * Math.sin(Math.PI * smooth(0.32, 1, ae));

    // Envelope leaves: straight down first (the card slides out of the pocket),
    // then back and tilting away into the fog.
    env.position.set(0, -5.5 * Math.pow(ae, 1.5), -2.2 * Math.pow(smooth(0.28, 1, ae), 1.2));
    env.rotation.set(-0.95 * smooth(0.28, 1, ae), 0, 0.14 * smooth(0.28, 1, ae));
    env.visible = ae < 0.999 || be > 0.001;

    // Camera: blend the four framings, travel on to the phone, then a small orbit
    // for pointer parallax.
    rig.updateMatrixWorld(true);
    card.getWorldPosition(v3);
    fit(L.r3, CARD_W, CARD_H, v3.x, v3.y, v3.z + CARD_T / 2, F3);
    const s2 = L.portrait ? s : smooth(0, 0.62, s);
    mixFrame(F0, F1, d, FA);
    mixFrame(FA, F2, s2, FB);
    mixFrame(FB, F3, p, FA);
    // Entry: the click-driven dive hands off to the scroll-driven dolly.
    // Exact no-op until entered (and in capture, always). The timeline gate
    // keeps later timeline positions from re-applying the dive.
    const eT = E.enter * (1 - smooth(0, 1, d)) * (1 - smooth(0.1, 0.5, tl.time()));
    if (eT > 0) mixFrame(FA, FENTER, eT, FA);
    // Immersive header: visible pre-entry, dives with E.enter, returns
    // across the fold, leaves again past it. Scrub-symmetric; in capture
    // entered never sets, so this is an exact no-op there.
    let headerOp = 1;
    if (entering) headerOp = 1 - E.enter;
    else if (entered) headerOp = smooth(TP(P_END, 0.48), TP(P_END, 0.63), tl.time()) * (1 - smooth(TP(O3, 0.05), TP(O3, 0.2), tl.time()));
    headerEl.style.opacity = headerOp.toFixed(3);
    const hv = headerOp > 0.02;
    if (hv !== headerWas) {
      headerWas = hv;
      headerEl.style.visibility = hv ? "" : "hidden";
      headerEl.style.pointerEvents = hv ? "" : "none";
      if (hv) headerEl.removeAttribute("aria-hidden");
      else headerEl.setAttribute("aria-hidden", "true");
    }

    // Scene 2. F3 stays on the settled card's place while the card itself eases
    // back and drifts aside into the dark: the previous piece.
    const { leave: lv, travel: tr, turn: tu } = S2;
    card.position.x -= 2.9 * lv;
    card.position.y += 0.2 * lv;
    card.position.z -= 3.4 * lv;
    card.rotation.y = 0.5 * lv;
    card.rotation.z = 0.035 * lv;
    card.visible = lv < 0.999;
    if (be > 0) {
      // Fold-back: cancel the aside drift so the card pockets with the
      // envelope. It stays visible through the fold; the pocket occludes
      // the visibility pop on the way back out.
      card.position.x += 2.9 * lv * be;
      card.position.y -= 0.2 * lv * be;
      card.position.z += 3.4 * lv * be;
      card.rotation.y = 0.5 * lv * (1 - be);
      card.rotation.z = 0.035 * lv * (1 - be);
      card.visible = true;
    }
    const F = tr > 0 ? mixFrame(FA, FP, tr, FC) : FA;
    // Fold-back: the camera returns to hero rest while SF.back holds, then
    // releases with it. Fresh scratch (FF): F may alias FA/FC.
    const FVF = be > 0 ? mixFrame(F, F0, be, FF) : F;
    // Scene 3. The camera pulls on to the arc, then pans along it with focus.
    const FV = S3.travel > 0 ? mixFrame(FVF, FQ, S3.travel, FD) : FVF;
    // Scene 4. The camera rises with the rings.
    const st4 = S4.travel, fc4 = S4.focus;
    const FV2 = st4 > 0 ? mixFrame(FV, FR, st4, FE) : FV;
    // Scene 5. The camera travels the path through the stations.
    const st5 = S5.travel, fc5 = S5.focus;
    const FV3 = st5 > 0 ? mixFrame(FV2, FS, st5, FD) : FV2;
    // Scene 6. The stations sink away as the camera glides on to the door,
    // with a gentle push-in while the beats arrive. Computed after the scene-5
    // pose so the handoff starts from the journey's rest, not its arrival.
    const st6 = S6.travel, fc6 = S6.focus;
    const halfH = (VH1 * FV3.d) / 2, halfW = halfH * L.aspect;
    // Dollies, scaled to the frame so narrow screens travel less. Both fade
    // out as scene 5 takes the camera: past the blend they would land on the
    // shared scratch (the live frame), not the retired one, so fade to zero.
    if (S3.travel > 0 && st5 < 1) FV.x += (S3.focus - 2) * halfW * 0.3 * (1 - st5);
    if (st4 > 0 && st5 < 1) FV2.y += (fc4 - 1.5) * halfH * 0.17 * (1 - st5);
    // Scene 5. The camera rides an explicit path pose: behind the current
    // station-point by GAP, offset left by LX so the journey passes each
    // portal on the right with clearance instead of through it. Faded in by
    // st5 so the arrival framing hands over smoothly. Aspect-aware: narrow
    // screens stand further back with less offset (their frustum is narrower).
    if (st5 > 0) {
      const px = PATH.x + Math.sin(fc5 * 0.9) * PATH.dx;
      const py = PATH.y + fc5 * PATH.dy;
      const pz = PATH.z - fc5 * PATH.dz;
      const GAP = L.portrait ? 8.0 : 6.5;
      const LX = L.portrait ? 1.05 : 1.6;
      const hH = (VH1 * GAP) / 2, hW = hH * L.aspect;
      FV3.x += (px - LX + FV3.sx * hW - FV3.x) * st5;
      FV3.y += (py + 0.35 + FV3.sy * hH - FV3.y) * st5;
      FV3.z += (pz - FV3.z) * st5;
      FV3.d += (GAP - FV3.d) * st5;
    }
    const FV4 = st6 > 0 ? mixFrame(FV3, FT, st6, FE) : FV3;
    if (st6 > 0) FV4.z -= fc6 * 0.35;
    const halfH4 = (VH1 * FV4.d) / 2, halfW4 = halfH4 * L.aspect;
    // Scene 5's framing baked in the pre-pose halves (they were computed before
    // the pose overrode the frame distance); keep them until scene 6 blends in
    // the post-pose ones, so the approved rest pose does not move.
    const halfHc = halfH + (halfH4 - halfH) * st6, halfWc = halfW + (halfW4 - halfW) * st6;
    // Scene 7. The door sinks away as the camera settles on the card, with a
    // gentle push-in while the beats arrive. Computed after the earlier poses
    // so each handoff starts from the live frame.
    const st7 = S7.travel, fc7 = S7.focus;
    const FV5 = st7 > 0 ? mixFrame(FV4, FG, st7, FD) : FV4;
    if (st7 > 0) FV5.z -= fc7 * 0.25;
    const halfH5 = (VH1 * FV5.d) / 2, halfW5 = halfH5 * L.aspect;
    const halfHd = halfHc + (halfH5 - halfHc) * st7, halfWd = halfWc + (halfW5 - halfWc) * st7;
    // Scene 8. The card drifts ahead into the opening and the camera follows
    // to the threshold. FE holds the consumed FV4, so it is free scratch.
    const st8 = S8.travel, fc8 = S8.focus;
    const FV6 = st8 > 0 ? mixFrame(FV5, FH, st8, FE) : FV5;
    if (st8 > 0) FV6.z -= fc8 * 0.22;
    const halfH6 = (VH1 * FV6.d) / 2, halfW6 = halfH6 * L.aspect;
    const halfHe = halfHd + (halfH6 - halfHd) * st8, halfWe = halfWd + (halfW6 - halfWd) * st8;
    camera.position.set(FV6.x - FV6.sx * halfWe, FV6.y - FV6.sy * halfHe, FV6.z + FV6.d);
    DBG.x = FV6.x; DBG.y = FV6.y; DBG.z = FV6.z; DBG.d = FV6.d;
    DBG.sx = FV6.sx; DBG.sy = FV6.sy; DBG.halfW = halfWe; DBG.halfH = halfHe;
    DBG.st5 = st5; DBG.fc5 = fc5;
    camera.quaternion.identity();
    const par = PARALLAX ? Math.max(1 - p, tr) : 0;
    if (par > 0) {
      eOrbit.set(-ptr.y * 0.03 * par, ptr.x * 0.045 * par, 0, "YXZ");
      qOrbit.setFromEuler(eOrbit);
      focus.set(FV6.x, FV6.y, FV6.z);
      off.copy(camera.position).sub(focus).applyQuaternion(qOrbit);
      camera.position.copy(focus).add(off);
      camera.quaternion.copy(qOrbit);
    }

    // The phone: in from the right at a three-quarter angle, then it turns to face
    // the camera, with the envelope's idle float easing as it does.
    phone.visible = tr > 0.001 && S3.leave < 0.999;
    if (phone.visible) {
      const idle2 = REDUCED ? 0 : 1 - 0.72 * tu;
      const arrive = 1 - tr, k2 = L.tiltK;
      phone.position.set(
        PHONE_AT.x + 0.45 * arrive,
        PHONE_AT.y - 0.3 * arrive * arrive + idle2 * 0.06 * Math.sin(t * 0.83),
        PHONE_AT.z - 0.7 * arrive
      );
      handset.rotation.set(
        lerp(PH_REST.rx * k2, 0, tu) + idle2 * 0.03 * Math.sin(t * 0.61 + 0.7),
        lerp((PH_REST.ry - 0.28 * arrive) * k2, 0, tu) + idle2 * 0.05 * Math.sin(t * 0.43),
        lerp(PH_REST.rz * k2, 0, tu) + idle2 * 0.015 * Math.sin(t * 0.52 + 2.1)
      );
      screenU.uBright.value = lerp(0.9, 1, smooth(0.2, 1, tu));
    }

    // Scene 3. The phone eases aside and away: the previous piece.
    const slv = S3.leave;
    phone.position.x -= 2.6 * slv;
    phone.position.y -= 0.5 * slv;
    phone.position.z -= 2.2 * slv;
    handset.rotation.y -= 0.6 * slv;

    // Scene 3 tablets: arc placement from layout, the visiting tablet lifts.
    const st = S3.travel, fc = S3.focus;
    // Scene 4: the whole arc sinks away below as the rings arrive.
    s3.position.y = -5 * S4.leave;
    s3.position.z = -2 * S4.leave;
    s3.visible = st > 0.001 && S4.leave < 0.999;
    if (s3.visible) {
      for (let i = 0; i < 5; i++) {
        const tb = s3tabs[i];
        const wgt = Math.max(0, 1 - Math.abs(fc - i));
        const lift = wgt * wgt * (3 - 2 * wgt);
        tb.grp.position.set(tb.base.x, tb.base.y + 0.12 * lift, tb.base.z + 0.55 * lift);
        tb.grp.rotation.set(S3T.tiltX, tb.rotY * (1 - 0.85 * lift), 0);
      }
      ribbon.rotation.y = REDUCED ? 0.6 : t * 0.5;
      ribbon.rotation.x = 0.35;
    }

    // Scene 4 rings: rising spiral, the visiting ring swells gently.
    s4.visible = st4 > 0.001 && S5.leave < 0.999;
    // Scene 5: the rings rise away above as the path arrives.
    s4.position.y = 6 * S5.leave;
    s4.position.z = -3 * S5.leave;
    // Scene 5 stations: the camera travels the path through them.
    s5.visible = st5 > 0.001 && S6.leave < 0.999;
    // Scene 6: the stations sink away as the door arrives.
    s5.position.y = -5 * S6.leave;
    // Scene 6 doorway: warm light at the end of the path.
    s6.visible = st6 > 0.001;
    // The practical stays dark until its scene: it sits close enough to the
    // last station to kiss it with warmth otherwise.
    doorLight.intensity = st6 * (25 + 7 * smooth(0, 2, fc8));
    // Scene 6: the door stays where it is — the card arrives before it, so
    // the doorway becomes the new scene's glowing backdrop. It barely settles
    // as the camera moves on.
    s6.position.y = DOOR.y - 0.5 * S7.leave;
    // Scene 7 card: hovering invitation, gently bobbing (still when reduced).
    // Portrait parks the card well left of the tall doorway: the narrow frame
    // cannot hold both, so the card floats on dark warmth with only a kiss of
    // the door's glow at the frame edge, and the text stays on darkness.
    s7.visible = st7 > 0.001;
    const cardX = L.portrait ? 2.0 : CARD.x, cardY = L.portrait ? 1.7 : CARD.y;
    s7.position.x = cardX;
    // Scene 8: the card drifts ahead into the lit opening, rising a little
    // and settling to face the camera. In portrait the narrow frame cannot
    // hold card and doorway at once, so the card instead comes toward the
    // viewer: the invitation offers itself. Absolute assignments, no drift.
    const drift = S8.travel;
    const toViewer = L.portrait ? 1 : 0;
    s7.position.z = CARD.z + drift * (toViewer ? 1.1 : -1.3);
    const bob = REDUCED ? 0 : 1;
    s7.position.y = cardY + drift * (toViewer ? 0.1 : 0.25) + bob * 0.06 * Math.sin(t * 0.83);
    // Angled so the card's face turns toward the camera: its left edge is
    // nearer, the seal catching the key from the left; facing at the end.
    s7.rotation.y = 0.22 - drift * (toViewer ? 0.12 : 0.17) + bob * 0.04 * Math.sin(t * 0.5);
    s7.scale.setScalar(1 + drift * (toViewer ? 0.15 : -0.15));
    // The lights stay on the card as it drifts.
    CARD_C.copy(s7.position);
    CARD_RIM.set(s7.position.x + 2.2, s7.position.y + 1.2, s7.position.z - 1.0);
    if (s4.visible) {
      for (let i = 0; i < 4; i++) {
        const rg = s4rings[i];
        const wgt = Math.max(0, 1 - Math.abs(fc4 - i));
        const swell = wgt * wgt * (3 - 2 * wgt);
        const sc = 1 + 0.14 * swell;
        rg.scale.set(sc, sc, sc);
        if (!REDUCED) rg.rotation.y = t * 0.3 + i * 1.7;
      }
    }

    // The lights travel with the subject: the key's falloff and target, the gold rim.
    poolU.uPoolCentre.value.set(
      lerp(-1.05, PHONE_AT.x - 0.9, tr),
      lerp(rig.position.y + 0.85 + s * 0.9, PHONE_AT.y + 0.9, tr),
      lerp(0.6, PHONE_AT.z + 0.8, tr)
    );
    key.target.position.set(lerp(0, PHONE_AT.x, tr), lerp(rig.position.y * 0.5 + s * 0.5, PHONE_AT.y, tr), lerp(0, PHONE_AT.z, tr));
    key.position.copy(key.target.position).addScaledVector(KEY_DIR, 12);
    rim.position.set(lerp(3.6, PHONE_AT.x + 2.6, tr), lerp(1.5, PHONE_AT.y + 1.4, tr), lerp(-0.9, PHONE_AT.z - 1.5, tr));
    // Scene 3: lights ride on from the phone to the arc.
    poolU.uPoolCentre.value.lerp(ARC_POOL, st);
    key.target.position.lerp(ARC_TGT, st);
    key.position.copy(key.target.position).addScaledVector(KEY_DIR, 12);
    rim.position.lerp(ARC_RIM, st);
    // Scene 4: lights ride on from the arc to the rings.
    poolU.uPoolCentre.value.lerp(RINGS_C, st4);
    key.target.position.lerp(RINGS_C, st4);
    key.position.copy(key.target.position).addScaledVector(KEY_DIR, 12);
    rim.position.lerp(RINGS_RIM, st4);
    // Scene 5: lights ride on from the rings to the path midpoint.
    poolU.uPoolCentre.value.lerp(PATH_MID, st5);
    key.target.position.lerp(PATH_MID, st5);
    key.position.copy(key.target.position).addScaledVector(KEY_DIR, 12);
    rim.position.lerp(PATH_RIM, st5);
    // Scene 6: lights ride on from the path to the doorway.
    poolU.uPoolCentre.value.lerp(DOOR_C, st6);
    key.target.position.lerp(DOOR_C, st6);
    key.position.copy(key.target.position).addScaledVector(KEY_DIR, 12);
    rim.position.lerp(DOOR_RIM, st6);
    // Scene 7: lights ride on from the door to the card.
    poolU.uPoolCentre.value.lerp(CARD_C, st7);
    key.target.position.lerp(CARD_C, st7);
    key.position.copy(key.target.position).addScaledVector(KEY_DIR, 12);
    rim.position.lerp(CARD_RIM, st7);
    if (be > 0) {
      // Fold-back: the key target, pool centre and rim all carry scene-2's
      // rest values (S/S2 stay there); blend them home so the loop rest
      // lights exactly like the hero. Reference values use s=0 (true hero).
      HERO_TGT.set(0, rig.position.y * 0.5, 0);
      key.target.position.lerp(HERO_TGT, be);
      key.position.copy(key.target.position).addScaledVector(KEY_DIR, 12);
      HERO_TGT.set(-1.05, rig.position.y + 0.85, 0.6);
      poolU.uPoolCentre.value.lerp(HERO_TGT, be);
      HERO_TGT.set(3.6, 1.5, -0.9);
      rim.position.lerp(HERO_TGT, be);
    }
    const back = smooth(0, 1, tr); // scene 2 brings back the atmosphere the settled card cleared

    // Backdrop pool follows the subject on screen.
    backdropU.uCenter.value.set(FV6.sx, FV6.sy);
    backdropU.uAmt.value = lerp(1 - 0.45 * smooth(0.4, 1, p), 1, back); // quieter ground under the label at the end
    dustU.uPoolNdc.value.set(FV6.sx, FV6.sy, L.aspect);

    // Bloom swells as the flap opens, eases off as the card fills the frame.
    // Scene 2 keeps it off: the true-colour screen is pre-inverted into HDR and would flare.
    bloom.strength = (LIGHT.bloom[0] + LIGHT.bloom[1] * lit) * (1 - smooth(0.15, 0.72, p * (1 - be))) * (1 + 0.12 * smooth(0, 2, fc8));
    bloom.enabled = bloom.strength > 0.004;
    fxaa.enabled = p < 0.97 || tr > 0.02; // the settled card is screen-aligned and must stay pixel-crisp

    // Card: dim inside the pocket, true colour at full screen, dimming again as it leaves.
    const dim = smooth(0, 0.8, lv);
    cardU.uBright.value = (lerp(0.58, 0.84, smooth(0.05, 0.9, s)) + 0.16 * smooth(0.35, 0.95, p)) * (1 - 0.6 * dim);
    cardU.uTrue.value = smooth(0.6, 1, p) * (1 - dim);
    cardU.uBias.value = -0.45 * smooth(0.75, 1, p) * (1 - smooth(0, 0.3, lv));

    // Dust focuses on the subject and clears for the card.
    dustU.uTime.value = t;
    dustU.uFocus.value = FVF.d; // fold-aware base: F aliases FA/FC, whose .d differs post-fold
    dustU.uFade.value = I.dust * Math.max(1 - smooth(0.3, 0.85, p), back);

    finish.uniforms.uTime.value = t;
    finish.uniforms.uVignette.value = 0.32 * Math.max(1 - smooth(0.35, 0.95, p), back);
    finish.uniforms.uGrain.value = 0.032 * Math.max(1 - smooth(0.45, 0.95, p), back);

    renderer.toneMappingExposure = I.exposure;
  }

  /* ---- Inputs ---- */
  let scrollTarget = 0, progress = 0;
  const readScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollTarget = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
  };

  resize();

  if (!CAPTURE) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    readScroll();
    progress = scrollTarget;
    addEventListener("scroll", readScroll, { passive: true });
    addEventListener("resize", () => { needsResize = true; readScroll(); });
    if (PARALLAX) {
      addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        ptrT.x = (e.clientX / innerWidth) * 2 - 1;
        ptrT.y = (e.clientY / innerHeight) * 2 - 1;
      }, { passive: true });
    }

    /* ---- Entry gate: the hero envelope opens on click/tap/Enter, never on
       scroll. Scroll stays locked until the dive completes; the header fades
       for the immersive journey (step 3 restores it at the fold-back). ---- */
    const enterProxy = document.getElementById("enterProxy");
    function enter() {
      if (entered || entering || CAPTURE) return;
      if (root.dataset.scene !== "ready") return; // loader/intro still playing
      entering = true;
      if (enterProxy) {
        enterProxy.setAttribute("tabindex", "-1");
        enterProxy.setAttribute("aria-hidden", "true");
        if (document.activeElement === enterProxy) enterProxy.blur();
      }
      hoverT = 0;
      canvas.style.cursor = "";
      gsap.to(E, { enter: 1, duration: REDUCED ? 0.01 : 1.4, ease: "power2.inOut",
        onComplete: () => { entered = true; entering = false; } });
    }
    // Replay: only when the envelope sits closed at the loop rest (SF.back
    // holds). The exposure dips to mask the invisible seek (dust/bob phases
    // jump), the page resets to hero, and the normal entry path replays.
    function replay() {
      if (!entered || entering) return;
      if (SF.back < 0.95) return;
      const t = tl.time();
      if (t < TP(P_END, 0.6) || t > TP(O3, 0.2)) return;
      gsap.to(I, { exposure: 0.3, duration: 0.18, ease: "power1.in", overwrite: "auto",
        onComplete: () => {
          window.scrollTo(0, 0);
          E.enter = 0; entered = false;
          enter();
          gsap.to(I, { exposure: 1, duration: 0.8, ease: "power2.out", overwrite: "auto" });
        } });
    }
    const lockScroll = (e) => { if (!entered) e.preventDefault(); };
    addEventListener("wheel", lockScroll, { passive: false });
    addEventListener("touchmove", lockScroll, { passive: false });
    addEventListener("keydown", (e) => {
      if (entered) return;
      // Let focused controls keep their keys: Space on the entry proxy
      // itself must still activate it.
      const tag = (e.target && e.target.tagName) || "";
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(tag)) return;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown" ||
          e.key === "PageUp" || e.key === "PageDown" || e.key === "Home" || e.key === "End") e.preventDefault();
    });
    const pickRay = new THREE.Raycaster(), pickNdc = new THREE.Vector2();
    const pickEnv = (e) => {
      pickNdc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      pickRay.setFromCamera(pickNdc, camera);
      return pickRay.intersectObject(rig, true).length > 0;
    };
    let downX = 0, downY = 0;
    canvas.addEventListener("pointerdown", (e) => { downX = e.clientX; downY = e.clientY; });
    canvas.addEventListener("pointerup", (e) => {
      if (entering) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;
      if (!pickEnv(e)) return;
      if (!entered) enter();
      else replay(); // keyboard replay stays out: the proxy is inert after entry
    });
    canvas.addEventListener("pointermove", (e) => {
      if (entered || entering || e.pointerType === "touch") { hoverT = 0; canvas.style.cursor = ""; return; }
      const hit = pickEnv(e);
      hoverT = hit ? 1 : 0;
      canvas.style.cursor = hit ? "pointer" : "";
    });
    if (enterProxy) {
      enterProxy.addEventListener("click", enter);
      enterProxy.addEventListener("focus", () => { if (!entered) hoverT = 1; });
      enterProxy.addEventListener("blur", () => { hoverT = 0; });
    }
  } else {
    addEventListener("resize", () => resize());
  }

  // Compile everything while the loader is still up.
  tl.progress(0);
  update();
  phone.visible = true; // compile scene 2's programs now, not mid-scroll
  s3.visible = true; // same for scene 3
  s4.visible = true; // same for scene 4
  s5.visible = true; // same for scene 5
  s6.visible = true; // same for scene 6
  s7.visible = true; // same for scene 7
  renderer.initTexture(posterTex);
  if (renderer.extensions.has("KHR_parallel_shader_compile")) await renderer.compileAsync(scene, camera);
  else renderer.compile(scene, camera);
  update();
  composer.render(0);
  setLoad(1);

  if (CAPTURE) {
    // With the phone in view, the screen video is seeked to `videoTime` (default:
    // `seconds`, looped) and the frame is awaited, so recordings show it moving.
    window.__proto.renderFrame = async (p, seconds, videoTime) => {
      tl.progress(clamp(p, 0, 1));
      time = seconds || 0;
      update();
      if (videoOk && phone.visible) {
        const dur = video.duration || 1;
        const vt = (((videoTime == null ? time : videoTime) % dur) + dur) % dur;
        if (Math.abs(video.currentTime - vt) > 0.0005) {
          await new Promise((r) => {
            video.addEventListener("seeked", r, { once: true });
            video.currentTime = vt;
          });
        }
        videoTex.needsUpdate = true;
      }
      composer.render(1 / 30);
      return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    };
    window.__proto.total = TOTAL;
    window.__proto.video = () => ({ ok: videoOk, time: video && video.currentTime, duration: video && video.duration });
    window.__proto.debug = { THREE, renderer, scene, camera, composer, bloom, finish, key, rim, hemi, innerLight,
      glowMat, spillMat, paperMat, linerMat, waxCapMat, waxBodyMat, foilMat, dustU, backdropU, cardU, S, I, L, LIGHT, rig, env, card, seal, pivot,
      S2, phone, handset, screenU, screenMat, glassMat, graphiteMat, champagneMat, FP,
      S3, s3, s3tabs, ribbon, plinth, FQ,
      S4, s4, s4rings, FR,
      S5, s5, FS, ST3, DBG,
      S6, s6, FT,
      S7, s7, FG,
      S8, FH };
    window.__proto.info = () => ({
      dpr,
      samples: SAMPLES,
      shadows: SHADOWS,
      coarse: COARSE,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      textures: renderer.info.memory.textures,
      geometries: renderer.info.memory.geometries,
      programs: renderer.info.programs ? renderer.info.programs.length : null,
      cardRect: L.cardRect,
      portrait: L.portrait,
    });
    askVideo();
    await Promise.race([videoReady, wait(10000)]);
    root.dataset.scene = "ready";
    readyHandlers.resolve({ static: false, video: videoOk });
    return;
  }

  /* ---- Loop ---- */
  // Frame-time guard: once the intro has settled, if ~1.5 s of frames average
  // under 48 fps, step the pixel ratio down (2 -> 1.5 -> 1.25 -> 1) and resize.
  const DPR_STEPS = [...new Set([DPR_MAX, Math.min(DPR_MAX, 1.5), Math.min(DPR_MAX, 1.25), 1])];
  let perfLevel = 0, perfFrames = 0, perfTime = 0;
  function guard(dt) {
    if (perfLevel >= DPR_STEPS.length - 1 || root.dataset.scene !== "ready") return;
    perfTime += dt;
    if (++perfFrames < 90) return;
    if (perfTime / perfFrames > 1 / 48) {
      dpr = DPR_STEPS[++perfLevel];
      renderer.setPixelRatio(dpr);
      composer.setPixelRatio(dpr);
      needsResize = true;
    }
    perfFrames = 0;
    perfTime = 0;
  }

  let running = false, raf = 0, last = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    time += dt;
    guard(dt);
    if (needsResize) resize();
    progress += (scrollTarget - progress) * (1 - Math.exp(-dt * 6.5));
    if (Math.abs(scrollTarget - progress) < 0.00005) progress = scrollTarget;
    tl.progress(progress);
    const kp = 1 - Math.exp(-dt * 2.6);
    ptr.x += (ptrT.x - ptr.x) * kp;
    ptr.y += (ptrT.y - ptr.y) * kp;
    hover += (hoverT - hover) * kp;
    update();
    if (tl.time() > 0.7) askVideo();
    if (videoOk) {
      const want = S2.travel > 0.2 && S3.travel < 0.3;
      if (want && video.paused) video.play().catch(() => {});
      else if (!want && !video.paused) video.pause();
    }
    composer.render(dt);
  }
  const start = () => {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
    if (video && !video.paused) video.pause();
  };
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  // A lost GPU context (a phone reclaiming memory in the background) would leave a
  // black canvas; the static page is the honest fallback.
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    stop();
    goStatic("context-lost");
  });

  /* ---- Intro: the loader fades, exposure rises from black, the envelope rises
     into place, the dust fades in and the headline staggers in, once. ---- */
  const r = REDUCED;
  const intro = gsap.timeline({ paused: true, onComplete: () => { root.dataset.scene = "ready"; } });
  intro
    .to(I, { exposure: 1, duration: r ? 0.6 : 1.9, ease: "power2.out" }, 0.05)
    .to(I, { rise: 1, duration: r ? 0.01 : 2.4, ease: "power3.out" }, 0)
    .to(I, { dust: 1, duration: r ? 0.6 : 2.2, ease: "sine.inOut" }, r ? 0 : 0.35)
    .fromTo([brandEl, topCtaLink], { opacity: 0, y: r ? 0 : -8 },
      { opacity: 1, y: 0, duration: r ? 0.5 : 1.1, ease: "power3.out", stagger: 0.08 }, r ? 0.1 : 0.55)
    .fromTo(lineEls, { opacity: 0, yPercent: r ? 0 : 30 },
      { opacity: 1, yPercent: 0, duration: r ? 0.5 : 1.25, ease: "power3.out", stagger: r ? 0 : 0.13 }, r ? 0.1 : 0.75)
    .fromTo(hintIn, { opacity: 0 }, { opacity: 1, duration: r ? 0.4 : 0.9, ease: "power2.out" }, r ? 0.2 : 1.7);

  root.dataset.scene = "intro";
  start();
  intro.play(0);
}
