/* Slow Ink Sage — the planner pages: Today, Year, Month, Week, Day, Habits, Goals, Reflect.
   Each view is a function that returns a string of HTML. Clicks are handled by the
   actions at the bottom of this file (see also main.js, which wires up the events). */
(function () {
  "use strict";
  var SI = window.SI, esc = SI.esc, ic = SI.ic, pad = SI.pad;
  var S = function () { return SI.state; };

  /* The "cursor" is the date the planner is currently looking at, so switching
     between Year, Month, Week and Day keeps you in the same part of the calendar. */
  SI.cursor = SI.today();

  var href = SI.href = {
    day: function (d) { return "#/day/" + SI.key(d); },
    dayKey: function (k) { return "#/day/" + k; },
    week: function (d) { return "#/week/" + SI.key(SI.mondayOf(d)); },
    month: function (y, m) { return "#/month/" + SI.monthKey(y, m); },
    year: function (y) { return "#/year/" + y; }
  };

  var PROMPTS = [
    "What would make today feel like enough?",
    "Begin with the smallest next step.",
    "Notice one thing that is already going well.",
    "Leave a little room in the day.",
    "What can wait until tomorrow?",
    "Ink dries slowly. So does progress.",
    "Do one thing well, then rest.",
    "Who would you like to check in on today?",
    "Choose a pace you could keep all year.",
    "What deserves your full attention today?",
    "A few honest lines are better than a perfect page.",
    "What are you grateful for this morning?"
  ];
  function snippet(page) {
    var t = (page.text || "").replace(/\s+/g, " ").trim();
    if (!t) return page.strokes && page.strokes.length ? "A handwritten page." : "A blank page, waiting.";
    return t.length > 110 ? t.slice(0, 110).replace(/\s+\S*$/, "") + "…" : t;
  }
  function dayOfYear(d) { return Math.round((d - new Date(d.getFullYear(), 0, 0)) / 86400000); }

  /* ------------------------------------------------------------ shared pieces */
  function head(eyebrow, title, sub, navHtml) {
    return '<div class="head"><div class="head-text"><p class="eyebrow">' + eyebrow + "</p><h1>" + title + "</h1>" +
      (sub ? '<p class="sub">' + sub + "</p>" : "") + "</div>" + (navHtml ? '<div class="head-nav">' + navHtml + "</div>" : "") + "</div>";
  }
  function stepper(prev, next, label, homeHref, homeLabel) {
    return '<a class="round" href="' + prev + '" aria-label="Previous">' + ic("left") + "</a>" +
      '<span class="step-label">' + label + "</span>" +
      '<a class="round" href="' + next + '" aria-label="Next">' + ic("right") + "</a>" +
      (homeHref ? '<a class="pill-link" href="' + homeHref + '">' + homeLabel + "</a>" : "");
  }
  function card(title, body, cls) {
    return '<section class="card ' + (cls || "") + '">' + (title ? '<h2 class="card-title">' + title + "</h2>" : "") + body + "</section>";
  }
  function bound(path, value, attrs, cls) {
    return '<input class="' + (cls || "field") + '" data-bind="' + esc(path) + '" value="' + esc(value) + '" ' + (attrs || "") + " />";
  }
  function area(path, value, attrs, cls) {
    return '<textarea class="' + (cls || "field area") + '" data-bind="' + esc(path) + '" ' + (attrs || "") + ">" + esc(value) + "</textarea>";
  }

  function taskRow(dayKey, it, compact) {
    var p = "days." + dayKey + ".items.@" + it.id + ".t";
    return '<li class="task' + (it.done ? " done" : "") + (compact ? " compact" : "") + '">' +
      '<button class="chk' + (it.done ? " on" : "") + '" data-act="toggle-item" data-day="' + dayKey + '" data-id="' + it.id + '" aria-pressed="' + !!it.done + '" aria-label="Mark done">' + ic("check") + "</button>" +
      '<input class="task-text" data-bind="' + esc(p) + '" value="' + esc(it.t) + '" aria-label="Task" />' +
      '<button class="icon-btn star' + (it.key ? " on" : "") + '" data-act="star-item" data-day="' + dayKey + '" data-id="' + it.id + '" aria-pressed="' + !!it.key + '" aria-label="Mark as a key date" title="Key date">' + ic("star") + "</button>" +
      '<button class="icon-btn del" data-act="del-item" data-day="' + dayKey + '" data-id="' + it.id + '" aria-label="Delete task" title="Delete">' + ic("trash") + "</button></li>";
  }
  function taskList(dayKey, compact, emptyText) {
    var items = SI.peekDay(dayKey).items;
    if (!items.length) return emptyText ? '<p class="empty">' + emptyText + "</p>" : "";
    return '<ul class="tasks">' + items.map(function (it) { return taskRow(dayKey, it, compact); }).join("") + "</ul>";
  }
  function addRow(dayKey, placeholder) {
    return '<div class="add-row"><input class="add-input" data-add="' + dayKey + '" placeholder="' + esc(placeholder || "Add a task…") + '" aria-label="' + esc(placeholder || "Add a task") + '" maxlength="140" />' +
      '<button class="btn sm" data-act="add-item" data-day="' + dayKey + '">Add</button></div>';
  }

  function habitDone(hid, key) { var l = S().habitLog[hid]; return !!(l && l[key]); }
  function habitChips(dayKey) {
    var hs = S().habits;
    if (!hs.length) return '<p class="empty">No habits yet. <a href="#/habits/' + dayKey.slice(0, 7) + '">Add one</a> to start a gentle streak.</p>';
    return '<div class="chips">' + hs.map(function (h) {
      var on = habitDone(h.id, dayKey);
      return '<button class="hab' + (on ? " on" : "") + '" data-act="toggle-habit" data-h="' + h.id + '" data-day="' + dayKey + '" aria-pressed="' + on + '">' + (on ? ic("check") : "") + esc(h.name || "Habit") + "</button>";
    }).join("") + "</div>";
  }

  var MOODS = [["bright", "Bright"], ["calm", "Calm"], ["okay", "Okay"], ["low", "Low"], ["tired", "Tired"]];
  function moodPicker(dayKey) {
    var cur = SI.peekDay(dayKey).mood;
    return '<div class="chips">' + MOODS.map(function (m) {
      return '<button class="mood mood-' + m[0] + (cur === m[0] ? " on" : "") + '" data-act="set-mood" data-day="' + dayKey + '" data-v="' + m[0] + '" aria-pressed="' + (cur === m[0]) + '">' + m[1] + "</button>";
    }).join("") + "</div>";
  }

  /* ------------------------------------------------------------ HOME (the dashboard) */
  /* Days in a row ending today (or yesterday, if today isn't ticked yet). */
  function currentStreak(hid) {
    var log = S().habitLog[hid] || {}, d = SI.today(), n = 0;
    if (!log[SI.key(d)]) d = SI.addDays(d, -1);
    while (log[SI.key(d)] && n < 4000) { n++; d = SI.addDays(d, -1); }
    return n;
  }
  /* Starred tasks from today onward, soonest first. */
  function upcomingKeys(limit) {
    var from = SI.key(SI.today()), out = [];
    Object.keys(S().days).sort().forEach(function (k) {
      if (k < from) return;
      (S().days[k].items || []).forEach(function (it) { if (it.key && it.t && !it.done) out.push({ k: k, t: it.t, done: false }); });
    });
    return out.slice(0, limit);
  }
  function ring(pct, label, sub) {
    var r = 46, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, pct)));
    return '<div class="yring" role="img" aria-label="' + esc(label + ", " + sub) + '"><svg viewBox="0 0 110 110" aria-hidden="true"><circle cx="55" cy="55" r="' + r + '" class="yr-bg"/>' +
      '<circle cx="55" cy="55" r="' + r + '" class="yr-fg" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 55 55)"/></svg>' +
      '<span class="yr-num">' + esc(label) + '</span><span class="yr-sub">' + esc(sub) + "</span></div>";
  }
  function tile(num, label, href2, pct) {
    return '<a class="kpi" href="' + href2 + '"><span class="kpi-num">' + num + '</span><span class="kpi-label">' + label + "</span>" +
      (pct != null ? '<span class="bar" aria-hidden="true"><i style="width:' + Math.round(pct * 100) + '%"></i></span>' : "") + "</a>";
  }
  var START_STEPS = [
    ["Set an intention for the day", "#/today", function (s) { return Object.keys(s.days).some(function (k) { return s.days[k].intention; }); }],
    ["Add a task", "#/today", function (s) { return Object.keys(s.days).some(function (k) { return (s.days[k].items || []).length; }); }],
    ["Check off a habit", "#/habits/" + SI.monthKey(SI.today().getFullYear(), SI.today().getMonth()), function (s) { return Object.keys(s.habitLog).some(function (h) { return Object.keys(s.habitLog[h]).length; }); }],
    ["Add a goal for the year", "#/goals", function (s) { return s.goals.length > 0; }],
    ["Star a key date", "#/today", function (s) { return Object.keys(s.days).some(function (k) { return (s.days[k].items || []).some(function (i) { return i.key; }); }); }],
    ["Write a notebook page", "#/notebook", function (s) { return s.notebook.pages.length > 1 || s.notebook.pages.some(function (p) { return (p.objects || []).length || (p.strokes || []).length; }); }],
    ["Back up your planner", null, function (s) { return !!s.ui.backedUp; }]
  ];
  function gettingStarted() {
    var s = S();
    if (s.sample || s.ui.onboardHidden) return "";
    var done = START_STEPS.filter(function (x) { return x[2](s); }).length, all = done === START_STEPS.length;
    var list = START_STEPS.map(function (x) {
      var ok = x[2](s);
      return '<li class="gs-step' + (ok ? " ok" : "") + '"><span class="gs-dot" aria-hidden="true">' + (ok ? ic("check") : "") + "</span>" +
        (x[1] && !ok ? '<a href="' + x[1] + '">' + esc(x[0]) + "</a>" : x[1] === null && !ok ? '<button class="linklike" data-act="export">' + esc(x[0]) + "</button>" : "<span>" + esc(x[0]) + "</span>") + "</li>";
    }).join("");
    return '<section class="card gstart"><div class="gs-head"><h2 class="card-title">' + (all ? "You’re all set" : "Getting started") + '</h2><span class="gs-count">' + done + " of " + START_STEPS.length + '</span></div>' +
      '<div class="bar" aria-hidden="true"><i style="width:' + Math.round(done / START_STEPS.length * 100) + '%"></i></div><ul class="gs-list">' + list + "</ul>" +
      '<div class="row-actions"><button class="btn sm ghost" data-act="load-sample">Look around with sample data</button><button class="btn sm ghost" data-act="hide-start">' + (all ? "Done, hide this" : "Hide this") + "</button></div></section>";
  }

  SI.views.today = function () {
    var t = SI.today(), key = SI.key(t), h = new Date().getHours(), s = S(), rec = SI.peekDay(key);
    var who = s.name ? esc(s.name) : "";
    var hello = h < 5 ? (who ? "Still up, " + who + "?" : "Still up?") : (h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening") + (who ? ", " + who : "");
    var mon = SI.mondayOf(t), week = "";
    for (var i = 0; i < 7; i++) {
      var d = SI.addDays(mon, i), k = SI.key(d), st = SI.dayStats(k);
      week += '<a class="wtile' + (k === key ? " today" : "") + '" href="' + href.day(d) + '">' +
        '<span class="w-dow">' + SI.DOW[i] + '</span><span class="w-num">' + d.getDate() + "</span>" +
        '<span class="w-info">' + (st.total ? st.done + "/" + st.total + " done" : "·") + "</span></a>";
    }
    var pages = s.notebook.pages.slice().sort(function (a, b) { return b.updated - a.updated; });
    var last = pages[0];
    var nbCard = card("Your notebook",
      (last
        ? '<a class="nb-peek" href="#/notebook/' + last.id + '"><span class="nb-peek-title">' + esc(last.title || "Untitled") + '</span><span class="nb-peek-text">' +
          esc(snippet(last)) + "</span></a>"
        : '<p class="empty">Your notebook is empty.</p>') +
      '<div class="row-actions"><button class="btn sm" data-act="nb-new-journal" data-day="' + key + '">' + ic("plus") + "Today’s journal entry</button>" +
      '<a class="btn sm ghost" href="#/notebook">Open notebook</a></div>', "card-nb");

    /* the numbers */
    var ts = SI.dayStats(key), hs = s.habits, hdone = hs.filter(function (x) { return (s.habitLog[x.id] || {})[key]; }).length;
    var best = 0;
    hs.forEach(function (x) { best = Math.max(best, currentStreak(x.id)); });
    var gp = s.goals.length ? Math.round(s.goals.reduce(function (a, g) { return a + goalPct(g); }, 0) / s.goals.length) : null;
    var doy = dayOfYear(t), yearDays = SI.daysIn(t.getFullYear(), 1) === 29 ? 366 : 365;
    var tiles = '<div class="kpis">' +
      tile(ts.total ? ts.done + "<small>/" + ts.total + "</small>" : "0", "tasks done today", "#/day/" + key, ts.total ? ts.done / ts.total : 0) +
      tile(hs.length ? hdone + "<small>/" + hs.length + "</small>" : "0", "habits today", "#/habits/" + SI.monthKey(t.getFullYear(), t.getMonth()), hs.length ? hdone / hs.length : 0) +
      tile(best + "<small> day" + (best === 1 ? "" : "s") + "</small>", "best habit streak", "#/habits/" + SI.monthKey(t.getFullYear(), t.getMonth())) +
      tile(gp == null ? "—" : gp + "<small>%</small>", gp == null ? "no goals yet" : "average goal progress", "#/goals", gp == null ? null : gp / 100) + "</div>";

    var habitsCard = card("Habits today", habitChips(key) + (hs.length ? '<ul class="streaks">' + hs.map(function (x) {
      var n = currentStreak(x.id);
      return n > 1 ? '<li><span>' + esc(x.name || "Habit") + '</span><b>' + n + " days</b></li>" : "";
    }).join("") + "</ul>" : ""));
    var goalsCard = card("Goals", s.goals.length ? s.goals.slice(0, 3).map(function (g) {
      var pct = goalPct(g);
      return '<a class="goal-mini" href="#/goals"><span class="gm-top"><span class="gm-title">' + esc(g.title || "Goal") + '</span><span class="gm-pct">' + pct + '%</span></span><span class="bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span></a>';
    }).join("") + (s.goals.length > 3 ? '<p class="small"><a href="#/goals">See all ' + s.goals.length + " goals</a></p>" : "")
      : '<p class="empty">One goal that feels light to carry is plenty. <a href="#/goals">Add one</a>.</p>');
    var soon = upcomingKeys(5);
    var soonCard = card("Coming up", keyDateList(soon, "Star a task on any day and it appears here."));

    var banner = s.sample ? '<div class="sample-banner" role="status"><span>You’re looking at a <b>sample planner</b>. Everything here is made up.</span><button class="btn sm" data-act="start-fresh">Start fresh</button></div>' : "";

    return banner + '<div class="hero"><div class="hero-text">' + head(hello, esc(SI.longDate(t)), '<span class="prompt">' + esc(PROMPTS[doy % PROMPTS.length]) + "</span>") +
      '<div class="intention"><label for="intent" class="eyebrow">Today’s intention</label>' +
      bound("days." + key + ".intention", rec.intention, 'id="intent" placeholder="One line for the day ahead…" maxlength="160"', "field intent-field") + "</div></div>" +
      ring(doy / yearDays, Math.round(doy / yearDays * 100) + "%", "of " + t.getFullYear() + " done") + "</div>" +
      '<p class="yline">' + Math.round(doy / yearDays * 100) + "% of " + t.getFullYear() + ' done<span class="bar" aria-hidden="true"><i style="width:' + Math.round(doy / yearDays * 100) + '%"></i></span></p>' +
      tiles + gettingStarted() +
      '<div class="cols cols-2"><div class="stack">' +
      card("To do today", taskList(key, false, "A quiet page. Add one small thing that would make today feel good.") + addRow(key)) +
      SI.scheduleCard(key) +
      card("This week", '<div class="wstrip">' + week + '</div><p class="small"><a href="' + href.week(t) + '">Open the week</a></p>') +
      nbCard +
      '</div><div class="stack">' +
      habitsCard + goalsCard + soonCard +
      card("How are you feeling?", moodPicker(key)) + "</div></div>";
  };

  /* ------------------------------------------------------------ YEAR */
  function miniMonth(y, m) {
    var first = new Date(y, m, 1), lead = SI.dowIndex(first), n = SI.daysIn(y, m), tk = SI.todayKey();
    var cells = SI.DOW_LETTER.map(function (l) { return '<span class="yh">' + l + "</span>"; }).join("");
    for (var i = 0; i < lead; i++) cells += "<span></span>";
    for (var d = 1; d <= n; d++) {
      var k = y + "-" + pad(m + 1) + "-" + pad(d), st = SI.dayStats(k), dow = (lead + d - 1) % 7;
      cells += '<a class="yd' + (k === tk ? " today" : "") + (dow > 4 ? " wknd" : "") + (st.total ? " has" : "") + (st.star ? " key" : "") + '" href="#/day/' + k + '"' +
        (st.total ? ' title="' + st.total + (st.total === 1 ? " task" : " tasks") + '"' : "") + ">" + d + "</a>";
    }
    return '<section class="mini"><h3><a href="' + href.month(y, m) + '">' + SI.MONTHS[m] + '</a></h3><div class="mini-grid">' + cells + "</div></section>";
  }

  function keyDatesIn(prefix) {
    var out = [];
    Object.keys(S().days).sort().forEach(function (k) {
      if (k.indexOf(prefix) !== 0) return;
      (S().days[k].items || []).forEach(function (it) { if (it.key && it.t) out.push({ k: k, t: it.t, done: it.done }); });
    });
    return out;
  }
  function keyDateList(list, emptyText) {
    if (!list.length) return '<p class="empty">' + emptyText + "</p>";
    return '<ul class="keylist">' + list.map(function (e) {
      var d = SI.parseKey(e.k);
      return '<li><a href="' + href.dayKey(e.k) + '"><span class="kl-date">' + d.getDate() + " " + SI.MONTHS_SHORT[d.getMonth()] + '</span><span class="kl-text' + (e.done ? " done" : "") + '">' + esc(e.t) + "</span></a></li>";
    }).join("") + "</ul>";
  }

  SI.views.year = function (a) {
    var y = parseInt(a[0], 10);
    if (isNaN(y) || y < 1900 || y > 2200) y = SI.today().getFullYear();
    var months = "";
    for (var m = 0; m < 12; m++) months += miniMonth(y, m);
    var doneTasks = 0, allTasks = 0, checkins = 0;
    Object.keys(S().days).forEach(function (k) {
      if (k.indexOf(y + "-") !== 0) return;
      var st = SI.dayStats(k); doneTasks += st.done; allTasks += st.total;
    });
    Object.keys(S().habitLog).forEach(function (h) {
      Object.keys(S().habitLog[h] || {}).forEach(function (k) { if (k.indexOf(y + "-") === 0 && S().habitLog[h][k]) checkins++; });
    });
    var yrec = (S().years[y] || {});
    return head("Year at a glance", String(y), "Tap a month to open it, or any day to plan it.",
      stepper(href.year(y - 1), href.year(y + 1), y, y === SI.today().getFullYear() ? "" : href.year(SI.today().getFullYear()), "This year")) +
      '<div class="intention"><label for="yint" class="eyebrow">A word or line for ' + y + "</label>" +
      bound("years." + y + ".intention", yrec.intention || "", 'id="yint" placeholder="How should this year feel?" maxlength="160"', "field intent-field") + "</div>" +
      '<div class="year-grid">' + months + "</div>" +
      '<div class="cols cols-2 year-foot">' +
      card("Key dates in " + y, keyDateList(keyDatesIn(y + "-"), "Nothing marked yet. Tap the star beside any task to make it a key date, and it will appear here.")) +
      card("The year so far", '<div class="stats"><div><b>' + doneTasks + "</b><span>of " + allTasks + " tasks done</span></div><div><b>" + checkins + "</b><span>habit check-ins</span></div></div>" +
        '<p class="small"><a href="#/reflect/year/' + y + '">Reflect on ' + y + "</a></p>") + "</div>";
  };

  /* ------------------------------------------------------------ MONTH */
  function monthStats(y, m) {
    var n = SI.daysIn(y, m), done = 0, total = 0, checks = 0, i, k;
    for (i = 1; i <= n; i++) {
      k = y + "-" + pad(m + 1) + "-" + pad(i);
      var st = SI.dayStats(k); done += st.done; total += st.total;
      S().habits.forEach(function (h) { if (habitDone(h.id, k)) checks++; });
    }
    return { done: done, total: total, checks: checks };
  }

  SI.views.month = function (a) {
    var mk = SI.parseMonthKey(a[0]) || { y: SI.today().getFullYear(), m: SI.today().getMonth() };
    var y = mk.y, m = mk.m, key = SI.monthKey(y, m), first = new Date(y, m, 1), lead = SI.dowIndex(first), n = SI.daysIn(y, m), tk = SI.todayKey();
    var prev = m === 0 ? [y - 1, 11] : [y, m - 1], next = m === 11 ? [y + 1, 0] : [y, m + 1];
    var now = SI.today(), isNow = now.getFullYear() === y && now.getMonth() === m;

    var cells = SI.DOW.map(function (d) { return '<div class="mh">' + d + "</div>"; }).join("");
    for (var i = 0; i < lead; i++) cells += '<div class="mc blank"></div>';
    for (var d = 1; d <= n; d++) {
      var k = y + "-" + pad(m + 1) + "-" + pad(d), rec = S().days[k], items = (rec && rec.items) || [], dow = (lead + d - 1) % 7;
      var chips = items.slice(0, 3).map(function (it) {
        return '<span class="chip' + (it.done ? " done" : "") + '">' + (it.key ? '<i class="kstar">★</i>' : "") + esc(it.t) + "</span>";
      }).join("");
      var more = items.length > 3 ? '<span class="more">+' + (items.length - 3) + " more</span>" : "";
      var dots = items.slice(0, 4).map(function (it) { return '<i class="dot' + (it.done ? " done" : "") + '"></i>'; }).join("");
      cells += '<a class="mc' + (k === tk ? " today" : "") + (dow > 4 ? " wknd" : "") + (items.length ? " has" : "") + '" href="#/day/' + k + '">' +
        '<span class="mnum">' + d + '</span><span class="chips-in">' + chips + more + '</span><span class="dots">' + dots + "</span></a>";
    }
    var ms = monthStats(y, m), mrec = S().months[key] || {};
    return head(String(y), esc(SI.MONTHS[m]), "",
      stepper(href.month(prev[0], prev[1]), href.month(next[0], next[1]), SI.MONTHS_SHORT[m] + " " + y, isNow ? "" : href.month(now.getFullYear(), now.getMonth()), "This month")) +
      '<div class="month-layout"><div class="mgrid" role="grid" aria-label="' + SI.MONTHS[m] + " " + y + '">' + cells + "</div>" +
      '<aside class="stack">' +
      card("Focus for " + SI.MONTHS[m], area("months." + key + ".focus", mrec.focus || "", 'rows="4" placeholder="What matters most this month?"')) +
      card("Key dates", keyDateList(keyDatesIn(key + "-"), "None yet. Star a task on any day to pin it here.")) +
      card("This month", '<div class="stats"><div><b>' + ms.done + "</b><span>of " + ms.total + " tasks done</span></div><div><b>" + ms.checks + "</b><span>habit check-ins</span></div></div>" +
        '<p class="small"><a href="#/habits/' + key + '">Habit tracker</a> · <a href="#/reflect/month/' + key + '">Monthly reflection</a></p>') +
      "</aside></div>";
  };

  /* ------------------------------------------------------------ WEEK */
  SI.views.week = function (a) {
    var base = SI.parseKey(a[0]) || SI.today(), mon = SI.mondayOf(base), sun = SI.addDays(mon, 6), wk = SI.key(mon), tk = SI.todayKey();
    var label = mon.getDate() + (mon.getMonth() !== sun.getMonth() ? " " + SI.MONTHS_SHORT[mon.getMonth()] : "") + " – " + sun.getDate() + " " + SI.MONTHS_SHORT[sun.getMonth()];
    var thisMon = SI.mondayOf(SI.today()), isNow = SI.key(thisMon) === wk;
    var cols = "";
    for (var i = 0; i < 7; i++) {
      var d = SI.addDays(mon, i), k = SI.key(d);
      cols += '<section class="wcol' + (k === tk ? " today" : "") + (i > 4 ? " wknd" : "") + '"><a class="wcol-head" href="' + href.day(d) + '"><span>' + SI.DOW[i] + "</span><b>" + d.getDate() + "</b></a>" +
        taskList(k, true, "") + addRow(k, "Add…") + "</section>";
    }
    var wrec = S().weeks[wk] || {};
    return head(mon.getFullYear() + " · Week " + weekNumber(mon), esc(label), "",
      stepper(href.week(SI.addDays(mon, -7)), href.week(SI.addDays(mon, 7)), label, isNow ? "" : href.week(SI.today()), "This week")) +
      '<div class="week-grid">' + cols + "</div>" +
      '<div class="cols cols-2 week-foot">' +
      card("Focus for the week", area("weeks." + wk + ".focus", wrec.focus || "", 'rows="4" placeholder="The one or two things that would make this week a good one…"')) +
      card("Looking back", area("weeks." + wk + ".review", wrec.review || "", 'rows="4" placeholder="What worked? What would I change?"')) + "</div>";
  };
  function weekNumber(mon) {
    /* ISO week: the week containing the year's first Thursday is week 1. */
    var thu = SI.addDays(mon, 3), jan1 = new Date(thu.getFullYear(), 0, 1);
    return Math.floor(Math.round((thu - jan1) / 86400000) / 7) + 1;
  }

  /* ------------------------------------------------------------ DAY */
  SI.views.day = function (a) {
    var d = SI.parseKey(a[0]) || SI.today(), key = SI.key(d), rec = SI.peekDay(key), isNow = key === SI.todayKey();
    return head(d.getFullYear() + " · " + SI.MONTHS[d.getMonth()], esc(SI.longDate(d)), "",
      stepper(href.day(SI.addDays(d, -1)), href.day(SI.addDays(d, 1)), SI.DOW[SI.dowIndex(d)] + " " + d.getDate(), isNow ? "" : "#/today", "Today")) +
      '<div class="intention"><label for="intent" class="eyebrow">Intention</label>' +
      bound("days." + key + ".intention", rec.intention, 'id="intent" placeholder="Today would be good if…" maxlength="160"', "field intent-field") + "</div>" +
      '<div class="cols cols-2"><div class="stack">' + SI.scheduleCard(key) +
      card("To do", taskList(key, false, "Nothing planned yet. Add one small thing.") + addRow(key) + '<p class="small hint">Tap the star to mark something as a key date. It will show up in your year and month pages.</p>') +
      card("A few lines about the day", area("days." + key + ".note", rec.note, 'rows="6" placeholder="What happened? What are you noticing?"') +
        '<div class="row-actions"><button class="btn sm ghost" data-act="nb-new-journal" data-day="' + key + '">' + ic("book") + "Write a full journal page</button></div>") +
      '</div><div class="stack">' +
      card("Habits", habitChips(key)) +
      card("Mood", moodPicker(key)) + "</div></div>";
  };

  /* ------------------------------------------------------------ HABITS */
  function streak(hid, y, m) {
    /* Days in a row ending today (or on the last day of an earlier month).
       If today isn't ticked yet, the streak still counts up to yesterday. */
    var log = S().habitLog[hid] || {}, now = SI.today(), end;
    if (new Date(y, m, 1) > now) return 0;
    var k = function (d) { return y + "-" + pad(m + 1) + "-" + pad(d); };
    if (now.getFullYear() === y && now.getMonth() === m) {
      end = now.getDate();
      if (!log[k(end)]) end--;
    } else end = SI.daysIn(y, m);
    var c = 0;
    for (var d = end; d >= 1 && log[k(d)]; d--) c++;
    return c;
  }
  SI.views.habits = function (a) {
    var mk = SI.parseMonthKey(a[0]) || { y: SI.today().getFullYear(), m: SI.today().getMonth() };
    var y = mk.y, m = mk.m, key = SI.monthKey(y, m), n = SI.daysIn(y, m), tk = SI.todayKey();
    var prev = m === 0 ? [y - 1, 11] : [y, m - 1], next = m === 11 ? [y + 1, 0] : [y, m + 1];
    var now = SI.today(), isNow = now.getFullYear() === y && now.getMonth() === m;
    var th = "<th class=\"hname\">Habit</th>", d;
    for (d = 1; d <= n; d++) {
      var dt = new Date(y, m, d);
      th += '<th class="hd' + (y + "-" + pad(m + 1) + "-" + pad(d) === tk ? " today" : "") + '"><span>' + SI.DOW_LETTER[SI.dowIndex(dt)] + "</span>" + d + "</th>";
    }
    th += '<th class="hsum">Month</th><th class="hdel"></th>';
    var rows = S().habits.map(function (h) {
      var tds = "", count = 0;
      for (var i = 1; i <= n; i++) {
        var k = y + "-" + pad(m + 1) + "-" + pad(i), on = habitDone(h.id, k);
        if (on) count++;
        tds += '<td><button class="hcell' + (on ? " on" : "") + (k === tk ? " today" : "") + '" data-act="toggle-habit" data-h="' + h.id + '" data-day="' + k + '" aria-pressed="' + on + '" aria-label="' + esc(h.name) + ", " + i + " " + SI.MONTHS[m] + '"></button></td>';
      }
      var sk = streak(h.id, y, m);
      return '<tr><th class="hname" scope="row">' + bound("habits.@" + h.id + ".name", h.name, 'aria-label="Habit name" maxlength="40"', "habit-name") + "</th>" + tds +
        '<td class="hsum"><b>' + count + "</b>/" + n + (sk > 1 ? '<span class="streak">' + sk + "-day streak</span>" : "") + "</td>" +
        '<td class="hdel"><button class="icon-btn del" data-act="del-habit" data-h="' + h.id + '" aria-label="Delete habit ' + esc(h.name) + '">' + ic("trash") + "</button></td></tr>";
    }).join("");
    var table = S().habits.length
      ? '<div class="htable-wrap"><table class="htable"><thead><tr>' + th + "</tr></thead><tbody>" + rows + "</tbody></table></div>"
      : '<p class="empty">No habits yet. Start with something small you would enjoy doing every day.</p>';
    return head("Habit tracker", esc(SI.MONTHS[m]) + " " + y, "",
      stepper("#/habits/" + SI.monthKey(prev[0], prev[1]), "#/habits/" + SI.monthKey(next[0], next[1]), SI.MONTHS_SHORT[m] + " " + y, isNow ? "" : "#/habits/" + SI.monthKey(now.getFullYear(), now.getMonth()), "This month")) +
      card("", table + '<div class="add-row"><input class="add-input" id="new-habit" placeholder="Add a habit…" maxlength="40" aria-label="New habit name" /><button class="btn sm" data-act="add-habit">Add habit</button></div>');
  };

  /* ------------------------------------------------------------ GOALS */
  function goalPct(g) {
    if (!g.steps || !g.steps.length) return 0;
    return Math.round(g.steps.filter(function (s) { return s.done; }).length / g.steps.length * 100);
  }
  SI.views.goals = function () {
    var gs = S().goals;
    var cards = gs.map(function (g) {
      var p = "goals.@" + g.id, pct = goalPct(g);
      var steps = (g.steps || []).map(function (s) {
        return '<li class="task compact' + (s.done ? " done" : "") + '"><button class="chk' + (s.done ? " on" : "") + '" data-act="toggle-step" data-g="' + g.id + '" data-id="' + s.id + '" aria-pressed="' + !!s.done + '" aria-label="Mark step done">' + ic("check") + "</button>" +
          '<input class="task-text" data-bind="' + p + ".steps.@" + s.id + '.t" value="' + esc(s.t) + '" aria-label="Step" />' +
          '<button class="icon-btn del" data-act="del-step" data-g="' + g.id + '" data-id="' + s.id + '" aria-label="Delete step">' + ic("trash") + "</button></li>";
      }).join("");
      return '<article class="card goal"><div class="goal-top">' + bound(p + ".title", g.title, 'aria-label="Goal" maxlength="100"', "goal-title") +
        '<button class="icon-btn del" data-act="del-goal" data-g="' + g.id + '" aria-label="Delete goal" title="Delete goal">' + ic("trash") + "</button></div>" +
        '<div class="bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div><p class="small">' + pct + "% · " + (g.steps || []).filter(function (s) { return s.done; }).length + " of " + (g.steps || []).length + " steps</p>" +
        area(p + ".why", g.why || "", 'rows="2" placeholder="Why does this matter to me?"', "field area slim") +
        (steps ? '<ul class="tasks">' + steps + "</ul>" : '<p class="empty">Break it into small steps you can actually take.</p>') +
        '<div class="add-row"><input class="add-input" data-add-step="' + g.id + '" placeholder="Add a step…" maxlength="120" aria-label="New step" /><button class="btn sm" data-act="add-step" data-g="' + g.id + '">Add</button></div></article>';
    }).join("");
    return head("Goals", "What I’m growing", "Fewer goals, held gently, tend to get done.") +
      '<div class="add-goal card"><input class="add-input" id="new-goal" placeholder="A goal for this year…" maxlength="100" aria-label="New goal" /><button class="btn" data-act="add-goal">' + ic("plus") + "Add goal</button></div>" +
      (gs.length ? '<div class="goal-grid">' + cards + "</div>" : '<p class="empty center">Start with one goal that feels light to carry.</p>');
  };

  /* ------------------------------------------------------------ REFLECT */
  var MONTH_PROMPTS = [["a", "What went well?"], ["b", "What did I learn?"], ["c", "What am I carrying forward?"]];
  var YEAR_PROMPTS = [["a", "A word for this year"], ["b", "What I’m proudest of"], ["c", "What I’m letting go of"], ["d", "What I want more of"]];
  SI.views.reflect = function (a) {
    var kind = a[0] === "year" ? "year" : "month", body, title, nav, key, p;
    var tabs = '<div class="seg" role="tablist"><a role="tab" class="' + (kind === "month" ? "on" : "") + '" href="#/reflect/month/' + SI.monthKey(SI.cursor.getFullYear(), SI.cursor.getMonth()) + '">Month</a>' +
      '<a role="tab" class="' + (kind === "year" ? "on" : "") + '" href="#/reflect/year/' + SI.cursor.getFullYear() + '">Year</a></div>';
    if (kind === "year") {
      var y = parseInt(a[1], 10);
      if (isNaN(y) || y < 1900 || y > 2200) y = SI.today().getFullYear();
      key = String(y); title = String(y);
      nav = stepper("#/reflect/year/" + (y - 1), "#/reflect/year/" + (y + 1), y);
      p = YEAR_PROMPTS;
    } else {
      var mk = SI.parseMonthKey(a[1]) || { y: SI.today().getFullYear(), m: SI.today().getMonth() };
      var prev = mk.m === 0 ? [mk.y - 1, 11] : [mk.y, mk.m - 1], next = mk.m === 11 ? [mk.y + 1, 0] : [mk.y, mk.m + 1];
      key = SI.monthKey(mk.y, mk.m); title = SI.MONTHS[mk.m] + " " + mk.y;
      nav = stepper("#/reflect/month/" + SI.monthKey(prev[0], prev[1]), "#/reflect/month/" + SI.monthKey(next[0], next[1]), SI.MONTHS_SHORT[mk.m] + " " + mk.y);
      p = MONTH_PROMPTS;
    }
    var rec = S().reflections[key] || {};
    body = p.map(function (q) {
      return card(q[1], area("reflections." + key + "." + q[0], rec[q[0]] || "", 'rows="5" placeholder="Take your time…"'));
    }).join("");
    return head("Reflect", esc(title), "", tabs + nav) + '<div class="cols cols-2 reflect">' + body + "</div>";
  };

  /* ------------------------------------------------------------ actions */
  var A = SI.actions;
  function findItem(day, id) { return SI.day(day).items.filter(function (i) { return i.id === id; })[0]; }
  function refocus(sel) { SI.refocus = sel; }

  A["add-item"] = function (el) {
    var day = el.dataset.day, input = document.querySelector('[data-add="' + day + '"]');
    var t = input && input.value.trim();
    if (!t) { if (input) input.focus(); return; }
    SI.day(day).items.push({ id: SI.uid(), t: t, done: false, key: false });
    SI.save(); refocus('[data-add="' + day + '"]'); SI.render();
  };
  A["toggle-item"] = function (el) { var it = findItem(el.dataset.day, el.dataset.id); if (it) { it.done = !it.done; SI.save(); SI.render(); } };
  A["star-item"] = function (el) {
    var it = findItem(el.dataset.day, el.dataset.id);
    if (it) { it.key = !it.key; SI.save(); SI.render(); if (it.key) SI.toast("Marked as a key date."); }
  };
  A["del-item"] = function (el) {
    var d = SI.day(el.dataset.day);
    d.items = d.items.filter(function (i) { return i.id !== el.dataset.id; });
    SI.save(); SI.render();
  };
  A["toggle-habit"] = function (el) {
    var h = el.dataset.h, k = el.dataset.day, log = S().habitLog[h] || (S().habitLog[h] = {});
    if (log[k]) delete log[k]; else log[k] = 1;
    SI.save(); SI.render();
  };
  A["set-mood"] = function (el) {
    var d = SI.day(el.dataset.day);
    d.mood = d.mood === el.dataset.v ? "" : el.dataset.v;
    SI.save(); SI.render();
  };
  A["add-habit"] = function () {
    var input = document.getElementById("new-habit"), t = input && input.value.trim();
    if (!t) { if (input) input.focus(); return; }
    S().habits.push({ id: SI.uid(), name: t });
    SI.save(); refocus("#new-habit"); SI.render();
  };
  A["del-habit"] = function (el) {
    var h = S().habits.filter(function (x) { return x.id === el.dataset.h; })[0];
    if (!h || !window.confirm("Delete “" + (h.name || "this habit") + "” and all of its check-ins?")) return;
    S().habits = S().habits.filter(function (x) { return x.id !== h.id; });
    delete S().habitLog[h.id];
    SI.save(); SI.render();
  };
  A["add-goal"] = function () {
    var input = document.getElementById("new-goal"), t = input && input.value.trim();
    if (!t) { if (input) input.focus(); return; }
    S().goals.unshift({ id: SI.uid(), title: t, why: "", steps: [] });
    SI.save(); refocus("#new-goal"); SI.render();
  };
  A["del-goal"] = function (el) {
    var g = S().goals.filter(function (x) { return x.id === el.dataset.g; })[0];
    if (!g || !window.confirm("Delete “" + (g.title || "this goal") + "”?")) return;
    S().goals = S().goals.filter(function (x) { return x.id !== g.id; });
    SI.save(); SI.render();
  };
  function goalById(id) { return S().goals.filter(function (x) { return x.id === id; })[0]; }
  A["add-step"] = function (el) {
    var g = goalById(el.dataset.g), input = document.querySelector('[data-add-step="' + el.dataset.g + '"]'), t = input && input.value.trim();
    if (!g || !t) { if (input) input.focus(); return; }
    g.steps = g.steps || []; g.steps.push({ id: SI.uid(), t: t, done: false });
    SI.save(); refocus('[data-add-step="' + g.id + '"]'); SI.render();
  };
  A["toggle-step"] = function (el) {
    var g = goalById(el.dataset.g), s = g && g.steps.filter(function (x) { return x.id === el.dataset.id; })[0];
    if (s) { s.done = !s.done; SI.save(); SI.render(); }
  };
  A["del-step"] = function (el) {
    var g = goalById(el.dataset.g);
    if (g) { g.steps = g.steps.filter(function (x) { return x.id !== el.dataset.id; }); SI.save(); SI.render(); }
  };
  A.export = function () { SI.exportData(); };
})();
