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
    close: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  SI.ic = function (name) {
    return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  };

  /* ------------------------------------------------------------ saved data */
  var STORAGE_KEY = "slow-ink-sage-v1";
  SI.STORAGE_KEY = STORAGE_KEY;

  function welcomePage(sectionId) {
    var n = Date.now();
    return {
      id: SI.uid(), section: sectionId, title: "Welcome to your notebook", paper: "lined", strokes: [], created: n, updated: n,
      text: "This is your notebook — a quiet place that lives inside your planner.\n\n" +
        "Type your thoughts here, or tap Markup (above the page) to handwrite, highlight and sketch with a pen, marker or pencil.\n\n" +
        "Use the coloured tabs to move between Journal, Notes and Ideas, or add a section of your own with the + tab. Add as many pages as you like, and change the paper (lined, dot grid, squared or blank) from the Contents panel.\n\n" +
        "Nothing here leaves your device. Back it up from the link at the bottom of the planner now and then."
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
    var blob = new Blob([JSON.stringify(SI.state)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "slow-ink-sage-backup-" + SI.todayKey() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    SI.toast("Backup saved to your downloads.");
  };
  SI.importData = function (file) {
    if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      var s;
      try { s = JSON.parse(r.result); } catch (e) { s = null; }
      if (!s || typeof s !== "object" || s.v !== 1 || !s.notebook) {
        SI.toast("That file doesn’t look like a Slow Ink Sage backup.");
        return;
      }
      if (!window.confirm("Restore this backup? It will replace everything currently in this planner.")) return;
      SI.state = fillGaps(s);
      SI.saveNow();
      SI.toast("Backup restored.");
      SI.render();
    };
    r.readAsText(file);
  };
})();
