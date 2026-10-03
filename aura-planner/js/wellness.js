/* Aura — habits: a simple tracker for the small daily rituals that support your intentions. */
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
      return '<li class="li habit-li"><button class="swatch" style="background:' + h.color + '" data-act="habit-color" data-i="' + i + '" aria-label="Change colour"></button>' + A.input("habits." + i + ".name", "", "bare") +
        '<span class="badge" title="This month">' + Math.round(hits / t.getDate() * 100) + '%</span><span class="badge pink" title="Current streak">🔥 ' + A.streak(h.id) + '</span><span class="badge grey" title="Best streak">best ' + bestStreak(h.id) + "</span>" +
        '<button class="x-btn" data-act="habit-del" data-i="' + i + '" aria-label="Delete habit">' + ic("trash") + "</button></li>";
    }).join("") + "</ul>" +
      '<div class="add-row"><input class="field" id="habit-new" placeholder="New habit, e.g. 10k steps" data-enter="habit-add" /><button class="btn sm soft" data-act="habit-add">' + ic("plus") + "</button></div>";
    var todayLog = A.state.habitLog[A.todayKey()] || {};
    var todayChecks = '<div class="checks">' + hs.map(function (h) {
      var on = !!todayLog[h.id];
      return '<button class="check-pill" style="' + (on ? "background:" + h.color + ";color:#fff;border-color:transparent" : "") + '" data-act="habit-toggle-re" data-k="' + A.todayKey() + '" data-h="' + h.id + '">' + (on ? "✓ " : "○ ") + esc(h.name) + "</button>";
    }).join("") + "</div>";
    return A.head("Align", 'Habit <span class="soft">tracker</span>', "Small rituals, done often, become the person you’re becoming. Tap squares to check off any day.") +
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
})();
