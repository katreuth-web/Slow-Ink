/* Aura — manifestations: the tracker, scripting studio and guided visualization.
   These are reflection and intention-setting tools. They don't promise outcomes. */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic;

  /* ------------------------------------------------------------ manifestation tracker */
  var STATUS = [["planted", "Planted", "seed", "pink"], ["growing", "Growing", "sprout", "mint"], ["manifested", "Manifested", "bloom", "butter"], ["released", "Released", "feather", "grey"]];
  var KINDS = { win: "Win", sign: "Sign", step: "Step" };
  function items() { return A.state.manifest.items; }
  function find(id) {
    var it = items(), i;
    for (i = 0; i < it.length; i++) if (it[i].id === id) return { m: it[i], i: i };
    return null;
  }
  function statusOf(s) { return STATUS.filter(function (x) { return x[0] === s; })[0] || STATUS[0]; }

  A.newManifest = function (f) {
    f = f || {};
    var m = {
      id: A.uid(), title: String(f.title || "").slice(0, 120), category: f.category || "", why: "", feeling: "", affirm: "", next: "", outcome: "",
      target: "", status: "planted", align: 5, checks: [], evidence: [], created: A.todayKey(), doneDate: ""
    };
    items().unshift(m);
    A.save();
    return m;
  };
  function daysLeft(m) {
    if (!m.target) return null;
    var t = A.parseD(m.target);
    return t ? Math.round((t - A.today()) / 864e5) : null;
  }
  function areaOptions(sel) {
    var names = A.state.wheel.areas.map(function (a) { return a.name; });
    if (sel && names.indexOf(sel) < 0) names.push(sel);
    return '<option value="">No category</option>' + names.map(function (n) { return '<option' + (n === sel ? " selected" : "") + ' value="' + esc(n) + '">' + esc(n) + "</option>"; }).join("");
  }

  function boardCard(m) {
    var st = statusOf(m.status), dl = daysLeft(m);
    return '<a class="mf-card" href="#/manifest/' + m.id + '"><b>' + esc(m.title || "Untitled") + "</b>" +
      '<span class="mf-meta">' + (m.category ? '<span class="chip">' + esc(m.category) + "</span>" : "") +
      (m.status === "manifested" || m.status === "released" ? "" : '<span class="small muted">' + (dl == null ? "" : dl < 0 ? "date passed" : dl === 0 ? "today" : dl + " days") + "</span>") + "</span>" +
      (m.status === "planted" || m.status === "growing" ? '<span class="mf-align-line" title="Alignment ' + m.align + '/10">' + A.bar(m.align / 10) + "</span>" : "") +
      '<span class="small muted">' + m.evidence.length + " sign" + (m.evidence.length === 1 ? "" : "s") + " &amp; wins</span></a>";
  }

  function boardView() {
    var it = items(), tally = {};
    STATUS.forEach(function (s) { tally[s[0]] = it.filter(function (m) { return m.status === s[0]; }).length; });
    var cols = STATUS.map(function (s) {
      var list = it.filter(function (m) { return m.status === s[0]; });
      return '<section class="mf-col"><h3><span class="ico ' + s[3] + '">' + ic(s[2]) + "</span>" + s[1] + '<span class="badge grey">' + list.length + "</span></h3>" +
        (list.length ? list.map(boardCard).join("") : '<p class="small muted mf-none">' + (s[0] === "planted" ? "New intentions start here." : s[0] === "growing" ? "Move one here when you start to see movement." : s[0] === "manifested" ? "Celebrate it here." : "Letting go is part of it too.") + "</p>") + "</section>";
    }).join("");
    var add = '<div class="row wrap mf-add"><input class="field grow" id="mf-new-title" maxlength="120" placeholder="What are you calling in?" data-enter="mf-add" />' +
      '<select class="field" id="mf-new-cat" aria-label="Category" style="max-width:190px">' + areaOptions("") + '</select><button class="btn" data-act="mf-add">' + ic("seed") + "Plant it</button></div>";
    return A.head("Manifest", 'My <span class="soft">Manifestations</span>', "Write down what you’re calling in, check in on how aligned it feels, and keep a record of the signs and wins along the way.") +
      A.card("Plant a new intention", add + '<p class="small muted" style="margin:10px 0 0">Tip: describe it in the present tense and keep it about how you want to live and feel.</p>', { icon: "seed", tint: "grad" }) +
      '<div class="stats mf-stats" style="margin:16px 0"><div class="inner stat"><b>' + tally.planted + "</b><span>planted</span></div><div class=\"inner stat\"><b>" + tally.growing + "</b><span>growing</span></div><div class=\"inner stat\"><b>" + tally.manifested + "</b><span>manifested</span></div><div class=\"inner stat\"><b>" + tally.released + "</b><span>released</span></div></div>" +
      (it.length ? "" : '<div class="tip" style="margin-bottom:16px">Not sure where to start? Think of one thing you’d love more of in your life, and plant it above. You can also turn a low score on your <a href="#/wheel">Level 10 Life</a> wheel into an intention.</div>') +
      '<div class="mf-board">' + cols + "</div>";
  }

  function sparkline(checks) {
    var pts = checks.slice(-20);
    if (pts.length < 2) return "";
    var w = 220, h = 54, step = w / (pts.length - 1);
    var path = pts.map(function (c, i) { return (i ? "L" : "M") + (i * step).toFixed(1) + " " + (h - 4 - (c.score - 1) / 9 * (h - 8)).toFixed(1); }).join(" ");
    var dots = pts.map(function (c, i) { return '<circle cx="' + (i * step).toFixed(1) + '" cy="' + (h - 4 - (c.score - 1) / 9 * (h - 8)).toFixed(1) + '" r="2.6"/>'; }).join("");
    return '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" role="img" aria-label="Alignment check-ins over time"><path d="' + path + '"/>' + dots + "</svg>";
  }

  function detailView(id) {
    var f = find(id);
    if (!f) { location.replace("#/manifest"); return ""; }
    var m = f.m, base = "manifest.items." + f.i, st = statusOf(m.status), dl = daysLeft(m);
    var seg = '<div class="seg mf-status" role="group" aria-label="Status">' + STATUS.map(function (s) {
      return '<button class="' + (m.status === s[0] ? "on" : "") + '" data-act="mf-status" data-id="' + m.id + '" data-v="' + s[0] + '" aria-pressed="' + (m.status === s[0]) + '">' + ic(s[2]) + s[1] + "</button>";
    }).join("") + "</div>";
    var alignWord = m.align >= 8 ? "settled and hopeful" : m.align >= 5 ? "mostly on track" : m.align >= 3 ? "wobbly, and that’s okay" : "far away right now";
    var checks = m.checks.slice().reverse().slice(0, 8).map(function (c) {
      return '<li class="li"><span class="badge grey">' + esc(A.fmtDay(A.parseD(c.date), { month: "short", day: "numeric" })) + '</span><span class="badge">' + c.score + "/10</span><span class=\"li-text\">" + esc(c.note || "") + "</span></li>";
    }).join("");
    var evid = m.evidence.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).map(function (e) {
      return '<li class="li"><span class="badge ' + (e.kind === "win" ? "mint" : e.kind === "sign" ? "pink" : "grey") + '">' + esc(KINDS[e.kind] || "Note") + '</span><span class="li-text">' + esc(e.text) + '<small class="muted"> · ' + esc(A.fmtDay(A.parseD(e.date), { month: "short", day: "numeric" })) + '</small></span><button class="x-btn" data-act="mf-ev-del" data-id="' + m.id + '" data-eid="' + e.id + '" aria-label="Delete">' + ic("trash") + "</button></li>";
    }).join("");
    var outcome = m.status === "manifested" || m.status === "released" ?
      A.card(m.status === "manifested" ? "It happened. Celebrate it." : "Letting it go", '<label class="lbl">' + (m.status === "manifested" ? "How did it show up, and what did I learn?" : "What did I learn, and what am I releasing?") + "</label>" + A.textarea(base + ".outcome", 'rows="4" placeholder="Write it down while it’s fresh…"', "lined"), { icon: m.status === "manifested" ? "bloom" : "feather", tint: "grad" }) : "";

    return '<div class="crumbs"><a href="#/manifest">My Manifestations</a><span>›</span><span>' + esc(m.title || "Untitled") + "</span></div>" +
      A.head("Manifestation", "", "", seg).replace('<h1 class="page-title"></h1>', '<h1 class="page-title">' + A.input(base + ".title", 'maxlength="120" placeholder="What I’m calling in"', "bare title-input") + "</h1>") +
      outcome + (outcome ? '<div style="height:16px"></div>' : "") +
      '<div class="grid">' +
      '<div class="c7 stack">' +
        A.card("The intention", '<div class="grid"><div class="c6"><label class="lbl">Category</label><select class="field" data-bind="' + base + '.category">' + areaOptions(m.category) + '</select></div>' +
          '<div class="c6"><label class="lbl">Target date (optional)</label><input class="field" type="date" data-bind="' + base + '.target" value="' + esc(m.target) + '" />' + (dl != null && m.status !== "manifested" && m.status !== "released" ? '<p class="small muted" style="margin:6px 0 0">' + (dl < 0 ? "That date has passed. You can move it or release it." : dl === 0 ? "That’s today." : dl + " days to go") + "</p>" : "") + "</div></div>" +
          '<label class="lbl">Why this matters to me</label>' + A.textarea(base + ".why", 'rows="3" placeholder="What will this give me or let me feel?"', "lined") +
          '<label class="lbl">How it will feel when it’s real</label>' + A.textarea(base + ".feeling", 'rows="2" placeholder="Describe the feeling, not just the thing…"', "lined") +
          '<label class="lbl">My affirmation for it</label>' + A.input(base + ".affirm", 'maxlength="140" placeholder="I am…"', "hand") +
          '<div class="row wrap" style="margin-top:8px"><button class="btn xs soft" data-act="mf-affirm-369" data-id="' + m.id + '">' + ic("infinity") + 'Use for 369</button><button class="btn xs soft" data-act="mf-affirm-add" data-id="' + m.id + '">' + ic("quote") + "Save to affirmations</button></div>", { icon: st[2], tone: st[3] }) +
        A.card("Next inspired step", A.input(base + ".next", 'maxlength="140" placeholder="One small thing I can do about this"') + '<div class="row" style="margin-top:8px;justify-content:flex-end"><button class="btn xs soft" data-act="mf-next-today" data-id="' + m.id + '">' + ic("star") + "Add to today’s actions</button></div>", { icon: "arrowR", tone: "mint" }) +
      "</div>" +
      '<div class="c5 stack">' +
        A.card("Does it feel on track?", '<p class="small muted" style="margin:0 0 8px">This is a gut check on how aligned and hopeful it feels. It isn’t a forecast. Check in whenever you like.</p>' +
          '<div class="align-row"><input type="range" min="1" max="10" step="1" class="range" data-bind="' + base + '.align" data-num data-live="mf-align-live" aria-label="Alignment from 1 to 10" value="' + m.align + '" /><b id="mf-align-n">' + m.align + '</b></div><p class="small" id="mf-align-word" style="margin:4px 0 10px">Feels ' + alignWord + ".</p>" +
          A.input("ui.mfNote", 'id="mf-check-note" maxlength="160" placeholder="Note for this check-in (optional)"') +
          '<div class="row" style="margin:8px 0 10px;justify-content:flex-end"><button class="btn sm" data-act="mf-checkin" data-id="' + m.id + '">' + ic("check") + "Check in</button></div>" +
          sparkline(m.checks) + (checks ? '<ul class="list" style="margin-top:8px">' + checks + "</ul>" : ""), { icon: "compass", tone: "sky" }) +
        A.card("Signs, wins &amp; steps", '<textarea class="ta" id="mf-ev-text" rows="2" maxlength="300" placeholder="What did I notice or do?"></textarea>' +
          '<div class="row wrap" style="margin:8px 0">' + Object.keys(KINDS).map(function (k) { return '<button class="btn xs soft" data-act="mf-ev-add" data-id="' + m.id + '" data-kind="' + k + '">' + ic("plus") + "Add " + KINDS[k].toLowerCase() + "</button>"; }).join("") + "</div>" +
          (evid ? '<ul class="list">' + evid + "</ul>" : '<div class="empty">Evidence collects here. Small things count.</div>'), { icon: "sparkle", tone: "pink" }) +
        A.card("Go deeper", '<div class="row wrap"><button class="btn sm soft" data-act="mf-script" data-id="' + m.id + '">' + ic("pen") + 'Write a script</button><button class="btn sm soft" data-act="mf-viz" data-id="' + m.id + '">' + ic("eye") + "Visualize it</button></div>", { icon: "lotus", tone: "butter" }) +
      "</div></div>" +
      '<div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn sm ghost danger" data-act="mf-delete" data-id="' + m.id + '">' + ic("trash") + "Delete this manifestation</button></div>";
  }

  A.views.manifest = function (id) { return id ? detailView(id) : boardView(); };

  A.acts["mf-add"] = function () {
    var inp = document.getElementById("mf-new-title"), t = inp.value.trim();
    if (!t) { inp.focus(); return; }
    var m = A.newManifest({ title: t, category: document.getElementById("mf-new-cat").value });
    location.hash = "#/manifest/" + m.id;
  };
  A.acts["mf-status"] = function (el) {
    var f = find(el.getAttribute("data-id"));
    if (!f) return;
    f.m.status = el.getAttribute("data-v");
    f.m.doneDate = f.m.status === "manifested" ? A.todayKey() : "";
    A.save(); A.render();
    if (f.m.status === "manifested") A.toast("Beautiful. Take a moment to celebrate.");
  };
  A.acts["mf-align-live"] = function (el) {
    var v = +el.value, n = document.getElementById("mf-align-n"), w = document.getElementById("mf-align-word");
    if (n) n.textContent = v;
    if (w) w.textContent = "Feels " + (v >= 8 ? "settled and hopeful" : v >= 5 ? "mostly on track" : v >= 3 ? "wobbly, and that’s okay" : "far away right now") + ".";
  };
  A.acts["mf-checkin"] = function (el) {
    var f = find(el.getAttribute("data-id")), note = document.getElementById("mf-check-note");
    if (!f) return;
    f.m.checks.push({ date: A.todayKey(), score: f.m.align, note: (note.value || "").trim().slice(0, 160) });
    A.state.ui.mfNote = ""; A.save(); A.toast("Checked in"); A.render();
  };
  A.acts["mf-ev-add"] = function (el) {
    var f = find(el.getAttribute("data-id")), ta = document.getElementById("mf-ev-text"), t = ta.value.trim();
    if (!f) return;
    if (!t) { ta.focus(); return; }
    f.m.evidence.push({ id: A.uid(), date: A.todayKey(), kind: el.getAttribute("data-kind"), text: t.slice(0, 300) });
    if (f.m.status === "planted") f.m.status = "growing";
    A.save(); A.render();
  };
  A.acts["mf-ev-del"] = function (el) {
    var f = find(el.getAttribute("data-id")), eid = el.getAttribute("data-eid");
    if (!f) return;
    f.m.evidence = f.m.evidence.filter(function (e) { return e.id !== eid; });
    A.save(); A.render();
  };
  A.acts["mf-affirm-369"] = function (el) {
    var f = find(el.getAttribute("data-id"));
    if (!f || !f.m.affirm.trim()) { A.toast("Write an affirmation first."); return; }
    A.state.rituals.r369.text = f.m.affirm.trim(); A.save(); A.toast("Set as your 369 affirmation");
  };
  A.acts["mf-affirm-add"] = function (el) {
    var f = find(el.getAttribute("data-id"));
    if (!f || !f.m.affirm.trim()) { A.toast("Write an affirmation first."); return; }
    var st = A.state.affirm, t = f.m.affirm.trim();
    if (!st.custom.some(function (c) { return c.text === t; })) st.custom.unshift({ id: A.uid(), text: t.slice(0, 140) });
    A.save(); A.toast("Saved to your affirmations");
  };
  A.acts["mf-next-today"] = function (el) {
    var f = find(el.getAttribute("data-id"));
    if (!f || !f.m.next.trim()) { A.toast("Write the next step first."); return; }
    var day = A.day(A.todayKey()), slot = day.top3.filter(function (t) { return !t.t; })[0];
    if (slot) slot.t = f.m.next.trim(); else A.addTask(A.todayKey(), f.m.next.trim());
    A.save(); A.toast("Added to today’s inspired actions");
  };
  A.acts["mf-delete"] = function (el) {
    var f = find(el.getAttribute("data-id"));
    if (!f || !window.confirm("Delete this manifestation and everything logged on it?")) return;
    items().splice(f.i, 1);
    A.state.scripts.forEach(function (s) { if (s.manifestId === f.m.id) s.manifestId = ""; });
    A.save(); location.hash = "#/manifest";
  };
  A.acts["mf-script"] = function (el) {
    var f = find(el.getAttribute("data-id"));
    if (!f) return;
    var s = A.newScript("thanks", f.m.id, f.m.title);
    location.hash = "#/script/" + s.id;
  };
  A.acts["mf-viz"] = function (el) { A.state.viz.focus = el.getAttribute("data-id"); A.save(); location.hash = "#/visualize"; };

  /* ------------------------------------------------------------ scripting studio */
  var TEMPLATES = [
    { id: "day", name: "A day in my future life", blurb: "Walk through a whole day as if it’s already yours.", start: "It’s a morning in my life, and I wake up feeling…\n\n" },
    { id: "thanks", name: "Thank-you letter", blurb: "Give thanks as if it has already happened.", start: "Thank you for…\n\nI’m so grateful that…\n" },
    { id: "future", name: "Letter from my future self", blurb: "Your future self writes back with encouragement.", start: "Dear me,\n\nI’m writing to you from a place where…\n" },
    { id: "feel", name: "How it feels", blurb: "Stay with the feeling, in the present tense.", start: "Now that this is real, I feel…\n\nI notice…\n" },
    { id: "free", name: "Free page", blurb: "Start from a blank page.", start: "" }
  ];
  var TIPS = ["Write in the present tense, as if it’s happening now.", "Use your senses: what do you see, hear, smell and touch?", "Say how you feel, not only what you have.", "Keep it believable to you. A stretch is good, a leap can feel hollow.", "Add the small, ordinary details. They make it real."];
  function tpl(id) { return TEMPLATES.filter(function (t) { return t.id === id; })[0] || TEMPLATES[TEMPLATES.length - 1]; }

  A.newScript = function (type, manifestId, title) {
    var t = tpl(type);
    var s = { id: A.uid(), title: (title ? t.name + ": " + title : t.name).slice(0, 80), type: t.id, text: t.start, manifestId: manifestId || "", date: A.todayKey(), updated: A.todayKey() };
    A.state.scripts.unshift(s);
    A.save();
    return s;
  };
  function sIdx(id) {
    for (var i = 0; i < A.state.scripts.length; i++) if (A.state.scripts[i].id === id) return i;
    return -1;
  }

  A.views.script = function (id) {
    var list = A.state.scripts.slice().sort(function (a, b) { return a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0; });
    var idx = id && id !== "new" ? sIdx(id) : -1;
    if (idx < 0 && id !== "new" && list.length) idx = sIdx(list[0].id);
    var s = idx >= 0 ? A.state.scripts[idx] : null;
    var picker = '<div class="tpl-grid">' + TEMPLATES.map(function (t) {
      return '<button class="tpl" data-act="script-new" data-t="' + t.id + '"><b>' + esc(t.name) + "</b><span>" + esc(t.blurb) + "</span></button>";
    }).join("") + "</div>";
    var side = list.length ? '<ul class="sc-list">' + list.map(function (x) {
      return '<li><a class="sc-item' + (s && x.id === s.id ? " on" : "") + '" href="#/script/' + x.id + '"><b>' + esc(x.title || "Untitled") + "</b><span class=\"small muted\">" + esc(A.fmtDay(A.parseD(x.updated), { month: "short", day: "numeric" })) + "</span></a></li>";
    }).join("") + "</ul>" : '<div class="empty">No scripts yet.</div>';
    var linkOpts = '<option value="">Not linked</option>' + items().map(function (m) { return '<option value="' + m.id + '"' + (s && s.manifestId === m.id ? " selected" : "") + ">" + esc(m.title || "Untitled") + "</option>"; }).join("");
    var editor = s ? A.card("", '<div class="row wrap" style="margin-bottom:10px">' + A.input("scripts." + idx + ".title", 'maxlength="80" placeholder="Title"', "bare grow title-input") +
      '<select class="field" style="max-width:220px" data-bind="scripts.' + idx + '.manifestId" aria-label="Linked manifestation">' + linkOpts + "</select></div>" +
      '<textarea class="ta lined script-ta" data-bind="scripts.' + idx + '.text" data-live="script-live" data-id="' + s.id + '" rows="18" placeholder="Start writing…">' + esc(s.text) + "</textarea>" +
      '<div class="row wrap" style="justify-content:space-between;margin-top:10px"><span class="small muted" id="sc-count">' + wc(s.text) + ' words</span><span class="row"><button class="btn xs soft" data-act="script-copy" data-id="' + s.id + '">' + ic("copy") + "Copy</button><button class=\"btn xs ghost danger\" data-act=\"script-del\" data-id=\"" + s.id + '">' + ic("trash") + "Delete</button></span></div>") : A.card("Choose a way to begin", picker, { icon: "pen", tint: "grad" });
    return A.head("Manifest", 'Script<span class="soft">ing</span>', "Write the life you’re calling in, in the present tense, as if it’s already here. It’s a way to rehearse the feeling and get clear on what you want.",
      '<button class="btn" data-act="script-pick">' + ic("plus") + "New script</button>") +
      '<div class="sc-layout"><aside class="card sc-side"><h2 class="card-title" style="margin-bottom:8px">Your scripts</h2>' + side + "</aside><div class=\"stack\">" + editor +
      (s ? A.card("Writing tips", '<ul class="list">' + TIPS.map(function (t) { return '<li class="li"><span class="li-text">' + esc(t) + "</span></li>"; }).join("") + "</ul>", { icon: "sparkle", tone: "butter" }) : "") + "</div></div>";
  };
  function wc(t) { var m = String(t || "").trim().match(/\S+/g); return m ? m.length : 0; }
  A.acts["script-live"] = function (el) {
    var s = A.state.scripts[sIdx(el.getAttribute("data-id"))];
    if (!s) return;
    s.updated = A.todayKey();
    var c = document.getElementById("sc-count");
    if (c) c.textContent = wc(s.text) + " words";
    if (wc(s.text) >= 20) A.markPractice(A.todayKey(), "script");
  };
  A.acts["script-pick"] = function () { location.hash = "#/script/new"; };
  A.acts["script-new"] = function (el) {
    var s = A.newScript(el.getAttribute("data-t"));
    location.hash = "#/script/" + s.id;
  };
  A.acts["script-del"] = function (el) {
    var i = sIdx(el.getAttribute("data-id"));
    if (i < 0 || !window.confirm("Delete this script?")) return;
    A.state.scripts.splice(i, 1); A.save(); location.hash = "#/script";
    A.render();
  };
  A.acts["script-copy"] = function (el) {
    var s = A.state.scripts[sIdx(el.getAttribute("data-id"))];
    if (!s) return;
    var done = function () { A.toast("Copied"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s.text).then(done, function () { A.toast("Couldn’t copy. Select the text instead."); });
    else A.toast("Couldn’t copy. Select the text instead.");
  };

  /* ------------------------------------------------------------ guided visualization */
  var PROMPTS = [
    "Settle in. Let your shoulders drop. Breathe in slowly, and out.",
    "Picture the scene you’re calling in. Where are you? What can you see around you?",
    "Add detail. What do you hear? What does the air feel like on your skin?",
    "Notice who is with you, and what they might be saying.",
    "Feel it in your body. Let the feeling of “it’s already here” grow.",
    "Quietly say: “Thank you. This feels like me.”",
    "Slowly come back. Wiggle your fingers and take one more full breath."
  ];
  var vz = { phase: "idle", end: 0, total: 0, iv: null, ctx: null };
  var actx = null;

  function chime() {
    if (!A.state.viz.sound) return;
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      actx = actx || new C();
      var t = actx.currentTime;
      [523.25, 659.25, 783.99].forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.3);
        g.gain.exponentialRampToValueAtTime(0.1, t + i * 0.3 + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.3 + 2.2);
        o.connect(g); g.connect(actx.destination);
        o.start(t + i * 0.3); o.stop(t + i * 0.3 + 2.3);
      });
    } catch (e) { /* sound is optional */ }
  }
  function vzStreak() {
    var days = {};
    A.state.viz.sessions.forEach(function (s) { days[s.date] = 1; });
    var d = A.today(), n = 0;
    if (!days[A.ymd(d)]) d = A.addDays(d, -1);
    while (days[A.ymd(d)]) { n++; d = A.addDays(d, -1); }
    return n;
  }
  function fmtT(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + A.pad(s % 60); }

  A.views.visualize = function () {
    var v = A.state.viz, mins = v.minutes || 5, focusId = v.focus || "";
    var mf = find(focusId);
    if (vz.phase === "running") {
      A.afterRender = startTicking;
      return '<div class="vz-stage" role="region" aria-label="Guided visualization">' +
        '<p class="eyebrow">' + (mf ? esc(mf.m.title) : "Free visualization") + '</p><div class="vz-orb" id="vz-orb" aria-hidden="true"><span id="vz-breath">Breathe in</span></div>' +
        '<p class="vz-prompt" id="vz-prompt" aria-live="polite">' + esc(PROMPTS[0]) + '</p><div class="vz-time"><b id="vz-time">' + fmtT(vz.total) + '</b>' + A.bar(0).replace('<i ', '<i id="vz-bar" ') + "</div>" +
        '<button class="btn ghost" data-act="vz-stop">End early</button></div>';
    }
    if (vz.phase === "done") {
      var last = v.sessions[v.sessions.length - 1], li = v.sessions.length - 1;
      return '<div class="vz-stage done"><span class="ico lav big">' + ic("lotus") + "</span><h1 class=\"page-title\">Lovely.</h1><p class=\"page-sub\">You spent " + (last ? last.mins : mins) + " minutes with your vision.</p>" +
        '<div class="card" style="text-align:left;max-width:520px;margin:16px auto"><label class="lbl">How did that feel? Anything you noticed?</label>' + A.textarea("viz.sessions." + li + ".note", 'rows="3" placeholder="Optional. A word, an image, a feeling…"', "lined") + "</div>" +
        '<div class="row wrap" style="justify-content:center"><button class="btn" data-act="vz-reset">Done</button>' + (mf ? '<a class="btn ghost" href="#/manifest/' + mf.m.id + '">Back to my manifestation</a>' : "") + "</div></div>";
    }
    var week = 0, from = A.ymd(A.addDays(A.today(), -6));
    v.sessions.forEach(function (s) { if (s.date >= from) week += s.mins; });
    var recent = v.sessions.slice(-6).reverse().map(function (s) {
      var m = find(s.manifestId);
      return '<li class="li"><span class="badge grey">' + esc(A.fmtDay(A.parseD(s.date), { month: "short", day: "numeric" })) + '</span><span class="li-text">' + s.mins + " min" + (m ? " · " + esc(m.m.title) : "") + (s.note ? "<br><small class=\"muted\">" + esc(s.note) + "</small>" : "") + "</span></li>";
    }).join("");
    var opts = '<option value="">Free visualization</option>' + items().filter(function (m) { return m.status !== "released" && m.status !== "manifested"; }).map(function (m) { return '<option value="' + m.id + '"' + (m.id === focusId ? " selected" : "") + ">" + esc(m.title || "Untitled") + "</option>"; }).join("");
    return A.head("Manifest", 'Visuali<span class="soft">ze</span>', "A few quiet minutes to picture what you’re calling in and feel what it’s like to already have it. Sit comfortably, and let the prompts guide you.") +
      '<div class="grid"><div class="c7 stack">' +
      A.card("Begin a session", '<label class="lbl">Length</label><div class="seg" role="group">' + [3, 5, 10].map(function (n) { return '<button class="' + (mins === n ? "on" : "") + '" data-act="vz-mins" data-v="' + n + '" aria-pressed="' + (mins === n) + '">' + n + " min</button>"; }).join("") + "</div>" +
        '<label class="lbl">Focus on</label><select class="field" data-bind="viz.focus" aria-label="What to visualize">' + opts + "</select>" +
        '<label class="check-pill" style="margin-top:12px">' + A.checkbox("viz.sound") + "Soft chime at the start and end</label>" +
        '<div class="row" style="margin-top:14px"><button class="btn lg" data-act="vz-start">' + ic("play") + "Begin</button></div>", { icon: "eye", tint: "grad" }) +
      A.card("Before you start", '<ul class="list"><li class="li"><span class="li-text">Find somewhere you won’t be interrupted.</span></li><li class="li"><span class="li-text">Close your eyes if you like. The prompts change every minute or so.</span></li><li class="li"><span class="li-text">It’s an imagination practice. It works best alongside the real steps you take.</span></li></ul>', { icon: "lotus", tone: "butter" }) +
      "</div><div class=\"c5 stack\">" +
      A.card("Your practice", '<div class="stats"><div class="inner stat"><b>' + vzStreak() + "</b><span>day streak</span></div><div class=\"inner stat\"><b>" + v.sessions.length + "</b><span>sessions</span></div><div class=\"inner stat\"><b>" + week + "</b><span>min this week</span></div></div>" +
        (recent ? '<ul class="list" style="margin-top:10px">' + recent + "</ul>" : ""), { icon: "calendar", tone: "pink" }) +
      A.card("Your vision board", '<p class="small muted" style="margin:0 0 10px">Open your board first and let the images set the scene.</p><a class="btn sm soft" href="#/vision">' + ic("image") + "Open vision board</a>", { icon: "image", tone: "mint" }) +
      "</div></div>";
  };

  function startTicking() {
    clearInterval(vz.iv);
    var promptIdx = -1;
    function tick() {
      var left = (vz.end - Date.now()) / 1000, el = document.getElementById("vz-time");
      if (!el) { clearInterval(vz.iv); return; }
      if (left <= 0) { finish(true); return; }
      var elapsed = vz.total - left, f = elapsed / vz.total;
      el.textContent = fmtT(left);
      var bar = document.getElementById("vz-bar");
      if (bar) bar.style.width = (f * 100).toFixed(1) + "%";
      var i = Math.min(PROMPTS.length - 1, Math.floor(f * PROMPTS.length));
      if (i !== promptIdx) { promptIdx = i; document.getElementById("vz-prompt").textContent = PROMPTS[i]; }
      var b = document.getElementById("vz-breath");
      if (b) b.textContent = Math.floor(elapsed / 4) % 2 === 0 ? "Breathe in" : "Breathe out";
      var orb = document.getElementById("vz-orb");
      if (orb) orb.classList.toggle("out", Math.floor(elapsed / 4) % 2 === 1);
    }
    tick();
    vz.iv = setInterval(tick, 250);
    A.cleanup = function () { clearInterval(vz.iv); if (vz.phase === "running") vz.phase = "idle"; };
  }
  function finish(complete) {
    clearInterval(vz.iv);
    if (complete) {
      var v = A.state.viz;
      v.sessions.push({ date: A.todayKey(), mins: Math.round(vz.total / 60), manifestId: v.focus || "", note: "" });
      if (v.sessions.length > 400) v.sessions.splice(0, v.sessions.length - 400);
      A.markPractice(A.todayKey(), "visualize");
      A.save();
      chime();
      vz.phase = "done";
    } else vz.phase = "idle";
    A.cleanup = null;
    A.render();
  }
  A.acts["vz-mins"] = function (el) { A.state.viz.minutes = +el.getAttribute("data-v"); A.save(); A.render(); };
  A.acts["vz-start"] = function () {
    var v = A.state.viz;
    vz.total = (v.minutes || 5) * 60; vz.end = Date.now() + vz.total * 1000; vz.phase = "running";
    chime();
    A.render();
  };
  A.acts["vz-stop"] = function () { finish(false); };
  A.acts["vz-reset"] = function () { vz.phase = "idle"; A.render(); };
})();
