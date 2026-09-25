/* Aura — multi-paper notebook with an iOS-style Type / Markup toggle.
   Type mode edits the text fields of the page; Markup mode lays an ink canvas over the whole
   sheet with a floating tool palette (pen, marker, pencil, eraser, colours, width, undo/redo). */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic;

  var PAPERS = [
    ["blank", "Blank"], ["lined", "Lined"], ["dot", "Dot grid"], ["grid", "Squared"],
    ["cornell", "Cornell"], ["col2", "2 columns"], ["col3", "3 columns"]
  ];
  var INKS = ["#2E2A3B", "#7A5AF0", "#F47BBD", "#4A87E0", "#3AA585", "#F2A93B", "#E0485F"];
  var TOOLS = {
    pen: { w: 2.6, alpha: 1, comp: "source-over" },
    marker: { w: 16, alpha: 0.32, comp: "multiply" },
    pencil: { w: 1.6, alpha: 0.75, comp: "source-over" }
  };
  var ink = { tool: "pen", color: INKS[0], size: 1, redo: [] };

  function newPage(paper) {
    return {
      id: A.uid(), title: "Untitled page", paper: paper || "lined", text: "",
      cornell: { topic: "", cue: "", notes: "", summary: "" },
      cols: [{ h: "", t: "" }, { h: "", t: "" }, { h: "", t: "" }],
      strokes: [], updated: Date.now()
    };
  }
  function curPage(id) {
    var nb = A.state.notebook;
    if (!nb.pages.length) { var p = newPage("lined"); p.title = "My first page"; nb.pages.push(p); A.save(); }
    var page = nb.pages.find(function (x) { return x.id === (id || nb.current); }) || nb.pages[0];
    nb.current = page.id;
    return page;
  }

  function sheetBody(page, pi) {
    var p = "notebook.pages." + pi;
    if (page.paper === "cornell") {
      return '<div class="cornell"><div class="c-head"><span class="eyebrow" style="margin:0">Topic</span><input data-bind="' + p + '.cornell.topic" value="' + esc(page.cornell.topic) + '" placeholder="Lecture, book, meeting…" /></div>' +
        '<div class="c-cue"><div class="c-lbl">Cues & questions</div><textarea data-bind="' + p + '.cornell.cue" data-grow placeholder="Keywords, questions…">' + esc(page.cornell.cue) + "</textarea></div>" +
        '<div class="c-notes"><div class="c-lbl">Notes</div><textarea data-bind="' + p + '.cornell.notes" data-grow placeholder="Main ideas, details, examples…">' + esc(page.cornell.notes) + "</textarea></div>" +
        '<div class="c-sum"><div class="c-lbl">Summary</div><textarea data-bind="' + p + '.cornell.summary" data-grow placeholder="In my own words…">' + esc(page.cornell.summary) + "</textarea></div></div>";
    }
    if (page.paper === "col2" || page.paper === "col3") {
      var n = page.paper === "col2" ? 2 : 3;
      return '<div class="sheet-cols" style="grid-template-columns:repeat(' + n + ',minmax(0,1fr))">' + page.cols.slice(0, n).map(function (c, i) {
        return '<div class="col"><input class="col-h" data-bind="' + p + ".cols." + i + '.h" value="' + esc(c.h) + '" placeholder="Column ' + (i + 1) + '" /><textarea data-bind="' + p + ".cols." + i + '.t" data-grow>' + esc(c.t) + "</textarea></div>";
      }).join("") + "</div>";
    }
    return '<textarea class="sheet-text" data-bind="' + p + '.text" data-grow placeholder="Start writing…">' + esc(page.text) + "</textarea>";
  }

  /* SVG glyphs for the iOS-style markup tools (tip colour follows the selected ink). */
  function toolSVG(kind, color) {
    var body = '<rect x="10" y="16" width="14" height="34" rx="3" fill="#fff" stroke="rgba(46,42,59,.14)"/>';
    if (kind === "pen") return '<svg viewBox="0 0 34 50">' + body + '<path d="M10 17 17 2l7 15z" fill="#f4f1fa" stroke="rgba(46,42,59,.14)"/><path d="M15.2 6 17 2l1.8 4z" fill="' + color + '"/><rect x="10" y="24" width="14" height="4" fill="' + color + '"/></svg>';
    if (kind === "marker") return '<svg viewBox="0 0 34 50">' + body + '<path d="M10 17h14l-2-8h-10z" fill="#f4f1fa" stroke="rgba(46,42,59,.14)"/><rect x="13" y="3" width="8" height="6" rx="1.5" fill="' + color + '" opacity=".7"/><rect x="10" y="24" width="14" height="4" fill="' + color + '" opacity=".7"/></svg>';
    if (kind === "pencil") return '<svg viewBox="0 0 34 50">' + body + '<path d="M10 17 17 3l7 14z" fill="#f6e3c3" stroke="rgba(46,42,59,.14)"/><path d="M15.5 6 17 3l1.5 3z" fill="' + color + '"/><rect x="10" y="24" width="14" height="4" fill="' + color + '" opacity=".6"/></svg>';
    return '<svg viewBox="0 0 34 50"><rect x="9" y="12" width="16" height="38" rx="4" fill="#fff" stroke="rgba(46,42,59,.14)"/><rect x="9" y="4" width="16" height="12" rx="4" fill="#FFC7D8" stroke="rgba(46,42,59,.14)"/></svg>';
  }
  function markupBar(page) {
    var tools = ["pen", "marker", "pencil", "eraser"].map(function (t) {
      return '<button class="mk-tool' + (ink.tool === t ? " on" : "") + '" data-act="ink-tool" data-v="' + t + '" aria-label="' + t + '" title="' + t.charAt(0).toUpperCase() + t.slice(1) + '">' + toolSVG(t, ink.color) + "</button>";
    }).join("");
    var colors = INKS.map(function (c) { return '<button class="mk-color' + (ink.color === c ? " on" : "") + '" style="background:' + c + '" data-act="ink-color" data-v="' + c + '" aria-label="Ink colour"></button>'; }).join("");
    return '<div class="markup-bar" id="markup-bar" role="toolbar" aria-label="Markup tools">' +
      '<button class="mk-btn" data-act="ink-undo" aria-label="Undo"' + (page.strokes.length ? "" : " disabled") + ">" + ic("undo") + "</button>" +
      '<button class="mk-btn" data-act="ink-redo" aria-label="Redo"' + (ink.redo.length ? "" : " disabled") + ">" + ic("redo") + '</button><span class="mk-sep"></span>' +
      tools + '<span class="mk-sep"></span>' + colors + '<span class="mk-sep"></span>' +
      '<input class="mk-size" type="range" min="0.5" max="3" step="0.25" value="' + ink.size + '" data-act-input="ink-size" aria-label="Stroke width" />' +
      '<button class="mk-btn" data-act="ink-clear" aria-label="Clear ink" title="Clear all ink">' + ic("trash") + "</button>" +
      '<button class="mk-btn" data-act="nb-mode" data-v="type" aria-label="Done" title="Done" style="color:var(--lav-3)">' + ic("check") + "</button></div>";
  }

  A.views.notebook = function (id) {
    var nb = A.state.notebook, page = curPage(id), pi = nb.pages.indexOf(page);
    var mode = A.state.ui.nbMode || "type";
    if (ink.page !== page.id) { ink.page = page.id; ink.redo = []; }
    var list = nb.pages.slice().sort(function (a, b) { return b.updated - a.updated; }).map(function (p) {
      return '<a class="nb-page-link' + (p.id === page.id ? " on" : "") + '" href="#/notebook/' + p.id + '"><i class="thumb pv paper-' + p.paper + '"></i><span>' + esc(p.title || "Untitled") + "</span></a>";
    }).join("");
    var papers = '<div class="paper-picker">' + PAPERS.map(function (x) {
      return '<button class="paper-opt' + (page.paper === x[0] ? " on" : "") + '" data-act="nb-paper" data-v="' + x[0] + '"><div class="pv paper-' + x[0] + '"></div>' + x[1] + "</button>";
    }).join("") + "</div>";

    var seg = '<div class="seg" role="tablist" aria-label="Notebook mode">' +
      '<button role="tab" aria-selected="' + (mode === "type") + '" class="' + (mode === "type" ? "on" : "") + '" data-act="nb-mode" data-v="type">' + ic("type") + "Type</button>" +
      '<button role="tab" aria-selected="' + (mode === "markup") + '" class="' + (mode === "markup" ? "on" : "") + '" data-act="nb-mode" data-v="markup">' + ic("pen") + "Markup</button></div>";

    A.afterRender = function () { setupSheet(page, mode); };

    return A.head("Digital notebook", 'Notebook <span class="soft">studio</span>', "Type your notes, then switch to Markup to handwrite, highlight and sketch right on the page.") +
      '<div class="nb-layout"><div class="stack">' +
        A.card("Pages", '<div class="nb-pages">' + list + '</div><button class="btn sm soft" style="margin-top:10px;width:100%" data-act="nb-new">' + ic("plus") + "New page</button>", { icon: "book" }) +
        A.card("Paper", papers, { icon: "grid", tone: "pink" }) +
        A.card("", '<button class="btn sm ghost" style="width:100%" data-act="nb-synth">' + ic("sparkle") + 'Synthesize into actions</button><button class="btn sm danger" style="width:100%;margin-top:8px" data-act="nb-del">' + ic("trash") + "Delete page</button>") +
      "</div>" +
      '<div><div class="nb-toolbar">' + A.input("notebook.pages." + pi + ".title", 'placeholder="Page title"', "bare nb-title") + seg + "</div>" +
      '<div class="sheet-wrap"><div class="sheet paper-' + page.paper + (mode === "markup" ? " annotating" + (ink.tool === "eraser" ? " eraser" : "") : "") + '" id="sheet">' + sheetBody(page, pi) + '<canvas class="ink-layer" id="ink"></canvas></div></div>' +
      '<p class="small muted" style="text-align:center;margin-top:10px">Last edited ' + new Date(page.updated).toLocaleString() + "</p></div></div>" +
      (mode === "markup" ? markupBar(page) : "");
  };

  /* ------------------------------------------------------------ ink engine */
  var live = null;
  function setupSheet(page, mode) {
    var sheet = document.getElementById("sheet"), cv = document.getElementById("ink");
    if (!sheet || !cv) return;
    var growAll = function () {
      sheet.querySelectorAll("[data-grow]").forEach(function (t) { t.style.height = "auto"; t.style.height = Math.max(t.scrollHeight, 0) + "px"; });
    };
    growAll();
    var ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1, W = 0, H = 0;
    function size() {
      W = sheet.clientWidth; H = Math.max(sheet.scrollHeight, maxStrokeY() * W + 40);
      if (H > sheet.clientHeight) sheet.style.minHeight = H + "px";
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + "px"; cv.style.height = H + "px";
      redraw();
    }
    function maxStrokeY() {
      var m = 0;
      page.strokes.forEach(function (s) { s.p.forEach(function (pt) { if (pt[1] > m) m = pt[1]; }); });
      return m;
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
          var a = pts[j - 1], b = pts[j], pr = (a[2] + b[2]) / 2 || 0.5;
          ctx.lineWidth = Math.max(0.6, base * (0.45 + pr * 1.1));
          ctx.beginPath(); ctx.moveTo(a[0] * W, a[1] * W);
          var mx = (a[0] + b[0]) / 2 * W, my = (a[1] + b[1]) / 2 * W;
          ctx.quadraticCurveTo(a[0] * W, a[1] * W, mx, my); ctx.lineTo(b[0] * W, b[1] * W);
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
    size();
    var ro = window.ResizeObserver ? new ResizeObserver(function () { if (sheet.clientWidth !== W) size(); }) : null;
    if (ro) ro.observe(sheet);
    sheet.addEventListener("input", function (e) {
      if (e.target.hasAttribute("data-grow")) {
        e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px";
        page.updated = Date.now();
        if (sheet.scrollHeight > H) size();
      }
    });

    if (mode !== "markup") { A.cleanup = function () { if (ro) ro.disconnect(); }; return; }

    var penSeen = false, erasing = false;
    function pt(e) {
      var r = cv.getBoundingClientRect();
      return [(e.clientX - r.left) / W, (e.clientY - r.top) / W, e.pressure && e.pointerType === "pen" ? e.pressure : 0.5];
    }
    function eraseAt(p) {
      var rad = 12 / W, before = page.strokes.length;
      page.strokes = page.strokes.filter(function (s) {
        return !s.p.some(function (q) { var dx = q[0] - p[0], dy = q[1] - p[1]; return dx * dx + dy * dy < rad * rad; });
      });
      if (page.strokes.length !== before) { redraw(); A.save(); }
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
      if (erasing) { erasing = false; refreshBar(); return; }
      if (!live) return;
      live.p = live.p.map(function (q) { return [+q[0].toFixed(4), +q[1].toFixed(4), +q[2].toFixed(2)]; });
      page.strokes.push(live); live = null; ink.redo = [];
      page.updated = Date.now();
      A.save(); redraw(); refreshBar();
      if (maxStrokeY() * W + 40 > H) size();
    };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    A.inkRedraw = redraw;
    A.cleanup = function () { if (ro) ro.disconnect(); A.inkRedraw = null; live = null; };
  }
  function refreshBar() {
    var bar = document.getElementById("markup-bar"), page = curPage();
    if (!bar) return;
    bar.outerHTML = markupBar(page);
    document.getElementById("markup-bar").style.animation = "none";
  }

  document.addEventListener("input", function (e) {
    if (e.target.getAttribute && e.target.getAttribute("data-act-input") === "ink-size") ink.size = A.num(e.target.value);
  });

  /* ------------------------------------------------------------ actions */
  A.acts["nb-mode"] = function (el) {
    A.state.ui.nbMode = el.getAttribute("data-v"); A.save(); A.render();
    if (A.state.ui.nbMode === "markup") A.toast("Markup on — draw anywhere on the page");
  };
  A.acts["nb-paper"] = function (el) {
    var page = curPage(); page.paper = el.getAttribute("data-v"); page.updated = Date.now(); A.save(); A.render();
  };
  A.acts["nb-new"] = function () {
    var page = newPage(curPage().paper);
    A.state.notebook.pages.push(page); A.state.notebook.current = page.id; A.state.ui.nbMode = "type"; A.save();
    location.hash = "#/notebook/" + page.id;
  };
  A.acts["nb-del"] = function () {
    var nb = A.state.notebook, page = curPage();
    if (!confirm("Delete “" + (page.title || "this page") + "”?")) return;
    nb.pages = nb.pages.filter(function (p) { return p.id !== page.id; });
    nb.current = nb.pages[0] ? nb.pages[0].id : ""; A.save();
    location.hash = "#/notebook";
    A.render();
  };
  A.acts["nb-synth"] = function () {
    var p = curPage(), txt = [p.title, p.text, p.cornell.topic, p.cornell.cue, p.cornell.notes, p.cornell.summary]
      .concat(p.cols.map(function (c) { return (c.h ? c.h + ":\n" : "") + c.t; })).filter(function (s) { return s && s.trim(); }).join("\n");
    if (txt.trim().length < 5) { A.toast("Type some notes on this page first."); return; }
    A.state.coach.synthInput = txt; A.save(); location.hash = "#/synth";
  };
  A.acts["ink-tool"] = function (el) {
    ink.tool = el.getAttribute("data-v");
    var sheet = document.getElementById("sheet");
    if (sheet) sheet.classList.toggle("eraser", ink.tool === "eraser");
    refreshBar();
  };
  A.acts["ink-color"] = function (el) {
    ink.color = el.getAttribute("data-v");
    if (ink.tool === "eraser") ink.tool = "pen";
    var sheet = document.getElementById("sheet");
    if (sheet) sheet.classList.remove("eraser");
    refreshBar();
  };
  A.acts["ink-undo"] = function () {
    var page = curPage();
    if (!page.strokes.length) return;
    ink.redo.push(page.strokes.pop()); A.save(); if (A.inkRedraw) A.inkRedraw(); refreshBar();
  };
  A.acts["ink-redo"] = function () {
    var page = curPage();
    if (!ink.redo.length) return;
    page.strokes.push(ink.redo.pop()); A.save(); if (A.inkRedraw) A.inkRedraw(); refreshBar();
  };
  A.acts["ink-clear"] = function () {
    var page = curPage();
    if (!page.strokes.length || !confirm("Clear all ink on this page?")) return;
    page.strokes = []; ink.redo = []; A.save(); if (A.inkRedraw) A.inkRedraw(); refreshBar();
  };
})();
