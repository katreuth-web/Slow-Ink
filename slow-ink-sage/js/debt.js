/* Slow Ink Sage — Debt payoff: list what you owe, pick a plan (avalanche or snowball), see your
   debt-free date and the interest you'd save. Plus a calculator with money shortcuts.
   The plan is worked out month by month, right here on the device. */
(function () {
  "use strict";
  var SI = window.SI, esc = SI.esc, ic = SI.ic;
  var CURRENCIES = ["$", "£", "€", "¥", "₹", "A$", "C$", "R$", "kr", "₩"];
  var MAX_MONTHS = 600;

  /* ------------------------------------------------------------ data */
  function D() {
    var s = SI.state;
    if (!s.debt || typeof s.debt !== "object" || Array.isArray(s.debt)) s.debt = {};
    var d = s.debt;
    if (!Array.isArray(d.items)) d.items = [];
    if (d.method !== "snowball") d.method = "avalanche";
    if (d.extra == null) d.extra = "";
    if (CURRENCIES.indexOf(d.cur) < 0) d.cur = "$";
    return d;
  }
  function n(v) { var x = parseFloat(v); return isFinite(x) && x > 0 ? x : 0; }
  function cur() { return D().cur; }
  function money(v, dp) {
    var neg = v < 0, a = Math.abs(v);
    return (neg ? "−" : "") + cur() + a.toLocaleString(undefined, { minimumFractionDigits: dp == null ? 0 : dp, maximumFractionDigits: dp == null ? 0 : dp });
  }
  function monthsLabel(m) {
    var y = Math.floor(m / 12), r = m % 12, out = [];
    if (y) out.push(y + (y === 1 ? " year" : " years"));
    if (r || !y) out.push(r + (r === 1 ? " month" : " months"));
    return out.join(" ");
  }
  function when(monthsAhead) {
    var t = new Date(); t = new Date(t.getFullYear(), t.getMonth() + monthsAhead, 1);
    return t.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }
  function active() {
    return D().items.map(function (it) { return { id: it.id, name: it.name || "Unnamed debt", bal: n(it.bal), apr: n(it.apr), min: n(it.min) }; }).filter(function (d) { return d.bal > 0.005; });
  }

  /* ------------------------------------------------------------ the plan, month by month */
  /* rollover: when one debt is cleared its payment moves on to the next (that is the "snowball"). */
  function simulate(debts, extra, method, rollover) {
    var ds = debts.map(function (d) { return { id: d.id, name: d.name, bal: d.bal, apr: d.apr, min: d.min, done: false }; });
    var start = ds.reduce(function (s, d) { return s + d.bal; }, 0);
    var budget = ds.reduce(function (s, d) { return s + d.min; }, 0) + extra;
    var out = { months: 0, interest: 0, paid: 0, order: [], series: [start], never: false, first: null };
    if (!ds.length) return out;
    while (out.months < MAX_MONTHS && ds.some(function (d) { return !d.done; })) {
      out.months++;
      var live = ds.filter(function (d) { return !d.done; }), spent = 0, total;
      live.forEach(function (d) { var i = d.bal * d.apr / 1200; d.bal += i; out.interest += i; });
      live.forEach(function (d) { var p = Math.min(d.min, d.bal); d.bal -= p; spent += p; out.paid += p; });
      var rest = rollover ? Math.max(0, budget - spent) : 0;
      live.slice().sort(function (a, b) { return method === "snowball" ? a.bal - b.bal : (b.apr - a.apr) || (a.bal - b.bal); }).forEach(function (d) {
        if (rest <= 0 || d.bal <= 0.005) return;
        var p = Math.min(rest, d.bal); d.bal -= p; rest -= p; out.paid += p;
      });
      live.forEach(function (d) { if (d.bal <= 0.005 && !d.done) { d.done = true; d.bal = 0; out.order.push({ id: d.id, name: d.name, month: out.months }); } });
      total = ds.reduce(function (s, d) { return s + d.bal; }, 0);
      out.series.push(total);
      if (total > start * 20) break;   /* growing out of control: stop early */
    }
    out.never = ds.some(function (d) { return !d.done; });
    out.first = out.order.length ? out.order[0].month : null;
    return out;
  }
  SI.debtSimulate = simulate;

  /* ------------------------------------------------------------ the page */
  function chart(plan, base) {
    var W = 600, H = 200, padL = 8, padR = 8, padT = 10, padB = 22;
    var len = Math.max(plan.series.length, base.never ? 1 : base.series.length, 2), top = Math.max.apply(null, plan.series.concat(base.never ? [] : base.series)) || 1;
    function path(series) {
      return series.map(function (v, i) { return (i ? "L" : "M") + (padL + (W - padL - padR) * i / (len - 1)).toFixed(1) + "," + (padT + (H - padT - padB) * (1 - v / top)).toFixed(1); }).join("");
    }
    return '<svg class="debt-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Total debt over time: with your plan it reaches zero in ' + esc(monthsLabel(plan.months)) + (base.never ? "" : ", with minimum payments only in " + esc(monthsLabel(base.months))) + '">' +
      '<line class="dc-axis" x1="' + padL + '" y1="' + (H - padB) + '" x2="' + (W - padR) + '" y2="' + (H - padB) + '"/>' +
      (base.never ? "" : '<path class="dc-base" d="' + path(base.series) + '"/>') + '<path class="dc-plan" d="' + path(plan.series) + '"/>' +
      '<text class="dc-lbl" x="' + padL + '" y="' + (H - 5) + '">Now</text><text class="dc-lbl" x="' + (W - padR) + '" y="' + (H - 5) + '" text-anchor="end">' + esc(when(len - 1)) + "</text></svg>" +
      '<p class="debt-key"><span class="k-plan"></span> Your plan' + (base.never ? "" : ' <span class="k-base"></span> Minimums only') + "</p>";
  }

  function results() {
    var d = D(), debts = active();
    if (!debts.length) return "";
    var extra = n(d.extra), other = d.method === "snowball" ? "avalanche" : "snowball";
    var plan = simulate(debts, extra, d.method, true), base = simulate(debts, 0, d.method, false), alt = simulate(debts, extra, other, true);
    var warn = debts.filter(function (x) { return x.min < x.bal * x.apr / 1200 - 0.005; });
    var html = "";
    if (plan.never) {
      html += '<section class="card debt-warn"><h2 class="card-title">This plan doesn’t reach zero yet</h2><p>With these payments the debts aren’t cleared within 50 years. ' +
        (warn.length ? "The interest on " + warn.map(function (x) { return "<b>" + esc(x.name) + "</b> (" + money(x.bal * x.apr / 1200, 2) + " a month)"; }).join(", ") + " is higher than what you pay on it, so it keeps growing. " : "") +
        "Try a little more each month in “Extra each month” or check the minimum payments.</p></section>";
      return html;
    }
    var sooner = base.never ? null : base.months - plan.months, saved = base.never ? null : base.interest - plan.interest;
    html += '<section class="card"><h2 class="card-title">Your debt-free date</h2><div class="stats debt-stats"><div><b>' + esc(when(plan.months)) + "</b><span>" + esc(monthsLabel(plan.months)) + " from now</span></div>" +
      "<div><b>" + money(plan.interest) + "</b><span>total interest</span></div><div><b>" + money(plan.paid) + "</b><span>total you’ll pay</span></div></div>" +
      '<ul class="debt-notes">' +
      (base.never ? "<li>If you only paid the minimums, some debts would never be cleared. Your plan fixes that.</li>"
        : sooner > 0 || saved > 1 ? "<li>That is <b>" + monthsLabel(Math.max(0, sooner)) + " sooner</b> and <b>" + money(Math.max(0, saved)) + " less interest</b> than paying only the minimums.</li>" : "<li>Add an amount in “Extra each month” to see how much sooner you could be free.</li>") +
      (extra > 0 && plan.first ? "<li>Your first debt (<b>" + esc(plan.order[0].name) + "</b>) is cleared in " + monthsLabel(plan.first) + ".</li>" : "") + "</ul>" +
      chart(plan, base) + "</section>";
    html += '<section class="card"><h2 class="card-title">Order they’re paid off</h2><ol class="debt-order">' + plan.order.map(function (o) {
      return "<li><b>" + esc(o.name) + "</b><span>" + esc(when(o.month)) + " · month " + o.month + "</span></li>";
    }).join("") + "</ol></section>";
    var A = d.method === "avalanche" ? plan : alt, Sn = d.method === "avalanche" ? alt : plan;
    html += '<section class="card"><h2 class="card-title">Avalanche or snowball?</h2><div class="debt-cmp"><div' + (d.method === "avalanche" ? ' class="on"' : "") + "><b>Avalanche</b><small>highest interest first</small><span>" + esc(when(A.months)) + "</span><span>" + money(A.interest) + " interest</span></div>" +
      "<div" + (d.method === "snowball" ? ' class="on"' : "") + "><b>Snowball</b><small>smallest balance first</small><span>" + esc(when(Sn.months)) + "</span><span>" + money(Sn.interest) + " interest</span></div></div>" +
      '<p class="small">' + (Math.abs(A.interest - Sn.interest) < 1 ? "For your debts the two plans come out almost the same, so pick the one that feels better." : "Avalanche costs less in interest" + (Sn.first != null && A.first != null && Sn.first < A.first ? ", but snowball clears your first debt " + monthsLabel(A.first - Sn.first) + " sooner, which many people find motivating" : "") + ". The best plan is the one you will stick with.") + "</p></section>";
    return html;
  }

  function debtRow(it) {
    var p = "debt.items.@" + it.id, start = Math.max(n(it.start), n(it.bal)), paid = start ? Math.round((start - n(it.bal)) / start * 100) : 0, c = cur();
    return '<article class="card debt-card"><div class="goal-top"><input class="goal-title" data-bind="' + p + '.name" value="' + esc(it.name) + '" maxlength="60" aria-label="Debt name" placeholder="Name this debt">' +
      '<button class="icon-btn del" data-act="debt-del" data-id="' + it.id + '" aria-label="Delete debt" title="Delete debt">' + ic("trash") + "</button></div>" +
      '<div class="debt-fields"><label><span>Balance now (' + esc(c) + ')</span><input class="field" inputmode="decimal" data-bind="' + p + '.bal" value="' + esc(it.bal) + '" aria-label="Balance now"></label>' +
      '<label><span>Interest % a year</span><input class="field" inputmode="decimal" data-bind="' + p + '.apr" value="' + esc(it.apr) + '" aria-label="Interest rate"></label>' +
      '<label><span>Minimum a month (' + esc(c) + ')</span><input class="field" inputmode="decimal" data-bind="' + p + '.min" value="' + esc(it.min) + '" aria-label="Minimum payment"></label>' +
      '<label><span>Started at (' + esc(c) + ')</span><input class="field" inputmode="decimal" data-bind="' + p + '.start" value="' + esc(it.start) + '" aria-label="Starting balance"></label></div>' +
      '<div class="bar" role="progressbar" aria-valuenow="' + paid + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + paid + '%"></i></div><p class="small" data-paid="' + it.id + '">' + paid + "% paid off · " + money(Math.max(0, start - n(it.bal))) + " of " + money(start) + "</p>" +
      '<div class="add-row"><input class="add-input" inputmode="decimal" data-pay="' + it.id + '" placeholder="Log a payment…" aria-label="Payment amount"><button class="btn sm" data-act="debt-pay" data-id="' + it.id + '">Log payment</button></div></article>';
  }

  SI.views.debt = function (args) {
    var d = D(), tab = args && args[0] === "calc" ? "calc" : "plan";
    var tabs = '<div class="seg" role="tablist"><a role="tab" class="' + (tab === "plan" ? "on" : "") + '" href="#/debt">Payoff plan</a><a role="tab" class="' + (tab === "calc" ? "on" : "") + '" href="#/debt/calc">Calculator</a></div>';
    var head = '<div class="head"><div class="head-text"><p class="eyebrow">Debt payoff</p><h1>' + (tab === "calc" ? "Money calculator" : "Becoming debt-free") + '</h1><p class="sub">' +
      (tab === "calc" ? "Quick sums, plus tip, sale, savings and loan shortcuts." : "List what you owe, pick a plan, and watch the date come closer.") + '</p></div><div class="head-nav">' + tabs + "</div></div>";
    if (tab === "calc") return head + '<section class="card calc-card">' + (window.SlowCalc ? SlowCalc.html() : "") + "</section>";
    var items = d.items.map(debtRow).join("");
    var total = d.items.reduce(function (s, it) { return s + n(it.bal); }, 0), startTotal = d.items.reduce(function (s, it) { return s + Math.max(n(it.start), n(it.bal)); }, 0);
    var progress = startTotal ? Math.round((startTotal - total) / startTotal * 100) : 0;
    var add = '<section class="card"><h2 class="card-title">Add a debt</h2><div class="debt-add"><input class="field" id="debt-name" maxlength="60" placeholder="e.g. Credit card" aria-label="Debt name">' +
      '<input class="field" id="debt-bal" inputmode="decimal" placeholder="Balance" aria-label="Balance"><input class="field" id="debt-apr" inputmode="decimal" placeholder="Interest %" aria-label="Interest rate a year"><input class="field" id="debt-min" inputmode="decimal" placeholder="Minimum a month" aria-label="Minimum payment a month">' +
      '<button class="btn" data-act="debt-add">' + ic("plus") + "Add debt</button></div><p class=\"small\">Interest is the yearly rate (APR) shown on your statement. The minimum is what you must pay each month.</p></section>";
    var planCard = '<section class="card"><h2 class="card-title">My plan</h2><div class="seg debt-method" role="group" aria-label="Plan type"><button data-act="debt-method" data-v="avalanche" class="' + (d.method === "avalanche" ? "on" : "") + '" aria-pressed="' + (d.method === "avalanche") + '">Avalanche</button><button data-act="debt-method" data-v="snowball" class="' + (d.method === "snowball" ? "on" : "") + '" aria-pressed="' + (d.method === "snowball") + '">Snowball</button></div>' +
      '<p class="small">' + (d.method === "avalanche" ? "Avalanche: extra money goes to the debt with the highest interest first. It usually costs the least." : "Snowball: extra money goes to the smallest balance first. Quick wins keep many people going.") + "</p>" +
      '<div class="debt-plan-fields"><label><span>Extra each month (' + esc(d.cur) + ')</span><input class="field" inputmode="decimal" data-bind="debt.extra" value="' + esc(d.extra) + '" placeholder="0" aria-label="Extra each month"></label>' +
      '<label><span>Currency</span><select class="field" data-bind="debt.cur" aria-label="Currency">' + CURRENCIES.map(function (c) { return "<option" + (c === d.cur ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select></label></div></section>";
    var summary = items ? '<section class="card"><h2 class="card-title">Where I am</h2><div class="stats"><div><b data-total>' + money(total) + "</b><span>still owed</span></div><div><b>" + progress + "%</b><span>paid off so far</span></div></div><div class=\"bar\"><i style=\"width:" + progress + '%"></i></div></section>' : "";
    return head + (items ? summary + '<div class="goal-grid debt-grid">' + items + "</div>" : '<section class="card"><p class="empty">Add the debts you’d like to clear. Even one is a good start — the plan updates as you type.</p></section>') + add + (items ? planCard + '<div id="debt-results">' + results() + "</div>" : "");
  };

  /* update the numbers without redrawing the page while someone is typing */
  var prev = SI.afterBind;
  SI.afterBind = function (path, el) {
    if (prev) prev(path, el);
    if (!/^debt\./.test(path)) return;
    var r = document.getElementById("debt-results");
    if (r) r.innerHTML = results();
    var m = /^debt\.items\.@([^.]+)\./.exec(path);
    if (m) {
      var it = D().items.filter(function (x) { return x.id === m[1]; })[0], p = document.querySelector('[data-paid="' + m[1] + '"]');
      if (it && p) { var start = Math.max(n(it.start), n(it.bal)), paid = start ? Math.round((start - n(it.bal)) / start * 100) : 0; p.textContent = paid + "% paid off · " + money(Math.max(0, start - n(it.bal))) + " of " + money(start); var bar = p.previousElementSibling; if (bar && bar.firstElementChild) bar.firstElementChild.style.width = paid + "%"; }
      var tot = document.querySelector("[data-total]"); if (tot) tot.textContent = money(D().items.reduce(function (s, x) { return s + n(x.bal); }, 0));
    }
  };

  SI.after.debt = function (args) { if (window.SlowCalc && args && args[0] === "calc") SlowCalc.mount(document.getElementById("view"), { currency: D().cur }); };

  /* ------------------------------------------------------------ actions */
  var A = SI.actions;
  function field(id) { var el = document.getElementById(id); return el ? el.value : ""; }
  A["debt-add"] = function () {
    var name = field("debt-name").trim(), bal = n(field("debt-bal"));
    if (!name || !bal) { SI.toast("Add a name and the balance you owe."); var f = document.getElementById(name ? "debt-bal" : "debt-name"); if (f) f.focus(); return; }
    D().items.push({ id: SI.uid(), name: name.slice(0, 60), bal: String(bal), start: String(bal), apr: String(n(field("debt-apr"))), min: String(n(field("debt-min"))) });
    SI.save(); SI.render(); SI.toast("Added. Now choose a plan below.");
  };
  A["debt-del"] = function (el) {
    var d = D(), i = d.items.findIndex(function (x) { return x.id === el.dataset.id; });
    if (i < 0 || !window.confirm("Delete “" + (d.items[i].name || "this debt") + "”?")) return;
    d.items.splice(i, 1); SI.save(); SI.render();
  };
  A["debt-method"] = function (el) { D().method = el.dataset.v === "snowball" ? "snowball" : "avalanche"; SI.save(); SI.render(); };
  A["debt-pay"] = function (el) {
    var it = D().items.filter(function (x) { return x.id === el.dataset.id; })[0], inp = document.querySelector('[data-pay="' + el.dataset.id + '"]'), amt = n(inp && inp.value);
    if (!it) return;
    if (!amt) { SI.toast("Type the amount you paid."); if (inp) inp.focus(); return; }
    var left = Math.max(0, Math.round((n(it.bal) - amt) * 100) / 100);
    it.bal = String(left); SI.save(); SI.render();
    SI.toast(left === 0 ? "That’s one debt cleared. Well done!" : "Nice. " + money(amt, 2) + " off — " + money(left, 2) + " to go.");
  };
})();
