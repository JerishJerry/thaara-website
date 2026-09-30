/* Hero envelope flight: scene module.
   Copied from prototype/proto.js (never imported): tokens, math, procedural
   textures, renderer, materials, envelope, card, phone + screen video, lights,
   framing, the state mapping, and the loop. Not ported: loader/intro, scroll
   track, DOM text beats, scenes 3-8, bloom, 3D dust.
   Everything lives inside start(), like proto.js boot(). */

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const ASSETS = {
  invitation: new URL("../../invitation-1624.webp", import.meta.url).toString(),
  logo: new URL("../../logo-256.png", import.meta.url).toString(),
  phonePoster: new URL("../../leo-asnia-1200.webp", import.meta.url).toString(),
  phoneVideo: new URL("../../leo-asnia-scroll.mp4", import.meta.url).toString(),
};

export async function start() {
  const root = document.documentElement;
  const stage = document.querySelector(".envelope-stage");
  const slot = document.querySelector(".hero-visual");
  const heroEl = document.querySelector(".hero");
  const headerEl = document.getElementById("nav");
  const openBtn = document.getElementById("envelopeOpen");
  if (!stage || !slot || !heroEl || !headerEl) return;
  const DEBUG = /[?&]debug(=|&|$)/.test(location.search);

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COARSE = matchMedia("(pointer: coarse)").matches;

  /* ---- Brand tokens, read from styles.css (no colour literals in JS) ---- */
  const css = getComputedStyle(root);
  const TOK = {};
  for (const n of ["bg", "bg-alt", "bg-soft", "bg-raise", "ink", "ink-dim", "ink-faint", "gold", "gold-lift", "on-gold"]) {
    TOK[n] = css.getPropertyValue("--" + n).trim();
  }
  const col = (name) => new THREE.Color(TOK[name]); // sRGB hex -> linear working colour

  /* ---- Envelope geometry (world units) ---- */
  const W = 3.4, H = 2.3, HW = W / 2, HH = H / 2;
  const CARD_W = 3.08, CARD_H = 1.838, CARD_T = 0.008, CARD_ASPECT = CARD_W / CARD_H;
  const SIDE_APEX = 0.14;
  const BOTTOM_APEX = 0.18;
  const TOP_APEX = -0.18;
  const Z_BACK = 0.005;
  const Z_GLOW = 0.0065;
  const Z_CARD = 0.012;
  const Z_SIDE_SHADOW = 0.019;
  const Z_SIDE = 0.022;
  const Z_BOTTOM_SHADOW = 0.024;
  const Z_BOTTOM = 0.026;
  const Z_TOP_SHADOW = 0.028;
  const Z_TOP = 0.03;
  const Z_TOP_OPEN = 0.006;
  const FLAP_OPEN = -3.26;
  const SLIDE_UP = 1.27;
  const REST = { rx: 0.22, ry: -0.38, rz: -0.06 };
  const FOV = 35;
  const LIGHT = {
    env: 0.24,
    key: 5.6,
    pool: [3.0, 0.58],
    rim: 30,
    hemi: 0.16,
    inner: 0.5,
    glow: 1.35,
    plume: 1.05,
  };
  const VH1 = 2 * Math.tan((FOV * Math.PI) / 360);

  /* ---- The phone (world units) ---- */
  const SCREEN_ASPECT = 720 / 1558;
  const PH_W = 1.22, PH_D = 0.13, PH_BEZEL = 0.052, PH_R = 0.17, PH_BEVEL = 0.03;
  const PH_SW = PH_W - 2 * PH_BEZEL, PH_SH = PH_SW / SCREEN_ASPECT, PH_H = PH_SH + 2 * PH_BEZEL;
  const PHONE_AT = { x: 5.6, y: 1.43, z: -0.4 };
  const PH_REST = { rx: 0.08, ry: -0.74, rz: -0.03 };

  /* ---- Flight beats (about 7.8 s of content; scroll-scrubbed, not clock-played) ---- */
  const BEATS = { expand: 0.8, pushPast: 0.6, work01: 1.8, work02: 2.2, flapCard: 1.2, foldBack: 1.2 };
  const SCROLL_PX = 2400; // wheel/touch px for the full flight
  const EXIT_PX = 300; // upward overscroll at 0 that backs out of the flight
  const T1 = BEATS.expand + BEATS.pushPast; // 1.4
  const T2 = T1 + BEATS.work01;             // 3.2
  const T3 = T2 + BEATS.work02;             // 5.4
  const T4 = T3 + BEATS.flapCard;           // 6.6

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

  /* The final OutputPass applies Khronos PBR Neutral tone mapping. This is its
     exact inverse (toe and shoulder), so lit paper and the card land on their
     intended values after the tone mapper. */
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

  /* ---- Procedural PBR maps (copied from the prototype) ---- */
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
  function makeWaxNoise(size, aniso) {
    const rnd = rng(31);
    const h = fbm(size, 8, 4, rnd);
    return canvasTex(normalCanvas(h, size, 3, true), false, aniso, 1);
  }
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
  const TOP_TIP = -(HH - TOP_APEX);
  const FLAP = {
    left: (p, oy) => traceTri(p, -HW, HH, -SIDE_APEX, 0, -HW, -HH, 0.22, oy),
    right: (p, oy) => traceTri(p, HW, -HH, SIDE_APEX, 0, HW, HH, 0.22, oy),
    bottom: (p, oy) => traceTri(p, HW, -HH, 0, BOTTOM_APEX, -HW, -HH, 0.32, oy),
    top: (p, oy) => traceTri(p, -HW, 0, 0, TOP_TIP, HW, 0, 0.34, oy),
  };
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

  /* ---- Renderer (transparent: the page is the backdrop at rest) ---- */
  const SHADOWS = !COARSE;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, stencil: false, powerPreference: "high-performance" });
  const DPR_MAX = Math.min(window.devicePixelRatio || 1, COARSE ? 1.5 : 2);
  renderer.setPixelRatio(DPR_MAX);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = SHADOWS;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  stage.appendChild(canvas);

  /* ---- Assets (loaded during boot, after page load) ---- */
  const [invTex, logoImg, posterTex] = await Promise.all([
    new THREE.TextureLoader().loadAsync(ASSETS.invitation),
    new THREE.ImageLoader().loadAsync(ASSETS.logo),
    new THREE.TextureLoader().loadAsync(ASSETS.phonePoster),
  ]);
  invTex.colorSpace = THREE.SRGBColorSpace;
  invTex.anisotropy = aniso;
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
  const gold = makeGold(TEX, aniso);
  const wax = makeWaxCap(512, logoImg, aniso);
  const waxNoise = makeWaxNoise(256, aniso);
  const glowTex = canvasTex(
    radialCanvas(512, 347, 0.5, 0.36, 0.5, [[0, 1], [0.18, 0.62], [0.4, 0.25], [0.7, 0.06], [1, 0]]), false, aniso, 0);
  const spillTex = canvasTex(
    radialCanvas(512, 320, 0.5, 0.98, 0.5, [[0, 1], [0.2, 0.5], [0.45, 0.16], [0.75, 0.03], [1, 0]]), false, aniso, 0);
  const sealShadowTex = canvasTex(
    radialCanvas(256, 256, 0.5, 0.5, 0.5, [[0, 1], [0.5, 0.85], [0.66, 0.35], [0.82, 0.08], [1, 0]]), false, aniso, 0);
  const shSide = contactShadow([[FLAP.left, 0], [FLAP.right, 0]], 0.012, -0.016, 0.05, aniso);
  const shBottom = contactShadow([[FLAP.bottom, 0]], 0.012, -0.018, 0.05, aniso);
  const shTop = contactShadow([[FLAP.top, HH]], 0.014, -0.022, 0.06, aniso);

  /* ---- Colours ---- */
  const cBg = col("bg");
  const cBgSoft = col("bg-soft");
  const cInk = col("ink"), cGold = col("gold"), cGoldLift = col("gold-lift"), cOnGold = col("on-gold");
  const bgClear = invNeutral(cBg); // the flight backdrop lands on --bg after tone mapping

  /* ---- Scene (no background: transparent over the page) ---- */
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envRT = pmrem.fromScene(roomEnv, 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = LIGHT.env;
  roomEnv.dispose();
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
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

  const cardU = { uTrue: { value: 0 }, uBright: { value: 0.58 }, uBias: { value: 0 } };
  const cardMat = new THREE.MeshBasicMaterial({ name: "card", map: invTex, fog: false });
  const trueColour = (mat, U) => (mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTrue;\nuniform float uBright;\nuniform float uBias;\n" + INV_NEUTRAL_GLSL)
      .replace(
        "#include <map_fragment>",
        [
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

  const pivot = new THREE.Group();
  pivot.position.set(0, HH, Z_TOP);
  env.add(pivot);
  const topGeo = shapeGeo(FLAP.top);
  pivot.add(enable(new THREE.Mesh(topGeo, paperMat)), enable(new THREE.Mesh(topGeo, linerBackMat)));

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
    base.rotateY(Math.PI);
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
  seal.position.set(0, TOP_TIP + 0.3, 0.0005);
  seal.rotation.z = -0.05;
  pivot.add(seal);

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

  /* ---- The phone (copied from the prototype) ---- */
  const cBgRaise = col("bg-raise");
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

  const phone = new THREE.Group();
  const handset = new THREE.Group();
  phone.add(handset);
  scene.add(phone);
  {
    const inner = PH_D - 2 * PH_BEVEL;
    const bodyGeo = new THREE.ExtrudeGeometry(roundRect(PH_W - 2 * PH_BEVEL, PH_H - 2 * PH_BEVEL, PH_R - PH_BEVEL), {
      depth: inner, bevelEnabled: true, bevelThickness: PH_BEVEL, bevelSize: PH_BEVEL, bevelSegments: 6, curveSegments: 20,
    });
    bodyGeo.translate(0, 0, -inner / 2);
    const body = new THREE.Mesh(bodyGeo, [graphiteMat, champagneMat]);
    const screen = new THREE.Mesh(flatGeo(PH_SW, PH_SH, PH_R - PH_BEZEL), screenMat);
    screen.position.z = PH_D / 2 + 0.0006;
    const pill = new THREE.Mesh(flatGeo(0.27, 0.076, 0.038), pillMat);
    pill.position.set(0, PH_SH / 2 - 0.064, PH_D / 2 + 0.0011);
    const glass = new THREE.Mesh(flatGeo(PH_W - 2 * PH_BEVEL, PH_H - 2 * PH_BEVEL, PH_R - PH_BEVEL), glassMat);
    glass.position.z = PH_D / 2 + 0.0017;
    glass.renderOrder = 7;
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

  // The live screen: a looping recording of the real invitation, fetched on
  // first hover/focus or flight start. Blob URL so it loops and seeks on any
  // host. Any failure keeps the poster.
  let video = null, videoTex = null, videoOk = false, videoAsked = false;
  if (!REDUCED) {
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
      videoTex.generateMipmaps = true;
      videoTex.minFilter = THREE.LinearMipmapLinearFilter;
      screenMat.map = videoTex;
      videoOk = true;
    }, { once: true });
    video.addEventListener("error", () => {
      videoOk = false;
      screenMat.map = posterTex;
    }, { once: true });
  }
  function askVideo() {
    if (videoAsked || !video) return;
    videoAsked = true;
    fetch(ASSETS.phoneVideo)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error("HTTP " + r.status))))
      .then((b) => { video.src = URL.createObjectURL(b); })
      .catch(() => {
        videoOk = false;
        screenMat.map = posterTex;
      });
  }

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
  const HERO_TGT = new THREE.Vector3();

  /* ---- Framing ---- */
  const L = { vw: 1, vh: 1, aspect: 1, portrait: false, tiltK: 1, r3: null };
  const F0 = {}, F1 = {}, F2 = {}, F3 = {}, FP = {}, FWIDE = {}, FA = {}, FB = {}, FC = {}, FF = {}, FD2 = {};
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
  // Rest: the slot rect, like the static invitation image.
  function layout() {
    const vw = canvas.clientWidth || 1, vh = canvas.clientHeight || 1;
    L.vw = vw; L.vh = vh; L.aspect = vw / vh;
    L.portrait = L.aspect < 0.9;
    L.tiltK = L.portrait ? 0.7 : 1;
    fitTilted({ l: 0, r: vw, t: 0, b: vh }, L.tiltK, 1.05, F0);
  }
  // Flight: framings for a virtual viewport (fw x fh), in its own coordinates.
  // At w=0 that is the slot itself, so the first flight frame is the rest frame.
  let headerH = 0;
  function flightLayout(fw, fh) {
    L.vw = fw; L.vh = fh; L.aspect = fw / fh;
    L.portrait = L.aspect < 0.9;
    L.tiltK = L.portrait ? 0.7 : 1;
    const g = clamp(fw * 0.05, 20, 48);
    const header = headerH;
    fitTilted({ l: 0, r: fw, t: 0, b: fh }, L.tiltK, 1.05, F0);
    const r1 = L.portrait
      ? { l: g, r: fw - g, t: header + fh * 0.06, b: fh * 0.7 }
      : { l: fw * 0.17, r: fw * 0.83, t: header + fh * 0.03, b: fh - fh * 0.07 };
    fit(r1, W * 1.04, 3.2, 0, 0.45, 0, F1);
    const r2 = L.portrait
      ? { l: g, r: fw - g, t: header, b: fh * 0.75 }
      : { l: fw * 0.42, r: fw - g, t: header - fh * 0.01, b: fh - g };
    fit(r2, W * 1.02, 3.66, 0, 0.66, 0, F2);
    L.r3 = { l: g, r: fw - g, t: header + fh * 0.005, b: fh - g };
    const rP = { l: g, r: fw - g, t: header + fh * 0.012, b: fh - g };
    fit(rP, PH_W * 1.12, PH_H * 1.04, PHONE_AT.x, PHONE_AT.y, PHONE_AT.z + PH_D / 2, FP);
    // Fold wide: the closing envelope, centred, in one settling shot.
    fit({ l: 0, r: fw, t: 0, b: fh }, 7, 5.5, 0, 0.4, 0, FWIDE);
  }

  let needsResize = true;
  function resize() {
    needsResize = false;
    const w = Math.max(1, canvas.clientWidth || 1), h = Math.max(1, canvas.clientHeight || 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!flying) layout(); // flight framings are computed per frame for the lerped window
  }

  /* ---- Flight state (owned by the timeline) ---- */
  const S = { dolly: 0, open: 0, slide: 0, away: 0, push: 0 };
  const S2 = { leave: 0, travel: 0, turn: 0 };
  const SF = { back: 0 };
  const WIN = { w: 0 }; // the slot window: 0 = in the slot, 1 = full-screen
  const B = { b: 0 };
  let flying = false, flown = false, scrollY0 = 0;
  let scrubTarget = 0, scrubCurrent = 0, upAcc = 0, lastTouchY = null;
  let slotRect = { left: 0, top: 0, width: 1, height: 1 };
  let time = 0, debugTime = null;

  function update() {
    const t = debugTime == null ? time : debugTime;
    const { dolly: d, open: o, slide: s, away: a, push: p } = S;
    const { leave: lv, travel: tr, turn: tu } = S2;
    const be = SF.back;
    const oe = o * (1 - be), ae = a * (1 - be), se = s * (1 - be);
    const idle = REDUCED ? 0 : (1 - 0.72 * d) * (1 - p);
    const k = L.tiltK * (1 - d);

    // Rig: rest tilt -> facing the camera, idle float.
    rig.rotation.set(
      REST.rx * k + idle * 0.035 * Math.sin(t * 0.61 + 0.7),
      REST.ry * k + idle * 0.06 * Math.sin(t * 0.43),
      REST.rz * k + idle * 0.018 * Math.sin(t * 0.52 + 2.1)
    );
    rig.position.set(0, idle * 0.07 * Math.sin(t * 0.83), 0);
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
    // Beckon: the closed envelope rocks gently until the first flight.
    // Never in ?debug, so approved pixels stay repeatable.
    const beckon = (!DEBUG && !flown) ? 1 : 0;
    rig.rotation.z += beckon * 0.012 * Math.sin(t * 0.9);
    rig.position.y += beckon * 0.03 * Math.sin(t * 1.1 + 1);

    // Top flap and its hinge.
    pivot.rotation.x = FLAP_OPEN * oe - 1.45 * smooth(0.05, 0.5, ae);
    pivot.position.z = lerp(Z_TOP, Z_TOP_OPEN, smooth(0.35, 0.9, oe));
    topFold.scale.y = Math.max(0.0005, pivot.position.z - Z_BACK);
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

    // Envelope leaves: straight down first, then back and tilting away.
    env.position.set(0, -5.5 * Math.pow(ae, 1.5), -2.2 * Math.pow(smooth(0.28, 1, ae), 1.2));
    env.rotation.set(-0.95 * smooth(0.28, 1, ae), 0, 0.14 * smooth(0.28, 1, ae));
    env.visible = ae < 0.999 || be > 0.001;

    // The card eases aside into the dark: the previous piece. The fold-back
    // cancels the drift so the card pockets with the envelope.
    card.position.x -= 2.9 * lv;
    card.position.y += 0.2 * lv;
    card.position.z -= 3.4 * lv;
    card.rotation.y = 0.5 * lv;
    card.rotation.z = 0.035 * lv;
    card.visible = lv < 0.999;
    if (be > 0) {
      card.position.x += 2.9 * lv * be;
      card.position.y -= 0.2 * lv * be;
      card.position.z += 3.4 * lv * be;
      card.rotation.y = 0.5 * lv * (1 - be);
      card.rotation.z = 0.035 * lv * (1 - be);
      card.visible = true;
    }

    // The lights travel with the subject; the fold-back blends them home.
    poolU.uPoolCentre.value.set(
      lerp(-1.05, PHONE_AT.x - 0.9, tr),
      lerp(rig.position.y + 0.85 + s * 0.9, PHONE_AT.y + 0.9, tr),
      lerp(0.6, PHONE_AT.z + 0.8, tr)
    );
    key.target.position.set(lerp(0, PHONE_AT.x, tr), lerp(rig.position.y * 0.5 + s * 0.5, PHONE_AT.y, tr), lerp(0, PHONE_AT.z, tr));
    key.position.copy(key.target.position).addScaledVector(KEY_DIR, 12);
    rim.position.set(lerp(3.6, PHONE_AT.x + 2.6, tr), lerp(1.5, PHONE_AT.y + 1.4, tr), lerp(-0.9, PHONE_AT.z - 1.5, tr));
    if (be > 0) {
      HERO_TGT.set(0, rig.position.y * 0.5, 0);
      key.target.position.lerp(HERO_TGT, be);
      key.position.copy(key.target.position).addScaledVector(KEY_DIR, 12);
      HERO_TGT.set(-1.05, rig.position.y + 0.85, 0.6);
      poolU.uPoolCentre.value.lerp(HERO_TGT, be);
      HERO_TGT.set(3.6, 1.5, -0.9);
      rim.position.lerp(HERO_TGT, be);
    }

    // Card: dim inside the pocket, true colour at full screen.
    const dim = smooth(0, 0.8, lv);
    cardU.uBright.value = (lerp(0.58, 0.84, smooth(0.05, 0.9, s)) + 0.16 * smooth(0.35, 0.95, p)) * (1 - 0.6 * dim);
    cardU.uTrue.value = smooth(0.6, 1, p) * (1 - dim);
    cardU.uBias.value = -0.45 * smooth(0.75, 1, p) * (1 - smooth(0, 0.3, lv));
    posePhone(t);

    if (!flying) {
      const halfH = (VH1 * F0.d) / 2, halfW = halfH * L.aspect;
      camera.position.set(F0.x - F0.sx * halfW, F0.y - F0.sy * halfH, F0.z + F0.d);
      camera.quaternion.identity();
      renderer.setClearColor(bgClear, 0);
      renderer.render(scene, camera);
      return;
    }

    // Flight camera: framings for the lerped window, shown through the slot
    // window so w=0 is exactly the rest frame and w=1 is full-screen.
    const vw = innerWidth, vh = innerHeight;
    const w = WIN.w;
    const fw = lerp(slotRect.width, vw, w), fh = lerp(slotRect.height, vh, w);
    flightLayout(fw, fh);
    rig.updateMatrixWorld(true);
    card.getWorldPosition(v3);
    fit(L.r3, CARD_W, CARD_H, v3.x, v3.y, v3.z + CARD_T / 2, F3);
    const s2m = L.portrait ? s : smooth(0, 0.62, s);
    mixFrame(F0, F1, d, FA);
    mixFrame(FA, F2, s2m, FB);
    mixFrame(FB, F3, p, FA);
    const F = tr > 0 ? mixFrame(FA, FP, tr, FC) : FA;
    // Fold return: the timeline's own clock carries the camera from the phone
    // to a wide settling shot, then to rest — never through the envelope.
    let FVF = F;
    const qt = smooth(0, 1, clamp((tl.time() - T3) / (BEATS.flapCard + BEATS.foldBack), 0, 1));
    if (qt > 0) {
      mixFrame(F, FWIDE, smooth(0, 0.45, qt), FF);
      FVF = mixFrame(FF, F0, smooth(0.45, 1, qt), FD2);
    }
    const halfH = (VH1 * FVF.d) / 2, halfW = halfH * L.aspect;
    camera.aspect = fw / fh;
    camera.setViewOffset(fw, fh, lerp(-slotRect.left, 0, w), lerp(-slotRect.top, 0, w), vw, vh);
    camera.updateProjectionMatrix();
    camera.position.set(FVF.x - FVF.sx * halfW, FVF.y - FVF.sy * halfH, FVF.z + FVF.d);
    camera.quaternion.identity();
    renderer.setClearColor(bgClear, B.b);
    renderer.render(scene, camera);
  }

  /* ---- The flight: one paused timeline, played by its own clock ---- */
  const tl = window.gsap.timeline({ paused: true, onComplete: doLanding });
  {
    tl.to(WIN, { w: 1, duration: BEATS.expand, ease: "power2.inOut" }, 0)
      .to(B, { b: 0.92, duration: BEATS.expand, ease: "power2.inOut" }, 0)
      .to(S, { dolly: 1, duration: BEATS.pushPast, ease: "power2.inOut" }, BEATS.expand)
      .to(S, { open: 1, duration: 0.7, ease: "power2.inOut" }, T1)
      .to(S, { slide: 1, duration: 0.7, ease: "power2.inOut" }, T1 + 0.5)
      .to(S, { away: 1, duration: 0.7, ease: "power2.inOut" }, T1 + 0.3)
      .to(S, { push: 1, duration: 0.5, ease: "power2.inOut" }, T1 + 1.0)
      .to(S2, { leave: 1, duration: 0.5, ease: "power2.inOut" }, T2)
      .to(S2, { travel: 1, duration: 0.8, ease: "power2.inOut" }, T2 + 0.3)
      .to(S2, { turn: 1, duration: 0.7, ease: "power2.inOut" }, T2 + 0.9)
      .to(SF, { back: 1, duration: BEATS.flapCard, ease: "power2.inOut" }, T3)
      .to(WIN, { w: 0, duration: BEATS.foldBack, ease: "power2.inOut" }, T4)
      .to(B, { b: 0, duration: BEATS.foldBack, ease: "power2.inOut" }, T4);
  }

  /* ---- Inputs: click to enter, scroll/drag/keys to scrub ---- */
  function scrubBy(dx) {
    if (!flying) return;
    if (scrubTarget <= 0 && dx < 0) {
      upAcc += -dx; // overscroll up at the start backs out of the flight
      if (upAcc > EXIT_PX) doLanding();
      return;
    }
    upAcc = 0;
    scrubTarget = clamp(scrubTarget + dx / SCROLL_PX, 0, 1);
  }
  function scrubWheel(e) {
    e.preventDefault();
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 16;
    else if (e.deltaMode === 2) d *= innerHeight;
    scrubBy(d);
  }
  function scrubTouchStart(e) {
    lastTouchY = e.touches.length ? e.touches[0].clientY : null;
  }
  function scrubTouchMove(e) {
    e.preventDefault();
    if (!e.touches.length) return;
    const y = e.touches[0].clientY;
    if (lastTouchY != null) scrubBy((lastTouchY - y) * 2); // drag up moves forward
    lastTouchY = y;
  }
  function scrubKeys(e) {
    const tag = (e.target && e.target.tagName) || "";
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(tag)) return;
    const step = { " ": 80, ArrowDown: 80, PageDown: 400, ArrowUp: -80, PageUp: -400 };
    if (e.key in step) { e.preventDefault(); scrubBy(step[e.key]); }
    else if (e.key === "Home") { e.preventDefault(); scrubTarget = 0; upAcc = 0; }
    else if (e.key === "End") { e.preventDefault(); scrubBy(SCROLL_PX); }
  }
  function lock() {
    scrollY0 = window.scrollY;
    root.classList.add("envelope-lock");
    window.addEventListener("wheel", scrubWheel, { passive: false });
    window.addEventListener("touchstart", scrubTouchStart, { passive: true });
    window.addEventListener("touchmove", scrubTouchMove, { passive: false });
    window.addEventListener("keydown", scrubKeys);
  }
  function unlock() {
    window.removeEventListener("wheel", scrubWheel);
    window.removeEventListener("touchstart", scrubTouchStart);
    window.removeEventListener("touchmove", scrubTouchMove);
    window.removeEventListener("keydown", scrubKeys);
    root.classList.remove("envelope-lock");
    if (window.scrollY !== scrollY0) window.scrollTo(0, scrollY0);
  }
  function enterFlightMode() {
    const r = slot.getBoundingClientRect();
    slotRect = { left: r.left, top: r.top, width: r.width, height: r.height };
    headerH = headerEl.getBoundingClientRect().height;
    document.body.appendChild(canvas);
    canvas.classList.add("envelope-canvas--flight");
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    renderer.setSize(innerWidth, innerHeight, false);
  }
  function startFlight() {
    if (flying || !window.gsap) return;
    flying = true;
    flown = true;
    scrubTarget = 0;
    scrubCurrent = 0;
    upAcc = 0;
    lastTouchY = null;
    lock();
    enterFlightMode();
    askVideo();
    tl.pause();
    tl.progress(0);
  }
  function doLanding() {
    tl.pause();
    tl.progress(0); // S, S2, SF, WIN, B back to rest; the fold-back pose already matches
    scrubTarget = 0;
    scrubCurrent = 0;
    upAcc = 0;
    if (video && !video.paused) video.pause();
    stage.appendChild(canvas);
    canvas.classList.remove("envelope-canvas--flight");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    camera.clearViewOffset();
    flying = false;
    resize();
    update();
    unlock();
    if (openBtn) openBtn.focus({ preventScroll: true });
  }
  let downX = 0, downY = 0;
  slot.addEventListener("pointerdown", (e) => { downX = e.clientX; downY = e.clientY; });
  slot.addEventListener("pointerup", (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;
    startFlight();
  });
  if (openBtn) openBtn.addEventListener("click", startFlight);
  slot.addEventListener("pointerenter", askVideo, { once: true });
  if (openBtn) openBtn.addEventListener("focus", askVideo, { once: true });

  /* ---- Phone placement (only while travelling) ---- */
  function posePhone(t) {
    phone.visible = S2.travel > 0.001;
    if (!phone.visible) return;
    const tu = S2.turn, tr = S2.travel;
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
    // Fold-back: the phone eases aside and away (the prototype's S3.leave
    // language, driven by the fold), clearing the camera's path home.
    const be = SF.back;
    phone.position.x += 2.6 * be;
    phone.position.y -= 0.5 * be;
    phone.position.z -= 2.2 * be;
    handset.rotation.y -= 0.6 * be;
  }

  /* ---- Loop: render only while the hero is on screen and tab visible ---- */
  let heroVisible = true, firstFrame = true;
  const readyHandlers = {};
  const ready = new Promise((res) => (readyHandlers.resolve = res));
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => { heroVisible = es[0].isIntersecting; }).observe(heroEl);
  }
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => { needsResize = true; }).observe(slot);
  }
  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!heroVisible || document.hidden) return;
    time += dt;
    if (needsResize) resize();
    if (flying) {
      // Scroll-scrub: ease the timeline toward the wheel/drag/key target.
      scrubCurrent += (scrubTarget - scrubCurrent) * (1 - Math.exp(-dt * 6.5));
      if (Math.abs(scrubTarget - scrubCurrent) < 0.0005) scrubCurrent = scrubTarget;
      if (scrubTarget >= 1 && scrubCurrent > 0.999) tl.progress(1); // onComplete lands
      else tl.progress(scrubCurrent);
    }
    update();
    if (videoOk) {
      const want = flying && S2.travel > 0.2;
      if (want && video.paused) video.play().catch(() => {});
      else if (!want && !video.paused) video.pause();
    }
    if (firstFrame) {
      firstFrame = false;
      root.classList.add("envelope-ready");
      if (openBtn) openBtn.hidden = false;
      readyHandlers.resolve(true);
    }
  }

  resize();
  update();
  phone.visible = true; // compile the phone's programs now, not mid-flight
  if (renderer.extensions.has("KHR_parallel_shader_compile") && renderer.compileAsync) {
    await renderer.compileAsync(scene, camera);
  } else {
    renderer.compile(scene, camera);
  }
  phone.visible = false;
  update();
  requestAnimationFrame(frame);

  /* ---- Debug hook (only with ?debug): repeatable screenshots ---- */
  if (DEBUG) {
    window.__envelope = {
      ready,
      state: () => ({ mode: flying ? "flight" : "rest", locked: root.classList.contains("envelope-lock"), flying, progress: scrubCurrent, scrollY }),
      setTime: (s) => { debugTime = +s; update(); },
      seek: (p) => {
        if (!flying) return;
        tl.pause();
        const c = clamp(+p, 0, 1);
        scrubTarget = c;
        scrubCurrent = c;
        tl.progress(c);
        update();
      },
      duration: tl.duration(),
    };
  }
  return ready;
}
