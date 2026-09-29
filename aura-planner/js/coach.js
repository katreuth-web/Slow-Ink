/* Aura — AI coach: habit & journal pattern analyzer and the task/note priority synthesizer.
   Works fully offline with on-device heuristics; add a Claude API key for deeper coaching. */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic;

  var STOP = "a an and are as at be been but by for from had has have i i'm im in into is it it's its just me my of on or our so that the their them then there this to too was we were what when which with you your very really today got get went did do not no more some much also out up about all can will would could should one day feel felt".split(" ");

  /* ------------------------------------------------------------ Claude API (browser, user-supplied key) */
  A.askClaude = function (system, user, schema) {
    var c = A.state.coach;
    if (!c.key) return Promise.reject(new Error("Add your Claude API key first."));
    var model = c.model || "claude-opus-5";
    var body = { model: model, max_tokens: 16000, system: system, messages: [{ role: "user", content: user }], output_config: { effort: "medium" } };
    if (schema) body.output_config.format = { type: "json_schema", schema: schema };
    var useFallbacks = model === "claude-opus-5";
    function send(withFallbacks) {
      var headers = {
        "content-type": "application/json",
        "x-api-key": c.key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      };
      var b = JSON.parse(JSON.stringify(body));
      if (withFallbacks) { headers["anthropic-beta"] = "server-side-fallback-2026-07-01"; b.fallbacks = "default"; }
      return fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: headers, body: JSON.stringify(b) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
        .then(function (res) {
          if (!res.ok) {
            if (withFallbacks && res.status === 400) return send(false);
            var msg = res.j && res.j.error ? res.j.error.message : "HTTP " + res.status;
            if (res.status === 401) msg = "That API key was rejected — check it in Coach settings.";
            if (res.status === 429 || res.status === 529) msg = "Claude is busy right now — try again in a moment.";
            throw new Error(msg);
          }
          var j = res.j;
          if (j.stop_reason === "refusal") throw new Error("Claude declined this request. Try rephrasing your notes.");
          var text = (j.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("");
          if (j.stop_reason === "max_tokens" && schema) throw new Error("The response was cut short — try a shorter input.");
          return text;
        });
    }
    return send(useFallbacks);
  };

  /* Tiny, safe markdown: headings, bullets, bold, paragraphs. */
  function md(s) {
    var out = [], inList = false;
    esc(s).split(/\n/).forEach(function (line) {
      var l = line.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|\s)\*(\S.+?)\*(?=\s|$)/g, "$1<i>$2</i>");
      var li = /^\s*(?:[-*•]|\d+\.)\s+(.*)$/.exec(l), h = /^#{1,4}\s+(.*)$/.exec(l);
      if (li) { if (!inList) { out.push("<ul>"); inList = true; } out.push("<li>" + li[1] + "</li>"); return; }
      if (inList) { out.push("</ul>"); inList = false; }
      if (h) out.push("<h4>" + h[1] + "</h4>");
      else if (l.trim()) out.push("<p>" + l + "</p>");
    });
    if (inList) out.push("</ul>");
    return out.join("");
  }

  /* ------------------------------------------------------------ data gathering */
  function collect(n) {
    var end = A.today(), rows = [];
    for (var i = n - 1; i >= 0; i--) {
      var d = A.addDays(end, -i), k = A.ymd(d), day = A.peekDay(k), log = A.state.habitLog[k] || {};
      var mins = A.state.fitness.workouts.filter(function (w) { return w.date === k; }).reduce(function (s, w) { return s + A.num(w.mins); }, 0);
      rows.push({
        k: k, d: d, mood: day ? day.mood : 0, water: day ? day.water : 0,
        focus: day ? (day.focus || []).filter(Boolean).length : 0,
        habits: A.state.habits.filter(function (h) { return log[h.id]; }).length,
        habitNames: A.state.habits.filter(function (h) { return log[h.id]; }).map(function (h) { return h.name; }),
        tasks: day ? day.tasks.length : 0, done: day ? day.tasks.filter(function (t) { return t.done; }).length : 0,
        top3: day ? day.top3.filter(function (t) { return t.t; }).length : 0,
        top3done: day ? day.top3.filter(function (t) { return t.t && t.done; }).length : 0,
        mins: mins, sched: day ? Object.keys(day.schedule).filter(function (h) { return day.schedule[h]; }).map(Number) : [],
        text: day ? [day.reflect.wins, day.reflect.grateful, day.reflect.learned, day.brain].filter(Boolean).join("\n") : "",
        reflect: day ? day.reflect : null
      });
    }
    return rows;
  }
  function avg(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : 0; }
  function moodSplit(rows, test) {
    var yes = rows.filter(function (r) { return r.mood && test(r); }).map(function (r) { return r.mood; });
    var no = rows.filter(function (r) { return r.mood && !test(r); }).map(function (r) { return r.mood; });
    return yes.length >= 2 && no.length >= 2 ? { yes: avg(yes), no: avg(no), n: yes.length } : null;
  }

  function localInsights(rows) {
    var out = [], moods = rows.filter(function (r) { return r.mood; });
    var logged = rows.filter(function (r) { return r.mood || r.tasks || r.habits || r.text; }).length;
    if (logged < 3) {
      out.push(["sparkle", "Keep logging for a few days", "Fill in your mood, hydration, habits and evening reflection on the daily page — patterns appear after about a week of entries."]);
      return out;
    }
    var half = Math.floor(rows.length / 2);
    var m1 = avg(rows.slice(0, half).filter(function (r) { return r.mood; }).map(function (r) { return r.mood; }));
    var m2 = avg(rows.slice(half).filter(function (r) { return r.mood; }).map(function (r) { return r.mood; }));
    if (m1 && m2) {
      var diff = m2 - m1;
      out.push(["smile", "Mood is " + (Math.abs(diff) < 0.4 ? "steady" : diff > 0 ? "trending up" : "dipping"), "Average " + m2.toFixed(1) + "/10 recently vs " + m1.toFixed(1) + " before." + (diff < -0.4 ? " Be gentle with yourself — protect sleep and lighten tomorrow’s task list." : diff > 0.4 ? " Notice what changed and keep it in your routine." : "")]);
    }
    [
      [function (r) { return r.water >= 6; }, "drop", "Hydration lifts your mood", "On days you drink 6+ glasses your mood averages "],
      [function (r) { return r.mins > 0; }, "dumbbell", "Movement matters", "Days with a workout average a mood of "],
      [function (r) { return r.focus >= 4; }, "bolt", "Deep work feels good", "Days with 4+ focus sessions average a mood of "],
      [function (r) { return A.state.habits.length && r.habits >= Math.ceil(A.state.habits.length / 2); }, "check", "Habits anchor your day", "When you keep at least half your habits, mood averages "]
    ].forEach(function (x) {
      var s = moodSplit(rows, x[0]);
      if (s && s.yes - s.no >= 0.5) out.push([x[1], x[2], x[3] + s.yes.toFixed(1) + " vs " + s.no.toFixed(1) + " otherwise."]);
    });
    if (A.state.habits.length) {
      var rates = A.state.habits.map(function (h) {
        var hits = rows.filter(function (r) { return r.habitNames.indexOf(h.name) >= 0; }).length;
        return { h: h, p: hits / rows.length };
      }).sort(function (a, b) { return b.p - a.p; });
      var best = rates[0], worst = rates[rates.length - 1];
      if (best.p > 0) out.push(["star", "Strongest habit: " + best.h.name, Math.round(best.p * 100) + "% of days. Stack a new habit right after it to borrow its momentum."]);
      if (worst !== best && worst.p < 0.4) out.push(["target", "Struggling: " + worst.h.name, "Only " + Math.round(worst.p * 100) + "% of days. Shrink it to a 2-minute version, or schedule it in a fixed time slot on your daily page."]);
    }
    var tasks = rows.reduce(function (s, r) { return s + r.tasks; }, 0), done = rows.reduce(function (s, r) { return s + r.done; }, 0);
    if (tasks >= 5) {
      var rate = done / tasks;
      out.push(["list", "Task completion " + Math.round(rate * 100) + "%", rate < 0.5 ? "You plan more than fits. Try capping each day at your Top 3 plus 3 small tasks, and move the rest to the Eisenhower ‘Schedule’ box." : rate > 0.85 ? "You finish what you plan — you might have room for one stretch goal a week." : "A healthy balance. Keep tagging tasks so urgent-but-unimportant work gets delegated."]);
    }
    var t3 = rows.reduce(function (s, r) { return s + r.top3; }, 0), t3d = rows.reduce(function (s, r) { return s + r.top3done; }, 0);
    if (t3 >= 3) out.push(["flag", "Top 3 follow-through " + Math.round(t3d / t3 * 100) + "%", "Block the first focus session of the day for priority #1 before opening messages."]);
    var hours = [];
    rows.forEach(function (r) { hours = hours.concat(r.sched); });
    if (hours.length >= 6) {
      var late = hours.filter(function (h) { return h >= 21; }).length / hours.length;
      if (late > 0.2) out.push(["moon", "Late evenings are busy", Math.round(late * 100) + "% of scheduled blocks are after 9 PM. Try a wind-down block and screens-off habit to protect sleep."]);
      else out.push(["sun", "Your days are front-loaded", "Most of your scheduled blocks land before 9 PM — keep your hardest work in your first two focus sessions."]);
    }
    var words = {};
    rows.forEach(function (r) {
      (r.text.toLowerCase().match(/[a-z']{4,}/g) || []).forEach(function (w) { if (STOP.indexOf(w) < 0) words[w] = (words[w] || 0) + 1; });
    });
    var top = Object.keys(words).filter(function (w) { return words[w] > 1; }).sort(function (a, b) { return words[b] - words[a]; }).slice(0, 6);
    if (top.length) out.push(["book", "Recurring journal themes", "You often write about <b>" + top.map(esc).join("</b>, <b>") + "</b>. Are these getting enough space in your week?"]);
    var missing = rows.filter(function (r) { return !r.mood; }).length;
    if (missing > rows.length / 2) out.push(["heart", "Check in more often", "Mood is missing on " + missing + " of " + rows.length + " days. A 5-second tap each evening makes these insights sharper."]);
    return out;
  }

  function sparkline(rows) {
    var W = 300, H = 70, pts = [];
    rows.forEach(function (r, i) { if (r.mood) pts.push([8 + i / (rows.length - 1) * (W - 16), H - 8 - (r.mood - 1) / 9 * (H - 16)]); });
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Mood over time"><defs><linearGradient id="sg" x1="0" x2="1"><stop offset="0" stop-color="#B69CFF"/><stop offset="1" stop-color="#FF9ED2"/></linearGradient></defs>';
    s += '<line x1="8" x2="' + (W - 8) + '" y1="' + (H / 2) + '" y2="' + (H / 2) + '" stroke="rgba(155,123,255,.15)" stroke-dasharray="3 4"/>';
    if (pts.length > 1) s += '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="none" stroke="url(#sg)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    pts.forEach(function (p) { s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3" fill="#fff" stroke="#B69CFF" stroke-width="2"/>'; });
    return s + "</svg>";
  }

  function settingsCard() {
    var c = A.state.coach;
    return A.card("Coach settings", '<p class="small muted" style="margin-top:0">Insights work offline. For deeper, personalised coaching, add your own Claude API key — it stays in this browser and is sent only to api.anthropic.com.</p>' +
      '<label class="lbl">Claude API key</label><input class="field" type="password" autocomplete="off" data-bind="coach.key" value="' + esc(c.key) + '" placeholder="sk-ant-…" />' +
      '<label class="lbl">Model</label><select class="field" data-bind="coach.model">' + [["claude-opus-5", "Claude Opus 5 · deepest"], ["claude-sonnet-5", "Claude Sonnet 5 · faster"]].map(function (m) { return '<option value="' + m[0] + '"' + (c.model === m[0] ? " selected" : "") + ">" + m[1] + "</option>"; }).join("") + "</select>" +
      '<p class="small" style="margin:10px 0 0">' + (c.key ? '<span class="badge mint">AI connected</span>' : '<span class="badge grey">Offline insights</span>') + "</p>", { icon: "gear", tone: "sky" });
  }

  /* ------------------------------------------------------------ analyzer view */
  var busy = { analyze: false, synth: false };
  A.views.coach = function () {
    var n = A.state.ui.coachDays || 14, rows = collect(n), ins = localInsights(rows), c = A.state.coach;
    var st = A.periodStats(rows[0].d, rows[rows.length - 1].d);
    var seg = '<div class="seg">' + [7, 14, 30].map(function (x) { return '<button class="' + (x === n ? "on" : "") + '" data-act="coach-days" data-v="' + x + '">' + x + " days</button>"; }).join("") + "</div>";
    var insights = ins.map(function (x) { return '<div class="insight"><span class="ic">' + ic(x[0]) + "</span><div><b>" + esc(x[1]) + "</b><p>" + x[2] + "</p></div></div>"; }).join("");
    var ai = c.analysis ? '<div class="ai-out">' + md(c.analysis) + '</div><p class="small muted">Generated ' + esc(c.analysisAt) + "</p>" : '<div class="empty">' + (c.key ? "Ask Claude to read your reflections, habits and mood together and suggest routine tweaks." : "Add a Claude API key in Coach settings to unlock written coaching.") + "</div>";
    return A.head("AI pattern hub", 'Habit & journal <span class="soft">analyzer</span>', "Looks across your mood, hydration, focus, habits, workouts and evening reflections to surface patterns.", seg) +
      '<div class="grid">' +
      '<div class="c8 stack">' +
        A.card("Patterns found", insights, { icon: "eye", tint: "grad", sub: "Computed privately on this device from the last " + n + " days." }) +
        A.card("Claude’s coaching", ai, { icon: "sparkle", tone: "pink", tools: '<button class="btn sm" data-act="coach-analyze"' + (c.key && !busy.analyze ? "" : " disabled") + ">" + (busy.analyze ? '<span class="spinner"></span>Thinking…' : ic("sparkle") + "Analyze with Claude") + "</button>" }) +
      "</div>" +
      '<div class="c4 stack">' +
        A.card("Mood · last " + n + " days", '<div class="chart">' + sparkline(rows) + '</div><div class="stats" style="margin-top:10px">' +
          '<div class="inner stat"><b>' + (st.moodAvg ? st.moodAvg.toFixed(1) : "—") + "</b><span>avg mood</span></div>" +
          '<div class="inner stat"><b>' + Math.round(st.habitPct * 100) + "%</b><span>habits</span></div>" +
          '<div class="inner stat"><b>' + st.focus + "</b><span>focus</span></div>" +
          '<div class="inner stat"><b>' + st.reflections + "</b><span>reflections</span></div></div>", { icon: "smile", tone: "pink" }) +
        settingsCard() +
      "</div></div>";
  };
  A.acts["coach-days"] = function (el) { A.state.ui.coachDays = +el.getAttribute("data-v"); A.save(); A.render(); };
  A.acts["coach-analyze"] = function () {
    var n = A.state.ui.coachDays || 14, rows = collect(n);
    var data = rows.map(function (r) {
      return { date: r.k, mood: r.mood || null, water_glasses: r.water, focus_sessions: r.focus, habits_kept: r.habitNames, tasks: r.tasks, tasks_done: r.done, workout_min: r.mins, reflection: r.reflect ? r.reflect : null, brain_dump: (A.peekDay(r.k) || {}).brain || "" };
    });
    var system = "You are a warm, practical life coach inside a personal planner app. You analyse a person's daily logs (mood 1-10, hydration, focus sessions, habits, tasks, workouts, journal reflections) and give specific, evidence-based observations and routine recommendations. Refer to concrete dates and numbers from the data. Be kind and concise. Format with short markdown headings ('## Patterns', '## What’s working', '## Try this week') and bullet points. Never diagnose; suggest professional support gently if entries suggest persistent distress.";
    var user = "Here are my last " + n + " days of planner data as JSON. My habits are: " + A.state.habits.map(function (h) { return h.name; }).join(", ") + ".\n\n" + JSON.stringify(data) + "\n\nWhat patterns do you see, and what 3–5 routine changes would help me most this week?";
    busy.analyze = true; A.render();
    A.askClaude(system, user).then(function (text) {
      A.state.coach.analysis = text; A.state.coach.analysisAt = new Date().toLocaleString(); A.save();
    }, function (e) { A.toast(e.message); }).then(function () { busy.analyze = false; if (A.route.name === "coach") A.render(); });
  };

  /* ------------------------------------------------------------ synthesizer */
  var RX = {
    urgent: /\b(today|tonight|asap|urgent|now|deadline|due|overdue|tomorrow|this morning|this afternoon|by (mon|tues|wednes|thurs|fri|satur|sun)day|by (eod|end of day)|immediately)\b/i,
    important: /\b(goal|important|must|need to|have to|health|doctor|family|career|client|boss|exam|rent|bill|tax|priority|key|essential|finish|submit|pay|launch|interview)\b/i,
    delegate: /\b(ask|email|call|remind|someone|team|delegate|book|schedule with|follow up|reply|text)\b/i,
    drop: /\b(maybe|someday|scroll|might|could|if time|whenever|nice to have)\b/i,
    goal: /\b(want to|i'd love to|goal|learn|become|start (a|my)|build|save (up)?|run a|lose|improve|get better at|train for|write a)\b/i
  };
  function localSynth(text) {
    var parts = text.split(/\n|[.!?;]\s+/).map(function (s) { return s.replace(/^\s*(?:[-*•]|\d+[.)]|\[ ?\])\s*/, "").trim(); }).filter(function (s) { return s.length > 3; });
    var actions = [], goals = [], seen = {};
    parts.forEach(function (s) {
      var key = s.toLowerCase();
      if (seen[key]) return; seen[key] = 1;
      if (RX.goal.test(s) && !RX.urgent.test(s)) {
        goals.push({ title: s.replace(/^i\s+(want to|would love to|'d love to)\s+/i, "").replace(/[.!]$/, ""), specific: s, measurable: "", deadline_hint: "" });
        return;
      }
      var u = RX.urgent.test(s), imp = RX.important.test(s), q, why;
      if (RX.drop.test(s) && !u && !imp) { q = "drop"; why = "Sounds optional — let it go or park it."; }
      else if (u && imp) { q = "do"; why = "Time-sensitive and meaningful."; }
      else if (imp) { q = "plan"; why = "Important — give it a scheduled slot."; }
      else if (u || RX.delegate.test(s)) { q = "delegate"; why = u ? "Urgent but low-impact — batch or hand off." : "A quick message could move this forward."; }
      else { q = "plan"; why = "Worth doing — schedule it this week."; }
      actions.push({ text: s.replace(/[.!]$/, ""), quadrant: q, why: why, when: q === "do" ? "today" : q === "plan" ? "this_week" : "later" });
    });
    var counts = { do: 0, plan: 0, delegate: 0, drop: 0 };
    actions.forEach(function (a) { counts[a.quadrant]++; });
    return {
      summary: actions.length || goals.length ? "Found " + actions.length + " action" + (actions.length === 1 ? "" : "s") + " (" + counts.do + " do-first, " + counts.plan + " to schedule, " + counts.delegate + " to delegate, " + counts.drop + " to drop) and " + goals.length + " goal idea" + (goals.length === 1 ? "" : "s") + "." : "I couldn’t find clear actions — try one thought per line.",
      actions: actions, goals: goals, source: "local"
    };
  }
  var SCHEMA = {
    type: "object", additionalProperties: false, required: ["summary", "actions", "goals"],
    properties: {
      summary: { type: "string" },
      actions: { type: "array", items: { type: "object", additionalProperties: false, required: ["text", "quadrant", "why", "when"], properties: {
        text: { type: "string" }, quadrant: { type: "string", enum: ["do", "plan", "delegate", "drop"] }, why: { type: "string" }, when: { type: "string", enum: ["today", "this_week", "later"] } } } },
      goals: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "specific", "measurable", "deadline_hint"], properties: {
        title: { type: "string" }, specific: { type: "string" }, measurable: { type: "string" }, deadline_hint: { type: "string" } } } }
    }
  };

  A.views.synth = function () {
    var c = A.state.coach, r = c.synth;
    var groups = ["do", "plan", "delegate", "drop"].map(function (q) {
      var items = r ? r.actions.map(function (a, i) { return { a: a, i: i }; }).filter(function (o) { return o.a.quadrant === q; }) : [];
      if (!items.length) return "";
      return '<p class="lbl"><span class="q-tag q-' + q + '">' + A.QUADS[q] + "</span></p>" + items.map(function (o) {
        return '<div class="action-item">' + (o.a.added ? '<span class="badge mint">added</span>' : '<span class="badge grey">' + (o.a.when || "").replace("_", " ") + "</span>") +
          "<div><div>" + esc(o.a.text) + '</div><div class="why">' + esc(o.a.why) + "</div></div>" +
          '<div class="row"><button class="btn xs soft" data-act="synth-matrix" data-i="' + o.i + '" title="Add to Eisenhower matrix">' + ic("grid") + '</button><button class="btn xs" data-act="synth-today" data-i="' + o.i + '" title="Add to today’s tasks">' + ic("arrowR") + "Today</button></div></div>";
      }).join("");
    }).join("");
    var goals = r && r.goals.length ? r.goals.map(function (g, i) {
      return '<div class="action-item"><span class="ico" style="width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:var(--pink-soft);color:var(--pink-2)">' + ic("flag") + "</span><div><div><b>" + esc(g.title) + '</b></div><div class="why">' + esc([g.measurable, g.deadline_hint].filter(Boolean).join(" · ")) + '</div></div><button class="btn xs soft" data-act="synth-goal" data-i="' + i + '"' + (g.added ? " disabled" : "") + ">" + (g.added ? "Created" : "Create goal") + "</button></div>";
    }).join("") : "";
    var results = r ? '<div class="tip" style="margin-bottom:12px">' + esc(r.summary) + (r.source === "claude" ? ' <span class="badge">Claude</span>' : ' <span class="badge grey">on-device</span>') + "</div>" + (groups || '<div class="empty">No actions found.</div>') +
      (goals ? '<p class="lbl" style="margin-top:16px">SMART goal ideas</p>' + goals : "") +
      '<div class="row wrap" style="margin-top:14px"><button class="btn sm" data-act="synth-all">' + ic("grid") + 'Send all to matrix</button><button class="btn sm ghost" data-act="synth-do-today">' + ic("bolt") + 'Do-first → today</button></div>'
      : '<div class="empty">Paste a brain dump, meeting notes or a messy to-do list and hit Synthesize.</div>';
    return A.head("AI pattern hub", 'Priority <span class="soft">synthesizer</span>', "Turn freeform thoughts into prioritised actions mapped to your Eisenhower matrix and SMART goals.") +
      '<div class="grid">' +
      '<div class="c5 stack">' +
        A.card("Your thoughts", A.textarea("coach.synthInput", 'rows="12" placeholder="e.g. Need to pay rent by Friday. Email Sam about the deck. I want to run a half marathon. Maybe reorganise the closet…"', "lined") +
          '<div class="row wrap" style="margin-top:10px"><button class="btn" data-act="synth-run"' + (busy.synth ? " disabled" : "") + ">" + (busy.synth ? '<span class="spinner"></span>Synthesizing…' : ic("sparkle") + "Synthesize") + "</button>" +
          '<button class="btn sm ghost" data-act="synth-import-brain">Today’s brain dump</button><button class="btn sm ghost" data-act="synth-import-page">Latest notebook page</button></div>' +
          '<p class="small muted" style="margin:10px 0 0">' + (c.key ? "Using Claude (" + esc(c.model) + ")." : "Using on-device rules. Add a Claude key on the Analyzer page for smarter results.") + "</p>", { icon: "brain", tint: "lav" }) +
      "</div>" +
      '<div class="c7">' + A.card("Actions", results, { icon: "list", tone: "pink" }) + "</div></div>";
  };
  A.acts["synth-run"] = function () {
    var c = A.state.coach, text = (c.synthInput || "").trim();
    if (!text) { A.toast("Write or import some notes first."); return; }
    if (!c.key) { c.synth = localSynth(text); c.synthAt = new Date().toLocaleString(); A.save(); A.render(); return; }
    busy.synth = true; A.render();
    var goals = A.state.goals.map(function (g) { return g.title; }).filter(Boolean);
    var system = "You turn messy notes into a prioritised action list using the Eisenhower matrix (do = urgent & important, plan = important not urgent, delegate = urgent not important, drop = neither) and spot aspirations that should become SMART goals. Each action must be a short, concrete, verb-first task. Keep the person's wording where possible. 'why' is one short sentence. Today's date is " + A.fmtDay(A.today(), { weekday: "long", year: "numeric", month: "long", day: "numeric" }) + ".";
    var user = "My existing goals: " + (goals.join("; ") || "none") + ".\n\nMy notes:\n" + text;
    A.askClaude(system, user, SCHEMA).then(function (out) {
      var j = JSON.parse(out);
      j.source = "claude";
      c.synth = j; c.synthAt = new Date().toLocaleString(); A.save();
    }).catch(function (e) {
      A.toast(e.message + " — used on-device rules instead.");
      c.synth = localSynth(text); A.save();
    }).then(function () { busy.synth = false; if (A.route.name === "synth") A.render(); });
  };
  A.acts["synth-import-brain"] = function () {
    var d = A.peekDay(A.todayKey());
    if (!d || !d.brain.trim()) { A.toast("Today’s brain dump is empty."); return; }
    A.state.coach.synthInput = d.brain; A.save(); A.render();
  };
  A.acts["synth-import-page"] = function () {
    var pages = A.state.notebook.pages.slice().sort(function (a, b) { return b.updated - a.updated; });
    var p = pages[0];
    if (!p) { A.toast("No notebook pages yet."); return; }
    A.state.coach.synthInput = [p.title, p.text, p.cornell.notes, p.cornell.cue, p.cornell.summary].concat(p.cols.map(function (c) { return c.t; })).filter(function (s) { return s && s.trim(); }).join("\n");
    A.save(); A.render();
  };
  function toMatrix(a) {
    A.state.matrix[a.quadrant].push({ id: A.uid(), text: a.text, done: false });
  }
  A.acts["synth-matrix"] = function (el) {
    var a = A.state.coach.synth.actions[+el.getAttribute("data-i")];
    toMatrix(a); a.added = true; A.save(); A.toast("Added to “" + A.QUADS[a.quadrant] + "”"); A.render();
  };
  A.acts["synth-today"] = function (el) {
    var a = A.state.coach.synth.actions[+el.getAttribute("data-i")];
    A.addTask(A.todayKey(), a.text, { q: a.quadrant }); a.added = true; A.save(); A.toast("Added to today"); A.render();
  };
  A.acts["synth-all"] = function () {
    var n = 0;
    A.state.coach.synth.actions.forEach(function (a) { if (!a.added) { toMatrix(a); a.added = true; n++; } });
    A.save(); A.toast(n + " action(s) sent to the matrix"); A.render();
  };
  A.acts["synth-do-today"] = function () {
    var n = 0;
    A.state.coach.synth.actions.forEach(function (a) { if (a.quadrant === "do" && !a.added) { A.addTask(A.todayKey(), a.text, { q: "do" }); a.added = true; n++; } });
    A.save(); A.toast(n ? n + " task(s) added to today" : "No new do-first actions"); A.render();
  };
  A.acts["synth-goal"] = function (el) {
    var g = A.state.coach.synth.goals[+el.getAttribute("data-i")];
    A.newGoal({ title: g.title, s: g.specific, m: g.measurable, r: "", t: "" });
    g.added = true; A.save(); A.toast("Goal created — finish it on the SMART Goals page"); A.render();
  };
})();
