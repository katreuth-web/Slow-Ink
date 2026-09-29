/* Aura — wellness & lifestyle: habits, finances, meals & recipes, fitness. */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic;

  /* ------------------------------------------------------------ habits */
  function bestStreak(hid) {
    var keys = Object.keys(A.state.habitLog).filter(function (k) { return A.state.habitLog[k][hid]; }).sort();
    var best = 0, run = 0, prev = null;
    keys.forEach(function (k) {
      var d = A.parseD(k);
      run = prev && A.ymd(A.addDays(prev, 1)) === k ? run + 1 : 1;
      best = Math.max(best, run); prev = d;
    });
    return best;
  }
  A.views.habits = function () {
    var t = A.today(), y = t.getFullYear(), m = t.getMonth(), dates = [];
    for (var d = 1; d <= A.daysIn(y, m); d++) dates.push(new Date(y, m, d));
    var hs = A.state.habits;
    var list = '<ul class="list">' + hs.map(function (h, i) {
      var hits = dates.filter(function (x) { return x <= t && (A.state.habitLog[A.ymd(x)] || {})[h.id]; }).length;
      return '<li class="li"><button class="swatch" style="background:' + h.color + '" data-act="habit-color" data-i="' + i + '" aria-label="Change colour"></button>' + A.input("habits." + i + ".name", "", "bare") +
        '<span class="badge" title="This month">' + Math.round(hits / t.getDate() * 100) + '%</span><span class="badge pink" title="Current streak">🔥 ' + A.streak(h.id) + '</span><span class="badge grey" title="Best streak">best ' + bestStreak(h.id) + "</span>" +
        '<button class="x-btn" data-act="habit-del" data-i="' + i + '" aria-label="Delete habit">' + ic("trash") + "</button></li>";
    }).join("") + "</ul>" +
      '<div class="add-row"><input class="field" id="habit-new" placeholder="New habit, e.g. 10k steps" data-enter="habit-add" /><button class="btn sm soft" data-act="habit-add">' + ic("plus") + "</button></div>";
    var todayLog = A.state.habitLog[A.todayKey()] || {};
    var todayChecks = '<div class="checks">' + hs.map(function (h) {
      var on = !!todayLog[h.id];
      return '<button class="check-pill" style="' + (on ? "background:" + h.color + ";color:#fff;border-color:transparent" : "") + '" data-act="habit-toggle-re" data-k="' + A.todayKey() + '" data-h="' + h.id + '">' + (on ? "✓ " : "○ ") + esc(h.name) + "</button>";
    }).join("") + "</div>";
    return A.head("Wellness", 'Habit <span class="soft">tracker</span>', "Small things, done often. Tap squares to check off any day.") +
      '<div class="grid">' +
      '<div class="c7">' + A.card("Your habits", list, { icon: "list" }) + "</div>" +
      '<div class="c5">' + A.card("Today", todayChecks || '<div class="empty">Add a habit to begin.</div>', { icon: "sun", tone: "butter", tint: "grad" }) + "</div>" +
      '<div class="c12">' + A.card(A.MONTHS[m] + " grid", A.habitGrid(dates, { streak: true }), { icon: "grid", tone: "pink" }) + "</div></div>";
  };
  A.acts["habit-add"] = function () {
    var inp = document.getElementById("habit-new"), name = inp.value.trim();
    if (!name) { inp.focus(); return; }
    A.state.habits.push({ id: A.uid(), name: name, color: A.PALETTE[A.state.habits.length % A.PALETTE.length] });
    A.save(); A.render(); document.getElementById("habit-new").focus();
  };
  A.acts["habit-del"] = function (el) {
    var i = +el.getAttribute("data-i");
    if (!confirm("Delete “" + A.state.habits[i].name + "” and its history?")) return;
    var id = A.state.habits[i].id;
    A.state.habits.splice(i, 1);
    Object.keys(A.state.habitLog).forEach(function (k) { delete A.state.habitLog[k][id]; });
    A.save(); A.render();
  };
  A.acts["habit-color"] = function (el) {
    var h = A.state.habits[+el.getAttribute("data-i")];
    h.color = A.PALETTE[(A.PALETTE.indexOf(h.color) + 1) % A.PALETTE.length];
    A.save(); A.render();
  };
  A.acts["habit-toggle-re"] = function (el) { A.acts["habit-toggle"](el); A.render(); };

  /* ------------------------------------------------------------ finance */
  function finMonth(key) {
    var f = A.state.finance.months;
    if (!f[key]) f[key] = { income: [], expenses: [], budget: {} };
    return f[key];
  }
  function donut(parts, size) {
    var total = parts.reduce(function (s, p) { return s + p.v; }, 0);
    size = size || 170;
    var r = size / 2 - 14, c = 2 * Math.PI * r, off = 0, cx = size / 2;
    var s = '<svg viewBox="0 0 ' + size + " " + size + '" role="img" aria-label="Spending by category"><circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="rgba(155,123,255,.12)" stroke-width="22"/>';
    if (total > 0) parts.forEach(function (p) {
      var len = p.v / total * c;
      s += '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + p.c + '" stroke-width="22" stroke-dasharray="' + Math.max(0, len - 2).toFixed(1) + " " + c.toFixed(1) + '" stroke-dashoffset="' + (-off).toFixed(1) + '" transform="rotate(-90 ' + cx + " " + cx + ')"/>';
      off += len;
    });
    return s + '<text x="' + cx + '" y="' + (cx - 4) + '" text-anchor="middle" font-size="18" font-weight="600" fill="#2e2a3b">' + A.money(total) + '</text><text x="' + cx + '" y="' + (cx + 14) + '" text-anchor="middle" font-size="10" fill="#847d99">spent</text></svg>';
  }
  A.views.finance = function () {
    var key = A.state.ui.finMonth || A.ym(A.today()), fm = finMonth(key), F = A.state.finance, cats = F.categories;
    var d0 = A.parseD(key), label = A.MONTHS[d0.getMonth()] + " " + d0.getFullYear();
    var income = fm.income.reduce(function (s, x) { return s + A.num(x.amt); }, 0);
    var byCat = {};
    fm.expenses.forEach(function (x) { byCat[x.cat || "Other"] = (byCat[x.cat || "Other"] || 0) + A.num(x.amt); });
    var spent = Object.keys(byCat).reduce(function (s, c) { return s + byCat[c]; }, 0);
    var budgetTotal = cats.reduce(function (s, c) { return s + A.num(fm.budget[c]); }, 0);
    var parts = cats.map(function (c, i) { return { k: c, v: byCat[c] || 0, c: A.PALETTE[i % A.PALETTE.length] }; }).filter(function (p) { return p.v > 0; });
    var p = "finance.months." + key;

    var incomeRows = fm.income.map(function (x, i) {
      return "<tr><td>" + A.input(p + ".income." + i + ".name", 'placeholder="Source"') + '</td><td style="width:120px">' + A.input(p + ".income." + i + ".amt", 'type="number" step="0.01" data-num placeholder="0"') + '</td><td style="width:34px"><button class="x-btn" data-act="list-remove" data-list="' + p + '.income" data-idx="' + i + '" aria-label="Remove">' + ic("x") + "</button></td></tr>";
    }).join("");
    var expRows = fm.expenses.slice().map(function (x, i) { return { x: x, i: i }; }).sort(function (a, b) { return (b.x.date || "").localeCompare(a.x.date || ""); }).map(function (o) {
      var x = o.x, i = o.i;
      return '<tr><td style="width:140px"><input class="field" type="date" data-bind="' + p + ".expenses." + i + '.date" value="' + esc(x.date) + '" /></td><td>' + A.input(p + ".expenses." + i + ".name", 'placeholder="What"') +
        '</td><td style="width:150px"><select class="field" data-bind="' + p + ".expenses." + i + '.cat">' + cats.map(function (c) { return "<option" + (c === x.cat ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select></td>" +
        '<td style="width:110px">' + A.input(p + ".expenses." + i + ".amt", 'type="number" step="0.01" data-num data-rerender placeholder="0"') + '</td><td style="width:34px"><button class="x-btn" data-act="list-remove" data-list="' + p + '.expenses" data-idx="' + i + '" aria-label="Remove">' + ic("x") + "</button></td></tr>";
    }).join("");

    var budgets = cats.map(function (c, i) {
      var b = A.num(fm.budget[c]), s = byCat[c] || 0;
      return '<div class="budget-row"><span class="row"><i class="swatch" style="background:' + A.PALETTE[i % A.PALETTE.length] + ';width:10px;height:10px;border:0"></i>' + esc(c) + ' <span class="small muted">' + A.money(s) + (b ? " / " + A.money(b) : "") + "</span></span>" +
        '<input class="field" type="number" step="1" data-num data-rerender data-bind="' + p + ".budget." + esc(c) + '" value="' + (fm.budget[c] || "") + '" placeholder="Budget" style="padding:5px 8px" />' + A.bar(b ? s / b : 0, b && s > b) + "</div>";
    }).join("");

    var savings = F.savings.map(function (s, i) {
      var pct = A.num(s.target) ? A.num(s.saved) / A.num(s.target) : 0;
      return '<li class="li">' + A.ring(pct, 46, null, 5) + '<div class="grow">' + A.input("finance.savings." + i + ".name", 'placeholder="Goal"', "bare") +
        '<div class="row small muted">saved ' + A.input("finance.savings." + i + ".saved", 'type="number" data-num data-rerender style="width:90px;padding:3px 6px"') + " of " + A.input("finance.savings." + i + ".target", 'type="number" data-num data-rerender style="width:90px;padding:3px 6px"') + "</div></div>" +
        '<button class="x-btn" data-act="list-remove" data-list="finance.savings" data-idx="' + i + '" aria-label="Remove">' + ic("x") + "</button></li>";
    }).join("");

    return A.head("Wellness · money", 'Finances <span class="soft">& budget</span>', "", '<div class="pager"><button class="icon-btn" data-act="fin-step" data-v="-1" aria-label="Previous month">' + ic("chevL") + '</button><b style="min-width:130px;text-align:center">' + label + '</b><button class="icon-btn" data-act="fin-step" data-v="1" aria-label="Next month">' + ic("chevR") + "</button></div>") +
      '<div class="grid">' +
      '<div class="c12">' + A.card("", '<div class="stats">' +
        '<div class="inner stat"><b>' + A.money(income) + "</b><span>income</span></div>" +
        '<div class="inner stat"><b>' + A.money(spent) + "</b><span>spent</span></div>" +
        '<div class="inner stat"><b>' + A.money(income - spent) + "</b><span>left over</span></div>" +
        '<div class="inner stat"><b>' + (income ? Math.round((income - spent) / income * 100) : 0) + "%</b><span>savings rate</span></div>" +
        '<div class="inner stat"><b>' + (budgetTotal ? A.money(budgetTotal) : "—") + "</b><span>budgeted</span></div></div>", { tint: "grad" }) + "</div>" +
      '<div class="c5 stack">' +
        A.card("Spending breakdown", '<div class="donut-wrap">' + donut(parts) + '<div class="legend">' + (parts.length ? parts.map(function (x) { return "<div><i style=\"background:" + x.c + '"></i><span>' + esc(x.k) + "</span><b>" + A.money(x.v) + "</b></div>"; }).join("") : '<span class="muted small">Log an expense to see the breakdown.</span>') + "</div></div>", { icon: "wallet" }) +
        A.card("Income", '<div class="scroll-x"><table class="table">' + incomeRows + "</table></div>" + '<button class="btn sm soft" data-act="fin-add-income">' + ic("plus") + "Add income</button>", { icon: "download", tone: "mint" }) +
        A.card("Savings goals", (savings ? '<ul class="list">' + savings + "</ul>" : '<div class="empty">Emergency fund, trip, new laptop…</div>') + '<button class="btn sm soft" style="margin-top:8px" data-act="fin-add-saving">' + ic("plus") + "Add goal</button>", { icon: "target", tone: "pink" }) +
      "</div>" +
      '<div class="c7 stack">' +
        A.card("Expenses", '<div class="scroll-x"><table class="table">' + (expRows ? "<tr><th>Date</th><th>Item</th><th>Category</th><th>Amount</th><th></th></tr>" + expRows : "") + "</table></div>" + (expRows ? "" : '<div class="empty" style="margin-bottom:8px">No expenses this month.</div>') + '<button class="btn sm soft" data-act="fin-add-expense">' + ic("plus") + "Add expense</button>", { icon: "cart", tone: "sky" }) +
        A.card("Budget by category", budgets, { icon: "list", tone: "butter", tools: '<button class="btn xs ghost" data-act="fin-copy-budget">Copy last month</button>' }) +
      "</div></div>";
  };
  A.acts["fin-step"] = function (el) {
    var d = A.parseD(A.state.ui.finMonth || A.ym(A.today()));
    A.state.ui.finMonth = A.ym(new Date(d.getFullYear(), d.getMonth() + +el.getAttribute("data-v"), 1));
    A.save(); A.render();
  };
  function curFin() { return finMonth(A.state.ui.finMonth || A.ym(A.today())); }
  A.acts["fin-add-income"] = function () { curFin().income.push({ id: A.uid(), name: "", amt: "" }); A.save(); A.render(); };
  A.acts["fin-add-expense"] = function () {
    var key = A.state.ui.finMonth || A.ym(A.today()), t = A.today();
    var date = key === A.ym(t) ? A.ymd(t) : key + "-01";
    curFin().expenses.push({ id: A.uid(), date: date, name: "", cat: A.state.finance.categories[1], amt: "" });
    A.save(); A.render();
  };
  A.acts["fin-add-saving"] = function () { A.state.finance.savings.push({ id: A.uid(), name: "", target: "", saved: "" }); A.save(); A.render(); };
  A.acts["fin-copy-budget"] = function () {
    var d = A.parseD(A.state.ui.finMonth || A.ym(A.today())), prev = A.state.finance.months[A.ym(new Date(d.getFullYear(), d.getMonth() - 1, 1))];
    if (!prev || !Object.keys(prev.budget).length) { A.toast("No budget last month to copy."); return; }
    curFin().budget = JSON.parse(JSON.stringify(prev.budget)); A.save(); A.render();
  };

  /* ------------------------------------------------------------ meals & recipes */
  var AISLES = [
    ["Produce", /apple|banana|berr|lemon|lime|onion|garlic|tomato|lettuce|spinach|kale|carrot|pepper|potato|avocado|herb|basil|cilantro|parsley|ginger|mushroom|cucumber|zucchini|broccoli|fruit|veg/i],
    ["Dairy & eggs", /milk|cheese|yog|butter|cream|egg/i],
    ["Meat & fish", /chicken|beef|pork|turkey|salmon|tuna|fish|shrimp|bacon|sausage|tofu|tempeh/i],
    ["Bakery & grains", /bread|bagel|tortilla|wrap|rice|pasta|noodle|oat|flour|quinoa|cereal/i],
    ["Pantry", /oil|vinegar|sauce|salt|pepper|spice|sugar|honey|bean|lentil|stock|broth|can|nut|seed|syrup|coffee|tea/i],
    ["Frozen", /frozen|ice/i]
  ];
  function aisleOf(t) { for (var i = 0; i < AISLES.length; i++) if (AISLES[i][1].test(t)) return AISLES[i][0]; return "Other"; }

  A.views.meals = function () {
    var wk = A.state.ui.mealWeek || A.ymd(A.mondayOf(A.today())), mon = A.parseD(wk);
    var plan = A.state.meals.weeks[wk] || (A.state.meals.weeks[wk] = {});
    var rec = A.state.meals.recipes;
    var dl = '<datalist id="recipe-names">' + rec.map(function (r) { return '<option value="' + esc(r.title) + '">'; }).join("") + "</datalist>";
    var days = A.DOW.map(function (name, i) {
      if (!plan[i]) plan[i] = { b: "", l: "", d: "", s: "" };
      var d = A.addDays(mon, i);
      return '<section class="card meal-day"><h4><a href="' + A.hrefDay(d) + '">' + name.slice(0, 3) + " " + d.getDate() + "</a></h4>" + [["b", "Breakfast"], ["l", "Lunch"], ["d", "Dinner"], ["s", "Snack"]].map(function (m) {
        return '<span class="ml">' + m[1] + "</span>" + A.input("meals.weeks." + wk + "." + i + "." + m[0], 'list="recipe-names" placeholder="—"');
      }).join("") + "</section>";
    }).join("");

    var groc = A.state.meals.grocery, groups = {};
    groc.forEach(function (g, i) { var a = g.aisle || aisleOf(g.text); (groups[a] = groups[a] || []).push({ g: g, i: i }); });
    var grocHtml = Object.keys(groups).sort().map(function (a) {
      return '<p class="lbl">' + esc(a) + '</p><ul class="list">' + groups[a].map(function (o) {
        return '<li class="li' + (o.g.done ? " done" : "") + '">' + A.checkbox("meals.grocery." + o.i + ".done") + '<span class="li-text">' + esc(o.g.text) + '</span><button class="x-btn" data-act="list-remove" data-list="meals.grocery" data-idx="' + o.i + '" aria-label="Remove">' + ic("x") + "</button></li>";
      }).join("") + "</ul>";
    }).join("");

    var cards = rec.map(function (r, i) {
      var p = "meals.recipes." + i, url = A.images.url(r.img);
      var photo = url
        ? '<img src="' + url + '" alt="' + esc(r.title || "Recipe photo") + '" /><div class="photo-tools"><label class="icon-btn sm" title="Replace photo">' + ic("image") + '<input type="file" accept="image/*" hidden data-upload="recipe" data-i="' + i + '" /></label><button class="icon-btn sm" data-act="recipe-photo-del" data-i="' + i + '" aria-label="Remove photo">' + ic("trash") + "</button></div>"
        : A.dropzone("recipe", "Add a photo", false, 'data-i="' + i + '"');
      return '<section class="card recipe"><div class="photo">' + photo + '</div><div class="body">' +
        A.input(p + ".title", 'placeholder="Recipe name"', "bare title") +
        '<div class="row"><span class="small muted">⏱</span>' + A.input(p + ".time", 'placeholder="30 min" style="padding:4px 8px"', "grow") + '<span class="small muted">🍽</span>' + A.input(p + ".serves", 'placeholder="Serves 2" style="padding:4px 8px"', "grow") + "</div>" +
        A.input(p + ".tags", 'placeholder="Tags: quick, vegetarian…" style="padding:4px 8px"') +
        '<label class="lbl">Ingredients · one per line</label>' + A.textarea(p + ".ingredients", 'rows="4" placeholder="2 eggs\n1 avocado"') +
        '<label class="lbl">Method</label>' + A.textarea(p + ".steps", 'rows="4" placeholder="1. …"') +
        '<div class="row wrap" style="margin-top:6px"><button class="btn sm soft" data-act="recipe-to-grocery" data-i="' + i + '">' + ic("cart") + 'To grocery list</button><button class="btn sm danger" data-act="recipe-del" data-i="' + i + '">' + ic("trash") + "</button></div></div></section>";
    }).join("");

    var label = mon.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " – " + A.addDays(mon, 6).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return A.head("Wellness · nourish", 'Meal planner <span class="soft">& recipes</span>', "", '<div class="pager"><button class="icon-btn" data-act="meal-week" data-v="-7" aria-label="Previous week">' + ic("chevL") + '</button><b style="min-width:140px;text-align:center">' + label + '</b><button class="icon-btn" data-act="meal-week" data-v="7" aria-label="Next week">' + ic("chevR") + "</button></div>") + dl +
      '<div class="meal-week" style="margin-bottom:16px">' + days + "</div>" +
      '<div class="grid">' +
      '<div class="c4">' + A.card("Grocery list", (grocHtml || '<div class="empty">Add items or send a recipe’s ingredients here.</div>') +
        '<div class="add-row"><input class="field" id="groc-new" placeholder="Add an item" data-enter="groc-add" /><button class="btn sm soft" data-act="groc-add">' + ic("plus") + "</button></div>" +
        '<div class="row wrap" style="margin-top:10px"><button class="btn xs ghost" data-act="groc-from-plan">Build from this week’s plan</button><button class="btn xs ghost" data-act="groc-clear">Clear checked</button></div>', { icon: "cart", tone: "mint", tint: "lav" }) + "</div>" +
      '<div class="c8">' + A.card("Recipe cards", (cards ? '<div class="recipes">' + cards + "</div>" : '<div class="empty">No recipes yet — add your favourites with a photo.</div>'), { icon: "chef", tone: "pink", tools: '<button class="btn sm" data-act="recipe-add">' + ic("plus") + "Recipe</button>" }) + "</div>" +
      "</div>";
  };
  A.acts["meal-week"] = function (el) {
    var wk = A.state.ui.mealWeek || A.ymd(A.mondayOf(A.today()));
    A.state.ui.mealWeek = A.ymd(A.addDays(A.parseD(wk), +el.getAttribute("data-v")));
    A.save(); A.render();
  };
  function addGroceries(lines) {
    var have = {}, n = 0;
    A.state.meals.grocery.forEach(function (g) { have[g.text.toLowerCase()] = 1; });
    lines.forEach(function (l) {
      l = l.replace(/^[-*•\s]+/, "").trim();
      if (l && !have[l.toLowerCase()]) { A.state.meals.grocery.push({ id: A.uid(), text: l, done: false, aisle: aisleOf(l) }); have[l.toLowerCase()] = 1; n++; }
    });
    A.save();
    return n;
  }
  A.acts["groc-add"] = function () {
    var inp = document.getElementById("groc-new");
    if (!inp.value.trim()) return;
    addGroceries([inp.value]); A.render(); document.getElementById("groc-new").focus();
  };
  A.acts["groc-clear"] = function () { A.state.meals.grocery = A.state.meals.grocery.filter(function (g) { return !g.done; }); A.save(); A.render(); };
  A.acts["groc-from-plan"] = function () {
    var wk = A.state.ui.mealWeek || A.ymd(A.mondayOf(A.today())), plan = A.state.meals.weeks[wk] || {}, names = {};
    Object.keys(plan).forEach(function (i) { ["b", "l", "d", "s"].forEach(function (m) { if (plan[i][m]) names[plan[i][m].toLowerCase()] = 1; }); });
    var lines = [];
    A.state.meals.recipes.forEach(function (r) { if (names[(r.title || "").toLowerCase()]) lines = lines.concat((r.ingredients || "").split("\n")); });
    if (!lines.length) { A.toast("Plan meals using your recipe names first."); return; }
    A.toast("Added " + addGroceries(lines) + " item(s) to your list"); A.render();
  };
  A.acts["recipe-add"] = function () {
    A.state.meals.recipes.unshift({ id: A.uid(), title: "", img: "", time: "", serves: "", tags: "", ingredients: "", steps: "" });
    A.save(); A.render();
  };
  A.acts["recipe-del"] = function (el) {
    var i = +el.getAttribute("data-i"), r = A.state.meals.recipes[i];
    if (!confirm("Delete " + (r.title ? "“" + r.title + "”" : "this recipe") + "?")) return;
    A.images.remove(r.img); A.state.meals.recipes.splice(i, 1); A.save(); A.render();
  };
  A.acts["recipe-photo-del"] = function (el) {
    var r = A.state.meals.recipes[+el.getAttribute("data-i")];
    A.images.remove(r.img); r.img = ""; A.save(); A.render();
  };
  A.acts["recipe-to-grocery"] = function (el) {
    var r = A.state.meals.recipes[+el.getAttribute("data-i")];
    var n = addGroceries((r.ingredients || "").split("\n"));
    A.toast(n ? "Added " + n + " ingredient(s) to your grocery list" : "Nothing new to add"); A.render();
  };
  A.uploads.recipe = function (files, el) {
    var i = +el.getAttribute("data-i"), r = A.state.meals.recipes[i];
    A.images.add(files[0]).then(function (id) {
      if (r.img) A.images.remove(r.img);
      r.img = id; A.save(); A.render();
    }, function (e) { A.toast(e.message); });
  };

  /* ------------------------------------------------------------ fitness */
  var TYPES = ["Walk", "Run", "Strength", "Yoga", "Pilates", "Cycling", "Swim", "HIIT", "Dance", "Stretch", "Other"];
  function weightChart(ws, goal) {
    if (ws.length < 2) return '<div class="empty">Log two or more weigh-ins to see your trend.</div>';
    var W = 600, H = 220, pad = 30, vals = ws.map(function (w) { return A.num(w.v); });
    if (goal) vals.push(A.num(goal));
    var min = Math.min.apply(null, vals) - 1, max = Math.max.apply(null, vals) + 1;
    var x = function (i) { return pad + i / (ws.length - 1) * (W - pad * 2); };
    var y = function (v) { return H - pad - (v - min) / (max - min) * (H - pad * 2); };
    var pts = ws.map(function (w, i) { return x(i).toFixed(1) + "," + y(A.num(w.v)).toFixed(1); });
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Weight trend"><defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#B69CFF"/><stop offset="1" stop-color="#FF9ED2"/></linearGradient><linearGradient id="wf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D6A8FF" stop-opacity=".35"/><stop offset="1" stop-color="#FF9ED2" stop-opacity="0"/></linearGradient></defs>';
    for (var g = 0; g <= 3; g++) { var gy = pad + g * (H - pad * 2) / 3; s += '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + gy + '" y2="' + gy + '" stroke="rgba(155,123,255,.12)"/><text x="4" y="' + (gy + 4) + '" font-size="10" fill="#847d99">' + (max - g * (max - min) / 3).toFixed(0) + "</text>"; }
    if (goal) s += '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + y(A.num(goal)) + '" y2="' + y(A.num(goal)) + '" stroke="#8FD9C0" stroke-width="2" stroke-dasharray="6 5"/><text x="' + (W - pad) + '" y="' + (y(A.num(goal)) - 6) + '" text-anchor="end" font-size="10" fill="#3aa585">goal</text>';
    s += '<polygon points="' + x(0) + "," + (H - pad) + " " + pts.join(" ") + " " + x(ws.length - 1) + "," + (H - pad) + '" fill="url(#wf)"/>';
    s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="url(#wg)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    ws.forEach(function (w, i) { s += '<circle cx="' + x(i) + '" cy="' + y(A.num(w.v)) + '" r="4" fill="#fff" stroke="#B69CFF" stroke-width="2"><title>' + esc(w.date + ": " + w.v) + "</title></circle>"; });
    return s + "</svg>";
  }
  A.views.fitness = function () {
    var F = A.state.fitness, mon = A.mondayOf(A.today()), wkStart = A.ymd(mon), wkEnd = A.ymd(A.addDays(mon, 6));
    var weekMins = F.workouts.filter(function (w) { return w.date >= wkStart && w.date <= wkEnd; }).reduce(function (s, w) { return s + A.num(w.mins); }, 0);
    var sorted = F.workouts.map(function (w, i) { return { w: w, i: i }; }).sort(function (a, b) { return (b.w.date || "").localeCompare(a.w.date || ""); });
    var rows = sorted.slice(0, 30).map(function (o) {
      var p = "fitness.workouts." + o.i;
      return '<tr><td style="width:140px"><input class="field" type="date" data-bind="' + p + '.date" value="' + esc(o.w.date) + '" /></td><td style="width:130px"><select class="field" data-bind="' + p + '.type">' + TYPES.map(function (t) { return "<option" + (t === o.w.type ? " selected" : "") + ">" + t + "</option>"; }).join("") + "</select></td>" +
        '<td style="width:90px">' + A.input(p + ".mins", 'type="number" data-num data-rerender placeholder="min"') + "</td><td>" + A.input(p + ".notes", 'placeholder="Notes"') + '</td><td style="width:34px"><button class="x-btn" data-act="list-remove" data-list="fitness.workouts" data-idx="' + o.i + '" aria-label="Remove">' + ic("x") + "</button></td></tr>";
    }).join("");
    var days7 = [];
    for (var i = 0; i < 7; i++) {
      var dk = A.ymd(A.addDays(mon, i));
      days7.push(F.workouts.filter(function (w) { return w.date === dk; }).reduce(function (s, w) { return s + A.num(w.mins); }, 0));
    }
    var maxD = Math.max.apply(null, days7.concat([30]));
    var bars = '<svg viewBox="0 0 280 120" role="img" aria-label="Active minutes this week">' + days7.map(function (v, i) {
      var h = v / maxD * 84;
      return '<rect x="' + (i * 40 + 8) + '" y="' + (96 - h) + '" width="24" height="' + Math.max(h, 2) + '" rx="7" fill="' + (v ? "url(#bg)" : "rgba(155,123,255,.15)") + '"/><text x="' + (i * 40 + 20) + '" y="112" text-anchor="middle" font-size="10" fill="#847d99">' + A.DOW[i].charAt(0) + "</text>" + (v ? '<text x="' + (i * 40 + 20) + '" y="' + (90 - h) + '" text-anchor="middle" font-size="9.5" fill="#4a4460">' + v + "</text>" : "");
    }).join("") + '<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9ED2"/><stop offset="1" stop-color="#B69CFF"/></linearGradient></defs></svg>';
    var ws = F.weights.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
    var latest = ws[ws.length - 1], first = ws[0];
    var wRows = F.weights.map(function (w, i) { return { w: w, i: i }; }).sort(function (a, b) { return b.w.date.localeCompare(a.w.date); }).slice(0, 8).map(function (o) {
      return '<li class="li"><span class="li-text">' + esc(A.parseD(o.w.date) ? A.parseD(o.w.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : o.w.date) + "</span><b>" + esc(o.w.v) + " " + F.unit + '</b><button class="x-btn" data-act="list-remove" data-list="fitness.weights" data-idx="' + o.i + '" aria-label="Remove">' + ic("x") + "</button></li>";
    }).join("");
    return A.head("Wellness · movement", 'Fitness <span class="soft">& weight</span>', "Log workouts, watch your week fill up and track the trend — gently.") +
      '<div class="grid">' +
      '<div class="c4">' + A.card("This week", '<div class="row" style="gap:16px">' + A.ring(weekMins / (A.num(F.weeklyTarget) || 150), 96, weekMins + "<small style='display:block;font-size:9px;font-weight:500;color:var(--muted)'>of " + (F.weeklyTarget || 150) + " min</small>", 9) +
        '<div class="grow"><label class="lbl">Weekly target (min)</label>' + A.input("fitness.weeklyTarget", 'type="number" data-num data-rerender') + "</div></div>" + '<div class="chart" style="margin-top:12px">' + bars + "</div>", { icon: "dumbbell", tint: "grad" }) + "</div>" +
      '<div class="c8">' + A.card("Workout log", '<div class="scroll-x"><table class="table">' + (rows ? "<tr><th>Date</th><th>Type</th><th>Min</th><th>Notes</th><th></th></tr>" + rows : "") + "</table></div>" + (rows ? "" : '<div class="empty" style="margin-bottom:8px">No workouts logged yet.</div>') + '<button class="btn sm soft" data-act="fit-add">' + ic("plus") + "Log workout</button>", { icon: "list", tone: "pink" }) + "</div>" +
      '<div class="c8">' + A.card("Weight trend", '<div class="chart">' + weightChart(ws, F.goalWeight) + "</div>", { icon: "scale", tone: "sky", tools: latest && first && ws.length > 1 ? '<span class="badge ' + (A.num(latest.v) <= A.num(first.v) ? "mint" : "pink") + '">' + (A.num(latest.v) - A.num(first.v) > 0 ? "+" : "") + (A.num(latest.v) - A.num(first.v)).toFixed(1) + " " + F.unit + "</span>" : "" }) + "</div>" +
      '<div class="c4">' + A.card("Weigh-in", '<div class="row"><input class="field" type="date" id="w-date" value="' + A.todayKey() + '" /><input class="field num-in" type="number" step="0.1" id="w-val" placeholder="' + F.unit + '" data-enter="weight-add" /><button class="btn sm" data-act="weight-add">' + ic("plus") + "</button></div>" +
        '<div class="row" style="margin-top:10px"><div class="seg"><button class="' + (F.unit === "lb" ? "on" : "") + '" data-act="fit-unit" data-v="lb">lb</button><button class="' + (F.unit === "kg" ? "on" : "") + '" data-act="fit-unit" data-v="kg">kg</button></div><span class="small muted">Goal</span>' + A.input("fitness.goalWeight", 'type="number" step="0.1" data-num data-rerender style="width:90px"') + "</div>" +
        (wRows ? '<ul class="list" style="margin-top:12px">' + wRows + "</ul>" : ""), { icon: "plus", tone: "mint" }) + "</div>" +
      "</div>";
  };
  A.acts["fit-add"] = function () { A.state.fitness.workouts.push({ id: A.uid(), date: A.todayKey(), type: "Walk", mins: 30, notes: "" }); A.save(); A.render(); };
  A.acts["fit-unit"] = function (el) { A.state.fitness.unit = el.getAttribute("data-v"); A.save(); A.render(); };
  A.acts["weight-add"] = function () {
    var d = document.getElementById("w-date").value, v = document.getElementById("w-val").value;
    if (!d || !v) { A.toast("Add a date and weight."); return; }
    var ex = A.state.fitness.weights.find(function (w) { return w.date === d; });
    if (ex) ex.v = A.num(v); else A.state.fitness.weights.push({ date: d, v: A.num(v) });
    A.save(); A.render();
  };
})();
