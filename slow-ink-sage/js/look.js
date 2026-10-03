/* Slow Ink Sage — Personalise: colour theme, light / dark, font and page background.
   The choice is saved with the planner (state.ui.look), so it travels with a backup. */
(function () {
  "use strict";
  var SI = window.SI, esc = SI.esc, ic = SI.ic;

  var THEMES = [["sage", "Sage", "#2F4A3A", "#DCE5D0"], ["clay", "Clay", "#8A4A34", "#F0D9CC"], ["dusk", "Dusk", "#34406B", "#DCE1F3"], ["rose", "Rose", "#7A3552", "#F4D9E1"]];
  var MODES = [["light", "Light"], ["auto", "Auto"], ["dark", "Dark"]];
  var FONTS = [["classic", "Classic", "Fraunces and Questrial", '"Fraunces", Georgia, serif'], ["cozy", "Cozy", "Lora and Nunito", '"Lora", Georgia, serif'], ["modern", "Modern", "Inter", '"Inter", system-ui, sans-serif']];
  var BGS = [["paper", "Paper"], ["plain", "Plain"], ["dots", "Dotted"]];
  var DEFAULT = { theme: "sage", mode: "light", font: "classic", bg: "paper" };

  function allowed(list, v, d) { return list.some(function (x) { return x[0] === v; }) ? v : d; }
  /* Always returns a valid choice, even if a restored backup contains something odd. */
  SI.look = function () {
    var l = (SI.state && SI.state.ui && SI.state.ui.look) || {};
    return { theme: allowed(THEMES, l.theme, DEFAULT.theme), mode: allowed(MODES, l.mode, DEFAULT.mode), font: allowed(FONTS, l.font, DEFAULT.font), bg: allowed(BGS, l.bg, DEFAULT.bg) };
  };

  var mql = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  SI.applyLook = function () {
    var l = SI.look(), root = document.documentElement;
    var mode = l.mode === "auto" ? (mql && mql.matches ? "dark" : "light") : l.mode;
    root.setAttribute("data-theme", l.theme); root.setAttribute("data-mode", mode);
    root.setAttribute("data-font", l.font); root.setAttribute("data-bg", l.bg);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) { var c = getComputedStyle(root).getPropertyValue("--cream").trim(); if (c) meta.setAttribute("content", c); }
  };
  if (mql && mql.addEventListener) mql.addEventListener("change", function () { if (SI.look().mode === "auto") SI.applyLook(); });
  else if (mql && mql.addListener) mql.addListener(function () { if (SI.look().mode === "auto") SI.applyLook(); });

  function opts(list, cur, act, render) {
    return list.map(function (x) { return render(x, x[0] === cur, act); }).join("");
  }
  function panel() {
    var l = SI.look();
    var themes = opts(THEMES, l.theme, "look-theme", function (x, on, act) {
      return '<button class="lk-opt lk-theme' + (on ? " on" : "") + '" data-act="' + act + '" data-v="' + x[0] + '" aria-pressed="' + on + '"><span class="lk-sw" style="background:linear-gradient(135deg,' + x[2] + ' 50%,' + x[3] + ' 50%)"></span><span>' + x[1] + "</span></button>";
    });
    var modes = '<div class="seg" role="group" aria-label="Appearance">' + MODES.map(function (x) {
      return '<button class="' + (x[0] === l.mode ? "on" : "") + '" data-act="look-mode" data-v="' + x[0] + '" aria-pressed="' + (x[0] === l.mode) + '">' + x[1] + "</button>";
    }).join("") + "</div>";
    var fonts = opts(FONTS, l.font, "look-font", function (x, on, act) {
      return '<button class="lk-opt lk-font' + (on ? " on" : "") + '" data-act="' + act + '" data-v="' + x[0] + '" aria-pressed="' + on + '"><span class="lk-aa" style="font-family:' + x[3] + '">Aa</span><span>' + x[1] + '<small>' + x[2] + "</small></span></button>";
    });
    var bgs = opts(BGS, l.bg, "look-bg", function (x, on, act) {
      return '<button class="lk-opt lk-bg lk-bg-' + x[0] + (on ? " on" : "") + '" data-act="' + act + '" data-v="' + x[0] + '" aria-pressed="' + on + '"><span class="lk-prev" aria-hidden="true"></span><span>' + x[1] + "</span></button>";
    });
    return '<h2 class="lk-title">Personalise</h2>' +
      '<p class="lk-label">Colour</p><div class="lk-row">' + themes + "</div>" +
      '<p class="lk-label">Appearance</p>' + modes +
      '<p class="lk-label">Font</p><div class="lk-row lk-3">' + fonts + "</div>" +
      '<p class="lk-label">Background</p><div class="lk-row lk-3">' + bgs + "</div>" +
      '<div class="ask-actions"><button class="btn ghost" data-act="look-reset">Reset</button><button class="btn" data-act="look-close">Done</button></div>';
  }
  function open() {
    var dlg = document.getElementById("look");
    if (!dlg) return;
    dlg.innerHTML = panel();
    if (typeof dlg.showModal === "function") { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
  }
  function refresh() {
    var dlg = document.getElementById("look"), act = document.activeElement && document.activeElement.getAttribute("data-act"), v = document.activeElement && document.activeElement.getAttribute("data-v");
    if (!dlg) return;
    dlg.innerHTML = panel();
    if (act) { var again = dlg.querySelector('[data-act="' + act + '"]' + (v ? '[data-v="' + v + '"]' : "")); if (again) again.focus(); }
  }
  function set(key, val) {
    var ui = SI.state.ui; ui.look = Object.assign({}, SI.look(), ui.look || {});
    ui.look = SI.look(); ui.look[key] = val; ui.look = SI.look();
    SI.save(); SI.applyLook(); refresh();
  }
  SI.actions["open-look"] = open;
  SI.actions["look-theme"] = function (el) { set("theme", el.getAttribute("data-v")); };
  SI.actions["look-mode"] = function (el) { set("mode", el.getAttribute("data-v")); };
  SI.actions["look-font"] = function (el) { set("font", el.getAttribute("data-v")); };
  SI.actions["look-bg"] = function (el) { set("bg", el.getAttribute("data-v")); };
  SI.actions["look-reset"] = function () { SI.state.ui.look = Object.assign({}, DEFAULT); SI.save(); SI.applyLook(); refresh(); };
  SI.actions["look-close"] = function () { var d = document.getElementById("look"); if (d && d.close) d.close(); else if (d) d.removeAttribute("open"); };
  document.addEventListener("click", function (e) { var d = document.getElementById("look"); if (d && d.open && e.target === d) SI.actions["look-close"](); });

  var lb = document.querySelector(".look-btn");
  if (lb) lb.innerHTML = ic("palette");
  SI.applyLook();
})();
