/* Slow Ink Sage — main: routing (which page to show), the tab bar, and event wiring. */
(function () {
  "use strict";
  var SI = window.SI, esc = SI.esc, ic = SI.ic;
  var view = document.getElementById("view");

  var TABS = [
    ["today", "Today"], ["year", "Year"], ["month", "Month"], ["week", "Week"], ["day", "Day"],
    ["habits", "Habits"], ["goals", "Goals"], ["debt", "Debt"], ["reflect", "Reflect"], ["notebook", "Notebook"]
  ];

  function parseRoute() {
    var h = (window.location.hash || "").replace(/^#\/?/, "");
    var parts = h.split("/").filter(Boolean).map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    var name = parts.shift() || "today";
    if (!SI.views[name]) name = "today";
    return { name: name, args: parts };
  }

  /* Keep the "cursor" date in step with whatever page is open. */
  function updateCursor(r) {
    var t = SI.today(), c = SI.cursor, a = r.args, d, mk;
    function inMonth(y, m) { return t.getFullYear() === y && t.getMonth() === m; }
    if (r.name === "today") SI.cursor = t;
    else if (r.name === "day" && (d = SI.parseKey(a[0]))) SI.cursor = d;
    else if (r.name === "week" && (d = SI.parseKey(a[0]))) {
      var mon = SI.mondayOf(d);
      SI.cursor = SI.key(SI.mondayOf(t)) === SI.key(mon) ? t : mon;
    } else if ((r.name === "month" || r.name === "habits") && (mk = SI.parseMonthKey(a[0]))) {
      SI.cursor = inMonth(mk.y, mk.m) ? t : new Date(mk.y, mk.m, 1);
    } else if (r.name === "reflect" && a[0] === "month" && (mk = SI.parseMonthKey(a[1]))) {
      SI.cursor = inMonth(mk.y, mk.m) ? t : new Date(mk.y, mk.m, 1);
    } else if ((r.name === "year" && +a[0]) || (r.name === "reflect" && a[0] === "year" && +a[1])) {
      var y = +(r.name === "year" ? a[0] : a[1]);
      if (y >= 1900 && y <= 2200) SI.cursor = new Date(y, c.getMonth(), Math.min(c.getDate(), SI.daysIn(y, c.getMonth())));
    }
  }

  function tabHref(id) {
    var c = SI.cursor;
    switch (id) {
      case "today": return "#/today";
      case "year": return "#/year/" + c.getFullYear();
      case "month": return "#/month/" + SI.monthKey(c.getFullYear(), c.getMonth());
      case "week": return "#/week/" + SI.key(SI.mondayOf(c));
      case "day": return "#/day/" + SI.key(c);
      case "habits": return "#/habits/" + SI.monthKey(c.getFullYear(), c.getMonth());
      case "reflect": return "#/reflect/month/" + SI.monthKey(c.getFullYear(), c.getMonth());
      default: return "#/" + id;
    }
  }
  function buildTabs(active) {
    document.getElementById("tabs").innerHTML = TABS.map(function (t) {
      var on = t[0] === active;
      return '<a class="tab' + (t[0] === "notebook" ? " tab-nb" : "") + (on ? " on" : "") + '" href="' + tabHref(t[0]) + '"' + (on ? ' aria-current="page"' : "") + ">" +
        (t[0] === "notebook" ? ic("book") : "") + esc(t[1]) + "</a>";
    }).join("");
  }

  /* The left-hand menu (wide screens). The same pages as the top tabs, grouped. */
  var SIDE = [
    ["Plan", [["today", "Today", "sun"], ["year", "Year", "grid"], ["month", "Month", "calendar"], ["week", "Week", "columns"], ["day", "Day", "clock"]]],
    ["Track", [["habits", "Habits", "loop"], ["goals", "Goals", "target"], ["debt", "Debt payoff", "wallet"], ["reflect", "Reflect", "moon"]]],
    ["Journal", [["notebook", "Notebook", "book"]]]
  ];
  function buildSide(active) {
    document.getElementById("side").innerHTML =
      '<a class="side-brand" href="#/today" aria-label="Slow Ink Sage: Today"><span class="brand-mark" aria-hidden="true"></span><span class="brand-name">Slow Ink</span></a>' +
      SIDE.map(function (g) {
        return '<p class="side-label">' + g[0] + "</p>" + g[1].map(function (t) {
          var on = t[0] === active;
          return '<a class="side-link' + (t[0] === "notebook" ? " side-nb" : "") + (on ? " on" : "") + '" href="' + tabHref(t[0]) + '"' + (on ? ' aria-current="page"' : "") + ">" + ic(t[2]) + "<span>" + esc(t[1]) + "</span></a>";
        }).join("");
      }).join("") +
      '<div class="side-foot"><button class="side-link" data-act="open-look">' + ic("palette") + "<span>Personalise</span></button>" +
      '<button class="side-link" data-act="export">' + ic("download") + "<span>Back up planner</span></button></div>";
  }

  /* Remember which control had the keyboard focus, so it still has it after a redraw. */
  var FOCUS_ATTRS = ["data-act", "data-day", "data-id", "data-h", "data-g", "data-v"];
  function focusSelector(el) {
    if (!el || !el.getAttribute || !el.getAttribute("data-act")) return null;
    return "[" + FOCUS_ATTRS.filter(function (a) { return el.hasAttribute(a); }).map(function (a) {
      return a + '="' + el.getAttribute(a).replace(/"/g, '\\"') + '"';
    }).join("][") + "]";
  }

  var lastHash = null;
  SI.render = function () {
    if (SI.cleanup) { try { SI.cleanup(); } catch (e) { /* ignore */ } SI.cleanup = null; }
    var r = parseRoute();
    updateCursor(r);
    var keepFocus = focusSelector(document.activeElement), y = window.scrollY, sameRoute = lastHash === window.location.hash;
    lastHash = window.location.hash;

    var html;
    try { html = SI.views[r.name](r.args); }
    catch (err) {
      if (window.console) console.error(err);
      html = '<div class="card"><h2 class="card-title">Something went wrong</h2><p>This page couldn’t be drawn. Try another page, or restore a backup from the link at the bottom.</p></div>';
    }
    view.innerHTML = html;

    var nb = r.name === "notebook";
    document.body.classList.toggle("nb-mode", nb);
    document.getElementById("topbar").hidden = nb;
    document.getElementById("nb-topbar").hidden = !nb;
    document.body.setAttribute("data-page", r.name);
    document.body.classList.toggle("markup-on", nb && SI.state.ui.nbMode === "markup" && !!SI.state.notebook.current);
    buildTabs(r.name);
    buildSide(r.name);
    if (SI.after[r.name]) SI.after[r.name](r.args);

    if (!sameRoute) window.scrollTo(0, 0); else window.scrollTo(0, y);
    var target = null;
    if (SI.refocus) { target = document.querySelector(SI.refocus); SI.refocus = null; }
    else if (keepFocus) { try { target = document.querySelector(keepFocus); } catch (e2) { target = null; } }
    if (target && target.focus) { try { target.focus({ preventScroll: true }); } catch (e3) { target.focus(); } }
  };

  /* ------------------------------------------------------------ events */
  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("[data-act]") : null;
    if (!el) return;
    var fn = SI.actions[el.getAttribute("data-act")];
    if (fn) { e.preventDefault(); fn(el, e); }
  });

  document.addEventListener("input", function (e) {
    var el = e.target;
    if (el.hasAttribute && el.hasAttribute("data-bind")) {
      var path = el.getAttribute("data-bind");
      if (SI.setPath(path, el.value)) { SI.save(); if (SI.afterBind) SI.afterBind(path, el); }
    } else if (el.hasAttribute && el.hasAttribute("data-act-input")) {
      var fn = SI.actions[el.getAttribute("data-act-input")];
      if (fn) fn(el, e);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || e.isComposing) return;
    var el = e.target;
    if (el.classList && el.classList.contains("add-input")) {
      var row = el.closest(".add-row"), btn = row && row.querySelector("[data-act]");
      if (btn) { e.preventDefault(); btn.click(); }
    } else if (el.classList && (el.classList.contains("task-text") || el.classList.contains("intent-field") || el.classList.contains("sheet-title") || el.classList.contains("habit-name") || el.classList.contains("goal-title"))) {
      e.preventDefault(); el.blur();
    }
  });

  document.getElementById("import-file").addEventListener("change", function (e) {
    SI.importData(e.target.files && e.target.files[0]);
    e.target.value = "";
  });

  window.addEventListener("hashchange", SI.render);
  if (!window.location.hash) window.location.replace("#/today");
  SI.render();
})();
