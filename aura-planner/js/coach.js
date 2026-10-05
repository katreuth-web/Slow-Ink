/* Aura — pattern insights and the thought sorter.
   Both work offline with on-device rules; add your own Claude API key for written reflections. */
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
  var UPLIFTING = ["Joyful", "Grateful", "Calm", "Hopeful", "Excited", "Confident", "Loved", "Peaceful", "Curious"];
  function collect(n) {
    var end = A.today(), rows = [], vizByDay = {};
    A.state.viz.sessions.forEach(function (s) { vizByDay[s.date] = (vizByDay[s.date] || 0) + s.mins; });
    for (var i = n - 1; i >= 0; i--) {
      var d = A.addDays(end, -i), k = A.ymd(d), day = A.peekDay(k), log = A.state.habitLog[k] || {};
      rows.push({
        k: k, d: d, mood: day ? day.mood : 0, energy: day ? day.energy : 0,
        habits: A.state.habits.filter(function (h) { return log[h.id]; }).length,
        habitNames: A.state.habits.filter(function (h) { return log[h.id]; }).map(function (h) { return h.name; }),
        tasks: day ? day.tasks.length : 0, done: day ? day.tasks.filter(function (t) { return t.done; }).length : 0,
        top3: day ? day.top3.filter(function (t) { return t.t; }).length : 0,
        top3done: day ? day.top3.filter(function (t) { return t.t && t.done; }).length : 0,
        practices: day ? A.practiceCount(day) : 0,
        practiceKeys: day ? A.PRACTICES.filter(function (p) { return day.practice[p[0]]; }).map(function (p) { return p[0]; }) : [],
        gratitude: day ? day.gratitude.filter(Boolean).length : 0,
        emotions: day ? day.emotions : [],
        viz: vizByDay[k] || 0,
        text: day ? [day.reflect.wins, day.reflect.felt, day.reflect.shifted, day.reflect.release, day.gratitude.join(" "), day.actAsIf, day.sign, day.brain].filter(Boolean).join("\n") : "",
        day: day
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
    var logged = rows.filter(function (r) { return r.mood || r.tasks || r.habits || r.text || r.practices; }).length;
    if (logged < 3) {
      out.push(["sparkle", "Keep logging for a few days", "Fill in your mood, practices and evening reflection on the daily page. Patterns appear after about a week of entries."]);
      return out;
    }
    var half = Math.floor(rows.length / 2);
    var m1 = avg(rows.slice(0, half).filter(function (r) { return r.mood; }).map(function (r) { return r.mood; }));
    var m2 = avg(rows.slice(half).filter(function (r) { return r.mood; }).map(function (r) { return r.mood; }));
    if (m1 && m2) {
      var diff = m2 - m1;
      out.push(["smile", "Mood is " + (Math.abs(diff) < 0.4 ? "steady" : diff > 0 ? "trending up" : "dipping"), "Average " + m2.toFixed(1) + "/10 recently vs " + m1.toFixed(1) + " before." + (diff < -0.4 ? " Be gentle with yourself. Lighten tomorrow’s list and protect your sleep." : diff > 0.4 ? " Notice what changed and keep it in your routine." : "")]);
    }
    var days = rows.filter(function (r) { return r.practices > 0; }).length;
    out.push(["sprout", "You practiced on " + days + " of " + rows.length + " days", days >= rows.length * 0.6 ? "That’s a steady rhythm. Consistency matters more than length." : "Even one small practice counts. Try attaching one to something you already do, like gratitude with your morning drink."]);
    var counts = {};
    rows.forEach(function (r) { r.practiceKeys.forEach(function (p) { counts[p] = (counts[p] || 0) + 1; }); });
    var favKey = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0];
    if (favKey) {
      var fav = A.PRACTICES.filter(function (p) { return p[0] === favKey; })[0];
      out.push(["heart", "Your go-to practice: " + fav[1], counts[favKey] + " days in the last " + rows.length + "."]);
    }
    [
      [function (r) { return r.practices >= 3; }, "sparkle", "Practice days feel better", "On days you do 3 or more practices your mood averages "],
      [function (r) { return r.gratitude > 0; }, "heart", "Gratitude brightens your days", "Days with a gratitude entry average a mood of "],
      [function (r) { return r.viz > 0; }, "eye", "Visualization lifts you", "Days with a visualization session average a mood of "],
      [function (r) { return A.state.habits.length && r.habits >= Math.ceil(A.state.habits.length / 2); }, "check", "Rituals anchor your day", "When you keep at least half your rituals, mood averages "]
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
      if (best.p > 0) out.push(["star", "Strongest ritual: " + best.h.name, Math.round(best.p * 100) + "% of days. Stack a new ritual right after it to borrow its momentum."]);
      if (worst !== best && worst.p < 0.4) out.push(["target", "Needs a gentler version: " + worst.h.name, "Only " + Math.round(worst.p * 100) + "% of days. Shrink it to two minutes, or tie it to a fixed moment in your day."]);
    }
    var emo = {}, up = 0, heavy = 0;
    rows.forEach(function (r) { r.emotions.forEach(function (e) { emo[e] = (emo[e] || 0) + 1; if (UPLIFTING.indexOf(e) >= 0) up++; else heavy++; }); });
    var topEmo = Object.keys(emo).sort(function (a, b) { return emo[b] - emo[a]; }).slice(0, 3);
    if (topEmo.length) out.push(["lotus", "Feelings that showed up most", "<b>" + topEmo.map(esc).join("</b>, <b>") + "</b>." + (heavy > up && heavy >= 3 ? " Heavier feelings have been visiting. That’s information, not failure. What do they need?" : up > heavy ? " Plenty of uplifting feelings. Notice what set them up." : "")]);
    var t3 = rows.reduce(function (s, r) { return s + r.top3; }, 0), t3d = rows.reduce(function (s, r) { return s + r.top3done; }, 0);
    if (t3 >= 3) out.push(["flag", "Inspired actions followed through " + Math.round(t3d / t3 * 100) + "%", t3d / t3 < 0.5 ? "Try choosing just one step a day and making it small enough to finish." : "You act on what you plan. That’s the part that turns intention into movement."]);
    var live = A.state.manifest.items.filter(function (m) { return m.status === "planted" || m.status === "growing"; });
    if (live.length) {
      var sk = rows[0].k, signs = 0;
      live.forEach(function (m) { signs += m.evidence.filter(function (e) { return e.date >= sk; }).length; });
      var al = avg(live.map(function (m) { return m.align; }));
      out.push(["seed", live.length + " intention" + (live.length === 1 ? "" : "s") + " in progress", "Average alignment " + al.toFixed(1) + "/10, with " + signs + " sign" + (signs === 1 ? "" : "s") + " and wins logged in this window." + (al < 5 ? " A low number is a cue to revisit the why, not to give up." : "")]);
    }
    var words = {};
    rows.forEach(function (r) {
      (r.text.toLowerCase().match(/[a-z']{4,}/g) || []).forEach(function (w) { if (STOP.indexOf(w) < 0) words[w] = (words[w] || 0) + 1; });
    });
    var top = Object.keys(words).filter(function (w) { return words[w] > 1; }).sort(function (a, b) { return words[b] - words[a]; }).slice(0, 6);
    if (top.length) out.push(["book", "Recurring themes in your writing", "You often write about <b>" + top.map(esc).join("</b>, <b>") + "</b>. Are these getting enough space in your week?"]);
    var missing = rows.filter(function (r) { return !r.mood; }).length;
    if (missing > rows.length / 2) out.push(["heart", "Check in more often", "Mood is missing on " + missing + " of " + rows.length + " days. A five-second tap each evening makes these insights sharper."]);
    return out;
  }

  function sparkline(rows) {
    var W = 300, H = 70, pts = [];
    rows.forEach(function (r, i) { if (r.mood) pts.push([8 + i / (rows.length - 1) * (W - 16), H - 8 - (r.mood - 1) / 9 * (H - 16)]); });
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Mood over time"><defs><linearGradient id="sg" x1="0" x2="1"><stop offset="0" style="stop-color:var(--lav)"/><stop offset="1" style="stop-color:var(--pink)"/></linearGradient></defs>';
    s += '<line x1="8" x2="' + (W - 8) + '" y1="' + (H / 2) + '" y2="' + (H / 2) + '" style="stroke:rgba(var(--ac),.15)" stroke-dasharray="3 4"/>';
    if (pts.length > 1) s += '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="none" stroke="url(#sg)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    pts.forEach(function (p) { s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3" style="fill:var(--paper);stroke:var(--lav)" stroke-width="2"/>'; });
    return s + "</svg>";
  }

  function settingsCard() {
    var c = A.state.coach;
    return A.card("Optional: written reflections", '<p class="small muted" style="margin-top:0">Insights work offline. To get a written reflection from Claude, add your own API key. It stays in this browser and is sent only to api.anthropic.com when you press the button.</p>' +
      '<label class="lbl">Claude API key</label><input class="field" type="password" autocomplete="off" data-bind="coach.key" value="' + esc(c.key) + '" placeholder="sk-ant-…" />' +
      '<label class="lbl">Model</label><select class="field" data-bind="coach.model">' + [["claude-opus-5", "Claude Opus 5 · deepest"], ["claude-sonnet-5", "Claude Sonnet 5 · faster"]].map(function (m) { return '<option value="' + m[0] + '"' + (c.model === m[0] ? " selected" : "") + ">" + m[1] + "</option>"; }).join("") + "</select>" +
      '<p class="small" style="margin:10px 0 0">' + (c.key ? '<span class="badge mint">AI connected</span>' : '<span class="badge grey">Offline insights</span>') + "</p>", { icon: "gear", tone: "sky" });
  }

  /* ------------------------------------------------------------ pattern insights view */
  var busy = { analyze: false, synth: false };
  A.views.coach = function () {
    var n = A.state.ui.coachDays || 14, rows = collect(n), ins = localInsights(rows), c = A.state.coach;
    var st = A.periodStats(rows[0].d, rows[rows.length - 1].d);
    var seg = '<div class="seg">' + [7, 14, 30].map(function (x) { return '<button class="' + (x === n ? "on" : "") + '" data-act="coach-days" data-v="' + x + '">' + x + " days</button>"; }).join("") + "</div>";
    var insights = ins.map(function (x) { return '<div class="insight"><span class="ic">' + ic(x[0]) + "</span><div><b>" + esc(x[1]) + "</b><p>" + x[2] + "</p></div></div>"; }).join("");
    var ai = c.analysis ? '<div class="ai-out">' + md(c.analysis) + '</div><p class="small muted">Generated ' + esc(c.analysisAt) + "</p>" : '<div class="empty">' + (c.key ? "Ask Claude to read your reflections, feelings and practices together and offer a gentle summary." : "Add a Claude API key below to unlock written reflections.") + "</div>";
    return A.head("Insights", 'Pattern <span class="soft">insights</span>', "Looks across your mood, practices, rituals, feelings and reflections to notice what supports you. Everything is worked out privately on this device.", seg) +
      '<div class="grid">' +
      '<div class="c8 stack">' +
        A.card("Patterns found", insights, { icon: "eye", tint: "grad", sub: "From the last " + n + " days." }) +
        A.card("Claude’s reflection", ai, { icon: "sparkle", tone: "pink", tools: '<button class="btn sm" data-act="coach-analyze"' + (c.key && !busy.analyze ? "" : " disabled") + ">" + (busy.analyze ? '<span class="spinner"></span>Thinking…' : ic("sparkle") + "Reflect with Claude") + "</button>" }) +
      "</div>" +
      '<div class="c4 stack">' +
        A.card("Mood · last " + n + " days", '<div class="chart">' + sparkline(rows) + '</div><div class="stats" style="margin-top:10px">' +
          '<div class="inner stat"><b>' + (st.moodAvg ? st.moodAvg.toFixed(1) : "—") + "</b><span>avg mood</span></div>" +
          '<div class="inner stat"><b>' + st.practices + "</b><span>practices</span></div>" +
          '<div class="inner stat"><b>' + st.gratitude + "</b><span>thank-yous</span></div>" +
          '<div class="inner stat"><b>' + st.reflections + "</b><span>reflections</span></div></div>", { icon: "smile", tone: "pink" }) +
        settingsCard() +
      "</div></div>";
  };
  A.acts["coach-days"] = function (el) { A.state.ui.coachDays = +el.getAttribute("data-v"); A.save(); A.render(); };
  A.acts["coach-analyze"] = function () {
    var n = A.state.ui.coachDays || 14, rows = collect(n);
    var data = rows.map(function (r) {
      var day = r.day;
      return { date: r.k, mood: r.mood || null, energy: r.energy || null, emotions: r.emotions, practices_done: r.practiceKeys, visualization_min: r.viz, rituals_kept: r.habitNames, intention: day ? day.intention : "", gratitude: day ? day.gratitude.filter(Boolean) : [], reflection: day ? day.reflect : null, brain_dump: day ? day.brain : "" };
    });
    var live = A.state.manifest.items.filter(function (m) { return m.status === "planted" || m.status === "growing"; }).map(function (m) { return { intention: m.title, alignment: m.align, signs_and_wins: m.evidence.length }; });
    var system = "You are a warm, grounded reflection partner inside a personal manifestation and intention-setting planner. You read a person's daily logs (mood 1-10, energy, emotions, practices like gratitude, affirmations, visualization, scripting and journaling, rituals, reflections) and offer specific, kind observations about patterns in their feelings, habits and routines. Refer to concrete dates and numbers from the data. Treat manifestation as a reflection and intention-setting practice: never promise or predict that any desire will come true, never imply they are to blame if it hasn't, and encourage small real-world actions alongside the inner work. Be concise. Format with short markdown headings ('## Patterns', '## What’s supporting you', '## Try this week') and bullet points. Never diagnose; if entries suggest persistent distress, gently suggest talking to a trusted person or professional.";
    var user = "Here are my last " + n + " days of planner data as JSON. My rituals are: " + A.state.habits.map(function (h) { return h.name; }).join(", ") + ".\n\nIntentions I'm working with: " + (JSON.stringify(live) || "[]") + "\n\n" + JSON.stringify(data) + "\n\nWhat patterns do you notice, and what 3 to 5 gentle changes might support me this week?";
    busy.analyze = true; A.render();
    A.askClaude(system, user).then(function (text) {
      A.state.coach.analysis = text; A.state.coach.analysisAt = new Date().toLocaleString(); A.save();
    }, function (e) { A.toast(e.message); }).then(function () { busy.analyze = false; if (A.route.name === "coach") A.render(); });
  };

  /* ------------------------------------------------------------ thought sorter */
  var LABELS = { do: "Do today", plan: "Plan it", delegate: "Ask for help", drop: "Let it go" };
  var RX = {
    urgent: /\b(today|tonight|asap|urgent|now|deadline|due|overdue|tomorrow|this morning|this afternoon|by (mon|tues|wednes|thurs|fri|satur|sun)day|by (eod|end of day)|immediately)\b/i,
    important: /\b(goal|important|must|need to|have to|health|doctor|family|career|client|boss|exam|rent|bill|tax|priority|key|essential|finish|submit|pay|launch|interview)\b/i,
    delegate: /\b(ask|email|call|remind|someone|team|delegate|book|schedule with|follow up|reply|text)\b/i,
    drop: /\b(maybe|someday|scroll|might|could|if time|whenever|nice to have|worry|worried|afraid|what if)\b/i,
    goal: /\b(want to|i'd love to|i would love to|dream|wish|manifest|calling in|goal|learn|become|start (a|my)|build|save (up)?|run a|lose|improve|get better at|train for|write a|open a|move to)\b/i
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
      if (RX.drop.test(s) && !u && !imp) { q = "drop"; why = "Sounds like a worry or an extra. Write it down, then let it go."; }
      else if (u && imp) { q = "do"; why = "Time-sensitive and meaningful."; }
      else if (imp) { q = "plan"; why = "Important. Give it a gentle slot this week."; }
      else if (u || RX.delegate.test(s)) { q = "delegate"; why = u ? "Urgent but light. Batch it or ask for help." : "A quick message could move this forward."; }
      else { q = "plan"; why = "Worth doing. Pick a day this week."; }
      actions.push({ text: s.replace(/[.!]$/, ""), quadrant: q, why: why, when: q === "do" ? "today" : q === "plan" ? "this_week" : "later" });
    });
    var counts = { do: 0, plan: 0, delegate: 0, drop: 0 };
    actions.forEach(function (a) { counts[a.quadrant]++; });
    return {
      summary: actions.length || goals.length ? "Found " + actions.length + " action" + (actions.length === 1 ? "" : "s") + " (" + counts.do + " for today, " + counts.plan + " to plan, " + counts.delegate + " to ask help with, " + counts.drop + " to let go) and " + goals.length + " intention idea" + (goals.length === 1 ? "" : "s") + "." : "I couldn’t find clear actions. Try one thought per line.",
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
      return '<p class="lbl"><span class="q-tag q-' + q + '">' + LABELS[q] + "</span></p>" + items.map(function (o) {
        return '<div class="action-item">' + (o.a.added ? '<span class="badge mint">added</span>' : '<span class="badge grey">' + esc((o.a.when || "").replace("_", " ")) + "</span>") +
          "<div><div>" + esc(o.a.text) + '</div><div class="why">' + esc(o.a.why) + "</div></div>" +
          '<div class="row"><button class="btn xs soft" data-act="synth-week" data-i="' + o.i + '" title="Add to this week’s inspired actions">' + ic("calendar") + '</button><button class="btn xs" data-act="synth-today" data-i="' + o.i + '" title="Add to today’s actions">' + ic("arrowR") + "Today</button></div></div>";
      }).join("");
    }).join("");
    var goals = r && r.goals.length ? r.goals.map(function (g, i) {
      return '<div class="action-item"><span class="ico" style="width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:var(--pink-soft);color:var(--pink-2)">' + ic("seed") + "</span><div><div><b>" + esc(g.title) + '</b></div><div class="why">' + esc([g.measurable, g.deadline_hint].filter(Boolean).join(" · ")) + '</div></div><button class="btn xs soft" data-act="synth-goal" data-i="' + i + '"' + (g.added ? " disabled" : "") + ">" + (g.added ? "Planted" : "Plant it") + "</button></div>";
    }).join("") : "";
    var results = r ? '<div class="tip" style="margin-bottom:12px">' + esc(r.summary) + (r.source === "claude" ? ' <span class="badge">Claude</span>' : ' <span class="badge grey">on-device</span>') + "</div>" + (groups || '<div class="empty">No actions found.</div>') +
      (goals ? '<p class="lbl" style="margin-top:16px">Intention ideas</p>' + goals : "") +
      '<div class="row wrap" style="margin-top:14px"><button class="btn sm" data-act="synth-all">' + ic("calendar") + 'Add plans to this week</button><button class="btn sm ghost" data-act="synth-do-today">' + ic("bolt") + 'Today’s items → today</button></div>'
      : '<div class="empty">Paste a brain dump, a messy to-do list or a stream of thoughts, then press Sort.</div>';
    return A.head("Insights", 'Thought <span class="soft">sorter</span>', "Turn tangled thoughts into small inspired actions, and spot the dreams hiding inside them.") +
      '<div class="grid">' +
      '<div class="c5 stack">' +
        A.card("Your thoughts", A.textarea("coach.synthInput", 'rows="12" placeholder="e.g. Need to pay rent by Friday. Email Sam about the deck. I want to run a half marathon. Maybe reorganise the closet…"', "lined") +
          '<div class="row wrap" style="margin-top:10px"><button class="btn" data-act="synth-run"' + (busy.synth ? " disabled" : "") + ">" + (busy.synth ? '<span class="spinner"></span>Sorting…' : ic("sparkle") + "Sort") + "</button>" +
          '<button class="btn sm ghost" data-act="synth-import-brain">Today’s brain dump</button><button class="btn sm ghost" data-act="synth-import-page">Latest notebook page</button></div>' +
          '<p class="small muted" style="margin:10px 0 0">' + (c.key ? "Using Claude (" + esc(c.model) + ")." : "Using on-device rules. Add a Claude key on the Pattern Insights page for smarter sorting.") + "</p>", { icon: "brain", tint: "lav" }) +
      "</div>" +
      '<div class="c7">' + A.card("Sorted", results, { icon: "list", tone: "pink" }) + "</div></div>";
  };
  A.acts["synth-run"] = function () {
    var c = A.state.coach, text = (c.synthInput || "").trim();
    if (!text) { A.toast("Write or import some notes first."); return; }
    if (!c.key) { c.synth = localSynth(text); c.synthAt = new Date().toLocaleString(); A.save(); A.render(); return; }
    busy.synth = true; A.render();
    var dreams = A.state.manifest.items.map(function (m) { return m.title; }).filter(Boolean);
    var system = "You turn messy notes into a gentle, prioritised list of small inspired actions (do = important today, plan = important but not urgent, delegate = ask someone for help, drop = a worry or extra worth letting go) and spot wishes or dreams that could become intentions. Each action must be short, concrete and verb-first. Keep the person's wording where possible. 'why' is one short, kind sentence. For intentions, 'title' is the wish phrased in the present tense, 'specific' is why it matters, 'measurable' is a sign they might notice along the way, 'deadline_hint' is optional. Never promise outcomes. Today's date is " + A.fmtDay(A.today(), { weekday: "long", year: "numeric", month: "long", day: "numeric" }) + ".";
    var user = "My existing intentions: " + (dreams.join("; ") || "none") + ".\n\nMy notes:\n" + text;
    A.askClaude(system, user, SCHEMA).then(function (out) {
      var j = JSON.parse(out);
      j.source = "claude";
      c.synth = j; c.synthAt = new Date().toLocaleString(); A.save();
    }).catch(function (e) {
      A.toast(e.message + " Used on-device rules instead.");
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
    A.state.coach.synthInput = [p.title, p.text, p.cornell && p.cornell.notes, p.cornell && p.cornell.cue, p.cornell && p.cornell.summary].concat((p.cols || []).map(function (c) { return c.t; })).filter(function (s) { return s && s.trim(); }).join("\n");
    A.save(); A.render();
  };
  function toWeek(a) {
    var mk = A.ymd(A.mondayOf(A.today()));
    var w = A.state.weeks[mk] || (A.state.weeks[mk] = { focus: "", priorities: [], notes: "", selfcare: "" });
    if (!Array.isArray(w.priorities)) w.priorities = [];
    w.priorities.push({ id: A.uid(), text: a.text, done: false });
  }
  A.acts["synth-week"] = function (el) {
    var a = A.state.coach.synth.actions[+el.getAttribute("data-i")];
    toWeek(a); a.added = true; A.save(); A.toast("Added to this week"); A.render();
  };
  A.acts["synth-today"] = function (el) {
    var a = A.state.coach.synth.actions[+el.getAttribute("data-i")];
    A.addTask(A.todayKey(), a.text); a.added = true; A.save(); A.toast("Added to today"); A.render();
  };
  A.acts["synth-all"] = function () {
    var n = 0;
    A.state.coach.synth.actions.forEach(function (a) { if (!a.added && a.quadrant === "plan") { toWeek(a); a.added = true; n++; } });
    A.save(); A.toast(n ? n + " action(s) added to this week" : "Nothing new to plan"); A.render();
  };
  A.acts["synth-do-today"] = function () {
    var n = 0;
    A.state.coach.synth.actions.forEach(function (a) { if (a.quadrant === "do" && !a.added) { A.addTask(A.todayKey(), a.text); a.added = true; n++; } });
    A.save(); A.toast(n ? n + " task(s) added to today" : "Nothing new for today"); A.render();
  };
  A.acts["synth-goal"] = function (el) {
    var g = A.state.coach.synth.goals[+el.getAttribute("data-i")];
    var m = A.newManifest({ title: g.title });
    m.why = g.specific || ""; m.feeling = g.measurable || "";
    g.added = true; A.save(); A.toast("Planted. Fill in the details on My Manifestations."); A.render();
  };
})();
