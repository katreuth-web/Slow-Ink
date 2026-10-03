/* Aura — daily practices: affirmations, rituals (369 method, 55×5, gratitude, signs) and the moon.
   These are reflection and intention-setting tools. Nothing here promises a result. */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic;

  /* ------------------------------------------------------------ the day's practice checklist */
  A.PRACTICES = [
    ["gratitude", "Gratitude", "heart"], ["affirm", "Affirmations", "quote"], ["visualize", "Visualization", "eye"],
    ["script", "Scripting", "pen"], ["r369", "369 method", "infinity"], ["actAsIf", "Act as if", "bolt"], ["journal", "Journaling", "book"]
  ];
  A.practiceCount = function (day) { return A.PRACTICES.filter(function (p) { return day.practice[p[0]]; }).length; };
  /* Doing an activity ticks its practice for the day (it never un-ticks). */
  A.markPractice = function (k, key) {
    var d = A.day(k);
    if (!d.practice[key]) { d.practice[key] = true; A.save(); refreshPractice(k); }
  };
  function refreshPractice(k) {
    var d = A.peekDay(k);
    if (!d) return;
    Array.prototype.forEach.call(document.querySelectorAll('.pr-chip[data-k="' + k + '"]'), function (el) {
      var on = !!d.practice[el.getAttribute("data-p")];
      el.classList.toggle("on", on); el.setAttribute("aria-pressed", String(on));
    });
    var n = document.getElementById("pr-count");
    if (n) n.textContent = A.practiceCount(d) + "/" + A.PRACTICES.length;
  }
  A.acts["practice-toggle"] = function (el) {
    var k = el.getAttribute("data-k"), p = el.getAttribute("data-p"), d = A.day(k);
    d.practice[p] = !d.practice[p];
    A.save(); refreshPractice(k);
  };
  A.practiceChips = function (k) {
    var d = A.day(k);
    return '<div class="checks">' + A.PRACTICES.map(function (p) {
      return '<button class="check-pill pr-chip' + (d.practice[p[0]] ? " on" : "") + '" data-act="practice-toggle" data-k="' + k + '" data-p="' + p[0] + '" aria-pressed="' + !!d.practice[p[0]] + '">' + ic(p[2]) + esc(p[1]) + "</button>";
    }).join("") + "</div>";
  };

  /* ------------------------------------------------------------ affirmations */
  var CATS = [["abundance", "Abundance"], ["love", "Love"], ["health", "Health"], ["confidence", "Confidence"], ["peace", "Peace"], ["purpose", "Purpose"], ["gratitude", "Gratitude"]];
  var RAW = {
    abundance: ["I am open to receiving good things in many forms.", "I am becoming someone who handles money with confidence and care.", "There is enough for me, and I notice it everywhere.", "I welcome opportunities that fit who I am becoming.", "I give and receive generously.", "My work is valued, and I value myself.", "I choose to see abundance in my day today."],
    love: ["I am worthy of deep, steady love.", "I invite relationships that feel safe, kind and honest.", "I love myself as I am, and I keep growing.", "My heart is open, and I trust it.", "I give love freely and receive it gladly.", "I deserve to be treated with respect.", "Love is already all around me."],
    health: ["My body is wise, and I treat it with care.", "I choose food, movement and rest that make me feel good.", "Every breath fills me with calm energy.", "I listen to what my body needs today.", "I am grateful for all my body does for me.", "I am getting stronger, one gentle day at a time.", "Rest is part of how I heal and grow."],
    confidence: ["I trust myself to figure it out.", "I am capable of more than I think.", "My voice matters, and I use it kindly.", "I take up space without apology.", "I am proud of how far I have come.", "Mistakes help me learn; they don’t define me.", "I act with courage, even when I feel unsure."],
    peace: ["I breathe in calm and breathe out tension.", "This moment is enough.", "I let go of what I cannot control.", "I choose peace over worry today.", "My mind is quiet and my heart is steady.", "I release the need to rush.", "I am safe, and I am supported."],
    purpose: ["I am becoming the person I want to be.", "My life has meaning, and I am finding my path.", "I take one inspired step today.", "My dreams are worth working for.", "I follow what lights me up.", "I trust the timing of my life.", "What I am calling in is also calling me."],
    gratitude: ["Thank you for this day and all that it holds.", "I notice small joys and let them multiply.", "I am grateful for what I have and open to what is coming.", "Gratitude turns what I have into enough.", "I appreciate the people who make my life brighter.", "I give thanks for how far I’ve come.", "Everything I need to take the next step is here."]
  };
  var LIB = [], n = 0;
  CATS.forEach(function (c) { RAW[c[0]].forEach(function (t) { n++; LIB.push({ id: "af" + (n < 10 ? "0" : "") + n, cat: c[0], text: t }); }); });
  A.AFFIRMATIONS = LIB;

  function allAffirmations() {
    var st = A.state.affirm;
    return LIB.concat((st.custom || []).map(function (c) { return { id: c.id, cat: "mine", text: c.text, custom: true }; }));
  }
  /* The affirmation shown for a day: rotates through your favourites and your own, else the library. */
  A.affirmOfDay = function (d) {
    var st = A.state.affirm, all = allAffirmations();
    var pool = all.filter(function (a) { return st.favs.indexOf(a.id) >= 0 || a.custom; });
    if (!pool.length) pool = LIB;
    var doy = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(d.getFullYear(), 0, 0)) / 864e5);
    return pool[doy % pool.length];
  };

  A.views.affirm = function () {
    var st = A.state.affirm, tk = A.todayKey(), day = A.day(tk), today = A.affirmOfDay(A.today());
    var cat = st.cat || "all", all = allAffirmations();
    var chips = [["all", "All"]].concat(CATS).concat([["favs", "Favourites"], ["mine", "My own"]]).map(function (c) {
      return '<button class="chip' + (cat === c[0] ? " pink" : "") + '" style="border:0;cursor:pointer" data-act="affirm-cat" data-v="' + c[0] + '">' + esc(c[1]) + "</button>";
    }).join("");
    var list = all.filter(function (a) {
      return cat === "all" || (cat === "favs" ? st.favs.indexOf(a.id) >= 0 : a.cat === cat);
    });
    var cards = list.map(function (a) {
      var fav = st.favs.indexOf(a.id) >= 0, cnt = st.counts[a.id] || 0;
      return '<div class="c4"><div class="card aff-card"><p class="aff-text">' + esc(a.text) + '</p><div class="row" style="justify-content:space-between;margin-top:10px">' +
        '<span class="small muted">' + (cnt ? "said " + cnt + "×" : (a.custom ? "your own" : "")) + "</span><span class=\"row\" style=\"gap:4px\">" +
        '<button class="icon-btn sm' + (fav ? " fav-on" : "") + '" data-act="affirm-fav" data-id="' + a.id + '" aria-pressed="' + fav + '" aria-label="' + (fav ? "Remove from favourites" : "Add to favourites") + '" title="Favourite">' + ic("heart") + "</button>" +
        '<button class="btn xs soft" data-act="affirm-say" data-id="' + a.id + '">' + ic("check") + "I said it</button>" +
        (a.custom ? '<button class="x-btn" data-act="affirm-del" data-id="' + a.id + '" aria-label="Delete">' + ic("trash") + "</button>" : "") + "</span></div></div></div>";
    }).join("");
    return A.head("Manifest", 'Affirm<span class="soft">ations</span>', "Short, present-tense statements you can say out loud, write down or carry through the day. Favourite the ones that feel true and good to you.") +
      '<div class="grid" style="margin-bottom:16px">' +
      '<div class="c8">' + A.card("Today’s affirmation", '<p class="aff-big">“' + esc(today.text) + '”</p><div class="row wrap" style="margin-top:12px"><button class="btn" data-act="affirm-say" data-id="' + today.id + '">' + ic("check") + "I said it</button>" +
        '<span class="badge">' + day.affirmed + " today</span><span class=\"small muted\">Say it aloud, slowly, and notice how it feels.</span></div>", { icon: "quote", tint: "grad" }) + "</div>" +
      '<div class="c4">' + A.card("Add your own", '<input class="field" id="aff-new" maxlength="140" placeholder="I am…" data-enter="affirm-add" /><div class="row" style="margin-top:8px;justify-content:flex-end"><button class="btn sm" data-act="affirm-add">' + ic("plus") + "Add</button></div>" +
        '<p class="small muted" style="margin:8px 0 0">Tip: keep it positive and in the present tense.</p>', { icon: "pen", tone: "pink" }) + "</div></div>" +
      '<div class="chips" style="margin-bottom:14px">' + chips + "</div>" +
      (cards ? '<div class="grid">' + cards + "</div>" : A.card("", '<div class="empty">' + (cat === "favs" ? "No favourites yet. Tap the heart on any affirmation." : "Nothing here yet.") + "</div>"));
  };
  A.acts["affirm-cat"] = function (el) { A.state.affirm.cat = el.getAttribute("data-v"); A.save(); A.render(); };
  A.acts["affirm-fav"] = function (el) {
    var f = A.state.affirm.favs, id = el.getAttribute("data-id"), i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    A.save(); A.render();
  };
  A.acts["affirm-say"] = function (el) {
    var st = A.state.affirm, id = el.getAttribute("data-id"), d = A.day(A.todayKey());
    st.counts[id] = (st.counts[id] || 0) + 1; d.affirmed++;
    d.practice.affirm = true; A.save(); A.render();
  };
  A.acts["affirm-add"] = function () {
    var inp = document.getElementById("aff-new"), t = inp.value.trim();
    if (!t) { inp.focus(); return; }
    A.state.affirm.custom.unshift({ id: A.uid(), text: t.slice(0, 140) });
    A.state.affirm.cat = "mine"; A.save(); A.render();
  };
  A.acts["affirm-del"] = function (el) {
    var id = el.getAttribute("data-id"), st = A.state.affirm;
    st.custom = st.custom.filter(function (c) { return c.id !== id; });
    st.favs = st.favs.filter(function (x) { return x !== id; }); delete st.counts[id];
    A.save(); A.render();
  };

  /* ------------------------------------------------------------ rituals */
  var TABS = [["369", "369 method"], ["555", "55 × 5"], ["gratitude", "Gratitude"], ["signs", "Signs"], ["moon", "Moon"]];
  function intro(title, body) { return '<p class="small muted" style="margin:0 0 12px"><b>' + title + "</b> " + body + "</p>"; }

  function r369Count(k) { var d = A.peekDay(k); return d ? (d.r369.m ? 1 : 0) + (d.r369.a ? 1 : 0) + (d.r369.e ? 1 : 0) : 0; }
  function r369Streak() {
    var d = A.today(), n = 0;
    if (r369Count(A.ymd(d)) < 3) d = A.addDays(d, -1);
    while (r369Count(A.ymd(d)) === 3) { n++; d = A.addDays(d, -1); }
    return n;
  }
  function tab369() {
    var tk = A.todayKey(), day = A.day(tk), r = A.state.rituals.r369;
    var sets = [["m", "Morning", "Write it 3 times", "3"], ["a", "Afternoon", "Write it 6 times", "6"], ["e", "Evening", "Write it 9 times", "9"]];
    var today = '<div class="r369-today">' + sets.map(function (s) {
      var on = !!day.r369[s[0]];
      return '<button class="r369-set' + (on ? " on" : "") + '" data-act="r369-toggle" data-p="' + s[0] + '" aria-pressed="' + on + '"><b>' + s[3] + "×</b><span>" + s[1] + '</span><small>' + (on ? "Done" : s[2]) + "</small></button>";
    }).join("") + "</div>";
    var cells = "", start = A.addDays(A.today(), -34);
    for (var i = 0; i < 35; i++) {
      var d = A.addDays(start, i), k = A.ymd(d), c = r369Count(k);
      cells += '<span class="heat h' + c + (k === tk ? " today" : "") + '" title="' + esc(A.fmtDay(d, { month: "short", day: "numeric" })) + ": " + c + ' of 3"></span>';
    }
    var full = 0;
    Object.keys(A.state.days).forEach(function (k) { if (r369Count(k) === 3) full++; });
    return '<div class="grid">' +
      '<div class="c7">' + A.card("Today’s 369", intro("How it works:", "write one affirmation 3 times in the morning, 6 in the afternoon and 9 in the evening. Tick each set when you’ve done it.") +
        '<label class="lbl">My 369 affirmation</label>' + A.input("rituals.r369.text", 'maxlength="140" placeholder="e.g. I am calm, capable and open to good things."', "hand") + today +
        (r.text ? '<p class="aff-big" style="margin-top:14px;font-size:18px">“' + esc(r.text) + "”</p>" : ""), { icon: "infinity", tint: "grad" }) + "</div>" +
      '<div class="c5">' + A.card("Your rhythm", '<div class="stats" style="margin-bottom:12px"><div class="inner stat"><b>' + r369Streak() + "</b><span>day streak</span></div><div class=\"inner stat\"><b>" + full + "</b><span>complete days</span></div></div>" +
        '<div class="heat-grid" aria-label="Last 35 days">' + cells + '</div><p class="small muted" style="margin:8px 0 0">Darker means more sets done that day.</p>', { icon: "calendar", tone: "pink" }) + "</div></div>";
  }
  A.acts["r369-toggle"] = function (el) {
    var tk = A.todayKey(), d = A.day(tk), p = el.getAttribute("data-p");
    d.r369[p] = !d.r369[p];
    if (d.r369.m && d.r369.a && d.r369.e) d.practice.r369 = true;
    A.save(); A.render();
  };

  function tab555() {
    var r = A.state.rituals.r555, tk = A.todayKey(), start = r.start ? A.parseD(r.start) : null, days = [];
    for (var i = 0; i < 5; i++) if (start) days.push(A.addDays(start, i));
    var done = days.filter(function (d) { return r.days[A.ymd(d)]; }).length;
    var chips = days.length ? '<div class="r555-days">' + days.map(function (d, i) {
      var k = A.ymd(d), on = !!r.days[k], future = k > tk;
      return '<button class="r555-day' + (on ? " on" : "") + (k === tk ? " today" : "") + '" data-act="r555-toggle" data-k="' + k + '"' + (future ? " disabled" : "") + ' aria-pressed="' + on + '"><small>Day ' + (i + 1) + "</small><b>" + d.getDate() + "</b><span>" + (on ? "Done" : "55×") + "</span></button>";
    }).join("") + "</div>" : '<div class="empty">Write your affirmation, then begin. Day 1 is today.</div>';
    return '<div class="grid">' +
      '<div class="c7">' + A.card("55 × 5", intro("How it works:", "write one affirmation 55 times a day for 5 days in a row, then notice how the words land. Tick each day when you’ve finished.") +
        '<label class="lbl">My affirmation</label>' + A.input("rituals.r555.text", 'maxlength="140" placeholder="e.g. I am confident and at ease."', "hand") +
        '<div class="row wrap" style="margin:12px 0"><button class="btn" data-act="r555-start">' + ic("play") + (start ? "Start again today" : "Begin today") + "</button>" +
        (start ? '<span class="badge">' + done + " of 5 days</span>" : "") + "</div>" + chips +
        (done === 5 ? '<div class="tip" style="margin-top:12px">You completed all five days. Take a moment to notice what has shifted.</div>' : "") + A.bar(done / 5), { icon: "star", tint: "grad" }) + "</div>" +
      '<div class="c5">' + A.card("Tips", '<ul class="list"><li class="li"><span class="li-text">Write by hand if you can. It slows you down.</span></li><li class="li"><span class="li-text">Say each line quietly as you write it.</span></li><li class="li"><span class="li-text">Pick one affirmation that feels believable to you.</span></li><li class="li"><span class="li-text">Missed a day? Start again. There’s no pressure.</span></li></ul>', { icon: "sparkle", tone: "pink" }) + "</div></div>";
  }
  A.acts["r555-start"] = function () {
    var r = A.state.rituals.r555;
    r.start = A.todayKey(); r.days = {}; A.save(); A.render();
  };
  A.acts["r555-toggle"] = function (el) {
    var r = A.state.rituals.r555, k = el.getAttribute("data-k");
    if (r.days[k]) delete r.days[k]; else r.days[k] = true;
    A.save(); A.render();
  };

  function tabGratitude() {
    var tk = A.todayKey(), day = A.day(tk), entries = [], total = 0;
    Object.keys(A.state.days).sort().reverse().forEach(function (k) {
      var d = A.peekDay(k), items = d.gratitude.filter(Boolean);
      total += items.length;
      if (items.length && k !== tk && entries.length < 40) items.forEach(function (t) { entries.push([k, t]); });
    });
    var inputs = [0, 1, 2].map(function (i) {
      return '<div class="row" style="margin-bottom:8px"><span class="badge pink">' + (i + 1) + "</span>" + A.input("days." + tk + ".gratitude." + i, 'placeholder="I’m grateful for…" data-live="gratitude-live"', "grow") + "</div>";
    }).join("");
    return '<div class="grid">' +
      '<div class="c6">' + A.card("Today’s gratitude", intro("Try this:", "name three things, then feel the thanks in your body for a few breaths. Small and specific works best.") + inputs, { icon: "heart", tint: "pink" }) + "</div>" +
      '<div class="c6">' + A.card("Gratitude jar", '<p class="small muted" style="margin:0 0 10px">' + total + " thank-yous so far.</p>" + (entries.length ? '<ul class="list">' + entries.slice(0, 14).map(function (e) {
        return '<li class="li"><span class="badge grey">' + esc(A.fmtDay(A.parseD(e[0]), { month: "short", day: "numeric" })) + '</span><span class="li-text">' + esc(e[1]) + "</span></li>";
      }).join("") + "</ul>" : '<div class="empty">Past entries collect here.</div>'), { icon: "star", tone: "butter" }) + "</div></div>";
  }
  A.acts["gratitude-live"] = function () { A.markPractice(A.todayKey(), "gratitude"); };

  function tabSigns() {
    var signs = A.state.rituals.signs.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    var items = A.state.manifest.items.filter(function (m) { return m.status !== "released"; });
    var opts = '<option value="">Not linked to a manifestation</option>' + items.map(function (m) { return '<option value="' + m.id + '">' + esc(m.title || "Untitled") + "</option>"; }).join("");
    var lastMonth = "", list = signs.map(function (s) {
      var mk = s.date.slice(0, 7), head = mk !== lastMonth ? '<p class="lbl" style="margin-top:12px">' + esc(A.MONTHS[+mk.slice(5) - 1] + " " + mk.slice(0, 4)) + "</p>" : "";
      lastMonth = mk;
      return head + '<div class="li"><span class="badge grey">' + esc(A.fmtDay(A.parseD(s.date), { month: "short", day: "numeric" })) + '</span><span class="li-text">' + esc(s.text) + '</span><button class="x-btn" data-act="sign-del" data-id="' + s.id + '" aria-label="Delete">' + ic("trash") + "</button></div>";
    }).join("");
    return '<div class="grid">' +
      '<div class="c5">' + A.card("Log a sign", intro("Signs and synchronicities:", "repeating numbers, a song at the right moment, an unexpected message. Write down what you noticed. It doesn’t have to mean anything to be worth noticing.") +
        '<textarea class="ta" id="sign-new" rows="3" maxlength="300" placeholder="Today I noticed…"></textarea><label class="lbl">Link it</label><select class="field" id="sign-link">' + opts + '</select>' +
        '<div class="row" style="margin-top:10px;justify-content:flex-end"><button class="btn" data-act="sign-add">' + ic("plus") + "Add sign</button></div>", { icon: "sparkle", tint: "grad" }) + "</div>" +
      '<div class="c7">' + A.card("Your signs", list || '<div class="empty">Nothing logged yet.</div>', { icon: "eye", tone: "pink", tools: '<span class="badge">' + signs.length + "</span>" }) + "</div></div>";
  }
  A.acts["sign-add"] = function () {
    var t = document.getElementById("sign-new").value.trim(), link = document.getElementById("sign-link").value;
    if (!t) { document.getElementById("sign-new").focus(); return; }
    var k = A.todayKey();
    A.state.rituals.signs.push({ id: A.uid(), date: k, text: t });
    var m = link && A.state.manifest.items.filter(function (x) { return x.id === link; })[0];
    if (m) m.evidence.push({ id: A.uid(), date: k, kind: "sign", text: t });
    A.save(); A.toast("Sign logged"); A.render();
  };
  A.acts["sign-del"] = function (el) {
    var id = el.getAttribute("data-id");
    A.state.rituals.signs = A.state.rituals.signs.filter(function (s) { return s.id !== id; });
    A.save(); A.render();
  };

  function lunationKey(d) { return A.ymd(A.addDays(d, -Math.floor(A.moonAge(d)))); }
  function moonSvg(key, size) {
    var svg = A.stickerSvg ? A.stickerSvg(key) : "";
    return '<span class="moon-art" style="width:' + size + 'px;height:' + size + 'px">' + svg + "</span>";
  }
  function tabMoon() {
    var t = A.today(), ph = A.moonPhase(t), key = lunationKey(t), nn = A.nextMoon(t, false), nf = A.nextMoon(t, true);
    var fmt = function (d) { return d ? A.fmtDay(d, { weekday: "short", month: "short", day: "numeric" }) : "—"; };
    var lun = A.state.rituals.moon[key] || {};
    var past = Object.keys(A.state.rituals.moon).filter(function (k) { return k !== key && (A.state.rituals.moon[k].intentions || A.state.rituals.moon[k].release); }).sort().reverse().slice(0, 6);
    var upcoming = [];
    for (var i = 0; i < 4; i++) {
      var a = A.nextMoon(i === 0 ? t : (upcoming.length ? upcoming[upcoming.length - 1][1] : t), i % 2 === 1);
      if (!a) break;
      upcoming.push([i % 2 === 1 ? "Full moon" : "New moon", a]);
    }
    var seq = [], from = t;
    for (var j = 0; j < 4; j++) {
      var nm = A.nextMoon(from, false), fm = A.nextMoon(from, true);
      if (nm && fm) { seq.push(["New moon", nm]); seq.push(["Full moon", fm]); from = nm > fm ? nm : fm; } else break;
    }
    seq.sort(function (a, b) { return a[1] - b[1]; });
    return '<div class="grid">' +
      '<div class="c5 stack">' + A.card("Tonight’s moon", '<div class="moon-now">' + moonSvg(ph.key, 96) + '<div><b class="moon-name">' + esc(ph.name) + '</b><div class="small muted">about ' + Math.round(ph.lit * 100) + "% lit</div></div></div>" +
        '<p class="aff-big" style="font-size:16px;margin:14px 0 0">' + esc(ph.prompt) + "</p>", { icon: "moon", tint: "grad" }) +
        A.card("Coming up", '<ul class="list">' + seq.slice(0, 4).map(function (s) {
          return '<li class="li"><span class="moon-art sm">' + (A.stickerSvg ? A.stickerSvg(s[0] === "Full moon" ? "moon-full" : "moon-new") : "") + '</span><span class="li-text"><b>' + s[0] + "</b></span><span class=\"badge\">" + esc(fmt(s[1])) + "</span></li>";
        }).join("") + '</ul><p class="small muted" style="margin:10px 0 0">Dates are calculated from the average lunar cycle, so they can be off by about a day.</p>', { icon: "calendar", tone: "pink" }) +
      "</div>" +
      '<div class="c7 stack">' + A.card("This lunation’s journal", '<p class="small muted" style="margin:0 0 6px">One page per moon cycle, from new moon to new moon.</p>' +
        '<label class="lbl">New moon: what I’m calling in</label>' + A.textarea("rituals.moon." + key + ".intentions", 'rows="4" placeholder="Write your intentions in the present tense…"', "lined") +
        '<label class="lbl">Full moon: what I’m releasing and celebrating</label>' + A.textarea("rituals.moon." + key + ".release", 'rows="4" placeholder="What I’m ready to let go of, and what has grown…"', "lined"), { icon: "pen", tone: "sky" }) +
        (past.length ? A.card("Earlier moons", past.map(function (k) {
          var m = A.state.rituals.moon[k];
          return '<div class="inner" style="margin-bottom:8px"><span class="badge grey">' + esc(A.fmtDay(A.parseD(k), { month: "short", day: "numeric", year: "numeric" })) + "</span>" + (m.intentions ? '<p class="small" style="margin:6px 0 0"><b>Calling in:</b> ' + esc(m.intentions) + "</p>" : "") + (m.release ? '<p class="small" style="margin:4px 0 0"><b>Releasing:</b> ' + esc(m.release) + "</p>" : "") + "</div>";
        }).join(""), { icon: "book", tone: "butter" }) : "") +
      "</div></div>";
  }

  A.views.rituals = function (tab) {
    tab = TABS.some(function (t) { return t[0] === tab; }) ? tab : (A.state.rituals.tab || "369");
    A.state.rituals.tab = tab;
    var seg = '<div class="seg" role="tablist">' + TABS.map(function (t) { return '<button role="tab" aria-selected="' + (t[0] === tab) + '" class="' + (t[0] === tab ? "on" : "") + '" data-act="rit-tab" data-v="' + t[0] + '">' + t[1] + "</button>"; }).join("") + "</div>";
    var body = tab === "369" ? tab369() : tab === "555" ? tab555() : tab === "gratitude" ? tabGratitude() : tab === "signs" ? tabSigns() : tabMoon();
    return A.head("Manifest", 'Rituals <span class="soft">& moon</span>', "Simple practices to come back to each day. Pick the ones that feel good and skip the rest.", seg) + body;
  };
  A.acts["rit-tab"] = function (el) { location.hash = "#/rituals/" + el.getAttribute("data-v"); };
})();
