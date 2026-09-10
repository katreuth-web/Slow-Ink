/* ===================================================================
   Slow Ink — 2027 Digital Planner
   Vanilla HTML5 / CSS / JS single-page app. No build step, no
   dependencies. All data lives in localStorage on this device.
   =================================================================== */

(function () {
  "use strict";

  var YEAR = 2027;
  var STORAGE_KEY = "slow-ink-2027-planner-v1";

  var MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var DOW_ABBR = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  var DOW_MIN = ["M","T","W","T","F","S","S"];
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
      theme: "greek-marble",
      monthlyFocus: {},
      monthPriorities: {},
      monthTodos: {},
      weekly: {},
      weekTodos: {},
      daily: {},
      habits: [],
      habitsReflection: { focus: "", proud: "" },
      seededSelfCare: false,
      goals: [],
      reading: [],
      finance: [],
      notes: [],
      meals: {},
      groceryList: [],
      recipes: [],
      travelBucketList: [],
      destinations: [],
      travelChecklist: []
    };
  }

  var GROCERY_CATEGORIES = [
    "Meat & Poultry", "Seafood", "Frozen Foods", "Dry Food", "Dairy",
    "Fruits & Vegetables", "Bakery", "Drinks", "Cans/Jars", "Household/Personal", "Pantry", "Other"
  ];

  var SELF_CARE_HABITS = [
    "Water", "Meals", "Movement", "Sleep", "Vitamins", "Skincare", "Breaks",
    "Reading", "Gratitude", "Outside time", "Journaling", "Meditation", "Hobby", "Connection"
  ];

  function seedSelfCare(s) {
    if (s.seededSelfCare) return;
    SELF_CARE_HABITS.forEach(function (name) {
      s.habits.push({ id: uid(), name: name, mode: "three-state", marks: {} });
    });
    s.seededSelfCare = true;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var s = raw ? Object.assign(defaultState(), JSON.parse(raw)) : defaultState();
      seedSelfCare(s);
      return s;
    } catch (e) {
      return defaultState();
    }
  }

  var state = loadState();

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    var key = "W" + idx;
    if (!state.weekly[key]) {
      state.weekly[key] = { top3: ["", "", ""], notes: "" };
    }
    return state.weekly[key];
  }

  function getMonthPriorities(m) {
    if (!state.monthPriorities[m]) state.monthPriorities[m] = [];
    return state.monthPriorities[m];
  }

  function getMonthTodos(m) {
    if (!state.monthTodos[m]) state.monthTodos[m] = [];
    return state.monthTodos[m];
  }

  function getWeekTodos(idx) {
    var key = "W" + idx;
    if (!state.weekTodos[key]) state.weekTodos[key] = [];
    return state.weekTodos[key];
  }

  function getMealsWeek(idx) {
    var key = "W" + idx;
    if (!state.meals[key]) state.meals[key] = {};
    for (var i = 0; i < 7; i++) {
      if (!state.meals[key][i]) state.meals[key][i] = { breakfast: "", lunch: "", dinner: "", snack: "" };
    }
    return state.meals[key];
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
    travel: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M4 13h16"/>'
  };

  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + "</svg>";
  }

  /* ------------------------------------------------------------- rail / routing */

  var SECTIONS = [
    { id: "cover", label: "Cover" },
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
    { id: "travel", label: "Travel Planner" }
  ];

  var TITLES = {
    cover: "Slow Ink", year: "Year Overview", month: "Monthly", week: "Weekly",
    day: "Daily", habits: "Habit Tracker", goals: "Goals", reading: "Reading",
    finance: "Finance", notes: "Notes", meals: "Meal Planner", travel: "Travel Planner"
  };

  var TAB_ITEMS = [
    { id: "cover", icon: "home" },
    { id: "month", icon: "month" },
    { id: "day", icon: "pencil" },
    { id: "habits", icon: "sliders" },
    { id: "year", icon: "year" },
    { id: "goals", icon: "list" }
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
    var moonBtn = document.createElement("button");
    moonBtn.className = "tab-btn theme-btn";
    moonBtn.dataset.theme = "soft-black";
    moonBtn.title = "Soft Black (dark)";
    moonBtn.innerHTML = icon("moon");
    moonBtn.addEventListener("click", function () { setTheme("soft-black"); });
    bar.appendChild(moonBtn);
    var sunBtn = document.createElement("button");
    sunBtn.className = "tab-btn theme-btn";
    sunBtn.dataset.theme = "greek-marble";
    sunBtn.title = "Greek Marble (light)";
    sunBtn.innerHTML = icon("sunTheme");
    sunBtn.addEventListener("click", function () { setTheme("greek-marble"); });
    bar.appendChild(sunBtn);
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
    travel: renderTravel
  };

  var BINDERS = {
    year: bindYear,
    month: bindMonth,
    week: bindWeek,
    day: bindDay,
    habits: bindHabits,
    meals: bindMeals,
    travel: bindTravel,
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
    var cards = "";
    for (var m = 0; m < 12; m++) {
      cards += miniMonth(m);
    }
    var totalGoals = state.goals.length;
    var doneGoals = state.goals.filter(function (g) { return g.done; }).length;
    return (
      '<div class="view-head"><div><h1>Year Overview</h1><div class="sub">' + YEAR + " at a glance</div></div></div>" +
      '<div class="year-grid">' + cards + "</div>" +
      '<div class="year-summary panel">' +
        '<h3>' + YEAR + " in numbers</h3>" +
        '<div class="chip-row">' +
          '<span class="chip">' + doneGoals + " / " + totalGoals + " goals complete</span>" +
          '<span class="chip">' + state.habits.length + " habits tracked</span>" +
          '<span class="chip">' + state.reading.length + " books logged</span>" +
          '<span class="chip">' + state.notes.length + " notes kept</span>" +
        "</div>" +
      "</div>"
    );
  }

  function miniMonth(m) {
    var dim = daysInMonth(YEAR, m);
    var startDow = firstWeekdayMon(YEAR, m);
    var filled = 0, total = 0;
    var cells = "";
    DOW_MIN.forEach(function (dl) { cells += '<div class="mini-dow">' + dl + "</div>"; });
    for (var i = 0; i < startDow; i++) cells += '<div class="mini-day empty"></div>';
    for (var d = 1; d <= dim; d++) {
      var dow = (startDow + d - 1) % 7;
      var key = dateKey(YEAR, m, d);
      var isW = dow >= 5;
      var isT = isToday(YEAR, m, d);
      total++;
      if (state.daily[key] && (state.daily[key].top3.some(function (t) { return t.trim(); }) || state.daily[key].notes.trim())) filled++;
      cells += '<div class="mini-day' + (isW ? " weekend" : "") + (isT ? " today" : "") + '">' + d + "</div>";
    }
    var pct = total ? Math.round((filled / total) * 100) : 0;
    return (
      '<div class="mini-month" data-month="' + m + '">' +
        '<div class="mini-title"><span>' + MONTH_ABBR[m] + "</span><span class=\"pct\">" + pct + "%</span></div>" +
        '<div class="mini-grid">' + cells + "</div>" +
      "</div>"
    );
  }

  function bindYear() {
    document.querySelectorAll(".mini-month").forEach(function (el) {
      el.addEventListener("click", function () { go("#/month/" + el.dataset.month); });
    });
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
      if (state.habits.some(function (h) { return h.marks[key]; })) dots += '<span class="dot"></span>';
      cells += (
        '<div class="month-cell' + (isW ? " weekend" : "") + (isT ? " today" : "") + '" data-day="' + d + '">' +
          '<div class="num">' + d + "</div>" +
          '<div class="dot-row">' + dots + "</div>" +
        "</div>"
      );
    }
    var focus = state.monthlyFocus[m] || "";
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
      state.monthlyFocus[m] = focus.value;
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
    if (!state.habits.length) {
      rows = '<tr><td class="habit-row-empty" colspan="' + (dim + 1) + '">No habits yet — add one above.</td></tr>';
    } else {
      state.habits.forEach(function (h) {
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
    var refl = state.habitsReflection;
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
      state.habits.push({ id: uid(), name: name, mode: "simple", marks: {} });
      saveState();
      render();
    }
    if (addBtn) addBtn.addEventListener("click", addHabit);
    if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") addHabit(); });
    document.querySelectorAll(".habit-mark").forEach(function (el) {
      el.addEventListener("click", function () {
        var h = state.habits.find(function (x) { return x.id === el.dataset.habit; });
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
        var h = state.habits.find(function (x) { return x.id === el.dataset.modeToggle; });
        if (!h) return;
        h.mode = h.mode === "three-state" ? "simple" : "three-state";
        saveState();
        render();
      });
    });
    document.querySelectorAll(".habit-del").forEach(function (el) {
      el.addEventListener("click", function () {
        state.habits = state.habits.filter(function (x) { return x.id !== el.dataset.del; });
        saveState();
        render();
      });
    });
    var focusEl = document.getElementById("habits-focus");
    if (focusEl) focusEl.addEventListener("input", function () { state.habitsReflection.focus = focusEl.value; saveState(); });
    var proudEl = document.getElementById("habits-proud");
    if (proudEl) proudEl.addEventListener("input", function () { state.habitsReflection.proud = proudEl.value; saveState(); });
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

  function renderFinance() {
    var income = 0, expense = 0;
    state.finance.forEach(function (e) { if (e.kind === "income") income += e.amount; else expense += e.amount; });
    var monthly = [];
    for (var m = 0; m < 12; m++) monthly.push(0);
    state.finance.forEach(function (e) {
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
    state.finance.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }).forEach(function (e) {
      rows += (
        "<tr>" +
          "<td>" + escapeHtml(e.date || "") + "</td>" +
          "<td>" + escapeHtml(e.category || "—") + "</td>" +
          '<td class="amt ' + e.kind + '">' + (e.kind === "income" ? "+" : "−") + "$" + Number(e.amount).toFixed(2) + "</td>" +
          '<td><button class="del-btn" data-del-entry="' + e.id + '">✕</button></td>' +
        "</tr>"
      );
    });
    return (
      '<div class="view-head"><div><h1>Finance</h1><div class="sub">A quiet ledger for ' + YEAR + "</div></div></div>" +
      '<div class="finance-summary">' +
        '<div class="stat income"><div class="label">Income</div><div class="value">$' + income.toFixed(2) + "</div></div>" +
        '<div class="stat expense"><div class="label">Expenses</div><div class="value">$' + expense.toFixed(2) + "</div></div>" +
        '<div class="stat"><div class="label">Balance</div><div class="value">$' + (income - expense).toFixed(2) + "</div></div>" +
      "</div>" +
      '<div class="panel" style="margin-bottom:20px;">' +
        '<h3>Net balance for each month of ' + YEAR + "</h3>" +
        '<div class="chart">' + bars + "</div>" +
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

  function bindFinance() {
    var ki = document.getElementById("kind-income"), ke = document.getElementById("kind-expense");
    if (ki) ki.addEventListener("click", function () { financeKind = "income"; render(); });
    if (ke) ke.addEventListener("click", function () { financeKind = "expense"; render(); });
    var addBtn = document.getElementById("add-entry");
    if (addBtn) addBtn.addEventListener("click", function () {
      var date = document.getElementById("new-entry-date").value || dateKey(YEAR, 0, 1);
      var category = document.getElementById("new-entry-category").value.trim();
      var amount = parseFloat(document.getElementById("new-entry-amount").value);
      if (!amount || amount <= 0) return;
      state.finance.push({ id: uid(), date: date, category: category, amount: amount, kind: financeKind });
      saveState();
      render();
    });
    document.querySelectorAll("[data-del-entry]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.finance = state.finance.filter(function (x) { return x.id !== el.dataset.delEntry; });
        saveState();
        render();
      });
    });
  }

  /* ---- notes ---- */

  function renderNotes() {
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
      '<div class="view-head"><div><h1>Notes</h1><div class="sub">Loose pages, kept together</div></div></div>' +
      '<div class="notes-toolbar"><button id="add-note">Write a note</button></div>' +
      '<div class="notes-grid">' + (cards || '<div class="empty-state">No notes yet.</div>') + "</div>"
    );
  }

  function tintColor(t) {
    return t === "card" ? "var(--card-2)" : "var(--swatch-" + t + ")";
  }
  function tintBg(t) {
    return t === "card" ? "var(--card-2)" : "var(--swatch-" + t + "-wash)";
  }

  function bindNotes() {
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

  /* ------------------------------------------------------------- theme */

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    var isLight = state.theme === "greek-marble";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isLight ? "#F1EBDB" : "#232323");
    var label = document.getElementById("drawer-theme-label");
    if (label) label.textContent = isLight ? "Switch to Soft Black" : "Switch to Greek Marble";
    var icoEl = document.getElementById("drawer-theme-icon");
    if (icoEl) icoEl.innerHTML = icon(isLight ? "moon" : "sunTheme");
    document.querySelectorAll(".tab-btn.theme-btn").forEach(function (el) {
      el.classList.toggle("active", el.dataset.theme === state.theme);
    });
  }

  function setTheme(t) {
    state.theme = t;
    saveState();
    applyTheme();
  }

  document.getElementById("drawer-theme").addEventListener("click", function () {
    setTheme(state.theme === "greek-marble" ? "soft-black" : "greek-marble");
  });

  /* ------------------------------------------------------------- nav chrome */

  document.getElementById("btn-menu").innerHTML = icon("menu");
  document.getElementById("drawer-close").innerHTML = icon("close");
  document.getElementById("btn-menu").addEventListener("click", openDrawer);
  document.getElementById("btn-topbar-left").addEventListener("click", openDrawer);
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
        saveState();
        applyTheme();
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
    saveState();
    applyTheme();
    go("#/cover");
    toast("Planner reset");
  });

  /* ------------------------------------------------------------- boot */

  buildTabbar();
  buildDrawer();
  applyTheme();
  if (!location.hash) location.hash = "#/cover";
  window.addEventListener("hashchange", render);
  render();
})();
