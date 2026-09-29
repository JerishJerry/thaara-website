/* ============================================================
   THAARA prototype: "The invitation opens"

   One full-screen WebGL scene. Scrolling drives a paused GSAP timeline that
   tweens two things only: the plain `S` object (normalized 0..1 params) and
   the DOM text beats. The render loop is the only writer of scene transforms:
   it maps `S` to positions and rotations with viewport-aware framing math,
   recomputed on resize.

   ?capture   no loop, no loader, no intro; exposes window.__proto for
              deterministic frame capture (verification and video)
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
  const [invTex, logoImg] = await Promise.all([
    new THREE.TextureLoader(manager).loadAsync(ASSETS.invitation),
    new THREE.ImageLoader(manager).loadAsync(ASSETS.logo),
  ]);
  await Promise.race([fontsReady, wait(4000)]);
  invTex.colorSpace = THREE.SRGBColorSpace;
  invTex.anisotropy = aniso;

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
  cardMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, cardU);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTrue;\nuniform float uBright;\nuniform float uBias;\n" + INV_NEUTRAL_GLSL)
      .replace(
        "#include <map_fragment>",
        [
          "#ifdef USE_MAP",
          "  diffuseColor *= texture2D( map, vMapUv, uBias );",
          "#endif",
          "diffuseColor.rgb *= uBright;",
          "diffuseColor.rgb = mix( diffuseColor.rgb, invNeutral( diffuseColor.rgb ), uTrue );",
        ].join("\n")
      );
  };

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
  const F0 = {}, F1 = {}, F2 = {}, F3 = {}, FA = {}, FB = {};
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

    // Where the card lands on screen, for the label and CTA beneath it.
    const rw = r3.r - r3.l, rh = r3.b - r3.t;
    let cw = rw, ch = rw / CARD_ASPECT;
    if (ch > rh) { ch = rh; cw = rh * CARD_ASPECT; }
    const cx = (r3.l + r3.r) / 2, cy = (r3.t + r3.b) / 2;
    L.cardRect = { l: cx - cw / 2, r: cx + cw / 2, t: cy - ch / 2, b: cy + ch / 2 };
    root.style.setProperty("--card-l", L.cardRect.l.toFixed(1) + "px");
    root.style.setProperty("--card-r", L.cardRect.r.toFixed(1) + "px");
    root.style.setProperty("--card-b", L.cardRect.b.toFixed(1) + "px");
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
  const I = { exposure: CAPTURE ? 1 : 0, rise: CAPTURE ? 1 : 0, dust: CAPTURE ? 1 : 0 }; // owned by the intro

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
    .set({}, {}, 1);

  /* ============================================================
     Render-loop mapping: state -> transforms. The only writer.
     ============================================================ */
  let time = 0;
  const ptr = { x: 0, y: 0 }, ptrT = { x: 0, y: 0 };
  const PARALLAX = FINE && !COARSE && !REDUCED && !CAPTURE;
  const qOrbit = new THREE.Quaternion(), eOrbit = new THREE.Euler(0, 0, 0, "YXZ");
  const focus = new THREE.Vector3(), off = new THREE.Vector3();

  function update() {
    const { dolly: d, open: o, slide: s, away: a, push: p } = S;
    const t = time;
    const idle = REDUCED ? 0 : (1 - 0.72 * d) * (1 - p);
    const k = L.tiltK * (1 - d);
    const rise = 1 - I.rise;

    // Rig: rest tilt -> facing the camera, idle float, intro rise.
    rig.rotation.set(
      REST.rx * k + idle * 0.035 * Math.sin(t * 0.61 + 0.7) + rise * 0.32,
      REST.ry * k + idle * 0.06 * Math.sin(t * 0.43),
      REST.rz * k + idle * 0.018 * Math.sin(t * 0.52 + 2.1)
    );
    rig.position.set(0, idle * 0.07 * Math.sin(t * 0.83) - rise * 1.15, 0);

    // Top flap and its hinge.
    // Once the envelope starts to fall away, the unsupported flap flops back
    // behind it instead of standing up into the frame on its own.
    pivot.rotation.x = FLAP_OPEN * o - 1.45 * smooth(0.05, 0.5, a);
    pivot.position.z = lerp(Z_TOP, Z_TOP_OPEN, smooth(0.35, 0.9, o));
    topFold.scale.y = Math.max(0.0005, pivot.position.z - Z_BACK); // the top fold rolls with the hinge
    topFold.position.z = (pivot.position.z + Z_BACK) / 2;
    topShadowMat.opacity = 0.55 * (1 - smooth(0, 0.12, o));

    // Light spill.
    const lit = smooth(0.08, 0.7, o);
    glowMat.opacity = lit * (1 - 0.6 * a);
    spillMat.opacity = lit * (1 - smooth(0.05, 0.55, p));
    innerLight.intensity = lit * LIGHT.inner * (1 - smooth(0, 0.6, a));

    // Card: half out, then forward once the envelope has dropped clear.
    card.position.set(0, -0.12 + SLIDE_UP * s + 0.28 * a, Z_CARD + 0.85 * smooth(0.32, 1, a));
    card.rotation.x = -0.1 * Math.sin(Math.PI * smooth(0.32, 1, a));

    // Envelope leaves: straight down first (the card slides out of the pocket),
    // then back and tilting away into the fog.
    env.position.set(0, -5.5 * Math.pow(a, 1.5), -2.2 * Math.pow(smooth(0.28, 1, a), 1.2));
    env.rotation.set(-0.95 * smooth(0.28, 1, a), 0, 0.14 * smooth(0.28, 1, a));
    env.visible = a < 0.999;

    // Camera: blend the four framings, then a small orbit for pointer parallax.
    rig.updateMatrixWorld(true);
    card.getWorldPosition(v3);
    fit(L.r3, CARD_W, CARD_H, v3.x, v3.y, v3.z + CARD_T / 2, F3);
    const s2 = L.portrait ? s : smooth(0, 0.62, s);
    mixFrame(F0, F1, d, FA);
    mixFrame(FA, F2, s2, FB);
    mixFrame(FB, F3, p, FA);
    const halfH = (VH1 * FA.d) / 2, halfW = halfH * L.aspect;
    camera.position.set(FA.x - FA.sx * halfW, FA.y - FA.sy * halfH, FA.z + FA.d);
    camera.quaternion.identity();
    const par = PARALLAX ? 1 - p : 0;
    if (par > 0) {
      eOrbit.set(-ptr.y * 0.03 * par, ptr.x * 0.045 * par, 0, "YXZ");
      qOrbit.setFromEuler(eOrbit);
      focus.set(FA.x, FA.y, FA.z);
      off.copy(camera.position).sub(focus).applyQuaternion(qOrbit);
      camera.position.copy(focus).add(off);
      camera.quaternion.copy(qOrbit);
    }
    poolU.uPoolCentre.value.set(-1.05, rig.position.y + 0.85 + s * 0.9, 0.6);
    key.target.position.set(0, rig.position.y * 0.5 + s * 0.5, 0);
    key.position.copy(key.target.position).addScaledVector(KEY_DIR, 12);

    // Backdrop pool follows the subject on screen.
    backdropU.uCenter.value.set(FA.sx, FA.sy);
    backdropU.uAmt.value = 1 - 0.45 * smooth(0.4, 1, p); // quieter ground under the label at the end
    dustU.uPoolNdc.value.set(FA.sx, FA.sy, L.aspect);

    // Bloom swells as the flap opens, eases off as the card fills the frame.
    bloom.strength = (LIGHT.bloom[0] + LIGHT.bloom[1] * lit) * (1 - smooth(0.15, 0.72, p));
    bloom.enabled = bloom.strength > 0.004;
    fxaa.enabled = p < 0.97; // the settled card is screen-aligned and must stay pixel-crisp

    // Card: dim inside the pocket, true colour at full screen.
    cardU.uBright.value = lerp(0.58, 0.84, smooth(0.05, 0.9, s)) + 0.16 * smooth(0.35, 0.95, p);
    cardU.uTrue.value = smooth(0.6, 1, p);
    cardU.uBias.value = -0.45 * smooth(0.75, 1, p);

    // Dust focuses on the subject and clears for the card.
    dustU.uTime.value = t;
    dustU.uFocus.value = FA.d;
    dustU.uFade.value = I.dust * (1 - smooth(0.3, 0.85, p));

    finish.uniforms.uTime.value = t;
    finish.uniforms.uVignette.value = 0.32 * (1 - smooth(0.35, 0.95, p));
    finish.uniforms.uGrain.value = 0.032 * (1 - smooth(0.45, 0.95, p));

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
  } else {
    addEventListener("resize", () => resize());
  }

  // Compile everything while the loader is still up.
  tl.progress(0);
  update();
  if (renderer.extensions.has("KHR_parallel_shader_compile")) await renderer.compileAsync(scene, camera);
  else renderer.compile(scene, camera);
  composer.render(0);
  setLoad(1);

  if (CAPTURE) {
    window.__proto.renderFrame = (p, seconds) => {
      tl.progress(clamp(p, 0, 1));
      time = seconds || 0;
      update();
      composer.render(1 / 30);
      return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    };
    window.__proto.debug = { THREE, renderer, scene, camera, composer, bloom, finish, key, rim, hemi, innerLight,
      glowMat, spillMat, paperMat, linerMat, waxCapMat, waxBodyMat, foilMat, dustU, backdropU, cardU, S, I, L, LIGHT, rig, env, card, seal, pivot };
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
    root.dataset.scene = "ready";
    readyHandlers.resolve({ static: false });
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
    update();
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
