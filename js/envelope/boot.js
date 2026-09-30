/* Hero envelope flight: capability gate and lazy load.
   Step 2: loads GSAP + envelope.js once, after page load, and does nothing
   at all on reduced motion / no WebGL2 / saveData / ?static.
   Any failure: one console.warn, remove the canvas, leave the page as is. */
(function () {
  const root = document.documentElement;
  // The photo stays hidden while this is set (see styles.css section 16).
  // Every exit below clears it so the photo shows: fallbacks and failures
  // always reveal the static hero.
  function revealPhoto() { root.classList.remove('envelope-pending'); }
  function gated() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    if (!document.createElement('canvas').getContext('webgl2')) return true;
    if (navigator.connection && navigator.connection.saveData) return true;
    if (/[?&]static(=|&|$)/.test(location.search)) return true;
    return false;
  }

  function afterLoad() {
    if (document.readyState === 'complete') return Promise.resolve();
    return new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
  }

  // Paint gate: the hero must have painted (now the headline, since the photo
  // stays hidden for JS visitors) before heavy boot work starts, or texture
  // generation + shader compile starve the overture and push LCP back.
  function afterFirstPaint() {
    return Promise.race([
      new Promise((resolve) => {
        try {
          const po = new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
              if (e.element && (e.element.tagName === 'H1' || e.element.tagName === 'IMG')) { po.disconnect(); resolve(); return; }
            }
          });
          po.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (err) { resolve(); }
      }),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
  }

  function idleOrHover() {
    return new Promise((resolve) => {
      let done = false;
      const go = () => { if (!done) { done = true; resolve(); } };
      if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 2000 });
      else setTimeout(go, 0);
      const slot = document.querySelector('.hero-visual');
      if (slot) slot.addEventListener('pointerenter', go, { once: true });
    });
  }

  function loadGSAP() {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = new URL('../../vendor/gsap/gsap.min.js', import.meta.url).toString();
      s.onload = resolve;
      s.onerror = () => reject(new Error('gsap load failed'));
      document.head.appendChild(s);
    });
  }

  async function boot() {
    try {
      if (gated()) { revealPhoto(); return; }
      await afterLoad();
      // An early hover is intent: skip the paint queue and load straight away.
      const slot = document.querySelector('.hero-visual');
      let hovered = false;
      const onHover = () => { hovered = true; };
      if (slot) slot.addEventListener('pointerenter', onHover, { once: true });
      if (!hovered) await afterFirstPaint();
      if (slot) slot.removeEventListener('pointerenter', onHover);
      await idleOrHover();
      if (gated()) { revealPhoto(); return; }
      // Bounded boot: if the envelope isn't rendering within TIMEOUT_MS
      // (stalled texture fetch, hung shader compile — neither throws), give
      // up to the photo instead of sitting on the panel forever.
      const TIMEOUT_MS = 12000;
      const timedOut = new Promise((_, reject) => setTimeout(() => reject(new Error('boot timeout')), TIMEOUT_MS));
      const load = (async () => {
        await loadGSAP();
        const m = await import('./envelope.js');
        await m.start();
      })();
      await Promise.race([load, timedOut]);
    } catch (err) {
      console.warn('[envelope] boot skipped:', err);
      root.dataset.boot = 'timeout'; // the scene loop checks this and stays dead
      const canvas = document.querySelector('.envelope-stage canvas');
      if (canvas) canvas.remove();
      revealPhoto();
    }
  }

  boot();
})();
