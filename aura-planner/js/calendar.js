/* Aura — calendar horizons: Year → Month (reset) → Week → Daily Focus, all linked. */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic;

  A.MOOD_COLORS = ["#FF8A9E", "#FF9DB0", "#FFA9C8", "#F7B2E0", "#E6B4F5", "#D6A8FF", "#C2AEFF", "#ABBEFF", "#9CD3EE", "#8FD9C0"];
  A.QUADS = { do: "Do", plan: "Plan", delegate: "Delegate", drop: "Drop" };

  /* ------------------------------------------------------------ shared stats */
  A.periodStats = function (start, end) {
    var s = { days: 0, tasks: 0, done: 0, moods: [], water: 0, waterDays: 0, focus: 0, habitHits: 0, habitSlots: 0, workouts: 0, workoutMins: 0, spent: 0, reflections: 0 };
    var hs = A.state.habits;
    for (var d = new Date(start); d <= end; d = A.addDays(d, 1)) {
      var k = A.ymd(d), day = A.peekDay(k);
      if (day) {
        if (A.dayHasContent(k)) s.days++;
        s.tasks += day.tasks.length;
        s.done += day.tasks.filter(function (t) { return t.done; }).length;
        if (day.mood) s.moods.push(day.mood);
        if (day.water) { s.water += day.water; s.waterDays++; }
        s.focus += (day.focus || []).filter(Boolean).length;
        if (day.reflect && (day.reflect.wins || day.reflect.grateful || day.reflect.learned)) s.reflections++;
      }
      if (d <= A.today()) {
        var log = A.state.habitLog[k] || {};
        hs.forEach(function (h) { s.habitSlots++; if (log[h.id]) s.habitHits++; });
      }
    }
    var sk = A.ymd(start), ek = A.ymd(end);
    A.state.fitness.workouts.forEach(function (w) { if (w.date >= sk && w.date <= ek) { s.workouts++; s.workoutMins += A.num(w.mins); } });
    Object.keys(A.state.finance.months).forEach(function (m) {
      (A.state.finance.months[m].expenses || []).forEach(function (x) { if (x.date >= sk && x.date <= ek) s.spent += A.num(x.amt); });
    });
    s.moodAvg = s.moods.length ? s.moods.reduce(function (a, b) { return a + b; }, 0) / s.moods.length : 0;
    s.habitPct = s.habitSlots ? s.habitHits / s.habitSlots : 0;
    return s;
  };

  /* ------------------------------------------------------------ habit grid (shared) */
  A.habitGrid = function (dates, opts) {
    opts = opts || {};
    var tk = A.todayKey(), hs = A.state.habits;
    if (!hs.length) return '<div class="empty">No habits yet — add some on the <a href="#/habits">Habits</a> page.</div>';
    var head = "<tr><th></th>" + dates.map(function (d) {
      var k = A.ymd(d);
      return '<th class="' + (k === tk ? "today" : "") + '" title="' + esc(A.fmtDay(d)) + '">' + (opts.dow ? A.DOW[A.dowIdx(d)].charAt(0) + "<br>" : "") + d.getDate() + "</th>";
    }).join("") + (opts.streak ? "<th>🔥</th>" : "") + "</tr>";
    var rows = hs.map(function (h) {
      return '<tr><th class="name"><span class="row"><i class="swatch" style="background:' + h.color + ';width:10px;height:10px;border:0"></i>' + esc(h.name) + "</span></th>" + dates.map(function (d) {
        var k = A.ymd(d), on = !!(A.state.habitLog[k] || {})[h.id];
        return '<td><button class="hcell' + (on ? " on" : "") + (k > tk ? " future" : "") + '" style="--c:' + h.color + '" data-act="habit-toggle" data-k="' + k + '" data-h="' + h.id + '" aria-label="' + esc(h.name + " " + k) + '" aria-pressed="' + on + '"></button></td>';
      }).join("") + (opts.streak ? "<td><b>" + A.streak(h.id) + "</b></td>" : "") + "</tr>";
    }).join("");
    return '<div class="habit-grid"><table>' + head + rows + "</table></div>";
  };
  A.streak = function (hid) {
    var d = A.today(), n = 0;
    if (!(A.state.habitLog[A.ymd(d)] || {})[hid]) d = A.addDays(d, -1);
    while ((A.state.habitLog[A.ymd(d)] || {})[hid]) { n++; d = A.addDays(d, -1); }
    return n;
  };
  A.acts["habit-toggle"] = function (el) {
    var k = el.getAttribute("data-k"), h = el.getAttribute("data-h");
    var log = A.state.habitLog[k] || (A.state.habitLog[k] = {});
    if (log[h]) delete log[h]; else log[h] = true;
    A.save();
    el.classList.toggle("on", !!log[h]);
    el.setAttribute("aria-pressed", !!log[h]);
  };

  function pager(prev, next, mid) {
    return '<div class="pager"><a class="icon-btn" href="' + prev + '" aria-label="Previous">' + ic("chevL") + "</a>" + (mid || "") + '<a class="icon-btn" href="' + next + '" aria-label="Next">' + ic("chevR") + "</a></div>";
  }
  function crumbs(parts) {
    return '<div class="crumbs">' + parts.map(function (p) { return p[1] ? '<a href="' + p[1] + '">' + p[0] + "</a>" : "<span>" + p[0] + "</span>"; }).join("<span>›</span>") + "</div>";
  }

  /* ------------------------------------------------------------ year */
  function miniMonth(y, m) {
    var first = new Date(y, m, 1), start = A.mondayOf(first), tk = A.todayKey();
    var h = '<div class="mini-cal"><span class="dow">wk</span>' + ["M", "T", "W", "T", "F", "S", "S"].map(function (x) { return '<span class="dow">' + x + "</span>"; }).join("");
    for (var w = 0; w < 6; w++) {
      var ws = A.addDays(start, w * 7);
      if (ws.getMonth() !== m && A.addDays(ws, 6).getMonth() !== m) continue;
      h += '<a class="wk" href="' + A.hrefWeek(ws) + '" title="Week ' + A.isoWeek(ws) + '">' + A.isoWeek(ws) + "</a>";
      for (var i = 0; i < 7; i++) {
        var d = A.addDays(ws, i), k = A.ymd(d);
        if (d.getMonth() !== m) { h += "<span></span>"; continue; }
        h += '<a href="' + A.hrefDay(d) + '" class="' + (k === tk ? "today " : "") + (A.dayHasContent(k) ? "has" : "") + '">' + d.getDate() + "</a>";
      }
    }
    return h + "</div>";
  }

  A.views.year = function (yArg) {
    var y = parseInt(yArg, 10) || A.today().getFullYear();
    A.ctxDate = y === A.today().getFullYear() ? A.today() : new Date(y, 0, 1);
    var yr = A.state.years[y] || (A.state.years[y] = { word: "", goals: [], theme: "" });
    var st = A.periodStats(new Date(y, 0, 1), new Date(y, 11, 31));
    var months = A.MONTHS.map(function (name, m) {
      return '<section class="card mini-month"><h3><a href="' + A.hrefMonth(new Date(y, m, 1)) + '">' + name + '</a><span class="badge grey">' + A.pad(m + 1) + "</span></h3>" + miniMonth(y, m) + "</section>";
    }).join("");
    return A.head("Year overview", '<span class="soft">' + y + "</span> at a glance", "Tap a month, a week number or any date to jump straight to that page.", pager(A.hrefYear(y - 1), A.hrefYear(y + 1))) +
      '<div class="grid" style="margin-bottom:16px">' +
      '<div class="c4">' + A.card("Word of the year", A.input("years." + y + ".word", 'placeholder="e.g. Bloom"', "hand") + '<label class="lbl">Theme / intention</label>' + A.textarea("years." + y + ".theme", 'placeholder="This year I want to feel…" rows="3"'), { icon: "sparkle", tint: "grad" }) + "</div>" +
      '<div class="c4">' + A.card("Big goals", A.checklist("years." + y + ".goals", "Add a yearly goal", "Three to five goals is plenty.") + '<p class="small muted" style="margin:10px 0 0">Break them down on the <a href="#/goals">SMART Goals</a> page.</p>', { icon: "flag", tone: "pink" }) + "</div>" +
      '<div class="c4">' + A.card("Year so far", '<div class="stats">' +
        '<div class="inner stat"><b>' + st.days + "</b><span>days planned</span></div>" +
        '<div class="inner stat"><b>' + st.done + "/" + st.tasks + "</b><span>tasks done</span></div>" +
        '<div class="inner stat"><b>' + (st.moodAvg ? st.moodAvg.toFixed(1) : "—") + "</b><span>avg mood</span></div>" +
        '<div class="inner stat"><b>' + Math.round(st.habitPct * 100) + "%</b><span>habits kept</span></div></div>", { icon: "target", tone: "mint" }) + "</div>" +
      "</div>" + '<div class="year-grid">' + months + "</div>";
  };

  /* ------------------------------------------------------------ month */
  A.views.month = function (ymArg) {
    var first = A.parseD(ymArg) || new Date(A.today().getFullYear(), A.today().getMonth(), 1);
    var y = first.getFullYear(), m = first.getMonth(), key = A.ym(first);
    var tNow = A.today();
    A.ctxDate = (tNow.getFullYear() === y && tNow.getMonth() === m) ? tNow : first;
    var mo = A.state.months[key] || (A.state.months[key] = { word: "", intentions: ["", "", ""], focus: [], focusNotes: "", recap: { well: "", leave: "", carry: "" }, goals: [] });
    var start = A.mondayOf(first), last = new Date(y, m + 1, 0), tk = A.todayKey();

    var cal = '<div class="month-cal"><span></span>' + A.DOW.map(function (d) { return '<span class="dow">' + d.slice(0, 3) + "</span>"; }).join("");
    for (var ws = start; ws <= last; ws = A.addDays(ws, 7)) {
      cal += '<a class="wk" href="' + A.hrefWeek(ws) + '" title="Open week">W' + A.isoWeek(ws) + "</a>";
      for (var i = 0; i < 7; i++) {
        var d = A.addDays(ws, i), k = A.ymd(d), day = A.peekDay(k);
        var items = day ? day.top3.filter(function (t) { return t.t; }).map(function (t) { return { text: t.t, done: t.done }; }).concat(day.tasks) : [];
        cal += '<a class="day-cell' + (d.getMonth() !== m ? " out" : "") + (k === tk ? " today" : "") + '" href="' + A.hrefDay(d) + '"><span class="dn"><span>' + d.getDate() + "</span>" + (day && day.mood ? '<i class="mood-dot" style="background:' + A.MOOD_COLORS[day.mood - 1] + '" title="Mood ' + day.mood + '/10"></i>' : "") + "</span>" +
          items.slice(0, 3).map(function (t) { return '<span class="t' + (t.done ? " done" : "") + '">' + esc(t.text) + "</span>"; }).join("") + (items.length > 3 ? '<span class="small muted">+' + (items.length - 3) + "</span>" : "") + "</a>";
      }
    }
    cal += "</div>";

    var prevFirst = new Date(y, m - 1, 1), prevLast = new Date(y, m, 0);
    var ps = A.periodStats(prevFirst, prevLast);
    var recap = '<div class="stats" style="margin-bottom:12px">' +
      '<div class="inner stat"><b>' + ps.done + "/" + ps.tasks + "</b><span>tasks</span></div>" +
      '<div class="inner stat"><b>' + (ps.moodAvg ? ps.moodAvg.toFixed(1) : "—") + "</b><span>avg mood</span></div>" +
      '<div class="inner stat"><b>' + Math.round(ps.habitPct * 100) + "%</b><span>habits</span></div>" +
      '<div class="inner stat"><b>' + ps.workouts + "</b><span>workouts</span></div>" +
      '<div class="inner stat"><b>' + A.money(ps.spent) + "</b><span>spent</span></div></div>" +
      '<label class="lbl">What went well</label>' + A.textarea("months." + key + ".recap.well", 'rows="2" placeholder="Wins, proud moments…"') +
      '<label class="lbl">What I\'m leaving behind</label>' + A.textarea("months." + key + ".recap.leave", 'rows="2" placeholder="Habits, worries, commitments…"') +
      '<label class="lbl">Carrying forward</label>' + A.textarea("months." + key + ".recap.carry", 'rows="2" placeholder="Unfinished things worth continuing"');

    var areas = A.state.wheel.areas;
    var focus = '<div class="chips">' + areas.map(function (a) {
      var on = mo.focus.indexOf(a.name) >= 0;
      return '<button class="chip' + (on ? "" : " grey") + '" style="border:0;cursor:pointer;' + (on ? "background:" + a.color + ";color:#fff" : "background:#f4f1fa;color:var(--muted)") + '" data-act="month-focus" data-key="' + key + '" data-area="' + esc(a.name) + '">' + (on ? "✓ " : "") + esc(a.name) + "</button>";
    }).join("") + "</div>" + '<label class="lbl">How I\'ll show up for them</label>' + A.textarea("months." + key + ".focusNotes", 'rows="3" placeholder="One small action per focus area"');

    var dates = [];
    for (var dd = 1; dd <= last.getDate(); dd++) dates.push(new Date(y, m, dd));

    return crumbs([[y, A.hrefYear(y)], [A.MONTHS[m]]]) +
      A.head("Monthly calendar & reset", A.MONTHS[m] + ' <span class="soft">' + y + "</span>", "", pager(A.hrefMonth(new Date(y, m - 1, 1)), A.hrefMonth(new Date(y, m + 1, 1)))) +
      '<div class="grid">' +
      '<div class="c8">' + A.card("Calendar", cal, { icon: "calendar", sub: "Week numbers open the weekly spread; dates open the daily focus page." }) + "</div>" +
      '<div class="c4 stack">' +
        A.card("Monthly intention", '<label class="lbl">Word for the month</label>' + A.input("months." + key + ".word", 'placeholder="e.g. Steady"', "hand") +
          '<label class="lbl">Intentions</label>' + [0, 1, 2].map(function (i) { return '<div class="row" style="margin-bottom:6px"><span class="badge pink">' + (i + 1) + "</span>" + A.input("months." + key + ".intentions." + i, 'placeholder="I will…"', "grow") + "</div>"; }).join(""), { icon: "heart", tone: "pink", tint: "pink" }) +
        A.card("Monthly goals", A.checklist("months." + key + ".goals", "Add a goal for " + A.MONTHS[m]), { icon: "flag" }) +
      "</div>" +
      '<div class="c6">' + A.card("Reset · " + A.MONTHS[prevFirst.getMonth()] + " recap", recap, { icon: "refresh", tone: "sky" }) + "</div>" +
      '<div class="c6">' + A.card("Focus areas", focus, { icon: "target", tone: "mint", sub: "Pick the life areas that get your energy this month." }) + "</div>" +
      '<div class="c12">' + A.card("Habit tracker", A.habitGrid(dates, { streak: true }), { icon: "check", tone: "butter", tools: '<a class="btn sm ghost" href="#/habits">Edit habits</a>' }) + "</div>" +
      "</div>";
  };
  A.acts["month-focus"] = function (el) {
    var mo = A.state.months[el.getAttribute("data-key")], a = el.getAttribute("data-area");
    var i = mo.focus.indexOf(a);
    if (i >= 0) mo.focus.splice(i, 1); else mo.focus.push(a);
    A.save(); A.render();
  };

  /* ------------------------------------------------------------ week */
  A.views.week = function (kArg) {
    var mon = A.mondayOf(A.parseD(kArg) || A.today()), wk = A.ymd(mon), tk = A.todayKey();
    var sun = A.addDays(mon, 6);
    A.ctxDate = (A.today() >= mon && A.today() <= sun) ? A.today() : mon;
    var w = A.state.weeks[wk] || (A.state.weeks[wk] = { focus: "", priorities: [], notes: "", selfcare: "" });
    var days = [];
    for (var i = 0; i < 7; i++) days.push(A.addDays(mon, i));
    var cols = days.map(function (d, di) {
      var k = A.ymd(d), day = A.day(k);
      var top = day.top3.filter(function (t) { return t.t; });
      return '<section class="card week-day' + (k === tk ? " today" : "") + '"><h3><a href="' + A.hrefDay(d) + '"><big>' + d.getDate() + "</big>" + A.DOW[di].slice(0, 3) + "</a>" +
        (day.mood ? '<i class="mood-dot" style="width:10px;height:10px;border-radius:50%;background:' + A.MOOD_COLORS[day.mood - 1] + '"></i>' : "") + "</h3>" +
        (top.length ? '<div class="chips">' + top.map(function (t) { return '<span class="chip' + (t.done ? " mint" : "") + '">★ ' + esc(t.t) + "</span>"; }).join("") + "</div>" : "") +
        '<ul class="list">' + day.tasks.map(function (t, j) {
          return '<li class="li' + (t.done ? " done" : "") + '">' + A.checkbox("days." + k + ".tasks." + j + ".done") + A.input("days." + k + ".tasks." + j + ".text", "", "bare") + "</li>";
        }).join("") + "</ul>" +
        '<input class="field" placeholder="+ task" data-enter="task-add" data-k="' + k + '" />' +
        "</section>";
    }).join("");
    var label = mon.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " – " + sun.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    var st = A.periodStats(mon, sun);
    return crumbs([[mon.getFullYear(), A.hrefYear(mon.getFullYear())], [A.MONTHS[mon.getMonth()], A.hrefMonth(mon)], ["Week " + A.isoWeek(mon)]]) +
      A.head("Weekly planning spread", "Week " + A.isoWeek(mon) + ' <span class="soft">' + label + "</span>", "", pager(A.hrefWeek(A.addDays(mon, -7)), A.hrefWeek(A.addDays(mon, 7)))) +
      '<div class="grid" style="margin-bottom:16px">' +
      '<div class="c4">' + A.card("This week's focus", A.textarea("weeks." + wk + ".focus", 'rows="3" placeholder="If this week goes well, it’s because…"'), { icon: "target", tint: "grad" }) + "</div>" +
      '<div class="c4">' + A.card("Priorities", A.checklist("weeks." + wk + ".priorities", "Add a weekly priority", "What must happen this week?"), { icon: "star", tone: "pink" }) + "</div>" +
      '<div class="c4">' + A.card("Week pulse", '<div class="stats">' +
        '<div class="inner stat"><b>' + st.done + "/" + st.tasks + "</b><span>tasks</span></div>" +
        '<div class="inner stat"><b>' + (st.moodAvg ? st.moodAvg.toFixed(1) : "—") + "</b><span>mood</span></div>" +
        '<div class="inner stat"><b>' + st.focus + "</b><span>focus sessions</span></div>" +
        '<div class="inner stat"><b>' + st.workoutMins + "</b><span>active min</span></div></div>" +
        '<label class="lbl">Notes</label>' + A.textarea("weeks." + wk + ".notes", 'rows="2" placeholder="Reminders, appointments…"'), { icon: "bolt", tone: "mint" }) + "</div>" +
      "</div>" +
      '<div class="week-days">' + cols + "</div>" +
      '<div style="margin-top:16px">' + A.card("Habits this week", A.habitGrid(days, { dow: true, streak: true }), { icon: "check", tone: "butter" }) + "</div>";
  };
  A.acts["task-add"] = function (el) {
    var text = el.value.trim();
    if (!text) return;
    A.addTask(el.getAttribute("data-k"), text);
    A.render();
    var again = document.querySelector('[data-enter="task-add"][data-k="' + el.getAttribute("data-k") + '"]');
    if (again) again.focus();
  };

  /* ------------------------------------------------------------ day */
  var CARE = [["skin", "Skincare"], ["stretch", "Stretch"], ["air", "Fresh air"], ["connect", "Call a friend"], ["read", "Read for fun"], ["early", "Early night"]];
  var BREAKS = ["Mid-morning stretch", "Screen-free lunch", "Afternoon walk", "Evening wind-down"];
  var timer = { running: false, end: 0, left: 25 * 60, k: "", iv: null };

  function fmtTime(s) { return A.pad(Math.floor(s / 60)) + ":" + A.pad(Math.floor(s % 60)); }
  function hourLabel(h) { var hh = h % 12 || 12; return hh + (h < 12 || h === 24 ? " AM" : " PM"); }

  A.views.day = function (kArg) {
    var d = kArg === "today" || !kArg ? A.today() : A.parseD(kArg) || A.today();
    var k = A.ymd(d), day = A.day(k), tk = A.todayKey(), mon = A.mondayOf(d);
    A.ctxDate = d;
    var base = "days." + k;

    var strip = '<div class="week-strip">' + [0, 1, 2, 3, 4, 5, 6].map(function (i) {
      var x = A.addDays(mon, i), xk = A.ymd(x);
      return '<a class="' + (xk === k ? "on " : "") + (xk === tk ? "today" : "") + '" href="' + A.hrefDay(x) + '">' + A.DOW[i].slice(0, 3) + "<b>" + x.getDate() + "</b></a>";
    }).join("") + "</div>";

    var top3 = '<ul class="list top3">' + day.top3.map(function (t, i) {
      return '<li class="li' + (t.done ? " done" : "") + '"><span class="n">' + (i + 1) + "</span>" + A.input(base + ".top3." + i + ".t", 'placeholder="Priority ' + (i + 1) + '"', "bare") + A.checkbox(base + ".top3." + i + ".done") + "</li>";
    }).join("") + "</ul>";

    var tasks = '<ul class="list">' + day.tasks.map(function (t, i) {
      var q = t.q || "";
      return '<li class="li' + (t.done ? " done" : "") + '">' + A.checkbox(base + ".tasks." + i + ".done") + A.input(base + ".tasks." + i + ".text", "", "bare") +
        (A.state.sync.map[t.id] ? '<i class="sync-dot" title="Synced to your board"></i>' : "") +
        '<button class="q-tag q-' + (q || "none") + '" data-act="task-quad" data-k="' + k + '" data-i="' + i + '" title="Eisenhower quadrant — tap to change">' + (A.QUADS[q] || "Tag") + "</button>" +
        '<button class="x-btn" data-act="list-remove" data-list="' + base + '.tasks" data-idx="' + i + '" aria-label="Remove task">' + ic("x") + "</button></li>";
    }).join("") + "</ul>" +
      '<div class="add-row"><input class="field" placeholder="Add a task" data-enter="task-add" data-k="' + k + '" /><button class="btn sm soft" data-act="task-add-btn" data-k="' + k + '">' + ic("plus") + "</button></div>";

    var now = new Date(), nowH = k === tk ? now.getHours() : -1;
    var sched = '<div class="schedule">';
    for (var h = 6; h <= 23; h++) {
      sched += '<div class="slot' + (h === nowH ? " now" : "") + '"><time>' + hourLabel(h) + "</time>" + A.input(base + ".schedule." + h, "", "") + "</div>";
    }
    sched += "</div>";

    var mood = '<div class="mood-scale">' + A.MOOD_COLORS.map(function (c, i) {
      var on = day.mood === i + 1;
      return '<button class="' + (on ? "on" : "") + '" style="' + (on ? "background:" + c : "border:2px solid " + c) + '" data-act="day-mood" data-k="' + k + '" data-v="' + (i + 1) + '" aria-label="Mood ' + (i + 1) + '">' + (i + 1) + "</button>";
    }).join("") + '</div><div class="row small muted" style="justify-content:space-between;margin-top:6px"><span>heavy</span><span>radiant</span></div>';

    var drops = '<div class="drops">' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) {
      return '<button class="drop' + (i < day.water ? " on" : "") + '" data-act="day-water" data-k="' + k + '" data-v="' + (i + 1) + '" aria-label="' + (i + 1) + ' glasses">' + '<svg viewBox="0 0 24 28"><path d="M12 2s8 8.6 8 14.2A8 8 0 0 1 4 16.2C4 10.6 12 2 12 2z" fill="currentColor"/></svg></button>';
    }).join("") + '</div><p class="small muted" style="margin:6px 0 0">' + day.water + " of 8 glasses</p>";

    if (timer.k !== k && !timer.running) { timer.k = k; }
    var focus = '<div class="dots-10">' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (i) {
      var on = !!day.focus[i];
      return '<button class="dot-btn' + (on ? " on" : "") + '" data-act="day-focus" data-k="' + k + '" data-i="' + i + '" aria-pressed="' + on + '">' + (i + 1) + "</button>";
    }).join("") + "</div>" +
      '<div class="timer"><div><b id="focus-timer">' + fmtTime(timer.running ? Math.max(0, (timer.end - Date.now()) / 1000) : timer.left) + '</b><div class="small muted">25-minute focus session</div></div><div class="row">' +
      '<button class="icon-btn" data-act="timer-toggle" data-k="' + k + '" aria-label="' + (timer.running ? "Pause" : "Start") + ' timer">' + ic(timer.running ? "pause" : "play") + "</button>" +
      '<button class="icon-btn" data-act="timer-reset" aria-label="Reset timer">' + ic("refresh") + "</button></div></div>";

    var breaks = '<div class="checks">' + BREAKS.map(function (b, i) {
      return '<label class="check-pill">' + A.checkbox(base + ".breaks." + i) + esc(b) + "</label>";
    }).join("") + "</div>";
    var care = '<div class="checks">' + CARE.map(function (c) {
      return '<label class="check-pill">' + A.checkbox(base + ".care." + c[0]) + c[1] + "</label>";
    }).join("") + "</div>";

    var meals = [["b", "Breakfast"], ["l", "Lunch"], ["d", "Dinner"], ["s", "Snacks"]].map(function (m) {
      return '<div class="meal-row"><span>' + m[1] + "</span>" + A.input(base + ".meals." + m[0], 'placeholder="…"') + "</div>";
    }).join("");
    var weekPlan = (A.state.meals.weeks[A.ymd(mon)] || {})[A.dowIdx(d)];
    if (weekPlan && (weekPlan.b || weekPlan.l || weekPlan.d)) {
      meals += '<p class="small muted" style="margin:6px 0 0">Planned: ' + esc([weekPlan.b, weekPlan.l, weekPlan.d].filter(Boolean).join(" · ")) + ' <a href="#" data-act="day-meals-from-plan" data-k="' + k + '">use plan</a></p>';
    }

    var reflect = '<div class="grid">' +
      '<div class="c3"><label class="lbl">Today\'s wins</label>' + A.textarea(base + ".reflect.wins", 'rows="4" placeholder="Big or tiny…"', "lined") + "</div>" +
      '<div class="c3"><label class="lbl">Grateful for</label>' + A.textarea(base + ".reflect.grateful", 'rows="4" placeholder="Three good things"', "lined") + "</div>" +
      '<div class="c3"><label class="lbl">What I learned / felt</label>' + A.textarea(base + ".reflect.learned", 'rows="4" placeholder="Notice patterns…"', "lined") + "</div>" +
      '<div class="c3"><label class="lbl">Tomorrow I will</label>' + A.textarea(base + ".reflect.tomorrow", 'rows="4" placeholder="Set yourself up"', "lined") + "</div></div>";

    var dateTitle = d.toLocaleDateString(undefined, { weekday: "long" }) + ' <span class="soft">' + d.toLocaleDateString(undefined, { month: "long", day: "numeric" }) + "</span>";
    return crumbs([[d.getFullYear(), A.hrefYear(d.getFullYear())], [A.MONTHS[d.getMonth()], A.hrefMonth(d)], ["Week " + A.isoWeek(d), A.hrefWeek(d)], [String(d.getDate())]]) +
      A.head(k === tk ? "Today · daily focus" : "Daily focus", dateTitle, "", pager(A.hrefDay(A.addDays(d, -1)), A.hrefDay(A.addDays(d, 1)))) +
      strip +
      '<div class="card tint-grad" style="margin-bottom:16px;padding:14px 18px"><div class="row wrap"><span class="eyebrow" style="margin:0">Intention</span>' + A.input(base + ".intention", 'placeholder="Today I choose to feel…"', "bare grow hand") + "</div></div>" +
      '<div class="grid">' +
      '<div class="c4 stack">' +
        A.card("Top 3 priorities", top3, { icon: "star", tone: "pink" }) +
        A.card("Tasks", tasks, { icon: "list", sub: "Tag each task with an Eisenhower quadrant. Synced tasks show a green dot.", tools: '<a class="btn xs soft" href="#/sync">' + ic("sync") + "Board</a>" }) +
      "</div>" +
      '<div class="c4">' + A.card("Schedule", sched, { icon: "clock", tone: "sky", sub: "6 AM – 11 PM" }) + "</div>" +
      '<div class="c4 stack">' +
        A.card("Mood", mood, { icon: "smile", tone: "pink" }) +
        A.card("Hydration", drops, { icon: "drop", tone: "sky" }) +
        A.card("Focus sessions", focus, { icon: "bolt", tone: "butter" }) +
      "</div>" +
      '<div class="c4">' + A.card("Breaks", breaks, { icon: "coffee", tone: "butter" }) + "</div>" +
      '<div class="c4">' + A.card("Self-care", care, { icon: "heart", tone: "pink" }) + "</div>" +
      '<div class="c4">' + A.card("Meals", meals, { icon: "chef", tone: "mint" }) + "</div>" +
      '<div class="c12">' + A.card("Brain dump", A.textarea(base + ".brain", 'rows="4" placeholder="Empty your head — the AI synthesizer can turn this into actions."', "lined"), { icon: "brain", tools: '<button class="btn xs soft" data-act="brain-to-synth" data-k="' + k + '">' + ic("sparkle") + "Synthesize</button>" }) + "</div>" +
      '<div class="c12">' + A.card("Evening reflection", reflect, { icon: "moon", tint: "lav", tools: '<button class="btn sm" data-act="day-to-coach">' + ic("send") + "Send log to AI coach</button>" }) + "</div>" +
      "</div>";
  };

  A.acts["task-add-btn"] = function (el) {
    var inp = el.parentNode.querySelector("input");
    A.acts["task-add"](inp);
  };
  A.acts["task-quad"] = function (el) {
    var t = A.day(el.getAttribute("data-k")).tasks[+el.getAttribute("data-i")];
    var order = ["", "do", "plan", "delegate", "drop"];
    t.q = order[(order.indexOf(t.q || "") + 1) % order.length];
    A.save(); A.render();
  };
  A.acts["day-mood"] = function (el) {
    var day = A.day(el.getAttribute("data-k")), v = +el.getAttribute("data-v");
    day.mood = day.mood === v ? 0 : v; A.save(); A.render();
  };
  A.acts["day-water"] = function (el) {
    var day = A.day(el.getAttribute("data-k")), v = +el.getAttribute("data-v");
    day.water = day.water === v ? v - 1 : v; A.save(); A.render();
  };
  A.acts["day-focus"] = function (el) {
    var day = A.day(el.getAttribute("data-k")), i = +el.getAttribute("data-i");
    day.focus[i] = !day.focus[i]; A.save(); A.render();
  };
  A.acts["day-meals-from-plan"] = function (el) {
    var k = el.getAttribute("data-k"), d = A.parseD(k), p = A.state.meals.weeks[A.ymd(A.mondayOf(d))][A.dowIdx(d)];
    var day = A.day(k);
    ["b", "l", "d", "s"].forEach(function (x) { if (p[x] && !day.meals[x]) day.meals[x] = p[x]; });
    A.save(); A.render();
  };
  A.acts["brain-to-synth"] = function (el) {
    var day = A.day(el.getAttribute("data-k"));
    if (!day.brain.trim()) { A.toast("Write something in the brain dump first."); return; }
    A.state.coach.synthInput = day.brain;
    A.save(); location.hash = "#/synth";
  };
  A.acts["day-to-coach"] = function () { location.hash = "#/coach"; A.toast("Your daily log is included in the analysis."); };

  function tick() {
    var el = document.getElementById("focus-timer");
    var left = Math.max(0, (timer.end - Date.now()) / 1000);
    if (el) el.textContent = fmtTime(left);
    if (left <= 0) {
      clearInterval(timer.iv); timer.running = false; timer.left = 25 * 60;
      var day = A.day(timer.k), i = 0;
      while (i < 10 && day.focus[i]) i++;
      if (i < 10) day.focus[i] = true;
      A.save();
      A.toast("Focus session complete — take a short break ✨");
      if (A.route.name === "day") A.render();
    }
  }
  A.acts["timer-toggle"] = function (el) {
    if (timer.running) {
      timer.left = Math.max(0, (timer.end - Date.now()) / 1000);
      timer.running = false; clearInterval(timer.iv);
    } else {
      timer.k = el.getAttribute("data-k");
      timer.end = Date.now() + timer.left * 1000; timer.running = true;
      clearInterval(timer.iv); timer.iv = setInterval(tick, 500);
    }
    A.render();
  };
  A.acts["timer-reset"] = function () {
    clearInterval(timer.iv); timer.running = false; timer.left = 25 * 60; A.render();
  };
})();
