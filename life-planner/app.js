/* ===================================================================
   Slow Ink Life — all-in-one digital planner
   Vanilla JS single-page app. No build step, no dependencies.
   Everything is stored in localStorage on this device; the optional
   monday.com board sync talks to api.monday.com with your own token.
   =================================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "slow-ink-life-v1";

  /* ------------------------------------------------------------ helpers */

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sum(arr, f) { return arr.reduce(function (s, x) { return s + num(f ? f(x) : x); }, 0); }

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var MON3 = MONTHS.map(function (m) { return m.slice(0, 3); });
  var DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var DOW3 = DOW.map(function (d) { return d.slice(0, 3); });
  var DOW1 = ["M", "T", "W", "T", "F", "S", "S"];

  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseD(s) { var p = String(s).split("-").map(Number); return new Date(p[0], (p[1] || 1) - 1, p[2] || 1); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
  function dowIdx(d) { return (d.getDay() + 6) % 7; }
  function mondayOf(d) { return addDays(d, -dowIdx(d)); }
  function monthKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1); }
  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y0) / 864e5 + 1) / 7);
  }
  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function todayKey() { return ymd(today()); }
  function seasonKey(d) {
    var m = d.getMonth();
    var names = ["Winter", "Winter", "Spring", "Spring", "Spring", "Summer", "Summer", "Summer", "Autumn", "Autumn", "Autumn", "Winter"];
    var y = m === 11 ? d.getFullYear() + 1 : d.getFullYear();
    return { key: y + "-" + names[m], label: names[m] + " " + y };
  }
  function prettyDay(d) { return DOW[dowIdx(d)] + ", " + d.getDate() + " " + MONTHS[d.getMonth()]; }
  function shortDay(d) { return DOW3[dowIdx(d)] + " " + d.getDate() + " " + MON3[d.getMonth()]; }
  function daysBetween(a, b) { return Math.round((b - a) / 864e5); }

  /* ------------------------------------------------------------ icons */

  var P = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    month: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/>',
    year: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    week: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M9 5v15M15 5v15"/>',
    dumbbell: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
    bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7.5c0-1.2 1-1.6 1-3M12 7.5c0-1.2 1-1.6 1-3M16 7.5c0-1.2 1-1.6 1-3"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M16 13.5h2"/><path d="M5.5 6l10-3 1.2 3"/>',
    lotus: '<path d="M12 20c-4.2 0-8.2-2.6-9-7 3.2 0 6 1.6 9 5 3-3.4 5.8-5 9-5-.8 4.4-4.8 7-9 7z"/><path d="M12 18c-2.2-2.6-2.6-6.4 0-11.5 2.6 5.1 2.2 8.9 0 11.5z"/>',
    plane: '<path d="M21.5 2.5L10.5 13.5"/><path d="M21.5 2.5l-7 19-4-8-8-4z"/>',
    house: '<path d="M4 11l8-6.5 8 6.5v9H4z"/><path d="M12 11.5l.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9z"/>',
    book: '<rect x="5" y="3" width="15" height="18" rx="2.5"/><path d="M9 3v18M3 7.5h4M3 12h4M3 16.5h4"/>',
    sync: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    left: '<path d="M15 18l-6-6 6-6"/>',
    right: '<path d="M9 18l6-6-6-6"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
    type: '<path d="M5 7V4.5h14V7M12 4.5V20M9 20h6"/>',
    eraser: '<path d="M8 20h12"/><path d="M4.5 15.5l9-9 5 5-6.5 6.5h-4.5z"/>',
    marker: '<path d="M9 14l-3.5 3.5V20H8l3.5-3.5"/><path d="M9 14l6.5-9.5 4 4L10 15z"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    grid: '<circle cx="6" cy="6" r="1.4"/><circle cx="12" cy="6" r="1.4"/><circle cx="18" cy="6" r="1.4"/><circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/><circle cx="6" cy="18" r="1.4"/><circle cx="12" cy="18" r="1.4"/><circle cx="18" cy="18" r="1.4"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    branch: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.3 11l7.4-4M8.3 13l7.4 4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>'
  };
  function ic(n) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || "") + "</svg>";
  }

  /* ------------------------------------------------------------ constants */

  var MOODS = [
    { v: 1, e: "😣", l: "Rough" }, { v: 2, e: "😕", l: "Low" }, { v: 3, e: "😐", l: "Okay" },
    { v: 4, e: "🙂", l: "Good" }, { v: 5, e: "😊", l: "Great" }
  ];
  function moodEmoji(v) { var m = MOODS.filter(function (x) { return x.v === v; })[0]; return m ? m.e : ""; }

  var COLORS = ["pink", "butter", "sage", "sky", "lilac"];
  var CHART = ["var(--pink-deep)", "var(--butter-deep)", "var(--sage-deep)", "var(--sky-deep)", "#9b87c4", "#d49a74", "#7fb3a8", "#c98fb0", "#a8a07a", "#8f837d"];

  var MEAL_SLOTS = [["b", "Breakfast"], ["l", "Lunch"], ["d", "Dinner"], ["s", "Snacks"]];
  var RECIPE_CATS = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Drink"];
  var GROCERY_CATS = ["Produce", "Protein", "Dairy", "Bakery", "Pantry", "Frozen", "Drinks", "Household", "Other"];
  var GROCERY_WORDS = {
    Produce: /apple|banana|berr|lemon|lime|onion|garlic|tomato|spinach|lettuce|herb|basil|parsley|carrot|pepper|potato|avocado|cucumber|kale|fruit|veg|ginger|mushroom|zucchini|broccoli/i,
    Protein: /chicken|beef|pork|fish|salmon|tuna|egg|tofu|tempeh|bean|lentil|chickpea|turkey|prawn|shrimp/i,
    Dairy: /milk|yog|cheese|butter|cream|parmesan|feta/i,
    Bakery: /bread|bagel|wrap|tortilla|bun|pita|croissant/i,
    Pantry: /rice|pasta|oat|flour|sugar|oil|vinegar|salt|spice|honey|syrup|stock|sauce|nut|seed|quinoa|cinnamon|vanilla|can/i,
    Frozen: /frozen|ice/i,
    Drinks: /coffee|tea|juice|water|wine|soda/i,
    Household: /soap|detergent|paper|foil|bag|sponge/i
  };
  var FIN_CATS = ["Housing", "Utilities", "Groceries", "Dining", "Transport", "Health", "Shopping", "Fun", "Personal", "Other"];
  var WORKOUT_TYPES = ["Strength", "Run", "Walk", "Yoga", "Pilates", "Cycling", "Swim", "HIIT", "Stretch", "Other"];
  var WHEEL = ["Health & Fitness", "Family", "Friends", "Romance", "Career", "Finances", "Personal Growth", "Fun & Recreation", "Spirituality", "Environment"];
  var CHORE_FREQ = [["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["seasonal", "Seasonal"]];
  var PAPERS = [
    ["blank", "Blank"], ["lined", "Lined"], ["grid", "Square grid"], ["dot", "Dot grid"], ["cornell", "Cornell notes"],
    ["two", "Two-column"], ["three", "Three-column"], ["mindmap", "Mind map"], ["vision", "Vision board"]
  ];
  var QUOTES = [
    "Slow is smooth, and smooth is fast.",
    "You do not rise to the level of your goals; you fall to the level of your systems.",
    "Small steps, taken daily, become a life.",
    "Rest is not the reward for the work — it is part of the work.",
    "What you do every day matters more than what you do once in a while.",
    "Plant the seed, water it, and give it time.",
    "Begin where you are. Use what you have. Do what you can.",
    "A gentle plan, kept, beats a perfect plan abandoned."
  ];

  /* ------------------------------------------------------------ state */

  function seedChores() {
    var rows = [
      ["Kitchen", "daily", "Wipe counters & hob"], ["Kitchen", "daily", "Empty dishwasher"], ["Kitchen", "weekly", "Mop floor"],
      ["Kitchen", "weekly", "Clean microwave"], ["Kitchen", "monthly", "Clear out fridge"], ["Kitchen", "monthly", "Descale kettle"],
      ["Kitchen", "seasonal", "Deep-clean oven"], ["Bathroom", "daily", "Squeegee shower"], ["Bathroom", "weekly", "Scrub toilet & sink"],
      ["Bathroom", "weekly", "Fresh towels"], ["Bathroom", "monthly", "Wash bath mat & curtain"], ["Bathroom", "seasonal", "Check grout & sealant"],
      ["Bedroom", "daily", "Make the bed"], ["Bedroom", "weekly", "Change bedding"], ["Bedroom", "weekly", "Dust surfaces"],
      ["Bedroom", "monthly", "Vacuum under the bed"], ["Bedroom", "seasonal", "Rotate mattress"], ["Bedroom", "seasonal", "Swap seasonal wardrobe"],
      ["Living Room", "daily", "Tidy & fluff cushions"], ["Living Room", "weekly", "Vacuum rugs"], ["Living Room", "monthly", "Wash throws"],
      ["Living Room", "seasonal", "Wash windows"], ["Laundry", "weekly", "Wash, dry & fold"], ["Laundry", "monthly", "Clean washing machine"]
    ];
    return rows.map(function (r) { return { id: uid(), room: r[0], freq: r[1], text: r[2], who: "" }; });
  }

  function seedRecipes() {
    return [
      { id: uid(), text: "Overnight oats", cat: "Breakfast", time: "5 min", serves: "2", ingredients: "Rolled oats\nMilk\nGreek yogurt\nChia seeds\nBerries\nHoney", method: "Stir everything together, chill overnight, top with berries." },
      { id: uid(), text: "Lemon herb chicken bowl", cat: "Lunch", time: "25 min", serves: "2", ingredients: "Chicken breast\nLemon\nParsley\nQuinoa\nCucumber\nCherry tomatoes\nFeta", method: "Marinate chicken in lemon & herbs, pan-fry, serve over quinoa and salad." },
      { id: uid(), text: "Creamy tomato pasta", cat: "Dinner", time: "20 min", serves: "3", ingredients: "Pasta\nGarlic\nTinned tomatoes\nCream\nBasil\nParmesan", method: "Soften garlic, simmer tomatoes, stir in cream, toss with pasta and basil." }
    ];
  }

  function defaults() {
    return {
      version: 1,
      name: "",
      theme: "light",
      currency: "$",
      waterGoal: 8,
      days: {},
      weeks: {},
      months: {},
      years: {},
      reviews: {},
      habits: [
        { id: uid(), text: "Morning pages", color: "pink" },
        { id: uid(), text: "Move 30 minutes", color: "sage" },
        { id: uid(), text: "Read 20 pages", color: "butter" },
        { id: uid(), text: "No phone after 10pm", color: "lilac" }
      ],
      habitLog: {},
      workouts: [],
      milestones: [],
      weights: [],
      meals: {},
      recipes: seedRecipes(),
      grocery: [],
      finance: { months: {}, pots: [], debts: [], subs: [] },
      mind: {
        ikigai: { love: "", good: "", world: "", paid: "", center: "" },
        wheel: {},
        smart: [],
        matrix: { q1: [], q2: [], q3: [], q4: [] }
      },
      travel: { trips: {}, bucket: [] },
      chores: seedChores(),
      choreDone: {},
      notebook: {},
      sync: { token: "", boardId: "", scope: "week", map: {}, log: [], pulled: [], boardName: "" },
      ui: { tabs: {} }
    };
  }

  function merge(base, over) {
    if (!over || typeof over !== "object" || Array.isArray(over)) return over === undefined ? base : over;
    var out = Array.isArray(base) ? over : Object.assign({}, base);
    Object.keys(over).forEach(function (k) {
      out[k] = base && typeof base[k] === "object" && base[k] !== null && !Array.isArray(base[k]) ? merge(base[k], over[k]) : over[k];
    });
    return out;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return merge(defaults(), JSON.parse(raw));
    } catch (e) { /* fall through to defaults */ }
    return defaults();
  }

  var state = load();
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 250);
  }
  function saveNow() {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      toast("Couldn't save — browser storage is full. Try removing large notebook images.");
    }
  }
  window.addEventListener("beforeunload", saveNow);
  document.addEventListener("visibilitychange", function () { if (document.hidden) saveNow(); });

  /* path helpers: "days.2026-09-23.notes" */
  function resolve(path, create) {
    var parts = path.split(".");
    var o = state;
    for (var i = 0; i < parts.length - 1; i++) {
      var k = parts[i];
      if (o[k] == null) {
        if (!create) return [null, null];
        o[k] = {};
      }
      o = o[k];
    }
    return [o, parts[parts.length - 1]];
  }
  function getP(path) { var r = resolve(path, false); return r[0] ? r[0][r[1]] : undefined; }
  function setP(path, v) { var r = resolve(path, true); r[0][r[1]] = v; }
  function listAt(path) {
    var v = getP(path);
    if (!Array.isArray(v)) { v = []; setP(path, v); }
    return v;
  }

  function ensureDay(k) {
    var d = state.days[k];
    if (!d) d = state.days[k] = {};
    if (!Array.isArray(d.tasks)) d.tasks = [];
    if (!Array.isArray(d.top3)) d.top3 = ["", "", ""];
    if (!d.schedule) d.schedule = {};
    return d;
  }
  function peekDay(k) { return state.days[k] || null; }

  /* ------------------------------------------------------------ UI bits */

  function listEd(path, opts) {
    opts = opts || {};
    var arr = listAt(path);
    var items = arr.map(function (it) {
      return '<li class="' + (it.done ? "done" : "") + '">' +
        (opts.noCheck ? "" : '<input type="checkbox" class="check" aria-label="Done" data-item="' + path + "|" + it.id + '|done" data-rerender ' + (it.done ? "checked" : "") + ">") +
        (opts.prio ? '<button class="prio p' + (it.prio || 0) + '" title="Priority" aria-label="Cycle priority" data-act="prio" data-path="' + path + '" data-id="' + it.id + '"></button>' : "") +
        '<input class="txt" type="text" aria-label="Item" value="' + esc(it.text) + '" data-item="' + path + "|" + it.id + '|text">' +
        (opts.meta ? opts.meta(it) : "") +
        '<button class="del" data-act="list-del" data-path="' + path + '" data-id="' + it.id + '" aria-label="Delete">' + ic("x") + "</button></li>";
    }).join("");
    return (arr.length ? '<ul class="list">' + items + "</ul>" : opts.empty ? '<div class="empty">' + esc(opts.empty) + "</div>" : "") +
      '<div class="adder"><input type="text" placeholder="' + esc(opts.placeholder || "Add an item…") + '" data-add="' + path + '" aria-label="' + esc(opts.placeholder || "Add an item") + '">' +
      '<button class="icon-btn sm" data-act="list-add" data-path="' + path + '" aria-label="Add">' + ic("plus") + "</button></div>";
  }

  function bindInput(path, attrs) {
    var v = getP(path);
    return '<input type="text" data-bind="' + path + '" value="' + esc(v) + '" ' + (attrs || "") + ">";
  }
  function bindNum(path, attrs) {
    var v = getP(path);
    return '<input type="number" inputmode="decimal" data-bind="' + path + '" data-type="num" value="' + esc(v == null ? "" : v) + '" ' + (attrs || "") + ">";
  }
  function bindArea(path, ph, attrs) {
    return '<textarea data-bind="' + path + '" placeholder="' + esc(ph || "") + '" ' + (attrs || "") + ">" + esc(getP(path)) + "</textarea>";
  }
  function bindSelect(path, options, attrs) {
    var v = getP(path);
    return '<select data-bind="' + path + '" ' + (attrs || "") + ">" + options.map(function (o) {
      var val = Array.isArray(o) ? o[0] : o, lab = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(val) + '"' + (String(v) === String(val) ? " selected" : "") + ">" + esc(lab) + "</option>";
    }).join("") + "</select>";
  }
  function itemInput(path, it, field, attrs, type) {
    return '<input type="' + (type || "text") + '" data-item="' + path + "|" + it.id + "|" + field + '"' + (type === "number" ? ' data-type="num" inputmode="decimal"' : "") +
      ' value="' + esc(it[field] == null ? "" : it[field]) + '" ' + (attrs || "") + ">";
  }
  function itemSelect(path, it, field, options, attrs) {
    return '<select data-item="' + path + "|" + it.id + "|" + field + '" ' + (attrs || "") + ">" + options.map(function (o) {
      var val = Array.isArray(o) ? o[0] : o, lab = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(val) + '"' + (String(it[field]) === String(val) ? " selected" : "") + ">" + esc(lab) + "</option>";
    }).join("") + "</select>";
  }

  function card(title, body, opts) {
    opts = opts || {};
    return '<section class="card ' + (opts.cls || "") + '">' +
      (title ? '<div class="card-head"><h3>' + (opts.dot ? '<span class="dotmark ' + opts.dot + '"></span>' : "") + title + "</h3>" + (opts.right || "") + "</div>" : "") +
      body + "</section>";
  }
  function head(kicker, title, right) {
    return '<div class="page-head"><div><div class="kicker">' + kicker + "</div><h1>" + title + "</h1></div>" + (right ? '<div class="row wrap">' + right + "</div>" : "") + "</div>";
  }
  function tabs(key, list) {
    var cur = state.ui.tabs[key] || list[0][0];
    return { cur: cur, html: '<div class="tabs" role="tablist">' + list.map(function (t) {
      return '<button class="tab ' + (t[0] === cur ? "on" : "") + '" role="tab" aria-selected="' + (t[0] === cur) + '" data-act="tab" data-key="' + key + '" data-val="' + t[0] + '">' + t[1] + "</button>";
    }).join("") + "</div>" };
  }
  function progress(pct, cls) { return '<div class="progress ' + (cls || "") + '"><i style="width:' + clamp(pct, 0, 100) + '%"></i></div>'; }
  function money(n) {
    n = num(n);
    return (n < 0 ? "−" : "") + state.currency + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }
  function moodPicker(path) {
    var cur = getP(path) || 0;
    return '<div class="moods">' + MOODS.map(function (m) {
      return '<button class="mood-btn ' + (cur === m.v ? "on" : "") + '" title="' + m.l + '" aria-label="' + m.l + '" data-act="set" data-path="' + path + '" data-val="' + m.v + '" data-num>' + m.e + "</button>";
    }).join("") + "</div>";
  }
  function waterPicker(path) {
    var cur = getP(path) || 0, goal = Math.max(1, state.waterGoal | 0);
    var html = '<div class="water">';
    for (var i = 1; i <= Math.max(goal, cur); i++) {
      html += '<button class="drop ' + (i <= cur ? "on" : "") + '" aria-label="' + i + ' glasses" data-act="set" data-path="' + path + '" data-val="' + (cur === i ? i - 1 : i) + '" data-num></button>';
    }
    html += '<button class="icon-btn sm" aria-label="Add a glass" data-act="set" data-path="' + path + '" data-val="' + (cur + 1) + '" data-num>' + ic("plus") + "</button></div>";
    return html + '<div class="small muted" style="margin-top:8px">' + cur + " of " + goal + " glasses</div>";
  }
  function rating(path, max) {
    var cur = getP(path) || 0, html = '<div class="rating">';
    for (var i = 1; i <= max; i++) html += '<button class="' + (i <= cur ? "on" : "") + '" data-act="set" data-path="' + path + '" data-val="' + (cur === i ? 0 : i) + '" data-num aria-label="Rate ' + i + '">' + i + "</button>";
    return html + "</div>";
  }
  function habitChecks(k) {
    if (!state.habits.length) return '<div class="empty">No habits yet — add some in Habits &amp; Fitness.</div>';
    return '<ul class="list">' + state.habits.map(function (h) {
      var on = !!(state.habitLog[k] && state.habitLog[k][h.id]);
      return '<li class="' + (on ? "done" : "") + '"><input type="checkbox" class="check" aria-label="' + esc(h.text) + '" data-bind="habitLog.' + k + "." + h.id + '" data-rerender ' + (on ? "checked" : "") + '><span class="dotmark" style="background:var(--' + h.color + ')"></span><span class="grow">' + esc(h.text) + "</span></li>";
    }).join("") + "</ul>";
  }

  /* ------------------------------------------------------------ charts */

  function lineChart(pts, opts) {
    opts = opts || {};
    if (pts.length < 2) return '<div class="empty">' + (opts.empty || "Add at least two entries to see the curve.") + "</div>";
    var W = 600, H = 200, pl = 40, pr = 14, pt = 14, pb = 26;
    var ys = pts.map(function (p) { return p.y; });
    var min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
    if (min === max) { min -= 1; max += 1; }
    var padv = (max - min) * 0.12; min -= padv; max += padv;
    function X(i) { return pl + (i * (W - pl - pr)) / (pts.length - 1); }
    function Y(v) { return pt + (1 - (v - min) / (max - min)) * (H - pt - pb); }
    var d = pts.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.y).toFixed(1); }).join(" ");
    var area = d + " L" + X(pts.length - 1) + " " + (H - pb) + " L" + pl + " " + (H - pb) + " Z";
    var grid = "";
    for (var g = 0; g <= 3; g++) {
      var v = min + ((max - min) * g) / 3, y = Y(v);
      grid += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)" /><text x="' + (pl - 6) + '" y="' + (y + 3) + '" text-anchor="end" font-size="10" fill="var(--muted)">' + v.toFixed(1) + "</text>";
    }
    var step = Math.ceil(pts.length / 6);
    var labels = pts.map(function (p, i) { return i % step === 0 || i === pts.length - 1 ? '<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + esc(p.label) + "</text>" : ""; }).join("");
    var dots = pts.map(function (p, i) { return '<circle cx="' + X(i) + '" cy="' + Y(p.y) + '" r="3.5" fill="var(--surface)" stroke="var(--pink-deep)" stroke-width="2"><title>' + esc(p.label + ": " + p.y) + "</title></circle>"; }).join("");
    return '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="' + esc(opts.label || "Chart") + '"><defs><linearGradient id="lg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--pink)" stop-opacity=".7"/><stop offset="1" stop-color="var(--pink)" stop-opacity="0"/></linearGradient></defs>' +
      grid + '<path d="' + area + '" fill="url(#lg)"/><path d="' + d + '" fill="none" stroke="var(--pink-deep)" stroke-width="2.2" stroke-linejoin="round"/>' + dots + labels + "</svg>";
  }

  function barChart(items, goal) {
    var W = 600, H = 170, pb = 24, pt = 10, max = Math.max(goal || 0, Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1])));
    var bw = (W - 20) / items.length;
    var bars = items.map(function (it, i) {
      var h = ((H - pb - pt) * it.v) / max, x = 10 + i * bw + bw * 0.18, y = H - pb - h;
      return '<rect x="' + x + '" y="' + y + '" width="' + bw * 0.64 + '" height="' + Math.max(h, 0.5) + '" rx="6" fill="' + (goal && it.v >= goal ? "var(--sky-deep)" : "var(--sky)") + '"><title>' + esc(it.label + ": " + it.v) + "</title></rect>" +
        '<text x="' + (x + bw * 0.32) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + esc(it.label) + "</text>";
    }).join("");
    var gl = goal ? '<line x1="10" x2="' + (W - 10) + '" y1="' + (H - pb - ((H - pb - pt) * goal) / max) + '" y2="' + (H - pb - ((H - pb - pt) * goal) / max) + '" stroke="var(--pink-deep)" stroke-dasharray="4 4"/>' : "";
    return '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="Bar chart">' + bars + gl + "</svg>";
  }

  function donut(segs, centerLabel) {
    var total = sum(segs, function (s) { return s.value; });
    if (!total) return '<div class="empty">Nothing logged yet for this month.</div>';
    var R = 70, C = 2 * Math.PI * R, off = 0;
    var rings = segs.map(function (s, i) {
      var len = (s.value / total) * C;
      var el = '<circle r="' + R + '" cx="100" cy="100" fill="none" stroke="' + CHART[i % CHART.length] + '" stroke-width="26" stroke-dasharray="' + len + " " + (C - len) + '" stroke-dashoffset="' + -off + '" transform="rotate(-90 100 100)"><title>' + esc(s.label + ": " + money(s.value)) + "</title></circle>";
      off += len;
      return el;
    }).join("");
    var legend = '<div class="legend">' + segs.map(function (s, i) { return '<span><i style="background:' + CHART[i % CHART.length] + '"></i>' + esc(s.label) + ' <b style="margin-left:auto">' + money(s.value) + "</b></span>"; }).join("") + "</div>";
    return '<div class="row wrap" style="gap:22px;align-items:center"><svg viewBox="0 0 200 200" width="190" role="img" aria-label="Spending breakdown">' + rings +
      '<text x="100" y="96" text-anchor="middle" font-size="11" fill="var(--muted)">' + esc(centerLabel || "Total") + '</text><text x="100" y="118" text-anchor="middle" font-size="19" font-family="Cormorant Garamond, serif" font-weight="700" fill="var(--ink)">' + money(total) + "</text></svg>" +
      '<div class="grow" style="min-width:180px">' + legend + "</div></div>";
  }

  function radar(values, labels) {
    var n = labels.length, cx = 190, cy = 175, R = 125, rings = "", spokes = "", txt = "";
    function pt(i, r) { var a = (Math.PI * 2 * i) / n - Math.PI / 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
    for (var g = 2; g <= 10; g += 2) {
      rings += '<polygon points="' + labels.map(function (_, i) { return pt(i, (R * g) / 10).join(","); }).join(" ") + '" fill="none" stroke="var(--line)"/>';
    }
    labels.forEach(function (l, i) {
      var e = pt(i, R), t = pt(i, R + 22);
      spokes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '" stroke="var(--line)"/>';
      txt += '<text x="' + t[0] + '" y="' + (t[1] + 3) + '" text-anchor="' + (Math.abs(t[0] - cx) < 10 ? "middle" : t[0] > cx ? "start" : "end") + '">' + esc(l) + "</text>";
    });
    var poly = values.map(function (v, i) { return pt(i, (R * clamp(v, 0, 10)) / 10).join(","); }).join(" ");
    return '<svg class="wheel-svg" viewBox="-40 0 460 350" role="img" aria-label="Level 10 life wheel">' + rings + spokes +
      '<polygon points="' + poly + '" fill="var(--pink)" fill-opacity=".55" stroke="var(--pink-deep)" stroke-width="2" stroke-linejoin="round"/>' + txt + "</svg>";
  }

  /* ------------------------------------------------------------ period stats */

  function periodStats(start, end) {
    var t = today(), effEnd = end > t ? t : end;
    var s = { tasks: 0, done: 0, habitPct: 0, moods: [], water: 0, waterDays: 0, workouts: 0, minutes: 0, spent: 0, journal: 0 };
    var hc = 0, days = 0;
    for (var d = new Date(start); d <= end; d = addDays(d, 1)) {
      var k = ymd(d), day = peekDay(k);
      if (day) {
        s.tasks += (day.tasks || []).length;
        s.done += (day.tasks || []).filter(function (x) { return x.done; }).length;
        if (day.mood) s.moods.push(day.mood);
        if (day.water) { s.water += day.water; s.waterDays++; }
      }
      if (d <= effEnd) {
        days++;
        var log = state.habitLog[k];
        if (log) hc += state.habits.filter(function (h) { return log[h.id]; }).length;
      }
    }
    if (state.habits.length && days) s.habitPct = Math.round((100 * hc) / (state.habits.length * days));
    var a = ymd(start), b = ymd(end);
    state.workouts.forEach(function (w) { if (w.date >= a && w.date <= b) { s.workouts++; s.minutes += num(w.minutes); } });
    Object.keys(state.finance.months).forEach(function (mk) {
      if (mk + "-01" <= b && mk + "-31" >= a) {
        (state.finance.months[mk].expenses || []).forEach(function (e) {
          var dd = e.date || mk + "-01";
          if (dd >= a && dd <= b) s.spent += num(e.amount);
        });
      }
    });
    Object.keys(state.notebook).forEach(function (id) {
      var p = state.notebook[id];
      var c = ymd(new Date(p.created || 0));
      if (c >= a && c <= b) s.journal++;
    });
    s.avgMood = s.moods.length ? sum(s.moods) / s.moods.length : 0;
    return s;
  }
  function statsRow(s, extra) {
    var items = [
      [s.done + "/" + s.tasks, "Tasks done"],
      [s.habitPct + "%", "Habit consistency"],
      [s.avgMood ? moodEmoji(Math.round(s.avgMood)) + " " + s.avgMood.toFixed(1) : "—", "Average mood"],
      [s.workouts + (s.minutes ? " · " + s.minutes + "m" : ""), "Workouts"],
      [s.waterDays ? (s.water / s.waterDays).toFixed(1) : "—", "Glasses / day"]
    ];
    if (extra) items = items.concat(extra);
    return '<div class="stats">' + items.map(function (i) { return '<div class="stat"><span class="v">' + i[0] + '</span><span class="k">' + i[1] + "</span></div>"; }).join("") + "</div>";
  }

  /* ------------------------------------------------------------ routing */

  var focusDate = today();
  function parseRoute() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    var parts = h.split("/").filter(Boolean);
    return { name: parts[0] || "home", a: parts[1], b: parts[2] };
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function hrefDay(d) { return "#/day/" + ymd(d); }
  function hrefWeek(d) { return "#/week/" + ymd(mondayOf(d)); }
  function hrefMonth(d) { return "#/month/" + monthKey(d); }
  function hrefYear(d) { return "#/year/" + d.getFullYear(); }

  var NAV = [
    { group: "Plan", items: [["home", "Today", "home"], ["year", "Year", "year"], ["month", "Month", "month"], ["week", "Week", "week"], ["day", "Day", "sun"]] },
    { group: "Life", items: [["habits", "Habits & Fitness", "dumbbell"], ["meals", "Meals & Recipes", "bowl"], ["finance", "Finance", "wallet"], ["mind", "Mind & Ikigai", "lotus"], ["travel", "Travel", "plane"], ["home-care", "Home & Chores", "house"]] },
    { group: "Journal", items: [["notebook", "Notebook", "book"]] },
    { group: "System", items: [["sync", "Board Sync", "sync"], ["settings", "Settings", "sliders"]] }
  ];
  function navHref(id) {
    if (id === "year") return hrefYear(focusDate);
    if (id === "month") return hrefMonth(focusDate);
    if (id === "week") return hrefWeek(focusDate);
    if (id === "day") return hrefDay(focusDate);
    return "#/" + id;
  }

  function renderChrome(r) {
    var sb = '<a class="brand" href="#/home"><span class="brand-mark"></span><span><div class="brand-name">Slow Ink <i>Life</i></div><div class="brand-sub">Mindful planner</div></span></a>';
    NAV.forEach(function (g) {
      sb += '<div class="nav-group"><div class="nav-label">' + g.group + "</div>" + g.items.map(function (it) {
        return '<a class="nav-link ' + (r.name === it[0] ? "active" : "") + '" href="' + navHref(it[0]) + '"' + (r.name === it[0] ? ' aria-current="page"' : "") + ">" + ic(it[2]) + "<span>" + esc(it[1]) + "</span></a>";
      }).join("") + "</div>";
    });
    sb += '<div class="nav-group"><a class="nav-link" href="../">' + ic("arrow") + "<span>Back to Slow Ink</span></a></div>";
    sb += '<div class="sidebar-foot"><button class="icon-btn" data-act="theme" aria-label="Toggle dark mode" title="Toggle light / dark">' + ic(state.theme === "dark" ? "sun" : "moon") + '</button><a class="icon-btn" href="#/settings" aria-label="Settings" title="Settings">' + ic("sliders") + "</a></div>";
    $("#sidebar").innerHTML = sb;

    var calendarNames = ["year", "month", "week", "day", "notebook"];
    var dock = [["home", "Home", "home"], ["month", "Calendar", "month"], ["day", "Today", "sun", true], ["notebook", "Journal", "book"]];
    $("#dock").innerHTML = dock.map(function (d) {
      var href = d[0] === "day" ? hrefDay(today()) : navHref(d[0]);
      var active = r.name === d[0] || (d[0] === "month" && (r.name === "year" || r.name === "week"));
      return '<a class="dock-btn ' + (d[3] ? "center " : "") + (active && !d[3] ? "active" : "") + '" href="' + href + '" aria-label="' + d[1] + '">' + ic(d[2]) + (d[3] ? "" : "<span>" + d[1] + "</span>") + "</a>";
    }).join("") + '<button class="dock-btn ' + (calendarNames.indexOf(r.name) < 0 && r.name !== "home" ? "active" : "") + '" data-act="sheet" aria-label="More sections">' + ic("grid") + "<span>More</span></button>";

    $("#topbar").innerHTML = topbar(r);
  }

  function topbar(r) {
    var d = focusDate, crumbs = "", right = "";
    var isCal = ["year", "month", "week", "day"].indexOf(r.name) >= 0;
    if (isCal) {
      var trail = [
        ["year", hrefYear(d), String(d.getFullYear())],
        ["month", hrefMonth(d), MONTHS[d.getMonth()]],
        ["week", hrefWeek(d), "Week " + isoWeek(d)],
        ["day", hrefDay(d), shortDay(d)]
      ];
      var depth = ["year", "month", "week", "day"].indexOf(r.name);
      crumbs = trail.slice(0, depth + 1).map(function (t, i) {
        return (i ? '<span class="crumb-sep">›</span>' : "") + '<a class="crumb ' + (i === depth && r.b !== "review" ? "current" : "") + '" href="' + t[1] + '">' + esc(t[2]) + "</a>";
      }).join("");
      if (r.b === "review") crumbs += '<span class="crumb-sep">›</span><span class="crumb current">Review</span>';
      var base = r.name === "year" ? hrefYear : r.name === "month" ? hrefMonth : r.name === "week" ? hrefWeek : hrefDay;
      var stepFn = {
        year: function (n) { return new Date(d.getFullYear() + n, 0, 1); },
        month: function (n) { return addMonths(d, n); },
        week: function (n) { return addDays(d, 7 * n); },
        day: function (n) { return addDays(d, n); }
      }[r.name];
      var suffix = r.b === "review" ? "/review" : "";
      right = '<div class="nav-arrows"><a class="icon-btn" aria-label="Previous" href="' + base(stepFn(-1)) + suffix + '">' + ic("left") + '</a><a class="icon-btn" aria-label="Next" href="' + base(stepFn(1)) + suffix + '">' + ic("right") + "</a></div>" +
        '<a class="btn" href="' + base(today()) + suffix + '">Today</a>' +
        (r.b === "review" ? '<a class="btn butter" href="' + base(d) + '">' + ic(r.name === "day" ? "sun" : r.name) + " Spread</a>" : '<a class="btn pink" href="' + base(d) + '/review">' + ic("spark") + " Review</a>");
    } else {
      var label = "";
      NAV.forEach(function (g) { g.items.forEach(function (it) { if (it[0] === r.name) label = g.group + '</span><span class="crumb-sep">›</span><span class="crumb current">' + esc(it[1]); }); });
      if (r.name === "notebook" && r.a) label = 'Journal</span><span class="crumb-sep">›</span><a class="crumb" href="#/notebook">Notebook</a><span class="crumb-sep">›</span><span class="crumb current">Page';
      crumbs = '<span class="crumb">' + (label || "Slow Ink") + "</span>";
      right = '<a class="btn" href="' + hrefDay(today()) + '">' + ic("sun") + " Today's spread</a>";
    }
    return '<nav class="crumbs" aria-label="Breadcrumb">' + crumbs + '</nav><div class="topbar-actions">' + right + "</div>";
  }

  /* ------------------------------------------------------------ views: home */

  function greeting() {
    var h = new Date().getHours();
    var g = h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    return g + (state.name ? ", " + esc(state.name) : "");
  }

  function upcoming() {
    var t = today(), out = [];
    state.finance.subs.forEach(function (s) {
      if (!s.due) return;
      var n = daysBetween(t, parseD(s.due));
      if (n >= 0 && n <= 14) out.push({ n: n, html: "<b>" + esc(s.text) + "</b> renews · " + money(s.amount), href: "#/finance" });
    });
    Object.keys(state.travel.trips).forEach(function (id) {
      var tr = state.travel.trips[id];
      if (!tr.start) return;
      var n = daysBetween(t, parseD(tr.start));
      if (n >= 0 && n <= 60) out.push({ n: n, html: "<b>" + esc(tr.text || "Trip") + "</b> departs" + (tr.dest ? " for " + esc(tr.dest) : ""), href: "#/travel" });
    });
    for (var i = 1; i <= 7; i++) {
      var dk = ymd(addDays(t, i)), day = peekDay(dk);
      if (day) (day.tasks || []).filter(function (x) { return !x.done && x.prio === 1; }).forEach(function (x) { out.push({ n: i, html: "<b>" + esc(x.text) + "</b> — high priority", href: "#/day/" + dk }); });
    }
    out.sort(function (a, b) { return a.n - b.n; });
    if (!out.length) return '<div class="empty">A clear horizon — nothing due in the next two weeks.</div>';
    return '<ul class="list">' + out.slice(0, 7).map(function (o) {
      return '<li><span class="badge ' + (o.n <= 2 ? "pink" : "") + '">' + (o.n === 0 ? "Today" : o.n === 1 ? "Tomorrow" : "in " + o.n + "d") + '</span><a class="grow" style="text-decoration:none" href="' + o.href + '">' + o.html + "</a></li>";
    }).join("") + "</ul>";
  }

  function weekStrip(center) {
    var mon = mondayOf(center), tk = todayKey(), html = '<div class="week-strip">';
    for (var i = 0; i < 7; i++) {
      var d = addDays(mon, i), k = ymd(d), day = peekDay(k), open = day ? (day.tasks || []).filter(function (x) { return !x.done; }).length : 0;
      html += '<a class="' + (k === tk ? "today" : "") + '" href="' + hrefDay(d) + '"><div class="w">' + DOW3[i] + '</div><div class="n">' + d.getDate() + '</div><div class="p">' + (day && day.mood ? moodEmoji(day.mood) : open ? open + " open" : "·") + "</div></a>";
    }
    return html + "</div>";
  }

  function viewHome() {
    var t = today(), k = ymd(t);
    ensureDay(k);
    var mk = monthKey(t);
    var quote = QUOTES[(t.getDate() + t.getMonth()) % QUOTES.length];
    var hubs = NAV[1].items.concat(NAV[2].items);
    var left =
      card("Today's intentions", listEd("days." + k + ".tasks", { prio: true, placeholder: "Add a task for today…", empty: "Nothing planned yet — what would make today feel good?" }), { dot: "p", right: '<a class="btn sm ghost" href="' + hrefDay(t) + '">Open spread ' + ic("arrow") + "</a>" }) +
      card("This week", weekStrip(t), { dot: "b", right: '<a class="btn sm ghost" href="' + hrefWeek(t) + '">Week ' + isoWeek(t) + " " + ic("arrow") + "</a>" }) +
      card("Life hubs", '<div class="tile-links">' + hubs.map(function (h) { return '<a class="tile-link" href="#/' + h[0] + '">' + ic(h[2]) + "<span>" + esc(h[1]) + "</span></a>"; }).join("") + "</div>", { dot: "s" });
    var right =
      card("How are you feeling?", moodPicker("days." + k + ".mood") + '<div class="spacer"></div><label class="lbl">Hydration</label>' + waterPicker("days." + k + ".water"), { cls: "tint-pink", dot: "p" }) +
      card("Habits today", habitChecks(k), { dot: "l", right: '<a class="btn sm ghost" href="#/habits">Tracker</a>' }) +
      card("Coming up", upcoming(), { dot: "k" }) +
      card(MONTHS[t.getMonth()] + " intention", bindArea("months." + mk + ".intention", "One sentence to steer the month…", 'style="min-height:64px"') + '<div class="spacer"></div><p class="quote">“' + esc(quote) + "”</p>", { cls: "tint-butter", dot: "b" });
    return head(greeting(), prettyDay(t).replace(/, (.*)$/, ', <span class="em">$1</span>'), '<a class="btn pink" href="' + hrefDay(t) + '/review">' + ic("spark") + ' Reflect on today</a><a class="btn" href="' + hrefMonth(t) + '">' + ic("month") + " Month</a>") +
      '<div class="grid"><div class="c7 stack">' + left + '</div><div class="c5 stack">' + right + "</div></div>";
  }

  /* ------------------------------------------------------------ views: year */

  function viewYear(y) {
    var t = today(), tk = ymd(t), yk = String(y);
    if (!state.years[yk]) state.years[yk] = { word: "", vision: "", goals: [] };
    var minis = "";
    for (var m = 0; m < 12; m++) {
      var first = new Date(y, m, 1), lead = dowIdx(first), dim = daysInMonth(y, m);
      var cells = DOW1.map(function (x) { return '<span class="dow">' + x + "</span>"; }).join("");
      for (var i = 0; i < lead; i++) cells += "<span></span>";
      for (var d = 1; d <= dim; d++) {
        var k = y + "-" + pad(m + 1) + "-" + pad(d), day = peekDay(k);
        var has = day && ((day.tasks && day.tasks.length) || day.mood || day.notes);
        cells += '<span class="d ' + (k === tk ? "today" : has ? "has" : "") + '">' + d + "</span>";
      }
      var mo = state.months[y + "-" + pad(m + 1)];
      minis += '<a class="mini ' + (y === t.getFullYear() && m === t.getMonth() ? "current" : "") + '" href="#/month/' + y + "-" + pad(m + 1) + '"><div class="mini-head"><h3>' + MONTHS[m] + '</h3><span class="tiny">' + pad(m + 1) + '</span></div><div class="mini-cal">' + cells + '</div><div class="mini-foot">' + (mo && mo.intention ? "“" + esc(mo.intention) + "”" : "&nbsp;") + "</div></a>";
    }
    var s = periodStats(new Date(y, 0, 1), new Date(y, 11, 31));
    return head("Yearly spread", y + ' <span class="em">at a glance</span>', '<a class="btn pink" href="#/year/' + y + '/review">' + ic("spark") + " Yearly review</a>") +
      '<div class="grid"><div class="c4">' + card("Word of the year", bindInput("years." + yk + ".word", 'placeholder="e.g. Bloom" style="font-family:var(--serif);font-size:1.5rem;font-weight:600"'), { cls: "tint-pink", dot: "p" }) + "</div>" +
      '<div class="c8">' + card("Year so far", statsRow(s, [[money(s.spent), "Spent"]]), { dot: "b" }) + "</div>" +
      '<div class="c12"><div class="year-grid">' + minis + "</div></div>" +
      '<div class="c6">' + card("Big goals for " + y, listEd("years." + yk + ".goals", { placeholder: "Add a yearly goal…", empty: "Name three things that would make this year meaningful." }), { dot: "s" }) + "</div>" +
      '<div class="c6">' + card("Vision", bindArea("years." + yk + ".vision", "Describe the year you want to look back on…", 'style="min-height:170px"'), { dot: "l" }) + "</div></div>";
  }

  /* ------------------------------------------------------------ views: month */

  function viewMonth(y, m) {
    var mk = y + "-" + pad(m + 1), t = today(), tk = ymd(t);
    if (!state.months[mk]) state.months[mk] = {};
    var first = new Date(y, m, 1), start = mondayOf(first), last = new Date(y, m + 1, 0);
    var html = '<div class="month-cal"><span class="wk-sp"></span>' + DOW3.map(function (d) { return '<span class="dow">' + d + "</span>"; }).join("");
    for (var w = start; w <= last; w = addDays(w, 7)) {
      html += '<a class="wk-btn" href="' + hrefWeek(w) + '" title="Open week ' + isoWeek(w) + '">WK ' + isoWeek(w) + "</a>";
      for (var i = 0; i < 7; i++) {
        var d = addDays(w, i), k = ymd(d), day = peekDay(k), tasks = day ? day.tasks || [] : [];
        var dots = "";
        if (tasks.length) dots += "<i></i>";
        if (state.workouts.some(function (x) { return x.date === k; })) dots += '<i class="s"></i>';
        if (state.reviews["day:" + k]) dots += '<i class="p"></i>';
        html += '<a class="cell ' + (d.getMonth() !== m ? "out " : "") + (k === tk ? "today" : "") + '" href="' + hrefDay(d) + '"><span class="num">' + d.getDate() + '<span class="mood">' + (day && day.mood ? moodEmoji(day.mood) : "") + "</span></span>" +
          tasks.slice(0, 2).map(function (x) { return '<span class="t ' + (x.done ? "done" : "") + '">' + esc(x.text) + "</span>"; }).join("") +
          (tasks.length > 2 ? '<span class="more">+' + (tasks.length - 2) + " more</span>" : "") + '<span class="dots">' + dots + "</span></a>";
      }
    }
    html += "</div>";
    var s = periodStats(first, last);
    return head("Monthly spread", MONTHS[m] + ' <span class="em">' + y + "</span>", '<a class="btn" href="#/year/' + y + '">' + ic("year") + " Year</a>" + '<a class="btn pink" href="#/month/' + mk + '/review">' + ic("spark") + " Monthly review</a>") +
      '<div class="grid"><div class="c12">' + card("", html) + "</div>" +
      '<div class="c4">' + card("Intention", bindArea("months." + mk + ".intention", "How do you want this month to feel?"), { cls: "tint-pink", dot: "p" }) + "</div>" +
      '<div class="c4">' + card("Monthly goals", listEd("months." + mk + ".goals", { placeholder: "Add a goal…" }), { dot: "s" }) + "</div>" +
      '<div class="c4">' + card("Key dates", listEd("months." + mk + ".dates", { noCheck: true, placeholder: "e.g. 14 — Mum's birthday" }), { dot: "b" }) + "</div>" +
      '<div class="c8">' + card("Month so far", statsRow(s, [[money(s.spent), "Spent"]]), { dot: "k" }) + "</div>" +
      '<div class="c4">' + card("Notes", bindArea("months." + mk + ".notes", "Anything to remember…"), { dot: "l" }) + "</div></div>";
  }

  /* ------------------------------------------------------------ views: week */

  function viewWeek(mon) {
    var wk = ymd(mon), tk = todayKey();
    if (!state.weeks[wk]) state.weeks[wk] = {};
    var sun = addDays(mon, 6);
    var cols = "";
    for (var i = 0; i < 7; i++) {
      var d = addDays(mon, i), k = ymd(d);
      ensureDay(k);
      cols += '<div class="week-day ' + (k === tk ? "today" : "") + '"><a class="week-day-head" href="' + hrefDay(d) + '"><span class="n">' + d.getDate() + '</span><span class="w">' + DOW3[i] + (state.days[k].mood ? " " + moodEmoji(state.days[k].mood) : "") + "</span></a>" +
        listEd("days." + k + ".tasks", { prio: true, placeholder: "Add…" }) + "</div>";
    }
    var habitRows = state.habits.map(function (h) {
      var cells = "";
      for (var j = 0; j < 7; j++) {
        var k2 = ymd(addDays(mon, j)), on = !!(state.habitLog[k2] && state.habitLog[k2][h.id]);
        cells += '<td><button class="habit-cell ' + (on ? "on " : "") + (k2 === tk ? "today" : "") + '" style="' + (on ? "background:var(--" + h.color + ")" : "") + '" data-act="habit" data-date="' + k2 + '" data-id="' + h.id + '" aria-label="' + esc(h.text) + " " + DOW[j] + '" aria-pressed="' + on + '"></button></td>';
      }
      return '<tr><th class="name">' + esc(h.text) + "</th>" + cells + "</tr>";
    }).join("");
    var mealRows = MEAL_SLOTS.slice(0, 3).map(function (sl) {
      return "<tr><th class='name' style='font-size:12px'>" + sl[1] + "</th>" + DOW1.map(function (_, j) {
        var v = getP("meals." + wk + "." + j + "." + sl[0]);
        return '<td style="font-size:11px;color:var(--ink-soft);text-align:left;padding:2px 4px">' + esc(v || "·") + "</td>";
      }).join("") + "</tr>";
    }).join("");
    var s = periodStats(mon, sun);
    var title = (mon.getMonth() === sun.getMonth() ? mon.getDate() + "–" + sun.getDate() + ' <span class="em">' + MONTHS[mon.getMonth()] + "</span>" : mon.getDate() + " " + MON3[mon.getMonth()] + ' – <span class="em">' + sun.getDate() + " " + MON3[sun.getMonth()] + "</span>");
    return head("Weekly spread · Week " + isoWeek(mon) + " · " + mon.getFullYear(), title, '<a class="btn" href="' + hrefMonth(mon) + '">' + ic("month") + " Month</a>" + '<a class="btn pink" href="#/week/' + wk + '/review">' + ic("spark") + " Weekly review</a>") +
      '<div class="week-grid">' + cols + '<div class="week-day focus">' + '<div class="week-day-head"><span class="n" style="font-size:1.35rem">Weekly focus</span></div>' + bindArea("weeks." + wk + ".focus", "The one thing that matters most this week…", 'style="min-height:64px"') + '<div class="spacer"></div><label class="lbl">Priorities</label>' + listEd("weeks." + wk + ".priorities", { placeholder: "Add a priority…" }) + "</div></div><div class=\"spacer\"></div>" +
      '<div class="grid">' +
      '<div class="c5">' + card("Habit tracker", state.habits.length ? '<div class="scroll-x"><table class="habit-table" style="width:auto"><tr><th></th>' + DOW1.map(function (x) { return "<th>" + x + "</th>"; }).join("") + "</tr>" + habitRows + "</table></div>" : '<div class="empty">No habits yet.</div>', { dot: "l", right: '<a class="btn sm ghost" href="#/habits">Manage</a>' }) + "</div>" +
      '<div class="c7">' + card("Meals this week", '<div class="scroll-x"><table class="habit-table"><tr><th></th>' + DOW3.map(function (x) { return "<th>" + x + "</th>"; }).join("") + "</tr>" + mealRows + "</table></div>", { dot: "b", right: '<a class="btn sm ghost" data-act="meal-week" data-val="' + wk + '">Plan meals</a>' }) + "</div>" +
      '<div class="c8">' + card("Week at a glance", statsRow(s), { dot: "k" }) + "</div>" +
      '<div class="c4">' + card("Notes", bindArea("weeks." + wk + ".notes", "Reminders, ideas, loose ends…"), { dot: "s" }) + "</div></div>";
  }

  /* ------------------------------------------------------------ views: day */

  function viewDay(d) {
    var k = ymd(d), day = ensureDay(k), wk = ymd(mondayOf(d)), di = dowIdx(d);
    var nowH = new Date().getHours(), isToday = k === todayKey();
    var hours = '<div class="hours">';
    for (var h = 6; h <= 22; h++) {
      var lab = (h % 12 || 12) + (h < 12 ? " am" : " pm");
      hours += '<span class="h ' + (isToday && h === nowH ? "now" : "") + '">' + lab + "</span>" + bindInput("days." + k + ".schedule." + h, 'aria-label="' + lab + '"');
    }
    hours += "</div>";
    var top3 = [0, 1, 2].map(function (i) { return '<div class="row"><span class="badge pink">' + (i + 1) + "</span>" + bindInput("days." + k + ".top3." + i, 'placeholder="' + ["The one that matters most", "Then this", "And if there's time"][i] + '"') + "</div>"; }).join('<div style="height:8px"></div>');
    var meals = MEAL_SLOTS.map(function (sl) { return '<label class="lbl">' + sl[1] + "</label>" + bindInput("meals." + wk + "." + di + "." + sl[0], 'placeholder="—"'); }).join('<div style="height:8px"></div>');
    var nbPage = findDayPage(k);
    var links =
      '<div class="tile-links">' +
      '<button class="tile-link" data-act="journal-day" data-val="' + k + '">' + ic("book") + "<span>" + (nbPage ? "Open journal page" : "Start journal page") + "</span></button>" +
      '<a class="tile-link" href="#/habits">' + ic("dumbbell") + "<span>Habits & Fitness</span></a>" +
      '<a class="tile-link" href="#/meals">' + ic("bowl") + "<span>Meals</span></a>" +
      '<a class="tile-link" href="#/finance">' + ic("wallet") + "<span>Finance</span></a>" +
      '<a class="tile-link" href="#/mind">' + ic("lotus") + "<span>Mind</span></a>" +
      '<a class="tile-link" href="#/home-care">' + ic("house") + "<span>Chores</span></a></div>";
    var workouts = state.workouts.filter(function (w) { return w.date === k; });
    var left =
      card("Top three", top3, { cls: "tint-pink", dot: "p" }) +
      card("Tasks & deadlines", listEd("days." + k + ".tasks", { prio: true, placeholder: "Add a task…", empty: "No tasks yet." }), { dot: "b", right: '<span class="badge">' + day.tasks.filter(function (x) { return x.done; }).length + "/" + day.tasks.length + "</span>" }) +
      card("Schedule", hours, { dot: "k" }) +
      card("Notes", bindArea("days." + k + ".notes", "Thoughts, ideas, things to remember…", 'style="min-height:150px"'), { dot: "l" });
    var right =
      card("Mood & energy", moodPicker("days." + k + ".mood") + '<div class="spacer"></div>' + bindInput("days." + k + ".moodNote", 'placeholder="A word for how you feel…"'), { dot: "p" }) +
      card("Hydration", waterPicker("days." + k + ".water"), { dot: "k" }) +
      card("Habits", habitChecks(k), { dot: "l" }) +
      card("Meals", meals, { dot: "b", right: '<button class="btn sm ghost" data-act="meal-week" data-val="' + wk + '">Planner</button>' }) +
      card("Movement", workouts.length ? '<ul class="list">' + workouts.map(function (w) { return "<li><span class=\"badge sage\">" + esc(w.type) + '</span><span class="grow">' + esc(w.notes || "") + '</span><span class="meta">' + esc(w.minutes || 0) + " min</span></li>"; }).join("") + "</ul>" : '<div class="empty">No workout logged.</div>', { dot: "s", right: '<a class="btn sm ghost" href="#/habits" data-act="tab-go" data-key="habits" data-val="fitness">Log</a>' }) +
      card("Gratitude", bindArea("days." + k + ".gratitude", "Three small good things…"), { cls: "tint-butter", dot: "b" }) +
      card("Jump to", links, { dot: "s" });
    return head("Daily spread · Week " + isoWeek(d), DOW[di] + ' <span class="em">' + d.getDate() + " " + MONTHS[d.getMonth()] + "</span>", '<a class="btn" href="' + hrefWeek(d) + '">' + ic("week") + " Week</a>" + '<a class="btn pink" href="' + hrefDay(d) + '/review">' + ic("spark") + " Daily review</a>") +
      '<div class="grid"><div class="c7 stack">' + left + '</div><div class="c5 stack">' + right + "</div></div>";
  }

  /* ------------------------------------------------------------ views: reviews */

  var REVIEW_COPY = {
    day: { title: "Daily", wins: "What went well today?", hard: "What felt heavy or hard?", learn: "What did today teach me?", next: "Tomorrow's first steps" },
    week: { title: "Weekly", wins: "Wins worth celebrating", hard: "Where did I get stuck?", learn: "What will I do differently?", next: "Next week's priorities" },
    month: { title: "Monthly", wins: "Highlights of the month", hard: "What drained my energy?", learn: "Patterns I noticed", next: "Focus for next month" },
    year: { title: "Yearly", wins: "Proudest moments of the year", hard: "The hardest chapters", learn: "Lessons I'm carrying forward", next: "Intentions for next year" }
  };

  function viewReview(kind, key, label, start, end, back, extra) {
    var rk = kind + ":" + key, base = "reviews." + rk.replace(/\./g, "_");
    if (!state.reviews[rk.replace(/\./g, "_")]) state.reviews[rk.replace(/\./g, "_")] = {};
    var c = REVIEW_COPY[kind];
    var s = periodStats(start, end);
    var extraStats = kind === "month" || kind === "year" ? [[money(s.spent), "Spent"], [s.journal, "Journal pages"]] : [[s.journal, "Journal pages"]];
    var carry = kind === "day" ? '<button class="btn sm" data-act="carry" data-val="' + key + '">' + ic("arrow") + " Move unfinished tasks to tomorrow</button>" :
      kind === "week" ? '<button class="btn sm" data-act="carry-week" data-val="' + key + '">' + ic("arrow") + " Copy open priorities to next week</button>" : "";
    var left =
      card(c.wins, listEd(base + ".wins", { noCheck: true, placeholder: "Add a win…", empty: "Even small ones count." }), { cls: "tint-pink", dot: "p" }) +
      card(c.hard, bindArea(base + ".hard", "Be honest and gentle…"), { dot: "k" }) +
      card(c.learn, bindArea(base + ".learn", "Insights, patterns, notes to self…"), { dot: "l" });
    var right =
      card("How was this " + (kind === "day" ? "day" : kind) + "?", rating(base + ".rating", 10), { dot: "b" }) +
      card("Gratitude", bindArea(base + ".gratitude", "I'm thankful for…"), { cls: "tint-butter", dot: "b" }) +
      card(c.next, listEd(base + ".next", { placeholder: "Add a next step…" }) + (carry ? '<div class="spacer"></div>' + carry : ""), { dot: "s" }) +
      (extra || "");
    return head(c.title + " review · " + label, c.title + ' <span class="em">reflection</span>', '<a class="btn" href="' + back + '">' + ic("left") + " Back to spread</a>") +
      '<div class="grid"><div class="c12">' + card("Progress audit", statsRow(s, extraStats), { dot: "k" }) + '</div><div class="c7 stack">' + left + '</div><div class="c5 stack">' + right + "</div></div>";
  }

  /* ------------------------------------------------------------ views: habits & fitness */

  function streak(h) {
    var n = 0, d = today();
    if (!(state.habitLog[ymd(d)] || {})[h.id]) d = addDays(d, -1);
    while ((state.habitLog[ymd(d)] || {})[h.id]) { n++; d = addDays(d, -1); }
    return n;
  }

  function viewHabits() {
    var tb = tabs("habits", [["habits", "Habit tracker"], ["fitness", "Workouts"], ["body", "Body & hydration"]]);
    var body = "";
    if (tb.cur === "habits") {
      var mk = state.ui.habitMonth || monthKey(today()), md = parseD(mk + "-01"), y = md.getFullYear(), m = md.getMonth(), dim = daysInMonth(y, m), tk = todayKey();
      var th = '<tr><th class="name"></th>';
      for (var d = 1; d <= dim; d++) th += "<th>" + d + "<br>" + DOW1[dowIdx(new Date(y, m, d))] + "</th>";
      th += "<th>Streak</th><th></th></tr>";
      var rows = state.habits.map(function (h) {
        var r = '<tr><th class="name"><div class="row" style="gap:6px"><div class="swatches">' + COLORS.map(function (c) { return '<button class="swatch ' + (h.color === c ? "on" : "") + '" style="background:var(--' + c + ')" data-act="habit-color" data-id="' + h.id + '" data-val="' + c + '" aria-label="' + c + '"></button>'; }).join("") + "</div></div>" + itemInput("habits", h, "text", 'class="txt" style="margin-top:6px;padding:5px 8px" aria-label="Habit name"') + "</th>";
        var done = 0;
        for (var d2 = 1; d2 <= dim; d2++) {
          var k = y + "-" + pad(m + 1) + "-" + pad(d2), on = !!(state.habitLog[k] && state.habitLog[k][h.id]);
          if (on) done++;
          r += '<td><button class="habit-cell ' + (on ? "on " : "") + (k === tk ? "today" : "") + '" style="' + (on ? "background:var(--" + h.color + ")" : "") + '" data-act="habit" data-date="' + k + '" data-id="' + h.id + '" aria-label="' + esc(h.text) + " " + d2 + '" aria-pressed="' + on + '"></button></td>';
        }
        return r + '<td><span class="badge">' + streak(h) + "🔥</span></td><td><button class=\"del\" data-act=\"list-del\" data-path=\"habits\" data-id=\"" + h.id + '" aria-label="Delete habit">' + ic("x") + "</button></td></tr>";
      }).join("");
      body = card(MONTHS[m] + " " + y, '<div class="scroll-x"><table class="habit-table">' + th + rows + "</table></div>" +
        '<div class="adder" style="max-width:420px"><input type="text" placeholder="Add a new habit…" data-add="habits"><button class="icon-btn sm" data-act="list-add" data-path="habits" aria-label="Add habit">' + ic("plus") + "</button></div>",
        { dot: "p", right: '<div class="nav-arrows"><button class="icon-btn sm" data-act="habit-month" data-val="-1" aria-label="Previous month">' + ic("left") + '</button><button class="icon-btn sm" data-act="habit-month" data-val="1" aria-label="Next month">' + ic("right") + "</button></div>" });
    } else if (tb.cur === "fitness") {
      var wk = mondayOf(today()), wkMin = 0, wkCount = 0;
      state.workouts.forEach(function (w) { if (w.date >= ymd(wk)) { wkMin += num(w.minutes); wkCount++; } });
      var sorted = state.workouts.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      var table = sorted.length ? '<div class="scroll-x"><table class="table"><tr><th>Date</th><th>Type</th><th class="num">Minutes</th><th>Notes</th><th></th></tr>' + sorted.slice(0, 40).map(function (w) {
        return "<tr><td>" + itemInput("workouts", w, "date", "", "date") + "</td><td>" + itemSelect("workouts", w, "type", WORKOUT_TYPES) + '</td><td style="width:90px">' + itemInput("workouts", w, "minutes", "", "number") + "</td><td>" + itemInput("workouts", w, "notes") + '</td><td><button class="del" data-act="list-del" data-path="workouts" data-id="' + w.id + '" aria-label="Delete">' + ic("x") + "</button></td></tr>";
      }).join("") + "</table></div>" : '<div class="empty">No workouts logged yet.</div>';
      var form = '<div class="row wrap" data-form="workout"><input type="date" name="date" value="' + todayKey() + '" style="max-width:160px" aria-label="Date"><select name="type" style="max-width:140px" aria-label="Type">' + WORKOUT_TYPES.map(function (t) { return "<option>" + t + "</option>"; }).join("") + '</select><input type="number" name="minutes" placeholder="Min" style="max-width:90px" aria-label="Minutes"><input type="text" name="notes" placeholder="Notes — sets, distance, how it felt" class="grow" aria-label="Notes"><button class="btn pink" data-act="workout-add">' + ic("plus") + " Log</button></div>";
      body = '<div class="grid"><div class="c12">' + card("Log a workout", form, { cls: "tint-pink", dot: "p" }) + "</div>" +
        '<div class="c8">' + card("Workout log", table, { dot: "s" }) + "</div>" +
        '<div class="c4 stack">' + card("This week", '<div class="stats"><div class="stat"><span class="v">' + wkCount + '</span><span class="k">Sessions</span></div><div class="stat"><span class="v">' + wkMin + '</span><span class="k">Minutes</span></div></div><div class="spacer"></div><label class="lbl">Weekly target (min)</label>' + bindNum("fitnessTarget", 'placeholder="150" data-rerender') + '<div class="spacer"></div>' + progress((wkMin / (num(state.fitnessTarget) || 150)) * 100, "sage"), { dot: "k" }) +
        card("Milestones", listEd("milestones", { placeholder: "e.g. First 5k, 10 push-ups…", empty: "Set a milestone to chase." }), { cls: "tint-butter", dot: "b" }) + "</div></div>";
    } else {
      var ws = state.weights.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var pts = ws.filter(function (w) { return w.date && num(w.value); }).map(function (w) { var d = parseD(w.date); return { label: d.getDate() + " " + MON3[d.getMonth()], y: num(w.value) }; });
      var bars = [];
      for (var i = 13; i >= 0; i--) { var dd = addDays(today(), -i), day = peekDay(ymd(dd)); bars.push({ label: String(dd.getDate()), v: day ? day.water || 0 : 0 }); }
      var wtable = ws.length ? '<ul class="list">' + ws.slice().reverse().slice(0, 12).map(function (w) {
        return "<li>" + itemInput("weights", w, "date", 'style="max-width:160px"', "date") + itemInput("weights", w, "value", 'style="max-width:110px" aria-label="Weight"', "number") + '<span class="meta grow">' + esc(state.weightUnit || "kg") + '</span><button class="del" data-act="list-del" data-path="weights" data-id="' + w.id + '" aria-label="Delete">' + ic("x") + "</button></li>";
      }).join("") + "</ul>" : "";
      body = '<div class="grid"><div class="c8">' + card("Weight curve", lineChart(pts, { label: "Weight over time" }), { dot: "p", right: '<div style="width:110px">' + bindSelect("weightUnit", ["kg", "lb", "st"], 'data-rerender aria-label="Unit"') + "</div>" }) + "</div>" +
        '<div class="c4">' + card("Add a weigh-in", '<div class="row wrap" data-form="weight"><input type="date" name="date" value="' + todayKey() + '" aria-label="Date"><input type="number" name="value" step="0.1" placeholder="Weight" aria-label="Weight"><button class="btn pink" data-act="weight-add">' + ic("plus") + " Add</button></div>" + wtable, { cls: "tint-pink", dot: "p" }) + "</div>" +
        '<div class="c8">' + card("Hydration · last 14 days", barChart(bars, state.waterGoal), { dot: "k" }) + "</div>" +
        '<div class="c4">' + card("Today's water", waterPicker("days." + todayKey() + ".water") + '<div class="spacer"></div><label class="lbl">Daily goal (glasses)</label>' + bindNum("waterGoal", "data-rerender"), { dot: "k" }) + "</div></div>";
    }
    return head("Life · Wellness", 'Habits <span class="em">&amp; fitness</span>') + tb.html + body;
  }

  /* ------------------------------------------------------------ views: meals */

  function categorize(item) {
    var cats = Object.keys(GROCERY_WORDS);
    for (var i = 0; i < cats.length; i++) if (GROCERY_WORDS[cats[i]].test(item)) return cats[i];
    return "Other";
  }

  function viewMeals() {
    var tb = tabs("meals", [["plan", "Weekly plan"], ["recipes", "Recipe cards"], ["grocery", "Grocery list"]]);
    var body = "";
    if (tb.cur === "plan") {
      var wk = state.ui.mealWeek || ymd(mondayOf(today())), mon = parseD(wk);
      var g = '<div class="meal-grid"><span></span>' + DOW.map(function (d, i) { return '<span class="h">' + d.slice(0, 3) + " " + addDays(mon, i).getDate() + "</span>"; }).join("");
      MEAL_SLOTS.forEach(function (sl) {
        g += '<span class="rl">' + sl[1] + "</span>";
        for (var i = 0; i < 7; i++) g += '<textarea data-bind="meals.' + wk + "." + i + "." + sl[0] + '" aria-label="' + sl[1] + " " + DOW[i] + '" placeholder="—">' + esc(getP("meals." + wk + "." + i + "." + sl[0])) + "</textarea>";
      });
      g += "</div>";
      var names = state.recipes.map(function (r) { return '<button class="chip" data-act="copy-text" data-val="' + esc(r.text) + '">' + esc(r.text) + "</button>"; }).join("");
      body = card("Week of " + mon.getDate() + " " + MONTHS[mon.getMonth()], '<div class="scroll-x">' + g + "</div>", {
        dot: "p", right: '<div class="row"><button class="icon-btn sm" data-act="meal-week-step" data-val="-7" aria-label="Previous week">' + ic("left") + '</button><button class="icon-btn sm" data-act="meal-week-step" data-val="7" aria-label="Next week">' + ic("right") + '</button><button class="btn sm butter" data-act="meal-grocery">Build grocery list</button></div>'
      }) + '<div class="spacer"></div>' + card("Your recipes", '<p class="small muted" style="margin-top:0">Type a recipe name exactly into a meal slot and “Build grocery list” pulls its ingredients in. Tap to copy a name.</p><div class="chips">' + (names || '<span class="empty">No recipes yet.</span>') + "</div>", { dot: "b" });
    } else if (tb.cur === "recipes") {
      var cards = state.recipes.map(function (r) {
        return '<div class="recipe">' + itemInput("recipes", r, "text", 'class="txt" style="font-family:var(--serif);font-size:1.3rem;font-weight:600;background:transparent;box-shadow:none;padding:2px 0" aria-label="Recipe name"') +
          '<div class="row">' + itemSelect("recipes", r, "cat", RECIPE_CATS, 'style="padding:5px 8px;font-size:12px"') + itemInput("recipes", r, "time", 'placeholder="Time" style="padding:5px 8px;font-size:12px"') + itemInput("recipes", r, "serves", 'placeholder="Serves" style="padding:5px 8px;font-size:12px;max-width:70px"') + "</div>" +
          '<label class="lbl">Ingredients · one per line</label><textarea data-item="recipes|' + r.id + '|ingredients" style="min-height:110px;font-size:12.5px">' + esc(r.ingredients) + "</textarea>" +
          '<label class="lbl">Method</label><textarea data-item="recipes|' + r.id + '|method" style="min-height:70px;font-size:12.5px">' + esc(r.method) + "</textarea>" +
          '<div class="row" style="margin-top:4px"><button class="btn sm butter grow" data-act="recipe-grocery" data-id="' + r.id + '">' + ic("plus") + ' Add to groceries</button><button class="del" data-act="list-del" data-path="recipes" data-id="' + r.id + '" aria-label="Delete recipe">' + ic("trash") + "</button></div></div>";
      }).join("");
      body = '<div class="recipes">' + cards + '<button class="recipe v-add" style="min-height:260px" data-act="recipe-add">' + ic("plus") + "<span>New recipe card</span></button></div>";
    } else {
      var groups = {};
      state.grocery.forEach(function (g2) { (groups[g2.cat || "Other"] = groups[g2.cat || "Other"] || []).push(g2); });
      var left = state.grocery.filter(function (x) { return !x.done; }).length;
      var cols = GROCERY_CATS.filter(function (c) { return groups[c]; }).map(function (c) {
        return '<div class="grocery-cat"><h4>' + c + '</h4><ul class="list">' + groups[c].map(function (it) {
          return '<li class="' + (it.done ? "done" : "") + '"><input type="checkbox" class="check" data-item="grocery|' + it.id + '|done" data-rerender ' + (it.done ? "checked" : "") + ' aria-label="Got it">' + itemInput("grocery", it, "text", 'class="txt"') + '<button class="del" data-act="list-del" data-path="grocery" data-id="' + it.id + '" aria-label="Delete">' + ic("x") + "</button></li>";
        }).join("") + "</ul></div>";
      }).join("");
      body = card("Shopping list", '<div class="row wrap" data-form="grocery"><input type="text" name="text" class="grow" placeholder="Add an item — it sorts itself into an aisle…" data-enter="grocery-add" aria-label="Item"><select name="cat" style="max-width:160px" aria-label="Aisle"><option value="">Auto aisle</option>' + GROCERY_CATS.map(function (c) { return "<option>" + c + "</option>"; }).join("") + '</select><button class="btn pink" data-act="grocery-add">' + ic("plus") + ' Add</button></div><div class="spacer"></div>' +
        (cols ? '<div class="grocery-cats">' + cols + "</div>" : '<div class="empty">Your list is empty — add items or build it from your meal plan.</div>'),
        { dot: "p", right: '<div class="row"><span class="badge">' + left + ' to get</span><button class="btn sm" data-act="grocery-clear">Clear checked</button></div>' });
    }
    return head("Life · Nourish", 'Meals <span class="em">&amp; recipes</span>') + tb.html + body;
  }

  /* ------------------------------------------------------------ views: finance */

  function finMonth(mk) {
    var f = state.finance.months[mk];
    if (!f) f = state.finance.months[mk] = {};
    if (!Array.isArray(f.income)) f.income = [];
    if (!Array.isArray(f.expenses)) f.expenses = [];
    return f;
  }
  function subMonthly(s) { return s.cycle === "yearly" ? num(s.amount) / 12 : s.cycle === "weekly" ? (num(s.amount) * 52) / 12 : num(s.amount); }

  function viewFinance() {
    var mk = state.ui.finMonth || monthKey(today()), md = parseD(mk + "-01"), f = finMonth(mk);
    var tb = tabs("finance", [["overview", "Overview"], ["budget", "Income & spending"], ["savings", "Savings & debt"], ["subs", "Subscriptions"]]);
    var income = sum(f.income, function (x) { return x.amount; }), spent = sum(f.expenses, function (x) { return x.amount; });
    var subs = sum(state.finance.subs, subMonthly);
    var saved = sum(state.finance.pots, function (p) { return p.saved; });
    var monthNav = '<div class="row"><button class="icon-btn sm" data-act="fin-month" data-val="-1" aria-label="Previous month">' + ic("left") + '</button><span class="badge pink">' + MON3[md.getMonth()] + " " + md.getFullYear() + '</span><button class="icon-btn sm" data-act="fin-month" data-val="1" aria-label="Next month">' + ic("right") + "</button></div>";
    var body = "";
    if (tb.cur === "overview") {
      var byCat = {};
      f.expenses.forEach(function (e) { byCat[e.cat || "Other"] = (byCat[e.cat || "Other"] || 0) + num(e.amount); });
      var segs = Object.keys(byCat).map(function (c) { return { label: c, value: byCat[c] }; }).sort(function (a, b) { return b.value - a.value; });
      var subsSoon = state.finance.subs.slice().filter(function (s) { return s.due; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; }).slice(0, 5);
      body = '<div class="grid"><div class="c12">' + card("", '<div class="stats"><div class="stat"><span class="v">' + money(income) + '</span><span class="k">Income</span></div><div class="stat"><span class="v">' + money(spent) + '</span><span class="k">Spent</span></div><div class="stat"><span class="v">' + money(income - spent) + '</span><span class="k">Left over</span></div><div class="stat"><span class="v">' + money(subs) + '</span><span class="k">Subscriptions / mo</span></div><div class="stat"><span class="v">' + money(saved) + '</span><span class="k">In savings pots</span></div></div>') + "</div>" +
        '<div class="c7">' + card("Where it went", donut(segs, "Spent"), { dot: "p" }) + "</div>" +
        '<div class="c5 stack">' + card("Budget health", '<label class="lbl">Spent of income</label>' + progress(income ? (spent / income) * 100 : 0) + '<div class="small muted" style="margin-top:8px">' + (income ? Math.round((spent / income) * 100) + "% of this month's income used" : "Add income to see your budget health.") + "</div>", { dot: "b" }) +
        card("Next renewals", subsSoon.length ? '<ul class="list">' + subsSoon.map(function (s) { var n = daysBetween(today(), parseD(s.due)); return '<li><span class="grow">' + esc(s.text) + '</span><span class="meta">' + (n < 0 ? "overdue" : n === 0 ? "today" : "in " + n + "d") + "</span><b>" + money(s.amount) + "</b></li>"; }).join("") + "</ul>" : '<div class="empty">No subscriptions tracked.</div>', { dot: "k" }) + "</div></div>";
    } else if (tb.cur === "budget") {
      var ip = "finance.months." + mk + ".income", ep = "finance.months." + mk + ".expenses";
      var incRows = f.income.map(function (x) { return "<tr><td>" + itemInput(ip, x, "text", 'aria-label="Source"') + '</td><td style="width:130px">' + itemInput(ip, x, "amount", 'aria-label="Amount"', "number") + '</td><td><button class="del" data-act="list-del" data-path="' + ip + '" data-id="' + x.id + '" aria-label="Delete">' + ic("x") + "</button></td></tr>"; }).join("");
      var expRows = f.expenses.slice().sort(function (a, b) { return (a.date || "") < (b.date || "") ? 1 : -1; }).map(function (x) {
        return '<tr><td style="width:150px">' + itemInput(ep, x, "date", "", "date") + "</td><td>" + itemInput(ep, x, "text", 'aria-label="What"') + '</td><td style="width:140px">' + itemSelect(ep, x, "cat", FIN_CATS) + '</td><td style="width:120px">' + itemInput(ep, x, "amount", 'aria-label="Amount"', "number") + '</td><td><button class="del" data-act="list-del" data-path="' + ep + '" data-id="' + x.id + '" aria-label="Delete">' + ic("x") + "</button></td></tr>";
      }).join("");
      body = '<div class="grid"><div class="c4">' + card("Income", '<table class="table">' + incRows + "</table>" + '<div class="row" style="margin-top:10px" data-form="income"><input type="text" name="text" placeholder="Salary, freelance…" aria-label="Income source"><input type="number" name="amount" placeholder="Amount" style="max-width:110px" aria-label="Amount"><button class="icon-btn sm" data-act="fin-add" data-kind="income" aria-label="Add income">' + ic("plus") + '</button></div><div class="divider"></div><div class="row"><span class="grow muted">Total</span><b>' + money(income) + "</b></div>", { cls: "tint-butter", dot: "b" }) + "</div>" +
        '<div class="c8">' + card("Spending", '<div class="row wrap" data-form="expense"><input type="date" name="date" value="' + (mk === monthKey(today()) ? todayKey() : mk + "-01") + '" style="max-width:150px" aria-label="Date"><input type="text" name="text" placeholder="What was it?" class="grow" aria-label="Expense"><select name="cat" style="max-width:140px" aria-label="Category">' + FIN_CATS.map(function (c) { return "<option>" + c + "</option>"; }).join("") + '</select><input type="number" name="amount" placeholder="Amount" style="max-width:110px" aria-label="Amount"><button class="btn pink" data-act="fin-add" data-kind="expense">' + ic("plus") + " Add</button></div>" +
          (expRows ? '<div class="scroll-x" style="margin-top:12px"><table class="table"><tr><th>Date</th><th>Item</th><th>Category</th><th>Amount</th><th></th></tr>' + expRows + "</table></div>" : '<div class="empty" style="margin-top:12px">No spending logged this month.</div>') +
          '<div class="divider"></div><div class="row"><span class="grow muted">Total spent</span><b>' + money(spent) + "</b></div>", { dot: "p" }) + "</div></div>";
    } else if (tb.cur === "savings") {
      var pots = state.finance.pots.map(function (p) {
        var pct = num(p.target) ? (num(p.saved) / num(p.target)) * 100 : 0;
        return '<div class="pot">' + itemInput("finance.pots", p, "text", 'class="txt" style="font-family:var(--serif);font-size:1.2rem;font-weight:600;background:transparent;box-shadow:none;padding:0" aria-label="Pot name"') +
          '<div class="row" style="margin:10px 0"><div class="grow"><label class="lbl">Saved</label>' + itemInput("finance.pots", p, "saved", "data-rerender", "number") + '</div><div class="grow"><label class="lbl">Target</label>' + itemInput("finance.pots", p, "target", "data-rerender", "number") + "</div></div>" +
          progress(pct) + '<div class="row" style="margin-top:8px"><span class="small muted grow">' + Math.round(pct) + '% there</span><button class="del" data-act="list-del" data-path="finance.pots" data-id="' + p.id + '" aria-label="Delete pot">' + ic("trash") + "</button></div></div>";
      }).join("");
      var debts = state.finance.debts.map(function (d) {
        var paid = num(d.start) ? (1 - num(d.balance) / num(d.start)) * 100 : 0;
        return "<tr><td>" + itemInput("finance.debts", d, "text", 'aria-label="Debt"') + '</td><td style="width:120px">' + itemInput("finance.debts", d, "start", "data-rerender", "number") + '</td><td style="width:120px">' + itemInput("finance.debts", d, "balance", "data-rerender", "number") + '</td><td style="width:90px">' + itemInput("finance.debts", d, "rate", 'placeholder="%"', "number") + '</td><td style="min-width:120px">' + progress(paid, "sage") + '<span class="small muted">' + Math.round(clamp(paid, 0, 100)) + '% paid</span></td><td><button class="del" data-act="list-del" data-path="finance.debts" data-id="' + d.id + '" aria-label="Delete">' + ic("x") + "</button></td></tr>";
      }).join("");
      body = card("Savings pots", '<div class="pots">' + pots + '<button class="pot v-add" style="min-height:150px" data-act="pot-add">' + ic("plus") + "<span>New savings pot</span></button></div>", { dot: "b", right: '<span class="badge">' + money(saved) + " saved</span>" }) +
        '<div class="spacer"></div>' + card("Debt paydown", (debts ? '<div class="scroll-x"><table class="table"><tr><th>Debt</th><th>Started at</th><th>Balance now</th><th>Rate</th><th>Progress</th><th></th></tr>' + debts + "</table></div>" : '<div class="empty">Debt-free, or not tracking any yet.</div>') + '<div class="spacer"></div><button class="btn sm" data-act="debt-add">' + ic("plus") + " Add debt</button>", { dot: "s", right: '<span class="badge sage">' + money(sum(state.finance.debts, function (d) { return d.balance; })) + " remaining</span>" });
    } else {
      var rows = state.finance.subs.map(function (s) {
        var n = s.due ? daysBetween(today(), parseD(s.due)) : null;
        return "<tr><td>" + itemInput("finance.subs", s, "text", 'aria-label="Subscription"') + '</td><td style="width:110px">' + itemInput("finance.subs", s, "amount", "data-rerender", "number") + '</td><td style="width:120px">' + itemSelect("finance.subs", s, "cycle", [["monthly", "Monthly"], ["yearly", "Yearly"], ["weekly", "Weekly"]], "data-rerender") + '</td><td style="width:160px">' + itemInput("finance.subs", s, "due", "data-rerender", "date") +
          '</td><td><span class="badge ' + (n != null && n <= 3 ? "pink" : "") + '">' + (n == null ? "—" : n < 0 ? "overdue" : n === 0 ? "today" : "in " + n + "d") + '</span></td><td><button class="btn sm" data-act="sub-paid" data-id="' + s.id + '">' + ic("check") + ' Paid</button></td><td><button class="del" data-act="list-del" data-path="finance.subs" data-id="' + s.id + '" aria-label="Delete">' + ic("x") + "</button></td></tr>";
      }).join("");
      body = card("Recurring subscriptions", (rows ? '<div class="scroll-x"><table class="table"><tr><th>Service</th><th>Amount</th><th>Cycle</th><th>Next due</th><th></th><th></th><th></th></tr>' + rows + "</table></div>" : '<div class="empty">Add Netflix, gym, cloud storage… and never miss a renewal.</div>') +
        '<div class="spacer"></div><button class="btn sm" data-act="sub-add">' + ic("plus") + " Add subscription</button>", { dot: "k", right: '<span class="badge">' + money(subs) + " / month · " + money(subs * 12) + " / year</span>" });
    }
    return head("Life · Money", 'Finance <span class="em">&amp; subscriptions</span>', monthNav) + tb.html + body;
  }

  /* ------------------------------------------------------------ views: mind */

  var IKIGAI = [
    ["love", "What you love", 200, 128, "var(--pink)"],
    ["good", "What you're good at", 128, 200, "var(--butter)"],
    ["world", "What the world needs", 272, 200, "var(--sage)"],
    ["paid", "What you can be paid for", 200, 272, "var(--sky)"]
  ];

  function viewMind() {
    var tb = tabs("mind", [["ikigai", "Ikigai"], ["wheel", "Level 10 Life"], ["smart", "SMART goals"], ["matrix", "Eisenhower matrix"], ["mood", "Mood log"]]);
    var body = "";
    if (tb.cur === "ikigai") {
      var focus = state.ui.ikigai || "love";
      var circles = IKIGAI.map(function (c) {
        return '<circle cx="' + c[2] + '" cy="' + c[3] + '" r="92" fill="' + c[4] + '" fill-opacity="' + (focus === c[0] ? ".95" : ".7") + '" stroke="' + (focus === c[0] ? "var(--ink)" : "none") + '" stroke-width="1.5" data-act="ikigai" data-val="' + c[0] + '"><title>' + c[1] + "</title></circle>";
      }).join("");
      var labels = '<text x="200" y="78" text-anchor="middle" font-size="15">Love</text><text x="66" y="204" text-anchor="middle" font-size="15">Skill</text><text x="334" y="204" text-anchor="middle" font-size="15">Need</text><text x="200" y="332" text-anchor="middle" font-size="15">Paid</text>' +
        '<text class="sub" x="150" y="150" text-anchor="middle">Passion</text><text class="sub" x="250" y="150" text-anchor="middle">Mission</text><text class="sub" x="150" y="256" text-anchor="middle">Profession</text><text class="sub" x="250" y="256" text-anchor="middle">Vocation</text><text x="200" y="206" text-anchor="middle" font-size="17" font-style="italic">ikigai</text>';
      var fields = IKIGAI.map(function (c) {
        return '<div><label class="lbl" style="display:flex;align-items:center;gap:8px"><span class="dotmark" style="background:' + c[4] + '"></span>' + c[1] + "</label>" + bindArea("mind.ikigai." + c[0], "", 'style="min-height:' + (focus === c[0] ? 120 : 64) + 'px" data-focus-ikigai="' + c[0] + '"') + "</div>";
      }).join("");
      body = '<div class="ikigai-wrap">' + card("Your four circles", '<svg class="ikigai-svg" viewBox="0 0 400 400" role="img" aria-label="Ikigai diagram — tap a circle to reflect on it">' + circles + labels + '</svg><p class="small muted" style="text-align:center">Tap a circle to reflect on it. Where all four overlap is your ikigai — your reason for being.</p>', { dot: "p" }) +
        '<div class="stack">' + card("Reflect", '<div class="stack">' + fields + "</div>", { dot: "b" }) + card("My ikigai", bindArea("mind.ikigai.center", "Pull the threads together in one sentence…"), { cls: "tint-pink", dot: "p" }) + "</div></div>";
    } else if (tb.cur === "wheel") {
      var vals = WHEEL.map(function (w) { return num(getP("mind.wheel." + slug(w) + ".now")); });
      var sliders = WHEEL.map(function (w) {
        var p = "mind.wheel." + slug(w);
        return '<div><div class="row"><span class="grow" style="font-weight:500">' + esc(w) + '</span><span class="badge pink" data-out="' + p + '.now">' + (num(getP(p + ".now")) || 0) + '/10</span></div><input type="range" min="0" max="10" step="1" value="' + (num(getP(p + ".now")) || 0) + '" data-bind="' + p + '.now" data-type="num" data-rerender aria-label="' + esc(w) + ' rating"><input type="text" style="margin-top:8px;font-size:12px;padding:7px 10px" data-bind="' + p + '.ten" value="' + esc(getP(p + ".ten")) + '" placeholder="What would a 10 look like?"></div>';
      }).join("");
      var avg = sum(vals) / vals.length;
      body = '<div class="grid"><div class="c6">' + card("Your wheel", radar(vals, WHEEL) + '<div class="stats" style="margin-top:12px"><div class="stat"><span class="v">' + avg.toFixed(1) + '</span><span class="k">Average</span></div><div class="stat"><span class="v text">' + esc(WHEEL[vals.indexOf(Math.min.apply(null, vals))]) + '</span><span class="k">Needs love</span></div></div>', { dot: "p" }) + "</div>" +
        '<div class="c6">' + card("Rate each area 1–10", '<div class="stack">' + sliders + "</div>", { dot: "b" }) + "</div></div>";
    } else if (tb.cur === "smart") {
      var goals = state.mind.smart.map(function (g) {
        var p = "mind.smart";
        return card(itemInput(p, g, "text", 'class="txt" placeholder="Goal title" style="font-family:var(--serif);font-size:1.35rem;font-weight:600;background:transparent;box-shadow:none;padding:0" aria-label="Goal title"'),
          '<div class="smart">' + [["s", "S", "Specific — what exactly?"], ["m", "M", "Measurable — how will I know?"], ["a", "A", "Achievable — what makes it doable?"], ["r", "R", "Relevant — why does it matter?"], ["t", "T", "Time-bound — by when?"]].map(function (f) {
            return '<div><label class="lbl smart-l"><span style="font-family:var(--serif);font-size:1.3rem;font-weight:700;color:var(--pink-deep)">' + f[1] + "</span> " + f[2].split(" — ")[0] + '</label><textarea data-item="' + p + "|" + g.id + "|" + f[0] + '" placeholder="' + esc(f[2].split(" — ")[1]) + '">' + esc(g[f[0]]) + "</textarea></div>";
          }).join("") + '</div><div class="row" style="margin-top:14px"><label class="lbl" style="margin:0">Deadline</label>' + itemInput(p, g, "due", 'style="max-width:170px"', "date") + '<label class="lbl" style="margin:0 0 0 10px">Progress</label><input type="range" min="0" max="100" step="5" class="grow" value="' + (num(g.progress) || 0) + '" data-item="' + p + "|" + g.id + '|progress" data-type="num" aria-label="Progress"><span class="badge pink">' + (num(g.progress) || 0) + '%</span><button class="del" data-act="list-del" data-path="' + p + '" data-id="' + g.id + '" aria-label="Delete goal">' + ic("trash") + "</button></div>", { cls: "" });
      }).join('<div class="spacer"></div>');
      body = (goals || card("", '<div class="empty">A SMART goal is Specific, Measurable, Achievable, Relevant and Time-bound. Start one below.</div>')) + '<div class="spacer"></div><button class="btn pink" data-act="smart-add">' + ic("plus") + " New SMART goal</button>";
    } else if (tb.cur === "matrix") {
      var q = [["q1", "Do first", "Urgent · Important"], ["q2", "Schedule", "Not urgent · Important"], ["q3", "Delegate", "Urgent · Not important"], ["q4", "Let go", "Not urgent · Not important"]];
      body = '<div class="matrix">' + q.map(function (x) { return '<div class="quad ' + x[0] + '"><h4>' + x[1] + '</h4><div class="tiny">' + x[2] + "</div>" + listEd("mind.matrix." + x[0], { placeholder: "Add…" }) + "</div>"; }).join("") + "</div>";
    } else {
      var mk = state.ui.moodMonth || monthKey(today()), md = parseD(mk + "-01"), y = md.getFullYear(), m = md.getMonth();
      var cells = DOW1.map(function (x) { return '<div class="blank tiny" style="display:grid;place-items:center">' + x + "</div>"; }).join("");
      for (var i = 0; i < dowIdx(md); i++) cells += '<div class="blank"></div>';
      var counts = {};
      for (var d = 1; d <= daysInMonth(y, m); d++) {
        var k = y + "-" + pad(m + 1) + "-" + pad(d), day = peekDay(k), mv = day && day.mood;
        if (mv) counts[mv] = (counts[mv] || 0) + 1;
        cells += '<div title="' + d + (day && day.moodNote ? " — " + esc(day.moodNote) : "") + '" style="' + (mv ? "background:" + ["", "var(--lilac)", "var(--sky)", "var(--surface)", "var(--butter-soft)", "var(--pink-soft)"][mv] : "") + '">' + (mv ? moodEmoji(mv) : '<span class="tiny">' + d + "</span>") + "</div>";
      }
      var dist = MOODS.map(function (mm) { return '<div class="row"><span style="width:26px">' + mm.e + '</span><span class="grow">' + progress(((counts[mm.v] || 0) / Math.max(1, sum(Object.keys(counts).map(function (c) { return counts[c]; })))) * 100) + '</span><span class="small muted" style="width:26px;text-align:right">' + (counts[mm.v] || 0) + "</span></div>"; }).join('<div style="height:8px"></div>');
      body = '<div class="grid"><div class="c7">' + card(MONTHS[m] + " " + y, '<div class="mood-cal">' + cells + "</div>", { dot: "p", right: '<div class="nav-arrows"><button class="icon-btn sm" data-act="mood-month" data-val="-1" aria-label="Previous month">' + ic("left") + '</button><button class="icon-btn sm" data-act="mood-month" data-val="1" aria-label="Next month">' + ic("right") + "</button></div>" }) + "</div>" +
        '<div class="c5 stack">' + card("Today", moodPicker("days." + todayKey() + ".mood") + '<div class="spacer"></div>' + bindArea("days." + todayKey() + ".moodNote", "What's behind the feeling?", 'style="min-height:70px"'), { cls: "tint-pink", dot: "p" }) + card("This month's moods", dist, { dot: "b" }) + "</div></div>";
    }
    return head("Life · Mind", 'Mental <span class="em">wellbeing</span>') + tb.html + body;
  }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-"); }

  /* ------------------------------------------------------------ views: travel */

  function viewTravel() {
    var trips = Object.keys(state.travel.trips).map(function (id) { return state.travel.trips[id]; }).sort(function (a, b) { return (a.start || "9") < (b.start || "9") ? -1 : 1; });
    var cur = state.ui.trip && state.travel.trips[state.ui.trip] ? state.travel.trips[state.ui.trip] : trips[0];
    var list = trips.map(function (t) {
      return '<button class="trip-pill ' + (cur && cur.id === t.id ? "on" : "") + '" data-act="trip-open" data-id="' + t.id + '"><b>' + esc(t.text || "Untitled trip") + '</b><span class="small muted">' + esc(t.dest || "Somewhere lovely") + (t.start ? " · " + shortDay(parseD(t.start)) : "") + "</span></button>";
    }).join("");
    var side = card("Trips", '<div class="trip-list">' + list + '</div><div class="spacer"></div><button class="btn pink" data-act="trip-add">' + ic("plus") + " Plan a trip</button>", { dot: "p" }) +
      card("Bucket list", listEd("travel.bucket", { placeholder: "Somewhere you dream of…", empty: "Northern lights? Kyoto in spring?" }), { cls: "tint-butter", dot: "b" });
    var main = "";
    if (!cur) {
      main = card("", '<div class="empty" style="padding:40px 10px;text-align:center">Plan your first getaway — itinerary, packing, outfits and budget all in one place.</div>');
    } else {
      var p = "travel.trips." + cur.id;
      var nights = cur.start && cur.end ? daysBetween(parseD(cur.start), parseD(cur.end)) : null;
      var until = cur.start ? daysBetween(today(), parseD(cur.start)) : null;
      var tt = tabs("trip", [["itinerary", "Itinerary"], ["packing", "Packing"], ["outfits", "Outfits"], ["budget", "Budget"]]);
      var inner = "";
      var dayMeta = function (path) { return function (it) { return '<input type="date" data-item="' + path + "|" + it.id + '|day" value="' + esc(it.day || "") + '" style="max-width:150px;padding:5px 8px;font-size:12px" aria-label="Day">'; }; };
      if (tt.cur === "itinerary") inner = listEd(p + ".itinerary", { noCheck: false, meta: dayMeta(p + ".itinerary"), placeholder: "Add a plan, booking or reservation…", empty: "Flights, stays, tables booked, sights to see…" });
      else if (tt.cur === "packing") {
        var pk = listAt(p + ".packing"), got = pk.filter(function (x) { return x.done; }).length;
        inner = '<div class="row" style="margin-bottom:12px"><span class="grow">' + progress(pk.length ? (got / pk.length) * 100 : 0) + '</span><span class="badge">' + got + "/" + pk.length + ' packed</span><button class="btn sm" data-act="pack-essentials" data-id="' + cur.id + '">Add essentials</button></div>' + listEd(p + ".packing", { placeholder: "Add something to pack…" });
      } else if (tt.cur === "outfits") inner = listEd(p + ".outfits", { meta: dayMeta(p + ".outfits"), placeholder: "Linen dress + sandals for dinner…", empty: "Plan a look per day so packing is easy." });
      else {
        var ex = listAt(p + ".expenses"), total = sum(ex, function (x) { return x.amount; }), budget = num(cur.budget);
        inner = '<div class="row" style="margin-bottom:12px"><span class="grow">' + progress(budget ? (total / budget) * 100 : 0) + '</span><span class="badge ' + (budget && total > budget ? "pink" : "") + '">' + money(total) + " of " + money(budget) + "</span></div>" +
          '<table class="table">' + ex.map(function (x) { return "<tr><td>" + itemSelect(p + ".expenses", x, "cat", ["Transport", "Stay", "Food", "Activities", "Shopping", "Other"]) + "</td><td>" + itemInput(p + ".expenses", x, "text") + '</td><td style="width:120px">' + itemInput(p + ".expenses", x, "amount", "data-rerender", "number") + '</td><td><button class="del" data-act="list-del" data-path="' + p + '.expenses" data-id="' + x.id + '" aria-label="Delete">' + ic("x") + "</button></td></tr>"; }).join("") + "</table>" +
          '<div class="spacer"></div><button class="btn sm" data-act="trip-expense" data-id="' + cur.id + '">' + ic("plus") + " Add expense</button>";
      }
      main = card("", '<div class="row wrap" style="align-items:flex-end"><div class="grow" style="min-width:200px"><label class="lbl">Trip</label>' + bindInput(p + ".text", 'style="font-family:var(--serif);font-size:1.4rem;font-weight:600"') + '</div><div class="grow" style="min-width:160px"><label class="lbl">Destination</label>' + bindInput(p + ".dest", 'placeholder="City, country"') + "</div></div>" +
        '<div class="row wrap" style="margin-top:12px"><div><label class="lbl">Depart</label><input type="date" data-bind="' + p + '.start" data-rerender value="' + esc(cur.start || "") + '"></div><div><label class="lbl">Return</label><input type="date" data-bind="' + p + '.end" data-rerender value="' + esc(cur.end || "") + '"></div><div style="max-width:140px"><label class="lbl">Budget</label>' + bindNum(p + ".budget", "data-rerender") + '</div><div class="grow"></div>' +
        (until != null && until >= 0 ? '<span class="badge pink">' + (until === 0 ? "Today!" : until + " days to go") + "</span>" : "") + (nights != null && nights > 0 ? '<span class="badge">' + nights + " nights</span>" : "") +
        '<button class="del" data-act="trip-del" data-id="' + cur.id + '" aria-label="Delete trip" title="Delete trip">' + ic("trash") + "</button></div>", { cls: "tint-pink" }) +
        '<div class="spacer"></div>' + tt.html + card("", inner);
    }
    return head("Life · Adventure", 'Travel <span class="em">&amp; vacations</span>') + '<div class="grid"><div class="c4 stack">' + side + '</div><div class="c8">' + main + "</div></div>";
  }

  /* ------------------------------------------------------------ views: home care */

  function chorePeriod(freq) {
    var t = today();
    if (freq === "daily") return { key: ymd(t), label: prettyDay(t) };
    if (freq === "weekly") return { key: "w" + ymd(mondayOf(t)), label: "Week " + isoWeek(t) };
    if (freq === "monthly") return { key: monthKey(t), label: MONTHS[t.getMonth()] + " " + t.getFullYear() };
    return seasonKey(t);
  }

  function viewHomeCare() {
    var tb = tabs("chores", CHORE_FREQ);
    var per = chorePeriod(tb.cur);
    var chores = state.chores.filter(function (c) { return c.freq === tb.cur; });
    var rooms = [];
    state.chores.forEach(function (c) { if (rooms.indexOf(c.room) < 0) rooms.push(c.room); });
    var doneMap = state.choreDone[per.key] || {};
    var done = chores.filter(function (c) { return doneMap[c.id]; }).length;
    var cards = rooms.filter(function (r) { return chores.some(function (c) { return c.room === r; }); }).map(function (r) {
      return '<div class="room"><h4 style="margin-bottom:6px">' + esc(r) + '</h4><ul class="list">' + chores.filter(function (c) { return c.room === r; }).map(function (c) {
        var on = !!doneMap[c.id];
        return '<li class="' + (on ? "done" : "") + '"><input type="checkbox" class="check" data-bind="choreDone.' + per.key + "." + c.id + '" data-rerender ' + (on ? "checked" : "") + ' aria-label="Done">' + itemInput("chores", c, "text", 'class="txt"') + itemInput("chores", c, "who", 'placeholder="who" style="max-width:70px;padding:4px 8px;font-size:11px" aria-label="Assigned to"') + '<button class="del" data-act="list-del" data-path="chores" data-id="' + c.id + '" aria-label="Delete">' + ic("x") + "</button></li>";
      }).join("") + "</ul></div>";
    }).join("");
    var form = '<div class="row wrap" data-form="chore"><input type="text" name="text" class="grow" placeholder="New ' + tb.cur + ' chore…" aria-label="Chore"><input type="text" name="room" list="room-list" placeholder="Room" style="max-width:170px" aria-label="Room"><datalist id="room-list">' + rooms.map(function (r) { return '<option value="' + esc(r) + '">'; }).join("") + '</datalist><button class="btn pink" data-act="chore-add" data-val="' + tb.cur + '">' + ic("plus") + " Add</button></div>";
    return head("Life · Home", 'Home care <span class="em">&amp; chores</span>') + tb.html +
      '<div class="grid"><div class="c8">' + card(per.label, progress(chores.length ? (done / chores.length) * 100 : 0, "sage") + '<div class="small muted" style="margin-top:8px">' + done + " of " + chores.length + " " + tb.cur + " chores done · resets automatically each " + (tb.cur === "seasonal" ? "season" : tb.cur.replace("ly", "").replace("dai", "day")) + "</div>", { cls: "tint-butter", dot: "b" }) + "</div>" +
      '<div class="c4">' + card("Add a chore", form, { dot: "p" }) + "</div>" +
      '<div class="c12"><div class="rooms">' + (cards || '<div class="empty">No ' + tb.cur + " chores yet.</div>") + "</div></div></div>";
  }

  /* ------------------------------------------------------------ views: notebook */

  function newPage(paper, extra) {
    var id = uid(), t = Date.now();
    var pg = { id: id, paper: paper, title: "", created: t, updated: t, text: "", ink: "", topic: "", cues: "", summary: "" };
    if (paper === "two" || paper === "three") pg.cols = [0, 1, 2].slice(0, paper === "two" ? 2 : 3).map(function () { return { id: uid(), h: "", t: "" }; });
    if (paper === "mindmap") pg.nodes = [{ id: uid(), text: "Central idea", x: 50, y: 50, parent: null }];
    if (paper === "vision") pg.tiles = [0, 1, 2, 3].map(function (i) { return { id: uid(), text: ["Feel", "Grow", "Explore", "Create"][i], color: COLORS[i], img: "" }; });
    Object.assign(pg, extra || {});
    state.notebook[id] = pg;
    save();
    return pg;
  }
  function findDayPage(k) {
    var ids = Object.keys(state.notebook);
    for (var i = 0; i < ids.length; i++) if (state.notebook[ids[i]].date === k) return state.notebook[ids[i]];
    return null;
  }
  function paperLabel(id) { var p = PAPERS.filter(function (x) { return x[0] === id; })[0]; return p ? p[1] : id; }

  function viewNotebookIndex() {
    var pages = Object.keys(state.notebook).map(function (id) { return state.notebook[id]; }).sort(function (a, b) { return b.updated - a.updated; });
    var opts = PAPERS.map(function (p) { return '<button class="paper-opt" data-act="nb-new" data-val="' + p[0] + '"><div class="sw paper paper-' + p[0] + '"></div><span>' + p[1] + "</span></button>"; }).join("");
    var list = pages.map(function (p) {
      var thumb = p.paper === "vision" && p.tiles && p.tiles.filter(function (t) { return t.img; })[0] ? '<img alt="" src="' + p.tiles.filter(function (t) { return t.img; })[0].img + '">' : p.ink ? '<img alt="" src="' + p.ink + '" style="object-fit:contain;object-position:top left">' : "";
      var d = new Date(p.updated);
      return '<a class="nb-page" href="#/notebook/' + p.id + '"><div class="sw paper paper-' + p.paper + '">' + thumb + '</div><div class="row"><div class="grow"><b style="font-family:var(--serif);font-size:1.1rem">' + esc(p.title || (p.date ? shortDay(parseD(p.date)) : "Untitled page")) + '</b><div class="small muted">' + paperLabel(p.paper) + " · " + shortDay(d) + "</div></div></div></a>";
    }).join("");
    return head("Journal", 'Notebook <span class="em">&amp; journal</span>') +
      card("Choose your paper", '<div class="papers">' + opts + "</div>", { dot: "p" }) + '<div class="spacer"></div>' +
      card("Your pages", list ? '<div class="nb-pages">' + list + "</div>" : '<div class="empty">No pages yet — pick a paper above to begin.</div>', { dot: "b", right: '<span class="badge">' + pages.length + " pages</span>" });
  }

  var pen = { tool: "type", color: "#3b3431", size: 3 };
  var INKS = ["#3b3431", "#c9788b", "#b8932e", "#5f9a6b", "#5b86ad", "#9b87c4"];
  var DRAWABLE = ["blank", "lined", "grid", "dot", "cornell", "two", "three"];

  function viewNotebookPage(id) {
    var p = state.notebook[id];
    if (!p) return head("Journal", "Page not found") + '<a class="btn" href="#/notebook">Back to notebook</a>';
    var base = "notebook." + id;
    var canDraw = DRAWABLE.indexOf(p.paper) >= 0;
    if (!canDraw && pen.tool !== "type") pen.tool = "type";
    var tools = '<a class="icon-btn" href="#/notebook" aria-label="Back to notebook">' + ic("left") + "</a>" +
      '<input type="text" data-bind="' + base + '.title" value="' + esc(p.title) + '" placeholder="Page title" style="max-width:240px;font-family:var(--serif);font-size:1.15rem;font-weight:600" aria-label="Page title">' +
      '<select data-act-change="nb-paper" data-id="' + id + '" style="max-width:160px" aria-label="Paper style">' + PAPERS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === p.paper ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select>" +
      '<span class="sep"></span>';
    if (canDraw) {
      tools += [["type", "type", "Type"], ["pen", "pen", "Pen"], ["marker", "marker", "Highlighter"], ["eraser", "eraser", "Eraser"]].map(function (t) {
        return '<button class="icon-btn ' + (pen.tool === t[0] ? "on" : "") + '" data-act="pen-tool" data-val="' + t[0] + '" aria-label="' + t[2] + '" title="' + t[2] + '" aria-pressed="' + (pen.tool === t[0]) + '">' + ic(t[1]) + "</button>";
      }).join("") + '<span class="sep"></span>' + INKS.map(function (c) { return '<button class="color-dot ' + (pen.color === c ? "on" : "") + '" style="background:' + c + '" data-act="pen-color" data-val="' + c + '" aria-label="Ink ' + c + '"></button>'; }).join("") +
        '<input type="range" min="1" max="12" value="' + pen.size + '" style="max-width:90px" data-act-input="pen-size" aria-label="Pen size">' +
        '<button class="icon-btn" data-act="ink-undo" aria-label="Undo stroke" title="Undo">' + ic("undo") + '</button><button class="icon-btn" data-act="ink-clear" aria-label="Clear drawing" title="Clear drawing">' + ic("eraser") + "</button>";
    } else if (p.paper === "mindmap") {
      tools += '<button class="btn sm pink" data-act="mm-add" data-id="' + id + '">' + ic("branch") + ' Add branch</button><button class="btn sm" data-act="mm-del" data-id="' + id + '">' + ic("trash") + ' Remove selected</button><span class="small muted">Drag bubbles to arrange · double-click the canvas to add</span>';
    } else if (p.paper === "vision") {
      tools += '<button class="btn sm pink" data-act="vb-add" data-id="' + id + '">' + ic("plus") + " Add tile</button>";
    }
    tools += '<button class="icon-btn" style="margin-left:auto" data-act="nb-del" data-id="' + id + '" aria-label="Delete page" title="Delete page">' + ic("trash") + "</button>";

    var inner = "";
    var cls = "paper paper-" + (["cornell", "two", "three"].indexOf(p.paper) >= 0 ? "lined" : p.paper === "mindmap" ? "dot" : p.paper);
    if (["blank", "lined", "grid", "dot"].indexOf(p.paper) >= 0) {
      inner = '<textarea class="write" data-bind="' + base + '.text" placeholder="' + (p.date ? "Dear diary…" : "Start writing…") + '" aria-label="Page text">' + esc(p.text) + "</textarea>";
    } else if (p.paper === "cornell") {
      inner = '<div class="cornell"><div class="title-zone"><input type="text" data-bind="' + base + '.topic" value="' + esc(p.topic) + '" placeholder="Topic · lecture · date" style="background:transparent;box-shadow:none;font-family:var(--serif);font-size:1.3rem;font-weight:600;padding:4px 0" aria-label="Topic"></div>' +
        '<div class="zone cue"><span class="tiny">Cues &amp; questions</span><textarea data-bind="' + base + '.cues" aria-label="Cues">' + esc(p.cues) + '</textarea></div><div class="zone"><span class="tiny">Notes</span><textarea data-bind="' + base + '.text" aria-label="Notes">' + esc(p.text) + '</textarea></div><div class="zone summary"><span class="tiny">Summary</span><textarea data-bind="' + base + '.summary" aria-label="Summary">' + esc(p.summary) + "</textarea></div></div>";
    } else if (p.paper === "two" || p.paper === "three") {
      var cols = p.cols || [];
      inner = '<div class="cols" style="grid-template-columns:repeat(' + cols.length + ',minmax(0,1fr))">' + cols.map(function (c, i) {
        return '<div class="zone"><input type="text" data-item="' + base + ".cols|" + c.id + '|h" value="' + esc(c.h) + '" placeholder="Column ' + (i + 1) + '" aria-label="Column heading"><textarea data-item="' + base + ".cols|" + c.id + '|t" aria-label="Column ' + (i + 1) + '">' + esc(c.t) + "</textarea></div>";
      }).join("") + "</div>";
    } else if (p.paper === "mindmap") {
      inner = '<div class="mindmap" data-mm="' + id + '"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>' + (p.nodes || []).map(function (n) {
        return '<textarea class="mm-node ' + (n.parent ? "" : "root") + '" data-node="' + n.id + '" data-item="' + base + ".nodes|" + n.id + '|text" style="left:' + n.x + "%;top:" + n.y + "%;" + (n.parent ? "background:var(--" + (n.color || "butter-soft") + ")" : "") + '" rows="1" aria-label="Idea">' + esc(n.text) + "</textarea>";
      }).join("") + "</div>";
    } else if (p.paper === "vision") {
      inner = '<div class="vision">' + (p.tiles || []).map(function (t) {
        return '<div class="v-tile" style="background:var(--' + (t.color || "pink") + ')">' + (t.img ? '<img alt="" src="' + t.img + '">' : "") +
          '<div class="v-actions"><label class="icon-btn sm" title="Add image" aria-label="Add image">' + ic("image") + '<input type="file" accept="image/*" hidden data-upload="' + base + ".tiles|" + t.id + '"></label><button class="icon-btn sm" data-act="vb-color" data-path="' + base + '.tiles" data-id="' + t.id + '" aria-label="Change colour">' + ic("spark") + '</button><button class="icon-btn sm" data-act="list-del" data-path="' + base + '.tiles" data-id="' + t.id + '" aria-label="Remove tile">' + ic("x") + "</button></div>" +
          '<textarea data-item="' + base + ".tiles|" + t.id + '|text" rows="2" placeholder="Affirmation or dream…" aria-label="Caption">' + esc(t.text) + "</textarea></div>";
      }).join("") + '<button class="v-add" data-act="vb-add" data-id="' + id + '">' + ic("plus") + " Add tile</button></div>";
    }
    var drawing = canDraw && pen.tool !== "type";
    return '<div class="nb-toolbar">' + tools + "</div>" +
      '<div class="sheet-page ' + cls + (drawing ? " drawing" : "") + '" data-page="' + id + '">' + inner + (canDraw ? '<canvas aria-label="Drawing layer"></canvas>' : "") + "</div>" +
      '<p class="small muted" style="margin-top:14px">' + paperLabel(p.paper) + " · created " + shortDay(new Date(p.created)) + (p.date ? ' · <a href="' + hrefDay(parseD(p.date)) + '">linked to ' + shortDay(parseD(p.date)) + "</a>" : "") + "</p>";
  }

  var undoStack = [];
  function mountCanvas(id) {
    var wrap = $(".sheet-page[data-page]");
    var cv = wrap && wrap.querySelector("canvas");
    if (!cv) return;
    var p = state.notebook[id];
    var dpr = window.devicePixelRatio || 1, w = wrap.clientWidth, h = wrap.clientHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    function paint(src) {
      ctx.clearRect(0, 0, w, h);
      if (!src) return;
      var img = new Image();
      img.onload = function () { ctx.drawImage(img, 0, 0, w, img.height * (w / img.width)); };
      img.src = src;
    }
    paint(p.ink);
    cv._paint = paint;
    var drawing = false, last = null;
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure || 0.5 }; }
    function style() {
      ctx.globalCompositeOperation = pen.tool === "eraser" ? "destination-out" : "source-over";
      ctx.globalAlpha = pen.tool === "marker" ? 0.28 : 1;
      ctx.strokeStyle = pen.tool === "marker" ? "#f2d57e" : pen.color;
      ctx.lineWidth = pen.tool === "marker" ? 18 : pen.tool === "eraser" ? 22 : pen.size;
    }
    cv.addEventListener("pointerdown", function (e) {
      if (pen.tool === "type") return;
      e.preventDefault();
      drawing = true;
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      undoStack.push(p.ink || "");
      if (undoStack.length > 25) undoStack.shift();
      last = pos(e);
      style();
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(last.x + 0.01, last.y + 0.01); ctx.stroke();
    });
    cv.addEventListener("pointermove", function (e) {
      if (!drawing) return;
      var pt = pos(e);
      style();
      if (pen.tool === "pen" && e.pointerType === "pen") ctx.lineWidth = pen.size * (0.5 + pt.p);
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
      last = pt;
    });
    function end() {
      if (!drawing) return;
      drawing = false;
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      p.ink = cv.toDataURL("image/png");
      p.updated = Date.now();
      save();
    }
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.addEventListener("pointerleave", end);
  }

  function mountMindmap(id) {
    var root = $("[data-mm]");
    if (!root) return;
    var p = state.notebook[id];
    var svg = root.querySelector("svg");
    function lines() {
      var byId = {};
      p.nodes.forEach(function (n) { byId[n.id] = n; });
      svg.innerHTML = p.nodes.filter(function (n) { return n.parent && byId[n.parent]; }).map(function (n) {
        var a = byId[n.parent], mx = (a.x + n.x) / 2;
        return '<path d="M' + a.x + " " + a.y + " C " + mx + " " + a.y + ", " + mx + " " + n.y + ", " + n.x + " " + n.y + '" fill="none" stroke="var(--pink-deep)" stroke-opacity=".55" stroke-width="2" vector-effect="non-scaling-stroke"/>';
      }).join("");
    }
    lines();
    root._lines = lines;
    $$(".mm-node", root).forEach(function (el) {
      autosize(el);
      var node = p.nodes.filter(function (n) { return n.id === el.dataset.node; })[0];
      var start = null, moved = false;
      el.addEventListener("focus", function () { state.ui.mmSel = node.id; });
      el.addEventListener("pointerdown", function (e) {
        if (document.activeElement === el) return;
        e.preventDefault();
        start = { x: e.clientX, y: e.clientY };
        moved = false;
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      });
      el.addEventListener("pointermove", function (e) {
        if (!start) return;
        if (Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y) > 4) moved = true;
        if (!moved) return;
        var r = root.getBoundingClientRect();
        node.x = clamp(((e.clientX - r.left) / r.width) * 100, 4, 96);
        node.y = clamp(((e.clientY - r.top) / r.height) * 100, 3, 97);
        el.style.left = node.x + "%"; el.style.top = node.y + "%";
        lines();
      });
      el.addEventListener("pointerup", function () {
        if (!start) return;
        start = null;
        if (moved) { p.updated = Date.now(); save(); } else el.focus();
      });
      el.addEventListener("input", function () { autosize(el); });
    });
    root.addEventListener("dblclick", function (e) {
      if (e.target !== root && e.target !== svg) return;
      var r = root.getBoundingClientRect();
      addNode(p, state.ui.mmSel || p.nodes[0].id, ((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
    });
  }
  function autosize(el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
  function addNode(p, parentId, x, y) {
    var parent = p.nodes.filter(function (n) { return n.id === parentId; })[0] || p.nodes[0];
    if (x == null) {
      var kids = p.nodes.filter(function (n) { return n.parent === parent.id; }).length;
      var ang = (kids * 57 + (parent.parent ? 20 : -90)) * (Math.PI / 180);
      x = clamp(parent.x + Math.cos(ang) * (parent.parent ? 16 : 26), 8, 92);
      y = clamp(parent.y + Math.sin(ang) * (parent.parent ? 12 : 22), 6, 94);
    }
    var n = { id: uid(), text: "", x: x, y: y, parent: parent.id, color: ["pink-soft", "butter-soft", "sage", "sky", "lilac"][p.nodes.length % 5] };
    p.nodes.push(n);
    p.updated = Date.now();
    save();
    render();
    var el = $('[data-node="' + n.id + '"]');
    if (el) el.focus();
  }

  function compressImage(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 900, s = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = function () { toast("That image couldn't be read."); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  /* ------------------------------------------------------------ views: sync (monday.com) */

  var syncBusy = false;
  function syncLog(msg) {
    state.sync.log.unshift(new Date().toLocaleTimeString() + "  " + msg);
    state.sync.log = state.sync.log.slice(0, 60);
    save();
  }
  function mondayQ(query, variables) {
    if (!state.sync.token) return Promise.reject(new Error("Add your monday.com API token first."));
    return fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: state.sync.token, "API-Version": "2024-10" },
      body: JSON.stringify({ query: query, variables: variables || {} })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); }).then(function (res) {
      var j = res.j;
      if (j.errors && j.errors.length) throw new Error(j.errors.map(function (e) { return e.message; }).join("; "));
      if (j.error_message) throw new Error(j.error_message);
      if (!res.ok) throw new Error("HTTP error from monday.com");
      return j.data;
    });
  }
  function syncRange() {
    var t = today(), sc = state.sync.scope;
    if (sc === "today") return [t, t];
    if (sc === "month") return [new Date(t.getFullYear(), t.getMonth(), 1), new Date(t.getFullYear(), t.getMonth() + 1, 0)];
    var m = mondayOf(t); return [m, addDays(m, 6)];
  }
  function boardColumns() {
    return mondayQ("query($b:[ID!]){ boards(ids:$b){ name columns{ id title type } } }", { b: [String(state.sync.boardId)] }).then(function (d) {
      var b = d.boards && d.boards[0];
      if (!b) throw new Error("Board " + state.sync.boardId + " not found — check the board ID and token permissions.");
      state.sync.boardName = b.name;
      var status = b.columns.filter(function (c) { return c.type === "status"; })[0];
      var date = b.columns.filter(function (c) { return c.type === "date"; })[0];
      return { name: b.name, status: status && status.id, date: date && date.id };
    });
  }
  function runSync(kind) {
    if (syncBusy) return;
    if (!state.sync.boardId) { toast("Add the board ID first."); return; }
    syncBusy = true;
    render();
    var p;
    if (kind === "test") {
      p = boardColumns().then(function (c) { syncLog("Connected to board “" + c.name + "” · status column: " + (c.status || "none") + " · date column: " + (c.date || "none")); });
    } else if (kind === "push") {
      p = boardColumns().then(function (cols) {
        var r = syncRange(), jobs = [];
        for (var d = r[0]; d <= r[1]; d = addDays(d, 1)) {
          var k = ymd(d), day = peekDay(k);
          if (!day) continue;
          (day.tasks || []).forEach(function (t) { if (t.text) jobs.push({ t: t, k: k }); });
        }
        var created = 0, updated = 0;
        return jobs.reduce(function (chain, job) {
          return chain.then(function () {
            var v = {};
            if (cols.status) v[cols.status] = { label: job.t.done ? "Done" : "Working on it" };
            if (cols.date) v[cols.date] = { date: job.k };
            var itemId = state.sync.map[job.t.id];
            if (itemId) {
              return mondayQ("mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b, item_id:$i, column_values:$v, create_labels_if_missing:true){ id } }", { b: String(state.sync.boardId), i: String(itemId), v: JSON.stringify(v) })
                .then(function () { updated++; });
            }
            return mondayQ("mutation($b:ID!,$n:String!,$v:JSON){ create_item(board_id:$b, item_name:$n, column_values:$v, create_labels_if_missing:true){ id } }", { b: String(state.sync.boardId), n: job.t.text, v: JSON.stringify(v) })
              .then(function (dd) { state.sync.map[job.t.id] = dd.create_item.id; created++; });
          });
        }, Promise.resolve()).then(function () { syncLog("Pushed " + jobs.length + " task(s): " + created + " created, " + updated + " updated on “" + cols.name + "”."); });
      });
    } else {
      p = mondayQ("query($b:[ID!]){ boards(ids:$b){ name items_page(limit:100){ items{ id name column_values{ id type text } } } } }", { b: [String(state.sync.boardId)] }).then(function (d) {
        var b = d.boards && d.boards[0];
        if (!b) throw new Error("Board not found.");
        var items = b.items_page.items.map(function (it) {
          var st = it.column_values.filter(function (c) { return c.type === "status"; })[0];
          var dt = it.column_values.filter(function (c) { return c.type === "date"; })[0];
          return { id: it.id, name: it.name, status: st ? st.text || "" : "", date: dt && dt.text ? dt.text.slice(0, 10) : "" };
        });
        state.sync.pulled = items;
        var inverse = {};
        Object.keys(state.sync.map).forEach(function (tid) { inverse[state.sync.map[tid]] = tid; });
        var changed = 0;
        items.forEach(function (it) {
          var tid = inverse[it.id];
          if (!tid) return;
          Object.keys(state.days).forEach(function (k) {
            (state.days[k].tasks || []).forEach(function (t) {
              if (t.id === tid) {
                var done = /done|complete/i.test(it.status);
                if (!!t.done !== done) { t.done = done; changed++; }
                if (t.text !== it.name) { t.text = it.name; changed++; }
              }
            });
          });
        });
        syncLog("Pulled " + items.length + " item(s) from “" + b.name + "” · " + changed + " local change(s) applied.");
      });
    }
    p.catch(function (e) { syncLog("⚠ " + e.message); toast(e.message); }).then(function () { syncBusy = false; save(); render(); });
  }

  function viewSync() {
    var s = state.sync, inverse = {};
    Object.keys(s.map).forEach(function (tid) { inverse[s.map[tid]] = tid; });
    var pulled = s.pulled.length ? '<div class="scroll-x"><table class="table"><tr><th>Item</th><th>Status</th><th>Date</th><th></th></tr>' + s.pulled.map(function (it) {
      return "<tr><td>" + esc(it.name) + '</td><td><span class="status-pill">' + esc(it.status || "—") + "</span></td><td>" + esc(it.date || "—") + "</td><td>" + (inverse[it.id] ? '<span class="badge sage">linked</span>' : '<button class="btn sm" data-act="sync-import" data-id="' + esc(it.id) + '">' + ic("download") + " Import</button>") + "</td></tr>";
    }).join("") + "</table></div>" : '<div class="empty">Pull from your board to see its items here.</div>';
    var busy = syncBusy ? " disabled" : "";
    return head("System · Integrations", 'Live board <span class="em">sync</span>', s.boardName ? '<span class="badge sage">Connected · ' + esc(s.boardName) + "</span>" : "") +
      '<div class="grid"><div class="c5 stack">' + card("Connect your monday board", '<p class="small muted" style="margin-top:0">Sync planner tasks, deadlines and statuses with your <b>PDF Digital Planner</b> monday.com board. Create a personal API token in monday.com under <i>Avatar → Developers → My access tokens</i>. The token stays in this browser only and is sent directly to api.monday.com.</p>' +
        '<label class="lbl">API token</label><input type="password" data-bind="sync.token" value="' + esc(s.token) + '" placeholder="eyJhbGciOi…" autocomplete="off"><div class="spacer"></div>' +
        '<label class="lbl">Board ID</label>' + bindInput("sync.boardId", 'placeholder="e.g. 1234567890" inputmode="numeric"') + '<p class="small muted">The number in your board URL: monday.com/boards/<b>1234567890</b></p>' +
        '<button class="btn" data-act="sync-run" data-val="test"' + busy + ">" + ic("check") + " Test connection</button>", { cls: "tint-pink", dot: "p" }) +
        card("Push planner → board", '<label class="lbl">Which tasks</label>' + bindSelect("sync.scope", [["today", "Today"], ["week", "This week"], ["month", "This month"]]) + '<p class="small muted">Each task becomes an item; its day fills the first date column and done/open sets the first status column (“Done” / “Working on it”). Re-pushing updates the linked item instead of duplicating it.</p><button class="btn pink" data-act="sync-run" data-val="push"' + busy + ">" + ic("upload") + " Push tasks</button>", { dot: "b" }) + "</div>" +
        '<div class="c7 stack">' + card("Board items", '<div class="row" style="margin-bottom:12px"><button class="btn butter" data-act="sync-run" data-val="pull"' + busy + ">" + ic("sync") + (syncBusy ? " Syncing…" : " Pull & sync statuses") + '</button><span class="small muted">Linked tasks pick up status and name changes made on the board.</span></div>' + pulled, { dot: "k" }) +
        card("Activity", s.log.length ? '<div class="sync-log inset">' + esc(s.log.join("\n")) + "</div>" : '<div class="empty">No sync activity yet.</div>', { dot: "l" }) + "</div></div>";
  }

  /* ------------------------------------------------------------ views: settings */

  function viewSettings() {
    return head("System", 'Settings <span class="em">&amp; data</span>') +
      '<div class="grid"><div class="c6">' + card("Personalise", '<label class="lbl">Your name</label>' + bindInput("name", 'placeholder="For your greeting"') + '<div class="spacer"></div>' +
        '<div class="row"><div class="grow"><label class="lbl">Currency symbol</label>' + bindInput("currency", 'maxlength="3"') + '</div><div class="grow"><label class="lbl">Water goal (glasses)</label>' + bindNum("waterGoal") + "</div></div>" +
        '<div class="spacer"></div><label class="lbl">Theme</label><div class="chips"><button class="chip ' + (state.theme !== "dark" ? "on" : "") + '" data-act="set" data-path="theme" data-val="light">Soft light</button><button class="chip ' + (state.theme === "dark" ? "on" : "") + '" data-act="set" data-path="theme" data-val="dark">Soft dark</button></div>', { cls: "tint-pink", dot: "p" }) + "</div>" +
      '<div class="c6">' + card("Your data", '<p class="small muted" style="margin-top:0">Everything is saved automatically in this browser. Export a backup to move between devices.</p><div class="row wrap"><button class="btn butter" data-act="export">' + ic("download") + ' Export JSON</button><label class="btn">' + ic("upload") + ' Import JSON<input type="file" accept="application/json" hidden data-import></label><button class="btn danger" data-act="reset">' + ic("trash") + " Reset planner</button></div>", { dot: "b" }) + "</div></div>";
  }

  /* ------------------------------------------------------------ render */

  var view = $("#view");
  var lastRouteKey = "";

  function render() {
    var r = parseRoute();
    var key = r.name + "/" + (r.a || "") + "/" + (r.b || "");
    var routeChanged = key !== lastRouteKey;
    lastRouteKey = key;

    var active = document.activeElement, focusSel = null, ss = null, se = null;
    if (!routeChanged && active && view.contains(active)) {
      ["data-add", "data-bind", "data-item"].some(function (a) {
        if (active.hasAttribute(a)) { focusSel = "[" + a + '="' + active.getAttribute(a).replace(/"/g, '\\"') + '"]'; return true; }
        return false;
      });
      try { ss = active.selectionStart; se = active.selectionEnd; } catch (e) { /* not a text input */ }
    }

    var html = "", mount = null;
    try {
      switch (r.name) {
        case "year": {
          var y = parseInt(r.a, 10) || today().getFullYear();
          focusDate = focusDate.getFullYear() === y ? focusDate : new Date(y, y === today().getFullYear() ? today().getMonth() : 0, y === today().getFullYear() ? today().getDate() : 1);
          html = r.b === "review" ? viewReview("year", String(y), String(y), new Date(y, 0, 1), new Date(y, 11, 31), hrefYear(focusDate)) : viewYear(y);
          break;
        }
        case "month": {
          var md = r.a && /^\d{4}-\d{2}$/.test(r.a) ? parseD(r.a + "-01") : new Date(today().getFullYear(), today().getMonth(), 1);
          if (monthKey(focusDate) !== monthKey(md)) focusDate = monthKey(md) === monthKey(today()) ? today() : md;
          html = r.b === "review" ? viewReview("month", monthKey(md), MONTHS[md.getMonth()] + " " + md.getFullYear(), md, new Date(md.getFullYear(), md.getMonth() + 1, 0), hrefMonth(md)) : viewMonth(md.getFullYear(), md.getMonth());
          break;
        }
        case "week": {
          var mon = mondayOf(r.a && /^\d{4}-\d{2}-\d{2}$/.test(r.a) ? parseD(r.a) : today());
          if (ymd(mondayOf(focusDate)) !== ymd(mon)) focusDate = ymd(mon) === ymd(mondayOf(today())) ? today() : mon;
          html = r.b === "review" ? viewReview("week", ymd(mon), "Week " + isoWeek(mon) + ", " + mon.getFullYear(), mon, addDays(mon, 6), hrefWeek(mon)) : viewWeek(mon);
          break;
        }
        case "day": {
          var dd = r.a && /^\d{4}-\d{2}-\d{2}$/.test(r.a) ? parseD(r.a) : today();
          focusDate = dd;
          html = r.b === "review" ? viewReview("day", ymd(dd), prettyDay(dd), dd, dd, hrefDay(dd)) : viewDay(dd);
          break;
        }
        case "habits": html = viewHabits(); break;
        case "meals": html = viewMeals(); break;
        case "finance": html = viewFinance(); break;
        case "mind": html = viewMind(); break;
        case "travel": html = viewTravel(); break;
        case "home-care": html = viewHomeCare(); break;
        case "notebook":
          if (r.a) {
            html = viewNotebookPage(r.a);
            var pid = r.a;
            mount = function () {
              var p = state.notebook[pid];
              if (!p) return;
              if (DRAWABLE.indexOf(p.paper) >= 0) mountCanvas(pid);
              if (p.paper === "mindmap") mountMindmap(pid);
            };
            if (routeChanged) undoStack = [];
          } else html = viewNotebookIndex();
          break;
        case "sync": html = viewSync(); break;
        case "settings": html = viewSettings(); break;
        default: r.name = "home"; focusDate = today(); html = viewHome();
      }
    } catch (err) {
      console.error(err);
      html = head("Oops", "Something went sideways") + '<p class="muted">' + esc(err.message) + '</p><a class="btn" href="#/home">Go home</a>';
    }

    document.documentElement.dataset.theme = state.theme === "dark" ? "dark" : "light";
    renderChrome(r);
    view.innerHTML = html;
    if (mount) mount();
    closeSheet();

    if (routeChanged) {
      window.scrollTo(0, 0);
    } else if (focusSel) {
      var el = view.querySelector(focusSel);
      if (el) {
        el.focus({ preventScroll: true });
        try { if (ss != null) el.setSelectionRange(ss, se); } catch (e) { /* ignore */ }
      }
    }
  }

  /* ------------------------------------------------------------ sheet + toast */

  function openSheet() {
    var html = '<div class="card-head"><h3>All sections</h3><button class="icon-btn sm" data-act="sheet-close" aria-label="Close">' + ic("x") + "</button></div>";
    NAV.forEach(function (g) {
      html += '<div class="nav-label">' + g.group + '</div><div class="tile-links" style="margin-bottom:10px">' + g.items.map(function (it) { return '<a class="tile-link" href="' + navHref(it[0]) + '">' + ic(it[2]) + "<span>" + esc(it[1]) + "</span></a>"; }).join("") + "</div>";
    });
    html += '<div class="row" style="margin-top:6px"><a class="btn" href="../">' + ic("arrow") + ' Slow Ink</a><button class="btn" data-act="theme">' + ic(state.theme === "dark" ? "sun" : "moon") + (state.theme === "dark" ? " Light mode" : " Dark mode") + "</button></div>";
    $("#sheet").innerHTML = html;
    $("#sheet").hidden = false;
    $("#sheet-scrim").hidden = false;
  }
  function closeSheet() { $("#sheet").hidden = true; $("#sheet-scrim").hidden = true; }

  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  /* ------------------------------------------------------------ input handling */

  function applyInput(el) {
    var val = el.type === "checkbox" ? el.checked : el.dataset.type === "num" ? (el.value === "" ? "" : num(el.value)) : el.value;
    var path = null;
    if (el.dataset.bind) {
      path = el.dataset.bind;
      setP(path, val);
    } else if (el.dataset.item) {
      var parts = el.dataset.item.split("|");
      path = parts[0];
      var it = listAt(parts[0]).filter(function (x) { return x.id === parts[1]; })[0];
      if (it) it[parts[2]] = val;
    } else return false;
    if (path.indexOf("notebook.") === 0) {
      var nb = state.notebook[path.split(".")[1]];
      if (nb) nb.updated = Date.now();
    }
    var out = el.dataset.bind && view.querySelector('[data-out="' + el.dataset.bind + '"]');
    if (out) out.textContent = val + "/10";
    save();
    return true;
  }

  document.addEventListener("input", function (e) {
    var el = e.target;
    if (el.dataset.actInput === "pen-size") { pen.size = num(el.value); return; }
    applyInput(el);
    if (el.type === "range" && el.dataset.item) {
      var b = el.parentNode.querySelector(".badge");
      if (b) b.textContent = el.value + "%";
    }
  });

  document.addEventListener("change", function (e) {
    var el = e.target;
    if (el.dataset.actChange === "nb-paper") {
      var p = state.notebook[el.dataset.id];
      var fresh = newPage(el.value);
      delete state.notebook[fresh.id];
      ["cols", "nodes", "tiles"].forEach(function (k) { if (!p[k] && fresh[k]) p[k] = fresh[k]; });
      p.paper = el.value;
      p.updated = Date.now();
      save();
      render();
      return;
    }
    if (el.hasAttribute("data-import")) { importFile(el.files[0]); el.value = ""; return; }
    if (el.dataset.upload) {
      var parts = el.dataset.upload.split("|"), f = el.files[0];
      if (!f) return;
      compressImage(f, function (url) {
        var it = listAt(parts[0]).filter(function (x) { return x.id === parts[1]; })[0];
        if (it) { it.img = url; save(); render(); }
      });
      return;
    }
    if (el.type === "checkbox" || el.tagName === "SELECT" || el.type === "range" || el.type === "date" || el.type === "number") applyInput(el);
    if (el.hasAttribute("data-rerender")) render();
  });

  document.addEventListener("keydown", function (e) {
    var el = e.target;
    if (e.key === "Escape") closeSheet();
    if (e.key !== "Enter" || e.isComposing) return;
    if (el.dataset && el.dataset.add) { e.preventDefault(); addToList(el.dataset.add); }
    else if (el.dataset && el.dataset.enter) { e.preventDefault(); act(el.dataset.enter, el); }
    else if (el.closest && el.closest("[data-form]") && el.tagName === "INPUT") {
      var btn = el.closest("[data-form]").querySelector("[data-act]");
      if (btn) { e.preventDefault(); act(btn.dataset.act, btn); }
    }
  });

  function addToList(path) {
    var input = view.querySelector('[data-add="' + path + '"]');
    var text = input ? input.value.trim() : "";
    if (!text) { if (input) input.focus(); return; }
    var item = { id: uid(), text: text, done: false };
    if (path === "habits") item.color = COLORS[state.habits.length % COLORS.length];
    listAt(path).push(item);
    save();
    render();
    var again = view.querySelector('[data-add="' + path + '"]');
    if (again) { again.value = ""; again.focus({ preventScroll: true }); }
  }

  function formVals(el, name) {
    var f = el.closest("[data-form]"), o = {};
    $$("input, select, textarea", f).forEach(function (i) { if (i.name) o[i.name] = i.value; });
    return o;
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]");
    if (!el || el.tagName === "SELECT" || (el.tagName === "INPUT" && el.type !== "button")) return;
    if (el.tagName === "A" && el.dataset.act !== "tab-go") e.preventDefault();
    act(el.dataset.act, el);
  });
  $("#sheet-scrim").addEventListener("click", closeSheet);
  window.addEventListener("hashchange", render);
  var resizeT;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { if (parseRoute().name === "notebook" && parseRoute().a) render(); }, 250);
  });

  /* ------------------------------------------------------------ actions */

  function act(name, el) {
    var d = el.dataset;
    switch (name) {
      case "list-add": addToList(d.path); return;
      case "list-del": {
        var arr = listAt(d.path), i = arr.findIndex(function (x) { return x.id === d.id; });
        if (i < 0) return;
        var removed = arr.splice(i, 1)[0];
        if (d.path === "habits") Object.keys(state.habitLog).forEach(function (k) { delete state.habitLog[k][d.id]; });
        save(); render();
        toastUndo("Removed", function () { arr.splice(i, 0, removed); save(); render(); });
        return;
      }
      case "prio": {
        var it = listAt(d.path).filter(function (x) { return x.id === d.id; })[0];
        if (it) { it.prio = ((it.prio || 0) + 1) % 4; save(); render(); }
        return;
      }
      case "set": {
        var v = d.num !== undefined ? num(d.val) : d.val;
        if (d.path.indexOf("mood") > -1 && getP(d.path) === v) v = 0;
        setP(d.path, v); save(); render(); return;
      }
      case "tab": state.ui.tabs[d.key] = d.val; save(); render(); return;
      case "tab-go": state.ui.tabs[d.key] = d.val; save(); return;
      case "theme": state.theme = state.theme === "dark" ? "light" : "dark"; save(); render(); return;
      case "sheet": openSheet(); return;
      case "sheet-close": closeSheet(); return;
      case "habit": {
        var log = state.habitLog[d.date] || (state.habitLog[d.date] = {});
        log[d.id] = !log[d.id];
        save(); render(); return;
      }
      case "habit-color": {
        var h = state.habits.filter(function (x) { return x.id === d.id; })[0];
        if (h) { h.color = d.val; save(); render(); }
        return;
      }
      case "habit-month": state.ui.habitMonth = monthKey(addMonths(parseD((state.ui.habitMonth || monthKey(today())) + "-01"), num(d.val))); render(); return;
      case "mood-month": state.ui.moodMonth = monthKey(addMonths(parseD((state.ui.moodMonth || monthKey(today())) + "-01"), num(d.val))); render(); return;
      case "fin-month": state.ui.finMonth = monthKey(addMonths(parseD((state.ui.finMonth || monthKey(today())) + "-01"), num(d.val))); render(); return;
      case "meal-week": state.ui.mealWeek = d.val; state.ui.tabs.meals = "plan"; save(); go("#/meals"); return;
      case "meal-week-step": state.ui.mealWeek = ymd(addDays(parseD(state.ui.mealWeek || ymd(mondayOf(today()))), num(d.val))); render(); return;
      case "workout-add": {
        var w = formVals(el);
        if (!w.date) { toast("Pick a date."); return; }
        state.workouts.push({ id: uid(), date: w.date, type: w.type, minutes: num(w.minutes), notes: w.notes });
        save(); render(); toast("Workout logged 💪"); return;
      }
      case "weight-add": {
        var wv = formVals(el);
        if (!num(wv.value)) { toast("Enter a weight."); return; }
        state.weights.push({ id: uid(), date: wv.date || todayKey(), value: num(wv.value) });
        save(); render(); return;
      }
      case "copy-text":
        if (navigator.clipboard) navigator.clipboard.writeText(d.val).then(function () { toast("Copied “" + d.val + "”"); }, function () { toast(d.val); });
        return;
      case "meal-grocery": {
        var wk = state.ui.mealWeek || ymd(mondayOf(today())), plan = state.meals[wk] || {}, added = 0;
        var texts = [];
        Object.keys(plan).forEach(function (i) { Object.keys(plan[i] || {}).forEach(function (s) { if (plan[i][s]) texts.push(String(plan[i][s]).toLowerCase()); }); });
        state.recipes.forEach(function (r) {
          if (!r.text) return;
          var n = r.text.toLowerCase();
          if (texts.some(function (t) { return t.indexOf(n) >= 0; })) added += addIngredients(r);
        });
        save(); render();
        toast(added ? added + " ingredient" + (added === 1 ? "" : "s") + " added to your list" : "No recipe names found in this week's plan.");
        return;
      }
      case "recipe-grocery": {
        var rc = state.recipes.filter(function (x) { return x.id === d.id; })[0];
        var n2 = rc ? addIngredients(rc) : 0;
        save(); toast(n2 ? n2 + " ingredient" + (n2 === 1 ? "" : "s") + " added" : "Already on your list");
        return;
      }
      case "recipe-add": state.recipes.push({ id: uid(), text: "New recipe", cat: "Dinner", time: "", serves: "", ingredients: "", method: "" }); save(); render(); return;
      case "grocery-add": {
        var g = formVals(el);
        if (!g.text || !g.text.trim()) return;
        state.grocery.push({ id: uid(), text: g.text.trim(), cat: g.cat || categorize(g.text), done: false });
        save(); render();
        var gi = view.querySelector('[data-form="grocery"] input[name=text]');
        if (gi) gi.focus();
        return;
      }
      case "grocery-clear": state.grocery = state.grocery.filter(function (x) { return !x.done; }); save(); render(); return;
      case "fin-add": {
        var fv = formVals(el), mk = state.ui.finMonth || monthKey(today()), fm = finMonth(mk);
        if (!fv.text && !num(fv.amount)) { toast("Add a description or amount."); return; }
        if (d.kind === "income") fm.income.push({ id: uid(), text: fv.text || "Income", amount: num(fv.amount) });
        else fm.expenses.push({ id: uid(), date: fv.date || mk + "-01", text: fv.text || "Expense", cat: fv.cat || "Other", amount: num(fv.amount) });
        save(); render(); return;
      }
      case "pot-add": state.finance.pots.push({ id: uid(), text: "New pot", target: 1000, saved: 0 }); save(); render(); return;
      case "debt-add": state.finance.debts.push({ id: uid(), text: "Card / loan", start: 0, balance: 0, rate: "" }); save(); render(); return;
      case "sub-add": state.finance.subs.push({ id: uid(), text: "New subscription", amount: 0, cycle: "monthly", due: ymd(addDays(today(), 30)) }); save(); render(); return;
      case "sub-paid": {
        var sb = state.finance.subs.filter(function (x) { return x.id === d.id; })[0];
        if (!sb) return;
        var due = sb.due ? parseD(sb.due) : today();
        var nd = sb.cycle === "yearly" ? new Date(due.getFullYear() + 1, due.getMonth(), due.getDate()) : sb.cycle === "weekly" ? addDays(due, 7) : new Date(due.getFullYear(), due.getMonth() + 1, Math.min(due.getDate(), daysInMonth(due.getFullYear(), due.getMonth() + 1)));
        var fmk = monthKey(due);
        finMonth(fmk).expenses.push({ id: uid(), date: ymd(due), text: sb.text, cat: "Utilities", amount: num(sb.amount) });
        sb.due = ymd(nd);
        save(); render(); toast("Logged payment · next due " + shortDay(nd)); return;
      }
      case "ikigai": state.ui.ikigai = d.val; render(); var ta = view.querySelector('[data-focus-ikigai="' + d.val + '"]'); if (ta) ta.focus(); return;
      case "smart-add": state.mind.smart.push({ id: uid(), text: "", s: "", m: "", a: "", r: "", t: "", due: "", progress: 0 }); save(); render(); return;
      case "trip-add": {
        var id = uid();
        state.travel.trips[id] = { id: id, text: "New trip", dest: "", start: "", end: "", budget: "", itinerary: [], packing: [], outfits: [], expenses: [] };
        state.ui.trip = id; save(); render(); return;
      }
      case "trip-open": state.ui.trip = d.id; save(); render(); return;
      case "trip-del":
        if (!confirm("Delete this trip and all its lists?")) return;
        delete state.travel.trips[d.id]; state.ui.trip = null; save(); render(); return;
      case "trip-expense": listAt("travel.trips." + d.id + ".expenses").push({ id: uid(), cat: "Food", text: "", amount: 0 }); save(); render(); return;
      case "pack-essentials": {
        var pk = listAt("travel.trips." + d.id + ".packing"), have = pk.map(function (x) { return x.text.toLowerCase(); });
        ["Passport / ID", "Tickets & bookings", "Phone charger", "Travel adapter", "Toiletries", "Medication", "Sunglasses", "Pyjamas", "Underwear & socks", "Comfy shoes", "Reusable water bottle", "Headphones"].forEach(function (t) {
          if (have.indexOf(t.toLowerCase()) < 0) pk.push({ id: uid(), text: t, done: false });
        });
        save(); render(); return;
      }
      case "chore-add": {
        var cv = formVals(el);
        if (!cv.text || !cv.text.trim()) { toast("Name the chore."); return; }
        state.chores.push({ id: uid(), room: (cv.room || "Whole home").trim(), freq: d.val, text: cv.text.trim(), who: "" });
        save(); render(); return;
      }
      case "journal-day": {
        var pg = findDayPage(d.val) || newPage("lined", { date: d.val, title: prettyDay(parseD(d.val)) });
        go("#/notebook/" + pg.id); return;
      }
      case "nb-new": { var np = newPage(d.val); go("#/notebook/" + np.id); return; }
      case "nb-del":
        if (!confirm("Delete this page? This can't be undone.")) return;
        delete state.notebook[d.id]; save(); go("#/notebook"); return;
      case "pen-tool": pen.tool = d.val; if (d.val === "pen" || d.val === "type") { /* keep colour */ } render(); return;
      case "pen-color": pen.color = d.val; if (pen.tool === "type" || pen.tool === "eraser" || pen.tool === "marker") pen.tool = "pen"; render(); return;
      case "ink-undo": {
        var r = parseRoute(), p = state.notebook[r.a];
        if (!p || !undoStack.length) { toast("Nothing to undo"); return; }
        p.ink = undoStack.pop(); save();
        var c = $(".sheet-page canvas"); if (c && c._paint) c._paint(p.ink);
        return;
      }
      case "ink-clear": {
        var r2 = parseRoute(), p2 = state.notebook[r2.a];
        if (!p2 || !p2.ink) return;
        if (!confirm("Clear all drawing on this page?")) return;
        undoStack.push(p2.ink); p2.ink = ""; save();
        var c2 = $(".sheet-page canvas"); if (c2 && c2._paint) c2._paint("");
        return;
      }
      case "mm-add": { var mp = state.notebook[d.id]; addNode(mp, state.ui.mmSel || mp.nodes[0].id); return; }
      case "mm-del": {
        var mp2 = state.notebook[d.id], sel = state.ui.mmSel;
        var node = mp2.nodes.filter(function (n) { return n.id === sel; })[0];
        if (!node || !node.parent) { toast("Select a branch to remove (the centre stays)."); return; }
        var kill = [sel], grew = true;
        while (grew) { grew = false; mp2.nodes.forEach(function (n) { if (n.parent && kill.indexOf(n.parent) >= 0 && kill.indexOf(n.id) < 0) { kill.push(n.id); grew = true; } }); }
        mp2.nodes = mp2.nodes.filter(function (n) { return kill.indexOf(n.id) < 0; });
        state.ui.mmSel = null; save(); render(); return;
      }
      case "vb-add": { var vp = state.notebook[d.id]; vp.tiles = vp.tiles || []; vp.tiles.push({ id: uid(), text: "", color: COLORS[vp.tiles.length % COLORS.length], img: "" }); save(); render(); return; }
      case "vb-color": {
        var tl = listAt(d.path).filter(function (x) { return x.id === d.id; })[0];
        if (tl) { tl.color = COLORS[(COLORS.indexOf(tl.color) + 1) % COLORS.length]; save(); render(); }
        return;
      }
      case "carry": {
        var from = ensureDay(d.val), to = ensureDay(ymd(addDays(parseD(d.val), 1)));
        var open = from.tasks.filter(function (x) { return !x.done; });
        if (!open.length) { toast("Nothing unfinished — lovely."); return; }
        open.forEach(function (x) { to.tasks.push({ id: uid(), text: x.text, done: false, prio: x.prio || 0 }); });
        from.tasks = from.tasks.filter(function (x) { return x.done; });
        save(); render(); toast(open.length + " task" + (open.length === 1 ? "" : "s") + " moved to tomorrow"); return;
      }
      case "carry-week": {
        var cur = state.weeks[d.val] || {}, nextK = ymd(addDays(parseD(d.val), 7));
        var nxt = state.weeks[nextK] || (state.weeks[nextK] = {});
        var pr = (cur.priorities || []).filter(function (x) { return !x.done; });
        if (!pr.length) { toast("No open priorities to carry over."); return; }
        nxt.priorities = (nxt.priorities || []).concat(pr.map(function (x) { return { id: uid(), text: x.text, done: false }; }));
        save(); toast(pr.length + " priorit" + (pr.length === 1 ? "y" : "ies") + " copied to next week"); return;
      }
      case "sync-run": runSync(d.val); return;
      case "sync-import": {
        var it2 = state.sync.pulled.filter(function (x) { return x.id === d.id; })[0];
        if (!it2) return;
        var dk = it2.date || todayKey(), day = ensureDay(dk), tid = uid();
        day.tasks.push({ id: tid, text: it2.name, done: /done|complete/i.test(it2.status), prio: 0 });
        state.sync.map[tid] = it2.id;
        save(); render(); toast("Imported to " + shortDay(parseD(dk))); return;
      }
      case "export": exportData(); return;
      case "reset":
        if (!confirm("Reset the whole planner? Export a backup first — this erases everything on this device.")) return;
        state = defaults(); saveNow(); go("#/home"); toast("Planner reset"); return;
    }
  }

  function addIngredients(r) {
    var have = state.grocery.map(function (g) { return g.text.toLowerCase(); }), n = 0;
    String(r.ingredients || "").split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (ing) {
      if (have.indexOf(ing.toLowerCase()) >= 0) return;
      have.push(ing.toLowerCase());
      state.grocery.push({ id: uid(), text: ing, cat: categorize(ing), done: false });
      n++;
    });
    return n;
  }

  function toastUndo(msg, undo) {
    var t = $("#toast");
    t.innerHTML = esc(msg) + ' · <button style="border:0;background:transparent;color:inherit;text-decoration:underline;padding:0">Undo</button>';
    t.style.pointerEvents = "auto";
    t.querySelector("button").onclick = function () { undo(); t.classList.remove("show"); };
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); t.style.pointerEvents = ""; }, 4000);
  }

  function exportData() {
    saveNow();
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "slow-ink-life-" + todayKey() + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function importFile(f) {
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var data = JSON.parse(rd.result);
        if (!data || typeof data !== "object" || !data.days) throw new Error("bad");
        state = merge(defaults(), data);
        saveNow(); render(); toast("Planner imported ✨");
      } catch (e) { toast("That file doesn't look like a Slow Ink Life backup."); }
    };
    rd.readAsText(f);
  }

  /* ------------------------------------------------------------ boot */

  if (!location.hash) history.replaceState(null, "", "#/home");
  render();
})();
