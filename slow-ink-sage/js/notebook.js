/* Slow Ink Sage — the notebook.
   When you open it, the planner steps back and a bound notebook takes over the screen:
   sections as tabs down the edge, a contents page on the left, and a sheet you can
   write on (headings, lists, links), decorate (photos and stickers you can move, turn and
   resize) or draw on (Type / Markup, like Notes on an iPad). */
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
  var sel = { id: null };                         /* the photo or sticker currently selected */
  var tray = { open: false, cat: "nature" };      /* the sticker tray */

  function go(hash) { if (window.location.hash === hash) SI.render(); else window.location.hash = hash; }
  function pageById(id) { return NB().pages.filter(function (p) { return p.id === id; })[0]; }
  function sectionById(id) { return NB().sections.filter(function (s) { return s.id === id; })[0]; }
  function pagesIn(sectionId) {
    return NB().pages.filter(function (p) { return p.section === sectionId; }).sort(function (a, b) { return b.created - a.created; });
  }
  function newPage(sectionId, title, paper) {
    var n = Date.now(), p = { id: SI.uid(), section: sectionId, title: title || "Untitled page", paper: paper || "lined", html: "", text: "", strokes: [], objects: [], extra: 0, created: n, updated: n };
    NB().pages.push(p);
    NB().current = p.id; NB().section = sectionId;
    SI.save();
    return p;
  }
  /* Pages written before rich text existed only have plain text; give them a page of paragraphs. */
  function prepare(page) {
    if (typeof page.html !== "string") page.html = SI.textToHtml(page.text || "");
    if (!Array.isArray(page.objects)) page.objects = [];
    return page;
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
  function objBtn(act, icon, label, cls) { return '<button class="tb ' + (cls || "") + '" data-act="' + act + '">' + ic(icon) + label + "</button>"; }
  function toolsHtml() {
    function t(cmd, label, title, cls) { return '<button class="tb ' + (cls || "") + '" data-act="fmt" data-cmd="' + cmd + '" title="' + title + '" aria-label="' + title + '">' + label + "</button>"; }
    return '<div class="nbtools" id="tools" role="toolbar" aria-label="Formatting and extras">' +
      '<div class="tools-row tools-fmt">' +
      t("h1", "Title", "Title", "tb-txt") + t("h2", "Heading", "Heading", "tb-txt") + t("h3", "Subhead", "Subhead", "tb-txt") + '<span class="tb-sep"></span>' +
      t("bold", "<b>B</b>", "Bold") + t("italic", "<i>I</i>", "Italic") + t("underline", "<u>U</u>", "Underline") + '<span class="tb-sep"></span>' +
      t("ul", ic("ul"), "Bulleted list") + t("ol", ic("ol"), "Numbered list") + t("rule", ic("rule"), "Divider line") + t("link", ic("link"), "Add or remove a link") +
      '<a class="tb tb-txt" id="open-link" href="#" target="_blank" rel="noopener noreferrer" hidden>' + ic("external") + "Open link</a>" +
      '<span class="tb-grow"></span>' +
      '<button class="tb tb-primary" data-act="nb-photo">' + ic("photo") + "Photo</button>" +
      '<button class="tb tb-primary' + (tray.open ? " on" : "") + '" data-act="nb-stickers" aria-expanded="' + tray.open + '">' + ic("sticker") + "Stickers</button></div>" +
      '<div class="tools-row tools-obj" hidden><span class="obj-name" id="obj-name">Selected</span><span class="tb-grow"></span>' +
      objBtn("obj-front", "front", "Bring forward") + objBtn("obj-back", "back", "Send back") + objBtn("obj-dup", "copy", "Duplicate") + objBtn("obj-del", "trash", "Delete", "tb-danger") + objBtn("obj-done", "check", "Done", "tb-primary") + "</div></div>";
  }
  function trayHtml() {
    var cats = SI.STICKER_CATS.map(function (c) {
      return '<button class="cat' + (tray.cat === c[0] ? " on" : "") + '" data-act="tray-cat" data-id="' + c[0] + '">' + esc(c[1]) + "</button>";
    }).join("");
    var grid = SI.STICKERS.filter(function (s) { return s.c === tray.cat; }).map(function (s) {
      return '<button class="stk' + (s.w / s.h > 2 ? " wide" : "") + '" data-act="add-sticker" data-key="' + s.k + '" title="' + esc(s.n) + '" aria-label="Add sticker: ' + esc(s.n) + '">' + SI.stickerSvg(s.k) + "</button>";
    }).join("");
    return '<div class="tray" id="tray"><div class="tray-head"><div class="cats">' + cats + '</div><button class="icon-btn" data-act="nb-stickers" aria-label="Close stickers">' + ic("close") + '</button></div><div class="tray-grid">' + grid + "</div></div>";
  }

  SI.views.notebook = function (a) {
    var nb = NB(), page = resolve(a[0]), sec = sectionById(nb.section), mode = SI.state.ui.nbMode === "markup" ? "markup" : "type";
    if (!page) mode = "type";
    if (page) prepare(page);
    current.page = page; current.mode = mode;
    if (page && ink.pageId !== page.id) { ink.pageId = page.id; ink.redo = []; sel.id = null; }

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
      var base = "notebook.pages.@" + page.id, body = SI.sanitizeHtml(page.html) || "<p><br></p>";
      sheetCol = '<div class="book-sheet-col"><div class="sheet-bar"><input class="sheet-title" data-bind="' + base + '.title" value="' + esc(page.title) + '" placeholder="Page title" aria-label="Page title" maxlength="80" />' +
        seg + '<button class="icon-btn" data-act="nb-print" aria-label="Print this page" title="Print this page">' + ic("print") + "</button></div>" +
        (mode === "type" ? toolsHtml() + (tray.open ? trayHtml() : "") + '<input type="file" id="photo-input" accept="image/*" multiple hidden />' : "") +
        '<div class="sheet paper-' + page.paper + (mode === "markup" ? " annotating" + (ink.tool === "eraser" ? " eraser" : "") : "") + '" id="sheet" style="--extra:' + (page.extra || 0) + 'px">' +
        '<div class="editor" id="editor" contenteditable="' + (mode === "type") + '" role="textbox" aria-multiline="true" aria-label="Page text" spellcheck="true" data-placeholder="Start writing…">' + body + "</div>" +
        '<div class="objects" id="objects"></div><canvas class="ink-layer" id="ink"></canvas></div>' +
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

  /* ------------------------------------------------------------ editor + objects + ink */
  var redrawFn = null, api = null;
  SI.after.notebook = function () {
    var page = current.page, sheet = document.getElementById("sheet"), cv = document.getElementById("ink");
    redrawFn = null; api = null;
    if (!page || !sheet || !cv) { SI.cleanup = null; return; }
    var mode = current.mode, ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1, W = 0, H = 0, live = null;
    var ed = document.getElementById("editor"), layer = document.getElementById("objects"), tools = document.getElementById("tools");
    var cleanups = [];
    function listen(target, type, fn, opts) { target.addEventListener(type, fn, opts); cleanups.push(function () { target.removeEventListener(type, fn, opts); }); }

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
      var st = SI.sticker(o.key);
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
    function loadPhoto(o, el) {
      var img = el.querySelector("img");
      SI.images.get(o.imgId).then(function (url) {
        if (url) img.src = url; else el.classList.add("missing");
      });
    }
    function makeEl(o) {
      var d = document.createElement("div");
      d.className = "obj obj-" + (o.type === "img" ? "photo" : "sticker");
      d.setAttribute("data-oid", o.id);
      d.tabIndex = 0;
      d.setAttribute("role", "img");
      d.setAttribute("aria-label", o.type === "img" ? "Photo" : "Sticker");
      d.innerHTML = '<div class="obj-body">' + (o.type === "img" ? '<img alt="" draggable="false">' : SI.stickerSvg(o.key)) + "</div>" +
        '<span class="obj-h obj-del" data-h="del" title="Delete">' + ic("close") + '</span><span class="obj-h obj-rot" data-h="rot" title="Turn">' + ic("rotate") + '</span><span class="obj-h obj-res" data-h="res" title="Resize">' + ic("resize") + "</span>";
      if (o.type === "img") loadPhoto(o, d);
      return d;
    }
    function renderObjects() {
      layer.innerHTML = "";
      page.objects = page.objects.filter(function (o) { return o.type === "img" || SI.sticker(o.key); });
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
    function touch() { page.updated = Date.now(); SI.save(); }
    function imgStillUsed(imgId) {
      return NB().pages.some(function (p) { return (p.objects || []).some(function (o) { return o.type === "img" && o.imgId === imgId; }); });
    }
    function removeObj(id) {
      var o = objById(id); if (!o) return;
      page.objects = page.objects.filter(function (x) { return x.id !== id; });
      var el = elOf(id); if (el) el.remove();
      if (sel.id === id) sel.id = null;
      markSelected(); restack(); touch();
      if (o.type === "img" && !imgStillUsed(o.imgId)) SI.images.remove(o.imgId);
    }
    function center() {
      var r = sheet.getBoundingClientRect(), top = Math.max(r.top, 0), bottom = Math.min(r.bottom, window.innerHeight);
      var cy = bottom > top ? (top + bottom) / 2 - r.top : r.height / 2;
      var jit = function () { return (Math.random() - 0.5) * 0.08; };
      return { x: 0.5 + jit(), y: Math.max(0.05, Math.min(cy / W + jit(), H / W - 0.05)) };
    }
    function addObj(o) {
      var c = center(), w = o.w, h = w * objAr(o);
      o.id = SI.uid(); o.x = c.x - w / 2; o.y = Math.max(0, c.y - h / 2); o.rot = o.rot || 0;
      page.objects.push(o);
      var el = makeEl(o); layer.appendChild(el); place(el, o);
      select(o.id); touch();
    }
    function addSticker(key) {
      var st = SI.sticker(key); if (!st) return;
      addObj({ type: "sticker", key: key, w: st.w / st.h > 2 ? 0.3 : 0.17 });
    }
    function addPhotos(files) {
      Array.prototype.slice.call(files || []).filter(function (f) { return /^image\//.test(f.type); }).forEach(function (f) {
        SI.images.fromFile(f).then(function (res) {
          var id = SI.uid();
          return SI.images.put(id, res.dataUrl).then(function () {
            addObj({ type: "img", imgId: id, ar: res.ar, w: Math.min(0.42, 0.46 / res.ar) });
          });
        }).catch(function () { SI.toast("That picture couldn’t be added."); });
      });
    }
    api = { addSticker: addSticker, addPhotos: addPhotos, select: select, remove: removeObj, objById: objById, restack: restack, place: place, elOf: elOf, touch: touch, selected: function () { return sel.id && objById(sel.id); }, dup: function () {
      var o = api.selected(); if (!o) return;
      var c = JSON.parse(JSON.stringify(o)); c.id = SI.uid(); c.x += 0.03; c.y += 0.03;
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

    /* ---------- the typing area ---------- */
    function isEmpty() { return !ed.textContent.trim() && !ed.querySelector("hr,li"); }
    function sync() {
      page.html = ed.innerHTML;
      page.text = ed.innerText.replace(/\n{3,}/g, "\n\n").trim();
      page.updated = Date.now();
      ed.classList.toggle("is-empty", isEmpty());
      SI.save();
    }
    function inEditor() { var s = window.getSelection(); return !!(s && s.rangeCount && ed.contains(s.anchorNode)); }
    function toEnd() { ed.focus(); var s = window.getSelection(), r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); s.removeAllRanges(); s.addRange(r); }
    function nodeEl() { var s = window.getSelection(), n = s && s.anchorNode; return n ? (n.nodeType === 3 ? n.parentElement : n) : null; }
    function updateFmt() {
      if (!tools || mode !== "type" || !inEditor()) return;
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
        var h = SI.safeUrl(a.getAttribute("href"));
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
      SI.ask("Link address (for example example.com)", "", "Add link").then(function (val) {
        if (!val) return;
        var url = SI.safeUrl(val);
        if (!url) { SI.toast("That doesn’t look like a web address."); return; }
        ed.focus();
        if (range) { var sel2 = window.getSelection(); sel2.removeAllRanges(); sel2.addRange(range); } else toEnd();
        if (collapsed) exec("insertHTML", '<a href="' + esc(url) + '">' + esc(val) + "</a>"); else exec("createLink", url);
        after();
      });
    }
    api.format = function (cmd) {
      if (mode !== "type") return;
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
    SI.cleanup = function () {
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
    var m = /^notebook\.pages\.@([^.]+)\.title$/.exec(path);
    if (!m) return;
    var p = pageById(m[1]);
    if (!p) return;
    p.updated = Date.now();
    var link = document.querySelector('.pg-link[data-id="' + m[1] + '"] .pg-title');
    if (link) link.textContent = el.value || "Untitled page";
  };

  /* ------------------------------------------------------------ actions */
  function releasePhotos(pages) {
    pages.forEach(function (p) {
      (p.objects || []).forEach(function (o) {
        if (o.type !== "img") return;
        var used = NB().pages.some(function (q) { return (q.objects || []).some(function (x) { return x.type === "img" && x.imgId === o.imgId; }); });
        if (!used) SI.images.remove(o.imgId);
      });
    });
  }
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
    var gone = nb.pages.filter(function (p) { return p.section === s.id; });
    nb.pages = nb.pages.filter(function (p) { return p.section !== s.id; });
    nb.sections = nb.sections.filter(function (x) { return x.id !== s.id; });
    nb.section = nb.sections[0].id; nb.current = null;
    SI.save(); releasePhotos(gone); go("#/notebook"); SI.render();
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
    setTimeout(function () { var t = document.getElementById("editor"); if (t) t.focus(); }, 40);
  };
  A["nb-paper"] = function (el) { if (current.page) { current.page.paper = el.dataset.v; SI.save(); SI.render(); } };
  A["nb-del"] = function () {
    var p = current.page;
    if (!p || !window.confirm("Delete “" + (p.title || "this page") + "”? This can’t be undone.")) return;
    var nb = NB();
    nb.pages = nb.pages.filter(function (x) { return x.id !== p.id; });
    nb.current = null; SI.save(); releasePhotos([p]);
    var next = pagesIn(nb.section)[0];
    go(next ? "#/notebook/" + next.id : "#/notebook"); SI.render();
  };
  A["nb-mode"] = function (el) { SI.state.ui.nbMode = el.dataset.v; sel.id = null; SI.save(); SI.render(); };
  A["nb-room"] = function () {
    if (!current.page) return;
    current.page.extra = (current.page.extra || 0) + 400; SI.save();
    var sheet = document.getElementById("sheet");
    if (sheet) sheet.style.setProperty("--extra", current.page.extra + "px");
    SI.toast("Added more room.");
  };
  A["nb-print"] = function () { sel.id = null; var el = document.querySelector(".obj.sel"); if (el) el.classList.remove("sel"); window.print(); };

  /* formatting, photos and stickers */
  A.fmt = function (el) { if (api) api.format(el.dataset.cmd); };
  A["nb-photo"] = function () { var i = document.getElementById("photo-input"); if (i) i.click(); };
  A["nb-stickers"] = function () {
    tray.open = !tray.open;
    var old = document.getElementById("tray"), btn = document.querySelector('[data-act="nb-stickers"]');
    if (btn) { btn.classList.toggle("on", tray.open); btn.setAttribute("aria-expanded", String(tray.open)); }
    if (old) old.remove();
    if (tray.open) { var t = document.getElementById("tools"); if (t) t.insertAdjacentHTML("afterend", trayHtml()); }
  };
  A["tray-cat"] = function (el) {
    tray.cat = el.dataset.id;
    var old = document.getElementById("tray");
    if (old) old.outerHTML = trayHtml();
  };
  A["add-sticker"] = function (el) { if (api) api.addSticker(el.dataset.key); };
  A["obj-front"] = function () { if (api) api.move(1); };
  A["obj-back"] = function () { if (api) api.move(-1); };
  A["obj-dup"] = function () { if (api) api.dup(); };
  A["obj-del"] = function () { if (api && sel.id) api.remove(sel.id); };
  A["obj-done"] = function () { if (api) api.select(null); };

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
