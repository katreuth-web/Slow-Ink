/* Slow Ink Sage — the notebook.
   When you open it, the planner steps back and a bound notebook takes over the screen:
   sections as tabs down the edge, a contents page on the left, and a sheet you can
   either type on or draw on (Type / Markup, like Notes on an iPad). */
(function () {
  "use strict";
  var SI = window.SI, esc = SI.esc, ic = SI.ic, A = SI.actions;
  function NB() { return SI.state.notebook; }

  var PAPERS = [["lined", "Lined"], ["blank", "Blank"], ["dot", "Dot grid"], ["grid", "Squared"]];
  var TONES = ["sage", "clay", "sand", "moss", "dusk"];
  var INKS = ["#26332B", "#2F5D46", "#7C9A7E", "#B5603F", "#3E6A8A", "#C8962E", "#A64B62"];
  var TOOLS = {
    pen: { w: 2.6, alpha: 1, comp: "source-over" },
    marker: { w: 16, alpha: 0.32, comp: "multiply" },
    pencil: { w: 1.6, alpha: 0.72, comp: "source-over" }
  };
  var ink = { tool: "pen", color: INKS[0], size: 1, redo: [], pageId: null };
  var current = { page: null, mode: "type" };

  function go(hash) { if (window.location.hash === hash) SI.render(); else window.location.hash = hash; }
  function pageById(id) { return NB().pages.filter(function (p) { return p.id === id; })[0]; }
  function sectionById(id) { return NB().sections.filter(function (s) { return s.id === id; })[0]; }
  function pagesIn(sectionId) {
    return NB().pages.filter(function (p) { return p.section === sectionId; }).sort(function (a, b) { return b.created - a.created; });
  }
  function newPage(sectionId, title, paper) {
    var n = Date.now(), p = { id: SI.uid(), section: sectionId, title: title || "Untitled page", paper: paper || "lined", text: "", strokes: [], extra: 0, created: n, updated: n };
    NB().pages.push(p);
    NB().current = p.id; NB().section = sectionId;
    SI.save();
    return p;
  }

  /* Work out which page (if any) to show, keeping section and page in step. */
  function resolve(id) {
    var nb = NB(), page = id && pageById(id);
    if (!page && nb.current) page = pageById(nb.current);
    if (page && !sectionById(page.section)) page.section = nb.sections[0].id;
    if (page && (!nb.section || sectionById(nb.section) == null || (id && page.section !== nb.section))) nb.section = page.section;
    if (!sectionById(nb.section)) nb.section = nb.sections[0].id;
    if (!page || page.section !== nb.section) page = pagesIn(nb.section)[0] || null;
    nb.current = page ? page.id : null;
    return page;
  }

  /* ------------------------------------------------------------ the view */
  SI.views.notebook = function (a) {
    var nb = NB(), page = resolve(a[0]), sec = sectionById(nb.section), mode = SI.state.ui.nbMode === "markup" ? "markup" : "type";
    if (!page) mode = "type";
    current.page = page; current.mode = mode;
    if (page && ink.pageId !== page.id) { ink.pageId = page.id; ink.redo = []; }

    var tabs = nb.sections.map(function (s) {
      return '<button class="btab tone-' + esc(s.tone || "sage") + (s.id === nb.section ? " on" : "") + '" data-act="nb-section" data-id="' + s.id + '" role="tab" aria-selected="' + (s.id === nb.section) + '"><span>' + esc(s.name) + "</span></button>";
    }).join("") + '<button class="btab add" data-act="nb-add-section" aria-label="Add a section" title="Add a section"><span>+</span></button>';

    var list = pagesIn(nb.section).map(function (p) {
      var d = new Date(p.created);
      return '<a class="pg-link' + (page && p.id === page.id ? " on" : "") + '" href="#/notebook/' + p.id + '" data-id="' + p.id + '"><span class="pg-title">' + esc(p.title || "Untitled page") + '</span><span class="pg-date">' + d.getDate() + " " + SI.MONTHS_SHORT[d.getMonth()] + " " + d.getFullYear() + "</span></a>";
    }).join("");

    var papers = page ? '<div class="papers" role="group" aria-label="Paper style">' + PAPERS.map(function (x) {
      return '<button class="paper-opt' + (page.paper === x[0] ? " on" : "") + '" data-act="nb-paper" data-v="' + x[0] + '" aria-pressed="' + (page.paper === x[0]) + '"><i class="pv paper-' + x[0] + '"></i>' + x[1] + "</button>";
    }).join("") + "</div>" : "";

    var left = '<aside class="book-index"><p class="eyebrow">' + esc(sec.name) + '</p><h2 class="index-title">Contents</h2>' +
      '<div class="pg-list">' + (list || '<p class="empty">No pages yet.</p>') + "</div>" +
      '<button class="btn sm block" data-act="nb-new">' + ic("plus") + "New page</button>" +
      (page ? '<div class="index-block"><p class="eyebrow">Paper</p>' + papers + "</div>" : "") +
      '<div class="index-block tools"><button class="linklike" data-act="nb-rename-section">Rename section</button>' +
      (nb.sections.length > 1 ? '<button class="linklike danger" data-act="nb-del-section">Delete section</button>' : "") +
      (page ? '<button class="linklike danger" data-act="nb-del">Delete this page</button>' : "") + "</div></aside>";

    var sheetCol;
    if (page) {
      var seg = '<div class="seg" role="tablist" aria-label="Type or Markup">' +
        '<button role="tab" aria-selected="' + (mode === "type") + '" class="' + (mode === "type" ? "on" : "") + '" data-act="nb-mode" data-v="type">' + ic("type") + "Type</button>" +
        '<button role="tab" aria-selected="' + (mode === "markup") + '" class="' + (mode === "markup" ? "on" : "") + '" data-act="nb-mode" data-v="markup">' + ic("pen") + "Markup</button></div>";
      var base = "notebook.pages.@" + page.id;
      sheetCol = '<div class="book-sheet-col"><div class="sheet-bar"><input class="sheet-title" data-bind="' + base + '.title" value="' + esc(page.title) + '" placeholder="Page title" aria-label="Page title" maxlength="80" />' +
        seg + '<button class="icon-btn" data-act="nb-print" aria-label="Print this page" title="Print this page">' + ic("print") + "</button></div>" +
        '<div class="sheet paper-' + page.paper + (mode === "markup" ? " annotating" + (ink.tool === "eraser" ? " eraser" : "") : "") + '" id="sheet" style="--extra:' + (page.extra || 0) + 'px">' +
        '<textarea class="sheet-text" id="sheet-text" data-bind="' + base + '.text" data-grow placeholder="Start writing…" spellcheck="true"' + (mode === "markup" ? " readonly tabindex=\"-1\"" : "") + ">" + esc(page.text) + "</textarea>" +
        '<canvas class="ink-layer" id="ink"></canvas></div>' +
        '<p class="sheet-foot"><button class="linklike" data-act="nb-room">Add more room below</button><span>Last edited ' + esc(new Date(page.updated).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })) + "</span></p></div>";
    } else {
      sheetCol = '<div class="book-sheet-col empty-sheet"><div class="sheet paper-lined static"><div class="empty-inner"><h2>A fresh section</h2><p>There are no pages in <b>' + esc(sec.name) + '</b> yet.</p><button class="btn" data-act="nb-new">' + ic("plus") + "Start a page</button></div></div></div>";
    }

    return '<div class="nb-desk"><div class="book">' + left + '<div class="book-spine" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>' + sheetCol +
      '<nav class="book-tabs" role="tablist" aria-label="Notebook sections">' + tabs + "</nav></div></div>" + (mode === "markup" ? markupBar(page) : "");
  };

  /* ------------------------------------------------------------ markup toolbar */
  function toolSVG(kind, color) {
    var body = '<rect x="10" y="16" width="14" height="34" rx="3" fill="#fffdf6" stroke="rgba(38,51,43,.22)"/>';
    if (kind === "pen") return '<svg viewBox="0 0 34 50" aria-hidden="true">' + body + '<path d="M10 17 17 2l7 15z" fill="#efe9d8" stroke="rgba(38,51,43,.22)"/><path d="M15.2 6 17 2l1.8 4z" fill="' + color + '"/><rect x="10" y="24" width="14" height="4" fill="' + color + '"/></svg>';
    if (kind === "marker") return '<svg viewBox="0 0 34 50" aria-hidden="true">' + body + '<path d="M10 17h14l-2-8h-10z" fill="#efe9d8" stroke="rgba(38,51,43,.22)"/><rect x="13" y="3" width="8" height="6" rx="1.500" fill="' + color + '" opacity=".7"/><rect x="10" y="24" width="14" height="4" fill="' + color + '" opacity=".7"/></svg>';
    if (kind === "pencil") return '<svg viewBox="0 0 34 50" aria-hidden="true">' + body + '<path d="M10 17 17 3l7 14z" fill="#efd9b0" stroke="rgba(38,51,43,.22)"/><path d="M15.500 6 17 3l1.500 3z" fill="' + color + '"/><rect x="10" y="24" width="14" height="4" fill="' + color + '" opacity=".6"/></svg>';
    return '<svg viewBox="0 0 34 50" aria-hidden="true"><rect x="9" y="12" width="16" height="38" rx="4" fill="#fffdf6" stroke="rgba(38,51,43,.22)"/><rect x="9" y="4" width="16" height="12" rx="4" fill="#e7b9a6" stroke="rgba(38,51,43,.22)"/></svg>';
  }
  function markupBar(page) {
    var tools = ["pen", "marker", "pencil", "eraser"].map(function (t) {
      return '<button class="mk-tool' + (ink.tool === t ? " on" : "") + '" data-act="ink-tool" data-v="' + t + '" aria-label="' + t + '" aria-pressed="' + (ink.tool === t) + '" title="' + t.charAt(0).toUpperCase() + t.slice(1) + '">' + toolSVG(t, ink.color) + "</button>";
    }).join("");
    var colors = INKS.map(function (c) {
      return '<button class="mk-color' + (ink.color === c ? " on" : "") + '" style="background:' + c + '" data-act="ink-color" data-v="' + c + '" aria-label="Ink colour ' + c + '" aria-pressed="' + (ink.color === c) + '"></button>';
    }).join("");
    return '<div class="markup-bar" id="markup-bar" role="toolbar" aria-label="Markup tools">' +
      '<button class="mk-btn" data-act="ink-undo" aria-label="Undo"' + (page && page.strokes.length ? "" : " disabled") + ">" + ic("undo") + "</button>" +
      '<button class="mk-btn" data-act="ink-redo" aria-label="Redo"' + (ink.redo.length ? "" : " disabled") + ">" + ic("redo") + '</button><span class="mk-sep"></span>' +
      tools + '<span class="mk-sep"></span><span class="mk-colors">' + colors + '</span><span class="mk-sep"></span>' +
      '<input class="mk-size" type="range" min="0.5" max="3" step="0.25" value="' + ink.size + '" data-act-input="ink-size" aria-label="Stroke width" />' +
      '<button class="mk-btn" data-act="ink-clear" aria-label="Clear all ink on this page" title="Clear all ink">' + ic("trash") + "</button>" +
      '<button class="mk-btn done" data-act="nb-mode" data-v="type" aria-label="Done drawing" title="Done">' + ic("check") + "</button></div>";
  }
  function refreshBar() {
    var bar = document.getElementById("markup-bar");
    if (bar && current.page) bar.outerHTML = markupBar(current.page);
    var sheet = document.getElementById("sheet");
    if (sheet) sheet.classList.toggle("eraser", ink.tool === "eraser");
  }

  /* ------------------------------------------------------------ ink engine */
  var redrawFn = null;
  SI.after.notebook = function () {
    var page = current.page, sheet = document.getElementById("sheet"), cv = document.getElementById("ink");
    redrawFn = null;
    if (!page || !sheet || !cv) return;
    var mode = current.mode, ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1, W = 0, H = 0, live = null;

    function grow() {
      var t = document.getElementById("sheet-text");
      if (t) { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }
    }
    function size() {
      grow();
      W = sheet.clientWidth; H = sheet.clientHeight;
      if (!W || !H) return;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + "px"; cv.style.height = H + "px";
      redraw();
    }
    function drawStroke(s) {
      var t = TOOLS[s.tool] || TOOLS.pen, pts = s.p;
      if (!pts.length) return;
      ctx.save();
      ctx.globalAlpha = t.alpha; ctx.globalCompositeOperation = t.comp;
      ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineCap = s.tool === "marker" ? "square" : "round"; ctx.lineJoin = "round";
      var base = t.w * s.s * (W / 800);
      if (pts.length === 1) {
        ctx.beginPath(); ctx.arc(pts[0][0] * W, pts[0][1] * W, Math.max(base, 1) / 2, 0, Math.PI * 2); ctx.fill();
      } else if (s.tool === "marker") {
        ctx.lineWidth = base; ctx.beginPath(); ctx.moveTo(pts[0][0] * W, pts[0][1] * W);
        for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * W, pts[i][1] * W);
        ctx.stroke();
      } else {
        for (var j = 1; j < pts.length; j++) {
          var p0 = pts[j - 1], p1 = pts[j], pr = (p0[2] + p1[2]) / 2 || 0.5;
          ctx.lineWidth = Math.max(0.6, base * (0.45 + pr * 1.1));
          ctx.beginPath(); ctx.moveTo(p0[0] * W, p0[1] * W);
          var mx = (p0[0] + p1[0]) / 2 * W, my = (p0[1] + p1[1]) / 2 * W;
          ctx.quadraticCurveTo(p0[0] * W, p0[1] * W, mx, my); ctx.lineTo(p1[0] * W, p1[1] * W);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    function redraw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      page.strokes.forEach(drawStroke);
      if (live) drawStroke(live);
    }
    redrawFn = redraw;
    size();

    var ro = window.ResizeObserver ? new ResizeObserver(function () { if (sheet.clientWidth !== W || sheet.clientHeight !== H) size(); }) : null;
    if (ro) ro.observe(sheet);
    var onResize = function () { size(); };
    window.addEventListener("resize", onResize);
    SI.cleanup = function () { if (ro) ro.disconnect(); window.removeEventListener("resize", onResize); redrawFn = null; };

    /* typing: keep the textarea as tall as its text so the sheet grows with it */
    sheet.addEventListener("input", function (e) { if (e.target.id === "sheet-text") { grow(); if (sheet.clientHeight !== H) size(); } });

    if (mode !== "markup") return;

    var penSeen = false, erasing = false, changed = false;
    function pt(e) {
      var r = cv.getBoundingClientRect();
      return [Math.round((e.clientX - r.left) / W * 10000) / 10000, Math.round((e.clientY - r.top) / W * 10000) / 10000, e.pressure && e.pointerType === "pen" ? Math.round(e.pressure * 100) / 100 : 0.5];
    }
    function eraseAt(p) {
      var rad = 12 / W, before = page.strokes.length;
      page.strokes = page.strokes.filter(function (s) {
        return !s.p.some(function (q) { var dx = q[0] - p[0], dy = q[1] - p[1]; return dx * dx + dy * dy < rad * rad; });
      });
      if (page.strokes.length !== before) { changed = true; redraw(); }
    }
    function finish() {
      if (changed) { page.updated = Date.now(); SI.save(); changed = false; refreshBar(); }
    }
    cv.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "pen") penSeen = true;
      if (penSeen && e.pointerType === "touch") return; /* palm rejection once a stylus is in use */
      e.preventDefault();
      cv.setPointerCapture(e.pointerId);
      if (ink.tool === "eraser") { erasing = true; eraseAt(pt(e)); return; }
      live = { tool: ink.tool, c: ink.color, s: ink.size, p: [pt(e)] };
      redraw();
    });
    cv.addEventListener("pointermove", function (e) {
      if (erasing) { eraseAt(pt(e)); return; }
      if (!live) return;
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (evs.length ? evs : [e]).forEach(function (ev) { live.p.push(pt(ev)); });
      redraw();
    });
    var end = function () {
      if (erasing) { erasing = false; finish(); return; }
      if (!live) return;
      page.strokes.push(live); live = null; ink.redo = []; changed = true;
      redraw(); finish();
    };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  };

  /* ------------------------------------------------------------ live edits from typing */
  SI.afterBind = function (path, el) {
    var m = /^notebook\.pages\.@([^.]+)\.(title|text)$/.exec(path);
    if (!m) return;
    var p = pageById(m[1]);
    if (!p) return;
    p.updated = Date.now();
    if (m[2] === "title") {
      var link = document.querySelector('.pg-link[data-id="' + m[1] + '"] .pg-title');
      if (link) link.textContent = el.value || "Untitled page";
    }
  };

  /* ------------------------------------------------------------ actions */
  A["nb-section"] = function (el) {
    var nb = NB(); nb.section = el.dataset.id;
    var first = pagesIn(nb.section)[0]; nb.current = first ? first.id : null;
    SI.save(); go(first ? "#/notebook/" + first.id : "#/notebook");
  };
  A["nb-add-section"] = function () {
    SI.ask("Name your new section", "", "Add section").then(function (name) {
      if (!name) return;
      var nb = NB(), tone = TONES[nb.sections.length % TONES.length];
      var s = { id: SI.uid(), name: name, tone: tone };
      nb.sections.push(s); nb.section = s.id; nb.current = null;
      SI.save(); go("#/notebook"); SI.render();
    });
  };
  A["nb-rename-section"] = function () {
    var s = sectionById(NB().section);
    SI.ask("Rename this section", s.name, "Rename").then(function (name) { if (name) { s.name = name; SI.save(); SI.render(); } });
  };
  A["nb-del-section"] = function () {
    var nb = NB(), s = sectionById(nb.section), n = pagesIn(s.id).length;
    if (nb.sections.length < 2) return;
    if (!window.confirm("Delete the section “" + s.name + "”" + (n ? " and its " + n + (n === 1 ? " page" : " pages") : "") + "? This can’t be undone.")) return;
    nb.pages = nb.pages.filter(function (p) { return p.section !== s.id; });
    nb.sections = nb.sections.filter(function (x) { return x.id !== s.id; });
    nb.section = nb.sections[0].id; nb.current = null;
    SI.save(); go("#/notebook"); SI.render();
  };
  A["nb-new"] = function () {
    var p = newPage(NB().section, "Untitled page", (current.page && current.page.paper) || "lined");
    go("#/notebook/" + p.id);
    setTimeout(function () { var t = document.querySelector(".sheet-title"); if (t) { t.focus(); t.select(); } }, 30);
  };
  A["nb-new-journal"] = function (el) {
    var nb = NB(), d = SI.parseKey(el.dataset.day) || SI.today();
    var title = "Journal · " + SI.DOW[SI.dowIndex(d)] + " " + d.getDate() + " " + SI.MONTHS_SHORT[d.getMonth()] + " " + d.getFullYear();
    var sec = nb.sections.filter(function (s) { return s.name.toLowerCase() === "journal"; })[0] || nb.sections[0];
    var existing = nb.pages.filter(function (p) { return p.section === sec.id && p.title === title; })[0];
    var p = existing || newPage(sec.id, title, "lined");
    nb.current = p.id; nb.section = sec.id;
    SI.state.ui.nbMode = "type"; SI.save();
    go("#/notebook/" + p.id);
    setTimeout(function () { var t = document.getElementById("sheet-text"); if (t) t.focus(); }, 40);
  };
  A["nb-paper"] = function (el) { if (current.page) { current.page.paper = el.dataset.v; SI.save(); SI.render(); } };
  A["nb-del"] = function () {
    var p = current.page;
    if (!p || !window.confirm("Delete “" + (p.title || "this page") + "”? This can’t be undone.")) return;
    var nb = NB();
    nb.pages = nb.pages.filter(function (x) { return x.id !== p.id; });
    nb.current = null; SI.save();
    var next = pagesIn(nb.section)[0];
    go(next ? "#/notebook/" + next.id : "#/notebook"); SI.render();
  };
  A["nb-mode"] = function (el) { SI.state.ui.nbMode = el.dataset.v; SI.save(); SI.render(); };
  A["nb-room"] = function () {
    if (!current.page) return;
    current.page.extra = (current.page.extra || 0) + 400; SI.save();
    var sheet = document.getElementById("sheet");
    if (sheet) sheet.style.setProperty("--extra", current.page.extra + "px");
    SI.toast("Added more room.");
  };
  A["nb-print"] = function () { window.print(); };

  A["ink-tool"] = function (el) { ink.tool = el.dataset.v; refreshBar(); };
  A["ink-color"] = function (el) { ink.color = el.dataset.v; if (ink.tool === "eraser") ink.tool = "pen"; refreshBar(); };
  A["ink-size"] = function (el) { ink.size = parseFloat(el.value) || 1; };
  A["ink-undo"] = function () {
    var p = current.page; if (!p || !p.strokes.length) return;
    ink.redo.push(p.strokes.pop()); p.updated = Date.now(); SI.save();
    if (redrawFn) redrawFn(); refreshBar();
  };
  A["ink-redo"] = function () {
    var p = current.page; if (!p || !ink.redo.length) return;
    p.strokes.push(ink.redo.pop()); p.updated = Date.now(); SI.save();
    if (redrawFn) redrawFn(); refreshBar();
  };
  A["ink-clear"] = function () {
    var p = current.page; if (!p || !p.strokes.length) return;
    if (!window.confirm("Clear all handwriting and drawing on this page? Your typed text stays.")) return;
    p.strokes = []; ink.redo = []; p.updated = Date.now(); SI.save();
    if (redrawFn) redrawFn(); refreshBar();
  };
})();
