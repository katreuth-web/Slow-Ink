/* Slow Ink Sage — core: dates, saved data, small helpers.
   Everything hangs off one global object, SI, so the other files can share it
   without needing a build tool or ES modules (which browsers block on file://). */
(function () {
  "use strict";

  var SI = (window.SI = { views: {}, actions: {}, after: {}, cleanup: null });

  /* ------------------------------------------------------------ dates */
  SI.MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  SI.MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  SI.DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  SI.DOW_LETTER = ["M", "T", "W", "T", "F", "S", "S"];

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  SI.pad = pad;

  /* A "key" is a plain text date: 2027-03-08. Text keys sort correctly and survive JSON. */
  SI.key = function (d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  SI.parseKey = function (k) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k || "");
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getMonth() === +m[2] - 1 ? d : null;
  };
  SI.monthKey = function (y, m) { return y + "-" + pad(m + 1); };
  SI.parseMonthKey = function (k) {
    var m = /^(\d{4})-(\d{2})$/.exec(k || "");
    if (!m || +m[2] < 1 || +m[2] > 12) return null;
    return { y: +m[1], m: +m[2] - 1 };
  };
  SI.addDays = function (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); };
  SI.daysIn = function (y, m) { return new Date(y, m + 1, 0).getDate(); };
  /* Monday-first: 0 = Monday … 6 = Sunday */
  SI.dowIndex = function (d) { return (d.getDay() + 6) % 7; };
  SI.mondayOf = function (d) { return SI.addDays(d, -SI.dowIndex(d)); };
  SI.today = function () { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  SI.todayKey = function () { return SI.key(SI.today()); };
  SI.longDate = function (d) { return SI.DOW_LONG[SI.dowIndex(d)] + ", " + d.getDate() + " " + SI.MONTHS[d.getMonth()]; };
  SI.DOW_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  /* ------------------------------------------------------------ small helpers */
  SI.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  SI.uid = function () { return "i" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3); };

  var ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.500"/>',
    trash: '<path d="M4 7h16M9 7V4.500h6V7M6.500 7l.8 12.500h9.400L17.500 7"/>',
    star: '<path d="M12 3.500l2.600 5.400 5.900.8-4.300 4.100 1 5.800L12 16.800 6.800 19.600l1-5.800L3.500 9.700l5.900-.8z"/>',
    left: '<path d="M14.500 5.500L8 12l6.500 6.500"/>',
    right: '<path d="M9.500 5.500L16 12l-6.500 6.500"/>',
    book: '<path d="M5 4.500h11a3 3 0 0 1 3 3V19.500H8a3 3 0 0 1-3-3z"/><path d="M5 16.500a3 3 0 0 1 3-3h11"/>',
    type: '<path d="M5 6.500V5h14v1.500M12 5v14M9 19h6"/>',
    pen: '<path d="M4 20l1-4L16.500 4.500a2 2 0 0 1 3 3L8 19z"/><path d="M14.500 6.500l3 3"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.500a5.500 5.500 0 0 1 0 11H11"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.500a5.500 5.500 0 0 0 0 11H13"/>',
    print: '<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2"/><path d="M7 14h10v6H7z"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1"/><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>',
    ul: '<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="4.500" cy="7" r="1"/><circle cx="4.500" cy="12" r="1"/><circle cx="4.500" cy="17" r="1"/>',
    ol: '<path d="M10 7h10M10 12h10M10 17h10M4 5.500l1.500-1v5M3.500 14.500c.5-1 2.500-1 2.500.5 0 1-2.500 2-2.500 3h3"/>',
    rule: '<path d="M3 12h18"/><path d="M8 7h8M8 17h8" opacity=".45"/>',
    photo: '<rect x="3.500" y="5" width="17" height="14" rx="2.500"/><circle cx="9" cy="10" r="1.800"/><path d="M4 17l5-4.500 4 3.500 2.500-2 4.500 3.500"/>',
    sticker: '<path d="M5 4.500h14v9l-6 6H5z"/><path d="M13 19.500V15a1.500 1.500 0 0 1 1.500-1.500H19"/><circle cx="9" cy="10" r="1"/>',
    rotate: '<path d="M20 11a8 8 0 1 0-2.300 5.700"/><path d="M20 4v7h-7"/>',
    resize: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
    front: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>',
    back: '<rect x="4" y="4" width="12" height="12" rx="2"/><path d="M20 8v10a2 2 0 0 1-2 2H8"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    external: '<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>'
  };
  SI.ic = function (name) {
    return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  };

  /* ------------------------------------------------------------ safe rich text */
  /* Notebook text is stored as a tiny, safe subset of HTML. Anything typed, pasted or restored
     from a backup passes through this filter, so a tampered backup can never run code. */
  var KEEP = { P: 1, DIV: 1, BR: 1, H1: 1, H2: 1, H3: 1, STRONG: 1, B: 1, EM: 1, I: 1, U: 1, UL: 1, OL: 1, LI: 1, A: 1, HR: 1 };
  var DROP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, TEMPLATE: 1, NOSCRIPT: 1, SVG: 1, MATH: 1, TEXTAREA: 1, SELECT: 1, INPUT: 1, BUTTON: 1, FORM: 1, LINK: 1, META: 1, TITLE: 1, HEAD: 1, IMG: 1, VIDEO: 1, AUDIO: 1, CANVAS: 1 };
  SI.safeUrl = function (u) {
    u = String(u == null ? "" : u).trim();
    if (!u) return "";
    if (/^(https?:|mailto:)/i.test(u)) return u;
    if (/^[a-z][a-z0-9+.\-]*:/i.test(u)) return "";
    if (/^[^\s\/]+\.[^\s]{2,}/.test(u)) return "https://" + u;
    return "";
  };
  function cleanInto(node, out) {
    Array.prototype.forEach.call(node.childNodes, function (ch) {
      if (ch.nodeType === 3) { out.appendChild(document.createTextNode(ch.nodeValue)); return; }
      if (ch.nodeType !== 1 || DROP[ch.tagName]) return;
      if (!KEEP[ch.tagName]) { cleanInto(ch, out); return; }
      var el = document.createElement(ch.tagName.toLowerCase());
      if (ch.tagName === "A") {
        var href = SI.safeUrl(ch.getAttribute("href"));
        if (!href) { cleanInto(ch, out); return; }
        el.setAttribute("href", href);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
      if (ch.tagName !== "BR" && ch.tagName !== "HR") cleanInto(ch, el);
      out.appendChild(el);
    });
  }
  SI.sanitizeHtml = function (html) {
    var doc = new DOMParser().parseFromString("<!doctype html><body>" + String(html == null ? "" : html).slice(0, 600000), "text/html");
    var box = document.createElement("div");
    cleanInto(doc.body, box);
    return box.innerHTML;
  };
  SI.textToHtml = function (text) {
    return String(text || "").split("\n").map(function (line) { return line ? "<p>" + SI.esc(line) + "</p>" : "<p><br></p>"; }).join("");
  };
  SI.htmlToText = function (html) {
    var doc = new DOMParser().parseFromString("<!doctype html><body>" + String(html || ""), "text/html");
    Array.prototype.forEach.call(doc.body.querySelectorAll("br"), function (b) { b.replaceWith(doc.createTextNode("\n")); });
    Array.prototype.forEach.call(doc.body.querySelectorAll("p,div,h1,h2,h3,li,hr"), function (b) { b.appendChild(doc.createTextNode("\n")); });
    return doc.body.textContent.replace(/\n{3,}/g, "\n\n").trim();
  };

  /* ------------------------------------------------------------ saved data */
  var STORAGE_KEY = "slow-ink-sage-v1";
  SI.STORAGE_KEY = STORAGE_KEY;

  function welcomePage(sectionId) {
    var n = Date.now();
    var html = "<h1>Welcome to your notebook</h1><p>A quiet place that lives inside your planner.</p><p><br></p>" +
      "<h2>Write your way</h2><p>Type here, then use the bar above the page for <strong>bold</strong> and <em>italic</em> text, headings, lists, dividers and links.</p>" +
      "<ul><li>Tap <strong>Markup</strong> to handwrite, highlight and sketch.</li><li>Tap <strong>Stickers</strong> or <strong>Photo</strong> to decorate the page.</li><li>Drag, turn and resize anything you add.</li></ul><hr>" +
      "<p>Add pages from the Contents panel, and sections with the + tab. Nothing here leaves your device, so use “Back up planner” at the bottom of the planner now and then.</p>";
    return {
      id: SI.uid(), section: sectionId, title: "Welcome to your notebook", paper: "lined", html: html, text: SI.htmlToText(html),
      strokes: [], objects: [], extra: 0, created: n, updated: n
    };
  }

  function defaultState() {
    var secs = [
      { id: "s-journal", name: "Journal", tone: "sage" },
      { id: "s-notes", name: "Notes", tone: "clay" },
      { id: "s-ideas", name: "Ideas", tone: "sand" }
    ];
    var page = welcomePage("s-journal");
    return {
      v: 1,
      days: {}, months: {}, weeks: {}, years: {},
      habits: [
        { id: "h-water", name: "Drink water" },
        { id: "h-move", name: "Move my body" },
        { id: "h-read", name: "Read a little" }
      ],
      habitLog: {},
      goals: [],
      reflections: {},
      notebook: { sections: secs, pages: [page], current: page.id, section: "s-journal" },
      ui: { nbMode: "type" }
    };
  }

  function loadState() {
    var raw = null;
    try { raw = window.localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
    if (raw) {
      try {
        var s = JSON.parse(raw);
        if (s && typeof s === "object" && s.v === 1) return fillGaps(s);
      } catch (e2) { /* fall through to a fresh planner */ }
    }
    return defaultState();
  }

  /* Make sure every top-level part exists, so older backups never crash a newer planner. */
  function fillGaps(s) {
    var d = defaultState();
    Object.keys(d).forEach(function (k) { if (s[k] == null) s[k] = d[k]; });
    if (!s.notebook.sections || !s.notebook.sections.length) s.notebook.sections = d.notebook.sections;
    if (!Array.isArray(s.notebook.pages)) s.notebook.pages = [];
    if (!s.ui) s.ui = d.ui;
    return s;
  }

  SI.defaultState = defaultState;
  SI.fillGaps = fillGaps;
  SI.state = loadState();

  var saveTimer = null, warned = false;
  function writeNow() {
    saveTimer = null;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SI.state));
      warned = false;
    } catch (e) {
      if (!warned) {
        warned = true;
        SI.toast("Couldn’t save — your browser storage may be full or blocked. Use “Back up planner” to keep a copy.");
      }
    }
  }
  /* Typing saves after a short pause; leaving the page saves straight away. */
  SI.save = function () {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(writeNow, 250);
  };
  SI.saveNow = function () { if (saveTimer) clearTimeout(saveTimer); writeNow(); };
  window.addEventListener("pagehide", SI.saveNow);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") SI.saveNow(); });

  /* Read/write a value by a dotted path such as "days.2027-03-08.intention".
     A segment that starts with "@" finds an item inside a list by its id. */
  function step(obj, seg, create) {
    if (Array.isArray(obj) && seg.charAt(0) === "@") {
      var id = seg.slice(1);
      for (var i = 0; i < obj.length; i++) if (obj[i].id === id) return obj[i];
      return undefined;
    }
    if (obj[seg] == null && create) obj[seg] = {};
    return obj[seg];
  }
  SI.getPath = function (path) {
    var o = SI.state, parts = path.split(".");
    for (var i = 0; i < parts.length; i++) {
      if (o == null) return undefined;
      o = step(o, parts[i], false);
    }
    return o;
  };
  SI.setPath = function (path, value) {
    var parts = path.split("."), o = SI.state;
    for (var i = 0; i < parts.length - 1; i++) {
      o = step(o, parts[i], true);
      if (o == null) return false;
    }
    o[parts[parts.length - 1]] = value;
    return true;
  };

  /* Getters that hand back a day / month / week record without cluttering saved data
     until something is actually written into it. */
  var EMPTY_DAY = { intention: "", items: [], mood: "", note: "" };
  SI.peekDay = function (key) {
    var d = SI.state.days[key];
    if (!d) return EMPTY_DAY;
    return { intention: d.intention || "", items: d.items || [], mood: d.mood || "", note: d.note || "" };
  };
  SI.day = function (key) {
    var d = SI.state.days[key];
    if (!d) d = SI.state.days[key] = { intention: "", items: [], mood: "", note: "" };
    if (!Array.isArray(d.items)) d.items = [];
    return d;
  };
  SI.dayStats = function (key) {
    var d = SI.state.days[key];
    if (!d || !d.items) return { total: 0, done: 0, star: false };
    var done = 0, star = false;
    d.items.forEach(function (it) { if (it.done) done++; if (it.key) star = true; });
    return { total: d.items.length, done: done, star: star };
  };

  /* ------------------------------------------------------------ toast + ask box */
  var toastTimer = null;
  SI.toast = function (msg) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("on"); }, 3800);
  };

  /* A tiny "type a name" box (built on <dialog>), used for section and goal names. */
  SI.ask = function (label, value, okText) {
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
        var out = dlg.returnValue === "ok" && input.value.trim() ? input.value.trim() : null;
        resolve(out);
      };
      dlg.showModal();
      input.focus();
      input.select();
    });
  };

  /* ------------------------------------------------------------ backup / restore */
  SI.exportData = function () {
    SI.saveNow();
    var ids = [];
    SI.state.notebook.pages.forEach(function (p) {
      (p.objects || []).forEach(function (o) { if (o.type === "img" && ids.indexOf(o.imgId) < 0) ids.push(o.imgId); });
    });
    SI.state.ui.backedUp = true; SI.saveNow();
    SI.images.exportAll(ids).then(function (imgs) {
      var data = Object.assign({}, SI.state, { images: imgs });
      var blob = new Blob([JSON.stringify(data)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "slow-ink-sage-backup-" + SI.todayKey() + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      SI.toast("Backup saved to your downloads.");
    });
  };

  /* A restored backup is checked before anything is replaced: ids and dates must look like ids
     and dates, because they end up inside page markup. */
  var ID_RE = /^[A-Za-z0-9_-]{1,40}$/, DAY_RE = /^\d{4}-\d{2}-\d{2}$/, MON_RE = /^\d{4}-\d{2}$/, YR_RE = /^\d{4}$/;
  function keysOk(obj, re) { return !obj || typeof obj !== "object" || Object.keys(obj).every(function (k) { return re.test(k); }); }
  function idsOk(v) {
    if (!v || typeof v !== "object") return true;
    if (Array.isArray(v)) return v.every(idsOk);
    return Object.keys(v).every(function (k) {
      var x = v[k];
      if ((k === "id" || k === "imgId" || k === "section" || k === "current") && x !== "" && x != null && (typeof x !== "string" || !ID_RE.test(x))) return false;
      return idsOk(x);
    });
  }
  function stateOk(s) {
    return idsOk(s) && keysOk(s.days, DAY_RE) && keysOk(s.weeks, DAY_RE) && keysOk(s.months, MON_RE) && keysOk(s.years, YR_RE) &&
      (!s.reflections || Object.keys(s.reflections).every(function (k) { return YR_RE.test(k) || MON_RE.test(k); })) &&
      Object.keys(s.habitLog || {}).every(function (h) { return ID_RE.test(h) && keysOk(s.habitLog[h], DAY_RE); });
  }
  function num(v, d, lo, hi) { v = +v; if (!isFinite(v)) v = d; return Math.min(hi, Math.max(lo, v)); }
  function cleanObjects(list) {
    if (!Array.isArray(list)) return [];
    return list.slice(0, 300).map(function (o) {
      if (!o || typeof o !== "object") return null;
      var base = { id: SI.isImageId(o.id) ? o.id : SI.uid(), x: num(o.x, 0.1, -0.5, 1.5), y: num(o.y, 0.1, -0.5, 40), w: num(o.w, 0.2, 0.03, 2), rot: num(o.rot, 0, -360, 360) };
      if (o.type === "sticker" && typeof o.key === "string" && SI.sticker(o.key)) { base.type = "sticker"; base.key = o.key; return base; }
      if (o.type === "img" && SI.isImageId(o.imgId)) { base.type = "img"; base.imgId = o.imgId; base.ar = num(o.ar, 0.75, 0.1, 10); return base; }
      return null;
    }).filter(Boolean);
  }
  function cleanPage(p) {
    if (!p || typeof p !== "object") return null;
    var out = {
      id: ID_RE.test(String(p.id)) ? String(p.id) : SI.uid(), section: String(p.section || ""), title: String(p.title || "").slice(0, 120),
      paper: ["lined", "blank", "dot", "grid"].indexOf(p.paper) >= 0 ? p.paper : "lined",
      html: SI.sanitizeHtml(typeof p.html === "string" ? p.html : SI.textToHtml(p.text || "")),
      strokes: Array.isArray(p.strokes) ? p.strokes.filter(function (st) { return st && Array.isArray(st.p) && st.p.every(Array.isArray); }).slice(0, 5000) : [],
      objects: cleanObjects(p.objects), extra: num(p.extra, 0, 0, 20000), created: +p.created || Date.now(), updated: +p.updated || Date.now()
    };
    out.text = SI.htmlToText(out.html);
    return out;
  }

  SI.importData = function (file) {
    if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      var s;
      try { s = JSON.parse(r.result); } catch (e) { s = null; }
      if (!s || typeof s !== "object" || s.v !== 1 || !s.notebook || typeof s.notebook !== "object") {
        SI.toast("That file doesn’t look like a Slow Ink Sage backup.");
        return;
      }
      var imgs = s.images; delete s.images;
      if (!stateOk(s)) { SI.toast("That backup has unexpected contents, so it wasn’t restored."); return; }
      if (!window.confirm("Restore this backup? It will replace everything currently in this planner.")) return;
      var nb = s.notebook;
      nb.pages = (Array.isArray(nb.pages) ? nb.pages : []).map(cleanPage).filter(Boolean);
      nb.sections = (Array.isArray(nb.sections) ? nb.sections : []).filter(function (x) { return x && ID_RE.test(String(x.id)); })
        .map(function (x) { return { id: String(x.id), name: String(x.name || "Section").slice(0, 60), tone: ["sage", "clay", "sand", "moss", "dusk"].indexOf(x.tone) >= 0 ? x.tone : "sage" }; });
      SI.images.replaceAll(imgs && typeof imgs === "object" ? imgs : {}).then(function () {
        SI.state = fillGaps(s);
        SI.saveNow();
        SI.toast("Backup restored.");
        SI.render();
      });
    };
    r.readAsText(file);
  };
})();
