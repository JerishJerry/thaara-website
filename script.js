(function () {
  "use strict";

  // ---- Nav scroll state ----
  var nav = document.getElementById("nav");
  var onScroll = function () {
    if (window.scrollY > 12) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // ---- Mobile menu ----
  var toggle = document.getElementById("menuToggle");
  var menu = document.getElementById("mobileMenu");

  function closeMenu() {
    toggle.setAttribute("aria-expanded", "false");
    menu.classList.remove("open");
    menu.setAttribute("aria-hidden", "true");
  }

  function openMenu() {
    toggle.setAttribute("aria-expanded", "true");
    menu.classList.add("open");
    menu.setAttribute("aria-hidden", "false");
  }

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var expanded = toggle.getAttribute("aria-expanded") === "true";
      if (expanded) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 760) closeMenu();
    });
  }

  // ---- Scroll reveal ----
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealEls = document.querySelectorAll(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  }
})();
