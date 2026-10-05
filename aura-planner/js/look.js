/* Aura — Personalise: colour theme, light / dark / auto, font and page background.
   The choice is saved with the planner (state.ui.look), so it travels with a backup. */
(function () {
  "use strict";
  var A = window.Aura, ic = A.ic, esc = A.esc;

  var THEMES = [["violet", "Violet", "#9b7bff", "#ff9ed2"], ["rose", "Rose", "#ee7f9f", "#ffc19a"], ["ocean", "Ocean", "#5b9cf5", "#7fdccf"], ["meadow", "Meadow", "#5fbf88", "#ffd98a"]];
  var MODES = [["light", "Light"], ["auto", "Auto"], ["dark", "Dark"]];
  var FONTS = [["classic", "Classic", "Poppins", '"Poppins", sans-serif'], ["cozy", "Cozy", "Nunito", '"Nunito", sans-serif'], ["modern", "Modern", "Inter", '"Inter", sans-serif']];
  var BGS = [["soft", "Glow"], ["plain", "Plain"], ["dots", "Dotted"]];
  var DEFAULT = { theme: "violet", mode: "light", font: "classic", bg: "soft" };
  var META = { light: "#F7F2FF", dark: "#15121f" };

  function allowed(list, v, d) { return list.some(function (x) { return x[0] === v; }) ? v : d; }
  /* Always a valid choice, even from an odd backup file. */
  A.validLook = function (l) {
    l = l && typeof l === "object" ? l : {};
    return { theme: allowed(THEMES, l.theme, DEFAULT.theme), mode: allowed(MODES, l.mode, DEFAULT.mode), font: allowed(FONTS, l.font, DEFAULT.font), bg: allowed(BGS, l.bg, DEFAULT.bg) };
  };
  A.look = function () { return A.validLook(A.state && A.state.ui && A.state.ui.look); };

  var mql = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  A.isDark = function () { var m = A.look().mode; return m === "dark" || (m === "auto" && !!(mql && mql.matches)); };
  A.applyLook = function () {
    var l = A.look(), root = document.documentElement, dark = A.isDark();
    root.setAttribute("data-theme", l.theme); root.setAttribute("data-mode", dark ? "dark" : "light");
    root.setAttribute("data-font", l.font); root.setAttribute("data-bg", l.bg);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? META.dark : META.light);
    var db = document.getElementById("dark-btn");
    if (db) { db.innerHTML = ic(dark ? "sunic" : "moonic"); db.setAttribute("aria-pressed", dark ? "true" : "false"); }
  };
  function onScheme() { if (A.look().mode === "auto") A.applyLook(); }
  if (mql && mql.addEventListener) mql.addEventListener("change", onScheme); else if (mql && mql.addListener) mql.addListener(onScheme);

  function opts(list, cur, act, render) {
    return list.map(function (x) { var on = x[0] === cur; return render(x, on, act); }).join("");
  }
  A.lookControls = function () {
    var l = A.look();
    var themes = opts(THEMES, l.theme, "look-theme", function (x, on, act) {
      return '<button class="lk-opt' + (on ? " on" : "") + '" data-act="' + act + '" data-v="' + x[0] + '" aria-pressed="' + on + '"><span class="lk-sw" style="background:linear-gradient(135deg,' + x[2] + " 50%," + x[3] + ' 50%)"></span><span>' + x[1] + "</span></button>";
    });
    var modes = '<div class="seg" role="group" aria-label="Appearance">' + MODES.map(function (x) {
      return '<button class="' + (x[0] === l.mode ? "on" : "") + '" data-act="look-mode" data-v="' + x[0] + '" aria-pressed="' + (x[0] === l.mode) + '">' + x[1] + "</button>";
    }).join("") + "</div>";
    var fonts = opts(FONTS, l.font, "look-font", function (x, on, act) {
      return '<button class="lk-opt lk-font' + (on ? " on" : "") + '" data-act="' + act + '" data-v="' + x[0] + '" aria-pressed="' + on + '"><span class="lk-aa" style="font-family:' + x[3] + '">Aa</span><span>' + x[1] + "<small>" + x[2] + "</small></span></button>";
    });
    var bgs = opts(BGS, l.bg, "look-bg", function (x, on, act) {
      return '<button class="lk-opt lk-bg lk-bg-' + x[0] + (on ? " on" : "") + '" data-act="' + act + '" data-v="' + x[0] + '" aria-pressed="' + on + '"><span class="lk-prev" aria-hidden="true"></span><span>' + x[1] + "</span></button>";
    });
    return '<div class="lk"><label class="lbl">Colour</label><div class="lk-row">' + themes + "</div>" +
      '<label class="lbl">Appearance</label>' + modes +
      '<label class="lbl">Font</label><div class="lk-row lk-3">' + fonts + "</div>" +
      '<label class="lbl">Background</label><div class="lk-row lk-3">' + bgs + "</div></div>";
  };
  function panelHtml() {
    return '<div class="card-head"><h2 class="card-title"><span class="ico">' + ic("palette") + '</span>Personalise</h2><button class="icon-btn sm" data-act="close-drawer" aria-label="Close">' + ic("x") + "</button></div>" +
      A.lookControls() + '<div class="row" style="margin-top:18px;justify-content:flex-end;gap:8px"><button class="btn ghost sm" data-act="look-reset">Reset</button><button class="btn sm" data-act="close-drawer">Done</button></div>';
  }
  function refresh() {
    var dr = document.getElementById("drawer");
    if (!dr || dr.hidden) return;
    var lk = dr.querySelector(".lk"), a = document.activeElement, act = a && a.getAttribute && a.getAttribute("data-act"), v = a && a.getAttribute && a.getAttribute("data-v");
    if (lk) {
      lk.outerHTML = A.lookControls();
      if (act) { var again = dr.querySelector('[data-act="' + act + '"]' + (v ? '[data-v="' + v + '"]' : "")); if (again) again.focus(); }
    }
  }
  function set(key, val) {
    var l = A.look(); l[key] = val;
    A.state.ui.look = A.validLook(l);
    A.save(); A.applyLook(); refresh();
  }
  A.acts["open-look"] = function () { A.openDrawer(panelHtml()); };
  A.acts["look-theme"] = function (el) { set("theme", el.getAttribute("data-v")); };
  A.acts["look-mode"] = function (el) { set("mode", el.getAttribute("data-v")); };
  A.acts["look-font"] = function (el) { set("font", el.getAttribute("data-v")); };
  A.acts["look-bg"] = function (el) { set("bg", el.getAttribute("data-v")); };
  A.acts["look-reset"] = function () { A.state.ui.look = A.validLook(DEFAULT); A.save(); A.applyLook(); refresh(); };
  A.acts["toggle-dark"] = function () { set("mode", A.isDark() ? "light" : "dark"); };

  var lb = document.getElementById("look-btn");
  if (lb) lb.innerHTML = ic("palette");
})();
