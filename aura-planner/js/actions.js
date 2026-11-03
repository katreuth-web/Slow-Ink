/* Aura — Inspired Actions: one place for the real steps you take toward what you're calling in.
   Steps written on a day or week page stay where they are; this page gathers them so an action
   noted last Tuesday isn't lost, and lets you tie each one to a manifestation. */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic;

  function list() {
    if (!Array.isArray(A.state.actions)) A.state.actions = [];
    return A.state.actions;
  }
  function items() { return (A.state.manifest && A.state.manifest.items) || []; }
  function byId(id) { return list().filter(function (x) { return x.id === id; })[0]; }
  function manifestById(id) { return items().filter(function (m) { return m.id === id; })[0]; }
  function ui() { return A.state.ui || (A.state.ui = {}); }
  function shortDate(d) { return d.getDate() + " " + A.MONTHS[d.getMonth()].slice(0, 3); }

  /* ------------------------------------------------------------ when-ish grouping */
  var GROUPS = [
    ["over", "Past its date", "These were meant for an earlier day. Move them, or let them go."],
    ["today", "Today", ""],
    ["soon", "The next few days", ""],
    ["later", "Later", ""],
    ["some", "When the time is right", "No date yet, and that’s allowed."]
  ];
  function buckets() {
    var tk = A.todayKey(), week = A.ymd(A.addDays(A.today(), 7));
    var g = { over: [], today: [], soon: [], later: [], some: [], done: [] };
    list().forEach(function (it) {
      if (it.done) g.done.push(it);
      else if (!it.due) g.some.push(it);
      else if (it.due < tk) g.over.push(it);
      else if (it.due === tk) g.today.push(it);
      else if (it.due <= week) g.soon.push(it);
      else g.later.push(it);
    });
    ["over", "today", "soon", "later"].forEach(function (k) {
      g[k].sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; });
    });
    return g;
  }
  /* "Thursday", "3 days ago", "12 Mar" — whichever reads most naturally from today. */
  function dueLabel(due) {
    var d = A.parseD(due);
    if (!d) return "";
    var days = Math.round((d - A.today()) / 864e5);
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    if (days === -1) return "yesterday";
    if (days < 0) return -days + " days ago";
    if (days < 7) return A.DOW[(d.getDay() + 6) % 7];
    return shortDate(d);
  }

  function manifestOptions(sel) {
    return '<option value="">Not linked</option>' + items().filter(function (m) {
      return m.status === "planted" || m.status === "growing" || m.id === sel;
    }).map(function (m) {
      return '<option value="' + esc(m.id) + '"' + (m.id === sel ? " selected" : "") + ">" + esc((m.title || "Untitled").slice(0, 60)) + "</option>";
    }).join("");
  }

  /* One row, bound by its real position in state.actions so the group order doesn't matter.
     `withLink` is off inside the by-intention view, where the heading already says which
     manifestation this belongs to. */
  function row(it, withLink) {
    var i = list().indexOf(it), p = "actions." + i;
    if (i < 0) return "";
    var late = !it.done && it.due && it.due < A.todayKey();
    return '<li class="li act-row' + (it.done ? " done" : "") + '">' +
      A.checkbox(p + ".done", 'aria-label="Taken"') +
      A.input(p + ".text", 'maxlength="160" aria-label="Inspired action"', "bare act-text") +
      (withLink && items().length
        ? '<select class="field act-link" data-bind="' + p + '.mid" aria-label="Linked manifestation">' + manifestOptions(it.mid || "") + "</select>"
        : "") +
      '<span class="act-when' + (late ? " late" : "") + '">' +
        '<input class="act-due' + (it.due ? "" : " empty") + '" type="date" data-bind="' + p + '.due" data-rerender value="' + esc(it.due || "") + '" aria-label="Date" />' +
        (it.due && !it.done ? '<span class="act-due-label" aria-hidden="true">' + esc(dueLabel(it.due)) + "</span>" : "") + "</span>" +
      '<button class="x-btn" data-act="act-del" data-id="' + esc(it.id) + '" aria-label="Remove action">' + ic("x") + "</button></li>";
  }

  function groupBlocks() {
    var g = buckets();
    var blocks = GROUPS.map(function (grp) {
      var rows = g[grp[0]];
      if (!rows.length) return "";
      return '<section class="act-group' + (grp[0] === "over" ? " is-late" : "") + '">' +
        '<h3 class="act-group-title">' + esc(grp[1]) + '<span class="badge grey">' + rows.length + "</span></h3>" +
        (grp[2] ? '<p class="small muted act-note">' + esc(grp[2]) + "</p>" : "") +
        '<ul class="list">' + rows.map(function (x) { return row(x, true); }).join("") + "</ul></section>";
    }).join("");
    var done = g.done.length
      ? '<section class="act-group act-done-group"><h3 class="act-group-title">Taken' +
        '<span class="badge grey">' + g.done.length + "</span>" +
        '<button class="btn xs ghost act-clear" data-act="act-clear">Clear these</button></h3>' +
        '<ul class="list">' + g.done.map(function (x) { return row(x, true); }).join("") + "</ul></section>"
      : "";
    return blocks + done;
  }

  /* Every step belonging to one manifestation, so "what am I actually doing about this?"
     has an answer on a single screen. */
  function intentionBlocks() {
    var all = list(), out = "", quiet = [];
    items().forEach(function (m) {
      if (m.status === "released") return;
      var mine = all.filter(function (x) { return x.mid === m.id; });
      if (!mine.length) { if (m.status !== "manifested") quiet.push(m); return; }
      var open = mine.filter(function (x) { return !x.done; }).length;
      out += '<section class="act-group act-int"><h3 class="act-group-title">' +
        '<a href="#/manifest/' + esc(m.id) + '">' + esc(m.title || "Untitled") + "</a>" +
        '<span class="badge grey">' + (open ? open + " open" : "all taken") + "</span></h3>" +
        '<ul class="list">' + mine.map(function (x) { return row(x, false); }).join("") + "</ul></section>";
    });
    var loose = all.filter(function (x) { return !x.mid || !manifestById(x.mid); });
    if (loose.length) {
      out += '<section class="act-group act-int"><h3 class="act-group-title">Not linked to anything' +
        '<span class="badge grey">' + loose.length + "</span></h3>" +
        '<ul class="list">' + loose.map(function (x) { return row(x, true); }).join("") + "</ul></section>";
    }
    if (quiet.length) {
      out += A.card("Nothing in motion yet",
        '<p class="small muted">These are planted, but no step is written for them. One small action is enough to start.</p>' +
        '<ul class="list act-quiet">' + quiet.map(function (m) {
          return '<li class="li"><a class="grow" href="#/manifest/' + esc(m.id) + '">' + esc(m.title || "Untitled") + "</a>" +
            '<button class="btn xs soft" data-act="act-for" data-id="' + esc(m.id) + '">Add a step</button></li>';
        }).join("") + "</ul>", { icon: "seed", tone: "butter" });
    }
    return out || '<p class="small muted">Nothing here yet.</p>';
  }

  /* ------------------------------------------------------------ steps written elsewhere */
  /* Unfinished steps sitting on day and week pages. Without this they're only ever visible
     on the page they were written on, which is how they get lost. */
  function elsewhere() {
    var from = A.ymd(A.addDays(A.today(), -45)), out = [];
    Object.keys(A.state.days || {}).forEach(function (k) {
      if (k < from) return;
      var d = A.state.days[k];
      (d && d.top3 ? d.top3 : []).forEach(function (t, i) {
        if (t && t.t && !t.done) out.push({ kind: "day", k: k, i: i, text: t.t });
      });
    });
    Object.keys(A.state.weeks || {}).forEach(function (wk) {
      if (wk < from) return;
      var w = A.state.weeks[wk];
      (w && Array.isArray(w.priorities) ? w.priorities : []).forEach(function (p, i) {
        if (p && p.text && !p.done) out.push({ kind: "week", k: wk, i: i, text: p.text });
      });
    });
    out.sort(function (a, b) { return a.k < b.k ? -1 : a.k > b.k ? 1 : 0; });
    return out;
  }
  function elsewhereCard() {
    var rows = elsewhere();
    if (!rows.length) return "";
    var shown = rows.slice(0, 12).map(function (r) {
      var d = A.parseD(r.k);
      return '<li class="li"><span class="chip act-else-when">' + (r.kind === "week" ? "Week of " : "") + esc(d ? shortDate(d) : r.k) + "</span>" +
        '<span class="grow act-else-text">' + esc(r.text) + "</span>" +
        '<a class="btn xs ghost" href="' + (r.kind === "week" ? "#/week/" : "#/day/") + esc(r.k) + '">Open</a>' +
        '<button class="btn xs soft" data-act="act-pull" data-kind="' + r.kind + '" data-k="' + esc(r.k) + '" data-i="' + r.i + '">Bring over</button></li>';
    }).join("");
    return A.card("Also written elsewhere",
      '<p class="small muted">Steps still open on your day and week pages. Bring one over and it joins the list above.</p>' +
      '<ul class="list act-else">' + shown + "</ul>" +
      (rows.length > 12 ? '<p class="small muted" style="margin:10px 0 0">' + (rows.length - 12) + " more on earlier pages.</p>" : ""),
      { icon: "star", tone: "pink" });
  }

  /* ------------------------------------------------------------ the page */
  A.views.actions = function () {
    var all = list(), open = all.filter(function (x) { return !x.done; }).length;
    var g = buckets(), view = ui().actView === "intention" ? "intention" : "when";

    var add = '<div class="row wrap act-add">' +
      '<input class="field grow" id="act-new" maxlength="160" placeholder="What step feels right?" data-enter="act-add" />' +
      '<input class="field act-new-due" id="act-new-due" type="date" aria-label="Date (optional)" />' +
      (items().length ? '<select class="field act-new-mid" id="act-new-mid" aria-label="Link to a manifestation">' + manifestOptions("") + "</select>" : "") +
      '<button class="btn" data-act="act-add">' + ic("plus") + "Add</button></div>";

    var toggle = '<div class="seg act-seg" role="group" aria-label="How to group these">' +
      '<button class="' + (view === "when" ? "on" : "") + '" data-act="act-view" data-v="when" aria-pressed="' + (view === "when") + '">By when</button>' +
      '<button class="' + (view === "intention" ? "on" : "") + '" data-act="act-view" data-v="intention" aria-pressed="' + (view === "intention") + '">By intention</button></div>';

    var summary = open
      ? open + (open === 1 ? " step" : " steps") + " in motion" + (g.over.length ? ", " + g.over.length + " past its date" : "")
      : "Nothing in motion right now.";

    var body = all.length
      ? (view === "when" ? groupBlocks() : intentionBlocks())
      : '<p class="small muted act-empty">Nothing here yet. An inspired action is any real step — however small — toward something you’re calling in.</p>';

    return A.head("Manifest", 'Inspired <span class="soft">Actions</span>',
      "Manifesting is what you do, not only what you picture. This is every step you’ve promised yourself, gathered in one place.") +
      A.card("Add a step", add + '<p class="small muted" style="margin:10px 0 0">A date is optional, and so is linking it to a manifestation.</p>', { icon: "star", tint: "grad" }) +
      '<div class="act-bar">' + toggle + '<p class="act-summary">' + esc(summary) + "</p></div>" +
      body + elsewhereCard();
  };

  /* ------------------------------------------------------------ what the buttons do */
  A.acts["act-add"] = function () {
    var inp = document.getElementById("act-new"), t = inp && inp.value.trim();
    if (!t) { if (inp) inp.focus(); return; }
    var dueEl = document.getElementById("act-new-due"), midEl = document.getElementById("act-new-mid");
    var due = dueEl && /^\d{4}-\d{2}-\d{2}$/.test(dueEl.value) ? dueEl.value : "";
    list().push({ id: A.uid(), text: t.slice(0, 160), done: false, due: due, mid: midEl ? midEl.value : "", created: A.todayKey() });
    inp.value = ""; if (dueEl) dueEl.value = "";
    A.save(); A.render();
    var again = document.getElementById("act-new");
    if (again) again.focus();
  };
  A.acts["act-del"] = function (el) {
    A.state.actions = list().filter(function (x) { return x.id !== el.getAttribute("data-id"); });
    A.save(); A.render();
  };
  A.acts["act-clear"] = function () {
    var n = list().filter(function (x) { return x.done; }).length;
    if (!n || !window.confirm("Remove " + n + (n === 1 ? " step you’ve taken" : " steps you’ve taken") + " from the list?")) return;
    A.state.actions = list().filter(function (x) { return !x.done; });
    A.save(); A.render(); A.toast(n === 1 ? "Step cleared." : n + " steps cleared.");
  };
  A.acts["act-view"] = function (el) {
    ui().actView = el.getAttribute("data-v") === "intention" ? "intention" : "when";
    A.save(); A.render();
  };
  /* Start a step already linked to a manifestation that has none, seeded with its next step. */
  A.acts["act-for"] = function (el) {
    var m = manifestById(el.getAttribute("data-id"));
    if (!m) return;
    list().push({ id: A.uid(), text: (m.next || "").trim().slice(0, 160), done: false, due: "", mid: m.id, created: A.todayKey() });
    ui().actView = "intention";
    A.save(); A.render();
    var fields = document.querySelectorAll(".act-text");
    if (fields.length) { var last = fields[fields.length - 1]; last.focus(); last.select(); }
  };
  /* Copy a step from a day or week page onto the list, and tick it where it was, so it
     isn't waiting for you in two places. */
  A.acts["act-pull"] = function (el) {
    var kind = el.getAttribute("data-kind"), k = el.getAttribute("data-k"), i = +el.getAttribute("data-i");
    var text = "", due = "";
    if (kind === "day") {
      var d = A.state.days[k], slot = d && d.top3 && d.top3[i];
      if (!slot || !slot.t) return;
      text = slot.t; due = k; slot.done = true;
    } else {
      var w = A.state.weeks[k], p = w && w.priorities && w.priorities[i];
      if (!p || !p.text) return;
      text = p.text; p.done = true;
    }
    list().push({ id: A.uid(), text: text.slice(0, 160), done: false, due: due, mid: "", created: A.todayKey() });
    A.save(); A.render(); A.toast("Brought over. It’s ticked off where it was.");
  };
})();
