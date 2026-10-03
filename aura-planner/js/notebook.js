/* Aura — the notebook.
   Opening it steps out of the planner into a bound notebook: sections as tabs down the edge,
   a contents page on the left and a sheet you can write on (headings, lists, links),
   decorate (photos and stickers you can move, turn and resize) or draw on (Type / Markup,
   like Notes on an iPad). Cornell and column papers keep their note boxes, and photos,
   stickers and ink work on every paper. */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic;
  function NB() { return A.state.notebook; }

  var PAPERS = [
    ["lined", "Lined"], ["blank", "Blank"], ["dot", "Dot grid"], ["grid", "Squared"],
    ["cornell", "Cornell"], ["col2", "2 columns"], ["col3", "3 columns"]
  ];
  var RICH = { lined: 1, blank: 1, dot: 1, grid: 1 };   /* papers written with the formatting editor */
  var INKS = ["#2E2A3B", "#7A5AF0", "#F47BBD", "#4A87E0", "#3AA585", "#F2A93B", "#E0485F"];
  var TOOLS = {
    pen: { w: 2.6, alpha: 1, comp: "source-over" },
    marker: { w: 16, alpha: 0.32, comp: "multiply" },
    pencil: { w: 1.6, alpha: 0.75, comp: "source-over" }
  };
  var TONES = ["lav", "pink", "mint", "sky", "butter"];
  var ink = { tool: "pen", color: INKS[0], size: 1, redo: [], pageId: null };
  var current = { page: null, mode: "type" };
  var sel = { id: null };                         /* the photo or sticker currently selected */
  var tray = { open: false, cat: "manifest" };    /* the sticker tray */

  function go(hash) { if (location.hash === hash) A.render(); else location.hash = hash; }
  function secById(id) { return NB().sections.filter(function (x) { return x.id === id; })[0]; }
  function pagesIn(sectionId) {
    return NB().pages.filter(function (p) { return p.section === sectionId; }).sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
  }
  function newPage(paper, sectionId, title) {
    var n = Date.now();
    return {
      id: A.uid(), section: sectionId || NB().section, title: title || "Untitled page", paper: paper || "lined", html: "", text: "",
      cornell: { topic: "", cue: "", notes: "", summary: "" },
      cols: [{ h: "", t: "" }, { h: "", t: "" }, { h: "", t: "" }],
      strokes: [], objects: [], extra: 0, created: n, updated: n
    };
  }
  /* Pages saved by an earlier version only have plain text, so give them rich text and room for objects. */
  function prepare(page) {
    if (typeof page.html !== "string") page.html = A.textToHtml(page.text || "");
    if (!Array.isArray(page.objects)) page.objects = [];
    if (!Array.isArray(page.strokes)) page.strokes = [];
    if (typeof page.extra !== "number") page.extra = 0;
    if (!page.cornell || typeof page.cornell !== "object") page.cornell = { topic: "", cue: "", notes: "", summary: "" };
    if (!Array.isArray(page.cols)) page.cols = [];
    while (page.cols.length < 3) page.cols.push({ h: "", t: "" });
    return page;
  }
  /* Older planners have no sections: tuck their pages into Notes so nothing goes missing. */
  function ensureNotebook() {
    var nb = NB();
    if (!Array.isArray(nb.sections) || !nb.sections.length) nb.sections = [{ id: "s-journal", name: "Journal", tone: "lav" }, { id: "s-notes", name: "Notes", tone: "pink" }, { id: "s-ideas", name: "Ideas", tone: "mint" }];
    var home = secById("s-notes") || nb.sections[0];
    nb.pages.forEach(function (p) {
      if (!p.section || !secById(p.section)) p.section = home.id;
      if (!p.created) p.created = p.updated || Date.now();
    });
    if (!secById(nb.section)) nb.section = nb.pages.length && nb.current ? home.id : nb.sections[0].id;
  }
  /* Which page (if any) is on show. Keeps the section tab and the page in step. */
  function curPage(id) {
    ensureNotebook();
    var nb = NB(), page = id && nb.pages.filter(function (x) { return x.id === id; })[0];
    if (!page && nb.current) page = nb.pages.filter(function (x) { return x.id === nb.current; })[0];
    if (page) nb.section = page.section;
    else page = pagesIn(nb.section)[0] || null;
    nb.current = page ? page.id : "";
    return page;
  }

  /* A small "type a name" box for section names and links. */
  A.ask = function (label, value, okText) {
    return new Promise(function (resolve) {
      var dlg = document.getElementById("ask"), input = document.getElementById("ask-input");
      if (!dlg || typeof dlg.showModal !== "function") {
        var v = window.prompt(label, value || "");
        resolve(v && v.trim() ? v.trim() : null);
        return;
      }
      document.getElementById("ask-label").textContent = label;
      document.getElementById("ask-ok").textContent = okText || "Save";
      input.value = value || "";
      dlg.onclose = function () {
        dlg.onclose = null;
        resolve(dlg.returnValue === "ok" && input.value.trim() ? input.value.trim() : null);
      };
      dlg.showModal(); input.focus(); input.select();
    });
  };

  /* ------------------------------------------------------------ the view */
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
    var body = A.sanitizeHtml(page.html) || "<p><br></p>";
    return '<div class="editor" id="editor" contenteditable="' + (current.mode === "type") + '" role="textbox" aria-multiline="true" aria-label="Page text" spellcheck="true" data-placeholder="Start writing…">' + body + "</div>";
  }

  function objBtn(act, icon, label, cls) { return '<button class="tb ' + (cls || "") + '" data-act="' + act + '">' + ic(icon) + label + "</button>"; }
  function toolsHtml(rich) {
    function t(cmd, label, title, cls) { return '<button class="tb ' + (cls || "") + '" data-act="fmt" data-cmd="' + cmd + '" title="' + title + '" aria-label="' + title + '">' + label + "</button>"; }
    var fmt = rich ?
      t("h1", "Title", "Title", "tb-txt") + t("h2", "Heading", "Heading", "tb-txt") + t("h3", "Subhead", "Subhead", "tb-txt") + '<span class="tb-sep"></span>' +
      t("bold", "<b>B</b>", "Bold") + t("italic", "<i>I</i>", "Italic") + t("underline", "<u>U</u>", "Underline") + '<span class="tb-sep"></span>' +
      t("ul", ic("list"), "Bulleted list") + t("ol", ic("ol"), "Numbered list") + t("rule", ic("rule"), "Divider line") + t("link", ic("link"), "Add or remove a link") +
      '<a class="tb tb-txt" id="open-link" href="#" target="_blank" rel="noopener noreferrer" hidden>' + ic("external") + "Open link</a>" : "";
    return '<div class="nbtools" id="tools" role="toolbar" aria-label="Formatting and extras">' +
      '<div class="tools-row tools-fmt">' + fmt + '<span class="tb-grow"></span>' +
      '<button class="tb tb-primary" data-act="nb-photo">' + ic("image") + "Photo</button>" +
      '<button class="tb tb-primary' + (tray.open ? " on" : "") + '" data-act="nb-stickers" aria-expanded="' + tray.open + '">' + ic("sticker") + "Stickers</button></div>" +
      '<div class="tools-row tools-obj" hidden><span class="obj-name" id="obj-name">Selected</span><span class="tb-grow"></span>' +
      objBtn("obj-front", "front", "Bring forward") + objBtn("obj-back", "back", "Send back") + objBtn("obj-dup", "copy", "Duplicate") + objBtn("obj-del", "trash", "Delete", "tb-danger") + objBtn("obj-done", "check", "Done", "tb-primary") + "</div></div>";
  }
  function trayHtml() {
    var cats = A.STICKER_CATS.map(function (c) {
      return '<button class="cat' + (tray.cat === c[0] ? " on" : "") + '" data-act="tray-cat" data-id="' + c[0] + '">' + esc(c[1]) + "</button>";
    }).join("");
    var grid = A.STICKERS.filter(function (s) { return s.c === tray.cat; }).map(function (s) {
      return '<button class="stk' + (s.w / s.h > 2 ? " wide" : "") + '" data-act="add-sticker" data-key="' + s.k + '" title="' + esc(s.n) + '" aria-label="Add sticker: ' + esc(s.n) + '">' + A.stickerSvg(s.k) + "</button>";
    }).join("");
    return '<div class="tray" id="tray"><div class="tray-head"><div class="cats">' + cats + '</div><button class="icon-btn" data-act="nb-stickers" aria-label="Close stickers">' + ic("x") + '</button></div><div class="tray-grid">' + grid + "</div></div>";
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
      return '<button class="mk-tool' + (ink.tool === t ? " on" : "") + '" data-act="ink-tool" data-v="' + t + '" aria-label="' + t + '" aria-pressed="' + (ink.tool === t) + '" title="' + t.charAt(0).toUpperCase() + t.slice(1) + '">' + toolSVG(t, ink.color) + "</button>";
    }).join("");
    var colors = INKS.map(function (c) { return '<button class="mk-color' + (ink.color === c ? " on" : "") + '" style="background:' + c + '" data-act="ink-color" data-v="' + c + '" aria-label="Ink colour" aria-pressed="' + (ink.color === c) + '"></button>'; }).join("");
    return '<div class="markup-bar" id="markup-bar" role="toolbar" aria-label="Markup tools">' +
      '<button class="mk-btn" data-act="ink-undo" aria-label="Undo"' + (page && page.strokes.length ? "" : " disabled") + ">" + ic("undo") + "</button>" +
      '<button class="mk-btn" data-act="ink-redo" aria-label="Redo"' + (ink.redo.length ? "" : " disabled") + ">" + ic("redo") + '</button><span class="mk-sep"></span>' +
      tools + '<span class="mk-sep"></span>' + colors + '<span class="mk-sep"></span>' +
      '<input class="mk-size" type="range" min="0.5" max="3" step="0.25" value="' + ink.size + '" data-act-input="ink-size" aria-label="Stroke width" />' +
      '<button class="mk-btn" data-act="ink-clear" aria-label="Clear ink" title="Clear all ink">' + ic("trash") + "</button>" +
      '<button class="mk-btn" data-act="nb-mode" data-v="type" aria-label="Done" title="Done" style="color:var(--lav-3)">' + ic("check") + "</button></div>";
  }
  function refreshBar() {
    var bar = document.getElementById("markup-bar");
    if (bar && current.page) { bar.outerHTML = markupBar(current.page); document.getElementById("markup-bar").style.animation = "none"; }
    var sheet = document.getElementById("sheet");
    if (sheet) sheet.classList.toggle("eraser", ink.tool === "eraser");
  }

  A.views.notebook = function (id) {
    var nb = NB(), page = curPage(id), sec = secById(nb.section);
    if (page) prepare(page);
    var pi = page ? nb.pages.indexOf(page) : -1;
    var mode = page && A.state.ui.nbMode === "markup" ? "markup" : "type";
    current.page = page; current.mode = mode;
    if (page && ink.pageId !== page.id) { ink.pageId = page.id; ink.redo = []; sel.id = null; }
    var rich = !!(page && RICH[page.paper]);

    var tabs = nb.sections.map(function (s) {
      return '<button class="btab tone-' + esc(s.tone || "lav") + (s.id === nb.section ? " on" : "") + '" data-act="nb-section" data-id="' + s.id + '" role="tab" aria-selected="' + (s.id === nb.section) + '"><span>' + esc(s.name) + "</span></button>";
    }).join("") + '<button class="btab add" data-act="nb-add-section" aria-label="Add a section" title="Add a section"><span>+</span></button>';

    var list = pagesIn(nb.section).map(function (p) {
      var d = new Date(p.created || p.updated);
      return '<a class="nb-page-link' + (page && p.id === page.id ? " on" : "") + '" href="#/notebook/' + p.id + '" data-id="' + p.id + '"><i class="thumb pv paper-' + esc(p.paper) + '"></i><span class="pg-text"><span class="pg-title">' + esc(p.title || "Untitled page") + '</span><span class="pg-date">' + d.getDate() + " " + A.MONTHS[d.getMonth()].slice(0, 3) + " " + d.getFullYear() + "</span></span></a>";
    }).join("");
    var papers = page ? '<div class="paper-picker">' + PAPERS.map(function (x) {
      return '<button class="paper-opt' + (page.paper === x[0] ? " on" : "") + '" data-act="nb-paper" data-v="' + x[0] + '" aria-pressed="' + (page.paper === x[0]) + '"><div class="pv paper-' + x[0] + '"></div>' + x[1] + "</button>";
    }).join("") + "</div>" : "";

    var left = '<aside class="book-index"><p class="eyebrow">' + esc(sec.name) + '</p><h2 class="index-title">Contents</h2>' +
      '<div class="nb-pages">' + (list || '<p class="small muted">No pages yet.</p>') + "</div>" +
      '<button class="btn sm block" data-act="nb-new">' + ic("plus") + "New page</button>" +
      (page ? '<div class="index-block"><p class="eyebrow">Paper</p>' + papers + "</div>" : "") +
      (page ? '<div class="index-block"><button class="btn sm ghost block" data-act="nb-synth">' + ic("sparkle") + "Sort into actions</button></div>" : "") +
      '<div class="index-block tools"><button class="linklike" data-act="nb-rename-section">Rename section</button>' +
      (nb.sections.length > 1 ? '<button class="linklike danger" data-act="nb-del-section">Delete section</button>' : "") +
      (page ? '<button class="linklike danger" data-act="nb-del">Delete this page</button>' : "") + "</div></aside>";

    var sheetCol;
    if (page) {
      var seg = '<div class="seg" role="tablist" aria-label="Notebook mode">' +
        '<button role="tab" aria-selected="' + (mode === "type") + '" class="' + (mode === "type" ? "on" : "") + '" data-act="nb-mode" data-v="type">' + ic("type") + "Type</button>" +
        '<button role="tab" aria-selected="' + (mode === "markup") + '" class="' + (mode === "markup" ? "on" : "") + '" data-act="nb-mode" data-v="markup">' + ic("pen") + "Markup</button></div>";
      A.afterRender = mount;
      sheetCol = '<div class="book-sheet-col"><div class="nb-toolbar">' + A.input("notebook.pages." + pi + ".title", 'placeholder="Page title" maxlength="80" data-live="nb-title-live" data-id="' + page.id + '"', "bare nb-title") + seg +
        '<button class="icon-btn sm" data-act="nb-print" aria-label="Print this page" title="Print this page">' + ic("print") + "</button></div>" +
        (mode === "type" ? toolsHtml(rich) + (tray.open ? trayHtml() : "") + '<input type="file" id="photo-input" accept="image/*" multiple hidden />' : "") +
        '<div class="sheet-wrap"><div class="sheet paper-' + page.paper + (mode === "markup" ? " annotating" + (ink.tool === "eraser" ? " eraser" : "") : "") + '" id="sheet" style="--extra:' + (page.extra || 0) + 'px">' + sheetBody(page, pi) +
        '<div class="objects" id="objects"></div><canvas class="ink-layer" id="ink"></canvas></div></div>' +
        '<p class="small muted sheet-foot">' + (rich ? '<button class="linklike" data-act="nb-room">Add more room below</button> · ' : "") + "Last edited " + esc(new Date(page.updated).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })) + "</p></div>";
    } else {
      sheetCol = '<div class="book-sheet-col empty-sheet"><div class="sheet paper-lined static"><div class="empty-inner"><h2>A fresh section</h2><p>There are no pages in <b>' + esc(sec.name) + '</b> yet.</p><button class="btn" data-act="nb-new">' + ic("plus") + "Start a page</button></div></div></div>";
    }

    return '<div class="nb-desk"><div class="book">' + left + '<div class="book-spine" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>' + sheetCol +
      '<nav class="book-tabs" role="tablist" aria-label="Notebook sections">' + tabs + "</nav></div></div>" + (mode === "markup" ? markupBar(page) : "");
  };

  /* ------------------------------------------------------------ editor + objects + ink */
  var redrawFn = null, api = null;
  function mount() {
    var page = current.page, sheet = document.getElementById("sheet"), cv = document.getElementById("ink");
    redrawFn = null; api = null;
    if (!page || !sheet || !cv) { A.cleanup = null; return; }
    var mode = current.mode, ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1, W = 0, H = 0, live = null;
    var ed = document.getElementById("editor"), layer = document.getElementById("objects"), tools = document.getElementById("tools");
    var cleanups = [];
    function listen(target, type, fn, opts) { target.addEventListener(type, fn, opts); cleanups.push(function () { target.removeEventListener(type, fn, opts); }); }
    function growAll() {
      Array.prototype.forEach.call(sheet.querySelectorAll("[data-grow]"), function (t) { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; });
    }

    /* ---------- the ink canvas ---------- */
    function size() {
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

    /* ---------- photos and stickers ---------- */
    function objById(id) { return page.objects.filter(function (o) { return o.id === id; })[0]; }
    function objAr(o) {
      if (o.type === "img") return o.ar || 0.75;
      var st = A.sticker(o.key);
      return st ? st.h / st.w : 1;
    }
    function elOf(id) { return layer.querySelector('[data-oid="' + id + '"]'); }
    function place(el, o) {
      el.style.width = (o.w * W) + "px";
      el.style.left = (o.x * W) + "px";
      el.style.top = (o.y * W) + "px";
      el.style.transform = "rotate(" + o.rot + "deg)";
      el.style.zIndex = String(page.objects.indexOf(o) + 1);
    }
    function makeEl(o) {
      var d = document.createElement("div");
      d.className = "obj obj-" + (o.type === "img" ? "photo" : "sticker");
      d.setAttribute("data-oid", o.id);
      d.tabIndex = 0;
      d.setAttribute("role", "img");
      d.setAttribute("aria-label", o.type === "img" ? "Photo" : "Sticker");
      d.innerHTML = '<div class="obj-body">' + (o.type === "img" ? '<img alt="" draggable="false">' : A.stickerSvg(o.key)) + "</div>" +
        '<span class="obj-h obj-del" data-h="del" title="Delete">' + ic("x") + '</span><span class="obj-h obj-rot" data-h="rot" title="Turn">' + ic("rotate") + '</span><span class="obj-h obj-res" data-h="res" title="Resize">' + ic("resize") + "</span>";
      if (o.type === "img") {
        var url = A.images.url(o.imgId);
        if (url) d.querySelector("img").src = url; else d.classList.add("missing");
      }
      return d;
    }
    function renderObjects() {
      layer.innerHTML = "";
      page.objects = page.objects.filter(function (o) { return o.type === "img" || A.sticker(o.key); });
      page.objects.forEach(function (o) { var el = makeEl(o); layer.appendChild(el); place(el, o); });
      markSelected();
    }
    function restack() { page.objects.forEach(function (o) { var el = elOf(o.id); if (el) el.style.zIndex = String(page.objects.indexOf(o) + 1); }); }
    function markSelected() {
      Array.prototype.forEach.call(layer.children, function (el) { el.classList.toggle("sel", el.getAttribute("data-oid") === sel.id); });
      if (!tools) return;
      var o = sel.id && objById(sel.id);
      tools.classList.toggle("has-sel", !!o);
      tools.querySelector(".tools-fmt").hidden = !!o;
      tools.querySelector(".tools-obj").hidden = !o;
      if (o) tools.querySelector("#obj-name").textContent = o.type === "img" ? "Photo selected" : "Sticker selected";
    }
    function select(id) {
      sel.id = id; markSelected();
      var a = document.activeElement;
      if (id && a && a.isContentEditable) a.blur();   /* so Delete removes the sticker, not text */
    }
    function touch() { page.updated = Date.now(); A.save(); }
    function imgStillUsed(imgId) {
      return NB().pages.some(function (p) { return (p.objects || []).some(function (o) { return o.type === "img" && o.imgId === imgId; }); });
    }
    function removeObj(id) {
      var o = objById(id); if (!o) return;
      page.objects = page.objects.filter(function (x) { return x.id !== id; });
      var el = elOf(id); if (el) el.remove();
      if (sel.id === id) sel.id = null;
      markSelected(); restack(); touch();
      if (o.type === "img" && !imgStillUsed(o.imgId)) A.images.remove(o.imgId);
    }
    function center() {
      var r = sheet.getBoundingClientRect(), top = Math.max(r.top, 0), bottom = Math.min(r.bottom, window.innerHeight);
      var cy = bottom > top ? (top + bottom) / 2 - r.top : r.height / 2;
      var jit = function () { return (Math.random() - 0.5) * 0.08; };
      return { x: 0.5 + jit(), y: Math.max(0.05, Math.min(cy / W + jit(), H / W - 0.05)) };
    }
    function addObj(o) {
      var c = center(), w = o.w, h = w * objAr(o);
      o.id = A.uid(); o.x = c.x - w / 2; o.y = Math.max(0, c.y - h / 2); o.rot = o.rot || 0;
      page.objects.push(o);
      var el = makeEl(o); layer.appendChild(el); place(el, o);
      select(o.id); touch();
    }
    function addSticker(key) {
      var st = A.sticker(key); if (!st) return;
      addObj({ type: "sticker", key: key, w: st.w / st.h > 2 ? 0.3 : 0.17 });
    }
    function aspect(url) {
      return new Promise(function (res) {
        var im = new Image();
        im.onload = function () { res(im.naturalWidth && im.naturalHeight ? im.naturalHeight / im.naturalWidth : 0.75); };
        im.onerror = function () { res(0.75); };
        im.src = url;
      });
    }
    function addPhotos(files) {
      Array.prototype.slice.call(files || []).filter(function (f) { return /^image\//.test(f.type); }).forEach(function (f) {
        A.images.add(f).then(function (id) {
          return aspect(A.images.url(id)).then(function (ar) {
            addObj({ type: "img", imgId: id, ar: ar, w: Math.min(0.42, 0.46 / ar) });
          });
        }).catch(function () { A.toast("That picture couldn’t be added."); });
      });
    }
    api = { addSticker: addSticker, addPhotos: addPhotos, select: select, remove: removeObj, selected: function () { return sel.id && objById(sel.id); }, dup: function () {
      var o = api.selected(); if (!o) return;
      var c = JSON.parse(JSON.stringify(o)); c.id = A.uid(); c.x += 0.03; c.y += 0.03;
      page.objects.push(c); var el = makeEl(c); layer.appendChild(el); place(el, c); select(c.id); touch();
    }, move: function (dir) {
      var o = api.selected(); if (!o) return;
      var i = page.objects.indexOf(o), j = Math.max(0, Math.min(page.objects.length - 1, i + dir));
      page.objects.splice(i, 1); page.objects.splice(j, 0, o); restack(); touch();
    } };

    /* dragging, turning and resizing */
    var drag = null;
    listen(layer, "pointerdown", function (e) {
      if (mode !== "type") return;
      var el = e.target.closest(".obj"); if (!el) return;
      var o = objById(el.getAttribute("data-oid")); if (!o) return;
      select(o.id);
      var handle = e.target.closest("[data-h]"), kind = handle ? handle.getAttribute("data-h") : "move";
      if (kind === "del") { removeObj(o.id); return; }
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      try { el.focus({ preventScroll: true }); } catch (err2) { /* ignore */ }
      var rect = el.getBoundingClientRect();
      drag = { o: o, el: el, kind: kind, px: e.clientX, py: e.clientY, x: o.x, y: o.y, cx: (rect.left + rect.right) / 2, cy: (rect.top + rect.bottom) / 2, w: o.w, moved: false };
    });
    listen(layer, "pointermove", function (e) {
      if (!drag) return;
      var o = drag.o, ar = objAr(o);
      drag.moved = true;
      if (drag.kind === "move") {
        var nx = drag.x + (e.clientX - drag.px) / W, ny = drag.y + (e.clientY - drag.py) / W;
        var cxo = Math.max(0, Math.min(1, nx + o.w / 2)), cyo = Math.max(0, Math.min(H / W, ny + o.w * ar / 2));
        o.x = cxo - o.w / 2; o.y = cyo - o.w * ar / 2;
      } else if (drag.kind === "rot") {
        var a = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx) * 180 / Math.PI + 90;
        a = ((a + 540) % 360) - 180;
        [-180, -90, 0, 90, 180].forEach(function (s) { if (Math.abs(a - s) < 4) a = s; });
        o.rot = Math.round(a * 10) / 10;
      } else {
        var th = o.rot * Math.PI / 180, vx = e.clientX - drag.cx, vy = e.clientY - drag.cy;
        var lx = vx * Math.cos(th) + vy * Math.sin(th), ly = -vx * Math.sin(th) + vy * Math.cos(th);
        var nw = Math.max(0.04, Math.min(1.2, 2 * (lx + ar * ly) / (1 + ar * ar) / W));
        var cx0 = o.x + o.w / 2, cy0 = o.y + o.w * ar / 2;
        o.w = nw; o.x = cx0 - nw / 2; o.y = cy0 - nw * ar / 2;
      }
      place(drag.el, o);
    });
    function endDrag() { if (drag) { if (drag.moved) touch(); drag = null; } }
    listen(layer, "pointerup", endDrag);
    listen(layer, "pointercancel", endDrag);
    listen(sheet, "pointerdown", function (e) { if (!e.target.closest(".obj")) select(null); });
    listen(document, "keydown", function (e) {
      if (mode !== "type") return;
      if (e.key === "Escape" && sel.id) { select(null); return; }
      var o = api.selected(); if (!o) return;
      var a = document.activeElement;
      if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeObj(o.id); return; }
      var step = e.shiftKey ? 0.05 : 0.01, moved = true;
      if (e.key === "ArrowLeft") o.x -= step; else if (e.key === "ArrowRight") o.x += step;
      else if (e.key === "ArrowUp") o.y -= step; else if (e.key === "ArrowDown") o.y += step; else moved = false;
      if (moved) { e.preventDefault(); place(elOf(o.id), o); touch(); }
    });

    /* ---------- the typing area (rich papers) ---------- */
    function isEmpty() { return !ed.textContent.trim() && !ed.querySelector("hr,li"); }
    function sync() {
      page.html = ed.innerHTML;
      page.text = ed.innerText.replace(/\n{3,}/g, "\n\n").trim();
      page.updated = Date.now();
      ed.classList.toggle("is-empty", isEmpty());
      A.save();
    }
    function inEditor() { var s = window.getSelection(); return !!(ed && s && s.rangeCount && ed.contains(s.anchorNode)); }
    function toEnd() { ed.focus(); var s = window.getSelection(), r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); s.removeAllRanges(); s.addRange(r); }
    function nodeEl() { var s = window.getSelection(), n = s && s.anchorNode; return n ? (n.nodeType === 3 ? n.parentElement : n) : null; }
    function updateFmt() {
      if (!ed || !tools || mode !== "type" || !inEditor()) return;
      var map = { bold: "bold", italic: "italic", underline: "underline", ul: "insertUnorderedList", ol: "insertOrderedList" };
      Object.keys(map).forEach(function (k) {
        var b = tools.querySelector('[data-cmd="' + k + '"]'), on = false;
        try { on = document.queryCommandState(map[k]); } catch (e) { on = false; }
        if (b) b.classList.toggle("on", on);
      });
      var n = nodeEl(), blk = n && n.closest("h1,h2,h3"), anchor = n && n.closest("a");
      ["h1", "h2", "h3"].forEach(function (h) { var b = tools.querySelector('[data-cmd="' + h + '"]'); if (b) b.classList.toggle("on", !!blk && blk.tagName.toLowerCase() === h); });
      var lb = tools.querySelector('[data-cmd="link"]'), ol = document.getElementById("open-link");
      if (lb) lb.classList.toggle("on", !!anchor);
      if (ol) { ol.hidden = !anchor; if (anchor) ol.href = anchor.getAttribute("href"); }
    }
    function tidyLinks() {
      Array.prototype.forEach.call(ed.querySelectorAll("a"), function (a) {
        var h = A.safeUrl(a.getAttribute("href"));
        if (!h) { a.replaceWith.apply(a, Array.prototype.slice.call(a.childNodes)); return; }
        a.setAttribute("href", h); a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener noreferrer");
      });
    }
    function exec(cmd, val) { try { document.execCommand(cmd, false, val); } catch (e) { /* ignore */ } }
    function after() { tidyLinks(); sync(); updateFmt(); }
    function doLink() {
      var n = nodeEl(), anchor = n && n.closest("a");
      if (anchor) { exec("unlink"); after(); return; }
      var s = window.getSelection(), range = s.rangeCount ? s.getRangeAt(0).cloneRange() : null, collapsed = !range || range.collapsed;
      A.ask("Link address (for example example.com)", "", "Add link").then(function (val) {
        if (!val) return;
        var url = A.safeUrl(val);
        if (!url) { A.toast("That doesn’t look like a web address."); return; }
        ed.focus();
        if (range) { var sel2 = window.getSelection(); sel2.removeAllRanges(); sel2.addRange(range); } else toEnd();
        if (collapsed) exec("insertHTML", '<a href="' + esc(url) + '">' + esc(val) + "</a>"); else exec("createLink", url);
        after();
      });
    }
    api.format = function (cmd) {
      if (mode !== "type" || !ed) return;
      if (!inEditor()) toEnd(); else ed.focus();
      if (cmd === "h1" || cmd === "h2" || cmd === "h3") {
        var n = nodeEl(), blk = n && n.closest("h1,h2,h3");
        exec("formatBlock", blk && blk.tagName.toLowerCase() === cmd ? "<p>" : "<" + cmd + ">");
      } else if (cmd === "bold" || cmd === "italic" || cmd === "underline") exec(cmd);
      else if (cmd === "ul") exec("insertUnorderedList");
      else if (cmd === "ol") exec("insertOrderedList");
      else if (cmd === "rule") exec("insertHorizontalRule");
      else if (cmd === "link") { doLink(); return; }
      after();
    };

    if (ed) {
      ed.classList.toggle("is-empty", isEmpty());
      exec("defaultParagraphSeparator", "p"); exec("styleWithCSS", false);
      listen(ed, "input", function () {
        var f = ed.firstChild;
        if (f && f.nodeType === 3 && mode === "type") exec("formatBlock", "<p>");
        sync(); updateFmt();
      });
      listen(ed, "paste", function (e) {
        var cd = e.clipboardData; if (!cd) return;
        e.preventDefault();
        if (cd.files && cd.files.length) { addPhotos(cd.files); return; }
        var t = cd.getData("text/plain");
        if (t) { exec("insertText", t); sync(); }
      });
      listen(ed, "drop", function (e) { e.preventDefault(); });
      listen(ed, "keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); api.format("link"); } });
      listen(ed, "click", function () { updateFmt(); });
    } else {
      /* note-box papers: the boxes grow with what is typed, and the sheet (and ink) grow with them */
      growAll();
      listen(sheet, "input", function (e) {
        if (e.target.hasAttribute && e.target.hasAttribute("data-grow")) {
          e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px";
          page.updated = Date.now();
        }
      });
    }
    listen(sheet, "dragover", function (e) { if (mode === "type" && e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") >= 0) e.preventDefault(); });
    listen(sheet, "drop", function (e) { if (mode === "type" && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); addPhotos(e.dataTransfer.files); } });
    listen(document, "selectionchange", updateFmt);
    if (tools) listen(tools, "mousedown", function (e) { if (e.target.closest("button")) e.preventDefault(); });
    var pin = document.getElementById("photo-input");
    if (pin) listen(pin, "change", function () { addPhotos(pin.files); pin.value = ""; });

    /* ---------- start up ---------- */
    W = sheet.clientWidth; H = sheet.clientHeight;
    renderObjects();
    size();
    var ro = window.ResizeObserver ? new ResizeObserver(function () {
      if (sheet.clientWidth !== W || sheet.clientHeight !== H) {
        var widthChanged = sheet.clientWidth !== W;
        size();
        if (widthChanged) page.objects.forEach(function (o) { var el = elOf(o.id); if (el) place(el, o); });
      }
    }) : null;
    if (ro) ro.observe(sheet);
    listen(window, "resize", function () { size(); page.objects.forEach(function (o) { var el = elOf(o.id); if (el) place(el, o); }); });
    A.cleanup = function () {
      if (ro) ro.disconnect();
      cleanups.forEach(function (fn) { fn(); });
      redrawFn = null; api = null;
    };

    if (mode !== "markup") return;

    /* ---------- drawing ---------- */
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
      if (changed) { page.updated = Date.now(); A.save(); changed = false; refreshBar(); }
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
  }

  document.addEventListener("input", function (e) {
    if (e.target.getAttribute && e.target.getAttribute("data-act-input") === "ink-size") ink.size = A.num(e.target.value) || 1;
  });

  /* ------------------------------------------------------------ actions */
  function releasePhotos(pages) {
    pages.forEach(function (p) {
      (p.objects || []).forEach(function (o) {
        if (o.type !== "img") return;
        var used = NB().pages.some(function (q) { return (q.objects || []).some(function (x) { return x.type === "img" && x.imgId === o.imgId; }); });
        if (!used) A.images.remove(o.imgId);
      });
    });
  }
  A.acts["nb-title-live"] = function (el) {
    var id = el.getAttribute("data-id"), p = NB().pages.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    p.updated = Date.now();
    var link = document.querySelector('.nb-page-link[data-id="' + id + '"] .pg-title');
    if (link) link.textContent = el.value || "Untitled page";
  };
  A.acts["nb-section"] = function (el) {
    var nb = NB(); nb.section = el.getAttribute("data-id"); nb.current = "";
    var first = pagesIn(nb.section)[0]; A.save();
    go(first ? "#/notebook/" + first.id : "#/notebook");
  };
  A.acts["nb-add-section"] = function () {
    A.ask("Name your new section", "", "Add section").then(function (name) {
      if (!name) return;
      var nb = NB(), s = { id: A.uid(), name: name.slice(0, 40), tone: TONES[nb.sections.length % TONES.length] };
      nb.sections.push(s); nb.section = s.id; nb.current = ""; A.save(); go("#/notebook"); A.render();
    });
  };
  A.acts["nb-rename-section"] = function () {
    var s = secById(NB().section);
    A.ask("Rename this section", s.name, "Rename").then(function (name) { if (name) { s.name = name.slice(0, 40); A.save(); A.render(); } });
  };
  A.acts["nb-del-section"] = function () {
    var nb = NB(), s = secById(nb.section), n = pagesIn(s.id).length;
    if (nb.sections.length < 2) return;
    if (!window.confirm("Delete the section “" + s.name + "”" + (n ? " and its " + n + (n === 1 ? " page" : " pages") : "") + "? This can’t be undone.")) return;
    var gone = nb.pages.filter(function (p) { return p.section === s.id; });
    nb.pages = nb.pages.filter(function (p) { return p.section !== s.id; });
    nb.sections = nb.sections.filter(function (x) { return x.id !== s.id; });
    nb.section = nb.sections[0].id; nb.current = ""; A.save(); releasePhotos(gone); go("#/notebook"); A.render();
  };
  A.acts["nb-new"] = function () {
    var cur = curPage(), page = newPage(cur ? cur.paper : "lined", NB().section);
    NB().pages.push(page); NB().current = page.id; A.state.ui.nbMode = "type"; A.save();
    go("#/notebook/" + page.id);
    setTimeout(function () { var t = document.querySelector(".nb-title"); if (t) { t.focus(); t.select(); } }, 30);
  };
  /* "Journal this day": open (or start) the dated journal page for a day. */
  A.acts["nb-new-journal"] = function (el) {
    var nb = NB(), d = A.parseD(el.getAttribute("data-day")) || A.today();
    ensureNotebook();
    var title = "Journal · " + A.DOW[A.dowIdx(d)].slice(0, 3) + " " + d.getDate() + " " + A.MONTHS[d.getMonth()].slice(0, 3) + " " + d.getFullYear();
    var sec = nb.sections.filter(function (s) { return s.name.toLowerCase() === "journal"; })[0] || nb.sections[0];
    var page = nb.pages.filter(function (p) { return p.section === sec.id && p.title === title; })[0];
    if (!page) { page = newPage("lined", sec.id, title); nb.pages.push(page); }
    nb.current = page.id; nb.section = sec.id; A.state.ui.nbMode = "type"; A.save();
    go("#/notebook/" + page.id);
    setTimeout(function () { var t = document.getElementById("editor"); if (t) t.focus(); }, 40);
  };
  A.acts["nb-paper"] = function (el) {
    var page = current.page; if (!page) return;
    page.paper = el.getAttribute("data-v"); page.updated = Date.now(); sel.id = null; A.save(); A.render();
  };
  A.acts["nb-del"] = function () {
    var p = current.page, nb = NB();
    if (!p || !window.confirm("Delete “" + (p.title || "this page") + "”? This can’t be undone.")) return;
    nb.pages = nb.pages.filter(function (x) { return x.id !== p.id; });
    nb.current = ""; A.save(); releasePhotos([p]);
    var next = pagesIn(nb.section)[0];
    go(next ? "#/notebook/" + next.id : "#/notebook"); A.render();
  };
  A.acts["nb-mode"] = function (el) {
    A.state.ui.nbMode = el.getAttribute("data-v"); sel.id = null; A.save(); A.render();
    if (A.state.ui.nbMode === "markup") A.toast("Markup on. Draw anywhere on the page.");
  };
  A.acts["nb-room"] = function () {
    if (!current.page) return;
    current.page.extra = (current.page.extra || 0) + 400; A.save();
    var sheet = document.getElementById("sheet");
    if (sheet) sheet.style.setProperty("--extra", current.page.extra + "px");
    A.toast("Added more room.");
  };
  A.acts["nb-print"] = function () {
    sel.id = null;
    var el = document.querySelector(".obj.sel"); if (el) el.classList.remove("sel");
    window.print();
  };
  A.acts["nb-synth"] = function () {
    var p = current.page; if (!p) return;
    var txt = [p.title, p.text, p.cornell.topic, p.cornell.cue, p.cornell.notes, p.cornell.summary]
      .concat(p.cols.map(function (c) { return (c.h ? c.h + ":\n" : "") + c.t; })).filter(function (s) { return s && s.trim(); }).join("\n");
    if (txt.trim().length < 5) { A.toast("Write something on this page first."); return; }
    A.state.coach.synthInput = txt; A.save(); location.hash = "#/synth";
  };

  /* formatting, photos and stickers */
  A.acts.fmt = function (el) { if (api) api.format(el.getAttribute("data-cmd")); };
  A.acts["nb-photo"] = function () { var i = document.getElementById("photo-input"); if (i) i.click(); };
  A.acts["nb-stickers"] = function () {
    tray.open = !tray.open;
    var old = document.getElementById("tray"), btn = document.querySelector('[data-act="nb-stickers"]');
    if (btn) { btn.classList.toggle("on", tray.open); btn.setAttribute("aria-expanded", String(tray.open)); }
    if (old) old.remove();
    if (tray.open) { var t = document.getElementById("tools"); if (t) t.insertAdjacentHTML("afterend", trayHtml()); }
  };
  A.acts["tray-cat"] = function (el) {
    tray.cat = el.getAttribute("data-id");
    var old = document.getElementById("tray");
    if (old) old.outerHTML = trayHtml();
  };
  A.acts["add-sticker"] = function (el) { if (api) api.addSticker(el.getAttribute("data-key")); };
  A.acts["obj-front"] = function () { if (api) api.move(1); };
  A.acts["obj-back"] = function () { if (api) api.move(-1); };
  A.acts["obj-dup"] = function () { if (api) api.dup(); };
  A.acts["obj-del"] = function () { if (api && sel.id) api.remove(sel.id); };
  A.acts["obj-done"] = function () { if (api) api.select(null); };

  A.acts["ink-tool"] = function (el) { ink.tool = el.getAttribute("data-v"); refreshBar(); };
  A.acts["ink-color"] = function (el) { ink.color = el.getAttribute("data-v"); if (ink.tool === "eraser") ink.tool = "pen"; refreshBar(); };
  A.acts["ink-undo"] = function () {
    var p = current.page; if (!p || !p.strokes.length) return;
    ink.redo.push(p.strokes.pop()); p.updated = Date.now(); A.save();
    if (redrawFn) redrawFn(); refreshBar();
  };
  A.acts["ink-redo"] = function () {
    var p = current.page; if (!p || !ink.redo.length) return;
    p.strokes.push(ink.redo.pop()); p.updated = Date.now(); A.save();
    if (redrawFn) redrawFn(); refreshBar();
  };
  A.acts["ink-clear"] = function () {
    var p = current.page; if (!p || !p.strokes.length) return;
    if (!window.confirm("Clear all handwriting and drawing on this page? Your typed text stays.")) return;
    p.strokes = []; ink.redo = []; p.updated = Date.now(); A.save();
    if (redrawFn) redrawFn(); refreshBar();
  };
})();
