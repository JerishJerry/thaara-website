/* Section life: small scroll-driven touches that give the remaining sections
   some movement. Work: the phone plays its screen recording and the visuals
   settle in; headings: words rise out of a mask; About: the poster settles in;
   Contact: a sent envelope on a real success; Closing: gold dust.

   Progressive enhancement. With no script, with reduced motion, or if anything
   below throws, every section is simply its static self. No dependencies, no
   build step. */

(function () {
  "use strict";

  // Reduced motion: nothing moves, nothing is hidden, nothing is added.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { return; }

  var hasIO = "IntersectionObserver" in window;
  var saveData = !!(navigator.connection && navigator.connection.saveData);

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var make = function (tag, cls) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    return n;
  };
  var clamp01 = function (v) { return v < 0 ? 0 : (v > 1 ? 1 : v); };

  /* ---------- 1. Headings: words rise out of a mask ---------- */

  // Wrap every word in a mask + inner span. Text is preserved (whitespace nodes
  // stay between the words) and <em> stays an <em>.
  var splitWords = function (root) {
    var n = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 1) { walk(child); return; }
        if (child.nodeType !== 3) { return; }
        var frag = document.createDocumentFragment();
        child.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (!part) { return; }
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var outer = make("span", "w");
          var inner = make("span", "w-i");
          inner.style.setProperty("--w", n);
          n += 1;
          inner.textContent = part;
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
        node.replaceChild(frag, child);
      });
    }(root));
  };

  if (hasIO) {
    var headIOAlive = false;
    var headIO = new IntersectionObserver(function (entries) {
      headIOAlive = true;
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          headIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    $$(".section-head h2, .contact-intro h2").forEach(function (h) {
      var head = h.closest ? h.closest(".section-head, .contact-intro") : null;
      splitWords(h);
      if (head) { head.setAttribute("data-words", ""); }
      h.classList.add("words");        // the hidden start state lives behind this class
      headIO.observe(h);
    });

    // Safety net. These are the page's headings, so they must never stay
    // invisible. A working observer always delivers once straight after
    // observe(), even for targets that are off screen, so if nothing has
    // arrived after a grace period the observer is not running (a hidden or
    // throttled tab, a broken engine): show the words. This never fires in a
    // normal visit, so it does not pre-empt the animation.
    window.setTimeout(function () {
      if (!headIOAlive) {
        $$(".words").forEach(function (h) { h.classList.add("is-in"); });
      }
    }, 2500);
  }

  /* ---------- 2. Settle: visuals lean back, then lie flat as they scroll in ---------- */

  var settlers = $$(".project-visual").concat($$(".about-poster picture"));
  settlers.forEach(function (el) { el.setAttribute("data-settle", ""); });

  // A direct scroll handler, not requestAnimationFrame: rAF never runs in a tab
  // that isn't being composited, and a few rect reads per scroll are cheap.
  var settle = function () {
    var vh = window.innerHeight;
    settlers.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh * 1.2) { return; }
      var p = clamp01((vh - r.top) / (vh * 0.75));
      var eased = p * p * (3 - 2 * p);
      var lean = 1 - eased;
      el.style.setProperty("--settle", lean.toFixed(3));
      // Fully settled means no transform at all, so a resting image keeps no
      // 3D layer or stacking context.
      if (lean < 0.002) { el.setAttribute("data-settled", ""); } else { el.removeAttribute("data-settled"); }
    });
  };
  if (settlers.length) {
    window.addEventListener("scroll", settle, { passive: true });
    window.addEventListener("resize", settle);
    settle();
  }

  /* ---------- 3. Work: the phone plays its real screen recording ---------- */

  var frame = $(".project--split .project-visual--portrait");
  if (frame && hasIO && !saveData) {
    var video = make("video", "project-video");
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "none";
    video.disablePictureInPicture = true;
    video.tabIndex = -1;
    video.setAttribute("aria-hidden", "true");
    video.src = "leo-asnia-scroll.mp4";

    var toggle = make("button", "video-toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Pause");
    toggle.appendChild(make("span"));

    var inView = false;
    var userPaused = false;

    var play = function () {
      var p = video.play();
      if (p && p.then) {
        p.then(function () { video.classList.add("is-playing"); }, function () { /* autoplay refused: stay on the poster */ });
      }
    };
    var setPaused = function (paused) {
      userPaused = paused;
      toggle.setAttribute("aria-label", paused ? "Play" : "Pause");
      toggle.classList.toggle("is-paused", paused);
      if (paused) { video.pause(); } else if (inView && !document.hidden) { play(); }
    };

    toggle.addEventListener("click", function () { setPaused(!userPaused); });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { video.pause(); } else if (inView && !userPaused) { play(); }
    });

    var videoIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        inView = entry.isIntersecting;
        if (inView && !userPaused && !document.hidden) { play(); } else { video.pause(); }
      });
    }, { threshold: 0.35 });

    frame.appendChild(video);
    frame.appendChild(toggle);
    videoIO.observe(frame);
  }

  /* ---------- 4. Contact: a sent envelope, only on a real success ---------- */

  // script.js reveals #formSuccess only when Web3Forms answered success: true.
  // This only watches that element; it never touches the form or its logic.
  var success = document.getElementById("formSuccess");
  if (success && "MutationObserver" in window) {
    var sent = make("div", "sent");
    sent.setAttribute("aria-hidden", "true");
    sent.appendChild(make("span", "sent-letter"));
    sent.appendChild(make("span", "sent-pocket"));
    sent.appendChild(make("span", "sent-flap"));
    success.insertBefore(sent, success.firstChild);

    new MutationObserver(function () {
      success.classList.toggle("is-sent", !success.hidden);
    }).observe(success, { attributes: true, attributeFilter: ["hidden"] });
  }

  /* ---------- 5. Closing: the hero's gold dust, echoed ---------- */

  var heroDust = $(".hero .dust");
  var closing = $(".closing");
  if (heroDust && closing && hasIO) {
    var dust = heroDust.cloneNode(true);
    dust.classList.add("dust--closing");
    closing.insertBefore(dust, closing.firstChild);

    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { dust.classList.toggle("is-live", entry.isIntersecting); });
    }, { threshold: 0 }).observe(closing);
  }
}());
