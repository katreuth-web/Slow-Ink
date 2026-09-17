/* ===================================================================
   Slow Ink — 2027 Digital Planner
   Vanilla HTML5 / CSS / JS single-page app. No build step, no
   dependencies. All data lives in localStorage on this device.
   =================================================================== */

(function () {
  "use strict";

  var YEAR = 2027; // synced from state.currentYear once state loads; kept as a plain var so existing YEAR references stay untouched
  var STORAGE_KEY = "slow-ink-planner-v2";
  var LEGACY_STORAGE_KEY = "slow-ink-2027-planner-v1";

  var MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var DOW_ABBR = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  var MOODS = ["😊","😌","😐","😔","😤","😴"];
  var TINTS = ["card", "1", "2", "3"];
  var WEATHERS = [
    { id: "sunny", icon: "sunTheme", label: "Sunny" },
    { id: "cloudy", icon: "weatherCloudy", label: "Cloudy" },
    { id: "rainy", icon: "weatherRainy", label: "Rainy" },
    { id: "snowy", icon: "weatherSnowy", label: "Snowy" },
    { id: "stormy", icon: "weatherStormy", label: "Stormy" }
  ];
  var MEAL_FIELDS = [
    { id: "breakfast", label: "Breakfast" },
    { id: "lunch", label: "Lunch" },
    { id: "dinner", label: "Dinner" },
    { id: "snack", label: "Snack" }
  ];
  var LEVELS_5 = ["1", "2", "3", "4", "5"];
  var SCHEDULE_HOURS = [];
  for (var _h = 6; _h <= 22; _h++) SCHEDULE_HOURS.push(_h);

  function fmtHour(h) {
    var period = h >= 12 ? "PM" : "AM";
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return h12 + ":00 " + period;
  }

  var now = new Date();

  /* ------------------------------------------------------------- state */

  function defaultState() {
    return {
      currentYear: 2027,
      theme: "greek-marble",
      // year-scoped (reset per year, see multi-year architecture)
      monthlyFocusByYear: {},
      keyDatesByYear: {},
      monthPrioritiesByYear: {},
      monthTodosByYear: {},
      weeklyByYear: {},
      weekTodosByYear: {},
      habitsByYear: {},
      habitsReflectionByYear: {},
      financeByYear: {},
      mealsByYear: {},
      // date-keyed (already year-safe: keys are full YYYY-MM-DD)
      daily: {},
      // evergreen (continuous across years)
      goals: [],
      reading: [],
      notes: [],
      groceryList: [],
      recipes: [],
      travelBucketList: [],
      destinations: [],
      travelChecklist: [],
      budgetCategories: defaultBudgetCategories(),
      savingsGoals: [],
      bills: [],
      debts: [],
      workouts: [],
      measurements: [],
      cyclePeriodDays: {},
      cycleLengths: {},
      cycleNotes: "",
      doctorQuestions: [],
      notebookPages: [],
      ikigai: { answers: { love: "", good: "", world: "", paid: "" }, questions: ["", "", "", "", "", "", "", "", "", ""] },
      wheelOfLife: defaultWheelOfLife(),
      stoicChange: [],
      stoicAccept: [],
      stoicPremeditation: { goWrong: "", handle: "" },
      stoicReframingLog: [],
      stoicEveningReview: { p1: "", p2: "", p3: "", p4: "", p5: "" },
      lifeInventory: [],
      dailyReflection: {},
      weeklyReflectionByYear: {},
      monthlyReflectionByYear: {},
      yearlyReflectionByYear: {},
      eisenhowerMatrix: { q1: "", q2: "", q3: "", q4: "" },
      mindMaps: []
    };
  }

  var WHEEL_AREAS = ["Health", "Finance", "Career", "Relationships", "Self-Development", "Recreation", "Home", "Friends"];
  function defaultWheelOfLife() {
    return WHEEL_AREAS.map(function (name) { return { id: uid(), name: name, rating: 0 }; });
  }

  var GROCERY_CATEGORIES = [
    "Meat & Poultry", "Seafood", "Frozen Foods", "Dry Food", "Dairy",
    "Fruits & Vegetables", "Bakery", "Drinks", "Cans/Jars", "Household/Personal", "Pantry", "Other"
  ];

  var BUDGET_DEFAULTS = [
    { name: "Rent/Mortgage", type: "fixed" }, { name: "Utilities", type: "fixed" }, { name: "Internet/Phone", type: "fixed" },
    { name: "Subscriptions", type: "fixed" }, { name: "Insurance", type: "fixed" }, { name: "Other", type: "fixed" },
    { name: "Groceries", type: "variable" }, { name: "Eating Out", type: "variable" }, { name: "Transport", type: "variable" },
    { name: "Shopping", type: "variable" }, { name: "Entertainment", type: "variable" }, { name: "Health", type: "variable" }, { name: "Other", type: "variable" }
  ];

  function defaultBudgetCategories() {
    return BUDGET_DEFAULTS.map(function (b) { return { id: uid(), name: b.name, type: b.type, budget: 0, actual: 0 }; });
  }

  var SELF_CARE_HABITS = [
    "Water", "Meals", "Movement", "Sleep", "Vitamins", "Skincare", "Breaks",
    "Reading", "Gratitude", "Outside time", "Journaling", "Meditation", "Hobby", "Connection"
  ];

  function seedSelfCare(habitsArr) {
    SELF_CARE_HABITS.forEach(function (name) {
      habitsArr.push({ id: uid(), name: name, mode: "three-state", marks: {} });
    });
  }

  // One-time migration: the app shipped with a single flat 2027 state before
  // multi-year support existed. Fold that flat data into the 2027 year slot.
  function migrateToMultiYear(s, legacy) {
    if (!legacy) return s;
    var FIRST_YEAR = 2027;
    if (legacy.habits && legacy.habits.length && !s.habitsByYear[FIRST_YEAR]) s.habitsByYear[FIRST_YEAR] = legacy.habits;
    if (legacy.habitsReflection && !s.habitsReflectionByYear[FIRST_YEAR]) s.habitsReflectionByYear[FIRST_YEAR] = legacy.habitsReflection;
    if (legacy.finance && legacy.finance.length && !s.financeByYear[FIRST_YEAR]) s.financeByYear[FIRST_YEAR] = legacy.finance;
    if (legacy.monthlyFocus && !s.monthlyFocusByYear[FIRST_YEAR]) s.monthlyFocusByYear[FIRST_YEAR] = legacy.monthlyFocus;
    if (legacy.monthPriorities && !s.monthPrioritiesByYear[FIRST_YEAR]) s.monthPrioritiesByYear[FIRST_YEAR] = legacy.monthPriorities;
    if (legacy.monthTodos && !s.monthTodosByYear[FIRST_YEAR]) s.monthTodosByYear[FIRST_YEAR] = legacy.monthTodos;
    if (legacy.weekly && !s.weeklyByYear[FIRST_YEAR]) s.weeklyByYear[FIRST_YEAR] = legacy.weekly;
    if (legacy.weekTodos && !s.weekTodosByYear[FIRST_YEAR]) s.weekTodosByYear[FIRST_YEAR] = legacy.weekTodos;
    if (legacy.meals && !s.mealsByYear[FIRST_YEAR]) s.mealsByYear[FIRST_YEAR] = legacy.meals;
    return s;
  }

  var STALE_LEGACY_KEYS = [
    "habits", "habitsReflection", "finance", "monthlyFocus",
    "monthPriorities", "monthTodos", "weekly", "weekTodos", "meals", "seededSelfCare"
  ];

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
      var legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!legacyRaw) return defaultState();
      var legacy = JSON.parse(legacyRaw);
      var s = Object.assign(defaultState(), legacy);
      migrateToMultiYear(s, legacy);
      STALE_LEGACY_KEYS.forEach(function (k) { delete s[k]; });
      return s;
    } catch (e) {
      return defaultState();
    }
  }

  var state = loadState();
  YEAR = state.currentYear || 2027;

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getHabits() {
    if (!state.habitsByYear[YEAR]) {
      state.habitsByYear[YEAR] = [];
      seedSelfCare(state.habitsByYear[YEAR]);
    }
    return state.habitsByYear[YEAR];
  }

  function getHabitsReflection() {
    if (!state.habitsReflectionByYear[YEAR]) state.habitsReflectionByYear[YEAR] = { focus: "", proud: "" };
    return state.habitsReflectionByYear[YEAR];
  }

  function getFinance() {
    if (!state.financeByYear[YEAR]) state.financeByYear[YEAR] = [];
    return state.financeByYear[YEAR];
  }

  function getMonthlyFocusMap() {
    if (!state.monthlyFocusByYear[YEAR]) state.monthlyFocusByYear[YEAR] = {};
    return state.monthlyFocusByYear[YEAR];
  }

  function getKeyDatesMap() {
    if (!state.keyDatesByYear[YEAR]) state.keyDatesByYear[YEAR] = {};
    return state.keyDatesByYear[YEAR];
  }

  function getYearlyReflection() {
    if (!state.yearlyReflectionByYear[YEAR]) {
      state.yearlyReflectionByYear[YEAR] = {
        accomplishments: "", highlights: "", setbacks: "", thingsToLearn: "", thingsToChange: "",
        start: "", stop: "", continue: "", nextYearPriorities: ""
      };
    }
    return state.yearlyReflectionByYear[YEAR];
  }

  function getMonthlyReflection(m) {
    if (!state.monthlyReflectionByYear[YEAR]) state.monthlyReflectionByYear[YEAR] = {};
    if (!state.monthlyReflectionByYear[YEAR][m]) {
      state.monthlyReflectionByYear[YEAR][m] = {
        wins: "", feelings: "", challenges: "", improve: "", goalsAchieved: "", goalsInProgress: "", goalsNextMonth: "",
        habitsKept: "", habitsLetGo: "", habitsBuilding: "", thankful: ["", "", ""], lessons: "", oneWord: "", rating: 0
      };
    }
    return state.monthlyReflectionByYear[YEAR][m];
  }

  function getWeeklyReflection(idx) {
    if (!state.weeklyReflectionByYear[YEAR]) state.weeklyReflectionByYear[YEAR] = {};
    var key = "W" + idx;
    if (!state.weeklyReflectionByYear[YEAR][key]) {
      state.weeklyReflectionByYear[YEAR][key] = {
        howWasWeek: "", gratefulFor: "", thingsToCelebrate: "", areasToImprove: "", wentWell: "", didntWork: "",
        tasksWorkingOn: "", nextWeekFocus: "", notes: ""
      };
    }
    return state.weeklyReflectionByYear[YEAR][key];
  }

  function getDailyReflection(key) {
    if (!state.dailyReflection[key]) {
      state.dailyReflection[key] = {
        morningIntention: "", eveningHowDidItGo: "", eveningWentWell: "", eveningCouldImprove: "",
        eveningLearned: "", highlight: "", noteToSelf: ""
      };
    }
    return state.dailyReflection[key];
  }

  function getDay(key) {
    if (!state.daily[key]) {
      state.daily[key] = {
        top3: ["", "", ""], mood: "", gratitude: "", worked: "", notes: "",
        weather: "", water: 0, sleep: 0, meals: { breakfast: "", lunch: "", dinner: "", snack: "" }
      };
    }
    var d = state.daily[key];
    if (!d.meals) d.meals = { breakfast: "", lunch: "", dinner: "", snack: "" };
    if (d.water === undefined) d.water = 0;
    if (d.sleep === undefined) d.sleep = 0;
    if (d.weather === undefined) d.weather = "";
    if (d.wentWell === undefined) d.wentWell = d.worked || "";
    if (d.improveNextTime === undefined) d.improveNextTime = "";
    if (d.affirmation === undefined) d.affirmation = "";
    if (d.energy === undefined) d.energy = "";
    if (d.stress === undefined) d.stress = "";
    if (!d.schedule) d.schedule = {};
    return d;
  }

  function getWeek(idx) {
    if (!state.weeklyByYear[YEAR]) state.weeklyByYear[YEAR] = {};
    var key = "W" + idx;
    if (!state.weeklyByYear[YEAR][key]) {
      state.weeklyByYear[YEAR][key] = { top3: ["", "", ""], notes: "" };
    }
    return state.weeklyByYear[YEAR][key];
  }

  function getMonthPriorities(m) {
    if (!state.monthPrioritiesByYear[YEAR]) state.monthPrioritiesByYear[YEAR] = {};
    if (!state.monthPrioritiesByYear[YEAR][m]) state.monthPrioritiesByYear[YEAR][m] = [];
    return state.monthPrioritiesByYear[YEAR][m];
  }

  function getMonthTodos(m) {
    if (!state.monthTodosByYear[YEAR]) state.monthTodosByYear[YEAR] = {};
    if (!state.monthTodosByYear[YEAR][m]) state.monthTodosByYear[YEAR][m] = [];
    return state.monthTodosByYear[YEAR][m];
  }

  function getWeekTodos(idx) {
    if (!state.weekTodosByYear[YEAR]) state.weekTodosByYear[YEAR] = {};
    var key = "W" + idx;
    if (!state.weekTodosByYear[YEAR][key]) state.weekTodosByYear[YEAR][key] = [];
    return state.weekTodosByYear[YEAR][key];
  }

  function getMealsWeek(idx) {
    if (!state.mealsByYear[YEAR]) state.mealsByYear[YEAR] = {};
    var key = "W" + idx;
    if (!state.mealsByYear[YEAR][key]) state.mealsByYear[YEAR][key] = {};
    for (var i = 0; i < 7; i++) {
      if (!state.mealsByYear[YEAR][key][i]) state.mealsByYear[YEAR][key][i] = { breakfast: "", lunch: "", dinner: "", snack: "" };
    }
    return state.mealsByYear[YEAR][key];
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ------------------------------------------------------------- shared: flat checklist pattern */

  function checklistHtml(items, opts) {
    opts = opts || {};
    if (!items.length) return '<div class="empty-state">' + (opts.emptyLabel || "Nothing here yet.") + "</div>";
    var html = "";
    items.forEach(function (it) {
      html += (
        '<div class="goal-item' + (it.done ? " done" : "") + '" data-item="' + it.id + '">' +
          (opts.noCheck ? "" : '<button class="goal-check' + (it.done ? " done" : "") + '" data-check>' + (it.done ? "✓" : "") + "</button>") +
          '<span class="goal-title">' + escapeHtml(it.text) + "</span>" +
          '<button class="habit-del" data-del title="Delete">✕</button>' +
        "</div>"
      );
    });
    return html;
  }

  function bindChecklist(containerEl, items) {
    if (!containerEl) return;
    containerEl.querySelectorAll("[data-item]").forEach(function (row) {
      var id = row.dataset.item;
      var check = row.querySelector("[data-check]");
      var del = row.querySelector("[data-del]");
      if (check) check.addEventListener("click", function () {
        var it = items.find(function (x) { return x.id === id; });
        if (it) { it.done = !it.done; saveState(); render(); }
      });
      if (del) del.addEventListener("click", function () {
        var idx = items.findIndex(function (x) { return x.id === id; });
        if (idx > -1) { items.splice(idx, 1); saveState(); render(); }
      });
    });
  }

  function bindChecklistAdd(addBtnId, inputId, items) {
    var addBtn = document.getElementById(addBtnId);
    var input = document.getElementById(inputId);
    function add() {
      var val = input.value.trim();
      if (!val) return;
      items.push({ id: uid(), text: val, done: false });
      input.value = "";
      saveState();
      render();
    }
    if (addBtn) addBtn.addEventListener("click", add);
    if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") add(); });
  }

  /* ------------------------------------------------------------- shared: star rating widget */

  function starsHtml(value, attr, ownerId) {
    value = parseInt(value, 10) || 0;
    var html = '<div class="star-row" data-owner="' + ownerId + '">';
    for (var i = 1; i <= 5; i++) {
      html += '<button class="star-btn" data-' + attr + '="' + i + '" title="' + i + " star" + (i > 1 ? "s" : "") + '">' + icon(i <= value ? "starFilled" : "starOutline") + "</button>";
    }
    return html + "</div>";
  }

  function bindStars(containerEl, attr, onSet) {
    if (!containerEl) return;
    containerEl.querySelectorAll("[data-" + attr + "]").forEach(function (el) {
      el.addEventListener("click", function () {
        onSet(parseInt(el.dataset[attr], 10));
      });
    });
  }

  /* ------------------------------------------------------------- shared: budgeted-vs-actual row */

  function budgetActualFields(item) {
    var diff = (parseFloat(item.budget) || 0) - (parseFloat(item.actual) || 0);
    var diffClass = diff >= 0 ? "positive" : "negative";
    var diffLabel = (diff >= 0 ? "+$" : "-$") + Math.abs(diff).toFixed(2);
    return (
      '<input type="number" min="0" step="0.01" data-field="budget" placeholder="Budget" value="' + (item.budget || 0) + '" />' +
      '<input type="number" min="0" step="0.01" data-field="actual" placeholder="Actual" value="' + (item.actual || 0) + '" />' +
      '<span class="budget-diff ' + diffClass + '">' + diffLabel + "</span>"
    );
  }

  function bindBudgetActualFields(containerEl, items) {
    if (!containerEl) return;
    containerEl.querySelectorAll("[data-item]").forEach(function (row) {
      var id = row.dataset.item;
      row.querySelectorAll('[data-field="budget"], [data-field="actual"]').forEach(function (el) {
        el.addEventListener("input", function () {
          var it = items.find(function (x) { return x.id === id; });
          if (!it) return;
          it[el.dataset.field] = parseFloat(el.value) || 0;
          saveState();
          var diffEl = row.querySelector(".budget-diff");
          if (diffEl) {
            var diff = (it.budget || 0) - (it.actual || 0);
            diffEl.className = "budget-diff " + (diff >= 0 ? "positive" : "negative");
            diffEl.textContent = (diff >= 0 ? "+$" : "-$") + Math.abs(diff).toFixed(2);
          }
        });
      });
    });
  }

  /* ------------------------------------------------------------- shared: donut chart */

  var DONUT_COLORS = ["var(--swatch-1)", "var(--swatch-2)", "var(--swatch-3)", "var(--accent)", "var(--ink-mute)", "var(--rule)"];

  function donutChartHtml(segments) {
    var total = segments.reduce(function (s, x) { return s + x.value; }, 0);
    if (!total) return '<div class="empty-state">No spending yet.</div>';
    var r = 15.9155, circumference = 2 * Math.PI * r;
    var offsetPct = 0;
    var arcs = "";
    var legend = "";
    segments.forEach(function (s, i) {
      if (!s.value) return;
      var pct = (s.value / total) * 100;
      var dash = (pct / 100) * circumference;
      var color = DONUT_COLORS[i % DONUT_COLORS.length];
      arcs += (
        '<circle cx="21" cy="21" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="6" ' +
        'stroke-dasharray="' + dash + " " + (circumference - dash) + '" ' +
        'stroke-dashoffset="' + (-(offsetPct / 100) * circumference) + '" transform="rotate(-90 21 21)"/>'
      );
      legend += (
        '<div class="donut-legend-row"><span class="donut-dot" style="background:' + color + '"></span>' +
        escapeHtml(s.label) + ' <span class="donut-amt">$' + s.value.toFixed(2) + "</span></div>"
      );
      offsetPct += pct;
    });
    return (
      '<div class="donut-wrap">' +
        '<svg viewBox="0 0 42 42" class="donut-svg">' + arcs + "</svg>" +
        '<div class="donut-legend">' + legend + "</div>" +
      "</div>"
    );
  }

  /* ------------------------------------------------------------- shared: rich list editor pattern */

  function listEditorHtml(items, fields) {
    if (!items.length) return '<div class="empty-state">Nothing here yet.</div>';
    var html = "";
    items.forEach(function (it) {
      html += '<div class="list-editor-row" data-item="' + it.id + '">';
      fields.forEach(function (f) {
        if (f.type === "textarea") {
          html += '<textarea rows="' + (f.rows || 2) + '" data-field="' + f.key + '" placeholder="' + f.placeholder + '">' + escapeHtml(it[f.key] || "") + "</textarea>";
        } else if (f.type === "checkbox") {
          html += '<label class="check-field"><input type="checkbox" data-field="' + f.key + '" ' + (it[f.key] ? "checked" : "") + ' /> ' + (f.placeholder || "") + "</label>";
        } else {
          html += '<input type="' + (f.type || "text") + '" data-field="' + f.key + '" placeholder="' + f.placeholder + '" value="' + escapeHtml(it[f.key] || "") + '" />';
        }
      });
      html += '<button class="habit-del" data-del title="Delete">✕</button></div>';
    });
    return html;
  }

  function bindListEditor(containerEl, items) {
    if (!containerEl) return;
    containerEl.querySelectorAll("[data-item]").forEach(function (row) {
      var id = row.dataset.item;
      row.querySelectorAll("[data-field]").forEach(function (el) {
        var evt = el.type === "checkbox" ? "change" : "input";
        el.addEventListener(evt, function () {
          var it = items.find(function (x) { return x.id === id; });
          if (!it) return;
          it[el.dataset.field] = el.type === "checkbox" ? el.checked : el.value;
          saveState();
          if (el.type === "checkbox") render();
        });
      });
      var del = row.querySelector("[data-del]");
      if (del) del.addEventListener("click", function () {
        var idx = items.findIndex(function (x) { return x.id === id; });
        if (idx > -1) { items.splice(idx, 1); saveState(); render(); }
      });
    });
  }

  function bindListEditorAdd(addBtnId, items, defaults) {
    var btn = document.getElementById(addBtnId);
    if (btn) btn.addEventListener("click", function () {
      items.push(Object.assign({ id: uid() }, defaults));
      saveState();
      render();
    });
  }

  /* ------------------------------------------------------------- shared: sub-navigation within a section */

  function subtabsHtml(tabs) {
    var html = "";
    tabs.forEach(function (t) {
      html += '<button class="subtab-pill' + (t.active ? " active" : "") + '" data-goto="' + t.href + '">' + t.label + "</button>";
    });
    return '<div class="subtabs">' + html + "</div>";
  }

  function bindSubtabs() {
    document.querySelectorAll(".subtabs [data-goto]").forEach(function (el) {
      el.addEventListener("click", function () { go(el.dataset.goto); });
    });
  }

  /* ------------------------------------------------------------- shared: simple fields form (label + textarea) */

  function fieldsFormHtml(obj, fields) {
    var html = "";
    fields.forEach(function (f) {
      html += (
        '<span class="field-label" style="margin-top:12px;">' + f.label + "</span>" +
        '<textarea rows="' + (f.rows || 2) + '" data-field="' + f.key + '">' + escapeHtml(obj[f.key] || "") + "</textarea>"
      );
    });
    return html;
  }

  function bindFieldsForm(containerEl, obj) {
    if (!containerEl) return;
    containerEl.querySelectorAll("[data-field]").forEach(function (el) {
      el.addEventListener("input", function () { obj[el.dataset.field] = el.value; saveState(); });
    });
  }

  /* ------------------------------------------------------------- shared: expandable card toggle */

  var expandedCards = {};

  function expandClass(expandId) {
    return expandedCards[expandId] ? " open" : "";
  }

  function bindExpandToggles() {
    document.querySelectorAll("[data-expand-toggle]").forEach(function (el) {
      el.addEventListener("click", function () {
        var id = el.dataset.expandToggle;
        expandedCards[id] = !expandedCards[id];
        var body = document.getElementById(id);
        if (body) body.classList.toggle("open", expandedCards[id]);
        el.classList.toggle("open", expandedCards[id]);
      });
    });
  }

  /* ------------------------------------------------------------- date helpers */

  function pad(n) { return String(n).padStart(2, "0"); }
  function dateKey(y, m, d) { return y + "-" + pad(m + 1) + "-" + pad(d); }
  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function firstWeekdayMon(y, m) { return (new Date(y, m, 1).getDay() + 6) % 7; }
  function isToday(y, m, d) { return now.getFullYear() === y && now.getMonth() === m && now.getDate() === d; }
  function clampMonth(m) { m = parseInt(m, 10); if (isNaN(m)) m = 0; return Math.min(11, Math.max(0, m)); }

  var WEEKS = buildWeeks(YEAR);

  function buildWeeks(year) {
    var jan1 = new Date(year, 0, 1);
    var dow0 = (jan1.getDay() + 6) % 7;
    var cur = new Date(year, 0, 1 - dow0);
    var dec31 = new Date(year, 11, 31);
    var weeks = [];
    var idx = 1;
    while (cur <= dec31) {
      var days = [];
      for (var i = 0; i < 7; i++) {
        days.push({ y: cur.getFullYear(), m: cur.getMonth(), d: cur.getDate() });
        cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
      }
      weeks.push({ index: idx, days: days });
      idx++;
    }
    return weeks;
  }

  function clampWeek(w) {
    w = parseInt(w, 10);
    if (isNaN(w)) w = weekIndexForToday();
    return Math.min(WEEKS.length, Math.max(1, w));
  }

  function weekIndexForToday() {
    if (now.getFullYear() !== YEAR) return 1;
    for (var i = 0; i < WEEKS.length; i++) {
      var wk = WEEKS[i];
      for (var j = 0; j < 7; j++) {
        if (wk.days[j].y === now.getFullYear() && wk.days[j].m === now.getMonth() && wk.days[j].d === now.getDate()) {
          return wk.index;
        }
      }
    }
    return 1;
  }

  function clampDayKey(key) {
    if (key && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
      var y = parseInt(key.slice(0, 4), 10);
      if (y === YEAR) return key;
    }
    if (now.getFullYear() === YEAR) return dateKey(YEAR, now.getMonth(), now.getDate());
    return dateKey(YEAR, 0, 1);
  }

  function fmtLongDate(y, m, d) {
    var dow = (new Date(y, m, d).getDay() + 6) % 7;
    return DOW_ABBR[dow] + ", " + MONTH_NAMES[m] + " " + d;
  }

  /* ------------------------------------------------------------- icons */

  var ICONS = {
    cover: '<rect x="4" y="4" width="16" height="16" rx="5"/><path d="M12 8c1.8 1.7 2.8 3.4 2.8 5.1 0 1.9-1.2 3.4-2.8 4.3-1.6-.9-2.8-2.4-2.8-4.3 0-1.7 1-3.4 2.8-5.1z"/><path d="M12 11.2v3.6"/>',
    year: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/>',
    month: '<rect x="3.5" y="4.5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M8 3v3M16 3v3"/>',
    week: '<path d="M4 4v16M9.5 4v16M15 4v16M20 4v16"/>',
    day: '<circle cx="12" cy="12" r="4.6"/><path d="M12 2.6v2.4M12 19v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.6 12H5M19 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"/>',
    habits: '<path d="M4.5 12.5l4.5 4.5 10.5-11"/>',
    goals: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r=".9" fill="currentColor"/>',
    reading: '<path d="M3.5 5.5c2.6-1.4 5.7-1.4 8.5 0v13c-2.8-1.4-5.9-1.4-8.5 0v-13z"/><path d="M20.5 5.5c-2.6-1.4-5.7-1.4-8.5 0v13c2.8-1.4 5.9-1.4 8.5 0v-13z"/>',
    finance: '<circle cx="12" cy="12" r="8.2"/><path d="M12 7.2v9.6M14.6 9.2c0-1.1-1.2-2-2.6-2s-2.6.9-2.6 2 1.2 1.6 2.6 1.9c1.4.3 2.6.9 2.6 2s-1.2 2-2.6 2-2.6-.9-2.6-2"/>',
    notes: '<path d="M5 4h14v13l-4 4H5V4z"/><path d="M19 17h-4v4"/>',
    home: '<path d="M4 11.5L12 4l8 7.5"/><path d="M6 10v9h5v-5h2v5h5v-9"/>',
    pencil: '<path d="M4 20l1-4.2L15.8 4.9a1.8 1.8 0 0 1 2.5 0l1 1a1.8 1.8 0 0 1 0 2.5L8.3 19.3 4 20z"/><path d="M14 6.8l3.2 3.2"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M9 17h11"/><circle cx="14" cy="7" r="2.2"/><circle cx="7" cy="17" r="2.2"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.1" fill="currentColor" stroke="none"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sunTheme: '<circle cx="12" cy="12" r="4.4"/><path d="M12 3v2.4M12 18.6V21M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M3 12h2.4M18.6 12H21M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    weatherCloudy: '<path d="M7 18a4 4 0 0 1-.3-7.98A5.5 5.5 0 0 1 17.5 9.5 4.5 4.5 0 0 1 17 18H7z"/>',
    weatherRainy: '<path d="M7 14a4 4 0 0 1-.3-7.98A5.5 5.5 0 0 1 17.5 5.5 4.5 4.5 0 0 1 17 14H7z"/><path d="M8 17.5l-1 3M12.5 17.5l-1 3M17 17.5l-1 3"/>',
    weatherSnowy: '<path d="M7 14a4 4 0 0 1-.3-7.98A5.5 5.5 0 0 1 17.5 5.5 4.5 4.5 0 0 1 17 14H7z"/><circle cx="8" cy="19" r=".9" fill="currentColor" stroke="none"/><circle cx="12.5" cy="19" r=".9" fill="currentColor" stroke="none"/><circle cx="17" cy="19" r=".9" fill="currentColor" stroke="none"/>',
    weatherStormy: '<path d="M7 13a4 4 0 0 1-.3-7.98A5.5 5.5 0 0 1 17.5 4.5 4.5 4.5 0 0 1 17 13H7z"/><path d="M13 13l-3 5h3l-2 4"/>',
    starFilled: '<path d="M12 3.5l2.47 5.24 5.78.67-4.3 4.02 1.13 5.7L12 16.9l-5.08 2.23 1.13-5.7-4.3-4.02 5.78-.67L12 3.5z" fill="currentColor"/>',
    starOutline: '<path d="M12 3.5l2.47 5.24 5.78.67-4.3 4.02 1.13 5.7L12 16.9l-5.08 2.23 1.13-5.7-4.3-4.02 5.78-.67L12 3.5z"/>',
    chevron: '<path d="M7 9.5l5 5 5-5"/>',
    meals: '<path d="M7.5 3v6a2 2 0 0 0 4 0V3"/><path d="M9.5 3v18"/><path d="M17 3c2 1.6 2 6.4 0 8-.6.4-1 1.1-1 1.9V21"/>',
    travel: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M4 13h16"/>',
    fitness: '<path d="M12 20c-4-2-6-6-6-9 2 1 4 3 6 7 2-4 4-6 6-7 0 3-2 7-6 9z"/><path d="M12 20c-3-3-4-7-4-11 2 2 3 5 4 9 1-4 2-7 4-9 0 4-1 8-4 11z"/><path d="M6 15c-2-1-4-3-4-5 2 0 4 1 6 3M18 15c2-1 4-3 4-5-2 0-4 1-6 3"/>',
    reflections: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2.2 5-5 2.2 2.2-5 5-2.2z"/>',
    gem: '<path d="M12 3.2l6.8 4.8-3 6.4-3.8 6.4-3.8-6.4-3-6.4z"/><path d="M5.2 8h13.6M9.4 8l2.6 12.8M14.6 8L12 20.8"/>'
  };

  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + "</svg>";
  }

  /* ------------------------------------------------------------- rail / routing */

  var SECTIONS = [
    { id: "year", label: "Year" },
    { id: "month", label: "Month" },
    { id: "week", label: "Week" },
    { id: "day", label: "Day" },
    { id: "habits", label: "Habits" },
    { id: "goals", label: "Goals" },
    { id: "reading", label: "Reading" },
    { id: "finance", label: "Finance" },
    { id: "notes", label: "Notes" },
    { id: "meals", label: "Meal Planner" },
    { id: "travel", label: "Travel Planner" },
    { id: "fitness", label: "Fitness & Wellness" },
    { id: "reflections", label: "Reflections" }
  ];

  var TITLES = {
    cover: "Slow Ink", year: "Year Overview", month: "Monthly", week: "Weekly",
    day: "Daily", habits: "Habit Tracker", goals: "Goals", reading: "Reading",
    finance: "Finance", notes: "Notes", meals: "Meal Planner", travel: "Travel Planner",
    fitness: "Fitness & Wellness", reflections: "Reflections"
  };

  var TAB_ITEMS = [
    { id: "cover", icon: "home" },
    { id: "month", icon: "month" },
    { id: "week", icon: "week" },
    { id: "day", icon: "pencil" },
    { id: "habits", icon: "sliders" },
    { id: "notes", icon: "notes" }
  ];

  var THEMES = [
    { id: "greek-marble", label: "Greek Marble (light)", icon: "sunTheme", metaColor: "#F2E9D8" },
    { id: "soft-black", label: "Soft Black (dark)", icon: "moon", metaColor: "#232323" },
    { id: "midnight-luxury", label: "Midnight Luxury (dark)", icon: "gem", metaColor: "#0F0E13" }
  ];

  function buildTabbar() {
    var bar = document.getElementById("tabbar");
    bar.innerHTML = "";
    TAB_ITEMS.forEach(function (t) {
      var btn = document.createElement("button");
      btn.className = "tab-btn";
      btn.dataset.section = t.id;
      btn.title = TITLES[t.id] || t.id;
      btn.innerHTML = icon(t.icon);
      btn.addEventListener("click", function () { go(defaultRouteFor(t.id)); });
      bar.appendChild(btn);
    });
    THEMES.forEach(function (th) {
      var btn = document.createElement("button");
      btn.className = "tab-btn theme-btn";
      btn.dataset.theme = th.id;
      btn.title = th.label;
      btn.innerHTML = icon(th.icon);
      btn.addEventListener("click", function () { setTheme(th.id); });
      bar.appendChild(btn);
    });
  }

  function buildThemePicker() {
    var wrap = document.getElementById("drawer-theme-picker");
    if (!wrap) return;
    wrap.innerHTML = "";
    THEMES.forEach(function (th) {
      var btn = document.createElement("button");
      btn.className = "drawer-link";
      btn.dataset.theme = th.id;
      btn.innerHTML = '<span class="drawer-icon">' + icon(th.icon) + "</span><span>" + th.label + "</span>";
      btn.addEventListener("click", function () { setTheme(th.id); });
      wrap.appendChild(btn);
    });
  }

  function buildDrawer() {
    var wrap = document.getElementById("drawer-sections");
    wrap.innerHTML = "";
    SECTIONS.forEach(function (s) {
      var btn = document.createElement("button");
      btn.className = "drawer-link";
      btn.dataset.section = s.id;
      btn.innerHTML = '<span class="drawer-icon">' + icon(s.id) + "</span><span>" + s.label + "</span>";
      btn.addEventListener("click", function () {
        closeDrawer();
        go(defaultRouteFor(s.id));
      });
      wrap.appendChild(btn);
    });
  }

  function openDrawer() {
    document.getElementById("drawer").classList.add("show");
    document.getElementById("drawer-scrim").classList.add("show");
  }
  function closeDrawer() {
    document.getElementById("drawer").classList.remove("show");
    document.getElementById("drawer-scrim").classList.remove("show");
  }

  function defaultRouteFor(section) {
    if (section === "month") return "#/month/" + (now.getFullYear() === YEAR ? now.getMonth() : 0);
    if (section === "week") return "#/week/" + weekIndexForToday();
    if (section === "day") return "#/day/" + clampDayKey();
    if (section === "meals") return "#/meals/grid-" + weekIndexForToday();
    return "#/" + section;
  }

  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function getRoute() {
    var h = location.hash.replace(/^#\//, "");
    var parts = h.split("/");
    return { section: parts[0] || "cover", param: parts[1] };
  }

  function updateNavActive(section) {
    document.querySelectorAll(".tab-btn[data-section]").forEach(function (el) {
      el.classList.toggle("active", el.dataset.section === section);
    });
    document.querySelectorAll(".drawer-link[data-section]").forEach(function (el) {
      el.classList.toggle("active", el.dataset.section === section);
    });
  }

  /* ------------------------------------------------------------- toast */

  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2200);
  }

  /* ------------------------------------------------------------- renderers */

  var RENDERERS = {
    cover: renderCover,
    year: renderYear,
    month: renderMonth,
    week: renderWeek,
    day: renderDay,
    habits: renderHabits,
    goals: renderGoals,
    reading: renderReading,
    finance: renderFinance,
    notes: renderNotes,
    meals: renderMeals,
    travel: renderTravel,
    fitness: renderFitness,
    reflections: renderReflections
  };

  var BINDERS = {
    year: bindYear,
    month: bindMonth,
    week: bindWeek,
    day: bindDay,
    habits: bindHabits,
    meals: bindMeals,
    travel: bindTravel,
    fitness: bindFitness,
    reflections: bindReflections,
    goals: bindGoals,
    reading: bindReading,
    finance: bindFinance,
    notes: bindNotes,
    cover: bindCover
  };

  function renderCover() {
    return (
      '<div class="cover"><div class="cover-inner">' +
        '<div class="cover-mark">' + icon("cover") + "</div>" +
        '<div class="cover-year">' + YEAR + "</div>" +
        '<h1 class="cover-title">Slow Ink</h1>' +
        '<div class="cover-rule"></div>' +
        '<p class="cover-tag">Intention in Every Mark</p>' +
        '<button class="cover-cta" id="btn-open-planner">Open Planner</button>' +
        '<div class="cover-foot">' + YEAR + " Yearly Planner</div>" +
      "</div></div>"
    );
  }

  function bindCover() {
    var btn = document.getElementById("btn-open-planner");
    if (btn) btn.addEventListener("click", function () { go(defaultRouteFor("year")); });
  }

  /* ---- year ---- */

  function renderYear() {
    var months = "";
    for (var m = 0; m < 12; m++) {
      months += yearMonthBlock(m);
    }
    var totalGoals = state.goals.length;
    var doneGoals = state.goals.filter(function (g) { return g.done; }).length;
    return (
      '<div class="view-head">' +
        '<div><h1>' + YEAR + ' Overview</h1><div class="sub">Twelve months at a glance — tap a month to open it, and note the dates that matter.</div></div>' +
        '<div class="nav-strip">' +
          '<button id="year-prev">‹</button>' +
          '<span class="label">' + YEAR + "</span>" +
          '<button id="year-next">›</button>' +
        "</div>" +
      "</div>" +
      '<div class="year-panel panel">' +
        '<div class="year-subhead">Mon – Sun</div>' +
        months +
      "</div>" +
      '<div class="year-summary panel">' +
        '<h3>' + YEAR + " in numbers</h3>" +
        '<div class="chip-row">' +
          '<span class="chip">' + doneGoals + " / " + totalGoals + " goals complete</span>" +
          '<span class="chip">' + getHabits().length + " habits tracked</span>" +
          '<span class="chip">' + state.reading.length + " books logged</span>" +
          '<span class="chip">' + state.notes.length + " notes kept</span>" +
        "</div>" +
      "</div>"
    );
  }

  function yearMonthBlock(m) {
    var dim = daysInMonth(YEAR, m);
    var startDow = firstWeekdayMon(YEAR, m);
    var cells = "";
    DOW_ABBR.forEach(function (dl) { cells += '<div class="month-dow">' + dl + "</div>"; });
    for (var i = 0; i < startDow; i++) cells += '<div class="month-cell empty"></div>';
    for (var d = 1; d <= dim; d++) {
      var dow = (startDow + d - 1) % 7;
      var isW = dow >= 5;
      var isT = isToday(YEAR, m, d);
      cells += '<div class="month-cell' + (isW ? " weekend" : "") + (isT ? " today" : "") + '"><div class="num">' + d + "</div></div>";
    }
    return (
      '<div class="year-month-block" data-month="' + m + '">' +
        '<div class="year-month-header">' + MONTH_ABBR[m] + "</div>" +
        '<div class="month-grid">' + cells + "</div>" +
        '<div class="year-key-dates"><span class="year-key-dates-label">Key Dates</span>' +
          '<textarea rows="2" data-key-dates="' + m + '" placeholder="…">' + escapeHtml(getKeyDatesMap()[m] || "") + "</textarea>" +
        "</div>" +
      "</div>"
    );
  }

  function bindYear() {
    document.querySelectorAll(".year-month-block").forEach(function (el) {
      el.addEventListener("click", function (e) {
        if (e.target.closest(".year-key-dates")) return;
        go("#/month/" + el.dataset.month);
      });
    });
    document.querySelectorAll("[data-key-dates]").forEach(function (el) {
      el.addEventListener("click", function (e) { e.stopPropagation(); });
      el.addEventListener("input", function () {
        getKeyDatesMap()[parseInt(el.dataset.keyDates, 10)] = el.value;
        saveState();
      });
    });
    var prev = document.getElementById("year-prev");
    var next = document.getElementById("year-next");
    if (prev) prev.addEventListener("click", function () { setCurrentYear(YEAR - 1); });
    if (next) next.addEventListener("click", function () { setCurrentYear(YEAR + 1); });
  }

  function setCurrentYear(y) {
    YEAR = y;
    state.currentYear = y;
    WEEKS = buildWeeks(YEAR);
    saveState();
    updatePageMeta();
    render();
  }

  /* ---- month ---- */

  function renderMonth(param) {
    var m = clampMonth(param);
    var dim = daysInMonth(YEAR, m);
    var startDow = firstWeekdayMon(YEAR, m);
    var cells = "";
    DOW_ABBR.forEach(function (dl) { cells += '<div class="month-dow">' + dl + "</div>"; });
    for (var i = 0; i < startDow; i++) cells += '<div class="month-cell empty"></div>';
    for (var d = 1; d <= dim; d++) {
      var dow = (startDow + d - 1) % 7;
      var key = dateKey(YEAR, m, d);
      var isW = dow >= 5;
      var isT = isToday(YEAR, m, d);
      var dots = "";
      var day = state.daily[key];
      if (day && day.top3.some(function (t) { return t.trim(); })) dots += '<span class="dot"></span>';
      if (day && day.notes && day.notes.trim()) dots += '<span class="dot"></span>';
      if (getHabits().some(function (h) { return h.marks[key]; })) dots += '<span class="dot"></span>';
      cells += (
        '<div class="month-cell' + (isW ? " weekend" : "") + (isT ? " today" : "") + '" data-day="' + d + '">' +
          '<div class="num">' + d + "</div>" +
          '<div class="dot-row">' + dots + "</div>" +
        "</div>"
      );
    }
    var focus = getMonthlyFocusMap()[m] || "";
    var filled = 0;
    for (var dd = 1; dd <= dim; dd++) {
      var k = dateKey(YEAR, m, dd);
      if (state.daily[k] && (state.daily[k].top3.some(function (t) { return t.trim(); }) || state.daily[k].notes.trim())) filled++;
    }
    var pct = Math.round((filled / dim) * 100);
    var priorities = getMonthPriorities(m);
    var todos = getMonthTodos(m);
    return (
      '<div class="view-head">' +
        '<div><h1>' + MONTH_NAMES[m] + "</h1><div class=\"sub\">" + YEAR + " · month completion " + pct + "%</div></div>" +
        '<div class="nav-strip">' +
          '<button id="month-prev" ' + (m === 0 ? "disabled" : "") + '>‹</button>' +
          '<span class="label">' + MONTH_NAMES[m] + "</span>" +
          '<button id="month-next" ' + (m === 11 ? "disabled" : "") + '>›</button>' +
        "</div>" +
      "</div>" +
      '<div class="grid-2">' +
        '<div class="panel"><div class="month-grid">' + cells + "</div></div>" +
        '<div class="panel"><h3>Monthly focus</h3><p class="sub" style="margin:6px 0 10px;">What matters most this month</p>' +
          '<textarea id="month-focus" rows="10" placeholder="This month I want to…">' + escapeHtml(focus) + "</textarea>" +
        "</div>" +
      "</div>" +
      '<div class="panel" style="margin-top:20px;">' +
        '<h3>Key Dates</h3>' +
        '<textarea id="month-key-dates" rows="4" placeholder="Important dates this month…" style="margin-top:10px;">' + escapeHtml(getKeyDatesMap()[m] || "") + "</textarea>" +
      "</div>" +
      '<div class="grid-2" style="margin-top:20px;">' +
        '<div class="panel">' +
          '<h3>Top priorities this month</h3>' +
          '<div class="habit-toolbar" style="margin-top:12px;">' +
            '<input type="text" id="new-month-priority" placeholder="Add a priority" />' +
            '<button id="add-month-priority">Add</button>' +
          "</div>" +
          '<div id="month-priorities-list">' + checklistHtml(priorities, { noCheck: true, emptyLabel: "No priorities yet." }) + "</div>" +
        "</div>" +
        '<div class="panel">' +
          '<h3>To-Do</h3>' +
          '<div class="habit-toolbar" style="margin-top:12px;">' +
            '<input type="text" id="new-month-todo" placeholder="Add a to-do" />' +
            '<button id="add-month-todo">Add</button>' +
          "</div>" +
          '<div id="month-todos-list">' + checklistHtml(todos) + "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function bindMonth(param) {
    var m = clampMonth(param);
    var prev = document.getElementById("month-prev");
    var next = document.getElementById("month-next");
    if (prev) prev.addEventListener("click", function () { if (m > 0) go("#/month/" + (m - 1)); });
    if (next) next.addEventListener("click", function () { if (m < 11) go("#/month/" + (m + 1)); });
    document.querySelectorAll(".month-cell[data-day]").forEach(function (el) {
      el.addEventListener("click", function () {
        go("#/day/" + dateKey(YEAR, m, parseInt(el.dataset.day, 10)));
      });
    });
    var focus = document.getElementById("month-focus");
    if (focus) focus.addEventListener("input", function () {
      getMonthlyFocusMap()[m] = focus.value;
      saveState();
    });
    var keyDates = document.getElementById("month-key-dates");
    if (keyDates) keyDates.addEventListener("input", function () {
      getKeyDatesMap()[m] = keyDates.value;
      saveState();
    });
    var priorities = getMonthPriorities(m);
    bindChecklistAdd("add-month-priority", "new-month-priority", priorities);
    bindChecklist(document.getElementById("month-priorities-list"), priorities);
    var todos = getMonthTodos(m);
    bindChecklistAdd("add-month-todo", "new-month-todo", todos);
    bindChecklist(document.getElementById("month-todos-list"), todos);
  }

  /* ---- week ---- */

  function renderWeek(param) {
    var idx = clampWeek(param);
    var wk = WEEKS[idx - 1];
    var wdata = getWeek(idx);
    var days = "";
    wk.days.forEach(function (dd, i) {
      var key = dateKey(dd.y, dd.m, dd.d);
      var isT = isToday(dd.y, dd.m, dd.d);
      var inYear = dd.y === YEAR;
      var day = state.daily[key];
      var top3items = "";
      var items = day ? day.top3 : ["", "", ""];
      items.forEach(function (t) {
        if (t.trim()) top3items += "<li>" + escapeHtml(t) + "</li>";
      });
      days += (
        '<div class="week-day' + (isT ? " today" : "") + '" data-day="' + key + '" style="' + (inYear ? "" : "opacity:.45") + '">' +
          '<div class="dow">' + DOW_ABBR[i] + " · " + MONTH_ABBR[dd.m] + "</div>" +
          '<div class="dnum">' + dd.d + "</div>" +
          '<ul class="top3">' + (top3items || '<li style="border:none;color:var(--ink-faint)">—</li>') + "</ul>" +
        "</div>"
      );
    });
    var rangeLabel = MONTH_ABBR[wk.days[0].m] + " " + wk.days[0].d + " – " + MONTH_ABBR[wk.days[6].m] + " " + wk.days[6].d;
    var priorities = "";
    for (var i2 = 0; i2 < 3; i2++) {
      priorities += (
        '<li><span class="idx">' + (i2 + 1) + "</span>" +
        '<input type="text" class="line-input" data-week-pri="' + i2 + '" value="' + escapeHtml(wdata.top3[i2] || "") + '" placeholder="Priority ' + (i2 + 1) + '" /></li>'
      );
    }
    return (
      '<div class="view-head">' +
        '<div><h1>Week ' + idx + "</h1><div class=\"sub\">" + rangeLabel + "</div></div>" +
        '<div class="nav-strip">' +
          '<button id="week-prev" ' + (idx === 1 ? "disabled" : "") + '>‹</button>' +
          '<span class="label">Week ' + idx + "</span>" +
          '<button id="week-next" ' + (idx === WEEKS.length ? "disabled" : "") + '>›</button>' +
        "</div>" +
      "</div>" +
      '<div class="week-grid">' + days + "</div>" +
      '<div class="grid-2" style="margin-top:20px;">' +
        '<div class="panel"><h3>Top 3 priorities</h3><ul class="top3-list" style="margin-top:12px;">' + priorities + "</ul></div>" +
        '<div class="panel"><h3>Notes for this week</h3><textarea id="week-notes" rows="8" placeholder="Write a note…" style="margin-top:12px;">' + escapeHtml(wdata.notes || "") + "</textarea></div>" +
      "</div>" +
      '<div class="panel" style="margin-top:20px;">' +
        '<h3>To-Do</h3>' +
        '<div class="habit-toolbar" style="margin-top:12px;">' +
          '<input type="text" id="new-week-todo" placeholder="Add a to-do" />' +
          '<button id="add-week-todo">Add</button>' +
        "</div>" +
        '<div id="week-todos-list">' + checklistHtml(getWeekTodos(idx)) + "</div>" +
      "</div>"
    );
  }

  function bindWeek(param) {
    var idx = clampWeek(param);
    var wdata = getWeek(idx);
    var prev = document.getElementById("week-prev");
    var next = document.getElementById("week-next");
    if (prev) prev.addEventListener("click", function () { if (idx > 1) go("#/week/" + (idx - 1)); });
    if (next) next.addEventListener("click", function () { if (idx < WEEKS.length) go("#/week/" + (idx + 1)); });
    document.querySelectorAll(".week-day[data-day]").forEach(function (el) {
      el.addEventListener("click", function () { go("#/day/" + el.dataset.day); });
    });
    document.querySelectorAll("[data-week-pri]").forEach(function (el) {
      el.addEventListener("input", function () {
        wdata.top3[parseInt(el.dataset.weekPri, 10)] = el.value;
        saveState();
      });
    });
    var notes = document.getElementById("week-notes");
    if (notes) notes.addEventListener("input", function () { wdata.notes = notes.value; saveState(); });
    var todos = getWeekTodos(idx);
    bindChecklistAdd("add-week-todo", "new-week-todo", todos);
    bindChecklist(document.getElementById("week-todos-list"), todos);
  }

  /* ---- day ---- */

  function renderDay(param) {
    var key = clampDayKey(param);
    var y = parseInt(key.slice(0, 4), 10), m = parseInt(key.slice(5, 7), 10) - 1, d = parseInt(key.slice(8, 10), 10);
    var day = getDay(key);
    var priorities = "";
    for (var i = 0; i < 3; i++) {
      priorities += (
        '<li><span class="idx">' + (i + 1) + "</span>" +
        '<input type="text" class="line-input" data-day-pri="' + i + '" value="' + escapeHtml(day.top3[i] || "") + '" placeholder="Priority ' + (i + 1) + '" /></li>'
      );
    }
    var moods = "";
    MOODS.forEach(function (em) {
      moods += '<button class="mood-opt' + (day.mood === em ? " active" : "") + '" data-mood="' + em + '">' + em + "</button>";
    });
    var energies = "";
    LEVELS_5.forEach(function (lv) {
      energies += '<button class="mood-opt' + (day.energy === lv ? " active" : "") + '" data-energy="' + lv + '" title="Energy level ' + lv + '">' + lv + "</button>";
    });
    var stresses = "";
    LEVELS_5.forEach(function (lv) {
      stresses += '<button class="mood-opt' + (day.stress === lv ? " active" : "") + '" data-stress="' + lv + '" title="Stress level ' + lv + '">' + lv + "</button>";
    });
    var weathers = "";
    WEATHERS.forEach(function (w) {
      weathers += '<button class="weather-opt' + (day.weather === w.id ? " active" : "") + '" data-weather="' + w.id + '" title="' + w.label + '">' + icon(w.icon) + "</button>";
    });
    var meals = "";
    MEAL_FIELDS.forEach(function (mf) {
      meals += (
        '<div><span class="field-label">' + mf.label + '</span>' +
        '<input type="text" data-meal="' + mf.id + '" placeholder="What did you eat?" value="' + escapeHtml(day.meals[mf.id] || "") + '" /></div>'
      );
    });
    var schedule = "";
    SCHEDULE_HOURS.forEach(function (h) {
      schedule += (
        '<div class="schedule-row">' +
          '<span class="schedule-hour">' + fmtHour(h) + "</span>" +
          '<input type="text" class="line-input" data-hour="' + h + '" value="' + escapeHtml(day.schedule[h] || "") + '" /></div>'
      );
    });
    var d0 = new Date(YEAR, 0, 1), d1 = new Date(YEAR, 11, 31);
    var cur = new Date(y, m, d);
    var prevDate = new Date(y, m, d - 1), nextDate = new Date(y, m, d + 1);
    return (
      '<div class="view-head">' +
        '<div><h1>' + d + "</h1><div class=\"sub\">" + fmtLongDate(y, m, d) + "</div></div>" +
        '<div class="nav-strip">' +
          '<button id="day-prev" ' + (cur <= d0 ? "disabled" : "") + '>‹</button>' +
          '<span class="label">' + MONTH_ABBR[m] + " " + d + "</span>" +
          '<button id="day-next" ' + (cur >= d1 ? "disabled" : "") + '>›</button>' +
        "</div>" +
      "</div>" +
      '<div class="grid-2">' +
        '<div class="panel">' +
          '<h3>Today\'s affirmation</h3>' +
          '<textarea id="day-affirmation" rows="2" placeholder="I am…" style="margin-top:10px;">' + escapeHtml(day.affirmation || "") + "</textarea>" +
          '<h3 style="margin-top:18px;">Top 3 priorities for today</h3>' +
          '<ul class="top3-list" style="margin-top:12px;">' + priorities + "</ul>" +
          '<h3 style="margin-top:22px;">Mood</h3>' +
          '<div class="mood-row">' + moods + "</div>" +
          '<h3 style="margin-top:18px;">Energy level</h3>' +
          '<div class="mood-row">' + energies + "</div>" +
          '<h3 style="margin-top:18px;">Stress level</h3>' +
          '<div class="mood-row">' + stresses + "</div>" +
        "</div>" +
        '<div class="panel">' +
          '<h3>Gratitude</h3>' +
          '<textarea id="day-gratitude" rows="3" placeholder="Something I\'m grateful for…" style="margin-top:10px;">' + escapeHtml(day.gratitude || "") + "</textarea>" +
          '<h3 style="margin-top:18px;">What went well today?</h3>' +
          '<textarea id="day-wentWell" rows="3" style="margin-top:10px;">' + escapeHtml(day.wentWell || "") + "</textarea>" +
          '<h3 style="margin-top:18px;">What can I improve tomorrow?</h3>' +
          '<textarea id="day-improveNextTime" rows="3" style="margin-top:10px;">' + escapeHtml(day.improveNextTime || "") + "</textarea>" +
          '<h3 style="margin-top:18px;">Notes</h3>' +
          '<textarea id="day-notes" rows="4" placeholder="Daily notes…" style="margin-top:10px;">' + escapeHtml(day.notes || "") + "</textarea>" +
        "</div>" +
      "</div>" +
      '<div class="grid-2" style="margin-top:20px;">' +
        '<div class="panel">' +
          '<h3>Wellness</h3>' +
          '<div class="weather-row">' + weathers + "</div>" +
          '<div class="field-row"><span class="field-label">Cups of water</span><input type="number" id="day-water" min="0" step="1" value="' + (day.water || 0) + '" /></div>' +
          '<div class="field-row"><span class="field-label">Hours of sleep</span><input type="number" id="day-sleep" min="0" step="0.5" value="' + (day.sleep || 0) + '" /></div>' +
        "</div>" +
        '<div class="panel">' +
          '<h3>Meals</h3>' +
          '<div class="meal-grid" style="margin-top:12px;">' + meals + "</div>" +
        "</div>" +
      "</div>" +
      '<div class="panel" style="margin-top:20px;">' +
        '<h3>Today\'s schedule</h3>' +
        '<div class="schedule-grid" style="margin-top:12px;">' + schedule + "</div>" +
      "</div>"
    );
  }

  function bindDay(param) {
    var key = clampDayKey(param);
    var day = getDay(key);
    var y = parseInt(key.slice(0, 4), 10), m = parseInt(key.slice(5, 7), 10) - 1, d = parseInt(key.slice(8, 10), 10);
    var prev = document.getElementById("day-prev");
    var next = document.getElementById("day-next");
    if (prev) prev.addEventListener("click", function () {
      var pd = new Date(y, m, d - 1);
      if (pd.getFullYear() === YEAR) go("#/day/" + dateKey(pd.getFullYear(), pd.getMonth(), pd.getDate()));
    });
    if (next) next.addEventListener("click", function () {
      var nd = new Date(y, m, d + 1);
      if (nd.getFullYear() === YEAR) go("#/day/" + dateKey(nd.getFullYear(), nd.getMonth(), nd.getDate()));
    });
    document.querySelectorAll("[data-day-pri]").forEach(function (el) {
      el.addEventListener("input", function () {
        day.top3[parseInt(el.dataset.dayPri, 10)] = el.value;
        saveState();
      });
    });
    document.querySelectorAll(".mood-opt").forEach(function (el) {
      el.addEventListener("click", function () {
        day.mood = day.mood === el.dataset.mood ? "" : el.dataset.mood;
        saveState();
        render();
      });
    });
    document.querySelectorAll(".weather-opt").forEach(function (el) {
      el.addEventListener("click", function () {
        day.weather = day.weather === el.dataset.weather ? "" : el.dataset.weather;
        saveState();
        render();
      });
    });
    document.querySelectorAll("[data-energy]").forEach(function (el) {
      el.addEventListener("click", function () {
        day.energy = day.energy === el.dataset.energy ? "" : el.dataset.energy;
        saveState();
        render();
      });
    });
    document.querySelectorAll("[data-stress]").forEach(function (el) {
      el.addEventListener("click", function () {
        day.stress = day.stress === el.dataset.stress ? "" : el.dataset.stress;
        saveState();
        render();
      });
    });
    ["gratitude", "wentWell", "improveNextTime", "notes", "affirmation"].forEach(function (field) {
      var el = document.getElementById("day-" + field);
      if (el) el.addEventListener("input", function () { day[field] = el.value; saveState(); });
    });
    var waterEl = document.getElementById("day-water");
    if (waterEl) waterEl.addEventListener("input", function () { day.water = parseInt(waterEl.value, 10) || 0; saveState(); });
    var sleepEl = document.getElementById("day-sleep");
    if (sleepEl) sleepEl.addEventListener("input", function () { day.sleep = parseFloat(sleepEl.value) || 0; saveState(); });
    document.querySelectorAll("[data-meal]").forEach(function (el) {
      el.addEventListener("input", function () { day.meals[el.dataset.meal] = el.value; saveState(); });
    });
    document.querySelectorAll("[data-hour]").forEach(function (el) {
      el.addEventListener("input", function () { day.schedule[el.dataset.hour] = el.value; saveState(); });
    });
  }

  /* ---- habits ---- */

  function renderHabits() {
    var m = now.getFullYear() === YEAR ? now.getMonth() : 0;
    var dim = daysInMonth(YEAR, m);
    var head = '<th class="habit-name-cell">Habit</th>';
    for (var d = 1; d <= dim; d++) {
      var dow = (firstWeekdayMon(YEAR, m) + d - 1) % 7;
      head += '<th' + (dow >= 5 ? ' class="weekend-col"' : "") + ">" + d + "</th>";
    }
    var rows = "";
    var habitsList = getHabits();
    if (!habitsList.length) {
      rows = '<tr><td class="habit-row-empty" colspan="' + (dim + 1) + '">No habits yet — add one above.</td></tr>';
    } else {
      habitsList.forEach(function (h) {
        var streak = currentStreak(h, m);
        var cells = '<td class="habit-name-cell">' +
          '<button class="habit-mode-toggle" data-mode-toggle="' + h.id + '" title="Switch tracking mode">' + (h.mode === "three-state" ? "3-state" : "simple") + "</button> " +
          escapeHtml(h.name || "Unnamed habit") +
          (streak > 1 ? '<span class="streak">' + streak + "d streak</span>" : "") + "</td>";
        for (var dd = 1; dd <= dim; dd++) {
          var key = dateKey(YEAR, m, dd);
          var dow2 = (firstWeekdayMon(YEAR, m) + dd - 1) % 7;
          var val = h.marks[key];
          var stateClass = h.mode === "three-state"
            ? (val === "done" ? " on" : val === "partial" ? " partial" : "")
            : (val ? " on" : "");
          cells += '<td' + (dow2 >= 5 ? ' class="weekend-col"' : "") + '>' +
            '<button class="habit-mark' + stateClass + '" data-habit="' + h.id + '" data-key="' + key + '"></button>' +
          "</td>";
        }
        cells += '<td><button class="habit-del" data-del="' + h.id + '" title="Delete habit">✕</button></td>';
        rows += "<tr>" + cells + "</tr>";
      });
    }
    var refl = getHabitsReflection();
    return (
      '<div class="view-head"><div><h1>Habit Tracker</h1><div class="sub">' + MONTH_NAMES[m] + " " + YEAR + "</div></div></div>" +
      '<div class="panel">' +
        '<div class="habit-toolbar">' +
          '<input type="text" id="new-habit-name" placeholder="Add a habit — e.g. Read 10 pages" />' +
          '<button id="add-habit">New habit</button>' +
        "</div>" +
        '<div style="overflow-x:auto;"><table class="habit-table"><thead><tr>' + head + "<th></th></tr></thead><tbody>" + rows + "</tbody></table></div>" +
      "</div>" +
      '<div class="grid-2" style="margin-top:20px;">' +
        '<div class="panel"><h3>This month I will focus on</h3>' +
          '<textarea id="habits-focus" rows="4" style="margin-top:10px;">' + escapeHtml(refl.focus || "") + "</textarea>" +
        "</div>" +
        '<div class="panel"><h3>I am proud of</h3>' +
          '<textarea id="habits-proud" rows="4" style="margin-top:10px;">' + escapeHtml(refl.proud || "") + "</textarea>" +
        "</div>" +
      "</div>"
    );
  }

  function currentStreak(h, m) {
    var streak = 0;
    for (var d = now.getDate(); d >= 1; d--) {
      var key = dateKey(YEAR, m, d);
      if (h.marks[key]) streak++;
      else break;
    }
    return streak;
  }

  function bindHabits() {
    var addBtn = document.getElementById("add-habit");
    var input = document.getElementById("new-habit-name");
    function addHabit() {
      var name = input.value.trim();
      if (!name) return;
      getHabits().push({ id: uid(), name: name, mode: "simple", marks: {} });
      saveState();
      render();
    }
    if (addBtn) addBtn.addEventListener("click", addHabit);
    if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") addHabit(); });
    document.querySelectorAll(".habit-mark").forEach(function (el) {
      el.addEventListener("click", function () {
        var h = getHabits().find(function (x) { return x.id === el.dataset.habit; });
        if (!h) return;
        var key = el.dataset.key;
        if (h.mode === "three-state") {
          var val = h.marks[key];
          if (val === "done") delete h.marks[key];
          else if (val === "partial") h.marks[key] = "done";
          else h.marks[key] = "partial";
        } else {
          if (h.marks[key]) delete h.marks[key];
          else h.marks[key] = true;
        }
        saveState();
        render();
      });
    });
    document.querySelectorAll(".habit-mode-toggle").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        var h = getHabits().find(function (x) { return x.id === el.dataset.modeToggle; });
        if (!h) return;
        h.mode = h.mode === "three-state" ? "simple" : "three-state";
        saveState();
        render();
      });
    });
    document.querySelectorAll(".habit-del").forEach(function (el) {
      el.addEventListener("click", function () {
        state.habitsByYear[YEAR] = getHabits().filter(function (x) { return x.id !== el.dataset.del; });
        saveState();
        render();
      });
    });
    var focusEl = document.getElementById("habits-focus");
    if (focusEl) focusEl.addEventListener("input", function () { getHabitsReflection().focus = focusEl.value; saveState(); });
    var proudEl = document.getElementById("habits-proud");
    if (proudEl) proudEl.addEventListener("input", function () { getHabitsReflection().proud = proudEl.value; saveState(); });
  }

  /* ---- goals ---- */

  function normalizeGoal(g) {
    if (g.targetDate === undefined) g.targetDate = "";
    if (g.definitionOfDone === undefined) g.definitionOfDone = "";
    if (g.why === undefined) g.why = "";
    if (!g.steps) g.steps = [];
    if (g.challenges === undefined) g.challenges = "";
    if (g.howToOvercome === undefined) g.howToOvercome = "";
    if (!g.milestones) g.milestones = [];
    if (g.supportingHabits === undefined) g.supportingHabits = "";
    if (g.accountability === undefined) g.accountability = "";
    if (!g.actionSteps) g.actionSteps = [];
    return g;
  }

  function goalProgressPct(g) {
    var all = g.steps.concat(g.actionSteps);
    if (!all.length) return 0;
    var done = all.filter(function (s) { return s.done; }).length;
    return Math.round((done / all.length) * 100);
  }

  function renderGoals() {
    var cards = "";
    if (!state.goals.length) {
      cards = '<div class="empty-state">No goals yet. What do you want ' + YEAR + " to hold?</div>";
    } else {
      state.goals.forEach(function (g) {
        normalizeGoal(g);
        var pct = goalProgressPct(g);
        var expandId = "goal-expand-" + g.id;
        cards += (
          '<div class="card goal-card" data-goal-card="' + g.id + '">' +
            '<div class="goal-item' + (g.done ? " done" : "") + '">' +
              '<button class="goal-check' + (g.done ? " done" : "") + '" data-check="' + g.id + '">' + (g.done ? "✓" : "") + "</button>" +
              '<span class="goal-title">' + escapeHtml(g.title) + "</span>" +
              '<button class="habit-del" data-del="' + g.id + '" title="Delete goal">✕</button>' +
            "</div>" +
            '<div class="progress-bar"><div style="width:' + pct + '%"></div></div>' +
            '<button class="card-expand-toggle' + expandClass(expandId) + '" data-expand-toggle="' + expandId + '">' + icon("chevron") + " More details</button>" +
            '<div class="card-expand-body' + expandClass(expandId) + '" id="' + expandId + '">' +
              '<div class="field-grid-2">' +
                '<div><span class="field-label">Target date</span><input type="date" data-field="targetDate" data-goal="' + g.id + '" value="' + escapeHtml(g.targetDate) + '" /></div>' +
                '<div><span class="field-label">Accountability</span><input type="text" data-field="accountability" data-goal="' + g.id + '" placeholder="Who\'s holding you to this?" value="' + escapeHtml(g.accountability) + '" /></div>' +
              "</div>" +
              '<span class="field-label" style="margin-top:12px;">Definition of done</span>' +
              '<textarea rows="2" data-field="definitionOfDone" data-goal="' + g.id + '">' + escapeHtml(g.definitionOfDone) + "</textarea>" +
              '<span class="field-label" style="margin-top:12px;">Why this matters</span>' +
              '<textarea rows="2" data-field="why" data-goal="' + g.id + '">' + escapeHtml(g.why) + "</textarea>" +
              '<span class="field-label" style="margin-top:12px;">Steps</span>' +
              '<div class="habit-toolbar" style="margin-top:6px;"><button data-add-step="' + g.id + '">Add step</button></div>' +
              '<div class="list-editor" data-steps-list="' + g.id + '">' + listEditorHtml(g.steps, [
                { key: "text", placeholder: "Step" },
                { key: "resource", placeholder: "Resource" },
                { key: "deadline", placeholder: "Deadline", type: "date" },
                { key: "done", placeholder: "Done", type: "checkbox" }
              ]) + "</div>" +
              '<span class="field-label" style="margin-top:12px;">Challenges</span>' +
              '<textarea rows="2" data-field="challenges" data-goal="' + g.id + '">' + escapeHtml(g.challenges) + "</textarea>" +
              '<span class="field-label" style="margin-top:12px;">How I\'ll overcome them</span>' +
              '<textarea rows="2" data-field="howToOvercome" data-goal="' + g.id + '">' + escapeHtml(g.howToOvercome) + "</textarea>" +
              '<span class="field-label" style="margin-top:12px;">Milestones</span>' +
              '<div class="habit-toolbar" style="margin-top:6px;"><button data-add-milestone="' + g.id + '">Add milestone</button></div>' +
              '<div class="list-editor" data-milestones-list="' + g.id + '">' + listEditorHtml(g.milestones, [
                { key: "month", placeholder: "Month" },
                { key: "target", placeholder: "Target" }
              ]) + "</div>" +
              '<span class="field-label" style="margin-top:12px;">Supporting habits</span>' +
              '<textarea rows="2" data-field="supportingHabits" data-goal="' + g.id + '" placeholder="Habits that support this goal">' + escapeHtml(g.supportingHabits) + "</textarea>" +
              '<span class="field-label" style="margin-top:12px;">Action steps</span>' +
              '<div class="habit-toolbar" style="margin-top:6px;"><button data-add-action="' + g.id + '">Add action step</button></div>' +
              '<div class="list-editor" data-actions-list="' + g.id + '">' + listEditorHtml(g.actionSteps, [
                { key: "step", placeholder: "Action step" },
                { key: "when", placeholder: "When" },
                { key: "done", placeholder: "Done", type: "checkbox" }
              ]) + "</div>" +
            "</div>" +
          "</div>"
        );
      });
    }
    return (
      '<div class="view-head"><div><h1>Goals</h1><div class="sub">' + YEAR + " ambitions, kept in view</div></div></div>" +
      '<div class="habit-toolbar" style="max-width:260px;">' +
        '<input type="text" id="new-goal-title" placeholder="Goal title" />' +
        '<button id="add-goal">Add goal</button>' +
      "</div>" +
      '<div class="grid-3">' + cards + "</div>"
    );
  }

  function bindGoals() {
    var addBtn = document.getElementById("add-goal");
    var input = document.getElementById("new-goal-title");
    function addGoal() {
      var title = input.value.trim();
      if (!title) return;
      state.goals.push(normalizeGoal({ id: uid(), title: title, done: false }));
      saveState();
      render();
    }
    if (addBtn) addBtn.addEventListener("click", addGoal);
    if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") addGoal(); });
    document.querySelectorAll("[data-check]").forEach(function (el) {
      el.addEventListener("click", function () {
        var g = state.goals.find(function (x) { return x.id === el.dataset.check; });
        if (g) { g.done = !g.done; saveState(); render(); }
      });
    });
    document.querySelectorAll(".goal-item [data-del]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.goals = state.goals.filter(function (x) { return x.id !== el.dataset.del; });
        saveState();
        render();
      });
    });
    document.querySelectorAll("[data-field][data-goal]").forEach(function (el) {
      el.addEventListener("input", function () {
        var g = state.goals.find(function (x) { return x.id === el.dataset.goal; });
        if (g) { g[el.dataset.field] = el.value; saveState(); }
      });
    });
    document.querySelectorAll("[data-add-step]").forEach(function (el) {
      el.addEventListener("click", function () {
        var g = state.goals.find(function (x) { return x.id === el.dataset.addStep; });
        if (g) { g.steps.push({ id: uid(), text: "", resource: "", deadline: "", done: false }); saveState(); render(); }
      });
    });
    document.querySelectorAll("[data-add-milestone]").forEach(function (el) {
      el.addEventListener("click", function () {
        var g = state.goals.find(function (x) { return x.id === el.dataset.addMilestone; });
        if (g) { g.milestones.push({ id: uid(), month: "", target: "" }); saveState(); render(); }
      });
    });
    document.querySelectorAll("[data-add-action]").forEach(function (el) {
      el.addEventListener("click", function () {
        var g = state.goals.find(function (x) { return x.id === el.dataset.addAction; });
        if (g) { g.actionSteps.push({ id: uid(), step: "", when: "", done: false }); saveState(); render(); }
      });
    });
    state.goals.forEach(function (g) {
      var card = document.querySelector('[data-goal-card="' + g.id + '"]');
      if (!card) return;
      bindListEditor(card.querySelector('[data-steps-list="' + g.id + '"]'), g.steps);
      bindListEditor(card.querySelector('[data-milestones-list="' + g.id + '"]'), g.milestones);
      bindListEditor(card.querySelector('[data-actions-list="' + g.id + '"]'), g.actionSteps);
    });
    bindExpandToggles();
  }

  /* ---- reading ---- */

  var READ_STATUSES = [{ id: "want", label: "Want" }, { id: "reading", label: "Reading" }, { id: "done", label: "Finished" }];
  var RECOMMEND_OPTS = [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }];

  function normalizeBook(b) {
    if (b.genre === undefined) b.genre = "";
    if (b.series === undefined) b.series = "";
    if (b.edition === undefined) b.edition = "";
    if (b.publisher === undefined) b.publisher = "";
    if (b.startDate === undefined) b.startDate = "";
    if (b.finishDate === undefined) b.finishDate = "";
    if (b.link === undefined) b.link = "";
    if (b.rating === undefined) b.rating = 0;
    if (!b.keyTakeaways) b.keyTakeaways = [];
    if (!b.favoriteQuotes) b.favoriteQuotes = [];
    if (b.thoughts === undefined) b.thoughts = "";
    if (b.recommend === undefined) b.recommend = "";
    return b;
  }

  function renderReading() {
    var cards = "";
    state.reading.forEach(function (b) {
      normalizeBook(b);
      var pct = b.totalPages > 0 ? Math.min(100, Math.round((b.pagesRead / b.totalPages) * 100)) : 0;
      var pills = "";
      READ_STATUSES.forEach(function (s) {
        pills += '<button class="status-pill' + (b.status === s.id ? " active" : "") + '" data-status="' + s.id + '" data-book="' + b.id + '">' + s.label + "</button>";
      });
      var recPills = "";
      RECOMMEND_OPTS.forEach(function (r) {
        recPills += '<button class="status-pill' + (b.recommend === r.id ? " active" : "") + '" data-recommend="' + r.id + '" data-book="' + b.id + '">' + r.label + "</button>";
      });
      var expandId = "book-expand-" + b.id;
      cards += (
        '<div class="card book-card" data-book-card="' + b.id + '">' +
          '<button class="habit-del" style="align-self:flex-end;" data-del-book="' + b.id + '" title="Delete book">✕</button>' +
          '<input type="text" class="title-input" data-field="title" data-book="' + b.id + '" placeholder="Book title" value="' + escapeHtml(b.title || "") + '" />' +
          '<input type="text" class="line-input" data-field="author" data-book="' + b.id + '" placeholder="Book author" value="' + escapeHtml(b.author || "") + '" />' +
          '<div class="status-row">' + pills + "</div>" +
          '<div class="pages-row">' +
            '<input type="number" min="0" data-field="pagesRead" data-book="' + b.id + '" value="' + (b.pagesRead || 0) + '" /> of' +
            '<input type="number" min="0" data-field="totalPages" data-book="' + b.id + '" value="' + (b.totalPages || 0) + '" /> pages' +
          "</div>" +
          '<div class="progress-bar"><div style="width:' + pct + '%"></div></div>' +
          '<button class="card-expand-toggle' + expandClass(expandId) + '" data-expand-toggle="' + expandId + '">' + icon("chevron") + " More details</button>" +
          '<div class="card-expand-body' + expandClass(expandId) + '" id="' + expandId + '">' +
            '<div class="field-grid-2">' +
              '<input type="text" data-field="genre" data-book="' + b.id + '" placeholder="Genre" value="' + escapeHtml(b.genre) + '" />' +
              '<input type="text" data-field="series" data-book="' + b.id + '" placeholder="Series" value="' + escapeHtml(b.series) + '" />' +
              '<input type="text" data-field="edition" data-book="' + b.id + '" placeholder="Edition / format" value="' + escapeHtml(b.edition) + '" />' +
              '<input type="text" data-field="publisher" data-book="' + b.id + '" placeholder="Publisher" value="' + escapeHtml(b.publisher) + '" />' +
            "</div>" +
            '<div class="field-grid-2" style="margin-top:10px;">' +
              '<div><span class="field-label">Start date</span><input type="date" data-field="startDate" data-book="' + b.id + '" value="' + escapeHtml(b.startDate) + '" /></div>' +
              '<div><span class="field-label">Finish date</span><input type="date" data-field="finishDate" data-book="' + b.id + '" value="' + escapeHtml(b.finishDate) + '" /></div>' +
            "</div>" +
            '<input type="text" data-field="link" data-book="' + b.id + '" placeholder="Link" value="' + escapeHtml(b.link) + '" style="margin-top:10px;" />' +
            '<span class="field-label" style="margin-top:12px;">Rating</span>' +
            starsHtml(b.rating, "rate", b.id) +
            '<span class="field-label" style="margin-top:12px;">Key takeaways (one per line)</span>' +
            '<textarea rows="3" data-field="keyTakeaways" data-book="' + b.id + '">' + escapeHtml((b.keyTakeaways || []).join("\n")) + "</textarea>" +
            '<span class="field-label" style="margin-top:12px;">Favorite quotes</span>' +
            '<div class="habit-toolbar" style="margin-top:6px;"><button data-add-quote="' + b.id + '">Add quote</button></div>' +
            '<div class="list-editor" data-quotes-list="' + b.id + '">' + listEditorHtml(b.favoriteQuotes, [
              { key: "quote", placeholder: "Quote", type: "textarea", rows: 2 },
              { key: "chapter", placeholder: "Chapter" }
            ]) + "</div>" +
            '<span class="field-label" style="margin-top:12px;">Thoughts</span>' +
            '<textarea rows="3" data-field="thoughts" data-book="' + b.id + '">' + escapeHtml(b.thoughts) + "</textarea>" +
            '<span class="field-label" style="margin-top:12px;">Would you recommend it?</span>' +
            '<div class="status-row" style="margin-top:6px;">' + recPills + "</div>" +
          "</div>" +
        "</div>"
      );
    });
    return (
      '<div class="view-head"><div><h1>Reading</h1><div class="sub">Total pages read this year: ' + totalPagesRead() + "</div></div></div>" +
      '<div class="habit-toolbar" style="max-width:260px;"><button id="add-book" style="width:100%;">Add a book</button></div>' +
      '<div class="grid-3">' + (cards || '<div class="empty-state">No books yet — add one above.</div>') + "</div>"
    );
  }

  function totalPagesRead() {
    return state.reading.reduce(function (sum, b) { return sum + (parseInt(b.pagesRead, 10) || 0); }, 0);
  }

  function bindReading() {
    var addBtn = document.getElementById("add-book");
    if (addBtn) addBtn.addEventListener("click", function () {
      state.reading.push(normalizeBook({ id: uid(), title: "", author: "", status: "want", pagesRead: 0, totalPages: 0 }));
      saveState();
      render();
    });
    document.querySelectorAll("[data-field][data-book]").forEach(function (el) {
      el.addEventListener("input", function () {
        var b = state.reading.find(function (x) { return x.id === el.dataset.book; });
        if (!b) return;
        var field = el.dataset.field;
        if (field === "pagesRead" || field === "totalPages") b[field] = parseInt(el.value, 10) || 0;
        else if (field === "keyTakeaways") b[field] = el.value.split("\n");
        else b[field] = el.value;
        saveState();
        if (field === "pagesRead" || field === "totalPages") render();
      });
    });
    document.querySelectorAll("[data-status]").forEach(function (el) {
      el.addEventListener("click", function () {
        var b = state.reading.find(function (x) { return x.id === el.dataset.book; });
        if (b) { b.status = el.dataset.status; saveState(); render(); }
      });
    });
    document.querySelectorAll("[data-recommend]").forEach(function (el) {
      el.addEventListener("click", function () {
        var b = state.reading.find(function (x) { return x.id === el.dataset.book; });
        if (b) { b.recommend = b.recommend === el.dataset.recommend ? "" : el.dataset.recommend; saveState(); render(); }
      });
    });
    document.querySelectorAll("[data-del-book]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.reading = state.reading.filter(function (x) { return x.id !== el.dataset.delBook; });
        saveState();
        render();
      });
    });
    document.querySelectorAll("[data-add-quote]").forEach(function (el) {
      el.addEventListener("click", function () {
        var b = state.reading.find(function (x) { return x.id === el.dataset.addQuote; });
        if (b) { b.favoriteQuotes.push({ id: uid(), quote: "", chapter: "" }); saveState(); render(); }
      });
    });
    state.reading.forEach(function (b) {
      var card = document.querySelector('[data-book-card="' + b.id + '"]');
      if (!card) return;
      bindStars(card.querySelector(".star-row"), "rate", function (v) { b.rating = v; saveState(); render(); });
      bindListEditor(card.querySelector('[data-quotes-list="' + b.id + '"]'), b.favoriteQuotes);
    });
    bindExpandToggles();
  }

  /* ---- finance ---- */

  var financeKind = "expense";
  var FINANCE_TABS = [
    { id: "ledger", label: "Ledger" }, { id: "budget", label: "Budget" }, { id: "savings", label: "Savings" },
    { id: "bills", label: "Bills" }, { id: "debt", label: "Debt" }
  ];

  function renderFinance(param) {
    var view = FINANCE_TABS.some(function (t) { return t.id === param; }) ? param : "ledger";
    var tabs = subtabsHtml(FINANCE_TABS.map(function (t) { return { label: t.label, href: "#/finance/" + t.id, active: t.id === view }; }));
    var head = '<div class="view-head"><div><h1>Finance</h1><div class="sub">A quiet ledger for ' + YEAR + "</div></div></div>" + tabs;
    if (view === "budget") return head + renderFinanceBudget();
    if (view === "savings") return head + renderFinanceSavings();
    if (view === "bills") return head + renderFinanceBills();
    if (view === "debt") return head + renderFinanceDebt();
    return head + renderFinanceLedger();
  }

  function bindFinance(param) {
    bindSubtabs();
    var view = FINANCE_TABS.some(function (t) { return t.id === param; }) ? param : "ledger";
    if (view === "budget") bindFinanceBudget();
    else if (view === "savings") bindFinanceSavings();
    else if (view === "bills") bindFinanceBills();
    else if (view === "debt") bindFinanceDebt();
    else bindFinanceLedger();
  }

  function renderFinanceLedger() {
    var income = 0, expense = 0;
    var byCategory = {};
    getFinance().forEach(function (e) {
      if (e.kind === "income") income += e.amount;
      else { expense += e.amount; byCategory[e.category || "Other"] = (byCategory[e.category || "Other"] || 0) + e.amount; }
    });
    var monthly = [];
    for (var m = 0; m < 12; m++) monthly.push(0);
    getFinance().forEach(function (e) {
      var mm = parseInt((e.date || "").slice(5, 7), 10) - 1;
      if (mm >= 0 && mm < 12) monthly[mm] += e.kind === "income" ? e.amount : -e.amount;
    });
    var maxAbs = Math.max(1, Math.max.apply(null, monthly.map(Math.abs)));
    var bars = "";
    monthly.forEach(function (v, m) {
      var h = Math.round((Math.abs(v) / maxAbs) * 100);
      bars += (
        '<div class="bar-col"><div class="bar' + (v < 0 ? " neg" : "") + '" style="height:' + Math.max(h, 2) + '%"></div>' +
          '<div class="bar-label">' + MONTH_ABBR[m] + "</div></div>"
      );
    });
    var rows = "";
    getFinance().slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }).forEach(function (e) {
      rows += (
        "<tr>" +
          "<td>" + escapeHtml(e.date || "") + "</td>" +
          "<td>" + escapeHtml(e.category || "—") + "</td>" +
          '<td class="amt ' + e.kind + '">' + (e.kind === "income" ? "+" : "−") + "$" + Number(e.amount).toFixed(2) + "</td>" +
          '<td><button class="del-btn" data-del-entry="' + e.id + '">✕</button></td>' +
        "</tr>"
      );
    });
    var donutSegments = Object.keys(byCategory).map(function (cat) { return { label: cat, value: byCategory[cat] }; });
    return (
      '<div class="finance-summary" style="margin-top:16px;">' +
        '<div class="stat income"><div class="label">Income</div><div class="value">$' + income.toFixed(2) + "</div></div>" +
        '<div class="stat expense"><div class="label">Expenses</div><div class="value">$' + expense.toFixed(2) + "</div></div>" +
        '<div class="stat"><div class="label">Balance</div><div class="value">$' + (income - expense).toFixed(2) + "</div></div>" +
      "</div>" +
      '<div class="grid-2" style="margin-bottom:20px;">' +
        '<div class="panel"><h3>Net balance for each month of ' + YEAR + "</h3>" +
          '<div class="chart">' + bars + "</div>" +
        "</div>" +
        '<div class="panel"><h3>Spending by category</h3>' + donutChartHtml(donutSegments) + "</div>" +
      "</div>" +
      '<div class="panel">' +
        '<h3>Add an entry</h3>' +
        '<div class="entry-form" style="margin-top:14px;">' +
          '<div class="kind-toggle">' +
            '<button id="kind-income" class="' + (financeKind === "income" ? "active income" : "") + '">Income</button>' +
            '<button id="kind-expense" class="' + (financeKind === "expense" ? "active expense" : "") + '">Expense</button>' +
          "</div>" +
          '<input type="date" id="new-entry-date" value="' + dateKey(YEAR, now.getFullYear() === YEAR ? now.getMonth() : 0, now.getFullYear() === YEAR ? now.getDate() : 1) + '" min="' + YEAR + '-01-01" max="' + YEAR + '-12-31" />' +
          '<input type="text" id="new-entry-category" placeholder="Category" />' +
          '<input type="number" id="new-entry-amount" placeholder="Amount" min="0" step="0.01" />' +
          '<button class="add-btn" id="add-entry">Add</button>' +
        "</div>" +
        '<div style="overflow-x:auto;"><table class="ledger"><thead><tr><th>Date</th><th>Category</th><th>Amount</th><th></th></tr></thead><tbody>' +
          (rows || '<tr><td colspan="4" class="habit-row-empty">No entries yet.</td></tr>') +
        "</tbody></table></div>" +
      "</div>"
    );
  }

  function bindFinanceLedger() {
    var ki = document.getElementById("kind-income"), ke = document.getElementById("kind-expense");
    if (ki) ki.addEventListener("click", function () { financeKind = "income"; render(); });
    if (ke) ke.addEventListener("click", function () { financeKind = "expense"; render(); });
    var addBtn = document.getElementById("add-entry");
    if (addBtn) addBtn.addEventListener("click", function () {
      var date = document.getElementById("new-entry-date").value || dateKey(YEAR, 0, 1);
      var category = document.getElementById("new-entry-category").value.trim();
      var amount = parseFloat(document.getElementById("new-entry-amount").value);
      if (!amount || amount <= 0) return;
      getFinance().push({ id: uid(), date: date, category: category, amount: amount, kind: financeKind });
      saveState();
      render();
    });
    document.querySelectorAll("[data-del-entry]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.financeByYear[YEAR] = getFinance().filter(function (x) { return x.id !== el.dataset.delEntry; });
        saveState();
        render();
      });
    });
  }

  function renderFinanceBudget() {
    var fixed = state.budgetCategories.filter(function (c) { return c.type === "fixed"; });
    var variable = state.budgetCategories.filter(function (c) { return c.type === "variable"; });
    function group(list) {
      var html = "";
      list.forEach(function (c) {
        html += (
          '<div class="list-editor-row" data-item="' + c.id + '">' +
            '<input type="text" data-field="name" value="' + escapeHtml(c.name) + '" />' +
            budgetActualFields(c) +
            '<button class="habit-del" data-del title="Delete">✕</button>' +
          "</div>"
        );
      });
      return html || '<div class="empty-state">No categories yet.</div>';
    }
    return (
      '<div class="panel" style="margin-top:16px;">' +
        '<h3>Fixed expenses</h3>' +
        '<div class="habit-toolbar" style="margin-top:12px;"><input type="text" id="new-budget-fixed" placeholder="Category name" /><button id="add-budget-fixed">Add</button></div>' +
        '<div class="list-editor" id="budget-fixed-list">' + group(fixed) + "</div>" +
      "</div>" +
      '<div class="panel" style="margin-top:16px;">' +
        '<h3>Variable expenses</h3>' +
        '<div class="habit-toolbar" style="margin-top:12px;"><input type="text" id="new-budget-variable" placeholder="Category name" /><button id="add-budget-variable">Add</button></div>' +
        '<div class="list-editor" id="budget-variable-list">' + group(variable) + "</div>" +
      "</div>"
    );
  }

  function bindFinanceBudget() {
    var fixedList = document.getElementById("budget-fixed-list");
    var varList = document.getElementById("budget-variable-list");
    [fixedList, varList].forEach(function (container) {
      if (!container) return;
      container.querySelectorAll("[data-item]").forEach(function (row) {
        var id = row.dataset.item;
        var nameEl = row.querySelector('[data-field="name"]');
        if (nameEl) nameEl.addEventListener("input", function () {
          var c = state.budgetCategories.find(function (x) { return x.id === id; });
          if (c) { c.name = nameEl.value; saveState(); }
        });
        var del = row.querySelector("[data-del]");
        if (del) del.addEventListener("click", function () {
          state.budgetCategories = state.budgetCategories.filter(function (x) { return x.id !== id; });
          saveState();
          render();
        });
      });
      bindBudgetActualFields(container, state.budgetCategories);
    });
    var addFixed = document.getElementById("add-budget-fixed");
    if (addFixed) addFixed.addEventListener("click", function () {
      var input = document.getElementById("new-budget-fixed");
      var val = input.value.trim();
      if (!val) return;
      state.budgetCategories.push({ id: uid(), name: val, type: "fixed", budget: 0, actual: 0 });
      saveState();
      render();
    });
    var addVar = document.getElementById("add-budget-variable");
    if (addVar) addVar.addEventListener("click", function () {
      var input = document.getElementById("new-budget-variable");
      var val = input.value.trim();
      if (!val) return;
      state.budgetCategories.push({ id: uid(), name: val, type: "variable", budget: 0, actual: 0 });
      saveState();
      render();
    });
  }

  function renderFinanceSavings() {
    var cards = "";
    state.savingsGoals.forEach(function (g) {
      var totalSaved = g.contributions.reduce(function (s, c) { return s + (parseFloat(c.amount) || 0); }, 0);
      var pct = g.targetAmount > 0 ? Math.min(100, Math.round((totalSaved / g.targetAmount) * 100)) : 0;
      cards += (
        '<div class="card" data-savings-card="' + g.id + '">' +
          '<button class="habit-del" style="align-self:flex-end;" data-del-savings="' + g.id + '" title="Delete savings goal">✕</button>' +
          '<input type="text" class="title-input" data-field="name" data-savings="' + g.id + '" placeholder="Savings goal" value="' + escapeHtml(g.name || "") + '" />' +
          '<div class="field-grid-2">' +
            '<div><span class="field-label">Target amount</span><input type="number" min="0" step="0.01" data-field="targetAmount" data-savings="' + g.id + '" value="' + (g.targetAmount || 0) + '" /></div>' +
            '<div><span class="field-label">Target date</span><input type="date" data-field="targetDate" data-savings="' + g.id + '" value="' + escapeHtml(g.targetDate || "") + '" /></div>' +
          "</div>" +
          '<div class="progress-bar" style="margin-top:10px;"><div style="width:' + pct + '%"></div></div>' +
          '<div class="sub" style="margin-top:4px;">$' + totalSaved.toFixed(2) + " of $" + (parseFloat(g.targetAmount) || 0).toFixed(2) + "</div>" +
          '<span class="field-label" style="margin-top:10px;">Contributions</span>' +
          '<div class="habit-toolbar" style="margin-top:6px;"><button data-add-contribution="' + g.id + '">Add contribution</button></div>' +
          '<div class="list-editor" data-contrib-list="' + g.id + '">' + listEditorHtml(g.contributions, [
            { key: "date", placeholder: "Date", type: "date" },
            { key: "amount", placeholder: "Amount", type: "number" },
            { key: "note", placeholder: "Note" }
          ]) + "</div>" +
        "</div>"
      );
    });
    return (
      '<div class="habit-toolbar" style="max-width:260px;margin-top:16px;"><button id="add-savings-goal" style="width:100%;">Add a savings goal</button></div>' +
      '<div class="grid-3">' + (cards || '<div class="empty-state">No savings goals yet.</div>') + "</div>"
    );
  }

  function bindFinanceSavings() {
    var addBtn = document.getElementById("add-savings-goal");
    if (addBtn) addBtn.addEventListener("click", function () {
      state.savingsGoals.push({ id: uid(), name: "", targetAmount: 0, targetDate: "", contributions: [] });
      saveState();
      render();
    });
    document.querySelectorAll("[data-field][data-savings]").forEach(function (el) {
      el.addEventListener("input", function () {
        var g = state.savingsGoals.find(function (x) { return x.id === el.dataset.savings; });
        if (!g) return;
        var field = el.dataset.field;
        g[field] = field === "targetAmount" ? (parseFloat(el.value) || 0) : el.value;
        saveState();
        if (field === "targetAmount") render();
      });
    });
    document.querySelectorAll("[data-del-savings]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.savingsGoals = state.savingsGoals.filter(function (x) { return x.id !== el.dataset.delSavings; });
        saveState();
        render();
      });
    });
    document.querySelectorAll("[data-add-contribution]").forEach(function (el) {
      el.addEventListener("click", function () {
        var g = state.savingsGoals.find(function (x) { return x.id === el.dataset.addContribution; });
        if (g) { g.contributions.push({ id: uid(), date: "", amount: 0, note: "" }); saveState(); render(); }
      });
    });
    state.savingsGoals.forEach(function (g) {
      var card = document.querySelector('[data-savings-card="' + g.id + '"]');
      if (!card) return;
      var contribList = card.querySelector('[data-contrib-list="' + g.id + '"]');
      bindListEditor(contribList, g.contributions);
      if (contribList) contribList.querySelectorAll('[data-field="amount"]').forEach(function (el) {
        el.addEventListener("input", function () { render(); });
      });
    });
  }

  function renderFinanceBills() {
    var rows = "";
    state.bills.forEach(function (b) {
      rows += (
        '<div class="list-editor-row" data-item="' + b.id + '">' +
          '<input type="text" data-field="name" placeholder="Bill" value="' + escapeHtml(b.name || "") + '" />' +
          '<input type="date" data-field="dueDate" value="' + escapeHtml(b.dueDate || "") + '" />' +
          budgetActualFields(b) +
          '<label class="check-field"><input type="checkbox" data-field="paid" ' + (b.paid ? "checked" : "") + ' /> Paid</label>' +
          '<button class="habit-del" data-del title="Delete">✕</button>' +
        "</div>"
      );
    });
    return (
      '<div class="panel" style="margin-top:16px;">' +
        '<h3>Bills</h3>' +
        '<div class="habit-toolbar" style="margin-top:12px;"><input type="text" id="new-bill-name" placeholder="Bill name" /><button id="add-bill">Add</button></div>' +
        '<div class="list-editor" id="bills-list">' + (rows || '<div class="empty-state">No bills yet.</div>') + "</div>" +
      "</div>"
    );
  }

  function bindFinanceBills() {
    var container = document.getElementById("bills-list");
    if (container) {
      container.querySelectorAll("[data-item]").forEach(function (row) {
        var id = row.dataset.item;
        row.querySelectorAll('[data-field="name"], [data-field="dueDate"]').forEach(function (el) {
          el.addEventListener("input", function () {
            var b = state.bills.find(function (x) { return x.id === id; });
            if (b) { b[el.dataset.field] = el.value; saveState(); }
          });
        });
        var paidEl = row.querySelector('[data-field="paid"]');
        if (paidEl) paidEl.addEventListener("change", function () {
          var b = state.bills.find(function (x) { return x.id === id; });
          if (b) { b.paid = paidEl.checked; saveState(); }
        });
        var del = row.querySelector("[data-del]");
        if (del) del.addEventListener("click", function () {
          state.bills = state.bills.filter(function (x) { return x.id !== id; });
          saveState();
          render();
        });
      });
      bindBudgetActualFields(container, state.bills);
    }
    var addBtn = document.getElementById("add-bill");
    if (addBtn) addBtn.addEventListener("click", function () {
      var input = document.getElementById("new-bill-name");
      var val = input.value.trim();
      if (!val) return;
      state.bills.push({ id: uid(), name: val, dueDate: "", budget: 0, actual: 0, paid: false });
      saveState();
      render();
    });
  }

  function renderFinanceDebt() {
    var rows = "";
    state.debts.forEach(function (d) {
      rows += (
        '<div class="list-editor-row" data-item="' + d.id + '">' +
          '<input type="text" data-field="name" placeholder="Debt" value="' + escapeHtml(d.name || "") + '" />' +
          '<input type="number" min="0" step="0.01" data-field="amount" placeholder="Original amount" value="' + (d.amount || 0) + '" />' +
          '<input type="number" min="0" step="0.01" data-field="balance" placeholder="Remaining balance" value="' + (d.balance || 0) + '" />' +
          '<button class="habit-del" data-del title="Delete">✕</button>' +
        "</div>"
      );
    });
    return (
      '<div class="panel" style="margin-top:16px;">' +
        '<h3>Debt</h3>' +
        '<div class="habit-toolbar" style="margin-top:12px;"><input type="text" id="new-debt-name" placeholder="Debt name" /><button id="add-debt">Add</button></div>' +
        '<div class="list-editor" id="debt-list">' + (rows || '<div class="empty-state">No debts tracked.</div>') + "</div>" +
      "</div>"
    );
  }

  function bindFinanceDebt() {
    bindListEditor(document.getElementById("debt-list"), state.debts);
    var addBtn = document.getElementById("add-debt");
    if (addBtn) addBtn.addEventListener("click", function () {
      var input = document.getElementById("new-debt-name");
      var val = input.value.trim();
      if (!val) return;
      state.debts.push({ id: uid(), name: val, amount: 0, balance: 0 });
      saveState();
      render();
    });
  }

  /* ---- notes ---- */

  var NOTES_TABS = [{ id: "sticky", label: "Sticky Notes" }, { id: "pages", label: "Notebook Pages" }];

  function renderNotes(param) {
    var view = param === "pages" ? "pages" : "sticky";
    var tabs = subtabsHtml(NOTES_TABS.map(function (t) { return { label: t.label, href: "#/notes/" + t.id, active: t.id === view }; }));
    var head = '<div class="view-head"><div><h1>Notes</h1><div class="sub">Loose pages, kept together</div></div></div>' + tabs;
    if (view === "pages") return head + renderNotebookPages();
    return head + renderNotesSticky();
  }

  function bindNotes(param) {
    bindSubtabs();
    if (param === "pages") bindNotebookPages();
    else bindNotesSticky();
  }

  function renderNotesSticky() {
    var cards = "";
    state.notes.forEach(function (n) {
      var tints = "";
      TINTS.forEach(function (t) {
        tints += '<button class="tint-dot' + (n.tint === t ? " active" : "") + '" data-tint="' + t + '" data-note="' + n.id + '" style="background:' + tintColor(t) + '"></button>';
      });
      cards += (
        '<div class="sticky" style="background:' + tintBg(n.tint) + ';" data-note-card="' + n.id + '">' +
          '<button class="note-del" data-del-note="' + n.id + '" title="Delete note">✕</button>' +
          '<input type="text" class="note-title" data-field="title" data-note="' + n.id + '" placeholder="Note title" value="' + escapeHtml(n.title || "") + '" />' +
          '<textarea class="note-body" data-field="body" data-note="' + n.id + '" placeholder="Write a note…">' + escapeHtml(n.body || "") + "</textarea>" +
          '<div class="tint-row">' + tints + "</div>" +
        "</div>"
      );
    });
    return (
      '<div class="notes-toolbar" style="margin-top:16px;"><button id="add-note">Write a note</button></div>' +
      '<div class="notes-grid">' + (cards || '<div class="empty-state">No notes yet.</div>') + "</div>"
    );
  }

  function tintColor(t) {
    return t === "card" ? "var(--card-2)" : "var(--swatch-" + t + ")";
  }
  function tintBg(t) {
    return t === "card" ? "var(--card-2)" : "var(--swatch-" + t + "-wash)";
  }

  function bindNotesSticky() {
    var addBtn = document.getElementById("add-note");
    if (addBtn) addBtn.addEventListener("click", function () {
      state.notes.unshift({ id: uid(), title: "", body: "", tint: "card" });
      saveState();
      render();
    });
    document.querySelectorAll(".note-title, .note-body").forEach(function (el) {
      el.addEventListener("input", function () {
        var n = state.notes.find(function (x) { return x.id === el.dataset.note; });
        if (n) { n[el.dataset.field] = el.value; saveState(); }
      });
    });
    document.querySelectorAll("[data-tint]").forEach(function (el) {
      el.addEventListener("click", function () {
        var n = state.notes.find(function (x) { return x.id === el.dataset.note; });
        if (n) { n.tint = el.dataset.tint; saveState(); render(); }
      });
    });
    document.querySelectorAll("[data-del-note]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.notes = state.notes.filter(function (x) { return x.id !== el.dataset.delNote; });
        saveState();
        render();
      });
    });
  }

  var PAPER_STYLES = ["blank", "lined", "grid", "dot"];
  var SECTION_ALL = "__all__";
  var SECTION_NONE = "__none__";
  var notebookActiveSection = SECTION_ALL;

  function renderNotebookPages() {
    var sections = {};
    var order = [];
    state.notebookPages.forEach(function (p) {
      var key = p.sectionLabel || "";
      if (!sections[key]) { sections[key] = []; order.push(key); }
      sections[key].push(p);
    });
    var namedSections = order.filter(function (k) { return k; }).sort(function (a, b) { return a.localeCompare(b); });
    var hasUnsectioned = !!sections[""];

    // if the active filter no longer corresponds to a real section (renamed/deleted), fall back to All
    if (notebookActiveSection !== SECTION_ALL && notebookActiveSection !== SECTION_NONE && namedSections.indexOf(notebookActiveSection) === -1) {
      notebookActiveSection = SECTION_ALL;
    }
    if (notebookActiveSection === SECTION_NONE && !hasUnsectioned) {
      notebookActiveSection = SECTION_ALL;
    }

    var datalistHtml = '<datalist id="section-options">' + namedSections.map(function (s) { return '<option value="' + escapeHtml(s) + '"></option>'; }).join("") + "</datalist>";

    function pageCard(p) {
      var paperPills = "";
      PAPER_STYLES.forEach(function (ps) {
        paperPills += '<button class="status-pill' + (p.paper === ps ? " active" : "") + '" data-paper="' + ps + '" data-page="' + p.id + '">' + ps + "</button>";
      });
      return (
        '<div class="card" data-page-card="' + p.id + '">' +
          '<button class="habit-del" style="align-self:flex-end;" data-del-page="' + p.id + '" title="Delete page">✕</button>' +
          '<input type="text" class="title-input" data-field="title" data-page="' + p.id + '" placeholder="Page title" value="' + escapeHtml(p.title || "") + '" />' +
          '<div class="field-grid-2">' +
            '<input type="date" data-field="date" data-page="' + p.id + '" value="' + escapeHtml(p.date || "") + '" />' +
            '<input type="text" data-field="sectionLabel" data-page="' + p.id + '" list="section-options" placeholder="Section (optional)" value="' + escapeHtml(p.sectionLabel || "") + '" />' +
          "</div>" +
          '<div class="status-row" style="margin-top:8px;">' + paperPills + "</div>" +
          '<textarea rows="8" class="notebook-paper paper-' + (p.paper || "blank") + '" data-field="content" data-page="' + p.id + '" placeholder="Write…" style="margin-top:8px;">' + escapeHtml(p.content || "") + "</textarea>" +
        "</div>"
      );
    }

    var chipsHtml = "";
    if (namedSections.length || hasUnsectioned) {
      chipsHtml += '<div class="subtabs" id="notebook-section-chips">';
      chipsHtml += '<button class="subtab-pill' + (notebookActiveSection === SECTION_ALL ? " active" : "") + '" data-section-filter="' + SECTION_ALL + '">All (' + state.notebookPages.length + ")</button>";
      namedSections.forEach(function (s) {
        chipsHtml += '<button class="subtab-pill' + (notebookActiveSection === s ? " active" : "") + '" data-section-filter="' + escapeHtml(s) + '">' + escapeHtml(s) + " (" + sections[s].length + ")</button>";
      });
      if (hasUnsectioned) {
        chipsHtml += '<button class="subtab-pill' + (notebookActiveSection === SECTION_NONE ? " active" : "") + '" data-section-filter="' + SECTION_NONE + '">No section (' + sections[""].length + ")</button>";
      }
      chipsHtml += "</div>";
    }

    var html = "";
    if (notebookActiveSection === SECTION_ALL) {
      order.forEach(function (key) {
        if (key) html += "<h2 style=\"margin:22px 0 12px;\">" + escapeHtml(key) + "</h2>";
        html += '<div class="grid-3">' + sections[key].map(pageCard).join("") + "</div>";
      });
    } else {
      var activeKey = notebookActiveSection === SECTION_NONE ? "" : notebookActiveSection;
      var pages = sections[activeKey] || [];
      html += '<div class="grid-3">' + pages.map(pageCard).join("") + "</div>";
    }

    return (
      datalistHtml +
      '<div class="habit-toolbar" style="max-width:260px;margin-top:16px;"><button id="add-page" style="width:100%;">Add a page</button></div>' +
      chipsHtml +
      (html || '<div class="empty-state">No pages yet.</div>')
    );
  }

  function bindNotebookPages() {
    var addBtn = document.getElementById("add-page");
    if (addBtn) addBtn.addEventListener("click", function () {
      var sec = (notebookActiveSection !== SECTION_ALL && notebookActiveSection !== SECTION_NONE) ? notebookActiveSection : "";
      state.notebookPages.unshift({ id: uid(), sectionLabel: sec, title: "", date: "", paper: "blank", content: "" });
      saveState();
      render();
    });
    document.querySelectorAll("[data-section-filter]").forEach(function (el) {
      el.addEventListener("click", function () {
        notebookActiveSection = el.dataset.sectionFilter;
        render();
      });
    });
    document.querySelectorAll("[data-field][data-page]").forEach(function (el) {
      el.addEventListener("input", function () {
        var p = state.notebookPages.find(function (x) { return x.id === el.dataset.page; });
        if (!p) return;
        var field = el.dataset.field;
        p[field] = el.value;
        saveState();
      });
      if (el.dataset.field === "sectionLabel") {
        el.addEventListener("change", function () { render(); });
      }
    });
    document.querySelectorAll("[data-paper]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = state.notebookPages.find(function (x) { return x.id === el.dataset.page; });
        if (p) { p.paper = el.dataset.paper; saveState(); render(); }
      });
    });
    document.querySelectorAll("[data-del-page]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.notebookPages = state.notebookPages.filter(function (x) { return x.id !== el.dataset.delPage; });
        saveState();
        render();
      });
    });
  }

  /* ---- meal planner ---- */

  function renderMeals(param) {
    param = param || ("grid-" + weekIndexForToday());
    var view = "grid";
    var weekIdx = weekIndexForToday();
    if (param.indexOf("grid-") === 0) { weekIdx = clampWeek(param.slice(5)); }
    else if (param === "grocery") view = "grocery";
    else if (param === "recipes") view = "recipes";

    var tabs = subtabsHtml([
      { label: "Weekly Grid", href: "#/meals/grid-" + weekIdx, active: view === "grid" },
      { label: "Grocery List", href: "#/meals/grocery", active: view === "grocery" },
      { label: "Recipes", href: "#/meals/recipes", active: view === "recipes" }
    ]);
    var head = '<div class="view-head"><div><h1>Meal Planner</h1><div class="sub">Plan meals, shop smart, keep favorite recipes</div></div></div>' + tabs;
    if (view === "grid") return head + renderMealsGrid(weekIdx);
    if (view === "grocery") return head + renderGroceryList();
    return head + renderRecipeBox();
  }

  function renderMealsGrid(weekIdx) {
    var wk = WEEKS[weekIdx - 1];
    var mdata = getMealsWeek(weekIdx);
    var cols = "";
    wk.days.forEach(function (dd, i) {
      var md = mdata[i];
      var fields = "";
      MEAL_FIELDS.forEach(function (mf) {
        fields += '<div><span class="field-label">' + mf.label + '</span><input type="text" data-meal-field="' + mf.id + '" data-day="' + i + '" value="' + escapeHtml(md[mf.id] || "") + '" /></div>';
      });
      cols += '<div class="card meal-day-card"><div class="meal-day-head">' + DOW_ABBR[i] + " · " + MONTH_ABBR[dd.m] + " " + dd.d + "</div>" + fields + "</div>";
    });
    return (
      '<div class="nav-strip" style="margin:16px 0;">' +
        '<button id="meals-week-prev" ' + (weekIdx === 1 ? "disabled" : "") + '>‹</button>' +
        '<span class="label">Week ' + weekIdx + "</span>" +
        '<button id="meals-week-next" ' + (weekIdx === WEEKS.length ? "disabled" : "") + '>›</button>' +
      "</div>" +
      '<div class="meal-week-grid">' + cols + "</div>"
    );
  }

  function renderGroceryList() {
    var groups = "";
    GROCERY_CATEGORIES.forEach(function (cat) {
      var items = state.groceryList.filter(function (it) { return it.category === cat; });
      groups += (
        '<div class="card" style="margin-bottom:14px;">' +
          "<h3>" + cat + "</h3>" +
          '<div class="habit-toolbar" style="margin-top:10px;">' +
            '<input type="text" class="new-grocery-item" placeholder="Add item" />' +
            '<button class="add-grocery-item" data-cat="' + escapeHtml(cat) + '">Add</button>' +
          "</div>" +
          checklistHtml(items) +
        "</div>"
      );
    });
    return '<div id="grocery-groups" style="margin-top:16px;">' + groups + "</div>";
  }

  var DIETARY_TAGS = [
    { id: "vegetarian", label: "Vegetarian" }, { id: "vegan", label: "Vegan" },
    { id: "glutenFree", label: "Gluten-free" }, { id: "dairyFree", label: "Dairy-free" },
    { id: "lowCarb", label: "Low-carb" }, { id: "lowCalorie", label: "Low-calorie" }
  ];

  function normalizeRecipe(r) {
    if (!r.ingredients) r.ingredients = [];
    if (r.directions === undefined) r.directions = "";
    if (!r.dietaryTags) r.dietaryTags = { vegetarian: false, vegan: false, glutenFree: false, dairyFree: false, lowCarb: false, lowCalorie: false };
    if (r.prepTime === undefined) r.prepTime = "";
    if (r.cookTime === undefined) r.cookTime = "";
    if (r.cookTemp === undefined) r.cookTemp = "";
    if (r.calories === undefined) r.calories = "";
    if (r.serves === undefined) r.serves = "";
    if (r.rating === undefined) r.rating = 0;
    if (r.difficulty === undefined) r.difficulty = "";
    if (r.tips === undefined) r.tips = "";
    if (r.date === undefined) r.date = "";
    return r;
  }

  function renderRecipeBox() {
    var cards = "";
    state.recipes.forEach(function (r) {
      normalizeRecipe(r);
      var expandId = "recipe-expand-" + r.id;
      var tagPills = "";
      DIETARY_TAGS.forEach(function (t) {
        tagPills += '<button class="status-pill' + (r.dietaryTags[t.id] ? " active" : "") + '" data-diet="' + t.id + '" data-recipe="' + r.id + '">' + t.label + "</button>";
      });
      cards += (
        '<div class="card book-card" data-recipe-card="' + r.id + '">' +
          '<button class="habit-del" style="align-self:flex-end;" data-del-recipe="' + r.id + '" title="Delete recipe">✕</button>' +
          '<input type="text" class="title-input" data-field="title" data-recipe="' + r.id + '" placeholder="Recipe title" value="' + escapeHtml(r.title || "") + '" />' +
          '<input type="date" class="line-input" data-field="date" data-recipe="' + r.id + '" value="' + escapeHtml(r.date) + '" />' +
          starsHtml(r.rating, "rate", r.id) +
          '<button class="card-expand-toggle' + expandClass(expandId) + '" data-expand-toggle="' + expandId + '">' + icon("chevron") + " More details</button>" +
          '<div class="card-expand-body' + expandClass(expandId) + '" id="' + expandId + '">' +
            '<span class="field-label">Ingredients (one per line)</span>' +
            '<textarea rows="4" data-field="ingredients" data-recipe="' + r.id + '">' + escapeHtml((r.ingredients || []).join("\n")) + "</textarea>" +
            '<span class="field-label" style="margin-top:10px;">Directions</span>' +
            '<textarea rows="4" data-field="directions" data-recipe="' + r.id + '">' + escapeHtml(r.directions) + "</textarea>" +
            '<div class="field-grid-2" style="margin-top:10px;">' +
              '<input type="text" data-field="prepTime" data-recipe="' + r.id + '" placeholder="Prep time" value="' + escapeHtml(r.prepTime) + '" />' +
              '<input type="text" data-field="cookTime" data-recipe="' + r.id + '" placeholder="Cook time" value="' + escapeHtml(r.cookTime) + '" />' +
              '<input type="text" data-field="cookTemp" data-recipe="' + r.id + '" placeholder="Cook temp" value="' + escapeHtml(r.cookTemp) + '" />' +
              '<input type="number" min="0" data-field="calories" data-recipe="' + r.id + '" placeholder="Calories" value="' + escapeHtml(r.calories) + '" />' +
              '<input type="text" data-field="serves" data-recipe="' + r.id + '" placeholder="Serves" value="' + escapeHtml(r.serves) + '" />' +
              '<input type="text" data-field="difficulty" data-recipe="' + r.id + '" placeholder="Difficulty" value="' + escapeHtml(r.difficulty) + '" />' +
            "</div>" +
            '<span class="field-label" style="margin-top:10px;">Dietary tags</span>' +
            '<div class="status-row" style="margin-top:6px;flex-wrap:wrap;">' + tagPills + "</div>" +
            '<span class="field-label" style="margin-top:10px;">Tips</span>' +
            '<textarea rows="2" data-field="tips" data-recipe="' + r.id + '">' + escapeHtml(r.tips) + "</textarea>" +
          "</div>" +
        "</div>"
      );
    });
    return (
      '<div class="habit-toolbar" style="max-width:260px;margin-top:16px;"><button id="add-recipe" style="width:100%;">Add a recipe</button></div>' +
      '<div class="grid-3">' + (cards || '<div class="empty-state">No recipes yet — add one above.</div>') + "</div>"
    );
  }

  function bindMeals(param) {
    bindSubtabs();
    param = param || ("grid-" + weekIndexForToday());
    if (param.indexOf("grid-") === 0) bindMealsGrid(clampWeek(param.slice(5)));
    else if (param === "grocery") bindGroceryList();
    else if (param === "recipes") bindRecipeBox();
  }

  function bindMealsGrid(weekIdx) {
    var mdata = getMealsWeek(weekIdx);
    var prev = document.getElementById("meals-week-prev");
    var next = document.getElementById("meals-week-next");
    if (prev) prev.addEventListener("click", function () { if (weekIdx > 1) go("#/meals/grid-" + (weekIdx - 1)); });
    if (next) next.addEventListener("click", function () { if (weekIdx < WEEKS.length) go("#/meals/grid-" + (weekIdx + 1)); });
    document.querySelectorAll("[data-meal-field]").forEach(function (el) {
      el.addEventListener("input", function () {
        mdata[el.dataset.day][el.dataset.mealField] = el.value;
        saveState();
      });
    });
  }

  function bindGroceryList() {
    document.querySelectorAll(".add-grocery-item").forEach(function (el) {
      el.addEventListener("click", function () {
        var input = el.parentElement.querySelector(".new-grocery-item");
        var val = input.value.trim();
        if (!val) return;
        state.groceryList.push({ id: uid(), category: el.dataset.cat, text: val, done: false });
        saveState();
        render();
      });
    });
    document.querySelectorAll(".new-grocery-item").forEach(function (input) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          var btn = input.parentElement.querySelector(".add-grocery-item");
          if (btn) btn.click();
        }
      });
    });
    bindChecklist(document.getElementById("grocery-groups"), state.groceryList);
  }

  function bindRecipeBox() {
    var addBtn = document.getElementById("add-recipe");
    if (addBtn) addBtn.addEventListener("click", function () {
      state.recipes.push(normalizeRecipe({ id: uid(), title: "" }));
      saveState();
      render();
    });
    document.querySelectorAll("[data-field][data-recipe]").forEach(function (el) {
      el.addEventListener("input", function () {
        var r = state.recipes.find(function (x) { return x.id === el.dataset.recipe; });
        if (!r) return;
        var field = el.dataset.field;
        if (field === "ingredients") r[field] = el.value.split("\n");
        else if (field === "calories") r[field] = parseInt(el.value, 10) || 0;
        else r[field] = el.value;
        saveState();
      });
    });
    document.querySelectorAll("[data-diet]").forEach(function (el) {
      el.addEventListener("click", function () {
        var r = state.recipes.find(function (x) { return x.id === el.dataset.recipe; });
        if (r) { r.dietaryTags[el.dataset.diet] = !r.dietaryTags[el.dataset.diet]; saveState(); render(); }
      });
    });
    document.querySelectorAll("[data-del-recipe]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.recipes = state.recipes.filter(function (x) { return x.id !== el.dataset.delRecipe; });
        saveState();
        render();
      });
    });
    state.recipes.forEach(function (r) {
      var card = document.querySelector('[data-recipe-card="' + r.id + '"]');
      if (!card) return;
      bindStars(card.querySelector(".star-row"), "rate", function (v) { r.rating = v; saveState(); render(); });
    });
    bindExpandToggles();
  }

  /* ---- travel planner ---- */

  function renderTravel() {
    var bucket = checklistHtml(state.travelBucketList);
    var packing = checklistHtml(state.travelChecklist);
    var destCards = "";
    state.destinations.forEach(function (d) {
      destCards += (
        '<div class="card" data-dest-card="' + d.id + '">' +
          '<button class="habit-del" style="align-self:flex-end;" data-del-dest="' + d.id + '" title="Delete destination">✕</button>' +
          '<input type="text" class="title-input" data-field="destination" data-dest="' + d.id + '" placeholder="Destination" value="' + escapeHtml(d.destination || "") + '" />' +
          '<input type="text" class="line-input" data-field="countryCity" data-dest="' + d.id + '" placeholder="Country / City" value="' + escapeHtml(d.countryCity || "") + '" />' +
          '<span class="field-label" style="margin-top:8px;">Priority</span>' +
          starsHtml(d.priority, "rate", d.id) +
          '<textarea rows="2" data-field="why" data-dest="' + d.id + '" placeholder="Why here?" style="margin-top:8px;">' + escapeHtml(d.why || "") + "</textarea>" +
          '<input type="text" data-field="bestTime" data-dest="' + d.id + '" placeholder="Best time to go" value="' + escapeHtml(d.bestTime || "") + '" style="margin-top:8px;" />' +
          '<textarea rows="2" data-field="notes" data-dest="' + d.id + '" placeholder="Notes" style="margin-top:8px;">' + escapeHtml(d.notes || "") + "</textarea>" +
        "</div>"
      );
    });
    return (
      '<div class="view-head"><div><h1>Travel Planner</h1><div class="sub">Where to next</div></div></div>' +
      '<div class="grid-2">' +
        '<div class="panel"><h3>Travel bucket list</h3>' +
          '<div class="habit-toolbar" style="margin-top:12px;"><input type="text" id="new-travel-bucket" placeholder="Add a place or experience" /><button id="add-travel-bucket">Add</button></div>' +
          '<div id="travel-bucket-list">' + bucket + "</div>" +
        "</div>" +
        '<div class="panel"><h3>Packing &amp; documents checklist</h3>' +
          '<div class="habit-toolbar" style="margin-top:12px;"><input type="text" id="new-travel-check" placeholder="Add an item" /><button id="add-travel-check">Add</button></div>' +
          '<div id="travel-checklist-list">' + packing + "</div>" +
        "</div>" +
      "</div>" +
      '<div class="view-head" style="margin-top:24px;"><div><h2>Destinations</h2></div></div>' +
      '<div class="habit-toolbar" style="max-width:260px;"><button id="add-destination" style="width:100%;">Add a destination</button></div>' +
      '<div class="grid-3" style="margin-top:16px;">' + (destCards || '<div class="empty-state">No destinations yet.</div>') + "</div>"
    );
  }

  function bindTravel() {
    bindChecklistAdd("add-travel-bucket", "new-travel-bucket", state.travelBucketList);
    bindChecklist(document.getElementById("travel-bucket-list"), state.travelBucketList);
    bindChecklistAdd("add-travel-check", "new-travel-check", state.travelChecklist);
    bindChecklist(document.getElementById("travel-checklist-list"), state.travelChecklist);
    var addDest = document.getElementById("add-destination");
    if (addDest) addDest.addEventListener("click", function () {
      state.destinations.push({ id: uid(), destination: "", countryCity: "", why: "", bestTime: "", priority: 0, notes: "" });
      saveState();
      render();
    });
    document.querySelectorAll("[data-field][data-dest]").forEach(function (el) {
      el.addEventListener("input", function () {
        var d = state.destinations.find(function (x) { return x.id === el.dataset.dest; });
        if (d) { d[el.dataset.field] = el.value; saveState(); }
      });
    });
    document.querySelectorAll("[data-del-dest]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.destinations = state.destinations.filter(function (x) { return x.id !== el.dataset.delDest; });
        saveState();
        render();
      });
    });
    state.destinations.forEach(function (d) {
      var card = document.querySelector('[data-dest-card="' + d.id + '"]');
      if (!card) return;
      bindStars(card.querySelector(".star-row"), "rate", function (v) { d.priority = v; saveState(); render(); });
    });
  }

  /* ---- fitness & wellness ---- */

  var FITNESS_TABS = [
    { id: "workouts", label: "Workouts" }, { id: "measurements", label: "Body Measurements" },
    { id: "cycle", label: "Cycle Tracker" }, { id: "doctor", label: "Doctor Questions" }
  ];

  function renderFitness(param) {
    param = param || "workouts";
    var view = param.indexOf("cycle") === 0 ? "cycle" : (FITNESS_TABS.some(function (t) { return t.id === param; }) ? param : "workouts");
    var monthIdx = view === "cycle" ? clampMonth(param.indexOf("cycle-") === 0 ? param.slice(6) : (now.getFullYear() === YEAR ? now.getMonth() : 0)) : 0;
    var tabs = subtabsHtml(FITNESS_TABS.map(function (t) {
      return { label: t.label, href: t.id === "cycle" ? "#/fitness/cycle-" + monthIdx : "#/fitness/" + t.id, active: t.id === view };
    }));
    var head = '<div class="view-head"><div><h1>Fitness &amp; Wellness</h1><div class="sub">Movement, measurements, and cycle awareness</div></div></div>' + tabs;
    if (view === "measurements") return head + renderFitnessMeasurements();
    if (view === "cycle") return head + renderFitnessCycle(monthIdx);
    if (view === "doctor") return head + renderFitnessDoctor();
    return head + renderFitnessWorkouts();
  }

  function bindFitness(param) {
    bindSubtabs();
    param = param || "workouts";
    var view = param.indexOf("cycle") === 0 ? "cycle" : (FITNESS_TABS.some(function (t) { return t.id === param; }) ? param : "workouts");
    if (view === "measurements") bindFitnessMeasurements();
    else if (view === "cycle") bindFitnessCycle(clampMonth(param.indexOf("cycle-") === 0 ? param.slice(6) : (now.getFullYear() === YEAR ? now.getMonth() : 0)));
    else if (view === "doctor") bindFitnessDoctor();
    else bindFitnessWorkouts();
  }

  function renderFitnessWorkouts() {
    var cards = "";
    state.workouts.forEach(function (w) {
      cards += (
        '<div class="card" data-workout-card="' + w.id + '">' +
          '<button class="habit-del" style="align-self:flex-end;" data-del-workout="' + w.id + '" title="Delete workout">✕</button>' +
          '<div class="field-grid-2">' +
            '<input type="date" data-field="date" data-workout="' + w.id + '" value="' + escapeHtml(w.date || "") + '" />' +
            '<input type="text" data-field="activity" data-workout="' + w.id + '" placeholder="Activity" value="' + escapeHtml(w.activity || "") + '" />' +
            '<input type="text" data-field="duration" data-workout="' + w.id + '" placeholder="Duration" value="' + escapeHtml(w.duration || "") + '" />' +
            '<input type="number" min="1" max="10" data-field="rpe" data-workout="' + w.id + '" placeholder="RPE (1-10)" value="' + (w.rpe || "") + '" />' +
          "</div>" +
          '<textarea rows="2" data-field="detail" data-workout="' + w.id + '" placeholder="Sets / reps / weight" style="margin-top:8px;">' + escapeHtml(w.detail || "") + "</textarea>" +
          '<textarea rows="2" data-field="notes" data-workout="' + w.id + '" placeholder="Notes" style="margin-top:8px;">' + escapeHtml(w.notes || "") + "</textarea>" +
        "</div>"
      );
    });
    return (
      '<div class="habit-toolbar" style="max-width:260px;margin-top:16px;"><button id="add-workout" style="width:100%;">Log a workout</button></div>' +
      '<div class="grid-3">' + (cards || '<div class="empty-state">No workouts logged yet.</div>') + "</div>"
    );
  }

  function bindFitnessWorkouts() {
    var addBtn = document.getElementById("add-workout");
    if (addBtn) addBtn.addEventListener("click", function () {
      state.workouts.unshift({ id: uid(), date: "", activity: "", duration: "", rpe: "", detail: "", notes: "" });
      saveState();
      render();
    });
    document.querySelectorAll("[data-field][data-workout]").forEach(function (el) {
      el.addEventListener("input", function () {
        var w = state.workouts.find(function (x) { return x.id === el.dataset.workout; });
        if (!w) return;
        var field = el.dataset.field;
        w[field] = field === "rpe" ? (parseInt(el.value, 10) || "") : el.value;
        saveState();
      });
    });
    document.querySelectorAll("[data-del-workout]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.workouts = state.workouts.filter(function (x) { return x.id !== el.dataset.delWorkout; });
        saveState();
        render();
      });
    });
  }

  function renderFitnessMeasurements() {
    var cards = "";
    state.measurements.forEach(function (m) {
      cards += (
        '<div class="card">' +
          '<button class="habit-del" style="align-self:flex-end;" data-del-measurement="' + m.id + '" title="Delete entry">✕</button>' +
          '<input type="date" data-field="date" data-measurement="' + m.id + '" value="' + escapeHtml(m.date || "") + '" />' +
          '<div class="field-grid-2" style="margin-top:8px;">' +
            '<input type="number" min="0" step="0.1" data-field="weight" data-measurement="' + m.id + '" placeholder="Weight" value="' + (m.weight || "") + '" />' +
            '<input type="number" min="0" step="0.1" data-field="waist" data-measurement="' + m.id + '" placeholder="Waist" value="' + (m.waist || "") + '" />' +
            '<input type="number" min="0" step="0.1" data-field="chest" data-measurement="' + m.id + '" placeholder="Chest" value="' + (m.chest || "") + '" />' +
            '<input type="number" min="0" step="0.1" data-field="hips" data-measurement="' + m.id + '" placeholder="Hips" value="' + (m.hips || "") + '" />' +
            '<input type="number" min="0" step="0.1" data-field="arms" data-measurement="' + m.id + '" placeholder="Arms" value="' + (m.arms || "") + '" />' +
          "</div>" +
          '<textarea rows="2" data-field="notes" data-measurement="' + m.id + '" placeholder="Notes" style="margin-top:8px;">' + escapeHtml(m.notes || "") + "</textarea>" +
        "</div>"
      );
    });
    return (
      '<div class="habit-toolbar" style="max-width:260px;margin-top:16px;"><button id="add-measurement" style="width:100%;">Log measurements</button></div>' +
      '<div class="grid-3">' + (cards || '<div class="empty-state">No measurements logged yet.</div>') + "</div>"
    );
  }

  function bindFitnessMeasurements() {
    var addBtn = document.getElementById("add-measurement");
    if (addBtn) addBtn.addEventListener("click", function () {
      state.measurements.unshift({ id: uid(), date: "", weight: "", waist: "", chest: "", hips: "", arms: "", notes: "" });
      saveState();
      render();
    });
    document.querySelectorAll("[data-field][data-measurement]").forEach(function (el) {
      el.addEventListener("input", function () {
        var m = state.measurements.find(function (x) { return x.id === el.dataset.measurement; });
        if (!m) return;
        var field = el.dataset.field;
        m[field] = (field === "date" || field === "notes") ? el.value : (parseFloat(el.value) || "");
        saveState();
      });
    });
    document.querySelectorAll("[data-del-measurement]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.measurements = state.measurements.filter(function (x) { return x.id !== el.dataset.delMeasurement; });
        saveState();
        render();
      });
    });
  }

  function renderFitnessCycle(m) {
    var dim = daysInMonth(YEAR, m);
    var startDow = firstWeekdayMon(YEAR, m);
    var cells = "";
    DOW_ABBR.forEach(function (dl) { cells += '<div class="month-dow">' + dl + "</div>"; });
    for (var i = 0; i < startDow; i++) cells += '<div class="month-cell empty"></div>';
    for (var d = 1; d <= dim; d++) {
      var dow = (startDow + d - 1) % 7;
      var key = dateKey(YEAR, m, d);
      var isW = dow >= 5;
      var isT = isToday(YEAR, m, d);
      var on = !!state.cyclePeriodDays[key];
      cells += (
        '<div class="month-cell' + (isW ? " weekend" : "") + (isT ? " today" : "") + '" data-cycle-day="' + key + '">' +
          '<div class="num">' + d + "</div>" +
          '<div class="dot-row">' + (on ? '<span class="dot" style="width:8px;height:8px;"></span>' : "") + "</div>" +
        "</div>"
      );
    }
    var monthKey = YEAR + "-" + pad(m + 1);
    return (
      '<div class="nav-strip" style="margin:16px 0;">' +
        '<button id="cycle-prev" ' + (m === 0 ? "disabled" : "") + '>‹</button>' +
        '<span class="label">' + MONTH_NAMES[m] + "</span>" +
        '<button id="cycle-next" ' + (m === 11 ? "disabled" : "") + '>›</button>' +
      "</div>" +
      '<div class="grid-2">' +
        '<div class="panel"><h3>Tap a day to mark your period</h3><div class="month-grid">' + cells + "</div></div>" +
        '<div class="panel">' +
          '<span class="field-label">Cycle length this month (days)</span>' +
          '<input type="number" min="0" id="cycle-length" value="' + (state.cycleLengths[monthKey] || "") + '" style="margin-top:6px;" />' +
          '<span class="field-label" style="margin-top:14px;">Notes</span>' +
          '<textarea rows="6" id="cycle-notes" style="margin-top:6px;">' + escapeHtml(state.cycleNotes || "") + "</textarea>" +
        "</div>" +
      "</div>"
    );
  }

  function bindFitnessCycle(m) {
    var prev = document.getElementById("cycle-prev");
    var next = document.getElementById("cycle-next");
    if (prev) prev.addEventListener("click", function () { if (m > 0) go("#/fitness/cycle-" + (m - 1)); });
    if (next) next.addEventListener("click", function () { if (m < 11) go("#/fitness/cycle-" + (m + 1)); });
    document.querySelectorAll("[data-cycle-day]").forEach(function (el) {
      el.addEventListener("click", function () {
        var key = el.dataset.cycleDay;
        if (state.cyclePeriodDays[key]) delete state.cyclePeriodDays[key];
        else state.cyclePeriodDays[key] = true;
        saveState();
        render();
      });
    });
    var lengthEl = document.getElementById("cycle-length");
    if (lengthEl) lengthEl.addEventListener("input", function () {
      var monthKey = YEAR + "-" + pad(m + 1);
      state.cycleLengths[monthKey] = parseInt(lengthEl.value, 10) || 0;
      saveState();
    });
    var notesEl = document.getElementById("cycle-notes");
    if (notesEl) notesEl.addEventListener("input", function () { state.cycleNotes = notesEl.value; saveState(); });
  }

  function renderFitnessDoctor() {
    return (
      '<div class="panel" style="margin-top:16px;">' +
        '<h3>Questions for my doctor</h3>' +
        '<div class="habit-toolbar" style="margin-top:12px;">' +
          '<input type="text" id="new-doctor-question" placeholder="Add a question" />' +
          '<button id="add-doctor-question">Add</button>' +
        "</div>" +
        '<div id="doctor-questions-list">' + checklistHtml(state.doctorQuestions) + "</div>" +
      "</div>"
    );
  }

  function bindFitnessDoctor() {
    bindChecklistAdd("add-doctor-question", "new-doctor-question", state.doctorQuestions);
    bindChecklist(document.getElementById("doctor-questions-list"), state.doctorQuestions);
  }

  /* ---- reflections ---- */

  var REFLECTIONS_TABS = [
    { id: "ikigai", label: "Ikigai" }, { id: "wheel", label: "Wheel of Life" }, { id: "stoic", label: "Stoic Mindset" },
    { id: "inventory", label: "Life Inventory" }, { id: "daily", label: "Daily" }, { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" }, { id: "yearly", label: "Yearly" }, { id: "eisenhower", label: "Eisenhower Matrix" },
    { id: "mindmap", label: "Mind Map" }
  ];

  function reflectionsView(param) {
    param = param || "ikigai";
    if (param.indexOf("daily") === 0) return "daily";
    if (param.indexOf("weekly") === 0) return "weekly";
    if (param.indexOf("monthly") === 0) return "monthly";
    var found = REFLECTIONS_TABS.some(function (t) { return t.id === param; });
    return found ? param : "ikigai";
  }

  function renderReflections(param) {
    var view = reflectionsView(param);
    var dayKey = param && param.indexOf("daily-") === 0 ? param.slice(6) : clampDayKey();
    var weekIdx = param && param.indexOf("weekly-") === 0 ? clampWeek(param.slice(7)) : weekIndexForToday();
    var monthIdx = param && param.indexOf("monthly-") === 0 ? clampMonth(param.slice(8)) : (now.getFullYear() === YEAR ? now.getMonth() : 0);
    var tabs = subtabsHtml(REFLECTIONS_TABS.map(function (t) {
      var href = "#/reflections/" + t.id;
      if (t.id === "daily") href = "#/reflections/daily-" + dayKey;
      if (t.id === "weekly") href = "#/reflections/weekly-" + weekIdx;
      if (t.id === "monthly") href = "#/reflections/monthly-" + monthIdx;
      return { label: t.label, href: href, active: t.id === view };
    }));
    var head = '<div class="view-head"><div><h1>Reflections</h1><div class="sub">Occasional-use worksheets for stepping back</div></div></div>' + tabs;
    if (view === "wheel") return head + renderReflWheel();
    if (view === "stoic") return head + renderReflStoic();
    if (view === "inventory") return head + renderReflInventory();
    if (view === "daily") return head + renderReflDaily(dayKey);
    if (view === "weekly") return head + renderReflWeekly(weekIdx);
    if (view === "monthly") return head + renderReflMonthly(monthIdx);
    if (view === "yearly") return head + renderReflYearly();
    if (view === "eisenhower") return head + renderReflEisenhower();
    if (view === "mindmap") return head + renderReflMindMap();
    return head + renderReflIkigai();
  }

  function bindReflections(param) {
    bindSubtabs();
    var view = reflectionsView(param);
    var dayKey = param && param.indexOf("daily-") === 0 ? param.slice(6) : clampDayKey();
    var weekIdx = param && param.indexOf("weekly-") === 0 ? clampWeek(param.slice(7)) : weekIndexForToday();
    var monthIdx = param && param.indexOf("monthly-") === 0 ? clampMonth(param.slice(8)) : (now.getFullYear() === YEAR ? now.getMonth() : 0);
    if (view === "wheel") bindReflWheel();
    else if (view === "stoic") bindReflStoic();
    else if (view === "inventory") bindReflInventory();
    else if (view === "daily") bindReflDaily(dayKey);
    else if (view === "weekly") bindReflWeekly(weekIdx);
    else if (view === "monthly") bindReflMonthly(monthIdx);
    else if (view === "yearly") bindReflYearly();
    else if (view === "eisenhower") bindReflEisenhower();
    else if (view === "mindmap") bindReflMindMap();
    else bindReflIkigai();
  }

  function renderReflIkigai() {
    var ik = state.ikigai;
    var questionsHtml = "";
    ik.questions.forEach(function (q, i) {
      questionsHtml += (
        '<li><span class="idx">' + (i + 1) + "</span>" +
        '<input type="text" class="line-input" data-question="' + i + '" value="' + escapeHtml(q || "") + '" placeholder="Guided question ' + (i + 1) + '" /></li>'
      );
    });
    return (
      '<div class="panel" style="margin-top:16px;">' +
        "<h3>Ikigai</h3>" +
        '<svg viewBox="0 0 190 200" class="ikigai-svg" style="margin-top:12px;">' +
          '<circle cx="63" cy="70" r="48" fill="var(--swatch-1-wash)" stroke="var(--accent)" stroke-width="1"/>' +
          '<circle cx="127" cy="70" r="48" fill="var(--swatch-2-wash)" stroke="var(--accent)" stroke-width="1"/>' +
          '<circle cx="63" cy="130" r="48" fill="var(--swatch-3-wash)" stroke="var(--accent)" stroke-width="1"/>' +
          '<circle cx="127" cy="130" r="48" fill="var(--accent-subtle)" stroke="var(--accent)" stroke-width="1"/>' +
          '<text x="63" y="14" font-size="9" text-anchor="middle" fill="var(--ink-mute)">Love</text>' +
          '<text x="127" y="14" font-size="9" text-anchor="middle" fill="var(--ink-mute)">Good at</text>' +
          '<text x="63" y="194" font-size="9" text-anchor="middle" fill="var(--ink-mute)">World needs</text>' +
          '<text x="127" y="194" font-size="9" text-anchor="middle" fill="var(--ink-mute)">Paid for</text>' +
        "</svg>" +
        '<div class="field-grid-2" style="margin-top:14px;">' +
          '<div><span class="field-label">What I love</span><textarea rows="3" data-ikigai="love">' + escapeHtml(ik.answers.love || "") + "</textarea></div>" +
          '<div><span class="field-label">What I\'m good at</span><textarea rows="3" data-ikigai="good">' + escapeHtml(ik.answers.good || "") + "</textarea></div>" +
          '<div><span class="field-label">What the world needs</span><textarea rows="3" data-ikigai="world">' + escapeHtml(ik.answers.world || "") + "</textarea></div>" +
          '<div><span class="field-label">What I can be paid for</span><textarea rows="3" data-ikigai="paid">' + escapeHtml(ik.answers.paid || "") + "</textarea></div>" +
        "</div>" +
        '<h3 style="margin-top:18px;">Guided questions</h3>' +
        '<ul class="top3-list" style="margin-top:12px;">' + questionsHtml + "</ul>" +
      "</div>"
    );
  }

  function bindReflIkigai() {
    document.querySelectorAll("[data-ikigai]").forEach(function (el) {
      el.addEventListener("input", function () { state.ikigai.answers[el.dataset.ikigai] = el.value; saveState(); });
    });
    document.querySelectorAll("[data-question]").forEach(function (el) {
      el.addEventListener("input", function () { state.ikigai.questions[parseInt(el.dataset.question, 10)] = el.value; saveState(); });
    });
  }

  function wheelOfLifeSvg(areas) {
    var cx = 110, cy = 110, maxR = 80, n = areas.length;
    var svg = '<svg viewBox="-35 -10 290 240" class="wheel-svg">';
    for (var ring = 2; ring <= 10; ring += 2) {
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (maxR * ring / 10).toFixed(1) + '" fill="none" stroke="var(--hair)" stroke-width="1"/>';
    }
    for (var i2 = 0; i2 < n; i2++) {
      var ang = (i2 / n) * 2 * Math.PI - Math.PI / 2;
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + maxR * Math.cos(ang)).toFixed(1) + '" y2="' + (cy + maxR * Math.sin(ang)).toFixed(1) + '" stroke="var(--hair)" stroke-width="1"/>';
    }
    areas.forEach(function (a, i) {
      var rating = a.rating || 0;
      var r = maxR * (rating / 10);
      var a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
      var a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
      var x0 = (cx + r * Math.cos(a0)).toFixed(1), y0 = (cy + r * Math.sin(a0)).toFixed(1);
      var x1 = (cx + r * Math.cos(a1)).toFixed(1), y1 = (cy + r * Math.sin(a1)).toFixed(1);
      var largeArc = (a1 - a0) > Math.PI ? 1 : 0;
      if (r > 0.5) {
        svg += '<path d="M' + cx + " " + cy + " L" + x0 + " " + y0 + " A" + r.toFixed(1) + " " + r.toFixed(1) + " 0 " + largeArc + " 1 " + x1 + " " + y1 + ' Z" fill="var(--accent-subtle)" stroke="var(--accent)" stroke-width="1"/>';
      }
      var midAng = (a0 + a1) / 2;
      var cosMid = Math.cos(midAng);
      var lx = (cx + (maxR + 16) * cosMid).toFixed(1), ly = (cy + (maxR + 16) * Math.sin(midAng)).toFixed(1);
      var anchor = cosMid > 0.35 ? "start" : cosMid < -0.35 ? "end" : "middle";
      svg += '<text x="' + lx + '" y="' + ly + '" font-size="8.5" fill="var(--ink-mute)" text-anchor="' + anchor + '">' + escapeHtml(a.name) + "</text>";
    });
    return svg + "</svg>";
  }

  function renderReflWheel() {
    var rows = state.wheelOfLife.map(function (a) {
      var levels = "";
      for (var lv = 1; lv <= 10; lv++) levels += '<button class="mood-opt' + (a.rating === lv ? " active" : "") + '" data-wheel="' + a.id + '" data-lv="' + lv + '">' + lv + "</button>";
      return '<div style="margin-bottom:14px;"><span class="field-label">' + escapeHtml(a.name) + '</span><div class="mood-row">' + levels + "</div></div>";
    }).join("");
    return (
      '<div class="panel" style="margin-top:16px;">' +
        "<h3>Wheel of Life</h3>" +
        '<div class="wheel-wrap" style="margin-top:12px;">' + wheelOfLifeSvg(state.wheelOfLife) + "</div>" +
        '<div style="margin-top:18px;">' + rows + "</div>" +
      "</div>"
    );
  }

  function bindReflWheel() {
    document.querySelectorAll("[data-wheel]").forEach(function (el) {
      el.addEventListener("click", function () {
        var a = state.wheelOfLife.find(function (x) { return x.id === el.dataset.wheel; });
        if (a) { a.rating = parseInt(el.dataset.lv, 10); saveState(); render(); }
      });
    });
  }

  function renderReflStoic() {
    return (
      '<div class="grid-2" style="margin-top:16px;">' +
        '<div class="panel"><h3>Things I can change</h3>' +
          '<div class="habit-toolbar" style="margin-top:12px;"><input type="text" id="new-stoic-change" placeholder="Add an item" /><button id="add-stoic-change">Add</button></div>' +
          '<div id="stoic-change-list">' + checklistHtml(state.stoicChange, { noCheck: true }) + "</div>" +
        "</div>" +
        '<div class="panel"><h3>Things I must accept</h3>' +
          '<div class="habit-toolbar" style="margin-top:12px;"><input type="text" id="new-stoic-accept" placeholder="Add an item" /><button id="add-stoic-accept">Add</button></div>' +
          '<div id="stoic-accept-list">' + checklistHtml(state.stoicAccept, { noCheck: true }) + "</div>" +
        "</div>" +
      "</div>" +
      '<div class="panel" id="stoic-premeditation" style="margin-top:16px;"><h3>Premeditation of evils</h3>' +
        fieldsFormHtml(state.stoicPremeditation, [
          { key: "goWrong", label: "What could go wrong?" },
          { key: "handle", label: "How would I handle it?" }
        ]) +
      "</div>" +
      '<div class="panel" style="margin-top:16px;"><h3>Reframing log</h3>' +
        '<div class="habit-toolbar" style="margin-top:12px;"><button id="add-reframe">Add entry</button></div>' +
        '<div class="list-editor" id="reframing-log">' + listEditorHtml(state.stoicReframingLog, [
          { key: "event", placeholder: "Event" }, { key: "initialReaction", placeholder: "Initial reaction" },
          { key: "benefits", placeholder: "Possible benefits" }, { key: "howStronger", placeholder: "How this makes me stronger" }
        ]) + "</div>" +
      "</div>" +
      '<div class="panel" id="stoic-evening-review" style="margin-top:16px;"><h3>Evening review</h3>' +
        fieldsFormHtml(state.stoicEveningReview, [
          { key: "p1", label: "What did I do well today?" },
          { key: "p2", label: "What did I do wrong?" },
          { key: "p3", label: "What could I have done better?" },
          { key: "p4", label: "Did I act with virtue?" },
          { key: "p5", label: "What will I do differently tomorrow?" }
        ]) +
      "</div>"
    );
  }

  function bindReflStoic() {
    bindChecklistAdd("add-stoic-change", "new-stoic-change", state.stoicChange);
    bindChecklist(document.getElementById("stoic-change-list"), state.stoicChange);
    bindChecklistAdd("add-stoic-accept", "new-stoic-accept", state.stoicAccept);
    bindChecklist(document.getElementById("stoic-accept-list"), state.stoicAccept);
    bindFieldsForm(document.getElementById("stoic-premeditation"), state.stoicPremeditation);
    bindFieldsForm(document.getElementById("stoic-evening-review"), state.stoicEveningReview);
    bindListEditor(document.getElementById("reframing-log"), state.stoicReframingLog);
    var addReframe = document.getElementById("add-reframe");
    if (addReframe) addReframe.addEventListener("click", function () {
      state.stoicReframingLog.push({ id: uid(), event: "", initialReaction: "", benefits: "", howStronger: "" });
      saveState();
      render();
    });
  }

  function renderReflInventory() {
    var cards = state.lifeInventory.map(function (c) {
      var levels = "";
      for (var lv = 1; lv <= 10; lv++) levels += '<button class="mood-opt' + (c.rating === lv ? " active" : "") + '" data-inv-lv="' + c.id + '" data-lv="' + lv + '">' + lv + "</button>";
      return (
        '<div class="card" data-inv-card="' + c.id + '">' +
          '<button class="habit-del" style="align-self:flex-end;" data-del-inv="' + c.id + '" title="Delete">✕</button>' +
          '<input type="text" class="title-input" data-field="name" data-inv="' + c.id + '" placeholder="Category" value="' + escapeHtml(c.name || "") + '" />' +
          '<div class="mood-row" style="margin-top:8px;">' + levels + "</div>" +
          '<textarea rows="2" data-field="notes" data-inv="' + c.id + '" placeholder="Notes" style="margin-top:8px;">' + escapeHtml(c.notes || "") + "</textarea>" +
        "</div>"
      );
    }).join("");
    return (
      '<div class="habit-toolbar" style="max-width:260px;margin-top:16px;"><button id="add-inventory" style="width:100%;">Add a category</button></div>' +
      '<div class="grid-3">' + (cards || '<div class="empty-state">No categories yet.</div>') + "</div>"
    );
  }

  function bindReflInventory() {
    var addBtn = document.getElementById("add-inventory");
    if (addBtn) addBtn.addEventListener("click", function () {
      state.lifeInventory.push({ id: uid(), name: "", rating: 0, notes: "" });
      saveState();
      render();
    });
    document.querySelectorAll("[data-field][data-inv]").forEach(function (el) {
      el.addEventListener("input", function () {
        var c = state.lifeInventory.find(function (x) { return x.id === el.dataset.inv; });
        if (c) { c[el.dataset.field] = el.value; saveState(); }
      });
    });
    document.querySelectorAll("[data-inv-lv]").forEach(function (el) {
      el.addEventListener("click", function () {
        var c = state.lifeInventory.find(function (x) { return x.id === el.dataset.invLv; });
        if (c) { c.rating = parseInt(el.dataset.lv, 10); saveState(); render(); }
      });
    });
    document.querySelectorAll("[data-del-inv]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.lifeInventory = state.lifeInventory.filter(function (x) { return x.id !== el.dataset.delInv; });
        saveState();
        render();
      });
    });
  }

  function renderReflDaily(key) {
    var y = parseInt(key.slice(0, 4), 10), m = parseInt(key.slice(5, 7), 10) - 1, d = parseInt(key.slice(8, 10), 10);
    var d0 = new Date(YEAR, 0, 1), d1 = new Date(YEAR, 11, 31), cur = new Date(y, m, d);
    var r = getDailyReflection(key);
    return (
      '<div class="nav-strip" style="margin:16px 0;">' +
        '<button id="refl-day-prev" ' + (cur <= d0 ? "disabled" : "") + '>‹</button>' +
        '<span class="label">' + MONTH_ABBR[m] + " " + d + "</span>" +
        '<button id="refl-day-next" ' + (cur >= d1 ? "disabled" : "") + '>›</button>' +
      "</div>" +
      '<div class="panel" id="reflection-form"><h3>Daily Reflection</h3>' +
        fieldsFormHtml(r, [
          { key: "morningIntention", label: "Morning intention" },
          { key: "eveningHowDidItGo", label: "Evening: how did it go?" },
          { key: "eveningWentWell", label: "Evening: what went well?" },
          { key: "eveningCouldImprove", label: "Evening: what could improve?" },
          { key: "eveningLearned", label: "Evening: what did I learn?" },
          { key: "highlight", label: "Today's highlight" },
          { key: "noteToSelf", label: "Note to self" }
        ]) +
      "</div>"
    );
  }

  function bindReflDaily(key) {
    var y = parseInt(key.slice(0, 4), 10), m = parseInt(key.slice(5, 7), 10) - 1, d = parseInt(key.slice(8, 10), 10);
    var prev = document.getElementById("refl-day-prev");
    var next = document.getElementById("refl-day-next");
    if (prev) prev.addEventListener("click", function () {
      var pd = new Date(y, m, d - 1);
      if (pd.getFullYear() === YEAR) go("#/reflections/daily-" + dateKey(pd.getFullYear(), pd.getMonth(), pd.getDate()));
    });
    if (next) next.addEventListener("click", function () {
      var nd = new Date(y, m, d + 1);
      if (nd.getFullYear() === YEAR) go("#/reflections/daily-" + dateKey(nd.getFullYear(), nd.getMonth(), nd.getDate()));
    });
    bindFieldsForm(document.getElementById("reflection-form"), getDailyReflection(key));
  }

  function renderReflWeekly(idx) {
    var r = getWeeklyReflection(idx);
    return (
      '<div class="nav-strip" style="margin:16px 0;">' +
        '<button id="refl-week-prev" ' + (idx === 1 ? "disabled" : "") + '>‹</button>' +
        '<span class="label">Week ' + idx + "</span>" +
        '<button id="refl-week-next" ' + (idx === WEEKS.length ? "disabled" : "") + '>›</button>' +
      "</div>" +
      '<div class="panel" id="reflection-form"><h3>Weekly Reflection</h3>' +
        fieldsFormHtml(r, [
          { key: "howWasWeek", label: "How was this week?" },
          { key: "gratefulFor", label: "Grateful for" },
          { key: "thingsToCelebrate", label: "Things to celebrate" },
          { key: "areasToImprove", label: "Areas to improve" },
          { key: "wentWell", label: "What went well" },
          { key: "didntWork", label: "What didn't work" },
          { key: "tasksWorkingOn", label: "Tasks I'm working on" },
          { key: "nextWeekFocus", label: "Next week's focus" },
          { key: "notes", label: "Notes" }
        ]) +
      "</div>"
    );
  }

  function bindReflWeekly(idx) {
    var prev = document.getElementById("refl-week-prev");
    var next = document.getElementById("refl-week-next");
    if (prev) prev.addEventListener("click", function () { if (idx > 1) go("#/reflections/weekly-" + (idx - 1)); });
    if (next) next.addEventListener("click", function () { if (idx < WEEKS.length) go("#/reflections/weekly-" + (idx + 1)); });
    bindFieldsForm(document.getElementById("reflection-form"), getWeeklyReflection(idx));
  }

  function renderReflMonthly(m) {
    var r = getMonthlyReflection(m);
    var thankfulHtml = "";
    for (var i = 0; i < 3; i++) {
      thankfulHtml += '<input type="text" class="line-input" data-thankful="' + i + '" value="' + escapeHtml(r.thankful[i] || "") + '" placeholder="Grateful for #' + (i + 1) + '" style="margin-bottom:6px;display:block;width:100%;" />';
    }
    var ratingRow = "";
    for (var lv = 1; lv <= 10; lv++) ratingRow += '<button class="mood-opt' + (r.rating === lv ? " active" : "") + '" data-month-rating="' + lv + '">' + lv + "</button>";
    return (
      '<div class="nav-strip" style="margin:16px 0;">' +
        '<button id="refl-month-prev" ' + (m === 0 ? "disabled" : "") + '>‹</button>' +
        '<span class="label">' + MONTH_NAMES[m] + "</span>" +
        '<button id="refl-month-next" ' + (m === 11 ? "disabled" : "") + '>›</button>' +
      "</div>" +
      '<div class="panel" id="reflection-form"><h3>Monthly Reflection</h3>' +
        fieldsFormHtml(r, [
          { key: "wins", label: "Wins this month" }, { key: "feelings", label: "How did I feel?" },
          { key: "challenges", label: "Challenges" }, { key: "improve", label: "What can I improve?" },
          { key: "goalsAchieved", label: "Goals achieved" }, { key: "goalsInProgress", label: "Goals in progress" },
          { key: "goalsNextMonth", label: "Goals for next month" },
          { key: "habitsKept", label: "Habits I kept" }, { key: "habitsLetGo", label: "Habits I let go" }, { key: "habitsBuilding", label: "Habits I'm building" },
          { key: "lessons", label: "Lessons learned" }, { key: "oneWord", label: "One word for this month", rows: 1 }
        ]) +
        '<span class="field-label" style="margin-top:12px;">Grateful for</span>' + thankfulHtml +
        '<span class="field-label" style="margin-top:8px;">Rate this month</span><div class="mood-row" style="margin-top:6px;">' + ratingRow + "</div>" +
      "</div>"
    );
  }

  function bindReflMonthly(m) {
    var r = getMonthlyReflection(m);
    var prev = document.getElementById("refl-month-prev");
    var next = document.getElementById("refl-month-next");
    if (prev) prev.addEventListener("click", function () { if (m > 0) go("#/reflections/monthly-" + (m - 1)); });
    if (next) next.addEventListener("click", function () { if (m < 11) go("#/reflections/monthly-" + (m + 1)); });
    bindFieldsForm(document.getElementById("reflection-form"), r);
    document.querySelectorAll("[data-thankful]").forEach(function (el) {
      el.addEventListener("input", function () { r.thankful[parseInt(el.dataset.thankful, 10)] = el.value; saveState(); });
    });
    document.querySelectorAll("[data-month-rating]").forEach(function (el) {
      el.addEventListener("click", function () { r.rating = parseInt(el.dataset.monthRating, 10); saveState(); render(); });
    });
  }

  function renderReflYearly() {
    var r = getYearlyReflection();
    return (
      '<div class="panel" id="reflection-form" style="margin-top:16px;"><h3>Yearly Reflection — ' + YEAR + "</h3>" +
        fieldsFormHtml(r, [
          { key: "accomplishments", label: "Accomplishments" }, { key: "highlights", label: "Highlights" },
          { key: "setbacks", label: "Setbacks" }, { key: "thingsToLearn", label: "Things to learn" },
          { key: "thingsToChange", label: "Things to change" }, { key: "start", label: "Start doing" },
          { key: "stop", label: "Stop doing" }, { key: "continue", label: "Continue doing" },
          { key: "nextYearPriorities", label: "Next year's priorities" }
        ]) +
      "</div>"
    );
  }

  function bindReflYearly() {
    bindFieldsForm(document.getElementById("reflection-form"), getYearlyReflection());
  }

  function renderReflEisenhower() {
    var e = state.eisenhowerMatrix;
    return (
      '<div class="panel" id="eisenhower-form" style="margin-top:16px;"><h3>Eisenhower Matrix</h3>' +
        '<div class="grid-2" style="margin-top:12px;">' +
          '<div><span class="field-label">Urgent &amp; Important — Do first</span><textarea rows="6" data-field="q1">' + escapeHtml(e.q1 || "") + "</textarea></div>" +
          '<div><span class="field-label">Not Urgent &amp; Important — Schedule</span><textarea rows="6" data-field="q2">' + escapeHtml(e.q2 || "") + "</textarea></div>" +
          '<div><span class="field-label">Urgent &amp; Not Important — Delegate</span><textarea rows="6" data-field="q3">' + escapeHtml(e.q3 || "") + "</textarea></div>" +
          '<div><span class="field-label">Not Urgent &amp; Not Important — Delete</span><textarea rows="6" data-field="q4">' + escapeHtml(e.q4 || "") + "</textarea></div>" +
        "</div>" +
      "</div>"
    );
  }

  function bindReflEisenhower() {
    bindFieldsForm(document.getElementById("eisenhower-form"), state.eisenhowerMatrix);
  }

  var MINDMAP_POSITIONS = [
    { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 },
    { row: 2, col: 1 }, { row: 2, col: 3 },
    { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 }
  ];

  function mindMapConnectorsSvg() {
    var center = [50, 50];
    var points = [[16.67, 16.67], [50, 16.67], [83.33, 16.67], [16.67, 50], [83.33, 50], [16.67, 83.33], [50, 83.33], [83.33, 83.33]];
    var lines = points.map(function (p) {
      return '<line x1="' + center[0] + '" y1="' + center[1] + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="var(--hair)" stroke-width="0.6"/>';
    }).join("");
    return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="mindmap-lines">' + lines + "</svg>";
  }

  function renderMindMapCard(mm) {
    var cells = MINDMAP_POSITIONS.map(function (pos, i) {
      return (
        '<div class="mindmap-cell" style="grid-row:' + pos.row + ";grid-column:" + pos.col + ';">' +
          '<textarea rows="2" data-branch="' + i + '" data-mindmap="' + mm.id + '" placeholder="Branch ' + (i + 1) + '">' + escapeHtml(mm.branches[i] || "") + "</textarea>" +
        "</div>"
      );
    }).join("");
    return (
      '<div class="card" data-mindmap-card="' + mm.id + '">' +
        '<button class="habit-del" style="align-self:flex-end;" data-del-mindmap="' + mm.id + '" title="Delete mind map">✕</button>' +
        '<input type="text" class="title-input" data-field="title" data-mindmap="' + mm.id + '" placeholder="Mind map title" value="' + escapeHtml(mm.title || "") + '" />' +
        '<div class="mindmap-grid" style="margin-top:14px;">' +
          mindMapConnectorsSvg() +
          cells +
          '<div class="mindmap-cell mindmap-center" style="grid-row:2;grid-column:2;">' +
            '<textarea rows="2" data-field="center" data-mindmap="' + mm.id + '" placeholder="Central topic">' + escapeHtml(mm.center || "") + "</textarea>" +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function renderReflMindMap() {
    var cards = state.mindMaps.map(renderMindMapCard).join("");
    return (
      '<div class="habit-toolbar" style="max-width:260px;margin-top:16px;"><button id="add-mindmap" style="width:100%;">Add a mind map</button></div>' +
      '<div style="display:flex;flex-direction:column;gap:20px;">' + (cards || '<div class="empty-state">No mind maps yet.</div>') + "</div>"
    );
  }

  function bindReflMindMap() {
    var addBtn = document.getElementById("add-mindmap");
    if (addBtn) addBtn.addEventListener("click", function () {
      state.mindMaps.unshift({ id: uid(), title: "", center: "", branches: ["", "", "", "", "", "", "", ""] });
      saveState();
      render();
    });
    document.querySelectorAll('[data-field="title"][data-mindmap], [data-field="center"][data-mindmap]').forEach(function (el) {
      el.addEventListener("input", function () {
        var mm = state.mindMaps.find(function (x) { return x.id === el.dataset.mindmap; });
        if (mm) { mm[el.dataset.field] = el.value; saveState(); }
      });
    });
    document.querySelectorAll("[data-branch]").forEach(function (el) {
      el.addEventListener("input", function () {
        var mm = state.mindMaps.find(function (x) { return x.id === el.dataset.mindmap; });
        if (mm) { mm.branches[parseInt(el.dataset.branch, 10)] = el.value; saveState(); }
      });
    });
    document.querySelectorAll("[data-del-mindmap]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.mindMaps = state.mindMaps.filter(function (x) { return x.id !== el.dataset.delMindmap; });
        saveState();
        render();
      });
    });
  }

  /* ------------------------------------------------------------- misc */

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ------------------------------------------------------------- render loop */

  function render() {
    var route = getRoute();
    var renderer = RENDERERS[route.section] || RENDERERS.cover;
    document.getElementById("view").innerHTML = renderer(route.param);
    document.getElementById("section-badge").innerHTML = icon(route.section);
    document.getElementById("section-name").textContent = TITLES[route.section] || "Slow Ink";
    updateNavActive(route.section);
    var binder = BINDERS[route.section];
    if (binder) binder(route.param);
    document.getElementById("view").scrollTop = 0;
    closeDrawer();
  }

  /* ------------------------------------------------------------- page meta */

  function updatePageMeta() {
    document.title = "Slow Ink — " + YEAR + " Digital Planner";
    var m = document.querySelector('meta[name="description"]');
    if (m) {
      m.setAttribute("content",
        "Slow Ink is an interactive " + YEAR + " digital planner — yearly overview, monthly, weekly and daily pages, " +
        "habit tracker, goals, reading log, finance ledger and notes, in three hand-mixed colour palettes. " +
        "Built with plain HTML5, CSS and JavaScript."
      );
    }
  }

  /* ------------------------------------------------------------- theme */

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    var current = THEMES.find(function (th) { return th.id === state.theme; }) || THEMES[0];
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", current.metaColor);
    document.querySelectorAll(".tab-btn.theme-btn, #drawer-theme-picker .drawer-link").forEach(function (el) {
      el.classList.toggle("active", el.dataset.theme === state.theme);
    });
  }

  function setTheme(t) {
    state.theme = t;
    saveState();
    applyTheme();
  }

  /* ------------------------------------------------------------- nav chrome */

  document.getElementById("btn-menu").innerHTML = icon("menu");
  document.getElementById("drawer-close").innerHTML = icon("close");
  document.getElementById("btn-menu").addEventListener("click", openDrawer);
  document.getElementById("drawer-close").addEventListener("click", closeDrawer);
  document.getElementById("drawer-scrim").addEventListener("click", closeDrawer);

  document.getElementById("drawer-today").addEventListener("click", function () {
    go(defaultRouteFor("day"));
    toast(now.getFullYear() === YEAR ? "Jumped to today" : "Today is outside " + YEAR + " — showing Jan 1");
  });

  document.getElementById("drawer-export").addEventListener("click", function () {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "slow-ink-" + YEAR + "-planner.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("Data exported");
    closeDrawer();
  });

  document.getElementById("input-import").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        state = Object.assign(defaultState(), parsed);
        YEAR = state.currentYear || 2027;
        WEEKS = buildWeeks(YEAR);
        saveState();
        applyTheme();
        updatePageMeta();
        render();
        toast("Data imported");
      } catch (err) {
        toast("Could not read that file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  document.getElementById("drawer-reset").addEventListener("click", function () {
    if (!confirm("Reset the planner? This clears everything saved in this browser.")) return;
    state = defaultState();
    YEAR = state.currentYear;
    WEEKS = buildWeeks(YEAR);
    saveState();
    applyTheme();
    updatePageMeta();
    go("#/cover");
    toast("Planner reset");
  });

  /* ------------------------------------------------------------- boot */

  buildTabbar();
  buildDrawer();
  buildThemePicker();
  applyTheme();
  updatePageMeta();
  if (!location.hash) location.hash = "#/cover";
  window.addEventListener("hashchange", render);
  render();
})();

