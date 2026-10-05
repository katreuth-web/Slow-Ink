/* Aura — Home dashboard: today at a glance, a getting-started checklist and an optional sample planner. */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic;

  function ui() { return A.state.ui; }
  function anyDay(test) { return Object.keys(A.state.days).some(function (k) { return test(A.state.days[k], k); }); }

  var STEPS = [
    ["Plant your first intention", "#/manifest", function () { return A.state.manifest.items.length > 0; }],
    ["Say today’s affirmation", "#/affirm", function () { return anyDay(function (d) { return d.affirmed > 0; }); }],
    ["Try a 369 set", "#/rituals/369", function () { return anyDay(function (d) { return d.r369 && (d.r369.m || d.r369.a || d.r369.e); }); }],
    ["Write a notebook page", "#/notebook", function () { return A.state.notebook.pages.length > 0; }],
    ["Make it yours with colours and fonts", null, function () { var l = A.look(); return l.theme !== "violet" || l.mode !== "light" || l.font !== "classic" || l.bg !== "soft"; }, "open-look"],
    ["Back up your planner", null, function () { return !!ui().backedUp; }, "export"]
  ];

  function gettingStarted() {
    if (ui().sample || ui().onboardHidden) return "";
    var done = STEPS.filter(function (x) { return x[2](); }).length, n = STEPS.length, all = done === n;
    var list = STEPS.map(function (x) {
      var ok = x[2]();
      return '<li class="gs-step' + (ok ? " ok" : "") + '"><span class="gs-dot" aria-hidden="true">' + (ok ? ic("check") : "") + "</span>" +
        (ok ? "<span>" + esc(x[0]) + "</span>" : x[1] ? '<a href="' + x[1] + '">' + esc(x[0]) + "</a>" : '<button class="linklike" data-act="' + x[3] + '">' + esc(x[0]) + "</button>") + "</li>";
    }).join("");
    return A.card(all ? "You’re all set" : "Getting started",
      '<div class="gs-count">' + done + " of " + n + " done</div>" + A.bar(done / n) + '<ul class="gs-list">' + list + "</ul>" +
      '<div class="row wrap gs-actions"><button class="btn sm" data-act="load-sample">Look around with sample data</button><button class="btn sm ghost" data-act="hide-start">' + (all ? "Done, hide this" : "Hide this") + "</button></div>",
      { icon: "sprout", tint: "grad", cls: "gstart" });
  }

  function practiceStreak() {
    var d = A.today(), n = 0;
    function has(x) { var day = A.peekDay(A.ymd(x)); return !!day && A.practiceCount(day) > 0; }
    if (!has(d)) d = A.addDays(d, -1);
    while (has(d)) { n++; d = A.addDays(d, -1); }
    return n;
  }
  function vizThisWeek() {
    var from = A.ymd(A.mondayOf(A.today())), mins = 0;
    A.state.viz.sessions.forEach(function (s) { if (s.date >= from) mins += s.mins || 0; });
    return mins;
  }
  function kpi(num, label, href, frac) {
    return '<a class="kpi" href="' + href + '"><span class="kpi-num">' + num + '</span><span class="kpi-label">' + esc(label) + "</span>" + (frac == null ? "" : A.bar(frac)) + "</a>";
  }

  A.views.home = function () {
    var t = A.today(), k = A.ymd(t), day = A.day(k), h = new Date().getHours(), mon = A.mondayOf(t);
    A.ctxDate = t;
    var hello = h < 5 ? "Still up?" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    var np = A.PRACTICES.length, pc = A.practiceCount(day), streak = practiceStreak();
    var live = A.state.manifest.items.filter(function (m) { return m.status === "planted" || m.status === "growing"; });
    var ph = A.moonPhase(t), aff = A.affirmOfDay(t);
    var banner = ui().sample ? '<div class="sample-banner" role="status"><span>You’re looking at a <b>sample planner</b>. Everything here is made up.</span><button class="btn sm" data-act="start-fresh">Start fresh</button></div>' : "";

    var kpis = '<div class="kpis">' +
      kpi(pc + "<small>/" + np + "</small>", "practices today", A.hrefDay(t), pc / np) +
      kpi(streak + "<small> day" + (streak === 1 ? "" : "s") + "</small>", "practice streak", "#/habits") +
      kpi(vizThisWeek() + "<small> min</small>", "visualized this week", "#/visualize") +
      kpi(live.length, live.length === 1 ? "intention growing" : "intentions growing", "#/manifest") + "</div>";

    var affCard = '<section class="card tint-grad aff-card"><p class="eyebrow" style="margin-top:0">Today’s affirmation</p><p class="aff-big">“' + esc(aff.text) + '”</p>' +
      '<div class="row wrap"><button class="btn sm" data-act="affirm-say" data-id="' + aff.id + '">' + ic("check") + "I said it" + (day.affirmed ? " · " + day.affirmed : "") + '</button><a class="btn sm ghost" href="#/affirm">More affirmations</a></div></section>';

    var strip = '<div class="week-strip">' + [0, 1, 2, 3, 4, 5, 6].map(function (i) {
      var x = A.addDays(mon, i), xk = A.ymd(x), xd = A.peekDay(xk), n = xd ? A.practiceCount(xd) : 0;
      return '<a class="' + (xk === k ? "today on" : "") + '" href="' + A.hrefDay(x) + '">' + A.DOW[i].slice(0, 3) + "<b>" + x.getDate() + '</b><span class="wk-n">' + (n ? n + "/" + np : "·") + "</span></a>";
    }).join("") + "</div>";

    var grow = live.length ? '<ul class="list">' + live.slice(0, 4).map(function (m) {
      return '<li class="li hm-grow"><a class="li-text" href="#/manifest/' + m.id + '"><span>' + esc(m.title || "Untitled") + '</span><span class="small muted">alignment ' + m.align + "/10</span></a>" + A.bar(m.align / 10) + "</li>";
    }).join("") + '</ul><p class="small muted" style="margin:10px 0 0"><a href="#/manifest">See all manifestations</a></p>' :
      '<div class="empty">Nothing planted yet. <a href="#/manifest">Plant your first intention</a>.</div>';

    var sets = [["m", "Morning", "3×"], ["a", "Afternoon", "6×"], ["e", "Evening", "9×"]];
    var r369 = '<div class="hm-369">' + sets.map(function (s) {
      var on = !!day.r369[s[0]];
      return '<span class="hm-set' + (on ? " on" : "") + '"><b>' + s[2] + "</b>" + s[1] + (on ? " " + ic("check") : "") + "</span>";
    }).join("") + '</div><p class="small muted" style="margin:10px 0 0"><a href="#/rituals/369">Open 369</a> · <a href="#/rituals/555">55 × 5</a> · <a href="#/rituals/gratitude">Gratitude</a></p>';

    var pages = A.state.notebook.pages.slice().sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
    var last = pages[0];
    var nb = last ? '<a class="nb-peek" href="#/notebook"><b>' + esc(last.title || "Untitled") + '</b><span class="small muted">' + esc(String(last.text || "").replace(/\s+/g, " ").slice(0, 110)) + "</span></a>" :
      '<div class="empty">Your notebook is empty.</div>';

    var top3 = '<ul class="list top3">' + day.top3.map(function (x, i) {
      return '<li class="li' + (x.done ? " done" : "") + '"><span class="n">' + (i + 1) + "</span>" + A.input("days." + k + ".top3." + i + ".t", 'placeholder="An inspired step ' + (i + 1) + '"', "bare") + A.checkbox("days." + k + ".top3." + i + ".done") + "</li>";
    }).join("") + "</ul>";

    var dateTitle = t.toLocaleDateString(undefined, { weekday: "long" }) + ' <span class="soft">' + t.toLocaleDateString(undefined, { month: "long", day: "numeric" }) + "</span>";
    return banner + '<div class="home-top">' + A.head(hello, dateTitle, "", '<a class="btn" href="' + A.hrefDay(t) + '">' + ic("sparkle") + "Daily practice</a>") +
      '<div class="home-ring" aria-label="' + pc + " of " + np + ' practices done today">' + A.ring(pc / np, 84, pc + "/" + np, 8) + '<span class="small muted">practices today</span></div></div>' +
      kpis + gettingStarted() +
      '<div class="grid"><div class="c7 stack">' + affCard +
      A.card("Today’s practice", A.practiceChips(k), { icon: "sprout", tint: "lav" }) +
      A.card("Inspired actions", top3, { icon: "star", tone: "pink", sub: "Up to three small steps you feel pulled to take today." }) +
      A.card("This week", strip, { icon: "calendar" }) + '</div>' +
      '<div class="c5 stack">' +
      '<div class="card moon-chip"><span class="moon-art sm">' + (A.stickerSvg ? A.stickerSvg(ph.key) : "") + "</span><div><b>" + esc(ph.name) + '</b><div class="small muted">' + esc(ph.prompt) + '</div></div><a class="btn xs ghost" href="#/rituals/moon">Moon</a></div>' +
      A.card("Growing intentions", grow, { icon: "seed", tone: "mint" }) +
      A.card("Rituals today", r369, { icon: "infinity" }) +
      A.card("Notebook", nb + '<p class="small muted" style="margin:10px 0 0"><a href="#/notebook">Open notebook</a></p>', { icon: "notebook", tone: "sky" }) + "</div></div>";
  };

  /* ------------------------------------------------------------ sample planner */
  function loadSample() {
    var keep = A.look(), t = A.today(), i;
    A.images.clear();
    A.state = A.defaults();
    A.state.ui.look = keep; A.state.ui.sample = true;
    var S = A.state;
    var feel = ["calm, capable, open", "grateful and light", "focused and warm", "steady and kind", "curious", "joyful", "rested"];
    var thanks = [["My morning coffee in the sun", "A kind message from a friend", "Feeling well"], ["A walk after lunch", "Good music on the way home", "A tidy desk"], ["Fresh bread", "The quiet evening", "Learning something new"]];
    for (i = 0; i < 7; i++) {
      var dk = A.ymd(A.addDays(t, -i)), d = A.day(dk);
      var pr = A.PRACTICES.map(function (p) { return p[0]; });
      pr.forEach(function (key, j) { if (i === 0 ? j < 3 : (i + j) % 3 !== 1) d.practice[key] = true; });
      d.mood = [7, 8, 6, 7, 8, 9, 6][i]; d.energy = [3, 4, 3, 4, 4, 5, 3][i];
      d.intention = feel[i]; d.feeling = ["I am enough, just as I am.", "I am calm and capable.", "I am open to good things.", "", "", "", ""][i];
      d.gratitude = thanks[i % 3].slice(); d.affirmed = i === 0 ? 1 : 2;
      d.r369 = { m: true, a: i !== 0, e: i > 1 };
      d.top3[0] = { t: ["Write the first page of my script", "Take a long walk", "Plan the week", "Call a friend", "Tidy the desk", "Read for 20 minutes", "Rest"][i], done: i > 0 };
      d.top3[1] = { t: i === 0 ? "Send the proposal" : "", done: false };
      d.tasks = i === 0 ? [{ t: "Book the studio visit", done: false }, { t: "Water the plants", done: true }] : [];
    }
    function item(title, cat, status, align, why, evid, checks) {
      var m = A.newManifest({ title: title, category: cat });
      m.status = status; m.align = align; m.why = why; m.feeling = "Lighter, settled, quietly excited.";
      m.affirm = "I welcome this into my life with ease."; m.next = "Take one small step today.";
      m.target = A.ymd(A.addDays(t, 60)); m.checks = checks || [];
      m.evidence = (evid || []).map(function (e, j) { return { id: A.uid() + j, date: A.ymd(A.addDays(t, -2 - j * 3)), kind: e[0], text: e[1] }; });
      if (status === "manifested") m.doneDate = A.ymd(A.addDays(t, -5));
      return m;
    }
    item("A calm morning routine I love", "Health", "growing", 8, "I want my days to start gently.", [["win", "Kept it going five mornings in a row"], ["sign", "A friend recommended a book on slow mornings"]], [{ date: A.ymd(A.addDays(t, -3)), score: 7, note: "Feeling good about it" }, { date: A.ymd(A.addDays(t, -1)), score: 8, note: "" }]);
    item("A creative project I’m proud of", "Growth", "growing", 6, "Making things makes me feel alive.", [["step", "Booked a Saturday for the first draft"]], [{ date: A.ymd(A.addDays(t, -2)), score: 6, note: "" }]);
    item("A cosy home that feels like mine", "Home", "planted", 5, "I’d love a space that feels restful.", []);
    item("A weekend away with friends", "Joy", "manifested", 9, "Time together matters.", [["win", "The trip is booked"]], []);
    S.manifest.items.reverse();
    var sc = A.newScript("day", S.manifest.items[0].id, "calm morning");
    sc.text = "I wake up gently, sunlight on the quilt. I stretch, make tea and sit by the window. There is no rush. I feel rested and glad to be here.";
    for (i = 0; i < 4; i++) S.viz.sessions.push({ date: A.ymd(A.addDays(t, -i * 2)), mins: 5 + i, manifestId: S.manifest.items[0].id });
    var af = A.AFFIRMATIONS; S.affirm.favs = [af[0].id, af[8].id, af[16].id]; S.affirm.counts[af[0].id] = 6;
    S.rituals.r369.text = "I am calm, capable and open to good things.";
    S.rituals.signs.push({ id: A.uid(), date: A.ymd(A.addDays(t, -1)), text: "Saw the same song title three times in one day." });
    S.habits.forEach(function (h, j) { for (i = 0; i < 7; i++) if ((i + j) % 3 !== 2) { var lk = A.ymd(A.addDays(t, -i)); (S.habitLog[lk] = S.habitLog[lk] || {})[h.id] = true; } });
    var n = Date.now();
    S.notebook.pages.push({ id: A.uid(), section: "s-journal", title: "Sunday reset", paper: "lined", html: "<p>A slow morning. Tidied, planned the week, made soup. Feeling lighter already.</p>", text: "A slow morning. Tidied, planned the week, made soup. Feeling lighter already.",
      cornell: { topic: "", cue: "", notes: "", summary: "" }, cols: [{ h: "", t: "" }, { h: "", t: "" }, { h: "", t: "" }], strokes: [], objects: [], extra: 0, created: n, updated: n });
    S.notebook.current = S.notebook.pages[0].id;
    S.ui.backedUp = false;
    A.saveNow(); A.applyLook(); location.hash = "#/home"; A.render(); A.toast("Sample planner loaded. Look around!");
  }
  function startFresh() {
    var keep = A.look();
    A.images.clear();
    A.state = A.defaults(); A.state.ui.look = keep;
    A.saveNow(); A.applyLook(); location.hash = "#/home"; A.render(); A.toast("Fresh start ✨");
  }
  A.acts["load-sample"] = function () {
    if (STEPS.some(function (x) { return x[2](); }) && !confirm("The sample planner replaces what is in this planner right now. Export a backup first if you want to keep it. Continue?")) return;
    loadSample();
  };
  A.acts["start-fresh"] = function () { if (confirm("Clear the sample planner and start with an empty one?")) startFresh(); };
  A.acts["hide-start"] = function () { ui().onboardHidden = true; A.save(); A.render(); };
})();
