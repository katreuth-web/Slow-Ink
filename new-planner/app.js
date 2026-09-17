/* ==========================================================================
   New Planner — app.js
   Vanilla JS, no build step. Data lives in localStorage only (private-first).
   ========================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     Date utilities
     --------------------------------------------------------------------- */

  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DOW_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

  const pad2 = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const fromISO = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const addDays = (d, n) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };
  const addMonths = (d, n) => {
    const r = new Date(d);
    r.setDate(1);
    r.setMonth(r.getMonth() + n);
    return r;
  };
  const startOfWeek = (d, weekStart = 1) => {
    const day = d.getDay();
    const diff = (day - weekStart + 7) % 7;
    return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -diff);
  };
  const isSameISO = (a, b) => toISO(a) === toISO(b);
  const todayISO = () => toISO(new Date());
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const escapeHtml = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => (n < 0 ? "-$" : "$") + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const timeLabel = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${pad2(m)}${h < 12 ? "am" : "pm"}`;
  };

  /* ---------------------------------------------------------------------
     Constants
     --------------------------------------------------------------------- */

  const CATEGORIES = [
    { id: "work", label: "Work", swatch: "var(--ink)" },
    { id: "personal", label: "Personal", swatch: "var(--gold)" },
    { id: "health", label: "Health", swatch: "var(--good)" },
    { id: "other", label: "Other", swatch: "var(--accent)" },
  ];
  const catMeta = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[3];

  const HABIT_COLORS = ["var(--viz-1)", "var(--viz-2)", "var(--viz-3)", "var(--viz-4)", "var(--viz-5)", "var(--viz-7)", "var(--viz-8)"];

  const EXPENSE_CATS = [
    { id: "housing", label: "Housing", swatch: "var(--viz-1)" },
    { id: "food", label: "Food", swatch: "var(--viz-2)" },
    { id: "transport", label: "Transport", swatch: "var(--viz-3)" },
    { id: "bills", label: "Bills", swatch: "var(--viz-4)" },
    { id: "entertainment", label: "Entertainment", swatch: "var(--viz-5)" },
    { id: "shopping", label: "Shopping", swatch: "var(--viz-6)" },
    { id: "other", label: "Other", swatch: "var(--viz-7)" },
  ];
  const expenseCatMeta = (id) => EXPENSE_CATS.find((c) => c.id === id) || EXPENSE_CATS[6];

  const NOTE_TEMPLATES = ["plain", "lined", "grid", "bulleted"];

  const HOUR_START = 6;
  const HOUR_END = 23; // exclusive
  const SLOTS_PER_HOUR = 2;
  const SLOT_MIN = 60 / SLOTS_PER_HOUR;
  const TOTAL_SLOTS = (HOUR_END - HOUR_START) * SLOTS_PER_HOUR;

  const DB_KEY = "newPlanner.db.v1";
  const UI_KEY = "newPlanner.ui.v1";

  /* ---------------------------------------------------------------------
     Storage
     --------------------------------------------------------------------- */

  function defaultDB() {
    return {
      events: [],
      habits: [],
      habitLogs: {}, // dateISO -> { habitId: true }
      finance: [],
      fitness: [],
      notes: [],
      settings: { theme: "light", weekStart: 1 },
    };
  }

  function loadDB() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Object.assign(defaultDB(), parsed);
    } catch (e) {
      console.warn("New Planner: could not read saved data", e);
      return null;
    }
  }

  function saveDB() {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function loadUI() {
    try {
      const raw = localStorage.getItem(UI_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveUI() {
    localStorage.setItem(
      UI_KEY,
      JSON.stringify({ view: state.view, cursorDate: toISO(state.cursorDate), hubTab: state.hubTab, notesFilter: state.notesFilter })
    );
  }

  let db = loadDB();
  let firstRun = false;
  if (!db) {
    db = defaultDB();
    firstRun = true;
  }

  /* ---------------------------------------------------------------------
     Recurrence engine
     --------------------------------------------------------------------- */

  function eventOccursOn(ev, dateStr) {
    if (ev.skipDates && ev.skipDates.includes(dateStr)) return false;
    if (dateStr === ev.date) return true;
    const r = ev.recurrence;
    if (!r || !r.freq) return false;
    if (dateStr < ev.date) return false;
    if (r.until && dateStr > r.until) return false;
    const start = fromISO(ev.date);
    const d = fromISO(dateStr);
    const interval = Math.max(1, r.interval || 1);
    if (r.freq === "daily") {
      const diffDays = Math.round((d - start) / 86400000);
      return diffDays % interval === 0;
    }
    if (r.freq === "weekly") {
      if (d.getDay() !== start.getDay()) return false;
      const diffWeeks = Math.round((d - start) / (7 * 86400000));
      return diffWeeks % interval === 0;
    }
    if (r.freq === "monthly") {
      if (d.getDate() !== start.getDate()) return false;
      const diffMonths = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
      return diffMonths >= 0 && diffMonths % interval === 0;
    }
    return false;
  }

  function getEventsOnDate(dateStr) {
    return db.events
      .filter((ev) => eventOccursOn(ev, dateStr))
      .map((ev) => ({ ev, done: (ev.doneDates || []).includes(dateStr) }))
      .sort((a, b) => {
        if (!a.ev.time && !b.ev.time) return a.ev.title.localeCompare(b.ev.title);
        if (!a.ev.time) return 1;
        if (!b.ev.time) return -1;
        return a.ev.time.localeCompare(b.ev.time);
      });
  }

  function dateHasEvents(dateStr) {
    return db.events.some((ev) => eventOccursOn(ev, dateStr));
  }

  function toggleEventDone(id, dateStr) {
    const ev = db.events.find((e) => e.id === id);
    if (!ev) return;
    ev.doneDates = ev.doneDates || [];
    const i = ev.doneDates.indexOf(dateStr);
    if (i === -1) ev.doneDates.push(dateStr);
    else ev.doneDates.splice(i, 1);
    saveDB();
  }

  function upsertEvent(data) {
    if (data.id) {
      const ev = db.events.find((e) => e.id === data.id);
      Object.assign(ev, data);
    } else {
      db.events.push(
        Object.assign(
          { id: uid(), doneDates: [], skipDates: [], time: null, endTime: null, notes: "", priority: "med", category: "personal", recurrence: null },
          data
        )
      );
    }
    saveDB();
  }

  function deleteEvent(id) {
    db.events = db.events.filter((e) => e.id !== id);
    saveDB();
  }

  /* ---------------------------------------------------------------------
     Habits
     --------------------------------------------------------------------- */

  function habitsForDate(dateStr) {
    const dow = fromISO(dateStr).getDay();
    return db.habits.filter((h) => !h.archived && (!h.days || h.days.length === 0 || h.days.includes(dow)));
  }

  function habitDone(habitId, dateStr) {
    return !!(db.habitLogs[dateStr] && db.habitLogs[dateStr][habitId]);
  }

  function toggleHabit(habitId, dateStr) {
    db.habitLogs[dateStr] = db.habitLogs[dateStr] || {};
    db.habitLogs[dateStr][habitId] = !db.habitLogs[dateStr][habitId];
    if (!db.habitLogs[dateStr][habitId]) delete db.habitLogs[dateStr][habitId];
    saveDB();
  }

  function habitStreak(habitId, uptoISOStr) {
    let streak = 0;
    let d = fromISO(uptoISOStr || todayISO());
    const habit = db.habits.find((h) => h.id === habitId);
    if (!habit) return 0;
    for (let i = 0; i < 3650; i++) {
      const iso = toISO(d);
      const scheduled = !habit.days || habit.days.length === 0 || habit.days.includes(d.getDay());
      if (scheduled) {
        if (habitDone(habitId, iso)) streak++;
        else break;
      }
      d = addDays(d, -1);
    }
    return streak;
  }

  function upsertHabit(data) {
    if (data.id) {
      Object.assign(db.habits.find((h) => h.id === data.id), data);
    } else {
      db.habits.push(Object.assign({ id: uid(), archived: false, createdAt: todayISO() }, data));
    }
    saveDB();
  }

  function deleteHabit(id) {
    db.habits = db.habits.filter((h) => h.id !== id);
    saveDB();
  }

  /* ---------------------------------------------------------------------
     Trackers — finance & fitness
     --------------------------------------------------------------------- */

  function addFinance(entry) {
    db.finance.push(Object.assign({ id: uid() }, entry));
    saveDB();
  }
  function deleteFinance(id) {
    db.finance = db.finance.filter((f) => f.id !== id);
    saveDB();
  }
  function addFitness(entry) {
    db.fitness.push(Object.assign({ id: uid() }, entry));
    saveDB();
  }
  function deleteFitness(id) {
    db.fitness = db.fitness.filter((f) => f.id !== id);
    saveDB();
  }

  function monthRangeISO(d) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return [toISO(start), toISO(end)];
  }

  /* ---------------------------------------------------------------------
     Notes
     --------------------------------------------------------------------- */

  function upsertNote(data) {
    const now = new Date().toISOString();
    if (data.id) {
      Object.assign(db.notes.find((n) => n.id === data.id), data, { updatedAt: now });
    } else {
      db.notes.push(Object.assign({ id: uid(), createdAt: now, updatedAt: now }, data));
    }
    saveDB();
  }
  function deleteNote(id) {
    db.notes = db.notes.filter((n) => n.id !== id);
    saveDB();
  }
  function notesForDate(dateStr) {
    return db.notes.filter((n) => n.linkedDate === dateStr);
  }
  function weekNote(mondayISO) {
    return db.notes.find((n) => n.linkedDate === mondayISO && n.isWeekNote);
  }

  /* ---------------------------------------------------------------------
     Seed demo data (first run only)
     --------------------------------------------------------------------- */

  function seedDemoData() {
    const today = new Date();
    const iso = (offset) => toISO(addDays(today, offset));

    db.events = [
      { id: uid(), title: "Team sync", date: toISO(startOfWeek(today, 1)), time: "09:00", endTime: "09:30", category: "work", priority: "med", notes: "Weekly planning check-in.", recurrence: { freq: "weekly", interval: 1, until: null }, doneDates: [], skipDates: [] },
      { id: uid(), title: "Rent due", date: toISO(new Date(today.getFullYear(), today.getMonth(), 1)), time: null, endTime: null, category: "personal", priority: "high", notes: "", recurrence: { freq: "monthly", interval: 1, until: null }, doneDates: [], skipDates: [] },
      { id: uid(), title: "Morning pages", date: iso(-10), time: "07:00", endTime: "07:20", category: "personal", priority: "low", notes: "Three pages, longhand.", recurrence: { freq: "daily", interval: 1, until: null }, doneDates: [iso(-2), iso(-1)], skipDates: [] },
      { id: uid(), title: "Design review", date: iso(1), time: "14:00", endTime: "15:00", category: "work", priority: "high", notes: "Bring the two layout options.", recurrence: null, doneDates: [], skipDates: [] },
      { id: uid(), title: "Dentist appointment", date: iso(3), time: "11:15", endTime: "12:00", category: "health", priority: "med", notes: "Bring insurance card.", recurrence: null, doneDates: [], skipDates: [] },
      { id: uid(), title: "Call Mum", date: iso(0), time: null, endTime: null, category: "personal", priority: "med", notes: "", recurrence: null, doneDates: [], skipDates: [] },
      { id: uid(), title: "Submit expense report", date: iso(-1), time: null, endTime: null, category: "work", priority: "high", notes: "", recurrence: null, doneDates: [iso(-1)], skipDates: [] },
      { id: uid(), title: "Grocery run", date: iso(2), time: "18:00", endTime: "18:45", category: "personal", priority: "low", notes: "Milk, eggs, coffee.", recurrence: null, doneDates: [], skipDates: [] },
      { id: uid(), title: "Long run", date: iso(0), time: "07:30", endTime: "08:30", category: "health", priority: "med", notes: "Riverside loop, easy pace.", recurrence: null, doneDates: [], skipDates: [] },
      { id: uid(), title: "Read 20 pages", date: iso(-4), time: null, endTime: null, category: "other", priority: "low", notes: "", recurrence: { freq: "daily", interval: 1, until: null }, doneDates: [iso(-3), iso(-2), iso(-1)], skipDates: [] },
    ];

    db.habits = [
      { id: uid(), name: "Drink 8 glasses of water", color: HABIT_COLORS[0], days: null, archived: false, createdAt: iso(-30) },
      { id: uid(), name: "Meditate", color: HABIT_COLORS[1], days: null, archived: false, createdAt: iso(-30) },
      { id: uid(), name: "Strength training", color: HABIT_COLORS[2], days: [1, 3, 5], archived: false, createdAt: iso(-30) },
      { id: uid(), name: "No screens after 10pm", color: HABIT_COLORS[3], days: null, archived: false, createdAt: iso(-30) },
    ];
    db.habitLogs = {};
    for (let i = -9; i <= 0; i++) {
      const d = iso(i);
      db.habitLogs[d] = {};
      db.habits.forEach((h) => {
        const scheduled = !h.days || h.days.includes(fromISO(d).getDay());
        if (scheduled && Math.random() > 0.28) db.habitLogs[d][h.id] = true;
      });
    }

    db.finance = [];
    const financeCats = EXPENSE_CATS.map((c) => c.id);
    for (let i = -29; i <= 0; i++) {
      const d = iso(i);
      if (Math.random() > 0.55) {
        const cat = financeCats[Math.floor(Math.random() * financeCats.length)];
        db.finance.push({ id: uid(), date: d, type: "expense", category: cat, amount: +(8 + Math.random() * 85).toFixed(2), note: "" });
      }
    }
    db.finance.push({ id: uid(), date: iso(-14), type: "income", category: "other", amount: 2400, note: "Paycheck" });
    db.finance.push({ id: uid(), date: iso(-28), type: "income", category: "other", amount: 2400, note: "Paycheck" });
    db.finance.push({ id: uid(), date: iso(-3), type: "income", category: "other", amount: 150, note: "Freelance" });

    db.fitness = [];
    const activities = ["Run", "Yoga", "Cycling", "Walk", "Strength", "Swim"];
    for (let i = -13; i <= 0; i++) {
      const d = iso(i);
      const logged = Math.random() > 0.25;
      db.fitness.push({
        id: uid(),
        date: d,
        activity: logged ? activities[Math.floor(Math.random() * activities.length)] : "Rest",
        minutes: logged ? Math.round(15 + Math.random() * 60) : 0,
        intensity: logged ? Math.ceil(Math.random() * 5) : 1,
        mood: Math.ceil(2 + Math.random() * 3),
        energy: Math.ceil(2 + Math.random() * 3),
        note: "",
      });
    }

    db.notes = [
      { id: uid(), title: "Quarterly goals", content: "- Ship the redesign\n- Run a half marathon\n- Read 12 books\n- Save $3,000", template: "bulleted", linkedDate: null, isWeekNote: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: uid(), title: "Meeting notes — kickoff", content: "Discussed timeline, owners, and open risks. Follow up with design by Friday.", template: "lined", linkedDate: iso(1), isWeekNote: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: uid(), title: "Recipe sketch", content: "", template: "grid", linkedDate: null, isWeekNote: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];

    saveDB();
  }

  if (firstRun) seedDemoData();

  /* ---------------------------------------------------------------------
     UI state
     --------------------------------------------------------------------- */

  const savedUI = loadUI();
  const state = {
    view: (savedUI && savedUI.view) || "week",
    cursorDate: savedUI && savedUI.cursorDate ? fromISO(savedUI.cursorDate) : new Date(),
    hubTab: (savedUI && savedUI.hubTab) || "finance",
    notesFilter: (savedUI && savedUI.notesFilter) || "all",
    dragEventId: null,
  };

  document.documentElement.setAttribute("data-theme", db.settings.theme || "light");

  const el = (id) => document.getElementById(id);
  const qs = (sel, root) => (root || document).querySelector(sel);
  const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function navigate(view, date) {
    state.view = view;
    if (date) state.cursorDate = date;
    render();
  }

  function toast(msg) {
    const t = el("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._h);
    toast._h = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------------------------------------------------------------------
     Modal helpers
     --------------------------------------------------------------------- */

  function openModal(html) {
    el("modal").innerHTML = html;
    el("modal-scrim").classList.add("open");
    el("modal").classList.add("open");
    qsa("[data-close-modal]").forEach((b) => b.addEventListener("click", closeModal));
  }
  function closeModal() {
    el("modal").classList.remove("open");
    el("modal-scrim").classList.remove("open");
    setTimeout(() => (el("modal").innerHTML = ""), 180);
  }
  el("modal-scrim").addEventListener("click", closeModal);

  /* ---------------------------------------------------------------------
     Rail navigation
     --------------------------------------------------------------------- */

  const RAIL_LINKS = [
    { id: "year", label: "Year", ic: "▦" },
    { id: "month", label: "Month", ic: "▤" },
    { id: "week", label: "Week", ic: "▥" },
    { id: "day", label: "Day", ic: "▧" },
    { id: "hub", label: "Tracking Hub", ic: "◆", group: true },
    { id: "notes", label: "Notes", ic: "✎" },
  ];

  function renderRail() {
    const wrap = el("rail-links");
    wrap.innerHTML = RAIL_LINKS.map(
      (l) =>
        (l.group ? `<div class="rail-divider"></div>` : "") +
        `<button class="rail-link ${state.view === l.id ? "active" : ""}" data-nav="${l.id}"><span class="ic">${l.ic}</span><span>${l.label}</span></button>`
    ).join("");
    qsa("[data-nav]", wrap).forEach((b) => b.addEventListener("click", () => navigate(b.dataset.nav)));
  }

  /* ---------------------------------------------------------------------
     Crumbs
     --------------------------------------------------------------------- */

  function setCrumbs(parts) {
    el("crumbs").innerHTML = parts
      .map((p, i) => {
        const sep = i > 0 ? `<span class="crumb-sep">/</span>` : "";
        if (p.current) return `${sep}<span class="crumb current">${escapeHtml(p.label)}</span>`;
        return `${sep}<button class="crumb" data-crumb="${i}">${escapeHtml(p.label)}</button>`;
      })
      .join("");
    qsa("[data-crumb]", el("crumbs")).forEach((b, i) => {
      const part = parts[+b.dataset.crumb];
      if (part.onClick) b.addEventListener("click", part.onClick);
    });
  }

  /* =======================================================================
     YEAR VIEW
     ======================================================================= */

  function renderYear() {
    const year = state.cursorDate.getFullYear();
    setCrumbs([{ label: String(year), current: true }]);

    const view = el("view");
    view.innerHTML = `
      <div class="view-head">
        <div><h1 class="view-title">${year}</h1><div class="view-sub">A year of days — click any month to open it.</div></div>
        <div class="nav-arrows">
          <button class="btn-icon" id="y-prev">‹</button>
          <button class="btn-ghost" id="y-today">This year</button>
          <button class="btn-icon" id="y-next">›</button>
        </div>
      </div>
      <div class="year-grid">${MONTHS.map((m, mi) => miniMonthHTML(year, mi)).join("")}</div>
    `;

    el("y-prev").addEventListener("click", () => navigate("year", new Date(year - 1, state.cursorDate.getMonth(), 1)));
    el("y-next").addEventListener("click", () => navigate("year", new Date(year + 1, state.cursorDate.getMonth(), 1)));
    el("y-today").addEventListener("click", () => navigate("year", new Date()));
    qsa(".mini-month", view).forEach((m) =>
      m.addEventListener("click", () => navigate("month", new Date(year, +m.dataset.month, 1)))
    );
  }

  function miniMonthHTML(year, monthIndex) {
    const first = new Date(year, monthIndex, 1);
    const gridStart = startOfWeek(first, db.settings.weekStart);
    const isCurrent = new Date().getFullYear() === year && new Date().getMonth() === monthIndex;
    let cells = "";
    for (let i = 0; i < 42; i++) {
      const d = addDays(gridStart, i);
      const out = d.getMonth() !== monthIndex;
      const iso = toISO(d);
      const isToday = isSameISO(d, new Date());
      const hasEv = !out && dateHasEvents(iso);
      cells += `<div class="mini-cell ${out ? "out" : ""} ${isToday ? "today" : ""} ${hasEv ? "has-events" : ""}">${out ? "" : d.getDate()}</div>`;
    }
    return `<div class="mini-month ${isCurrent ? "is-current" : ""}" data-month="${monthIndex}">
      <div class="mini-month-name">${MONTHS[monthIndex]}</div>
      <div class="mini-grid">${DOW.map((d) => `<div class="mini-dow">${d[0]}</div>`).join("")}${cells}</div>
    </div>`;
  }

  /* =======================================================================
     MONTH VIEW
     ======================================================================= */

  function renderMonth() {
    const y = state.cursorDate.getFullYear();
    const m = state.cursorDate.getMonth();
    setCrumbs([
      { label: String(y), onClick: () => navigate("year", new Date(y, 0, 1)) },
      { label: MONTHS[m], current: true },
    ]);

    const first = new Date(y, m, 1);
    const gridStart = startOfWeek(first, db.settings.weekStart);
    const dowLabels = [...Array(7)].map((_, i) => DOW[(db.settings.weekStart + i) % 7]);

    let cells = "";
    for (let i = 0; i < 42; i++) {
      const d = addDays(gridStart, i);
      const iso = toISO(d);
      const out = d.getMonth() !== m;
      const isToday = isSameISO(d, new Date());
      const items = getEventsOnDate(iso).slice(0, 3);
      const total = getEventsOnDate(iso).length;
      const habits = habitsForDate(iso).slice(0, 6);
      cells += `<div class="month-cell ${out ? "out" : ""} ${isToday ? "today" : ""}" data-date="${iso}">
        <span class="month-daynum">${d.getDate()}</span>
        ${items.map((it) => `<span class="month-chip ${it.done ? "done" : ""}"><span class="dot" style="background:${catMeta(it.ev.category).swatch}"></span>${escapeHtml(it.ev.title)}</span>`).join("")}
        ${total > 3 ? `<span class="month-more">+${total - 3} more</span>` : ""}
        ${habits.length ? `<div class="month-habits">${habits.map((h) => `<span class="dot" style="background:${h.color};opacity:${habitDone(h.id, iso) ? 1 : 0.25}"></span>`).join("")}</div>` : ""}
      </div>`;
      if (i === 41) break;
    }

    el("view").innerHTML = `
      <div class="view-head">
        <div><h1 class="view-title">${MONTHS[m]} ${y}</h1><div class="view-sub">Click a day to open it.</div></div>
        <div class="nav-arrows">
          <button class="btn-icon" id="m-prev">‹</button>
          <button class="btn-ghost" id="m-today">Today</button>
          <button class="btn-icon" id="m-next">›</button>
        </div>
      </div>
      <div class="month-grid">
        ${dowLabels.map((d) => `<div class="month-dow">${d}</div>`).join("")}
        ${cells}
      </div>
    `;

    el("m-prev").addEventListener("click", () => navigate("month", addMonths(state.cursorDate, -1)));
    el("m-next").addEventListener("click", () => navigate("month", addMonths(state.cursorDate, 1)));
    el("m-today").addEventListener("click", () => navigate("month", new Date()));
    qsa(".month-cell", el("view")).forEach((c) => c.addEventListener("click", () => navigate("day", fromISO(c.dataset.date))));
  }

  /* =======================================================================
     WEEK VIEW
     ======================================================================= */

  function renderWeek() {
    const monday = startOfWeek(state.cursorDate, db.settings.weekStart);
    const weekDates = [...Array(7)].map((_, i) => addDays(monday, i));
    const mondayISO = toISO(monday);
    const sunday = weekDates[6];
    const rangeLabel =
      monday.getMonth() === sunday.getMonth()
        ? `${MONTHS[monday.getMonth()]} ${monday.getDate()}–${sunday.getDate()}, ${monday.getFullYear()}`
        : `${MONTHS_SHORT[monday.getMonth()]} ${monday.getDate()} – ${MONTHS_SHORT[sunday.getMonth()]} ${sunday.getDate()}, ${sunday.getFullYear()}`;

    setCrumbs([
      { label: String(monday.getFullYear()), onClick: () => navigate("year", monday) },
      { label: MONTHS[monday.getMonth()], onClick: () => navigate("month", monday) },
      { label: `Week of ${monday.getDate()}`, current: true },
    ]);

    el("view").innerHTML = `
      <div class="view-head">
        <div><h1 class="view-title">${rangeLabel}</h1><div class="view-sub">Drag tasks onto the time grid to schedule them.</div></div>
        <div class="nav-arrows">
          <button class="btn-icon" id="w-prev">‹</button>
          <button class="btn-ghost" id="w-today">This week</button>
          <button class="btn-icon" id="w-next">›</button>
        </div>
      </div>

      <div class="week-columns-head">
        <div></div>
        ${weekDates.map((d) => `<div class="week-col-head ${isSameISO(d, new Date()) ? "today" : ""}"><div class="wd">${DOW[d.getDay()]}</div><div class="dn">${d.getDate()}</div></div>`).join("")}
      </div>

      <div class="week-lists">
        ${weekDates.map((d) => weekDayListHTML(d)).join("")}
      </div>

      <div class="card" style="margin-bottom:22px;">
        <div class="card-title"><span>Weekly note</span></div>
        <textarea class="note-canvas" style="min-height:90px;" id="week-note" placeholder="Reflections, priorities, or a plan for the week…">${escapeHtml((weekNote(mondayISO) || {}).content || "")}</textarea>
      </div>

      <div class="card-title" style="margin-bottom:10px;">Time-blocking grid <span class="muted" style="font-weight:400;font-size:12px;">${HOUR_START}:00 – ${HOUR_END}:00</span></div>
      <div class="timegrid-wrap">
        <div class="timegrid" id="timegrid" style="grid-template-rows: repeat(${TOTAL_SLOTS}, 24px);">
          ${timegridLabelsHTML()}
          ${weekDates.map((d, di) => timegridColumnHTML(d, di)).join("")}
          ${weekDates.map((d, di) => timegridBlocksHTML(d, di)).join("")}
        </div>
      </div>
    `;

    el("w-prev").addEventListener("click", () => navigate("week", addDays(state.cursorDate, -7)));
    el("w-next").addEventListener("click", () => navigate("week", addDays(state.cursorDate, 7)));
    el("w-today").addEventListener("click", () => navigate("week", new Date()));

    let noteTimer;
    el("week-note").addEventListener("input", (e) => {
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => {
        const existing = weekNote(mondayISO);
        upsertNote({ id: existing ? existing.id : undefined, title: `Week of ${mondayISO}`, content: e.target.value, template: "plain", linkedDate: mondayISO, isWeekNote: true });
      }, 400);
    });

    bindTaskRowEvents(el("view"));
    bindWeekDragDrop(weekDates);
  }

  function weekDayListHTML(d) {
    const iso = toISO(d);
    const items = getEventsOnDate(iso).filter((it) => !it.ev.time);
    return `<div class="week-day-list" data-date="${iso}">
      ${items.length ? items.map((it) => taskRowHTML(it, iso)).join("") : `<div class="empty-hint">No tasks</div>`}
    </div>`;
  }

  function taskRowHTML(it, dateStr) {
    const ev = it.ev;
    const pClass = ev.priority === "high" ? "priority-high" : ev.priority === "low" ? "priority-low" : "";
    return `<div class="task-row ${it.done ? "done" : ""} ${pClass}" draggable="true" data-id="${ev.id}" data-date="${dateStr}">
      <span class="task-check" data-toggle="${ev.id}" data-date="${dateStr}">${it.done ? "✓" : ""}</span>
      <span class="task-title" data-edit="${ev.id}">${escapeHtml(ev.title)}${ev.time ? `<span class="task-time"> · ${timeLabel(ev.time)}</span>` : ""}</span>
    </div>`;
  }

  function bindTaskRowEvents(root) {
    qsa("[data-toggle]", root).forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleEventDone(b.dataset.toggle, b.dataset.date);
        render();
      })
    );
    qsa("[data-edit]", root).forEach((t) =>
      t.addEventListener("click", () => openTaskModal(db.events.find((e) => e.id === t.dataset.edit)))
    );
  }

  function timegridLabelsHTML() {
    let out = "";
    for (let h = HOUR_START; h < HOUR_END; h++) {
      const rowStart = (h - HOUR_START) * SLOTS_PER_HOUR + 1;
      out += `<div class="tg-hourlabel" style="grid-column:1; grid-row:${rowStart} / span ${SLOTS_PER_HOUR};">${timeLabel(pad2(h) + ":00")}</div>`;
    }
    return out;
  }

  function timegridColumnHTML(d, dayIndex) {
    const iso = toISO(d);
    let out = "";
    for (let s = 0; s < TOTAL_SLOTS; s++) {
      out += `<div class="tg-cell" data-day="${dayIndex}" data-slot="${s}" data-date="${iso}" style="grid-column:${dayIndex + 2}; grid-row:${s + 1};"></div>`;
    }
    return out;
  }

  function minutesToSlot(time) {
    const [h, m] = time.split(":").map(Number);
    return clamp(Math.round(((h - HOUR_START) * 60 + m) / SLOT_MIN), 0, TOTAL_SLOTS - 1);
  }
  function slotToTime(slot) {
    const totalMin = HOUR_START * 60 + slot * SLOT_MIN;
    return `${pad2(Math.floor(totalMin / 60))}:${pad2(totalMin % 60)}`;
  }
  function durationMinutes(ev) {
    if (!ev.time) return 60;
    if (!ev.endTime) return 60;
    const [sh, sm] = ev.time.split(":").map(Number);
    const [eh, em] = ev.endTime.split(":").map(Number);
    return Math.max(SLOT_MIN, eh * 60 + em - (sh * 60 + sm));
  }

  function timegridBlocksHTML(d, dayIndex) {
    const iso = toISO(d);
    return getEventsOnDate(iso)
      .filter((it) => it.ev.time)
      .map((it) => {
        const ev = it.ev;
        const startSlot = minutesToSlot(ev.time);
        const durSlots = clamp(Math.round(durationMinutes(ev) / SLOT_MIN), 1, TOTAL_SLOTS - startSlot);
        return `<div class="tg-block cat-${ev.category}" draggable="true" data-id="${ev.id}" data-date="${iso}"
          style="grid-column:${dayIndex + 2}; grid-row:${startSlot + 1} / span ${durSlots};">
          <strong>${escapeHtml(ev.title)}</strong>${timeLabel(ev.time)}${ev.endTime ? "–" + timeLabel(ev.endTime) : ""}
        </div>`;
      })
      .join("");
  }

  function bindWeekDragDrop(weekDates) {
    const grid = el("timegrid");

    qsa(".task-row, .tg-block", el("view")).forEach((node) => {
      node.addEventListener("dragstart", (e) => {
        state.dragEventId = node.dataset.id;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", node.dataset.id);
      });
    });

    qsa(".tg-cell", grid).forEach((cell) => {
      cell.addEventListener("dragover", (e) => {
        e.preventDefault();
        cell.classList.add("dragover");
      });
      cell.addEventListener("dragleave", () => cell.classList.remove("dragover"));
      cell.addEventListener("drop", (e) => {
        e.preventDefault();
        cell.classList.remove("dragover");
        const id = state.dragEventId || e.dataTransfer.getData("text/plain");
        const ev = db.events.find((x) => x.id === id);
        if (!ev) return;
        const dur = durationMinutes(ev);
        const newTime = slotToTime(+cell.dataset.slot);
        const newDate = cell.dataset.date;
        const startMin = HOUR_START * 60 + (+cell.dataset.slot) * SLOT_MIN;
        const endMin = startMin + dur;
        ev.date = newDate;
        ev.time = newTime;
        ev.endTime = `${pad2(Math.floor(endMin / 60))}:${pad2(endMin % 60)}`;
        saveDB();
        render();
      });
    });

    qsa(".week-day-list", el("view")).forEach((list) => {
      list.addEventListener("dragover", (e) => {
        e.preventDefault();
        list.classList.add("dragover");
      });
      list.addEventListener("dragleave", () => list.classList.remove("dragover"));
      list.addEventListener("drop", (e) => {
        e.preventDefault();
        list.classList.remove("dragover");
        const id = state.dragEventId || e.dataTransfer.getData("text/plain");
        const ev = db.events.find((x) => x.id === id);
        if (!ev) return;
        ev.date = list.dataset.date;
        ev.time = null;
        ev.endTime = null;
        saveDB();
        render();
      });
    });

    qsa(".tg-cell", grid).forEach((cell) =>
      cell.addEventListener("click", () => {
        openTaskModal(null, { date: cell.dataset.date, time: slotToTime(+cell.dataset.slot) });
      })
    );
  }

  /* =======================================================================
     DAY VIEW
     ======================================================================= */

  function renderDay() {
    const d = state.cursorDate;
    const iso = toISO(d);
    const monday = startOfWeek(d, db.settings.weekStart);

    setCrumbs([
      { label: String(d.getFullYear()), onClick: () => navigate("year", d) },
      { label: MONTHS[d.getMonth()], onClick: () => navigate("month", d) },
      { label: `Week of ${monday.getDate()}`, onClick: () => navigate("week", d) },
      { label: `${DOW[d.getDay()]} ${d.getDate()}`, current: true },
    ]);

    const items = getEventsOnDate(iso);
    const timed = items.filter((it) => it.ev.time);
    const untimed = items.filter((it) => !it.ev.time);
    const habits = habitsForDate(iso);
    const notes = notesForDate(iso);

    el("view").innerHTML = `
      <div class="view-head">
        <div><h1 class="view-title">${DOW_FULL[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}</h1><div class="view-sub">${isSameISO(d, new Date()) ? "Today" : ""}</div></div>
        <div class="nav-arrows">
          <button class="btn-icon" id="d-prev">‹</button>
          <button class="btn-ghost" id="d-today">Today</button>
          <button class="btn-icon" id="d-next">›</button>
        </div>
      </div>

      <div class="day-layout">
        <div>
          <div class="card-title">Schedule</div>
          <div class="day-schedule" style="margin-bottom:22px;">
            ${timed.length ? timed.map((it) => dayEventHTML(it, iso)).join("") : `<div class="empty-hint">Nothing scheduled — enjoy the open time.</div>`}
          </div>
          <div class="card-title">Tasks</div>
          <div class="day-schedule">
            ${untimed.length ? untimed.map((it) => dayEventHTML(it, iso)).join("") : `<div class="empty-hint">No unscheduled tasks.</div>`}
          </div>
        </div>

        <div>
          <div class="card" style="margin-bottom:16px;">
            <div class="card-title"><span>Habits</span></div>
            ${habits.length ? habits.map((h) => habitRowHTML(h, iso)).join("") : `<div class="empty-hint">No habits scheduled today.</div>`}
          </div>
          <div class="card">
            <div class="card-title"><span>Notes</span><button class="btn-text" id="add-day-note">+ Add</button></div>
            ${notes.length ? notes.map((n) => `<div class="note-chip" data-note="${n.id}">${escapeHtml(n.title || "Untitled note")}</div>`).join("") : `<div class="empty-hint">No notes linked to this day.</div>`}
          </div>
        </div>
      </div>
    `;

    el("d-prev").addEventListener("click", () => navigate("day", addDays(d, -1)));
    el("d-next").addEventListener("click", () => navigate("day", addDays(d, 1)));
    el("d-today").addEventListener("click", () => navigate("day", new Date()));
    el("add-day-note").addEventListener("click", () => openNoteModal(null, iso));
    qsa("[data-note]", el("view")).forEach((n) => n.addEventListener("click", () => openNoteModal(db.notes.find((x) => x.id === n.dataset.note))));
    qsa("[data-habit-toggle]", el("view")).forEach((b) =>
      b.addEventListener("click", () => {
        toggleHabit(b.dataset.habitToggle, iso);
        render();
      })
    );
    bindTaskRowEvents(el("view"));
  }

  function dayEventHTML(it, iso) {
    const ev = it.ev;
    return `<div class="day-event ${it.done ? "done" : ""}">
      <div class="day-event-time">${ev.time ? timeLabel(ev.time) : ""}</div>
      <div class="day-event-main">
        <div class="day-event-title" data-edit="${ev.id}">${escapeHtml(ev.title)}</div>
        ${ev.notes ? `<div class="day-event-notes">${escapeHtml(ev.notes)}</div>` : ""}
      </div>
      <div class="day-event-actions">
        <span class="task-check" data-toggle="${ev.id}" data-date="${iso}">${it.done ? "✓" : ""}</span>
      </div>
    </div>`;
  }

  function habitRowHTML(h, iso) {
    const on = habitDone(h.id, iso);
    const streak = habitStreak(h.id, iso);
    return `<div class="habit-row">
      <button class="habit-toggle ${on ? "on" : ""}" data-habit-toggle="${h.id}">${on ? "✓" : ""}</button>
      <span class="dot" style="background:${h.color}"></span>
      <span class="habit-name">${escapeHtml(h.name)}</span>
      <span class="habit-streak">${streak > 0 ? streak + "d streak" : ""}</span>
    </div>`;
  }

  /* =======================================================================
     TASK MODAL
     ======================================================================= */

  function openTaskModal(ev, defaults) {
    const isEdit = !!ev;
    const v = ev || Object.assign({ title: "", date: toISO(state.cursorDate), time: "", endTime: "", category: "personal", priority: "med", notes: "", recurrence: null }, defaults || {});
    const rec = v.recurrence || {};
    openModal(`
      <h2 class="modal-title">${isEdit ? "Edit task" : "New task or appointment"}</h2>
      <form id="task-form">
        <label class="field" style="margin-bottom:10px;">Title
          <input type="text" name="title" required value="${escapeHtml(v.title)}" placeholder="What needs doing?" />
        </label>
        <div class="form-grid" style="margin-bottom:10px;">
          <label class="field">Date<input type="date" name="date" required value="${v.date}" /></label>
          <label class="field">Category
            <select name="category">${CATEGORIES.map((c) => `<option value="${c.id}" ${v.category === c.id ? "selected" : ""}>${c.label}</option>`).join("")}</select>
          </label>
        </div>
        <div class="form-grid" style="margin-bottom:10px;">
          <label class="field">Start time<input type="time" name="time" value="${v.time || ""}" /></label>
          <label class="field">End time<input type="time" name="endTime" value="${v.endTime || ""}" /></label>
        </div>
        <div class="form-grid" style="margin-bottom:10px;">
          <label class="field">Priority
            <select name="priority"><option value="low" ${v.priority === "low" ? "selected" : ""}>Low</option><option value="med" ${v.priority === "med" ? "selected" : ""}>Medium</option><option value="high" ${v.priority === "high" ? "selected" : ""}>High</option></select>
          </label>
          <label class="field">Repeats
            <select name="freq"><option value="" ${!rec.freq ? "selected" : ""}>Never</option><option value="daily" ${rec.freq === "daily" ? "selected" : ""}>Daily</option><option value="weekly" ${rec.freq === "weekly" ? "selected" : ""}>Weekly</option><option value="monthly" ${rec.freq === "monthly" ? "selected" : ""}>Monthly</option></select>
          </label>
        </div>
        <label class="field" style="margin-bottom:14px;">Notes<textarea name="notes" placeholder="Details…">${escapeHtml(v.notes || "")}</textarea></label>
        <div class="form-actions">
          <div>${isEdit ? `<button type="button" class="btn-line" id="task-delete" style="color:var(--bad);border-color:var(--bad);">Delete</button>` : ""}</div>
          <div style="display:flex;gap:8px;">
            <button type="button" class="btn-ghost" data-close-modal>Cancel</button>
            <button type="submit" class="btn-primary">${isEdit ? "Save" : "Add"}</button>
          </div>
        </div>
      </form>
    `);

    el("task-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const freq = f.get("freq");
      upsertEvent({
        id: ev ? ev.id : undefined,
        title: f.get("title").trim(),
        date: f.get("date"),
        time: f.get("time") || null,
        endTime: f.get("endTime") || null,
        category: f.get("category"),
        priority: f.get("priority"),
        notes: f.get("notes"),
        recurrence: freq ? { freq, interval: 1, until: null } : null,
      });
      closeModal();
      render();
      toast(isEdit ? "Task updated" : "Task added");
    });
    if (isEdit) {
      el("task-delete").addEventListener("click", () => {
        deleteEvent(ev.id);
        closeModal();
        render();
        toast("Task deleted");
      });
    }
  }

  /* =======================================================================
     TRACKING HUB
     ======================================================================= */

  function renderHub() {
    setCrumbs([{ label: "Tracking Hub", current: true }]);
    el("view").innerHTML = `
      <div class="view-head"><div><h1 class="view-title">Tracking Hub</h1><div class="view-sub">Finance and fitness, at a glance.</div></div></div>
      <div class="hub-tabs">
        <button class="hub-tab ${state.hubTab === "finance" ? "active" : ""}" data-tab="finance">Finance</button>
        <button class="hub-tab ${state.hubTab === "fitness" ? "active" : ""}" data-tab="fitness">Fitness &amp; Mind</button>
      </div>
      <div id="hub-body"></div>
    `;
    qsa("[data-tab]", el("view")).forEach((b) =>
      b.addEventListener("click", () => {
        state.hubTab = b.dataset.tab;
        renderHub();
      })
    );
    if (state.hubTab === "finance") renderFinanceTab();
    else renderFitnessTab();
  }

  function renderFinanceTab() {
    const [mStart, mEnd] = monthRangeISO(state.cursorDate);
    const monthEntries = db.finance.filter((f) => f.date >= mStart && f.date <= mEnd);
    const income = monthEntries.filter((f) => f.type === "income").reduce((s, f) => s + f.amount, 0);
    const expense = monthEntries.filter((f) => f.type === "expense").reduce((s, f) => s + f.amount, 0);
    const net = income - expense;

    const byCat = EXPENSE_CATS.map((c) => ({
      label: c.label,
      color: c.swatch,
      value: monthEntries.filter((f) => f.type === "expense" && f.category === c.id).reduce((s, f) => s + f.amount, 0),
    })).filter((c) => c.value > 0);

    const recent = db.finance
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12);

    el("hub-body").innerHTML = `
      <div class="stat-row">
        <div class="stat-tile"><div class="stat-label">Income (${MONTHS_SHORT[state.cursorDate.getMonth()]})</div><div class="stat-value pos">${money(income)}</div></div>
        <div class="stat-tile"><div class="stat-label">Expenses (${MONTHS_SHORT[state.cursorDate.getMonth()]})</div><div class="stat-value neg">${money(expense)}</div></div>
        <div class="stat-tile"><div class="stat-label">Net</div><div class="stat-value ${net >= 0 ? "pos" : "neg"}">${money(net)}</div></div>
      </div>
      <div class="hub-grid">
        <div class="viz-root">
          <div class="viz-title">Spending by category</div>
          <div class="viz-sub">${MONTHS[state.cursorDate.getMonth()]} ${state.cursorDate.getFullYear()}</div>
          <div id="finance-bars">${byCat.length ? "" : `<div class="viz-empty">No expenses logged this month yet.</div>`}</div>
        </div>
        <div class="card">
          <div class="card-title"><span>Log an entry</span></div>
          <form id="finance-form" class="tracker-form">
            <label class="field">Date<input type="date" name="date" value="${todayISO()}" required /></label>
            <label class="field">Type<select name="type"><option value="expense">Expense</option><option value="income">Income</option></select></label>
            <label class="field">Category<select name="category">${EXPENSE_CATS.map((c) => `<option value="${c.id}">${c.label}</option>`).join("")}</select></label>
            <label class="field">Amount<input type="number" name="amount" min="0" step="0.01" required placeholder="0.00" /></label>
            <label class="field full">Note<input type="text" name="note" placeholder="Optional" /></label>
            <div class="full"><button type="submit" class="btn-primary" style="width:100%;">Add entry</button></div>
          </form>
          <div class="card-title" style="margin-top:6px;"><span>Recent</span></div>
          <div class="tracker-list">${recent.length ? recent.map(financeItemHTML).join("") : `<div class="empty-hint">No entries yet.</div>`}</div>
        </div>
      </div>
    `;

    if (byCat.length) renderHBars(el("finance-bars"), byCat, money);

    el("finance-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      addFinance({ date: f.get("date"), type: f.get("type"), category: f.get("category"), amount: +f.get("amount"), note: f.get("note") });
      renderHub();
      toast("Entry logged");
    });
    qsa("[data-fin-del]", el("hub-body")).forEach((b) =>
      b.addEventListener("click", () => {
        deleteFinance(b.dataset.finDel);
        renderHub();
      })
    );
  }

  function financeItemHTML(f) {
    const cat = expenseCatMeta(f.category);
    return `<div class="tracker-item">
      <div class="ti-main"><span>${f.type === "income" ? "Income" : escapeHtml(cat.label)}${f.note ? " · " + escapeHtml(f.note) : ""}</span><span class="faint">${f.date}</span></div>
      <span class="ti-amt ${f.type}">${f.type === "expense" ? "-" : "+"}${money(f.amount)}</span>
      <button class="ti-del" data-fin-del="${f.id}">✕</button>
    </div>`;
  }

  function renderFitnessTab() {
    const today = new Date();
    const last14 = [...Array(14)].map((_, i) => toISO(addDays(today, i - 13)));
    const last7 = last14.slice(7);
    const byDate = {};
    db.fitness.forEach((f) => (byDate[f.date] = f));

    const weekMinutes = last7.reduce((s, d) => s + (byDate[d] ? byDate[d].minutes : 0), 0);
    const workouts = last7.filter((d) => byDate[d] && byDate[d].minutes > 0).length;
    const avgMood = (() => {
      const vals = last7.map((d) => byDate[d] && byDate[d].mood).filter(Boolean);
      return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : "–";
    })();

    const moodSeries = last14.map((d) => ({ label: DOW[fromISO(d).getDay()][0], value: byDate[d] ? byDate[d].mood : null }));
    const minuteSeries = last7.map((d) => ({ label: DOW[fromISO(d).getDay()][0], value: byDate[d] ? byDate[d].minutes : 0, color: "var(--viz-2)" }));

    const recent = db.fitness
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12);

    el("hub-body").innerHTML = `
      <div class="stat-row">
        <div class="stat-tile"><div class="stat-label">Active minutes (7d)</div><div class="stat-value">${weekMinutes}</div></div>
        <div class="stat-tile"><div class="stat-label">Workouts (7d)</div><div class="stat-value">${workouts}</div></div>
        <div class="stat-tile"><div class="stat-label">Avg mood (7d)</div><div class="stat-value">${avgMood}<span class="muted" style="font-size:14px;">/5</span></div></div>
      </div>
      <div class="hub-grid">
        <div>
          <div class="viz-root" style="margin-bottom:16px;">
            <div class="viz-title">Mood, last 14 days</div>
            <div class="viz-sub">Self-reported, 1 (low) – 5 (great)</div>
            <div id="mood-chart"></div>
          </div>
          <div class="viz-root">
            <div class="viz-title">Active minutes, last 7 days</div>
            <div class="viz-sub">Logged workouts and movement</div>
            <div id="minutes-chart"></div>
          </div>
        </div>
        <div class="card">
          <div class="card-title"><span>Log activity</span></div>
          <form id="fitness-form" class="tracker-form">
            <label class="field">Date<input type="date" name="date" value="${todayISO()}" required /></label>
            <label class="field">Activity<input type="text" name="activity" placeholder="Run, yoga, walk…" required /></label>
            <label class="field">Minutes<input type="number" name="minutes" min="0" step="1" value="30" /></label>
            <label class="field">Intensity<select name="intensity"><option value="1">1 · Easy</option><option value="2">2</option><option value="3" selected>3 · Moderate</option><option value="4">4</option><option value="5">5 · Max</option></select></label>
            <label class="field">Mood today<select name="mood"><option value="1">1 · Low</option><option value="2">2</option><option value="3" selected>3</option><option value="4">4</option><option value="5">5 · Great</option></select></label>
            <label class="field">Energy<select name="energy"><option value="1">1</option><option value="2">2</option><option value="3" selected>3</option><option value="4">4</option><option value="5">5</option></select></label>
            <div class="full"><button type="submit" class="btn-primary" style="width:100%;">Add entry</button></div>
          </form>
          <div class="card-title" style="margin-top:6px;"><span>Recent</span></div>
          <div class="tracker-list">${recent.length ? recent.map(fitnessItemHTML).join("") : `<div class="empty-hint">No entries yet.</div>`}</div>
        </div>
      </div>
    `;

    renderLineChart(el("mood-chart"), moodSeries, { min: 1, max: 5, color: "var(--viz-1)" });
    renderBarChart(el("minutes-chart"), minuteSeries);

    el("fitness-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      addFitness({
        date: f.get("date"),
        activity: f.get("activity"),
        minutes: +f.get("minutes"),
        intensity: +f.get("intensity"),
        mood: +f.get("mood"),
        energy: +f.get("energy"),
        note: "",
      });
      renderHub();
      toast("Activity logged");
    });
    qsa("[data-fit-del]", el("hub-body")).forEach((b) =>
      b.addEventListener("click", () => {
        deleteFitness(b.dataset.fitDel);
        renderHub();
      })
    );
  }

  function fitnessItemHTML(f) {
    return `<div class="tracker-item">
      <div class="ti-main"><span>${escapeHtml(f.activity)} · ${f.minutes}min</span><span class="faint">${f.date} · mood ${f.mood}/5</span></div>
      <button class="ti-del" data-fit-del="${f.id}">✕</button>
    </div>`;
  }

  /* ---------------------------------------------------------------------
     Tiny chart renderers (dataviz-style: validated categorical hues,
     4px rounded bar ends, hairline gridlines, native tooltip on hover)
     --------------------------------------------------------------------- */

  function renderHBars(container, data, fmt) {
    fmt = fmt || ((v) => v);
    const max = Math.max(1, ...data.map((d) => d.value));
    container.innerHTML = data
      .map(
        (d) => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <div style="width:96px;font-size:11.5px;color:var(--viz-ink-soft);text-align:right;flex-shrink:0;">${escapeHtml(d.label)}</div>
        <div style="flex:1;background:var(--viz-grid);border-radius:4px;height:14px;position:relative;overflow:hidden;" title="${escapeHtml(d.label)}: ${fmt(d.value)}">
          <div style="width:${((d.value / max) * 100).toFixed(1)}%;background:${d.color};height:100%;border-radius:4px;"></div>
        </div>
        <div style="width:72px;font-size:11.5px;color:var(--viz-ink);font-variant-numeric:tabular-nums;">${fmt(d.value)}</div>
      </div>`
      )
      .join("");
  }

  function renderBarChart(container, data) {
    if (!data.some((d) => d.value > 0)) {
      container.innerHTML = `<div class="viz-empty">No data yet — log an entry to see this chart.</div>`;
      return;
    }
    const width = 480,
      height = 200,
      padL = 8,
      padR = 8,
      padT = 10,
      padB = 26;
    const plotW = width - padL - padR,
      plotH = height - padT - padB;
    const max = Math.max(1, ...data.map((d) => d.value));
    const gap = plotW / data.length;
    const bw = Math.min(38, gap * 0.5);
    let bars = "",
      labels = "";
    data.forEach((d, i) => {
      const h = (d.value / max) * plotH;
      const x = padL + i * gap + (gap - bw) / 2;
      const y = padT + (plotH - h);
      bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, 2).toFixed(1)}" rx="4" fill="${d.color || "var(--viz-1)"}"><title>${escapeHtml(d.label)}: ${d.value}</title></rect>`;
      labels += `<text x="${(x + bw / 2).toFixed(1)}" y="${height - 8}" text-anchor="middle" class="viz-bar-label">${escapeHtml(d.label)}</text>`;
    });
    container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="bar chart">
      <line x1="${padL}" y1="${padT + plotH}" x2="${width - padR}" y2="${padT + plotH}" stroke="var(--viz-grid)" stroke-width="1"/>
      ${bars}${labels}
    </svg>`;
  }

  function renderLineChart(container, data, opts) {
    opts = opts || {};
    const min = opts.min ?? 0,
      max = opts.max ?? Math.max(...data.map((d) => d.value || 0), 1),
      color = opts.color || "var(--viz-1)";
    const width = 480,
      height = 190,
      padL = 26,
      padR = 12,
      padT = 14,
      padB = 24;
    const plotW = width - padL - padR,
      plotH = height - padT - padB;
    const known = data.filter((d) => d.value != null);
    if (!known.length) {
      container.innerHTML = `<div class="viz-empty">No data yet — log an entry to see this chart.</div>`;
      return;
    }
    const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;
    const scaleY = (v) => padT + plotH - ((v - min) / (max - min || 1)) * plotH;

    const segments = [];
    let current = [];
    data.forEach((d, i) => {
      if (d.value == null) {
        if (current.length) segments.push(current);
        current = [];
      } else {
        current.push([padL + i * stepX, scaleY(d.value), d]);
      }
    });
    if (current.length) segments.push(current);

    let polylines = "",
      dots = "";
    segments.forEach((seg) => {
      polylines += `<polyline points="${seg.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      seg.forEach((p) => (dots += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="${color}"><title>${escapeHtml(p[2].label)}: ${p[2].value}</title></circle>`));
    });

    const gridVals = [min, (min + max) / 2, max];
    const grid = gridVals
      .map(
        (v) =>
          `<line x1="${padL}" y1="${scaleY(v).toFixed(1)}" x2="${width - padR}" y2="${scaleY(v).toFixed(1)}" stroke="var(--viz-grid)" stroke-width="1"/><text x="${padL - 6}" y="${(scaleY(v) + 3).toFixed(1)}" text-anchor="end" class="viz-bar-label">${Math.round(v)}</text>`
      )
      .join("");
    let xlabels = "";
    [0, Math.floor((data.length - 1) / 2), data.length - 1].forEach((i) => {
      if (data[i]) xlabels += `<text x="${(padL + i * stepX).toFixed(1)}" y="${height - 6}" text-anchor="middle" class="viz-bar-label">${data[i].label}</text>`;
    });

    container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="line chart">${grid}${polylines}${dots}${xlabels}</svg>`;
  }

  /* =======================================================================
     NOTES
     ======================================================================= */

  function renderNotes() {
    setCrumbs([{ label: "Notes", current: true }]);
    const filter = state.notesFilter;
    const list = db.notes
      .filter((n) => (filter === "linked" ? n.linkedDate : filter === "library" ? !n.linkedDate : true))
      .filter((n) => !n.isWeekNote)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    el("view").innerHTML = `
      <div class="view-head"><div><h1 class="view-title">Notes</h1><div class="view-sub">A library of pages — plain, lined, grid or bulleted.</div></div>
        <button class="btn-primary" id="new-note">+ New note</button>
      </div>
      <div class="notes-toolbar">
        <div class="notes-filters">
          <button class="filter-chip ${filter === "all" ? "active" : ""}" data-filter="all">All</button>
          <button class="filter-chip ${filter === "library" ? "active" : ""}" data-filter="library">Library</button>
          <button class="filter-chip ${filter === "linked" ? "active" : ""}" data-filter="linked">Linked to a day</button>
        </div>
      </div>
      <div class="notes-grid">
        ${list.length ? list.map(noteCardHTML).join("") : `<div class="empty-hint">No notes here yet.</div>`}
      </div>
    `;
    el("new-note").addEventListener("click", () => openNoteModal(null));
    qsa("[data-filter]", el("view")).forEach((b) =>
      b.addEventListener("click", () => {
        state.notesFilter = b.dataset.filter;
        renderNotes();
      })
    );
    qsa(".note-card", el("view")).forEach((c) => c.addEventListener("click", () => openNoteModal(db.notes.find((n) => n.id === c.dataset.id))));
  }

  function noteCardHTML(n) {
    return `<div class="note-card" data-id="${n.id}">
      <div class="note-card-title">${escapeHtml(n.title || "Untitled note")}</div>
      <div class="note-card-preview">${escapeHtml(n.content || "")}</div>
      <div class="note-card-meta"><span>${n.template}</span>${n.linkedDate ? `<span>${n.linkedDate}</span>` : `<span>Library</span>`}</div>
    </div>`;
  }

  function openNoteModal(note, linkedDateDefault) {
    const isEdit = !!note;
    const v = note || { title: "", content: "", template: "plain", linkedDate: linkedDateDefault || "" };
    openModal(`
      <h2 class="modal-title">${isEdit ? "Edit note" : "New note"}</h2>
      <form id="note-form" class="note-editor-grid">
        <label class="field">Title<input type="text" name="title" value="${escapeHtml(v.title)}" placeholder="Untitled note" /></label>
        <label class="field">Template
          <div class="note-template-swatches">
            ${NOTE_TEMPLATES.map((t) => `<button type="button" class="tpl-swatch tpl-${t} ${v.template === t ? "active" : ""}" data-tpl="${t}" title="${t}"></button>`).join("")}
          </div>
          <input type="hidden" name="template" value="${v.template}" />
        </label>
        <label class="field">Link to a day (optional)<input type="date" name="linkedDate" value="${v.linkedDate || ""}" /></label>
        <label class="field">Content<textarea class="note-canvas tpl-${v.template}" name="content" id="note-content">${escapeHtml(v.content || "")}</textarea></label>
        <div class="form-actions">
          <div>${isEdit ? `<button type="button" class="btn-line" id="note-delete" style="color:var(--bad);border-color:var(--bad);">Delete</button>` : ""}</div>
          <div style="display:flex;gap:8px;">
            <button type="button" class="btn-ghost" data-close-modal>Cancel</button>
            <button type="submit" class="btn-primary">${isEdit ? "Save" : "Create"}</button>
          </div>
        </div>
      </form>
    `);

    qsa(".tpl-swatch", el("modal")).forEach((btn) =>
      btn.addEventListener("click", () => {
        qsa(".tpl-swatch", el("modal")).forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        qs('input[name="template"]', el("modal")).value = btn.dataset.tpl;
        const canvas = el("note-content");
        NOTE_TEMPLATES.forEach((t) => canvas.classList.remove("tpl-" + t));
        canvas.classList.add("tpl-" + btn.dataset.tpl);
      })
    );

    el("note-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      upsertNote({
        id: note ? note.id : undefined,
        title: f.get("title").trim() || "Untitled note",
        content: f.get("content"),
        template: f.get("template"),
        linkedDate: f.get("linkedDate") || null,
      });
      closeModal();
      render();
      toast(isEdit ? "Note saved" : "Note created");
    });
    if (isEdit) {
      el("note-delete").addEventListener("click", () => {
        deleteNote(note.id);
        closeModal();
        render();
        toast("Note deleted");
      });
    }
  }

  /* =======================================================================
     Sheet (overflow menu), theme, import/export
     ======================================================================= */

  function openSheet() {
    el("sheet").classList.add("open");
    el("sheet-scrim").classList.add("open");
  }
  function closeSheet() {
    el("sheet").classList.remove("open");
    el("sheet-scrim").classList.remove("open");
  }
  el("btn-menu").addEventListener("click", openSheet);
  el("sheet-close").addEventListener("click", closeSheet);
  el("sheet-scrim").addEventListener("click", closeSheet);

  el("btn-theme").addEventListener("click", () => {
    const next = db.settings.theme === "dark" ? "light" : "dark";
    db.settings.theme = next;
    document.documentElement.setAttribute("data-theme", next);
    el("theme-icon").textContent = next === "dark" ? "☀" : "☾";
    saveDB();
  });
  el("theme-icon").textContent = db.settings.theme === "dark" ? "☀" : "☾";

  el("btn-today").addEventListener("click", () => navigate(state.view === "year" ? "year" : state.view, new Date()));
  el("btn-quick-add").addEventListener("click", () => openTaskModal(null, { date: toISO(state.cursorDate) }));

  el("sheet-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `new-planner-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    closeSheet();
  });

  el("input-import").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        db = Object.assign(defaultDB(), parsed);
        saveDB();
        document.documentElement.setAttribute("data-theme", db.settings.theme || "light");
        closeSheet();
        render();
        toast("Planner imported");
      } catch (err) {
        toast("That file could not be read");
      }
    };
    reader.readAsText(file);
  });

  el("sheet-seed").addEventListener("click", () => {
    if (!confirm("Replace current data with sample data?")) return;
    db = defaultDB();
    seedDemoData();
    closeSheet();
    render();
    toast("Sample data loaded");
  });

  el("sheet-reset").addEventListener("click", () => {
    if (!confirm("This clears everything in New Planner on this device. Continue?")) return;
    db = defaultDB();
    saveDB();
    closeSheet();
    render();
    toast("Planner reset");
  });

  /* =======================================================================
     Render dispatch
     ======================================================================= */

  function render() {
    renderRail();
    switch (state.view) {
      case "year":
        renderYear();
        break;
      case "month":
        renderMonth();
        break;
      case "week":
        renderWeek();
        break;
      case "day":
        renderDay();
        break;
      case "hub":
        renderHub();
        break;
      case "notes":
        renderNotes();
        break;
      default:
        renderWeek();
    }
    saveUI();
  }

  render();
})();
