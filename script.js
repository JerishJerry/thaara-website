/* ============================================================
   THAARA — behaviour
   Vanilla JS, no dependencies. Three concerns:
     1. Header scroll state
     2. Mobile menu (accessible)
     3. Reveal on scroll
   ============================================================ */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Header scroll state ---------- */

  var nav = document.getElementById("nav");

  if (nav) {
    var setNavState = function () {
      if (window.scrollY > 8) {
        nav.classList.add("is-scrolled");
      } else {
        nav.classList.remove("is-scrolled");
      }
    };
    setNavState();
    window.addEventListener("scroll", setNavState, { passive: true });
  }

  /* ---------- 2. Mobile menu ----------
     Closed state is inert + visibility:hidden, so the links leave the
     tab order completely. Escape closes and returns focus to the
     toggle; Tab is trapped inside the panel while it is open. */

  var toggle = document.getElementById("menuToggle");
  var menu = document.getElementById("mobileMenu");

  if (toggle && menu) {
    var DESKTOP = 900;

    var focusable = function () {
      return Array.prototype.slice.call(menu.querySelectorAll("a[href]"));
    };

    var closeMenu = function (returnFocus) {
      if (!menu.classList.contains("is-open")) { return; }
      menu.classList.remove("is-open");
      menu.setAttribute("inert", "");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      document.body.classList.remove("menu-open");
      if (returnFocus) { toggle.focus(); }
    };

    var openMenu = function () {
      menu.classList.add("is-open");
      menu.removeAttribute("inert");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
      document.body.classList.add("menu-open");

      var items = focusable();
      if (items.length) {
        // Wait for the panel to become visible before moving focus.
        window.requestAnimationFrame(function () { items[0].focus(); });
      }
    };

    // Start closed and out of the tab order.
    menu.setAttribute("inert", "");

    toggle.addEventListener("click", function () {
      if (toggle.getAttribute("aria-expanded") === "true") {
        closeMenu(true);
      } else {
        openMenu();
      }
    });

    // Any in-menu link closes the panel before the anchor jump.
    focusable().forEach(function (link) {
      link.addEventListener("click", function () { closeMenu(false); });
    });

    document.addEventListener("keydown", function (e) {
      if (!menu.classList.contains("is-open")) { return; }

      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu(true);
        return;
      }

      if (e.key === "Tab") {
        var items = focusable();
        if (!items.length) { return; }
        var first = items[0];
        var last = items[items.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > DESKTOP) { closeMenu(false); }
    });
  }

  /* ---------- 3. Reveal on scroll ----------
     The .reveal hidden state lives behind `.js` in CSS, so if this
     script never runs the content is visible rather than blank. */

  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  var showAll = function () {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  };

  if (reduceMotion || !("IntersectionObserver" in window)) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

    revealEls.forEach(function (el) { io.observe(el); });

    // Safety net. If nothing at all has been revealed after a grace
    // period, the observer is not doing its job — show everything rather
    // than risk a blank page. Deliberately does NOT test element
    // positions: in a tab that has not been laid out yet every rect
    // reads zero, and a position check would reject the whole page.
    var netFired = false;
    var safetyNet = function () {
      if (netFired) { return; }
      if (!document.querySelector(".reveal.in-view")) {
        netFired = true;
        showAll();
      }
    };
    window.setTimeout(safetyNet, 1500);

    // A tab opened in the background is never laid out, so the observer
    // has nothing to measure. Re-check once it actually becomes visible.
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) { window.setTimeout(safetyNet, 600); }
    });
  }

  /* ---------- Footer year ---------- */

  var year = document.getElementById("year");
  if (year) { year.textContent = String(new Date().getFullYear()); }
})();
