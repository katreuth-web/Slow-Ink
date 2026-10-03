/* Aura — calendar horizons: Year → Month (reset) → Week → Daily Focus, all linked. */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic;

  A.MOOD_COLORS = ["#FF8A9E", "#FF9DB0", "#FFA9C8", "#F7B2E0", "#E6B4F5", "#D6A8FF", "#C2AEFF", "#ABBEFF", "#9CD3EE", "#8FD9C0"];

  /* ------------------------------------------------------------ shared stats */
  A.periodStats = function (start, end) {
    var s = { days: 0, tasks: 0, done: 0, moods: [], habitHits: 0, habitSlots: 0, practices: 0, gratitude: 0, affirmed: 0, reflections: 0, manifested: 0 };
    var hs = A.state.habits;
    for (var d = new Date(start); d <= end; d = A.addDays(d, 1)) {
      var k = A.ymd(d), day = A.peekDay(k);
      if (day) {
        if (A.dayHasContent(k)) s.days++;
        s.tasks += day.tasks.length;
        s.done += day.tasks.filter(function (t) { return t.done; }).length;
        if (day.mood) s.moods.push(day.mood);
        s.practices += A.practiceCount(day);
        s.gratitude += day.gratitude.filter(Boolean).length;
        s.affirmed += day.affirmed || 0;
        var r = day.reflect;
        if (r.wins || r.felt || r.shifted || r.release) s.reflections++;
      }
      if (d <= A.today()) {
        var log = A.state.habitLog[k] || {};
        hs.forEach(function (h) { s.habitSlots++; if (log[h.id]) s.habitHits++; });
      }
    }
    var sk = A.ymd(start), ek = A.ymd(end);
    A.state.manifest.items.forEach(function (m) { if (m.status === "manifested" && m.doneDate >= sk && m.doneDate <= ek) s.manifested++; });
    s.moodAvg = s.moods.length ? s.moods.reduce(function (a, b) { return a + b; }, 0) / s.moods.length : 0;
    s.habitPct = s.habitSlots ? s.habitHits / s.habitSlots : 0;
    return s;
  };

  /* ------------------------------------------------------------ habit grid (shared) */
  A.habitGrid = function (dates, opts) {
    opts = opts || {};
    var tk = A.todayKey(), hs = A.state.habits;
    if (!hs.length) return '<div class="empty">No rituals yet. Add some on the <a href="#/habits">Habits</a> page.</div>';
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
    return A.head("Year overview", '<span class="soft">' + y + "</span> at a glance", "Tap a month, a week number or any date to jump straight to that page. Dots mark the days you’ve written in.", pager(A.hrefYear(y - 1), A.hrefYear(y + 1))) +
      '<div class="grid" style="margin-bottom:16px">' +
      '<div class="c4">' + A.card("Word of the year", A.input("years." + y + ".word", 'placeholder="e.g. Bloom"', "hand") + '<label class="lbl">My intention for the year</label>' + A.textarea("years." + y + ".theme", 'placeholder="This year I am choosing to feel…" rows="3"'), { icon: "sparkle", tint: "grad" }) + "</div>" +
      '<div class="c4">' + A.card("Dreams for this year", A.checklist("years." + y + ".goals", "Add a dream or intention", "Three to five is plenty.") + '<p class="small muted" style="margin:10px 0 0">Plant them on <a href="#/manifest">My Manifestations</a> to follow their progress.</p>', { icon: "flag", tone: "pink" }) + "</div>" +
      '<div class="c4">' + A.card("Year so far", '<div class="stats">' +
        '<div class="inner stat"><b>' + st.days + "</b><span>days with practice</span></div>" +
        '<div class="inner stat"><b>' + st.manifested + "</b><span>manifested</span></div>" +
        '<div class="inner stat"><b>' + st.gratitude + "</b><span>thank-yous</span></div>" +
        '<div class="inner stat"><b>' + (st.moodAvg ? st.moodAvg.toFixed(1) : "—") + "</b><span>avg mood</span></div></div>", { icon: "target", tone: "mint" }) + "</div>" +
      "</div>" + '<div class="year-grid">' + months + "</div>";
  };

  /* ------------------------------------------------------------ month */
  /* A small marker on new and full moon days. */
  function moonDot(d) {
    var ph = A.moonPhase(d);
    return ph.idx === 0 ? '<i class="mn new" title="New moon"></i>' : ph.idx === 4 ? '<i class="mn full" title="Full moon"></i>' : "";
  }

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
        cal += '<a class="day-cell' + (d.getMonth() !== m ? " out" : "") + (k === tk ? " today" : "") + '" href="' + A.hrefDay(d) + '"><span class="dn"><span>' + d.getDate() + "</span>" + moonDot(d) + (day && day.mood ? '<i class="mood-dot" style="background:' + A.MOOD_COLORS[day.mood - 1] + '" title="Mood ' + day.mood + '/10"></i>' : "") + "</span>" +
          items.slice(0, 3).map(function (t) { return '<span class="t' + (t.done ? " done" : "") + '">' + esc(t.text) + "</span>"; }).join("") + (items.length > 3 ? '<span class="small muted">+' + (items.length - 3) + "</span>" : "") + "</a>";
      }
    }
    cal += "</div>";

    var prevFirst = new Date(y, m - 1, 1), prevLast = new Date(y, m, 0);
    var ps = A.periodStats(prevFirst, prevLast);
    var recap = '<div class="stats" style="margin-bottom:12px">' +
      '<div class="inner stat"><b>' + ps.days + "</b><span>days written</span></div>" +
      '<div class="inner stat"><b>' + (ps.moodAvg ? ps.moodAvg.toFixed(1) : "—") + "</b><span>avg mood</span></div>" +
      '<div class="inner stat"><b>' + ps.gratitude + "</b><span>thank-yous</span></div>" +
      '<div class="inner stat"><b>' + ps.manifested + "</b><span>manifested</span></div></div>" +
      '<label class="lbl">What felt good and what I celebrate</label>' + A.textarea("months." + key + ".recap.well", 'rows="2" placeholder="Wins, proud moments, things that went better than expected…"') +
      '<label class="lbl">What I’m releasing</label>' + A.textarea("months." + key + ".recap.leave", 'rows="2" placeholder="Worries, old stories, habits that no longer fit…"') +
      '<label class="lbl">What I’m carrying forward</label>' + A.textarea("months." + key + ".recap.carry", 'rows="2" placeholder="Intentions and lessons worth keeping"');

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
      '<div class="c8">' + A.card("Calendar", cal, { icon: "calendar", sub: "Week numbers open the weekly spread; dates open the daily practice page. A ring marks new moons and a filled dot marks full moons." }) + "</div>" +
      '<div class="c4 stack">' +
        A.card("Monthly intention", '<label class="lbl">Word for the month</label>' + A.input("months." + key + ".word", 'placeholder="e.g. Steady"', "hand") +
          '<label class="lbl">Intentions</label>' + [0, 1, 2].map(function (i) { return '<div class="row" style="margin-bottom:6px"><span class="badge pink">' + (i + 1) + "</span>" + A.input("months." + key + ".intentions." + i, 'placeholder="I will…"', "grow") + "</div>"; }).join(""), { icon: "heart", tone: "pink", tint: "pink" }) +
        A.card("Monthly intentions to act on", A.checklist("months." + key + ".goals", "Add an intention"), { icon: "flag" }) +
      "</div>" +
      '<div class="c6">' + A.card("Reflect · " + A.MONTHS[prevFirst.getMonth()] + " recap", recap, { icon: "refresh", tone: "sky" }) + "</div>" +
      '<div class="c6">' + A.card("Focus areas", focus, { icon: "target", tone: "mint", sub: "Pick the life areas that get your energy this month." }) + "</div>" +
      '<div class="c12">' + A.card("Rituals tracker", A.habitGrid(dates, { streak: true }), { icon: "check", tone: "butter", tools: '<a class="btn sm ghost" href="#/habits">Edit rituals</a>' }) + "</div>" +
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
        '<input class="field" placeholder="+ inspired action" data-enter="task-add" data-k="' + k + '" />' +
        "</section>";
    }).join("");
    var label = mon.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " – " + sun.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    var st = A.periodStats(mon, sun);
    return crumbs([[mon.getFullYear(), A.hrefYear(mon.getFullYear())], [A.MONTHS[mon.getMonth()], A.hrefMonth(mon)], ["Week " + A.isoWeek(mon)]]) +
      A.head("Weekly spread", "Week " + A.isoWeek(mon) + ' <span class="soft">' + label + "</span>", "", pager(A.hrefWeek(A.addDays(mon, -7)), A.hrefWeek(A.addDays(mon, 7)))) +
      '<div class="grid" style="margin-bottom:16px">' +
      '<div class="c4">' + A.card("This week's focus", A.textarea("weeks." + wk + ".focus", 'rows="3" placeholder="This week I’m focusing on… and I want to feel…"'), { icon: "target", tint: "grad" }) + "</div>" +
      '<div class="c4">' + A.card("Inspired actions", A.checklist("weeks." + wk + ".priorities", "Add an action", "What small steps will you take?"), { icon: "star", tone: "pink" }) + "</div>" +
      '<div class="c4">' + A.card("Week pulse", '<div class="stats">' +
        '<div class="inner stat"><b>' + st.done + "/" + st.tasks + "</b><span>actions done</span></div>" +
        '<div class="inner stat"><b>' + (st.moodAvg ? st.moodAvg.toFixed(1) : "—") + "</b><span>mood</span></div>" +
        '<div class="inner stat"><b>' + st.practices + "</b><span>practices</span></div>" +
        '<div class="inner stat"><b>' + st.gratitude + "</b><span>thank-yous</span></div></div>" +
        '<label class="lbl">Looking back: how did this week feel?</label>' + A.textarea("weeks." + wk + ".notes", 'rows="2" placeholder="What I noticed, what I’m proud of, what I’ll do differently…"'), { icon: "bolt", tone: "mint" }) + "</div>" +
      "</div>" +
      '<div class="week-days">' + cols + "</div>" +
      '<div style="margin-top:16px">' + A.card("Rituals this week", A.habitGrid(days, { dow: true, streak: true }), { icon: "check", tone: "butter" }) + "</div>";
  };
  A.acts["task-add"] = function (el) {
    var text = el.value.trim();
    if (!text) return;
    A.addTask(el.getAttribute("data-k"), text);
    A.render();
    var again = document.querySelector('[data-enter="task-add"][data-k="' + el.getAttribute("data-k") + '"]');
    if (again) again.focus();
  };

  /* ------------------------------------------------------------ day: daily practice */
  var EMOTIONS = ["Joyful", "Grateful", "Calm", "Hopeful", "Excited", "Confident", "Loved", "Peaceful", "Curious", "Tired", "Anxious", "Overwhelmed", "Sad", "Frustrated", "Doubtful"];
  var ENERGY = ["Drained", "Low", "Steady", "Bright", "Buzzing"];

  A.views.day = function (kArg) {
    var d = kArg === "today" || !kArg ? A.today() : A.parseD(kArg) || A.today();
    var k = A.ymd(d), day = A.day(k), tk = A.todayKey(), mon = A.mondayOf(d);
    A.ctxDate = d;
    var base = "days." + k;

    var strip = '<div class="week-strip">' + [0, 1, 2, 3, 4, 5, 6].map(function (i) {
      var x = A.addDays(mon, i), xk = A.ymd(x);
      return '<a class="' + (xk === k ? "on " : "") + (xk === tk ? "today" : "") + '" href="' + A.hrefDay(x) + '">' + A.DOW[i].slice(0, 3) + "<b>" + x.getDate() + "</b></a>";
    }).join("") + "</div>";

    var ph = A.moonPhase(d), aff = A.affirmOfDay(d);
    var moonChip = '<span class="moon-art sm">' + (A.stickerSvg ? A.stickerSvg(ph.key) : "") + '</span><div><b>' + esc(ph.name) + '</b><div class="small muted">' + esc(ph.prompt) + "</div></div>";

    var top3 = '<ul class="list top3">' + day.top3.map(function (t, i) {
      return '<li class="li' + (t.done ? " done" : "") + '"><span class="n">' + (i + 1) + "</span>" + A.input(base + ".top3." + i + ".t", 'placeholder="An inspired step ' + (i + 1) + '"', "bare") + A.checkbox(base + ".top3." + i + ".done") + "</li>";
    }).join("") + "</ul>";

    var tasks = '<ul class="list">' + day.tasks.map(function (t, i) {
      return '<li class="li' + (t.done ? " done" : "") + '">' + A.checkbox(base + ".tasks." + i + ".done") + A.input(base + ".tasks." + i + ".text", "", "bare") +
        '<button class="x-btn" data-act="list-remove" data-list="' + base + '.tasks" data-idx="' + i + '" aria-label="Remove task">' + ic("x") + "</button></li>";
    }).join("") + "</ul>" +
      '<div class="add-row"><input class="field" placeholder="Add a to-do" data-enter="task-add" data-k="' + k + '" /><button class="btn sm soft" data-act="task-add-btn" data-k="' + k + '">' + ic("plus") + "</button></div>";

    var mood = '<div class="mood-scale">' + A.MOOD_COLORS.map(function (c, i) {
      var on = day.mood === i + 1;
      return '<button class="' + (on ? "on" : "") + '" style="' + (on ? "background:" + c : "border:2px solid " + c) + '" data-act="day-mood" data-k="' + k + '" data-v="' + (i + 1) + '" aria-label="Mood ' + (i + 1) + '">' + (i + 1) + "</button>";
    }).join("") + '</div><div class="row small muted" style="justify-content:space-between;margin:6px 0 12px"><span>heavy</span><span>radiant</span></div>' +
      '<label class="lbl">Energy</label><div class="seg energy">' + ENERGY.map(function (e, i) {
        return '<button class="' + (day.energy === i + 1 ? "on" : "") + '" data-act="day-energy" data-k="' + k + '" data-v="' + (i + 1) + '" aria-pressed="' + (day.energy === i + 1) + '">' + e + "</button>";
      }).join("") + "</div>";

    var emotions = '<div class="chips">' + EMOTIONS.map(function (e) {
      var on = day.emotions.indexOf(e) >= 0;
      return '<button class="chip emo' + (on ? " pink" : " grey") + '" style="border:0;cursor:pointer" data-act="day-emotion" data-k="' + k + '" data-v="' + e + '" aria-pressed="' + on + '">' + (on ? "✓ " : "") + e + "</button>";
    }).join("") + "</div>";

    var grat = [0, 1, 2].map(function (i) {
      return '<div class="row" style="margin-bottom:8px"><span class="badge pink">' + (i + 1) + "</span>" + A.input(base + ".gratitude." + i, 'placeholder="I’m grateful for…" data-live="gratitude-live"', "grow") + "</div>";
    }).join("");

    var growing = A.state.manifest.items.filter(function (m) { return m.status === "planted" || m.status === "growing"; }).slice(0, 4);
    var grow = growing.length ? '<ul class="list">' + growing.map(function (m) {
      return '<li class="li"><span class="badge ' + (m.status === "growing" ? "mint" : "pink") + '">' + (m.status === "growing" ? "Growing" : "Planted") + '</span><a class="li-text" href="#/manifest/' + m.id + '">' + esc(m.title || "Untitled") + "</a></li>";
    }).join("") + '</ul><p class="small muted" style="margin:10px 0 0"><a href="#/manifest">See all manifestations</a></p>' :
      '<div class="empty">Nothing planted yet. <a href="#/manifest">Plant your first intention</a>.</div>';

    var reflect = '<div class="grid">' +
      '<div class="c4"><label class="lbl">What went well today?</label>' + A.textarea(base + ".reflect.wins", 'rows="4" placeholder="Big or tiny…"', "lined") + "</div>" +
      '<div class="c4"><label class="lbl">What did I feel, and what were my emotions telling me?</label>' + A.textarea(base + ".reflect.felt", 'rows="4" placeholder="Name the feeling, then get curious about it…"', "lined") + "</div>" +
      '<div class="c4"><label class="lbl">What shifted in my thinking?</label>' + A.textarea(base + ".reflect.shifted", 'rows="4" placeholder="A new thought, a changed mind, a small insight…"', "lined") + "</div>" +
      '<div class="c6"><label class="lbl">What am I ready to release?</label>' + A.textarea(base + ".reflect.release", 'rows="3" placeholder="A worry, a story, a should…"', "lined") + "</div>" +
      '<div class="c6"><label class="lbl">Tomorrow I will…</label>' + A.textarea(base + ".reflect.tomorrow", 'rows="3" placeholder="Set yourself up gently"', "lined") + "</div></div>";

    var dateTitle = d.toLocaleDateString(undefined, { weekday: "long" }) + ' <span class="soft">' + d.toLocaleDateString(undefined, { month: "long", day: "numeric" }) + "</span>";
    return crumbs([[d.getFullYear(), A.hrefYear(d.getFullYear())], [A.MONTHS[d.getMonth()], A.hrefMonth(d)], ["Week " + A.isoWeek(d), A.hrefWeek(d)], [String(d.getDate())]]) +
      A.head(k === tk ? "Today · daily practice" : "Daily practice", dateTitle, "", pager(A.hrefDay(A.addDays(d, -1)), A.hrefDay(A.addDays(d, 1)))) +
      strip +
      '<div class="card tint-grad" style="margin-bottom:16px;padding:14px 18px"><div class="row wrap"><span class="eyebrow" style="margin:0">Today I choose to feel</span>' + A.input(base + ".intention", 'placeholder="calm, capable, open"', "bare grow hand") + "</div>" +
        '<div class="row wrap" style="margin-top:6px"><span class="eyebrow" style="margin:0">I am</span>' + A.input(base + ".feeling", 'placeholder="…"', "bare grow hand") + "</div></div>" +
      '<div class="grid">' +
      '<div class="c6"><div class="card moon-chip">' + moonChip + '<a class="btn xs ghost" href="#/rituals/moon">Moon</a></div></div>' +
      '<div class="c6"><div class="card aff-chip"><p class="aff-text" style="margin:0">“' + esc(aff.text) + '”</p><button class="btn xs soft" data-act="affirm-say" data-id="' + aff.id + '" data-stay="1">' + ic("check") + "I said it" + (day.affirmed ? " · " + day.affirmed : "") + "</button></div></div>" +
      '<div class="c12">' + A.card("Today’s practice", '<span id="pr-count" class="badge" style="margin-bottom:8px;display:inline-block">' + A.practiceCount(day) + "/" + A.PRACTICES.length + "</span>" + A.practiceChips(k) +
        '<p class="small muted" style="margin:10px 0 0">Tick what you’ve done. Do the practice itself on <a href="#/visualize">Visualize</a>, <a href="#/script">Scripting</a>, <a href="#/affirm">Affirmations</a> or <a href="#/rituals">Rituals</a> and it ticks for you.</p>', { icon: "sprout", tint: "lav" }) + "</div>" +
      '<div class="c4 stack">' +
        A.card("Inspired actions", top3, { icon: "star", tone: "pink", sub: "Up to three small steps you feel pulled to take today." }) +
        A.card("To-dos", tasks, { icon: "list" }) +
      "</div>" +
      '<div class="c4 stack">' +
        A.card("How I feel", mood, { icon: "smile", tone: "pink" }) +
        A.card("Emotions", emotions, { icon: "heart", tone: "lav", sub: "Tap any that were present today." }) +
      "</div>" +
      '<div class="c4 stack">' +
        A.card("Gratitude", grat, { icon: "heart", tone: "butter" }) +
        A.card("What I’m growing", grow, { icon: "seed", tone: "mint" }) +
      "</div>" +
      '<div class="c6">' + A.card("Act as if", '<label class="lbl">If this were already true, today I would…</label>' + A.textarea(base + ".actAsIf", 'rows="3" placeholder="How would I think, move and speak?"', "lined"), { icon: "bolt", tone: "butter", tools: '<a class="btn xs soft" href="#/script">' + ic("pen") + "Script it</a>" }) + "</div>" +
      '<div class="c6">' + A.card("Signs I noticed", '<label class="lbl">A number, a song, a coincidence, a kind word…</label>' + A.textarea(base + ".sign", 'rows="3" placeholder="Today I noticed…"', "lined"), { icon: "eye", tone: "sky", tools: '<a class="btn xs soft" href="#/rituals/signs">All signs</a>' }) + "</div>" +
      '<div class="c12">' + A.card("Evening reflection", reflect, { icon: "moon", tint: "lav", tools: '<a class="btn sm" href="#/notebook">' + ic("book") + "Open notebook</a>" }) + "</div>" +
      '<div class="c12">' + A.card("Brain dump", A.textarea(base + ".brain", 'rows="4" placeholder="Empty your head. The Thought Sorter can turn it into inspired actions."', "lined"), { icon: "brain", tools: '<button class="btn xs soft" data-act="brain-to-synth" data-k="' + k + '">' + ic("sparkle") + "Sort my thoughts</button>" }) + "</div>" +
      "</div>";
  };

  A.acts["task-add-btn"] = function (el) {
    var inp = el.parentNode.querySelector("input");
    A.acts["task-add"](inp);
  };
  A.acts["day-mood"] = function (el) {
    var day = A.day(el.getAttribute("data-k")), v = +el.getAttribute("data-v");
    day.mood = day.mood === v ? 0 : v; A.save(); A.render();
  };
  A.acts["day-energy"] = function (el) {
    var day = A.day(el.getAttribute("data-k")), v = +el.getAttribute("data-v");
    day.energy = day.energy === v ? 0 : v; A.save(); A.render();
  };
  A.acts["day-emotion"] = function (el) {
    var day = A.day(el.getAttribute("data-k")), v = el.getAttribute("data-v"), i = day.emotions.indexOf(v);
    if (i >= 0) day.emotions.splice(i, 1); else day.emotions.push(v);
    A.save(); A.render();
  };
  A.acts["brain-to-synth"] = function (el) {
    var day = A.day(el.getAttribute("data-k"));
    if (!day.brain.trim()) { A.toast("Write something in the brain dump first."); return; }
    A.state.coach.synthInput = day.brain;
    A.save(); location.hash = "#/synth";
  };
})();
