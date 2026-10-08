/* Slow Ink Sage — Money: one page with three tabs.
   Income & savings (this file), Debt payoff and the Calculator (debt.js, calc.js).
   Income and savings are tracked month by month: what came in, what was set aside, and how close each savings goal is. */
(function () {
  "use strict";
  var SI = window.SI, esc = SI.esc, ic = SI.ic;

  function M() {
    var s = SI.state;
    if (!s.money || typeof s.money !== "object" || Array.isArray(s.money)) s.money = {};
    ["income", "goals", "deposits"].forEach(function (k) { if (!Array.isArray(s.money[k])) s.money[k] = []; });
    return s.money;
  }
  function n(v) { var x = parseFloat(v); return isFinite(x) && x > 0 ? x : 0; }
  function fmt(v, dp) { return SI.moneyFmt(v, dp); }
  function monthOf(k) { return String(k || "").slice(0, 7); }
  function sum(list, key) { return list.reduce(function (t, x) { return t + n(x[key]); }, 0); }
  function addMonths(y, m, d) { var t = new Date(y, m + d, 1); return { y: t.getFullYear(), m: t.getMonth() }; }
  function monthsBetween(from, to) { return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()); }

  /* ------------------------------------------------------------ the tabs */
  SI.moneySeg = function (active) {
    var t = SI.today(), mk = SI.monthKey(t.getFullYear(), t.getMonth());
    return '<div class="seg" role="tablist">' + [["flow", "Income & savings", "#/money/flow"], ["debt", "Debt payoff", "#/money/debt"], ["calc", "Calculator", "#/money/calc"]].map(function (x) {
      return '<a role="tab" class="' + (x[0] === active ? "on" : "") + '" href="' + x[2] + '">' + x[1] + "</a>";
    }).join("") + "</div>";
  };

  SI.views.money = function (args) {
    var tab = args[0] === "debt" || args[0] === "calc" ? args[0] : "flow";
    if (tab === "debt") return SI.debtPage("debt");
    if (tab === "calc") return SI.debtPage("calc");
    return flowPage(args);
  };
  SI.after.money = function (args) {
    if (window.SlowCalc && args && args[0] === "calc") SlowCalc.mount(document.getElementById("view"), { currency: SI.moneyCur() });
  };
  /* the first version of this page lived at #/debt: keep those links working */
  SI.views.debt = function (args) { return SI.views.money([args && args[0] === "calc" ? "calc" : "debt"]); };
  SI.after.debt = function (args) { SI.after.money([args && args[0] === "calc" ? "calc" : "debt"]); };

  /* ------------------------------------------------------------ numbers for one month */
  function monthStats(key) {
    var m = M(), inc = m.income.filter(function (x) { return monthOf(x.date) === key; }), dep = m.deposits.filter(function (x) { return monthOf(x.date) === key; });
    var i = sum(inc, "amt"), sv = sum(dep, "amt");
    return { inc: i, saved: sv, rate: i > 0 ? sv / i * 100 : null, incList: inc, depList: dep };
  }
  function goalSaved(id) { return sum(M().deposits.filter(function (d) { return d.goal === id; }), "amt"); }
  function recentPace(id, now) {   /* average saved a month for a goal over the last three months */
    var tot = 0;
    for (var k = 0; k < 3; k++) { var t = addMonths(now.getFullYear(), now.getMonth(), -k), key = SI.monthKey(t.y, t.m); tot += sum(M().deposits.filter(function (d) { return d.goal === id && monthOf(d.date) === key; }), "amt"); }
    return tot / 3;
  }

  function chart(y, m) {
    var W = 600, H = 190, padB = 24, padT = 8, bars = [], max = 1;
    for (var k = 11; k >= 0; k--) { var t = addMonths(y, m, -k), st = monthStats(SI.monthKey(t.y, t.m)); bars.push({ lab: SI.MONTHS_SHORT[t.m].charAt(0), name: SI.MONTHS_SHORT[t.m] + " " + t.y, inc: st.inc, saved: st.saved }); max = Math.max(max, st.inc, st.saved); }
    var slot = W / 12, bw = Math.min(16, slot / 2 - 3), base = H - padB;
    var out = '<svg class="money-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Income and savings for the last 12 months">' +
      '<line class="mc-axis" x1="0" y1="' + base + '" x2="' + W + '" y2="' + base + '"/>';
    bars.forEach(function (b, i) {
      var cx = slot * i + slot / 2, hi = (base - padT) * b.inc / max, hs = (base - padT) * b.saved / max;
      out += '<rect class="mc-inc" x="' + (cx - bw - 1).toFixed(1) + '" y="' + (base - hi).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + hi.toFixed(1) + '" rx="3"><title>' + esc(b.name + ": income " + fmt(b.inc)) + '</title></rect>' +
        '<rect class="mc-sav" x="' + (cx + 1).toFixed(1) + '" y="' + (base - hs).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + hs.toFixed(1) + '" rx="3"><title>' + esc(b.name + ": saved " + fmt(b.saved)) + '</title></rect>' +
        '<text class="mc-lbl" x="' + cx.toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle">' + b.lab + "</text>";
    });
    return out + '</svg><p class="money-key"><span class="mk-inc"></span> Income <span class="mk-sav"></span> Saved</p>';
  }

  /* the part that updates while you type: summary, chart and savings goals */
  function live(y, m) {
    var key = SI.monthKey(y, m), st = monthStats(key), mo = M(), now = SI.today();
    var line = st.inc <= 0 && st.saved <= 0 ? "Add what came in this month and what you set aside, and the picture fills in."
      : st.inc > 0 ? "You set aside <b>" + Math.round(st.rate) + "%</b> of your income in " + SI.MONTHS[m] + "." + (st.rate >= 20 ? " That is a strong month." : st.saved <= 0 ? " Even a small amount counts." : "")
        : "You saved " + fmt(st.saved) + " this month.";
    var html = '<section class="card"><h2 class="card-title">' + SI.MONTHS[m] + " " + y + '</h2><div class="stats"><div><b>' + fmt(st.inc) + "</b><span>came in</span></div><div><b>" + fmt(st.saved) + "</b><span>set aside</span></div>" +
      "<div><b>" + (st.rate == null ? "—" : Math.round(st.rate) + "%") + "</b><span>of income saved</span></div></div><p class=\"small\">" + line + "</p>" + chart(y, m) + "</section>";
    var general = goalSaved("");
    var cards = mo.goals.map(function (g) {
      var saved = goalSaved(g.id), target = n(g.target), pct = target ? Math.min(100, Math.round(saved / target * 100)) : 0, left = Math.max(0, target - saved), msg = "";
      if (target && left <= 0) msg = "Goal reached. Well done!";
      else if (target) {
        var parts = [fmt(left) + " to go"], due = g.due ? SI.parseKey(g.due) : null;
        if (due) { var ml = monthsBetween(now, due); parts.push(ml > 0 ? fmt(left / ml) + " a month gets you there by " + SI.MONTHS_SHORT[due.getMonth()] + " " + due.getFullYear() : "target date has passed"); }
        var pace = recentPace(g.id, now);
        if (pace > 0) parts.push("at your recent pace, about " + Math.ceil(left / pace) + " months");
        msg = parts.join(" · ");
      }
      return '<article class="card goal-prog"><div class="goal-top"><b class="gp-name">' + esc(g.name || "Savings goal") + '</b><span class="gp-amt">' + fmt(saved) + (target ? " of " + fmt(target) : "") + '</span></div><div class="bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div><p class="small">' + esc(msg) + "</p></article>";
    }).join("");
    if (cards || general) html += '<div class="goal-grid money-goals">' + cards + (general ? '<article class="card goal-prog"><div class="goal-top"><b class="gp-name">General savings</b><span class="gp-amt">' + fmt(general) + '</span></div><p class="small">Savings not set against a particular goal.</p></article>' : "") + "</div>";
    return html;
  }

  /* ------------------------------------------------------------ the page */
  function dateDefault(y, m) {
    var t = SI.today();
    return t.getFullYear() === y && t.getMonth() === m ? SI.key(t) : SI.key(new Date(y, m, 1));
  }
  function row(path, e, cols, delKind) {
    return '<li class="money-row">' + cols.map(function (c) {
      var val = e[c[0]] == null ? "" : e[c[0]];
      if (c[2] === "select") return '<select class="field ' + c[3] + '" data-bind="' + path + ".@" + e.id + "." + c[0] + '" aria-label="' + c[1] + '">' + c[4]().map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === val ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>";
      return '<input class="field ' + c[3] + '" ' + (c[2] === "date" ? 'type="date"' : c[2] === "num" ? 'inputmode="decimal"' : 'maxlength="80"') + ' data-bind="' + path + ".@" + e.id + "." + c[0] + '" value="' + esc(val) + '" aria-label="' + c[1] + '"' + (c[5] ? ' placeholder="' + c[5] + '"' : "") + ">";
    }).join("") + '<button class="icon-btn del" data-act="money-del" data-k="' + delKind + '" data-id="' + e.id + '" aria-label="Delete">' + ic("trash") + "</button></li>";
  }
  function goalOptions() { return [["", "General savings"]].concat(M().goals.map(function (g) { return [g.id, g.name || "Savings goal"]; })); }

  function flowPage(args) {
    var t = SI.today(), mk = SI.parseMonthKey(args[1]) || { y: t.getFullYear(), m: t.getMonth() }, y = mk.y, m = mk.m, st = monthStats(SI.monthKey(y, m)), mo = M();
    var prev = addMonths(y, m, -1), next = addMonths(y, m, 1), c = SI.moneyCur();
    var nav = '<a class="round" href="#/money/flow/' + SI.monthKey(prev.y, prev.m) + '" aria-label="Previous month">' + ic("left") + '</a><span class="step-label">' + SI.MONTHS_SHORT[m] + " " + y + '</span><a class="round" href="#/money/flow/' + SI.monthKey(next.y, next.m) + '" aria-label="Next month">' + ic("right") + "</a>" +
      (t.getFullYear() === y && t.getMonth() === m ? "" : '<a class="pill-link" href="#/money/flow">This month</a>');
    var head = '<div class="head"><div class="head-text"><p class="eyebrow">Money · income &amp; savings</p><h1>What came in, what I kept</h1><p class="sub">Log income and savings as they happen. The month shows how much you set aside.</p></div><div class="head-nav">' + SI.moneySeg("flow") + nav + "</div></div>";
    var dd = dateDefault(y, m);
    var incomeCard = '<section class="card"><h2 class="card-title">Income in ' + SI.MONTHS[m] + '</h2>' +
      (st.incList.length ? '<ul class="money-list">' + st.incList.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (e) { return row("money.income", e, [["date", "Date", "date", "m-date"], ["src", "Source", "text", "m-text", null, "Source"], ["amt", "Amount (" + c + ")", "num", "m-amt", null, "Amount"]], "income"); }).join("") + "</ul>" : '<p class="empty">Nothing logged for this month yet.</p>') +
      '<div class="money-add"><input class="field m-date" type="date" id="mi-date" value="' + dd + '" aria-label="Date"><input class="field m-text" id="mi-src" maxlength="80" placeholder="Source (e.g. Salary)" aria-label="Source"><input class="field m-amt" id="mi-amt" inputmode="decimal" placeholder="Amount (' + esc(c) + ')" aria-label="Amount"><button class="btn" data-act="money-income-add">' + ic("plus") + "Add income</button></div></section>";
    var savingsCard = '<section class="card"><h2 class="card-title">Set aside in ' + SI.MONTHS[m] + '</h2>' +
      (st.depList.length ? '<ul class="money-list">' + st.depList.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (e) { return row("money.deposits", e, [["date", "Date", "date", "m-date"], ["goal", "Savings goal", "select", "m-goal", goalOptions], ["amt", "Amount (" + c + ")", "num", "m-amt", null, "Amount"], ["note", "Note", "text", "m-text", null, "Note"]], "deposit"); }).join("") + "</ul>" : '<p class="empty">Nothing set aside this month yet.</p>') +
      '<div class="money-add"><input class="field m-date" type="date" id="ms-date" value="' + dd + '" aria-label="Date"><select class="field m-goal" id="ms-goal" aria-label="Savings goal">' + goalOptions().map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + "</option>"; }).join("") + '</select><input class="field m-amt" id="ms-amt" inputmode="decimal" placeholder="Amount (' + esc(c) + ')" aria-label="Amount"><input class="field m-text" id="ms-note" maxlength="80" placeholder="Note (optional)" aria-label="Note"><button class="btn" data-act="money-save-add">' + ic("plus") + "Add savings</button></div></section>";
    var goalsCard = '<section class="card"><h2 class="card-title">My savings goals</h2>' +
      (mo.goals.length ? '<ul class="money-list">' + mo.goals.map(function (g) { return row("money.goals", g, [["name", "Goal name", "text", "m-text", null, "Goal name"], ["target", "Target (" + c + ")", "num", "m-amt", null, "Target"], ["due", "Target date", "date", "m-date"]], "goal"); }).join("") + "</ul>" : '<p class="empty">Name something you are saving for, like a holiday or a safety cushion.</p>') +
      '<div class="money-add"><input class="field m-text" id="mg-name" maxlength="80" placeholder="Goal name (e.g. Holiday fund)" aria-label="Goal name"><input class="field m-amt" id="mg-target" inputmode="decimal" placeholder="Target (' + esc(c) + ')" aria-label="Target amount"><input class="field m-date" type="date" id="mg-due" aria-label="Target date (optional)"><button class="btn" data-act="money-goal-add">' + ic("plus") + "Add goal</button></div>" +
      '<p class="small">The target date is optional. With one, you will see how much to save each month.</p></section>';
    return head + '<div id="money-live">' + live(y, m) + '</div><div class="money-cols">' + incomeCard + savingsCard + "</div>" + goalsCard;
  }

  /* update the summary while someone types in an amount, without redrawing the page */
  var prev = SI.afterBind;
  SI.afterBind = function (path, el) {
    if (prev) prev(path, el);
    if (!/^money\./.test(path)) return;
    var box = document.getElementById("money-live");
    if (!box) return;
    var t = SI.today(), r = /^#\/money\/flow\/(\d{4}-\d{2})/.exec(window.location.hash), mk = r ? SI.parseMonthKey(r[1]) : null;
    box.innerHTML = live(mk ? mk.y : t.getFullYear(), mk ? mk.m : t.getMonth());
  };

  /* ------------------------------------------------------------ actions */
  var A = SI.actions;
  function val(id) { var e = document.getElementById(id); return e ? e.value : ""; }
  function dateOk(v) { return SI.parseKey(v) ? v : ""; }
  function need(msg, id) { SI.toast(msg); var e = document.getElementById(id); if (e) e.focus(); }
  A["money-income-add"] = function () {
    var amt = n(val("mi-amt")), d = dateOk(val("mi-date"));
    if (!amt) return need("Add the amount that came in.", "mi-amt");
    if (!d) return need("Pick a date.", "mi-date");
    M().income.push({ id: SI.uid(), date: d, src: val("mi-src").trim().slice(0, 80), amt: String(amt) });
    SI.save(); SI.render(); SI.toast("Income added.");
  };
  A["money-save-add"] = function () {
    var amt = n(val("ms-amt")), d = dateOk(val("ms-date")), g = val("ms-goal");
    if (!amt) return need("Add the amount you set aside.", "ms-amt");
    if (!d) return need("Pick a date.", "ms-date");
    if (g && !M().goals.some(function (x) { return x.id === g; })) g = "";
    M().deposits.push({ id: SI.uid(), date: d, goal: g, amt: String(amt), note: val("ms-note").trim().slice(0, 80) });
    SI.save(); SI.render(); SI.toast("Saved. Nicely done.");
  };
  A["money-goal-add"] = function () {
    var name = val("mg-name").trim();
    if (!name) return need("Give the goal a name.", "mg-name");
    M().goals.push({ id: SI.uid(), name: name.slice(0, 80), target: String(n(val("mg-target")) || ""), due: dateOk(val("mg-due")) });
    SI.save(); SI.render();
  };
  A["money-del"] = function (el) {
    var m = M(), kind = el.dataset.k, list = kind === "income" ? m.income : kind === "deposit" ? m.deposits : kind === "goal" ? m.goals : null;
    if (!list) return;
    var i = list.findIndex(function (x) { return x.id === el.dataset.id; });
    if (i < 0) return;
    if (kind === "goal") {
      if (!window.confirm("Delete this goal? What you already saved stays under “General savings”.")) return;
      var gid = list[i].id; m.deposits.forEach(function (d) { if (d.goal === gid) d.goal = ""; });
    }
    list.splice(i, 1); SI.save(); SI.render();
  };
})();
