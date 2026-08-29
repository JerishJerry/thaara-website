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

  /* ---------- 4. Enquiry form ----------

     Wired to Web3Forms. Submissions are emailed to the address registered
     against the access key below.

     ENQUIRY_ENDPOINT is the switch:
       "https://..." -> the form POSTs JSON and reports the real outcome.
       ""            -> nothing is sent. The form validates, then says
                        plainly that it is not connected and hands the
                        visitor to email or Instagram. It never shows a
                        success message.

     Clearing the endpoint is the safe way to take the form offline; the
     honest not-connected path is still there and still works.

     This must stay a fetch() target. A mailbox cannot accept a POST, so
     putting hello.thaaracreates@gmail.com here would break every
     submission — Web3Forms is what forwards to that address.

     The access key is public by design — Web3Forms documents it as such.
     It ships in this file and is visible in the page source. It only routes
     mail to the pre-registered address; it grants no account access. */

  var ENQUIRY_ENDPOINT = "https://api.web3forms.com/submit";
  var WEB3FORMS_ACCESS_KEY = "f1a9544f-22f1-4181-85e4-049bb0b9c55b";
  var ENQUIRY_SUBJECT = "New enquiry from thaara.creates";

  var form = document.getElementById("enquiryForm");

  if (form) {
    var submitBtn   = document.getElementById("formSubmit");
    var errorBox    = document.getElementById("formErrorSummary");
    var errorList   = document.getElementById("formErrorList");
    var notConnected = document.getElementById("formNotConnected");
    var successBox  = document.getElementById("formSuccess");
    var failureBox  = document.getElementById("formFailure");
    var failureText = document.getElementById("formFailureReason");
    var copyBtn     = document.getElementById("copyMessage");

    // field id -> { label, validate(value) -> error string or null }
    var RULES = [
      {
        id: "f-name",
        label: "Name",
        validate: function (v) {
          if (!v) { return "Enter your name so we know who we are replying to."; }
          return null;
        }
      },
      {
        id: "f-email",
        label: "Email",
        validate: function (v) {
          if (!v) { return "Enter your email address so we can reply."; }
          // Deliberately permissive: one @, something either side, a dot in the domain.
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
            return "That email address looks incomplete — check for a typo.";
          }
          return null;
        }
      },
      {
        id: "f-details",
        label: "Message",
        validate: function (v) {
          if (!v) { return "Add a message, even just a sentence."; }
          if (v.length < 10) { return "A little more detail would help."; }
          return null;
        }
      }
    ];

    var hide = function (el) { if (el) { el.hidden = true; } };

    var clearOutcomes = function () {
      hide(notConnected);
      hide(successBox);
      hide(failureBox);
    };

    var clearFieldError = function (rule) {
      var input = document.getElementById(rule.id);
      var msg = document.getElementById("e-" + rule.id.replace(/^f-/, ""));
      if (input) { input.removeAttribute("aria-invalid"); }
      if (msg) { msg.hidden = true; msg.textContent = ""; }
    };

    var showFieldError = function (rule, message) {
      var input = document.getElementById(rule.id);
      var msg = document.getElementById("e-" + rule.id.replace(/^f-/, ""));
      if (input) { input.setAttribute("aria-invalid", "true"); }
      if (msg) { msg.hidden = false; msg.textContent = message; }
    };

    var validate = function () {
      var failures = [];

      RULES.forEach(function (rule) {
        var input = document.getElementById(rule.id);
        if (!input) { return; }
        var error = rule.validate(input.value.trim());
        if (error) {
          showFieldError(rule, error);
          failures.push({ rule: rule, message: error });
        } else {
          clearFieldError(rule);
        }
      });

      if (failures.length) {
        errorList.innerHTML = "";
        failures.forEach(function (f) {
          var li = document.createElement("li");
          var a = document.createElement("a");
          a.href = "#" + f.rule.id;
          a.textContent = f.rule.label + " — " + f.message;
          a.addEventListener("click", function (e) {
            e.preventDefault();
            var el = document.getElementById(f.rule.id);
            if (el) { el.focus(); }
          });
          li.appendChild(a);
          errorList.appendChild(li);
        });
        errorBox.hidden = false;
        errorBox.focus();
      } else {
        errorBox.hidden = true;
      }

      return failures.length === 0;
    };

    // Clear a field's error as soon as it becomes valid.
    RULES.forEach(function (rule) {
      var input = document.getElementById(rule.id);
      if (!input) { return; }
      input.addEventListener("input", function () {
        if (input.getAttribute("aria-invalid") === "true" &&
            !rule.validate(input.value.trim())) {
          clearFieldError(rule);
        }
      });
    });

    var readForm = function () {
      var get = function (id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : "";
      };
      var honeypot = document.getElementById("f-botcheck");
      return {
        name: get("f-name"),
        email: get("f-email"),
        message: get("f-details"),
        botcheck: honeypot ? honeypot.checked : false
      };
    };

    var asText = function (d) {
      return ["Name: " + d.name, "Email: " + d.email, "", d.message].join("\n");
    };

    var setBusy = function (busy) {
      if (!submitBtn) { return; }
      submitBtn.disabled = busy;
      if (busy) {
        submitBtn.setAttribute("aria-busy", "true");
        var label = submitBtn.querySelector(".btn-label");
        if (label) { label.textContent = "Sending…"; }
      } else {
        submitBtn.removeAttribute("aria-busy");
        var l2 = submitBtn.querySelector(".btn-label");
        if (l2) { l2.textContent = "Send message"; }
      }
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearOutcomes();

      if (!validate()) { return; }

      var data = readForm();

      // No endpoint: say so. Do not pretend anything was sent.
      if (!ENQUIRY_ENDPOINT) {
        notConnected.hidden = false;
        notConnected.scrollIntoView({ block: "nearest" });
        return;
      }

      setBusy(true);

      /* Web3Forms payload. `access_key` is required; `subject`, `from_name`,
         `replyto` and `botcheck` are its reserved fields. replyto is set to
         the visitor's address so hitting Reply goes to them, not to the
         form. botcheck is the honeypot: real people leave it unchecked. */
      var payload = {
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: ENQUIRY_SUBJECT,
        from_name: data.name || "THAARA website",
        replyto: data.email,
        name: data.name,
        email: data.email,
        message: data.message,
        botcheck: data.botcheck
      };

      window.fetch(ENQUIRY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (res) {
        /* Do NOT treat HTTP 200 as success. Web3Forms answers 200 with
           { success: false } when it rejects a submission — wrong key, spam
           block, quota. Gating on res.ok alone would show "Thank you" for a
           message that was never delivered, which is the exact failure this
           form is built to avoid. Read the body and trust only success:true. */
        return res.text().then(function (raw) {
          var body = null;
          try { body = JSON.parse(raw); } catch (err) { /* not JSON */ }

          if (!body || typeof body.success === "undefined") {
            throw new Error("Unexpected response from the form service (HTTP " + res.status + ")");
          }
          if (body.success !== true) {
            throw new Error(body.message || "The form service rejected the message");
          }

          setBusy(false);
          form.reset();
          successBox.hidden = false;
          successBox.scrollIntoView({ block: "nearest" });
        });
      }).catch(function (err) {
        setBusy(false);
        if (failureText) {
          failureText.textContent =
            "Your message could not be sent (" + err.message +
            "). Please try again, or reach us by email or Instagram.";
        }
        failureBox.hidden = false;
        failureBox.scrollIntoView({ block: "nearest" });
      });
    });

    // Let people take their message with them if the form cannot send it.
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = asText(readForm());
        var label = copyBtn.querySelector(".btn-label");
        var done = function (ok) {
          if (!label) { return; }
          label.textContent = ok ? "Copied" : "Press Ctrl+C to copy";
          window.setTimeout(function () { label.textContent = "Copy my message"; }, 2400);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { done(true); },
                                                   function () { done(false); });
        } else {
          // Fallback for browsers without the async clipboard API.
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          var ok = false;
          try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
          document.body.removeChild(ta);
          done(ok);
        }
      });
    }
  }

  /* ---------- 5. Footer year ---------- */

  var year = document.getElementById("year");
  if (year) { year.textContent = String(new Date().getFullYear()); }
})();
