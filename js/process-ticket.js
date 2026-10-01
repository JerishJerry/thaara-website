/* Process ticket: the four stages as a journey ticket.

   Progressive enhancement over the plain <ol class="stages">. The ticket is
   built from that list's own text (nothing is retyped) and the list is only
   hidden once the ticket exists. No dependencies, no build step. */

(function () {
  "use strict";

  var list = document.querySelector("#process .stages");
  if (!list || !document.getElementById("processHeading")) { return; }

  var items = Array.prototype.slice.call(list.querySelectorAll(".stage"));
  if (items.length < 2) { return; }

  var el = function (tag, cls) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    return n;
  };

  /* ---------- Build the ticket from the list ---------- */
  var stage = el("div", "ticket-stage");
  var ticket = el("div", "ticket");
  var main = el("div", "ticket-main");
  var route = el("div", "ticket-route");
  var panels = el("div", "ticket-panels");
  var tabs = [];
  var bodies = [];

  route.setAttribute("role", "tablist");
  route.setAttribute("aria-labelledby", "processHeading");

  items.forEach(function (li, i) {
    var n = i + 1;

    var tab = el("button", "stop");
    tab.type = "button";
    tab.id = "stop-" + n;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", "stop-panel-" + n);

    var dot = el("span", "stop-dot");
    var num = el("span", "stop-num");
    var name = el("span", "stop-name");
    dot.setAttribute("aria-hidden", "true");
    num.setAttribute("aria-hidden", "true");
    num.textContent = li.querySelector(".stage-num").textContent;
    name.textContent = li.querySelector("h3").textContent;
    tab.appendChild(dot);
    tab.appendChild(num);
    tab.appendChild(name);

    var panel = el("div", "stop-panel");
    panel.id = "stop-panel-" + n;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    // Lead sentence + drafted detail; clones keep &rsquo; / &nbsp;
    Array.prototype.slice.call(li.querySelectorAll(".stage-body p")).forEach(function (p) {
      panel.appendChild(p.cloneNode(true));
    });

    route.appendChild(tab);
    panels.appendChild(panel);
    tabs.push(tab);
    bodies.push(panel);
  });

  /* ---------- Selecting a stop ---------- */
  var current = 0;
  var select = function (i, focus) {
    current = i;
    tabs.forEach(function (t, k) {
      var on = k === i;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      bodies[k].classList.toggle("is-active", on);
    });
    route.style.setProperty("--p", (i / (tabs.length - 1)).toFixed(3));
    if (focus) { tabs[i].focus(); }
  };

  route.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".stop") : null;
    if (b) { select(tabs.indexOf(b), false); }
  });
  route.addEventListener("keydown", function (e) {
    var k = e.key;
    var last = tabs.length - 1;
    var i;
    if (k === "ArrowRight" || k === "ArrowDown") { i = current === last ? 0 : current + 1; }
    else if (k === "ArrowLeft" || k === "ArrowUp") { i = current === 0 ? last : current - 1; }
    else if (k === "Home") { i = 0; }
    else if (k === "End") { i = last; }
    else { return; }
    e.preventDefault();
    select(i, true);
  });

  /* ---------- Assemble: ticket before the list, then hide the list ---------- */
  main.appendChild(route);
  main.appendChild(panels);
  ticket.appendChild(main);

  var stub = el("div", "ticket-stub");
  var stamp = new Image();
  stamp.src = "logo-128.webp";
  stamp.alt = "";
  stamp.width = 128;
  stamp.height = 98;
  stamp.loading = "lazy";
  stub.appendChild(stamp);
  var action = document.querySelector("#process .section-action");
  if (action) {
    action.classList.remove("reveal");   // the ticket does its own entrance
    stub.appendChild(action);            // moved, not copied: the link exists once
  }
  ticket.appendChild(stub);

  stage.appendChild(ticket);
  list.parentNode.insertBefore(stage, list);
  select(0, false);
  list.classList.add("stages--replaced");   // only now, after a successful build
}());
