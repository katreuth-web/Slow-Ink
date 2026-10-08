/* Slow Ink Sage — the daily schedule: one line for each hour (or half hour) of the day.
   It sits on the Day page and on Today. Plans are saved with the day as days.<date>.sched.t0900 = "Dentist". */
(function () {
  "use strict";
  var SI = window.SI, esc = SI.esc, ic = SI.ic;

  function cfg() {
    var u = SI.state.ui;
    if (!u.sched || typeof u.sched !== "object") u.sched = {};
    var c = u.sched, s = parseInt(c.start, 10), e = parseInt(c.end, 10);
    s = isFinite(s) ? Math.max(0, Math.min(22, s)) : 6;
    e = isFinite(e) ? Math.max(s + 1, Math.min(23, e)) : Math.max(s + 1, 21);
    return { start: s, end: e, half: c.half === true, open: c.open === true };
  }
  function slotKey(mins) { return "t" + String(Math.floor(mins / 60)).padStart(2, "0") + String(mins % 60).padStart(2, "0"); }
  function label(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    try { return new Date(2000, 0, 1, h, m).toLocaleTimeString([], m ? { hour: "numeric", minute: "2-digit" } : { hour: "numeric" }); }
    catch (err) { return h + ":" + String(m).padStart(2, "0"); }
  }

  /* the card: key is the day, like 2027-03-08 */
  SI.scheduleCard = function (key) {
    var c = cfg(), rec = (SI.state.days[key] && SI.state.days[key].sched) || {}, step = c.half ? 30 : 60, lo = c.start * 60, hi = c.end * 60 + 60 - step;
    /* anything already written stays visible: outside the chosen hours, or between the lines (e.g. 9:30 in hours mode) */
    var extra = [];
    Object.keys(rec).forEach(function (k) {
      var m = /^t([01]\d|2[0-3])([0-5]\d)$/.exec(k);
      if (!m || typeof rec[k] !== "string" || !rec[k]) return;
      var mins = +m[1] * 60 + +m[2];
      if (mins < lo) lo = Math.floor(mins / step) * step;
      if (mins > hi) hi = Math.floor(mins / step) * step;
      extra.push(mins);
    });
    var slots = [];
    for (var t = lo; t <= hi; t += step) slots.push(t);
    extra.forEach(function (mins) { if (slots.indexOf(mins) < 0) slots.push(mins); });
    slots.sort(function (a, b) { return a - b; });
    var now = new Date(), isToday = key === SI.todayKey(), nowSlot = now.getHours() * 60 + Math.floor(now.getMinutes() / step) * step, rows = "", filled = 0;
    slots.forEach(function (t) {
      var k = slotKey(t), v = typeof rec[k] === "string" ? rec[k] : "";
      if (v) filled++;
      rows += '<div class="sched-row' + (isToday && t === nowSlot ? " now" : "") + (t % 60 === 0 ? " hour" : "") + '"><label class="sched-time" for="sc-' + k + '">' + esc(label(t)) + "</label>" +
        '<input class="sched-input" id="sc-' + k + '" data-bind="days.' + esc(key) + ".sched." + k + '" value="' + esc(v) + '" maxlength="80" autocomplete="off" aria-label="' + esc(label(t)) + '"></div>';
    });
    var hours = []; for (var h = 0; h < 24; h++) hours.push(h);
    var opts = function (from, to, sel) { return hours.filter(function (h) { return h >= from && h <= to; }).map(function (h) { return '<option value="' + h + '"' + (h === sel ? " selected" : "") + ">" + esc(label(h * 60)) + "</option>"; }).join(""); };
    var tools = '<details class="sched-tools"' + (c.open ? " open" : "") + '><summary>Hours</summary><div class="sched-set"><label>From <select data-act-input="sched-range" data-which="start" aria-label="First hour">' + opts(0, 22, c.start) + '</select></label>' +
      '<label>To <select data-act-input="sched-range" data-which="end" aria-label="Last hour">' + opts(1, 23, c.end) + '</select></label>' +
      '<button class="btn sm ghost" data-act="sched-half" aria-pressed="' + c.half + '">' + (c.half ? "Hours only" : "Half hours") + "</button></div></details>";
    return '<section class="card sched"><div class="sched-head"><h2 class="card-title">Schedule</h2>' + tools + "</div>" +
      '<div class="sched-body">' + rows + "</div>" + (filled ? "" : '<p class="small hint">Pencil in appointments and time blocks. Leave a line empty if the hour is yours.</p>') + "</section>";
  };

  SI.actions["sched-range"] = function (el) {
    var c = cfg(), v = parseInt(el.value, 10);
    if (!isFinite(v)) return;
    var s = el.dataset.which === "start" ? v : c.start, e = el.dataset.which === "end" ? v : c.end;
    if (e <= s) { if (el.dataset.which === "start") e = Math.min(23, s + 1); else s = Math.max(0, e - 1); }
    SI.state.ui.sched = { start: s, end: e, half: c.half, open: true };
    SI.save(); SI.refocus = '[data-which="' + el.dataset.which + '"]'; SI.render();
  };
  SI.actions["sched-half"] = function () {
    var c = cfg();
    SI.state.ui.sched = { start: c.start, end: c.end, half: !c.half, open: true };
    SI.save(); SI.render();
  };
  /* remember whether the "Hours" panel is open, so it stays open while you adjust it */
  document.addEventListener("toggle", function (e) {
    var d = e.target;
    if (!d || !d.classList || !d.classList.contains("sched-tools")) return;
    var c = cfg();
    if (c.open !== d.open) { SI.state.ui.sched = { start: c.start, end: c.end, half: c.half, open: d.open }; SI.save(); }
  }, true);
})();
