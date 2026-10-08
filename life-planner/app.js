/* ===================================================================
   Slow Ink Life — all-in-one digital planner
   Vanilla JS single-page app. No build step, no dependencies.
   Everything is stored in localStorage on this device.
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
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    left: '<path d="M15 18l-6-6 6-6"/>',
    right: '<path d="M9 18l6-6-6-6"/>',
    up: '<path d="M6 14l6-6 6 6"/>',
    down: '<path d="M6 10l6 6 6-6"/>',
    smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2M9 9.5h.01M15 9.5h.01"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    layers: '<path d="M12 4l8.5 4.5L12 13 3.5 8.5z"/><path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3.5a5.5 5.5 0 0 0-3.2 10c.7.5 1.2 1.3 1.2 2.2V16h4v-.3c0-.9.5-1.7 1.2-2.2A5.5 5.5 0 0 0 12 3.5z"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
    type: '<path d="M5 7V4.5h14V7M12 4.5V20M9 20h6"/>',
    eraser: '<path d="M8 20h12"/><path d="M4.5 15.5l9-9 5 5-6.5 6.5h-4.5z"/>',
    marker: '<path d="M9 14l-3.5 3.5V20H8l3.5-3.5"/><path d="M9 14l6.5-9.5 4 4L10 15z"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    print: '<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2M7 14h10v6H7z"/>',
    grid: '<circle cx="6" cy="6" r="1.4"/><circle cx="12" cy="6" r="1.4"/><circle cx="18" cy="6" r="1.4"/><circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/><circle cx="6" cy="18" r="1.4"/><circle cx="12" cy="18" r="1.4"/><circle cx="18" cy="18" r="1.4"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    branch: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.3 11l7.4-4M8.3 13l7.4 4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    heart: '<path d="M12 20.5s-7.5-4.6-9-9.3C2 7.6 4.2 5 7 5c1.9 0 3.6 1 5 3 1.4-2 3.1-3 5-3 2.8 0 5 2.6 4 6.2-1.5 4.7-9 9.3-9 9.3z"/>',
    pin: '<path d="M12 21s-6-5.6-6-10a6 6 0 0 1 12 0c0 4.4-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>',
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
    ["two", "Two-column"], ["three", "Three-column"]
  ];
  /* Vision boards and mind maps now have their own pages under Productivity (they are still stored with the notebook pages). */
  var BOARD_KINDS = {
    vision: { title: 'Vision <span class="em">board</span>', noun: "board", sub: "Pictures and words for the life you are building." },
    mindmap: { title: 'Mind <span class="em">map</span>', noun: "map", sub: "Branch out from one idea. Drag to arrange, double-click to add." }
  };
  function isBoard(p) { return !!p && (p.paper === "vision" || p.paper === "mindmap"); }
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
      look: { theme: "blush", mode: "light", font: "classic" },
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
      goals: {},
      goalsFromSmart: true,
      projects: {},
      todos: [],
      dump: [],
      routines: {},
      blocks: {},
      usualDay: [],
      focus: { settings: { focus: 25, short: 5, long: 15, every: 4, awake: true, sound: true }, sessions: [], run: null, round: 0, label: "" },
      workouts: [],
      milestones: [],
      weights: [],
      body: { unit: "cm", height: "", start: {}, goal: {}, log: [], notes: "" },
      progress: { shots: [] },
      supps: { items: [], log: {} },
      meds: { items: [], log: {} },
      meals: {},
      recipes: seedRecipes(),
      grocery: [],
      finance: { months: {}, pots: [], debts: [], subs: [], wish: [], wishBudget: { shop: "", wish: "" }, payoff: { method: "avalanche", extra: "" }, pkg: { orders: [], returns: [], exchanges: [] } },
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
      nbSections: defaultNbSections(),
      nbSection: "s-journal",
      nbCurrent: "",
      ui: { tabs: {}, nbMode: "type" }
    };
  }

  function defaultNbSections() {
    return [{ id: "s-journal", name: "Journal", tone: "pink" }, { id: "s-notes", name: "Notes", tone: "butter" }, { id: "s-ideas", name: "Ideas", tone: "sage" }];
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
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved) delete saved.sync; /* drop settings left over from the removed board sync */
        var merged = merge(defaults(), saved);
        if (saved && saved.goalsFromSmart === undefined) merged.goalsFromSmart = false;   /* saved before Goals existed: bring SMART goals across once */
        if (saved && !saved.look && saved.theme === "dark") merged.look.mode = "dark";   /* planners from before colour themes */
        return merged;
      }
    } catch (e) { /* fall through to defaults */ }
    return defaults();
  }

  /* ---- Personalise: colour theme, light / dark / auto, font and page background (saved with the planner) ---- */
  var LOOK_THEMES = [["blush", "Blush", "#c9788b"], ["sage", "Sage", "#4f8a5e"], ["sky", "Sky", "#4a7aa6"], ["lilac", "Lilac", "#7e62b0"]];
  var LOOK_MODES = [["light", "Light"], ["auto", "Auto"], ["dark", "Dark"]];
  var LOOK_FONTS = [["classic", "Classic", "Cormorant and Poppins", '"Cormorant Garamond", Georgia, serif'], ["cozy", "Cozy", "Lora and Nunito", '"Lora", Georgia, serif'], ["modern", "Modern", "Inter", '"Inter", system-ui, sans-serif']];
  function lookPick(list, v, d) { return list.some(function (x) { return x[0] === v; }) ? v : d; }
  /* Always a valid choice, even from an odd backup. Planners saved before themes existed carried a plain light/dark word. */
  function look() {
    var l = state && state.look && typeof state.look === "object" ? state.look : {};
    var legacy = state && state.theme === "dark" ? "dark" : "light";
    return { theme: lookPick(LOOK_THEMES, l.theme, "blush"), mode: lookPick(LOOK_MODES, l.mode || legacy, "light"), font: lookPick(LOOK_FONTS, l.font, "classic") };
  }
  var darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function isDark() { var m = look().mode; return m === "dark" || (m === "auto" && !!(darkQuery && darkQuery.matches)); }
  function applyLook() {
    var l = look(), root = document.documentElement;
    root.setAttribute("data-theme", l.theme); root.setAttribute("data-mode", isDark() ? "dark" : "light");
    root.setAttribute("data-font", l.font);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) { var c = getComputedStyle(root).getPropertyValue("--bg").trim(); if (c) meta.setAttribute("content", c); }
  }
  function setLook(key, val) {
    var l = look(); l[key] = val; state.look = l;
    save(); applyLook(); render();
  }
  if (darkQuery) { var onSys = function () { if (look().mode === "auto") { applyLook(); render(); } }; if (darkQuery.addEventListener) darkQuery.addEventListener("change", onSys); else if (darkQuery.addListener) darkQuery.addListener(onSys); }

  /* Recipe sections ("Breakfast", "Drinks", ...) are the covers on the Recipe cards page. Older planners only had a
     category word on each recipe, so give every recipe a section. */
  function normSec(n) { return String(n || "").trim().toLowerCase().replace(/s$/, ""); }
  /* ---- Goals (Productivity). Older planners kept SMART goals under Mind & Ikigai; they become goals once. ---- */
  var GOAL_AREAS = ["Personal", "Health", "Career", "Money", "Relationships", "Learning", "Home", "Creative", "Other"];
  var GOAL_STATUS = [["active", "Active"], ["hold", "On hold"], ["done", "Done"]];
  function newGoal(title) {
    var id = uid();
    return { id: id, title: title || "", area: "Personal", why: "", plan: "", start: ymd(today()), due: "", status: "active", manual: 0, steps: [], checks: [],
      worked: "", blocked: "", change: "", smart: { s: "", m: "", a: "", r: "", t: "" }, created: Date.now() };
  }
  function ensureGoals() {
    if (!state.goals || typeof state.goals !== "object" || Array.isArray(state.goals)) state.goals = {};
    if (!state.goalsFromSmart) {
      var old = state.mind && Array.isArray(state.mind.smart) ? state.mind.smart : [];
      old.forEach(function (g) {
        if (!g || typeof g !== "object") return;
        var n = newGoal(str(g.text, 120));
        n.smart = { s: str(g.s, 2000), m: str(g.m, 2000), a: str(g.a, 2000), r: str(g.r, 2000), t: str(g.t, 2000) };
        n.why = n.smart.r;
        n.due = /^\d{4}-\d{2}-\d{2}$/.test(String(g.due)) ? g.due : "";
        n.manual = clamp(num(g.progress), 0, 100);
        state.goals[n.id] = n;
      });
      state.goalsFromSmart = true;
    }
  }
  function goalPct(g) {
    var st = g.steps || [];
    return st.length ? Math.round(100 * st.filter(function (x) { return x.done; }).length / st.length) : clamp(num(g.manual), 0, 100);
  }
  function addMonthsKeep(d, n) { var t = new Date(d.getFullYear(), d.getMonth() + n, 1); t.setDate(Math.min(d.getDate(), daysInMonth(t.getFullYear(), t.getMonth()))); return t; }
  function goalList() {
    return Object.keys(state.goals).map(function (id) { return state.goals[id]; }).sort(function (a, b) {
      var da = a.status === "done" ? 1 : 0, db = b.status === "done" ? 1 : 0;
      if (da !== db) return da - db;
      return (a.due || "9") < (b.due || "9") ? -1 : (a.due || "9") > (b.due || "9") ? 1 : (a.created || 0) - (b.created || 0);
    });
  }
  /* Plain-language review of a goal plan, worked out from the dates, steps and check-ins on the page. */
  function goalInsights(g) {
    var out = [], t = today(), tk = ymd(t), pct = goalPct(g), steps = g.steps || [], open = steps.filter(function (x) { return !x.done; });
    function add(k, text) { out.push({ k: k, t: text }); }
    if (g.status === "done" || pct >= 100) return [{ k: "good", t: "This goal is complete. Take a moment to celebrate, then note below what worked so you can use it again." }];
    if (!steps.length) add("warn", "There are no action steps yet. Break this goal into small steps, ideally each doable within a week. A goal without steps tends to stay a wish.");
    else {
      if (steps.length < 3) add("info", "Only " + steps.length + (steps.length === 1 ? " step" : " steps") + " so far. If any step would take more than a week, split it so progress shows up sooner.");
      var overdue = open.filter(function (x) { return x.due && x.due < tk; }).length;
      if (overdue) add("warn", overdue + (overdue === 1 ? " step is" : " steps are") + " overdue. Re-date them honestly, or shrink or drop the ones that no longer fit.");
      var undated = open.filter(function (x) { return !x.due; }).length;
      if (undated && g.due) add("info", undated + " open " + (undated === 1 ? "step has" : "steps have") + " no date. Giving each step a date makes slips visible early.");
      if (open.length) add("info", "Next step: " + (open[0].text || "(unnamed step)") + ".");
    }
    var due = g.due ? parseD(g.due) : null;
    if (!due) add("info", "Add a target date so your pace can be compared with the calendar.");
    else {
      var start = g.start ? parseD(g.start) : new Date(new Date(g.created || Date.now()).getFullYear(), new Date(g.created || Date.now()).getMonth(), new Date(g.created || Date.now()).getDate());
      var total = daysBetween(start, due), el = daysBetween(start, t), left = daysBetween(t, due);
      if (left < 0) add("warn", "The target date passed " + (-left) + (left === -1 ? " day" : " days") + " ago. Decide whether to extend the date, shrink the goal, or close it.");
      else if (total > 0) {
        var exp = clamp(Math.round(100 * el / total), 0, 100), diff = pct - exp;
        if (diff <= -25) add("warn", "Well behind pace: " + pct + "% done with about " + exp + "% of the time used. Options: reduce the scope, move the date, or free up regular time each week.");
        else if (diff <= -10) add("warn", "A little behind pace: " + pct + "% done with about " + exp + "% of the time used. A few extra steps this week would catch you up.");
        else add("good", "On pace: " + pct + "% done with about " + exp + "% of the time used.");
        if (open.length && left > 0) { var rate = open.length / Math.max(left / 7, 1); add("info", "To finish by the target date, aim for " + (rate >= 1 ? "about " + (Math.round(rate * 10) / 10) + " steps a week" : "one step about every " + Math.round(1 / rate * 10) / 10 + " weeks") + " (" + open.length + " left, " + left + " days to go)."); }
      }
    }
    var chk = (g.checks || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    if (!chk.length) add("info", "No check-ins yet. A quick check-in every week or two shows whether the plan is working.");
    else {
      var ago = daysBetween(parseD(chk[chk.length - 1].date), t);
      if (ago > 14) add("warn", "The last check-in was " + ago + " days ago. A short check-in will show whether anything needs to change.");
      if (chk.length >= 3) {
        var l3 = chk.slice(-3).map(function (c) { return c.pct; });
        if (l3[0] === l3[1] && l3[1] === l3[2]) add("warn", "Progress hasn't moved across your last three check-ins. What is in the way, and what is the smallest change that would unstick it?");
      }
    }
    return out;
  }

  /* ---- Projects (Productivity) ---- */
  var PROJECT_STATUS = [["plan", "Planning"], ["going", "In progress"], ["hold", "On hold"], ["done", "Done"]];
  var PROJECT_FIELDS = [
    ["outcome", "The outcome", "What will exist when this is finished?"],
    ["why", "Why it matters", "What is this for? What will it change?"],
    ["doneWhen", "Done looks like", "How will you know it is finished? Be specific."],
    ["people", "People and roles", "Who is involved? Who decides, who helps, who needs updates?"],
    ["resources", "Resources", "Time, money, tools, skills, things you need to get."],
    ["risks", "Risks and what I'll do", "What could go wrong or slow this down? What is your plan?"],
    ["scopeOut", "Out of scope", "What is NOT part of this project? (Helps stop it growing.)"]
  ];
  var PROJECT_STARTER = ["Plan", "Prepare", "Do the work", "Finish and review"];
  function newProject(title) {
    var id = uid();
    var pr = { id: id, title: title || "", area: "Personal", status: "plan", start: ymd(today()), due: "", notes: "", phases: [], worked: "", stuck: "", decide: "", created: Date.now() };
    PROJECT_FIELDS.forEach(function (f) { pr[f[0]] = ""; });
    return pr;
  }
  function projectSteps(pr) { return [].concat.apply([], (pr.phases || []).map(function (ph) { return ph.steps || []; })); }
  function projectPct(pr) {
    var st = projectSteps(pr);
    return st.length ? Math.round(100 * st.filter(function (x) { return x.done; }).length / st.length) : (pr.status === "done" ? 100 : 0);
  }
  function phasePct(ph) { var st = ph.steps || []; return st.length ? Math.round(100 * st.filter(function (x) { return x.done; }).length / st.length) : 0; }
  function projectList() {
    return Object.keys(state.projects).map(function (id) { return state.projects[id]; }).sort(function (a, b) {
      var da = a.status === "done" ? 1 : 0, db = b.status === "done" ? 1 : 0;
      if (da !== db) return da - db;
      return (a.due || "9") < (b.due || "9") ? -1 : (a.due || "9") > (b.due || "9") ? 1 : (a.created || 0) - (b.created || 0);
    });
  }
  function projectInsights(pr) {
    var out = [], t = today(), tk = ymd(t), pct = projectPct(pr), phases = pr.phases || [], steps = projectSteps(pr), open = steps.filter(function (x) { return !x.done; });
    function add(k, text) { out.push({ k: k, t: text }); }
    if (pr.status === "done" || (steps.length && pct >= 100)) return [{ k: "good", t: "This project is complete. Note below what went well and what you would do differently next time." }];
    if (!phases.length) add("warn", "There are no phases yet. Split the project into 3 to 5 phases (for example Plan, Prepare, Do, Finish) and give each a few steps. The Phases tab can add a starter outline.");
    else {
      var empty = phases.filter(function (ph) { return !(ph.steps || []).length; });
      if (empty.length) add("warn", empty.length === 1 ? "The phase \"" + (empty[0].title || "Untitled") + "\" has no steps yet." : empty.length + " phases have no steps yet (" + empty.slice(0, 3).map(function (ph) { return "\"" + (ph.title || "Untitled") + "\""; }).join(", ") + (empty.length > 3 ? ", …" : "") + ").");
      var big = phases.filter(function (ph) { return (ph.steps || []).length > 12; });
      if (big.length) add("info", "\"" + (big[0].title || "Untitled") + "\" has more than 12 steps. Consider splitting it into two phases so it is easier to see progress.");
      var cur = phases.filter(function (ph) { return (ph.steps || []).some(function (x) { return !x.done; }); })[0];
      if (cur) { var nx = cur.steps.filter(function (x) { return !x.done; })[0]; add("info", "You are in the phase \"" + (cur.title || "Untitled") + "\". Next step: " + (nx.text || "(unnamed step)") + "."); }
    }
    var overdue = open.filter(function (x) { return x.due && x.due < tk; }).length;
    if (overdue) add("warn", overdue + (overdue === 1 ? " step is" : " steps are") + " overdue. Re-date them honestly, or shrink or drop the ones that no longer fit.");
    var undated = open.filter(function (x) { return !x.due; }).length;
    if (undated && pr.due) add("info", undated + " open " + (undated === 1 ? "step has" : "steps have") + " no date. Dating steps shows slips early.");
    var due = pr.due ? parseD(pr.due) : null;
    if (!due) add("info", "Add a due date so the pace can be checked against the calendar.");
    else {
      var cr = new Date(pr.created || Date.now()), start = pr.start ? parseD(pr.start) : new Date(cr.getFullYear(), cr.getMonth(), cr.getDate());
      var total = daysBetween(start, due), el = daysBetween(start, t), left = daysBetween(t, due);
      if (left < 0) add("warn", "The due date passed " + (-left) + (left === -1 ? " day" : " days") + " ago. Decide whether to move the date, cut scope, or close the project.");
      else if (total > 0 && steps.length) {
        var exp = clamp(Math.round(100 * el / total), 0, 100), diff = pct - exp;
        if (diff <= -25) add("warn", "Well behind: " + pct + "% of the steps are done with about " + exp + "% of the time used. Options: cut scope, move the date, or set aside more time each week.");
        else if (diff <= -10) add("warn", "A little behind: " + pct + "% done with about " + exp + "% of the time used.");
        else add("good", "On pace: " + pct + "% done with about " + exp + "% of the time used.");
      }
    }
    if (pr.status === "going" && steps.length && !steps.some(function (x) { return x.done; }) && pr.start && daysBetween(parseD(pr.start), t) > 14) add("warn", "Marked In progress, but no step has been ticked off after more than two weeks. What is the smallest step that would get things moving?");
    if (!String(pr.doneWhen || "").trim()) add("info", "Write what \"done\" looks like in the Framework tab. It is the easiest way to stop a project drifting.");
    if (!String(pr.risks || "").trim()) add("info", "Note the two or three things most likely to go wrong, and what you would do about each.");
    return out;
  }

  /* ---- Routines & To-Dos (Productivity): to-dos, routines, time blocks, focus timer and a weekly time review ---- */
  var RT_CATS = [["focus", "Focus work", "var(--sage)"], ["admin", "Admin & chores", "var(--butter)"], ["health", "Health & movement", "var(--sky)"],
    ["leisure", "Leisure & rest", "var(--lilac)"], ["essential", "Essentials", "var(--rule-strong)"], ["wasted", "Wasted / unplanned", "var(--pink)"]];
  var RT_PRIOS = [[0, "No priority"], [1, "High"], [2, "Medium"], [3, "Low"]];
  var RT_TEMPLATES = {
    morning: { title: "Morning routine", freq: "daily", steps: [["Drink a glass of water", 2], ["Stretch or move", 10], ["Shower and get dressed", 20], ["Look at today's plan", 5]] },
    evening: { title: "Evening routine", freq: "daily", steps: [["Tidy up", 10], ["Prepare for tomorrow", 10], ["Screens off", 0], ["Read or unwind", 20]] },
    weekly: { title: "Weekly reset", freq: "weekly", steps: [["Review the week", 15], ["Plan the week ahead", 20], ["Laundry", 30], ["Groceries", 45]] }
  };
  var FOCUS_DEFAULTS = { focus: 25, short: 5, long: 15, every: 4, awake: true, sound: true };
  function rtCat(id) { return RT_CATS.filter(function (c) { return c[0] === id; })[0] || RT_CATS[0]; }
  function tmin(s) { var m = /^(\d{2}):(\d{2})$/.exec(s || ""); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null; }
  function tstr(n) { n = clamp(Math.round(n), 0, 1439); return pad(Math.floor(n / 60)) + ":" + pad(n % 60); }
  function tlabel(s) { var n = tmin(s); if (n == null) return ""; var h = Math.floor(n / 60), m = n % 60, ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12; return h + (m ? ":" + pad(m) : "") + " " + ap; }
  function hlabel(h) { h = ((h % 24) + 24) % 24; var ap = h >= 12 ? "pm" : "am"; return (h % 12 || 12) + " " + ap; }
  function blockDur(b) { var a = tmin(b.start), z = tmin(b.end); return a != null && z != null && z > a ? z - a : 0; }
  function hm(mins) { mins = Math.round(mins); var h = Math.floor(mins / 60), m = mins % 60; return h ? h + " h" + (m ? " " + m + " min" : "") : m + " min"; }
  function blocksFor(k) { return Array.isArray(state.blocks[k]) ? state.blocks[k] : []; }
  function byStart(a, b) { return (tmin(a.start) || 0) - (tmin(b.start) || 0); }
  /* ---- Brain dump (Productivity): quick capture, then send each item where it belongs ---- */
  var DUMP_KINDS = { todo: "To-dos", project: "Projects", goal: "Goals", routine: "Routines", note: "Notebook" };
  function dumpAgo(ms) {
    var d = new Date(ms || Date.now()), t = today(), diff = daysBetween(new Date(d.getFullYear(), d.getMonth(), d.getDate()), t);
    var hh = pad(d.getHours()) + ":" + pad(d.getMinutes());
    return diff === 0 ? "Today " + hh : diff === 1 ? "Yesterday " + hh : shortDay(d);
  }
  function addDumpLines(text) {
    var lines = String(text || "").split(/\r?\n+/).map(function (l) { return l.replace(/^\s*(?:[-*•·]|\d+[.)])\s+/, "").trim(); }).filter(Boolean).slice(0, 100), now = Date.now();
    lines.forEach(function (l, i) { state.dump.push({ id: uid(), text: l.slice(0, 300), at: now + i, sorted: "" }); });
    return lines.length;
  }
  function ensureRoutines() {
    if (!Array.isArray(state.dump)) state.dump = [];
    if (!Array.isArray(state.todos)) state.todos = [];
    if (!state.routines || typeof state.routines !== "object" || Array.isArray(state.routines)) state.routines = {};
    if (!state.blocks || typeof state.blocks !== "object" || Array.isArray(state.blocks)) state.blocks = {};
    if (!Array.isArray(state.usualDay)) state.usualDay = [];
    if (!state.focus || typeof state.focus !== "object") state.focus = {};
    state.focus.settings = Object.assign({}, FOCUS_DEFAULTS, state.focus.settings || {});
    if (!Array.isArray(state.focus.sessions)) state.focus.sessions = [];
    if (state.focus.run === undefined) state.focus.run = null;
  }
  /* routines are ticked per day (daily) or per week (weekly); ticks live in routine.log[period][stepId] */
  function rtKey(freq, d) { d = d || today(); return freq === "weekly" ? "w" + ymd(mondayOf(d)) : ymd(d); }
  function rtPrev(freq, d) { return addDays(d, freq === "weekly" ? -7 : -1); }
  function rtTicked(r, key) { var log = (r.log || {})[key] || {}; return (r.steps || []).filter(function (s) { return log[s.id]; }).length; }
  function rtDone(r, key) { var n = (r.steps || []).length; return n > 0 && rtTicked(r, key) === n; }
  function rtStreak(r) {
    var d = today(), n = 0;
    if (!rtDone(r, rtKey(r.freq, d))) d = rtPrev(r.freq, d);
    while (n < 1000 && rtDone(r, rtKey(r.freq, d))) { n++; d = rtPrev(r.freq, d); }
    return n;
  }
  function rtRate(r, count) {
    var d = today(), ok = 0;
    for (var i = 0; i < count; i++) { if (rtDone(r, rtKey(r.freq, d))) ok++; d = rtPrev(r.freq, d); }
    return ok;
  }
  function rtMinutes(r) { return sum(r.steps || [], function (s) { return num(s.mins); }); }
  function todoSorted(list) {
    var rank = function (p) { return p ? p : 9; };
    return list.slice().sort(function (a, b) {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1;
      if (rank(a.prio) !== rank(b.prio)) return rank(a.prio) - rank(b.prio);
      return (a.due || "9") < (b.due || "9") ? -1 : (a.due || "9") > (b.due || "9") ? 1 : 0;
    });
  }

  /* Fitness extras: body measurements, progress photos, vitamins and medication. */
  function ensureHealth() {
    var isObj = function (v) { return v && typeof v === "object" && !Array.isArray(v); };
    if (!isObj(state.body)) state.body = {};
    var b = state.body;
    if (b.unit !== "in") b.unit = "cm";
    if (b.height == null) b.height = "";
    if (!isObj(b.start)) b.start = {};
    if (!isObj(b.goal)) b.goal = {};
    if (!Array.isArray(b.log)) b.log = [];
    if (typeof b.notes !== "string") b.notes = "";
    if (!isObj(state.progress)) state.progress = {};
    if (!Array.isArray(state.progress.shots)) state.progress.shots = [];
    ["supps", "meds"].forEach(function (k) {
      if (!isObj(state[k])) state[k] = {};
      if (!Array.isArray(state[k].items)) state[k].items = [];
      if (!isObj(state[k].log)) state[k].log = {};
    });
    if (!state.ui) state.ui = { tabs: {}, nbMode: "type" };
    state.ui.hwOff = Math.max(-520, Math.min(0, parseInt(state.ui.hwOff, 10) || 0));
    state.ui.cmpA = typeof state.ui.cmpA === "string" ? state.ui.cmpA : "";
    state.ui.cmpB = typeof state.ui.cmpB === "string" ? state.ui.cmpB : "";
  }

  /* Travel map: the bucket list holds the pins (x and y are 0-1 positions on the map). */
  function ensureTravelMap() {
    var t = state.travel;
    if (!t || typeof t !== "object" || Array.isArray(t)) t = state.travel = { trips: {}, bucket: [] };
    if (!t.trips || typeof t.trips !== "object") t.trips = {};
    if (!Array.isArray(t.bucket)) t.bucket = [];
    t.bucket.forEach(function (b) {
      if (typeof b.x !== "number" || typeof b.y !== "number" || !isFinite(b.x) || !isFinite(b.y)) { delete b.x; delete b.y; }
    });
    if (!state.ui) state.ui = { tabs: {}, nbMode: "type" };
    state.ui.mapZoom = Math.max(1, Math.min(4, parseInt(state.ui.mapZoom, 10) || 1));
    state.ui.pinSel = typeof state.ui.pinSel === "string" ? state.ui.pinSel : "";
    state.ui.pinPlace = "";
    state.ui.pinDraft = null;
  }

  function ensureWish() {
    var f = state.finance;
    if (!f || typeof f !== "object" || Array.isArray(f)) f = state.finance = { months: {}, pots: [], debts: [], subs: [] };
    if (!Array.isArray(f.wish)) f.wish = [];
    if (!f.pkg || typeof f.pkg !== "object" || Array.isArray(f.pkg)) f.pkg = {};
    ["orders", "returns", "exchanges"].forEach(function (k) { if (!Array.isArray(f.pkg[k])) f.pkg[k] = []; });
    if (!Array.isArray(f.debts)) f.debts = [];
    if (!f.payoff || typeof f.payoff !== "object" || Array.isArray(f.payoff)) f.payoff = {};
    if (f.payoff.method !== "snowball") f.payoff.method = "avalanche";
    if (f.payoff.extra == null) f.payoff.extra = "";
    if (!f.wishBudget || typeof f.wishBudget !== "object" || Array.isArray(f.wishBudget)) f.wishBudget = { shop: "", wish: "" };
    f.wish.forEach(function (x) {
      x.want = Math.max(0, Math.min(5, parseInt(x.want, 10) || 0));
      if (x.list !== "wish") x.list = "shop";
      if (wishCatNames().indexOf(x.cat) < 0) x.cat = "Other";
      ["text", "link", "imgUrl", "note", "imgId"].forEach(function (k) { if (typeof x[k] !== "string") x[k] = ""; });
    });
    if (!state.ui) state.ui = { tabs: {}, nbMode: "type" };
    if (["shop", "wish", "bought"].indexOf(state.ui.wishMode) < 0) state.ui.wishMode = "shop";
    if (typeof state.ui.wishCat !== "string" || (state.ui.wishCat && wishCatNames().indexOf(state.ui.wishCat) < 0)) state.ui.wishCat = "";
  }

  function ensureRecipes() {
    ensureRoutines();
    ensureHealth();
    ensureTravelMap();
    ensureWish();
    if (!state.projects || typeof state.projects !== "object" || Array.isArray(state.projects)) state.projects = {};
    ensureGoals();
    if (!Array.isArray(state.recipes)) state.recipes = [];
    if (!Array.isArray(state.recipeSections) || !state.recipeSections.length) {
      state.recipeSections = [["Breakfast", "pink"], ["Lunch", "butter"], ["Dinner", "sage"], ["Snacks", "sky"], ["Desserts", "lilac"], ["Drinks", "pink"]].map(function (x) { return { id: uid(), name: x[0], color: x[1], imgId: "" }; });
    }
    state.recipes.forEach(function (r) {
      if (state.recipeSections.some(function (x) { return x.id === r.sec; })) return;
      var hit = state.recipeSections.filter(function (x) { return normSec(x.name) === normSec(r.cat); })[0];
      if (!hit) { hit = { id: uid(), name: String(r.cat || "Other").slice(0, 40), color: COLORS[state.recipeSections.length % COLORS.length], imgId: "" }; state.recipeSections.push(hit); }
      r.sec = hit.id;
    });
    if (!state.ui) state.ui = { tabs: {}, nbMode: "type" };
    if (state.ui.recipeSec && !state.recipeSections.some(function (x) { return x.id === state.ui.recipeSec; })) state.ui.recipeSec = "";
  }
  var state = load();
  ensureRecipes();
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
    return '<section class="card ' + (opts.cls || "") + '"' + (opts.attrs ? " " + opts.attrs : "") + ">" +
      (title ? '<div class="card-head"><h3>' + (opts.dot ? '<span class="dotmark ' + opts.dot + '"></span>' : "") + title + "</h3>" + (opts.right || "") + "</div>" : "") +
      body + "</section>";
  }
  function head(kicker, title, right) {
    return '<div class="page-head"><div><div class="kicker">' + kicker + "</div><h1>" + title + "</h1></div>" + (right ? '<div class="row wrap">' + right + "</div>" : "") + "</div>";
  }
  function tabs(key, list) {
    var cur = state.ui.tabs[key] || list[0][0];
    return { cur: cur, html: '<div class="tabs' + (list.length > 4 ? " tabs-many" : "") + '" role="tablist">' + list.map(function (t) {
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
      if (isBoard(p)) return;
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
    { group: "Life", items: [["fitness", "Fitness", "dumbbell"], ["meals", "Meals & Recipes", "bowl"], ["finance", "Finance", "wallet"], ["mind", "Mind & Ikigai", "lotus"], ["travel", "Travel", "plane"], ["home-care", "Home & Chores", "house"]] },
    { group: "Productivity", items: [["habits", "Habits", "check"], ["mood", "Mood Log", "smile"], ["goals", "Goals", "target"], ["projects", "Projects", "layers"], ["routines", "Routines & To-Dos", "clock"], ["braindump", "Brain Dump", "bulb"], ["vision", "Vision Board", "image"], ["mindmap", "Mind Map", "branch"]] },
    { group: "Journal", items: [["notebook", "Notebook", "book"]] },
    { group: "System", items: [["settings", "Settings", "sliders"]] }
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
    sb += '<div class="sidebar-foot"><button class="icon-btn" data-act="theme" aria-label="Toggle dark mode" title="Toggle light / dark">' + ic(isDark() ? "sun" : "moon") + '</button><a class="icon-btn" href="#/settings" aria-label="Settings" title="Settings">' + ic("sliders") + "</a></div>";
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


  /* ---- Home: getting-started checklist, sample data, numbers and the year ring ---- */
  var START_STEPS = [
    ["Add a task for today", function () { return "#/day/" + todayKey(); }, function () { return Object.keys(state.days).some(function (k) { return (state.days[k].tasks || []).length; }); }],
    ["Tick off a habit", function () { return "#/habits"; }, function () { return Object.keys(state.habitLog).some(function (k) { return Object.keys(state.habitLog[k] || {}).some(function (h) { return state.habitLog[k][h]; }); }); }],
    ["Set this month's intention", function () { return "#/month/" + monthKey(today()); }, function () { return Object.keys(state.months).some(function (k) { return state.months[k] && state.months[k].intention; }); }],
    ["Add a recipe of your own", function () { return "#/meals"; }, function () { return state.recipes.length > 3; }],
    ["Write a notebook page", function () { return "#/notebook"; }, function () { return Object.keys(state.notebook).some(function (id) { return !isBoard(state.notebook[id]); }); }],
    ["Make it yours with colours and fonts", function () { return "#/settings"; }, function () { var l = look(); return !!state.name || l.theme !== "blush" || l.font !== "classic" || l.mode !== "light"; }],
    ["Back up your planner", null, function () { return !!state.ui.backedUp; }]
  ];
  function gettingStarted() {
    if (state.sample || state.ui.onboardHidden) return "";
    var done = START_STEPS.filter(function (x) { return x[2](); }).length, n = START_STEPS.length, all = done === n;
    var list = START_STEPS.map(function (x) {
      var ok = x[2]();
      return '<li class="gs-step' + (ok ? " ok" : "") + '"><span class="gs-dot" aria-hidden="true">' + (ok ? ic("check") : "") + "</span>" +
        (!ok && x[1] ? '<a href="' + x[1]() + '">' + esc(x[0]) + "</a>" : !ok ? '<button class="linklike" data-act="export">' + esc(x[0]) + "</button>" : "<span>" + esc(x[0]) + "</span>") + "</li>";
    }).join("");
    return '<section class="card gstart"><div class="gs-head"><h3>' + (all ? "You’re all set" : "Getting started") + '</h3><span class="gs-count">' + done + " of " + n + "</span></div>" +
      progress(done / n * 100) + '<ul class="gs-list">' + list + "</ul>" +
      '<div class="row wrap gs-actions"><button class="btn sm" data-act="load-sample">Look around with sample data</button><button class="btn sm ghost" data-act="hide-start">' + (all ? "Done, hide this" : "Hide this") + "</button></div></section>";
  }

  function loadSample() {
    var keep = look(), keepName = state.name || "", t = today(), tk = ymd(t), mk = monthKey(t), i;
    imgs.clear();
    state = defaults(); ensureRecipes();
    state.look = keep; state.sample = true; state.name = keepName;
    function task(text, done, prio) { return { id: uid(), text: text, done: !!done, prio: prio || 0 }; }
    var plans = [
      [["Plan the week ahead", 1, 2], ["Water the plants", 1], ["Call Mum", 0], ["Book dentist", 0, 1]],
      [["Reply to emails", 1], ["Grocery run", 1], ["Tidy the desk", 1]],
      [["Team catch-up", 1, 1], ["Pick up parcel", 1]],
      [["Laundry", 1], ["Meal prep", 1], ["Read 20 pages", 0]],
      [["Pay the electric bill", 1, 1], ["Yoga class", 1]],
      [["Farmers market", 1], ["Birthday card for Jo", 1]],
      [["Sunday reset", 1], ["Plan the meals", 1]]
    ];
    for (i = 0; i < 7; i++) {
      var dk = ymd(addDays(t, -i)), day = ensureDay(dk);
      day.tasks = plans[i].map(function (x) { return task(x[0], i > 0 || x[1], x[2]); });
      if (i === 0) day.tasks.forEach(function (x, j) { x.done = j < 2; });
      day.mood = [4, 5, 3, 4, 4, 5, 3][i]; day.water = [5, 8, 6, 7, 8, 6, 4][i];
    }
    [["Send the invoices", 1], ["Dinner with Sam", 1], ["Renew library books", 0]].forEach(function (x, j) { ensureDay(ymd(addDays(t, j + 1))).tasks.push(task(x[0], 0, x[1])); });
    for (i = 0; i < 7; i++) {
      var log = state.habitLog[ymd(addDays(t, -i))] = {};
      state.habits.forEach(function (h, j) { if ((i + j) % 3 !== 2 && !(i === 0 && j > 1)) log[h.id] = true; });
    }
    state.months[mk] = { intention: "Slow down, notice more, and finish what matters.", goals: [task("Walk 3 times a week", 0), task("Cook five new recipes", 0), task("Read two books", 0)] };
    [["Walk", 35, 0], ["Yoga", 45, 1], ["Strength", 40, 4], ["Run", 30, 6]].forEach(function (x) {
      state.workouts.push({ id: uid(), date: ymd(addDays(t, -x[2])), type: x[0], minutes: x[1], notes: "" });
    });
    [[28, 64.8], [14, 64.3], [0, 63.9]].forEach(function (x) { state.weights.push({ id: uid(), date: ymd(addDays(t, -x[0])), value: x[1] }); });
    state.body.height = 168;
    state.body.start = { neck: 32, chest: 88, arm: 27, waist: 74, hips: 98, thigh: 57, calf: 36, weight: 64.8 };
    state.body.goal = { neck: "", chest: "", arm: "", waist: 70, hips: 94, thigh: 54, calf: "", weight: 62 };
    [[28, [32, 88, 27, 74, 98, 57, 36]], [14, [32, 87.5, 27, 73, 97, 56.5, 36]], [0, [31.5, 87, 26.5, 72, 96, 56, 35.5]]].forEach(function (x) {
      var e = { id: uid(), date: ymd(addDays(t, -x[0])), note: x[0] === 0 ? "Clothes fit looser around the waist." : "" };
      BODY_FIELDS.forEach(function (f, j) { e[f[0]] = x[1][j]; });
      state.body.log.push(e);
    });
    var sv = [["Vitamin D", "1000 IU", "Morning"], ["Magnesium", "200 mg", "Bedtime"], ["Omega-3", "1 capsule", "With meals"]].map(function (x) { return { id: uid(), name: x[0], dose: x[1], notes: "", added: ymd(addDays(t, -20)), time: x[2] }; });
    var md = { id: uid(), name: "Allergy tablet", dose: "10 mg", notes: "Hay fever season", added: ymd(addDays(t, -20)), times: ["am"], refill: ymd(addDays(t, 5)) };
    state.supps.items = sv; state.meds.items = [md];
    for (i = 0; i < 20; i++) {
      var hk = ymd(addDays(t, -i));
      sv.forEach(function (x, j) { if ((i + j) % 5 !== 4 && !(i === 0 && j > 0)) { (state.supps.log[hk] = state.supps.log[hk] || {})[x.id] = true; } });
      if (i % 6 !== 5) (state.meds.log[hk] = state.meds.log[hk] || {})[md.id + "-am"] = true;
    }
    var f = state.finance.months[mk] = { income: [], expenses: [] };
    f.income.push({ id: uid(), date: mk + "-01", text: "Salary", amount: 3200 });
    [["Groceries", "Groceries", 84], ["Coffee with Jo", "Dining", 12], ["Train pass", "Transport", 56], ["Yoga class", "Health", 18], ["Book", "Fun", 15], ["Dinner out", "Dining", 62]].forEach(function (x, j) {
      f.expenses.push({ id: uid(), date: mk + "-" + pad(Math.max(1, t.getDate() - j)), text: x[0], cat: x[1], amount: x[2] });
    });
    state.finance.subs.push({ id: uid(), text: "Music streaming", amount: 11, cycle: "monthly", due: ymd(addDays(t, 5)) }, { id: uid(), text: "Cloud storage", amount: 3, cycle: "monthly", due: ymd(addDays(t, 11)) });
    state.finance.wish = [["shop", "Skincare", "Gentle cleanser", 14, 4], ["shop", "Cleaning supplies", "Laundry detergent pods", 9, 2], ["shop", "Toiletries", "Toothpaste and floss", 6, 1], ["wish", "Clothing", "Linen shirt dress", 68, 5], ["wish", "Accessories", "Leather crossbody bag", 120, 4], ["wish", "Makeup", "Cream blush in rose", 22, 3], ["wish", "Home goods", "Ceramic planter", 28, 3], ["shop", "Skincare", "Daily SPF 50", 18, 3]].map(function (x, i) {
      return { id: uid(), list: x[0], cat: x[1], text: x[2], price: x[3], link: i === 3 ? "https://example.com/linen-shirt-dress" : "", imgUrl: "", imgId: "", note: "", want: x[4], done: i === 2 };
    });
    state.finance.debts = [["Credit card", 3200, 2400, 21.9, 75], ["Car loan", 6800, 5200, 6.5, 140], ["Student loan", 9000, 8600, 4.2, 95]].map(function (x) { return { id: uid(), text: x[0], start: x[1], balance: x[2], rate: x[3], min: x[4] }; });
    state.finance.payoff = { method: "avalanche", extra: 100 };
    var pkd = function (n) { return ymd(addDays(t, n)); };
    state.finance.pkg = {
      orders: [["Linen shirt dress", "Everlane", 68, -6, 1, 1, 1], ["Ceramic planter", "West Elm", 28, -4, 2, 1, 0], ["Running shoes", "Nike", 110, -3, -1, 1, 0], ["Skincare set", "Sephora", 54, -1, 4, 0, 0]].map(function (x) { return { id: uid(), text: x[0], store: x[1], amount: x[2], date: pkd(x[3]), eta: pkd(x[4]), shipped: !!x[5], delivered: !!x[6], link: "" }; }),
      returns: [{ id: uid(), text: "Wool jumper (too small)", store: "COS", amount: 79, date: pkd(-14), shipped: true, done: false }],
      exchanges: [{ id: uid(), text: "Boots, size 7", swap: "Boots, size 8", store: "Dr. Martens", amount: 0, shipped: true, done: false }]
    };
    state.finance.pots.push({ id: uid(), text: "Holiday fund", target: 1500, saved: 620 }, { id: uid(), text: "Rainy day", target: 3000, saved: 1100 });
    var tid = uid();
    state.travel.bucket = [["Kyoto in spring", 0.856, 0.354, 0], ["Northern lights", 0.452, 0.180, 0], ["Patagonia", 0.323, 0.887, 0], ["Santorini", 0.566, 0.345, 1], ["New York", 0.310, 0.318, 1], ["Cape Town", 0.549, 0.783, 0], ["Bali"]].map(function (x) {
      var b = { id: uid(), text: x[0], done: x[3] === 1 }; if (x[1] != null) { b.x = x[1]; b.y = x[2]; } return b;
    });
    state.travel.trips[tid] = { id: tid, text: "Lisbon long weekend", dest: "Lisbon", start: ymd(addDays(t, 21)), end: ymd(addDays(t, 25)), budget: 1200, itinerary: [], packing: [task("Passport", 1), task("Walking shoes", 0), task("Sunscreen", 0)], outfits: [], expenses: [] };
    [["Paris in the rain", "Paris", -150, -145, 5], ["Lake District cabin", "Cumbria", -75, -72, 4]].forEach(function (x) {
      var pid = uid();
      state.travel.trips[pid] = { id: pid, text: x[0], dest: x[1], start: ymd(addDays(t, x[2])), end: ymd(addDays(t, x[3])), budget: 900, itinerary: [], packing: [], outfits: [], expenses: [], album: [], rating: x[4] };
      if (x[0] === "Paris in the rain") state.travel.trips[pid].log = { ticket: { name: "Alex Morgan", date: ymd(addDays(t, -150)), time: "07:25", flight: "BA 304", from: "London", to: "Paris", seat: "12C", gate: "A9", boarding: "06:50" }, facts: { country: "France", language: "French", timeDiff: "+1 hour", currency: "Euro (€)", rate: "€1 = about £0.85", travelers: "2" }, transport: [{ id: uid(), date: ymd(addDays(t, -150)), from: "London St Pancras", to: "Paris Gare du Nord" }, { id: uid(), date: ymd(addDays(t, -145)), from: "Paris", to: "London" }], stay: [{ id: uid(), date: ymd(addDays(t, -150)), text: "Hotel near Le Marais", checkin: "15:00", checkout: "11:00" }], meals: [{ id: uid(), date: ymd(addDays(t, -149)), text: "Little crêperie on rue Vieille" }, { id: uid(), date: ymd(addDays(t, -148)), text: "Bistro by the river" }], activities: [{ id: uid(), date: ymd(addDays(t, -149)), text: "Musée d'Orsay" }, { id: uid(), date: ymd(addDays(t, -147)), text: "Walk along the Seine" }], review: "Rainy but magical. Book the museum in advance next time and pack a better umbrella." };
    });
    state.ui.trip = tid;
    var g1 = newGoal("Run a 5k"); g1.area = "Health"; g1.why = "I want more energy and a goal that gets me outdoors."; g1.plan = "Three short runs a week, adding a little each week. Rest day after each run.";
    g1.start = ymd(addDays(t, -30)); g1.due = ymd(addDays(t, 60));
    g1.steps = [["Buy running shoes", 1, -28], ["Walk/run 20 minutes, three times", 1, -14], ["Run 2 km without stopping", 1, -3], ["Run 3 km without stopping", 0, 10], ["Run 5 km", 0, 55]].map(function (x) { return { id: uid(), text: x[0], done: !!x[1], due: ymd(addDays(t, x[2])) }; });
    g1.checks = [[-21, 20, "First week done."], [-10, 40, "Knee a bit sore, took a rest day."], [-2, 60, "Feeling stronger."]].map(function (x) { return { id: uid(), date: ymd(addDays(t, x[0])), pct: x[1], note: x[2] }; });
    var g2 = newGoal("Save for the Lisbon trip"); g2.area = "Money"; g2.why = "A proper break to look forward to."; g2.due = ymd(addDays(t, 20)); g2.start = ymd(addDays(t, -70));
    g2.steps = [["Open a savings pot", 1, -65], ["Set up a monthly transfer", 1, -60], ["Cut one subscription", 0, 5]].map(function (x) { return { id: uid(), text: x[0], done: !!x[1], due: ymd(addDays(t, x[2])) }; });
    state.goals[g1.id] = g1; state.goals[g2.id] = g2; state.ui.goal = g1.id;
    var pj = newProject("Redo the spare room"); pj.area = "Home"; pj.status = "going"; pj.start = ymd(addDays(t, -14)); pj.due = ymd(addDays(t, 35));
    pj.outcome = "A calm spare room that works as a guest room and a desk."; pj.why = "Right now it is a dumping ground and I avoid it."; pj.doneWhen = "Walls painted, desk set up, bed made up for guests.";
    pj.people = "Me, plus a friend to help with the heavy lifting."; pj.resources = "Paint, a small desk, a lamp. About 300 for everything."; pj.risks = "Paint takes longer than planned: book two free weekends.";
    pj.phases = [["Plan", [["Measure the room", 1, -12], ["Pick the paint colour", 1, -9], ["Set a budget", 1, -9]]], ["Clear out", [["Sort the boxes", 1, -3], ["Donate what I do not need", 0, 4]]], ["Paint", [["Fill and sand the walls", 0, 10], ["Two coats of paint", 0, 17]]], ["Set up", [["Build the desk", 0, 28], ["Make up the guest bed", 0, 32]]]].map(function (x) {
      return { id: uid(), title: x[0], steps: x[1].map(function (y) { return { id: uid(), text: y[0], done: !!y[1], due: ymd(addDays(t, y[2])) }; }) };
    });
    state.projects[pj.id] = pj; state.ui.project = pj.id;
    state.todos = [["Reply to the supplier email", 1, 0, 10], ["Order packaging", 2, 2, 15], ["Book dentist", 0, 5, 5], ["Write product descriptions", 1, -1, 60], ["Sort the photo backlog", 3, 0, 0], ["Pay the electric bill", 1, 1, 5]].map(function (x) { return { id: uid(), text: x[0], done: false, prio: x[1], due: ymd(addDays(t, x[2])), est: x[3] }; });
    state.todos[1].done = true;
    var mr = { id: uid(), title: "Morning routine", freq: "daily", steps: RT_TEMPLATES.morning.steps.map(function (x) { return { id: uid(), text: x[0], mins: x[1], done: false }; }), log: {}, created: Date.now() };
    for (i = 0; i < 6; i++) { if (i === 3) continue; var lk = ymd(addDays(t, -i)); mr.log[lk] = {}; mr.steps.forEach(function (s0, j) { if (i === 0 ? j < 2 : true) mr.log[lk][s0.id] = true; }); }
    var wr = { id: uid(), title: "Weekly reset", freq: "weekly", steps: RT_TEMPLATES.weekly.steps.map(function (x) { return { id: uid(), text: x[0], mins: x[1], done: false }; }), log: {}, created: Date.now() };
    wr.log["w" + ymd(addDays(mondayOf(t), -7))] = {}; wr.steps.forEach(function (s1) { wr.log["w" + ymd(addDays(mondayOf(t), -7))][s1.id] = true; });
    state.routines[mr.id] = mr; state.routines[wr.id] = wr;
    var dayPlan = [["07:30", "08:15", "Morning routine", "essential"], ["09:00", "11:00", "Write product descriptions", "focus"], ["11:00", "11:30", "Emails and admin", "admin"], ["12:30", "13:15", "Lunch and a walk", "health"], ["14:00", "16:00", "Photograph new stock", "focus"], ["16:00", "16:45", "Scrolling and snacks", "wasted"], ["18:30", "19:30", "Cook and eat", "essential"], ["20:00", "21:30", "Reading and a film", "leisure"]];
    for (i = 0; i < 6; i++) {
      var bk = ymd(addDays(t, -i)); state.blocks[bk] = dayPlan.filter(function (x, j) { return i === 0 || (i + j) % 7 !== 3; }).map(function (x, j) { return { id: uid(), start: x[0], end: x[1], title: x[2], cat: x[3], done: i > 0 ? (i + j) % 4 !== 0 : j < 3 }; });
    }
    state.usualDay = dayPlan.map(function (x) { return { start: x[0], end: x[1], title: x[2], cat: x[3] }; });
    state.focus.sessions = [[0, 25, "Write product descriptions"], [0, 25, "Write product descriptions"], [-1, 25, "Photograph new stock"], [-1, 25, "Photograph new stock"], [-1, 25, "Emails"], [-2, 25, "Write product descriptions"], [-4, 25, "Photograph new stock"]].map(function (x) { return { id: uid(), date: ymd(addDays(t, x[0])), mins: x[1], label: x[2] }; });
    state.focus.round = 2;
    var nowMs = Date.now();
    state.dump = [["Call the plumber about the tap", 0, ""], ["Maybe start a podcast?", 3, ""], ["Learn to bake sourdough", 26, ""], ["Renew passport", 50, ""], ["Why do I keep putting off emails", 70, ""], ["Buy a birthday gift for Mum", 120, "todo"], ["Plan a girls' trip next spring", 200, "project"]].map(function (x) { return { id: uid(), text: x[0], at: nowMs - x[1] * 3600000, sorted: x[2] }; });

    var dinner = state.recipeSections.filter(function (x) { return x.name === "Dinner"; })[0] || state.recipeSections[0];
    state.recipes.unshift({ id: uid(), text: "Sheet-pan salmon and greens", cat: dinner.name, sec: dinner.id, imgId: "", time: "25 min", serves: "2", ingredients: "Salmon fillets\nBroccoli\nLemon\nOlive oil\nGarlic", method: "Roast everything on one tray at 200°C for 15 minutes." });
    state.meals = {};
    var pg = newPage("lined", { section: state.nbSection, title: "Sunday reset", text: "A slow morning. Tidied the flat, planned the week, made soup. Feeling lighter already." });
    state.nbCurrent = pg.id;
    state.ui.backedUp = false;
    saveNow(); go("#/home"); render(); toast("Sample planner loaded — look around!");
  }
  function startFresh() {
    var keep = look(), keepName = state.name || "";
    imgs.clear();
    state = defaults(); ensureRecipes(); state.look = keep; state.name = keepName;
    saveNow(); go("#/home"); render(); toast("Fresh start ✨");
  }

  function yearRing(frac, big, small) {
    var r = 46, c = 2 * Math.PI * r;
    return '<div class="yring" role="img" aria-label="' + esc(big + " " + small) + '"><svg viewBox="0 0 110 110" aria-hidden="true"><circle class="yr-track" cx="55" cy="55" r="' + r + '"/><circle class="yr-arc" cx="55" cy="55" r="' + r +
      '" stroke-dasharray="' + (c * frac).toFixed(1) + " " + c.toFixed(1) + '" transform="rotate(-90 55 55)"/></svg><div class="yr-text"><b>' + big + "</b><span>" + esc(small) + "</span></div></div>";
  }
  function kpi(num, label, href, frac) {
    return '<a class="kpi" href="' + href + '"><span class="kpi-num">' + num + '</span><span class="kpi-label">' + esc(label) + "</span>" + (frac == null ? "" : progress(frac * 100)) + "</a>";
  }

  function dumpCard() {
    var n = state.dump.filter(function (x) { return !x.sorted; }).length;
    return card("Brain dump", '<div class="row wrap" data-form="dump-quick"><input type="text" name="text" class="grow" style="min-width:160px" placeholder="Jot something down…" aria-label="Quick brain dump" maxlength="300"><button class="btn pink sm" data-act="dump-quick">' + ic("plus") + " Add</button></div>" +
      '<p class="small muted" style="margin:10px 0 0">' + (n ? n + (n === 1 ? " item waiting to sort · " : " items waiting to sort · ") + '<a href="#/braindump">Sort them</a>' : '<a href="#/braindump">Open brain dump</a>') + "</p>", { dot: "b" });
  }
  function projectsCard() {
    var act = projectList().filter(function (x) { return x.status === "going" || x.status === "plan"; }).slice(0, 3);
    if (!act.length) return "";
    return card("Projects", act.map(function (x) {
      var pc = projectPct(x);
      return '<a class="goal-mini" href="#/projects" data-act="proj-go" data-id="' + x.id + '"><span class="row"><b class="grow">' + esc(x.title || "Untitled project") + '</b><span class="badge">' + pc + "%</span></span>" + progress(pc) + "</a>";
    }).join("") + '<p class="small" style="margin:8px 0 0"><a href="#/projects">All projects</a></p>', { dot: "l" });
  }
  function goalsCard() {
    var act = goalList().filter(function (g) { return g.status === "active"; }).slice(0, 3);
    if (!act.length) return "";
    return card("Goals", act.map(function (g) {
      var pc = goalPct(g);
      return '<a class="goal-mini" href="#/goals" data-act="goal-go" data-id="' + g.id + '"><span class="row"><b class="grow">' + esc(g.title || "Untitled goal") + '</b><span class="badge">' + pc + "%</span></span>" + progress(pc) + "</a>";
    }).join("") + '<p class="small" style="margin:8px 0 0"><a href="#/goals">All goals</a></p>', { dot: "s" });
  }

  function viewHome() {
    var t = today(), k = ymd(t);
    ensureDay(k);
    var mk = monthKey(t);
    var quote = QUOTES[(t.getDate() + t.getMonth()) % QUOTES.length];
    var hubs = [].concat.apply([], NAV.filter(function (g) { return g.group === "Life" || g.group === "Productivity" || g.group === "Journal"; }).map(function (g) { return g.items; }));
    var left =
      card("Today's intentions", listEd("days." + k + ".tasks", { prio: true, placeholder: "Add a task for today…", empty: "Nothing planned yet — what would make today feel good?" }), { dot: "p", right: '<a class="btn sm ghost" href="' + hrefDay(t) + '">Open spread ' + ic("arrow") + "</a>" }) +
      card("This week", weekStrip(t), { dot: "b", right: '<a class="btn sm ghost" href="' + hrefWeek(t) + '">Week ' + isoWeek(t) + " " + ic("arrow") + "</a>" }) +
      card("Life hubs", '<div class="tile-links">' + hubs.map(function (h) { return '<a class="tile-link" href="#/' + h[0] + '">' + ic(h[2]) + "<span>" + esc(h[1]) + "</span></a>"; }).join("") + "</div>", { dot: "s" });
    var right =
      card("How are you feeling?", moodPicker("days." + k + ".mood") + '<div class="spacer"></div><label class="lbl">Hydration</label>' + waterPicker("days." + k + ".water"), { cls: "tint-pink", dot: "p" }) +
      card("Habits today", habitChecks(k), { dot: "l", right: '<a class="btn sm ghost" href="#/habits">Tracker</a>' }) +
      healthCard() + dumpCard() + goalsCard() + projectsCard() +
      card("Coming up", upcoming(), { dot: "k" }) +
      card(MONTHS[t.getMonth()] + " intention", bindArea("months." + mk + ".intention", "One sentence to steer the month…", 'style="min-height:64px"') + '<div class="spacer"></div><p class="quote">“' + esc(quote) + "”</p>", { cls: "tint-butter", dot: "b" });
    var y = t.getFullYear(), doy = daysBetween(new Date(y, 0, 1), t) + 1, ylen = daysInMonth(y, 1) === 29 ? 366 : 365, ypct = Math.round(doy / ylen * 100);
    var wk = periodStats(mondayOf(t), addDays(mondayOf(t), 6)), tk = periodStats(t, t), mo = periodStats(new Date(y, t.getMonth(), 1), new Date(y, t.getMonth() + 1, 0));
    var hDone = state.habits.filter(function (h) { return state.habitLog[k] && state.habitLog[k][h.id]; }).length;
    var kpis = '<div class="kpis">' +
      kpi(tk.tasks ? tk.done + "<small>/" + tk.tasks + "</small>" : "0", "tasks done today", hrefDay(t), tk.tasks ? tk.done / tk.tasks : 0) +
      kpi(state.habits.length ? hDone + "<small>/" + state.habits.length + "</small>" : "0", "habits today", "#/habits", state.habits.length ? hDone / state.habits.length : 0) +
      kpi(wk.minutes + "<small> min</small>", "moved this week", "#/fitness") +
      kpi(money(mo.spent), "spent in " + MONTHS[t.getMonth()], "#/finance") + "</div>";
    var banner = state.sample ? '<div class="sample-banner" role="status"><span>You’re looking at a <b>sample planner</b>. Everything here is made up.</span><button class="btn sm pink" data-act="start-fresh">Start fresh</button></div>' : "";
    return banner + '<div class="home-top">' + head(greeting(), prettyDay(t).replace(/, (.*)$/, ', <span class="em">$1</span>'), '<a class="btn pink" href="' + hrefDay(t) + '/review">' + ic("spark") + ' Reflect on today</a><a class="btn" href="' + hrefMonth(t) + '">' + ic("month") + " Month</a>") +
      yearRing(doy / ylen, ypct + "%", "of " + y + " done") + "</div>" +
      '<div class="yline">' + ypct + "% of " + y + " done" + progress(ypct) + "</div>" + kpis + gettingStarted() +
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

  /* the day's schedule: first and last hour, and optional half hours (saved in ui.sched) */
  function schedCfg() {
    var u = state.ui.sched && typeof state.ui.sched === "object" ? state.ui.sched : {}, a = parseInt(u.start, 10), b = parseInt(u.end, 10);
    a = isFinite(a) ? clamp(a, 0, 22) : 6;
    b = isFinite(b) ? clamp(b, a + 1, 23) : Math.max(a + 1, 22);
    return { start: a, end: b, half: u.half === true, open: u.open === true };
  }
  function schedSet(patch) {
    var c = schedCfg();
    state.ui.sched = { start: c.start, end: c.end, half: c.half, open: true };
    Object.keys(patch).forEach(function (k) { state.ui.sched[k] = patch[k]; });
    var s0 = state.ui.sched;
    if (s0.end <= s0.start) { if ("start" in patch) s0.end = Math.min(23, s0.start + 1); else s0.start = Math.max(0, s0.end - 1); }
    save(); render();
  }
  document.addEventListener("toggle", function (e) {
    var d = e.target;
    if (!d || !d.classList || !d.classList.contains("sched-tools")) return;
    var c = schedCfg();
    if (c.open !== d.open) { state.ui.sched = { start: c.start, end: c.end, half: c.half, open: d.open }; save(); }
  }, true);

  function viewDay(d) {
    var k = ymd(d), day = ensureDay(k), wk = ymd(mondayOf(d)), di = dowIdx(d);
    var nowH = new Date().getHours(), isToday = k === todayKey();
    var sc = schedCfg(), step = sc.half ? 30 : 60, rec = day.schedule || {}, lo = sc.start * 60, hi = sc.end * 60 + 60 - step, extra = [];
    /* anything already written stays visible: outside the chosen hours, or between the lines (e.g. 9:30 in hours mode) */
    Object.keys(rec).forEach(function (key) {
      var m = /^(\d{1,2})(_30)?$/.exec(key);
      if (!m || +m[1] > 23 || typeof rec[key] !== "string" || !rec[key]) return;
      var mins = +m[1] * 60 + (m[2] ? 30 : 0);
      if (mins < lo) lo = Math.floor(mins / step) * step;
      if (mins > hi) hi = Math.floor(mins / step) * step;
      extra.push(mins);
    });
    var slots = [];
    for (var tm = lo; tm <= hi; tm += step) slots.push(tm);
    extra.forEach(function (mins) { if (slots.indexOf(mins) < 0) slots.push(mins); });
    slots.sort(function (a, b) { return a - b; });
    var nowM = new Date().getHours() * 60 + Math.floor(new Date().getMinutes() / step) * step, hours = '<div class="hours">';
    slots.forEach(function (mins) {
      var h = Math.floor(mins / 60), half = mins % 60 === 30, lab = (h % 12 || 12) + (half ? ":30" : "") + (h < 12 ? " am" : " pm");
      hours += '<span class="h ' + (isToday && mins === nowM ? "now" : "") + (half ? " half" : "") + '">' + lab + "</span>" + bindInput("days." + k + ".schedule." + h + (half ? "_30" : ""), 'aria-label="' + lab + '"');
    });
    hours += "</div>";
    var hourOpts = function (from, to, sel) { var o = ""; for (var hh = from; hh <= to; hh++) o += '<option value="' + hh + '"' + (hh === sel ? " selected" : "") + ">" + (hh % 12 || 12) + (hh < 12 ? " am" : " pm") + "</option>"; return o; };
    var schedTools = '<details class="sched-tools"' + (sc.open ? " open" : "") + '><summary>Hours</summary><div class="sched-set"><label>From <select data-sched="start" aria-label="First hour">' + hourOpts(0, 22, sc.start) + '</select></label><label>To <select data-sched="end" aria-label="Last hour">' + hourOpts(1, 23, sc.end) + '</select></label>' +
      '<button class="chip ' + (sc.half ? "on" : "") + '" data-act="sched-half" aria-pressed="' + sc.half + '">Half hours</button></div></details>';
    var top3 = [0, 1, 2].map(function (i) { return '<div class="row"><span class="badge pink">' + (i + 1) + "</span>" + bindInput("days." + k + ".top3." + i, 'placeholder="' + ["The one that matters most", "Then this", "And if there's time"][i] + '"') + "</div>"; }).join('<div style="height:8px"></div>');
    var meals = MEAL_SLOTS.map(function (sl) { return '<label class="lbl">' + sl[1] + "</label>" + bindInput("meals." + wk + "." + di + "." + sl[0], 'placeholder="—"'); }).join('<div style="height:8px"></div>');
    var nbPage = findDayPage(k);
    var links =
      '<div class="tile-links">' +
      '<button class="tile-link" data-act="journal-day" data-val="' + k + '">' + ic("book") + "<span>" + (nbPage ? "Open journal page" : "Start journal page") + "</span></button>" +
      '<a class="tile-link" href="#/habits">' + ic("check") + "<span>Habits</span></a>" +
      '<a class="tile-link" href="#/fitness">' + ic("dumbbell") + "<span>Fitness</span></a>" +
      '<a class="tile-link" href="#/meals">' + ic("bowl") + "<span>Meals</span></a>" +
      '<a class="tile-link" href="#/finance">' + ic("wallet") + "<span>Finance</span></a>" +
      '<a class="tile-link" href="#/mind">' + ic("lotus") + "<span>Mind</span></a>" +
      '<a class="tile-link" href="#/home-care">' + ic("house") + "<span>Chores</span></a></div>";
    var workouts = state.workouts.filter(function (w) { return w.date === k; });
    var left =
      card("Top three", top3, { cls: "tint-pink", dot: "p" }) +
      card("Tasks & deadlines", listEd("days." + k + ".tasks", { prio: true, placeholder: "Add a task…", empty: "No tasks yet." }), { dot: "b", right: '<span class="badge">' + day.tasks.filter(function (x) { return x.done; }).length + "/" + day.tasks.length + "</span>" }) +
      card("Schedule", hours, { dot: "k", right: schedTools }) +
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
    var body = "";
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
    return head("Productivity", 'Habit <span class="em">tracker</span>') + body;
  }

  function viewFitness() {
    var tb = tabs("fitness", [["fitness", "Workouts"], ["body", "Body"], ["measure", "Measure"], ["supps", "Vitamins"], ["meds", "Meds"]]);
    var body = "";
    if (tb.cur === "fitness") {
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
    } else if (tb.cur === "measure") {
      body = measureTab();
    } else if (tb.cur === "supps" || tb.cur === "meds") {
      body = healthTab(tb.cur);
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
        '<div class="c12">' + card("Progress photos", progressCard(), { dot: "s" }) + "</div>" +
        '<div class="c8">' + card("Hydration · last 14 days", barChart(bars, state.waterGoal), { dot: "k" }) + "</div>" +
        '<div class="c4">' + card("Today's water", waterPicker("days." + todayKey() + ".water") + '<div class="spacer"></div><label class="lbl">Daily goal (glasses)</label>' + bindNum("waterGoal", "data-rerender"), { dot: "k" }) + "</div></div>";
    }
    return head("Life · Wellness", 'Fit<span class="em">ness</span>') + tb.html + body;
  }


  /* ------------------------------------------------------------ views: fitness extras
     Body measurements, progress photos, vitamins & supplements, medication. */

  var BODY_FIELDS = [["neck", "Neck"], ["chest", "Chest / bust"], ["arm", "Upper arm"], ["waist", "Waist"], ["hips", "Hips"], ["thigh", "Thigh"], ["calf", "Calf"]];
  var PROG_LABELS = ["Before", "Progress", "After"];
  var SUPP_TIMES = ["Morning", "Midday", "Evening", "Bedtime", "With meals", "Any time"];
  var SUPP_IDEAS = ["Vitamin D", "Vitamin C", "Multivitamin", "Magnesium", "Omega-3", "Iron", "B12", "Zinc", "Calcium", "Probiotic", "Collagen", "Creatine"];
  var MED_SLOTS = [["am", "AM"], ["pm", "PM"]];

  function hasV(v) { return v !== "" && v != null && isFinite(parseFloat(v)); }
  function fmtN(n) { return String(Math.round(num(n) * 10) / 10); }
  function bodyUnit(k) { return k === "weight" ? (state.weightUnit || "kg") : state.body.unit; }
  function signed(n) { n = Math.round(n * 10) / 10; return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n); }
  function byDate(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }
  function weighIns() { return state.weights.filter(function (w) { return w.date && hasV(w.value); }).sort(byDate); }

  /* first / latest reading of one measurement (weight comes from the weigh-ins on the Body tab) */
  function bodySeries(k) {
    var src = k === "weight" ? weighIns() : state.body.log.slice().sort(byDate).filter(function (e) { return e.date && hasV(e[k]); });
    return src.map(function (e) { return num(k === "weight" ? e.value : e[k]); });
  }
  function bodyStart(k) { var s = state.body.start[k]; if (hasV(s)) return num(s); var ser = bodySeries(k); return ser.length ? ser[0] : null; }
  function bodyNow(k) { var ser = bodySeries(k); return ser.length ? ser[ser.length - 1] : null; }
  function bodyGoal(k) { var g = state.body.goal[k]; return hasV(g) ? num(g) : null; }
  function bodyBmi() {
    var h = num(state.body.height), w = bodyNow("weight");
    if (!h || !w) return null;
    var cm = state.body.unit === "in" ? h * 2.54 : h, u = state.weightUnit || "kg", kg = u === "lb" ? w * 0.45359237 : u === "st" ? w * 6.35029318 : w;
    var m = cm / 100;
    return m > 0.5 && kg > 5 ? kg / (m * m) : null;
  }

  /* a plain stylised figure with a tape line at each measuring spot */
  function smoothPath(pts) {
    var n = pts.length, d = "M" + pts[0][0].toFixed(1) + "," + pts[0][1].toFixed(1);
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += "C" + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + "," + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + " " + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + "," + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + " " + p2[0].toFixed(1) + "," + p2[1].toFixed(1);
    }
    return d + "Z";
  }
  function bodyFigure() {
    var cx = 170;
    var side = [[-11, 56], [-12, 74], [-44, 86], [-46, 104], [-38, 136], [-27, 172], [-41, 208], [-43, 238], [-36, 292], [-28, 336], [-30, 372], [-24, 408], [-26, 424], [-8, 424], [-8, 408], [-10, 372], [-10, 336], [-6, 290], [-3, 250]];
    var body = smoothPath(side.map(function (p) { return [cx + p[0], p[1]]; }).concat([[cx, 238]], side.slice().reverse().map(function (p) { return [cx - p[0], p[1]]; })));
    var arm = [[-48, 96], [-62, 150], [-68, 206], [-58, 208], [-50, 160], [-42, 110]];
    function armShape(sign) { return smoothPath(arm.map(function (p) { return [cx + sign * p[0], p[1]]; })); }
    var marks = [
      { k: "neck", y: 70, w: 14, side: "L" }, { k: "chest", y: 130, w: 42, side: "L" }, { k: "waist", y: 172, w: 30, side: "L" }, { k: "hips", y: 212, w: 46, side: "L" },
      { k: "arm", y: 152, w: 0, side: "R", ax: cx + 62 }, { k: "thigh", y: 264, w: 38, side: "R" }, { k: "calf", y: 372, w: 32, side: "R" }
    ];
    var label = function (k) { return BODY_FIELDS.filter(function (f) { return f[0] === k; })[0][1]; };
    var out = '<svg class="body-fig" viewBox="0 0 340 440" role="img" aria-label="Body outline with your latest measurements" xmlns="http://www.w3.org/2000/svg">' +
      '<circle class="bf-skin" cx="' + cx + '" cy="34" r="21"/><path class="bf-skin" d="' + armShape(1) + '"/><path class="bf-skin" d="' + armShape(-1) + '"/><path class="bf-skin" d="' + body + '"/>';
    marks.forEach(function (m) {
      var v = hasV(state.body.log.length ? bodyNow(m.k) : null) ? bodyNow(m.k) : bodyStart(m.k);
      var left = m.side === "L", x1 = m.ax ? m.ax - 8 : cx - m.w, x2 = m.ax ? m.ax + 8 : cx + m.w, tx = left ? 8 : 332, ex = left ? x1 : x2;
      out += '<line class="bf-tape" x1="' + x1 + '" y1="' + m.y + '" x2="' + x2 + '" y2="' + m.y + '"/>' +
        '<line class="bf-lead" x1="' + (left ? tx + 78 : tx - 78) + '" y1="' + m.y + '" x2="' + ex + '" y2="' + m.y + '"/>' +
        '<text class="bf-name" x="' + tx + '" y="' + (m.y - 4) + '" text-anchor="' + (left ? "start" : "end") + '">' + esc(label(m.k)) + '</text>' +
        '<text class="bf-val" x="' + tx + '" y="' + (m.y + 14) + '" text-anchor="' + (left ? "start" : "end") + '">' + (v == null ? "—" : esc(fmtN(v) + " " + state.body.unit)) + "</text>";
    });
    return out + "</svg>";
  }

  function measureTab() {
    var b = state.body, u = b.unit;
    var unitChips = '<div class="chips">' + [["cm", "cm"], ["in", "inches"]].map(function (x) {
      return '<button class="chip ' + (x[0] === u ? "on" : "") + '" data-act="body-unit" data-val="' + x[0] + '" aria-pressed="' + (x[0] === u) + '">' + x[1] + "</button>";
    }).join("") + "</div>";
    var setup = '<div class="bm-set"><span class="bm-h"></span><b class="bm-h">Start</b><b class="bm-h">Goal</b>' + BODY_FIELDS.concat([["weight", "Weight"]]).map(function (f) {
      return '<label class="bm-l" for="bm-s-' + f[0] + '">' + f[1] + ' <small>' + esc(bodyUnit(f[0])) + "</small></label>" +
        bindNum("body.start." + f[0], 'id="bm-s-' + f[0] + '" step="0.1" aria-label="Start ' + f[1] + '"') + bindNum("body.goal." + f[0], 'step="0.1" aria-label="Goal ' + f[1] + '"');
    }).join("") + "</div>" +
      '<p class="small muted" style="margin:10px 0 0">Leave Start empty and your first check-in becomes the starting point. Weight comes from your weigh-ins on the Body tab.</p>';
    var rows = BODY_FIELDS.concat([["weight", "Weight"]]).map(function (f) {
      var k = f[0], s = bodyStart(k), n = bodyNow(k), g = bodyGoal(k);
      if (s == null && n == null && g == null) return "";
      var pc = s != null && n != null && g != null && s !== g ? clamp(Math.round((s - n) / (s - g) * 100), 0, 100) : null;
      return '<div class="bm-row"><div class="row"><b class="grow">' + f[1] + '</b><span class="bm-now">' + (n == null ? "—" : esc(fmtN(n) + " " + bodyUnit(k))) + "</span>" +
        (s != null && n != null && s !== n ? '<span class="badge">' + signed(n - s) + "</span>" : "") + "</div>" +
        '<div class="small muted">' + (s != null ? "Start " + fmtN(s) : "No start yet") + (g != null ? " · Goal " + fmtN(g) : "") + "</div>" + (pc != null ? progress(pc) : "") + "</div>";
    }).join("");
    var bmi = bodyBmi();
    var prog = (rows || '<div class="empty">Add a check-in below and your progress will show up here.</div>') +
      (bmi ? '<p class="small muted" style="margin:12px 0 0">BMI about <b>' + fmtN(bmi) + "</b> from your height and latest weigh-in. It is a rough guide only — it can't tell muscle from fat.</p>" : "");
    var log = b.log.slice().sort(function (x, y) { return x.date < y.date ? 1 : x.date > y.date ? -1 : 0; });
    var entries = log.slice(0, 60).map(function (e) {
      var path = "body.log";
      return '<div class="bm-entry"><div class="row"><b class="grow">Check-in</b>' + itemInput(path, e, "date", 'style="max-width:170px" aria-label="Date"', "date") +
        '<button class="del" data-act="list-del" data-path="' + path + '" data-id="' + e.id + '" aria-label="Delete check-in">' + ic("x") + "</button></div>" +
        '<div class="bm-fields">' + BODY_FIELDS.map(function (f) {
          return '<label class="bm-f"><span>' + f[1] + "</span>" + itemInput(path, e, f[0], 'step="0.1" aria-label="' + f[1] + '"', "number") + "</label>";
        }).join("") + "</div>" +
        '<input type="text" class="txt bm-note" placeholder="Note (optional)" maxlength="300" aria-label="Note" value="' + esc(e.note) + '" data-item="' + path + "|" + e.id + '|note"></div>';
    }).join("");
    var logCard = '<div class="row wrap" style="margin-bottom:12px"><button class="btn pink" data-act="body-add">' + ic("plus") + " New check-in</button>" +
      '<span class="small muted grow">Measure the same spots each time — most people check in every 1–4 weeks.</span></div>' +
      (entries ? '<div class="bm-entries">' + entries + "</div>" : '<div class="empty">No check-ins yet. Tap “New check-in” and fill in what you measured.</div>');
    return '<div class="grid"><div class="c5">' + card("Your measurements", bodyFigure() + '<p class="small muted" style="margin:6px 0 0;text-align:center">Latest readings (' + esc(u) + ")</p>", { cls: "tint-pink", dot: "p", right: unitChips }) + "</div>" +
      '<div class="c7 stack">' + card("Start &amp; goal", setup + '<div class="spacer"></div><label class="lbl" for="bm-h">Height (' + esc(u) + ", optional)</label>" + bindNum("body.height", 'id="bm-h" step="0.1" style="max-width:140px" data-rerender'), { dot: "b" }) +
      card("Progress so far", prog, { dot: "s" }) + "</div>" +
      '<div class="c12">' + card("Check-in log", logCard, { dot: "l" }) + "</div>" +
      '<div class="c12">' + card("Notes", bindArea("body.notes", "How you feel, what's working, how clothes fit…", 'style="min-height:84px"'), { cls: "tint-butter", dot: "b" }) + "</div></div>";
  }

  /* ---- progress photos ---- */
  function progList() { return state.progress.shots.slice().sort(byDate); }
  function progCaption(s) { return (s.label || "Progress") + (s.date ? " · " + dateText(s.date) : "") + (hasV(s.weight) ? " · " + fmtN(s.weight) + " " + (state.weightUnit || "kg") : ""); }
  function progressCard() {
    var list = progList(), path = "progress.shots", wu = state.weightUnit || "kg";
    var items = list.map(function (s, i) {
      var u = imgs.url(s.imgId);
      return '<figure class="al-item ps-item"><button class="al-img" data-act="prog-view" data-i="' + i + '" aria-label="Open photo ' + (i + 1) + '">' + (u ? '<img alt="" src="' + u + '">' : ic("image")) + "</button>" +
        '<div class="ps-meta">' + itemSelect(path, s, "label", PROG_LABELS, 'aria-label="Type of photo"') + itemInput(path, s, "date", 'aria-label="Date"', "date") +
        '<div class="ps-w">' + itemInput(path, s, "weight", 'step="0.1" placeholder="Weight" aria-label="Weight at this photo"', "number") + "<span>" + esc(wu) + "</span></div>" +
        '<input type="text" class="txt" aria-label="Note" placeholder="Note…" maxlength="200" value="' + esc(s.note) + '" data-item="' + path + "|" + s.id + '|note">' +
        '<button class="btn sm ghost" data-act="prog-del" data-id="' + s.id + '" aria-label="Remove photo">' + ic("x") + " Remove</button></div></figure>";
    }).join("");
    var cmp = "";
    if (list.length >= 2) {
      var ids = list.map(function (s) { return s.id; });
      if (ids.indexOf(state.ui.cmpA) < 0) state.ui.cmpA = ids[0];
      if (ids.indexOf(state.ui.cmpB) < 0) state.ui.cmpB = ids[ids.length - 1];
      var opts = list.map(function (s) { return [s.id, progCaption(s)]; });
      var A = list[ids.indexOf(state.ui.cmpA)], B = list[ids.indexOf(state.ui.cmpB)];
      var side = function (s, which) {
        var u = imgs.url(s.imgId);
        return '<div class="cmp-side"><label class="lbl" for="cmp-' + which + '">' + (which === "A" ? "Left" : "Right") + "</label>" + bindSelect("ui.cmp" + which, opts, 'id="cmp-' + which + '" data-rerender') +
          '<button class="cmp-img" data-act="prog-view" data-i="' + list.indexOf(s) + '" aria-label="Open this photo">' + (u ? '<img alt="" src="' + u + '">' : ic("image")) + "</button><b>" + esc(s.label || "Progress") + '</b><span class="small muted">' + esc(s.date ? dateText(s.date) : "No date") + (hasV(s.weight) ? " · " + fmtN(s.weight) + " " + esc(wu) : "") + "</span></div>";
      };
      var diff = "";
      if (A !== B) {
        var bits = [];
        if (A.date && B.date) { var dd = Math.round((parseD(B.date) - parseD(A.date)) / 864e5); if (dd) bits.push(Math.abs(dd) >= 14 ? Math.round(Math.abs(dd) / 7) + " weeks apart" : Math.abs(dd) + (Math.abs(dd) === 1 ? " day apart" : " days apart")); }
        if (hasV(A.weight) && hasV(B.weight) && num(A.weight) !== num(B.weight)) bits.push(signed(num(B.weight) - num(A.weight)) + " " + wu);
        if (bits.length) diff = '<p class="cmp-diff">' + esc(bits.join(" · ")) + "</p>";
      }
      cmp = '<div class="cmp">' + side(A, "A") + side(B, "B") + "</div>" + diff;
    }
    var grid = '<div class="album ps-grid"><label class="v-add al-add">' + ic("plus") + "<span>Add photos</span>" + '<input type="file" accept="image/*" multiple hidden data-bulk="progress|x"></label>' + items + "</div>";
    return '<p class="small muted" style="margin:0 0 12px">Before, during and after — add as many as you like. Photos stay on this device (and in your backup).</p>' +
      (cmp ? '<h4 class="sub-h">Compare</h4>' + cmp + '<h4 class="sub-h">All photos</h4>' : "") + grid +
      (list.length ? "" : '<p class="empty" style="margin-top:14px">No progress photos yet. Add your “before” photo whenever you like — you can add more as you go.</p>');
  }
  function addProgress(files) {
    if (!files || !files.length) return;
    var list = Array.prototype.slice.call(files, 0, 40).filter(function (f) { return /^image\//.test(f.type); });
    if (!list.length) { toast("Those files aren't pictures."); return; }
    var first = !state.progress.shots.length;
    Promise.all(list.map(function (f) {
      return new Promise(function (res) { shrinkToBlob(f, 1400, function (blob) { var id = "img_" + uid(); imgs.put(id, blob).then(function () { res(id); }); }); });
    })).then(function (ids) {
      var tk = todayKey(), w = state.weights.filter(function (x) { return x.date === tk && hasV(x.value); })[0];
      ids.forEach(function (i, n) { state.progress.shots.push({ id: uid(), date: tk, label: first && n === 0 ? "Before" : "Progress", weight: w ? w.value : "", note: "", imgId: i }); });
      save(); render();
      toast(ids.length + (ids.length === 1 ? " photo added" : " photos added"));
    });
  }

  /* ---- vitamins & supplements, medication: a tick for each dose each day ---- */
  function healthRows(kind) {
    var items = state[kind].items, rows = [];
    if (kind === "supps") {
      items.slice().sort(function (a, b) { return SUPP_TIMES.indexOf(a.time) - SUPP_TIMES.indexOf(b.time); }).forEach(function (it) { rows.push({ key: it.id, item: it, slot: "" }); });
    } else {
      items.forEach(function (it) { MED_SLOTS.forEach(function (sl) { if ((it.times || []).indexOf(sl[0]) >= 0) rows.push({ key: it.id + "-" + sl[0], item: it, slot: sl[1] }); }); });
      rows.sort(function (a, b) { return (a.slot === b.slot ? 0 : a.slot === "AM" ? -1 : 1); });
    }
    return rows;
  }
  function hTicked(kind, key, dk) { var l = state[kind].log[dk]; return !!(l && l[key]); }
  function hCount(kind, rows, from, to) {   /* doses due and ticked from..to (dates), not counting days before an item was added */
    var due = 0, ok = 0, tk = todayKey();
    for (var d = from; d <= to; d = addDays(d, 1)) {
      var dk = ymd(d);
      if (dk > tk) break;
      rows.forEach(function (r) { if (!r.item.added || dk >= r.item.added) { due++; if (hTicked(kind, r.key, dk)) ok++; } });
    }
    return { due: due, ok: ok };
  }
  function hStreak(kind, rows) {
    if (!rows.length) return 0;
    var full = function (dt) {
      var dk = ymd(dt), due = rows.filter(function (r) { return !r.item.added || dk >= r.item.added; });
      return due.length > 0 && due.every(function (r) { return hTicked(kind, r.key, dk); });
    };
    var d = today(), n = 0;
    if (!full(d)) d = addDays(d, -1);
    while (n < 1000 && full(d)) { n++; d = addDays(d, -1); }
    return n;
  }
  function healthTab(kind) {
    var isMed = kind === "meds", S = state[kind], rows = healthRows(kind), tk = todayKey();
    var wkStart = addDays(mondayOf(today()), state.ui.hwOff * 7), days = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return addDays(wkStart, i); });
    var wkEnd = days[6];
    var nav = '<div class="row wrap hw-nav"><button class="icon-btn sm" data-act="health-wk" data-val="-1" aria-label="Previous week">' + ic("left") + '</button><b class="grow" style="text-align:center">' +
      (state.ui.hwOff === 0 ? "This week" : "Week of " + wkStart.getDate() + " " + MON3[wkStart.getMonth()]) + '</b><button class="icon-btn sm" data-act="health-wk" data-val="1" aria-label="Next week"' + (state.ui.hwOff >= 0 ? " disabled" : "") + ">" + ic("arrow") + "</button>" +
      (state.ui.hwOff !== 0 ? '<button class="btn sm ghost" data-act="health-wk" data-val="0">This week</button>' : "") + "</div>";
    var grid = "";
    if (rows.length) {
      var hrow = '<tr><th class="hg-name"><span class="sr">' + (isMed ? "Medication" : "Vitamin or supplement") + "</span></th>" + days.map(function (d, i) {
        return '<th class="hg-day' + (ymd(d) === tk ? " today" : "") + '"><span>' + DOW1[i] + "</span><small>" + d.getDate() + "</small></th>";
      }).join("") + "</tr>";
      var body = rows.map(function (r) {
        var c = hCount(kind, [r], wkStart, wkEnd);
        return '<tr><th class="hg-name" scope="row"><b>' + esc(r.item.name || "Unnamed") + "</b><small>" + esc([r.item.dose, isMed ? r.slot : r.item.time].filter(Boolean).join(" · ")) + (c.due ? " · " + c.ok + "/" + c.due : "") + "</small></th>" + days.map(function (d) {
          var dk = ymd(d), on = hTicked(kind, r.key, dk), fut = dk > tk;
          return '<td class="hg-cell"><button class="hdot' + (on ? " on" : "") + '" data-act="health-tick" data-kind="' + kind + '" data-key="' + r.key + '" data-date="' + dk + '" aria-pressed="' + on + '" aria-label="' + esc((r.item.name || "Item") + (r.slot ? " " + r.slot : "") + ", " + DOW[i2(d)] + " " + d.getDate() + (on ? ", taken" : "")) + '"' + (fut ? " disabled" : "") + ">" + (on ? ic("check") : "") + "</button></td>";
        }).join("") + "</tr>";
      }).join("");
      grid = '<table class="hgrid">' + hrow + body + "</table>";
    } else grid = '<div class="empty">' + (isMed ? "No medication added yet. Add one below." : "No vitamins or supplements added yet. Add one below, or tap a suggestion.") + "</div>";
    var all = hCount(kind, rows, wkStart, wkEnd), mo = hCount(kind, rows, addDays(today(), -29), today()), st = hStreak(kind, rows);
    var summary = rows.length ? '<ul class="insights"><li class="k-info"><span class="i-dot"></span><span>' + (state.ui.hwOff === 0 ? "This week" : "That week") + ": <b>" + all.ok + " of " + all.due + "</b> " + (isMed ? "doses" : "ticks") + (all.due ? " (" + Math.round(all.ok / all.due * 100) + "%)" : "") + ".</span></li>" +
      (mo.due >= 7 ? '<li class="k-info"><span class="i-dot"></span><span>Last 30 days: <b>' + Math.round(mo.ok / mo.due * 100) + "%</b> ticked.</span></li>" : "") +
      (st >= 2 ? '<li class="k-good"><span class="i-dot"></span><span><b>' + st + "</b> days in a row with everything ticked.</span></li>" : "") + "</ul>" : "";
    var path = kind + ".items";
    var list = S.items.map(function (it) {
      var extra;
      if (isMed) {
        var dl = it.refill ? daysBetween(today(), parseD(it.refill)) : null;
        extra = '<div class="hl-times">' + MED_SLOTS.map(function (sl) { var on = (it.times || []).indexOf(sl[0]) >= 0; return '<button class="chip ' + (on ? "on" : "") + '" data-act="med-slot" data-id="' + it.id + '" data-val="' + sl[0] + '" aria-pressed="' + on + '">' + sl[1] + "</button>"; }).join("") + "</div>" +
          '<label class="hl-refill"><span>Refill by</span>' + itemInput(path, it, "refill", 'aria-label="Refill date"', "date") + "</label>" +
          (dl != null && dl <= 7 ? '<span class="badge warn">' + (dl < 0 ? "Refill date passed" : dl === 0 ? "Refill today" : "Refill in " + dl + (dl === 1 ? " day" : " days")) + "</span>" : "");
      } else extra = itemSelect(path, it, "time", SUPP_TIMES, 'aria-label="When"');
      return '<li class="hl-item"><div class="hl-top"><input type="text" class="txt" maxlength="60" placeholder="' + (isMed ? "Medication name" : "Vitamin or supplement") + '" aria-label="Name" value="' + esc(it.name) + '" data-item="' + path + "|" + it.id + '|name">' +
        '<input type="text" class="txt hl-dose" maxlength="60" placeholder="Dose" aria-label="Dose" value="' + esc(it.dose) + '" data-item="' + path + "|" + it.id + '|dose">' +
        '<button class="del" data-act="list-del" data-path="' + path + '" data-id="' + it.id + '" aria-label="Delete">' + ic("x") + "</button></div>" +
        '<div class="hl-extra">' + extra + "</div>" +
        '<input type="text" class="txt" maxlength="160" placeholder="' + (isMed ? "Notes (e.g. with food, prescribed by…)" : "Notes (e.g. brand, with food)") + '" aria-label="Notes" value="' + esc(it.notes) + '" data-item="' + path + "|" + it.id + '|notes"></li>';
    }).join("");
    var addForm = '<div class="row wrap" data-form="' + kind + '-add"><input type="text" name="name" class="grow" style="min-width:150px" maxlength="60" placeholder="' + (isMed ? "Medication name" : "Vitamin or supplement") + '" aria-label="Name"><input type="text" name="dose" style="max-width:130px" maxlength="60" placeholder="Dose" aria-label="Dose">' +
      (isMed ? "" : '<select name="time" style="max-width:140px" aria-label="When">' + SUPP_TIMES.map(function (t) { return "<option>" + t + "</option>"; }).join("") + "</select>") +
      '<button class="btn pink" data-act="' + kind + '-add">' + ic("plus") + " Add</button></div>" +
      (isMed ? "" : '<div class="chips ideas">' + SUPP_IDEAS.map(function (n) { return '<button class="chip" data-act="supps-idea" data-val="' + esc(n) + '">' + esc(n) + "</button>"; }).join("") + "</div>");
    var note = isMed
      ? '<p class="small muted" style="margin:0 0 12px">A personal log to help you remember — not medical advice. This planner can’t send reminders while it’s closed, so keep using your phone’s alarms for doses.</p>'
      : '<p class="small muted" style="margin:0 0 12px">Tick each one as you take it. Ticking a past day is fine if you forgot.</p>';
    return note + '<div class="grid"><div class="c12">' + card(isMed ? "Medication tracker" : "Vitamins &amp; supplements", nav + grid + (summary ? '<div class="spacer"></div>' + summary : ""), { cls: isMed ? "tint-butter" : "tint-pink", dot: isMed ? "b" : "p" }) + "</div>" +
      '<div class="c7">' + card(isMed ? "Your medication" : "Your list", (list ? '<ul class="hl">' + list + "</ul>" : "") + '<div class="spacer"></div>' + addForm, { dot: "s" }) + "</div></div>";
  }
  function i2(d) { return (d.getDay() + 6) % 7; }   /* Monday = 0 */

  /* today's doses, shown on the Today page */
  function healthCard() {
    var parts = ["supps", "meds"].map(function (kind) { return healthRows(kind).map(function (r) { return { kind: kind, r: r }; }); }), all = parts[0].concat(parts[1]), tk = todayKey();
    if (!all.length) return "";
    var done = all.filter(function (x) { return hTicked(x.kind, x.r.key, tk); }).length;
    return card("Vitamins &amp; meds", '<ul class="hl-today">' + all.slice(0, 8).map(function (x) {
      var on = hTicked(x.kind, x.r.key, tk);
      return '<li><button class="hdot' + (on ? " on" : "") + '" data-act="health-tick" data-kind="' + x.kind + '" data-key="' + x.r.key + '" data-date="' + tk + '" aria-pressed="' + on + '" aria-label="' + esc((x.r.item.name || "Item") + (x.r.slot ? " " + x.r.slot : "")) + '">' + (on ? ic("check") : "") + "</button><span class=\"grow\">" + esc(x.r.item.name || "Unnamed") + '<small class="muted"> ' + esc([x.r.item.dose, x.kind === "meds" ? x.r.slot : x.r.item.time].filter(Boolean).join(" · ")) + "</small></span></li>";
    }).join("") + "</ul>" + (all.length > 8 ? '<p class="small muted" style="margin:6px 0 0">+' + (all.length - 8) + " more</p>" : "") +
      '<p class="small" style="margin:8px 0 0">' + done + " of " + all.length + ' ticked today · <a href="#/fitness" data-act="tab-go" data-key="fitness" data-val="' + (parts[1].length && !parts[0].length ? "meds" : "supps") + '">Open</a></p>', { dot: "k" });
  }

  /* ------------------------------------------------------------ views: meals */

  function categorize(item) {
    var cats = Object.keys(GROCERY_WORDS);
    for (var i = 0; i < cats.length; i++) if (GROCERY_WORDS[cats[i]].test(item)) return cats[i];
    return "Other";
  }


  /* ---- recipe cards: sections (like the vision board) holding recipes, both with photos ---- */
  function safeColor(c) { return COLORS.indexOf(c) >= 0 ? c : "pink"; }
  function photoLabel(path, item, text) {
    return '<label class="icon-btn sm" title="' + text + '" aria-label="' + text + '">' + ic("image") + '<input type="file" accept="image/*" hidden data-photo="' + path + "|" + item.id + '"></label>';
  }
  function recipePhoto(r) {
    var u = imgs.url(r.imgId);
    return u
      ? '<div class="r-photo"><img alt="" src="' + u + '"><div class="v-actions">' + photoLabel("recipes", r, "Change photo") + '<button class="icon-btn sm" data-act="photo-remove" data-path="recipes" data-id="' + r.id + '" aria-label="Remove photo">' + ic("x") + "</button></div></div>"
      : '<label class="r-photo r-empty">' + ic("image") + "<span>Add a photo</span>" + '<input type="file" accept="image/*" hidden data-photo="recipes|' + r.id + '"></label>';
  }
  function recipeCard(r) {
    return '<div class="recipe">' + recipePhoto(r) +
      itemInput("recipes", r, "text", 'class="txt" style="font-family:var(--serif);font-size:1.3rem;font-weight:600;background:transparent;box-shadow:none;padding:2px 0" aria-label="Recipe name"') +
      '<div class="r-meta">' + itemSelect("recipes", r, "sec", state.recipeSections.map(function (x) { return [x.id, x.name]; }), 'aria-label="Section"') + itemInput("recipes", r, "time", 'placeholder="Time" aria-label="Time"') + itemInput("recipes", r, "serves", 'placeholder="Serves" aria-label="Serves"') + "</div>" +
      '<label class="lbl">Ingredients · one per line</label><textarea data-item="recipes|' + r.id + '|ingredients" style="min-height:110px;font-size:12.5px">' + esc(r.ingredients) + "</textarea>" +
      '<label class="lbl">Method</label><textarea data-item="recipes|' + r.id + '|method" style="min-height:70px;font-size:12.5px">' + esc(r.method) + "</textarea>" +
      '<div class="row" style="margin-top:4px"><button class="btn sm butter grow" data-act="recipe-grocery" data-id="' + r.id + '">' + ic("plus") + ' Add to groceries</button><button class="del" data-act="recipe-del" data-id="' + r.id + '" aria-label="Delete recipe">' + ic("trash") + "</button></div></div>";
  }
  function sectionTile(sec) {
    var n = state.recipes.filter(function (r) { return r.sec === sec.id; }).length, u = imgs.url(sec.imgId);
    return '<div class="v-tile rs-tile" style="background:var(--' + safeColor(sec.color) + ')">' + (u ? '<img alt="" src="' + u + '">' : "") +
      '<button class="rs-open" data-act="rsec-open" data-id="' + sec.id + '" aria-label="Open ' + esc(sec.name) + '"></button>' +
      '<div class="v-actions">' + photoLabel("recipeSections", sec, "Add a cover photo") +
      (u ? '<button class="icon-btn sm" data-act="photo-remove" data-path="recipeSections" data-id="' + sec.id + '" aria-label="Remove cover photo">' + ic("upload") + "</button>" : "") +
      '<button class="icon-btn sm" data-act="vb-color" data-path="recipeSections" data-id="' + sec.id + '" aria-label="Change colour">' + ic("spark") + '</button><button class="icon-btn sm" data-act="rsec-del" data-id="' + sec.id + '" aria-label="Delete section">' + ic("x") + "</button></div>" +
      '<div class="rs-foot">' + itemInput("recipeSections", sec, "name", 'class="rs-name" maxlength="40" placeholder="Section name" aria-label="Section name"') + '<span class="rs-count">' + n + (n === 1 ? " recipe" : " recipes") + "</span></div></div>";
  }
  function viewRecipes() {
    var open = state.recipeSections.filter(function (x) { return x.id === state.ui.recipeSec; })[0];
    if (open) {
      var mine = state.recipes.filter(function (r) { return r.sec === open.id; });
      return '<div class="rs-head"><button class="btn sm ghost" data-act="rsec-back">' + ic("left") + ' All sections</button><h2 class="rs-title">' + esc(open.name || "Recipes") + '</h2><span class="small muted">' + mine.length + (mine.length === 1 ? " recipe" : " recipes") + "</span></div>" +
        '<div class="recipes"><button class="recipe v-add" style="min-height:150px" data-act="recipe-add" data-sec="' + open.id + '">' + ic("plus") + "<span>New recipe card</span></button>" + mine.map(recipeCard).join("") + "</div>" +
        (mine.length ? "" : '<p class="empty" style="margin-top:14px">Nothing in ' + esc(open.name || "this section") + " yet. Add your first recipe above.</p>");
    }
    var pick = state.ui.recipePick
      ? '<div class="rs-pick card"><p class="small muted" style="margin:0 0 8px">Which section is it for?</p><div class="chips">' + state.recipeSections.map(function (x) { return '<button class="chip" data-act="recipe-add" data-sec="' + x.id + '">' + esc(x.name || "Untitled") + "</button>"; }).join("") + "</div></div>"
      : "";
    return '<div class="rs-adds"><button class="v-add" data-act="recipe-pick">' + ic("plus") + "<span>New recipe card</span></button><button class=\"v-add\" data-act=\"rsec-add\">" + ic("plus") + "<span>New section</span></button></div>" + pick + '<div class="rs-grid">' + state.recipeSections.map(sectionTile).join("") + "</div>";
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
      body = viewRecipes();
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


  /* ---- shopping lists & wishlists: picture cards with a link to the shop ---- */
  var WISH_CATS = [["Clothing", "👗"], ["Accessories", "👜"], ["Makeup", "💄"], ["Skincare", "🧴"], ["Hair", "💇"], ["Toiletries", "🧼"], ["Home goods", "🏠"], ["Cleaning supplies", "🧽"], ["Tech", "🔌"], ["Gifts", "🎁"], ["Other", "🛍️"]];
  function wishCatNames() { return WISH_CATS.map(function (c) { return c[0]; }); }
  function wishEmoji(cat) { var c = WISH_CATS.filter(function (x) { return x[0] === cat; })[0]; return c ? c[1] : "🛍️"; }
  /* only ordinary web addresses are ever used as links or pictures */
  function safeUrl(v) {
    v = String(v == null ? "" : v).trim();
    if (!v) return "";
    if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = "https://" + v;
    return /^https?:\/\/[^\s"'<>\\]+$/i.test(v) && v.length <= 500 ? v : "";
  }
  function urlHost(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } }
  function wishCard(it) {
    var path = "finance.wish", up = imgs.url(it.imgId), pu = safeUrl(it.imgUrl), link = safeUrl(it.link), host = link ? urlHost(link) : "";
    var photo;
    if (up) photo = '<div class="wc-photo"><img class="wimg" alt="" src="' + up + '"></div>';
    else if (pu) photo = '<div class="wc-photo"><img class="wimg" alt="" loading="lazy" referrerpolicy="no-referrer" src="' + esc(pu) + '"><span class="wc-ph">' + wishEmoji(it.cat) + "<small>Picture unavailable</small></span></div>";
    else photo = '<div class="wc-photo"><span class="wc-ph">' + wishEmoji(it.cat) + "</span></div>";
    var picBtns = '<label class="icon-btn sm" title="' + (up ? "Change photo" : "Upload a photo") + '" aria-label="' + (up ? "Change photo" : "Upload a photo") + '">' + ic("image") + '<input type="file" accept="image/*" hidden data-photo="' + path + "|" + it.id + '"></label>' +
      (up ? '<button class="icon-btn sm" data-act="photo-remove" data-path="' + path + '" data-id="' + it.id + '" aria-label="Remove photo">' + ic("x") + "</button>" : "");
    var hearts = [1, 2, 3, 4, 5].map(function (n) { return '<button class="tc-heart' + (n <= it.want ? " on" : "") + '" data-act="wish-want" data-id="' + it.id + '" data-val="' + n + '" aria-label="How much you want it: ' + n + ' of 5" aria-pressed="' + (n === it.want) + '">' + ic("heart") + "</button>"; }).join("");
    return '<article class="wcard' + (it.done ? " done" : "") + '">' + photo + '<div class="wc-tools">' + picBtns + '<span class="tc-hearts" role="group" aria-label="How much you want it">' + hearts + "</span></div>" +
      '<input type="text" class="wc-name" maxlength="120" placeholder="What is it?" aria-label="Item name" value="' + esc(it.text) + '" data-item="' + path + "|" + it.id + '|text">' +
      '<div class="wc-row">' + itemInput(path, it, "price", 'placeholder="Price" aria-label="Price" data-rerender step="0.01" min="0"', "number") + itemSelect(path, it, "cat", wishCatNames(), 'aria-label="Category" data-rerender') + "</div>" +
      '<input type="text" class="wc-link" maxlength="500" inputmode="url" placeholder="Link to the item (https://…)" aria-label="Link" value="' + esc(it.link) + '" data-item="' + path + "|" + it.id + '|link" data-rerender>' +
      (link ? '<a class="btn sm wc-open" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + ic("arrow") + " Open" + (host ? " · " + esc(host) : "") + "</a>" : "") +
      '<details class="wc-more"' + (it.imgUrl && !up ? " open" : "") + "><summary>Picture from a web address</summary><input type=\"text\" maxlength=\"500\" inputmode=\"url\" placeholder=\"Paste an image address (https://…)\" aria-label=\"Image address\" value=\"" + esc(it.imgUrl) + '" data-item="' + path + "|" + it.id + '|imgUrl" data-rerender></details>' +
      '<input type="text" class="wc-note" maxlength="300" placeholder="Notes (size, colour, shade…)" aria-label="Notes" value="' + esc(it.note) + '" data-item="' + path + "|" + it.id + '|note">' +
      '<div class="wc-foot"><label class="of-pack"><input type="checkbox" class="check" data-item="' + path + "|" + it.id + '|done" data-rerender ' + (it.done ? "checked" : "") + "> Bought</label>" +
      (it.done ? "" : '<button class="btn sm ghost" data-act="wish-move" data-id="' + it.id + '">' + (it.list === "wish" ? "Move to shopping list" : "Move to wishlist") + "</button>") +
      '<button class="del" data-act="list-del" data-path="' + path + '" data-id="' + it.id + '" aria-label="Delete item">' + ic("x") + "</button></div></article>";
  }
  function wishTab() {
    var mode = state.ui.wishMode, cat = state.ui.wishCat, all = state.finance.wish;
    var inMode = all.filter(function (x) { return mode === "bought" ? x.done : !x.done && x.list === mode; });
    var shown = inMode.filter(function (x) { return !cat || x.cat === cat; }).sort(function (a, b) { return (b.want - a.want); });
    var cnt = function (m) { return all.filter(function (x) { return m === "bought" ? x.done : !x.done && x.list === m; }).length; };
    var modes = '<div class="chips">' + [["shop", "Shopping list"], ["wish", "Wishlist"], ["bought", "Bought"]].map(function (m) {
      return '<button class="chip ' + (mode === m[0] ? "on" : "") + '" data-act="wish-mode" data-val="' + m[0] + '" aria-pressed="' + (mode === m[0]) + '">' + m[1] + " (" + cnt(m[0]) + ")</button>";
    }).join("") + "</div>";
    var cats = '<div class="chips wish-cats"><button class="chip ' + (!cat ? "on" : "") + '" data-act="wish-cat" data-val="" aria-pressed="' + !cat + '">All (' + inMode.length + ")</button>" + WISH_CATS.map(function (c) {
      var n = inMode.filter(function (x) { return x.cat === c[0]; }).length;
      return n || cat === c[0] ? '<button class="chip ' + (cat === c[0] ? "on" : "") + '" data-act="wish-cat" data-val="' + esc(c[0]) + '" aria-pressed="' + (cat === c[0]) + '">' + c[1] + " " + esc(c[0]) + " (" + n + ")</button>" : "";
    }).join("") + "</div>";
    var addForm = mode === "bought" ? "" : '<div class="row wrap wish-add" data-form="wish-add"><input type="text" name="text" class="grow" style="min-width:150px" maxlength="120" placeholder="Add an item…" aria-label="Item name"><input type="number" name="price" step="0.01" min="0" placeholder="Price" style="max-width:110px" aria-label="Price"><select name="cat" style="max-width:170px" aria-label="Category">' +
      WISH_CATS.map(function (c) { return "<option" + (cat === c[0] ? " selected" : "") + ">" + esc(c[0]) + "</option>"; }).join("") + '</select><input type="text" name="link" class="grow" style="min-width:150px" maxlength="500" inputmode="url" placeholder="Link (optional)" aria-label="Link"><button class="btn pink" data-act="wish-add">' + ic("plus") + " Add</button></div>";
    var total = sum(inMode, function (x) { return x.price; }), totalShown = sum(shown, function (x) { return x.price; });
    var bud = mode === "bought" ? null : getP("finance.wishBudget." + mode);
    var left = hasV(bud) ? num(bud) - total : null;
    var stats = '<div class="stats"><div class="stat"><span class="v">' + money(mode === "bought" ? total : total) + '</span><span class="k">' + (mode === "bought" ? "Spent on bought items" : "Still to buy") + '</span></div><div class="stat"><span class="v">' + inMode.length + '</span><span class="k">' + (inMode.length === 1 ? "Item" : "Items") + "</span></div></div>" +
      (cat && shown.length !== inMode.length ? '<p class="small muted" style="margin:10px 0 0">' + esc(cat) + ": " + money(totalShown) + "</p>" : "") +
      (mode === "bought" ? "" : '<div class="spacer"></div><label class="lbl" for="wish-bud">Budget for this list (optional)</label>' + bindNum("finance.wishBudget." + mode, 'id="wish-bud" data-rerender step="1" min="0" style="max-width:160px"') +
        (left != null ? '<p class="small" style="margin:8px 0 0">' + (left >= 0 ? "You are <b>" + money(left) + "</b> under budget." : "You are <b>" + money(-left) + "</b> over budget.") + "</p>" : ""));
    var empty = mode === "bought" ? "Nothing bought yet. Tick “Bought” on a card and it moves here." : mode === "wish" ? "Nothing on your wishlist yet. Add the things you are dreaming of." : "Your shopping list is empty. Add what you need soon.";
    var grid = shown.length ? '<div class="wgrid">' + shown.map(wishCard).join("") + "</div>" : '<div class="empty">' + (inMode.length ? "Nothing in this category." : empty) + "</div>";
    return '<div class="grid"><div class="c12">' + card("Shopping & wishlists", modes + '<div class="spacer"></div>' + cats, { dot: "p" }) + "</div>" +
      (addForm ? '<div class="c8">' + card("Add an item", addForm + '<p class="small muted" style="margin:10px 0 0">Add a photo, or paste a picture address, on the card once it is added. The link opens the shop in a new tab.</p>', { cls: "tint-pink", dot: "p" }) + "</div>" : "") +
      '<div class="' + (addForm ? "c4" : "c12") + '">' + card(mode === "bought" ? "Bought" : "Totals", stats, { dot: "b" }) + "</div>" +
      '<div class="c12">' + grid + "</div></div>";
  }


  /* ---- debt payoff plan (avalanche / snowball), worked out month by month ---- */
  function payoffSim(debts, extra, method, rollover) {
    var ds = debts.map(function (d) { return { id: d.id, name: d.name, bal: d.bal, apr: d.apr, min: d.min, done: false }; });
    var start = ds.reduce(function (t, d) { return t + d.bal; }, 0), budget = ds.reduce(function (t, d) { return t + d.min; }, 0) + extra;
    var out = { months: 0, interest: 0, paid: 0, order: [], series: [start], never: false, first: null };
    if (!ds.length) return out;
    while (out.months < 600 && ds.some(function (d) { return !d.done; })) {
      out.months++;
      var live = ds.filter(function (d) { return !d.done; }), spent = 0, total;
      live.forEach(function (d) { var i = d.bal * d.apr / 1200; d.bal += i; out.interest += i; });
      live.forEach(function (d) { var pay = Math.min(d.min, d.bal); d.bal -= pay; spent += pay; out.paid += pay; });
      var rest = rollover ? Math.max(0, budget - spent) : 0;
      live.slice().sort(function (a, b) { return method === "snowball" ? a.bal - b.bal : (b.apr - a.apr) || (a.bal - b.bal); }).forEach(function (d) {
        if (rest <= 0 || d.bal <= 0.005) return;
        var pay = Math.min(rest, d.bal); d.bal -= pay; rest -= pay; out.paid += pay;
      });
      live.forEach(function (d) { if (d.bal <= 0.005 && !d.done) { d.done = true; d.bal = 0; out.order.push({ id: d.id, name: d.name, month: out.months }); } });
      total = ds.reduce(function (t, d) { return t + d.bal; }, 0);
      out.series.push(total);
      if (total > start * 20) break;
    }
    out.never = ds.some(function (d) { return !d.done; });
    out.first = out.order.length ? out.order[0].month : null;
    return out;
  }
  function monthsLabel(m) {
    var y = Math.floor(m / 12), r = m % 12, o = [];
    if (y) o.push(y + (y === 1 ? " year" : " years"));
    if (r || !y) o.push(r + (r === 1 ? " month" : " months"));
    return o.join(" ");
  }
  function monthsFromNow(m) { var t = new Date(); t = new Date(t.getFullYear(), t.getMonth() + m, 1); return t.toLocaleDateString(undefined, { month: "short", year: "numeric" }); }
  function payoffChart(plan, base) {
    var W = 600, H = 200, pl = 8, pr = 8, pt = 10, pb = 22, len = Math.max(plan.series.length, base.never ? 1 : base.series.length, 2), top = Math.max.apply(null, plan.series.concat(base.never ? [] : base.series)) || 1;
    var path = function (ser) { return ser.map(function (v, i) { return (i ? "L" : "M") + (pl + (W - pl - pr) * i / (len - 1)).toFixed(1) + "," + (pt + (H - pt - pb) * (1 - v / top)).toFixed(1); }).join(""); };
    return '<svg class="pay-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Total debt over time: zero in ' + esc(monthsLabel(plan.months)) + ' with your plan"><line class="pc-axis" x1="' + pl + '" y1="' + (H - pb) + '" x2="' + (W - pr) + '" y2="' + (H - pb) + '"/>' +
      (base.never ? "" : '<path class="pc-base" d="' + path(base.series) + '"/>') + '<path class="pc-plan" d="' + path(plan.series) + '"/><text class="pc-lbl" x="' + pl + '" y="' + (H - 5) + '">Now</text><text class="pc-lbl" x="' + (W - pr) + '" y="' + (H - 5) + '" text-anchor="end">' + esc(monthsFromNow(len - 1)) + "</text></svg>" +
      '<p class="pay-key"><span class="pk-plan"></span> Your plan' + (base.never ? "" : ' <span class="pk-base"></span> Minimums only') + "</p>";
  }
  function payoffCard() {
    var po = state.finance.payoff, debts = state.finance.debts.map(function (d) { return { id: d.id, name: d.text || "Unnamed debt", bal: Math.max(0, num(d.balance)), apr: Math.max(0, num(d.rate)), min: Math.max(0, num(d.min)) }; }).filter(function (d) { return d.bal > 0.005; });
    var controls = '<div class="chips" role="group" aria-label="Plan type">' + [["avalanche", "Avalanche"], ["snowball", "Snowball"]].map(function (m) {
      return '<button class="chip ' + (po.method === m[0] ? "on" : "") + '" data-act="payoff-method" data-val="' + m[0] + '" aria-pressed="' + (po.method === m[0]) + '">' + m[1] + "</button>";
    }).join("") + '</div><p class="small muted" style="margin:8px 0 12px">' + (po.method === "avalanche" ? "Avalanche: extra money goes to the highest interest rate first. It usually costs the least." : "Snowball: extra money goes to the smallest balance first. Quick wins keep many people going.") + "</p>" +
      '<label class="lbl" for="payoff-extra">Extra each month (' + esc(state.currency) + ')</label>' + bindNum("finance.payoff.extra", 'id="payoff-extra" data-rerender step="1" min="0" style="max-width:160px" placeholder="0"');
    if (!debts.length) return card("Payoff plan", '<p class="small muted" style="margin:0 0 12px">Add a debt above with its balance, rate and minimum payment, and a plan will appear here.</p>' + controls, { dot: "p" });
    var extra = Math.max(0, num(po.extra)), other = po.method === "snowball" ? "avalanche" : "snowball";
    var plan = payoffSim(debts, extra, po.method, true), base = payoffSim(debts, 0, po.method, false), alt = payoffSim(debts, extra, other, true);
    var m0 = function (v) { return money(Math.round(v)); }, warn = debts.filter(function (d) { return d.min < d.bal * d.apr / 1200 - 0.005; });
    var out;
    if (plan.never) {
      out = '<div class="pay-warn"><b>This plan doesn’t reach zero yet.</b> ' + (warn.length ? "The interest on " + warn.map(function (d) { return esc(d.name) + " (" + money(d.bal * d.apr / 1200) + " a month)"; }).join(", ") + " is more than you pay on it, so it keeps growing. " : "") + "Try a little extra each month, or check the minimum payments.</div>";
    } else {
      var sooner = base.never ? null : base.months - plan.months, saved = base.never ? null : base.interest - plan.interest;
      var A = po.method === "avalanche" ? plan : alt, Sn = po.method === "avalanche" ? alt : plan;
      out = '<div class="stats"><div class="stat"><span class="v">' + esc(monthsFromNow(plan.months)) + '</span><span class="k">Debt-free · ' + esc(monthsLabel(plan.months)) + '</span></div><div class="stat"><span class="v">' + m0(plan.interest) + '</span><span class="k">Total interest</span></div></div><ul class="insights" style="margin-top:14px">' +
        '<li class="k-good"><span class="i-dot"></span><span>' + (base.never ? "With only the minimums some debts would never be cleared. This plan fixes that." : sooner > 0 || saved > 1 ? "That is <b>" + monthsLabel(Math.max(0, sooner)) + " sooner</b> and <b>" + m0(Math.max(0, saved)) + " less interest</b> than paying only the minimums." : "Add an amount in “Extra each month” to see how much sooner you could be free.") + "</span></li>" +
        (plan.order.length ? '<li class="k-info"><span class="i-dot"></span><span>Order cleared: ' + plan.order.map(function (o) { return "<b>" + esc(o.name) + "</b> (" + esc(monthsFromNow(o.month)) + ")"; }).join(" → ") + ".</span></li>" : "") +
        '<li class="k-info"><span class="i-dot"></span><span>' + (Math.abs(A.interest - Sn.interest) < 1 ? "Avalanche and snowball come out almost the same for your debts, so pick the one that feels better." : "Avalanche: " + m0(A.interest) + " interest, free " + esc(monthsFromNow(A.months)) + ". Snowball: " + m0(Sn.interest) + " interest, free " + esc(monthsFromNow(Sn.months)) + ".") + "</span></li></ul>" + payoffChart(plan, base);
    }
    return card("Payoff plan", controls + '<div class="spacer"></div>' + out, { dot: "p" });
  }


  /* ---- package tracker: orders, returns and exchanges ---- */
  var PKG = {
    orders: { title: "Orders", add: "Add an order", dot: "p", cols: [["text", "Item", "text"], ["store", "Store / website", "text"], ["amount", "Amount", "number"], ["date", "Order date", "date"], ["eta", "Expected delivery", "date"]], ticks: [["shipped", "Shipped"], ["delivered", "Delivered"]], done: "delivered" },
    returns: { title: "Returns", add: "Add a return", dot: "k", cols: [["text", "Item returned", "text"], ["store", "Store / website", "text"], ["amount", "Amount", "number"], ["date", "Order date", "date"]], ticks: [["shipped", "Shipped"], ["done", "Complete"]], done: "done" },
    exchanges: { title: "Exchanges", add: "Add an exchange", dot: "b", cols: [["text", "Item to exchange", "text"], ["swap", "Exchange for", "text"], ["store", "Store / website", "text"], ["amount", "Amount", "number"]], ticks: [["shipped", "Shipped"], ["done", "Complete"]], done: "done" }
  };
  function pkgBadge(it) {
    if (it.delivered) return '<span class="badge sage">Delivered</span>';
    if (!it.eta) return it.shipped ? '<span class="badge">On its way</span>' : "";
    var n = daysBetween(today(), parseD(it.eta));
    return '<span class="badge ' + (n < 0 ? "pink" : "") + '">' + (n < 0 ? "Late by " + (-n) + (n === -1 ? " day" : " days") : n === 0 ? "Due today" : n === 1 ? "Due tomorrow" : "In " + n + " days") + "</span>";
  }
  function pkgSection(kind) {
    var T = PKG[kind], path = "finance.pkg." + kind, list = state.finance.pkg[kind];
    var head = '<div class="pk-row pk-head pk-' + kind + '">' + T.cols.map(function (c) { return "<span>" + c[1] + "</span>"; }).join("") + T.ticks.map(function (t) { return '<span class="pk-c">' + t[1] + "</span>"; }).join("") + "<span></span></div>";
    var rows = list.map(function (it) {
      var isOrder = kind === "orders", link = isOrder ? safeUrl(it.link) : "";
      return '<div class="pk-row pk-' + kind + (it[T.done] ? " done" : "") + '">' + T.cols.map(function (c, i) {
        var lab = c[1];
        return '<label class="pk-f pk-f' + i + '"><span class="pk-lab">' + lab + "</span>" + itemInput(path, it, c[0], 'aria-label="' + lab + '"' + (c[2] === "number" ? ' step="0.01" min="0" data-rerender' : "") + (c[2] === "date" ? " data-rerender" : "") + (c[2] === "text" ? ' maxlength="120"' : ""), c[2]) + "</label>";
      }).join("") + T.ticks.map(function (t) {
        return '<label class="pk-c pk-t"><span class="pk-lab">' + t[1] + '</span><input type="checkbox" class="pk-chk" aria-label="' + t[1] + '" data-item="' + path + "|" + it.id + "|" + t[0] + '" data-rerender ' + (it[t[0]] ? "checked" : "") + "></label>";
      }).join("") + '<span class="pk-end">' + (isOrder ? pkgBadge(it) : "") +
        (isOrder ? '<input type="text" class="pk-track" maxlength="300" placeholder="Tracking link or number" aria-label="Tracking link or number" value="' + esc(it.link) + '" data-item="' + path + "|" + it.id + '|link" data-rerender>' + (link ? '<a class="btn sm" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">Track</a>' : "") : "") +
        '<button class="del" data-act="list-del" data-path="' + path + '" data-id="' + it.id + '" aria-label="Delete">' + ic("x") + "</button></span></div>";
    }).join("");
    var open = list.filter(function (x) { return !x[T.done]; }).length;
    return card(T.title, '<div class="pk-table">' + head + rows + "</div>" + (list.length ? "" : '<div class="empty">Nothing here yet.</div>') +
      '<div class="spacer"></div><button class="btn sm" data-act="pkg-add" data-kind="' + kind + '">' + ic("plus") + " " + T.add + "</button>", { dot: T.dot, right: open ? '<span class="badge">' + open + " open</span>" : "" });
  }
  function pkgTab() {
    var P = state.finance.pkg, o = P.orders, wait = o.filter(function (x) { return !x.shipped && !x.delivered; }).length, way = o.filter(function (x) { return x.shipped && !x.delivered; }).length;
    var late = o.filter(function (x) { return !x.delivered && x.eta && daysBetween(today(), parseD(x.eta)) < 0; }).length;
    var transit = sum(o.filter(function (x) { return !x.delivered; }), function (x) { return x.amount; }), refund = sum(P.returns.filter(function (x) { return !x.done; }), function (x) { return x.amount; });
    var stats = '<div class="stats"><div class="stat"><span class="v">' + way + '</span><span class="k">On the way</span></div><div class="stat"><span class="v">' + wait + '</span><span class="k">Not shipped yet</span></div><div class="stat"><span class="v">' + money(transit) + '</span><span class="k">Ordered, not here yet</span></div><div class="stat"><span class="v">' + money(refund) + '</span><span class="k">Waiting on returns</span></div></div>' +
      (late ? '<p class="small" style="margin:12px 0 0"><b>' + late + (late === 1 ? " order is" : " orders are") + " past the expected date.</b> It may be worth contacting the store.</p>" : "");
    return '<div class="grid"><div class="c12">' + card("Package tracker", stats, { cls: "tint-pink", dot: "p" }) + '</div><div class="c12">' + pkgSection("orders") + '</div><div class="c12">' + pkgSection("returns") + '</div><div class="c12">' + pkgSection("exchanges") + "</div></div>";
  }

  function viewFinance() {
    var mk = state.ui.finMonth || monthKey(today()), md = parseD(mk + "-01"), f = finMonth(mk);
    var tb = tabs("finance", [["overview", "Overview"], ["budget", "Income & spending"], ["savings", "Savings & debt"], ["subs", "Subscriptions"], ["wish", "Shopping"], ["pkg", "Packages"], ["calc", "Calculator"]]);
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
        return '<tr><td style="min-width:150px">' + itemInput("finance.debts", d, "text", 'aria-label="Debt"') + '</td><td style="width:120px">' + itemInput("finance.debts", d, "start", "data-rerender", "number") + '</td><td style="width:120px">' + itemInput("finance.debts", d, "balance", "data-rerender", "number") + '</td><td style="width:90px">' + itemInput("finance.debts", d, "rate", 'placeholder="%" data-rerender', "number") + '</td><td style="width:110px">' + itemInput("finance.debts", d, "min", 'placeholder="Min" aria-label="Minimum payment a month" data-rerender', "number") + '</td><td style="min-width:120px">' + progress(paid, "sage") + '<span class="small muted">' + Math.round(clamp(paid, 0, 100)) + '% paid</span></td><td><button class="del" data-act="list-del" data-path="finance.debts" data-id="' + d.id + '" aria-label="Delete">' + ic("x") + "</button></td></tr>";
      }).join("");
      body = card("Savings pots", '<div class="pots">' + pots + '<button class="pot v-add" style="min-height:150px" data-act="pot-add">' + ic("plus") + "<span>New savings pot</span></button></div>", { dot: "b", right: '<span class="badge">' + money(saved) + " saved</span>" }) +
        '<div class="spacer"></div>' + card("Debt paydown", (debts ? '<div class="scroll-x"><table class="table" style="min-width:640px"><tr><th>Debt</th><th>Started at</th><th>Balance now</th><th>Rate %</th><th>Min / month</th><th>Progress</th><th></th></tr>' + debts + "</table></div>" : '<div class="empty">Debt-free, or not tracking any yet.</div>') + '<div class="spacer"></div><button class="btn sm" data-act="debt-add">' + ic("plus") + " Add debt</button>", { dot: "s", right: '<span class="badge sage">' + money(sum(state.finance.debts, function (d) { return d.balance; })) + " remaining</span>" }) + '<div class="spacer"></div>' + payoffCard();
    } else if (tb.cur === "wish") {
      body = wishTab();
    } else if (tb.cur === "pkg") {
      body = pkgTab();
    } else if (tb.cur === "calc") {
      body = '<div class="grid"><div class="c6">' + card("Calculator", window.SlowCalc ? SlowCalc.html() : "", { dot: "b" }) + '</div></div>';
    } else {
      var rows = state.finance.subs.map(function (s) {
        var n = s.due ? daysBetween(today(), parseD(s.due)) : null;
        return "<tr><td>" + itemInput("finance.subs", s, "text", 'aria-label="Subscription"') + '</td><td style="width:110px">' + itemInput("finance.subs", s, "amount", "data-rerender", "number") + '</td><td style="width:120px">' + itemSelect("finance.subs", s, "cycle", [["monthly", "Monthly"], ["yearly", "Yearly"], ["weekly", "Weekly"]], "data-rerender") + '</td><td style="width:160px">' + itemInput("finance.subs", s, "due", "data-rerender", "date") +
          '</td><td><span class="badge ' + (n != null && n <= 3 ? "pink" : "") + '">' + (n == null ? "—" : n < 0 ? "overdue" : n === 0 ? "today" : "in " + n + "d") + '</span></td><td><button class="btn sm" data-act="sub-paid" data-id="' + s.id + '">' + ic("check") + ' Paid</button></td><td><button class="del" data-act="list-del" data-path="finance.subs" data-id="' + s.id + '" aria-label="Delete">' + ic("x") + "</button></td></tr>";
      }).join("");
      body = card("Recurring subscriptions", (rows ? '<div class="scroll-x"><table class="table"><tr><th>Service</th><th>Amount</th><th>Cycle</th><th>Next due</th><th></th><th></th><th></th></tr>' + rows + "</table></div>" : '<div class="empty">Add Netflix, gym, cloud storage… and never miss a renewal.</div>') +
        '<div class="spacer"></div><button class="btn sm" data-act="sub-add">' + ic("plus") + " Add subscription</button>", { dot: "k", right: '<span class="badge">' + money(subs) + " / month · " + money(subs * 12) + " / year</span>" });
    }
    return head("Life · Money", 'Finance <span class="em">&amp; subscriptions</span>', tb.cur === "wish" || tb.cur === "calc" || tb.cur === "pkg" ? "" : monthNav) + tb.html + body;
  }

  /* ------------------------------------------------------------ views: mind */

  var IKIGAI = [
    ["love", "What you love", 200, 128, "var(--pink)"],
    ["good", "What you're good at", 128, 200, "var(--butter)"],
    ["world", "What the world needs", 272, 200, "var(--sage)"],
    ["paid", "What you can be paid for", 200, 272, "var(--sky)"]
  ];

  function viewMind() {
    if (state.ui.tabs.mind === "mood") state.ui.tabs.mind = "ikigai";
    if (state.ui.tabs.mind === "smart" || state.ui.tabs.mind === "matrix") state.ui.tabs.mind = "ikigai";
    var tb = tabs("mind", [["ikigai", "Ikigai"], ["wheel", "Level 10 Life"]]);
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
    }
    return head("Life · Mind", 'Mental <span class="em">wellbeing</span>') + tb.html + body;
  }
  function viewMood() {
    var body = "";
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
    return head("Productivity", 'Mood <span class="em">log</span>') + body;
  }

  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-"); }


  /* ------------------------------------------------------------ views: vision boards and mind maps */

  function boardsOf(kind) {
    return Object.keys(state.notebook).map(function (id) { return state.notebook[id]; }).filter(function (p) { return p.paper === kind; })
      .sort(function (a, b) { return (a.created || 0) - (b.created || 0); });
  }
  function curBoard(kind) {
    var list = boardsOf(kind), id = state.ui["board_" + kind];
    return list.filter(function (b) { return b.id === id; })[0] || list[0] || null;
  }
  function newBoard(kind) {
    ensureNb();
    var id = uid(), t = Date.now();
    var pg = { id: id, paper: kind, section: state.nbSections[0].id, title: "", created: t, updated: t, text: "", ink: "", strokes: [], topic: "", cues: "", summary: "" };
    if (kind === "mindmap") pg.nodes = [{ id: uid(), text: "Central idea", x: 50, y: 50, parent: null }];
    else pg.tiles = [0, 1, 2, 3].map(function (i) { return { id: uid(), text: ["Feel", "Grow", "Explore", "Create"][i], color: COLORS[i], img: "" }; });
    state.notebook[id] = pg;
    state.ui["board_" + kind] = id;
    return pg;
  }
  function viewBoards(kind) {
    var K = BOARD_KINDS[kind], list = boardsOf(kind), cur = curBoard(kind);
    var intro = head("Productivity", K.title);
    if (!cur) {
      return intro + card("", '<div class="empty" style="padding:30px 10px;text-align:center">' + esc(K.sub) + '</div><div style="text-align:center"><button class="btn pink" data-act="board-new" data-kind="' + kind + '">' + ic("plus") + " Create your first " + K.noun + "</button></div>");
    }
    var pills = list.map(function (b) {
      return '<button class="trip-pill ' + (b.id === cur.id ? "on" : "") + '" data-act="board-open" data-kind="' + kind + '" data-id="' + b.id + '"><b>' + esc(b.title || "Untitled " + K.noun) + '</b><span class="small muted">' + shortDay(new Date(b.created || Date.now())) + "</span></button>";
    }).join("");
    var b = pageBody(cur, cur.id);
    var tools = kind === "mindmap"
      ? '<button class="btn sm pink" data-act="mm-add" data-id="' + cur.id + '">' + ic("branch") + ' Add branch</button><button class="btn sm" data-act="mm-del" data-id="' + cur.id + '">' + ic("trash") + " Remove selected</button>"
      : '<button class="btn sm pink" data-act="vb-add" data-id="' + cur.id + '">' + ic("plus") + " Add tile</button>";
    return intro + (list.length > 1 || true ? '<div class="trip-list board-list">' + pills + '<button class="btn sm" data-act="board-new" data-kind="' + kind + '">' + ic("plus") + " New " + K.noun + "</button></div>" : "") +
      '<div class="board"><div class="board-bar"><input class="sheet-title" type="text" data-bind="notebook.' + cur.id + '.title" value="' + esc(cur.title) + '" placeholder="Name this ' + K.noun + '" aria-label="Name" maxlength="80">' + tools +
      '<button class="icon-btn" data-act="board-del" data-id="' + cur.id + '" aria-label="Delete this ' + K.noun + '" title="Delete this ' + K.noun + '">' + ic("trash") + "</button></div>" +
      '<div class="sheet-page board-sheet ' + b.cls + '" data-page="' + cur.id + '">' + b.inner + "</div>" +
      '<p class="small muted">' + esc(K.sub) + "</p></div>";
  }


  /* ------------------------------------------------------------ views: goals */

  function viewGoals() {
    var list = goalList(), cur = state.ui.goal && state.goals[state.ui.goal] ? state.goals[state.ui.goal] : list[0];
    var active = list.filter(function (g) { return g.status === "active"; });
    var avg = active.length ? Math.round(sum(active, goalPct) / active.length) : 0;
    var stepsAll = sum(list, function (g) { return (g.steps || []).length; }), stepsDone = sum(list, function (g) { return (g.steps || []).filter(function (x) { return x.done; }).length; });
    var head_ = head("Productivity", 'Goal <span class="em">tracker</span>', '<button class="btn pink" data-act="goal-add">' + ic("plus") + " New goal</button>");
    if (!cur) {
      return head_ + card("", '<div class="empty" style="padding:30px 10px;text-align:center">Name a goal, make a plan, break it into steps, and watch it move. Start with one that feels meaningful and doable.</div><div style="text-align:center"><button class="btn pink" data-act="goal-add">' + ic("plus") + " Create your first goal</button></div>");
    }
    var stats = '<div class="stats"><div class="stat"><span class="v">' + active.length + '</span><span class="k">Active goals</span></div><div class="stat"><span class="v">' + avg + '%</span><span class="k">Average progress</span></div><div class="stat"><span class="v">' + stepsDone + "/" + stepsAll + '</span><span class="k">Steps done</span></div></div>';
    var pills = list.map(function (g) {
      var pc = goalPct(g), left = g.due ? daysBetween(today(), parseD(g.due)) : null;
      return '<button class="trip-pill goal-pill' + (g.id === cur.id ? " on" : "") + (g.status === "done" ? " is-done" : "") + '" data-act="goal-open" data-id="' + g.id + '"><b>' + esc(g.title || "Untitled goal") + '</b><span class="small muted">' + esc(g.status === "done" ? "Done" : g.status === "hold" ? "On hold" : left == null ? g.area : left < 0 ? "Past due" : left === 0 ? "Due today" : left + " days left") + " · " + pc + "%</span>" + progress(pc) + "</button>";
    }).join("");
    var p = "goals." + cur.id, pc = goalPct(cur), left = cur.due ? daysBetween(today(), parseD(cur.due)) : null;
    var span = cur.start && cur.due ? daysBetween(parseD(cur.start), parseD(cur.due)) : null;
    var chips = [["1m", "1 month"], ["3m", "3 months"], ["6m", "6 months"], ["12m", "1 year"]].map(function (c) { return '<button class="chip" data-act="goal-span" data-id="' + cur.id + '" data-val="' + c[0] + '">' + c[1] + "</button>"; }).join("");
    var header = card("", '<div class="row wrap" style="align-items:flex-end"><div class="grow" style="min-width:220px"><label class="lbl">Goal</label>' + bindInput(p + ".title", 'placeholder="What do you want to achieve?" maxlength="120" style="height:46px;font-family:var(--serif);font-size:1.2rem;font-weight:600"') + '</div>' +
      '<div style="flex:0 1 150px"><label class="lbl">Area</label>' + bindSelect(p + ".area", GOAL_AREAS, 'aria-label="Area"') + '</div><div style="flex:0 1 130px"><label class="lbl">Status</label>' + bindSelect(p + ".status", GOAL_STATUS, 'data-rerender aria-label="Status"') + "</div></div>" +
      '<div class="row wrap" style="margin-top:12px;align-items:flex-end"><div style="flex:1 1 150px"><label class="lbl">Start</label><input type="date" data-bind="' + p + '.start" data-rerender value="' + esc(cur.start || "") + '"></div><div style="flex:1 1 150px"><label class="lbl">Target date</label><input type="date" data-bind="' + p + '.due" data-rerender value="' + esc(cur.due || "") + '"></div>' +
      '<div class="goal-chips"><label class="lbl">Or choose a timeframe</label><div class="chips">' + chips + "</div></div></div>" +
      '<div class="row wrap" style="margin-top:14px"><span class="grow" style="flex:1 1 220px;min-width:200px">' + progress(pc) + '</span><span class="badge pink">' + pc + '%</span>' +
      (span != null && span > 0 ? '<span class="badge">' + (span >= 60 ? Math.round(span / 30.4) + " months" : span + " days") + "</span>" : "") +
      (left != null && cur.status !== "done" ? '<span class="badge ' + (left < 0 ? "pink" : "") + '">' + (left < 0 ? "Past due" : left === 0 ? "Due today" : left + " days left") + "</span>" : "") +
      '<button class="del" data-act="goal-del" data-id="' + cur.id + '" aria-label="Delete goal" title="Delete goal">' + ic("trash") + "</button></div>", { cls: "tint-pink" });
    var tt = tabs("goal", [["plan", "Plan"], ["steps", "Action steps"], ["progress", "Progress"], ["review", "Review"]]);
    var inner = "";
    if (tt.cur === "plan") {
      var smart = [["s", "S", "Specific", "What exactly will you do?"], ["m", "M", "Measurable", "How will you know it worked?"], ["a", "A", "Achievable", "What makes it doable?"], ["r", "R", "Relevant", "Why does it matter to you?"], ["t", "T", "Time-bound", "By when?"]];
      inner = '<div class="grid"><div class="c6 stack">' + card("Why this matters", bindArea(p + ".why", "What will change when you reach it? Why now?", 'style="min-height:120px"'), { dot: "p" }) +
        card("My plan", bindArea(p + ".plan", "How will you get there? Routines, resources, who can help, what could get in the way…", 'style="min-height:190px"'), { dot: "s" }) + "</div>" +
        '<div class="c6">' + card("SMART check (optional)", '<p class="small muted" style="margin-top:0">A quick way to test the goal. Fill in what helps.</p><div class="stack">' + smart.map(function (f) {
          return '<div><label class="lbl smart-l"><span style="font-family:var(--serif);font-size:1.3rem;font-weight:700;color:var(--pink-deep)">' + f[1] + "</span> " + f[2] + "</label>" + bindArea(p + ".smart." + f[0], f[3], 'style="min-height:56px"') + "</div>";
        }).join("") + "</div>", { dot: "b" }) + "</div></div>";
    } else if (tt.cur === "steps") {
      var stepPath = p + ".steps";
      inner = card("Action steps", '<p class="small muted" style="margin-top:0">Small, concrete steps you can finish in a week or less. Tick them off as you go; progress follows automatically.</p>' +
        listEd(stepPath, { placeholder: "Add a step, e.g. Book the first appointment…", empty: "No steps yet. What is the very first thing to do?", meta: function (it) { return '<input type="date" data-item="' + stepPath + "|" + it.id + '|due" value="' + esc(it.due || "") + '" style="max-width:150px;padding:5px 8px;font-size:12px" aria-label="Step date">'; } }), { dot: "s", cls: "goal-steps" });
    } else if (tt.cur === "progress") {
      var chk = listAt(p + ".checks"), sorted = chk.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var pts = sorted.map(function (c) { var d = parseD(c.date); return { label: d.getDate() + " " + MON3[d.getMonth()], y: c.pct }; });
      var manual = (cur.steps || []).length ? "" : '<div class="spacer"></div><label class="lbl">No steps yet, so set progress by hand</label><div class="row"><input type="range" class="grow" min="0" max="100" step="5" data-bind="' + p + '.manual" data-type="num" data-rerender value="' + (num(cur.manual) || 0) + '" aria-label="Progress"><span class="badge pink">' + (num(cur.manual) || 0) + "%</span></div>";
      inner = '<div class="grid"><div class="c7 stack">' + card("Progress over time", lineChart(pts, { label: "Goal progress", empty: "Save at least two check-ins to see your progress curve." }), { dot: "p" }) +
        card("Check-ins", (sorted.length ? '<ul class="list">' + sorted.slice().reverse().slice(0, 12).map(function (c) { return "<li><span class=\"badge\">" + c.pct + '%</span><span class="meta">' + esc(shortDay(parseD(c.date))) + '</span><span class="grow small">' + esc(c.note || "") + '</span><button class="del" data-act="list-del" data-path="' + p + '.checks" data-id="' + c.id + '" aria-label="Delete check-in">' + ic("x") + "</button></li>"; }).join("") + "</ul>" : '<div class="empty">No check-ins yet.</div>'), { dot: "b" }) + "</div>" +
        '<div class="c5 stack">' + card("Check in", '<p class="small muted" style="margin-top:0">Right now this goal is at <b>' + pc + '%</b>. Add a note about how it is going.</p><textarea id="goal-note" placeholder="What moved? What got in the way?" style="min-height:90px"></textarea><div class="spacer"></div><button class="btn pink" data-act="goal-check" data-id="' + cur.id + '">' + ic("check") + " Save check-in</button>" + manual, { cls: "tint-pink", dot: "p" }) + "</div></div>";
    } else {
      var ins = goalInsights(cur), warn = ins.filter(function (x) { return x.k === "warn"; }).length;
      var verdict = cur.status === "done" || pc >= 100 ? "Complete" : warn ? "Needs a look" : "Looking good";
      inner = '<div class="grid"><div class="c7">' + card("How is the plan working?", '<p class="review-verdict ' + (warn && pc < 100 ? "warn" : "good") + '">' + verdict + "</p>" +
        '<ul class="insights">' + ins.map(function (x) { return '<li class="k-' + x.k + '"><span class="i-dot" aria-hidden="true"></span><span>' + esc(x.t) + "</span></li>"; }).join("") + "</ul>", { dot: "k" }) + "</div>" +
        '<div class="c5 stack">' + card("Reflect and adjust", '<label class="lbl">What is working?</label>' + bindArea(p + ".worked", "", 'style="min-height:70px"') + '<label class="lbl">What is getting in the way?</label>' + bindArea(p + ".blocked", "", 'style="min-height:70px"') + '<label class="lbl">What will I change?</label>' + bindArea(p + ".change", "A smaller step, a new date, a different routine…", 'style="min-height:70px"'), { cls: "tint-butter", dot: "b" }) + "</div></div>";
    }
    return head_ + card("", stats) + '<div class="spacer"></div><div class="trip-list board-list goal-list">' + pills + "</div>" + header + '<div class="spacer"></div>' + tt.html + inner;
  }


  /* ------------------------------------------------------------ views: projects */

  function viewProjects() {
    var list = projectList(), cur = state.ui.project && state.projects[state.ui.project] ? state.projects[state.ui.project] : list[0];
    var head_ = head("Productivity", 'Project <span class="em">planner</span>', '<button class="btn pink" data-act="proj-add">' + ic("plus") + " New project</button>");
    if (!cur) {
      return head_ + card("", '<div class="empty" style="padding:30px 10px;text-align:center">Name a project, map it out, and break it into phases and steps. Anything with more than one step can be a project.</div><div style="text-align:center"><button class="btn pink" data-act="proj-add">' + ic("plus") + " Create your first project</button></div>");
    }
    var live = list.filter(function (x) { return x.status === "going" || x.status === "plan"; });
    var steps = [].concat.apply([], list.map(projectSteps)), done = steps.filter(function (x) { return x.done; }).length;
    var stats = '<div class="stats"><div class="stat"><span class="v">' + live.length + '</span><span class="k">Active projects</span></div><div class="stat"><span class="v">' + done + "/" + steps.length + '</span><span class="k">Steps done</span></div><div class="stat"><span class="v">' + list.filter(function (x) { return x.status === "done"; }).length + '</span><span class="k">Finished</span></div></div>';
    var pills = list.map(function (x) {
      var pc = projectPct(x), left = x.due ? daysBetween(today(), parseD(x.due)) : null, stl = PROJECT_STATUS.filter(function (z) { return z[0] === x.status; })[0];
      return '<button class="trip-pill goal-pill' + (x.id === cur.id ? " on" : "") + (x.status === "done" ? " is-done" : "") + '" data-act="proj-open" data-id="' + x.id + '"><b>' + esc(x.title || "Untitled project") + '</b><span class="small muted">' + esc(stl ? stl[1] : "") + (left == null || x.status === "done" ? "" : left < 0 ? " · Past due" : " · " + left + " days left") + " · " + pc + "%</span>" + progress(pc) + "</button>";
    }).join("");
    var p = "projects." + cur.id, pc = projectPct(cur), left = cur.due ? daysBetween(today(), parseD(cur.due)) : null;
    var header = card("", '<div class="row wrap" style="align-items:flex-end"><div class="grow" style="min-width:220px"><label class="lbl">Project</label>' + bindInput(p + ".title", 'placeholder="What are you working on?" maxlength="120" style="height:46px;font-family:var(--serif);font-size:1.2rem;font-weight:600"') + '</div>' +
      '<div style="flex:0 1 150px"><label class="lbl">Area</label>' + bindSelect(p + ".area", GOAL_AREAS.concat(["Work"]), 'aria-label="Area"') + '</div><div style="flex:0 1 150px"><label class="lbl">Status</label>' + bindSelect(p + ".status", PROJECT_STATUS, 'data-rerender aria-label="Status"') + "</div></div>" +
      '<div class="row wrap" style="margin-top:12px"><div style="flex:1 1 150px"><label class="lbl">Start</label><input type="date" data-bind="' + p + '.start" data-rerender value="' + esc(cur.start || "") + '"></div><div style="flex:1 1 150px"><label class="lbl">Due</label><input type="date" data-bind="' + p + '.due" data-rerender value="' + esc(cur.due || "") + '"></div></div>' +
      '<div class="row wrap" style="margin-top:14px"><span class="grow" style="flex:1 1 220px;min-width:200px">' + progress(pc) + '</span><span class="badge pink">' + pc + '%</span>' +
      (left != null && cur.status !== "done" ? '<span class="badge ' + (left < 0 ? "pink" : "") + '">' + (left < 0 ? "Past due" : left === 0 ? "Due today" : left + " days left") + "</span>" : "") +
      '<button class="del" data-act="proj-del" data-id="' + cur.id + '" aria-label="Delete project" title="Delete project">' + ic("trash") + "</button></div>", { cls: "tint-butter" });
    var tt = tabs("project", [["framework", "Framework"], ["phases", "Phases & steps"], ["review", "Review"]]);
    var inner = "";
    if (tt.cur === "framework") {
      inner = '<p class="small muted" style="margin:0 0 12px">A one-page map of the project. Fill in what helps; skip what doesn\'t.</p><div class="grid">' + PROJECT_FIELDS.map(function (f) {
        return '<div class="c6">' + card(f[1], bindArea(p + "." + f[0], f[2], 'style="min-height:96px"'), { dot: "p" }) + "</div>";
      }).join("") + '<div class="c12">' + card("Notes", bindArea(p + ".notes", "Links, decisions, ideas, anything to remember…", 'style="min-height:110px"'), { dot: "b" }) + "</div></div>";
    } else if (tt.cur === "phases") {
      var phases = cur.phases || [];
      var cards = phases.map(function (ph, i) {
        var sp = p + ".phases." + i + ".steps", ppc = phasePct(ph);
        return card("", '<div class="row wrap phase-head"><span class="phase-n">' + (i + 1) + '</span><input type="text" class="grow phase-title" data-bind="' + p + ".phases." + i + '.title" value="' + esc(ph.title) + '" placeholder="Phase name" aria-label="Phase name" maxlength="80">' +
          '<span class="badge">' + ppc + '%</span><button class="icon-btn sm" data-act="proj-phase-move" data-id="' + cur.id + '" data-i="' + i + '" data-val="-1" aria-label="Move phase up"' + (i === 0 ? " disabled" : "") + ">" + ic("up") + '</button><button class="icon-btn sm" data-act="proj-phase-move" data-id="' + cur.id + '" data-i="' + i + '" data-val="1" aria-label="Move phase down"' + (i === phases.length - 1 ? " disabled" : "") + ">" + ic("down") + '</button><button class="del" data-act="proj-phase-del" data-id="' + cur.id + '" data-i="' + i + '" aria-label="Delete phase">' + ic("trash") + "</button></div>" +
          progress(ppc) + '<div class="spacer"></div>' + listEd(sp, { placeholder: "Add a step…", empty: "No steps in this phase yet.", meta: function (it) { return '<input type="date" data-item="' + sp + "|" + it.id + '|due" value="' + esc(it.due || "") + '" style="max-width:150px;padding:5px 8px;font-size:12px" aria-label="Step date">'; } }), { cls: "goal-steps phase" });
      }).join('<div class="spacer"></div>');
      inner = (phases.length ? cards : card("", '<div class="empty">No phases yet. A phase is a stage of the project, like Plan, Prepare, Do, Finish.</div><div style="margin-top:12px"><button class="btn" data-act="proj-template" data-id="' + cur.id + '">' + ic("spark") + " Use a starter outline</button></div>")) +
        '<div class="spacer"></div>' + card("Add a phase", '<div class="adder"><input type="text" id="phase-new" placeholder="e.g. Research, Design, Launch…" maxlength="80" aria-label="New phase name"><button class="icon-btn sm" data-act="proj-phase-add" data-id="' + cur.id + '" aria-label="Add phase">' + ic("plus") + "</button></div>", { dot: "s" });
    } else {
      var ins = projectInsights(cur), warn = ins.filter(function (x) { return x.k === "warn"; }).length;
      var verdict = cur.status === "done" || (projectSteps(cur).length && pc >= 100) ? "Complete" : warn ? "Needs a look" : "Looking good";
      inner = '<div class="grid"><div class="c7">' + card("How is the project going?", '<p class="review-verdict ' + (warn && verdict !== "Complete" ? "warn" : "good") + '">' + verdict + "</p>" +
        '<ul class="insights">' + ins.map(function (x) { return '<li class="k-' + x.k + '"><span class="i-dot" aria-hidden="true"></span><span>' + esc(x.t) + "</span></li>"; }).join("") + "</ul>", { dot: "k" }) + "</div>" +
        '<div class="c5">' + card("Reflect and adjust", '<label class="lbl">What is going well?</label>' + bindArea(p + ".worked", "", 'style="min-height:70px"') + '<label class="lbl">What is stuck?</label>' + bindArea(p + ".stuck", "", 'style="min-height:70px"') + '<label class="lbl">What needs deciding?</label>' + bindArea(p + ".decide", "", 'style="min-height:70px"'), { cls: "tint-butter", dot: "b" }) + "</div></div>";
    }
    return head_ + card("", stats) + '<div class="spacer"></div><div class="trip-list board-list goal-list">' + pills + "</div>" + header + '<div class="spacer"></div>' + tt.html + inner;
  }

  /* ------------------------------------------------------------ views: routines & to-dos */

  function viewRoutines() {
    var tt = tabs("rt", [["todo", "To-Dos"], ["routines", "Routines"], ["blocks", "Time blocking"], ["focus", "Focus timer"], ["review", "Time review"], ["matrix", "Prioritise"]]);
    var run = state.focus.run, body = "";
    var banner = run && tt.cur !== "focus" ? '<p style="margin:-6px 0 14px"><button class="btn sm pink" data-act="tab" data-key="rt" data-val="focus">' + ic("clock") + " " + (run.phase === "focus" ? "Focus" : "Break") + ' timer running · <span data-focus-clock>' + fmtClock(focusRemaining(run)) + "</span></button></p>" : "";
    if (tt.cur === "todo") body = todoTab();
    else if (tt.cur === "routines") body = routinesTab();
    else if (tt.cur === "blocks") body = blocksTab();
    else if (tt.cur === "focus") body = focusTab();
    else if (tt.cur === "review") body = reviewTab();
    else body = matrixTab();
    return head("Productivity", 'Routines <span class="em">&amp; to-dos</span>') + tt.html + banner + body;
  }

  /* ---- To-dos ---- */
  function todoTab() {
    var f = state.ui.todoFilter || "open", tk = todayKey(), all = state.todos, open = all.filter(function (x) { return !x.done; });
    var shown = all.filter(function (x) {
      if (f === "done") return x.done;
      if (x.done) return false;
      if (f === "today") return x.due && x.due <= tk;
      if (f === "soon") return x.due && x.due > tk;
      if (f === "nodate") return !x.due;
      return true;
    });
    var filters = [["open", "Open"], ["today", "Due today"], ["soon", "Upcoming"], ["nodate", "No date"], ["done", "Done"]];
    var chips = '<div class="chips">' + filters.map(function (x) { return '<button class="chip' + (x[0] === f ? " on" : "") + '" data-act="todo-filter" data-val="' + x[0] + '" aria-pressed="' + (x[0] === f) + '">' + x[1] + "</button>"; }).join("") + "</div>";
    var overdue = open.filter(function (x) { return x.due && x.due < tk; }).length, today_ = open.filter(function (x) { return x.due === tk; }).length, est = sum(open, function (x) { return num(x.est); });
    var summary = '<p class="small muted" style="margin:10px 0 0">' + open.length + " open" + (overdue ? " · <b>" + overdue + " overdue</b>" : "") + (today_ ? " · " + today_ + " due today" : "") + (est ? " · about " + hm(est) + " of work" : "") + "</p>";
    var form = '<div class="row wrap todo-form" data-form="todo"><input type="text" name="text" class="grow" style="min-width:200px" placeholder="Add a to-do…" aria-label="To-do" maxlength="160">' +
      '<input type="date" name="due" style="max-width:150px" aria-label="Due date"><input type="number" name="est" inputmode="numeric" min="0" placeholder="min" style="max-width:80px" aria-label="Minutes it will take">' +
      '<select name="prio" style="max-width:130px" aria-label="Priority">' + RT_PRIOS.map(function (p) { return '<option value="' + p[0] + '">' + p[1] + "</option>"; }).join("") + '</select><button class="btn pink" data-act="todo-add">' + ic("plus") + " Add</button></div>";
    var rows = todoSorted(shown).map(function (it) {
      var over = it.due && it.due < tk && !it.done;
      return '<li class="todo' + (it.done ? " done" : "") + '"><input type="checkbox" class="check" aria-label="Done" data-item="todos|' + it.id + '|done" data-rerender ' + (it.done ? "checked" : "") + ">" +
        '<button class="prio p' + (it.prio || 0) + '" data-act="prio" data-path="todos" data-id="' + it.id + '" title="Priority (tap to change)" aria-label="Cycle priority"></button>' +
        '<input class="txt" type="text" aria-label="To-do" value="' + esc(it.text) + '" data-item="todos|' + it.id + '|text">' +
        '<span class="todo-meta' + (over ? " over" : "") + '"><input type="date" data-item="todos|' + it.id + '|due" value="' + esc(it.due || "") + '" aria-label="Due date"><input type="number" inputmode="numeric" min="0" data-type="num" placeholder="min" value="' + (num(it.est) || "") + '" data-item="todos|' + it.id + '|est" aria-label="Minutes"></span>' +
        '<button class="del" data-act="list-del" data-path="todos" data-id="' + it.id + '" aria-label="Delete">' + ic("x") + "</button></li>";
    }).join("");
    return card("To-do list", form + '<div class="spacer"></div>' + chips + summary + '<div class="spacer"></div>' +
      (rows ? '<ul class="list todo-list">' + rows + "</ul>" : '<div class="empty">' + (f === "done" ? "Nothing ticked off yet." : all.length ? "Nothing here. Try another filter." : "Nothing on the list. What is one thing to get done?") + "</div>") +
      (f === "done" && shown.length ? '<div class="spacer"></div><button class="btn sm" data-act="todo-clear">' + ic("trash") + " Clear done</button>" : ""), { dot: "p" });
  }

  /* ---- Routines ---- */
  function routinesTab() {
    var rs = Object.keys(state.routines).map(function (id) { return state.routines[id]; }).sort(function (a, b) { return (a.created || 0) - (b.created || 0); });
    var starters = '<div class="row wrap"><button class="btn pink" data-act="rt-add" data-val="">' + ic("plus") + " New routine</button>" + Object.keys(RT_TEMPLATES).map(function (k) { return '<button class="btn sm" data-act="rt-add" data-val="' + k + '">' + esc(RT_TEMPLATES[k].title) + "</button>"; }).join("") + "</div>";
    if (!rs.length) return card("Routines", '<p class="muted" style="margin-top:0">A routine is a short list of steps you repeat, every day or every week. Tick the steps as you go; the list resets by itself each day or week and keeps your streak.</p>' + starters, { dot: "s" });
    var cards = rs.map(function (r) {
      var p = "routines." + r.id, key = rtKey(r.freq), n = (r.steps || []).length, tk = rtTicked(r, key), log = (r.log || {})[key] || {}, per = r.freq === "weekly" ? "this week" : "today";
      var steps = (r.steps || []).map(function (s) {
        var on = !!log[s.id];
        return '<li class="' + (on ? "done" : "") + '"><button class="rt-tick' + (on ? " on" : "") + '" data-act="rt-tick" data-id="' + r.id + '" data-step="' + s.id + '" aria-pressed="' + on + '" aria-label="Done ' + per + '">' + (on ? ic("check") : "") + "</button>" +
          '<input class="txt" type="text" aria-label="Step" value="' + esc(s.text) + '" data-item="' + p + ".steps|" + s.id + '|text">' +
          '<input type="number" inputmode="numeric" min="0" data-type="num" class="rt-mins" placeholder="min" value="' + (num(s.mins) || "") + '" data-item="' + p + ".steps|" + s.id + '|mins" aria-label="Minutes">' +
          '<button class="del" data-act="list-del" data-path="' + p + '.steps" data-id="' + s.id + '" aria-label="Delete step">' + ic("x") + "</button></li>";
      }).join("");
      var streak = rtStreak(r), span = r.freq === "weekly" ? 4 : 7, rate = rtRate(r, span);
      return card("", '<div class="row wrap" style="align-items:center"><div class="grow" style="min-width:180px">' + bindInput(p + ".title", 'placeholder="Routine name" maxlength="80" style="font-family:var(--serif);font-size:1.25rem;font-weight:600"') + '</div><div style="flex:0 0 120px">' + bindSelect(p + ".freq", [["daily", "Daily"], ["weekly", "Weekly"]], 'data-rerender aria-label="How often"') + '</div><button class="del" data-act="rt-del" data-id="' + r.id + '" aria-label="Delete routine">' + ic("trash") + "</button></div>" +
        '<div class="row wrap" style="margin:12px 0 6px"><span class="grow" style="flex:1 1 200px">' + progress(n ? 100 * tk / n : 0, "sage") + '</span><span class="badge">' + tk + "/" + n + " " + per + "</span>" + (streak ? '<span class="badge pink">' + streak + (r.freq === "weekly" ? " week" : " day") + (streak === 1 ? "" : "s") + " 🔥</span>" : "") + '<span class="badge">' + rate + "/" + span + (r.freq === "weekly" ? " weeks" : " days") + "</span>" + (rtMinutes(r) ? '<span class="badge">about ' + hm(rtMinutes(r)) + "</span>" : "") + "</div>" +
        (n ? '<ul class="list rt-steps">' + steps + "</ul>" : '<div class="empty">No steps yet. Add the first one below.</div>') +
        '<div class="adder"><input type="text" placeholder="Add a step…" data-add="' + p + '.steps" aria-label="Add a step"><button class="icon-btn sm" data-act="list-add" data-path="' + p + '.steps" aria-label="Add">' + ic("plus") + "</button></div>", { cls: "tint-sage" });
    }).join('<div class="spacer"></div>');
    return starters + '<div class="spacer"></div>' + cards;
  }

  /* ---- Time blocking ---- */
  function blockLanes(sorted) {
    var lanes = [], out = {};
    sorted.forEach(function (b) {
      var a = tmin(b.start), z = a + Math.max(blockDur(b), 15), i = 0;
      while (lanes[i] != null && lanes[i] > a) i++;
      lanes[i] = z; out[b.id] = i;
    });
    return { of: out, count: Math.max(1, lanes.length) };
  }
  function nextFree(k) {
    var l = blocksFor(k).map(function (b) { return tmin(b.end); }).filter(function (x) { return x != null; });
    return l.length ? Math.max.apply(null, l) : 9 * 60;
  }
  function blocksTab() {
    var k = /^\d{4}-\d{2}-\d{2}$/.test(state.ui.blockDay || "") ? state.ui.blockDay : todayKey(), d = parseD(k), isToday = k === todayKey();
    var path = "blocks." + k, arr = blocksFor(k), sorted = arr.slice().sort(byStart);
    var first = 6, last = 22;
    sorted.forEach(function (b) { var a = tmin(b.start), z = tmin(b.end); if (a != null) first = Math.min(first, Math.floor(a / 60)); if (z != null) last = Math.max(last, Math.ceil(z / 60)); });
    var PX = 44, lanes = blockLanes(sorted), grid = "";
    for (var h = first; h <= last; h++) grid += '<div class="tl-hour" style="top:' + (h - first) * PX + 'px"><span>' + hlabel(h) + "</span></div>";
    var items = sorted.map(function (b) {
      var a = tmin(b.start), dur = blockDur(b); if (a == null) return "";
      var c = rtCat(b.cat), w = 100 / lanes.count;
      return '<div class="tl-block' + (b.done ? " done" : "") + '" style="top:' + ((a / 60 - first) * PX) + "px;height:" + Math.max(dur / 60 * PX, 22) + "px;left:calc(" + (lanes.of[b.id] * w) + "% + 52px);width:calc(" + w + "% - 56px);background:" + c[2] + '"><b>' + esc(b.title || c[1]) + "</b><span>" + tlabel(b.start) + " – " + tlabel(b.end) + "</span></div>";
    }).join("");
    var now = "";
    if (isToday) { var n = new Date(), nm = n.getHours() * 60 + n.getMinutes(); if (nm / 60 >= first && nm / 60 <= last) now = '<div class="tl-now" style="top:' + ((nm / 60 - first) * PX) + 'px"></div>'; }
    var timeline = '<div class="timeline" style="height:' + (last - first) * PX + 'px">' + grid + items + now + "</div>";
    var tot = {}; sorted.forEach(function (b) { tot[b.cat] = (tot[b.cat] || 0) + blockDur(b); });
    var planned = sum(sorted, blockDur);
    var summary = sorted.length ? '<div class="chips" style="margin-bottom:10px">' + RT_CATS.filter(function (c) { return tot[c[0]]; }).map(function (c) { return '<span class="chip"><i class="cdot" style="background:' + c[2] + '"></i>' + c[1] + " " + hm(tot[c[0]]) + "</span>"; }).join("") + '<span class="badge">' + hm(planned) + " planned</span></div>" : "";
    var prev = 0;
    var rows = sorted.map(function (b) {
      var a = tmin(b.start), over = a != null && prev > a; prev = Math.max(prev, tmin(b.end) || 0);
      return '<div class="blk-row' + (b.done ? " done" : "") + '"><input type="checkbox" class="check" aria-label="Done" data-item="' + path + "|" + b.id + '|done" data-rerender ' + (b.done ? "checked" : "") + ">" +
        '<input type="time" data-item="' + path + "|" + b.id + '|start" value="' + esc(b.start || "") + '" data-rerender aria-label="Start"><input type="time" data-item="' + path + "|" + b.id + '|end" value="' + esc(b.end || "") + '" data-rerender aria-label="End">' +
        '<input type="text" class="txt grow" data-item="' + path + "|" + b.id + '|title" value="' + esc(b.title) + '" placeholder="What is this block for?" aria-label="Title" maxlength="80">' +
        '<select data-item="' + path + "|" + b.id + '|cat" data-rerender aria-label="Category">' + RT_CATS.map(function (c) { return '<option value="' + c[0] + '"' + (b.cat === c[0] ? " selected" : "") + ">" + c[1] + "</option>"; }).join("") + "</select>" +
        (over ? '<span class="badge pink" title="Overlaps the block before it">overlap</span>' : "") + (blockDur(b) ? '<span class="badge">' + hm(blockDur(b)) + "</span>" : '<span class="badge pink">check times</span>') +
        '<button class="btn sm ghost" data-act="focus-block" data-title="' + esc(b.title || "") + '" aria-label="Start a focus timer for this block">' + ic("clock") + " Focus</button>" +
        '<button class="del" data-act="list-del" data-path="' + path + '" data-id="' + b.id + '" aria-label="Delete block">' + ic("x") + "</button></div>";
    }).join("");
    var s0 = nextFree(k);
    var form = '<div class="row wrap" data-form="block"><input type="text" name="title" class="grow" style="min-width:180px" placeholder="e.g. Write product listings" maxlength="80" aria-label="Title">' +
      '<input type="time" name="start" value="' + tstr(s0) + '" aria-label="Start"><input type="time" name="end" value="' + tstr(Math.min(s0 + 60, 1439)) + '" aria-label="End">' +
      '<select name="cat" aria-label="Category">' + RT_CATS.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + "</option>"; }).join("") + '</select><button class="btn pink" data-act="block-add" data-day="' + k + '">' + ic("plus") + " Add block</button></div>";
    var openTodos = state.todos.filter(function (x) { return !x.done; }), rtl = Object.keys(state.routines).map(function (id) { return state.routines[id]; });
    var pull = '<div class="row wrap" data-form="pull" style="margin-top:12px"><select name="todo" aria-label="Pick a to-do" style="flex:1 1 200px"><option value="">Pull in a to-do…</option>' + openTodos.map(function (x) { return '<option value="' + x.id + '">' + esc((x.text || "Untitled").slice(0, 60)) + (num(x.est) ? " (" + num(x.est) + " min)" : "") + "</option>"; }).join("") + '</select><button class="btn sm" data-act="block-from-todo" data-day="' + k + '">Add</button>' +
      '<select name="routine" aria-label="Pick a routine" style="flex:1 1 200px"><option value="">Pull in a routine…</option>' + rtl.map(function (r) { return '<option value="' + r.id + '">' + esc(r.title || "Routine") + "</option>"; }).join("") + '</select><button class="btn sm" data-act="block-from-routine" data-day="' + k + '">Add</button></div>';
    var tools = '<div class="row wrap" style="margin-top:12px"><button class="btn sm" data-act="block-copy" data-day="' + k + '">Copy from yesterday</button><button class="btn sm" data-act="block-usual-load" data-day="' + k + '"' + (state.usualDay.length ? "" : " disabled") + '>Use my usual day</button><button class="btn sm" data-act="block-usual-save" data-day="' + k + '"' + (arr.length ? "" : " disabled") + '>Save as my usual day</button><button class="btn sm ghost danger" data-act="block-clear" data-day="' + k + '"' + (arr.length ? "" : " disabled") + ">Clear day</button></div>";
    var nav = '<div class="nav-arrows"><button class="icon-btn sm" data-act="block-day" data-val="-1" aria-label="Previous day">' + ic("left") + '</button><button class="btn sm" data-act="block-day" data-val="0">Today</button><button class="icon-btn sm" data-act="block-day" data-val="1" aria-label="Next day">' + ic("right") + "</button></div>";
    return '<div class="grid"><div class="c7 stack">' + card(prettyDay(d), summary + (rows ? '<div class="blk-list">' + rows + "</div>" : '<div class="empty">No blocks yet. Add one below, or copy a day you liked.</div>') + '<div class="spacer"></div>' + form + pull + tools, { dot: "s", right: nav }) + "</div>" +
      '<div class="c5">' + card("Day view", timeline, { dot: "b" }) + "</div></div>";
  }

  /* ---- Focus timer (Pomodoro) ---- */
  function fmtClock(sec) { sec = Math.max(0, sec); return pad(Math.floor(sec / 60)) + ":" + pad(sec % 60); }
  function focusRemaining(run) { return run.paused ? run.remaining : Math.max(0, Math.round((run.endsAt - Date.now()) / 1000)); }
  function focusTab() {
    var S = state.focus.settings, run = state.focus.run, tk = todayKey(), ses = state.focus.sessions;
    var todays = ses.filter(function (x) { return x.date === tk; }), wk = ymd(mondayOf(today()));
    var weekS = ses.filter(function (x) { return x.date >= wk; });
    var rem = run ? focusRemaining(run) : S.focus * 60, total = run ? run.total : S.focus * 60;
    var phase = run ? (run.phase === "focus" ? "Focus" : run.phase === "long" ? "Long break" : "Short break") : "Ready to focus";
    var C = 2 * Math.PI * 54, off = C * (run ? Math.min(1, Math.max(0, rem / total)) : 1);
    var ring = '<div class="focus-wrap"><div class="focus-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="fr-track" cx="60" cy="60" r="54"/><circle class="fr-arc' + (run && run.phase !== "focus" ? " brk" : "") + '" data-focus-arc cx="60" cy="60" r="54" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C - off).toFixed(1) + '" transform="rotate(-90 60 60)"/></svg>' +
      '<div class="fr-text"><b data-focus-clock>' + fmtClock(rem) + "</b><span>" + phase + (run && run.paused ? " · paused" : "") + "</span></div></div>";
    var dots = ""; for (var i = 0; i < S.every; i++) dots += '<i class="rd' + (i < (state.focus.round || 0) ? " on" : "") + '"></i>';
    var label = run ? run.label : (state.focus.label || "");
    var controls = !run ? '<button class="btn pink big" data-act="focus-start">' + ic("clock") + " Start focus</button>" :
      (run.paused ? '<button class="btn pink big" data-act="focus-resume">Resume</button>' : '<button class="btn big" data-act="focus-pause">Pause</button>') + '<button class="btn" data-act="focus-skip">' + (run.phase === "focus" ? "Stop" : "Skip break") + '</button><button class="btn ghost" data-act="focus-reset">Reset</button>';
    var todoList = '<datalist id="focus-todos">' + state.todos.filter(function (x) { return !x.done; }).slice(0, 40).map(function (x) { return '<option value="' + esc(x.text) + '">'; }).join("") + "</datalist>";
    var left = card("Pomodoro timer", ring + '<div class="rounds" aria-label="Rounds in this cycle">' + dots + "</div></div>" +
      '<label class="lbl">Working on</label><input type="text" id="focus-label" list="focus-todos" maxlength="80" placeholder="What is this round for?" value="' + esc(label) + '"' + (run ? " disabled" : "") + ">" + todoList +
      '<div class="row wrap focus-controls" style="margin-top:14px;justify-content:center">' + controls + "</div>" +
      '<p class="small muted" style="margin:14px 0 0;text-align:center">' + S.focus + " min focus · " + S.short + " min break · a " + S.long + " min break after " + S.every + " rounds. The timer keeps the right time if you leave this page; it only beeps while the page is open.</p>", { dot: "s" });
    var recent = ses.slice().reverse().slice(0, 8).map(function (x) { return '<li><span class="badge">' + x.mins + ' min</span><span class="meta">' + esc(shortDay(parseD(x.date))) + '</span><span class="grow small">' + esc(x.label || "Focus round") + '</span><button class="del" data-act="list-del" data-path="focus.sessions" data-id="' + x.id + '" aria-label="Delete">' + ic("x") + "</button></li>"; }).join("");
    var right = card("Today", '<div class="stats"><div class="stat"><span class="v">' + todays.length + '</span><span class="k">Rounds today</span></div><div class="stat"><span class="v">' + hm(sum(todays, function (x) { return x.mins; })) + '</span><span class="k">Focused today</span></div><div class="stat"><span class="v">' + weekS.length + '</span><span class="k">Rounds this week</span></div></div>' +
      '<div class="spacer"></div>' + (recent ? '<ul class="list">' + recent + "</ul>" : '<div class="empty">Finish a round and it shows up here, and in your Time review.</div>'), { dot: "p" }) +
      '<div class="spacer"></div>' + card("Timer settings", '<div class="row wrap focus-set"><div><label class="lbl">Focus (min)</label>' + bindNum("focus.settings.focus", 'min="1" max="180"') + '</div><div><label class="lbl">Break (min)</label>' + bindNum("focus.settings.short", 'min="1" max="60"') + '</div><div><label class="lbl">Long break</label>' + bindNum("focus.settings.long", 'min="1" max="90"') + '</div><div><label class="lbl">Rounds before long</label>' + bindNum("focus.settings.every", 'min="2" max="10"') + "</div></div>" +
      '<div class="row wrap" style="margin-top:12px"><label class="row" style="gap:8px"><input type="checkbox" class="check" data-bind="focus.settings.awake" data-rerender ' + (S.awake ? "checked" : "") + '> Keep the screen awake while running</label><label class="row" style="gap:8px"><input type="checkbox" class="check" data-bind="focus.settings.sound" data-rerender ' + (S.sound ? "checked" : "") + '> Beep when a round ends</label></div>', { dot: "b" });
    return '<div class="grid"><div class="c6">' + left + '</div><div class="c6">' + right + "</div></div>";
  }

  /* ---- Time review ---- */
  function weekStats(mon) {
    var s = { cat: {}, days: [], planned: 0, blocks: 0, blocksDone: 0, withBlocks: 0, overlaps: 0, rounds: 0, focusMin: 0, tod: { morning: 0, afternoon: 0, evening: 0 } };
    RT_CATS.forEach(function (c) { s.cat[c[0]] = 0; });
    for (var i = 0; i < 7; i++) {
      var k = ymd(addDays(mon, i)), list = blocksFor(k).slice().sort(byStart), day = { k: k, cat: {}, total: 0 }, prev = 0, over = false;
      list.forEach(function (b) {
        var dur = blockDur(b); if (!dur) return;
        s.cat[b.cat] = (s.cat[b.cat] || 0) + dur; day.cat[b.cat] = (day.cat[b.cat] || 0) + dur; day.total += dur; s.planned += dur; s.blocks++; if (b.done) s.blocksDone++;
        var a = tmin(b.start); if (a < prev) over = true; prev = Math.max(prev, tmin(b.end));
        if (b.cat === "focus") s.tod[a < 720 ? "morning" : a < 1020 ? "afternoon" : "evening"] += dur;
      });
      if (day.total) s.withBlocks++;
      if (over) s.overlaps++;
      s.days.push(day);
    }
    var a0 = ymd(mon), z0 = ymd(addDays(mon, 6));
    state.focus.sessions.forEach(function (x) { if (x.date >= a0 && x.date <= z0) { s.rounds++; s.focusMin += x.mins; } });
    return s;
  }
  function reviewTab() {
    var mon = state.ui.reviewWeek ? parseD(state.ui.reviewWeek) : mondayOf(today()), cur = weekStats(mon), prev = weekStats(addDays(mon, -7)), sun = addDays(mon, 6);
    var label = shortDay(mon) + " – " + shortDay(sun), isNow = ymd(mon) === ymd(mondayOf(today()));
    var nav = '<div class="nav-arrows"><button class="icon-btn sm" data-act="rv-week" data-val="-1" aria-label="Previous week">' + ic("left") + '</button><button class="btn sm" data-act="rv-week" data-val="0">This week</button><button class="icon-btn sm" data-act="rv-week" data-val="1" aria-label="Next week">' + ic("right") + "</button></div>";
    var max = Math.max.apply(null, RT_CATS.map(function (c) { return Math.max(cur.cat[c[0]], prev.cat[c[0]]); }).concat([1]));
    var bars = RT_CATS.map(function (c) {
      var m = cur.cat[c[0]], dlt = m - prev.cat[c[0]];
      return '<div class="rv-row"><span class="rv-name"><i class="cdot" style="background:' + c[2] + '"></i>' + c[1] + '</span><span class="rv-bar"><i style="width:' + (100 * m / max) + "%;background:" + c[2] + '"></i></span><span class="rv-val">' + (m ? hm(m) : "—") + (prev.planned && dlt ? ' <small class="muted">' + (dlt > 0 ? "+" : "−") + hm(Math.abs(dlt)) + "</small>" : "") + "</span></div>";
    }).join("");
    var dmax = Math.max.apply(null, cur.days.map(function (d) { return d.total; }).concat([60]));
    var dayRows = cur.days.map(function (d, i) {
      return '<div class="rv-row"><span class="rv-name">' + DOW3[i] + " " + parseD(d.k).getDate() + '</span><span class="rv-bar stack-bar">' + RT_CATS.filter(function (c) { return d.cat[c[0]]; }).map(function (c) { return '<i style="width:' + (100 * d.cat[c[0]] / dmax) + "%;background:" + c[2] + '" title="' + c[1] + " " + hm(d.cat[c[0]]) + '"></i>'; }).join("") + '</span><span class="rv-val">' + (d.total ? hm(d.total) : "—") + "</span></div>";
    }).join("");
    var ins = [];
    function add(k, t) { ins.push({ k: k, t: t }); }
    if (!cur.planned) add("info", "No time blocks planned for this week. Plan a few days on the Time blocking tab and this review fills in.");
    else {
      add("info", "You planned " + hm(cur.planned) + " across " + cur.withBlocks + (cur.withBlocks === 1 ? " day" : " days") + " (" + hm(cur.planned / cur.withBlocks) + " on average).");
      var wasted = cur.cat.wasted, pw = Math.round(100 * wasted / cur.planned);
      if (wasted && pw >= 10) add("warn", hm(wasted) + " (" + pw + "% of planned time) is marked wasted or unplanned" + (prev.cat.wasted > wasted ? ", down from " + hm(prev.cat.wasted) + " last week. That is progress." : prev.cat.wasted && prev.cat.wasted < wasted ? ", up from " + hm(prev.cat.wasted) + " last week." : ".") + " Look at when it happens and give that slot a purpose, or a limit.");
      else if (wasted) add("good", "Only " + hm(wasted) + " marked wasted or unplanned (" + pw + "%).");
      else add("info", "Nothing is marked wasted or unplanned. If that is not quite true, an honest block or two will make this review more useful.");
      if (cur.withBlocks >= 3 && !cur.cat.leisure) add("warn", "No leisure or rest time is planned this week. Rest is part of being productive, so protect a block or two.");
      else if (cur.cat.focus && cur.cat.leisure > cur.cat.focus * 1.5) add("info", "You planned more leisure (" + hm(cur.cat.leisure) + ") than focus work (" + hm(cur.cat.focus) + "). Fine if that is the goal; if not, move a block or two.");
      else if (cur.cat.leisure && cur.cat.focus) add("good", "A balance of " + hm(cur.cat.focus) + " focus work and " + hm(cur.cat.leisure) + " leisure and rest.");
      var tod = cur.tod, best = Object.keys(tod).sort(function (a, b) { return tod[b] - tod[a]; })[0];
      if (tod[best] > 0 && cur.cat.focus >= 120) add("info", "Most of your focus work (" + Math.round(100 * tod[best] / cur.cat.focus) + "%) is in the " + best + ". Keep your hardest work there if it suits you.");
      if (cur.blocks >= 4) { var pc = Math.round(100 * cur.blocksDone / cur.blocks); add(pc < 50 ? "warn" : "good", "You ticked off " + cur.blocksDone + " of " + cur.blocks + " blocks (" + pc + "%)." + (pc < 50 ? " If blocks keep slipping, try fewer or shorter ones." : "")); }
      var empty = 7 - cur.withBlocks;
      if (empty >= 4 && cur.withBlocks) add("info", empty + " days have no blocks. Even a rough shape for the day helps.");
      if (cur.overlaps) add("warn", cur.overlaps + (cur.overlaps === 1 ? " day has" : " days have") + " overlapping blocks. You can't do two things at once, so move one.");
    }
    if (cur.rounds) add("good", "Focus timer: " + cur.rounds + (cur.rounds === 1 ? " round" : " rounds") + " (" + hm(cur.focusMin) + ") of deep focus this week" + (prev.rounds ? ", compared with " + prev.rounds + " last week." : "."));
    var daily = Object.keys(state.routines).map(function (id) { return state.routines[id]; }).filter(function (r) { return r.freq === "daily"; }), rm = sum(daily, rtMinutes);
    if (rm >= 150) add("info", "Your daily routines take about " + hm(rm) + " a day. Check that every step earns its place.");
    else if (daily.length && !rm) add("info", "Add minutes to your routine steps and I can show how much time your routines take.");
    var warn = ins.filter(function (x) { return x.k === "warn"; }).length;
    return '<div class="grid"><div class="c7 stack">' + card("Where the time went", bars + '<p class="small muted" style="margin:10px 0 0">Planned time from your blocks' + (prev.planned ? ", with the change since last week." : ".") + "</p>", { dot: "s", right: nav }) +
      card("The week at a glance", dayRows, { dot: "b" }) + "</div>" +
      '<div class="c5">' + card("What stands out", '<p class="small muted" style="margin:0 0 8px">' + esc(label) + (isNow ? " (this week)" : "") + '</p><p class="review-verdict ' + (warn ? "warn" : "good") + '">' + (!cur.planned ? "Nothing planned yet" : warn ? "A few things to look at" : "Looking balanced") + '</p><ul class="insights">' + ins.map(function (x) { return '<li class="k-' + x.k + '"><span class="i-dot" aria-hidden="true"></span><span>' + esc(x.t) + "</span></li>"; }).join("") + "</ul>", { dot: "k" }) + "</div></div>";
  }

  /* ---- Prioritise (the Eisenhower matrix moved here from Mind & Ikigai) ---- */
  function matrixTab() {
    var q = [["q1", "Do first", "Urgent · Important"], ["q2", "Schedule", "Not urgent · Important"], ["q3", "Delegate", "Urgent · Not important"], ["q4", "Let go", "Not urgent · Not important"]];
    return '<p class="small muted" style="margin:0 0 12px">Sort what is on your plate. Do the urgent and important first, schedule the important, hand off or drop the rest.</p><div class="matrix">' + q.map(function (x) { return '<div class="quad ' + x[0] + '"><h4>' + x[1] + '</h4><div class="tiny">' + x[2] + "</div>" + listEd("mind.matrix." + x[0], { placeholder: "Add…" }) + "</div>"; }).join("") + "</div>";
  }


  /* ---- Focus timer: the run is saved with an end time, so it keeps right time while the page is closed ---- */
  var audioCtx = null, wakeLock = null;
  function unlockAudio() {
    try { var C = window.AudioContext || window.webkitAudioContext; if (!C) return; audioCtx = audioCtx || new C(); if (audioCtx.state === "suspended") audioCtx.resume(); } catch (e) { /* ignore */ }
  }
  function beep() {
    if (state.focus.settings.sound) {
      try {
        unlockAudio();
        if (audioCtx) [0, 0.28, 0.56].forEach(function (t, i) {
          var o = audioCtx.createOscillator(), g = audioCtx.createGain(), at = audioCtx.currentTime + t;
          o.frequency.value = [660, 880, 990][i];
          g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.25, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.24);
          o.connect(g); g.connect(audioCtx.destination); o.start(at); o.stop(at + 0.26);
        });
      } catch (e) { /* ignore */ }
    }
    try { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate([200, 100, 200]); } catch (e) { /* ignore */ }
  }
  function wakeSync() {
    var run = state.focus.run, want = !!run && !run.paused && state.focus.settings.awake;
    if (want && !wakeLock && navigator.wakeLock && !document.hidden) {
      navigator.wakeLock.request("screen").then(function (l) { wakeLock = l; l.addEventListener("release", function () { wakeLock = null; }); }).catch(function () { /* not available */ });
    } else if (!want && wakeLock) { try { wakeLock.release(); } catch (e) { /* ignore */ } wakeLock = null; }
  }
  function focusFinish() {
    var run = state.focus.run, S = state.focus.settings, now = Date.now();
    if (!run) return;
    if (run.phase === "focus") {
      state.focus.sessions.push({ id: uid(), date: ymd(new Date(run.endsAt)), mins: Math.max(1, Math.round(run.total / 60)), label: run.label || "" });
      state.focus.round = (state.focus.round || 0) + 1;
      var long = state.focus.round >= S.every;
      if (long) state.focus.round = 0;
      var mins = long ? S.long : S.short, endsAt = run.endsAt + mins * 60000;
      state.focus.run = endsAt > now ? { phase: long ? "long" : "short", total: mins * 60, endsAt: endsAt, paused: false, remaining: 0, label: run.label } : null;
      toast("Focus round done 🎉" + (state.focus.run ? " Take a " + mins + " minute break." : ""));
    } else {
      state.focus.run = null;
      toast("Break over. Ready for the next round?");
    }
    beep(); save(); wakeSync();
    if (location.hash.indexOf("#/routines") === 0) render();
  }
  function focusTick() {
    var run = state.focus && state.focus.run;
    if (!run || run.paused) return;
    var rem = focusRemaining(run);
    if (rem <= 0) { focusFinish(); return; }
    Array.prototype.forEach.call(document.querySelectorAll("[data-focus-clock]"), function (e) { e.textContent = fmtClock(rem); });
    var arc = document.querySelector("[data-focus-arc]");
    if (arc) { var C = 2 * Math.PI * 54; arc.setAttribute("stroke-dashoffset", (C - C * Math.min(1, rem / run.total)).toFixed(1)); }
  }
  setInterval(focusTick, 1000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { focusTick(); wakeSync(); } });


  /* ------------------------------------------------------------ views: brain dump */

  function viewDump() {
    var f = state.ui.dumpTab === "sorted" ? "sorted" : "new", all = state.dump.slice().sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
    var fresh = all.filter(function (x) { return !x.sorted; }), done = all.filter(function (x) { return x.sorted; });
    var tabsHtml = '<div class="chips" style="margin:14px 0 10px"><button class="chip' + (f === "new" ? " on" : "") + '" data-act="dump-tab" data-val="new" aria-pressed="' + (f === "new") + '">To sort (' + fresh.length + ')</button><button class="chip' + (f === "sorted" ? " on" : "") + '" data-act="dump-tab" data-val="sorted" aria-pressed="' + (f === "sorted") + '">Sorted (' + done.length + ")</button></div>";
    var rts = Object.keys(state.routines).map(function (id) { return state.routines[id]; });
    var opts = '<option value="">Send to…</option><option value="todo">To-do</option><option value="project">New project</option><option value="goal">New goal</option>' +
      rts.map(function (r) { return '<option value="routine:' + r.id + '">Routine step: ' + esc((r.title || "Routine").slice(0, 40)) + "</option>"; }).join("") + '<option value="note">Notebook page</option>';
    var rows = (f === "new" ? fresh : done).map(function (it) {
      if (f === "new") return '<li class="dump-item"><textarea class="txt" rows="1" aria-label="Item" data-item="dump|' + it.id + '|text" maxlength="300">' + esc(it.text) + '</textarea><span class="dump-when">' + esc(dumpAgo(it.at)) + '</span><select class="dump-send" data-send="' + it.id + '" aria-label="Send this item to">' + opts + '</select><button class="del" data-act="list-del" data-path="dump" data-id="' + it.id + '" aria-label="Delete">' + ic("x") + "</button></li>";
      var where = { todo: "#/routines", project: "#/projects", goal: "#/goals", routine: "#/routines", note: "#/notebook" }[it.sorted] || "#/home";
      return '<li class="dump-item done"><span class="grow dump-text">' + esc(it.text) + '</span><span class="badge sage">' + esc(DUMP_KINDS[it.sorted] || "Sorted") + '</span><a class="small" href="' + where + '">Open</a><button class="del" data-act="list-del" data-path="dump" data-id="' + it.id + '" aria-label="Delete">' + ic("x") + "</button></li>";
    }).join("");
    var capture = card("Get it out of your head", '<p class="small muted" style="margin-top:0">Type or paste anything: tasks, worries, ideas, things to remember. Every line becomes its own item. Sort it later.</p><textarea id="dump-input" rows="4" placeholder="What is on your mind?" maxlength="20000" style="min-height:110px"></textarea><div class="spacer"></div><button class="btn pink" data-act="dump-add">' + ic("plus") + " Add to my brain dump</button>", { cls: "tint-pink", dot: "p" });
    var list = card(f === "new" ? "To sort" : "Sorted", (rows ? '<ul class="list dump-list">' + rows + "</ul>" : '<div class="empty">' + (f === "new" ? "Nothing waiting. Your head is clear." : "Nothing sorted yet. Use Send to… on an item.") + "</div>") +
      (f === "sorted" && done.length ? '<div class="spacer"></div><button class="btn sm" data-act="dump-clear">' + ic("trash") + " Clear sorted</button>" : ""), { dot: "s" });
    return head("Productivity", 'Brain <span class="em">dump</span>') + capture + tabsHtml + list;
  }
  function dumpSend(id, val) {
    var it = state.dump.filter(function (x) { return x.id === id; })[0];
    if (!it || it.sorted || !val) return;
    var parts = val.split(":"), kind = parts[0], text = it.text.trim(), undo = null, label = DUMP_KINDS[kind];
    if (!label) return;
    if (kind === "todo") {
      var t = { id: uid(), text: text.slice(0, 160), done: false, prio: 0, due: "", est: 0 };
      state.todos.push(t); state.ui.tabs.rt = "todo"; undo = function () { state.todos = state.todos.filter(function (x) { return x.id !== t.id; }); };
    } else if (kind === "project") {
      var pr = newProject(text.slice(0, 120)); state.projects[pr.id] = pr; state.ui.project = pr.id; state.ui.tabs.project = "framework"; undo = function () { delete state.projects[pr.id]; };
    } else if (kind === "goal") {
      var g = newGoal(text.slice(0, 120)); state.goals[g.id] = g; state.ui.goal = g.id; state.ui.tabs.goal = "plan"; undo = function () { delete state.goals[g.id]; };
    } else if (kind === "routine") {
      var ro = state.routines[parts[1]];
      if (!ro) return;
      var step = { id: uid(), text: text.slice(0, 160), mins: 0, done: false };
      ro.steps = ro.steps || []; ro.steps.push(step); state.ui.tabs.rt = "routines"; label = "the " + (ro.title || "routine"); undo = function () { ro.steps = ro.steps.filter(function (x) { return x.id !== step.id; }); };
    } else {
      ensureNb();
      var sec = state.nbSections.filter(function (x) { return x.name.toLowerCase() === "notes"; })[0] || state.nbSections[0], pid = uid(), ts = Date.now();
      state.notebook[pid] = { id: pid, paper: "lined", section: sec.id, title: text.slice(0, 60), created: ts, updated: ts, text: text, ink: "", strokes: [], topic: "", cues: "", summary: "" };
      undo = function () { delete state.notebook[pid]; };
    }
    it.sorted = kind;
    save(); render();
    toastUndo("Sent to " + label, function () { undo(); it.sorted = ""; save(); render(); });
  }

  /* ------------------------------------------------------------ views: travel */

  function outfitCards(p, trip, dayMeta) {
    var path = p + ".outfits", list = listAt(path);
    var cards = list.map(function (o) {
      var u = imgs.url(o.imgId);
      var ph = u
        ? '<div class="of-photo"><img alt="" src="' + u + '"><div class="v-actions">' + photoLabel(path, o, "Change photo") + '<button class="icon-btn sm" data-act="photo-remove" data-path="' + path + '" data-id="' + o.id + '" aria-label="Remove photo">' + ic("x") + "</button></div></div>"
        : '<label class="of-photo of-empty">' + ic("image") + "<span>Add a photo</span>" + '<input type="file" accept="image/*" hidden data-photo="' + path + "|" + o.id + '"></label>';
      return '<div class="outfit' + (o.done ? " done" : "") + '">' + ph +
        '<input class="txt" type="text" aria-label="Outfit" placeholder="Linen dress + sandals…" value="' + esc(o.text) + '" data-item="' + path + "|" + o.id + '|text">' +
        '<div class="of-row">' + dayMeta(o) + '<label class="of-pack"><input type="checkbox" class="check" aria-label="Packed" data-item="' + path + "|" + o.id + '|done" data-rerender ' + (o.done ? "checked" : "") + "> Packed</label>" +
        '<button class="del" data-act="list-del" data-path="' + path + '" data-id="' + o.id + '" aria-label="Delete outfit">' + ic("x") + "</button></div></div>";
    }).join("");
    return '<p class="small muted" style="margin:0 0 12px">Plan a look per day so packing is easy. Add a photo of each outfit, or several at once.</p>' +
      '<div class="rs-adds of-adds"><button class="v-add" data-act="outfit-add" data-id="' + trip.id + '">' + ic("plus") + "<span>Add an outfit</span></button>" +
      '<label class="v-add">' + ic("image") + "<span>Add from photos</span>" + '<input type="file" accept="image/*" multiple hidden data-bulk="outfits|' + trip.id + '"></label></div>' +
      (list.length ? '<div class="outfits">' + cards + "</div>" : '<div class="empty">No outfits planned yet.</div>');
  }
  function albumGrid(trip) {
    var path = "travel.trips." + trip.id + ".album", list = listAt(path);
    var items = list.map(function (a, i) {
      var u = imgs.url(a.imgId);
      return '<figure class="al-item"><button class="al-img" data-act="album-view" data-trip="' + trip.id + '" data-i="' + i + '" aria-label="Open photo ' + (i + 1) + '">' + (u ? '<img alt="" src="' + u + '">' : ic("image")) + "</button>" +
        '<div class="al-cap"><input type="text" class="txt" aria-label="Caption" placeholder="Add a caption…" maxlength="120" value="' + esc(a.caption) + '" data-item="' + path + "|" + a.id + '|caption">' +
        '<button class="del" data-act="album-del" data-trip="' + trip.id + '" data-id="' + a.id + '" aria-label="Remove photo">' + ic("x") + "</button></div></figure>";
    }).join("");
    return '<div class="row" style="margin-bottom:12px"><span class="grow small muted">Keep your photos from ' + esc(trip.text || "this trip") + " here.</span>" + (list.length ? '<span class="badge">' + list.length + (list.length === 1 ? " photo" : " photos") + "</span>" : "") + "</div>" +
      '<div class="album"><label class="v-add al-add">' + ic("plus") + "<span>Add photos</span>" + '<input type="file" accept="image/*" multiple hidden data-bulk="album|' + trip.id + '"></label>' + items + "</div>" +
      (list.length ? "" : '<p class="empty" style="margin-top:14px">Your trip album is empty. Add photos from the trip and they will live here.</p>');
  }
  var lightbox = null;
  function closeLightbox() { if (lightbox) { lightbox.remove(); lightbox = null; } }
  function openLightbox(tripId, i) {
    var trip = state.travel.trips[tripId];
    showLightbox(trip && trip.album || [], i);
  }
  /* list: [{ imgId, caption }] */
  function showLightbox(list, i) {
    if (!list.length) return;
    i = (i + list.length) % list.length;
    var a = list[i], u = imgs.url(a.imgId);
    closeLightbox();
    lightbox = document.createElement("div");
    lightbox.className = "lightbox"; lightbox.setAttribute("role", "dialog"); lightbox.setAttribute("aria-label", "Photo " + (i + 1) + " of " + list.length);
    lightbox.innerHTML = '<button class="lb-x icon-btn" data-lb="close" aria-label="Close">' + ic("x") + "</button>" +
      (list.length > 1 ? '<button class="lb-nav lb-prev icon-btn" data-lb="prev" aria-label="Previous photo">' + ic("left") + '</button><button class="lb-nav lb-next icon-btn" data-lb="next" aria-label="Next photo">' + ic("arrow") + "</button>" : "") +
      '<img alt="" src="' + u + '">' + (a.caption ? '<p class="lb-cap">' + esc(a.caption) + "</p>" : "");
    lightbox.addEventListener("click", function (e) {
      var b = e.target.closest("[data-lb]"), k = b && b.getAttribute("data-lb");
      if (k === "prev") showLightbox(list, i - 1); else if (k === "next") showLightbox(list, i + 1); else if (e.target === lightbox || k === "close") closeLightbox();
    });
    document.body.appendChild(lightbox);
    lightbox.querySelector(".lb-x").focus();
  }
  document.addEventListener("keydown", function (e) { if (lightbox && e.key === "Escape") closeLightbox(); });
  /* a pasted picture address that no longer loads falls back to the placeholder */
  document.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.tagName === "IMG" && t.classList.contains("wimg")) { var w = t.closest(".wc-photo"); if (w) w.classList.add("broken"); }
  }, true);


  /* ---- the world map: tap to drop a pin; pins are bucket-list entries that have a position ---- */
  var mapFocus = "";
  function r3(n) { return Math.round(n * 1000) / 1000; }
  function mapPins() { return state.travel.bucket.filter(function (b) { return typeof b.x === "number" && typeof b.y === "number"; }); }
  function pinSvg() { return '<svg viewBox="0 0 24 32" aria-hidden="true"><path d="M12 0C5.4 0 0 5.2 0 11.7 0 20 12 32 12 32s12-12 12-20.3C24 5.2 18.6 0 12 0z"/><circle cx="12" cy="11.5" r="4.4"/></svg>'; }
  function worldMap() {
    var W = window.LIFE_WORLD;
    if (!W || !Array.isArray(W.countries)) return "";
    var ui = state.ui, zoom = ui.mapZoom, pins = mapPins(), seen = pins.filter(function (b) { return b.done; }).length, dr = ui.pinDraft;
    var place = ui.pinPlace ? state.travel.bucket.filter(function (b) { return b.id === ui.pinPlace; })[0] : null;
    var sel = !place && !dr && ui.pinSel ? pins.filter(function (b) { return b.id === ui.pinSel; })[0] : null;
    var svg = '<svg class="wmap-svg" viewBox="0 0 ' + W.w + " " + W.h + '" role="img" aria-label="World map. Tap a spot to drop a pin.">' +
      W.countries.map(function (c) { return '<path data-n="' + esc(c[0]) + '" d="' + c[1] + '"/>'; }).join("") + "</svg>";
    var marks = pins.map(function (b) {
      var on = sel && b.id === sel.id;
      return '<button class="wpin' + (b.done ? " seen" : "") + (on ? " sel" : "") + '" style="left:' + (b.x * 100).toFixed(2) + "%;top:" + (b.y * 100).toFixed(2) + '%" data-act="pin-sel" data-id="' + b.id + '" aria-label="' + esc((b.text || "Pin") + (b.done ? ", been there" : "")) + '">' + pinSvg() +
        ((zoom > 1 || on) && b.text ? '<span class="wpin-l">' + esc(b.text) + "</span>" : "") + "</button>";
    }).join("") + (dr ? '<span class="wpin draft" style="left:' + (dr.x * 100).toFixed(2) + "%;top:" + (dr.y * 100).toFixed(2) + '%">' + pinSvg() + "</span>" : "");
    var below;
    if (place) below = '<div class="wmap-note row wrap"><span class="grow">Tap the map to place <b>' + esc(place.text || "this place") + '</b>.</span><button class="btn sm ghost" data-act="pin-cancel">Cancel</button></div>';
    else if (dr) below = '<div class="wmap-note"><label class="lbl" for="pin-label">Name this place</label><div class="row wrap" data-form="pin-add"><input type="text" id="pin-label" name="label" class="grow" style="min-width:160px" maxlength="120" value="' + esc(dr.name) + '" placeholder="e.g. Kyoto in spring"><button class="btn pink" data-act="pin-add">' + ic("pin") + ' Add pin</button><button class="btn ghost" data-act="pin-cancel">Cancel</button></div><p class="small muted" style="margin:8px 0 0">It will be added to your bucket list too.</p></div>';
    else if (sel) below = '<div class="wmap-note"><div class="row wrap"><input type="text" class="grow" style="min-width:150px" maxlength="120" aria-label="Pin name" value="' + esc(sel.text) + '" data-item="travel.bucket|' + sel.id + '|text"><label class="of-pack"><input type="checkbox" class="check" data-item="travel.bucket|' + sel.id + '|done" data-rerender ' + (sel.done ? "checked" : "") + '> Been there</label><button class="btn sm ghost" data-act="pin-unpin" data-id="' + sel.id + '">Remove from map</button><button class="icon-btn sm" data-act="pin-close" aria-label="Close">' + ic("x") + "</button></div></div>";
    else below = '<p class="small muted wmap-note">' + (pins.length ? "Tap a pin to edit it, or tap anywhere to add another." : "Tap anywhere on the map to drop your first pin. Each pin joins your bucket list.") + "</p>";
    var bar = '<div class="row wrap wmap-bar"><div class="row"><button class="icon-btn sm" data-act="map-zoom" data-val="-1" aria-label="Zoom out"' + (zoom <= 1 ? " disabled" : "") + ">−</button><span class=\"small muted\">" + (zoom === 1 ? "Whole world" : zoom + "× zoom") + '</span><button class="icon-btn sm" data-act="map-zoom" data-val="1" aria-label="Zoom in"' + (zoom >= 4 ? " disabled" : "") + ">+</button></div>" +
      '<span class="grow"></span>' + (pins.length ? '<span class="badge">' + pins.length + (pins.length === 1 ? " place" : " places") + (seen ? " · " + seen + " visited" : "") + "</span>" : "") + "</div>";
    return card("My world", bar + '<div class="wmap-scroll"><div class="wmap-inner' + (place ? " placing" : "") + '" style="width:' + zoom * 100 + '%" data-act="map-tap">' + svg + marks + "</div></div>" + below, { cls: "wmap-card", dot: "k", attrs: 'data-zoom="' + zoom + '"' });
  }


  /* ---- trip cards under the map: cover photo, 1-5 hearts, name and dates ---- */
  var scrollToMain = false;
  function tripCover(t) {
    var a = (t.album || []).filter(function (x) { return imgs.url(x.imgId); })[0] || (t.outfits || []).filter(function (x) { return imgs.url(x.imgId); })[0];
    return a ? imgs.url(a.imgId) : "";
  }
  function tripCards(trips, cur) {
    var items = trips.map(function (t, i) {
      var u = tripCover(t), r = clamp(parseInt(t.rating, 10) || 0, 0, 5), now = today();
      var from = t.start ? parseD(t.start) : null, to = t.end ? parseD(t.end) : from, badge = "";
      if (from) {
        if (from > now) badge = '<span class="badge pink">' + daysBetween(now, from) + (daysBetween(now, from) === 1 ? " day to go" : " days to go") + "</span>";
        else if (to >= now) badge = '<span class="badge pink">Happening now</span>';
        else badge = '<span class="badge sage">Been there</span>';
      }
      var hearts = [1, 2, 3, 4, 5].map(function (n) {
        return '<button class="tc-heart' + (n <= r ? " on" : "") + '" data-act="trip-rate" data-id="' + t.id + '" data-val="' + n + '" aria-label="Rate ' + n + " of 5" + (n === r ? " (tap to clear)" : "") + '" aria-pressed="' + (n === r) + '">' + ic("heart") + "</button>";
      }).join("");
      var dates = from ? shortDay(from) + (t.end && t.end !== t.start ? " – " + shortDay(parseD(t.end)) : "") : "No dates yet";
      return '<article class="tcard' + (cur && cur.id === t.id ? " on" : "") + '"><div class="tc-head"><span class="tc-n">' + pad(i + 1) + '</span><span class="tc-hearts" role="group" aria-label="Trip rating">' + hearts + "</span></div>" +
        '<button class="tc-photo" data-act="trip-open" data-go="1" data-id="' + t.id + '" aria-label="Open ' + esc(t.text || "trip") + '">' + (u ? '<img alt="" src="' + u + '">' : "<span>" + ic("image") + "<small>Add photos in the trip's Album</small></span>") + "</button>" +
        '<div class="tc-info"><b>' + esc(t.text || "Untitled trip") + "</b>" + (t.dest ? "<span>" + esc(t.dest) + "</span>" : "") + '<span class="muted">' + esc(dates) + "</span>" + badge + "</div></article>";
    }).join("");
    return card("My trips", '<div class="tcards">' + items + '<button class="tcard tc-add" data-act="trip-add" data-go="1">' + ic("plus") + "<span>Plan a trip</span></button></div>", { dot: "p" });
  }


  /* ---- trip log: boarding pass, country facts, transport, stay, meals, activities, review ---- */
  var LOG_TABLES = {
    transport: { title: "Transportation", add: "Add a journey", cols: [["date", "Date", "date"], ["from", "Departure", "text"], ["to", "Arrival", "text"]] },
    stay: { title: "Accommodation", add: "Add a stay", cols: [["date", "Date", "date"], ["text", "Where", "text"], ["checkin", "Check-in", "text"], ["checkout", "Check-out", "text"]] },
    meals: { title: "Meals & restaurants", add: "Add a meal", cols: [["date", "Date", "date"], ["text", "Restaurant", "text"]] },
    activities: { title: "Activities", add: "Add an activity", cols: [["date", "Date", "date"], ["text", "What", "text"]] }
  };
  function tripLog(t) {
    if (!t.log || typeof t.log !== "object" || Array.isArray(t.log)) t.log = {};
    var l = t.log;
    ["ticket", "facts"].forEach(function (k) { if (!l[k] || typeof l[k] !== "object" || Array.isArray(l[k])) l[k] = {}; });
    Object.keys(LOG_TABLES).forEach(function (k) { if (!Array.isArray(l[k])) l[k] = []; });
    if (typeof l.review !== "string") l.review = "";
    return l;
  }
  function logTable(p, key) {
    var T = LOG_TABLES[key], path = p + ".log." + key, list = listAt(path);
    var rows = list.map(function (it) {
      return '<div class="lg-row lg-' + T.cols.length + '">' + T.cols.map(function (c) {
        return itemInput(path, it, c[0], 'placeholder="' + c[1] + '" aria-label="' + c[1] + '" maxlength="120"', c[2]);
      }).join("") + '<button class="del" data-act="list-del" data-path="' + path + '" data-id="' + it.id + '" aria-label="Delete row">' + ic("x") + "</button></div>";
    }).join("");
    return '<section class="lg-sec"><h4 class="sub-h">' + T.title + "</h4>" + (rows ? '<div class="lg-rows">' + rows + "</div>" : "") +
      '<button class="btn sm" data-act="log-add" data-id="' + p.split(".").pop() + '" data-key="' + key + '">' + ic("plus") + " " + T.add + "</button></section>";
  }
  function tripLogView(p, t) {
    tripLog(t);
    var tk = p + ".log.ticket", f = p + ".log.facts", fld = function (label, field, type, ph, cls) {
      return '<label class="tk-f ' + (cls || "") + '"><span>' + label + "</span>" + '<input type="' + (type || "text") + '" data-bind="' + tk + "." + field + '" maxlength="60" placeholder="' + (ph || "") + '" value="' + esc(getP(tk + "." + field) || "") + '"></label>';
    };
    var ticket = '<div class="ticket"><div class="tk-main"><div class="tk-top"><b>Boarding pass</b><span>' + ic("plane") + "</span></div>" +
      fld("Name", "name", "text", "Who's flying", "wide") +
      '<div class="tk-row3">' + fld("Date", "date", "date") + fld("Time", "time", "text", "09:40") + fld("Flight no.", "flight", "text", "AB 123") + "</div>" +
      '<div class="tk-route">' + fld("From", "from", "text", "Home") + '<span class="tk-plane" aria-hidden="true">' + ic("plane") + "</span>" + fld("To", "to", "text", "Away") + "</div>" +
      '<div class="tk-row3">' + fld("Seat", "seat", "text", "14A") + fld("Gate", "gate", "text", "B7") + fld("Boarding", "boarding", "text", "08:55") + "</div></div>" +
      '<div class="tk-stub" aria-hidden="true"></div></div>';
    var facts = [["Country", "country"], ["Language", "language"], ["Time difference", "timeDiff"], ["Currency", "currency"], ["Exchange rate", "rate"], ["Travellers", "travelers"]].map(function (x) {
      return '<label class="fact"><span>' + x[0] + '</span><input type="text" data-bind="' + f + "." + x[1] + '" maxlength="80" aria-label="' + x[0] + '" value="' + esc(getP(f + "." + x[1]) || "") + '"></label>';
    }).join("");
    var r = clamp(parseInt(t.rating, 10) || 0, 0, 5);
    var hearts = [1, 2, 3, 4, 5].map(function (n) { return '<button class="tc-heart' + (n <= r ? " on" : "") + '" data-act="trip-rate" data-id="' + t.id + '" data-val="' + n + '" aria-label="Rate ' + n + ' of 5" aria-pressed="' + (n === r) + '">' + ic("heart") + "</button>"; }).join("");
    return '<div class="lg-top">' + ticket + '<div class="lg-facts"><h4 class="sub-h">Good to know</h4>' + facts + "</div></div>" +
      '<div class="lg-grid">' + logTable(p, "transport") + logTable(p, "stay") + logTable(p, "meals") + logTable(p, "activities") + "</div>" +
      '<p class="small muted" style="margin:14px 0 0">Your day-by-day plan is on the Itinerary tab and your spending is on the Budget tab.</p>' +
      '<section class="lg-sec"><div class="row wrap" style="align-items:center"><h4 class="sub-h grow" style="margin:18px 0 6px">Review</h4><span class="tc-hearts" role="group" aria-label="Trip rating">' + hearts + "</span></div>" +
      bindArea(p + ".log.review", "What you loved, what you'd do differently, tips for next time…", 'style="min-height:110px" maxlength="6000"') + "</section>";
  }

  function viewTravel() {
    var trips = Object.keys(state.travel.trips).map(function (id) { return state.travel.trips[id]; }).sort(function (a, b) { return (a.start || "9") < (b.start || "9") ? -1 : 1; });
    var cur = state.ui.trip && state.travel.trips[state.ui.trip] ? state.travel.trips[state.ui.trip] : trips[0];
    var bucketCard = card("Bucket list", '<p class="small muted" style="margin:0 0 10px">Tap a pin icon to place a place on your world map. Ticking one marks it as visited.</p>' + listEd("travel.bucket", { placeholder: "Somewhere you dream of…", empty: "Northern lights? Kyoto in spring?", meta: function (b) {
      var pinned = typeof b.x === "number" && typeof b.y === "number";
      return pinned ? '<button class="icon-btn sm pin-btn on" data-act="pin-sel" data-go="1" data-id="' + b.id + '" aria-label="Show on the map" title="Show on the map">' + ic("pin") + "</button>"
        : '<button class="icon-btn sm pin-btn" data-act="pin-place" data-id="' + b.id + '" aria-label="Place on the map" title="Place on the map">' + ic("pin") + "</button>";
    } }), { cls: "tint-butter", dot: "b" });
    var main = "";
    if (!cur) {
      main = card("", '<div class="empty" style="padding:40px 10px;text-align:center">Plan your first getaway — itinerary, packing, outfits and budget all in one place.</div>');
    } else {
      var p = "travel.trips." + cur.id;
      var nights = cur.start && cur.end ? daysBetween(parseD(cur.start), parseD(cur.end)) : null;
      var until = cur.start ? daysBetween(today(), parseD(cur.start)) : null;
      var tt = tabs("trip", [["itinerary", "Itinerary"], ["packing", "Packing"], ["outfits", "Outfits"], ["budget", "Budget"], ["album", "Album"], ["log", "Log"]]);
      var inner = "";
      var dayMeta = function (path) { return function (it) { return '<input type="date" data-item="' + path + "|" + it.id + '|day" value="' + esc(it.day || "") + '" style="max-width:150px;padding:5px 8px;font-size:12px" aria-label="Day">'; }; };
      if (tt.cur === "itinerary") inner = listEd(p + ".itinerary", { noCheck: false, meta: dayMeta(p + ".itinerary"), placeholder: "Add a plan, booking or reservation…", empty: "Flights, stays, tables booked, sights to see…" });
      else if (tt.cur === "packing") {
        var pk = listAt(p + ".packing"), got = pk.filter(function (x) { return x.done; }).length;
        inner = '<div class="row" style="margin-bottom:12px"><span class="grow">' + progress(pk.length ? (got / pk.length) * 100 : 0) + '</span><span class="badge">' + got + "/" + pk.length + ' packed</span><button class="btn sm" data-act="pack-essentials" data-id="' + cur.id + '">Add essentials</button></div>' + listEd(p + ".packing", { placeholder: "Add something to pack…" });
      } else if (tt.cur === "outfits") inner = outfitCards(p, cur, dayMeta(p + ".outfits"));
      else if (tt.cur === "album") inner = albumGrid(cur);
      else if (tt.cur === "log") inner = tripLogView(p, cur);
      else {
        var ex = listAt(p + ".expenses"), total = sum(ex, function (x) { return x.amount; }), budget = num(cur.budget);
        inner = '<div class="row" style="margin-bottom:12px"><span class="grow">' + progress(budget ? (total / budget) * 100 : 0) + '</span><span class="badge ' + (budget && total > budget ? "pink" : "") + '">' + money(total) + " of " + money(budget) + "</span></div>" +
          '<div class="exp-list">' + ex.map(function (x) { return '<div class="exp-row">' + itemSelect(p + ".expenses", x, "cat", ["Transport", "Stay", "Food", "Activities", "Shopping", "Other"], 'aria-label="Category"') + itemInput(p + ".expenses", x, "text", 'placeholder="What was it?" aria-label="What"') + itemInput(p + ".expenses", x, "amount", 'data-rerender aria-label="Amount"', "number") + '<button class="del" data-act="list-del" data-path="' + p + '.expenses" data-id="' + x.id + '" aria-label="Delete">' + ic("x") + "</button></div>"; }).join("") + "</div>" +
          '<div class="spacer"></div><button class="btn sm" data-act="trip-expense" data-id="' + cur.id + '">' + ic("plus") + " Add expense</button>";
      }
      main = card("", '<div class="row wrap" style="align-items:flex-end"><div class="grow" style="min-width:200px"><label class="lbl">Trip</label>' + bindInput(p + ".text", 'style="height:46px;font-family:var(--serif);font-size:1.15rem;font-weight:600"') + '</div><div class="grow" style="min-width:160px"><label class="lbl">Destination</label>' + bindInput(p + ".dest", 'placeholder="City, country" style="height:46px;font-size:15px"') + "</div></div>" +
        '<div class="row wrap" style="margin-top:12px"><div style="flex:1 1 150px"><label class="lbl">Depart</label><input type="date" data-bind="' + p + '.start" data-rerender value="' + esc(cur.start || "") + '"></div><div style="flex:1 1 150px"><label class="lbl">Return</label><input type="date" data-bind="' + p + '.end" data-rerender value="' + esc(cur.end || "") + '"></div><div style="max-width:140px"><label class="lbl">Budget</label>' + bindNum(p + ".budget", "data-rerender") + '</div><div class="grow"></div>' +
        (until != null && until >= 0 ? '<span class="badge pink">' + (until === 0 ? "Today!" : until + " days to go") + "</span>" : "") + (nights != null && nights > 0 ? '<span class="badge">' + nights + " nights</span>" : "") +
        '<button class="del" data-act="trip-del" data-id="' + cur.id + '" aria-label="Delete trip" title="Delete trip">' + ic("trash") + "</button></div>", { cls: "tint-pink" }) +
        '<div class="spacer"></div>' + tt.html + card("", inner);
    }
    return head("Life · Adventure", 'Travel <span class="em">&amp; vacations</span>') + worldMap() + tripCards(trips, cur) + '<div class="travel-grid"><div class="tg-main">' + main + '</div><div class="tg-bucket">' + bucketCard + "</div></div>";
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
    var pg = { id: id, paper: paper, section: (extra && extra.section) || state.nbSection, title: "", created: t, updated: t, text: "", ink: "", strokes: [], topic: "", cues: "", summary: "" };
    if (paper === "two" || paper === "three") pg.cols = [0, 1, 2].slice(0, paper === "two" ? 2 : 3).map(function () { return { id: uid(), h: "", t: "" }; });
    if (paper === "mindmap") pg.nodes = [{ id: uid(), text: "Central idea", x: 50, y: 50, parent: null }];
    if (paper === "vision") pg.tiles = [0, 1, 2, 3].map(function (i) { return { id: uid(), text: ["Feel", "Grow", "Explore", "Create"][i], color: COLORS[i], img: "" }; });
    Object.assign(pg, extra || {});
    state.notebook[id] = pg;
    state.nbCurrent = id; state.nbSection = pg.section;
    save();
    return pg;
  }
  function findDayPage(k) {
    var ids = Object.keys(state.notebook);
    for (var i = 0; i < ids.length; i++) if (state.notebook[ids[i]].date === k) return state.notebook[ids[i]];
    return null;
  }
  function paperLabel(id) { var p = PAPERS.filter(function (x) { return x[0] === id; })[0]; return p ? p[1] : id === "vision" ? "Vision board" : id === "mindmap" ? "Mind map" : id; }

  /* ---- the notebook: a bound book with section tabs, a contents page, and a Type / Markup sheet ---- */

  var NB_TONES = ["pink", "butter", "sage", "sky", "lilac"];
  var INKS = ["ink", "#c9788b", "#b8932e", "#5f9a6b", "#5b86ad", "#9b87c4", "#c0605a"];
  var DRAWABLE = ["blank", "lined", "grid", "dot", "cornell", "two", "three"];
  var TOOLS = {
    pen: { w: 2.6, alpha: 1, comp: "source-over" },
    marker: { w: 16, alpha: 0.32, comp: "multiply" },
    pencil: { w: 1.6, alpha: 0.72, comp: "source-over" }
  };
  var pen = { tool: "pen", color: INKS[0], size: 1, redo: [], pageId: "" };
  var inkRedraw = null;

  /* "ink" is the theme's own text colour, so handwriting stays readable in light and dark mode. */
  function inkColor(c) {
    if (c !== "ink") return c;
    return (getComputedStyle(document.documentElement).getPropertyValue("--ink") || "").trim() || "#3b3431";
  }

  function nbSec(id) { return state.nbSections.filter(function (s) { return s.id === id; })[0]; }
  function nbPagesIn(sec) {
    return Object.keys(state.notebook).map(function (id) { return state.notebook[id]; })
      .filter(function (p) { return p.section === sec && !isBoard(p); })
      .sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
  }
  /* Pages saved before sections existed: day-linked journal pages go to Journal, the rest to Notes. */
  function ensureNb() {
    if (!Array.isArray(state.nbSections) || !state.nbSections.length) state.nbSections = defaultNbSections();
    Object.keys(state.notebook).forEach(function (id) {
      var p = state.notebook[id];
      if (!p.section || !nbSec(p.section)) p.section = p.date ? "s-journal" : "s-notes";
      if (!nbSec(p.section)) p.section = state.nbSections[0].id;
    });
    if (!nbSec(state.nbSection)) state.nbSection = state.nbSections[0].id;
  }
  /* The page on show; the section tab always follows it. */
  function nbCurrent(id) {
    ensureNb();
    var page = (id && state.notebook[id]) || (state.nbCurrent && state.notebook[state.nbCurrent]) || null;
    if (isBoard(page)) page = null;
    if (page) state.nbSection = page.section;
    else page = nbPagesIn(state.nbSection)[0] || null;
    state.nbCurrent = page ? page.id : "";
    return page;
  }
  function journalSection() {
    ensureNb();
    return nbSec("s-journal") || state.nbSections.filter(function (s) { return s.name.toLowerCase() === "journal"; })[0] || state.nbSections[0];
  }

  /* A small "type a name" box for section names. */
  function askName(label, value, okText) {
    return new Promise(function (resolve) {
      var dlg = $("#ask"), input = $("#ask-input");
      if (!dlg || typeof dlg.showModal !== "function") {
        var v = window.prompt(label, value || "");
        resolve(v && v.trim() ? v.trim() : null);
        return;
      }
      $("#ask-label").textContent = label;
      $("#ask-ok").textContent = okText || "Save";
      input.value = value || "";
      dlg.onclose = function () {
        dlg.onclose = null;
        resolve(dlg.returnValue === "ok" && input.value.trim() ? input.value.trim() : null);
      };
      dlg.showModal(); input.focus(); input.select();
    });
  }

  function pageBody(p, id) {
    var base = "notebook." + id, inner = "";
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
    return { inner: inner, cls: cls };
  }

  function pageLabel(p) { return p.title || (p.date ? shortDay(parseD(p.date)) : "Untitled page"); }

  function viewNotebook(id) {
    var page = nbCurrent(id), sec = nbSec(state.nbSection);
    var canDraw = !!page && DRAWABLE.indexOf(page.paper) >= 0;
    var mode = canDraw && state.ui.nbMode === "markup" ? "markup" : "type";
    if (page && pen.pageId !== page.id) { pen.pageId = page.id; pen.redo = []; }

    var tabs = state.nbSections.map(function (s) {
      return '<button class="btab tone-' + esc(s.tone || "pink") + (s.id === state.nbSection ? " on" : "") + '" data-act="nb-section" data-id="' + s.id + '" role="tab" aria-selected="' + (s.id === state.nbSection) + '"><span>' + esc(s.name) + "</span></button>";
    }).join("") + '<button class="btab add" data-act="nb-add-section" aria-label="Add a section" title="Add a section"><span>+</span></button>';

    var list = nbPagesIn(sec.id).map(function (p) {
      var d = new Date(p.created || p.updated);
      return '<a class="pg-link' + (page && p.id === page.id ? " on" : "") + '" href="#/notebook/' + p.id + '" data-id="' + p.id + '"><span class="sw paper paper-' + p.paper + ' pg-thumb"></span><span class="pg-text"><b class="pg-title">' + esc(pageLabel(p)) + '</b><span class="pg-date">' + paperLabel(p.paper) + " · " + shortDay(d) + "</span></span></a>";
    }).join("");

    var papers = page ? '<div class="paper-picks">' + PAPERS.map(function (x) {
      return '<button class="paper-pick' + (page.paper === x[0] ? " on" : "") + '" data-act="nb-paper" data-val="' + x[0] + '" aria-pressed="' + (page.paper === x[0]) + '"><span class="sw paper paper-' + x[0] + '"></span><span>' + x[1] + "</span></button>";
    }).join("") + "</div>" : "";

    var left = '<aside class="book-index"><p class="tiny">' + esc(sec.name) + '</p><h2 class="index-title">Contents</h2>' +
      '<div class="pg-list">' + (list || '<p class="small muted">No pages yet.</p>') + "</div>" +
      '<button class="btn pink block" data-act="nb-new">' + ic("plus") + " New page</button>" +
      '<button class="btn block" style="margin-top:8px" data-act="journal-day" data-val="' + ymd(today()) + '">' + ic("book") + " Today’s journal page</button>" +
      (page ? '<div class="index-block"><p class="tiny">Paper</p>' + papers + "</div>" : "") +
      '<div class="index-block tools"><button class="linklike" data-act="nb-rename-section">Rename section</button>' +
      (state.nbSections.length > 1 ? '<button class="linklike danger" data-act="nb-del-section">Delete section</button>' : "") +
      (page ? '<button class="linklike danger" data-act="nb-del" data-id="' + page.id + '">Delete this page</button>' : "") + "</div></aside>";

    var sheetCol;
    if (page) {
      var b = pageBody(page, page.id), bar = "";
      if (canDraw) {
        bar = '<div class="nb-seg" role="tablist" aria-label="Type or Markup">' +
          '<button role="tab" aria-selected="' + (mode === "type") + '" class="' + (mode === "type" ? "on" : "") + '" data-act="nb-mode" data-val="type">' + ic("type") + "Type</button>" +
          '<button role="tab" aria-selected="' + (mode === "markup") + '" class="' + (mode === "markup" ? "on" : "") + '" data-act="nb-mode" data-val="markup">' + ic("pen") + "Markup</button></div>";
      } else if (page.paper === "mindmap") {
        bar = '<button class="btn sm pink" data-act="mm-add" data-id="' + page.id + '">' + ic("branch") + ' Add branch</button><button class="btn sm" data-act="mm-del" data-id="' + page.id + '">' + ic("trash") + ' Remove selected</button>';
      } else if (page.paper === "vision") {
        bar = '<button class="btn sm pink" data-act="vb-add" data-id="' + page.id + '">' + ic("plus") + " Add tile</button>";
      }
      sheetCol = '<div class="book-sheet-col"><div class="sheet-bar"><input class="sheet-title" type="text" data-bind="notebook.' + page.id + '.title" value="' + esc(page.title) + '" placeholder="' + esc(page.date ? prettyDay(parseD(page.date)) : "Page title") + '" aria-label="Page title" maxlength="80">' +
        bar + '<button class="icon-btn" data-act="nb-print" aria-label="Print this page" title="Print this page">' + ic("print") + "</button></div>" +
        '<div class="sheet-page ' + b.cls + (mode === "markup" ? " drawing" + (pen.tool === "eraser" ? " eraser" : "") : "") + '" data-page="' + page.id + '">' + b.inner +
        (canDraw ? (page.ink ? '<img class="legacy-ink" alt="" src="' + page.ink + '">' : "") + '<canvas class="ink-layer" aria-label="Drawing layer"></canvas>' : "") + "</div>" +
        '<p class="small muted sheet-foot">' + paperLabel(page.paper) + " · created " + shortDay(new Date(page.created)) + (page.date ? ' · <a href="' + hrefDay(parseD(page.date)) + '">linked to ' + shortDay(parseD(page.date)) + "</a>" : "") + "</p></div>";
    } else {
      sheetCol = '<div class="book-sheet-col empty-sheet"><div class="sheet-page paper paper-lined static"><div class="empty-inner"><h2>A fresh section</h2><p>There are no pages in <b>' + esc(sec.name) + '</b> yet.</p><button class="btn pink" data-act="nb-new">' + ic("plus") + " Start a page</button></div></div></div>";
    }

    return '<div class="nb-desk"><div class="book">' + left + '<div class="book-spine" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>' + sheetCol +
      '<nav class="book-tabs" role="tablist" aria-label="Notebook sections">' + tabs + "</nav></div></div>" + (mode === "markup" ? markupBar() : "");
  }

  /* ---- the floating Markup toolbar ---- */
  function toolSVG(kind, color) {
    var body = '<rect x="10" y="16" width="14" height="34" rx="3" fill="#fffdf9" stroke="rgba(59,52,49,.25)"/>';
    if (kind === "pen") return '<svg viewBox="0 0 34 50" aria-hidden="true">' + body + '<path d="M10 17 17 2l7 15z" fill="#f1ebe4" stroke="rgba(59,52,49,.25)"/><path d="M15.2 6 17 2l1.8 4z" fill="' + color + '"/><rect x="10" y="24" width="14" height="4" fill="' + color + '"/></svg>';
    if (kind === "marker") return '<svg viewBox="0 0 34 50" aria-hidden="true">' + body + '<path d="M10 17h14l-2-8h-10z" fill="#f1ebe4" stroke="rgba(59,52,49,.25)"/><rect x="13" y="3" width="8" height="6" rx="1.5" fill="' + color + '" opacity=".7"/><rect x="10" y="24" width="14" height="4" fill="' + color + '" opacity=".7"/></svg>';
    if (kind === "pencil") return '<svg viewBox="0 0 34 50" aria-hidden="true">' + body + '<path d="M10 17 17 3l7 14z" fill="#f2dcb6" stroke="rgba(59,52,49,.25)"/><path d="M15.5 6 17 3l1.5 3z" fill="' + color + '"/><rect x="10" y="24" width="14" height="4" fill="' + color + '" opacity=".6"/></svg>';
    return '<svg viewBox="0 0 34 50" aria-hidden="true"><rect x="9" y="12" width="16" height="38" rx="4" fill="#fffdf9" stroke="rgba(59,52,49,.25)"/><rect x="9" y="4" width="16" height="12" rx="4" fill="#f2c4ce" stroke="rgba(59,52,49,.25)"/></svg>';
  }
  function markupBar() {
    var p = state.notebook[state.nbCurrent], tip = inkColor(pen.color);
    var tools = ["pen", "marker", "pencil", "eraser"].map(function (t) {
      return '<button class="mk-tool' + (pen.tool === t ? " on" : "") + '" data-act="ink-tool" data-val="' + t + '" aria-label="' + t + '" aria-pressed="' + (pen.tool === t) + '" title="' + t.charAt(0).toUpperCase() + t.slice(1) + '">' + toolSVG(t, tip) + "</button>";
    }).join("");
    var colors = INKS.map(function (c) {
      return '<button class="mk-color' + (pen.color === c ? " on" : "") + '" style="background:' + (c === "ink" ? "var(--ink)" : c) + '" data-act="ink-color" data-val="' + c + '" aria-label="Ink colour" aria-pressed="' + (pen.color === c) + '"></button>';
    }).join("");
    return '<div class="markup-bar" id="markup-bar" role="toolbar" aria-label="Markup tools">' +
      '<button class="mk-btn" data-act="ink-undo" aria-label="Undo"' + (p && p.strokes && p.strokes.length ? "" : " disabled") + ">" + ic("undo") + "</button>" +
      '<button class="mk-btn" data-act="ink-redo" aria-label="Redo"' + (pen.redo.length ? "" : " disabled") + ">" + ic("redo") + '</button><span class="mk-sep"></span>' +
      tools + '<span class="mk-sep"></span><span class="mk-colors">' + colors + '</span><span class="mk-sep"></span>' +
      '<input class="mk-size" type="range" min="0.5" max="3" step="0.25" value="' + pen.size + '" data-act-input="ink-size" aria-label="Stroke width">' +
      '<button class="mk-btn" data-act="ink-clear" aria-label="Clear all drawing on this page" title="Clear all drawing">' + ic("trash") + "</button>" +
      '<button class="mk-btn done" data-act="nb-mode" data-val="type" aria-label="Done drawing" title="Done">' + ic("check") + "</button></div>";
  }
  function refreshBar() {
    var bar = $("#markup-bar");
    if (bar) bar.outerHTML = markupBar();
    var sheet = $(".sheet-page[data-page]");
    if (sheet) sheet.classList.toggle("eraser", pen.tool === "eraser");
  }

  /* ---- the ink engine: strokes are saved as points, so they stay sharp at any size ---- */
  function mountInk(id) {
    var sheet = $(".sheet-page[data-page]"), cv = sheet && sheet.querySelector("canvas.ink-layer"), p = state.notebook[id];
    inkRedraw = null;
    if (!sheet || !cv || !p) return;
    p.strokes = p.strokes || [];
    var ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1, W = 0, H = 0, live = null;

    function size() {
      W = sheet.clientWidth; H = sheet.clientHeight;
      if (!W || !H) return;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + "px"; cv.style.height = H + "px";
      redraw();
    }
    function drawStroke(s) {
      var t = TOOLS[s.tool] || TOOLS.pen, pts = s.p, col = inkColor(s.c);
      if (!pts.length) return;
      ctx.save();
      ctx.globalAlpha = t.alpha; ctx.globalCompositeOperation = t.comp;
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = s.tool === "marker" ? "square" : "round"; ctx.lineJoin = "round";
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
      p.strokes.forEach(drawStroke);
      if (live) drawStroke(live);
    }
    inkRedraw = redraw;
    size();
    if (window.ResizeObserver) new ResizeObserver(function () { if (sheet.clientWidth !== W || sheet.clientHeight !== H) size(); }).observe(sheet);

    if (state.ui.nbMode !== "markup") return;

    var penSeen = false, erasing = false, changed = false;
    function pt(e) {
      var r = cv.getBoundingClientRect();
      return [Math.round((e.clientX - r.left) / W * 10000) / 10000, Math.round((e.clientY - r.top) / W * 10000) / 10000, e.pressure && e.pointerType === "pen" ? Math.round(e.pressure * 100) / 100 : 0.5];
    }
    function eraseAt(q) {
      var rad = 12 / W, before = p.strokes.length;
      p.strokes = p.strokes.filter(function (s) {
        return !s.p.some(function (u) { var dx = u[0] - q[0], dy = u[1] - q[1]; return dx * dx + dy * dy < rad * rad; });
      });
      if (p.strokes.length !== before) { changed = true; redraw(); }
    }
    function finish() { if (changed) { p.updated = Date.now(); save(); changed = false; refreshBar(); } }
    cv.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "pen") penSeen = true;
      if (penSeen && e.pointerType === "touch") return; /* palm rejection once a stylus is in use */
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (pen.tool === "eraser") { erasing = true; eraseAt(pt(e)); return; }
      live = { tool: pen.tool, c: pen.color, s: pen.size, p: [pt(e)] };
      redraw();
    });
    cv.addEventListener("pointermove", function (e) {
      if (erasing) { eraseAt(pt(e)); return; }
      if (!live) return;
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (evs.length ? evs : [e]).forEach(function (ev) { live.p.push(pt(ev)); });
      redraw();
    });
    function end() {
      if (erasing) { erasing = false; finish(); return; }
      if (!live) return;
      p.strokes.push(live); live = null; pen.redo = []; changed = true;
      redraw(); finish();
    }
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }

  /* switching paper keeps everything already written, and adds what the new paper needs */
  function changePaper(p, paper) {
    var fresh = newPage(paper);
    delete state.notebook[fresh.id];
    ["cols", "nodes", "tiles"].forEach(function (k) { if (!p[k] && fresh[k]) p[k] = fresh[k]; });
    p.paper = paper;
    p.updated = Date.now();
    state.nbCurrent = p.id;
    save();
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
  /* List items are written as one-line boxes; turn them into boxes that wrap, so long names are never cut off. */
  function wrapTxt(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.list li input.txt[type="text"]'), function (i) {
      var t = document.createElement("textarea");
      t.rows = 1;
      Array.prototype.forEach.call(i.attributes, function (a) { if (a.name !== "type" && a.name !== "value") t.setAttribute(a.name, a.value); });
      t.value = i.value;
      i.parentNode.replaceChild(t, i);
    });
    Array.prototype.forEach.call(root.querySelectorAll(".list li textarea.txt"), autosize);
  }
  window.addEventListener("resize", function () { Array.prototype.forEach.call(view.querySelectorAll(".list li textarea.txt"), autosize); });
  /* Safari on iPhone draws an empty date box as blank space. Show the date (or "Select date") as text and lay the real
     date input invisibly over it, so it always looks like a box and tapping it opens the date picker. */
  function dateText(v) {
    var d = v ? parseD(v) : null;
    return d ? d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Select date";
  }
  function wrapDates(root) {
    Array.prototype.forEach.call(root.querySelectorAll('input[type="date"]'), function (i) {
      if (i.parentNode.classList.contains("datefield")) return;
      var w = document.createElement("span");
      w.className = "datefield" + (i.value ? "" : " unset");
      var st = i.getAttribute("style");
      if (st) { w.setAttribute("style", st); i.removeAttribute("style"); }
      w.innerHTML = '<span class="df-text">' + esc(dateText(i.value)) + "</span>";
      i.parentNode.replaceChild(w, i);
      w.appendChild(i);
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

  /* Recipe photos and section covers live in IndexedDB (not in the main save), so lots of photos never fill the planner's storage.
     The state only keeps an id; backups include the pictures. */
  var imgs = (function () {
    var db = null, urls = {};
    function req(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
    function store(mode) { return db.transaction("images", mode).objectStore("images"); }
    function toData(blob) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(blob); }); }
    return {
      init: function () {
        if (!window.indexedDB) return Promise.resolve();
        return new Promise(function (res) {
          var rq;
          try { rq = indexedDB.open("slow-ink-life-images", 1); } catch (e) { res(); return; }
          rq.onupgradeneeded = function () { rq.result.createObjectStore("images"); };
          rq.onsuccess = function () {
            db = rq.result;
            Promise.all([req(store("readonly").getAllKeys()), req(store("readonly").getAll())]).then(function (r) {
              r[0].forEach(function (k, i) { if (r[1][i] instanceof Blob) urls[k] = URL.createObjectURL(r[1][i]); });
            }).catch(function () { /* start without photos */ }).then(res);
          };
          rq.onerror = function () { res(); };
        });
      },
      url: function (id) { return (id && urls[id]) || ""; },
      put: function (id, blob) {
        urls[id] = URL.createObjectURL(blob);
        if (!db) return Promise.resolve(id);
        return req(store("readwrite").put(blob, id)).then(function () { return id; }, function () { return id; });
      },
      remove: function (id) {
        if (!id) return;
        if (urls[id]) URL.revokeObjectURL(urls[id]);
        delete urls[id];
        if (db) try { store("readwrite").delete(id); } catch (e) { /* ignore */ }
      },
      clear: function () {
        Object.keys(urls).forEach(function (k) { URL.revokeObjectURL(urls[k]); });
        urls = {};
        if (db) try { store("readwrite").clear(); } catch (e) { /* ignore */ }
      },
      exportAll: function () {
        var ids = Object.keys(urls), out = {};
        return Promise.all(ids.map(function (id) { return fetch(urls[id]).then(function (r) { return r.blob(); }).then(toData).then(function (d) { out[id] = d; }); })).then(function () { return out; });
      },
      importAll: function (map) {
        return Promise.all(Object.keys(map || {}).map(function (id) { return fetch(map[id]).then(function (r) { return r.blob(); }).then(function (b) { return imgs.put(id, b); }); }));
      }
    };
  })();
  function shrinkToBlob(file, max, cb) {
    if (!/^image\//.test(file.type)) { toast("That file isn't a picture."); return; }
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
      var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function (b) { cb(b || file); }, "image/jpeg", 0.82);
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast("That image couldn't be read."); };
    img.src = url;
  }
  function photoUsed(id) {
    if (state.finance && state.finance.wish && state.finance.wish.some(function (x) { return x.imgId === id; })) return true;
    if (state.progress && state.progress.shots.some(function (x) { return x.imgId === id; })) return true;
    if (state.recipes.some(function (r) { return r.imgId === id; }) || state.recipeSections.some(function (x) { return x.imgId === id; })) return true;
    return Object.keys(state.travel.trips).some(function (k) {
      var t = state.travel.trips[k];
      return (t.outfits || []).some(function (o) { return o.imgId === id; }) || (t.album || []).some(function (a) { return a.imgId === id; });
    });
  }
  /* Several pictures at once (outfit photos, trip album). The state keeps ids, the pictures live in IndexedDB. */
  function addPhotos(kind, tripId, files) {
    var trip = state.travel.trips[tripId];
    if (!trip || !files || !files.length) return;
    var list = Array.prototype.slice.call(files, 0, 40).filter(function (f) { return /^image\//.test(f.type); });
    if (!list.length) { toast("Those files aren't pictures."); return; }
    var made = list.map(function (f) {
      return new Promise(function (res) {
        shrinkToBlob(f, kind === "album" ? 1400 : 1000, function (blob) {
          var id = "img_" + uid();
          imgs.put(id, blob).then(function () { res(id); });
        });
      });
    });
    Promise.all(made).then(function (ids) {
      if (kind === "album") { if (!Array.isArray(trip.album)) trip.album = []; ids.forEach(function (i) { trip.album.push({ id: uid(), imgId: i, caption: "" }); }); }
      else { if (!Array.isArray(trip.outfits)) trip.outfits = []; ids.forEach(function (i) { trip.outfits.push({ id: uid(), text: "", done: false, day: "", imgId: i }); }); }
      save(); render();
      toast(ids.length + (ids.length === 1 ? " photo added" : " photos added"));
    });
  }
  function setPhoto(item, file) {
    shrinkToBlob(file, 1000, function (blob) {
      var old = item.imgId, id = "img_" + uid();
      imgs.put(id, blob).then(function () {
        item.imgId = id;
        if (old && !photoUsed(old)) imgs.remove(old);
        save(); render();
      });
    });
  }
  function dropPhoto(item) { var old = item.imgId; item.imgId = ""; if (old && !photoUsed(old)) imgs.remove(old); }

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

  /* ------------------------------------------------------------ views: settings */

  function lookControls() {
    var l = look();
    var themes = '<div class="lk-row">' + LOOK_THEMES.map(function (x) {
      return '<button class="lk-opt' + (x[0] === l.theme ? " on" : "") + '" data-act="look-theme" data-val="' + x[0] + '" aria-pressed="' + (x[0] === l.theme) + '"><span class="lk-sw" style="background:' + x[2] + '"></span><span>' + x[1] + "</span></button>";
    }).join("") + "</div>";
    var modes = '<div class="chips">' + LOOK_MODES.map(function (x) {
      return '<button class="chip ' + (x[0] === l.mode ? "on" : "") + '" data-act="look-mode" data-val="' + x[0] + '" aria-pressed="' + (x[0] === l.mode) + '">' + x[1] + "</button>";
    }).join("") + "</div>";
    var fonts = '<div class="lk-row lk-3">' + LOOK_FONTS.map(function (x) {
      return '<button class="lk-opt' + (x[0] === l.font ? " on" : "") + '" data-act="look-font" data-val="' + x[0] + '" aria-pressed="' + (x[0] === l.font) + '"><span class="lk-aa" style="font-family:' + x[3] + '">Aa</span><span>' + x[1] + '<small>' + x[2] + "</small></span></button>";
    }).join("") + "</div>";
    return '<label class="lbl">Colour</label>' + themes + '<div class="spacer"></div><label class="lbl">Appearance</label>' + modes +
      '<div class="spacer"></div><label class="lbl">Font</label>' + fonts +
      '<div class="spacer"></div><button class="btn ghost sm" data-act="look-reset">Reset to defaults</button>';
  }

  function viewSettings() {
    return head("System", 'Settings <span class="em">&amp; data</span>') +
      '<div class="grid"><div class="c6">' + card("Personalise", '<label class="lbl">Your name</label>' + bindInput("name", 'placeholder="For your greeting"') + '<div class="spacer"></div>' +
        '<div class="row" style="align-items:flex-end"><div class="grow"><label class="lbl">Currency symbol</label>' + bindInput("currency", 'maxlength="3"') + '</div><div class="grow"><label class="lbl">Water goal (glasses)</label>' + bindNum("waterGoal") + "</div></div>" +
        '<div class="spacer"></div>' + lookControls(), { cls: "tint-pink", dot: "p" }) + "</div>" +
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

    var mapSc = !routeChanged && view.querySelector(".wmap-scroll"), mapKeep = null;
    if (mapSc && mapSc.firstElementChild && mapSc.firstElementChild.offsetWidth) mapKeep = { x: (mapSc.scrollLeft + mapSc.clientWidth / 2) / mapSc.firstElementChild.offsetWidth, y: (mapSc.scrollTop + mapSc.clientHeight / 2) / mapSc.firstElementChild.offsetHeight };

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
        case "fitness": html = viewFitness(); break;
        case "mood": html = viewMood(); break;
        case "goals": html = viewGoals(); break;
        case "projects": html = viewProjects(); break;
        case "routines": html = viewRoutines(); break;
        case "braindump": html = viewDump(); break;
        case "vision":
        case "mindmap":
          html = viewBoards(r.name);
          mount = function () { var cb = curBoard(r.name); if (cb && r.name === "mindmap") mountMindmap(cb.id); };
          break;
        case "meals": html = viewMeals(); break;
        case "finance": html = viewFinance(); break;
        case "mind": html = viewMind(); break;
        case "travel": html = viewTravel(); break;
        case "home-care": html = viewHomeCare(); break;
        case "notebook":
          html = viewNotebook(r.a);
          mount = function () {
            var p = state.notebook[state.nbCurrent];
            if (!p) return;
            if (DRAWABLE.indexOf(p.paper) >= 0) mountInk(p.id);
            if (p.paper === "mindmap") mountMindmap(p.id);
          };
          break;
        case "settings": html = viewSettings(); break;
        default: r.name = "home"; focusDate = today(); html = viewHome();
      }
    } catch (err) {
      console.error(err);
      html = head("Oops", "Something went sideways") + '<p class="muted">' + esc(err.message) + '</p><a class="btn" href="#/home">Go home</a>';
    }

    applyLook();
    renderChrome(r);
    document.body.classList.toggle("nb-mode", r.name === "notebook");
    $("#nb-topbar").hidden = r.name !== "notebook";
    document.body.classList.toggle("markup-on", r.name === "notebook" && state.ui.nbMode === "markup" && !!state.nbCurrent && !!state.notebook[state.nbCurrent] && DRAWABLE.indexOf(state.notebook[state.nbCurrent].paper) >= 0);
    view.innerHTML = html;
    wrapTxt(view);
    wrapDates(view);
    if (window.SlowCalc) SlowCalc.mount(view, { currency: state.currency });
    if (mount) mount();
    closeSheet();
    var ms = view.querySelector(".wmap-scroll"), mi = ms && ms.firstElementChild;
    if (mi) {
      var cx = mapKeep ? mapKeep.x : 0.5, cy = mapKeep ? mapKeep.y : 0.45, pe = mapFocus && mapFocus !== "top" ? mi.querySelector('.wpin[data-id="' + mapFocus + '"]') : null;
      if (pe) { cx = parseFloat(pe.style.left) / 100; cy = parseFloat(pe.style.top) / 100; }
      ms.scrollLeft = cx * mi.offsetWidth - ms.clientWidth / 2; ms.scrollTop = cy * mi.offsetHeight - ms.clientHeight / 2;
      if (mapFocus) { var mc = view.querySelector(".wmap-card"); if (mc && mc.scrollIntoView) mc.scrollIntoView({ block: "start", behavior: "smooth" }); }
    }
    mapFocus = "";
    if (scrollToMain) { var tm = view.querySelector(".tg-main"); if (tm && tm.scrollIntoView) tm.scrollIntoView({ block: "start", behavior: "smooth" }); scrollToMain = false; }

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
    html += '<div class="row" style="margin-top:6px"><button class="btn" data-act="theme">' + ic(isDark() ? "sun" : "moon") + (isDark() ? " Light mode" : " Dark mode") + "</button></div>";
    $("#sheet").innerHTML = html;
    wrapDates($("#sheet"));
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
    if (el.dataset.actInput === "ink-size") { pen.size = num(el.value); return; }
    applyInput(el);
    if (el.tagName === "TEXTAREA" && el.classList.contains("txt")) autosize(el);
    if (el.type === "range" && el.dataset.item) {
      var b = el.parentNode.querySelector(".badge");
      if (b) b.textContent = el.value + "%";
    }
  });

  document.addEventListener("change", function (e) {
    var el = e.target;
    if (el.hasAttribute("data-import")) { importFile(el.files[0]); el.value = ""; return; }
    if (el.dataset.send) { dumpSend(el.dataset.send, el.value); return; }
    if (el.dataset.sched) { var sv = parseInt(el.value, 10); if (isFinite(sv)) { var pt = {}; pt[el.dataset.sched === "end" ? "end" : "start"] = sv; schedSet(pt); } return; }
    if (el.dataset.photo) {
      var pp = el.dataset.photo.split("|"), pit = listAt(pp[0]).filter(function (x) { return x.id === pp[1]; })[0];
      if (pit && el.files && el.files[0]) setPhoto(pit, el.files[0]);
      el.value = "";
      return;
    }
    if (el.dataset.bulk) {
      var bk = el.dataset.bulk.split("|");
      if (bk[0] === "progress") addProgress(el.files); else addPhotos(bk[0], bk[1], el.files);
      el.value = "";
      return;
    }
    if (el.dataset.upload) {
      var parts = el.dataset.upload.split("|"), f = el.files[0];
      if (!f) return;
      compressImage(f, function (url) {
        var it = listAt(parts[0]).filter(function (x) { return x.id === parts[1]; })[0];
        if (it) { it.img = url; save(); render(); }
      });
      return;
    }
    if (el.type === "date" && el.parentNode.classList.contains("datefield")) {
      el.parentNode.classList.toggle("unset", !el.value);
      el.parentNode.firstChild.textContent = dateText(el.value);
    }
    if (el.type === "checkbox" || el.tagName === "SELECT" || el.type === "range" || el.type === "date" || el.type === "number") applyInput(el);
    if (el.hasAttribute("data-rerender")) render();
  });

  document.addEventListener("keydown", function (e) {
    var el = e.target;
    if (e.key === "Escape") closeSheet();
    if (e.key !== "Enter" || e.isComposing) return;
    if (el.tagName === "TEXTAREA" && el.classList.contains("txt")) { e.preventDefault(); el.blur(); return; }
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
    lastEv = e;
    act(el.dataset.act, el);
  });
  $("#sheet-scrim").addEventListener("click", closeSheet);
  window.addEventListener("hashchange", render);

  /* ------------------------------------------------------------ actions */

  var lastEv = null;
  function act(name, el) {
    var d = el.dataset;
    switch (name) {
      case "list-add": addToList(d.path); return;
      case "list-del": {
        var arr = listAt(d.path), i = arr.findIndex(function (x) { return x.id === d.id; });
        if (i < 0) return;
        var removed = arr.splice(i, 1)[0];
        if (removed.imgId) setTimeout(function () { if (!photoUsed(removed.imgId)) imgs.remove(removed.imgId); }, 4500);   /* after the Undo window */
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
      case "theme": setLook("mode", isDark() ? "light" : "dark"); return;
      case "look-theme": setLook("theme", d.val); return;
      case "look-mode": setLook("mode", d.val); return;
      case "look-font": setLook("font", d.val); return;
      case "look-reset": state.look = { theme: "blush", mode: "light", font: "classic" }; save(); applyLook(); render(); return;
      case "load-sample":
        if (START_STEPS.some(function (x) { return x[2](); }) && !confirm("The sample planner replaces what is in this planner right now. Export a backup first if you want to keep it. Continue?")) return;
        loadSample(); return;
      case "start-fresh":
        if (!confirm("Clear the sample planner and start with an empty one?")) return;
        startFresh(); return;
      case "hide-start": state.ui.onboardHidden = true; save(); render(); return;
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
      case "map-tap": {
        var le = lastEv, mr = el.getBoundingClientRect();
        if (!le || !mr.width || !mr.height) return;
        var mx = r3(clamp((le.clientX - mr.left) / mr.width, 0, 1)), my = r3(clamp((le.clientY - mr.top) / mr.height, 0, 1));
        if (state.ui.pinPlace) {
          var pb = state.travel.bucket.filter(function (b) { return b.id === state.ui.pinPlace; })[0];
          state.ui.pinPlace = "";
          if (pb) { pb.x = mx; pb.y = my; state.ui.pinSel = pb.id; toast("Pinned " + (pb.text || "it")); }
          save(); render(); return;
        }
        var cp = le.target && le.target.closest ? le.target.closest("path[data-n]") : null;
        state.ui.pinDraft = { x: mx, y: my, name: cp ? cp.getAttribute("data-n") : "" };
        state.ui.pinSel = "";
        save(); render();
        var pl = view.querySelector("#pin-label"); if (pl) pl.focus({ preventScroll: true });
        return;
      }
      case "pin-add": {
        var pd = state.ui.pinDraft, pv = formVals(el), pn = (pv.label || "").trim().slice(0, 120);
        if (!pd) return;
        if (!pn) { toast("Give this place a name."); return; }
        var nb = { id: uid(), text: pn, done: false, x: pd.x, y: pd.y };
        state.travel.bucket.push(nb); state.ui.pinDraft = null; state.ui.pinSel = nb.id;
        save(); render(); toast("Pinned — and added to your bucket list"); return;
      }
      case "pin-cancel": state.ui.pinDraft = null; state.ui.pinPlace = ""; save(); render(); return;
      case "pin-close": state.ui.pinSel = ""; save(); render(); return;
      case "pin-sel":
        state.ui.pinSel = d.go || state.ui.pinSel !== d.id ? d.id : "";
        state.ui.pinDraft = null; state.ui.pinPlace = "";
        if (d.go) mapFocus = d.id;
        save(); render(); return;
      case "pin-place":
        state.ui.pinPlace = d.id; state.ui.pinDraft = null; state.ui.pinSel = "";
        mapFocus = "top"; save(); render(); toast("Now tap the map where it goes."); return;
      case "pin-unpin": {
        var up = state.travel.bucket.filter(function (b) { return b.id === d.id; })[0];
        if (up) { delete up.x; delete up.y; }
        state.ui.pinSel = ""; save(); render(); toast("Removed from the map (still on your list)"); return;
      }
      case "map-zoom": state.ui.mapZoom = clamp(state.ui.mapZoom + (parseInt(d.val, 10) || 0), 1, 4); save(); render(); return;
      case "pkg-add": {
        var pk = PKG[d.kind];
        if (!pk) return;
        var pr = { id: uid() };
        pk.cols.forEach(function (c) { pr[c[0]] = c[2] === "number" ? "" : ""; });
        pk.ticks.forEach(function (t) { pr[t[0]] = false; });
        if (d.kind === "orders") { pr.date = todayKey(); pr.link = ""; }
        state.finance.pkg[d.kind].push(pr); save(); render(); return;
      }
      case "sched-half": schedSet({ half: !schedCfg().half }); return;
      case "payoff-method": state.finance.payoff.method = d.val === "snowball" ? "snowball" : "avalanche"; save(); render(); return;
      case "wish-mode": state.ui.wishMode = ["shop", "wish", "bought"].indexOf(d.val) >= 0 ? d.val : "shop"; state.ui.wishCat = ""; save(); render(); return;
      case "wish-cat": state.ui.wishCat = wishCatNames().indexOf(d.val) >= 0 ? d.val : ""; save(); render(); return;
      case "wish-add": {
        var wv = formVals(el), wn = (wv.text || "").trim();
        if (!wn) { toast("Type what the item is first."); return; }
        var wl = state.ui.wishMode === "wish" ? "wish" : "shop";
        state.finance.wish.push({ id: uid(), list: wl, cat: wishCatNames().indexOf(wv.cat) >= 0 ? wv.cat : "Other", text: wn.slice(0, 120), price: wv.price === "" ? "" : Math.max(0, num(wv.price)), link: (wv.link || "").trim().slice(0, 500), imgId: "", imgUrl: "", note: "", want: 0, done: false });
        save(); render(); toast("Added to your " + (wl === "wish" ? "wishlist" : "shopping list")); return;
      }
      case "wish-want": {
        var wi = state.finance.wish.filter(function (x) { return x.id === d.id; })[0], wr = clamp(parseInt(d.val, 10) || 0, 0, 5);
        if (wi) { wi.want = wi.want === wr ? 0 : wr; save(); render(); }
        return;
      }
      case "wish-move": {
        var wm = state.finance.wish.filter(function (x) { return x.id === d.id; })[0];
        if (wm) { wm.list = wm.list === "wish" ? "shop" : "wish"; save(); render(); toast("Moved to your " + (wm.list === "wish" ? "wishlist" : "shopping list")); }
        return;
      }
      case "body-add": {
        var be = { id: uid(), date: todayKey(), note: "" };
        BODY_FIELDS.forEach(function (f) { be[f[0]] = ""; });
        state.body.log.push(be); save(); render(); return;
      }
      case "body-unit": {
        var bu = d.val === "in" ? "in" : "cm", bb = state.body;
        if (bb.unit === bu) return;
        var bf = bu === "in" ? 1 / 2.54 : 2.54, cv = function (v) { return hasV(v) ? Math.round(num(v) * bf * 10) / 10 : ""; };
        BODY_FIELDS.forEach(function (f) { bb.start[f[0]] = cv(bb.start[f[0]]); bb.goal[f[0]] = cv(bb.goal[f[0]]); bb.log.forEach(function (e) { e[f[0]] = cv(e[f[0]]); }); });
        bb.height = cv(bb.height); bb.unit = bu;
        save(); render(); toast("Measurements converted to " + (bu === "in" ? "inches" : "cm")); return;
      }
      case "prog-view": showLightbox(progList().map(function (x) { return { imgId: x.imgId, caption: progCaption(x) + (x.note ? " — " + x.note : "") }; }), parseInt(d.i, 10) || 0); return;
      case "prog-del": {
        var pj = state.progress.shots.findIndex(function (x) { return x.id === d.id; });
        if (pj < 0) return;
        if (!confirm("Remove this progress photo?")) return;
        var pg = state.progress.shots.splice(pj, 1)[0];
        if (pg.imgId && !photoUsed(pg.imgId)) imgs.remove(pg.imgId);
        save(); render(); return;
      }
      case "health-tick": {
        if (d.kind !== "supps" && d.kind !== "meds") return;
        var hl = state[d.kind].log, hd = hl[d.date] || (hl[d.date] = {});
        if (hd[d.key]) delete hd[d.key]; else hd[d.key] = true;
        if (!Object.keys(hd).length) delete hl[d.date];
        save(); render(); return;
      }
      case "health-wk": state.ui.hwOff = d.val === "0" ? 0 : Math.max(-520, Math.min(0, state.ui.hwOff + (parseInt(d.val, 10) || 0))); save(); render(); return;
      case "supps-add": case "meds-add": {
        var hk = d.act === "meds-add" ? "meds" : "supps", hv = formVals(el);
        if (!hv.name || !hv.name.trim()) { toast("Type a name first."); return; }
        var hi = { id: uid(), name: hv.name.trim().slice(0, 60), dose: (hv.dose || "").trim().slice(0, 60), notes: "", added: todayKey() };
        if (hk === "meds") { hi.times = ["am"]; hi.refill = ""; } else hi.time = SUPP_TIMES.indexOf(hv.time) >= 0 ? hv.time : "Morning";
        state[hk].items.push(hi); save(); render(); return;
      }
      case "supps-idea":
        state.supps.items.push({ id: uid(), name: String(d.val).slice(0, 60), dose: "", notes: "", added: todayKey(), time: "Morning" });
        save(); render(); toast(d.val + " added"); return;
      case "med-slot": {
        var mi = state.meds.items.filter(function (x) { return x.id === d.id; })[0];
        if (!mi) return;
        var mt = (mi.times || []).slice(), mx = mt.indexOf(d.val);
        if (mx >= 0) { if (mt.length === 1) { toast("Pick at least one time."); return; } mt.splice(mx, 1); } else mt.push(d.val);
        mi.times = mt; save(); render(); return;
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
      case "recipe-pick": state.ui.recipePick = !state.ui.recipePick; render(); return;
      case "recipe-add": {
        var secId = d.sec || (state.recipeSections[0] && state.recipeSections[0].id);
        if (!secId) return;
        var secObj = state.recipeSections.filter(function (x) { return x.id === secId; })[0];
        state.recipes.unshift({ id: uid(), text: "New recipe", cat: secObj ? secObj.name : "", sec: secId, imgId: "", time: "", serves: "", ingredients: "", method: "" });
        state.ui.recipeSec = secId; state.ui.recipePick = false; save(); render();
        setTimeout(function () { var t = document.querySelector(".recipes .recipe .txt"); if (t) { t.focus(); if (t.select) t.select(); } }, 60);
        return;
      }
      case "recipe-del": {
        var rd = state.recipes.filter(function (x) { return x.id === d.id; })[0];
        if (!rd || !window.confirm("Delete “" + (rd.text || "this recipe") + "”?")) return;
        state.recipes = state.recipes.filter(function (x) { return x.id !== rd.id; });
        dropPhoto(rd); save(); render(); return;
      }
      case "rsec-open": state.ui.recipeSec = d.id; state.ui.recipePick = false; save(); render(); window.scrollTo(0, 0); return;
      case "rsec-back": state.ui.recipeSec = ""; save(); render(); return;
      case "rsec-add": {
        var ns = { id: uid(), name: "New section", color: COLORS[state.recipeSections.length % COLORS.length], imgId: "" };
        state.recipeSections.push(ns); state.ui.recipePick = false; save(); render();
        setTimeout(function () { var t = document.querySelector('.rs-name[data-item$="|' + ns.id + '|name"]') || document.querySelector(".rs-grid .rs-tile:last-of-type .rs-name"); if (t) { t.focus(); if (t.select) t.select(); } }, 60);
        return;
      }
      case "rsec-del": {
        var sd = state.recipeSections.filter(function (x) { return x.id === d.id; })[0];
        if (!sd) return;
        if (state.recipeSections.length < 2) { toast("Keep at least one section."); return; }
        var inside = state.recipes.filter(function (x) { return x.sec === sd.id; });
        if (!window.confirm("Delete the section “" + (sd.name || "this section") + "”" + (inside.length ? " and its " + inside.length + (inside.length === 1 ? " recipe" : " recipes") : "") + "? This can’t be undone.")) return;
        inside.forEach(dropPhoto);
        state.recipes = state.recipes.filter(function (x) { return x.sec !== sd.id; });
        state.recipeSections = state.recipeSections.filter(function (x) { return x.id !== sd.id; });
        dropPhoto(sd); state.ui.recipeSec = ""; save(); render(); return;
      }
      case "photo-remove": {
        var po = listAt(d.path).filter(function (x) { return x.id === d.id; })[0];
        if (po) { dropPhoto(po); save(); render(); }
        return;
      }
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
      case "debt-add": state.finance.debts.push({ id: uid(), text: "Card / loan", start: 0, balance: 0, rate: "", min: "" }); save(); render(); return;
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
      case "trip-add": {
        var id = uid();
        state.travel.trips[id] = { id: id, text: "New trip", dest: "", start: "", end: "", budget: "", itinerary: [], packing: [], outfits: [], expenses: [] };
        state.ui.trip = id; if (d.go) scrollToMain = true; save(); render(); return;
      }
      case "trip-open": state.ui.trip = d.id; if (d.go) scrollToMain = true; save(); render(); return;
      case "log-add": {
        var lt = state.travel.trips[d.id], LT = LOG_TABLES[d.key];
        if (!lt || !LT) return;
        var lrow = { id: uid() }; LT.cols.forEach(function (c) { lrow[c[0]] = ""; });
        tripLog(lt)[d.key].push(lrow); save(); render(); return;
      }
      case "trip-rate": {
        var rt = state.travel.trips[d.id], rn = clamp(parseInt(d.val, 10) || 0, 0, 5);
        if (!rt) return;
        rt.rating = rt.rating === rn ? 0 : rn;
        save(); render(); return;
      }
      case "trip-del":
        if (!confirm("Delete this trip and all its lists?")) return;
        var dead = state.travel.trips[d.id], deadIds = dead ? (dead.outfits || []).concat(dead.album || []).map(function (x) { return x.imgId; }) : [];
        delete state.travel.trips[d.id]; state.ui.trip = null;
        deadIds.forEach(function (id) { if (id && !photoUsed(id)) imgs.remove(id); });
        save(); render(); return;
      case "outfit-add": {
        var otr = state.travel.trips[d.id];
        if (!otr) return;
        if (!Array.isArray(otr.outfits)) otr.outfits = [];
        otr.outfits.push({ id: uid(), text: "", done: false, day: "", imgId: "" });
        save(); render(); return;
      }
      case "album-view": openLightbox(d.trip, parseInt(d.i, 10) || 0); return;
      case "album-del": {
        var atr = state.travel.trips[d.trip], aj = atr && (atr.album || []).findIndex(function (x) { return x.id === d.id; });
        if (!atr || aj < 0) return;
        if (!confirm("Remove this photo from the album?")) return;
        var gone = atr.album.splice(aj, 1)[0];
        if (gone.imgId && !photoUsed(gone.imgId)) imgs.remove(gone.imgId);
        save(); render(); return;
      }
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
        var pg = findDayPage(d.val) || newPage("lined", { date: d.val, title: prettyDay(parseD(d.val)), section: journalSection().id });
        state.nbCurrent = pg.id; state.nbSection = pg.section; state.ui.nbMode = "type"; save();
        go("#/notebook/" + pg.id);
        setTimeout(function () { var t = $(".sheet-page textarea.write"); if (t) t.focus(); }, 40);
        return;
      }
      case "nb-new": {
        var cur = nbCurrent(), np = newPage(cur && DRAWABLE.indexOf(cur.paper) >= 0 ? cur.paper : "lined", { section: state.nbSection });
        state.ui.nbMode = "type"; save();
        go("#/notebook/" + np.id);
        setTimeout(function () { var t = $(".sheet-title"); if (t) { t.focus(); t.select(); } }, 40);
        return;
      }
      case "nb-paper": { var pp = state.notebook[state.nbCurrent]; if (pp) { changePaper(pp, d.val); render(); } return; }
      case "nb-del": {
        if (!confirm("Delete this page? This can't be undone.")) return;
        delete state.notebook[d.id]; state.nbCurrent = ""; save();
        var nxt = nbPagesIn(state.nbSection)[0];
        go(nxt ? "#/notebook/" + nxt.id : "#/notebook"); render(); return;
      }
      case "nb-mode": state.ui.nbMode = d.val; save(); render(); return;
      case "nb-print": window.print(); return;
      case "nb-section": {
        state.nbSection = d.id; state.nbCurrent = ""; save();
        var first = nbPagesIn(d.id)[0];
        go(first ? "#/notebook/" + first.id : "#/notebook"); return;
      }
      case "nb-add-section":
        askName("Name your new section", "", "Add section").then(function (name) {
          if (!name) return;
          var ns = { id: uid(), name: name, tone: NB_TONES[state.nbSections.length % NB_TONES.length] };
          state.nbSections.push(ns); state.nbSection = ns.id; state.nbCurrent = ""; save(); go("#/notebook"); render();
        });
        return;
      case "nb-rename-section": {
        var rs = nbSec(state.nbSection);
        askName("Rename this section", rs.name, "Rename").then(function (name) { if (name) { rs.name = name; save(); render(); } });
        return;
      }
      case "nb-del-section": {
        var ds = nbSec(state.nbSection), dn = nbPagesIn(ds.id).length;
        if (state.nbSections.length < 2) return;
        if (!confirm("Delete the section “" + ds.name + "”" + (dn ? " and its " + dn + (dn === 1 ? " page" : " pages") : "") + "? This can't be undone.")) return;
        nbPagesIn(ds.id).forEach(function (x) { delete state.notebook[x.id]; });
        state.nbSections = state.nbSections.filter(function (x) { return x.id !== ds.id; });
        state.nbSection = state.nbSections[0].id; state.nbCurrent = ""; save(); go("#/notebook"); render(); return;
      }
      case "ink-tool": pen.tool = d.val; refreshBar(); return;
      case "ink-color": pen.color = d.val; if (pen.tool === "eraser") pen.tool = "pen"; refreshBar(); return;
      case "ink-undo": {
        var up = state.notebook[state.nbCurrent];
        if (!up || !up.strokes || !up.strokes.length) return;
        pen.redo.push(up.strokes.pop()); up.updated = Date.now(); save();
        if (inkRedraw) inkRedraw(); refreshBar(); return;
      }
      case "ink-redo": {
        var rp = state.notebook[state.nbCurrent];
        if (!rp || !pen.redo.length) return;
        rp.strokes.push(pen.redo.pop()); rp.updated = Date.now(); save();
        if (inkRedraw) inkRedraw(); refreshBar(); return;
      }
      case "ink-clear": {
        var cp = state.notebook[state.nbCurrent];
        if (!cp || !((cp.strokes && cp.strokes.length) || cp.ink)) return;
        if (!confirm("Clear all drawing on this page? Your typed text stays.")) return;
        cp.strokes = []; cp.ink = ""; pen.redo = []; cp.updated = Date.now(); save();
        render(); return;
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
      case "goal-add": {
        var ng = newGoal(""); state.goals[ng.id] = ng; state.ui.goal = ng.id; state.ui.tabs.goal = "plan"; save(); go("#/goals"); render();
        setTimeout(function () { var t = view.querySelector('[data-bind$=".title"]'); if (t) t.focus(); }, 40);
        return;
      }
      case "proj-add": {
        var np2 = newProject(""); state.projects[np2.id] = np2; state.ui.project = np2.id; state.ui.tabs.project = "framework"; save(); go("#/projects"); render();
        setTimeout(function () { var t = view.querySelector('[data-bind$=".title"]'); if (t) t.focus(); }, 40);
        return;
      }
      case "proj-open": state.ui.project = d.id; save(); render(); return;
      case "proj-go": state.ui.project = d.id; save(); go("#/projects"); return;
      case "proj-del": {
        if (!state.projects[d.id] || !confirm("Delete this project, its phases and steps?")) return;
        delete state.projects[d.id]; state.ui.project = ""; save(); render(); return;
      }
      case "proj-template": {
        var pt = state.projects[d.id]; if (!pt) return;
        pt.phases = (pt.phases || []).concat(PROJECT_STARTER.map(function (n) { return { id: uid(), title: n, steps: [] }; }));
        state.ui.tabs.project = "phases"; save(); render(); return;
      }
      case "proj-phase-add": {
        var pa = state.projects[d.id], inp = view.querySelector("#phase-new");
        if (!pa) return;
        var nm = inp ? inp.value.trim() : "";
        if (!nm) { if (inp) inp.focus(); return; }
        pa.phases = pa.phases || []; pa.phases.push({ id: uid(), title: nm.slice(0, 80), steps: [] });
        save(); render(); var again = view.querySelector("#phase-new"); if (again) again.focus({ preventScroll: true }); return;
      }
      case "proj-phase-del": {
        var pd = state.projects[d.id], di = parseInt(d.i, 10);
        if (!pd || !pd.phases[di]) return;
        var gone = pd.phases.splice(di, 1)[0];
        save(); render();
        toastUndo("Phase removed", function () { pd.phases.splice(di, 0, gone); save(); render(); });
        return;
      }
      case "proj-phase-move": {
        var pm = state.projects[d.id], mi = parseInt(d.i, 10), mj = mi + parseInt(d.val, 10);
        if (!pm || !pm.phases[mi] || !pm.phases[mj]) return;
        var tmp = pm.phases[mi]; pm.phases[mi] = pm.phases[mj]; pm.phases[mj] = tmp;
        save(); render(); return;
      }
      case "todo-filter": state.ui.todoFilter = d.val; save(); render(); return;
      case "todo-add": {
        var tv = formVals(el);
        if (!tv.text || !tv.text.trim()) { var ti = view.querySelector('[data-form="todo"] [name="text"]'); if (ti) ti.focus(); return; }
        state.todos.push({ id: uid(), text: tv.text.trim().slice(0, 160), done: false, prio: num(tv.prio) || 0, due: /^\d{4}-\d{2}-\d{2}$/.test(tv.due) ? tv.due : "", est: Math.max(0, num(tv.est)) });
        save(); render(); var again2 = view.querySelector('[data-form="todo"] [name="text"]'); if (again2) again2.focus({ preventScroll: true }); return;
      }
      case "todo-clear": {
        var nd = state.todos.filter(function (x) { return x.done; }).length;
        if (!nd || !confirm("Remove " + nd + " done to-do" + (nd === 1 ? "" : "s") + "?")) return;
        state.todos = state.todos.filter(function (x) { return !x.done; }); save(); render(); return;
      }
      case "rt-add": {
        var tpl = RT_TEMPLATES[d.val], rid = uid();
        state.routines[rid] = { id: rid, title: tpl ? tpl.title : "", freq: tpl ? tpl.freq : "daily", steps: tpl ? tpl.steps.map(function (x) { return { id: uid(), text: x[0], mins: x[1], done: false }; }) : [], log: {}, created: Date.now() };
        state.ui.tabs.rt = "routines"; save(); render(); return;
      }
      case "rt-del": if (state.routines[d.id] && confirm("Delete this routine?")) { delete state.routines[d.id]; save(); render(); } return;
      case "rt-tick": {
        var rr = state.routines[d.id]; if (!rr) return;
        var rk = rtKey(rr.freq); rr.log = rr.log || {}; rr.log[rk] = rr.log[rk] || {};
        if (rr.log[rk][d.step]) delete rr.log[rk][d.step]; else rr.log[rk][d.step] = true;
        save(); render(); return;
      }
      case "block-day": {
        var cb = /^\d{4}-\d{2}-\d{2}$/.test(state.ui.blockDay || "") ? state.ui.blockDay : todayKey();
        state.ui.blockDay = num(d.val) === 0 ? todayKey() : ymd(addDays(parseD(cb), num(d.val))); save(); render(); return;
      }
      case "block-add": {
        var bv = formVals(el), bs = tmin(bv.start), be = tmin(bv.end);
        if (bs == null || be == null || be <= bs) { toast("Pick a start time before the end time."); return; }
        listAt("blocks." + d.day).push({ id: uid(), start: bv.start, end: bv.end, title: (bv.title || "").trim().slice(0, 80), cat: rtCat(bv.cat)[0], done: false });
        save(); render(); return;
      }
      case "block-from-todo": {
        var pv = formVals(el), td = state.todos.filter(function (x) { return x.id === pv.todo; })[0];
        if (!td) { toast("Pick a to-do first."); return; }
        var st0 = nextFree(d.day), dur0 = Math.max(15, num(td.est) || 30);
        listAt("blocks." + d.day).push({ id: uid(), start: tstr(st0), end: tstr(Math.min(st0 + dur0, 1439)), title: td.text.slice(0, 80), cat: "focus", done: false });
        save(); render(); return;
      }
      case "block-from-routine": {
        var pv2 = formVals(el), ro = state.routines[pv2.routine];
        if (!ro) { toast("Pick a routine first."); return; }
        var st1 = nextFree(d.day), dur1 = Math.max(15, rtMinutes(ro) || 30);
        listAt("blocks." + d.day).push({ id: uid(), start: tstr(st1), end: tstr(Math.min(st1 + dur1, 1439)), title: (ro.title || "Routine").slice(0, 80), cat: "essential", done: false });
        save(); render(); return;
      }
      case "block-copy": {
        var yk = ymd(addDays(parseD(d.day), -1)), src = blocksFor(yk);
        if (!src.length) { toast("Yesterday has no blocks to copy."); return; }
        var dest = listAt("blocks." + d.day);
        src.forEach(function (b) { dest.push({ id: uid(), start: b.start, end: b.end, title: b.title, cat: b.cat, done: false }); });
        save(); render(); return;
      }
      case "block-usual-save": {
        state.usualDay = blocksFor(d.day).map(function (b) { return { start: b.start, end: b.end, title: b.title, cat: b.cat }; });
        save(); render(); toast("Saved as your usual day"); return;
      }
      case "block-usual-load": {
        if (!state.usualDay.length) return;
        var dst = listAt("blocks." + d.day);
        state.usualDay.forEach(function (b) { dst.push({ id: uid(), start: b.start, end: b.end, title: b.title, cat: b.cat, done: false }); });
        save(); render(); return;
      }
      case "block-clear": if (blocksFor(d.day).length && confirm("Clear every block on this day?")) { delete state.blocks[d.day]; save(); render(); } return;
      case "rv-week": state.ui.reviewWeek = num(d.val) === 0 ? "" : ymd(addDays(state.ui.reviewWeek ? parseD(state.ui.reviewWeek) : mondayOf(today()), 7 * num(d.val))); save(); render(); return;
      case "focus-start": {
        unlockAudio();
        var inp = view.querySelector("#focus-label"), S = state.focus.settings, lab = inp ? inp.value.trim().slice(0, 80) : "";
        state.focus.label = lab;
        state.focus.run = { phase: "focus", total: S.focus * 60, endsAt: Date.now() + S.focus * 60000, paused: false, remaining: 0, label: lab };
        save(); wakeSync(); render(); return;
      }
      case "focus-pause": { var r1 = state.focus.run; if (!r1) return; r1.remaining = focusRemaining(r1); r1.paused = true; save(); wakeSync(); render(); return; }
      case "focus-resume": { var r2 = state.focus.run; if (!r2) return; unlockAudio(); r2.endsAt = Date.now() + r2.remaining * 1000; r2.paused = false; save(); wakeSync(); render(); return; }
      case "focus-skip": state.focus.run = null; save(); wakeSync(); render(); return;
      case "focus-reset": state.focus.run = null; state.focus.round = 0; save(); wakeSync(); render(); return;
      case "focus-block": state.focus.label = (d.title || "").slice(0, 80); state.ui.tabs.rt = "focus"; save(); render(); return;
      case "dump-tab": state.ui.dumpTab = d.val; save(); render(); return;
      case "dump-add": {
        var di = view.querySelector("#dump-input"), n = addDumpLines(di ? di.value : "");
        if (!n) { if (di) di.focus(); return; }
        save(); render(); toast(n === 1 ? "Added" : n + " items added"); return;
      }
      case "dump-quick": {
        var qv = formVals(el), qn = addDumpLines(qv.text);
        if (!qn) { var qi = view.querySelector('[data-form="dump-quick"] [name="text"]'); if (qi) qi.focus(); return; }
        save(); render(); toast("Added to your brain dump"); return;
      }
      case "dump-clear": {
        var nsd = state.dump.filter(function (x) { return x.sorted; }).length;
        if (!nsd || !confirm("Remove " + nsd + " sorted item" + (nsd === 1 ? "" : "s") + "?")) return;
        state.dump = state.dump.filter(function (x) { return !x.sorted; }); save(); render(); return;
      }
      case "goal-go": state.ui.goal = d.id; save(); go("#/goals"); return;
      case "goal-open": state.ui.goal = d.id; save(); render(); return;
      case "goal-del": {
        if (!state.goals[d.id] || !confirm("Delete this goal and its steps?")) return;
        delete state.goals[d.id]; state.ui.goal = ""; save(); render(); return;
      }
      case "goal-span": {
        var gs = state.goals[d.id]; if (!gs) return;
        if (!gs.start) gs.start = todayKey();
        gs.due = ymd(addMonthsKeep(parseD(gs.start), parseInt(d.val, 10)));
        save(); render(); return;
      }
      case "goal-check": {
        var gc = state.goals[d.id]; if (!gc) return;
        var note = view.querySelector("#goal-note");
        gc.checks = gc.checks || [];
        gc.checks.push({ id: uid(), date: todayKey(), pct: goalPct(gc), note: note ? note.value.trim().slice(0, 500) : "" });
        save(); render(); toast("Check-in saved"); return;
      }
      case "board-new": {
        if (!BOARD_KINDS[d.kind]) return;
        newBoard(d.kind); save(); render(); return;
      }
      case "board-open": state.ui["board_" + d.kind] = d.id; save(); render(); return;
      case "board-del": {
        var bd = state.notebook[d.id];
        if (!isBoard(bd)) return;
        if (!confirm("Delete this " + BOARD_KINDS[bd.paper].noun + "? This can't be undone.")) return;
        delete state.notebook[d.id];
        if (state.nbCurrent === d.id) state.nbCurrent = "";
        state.ui["board_" + bd.paper] = "";
        save(); render(); return;
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
      case "export": exportData(); return;
      case "reset":
        if (!confirm("Reset the whole planner? Export a backup first — this erases everything on this device.")) return;
        imgs.clear(); state = defaults(); ensureRecipes(); saveNow(); go("#/home"); toast("Planner reset"); return;
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
    state.ui.backedUp = true;
    saveNow();
    imgs.exportAll().then(function (pics) {
      var blob = new Blob([JSON.stringify(Object.assign({}, state, { images: pics }), null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "slow-ink-life-" + todayKey() + ".json";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    });
  }
  /* Recipe sections, recipes and photos from a backup file are checked before use: ids and colours end up in page markup. */
  var SAFE_ID = /^[A-Za-z0-9_-]{1,60}$/;
  function str(v, n) { return typeof v === "string" ? v.slice(0, n) : ""; }
  function cleanBackup(data) {
    var secs = Array.isArray(data.recipeSections) ? data.recipeSections : [];
    data.recipeSections = secs.filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 60).map(function (x) {
      return { id: String(x.id), name: str(x.name, 40), color: safeColor(x.color), imgId: SAFE_ID.test(String(x.imgId)) ? String(x.imgId) : "" };
    });
    data.recipes = (Array.isArray(data.recipes) ? data.recipes : []).filter(function (r) { return r && typeof r === "object" && SAFE_ID.test(String(r.id)); }).slice(0, 2000).map(function (r) {
      return { id: String(r.id), text: str(r.text, 120), cat: str(r.cat, 40), sec: SAFE_ID.test(String(r.sec)) ? String(r.sec) : "", imgId: SAFE_ID.test(String(r.imgId)) ? String(r.imgId) : "", time: str(r.time, 40), serves: str(r.serves, 20), ingredients: str(r.ingredients, 8000), method: str(r.method, 8000) };
    });
    Object.keys(data.notebook && typeof data.notebook === "object" ? data.notebook : {}).forEach(function (k) {
      var pg = data.notebook[k];
      if (pg && Array.isArray(pg.tiles)) pg.tiles.forEach(function (t) { if (t && typeof t === "object") t.color = safeColor(t.color); });
    });
    /* Goals: rebuilt from known fields only. */
    var DKEY = /^\d{4}-\d{2}-\d{2}$/, gin = data.goals && typeof data.goals === "object" && !Array.isArray(data.goals) ? data.goals : {}, gout = {};
    Object.keys(gin).slice(0, 300).forEach(function (k) {
      var g = gin[k];
      if (!SAFE_ID.test(k) || !g || typeof g !== "object") return;
      var sm = g.smart && typeof g.smart === "object" ? g.smart : {};
      gout[k] = {
        id: k, title: str(g.title, 120), area: str(g.area, 40) || "Personal", why: str(g.why, 6000), plan: str(g.plan, 12000),
        start: DKEY.test(String(g.start)) ? g.start : "", due: DKEY.test(String(g.due)) ? g.due : "",
        status: ["active", "hold", "done"].indexOf(g.status) >= 0 ? g.status : "active", manual: Math.max(0, Math.min(100, Number(g.manual) || 0)),
        steps: (Array.isArray(g.steps) ? g.steps : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 200).map(function (x) { return { id: String(x.id), text: str(x.text, 240), done: x.done === true, due: DKEY.test(String(x.due)) ? x.due : "" }; }),
        checks: (Array.isArray(g.checks) ? g.checks : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)) && DKEY.test(String(x.date)); }).slice(0, 500).map(function (x) { return { id: String(x.id), date: x.date, pct: Math.max(0, Math.min(100, Number(x.pct) || 0)), note: str(x.note, 500) }; }),
        worked: str(g.worked, 6000), blocked: str(g.blocked, 6000), change: str(g.change, 6000),
        smart: { s: str(sm.s, 2000), m: str(sm.m, 2000), a: str(sm.a, 2000), r: str(sm.r, 2000), t: str(sm.t, 2000) }, created: Number(g.created) || Date.now()
      };
    });
    data.goals = gout;
    var pin = data.projects && typeof data.projects === "object" && !Array.isArray(data.projects) ? data.projects : {}, pout = {};
    Object.keys(pin).slice(0, 300).forEach(function (k) {
      var q = pin[k];
      if (!SAFE_ID.test(k) || !q || typeof q !== "object") return;
      var o = { id: k, title: str(q.title, 120), area: str(q.area, 40) || "Personal", status: ["plan", "going", "hold", "done"].indexOf(q.status) >= 0 ? q.status : "plan",
        start: DKEY.test(String(q.start)) ? q.start : "", due: DKEY.test(String(q.due)) ? q.due : "", notes: str(q.notes, 12000),
        worked: str(q.worked, 6000), stuck: str(q.stuck, 6000), decide: str(q.decide, 6000), created: Number(q.created) || Date.now() };
      ["outcome", "why", "doneWhen", "people", "resources", "risks", "scopeOut"].forEach(function (f) { o[f] = str(q[f], 6000); });
      o.phases = (Array.isArray(q.phases) ? q.phases : []).filter(function (ph) { return ph && typeof ph === "object" && SAFE_ID.test(String(ph.id)); }).slice(0, 60).map(function (ph) {
        return { id: String(ph.id), title: str(ph.title, 80), steps: (Array.isArray(ph.steps) ? ph.steps : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 200).map(function (x) { return { id: String(x.id), text: str(x.text, 240), done: x.done === true, due: DKEY.test(String(x.due)) ? x.due : "" }; }) };
      });
      pout[k] = o;
    });
    data.projects = pout;
    data.dump = (Array.isArray(data.dump) ? data.dump : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 3000).map(function (x) {
      return { id: String(x.id), text: str(x.text, 300), at: Number(x.at) || Date.now(), sorted: ["todo", "project", "goal", "routine", "note"].indexOf(x.sorted) >= 0 ? x.sorted : "" };
    });
    /* Routines & to-dos: rebuilt from known fields only. */
    var TKEY = /^([01]\d|2[0-3]):[0-5]\d$/, CATS_OK = ["focus", "admin", "health", "leisure", "essential", "wasted"], cn = function (v, lo, hi) { return Math.max(lo, Math.min(hi, Number(v) || 0)); };
    data.todos = (Array.isArray(data.todos) ? data.todos : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 2000).map(function (x) {
      return { id: String(x.id), text: str(x.text, 160), done: x.done === true, prio: [0, 1, 2, 3].indexOf(Number(x.prio)) >= 0 ? Number(x.prio) : 0, due: DKEY.test(String(x.due)) ? x.due : "", est: cn(x.est, 0, 1440) };
    });
    var rin = data.routines && typeof data.routines === "object" && !Array.isArray(data.routines) ? data.routines : {}, rout = {};
    Object.keys(rin).slice(0, 100).forEach(function (k) {
      var r = rin[k];
      if (!SAFE_ID.test(k) || !r || typeof r !== "object") return;
      var steps = (Array.isArray(r.steps) ? r.steps : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 100).map(function (x) { return { id: String(x.id), text: str(x.text, 160), mins: cn(x.mins, 0, 600), done: false }; });
      var log = {}, lg = r.log && typeof r.log === "object" ? r.log : {};
      Object.keys(lg).slice(0, 800).forEach(function (pk) {
        if (!/^w?\d{4}-\d{2}-\d{2}$/.test(pk) || !lg[pk] || typeof lg[pk] !== "object") return;
        var o = {}; Object.keys(lg[pk]).slice(0, 100).forEach(function (sid) { if (SAFE_ID.test(sid) && lg[pk][sid] === true) o[sid] = true; }); log[pk] = o;
      });
      rout[k] = { id: k, title: str(r.title, 80), freq: r.freq === "weekly" ? "weekly" : "daily", steps: steps, log: log, created: Number(r.created) || Date.now() };
    });
    data.routines = rout;
    var cleanBlock = function (b, needId) {
      var o = { start: TKEY.test(String(b && b.start)) ? b.start : "09:00", end: TKEY.test(String(b && b.end)) ? b.end : "10:00", title: str(b && b.title, 80), cat: CATS_OK.indexOf(b && b.cat) >= 0 ? b.cat : "focus" };
      if (needId) { o.id = String(b.id); o.done = b.done === true; }
      return o;
    };
    var bin = data.blocks && typeof data.blocks === "object" && !Array.isArray(data.blocks) ? data.blocks : {}, bout = {};
    Object.keys(bin).slice(0, 800).forEach(function (k) {
      if (!DKEY.test(k) || !Array.isArray(bin[k])) return;
      bout[k] = bin[k].filter(function (b) { return b && typeof b === "object" && SAFE_ID.test(String(b.id)); }).slice(0, 80).map(function (b) { return cleanBlock(b, true); });
    });
    data.blocks = bout;
    data.usualDay = (Array.isArray(data.usualDay) ? data.usualDay : []).filter(function (b) { return b && typeof b === "object"; }).slice(0, 80).map(function (b) { return cleanBlock(b, false); });
    var fo = data.focus && typeof data.focus === "object" ? data.focus : {}, fs = fo.settings && typeof fo.settings === "object" ? fo.settings : {};
    data.focus = {
      settings: { focus: cn(fs.focus || 25, 1, 180), short: cn(fs.short || 5, 1, 60), long: cn(fs.long || 15, 1, 90), every: cn(fs.every || 4, 2, 10), awake: fs.awake !== false, sound: fs.sound !== false },
      sessions: (Array.isArray(fo.sessions) ? fo.sessions : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)) && DKEY.test(String(x.date)); }).slice(0, 5000).map(function (x) { return { id: String(x.id), date: x.date, mins: cn(x.mins, 1, 600), label: str(x.label, 80) }; }),
      run: null, round: cn(fo.round, 0, 10), label: str(fo.label, 80)
    };

    /* Weigh-ins and workouts: ids end up in page markup. */
    data.weights = (Array.isArray(data.weights) ? data.weights : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 5000).map(function (x) {
      return { id: String(x.id), date: DKEY.test(String(x.date)) ? x.date : "", value: Math.max(0, Math.min(2000, Number(x.value) || 0)) };
    });
    data.workouts = (Array.isArray(data.workouts) ? data.workouts : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 5000).map(function (x) {
      return { id: String(x.id), date: DKEY.test(String(x.date)) ? x.date : "", type: str(x.type, 30), minutes: cn(x.minutes, 0, 1440), notes: str(x.notes, 300) };
    });
    /* Body measurements, progress photos, vitamins and medication: rebuilt from known fields only. */
    var mv = function (v) { return v === "" || v == null || !isFinite(parseFloat(v)) ? "" : Math.max(0, Math.min(2000, Math.round(parseFloat(v) * 100) / 100)); };
    var bi = data.body && typeof data.body === "object" && !Array.isArray(data.body) ? data.body : {}, bkeys = ["neck", "chest", "arm", "waist", "hips", "thigh", "calf"];
    var bo = { unit: bi.unit === "in" ? "in" : "cm", height: mv(bi.height), start: {}, goal: {}, notes: str(bi.notes, 4000), log: [] };
    bkeys.concat(["weight"]).forEach(function (k) { bo.start[k] = mv(bi.start && bi.start[k]); bo.goal[k] = mv(bi.goal && bi.goal[k]); });
    bo.log = (Array.isArray(bi.log) ? bi.log : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 1000).map(function (x) {
      var e = { id: String(x.id), date: DKEY.test(String(x.date)) ? x.date : "", note: str(x.note, 300) };
      bkeys.forEach(function (k) { e[k] = mv(x[k]); });
      return e;
    });
    data.body = bo;
    var pi = data.progress && typeof data.progress === "object" && !Array.isArray(data.progress) ? data.progress : {};
    data.progress = { shots: (Array.isArray(pi.shots) ? pi.shots : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 500).map(function (x) {
      return { id: String(x.id), date: DKEY.test(String(x.date)) ? x.date : "", label: ["Before", "Progress", "After"].indexOf(x.label) >= 0 ? x.label : "Progress", weight: mv(x.weight), note: str(x.note, 200), imgId: SAFE_ID.test(String(x.imgId)) ? String(x.imgId) : "" };
    }) };
    ["supps", "meds"].forEach(function (k) {
      var hi = data[k] && typeof data[k] === "object" && !Array.isArray(data[k]) ? data[k] : {}, med = k === "meds", keys = {};
      var items = (Array.isArray(hi.items) ? hi.items : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 200).map(function (x) {
        var o = { id: String(x.id), name: str(x.name, 60), dose: str(x.dose, 60), notes: str(x.notes, 160), added: DKEY.test(String(x.added)) ? x.added : "" };
        if (med) {
          o.times = ["am", "pm"].filter(function (t) { return Array.isArray(x.times) && x.times.indexOf(t) >= 0; });
          if (!o.times.length) o.times = ["am"];
          o.refill = DKEY.test(String(x.refill)) ? x.refill : "";
          o.times.forEach(function (t) { keys[o.id + "-" + t] = true; });
        } else {
          o.time = ["Morning", "Midday", "Evening", "Bedtime", "With meals", "Any time"].indexOf(x.time) >= 0 ? x.time : "Morning";
          keys[o.id] = true;
        }
        return o;
      });
      var log = {}, lg = hi.log && typeof hi.log === "object" && !Array.isArray(hi.log) ? hi.log : {};
      Object.keys(lg).slice(0, 4000).forEach(function (dk) {
        if (!DKEY.test(dk) || !lg[dk] || typeof lg[dk] !== "object") return;
        var day = {}; Object.keys(lg[dk]).slice(0, 400).forEach(function (rk) { if (keys[rk] && lg[dk][rk] === true) day[rk] = true; });
        if (Object.keys(day).length) log[dk] = day;
      });
      data[k] = { items: items, log: log };
    });

    /* Bucket list and map pins. */
    var bk = data.travel && typeof data.travel === "object" && !Array.isArray(data.travel) ? data.travel : null;
    if (bk) bk.bucket = (Array.isArray(bk.bucket) ? bk.bucket : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 500).map(function (x) {
      var o = { id: String(x.id), text: str(x.text, 120), done: x.done === true };
      if (typeof x.x === "number" && typeof x.y === "number" && isFinite(x.x) && isFinite(x.y)) { o.x = Math.max(0, Math.min(1, x.x)); o.y = Math.max(0, Math.min(1, x.y)); }
      return o;
    });
    /* Shopping lists & wishlists. */
    var fin = data.finance && typeof data.finance === "object" && !Array.isArray(data.finance) ? data.finance : null;
    if (fin) {
      var WCATS = ["Clothing", "Accessories", "Makeup", "Skincare", "Hair", "Toiletries", "Home goods", "Cleaning supplies", "Tech", "Gifts", "Other"];
      fin.wish = (Array.isArray(fin.wish) ? fin.wish : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 2000).map(function (x) {
        var pr = parseFloat(x.price);
        return { id: String(x.id), list: x.list === "wish" ? "wish" : "shop", cat: WCATS.indexOf(x.cat) >= 0 ? x.cat : "Other", text: str(x.text, 120), price: isFinite(pr) ? Math.max(0, Math.min(1e9, pr)) : "", link: str(x.link, 500), imgUrl: str(x.imgUrl, 500), imgId: SAFE_ID.test(String(x.imgId)) ? String(x.imgId) : "", note: str(x.note, 300), want: cn(Math.round(Number(x.want)), 0, 5), done: x.done === true };
      });
      var wb = fin.wishBudget && typeof fin.wishBudget === "object" ? fin.wishBudget : {}, wbn = function (v) { var n = parseFloat(v); return isFinite(n) ? Math.max(0, Math.min(1e9, n)) : ""; };
      fin.wishBudget = { shop: wbn(wb.shop), wish: wbn(wb.wish) };
    }
    /* Debts and the payoff plan. */
    if (fin) {
      var dnum = function (v) { var x = parseFloat(v); return isFinite(x) && x >= 0 ? Math.min(1e9, x) : ""; };
      fin.debts = (Array.isArray(fin.debts) ? fin.debts : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 200).map(function (x) {
        return { id: String(x.id), text: str(x.text, 120), start: dnum(x.start) || 0, balance: dnum(x.balance) || 0, rate: dnum(x.rate), min: dnum(x.min) };
      });
      var pp = fin.payoff && typeof fin.payoff === "object" ? fin.payoff : {};
      fin.payoff = { method: pp.method === "snowball" ? "snowball" : "avalanche", extra: dnum(pp.extra) };
    }
    /* Package tracker. */
    if (fin) {
      var pk0 = fin.pkg && typeof fin.pkg === "object" && !Array.isArray(fin.pkg) ? fin.pkg : {}, pnum = function (v) { var x = parseFloat(v); return isFinite(x) && x >= 0 ? Math.min(1e9, x) : ""; };
      var PCOLS = { orders: ["text", "store", "amount", "date", "eta"], returns: ["text", "store", "amount", "date"], exchanges: ["text", "swap", "store", "amount"] }, PTICK = { orders: ["shipped", "delivered"], returns: ["shipped", "done"], exchanges: ["shipped", "done"] };
      fin.pkg = {};
      Object.keys(PCOLS).forEach(function (k) {
        fin.pkg[k] = (Array.isArray(pk0[k]) ? pk0[k] : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 1000).map(function (x) {
          var o = { id: String(x.id) };
          PCOLS[k].forEach(function (c) { o[c] = c === "amount" ? pnum(x[c]) : (c === "date" || c === "eta") ? (DKEY.test(String(x[c])) ? x[c] : "") : str(x[c], 120); });
          PTICK[k].forEach(function (t) { o[t] = x[t] === true; });
          if (k === "orders") o.link = str(x.link, 300);
          return o;
        });
      });
    }
    /* Trips: ids end up in page markup, so keep only safe ones; photo ids must look like ours. */
    var tr = data.travel && typeof data.travel === "object" ? data.travel : null;
    if (tr && tr.trips && typeof tr.trips === "object") {
      var cleanList = function (arr, keep) {
        return (Array.isArray(arr) ? arr : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 500).map(function (x) {
          var o = Object.assign({}, x); o.id = String(x.id);
          if ("imgId" in o || keep) o.imgId = SAFE_ID.test(String(x.imgId)) ? String(x.imgId) : "";
          return o;
        });
      };
      var safeTrips = {};
      Object.keys(tr.trips).slice(0, 200).forEach(function (k) {
        var t = tr.trips[k];
        if (!SAFE_ID.test(k) || !t || typeof t !== "object") return;
        t.id = k;
        t.rating = Math.max(0, Math.min(5, parseInt(t.rating, 10) || 0));
        t.itinerary = cleanList(t.itinerary); t.packing = cleanList(t.packing); t.expenses = cleanList(t.expenses);
        var lg = t.log && typeof t.log === "object" && !Array.isArray(t.log) ? t.log : {}, lt = lg.ticket && typeof lg.ticket === "object" ? lg.ticket : {}, lf = lg.facts && typeof lg.facts === "object" ? lg.facts : {};
        var newLog = { ticket: {}, facts: {}, review: str(lg.review, 6000) };
        ["name", "time", "flight", "from", "to", "seat", "gate", "boarding"].forEach(function (k) { newLog.ticket[k] = str(lt[k], 60); });
        newLog.ticket.date = DKEY.test(String(lt.date)) ? lt.date : "";
        ["country", "language", "timeDiff", "currency", "rate", "travelers"].forEach(function (k) { newLog.facts[k] = str(lf[k], 80); });
        var LCOLS = { transport: ["date", "from", "to"], stay: ["date", "text", "checkin", "checkout"], meals: ["date", "text"], activities: ["date", "text"] };
        Object.keys(LCOLS).forEach(function (k) {
          newLog[k] = (Array.isArray(lg[k]) ? lg[k] : []).filter(function (x) { return x && typeof x === "object" && SAFE_ID.test(String(x.id)); }).slice(0, 300).map(function (x) {
            var o = { id: String(x.id) };
            LCOLS[k].forEach(function (c) { o[c] = c === "date" ? (DKEY.test(String(x[c])) ? x[c] : "") : str(x[c], 120); });
            return o;
          });
        });
        t.log = newLog;
        t.outfits = cleanList(t.outfits, true); t.album = cleanList(t.album, true);
        t.album.forEach(function (a) { a.caption = str(a.caption, 120); });
        safeTrips[k] = t;
      });
      tr.trips = safeTrips;
    }
    var pics = {};
    if (data.images && typeof data.images === "object") Object.keys(data.images).slice(0, 2000).forEach(function (id) {
      var v = data.images[id];
      if (SAFE_ID.test(id) && typeof v === "string" && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(v)) pics[id] = v;
    });
    delete data.images;
    return pics;
  }
  function importFile(f) {
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var data = JSON.parse(rd.result);
        if (!data || typeof data !== "object" || !data.days) throw new Error("bad");
        delete data.sync;
        var pics = cleanBackup(data);
        imgs.clear();
        imgs.importAll(pics).then(function () {
          state = merge(defaults(), data);
          if (data.goalsFromSmart === undefined) state.goalsFromSmart = false;
          ensureRecipes();
          saveNow(); render(); toast("Planner imported ✨");
        });
      } catch (e) { toast("That file doesn't look like a Slow Ink Life backup."); }
    };
    rd.readAsText(f);
  }

  /* ------------------------------------------------------------ boot */

  if (!location.hash) history.replaceState(null, "", "#/home");
  imgs.init().then(function () { render(); });
})();
