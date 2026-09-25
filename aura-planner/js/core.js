/* Aura — core: utilities, state, image store, router, event delegation, UI helpers.
   Everything lives on window.Aura so the view files can share it without a build step. */
(function () {
  "use strict";
  var A = (window.Aura = {});

  /* ------------------------------------------------------------ utils */
  A.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  A.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  A.pad = function (n) { return (n < 10 ? "0" : "") + n; };
  A.num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : 0; };
  A.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  A.MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  A.DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  A.ymd = function (d) { return d.getFullYear() + "-" + A.pad(d.getMonth() + 1) + "-" + A.pad(d.getDate()); };
  A.ym = function (d) { return d.getFullYear() + "-" + A.pad(d.getMonth() + 1); };
  A.parseD = function (s) {
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(s || "");
    return m ? new Date(+m[1], +m[2] - 1, m[3] ? +m[3] : 1) : null;
  };
  A.today = function () { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  A.todayKey = function () { return A.ymd(A.today()); };
  A.addDays = function (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); };
  A.dowIdx = function (d) { return (d.getDay() + 6) % 7; };
  A.mondayOf = function (d) { return A.addDays(d, -A.dowIdx(d)); };
  A.isoWeek = function (d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y0) / 864e5 + 1) / 7);
  };
  A.daysIn = function (y, m) { return new Date(y, m + 1, 0).getDate(); };
  A.fmtDay = function (d, opts) { return d.toLocaleDateString(undefined, opts || { weekday: "long", month: "long", day: "numeric" }); };
  A.money = function (n) {
    var cur = (A.state && A.state.finance.currency) || "$";
    return (n < 0 ? "−" : "") + cur + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };
  A.PALETTE = ["#B69CFF", "#FF9ED2", "#8FD9C0", "#9CC7FF", "#FFD88A", "#FF8A9E", "#D6A8FF", "#7FD1E6", "#F7B2E0", "#A8E6A1"];
  A.debounce = function (fn, ms) {
    var t;
    return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); };
  };

  /* ------------------------------------------------------------ state */
  var KEY = "aura-planner-v1";

  A.defaults = function () {
    var habits = ["Morning pages", "Move 30 min", "Read 20 min", "Meditate", "Screens off by 10pm"].map(function (n, i) {
      return { id: A.uid() + i, name: n, color: A.PALETTE[i] };
    });
    var areas = ["Career", "Finances", "Health", "Family", "Love", "Friends", "Growth", "Fun", "Environment", "Spirituality"].map(function (n, i) {
      return { name: n, score: 5, color: A.PALETTE[i] };
    });
    return {
      v: 1,
      days: {},
      weeks: {},
      months: {},
      years: {},
      habits: habits,
      habitLog: {},
      wheel: { areas: areas, notes: "" },
      ikigai: { love: [], good: [], paid: [], need: [], statement: "" },
      matrix: { do: [], plan: [], delegate: [], drop: [] },
      goals: [],
      mindmap: { nodes: [{ id: "root", text: "My year", x: 50, y: 50, color: "#B69CFF", parent: null }] },
      vision: { title: "The life I'm creating", tiles: [] },
      finance: {
        currency: "$",
        categories: ["Housing", "Groceries", "Dining out", "Transport", "Health", "Shopping", "Fun", "Subscriptions", "Savings", "Other"],
        months: {},
        savings: []
      },
      meals: { weeks: {}, grocery: [], recipes: [] },
      fitness: { workouts: [], weights: [], unit: "lb", goalWeight: "", weeklyTarget: 150 },
      notebook: { pages: [], current: "" },
      coach: { key: "", model: "claude-opus-5", analysis: "", analysisAt: "", synthInput: "", synth: null, synthAt: "" },
      sync: { token: "", boardId: "", boardName: "", map: {}, scope: "week", log: [], pulled: [] },
      ui: { mealWeek: "", finMonth: "", mmSel: "root" }
    };
  };

  function merge(base, saved) {
    Object.keys(saved || {}).forEach(function (k) {
      if (base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) && saved[k] && typeof saved[k] === "object" && !Array.isArray(saved[k])) merge(base[k], saved[k]);
      else base[k] = saved[k];
    });
    return base;
  }

  A.load = function () {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { saved = null; }
    A.state = merge(A.defaults(), saved || {});
  };
  var quotaWarned = false;
  A.saveNow = function () {
    try { localStorage.setItem(KEY, JSON.stringify(A.state)); }
    catch (e) { if (!quotaWarned) { quotaWarned = true; A.toast("Storage is full — export a backup and remove some old data."); } }
  };
  A.save = A.debounce(A.saveNow, 250);
  window.addEventListener("pagehide", function () { A.saveNow(); });

  A.getPath = function (path) {
    return path.split(".").reduce(function (o, k) { return o == null ? undefined : o[k]; }, A.state);
  };
  A.setPath = function (path, val) {
    var ks = path.split("."), o = A.state;
    for (var i = 0; i < ks.length - 1; i++) {
      if (o[ks[i]] == null || typeof o[ks[i]] !== "object") o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {};
      o = o[ks[i]];
    }
    o[ks[ks.length - 1]] = val;
    A.save();
  };

  /* A day page is created lazily the first time it's written to. */
  A.newDay = function () {
    return {
      top3: [{ t: "", done: false }, { t: "", done: false }, { t: "", done: false }],
      tasks: [], schedule: {}, mood: 0, water: 0, focus: [], breaks: [], care: {},
      meals: { b: "", l: "", d: "", s: "" }, brain: "", intention: "", energy: 0,
      reflect: { wins: "", grateful: "", learned: "", tomorrow: "" }
    };
  };
  A.peekDay = function (k) { return A.state.days[k] || null; };
  A.day = function (k) {
    if (!A.state.days[k]) A.state.days[k] = A.newDay();
    return A.state.days[k];
  };
  A.dayHasContent = function (k) {
    var d = A.state.days[k];
    if (!d) return false;
    return !!(d.tasks.length || d.mood || d.water || d.brain || d.top3.some(function (t) { return t.t; }) || Object.keys(d.schedule).some(function (h) { return d.schedule[h]; }) || d.reflect.wins || d.reflect.grateful);
  };
  A.allTasks = function () {
    var out = [];
    Object.keys(A.state.days).forEach(function (k) {
      (A.state.days[k].tasks || []).forEach(function (t) { out.push({ k: k, t: t }); });
    });
    return out;
  };
  A.findTask = function (id) {
    var ks = Object.keys(A.state.days);
    for (var i = 0; i < ks.length; i++) {
      var ts = A.state.days[ks[i]].tasks || [];
      for (var j = 0; j < ts.length; j++) if (ts[j].id === id) return { k: ks[i], t: ts[j], list: ts, i: j };
    }
    return null;
  };
  A.addTask = function (k, text, extra) {
    var t = { id: A.uid(), text: text, done: false, q: "" };
    Object.keys(extra || {}).forEach(function (x) { t[x] = extra[x]; });
    A.day(k).tasks.push(t);
    A.save();
    return t;
  };

  /* ------------------------------------------------------------ image store (IndexedDB) */
  /* Photos are resized, stored as blobs in IndexedDB and referenced by id from the state,
     so recipe cards and vision boards don't eat the ~5 MB localStorage budget. */
  var imgDB = null, imgCache = {};
  function idbReq(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  function store(mode) { return imgDB.transaction("images", mode).objectStore("images"); }

  A.images = {
    init: function () {
      if (!window.indexedDB) return Promise.resolve();
      return new Promise(function (res) {
        var req;
        try { req = indexedDB.open("aura-planner-images", 1); } catch (e) { res(); return; }
        req.onupgradeneeded = function () { req.result.createObjectStore("images"); };
        req.onsuccess = function () {
          imgDB = req.result;
          var keysP = idbReq(store("readonly").getAllKeys()), valsP = idbReq(store("readonly").getAll());
          Promise.all([keysP, valsP]).then(function (r) {
            r[0].forEach(function (k, i) { if (r[1][i] instanceof Blob) imgCache[k] = URL.createObjectURL(r[1][i]); });
          }).catch(function () {}).then(res);
        };
        req.onerror = function () { res(); };
      });
    },
    url: function (id) { return (id && imgCache[id]) || ""; },
    has: function (id) { return !!(id && imgCache[id]); },
    putBlob: function (id, blob) {
      imgCache[id] = URL.createObjectURL(blob);
      if (!imgDB) return Promise.resolve(id);
      return idbReq(store("readwrite").put(blob, id)).then(function () { return id; }, function () { return id; });
    },
    add: function (file) {
      return compressImage(file).then(function (blob) { return A.images.putBlob("img_" + A.uid(), blob); });
    },
    remove: function (id) {
      if (!id) return;
      if (imgCache[id]) URL.revokeObjectURL(imgCache[id]);
      delete imgCache[id];
      if (imgDB) try { store("readwrite").delete(id); } catch (e) { /* ignore */ }
    },
    exportAll: function () {
      var ids = Object.keys(imgCache), out = {};
      return Promise.all(ids.map(function (id) {
        return fetch(imgCache[id]).then(function (r) { return r.blob(); }).then(blobToDataURL).then(function (d) { out[id] = d; });
      })).then(function () { return out; });
    },
    importAll: function (map) {
      return Promise.all(Object.keys(map || {}).map(function (id) {
        return fetch(map[id]).then(function (r) { return r.blob(); }).then(function (b) { return A.images.putBlob(id, b); });
      }));
    },
    clear: function () {
      Object.keys(imgCache).forEach(function (id) { URL.revokeObjectURL(imgCache[id]); });
      imgCache = {};
      if (imgDB) try { store("readwrite").clear(); } catch (e) { /* ignore */ }
    }
  };
  function blobToDataURL(b) {
    return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(b); });
  }
  function compressImage(file, max) {
    max = max || 1400;
    return new Promise(function (res, rej) {
      if (!/^image\//.test(file.type)) { rej(new Error("That file isn't an image.")); return; }
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? res(b) : res(file); }, "image/jpeg", 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("Couldn't read that image.")); };
      img.src = url;
    });
  }

  /* ------------------------------------------------------------ icons */
  var P = {
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19 13 11"/>',
    notebook: '<rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M9 3.5v17M12 8h4M12 11.5h4"/>',
    sparkle: '<path d="M12 3.5 13.8 9 19.5 10.8 13.8 12.6 12 18.5 10.2 12.6 4.5 10.8 10.2 9z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    sync: '<path d="M19.5 12a7.5 7.5 0 0 1-13 5.1M4.5 12a7.5 7.5 0 0 1 13-5.1"/><path d="M17.5 3.5v3.4h-3.4M6.5 20.5v-3.4h3.4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.5 7.2l2.1 1.2M17.4 15.6l2.1 1.2M4.5 16.8l2.1-1.2M17.4 8.4l2.1-1.2"/><circle cx="12" cy="12" r="6.6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    chevL: '<path d="m14.5 6-6 6 6 6"/>',
    chevR: '<path d="m9.5 6 6 6-6 6"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="3.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17.5 5-4.5 4 3.5 2.5-2 4.5 3.5"/>',
    upload: '<path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 15v2.5a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5V15"/>',
    download: '<path d="M12 4.5v11M7.5 11l4.5 4.5 4.5-4.5"/><path d="M4.5 15v2.5a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5V15"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5"/>',
    pen: '<path d="M15.5 4.5l4 4L9 19H5v-4z"/><path d="M13 7l4 4"/>',
    type: '<path d="M5 6.5V5h14v1.5M12 5v14M9 19h6"/>',
    star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
    heart: '<path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10z"/>',
    drop: '<path d="M12 3.5s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M5.2 18.8 7 17M17 7l1.8-1.8"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    list: '<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="4.8" cy="7" r="1"/><circle cx="4.8" cy="12" r="1"/><circle cx="4.8" cy="17" r="1"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
    brain: '<path d="M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-1.5 5.5A3 3 0 0 0 7 18a2.5 2.5 0 0 0 5 .5v-13A2.5 2.5 0 0 0 9 4.5zM15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 1.5 5.5A3 3 0 0 1 17 18a2.5 2.5 0 0 1-5 .5"/>',
    coffee: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8.5 3.5v2.5M12 3.5v2.5"/>',
    dumbbell: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
    wallet: '<rect x="3.5" y="6" width="17" height="13" rx="3"/><path d="M16 12.5h4.5M6 6l9-2.5 1 2.5"/>',
    cart: '<path d="M3.5 4.5h2.5l2 11h10l2-8H7"/><circle cx="9.5" cy="19" r="1.3"/><circle cx="16.5" cy="19" r="1.3"/>',
    chef: '<path d="M7 14.5V19h10v-4.5M7 14.5a4 4 0 0 1-.5-7.9 5.5 5.5 0 0 1 11 0 4 4 0 0 1-.5 7.9z"/>',
    flag: '<path d="M5.5 20.5V4M5.5 4.5h11l-2 4 2 4h-11"/>',
    quote: '<path d="M10 7H6.5A1.5 1.5 0 0 0 5 8.5V12h4v1.5A3.5 3.5 0 0 1 5.5 17M19 7h-3.5A1.5 1.5 0 0 0 14 8.5V12h4v1.5a3.5 3.5 0 0 1-3.5 3.5"/>',
    undo: '<path d="M9 7.5 4.5 12 9 16.5"/><path d="M4.5 12h10a5 5 0 0 1 0 10h-2"/>',
    redo: '<path d="M15 7.5l4.5 4.5-4.5 4.5"/><path d="M19.5 12h-10a5 5 0 0 0 0 10h2"/>',
    send: '<path d="M20 4 10 14M20 4l-6 16-4-6-6-4z"/>',
    arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    bolt: '<path d="M13 3.5 5.5 13.5H12L11 20.5l7.5-10H12z"/>',
    smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>',
    book: '<path d="M4.5 5.5A2 2 0 0 1 6.5 3.5h13v14h-13a2 2 0 0 0-2 2z"/><path d="M4.5 19.5a2 2 0 0 0 2 2h13v-4"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    mountain: '<path d="M3 19.5 9.5 8l4 7 2.5-3.5 5 8z"/>',
    scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 9.5a5 5 0 0 1 7 0L13 12"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v3.5H16"/>',
    lasso: '<ellipse cx="12" cy="9" rx="8" ry="5"/><path d="M8 13.5c-1 2 0 4 2 4.5s1 3-1 3"/>',
    play: '<path d="M8 5.5v13l10-6.5z"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>'
  };
  A.ic = function (name, cls) {
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || "") + "</svg>";
  };

  /* ------------------------------------------------------------ UI helpers */
  var esc = A.esc;
  A.head = function (eyebrow, title, sub, tools) {
    return '<div class="page-head"><div>' + (eyebrow ? '<p class="eyebrow">' + eyebrow + "</p>" : "") +
      '<h1 class="page-title">' + title + "</h1>" + (sub ? '<p class="page-sub">' + sub + "</p>" : "") +
      "</div>" + (tools ? '<div class="head-tools">' + tools + "</div>" : "") + "</div>";
  };
  /* opts: { icon, tone, tint, tools, sub, cls, id } */
  A.card = function (title, body, opts) {
    opts = opts || {};
    var h = title ? '<div class="card-head"><h2 class="card-title">' + (opts.icon ? '<span class="ico ' + (opts.tone || "") + '">' + A.ic(opts.icon) + "</span>" : "") + title + "</h2>" + (opts.tools ? '<div class="row">' + opts.tools + "</div>" : "") + "</div>" : "";
    return '<section class="card ' + (opts.tint ? "tint-" + opts.tint + " " : "") + (opts.cls || "") + '"' + (opts.id ? ' id="' + opts.id + '"' : "") + ">" + h + (opts.sub ? '<p class="card-sub">' + opts.sub + "</p>" : "") + body + "</section>";
  };
  A.input = function (path, attrs, cls) {
    var v = A.getPath(path);
    return '<input class="field ' + (cls || "") + '" data-bind="' + esc(path) + '" value="' + esc(v == null ? "" : v) + '" ' + (attrs || "") + " />";
  };
  A.textarea = function (path, attrs, cls) {
    var v = A.getPath(path);
    return '<textarea class="ta ' + (cls || "") + '" data-bind="' + esc(path) + '" ' + (attrs || "") + ">" + esc(v == null ? "" : v) + "</textarea>";
  };
  A.checkbox = function (path, extra) {
    return '<input type="checkbox" class="chk" data-bind="' + esc(path) + '"' + (A.getPath(path) ? " checked" : "") + " " + (extra || "") + " />";
  };
  A.ring = function (pct, size, label, stroke) {
    size = size || 64; stroke = stroke || 7;
    var r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - A.clamp(pct, 0, 1));
    var gid = "rg" + Math.random().toString(36).slice(2, 7);
    return '<span class="ring"><svg width="' + size + '" height="' + size + '"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B69CFF"/><stop offset="1" stop-color="#FF9ED2"/></linearGradient></defs>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="rgba(155,123,255,.14)" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="url(#' + gid + ')" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg><b>' + (label == null ? Math.round(pct * 100) + "%" : label) + "</b></span>";
  };
  A.bar = function (pct, over) {
    return '<div class="bar' + (over ? " over" : "") + '"><i style="width:' + (A.clamp(pct, 0, 1) * 100).toFixed(1) + '%"></i></div>';
  };
  A.dropzone = function (upload, label, multiple, extraAttrs) {
    return '<label class="dropzone" data-drop="' + upload + '" ' + (extraAttrs || "") + ">" + A.ic("upload") + "<span>" + (label || "Upload image") + '</span><span class="small">or drop it here</span><input type="file" accept="image/*" data-upload="' + upload + '"' + (multiple ? " multiple" : "") + " " + (extraAttrs || "") + " /></label>";
  };

  var toastT;
  A.toast = function (msg) {
    var t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 2600);
  };
  A.openDrawer = function (html) {
    var d = document.getElementById("drawer");
    d.innerHTML = html; d.hidden = false; document.getElementById("scrim").hidden = false;
  };
  A.closeDrawer = function () {
    document.getElementById("drawer").hidden = true; document.getElementById("scrim").hidden = true;
  };

  /* ------------------------------------------------------------ router & navigation */
  A.GROUPS = [
    { id: "plan", label: "Planner", icon: "calendar", items: [["year", "Year"], ["month", "Month"], ["week", "Week"], ["day", "Daily Focus"]] },
    { id: "life", label: "Life Design", icon: "compass", items: [["wheel", "Level 10 Life"], ["ikigai", "Ikigai"], ["matrix", "Eisenhower Matrix"], ["goals", "SMART Goals"], ["mindmap", "Mind Map"], ["vision", "Vision Board"]] },
    { id: "well", label: "Wellness", icon: "leaf", items: [["habits", "Habits"], ["finance", "Finances"], ["meals", "Meals & Recipes"], ["fitness", "Fitness"]] },
    { id: "notes", label: "Notebook", icon: "notebook", items: [["notebook", "Notebook"]] },
    { id: "ai", label: "AI Coach", icon: "sparkle", items: [["coach", "Habit & Journal Analyzer"], ["synth", "Priority Synthesizer"]] },
    { id: "board", label: "Board Sync", icon: "sync", items: [["sync", "monday board"]] }
  ];
  A.views = {};
  A.acts = {};
  A.uploads = {};
  A.afterRender = null;
  A.cleanup = null;
  A.route = { name: "day", args: [] };
  A.ctxDate = A.today();

  A.parseRoute = function () {
    var h = (location.hash || "").replace(/^#\/?/, "");
    var parts = h.split("/").filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || "day", args: parts.slice(1) };
  };
  A.hrefDay = function (d) { return "#/day/" + A.ymd(d); };
  A.hrefWeek = function (d) { return "#/week/" + A.ymd(A.mondayOf(d)); };
  A.hrefMonth = function (d) { return "#/month/" + A.ym(d); };
  A.hrefYear = function (y) { return "#/year/" + y; };

  function groupOf(name) {
    for (var i = 0; i < A.GROUPS.length; i++) {
      if (A.GROUPS[i].items.some(function (it) { return it[0] === name; })) return A.GROUPS[i];
    }
    return A.GROUPS[0];
  }
  function groupHref(g) {
    var first = g.items[0][0];
    if (g.id === "plan") return "#/day/today";
    return "#/" + first;
  }
  function itemHref(name) {
    var c = A.ctxDate;
    if (name === "year") return A.hrefYear(c.getFullYear());
    if (name === "month") return A.hrefMonth(c);
    if (name === "week") return A.hrefWeek(c);
    if (name === "day") return A.hrefDay(c);
    return "#/" + name;
  }

  function renderNav() {
    var g = groupOf(A.route.name);
    document.getElementById("groups").innerHTML = A.GROUPS.map(function (x) {
      return '<a class="group-pill' + (x === g ? " on" : "") + '" href="' + groupHref(x) + '">' + A.ic(x.icon) + "<span>" + x.label + "</span></a>";
    }).join("");
    var sub = document.getElementById("subnav");
    sub.innerHTML = g.items.length > 1 ? g.items.map(function (it) {
      return '<a class="sub-tab' + (it[0] === A.route.name ? " on" : "") + '" href="' + itemHref(it[0]) + '">' + it[1] + "</a>";
    }).join("") : "";
    sub.hidden = g.items.length < 2;

    var rail = document.getElementById("rail");
    var showRail = g.id === "plan";
    rail.hidden = !showRail;
    if (showRail) {
      var y = A.ctxDate.getFullYear(), now = A.today();
      rail.innerHTML = '<a class="rail-year" href="' + A.hrefYear(y) + '" title="Year overview">' + y + "</a>" + A.MONTHS.map(function (m, i) {
        var on = A.route.name !== "year" && A.ctxDate.getMonth() === i;
        var isNow = now.getFullYear() === y && now.getMonth() === i;
        return '<a class="rail-tab' + (on ? " on" : "") + (isNow ? " now" : "") + '" href="' + A.hrefMonth(new Date(y, i, 1)) + '">' + m.slice(0, 3) + "</a>";
      }).join("");
    }
  }

  var lastRouteKey = "";
  A.render = function () {
    if (A.cleanup) { try { A.cleanup(); } catch (e) { /* ignore */ } A.cleanup = null; }
    A.afterRender = null;
    A.route = A.parseRoute();
    var fn = A.views[A.route.name];
    if (!fn) { location.replace("#/day/today"); return; }
    var key = location.hash, sameRoute = key === lastRouteKey, y = window.scrollY;
    var html = fn.apply(null, A.route.args);
    var view = document.getElementById("view");
    view.innerHTML = html;
    renderNav();
    document.title = (document.querySelector(".page-title") ? document.querySelector(".page-title").textContent + " · " : "") + "Aura";
    if (sameRoute) window.scrollTo(0, y);
    else window.scrollTo(0, 0);
    lastRouteKey = key;
    if (A.afterRender) A.afterRender();
  };

  /* ------------------------------------------------------------ event delegation */
  function coerce(el) {
    if (el.type === "checkbox") return el.checked;
    if (el.hasAttribute("data-num") || el.type === "number" || el.type === "range") return el.value === "" ? "" : A.num(el.value);
    return el.value;
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]");
    if (!el) return;
    var fn = A.acts[el.getAttribute("data-act")];
    if (!fn) return;
    if (el.tagName === "A" || el.tagName === "BUTTON") e.preventDefault();
    fn(el, e);
  });
  document.addEventListener("input", function (e) {
    var el = e.target;
    if (el.hasAttribute && el.hasAttribute("data-bind")) {
      A.setPath(el.getAttribute("data-bind"), coerce(el));
      var live = el.getAttribute("data-live");
      if (live && A.acts[live]) A.acts[live](el, e);
    }
  });
  document.addEventListener("change", function (e) {
    var el = e.target;
    if (el.hasAttribute && el.hasAttribute("data-bind")) {
      A.setPath(el.getAttribute("data-bind"), coerce(el));
      if (el.hasAttribute("data-rerender") || el.type === "checkbox" || el.tagName === "SELECT") A.render();
    }
    if (el.hasAttribute && el.hasAttribute("data-upload")) {
      var fn = A.uploads[el.getAttribute("data-upload")];
      if (fn && el.files && el.files.length) fn(Array.prototype.slice.call(el.files), el);
      el.value = "";
    }
  });
  /* Enter in an "add" field triggers its sibling add button. */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && e.target.hasAttribute && e.target.hasAttribute("data-enter")) {
      e.preventDefault();
      var fn = A.acts[e.target.getAttribute("data-enter")];
      if (fn) fn(e.target, e);
    }
    if (e.key === "Escape") A.closeDrawer();
  });
  /* Drag & drop images onto any [data-drop] zone. */
  ["dragenter", "dragover"].forEach(function (t) {
    document.addEventListener(t, function (e) {
      var z = e.target.closest && e.target.closest("[data-drop]");
      if (!z) return;
      e.preventDefault(); z.classList.add("over");
    });
  });
  document.addEventListener("dragleave", function (e) {
    var z = e.target.closest && e.target.closest("[data-drop]");
    if (z) z.classList.remove("over");
  });
  document.addEventListener("drop", function (e) {
    var z = e.target.closest && e.target.closest("[data-drop]");
    if (!z) return;
    e.preventDefault(); z.classList.remove("over");
    var fn = A.uploads[z.getAttribute("data-drop")];
    var files = Array.prototype.slice.call(e.dataTransfer.files || []).filter(function (f) { return /^image\//.test(f.type); });
    if (fn && files.length) fn(files, z);
  });

  /* Helpers for common list mutations: data-list="path" data-idx="i" */
  A.acts["list-remove"] = function (el) {
    var arr = A.getPath(el.getAttribute("data-list"));
    if (Array.isArray(arr)) { arr.splice(+el.getAttribute("data-idx"), 1); A.save(); A.render(); }
  };
  A.acts["list-add"] = function (el) {
    var wrap = el.closest(".add-row"), inp = wrap && wrap.querySelector(".field");
    var path = el.getAttribute("data-list") || (inp && inp.getAttribute("data-list"));
    var text = inp ? inp.value.trim() : "";
    if (!text) { if (inp) inp.focus(); return; }
    var arr = A.getPath(path);
    if (!Array.isArray(arr)) { A.setPath(path, []); arr = A.getPath(path); }
    arr.push({ id: A.uid(), text: text, done: false });
    A.save(); A.render();
    var again = document.querySelector('.add-row .field[data-list="' + path + '"]');
    if (again) again.focus();
  };
  A.addRow = function (path, placeholder) {
    return '<div class="add-row"><input class="field" data-list="' + esc(path) + '" data-enter="list-add" placeholder="' + esc(placeholder || "Add…") + '" /><button class="btn sm soft" data-act="list-add" data-list="' + esc(path) + '">' + A.ic("plus") + "</button></div>";
  };
  /* A simple check-list editor bound to an array of {text, done} at `path`. */
  A.checklist = function (path, placeholder, empty) {
    var arr = A.getPath(path) || [];
    var items = arr.map(function (it, i) {
      return '<li class="li' + (it.done ? " done" : "") + '">' + A.checkbox(path + "." + i + ".done") + A.input(path + "." + i + ".text", "", "bare") +
        '<button class="x-btn" data-act="list-remove" data-list="' + esc(path) + '" data-idx="' + i + '" aria-label="Remove">' + A.ic("x") + "</button></li>";
    }).join("");
    return (items ? '<ul class="list">' + items + "</ul>" : empty ? '<div class="empty">' + empty + "</div>" : "") + A.addRow(path, placeholder);
  };
})();
