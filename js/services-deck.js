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
