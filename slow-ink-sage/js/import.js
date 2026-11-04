/* Slow Ink Sage — bring transactions in from a bank CSV.
   Sage tracks what came in and what you set aside, not day-to-day spending, so this
   brings one direction at a time: money received as income, or money paid out as an
   amount set aside toward a savings goal. The file is read in this browser with
   FileReader and never leaves the device. */
(function () {
  "use strict";
  var SI = window.SI, esc = SI.esc, ic = SI.ic;

  /* Held here rather than in saved data: a half-finished import is never written to
     storage, and a long statement can't fill it up. */
  var imp = null;

  /* A real CSV reader: quoted fields, doubled quotes inside them, and delimiters or
     newlines inside quotes. Banks export all of these. */
  function csvParse(text, delim) {
    text = String(text).replace(/^﻿/, "");
    var rows = [], row = [], field = "", q = false, i = 0;
    while (i < text.length) {
      var c = text.charAt(i);
      if (q) {
        if (c === '"') {
          if (text.charAt(i + 1) === '"') { field += '"'; i += 2; continue; }
          q = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { q = true; i++; continue; }
      if (c === delim) { row.push(field); field = ""; i++; continue; }
      if (c === "\n" || c === "\r") {
        if (c === "\r" && text.charAt(i + 1) === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = []; i++; continue;
      }
      field += c; i++;
    }
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
    return rows;
  }
  function guessDelim(text) {
    var head = text.split(/\r?\n/).slice(0, 5).join("\n"), best = ",", bestN = 0;
    [",", ";", "\t", "|"].forEach(function (d) {
      var n = head.split(d).length - 1;
      if (n > bestN) { bestN = n; best = d; }
    });
    return best;
  }

  var DATE_FMTS = [["dmy", "Day/Month/Year"], ["mdy", "Month/Day/Year"], ["ymd", "Year-Month-Day"]];
  function impDate(v, fmt) {
    v = String(v == null ? "" : v).trim();
    if (!v) return "";
    var m = /^(\d{1,4})[^\d](\d{1,2})[^\d](\d{2,4})/.exec(v);
    if (!m) {
      var t = Date.parse(v);
      if (!isNaN(t)) { var p = new Date(t); return SI.key(new Date(p.getFullYear(), p.getMonth(), p.getDate())); }
      return "";
    }
    var a = +m[1], b = +m[2], c = +m[3], y, mo, da;
    if (fmt === "ymd" || String(m[1]).length === 4) { y = a; mo = b; da = c; }
    else if (fmt === "mdy") { mo = a; da = b; y = c; }
    else { da = a; mo = b; y = c; }
    if (y < 100) y += y < 70 ? 2000 : 1900;
    if (mo < 1 || mo > 12 || da < 1 || da > 31 || y < 1900 || y > 2200) return "";
    var d2 = new Date(y, mo - 1, da);
    return d2.getMonth() === mo - 1 ? SI.key(d2) : "";
  }
  /* Guess the date order from the file: a value above 12 can only be a day. */
  function guessFmt(vals) {
    var firstBig = false, secondBig = false, isoish = false;
    vals.forEach(function (v) {
      var m = /^(\d{1,4})[^\d](\d{1,2})[^\d](\d{2,4})/.exec(String(v).trim());
      if (!m) return;
      if (String(m[1]).length === 4) { isoish = true; return; }
      if (+m[1] > 12) firstBig = true;
      if (+m[2] > 12) secondBig = true;
    });
    if (isoish) return "ymd";
    if (secondBig) return "mdy";
    return "dmy";
  }
  /* "1.234,56", "1,234.56", "£12.00", "(45.00)" and "45.00 CR" all have to come out right. */
  function impAmount(v) {
    var s = String(v == null ? "" : v).trim();
    if (!s) return null;
    var neg = /^\(.*\)$/.test(s) || /(^|\s)(DR|debit)\b/i.test(s) || /^-/.test(s.replace(/[^\d.,()-]/g, ""));
    if (/(^|\s)(CR|credit)\b/i.test(s)) neg = false;
    s = s.replace(/[^\d.,-]/g, "");
    if (!s) return null;
    var lastC = s.lastIndexOf(","), lastD = s.lastIndexOf(".");
    if (lastC > -1 && lastD > -1) {
      if (lastC > lastD) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (lastC > -1) {
      s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
    }
    s = s.replace(/-(?!^)/g, "");
    var n = parseFloat(s);
    if (!isFinite(n)) return null;
    n = Math.abs(n);
    return neg || /^-/.test(String(v).trim()) ? -n : n;
  }
  function headGuess(head, words) {
    for (var i = 0; i < head.length; i++) {
      var h = String(head[i]).toLowerCase();
      for (var j = 0; j < words.length; j++) if (h.indexOf(words[j]) >= 0) return i;
    }
    return -1;
  }
  function looksLikeHeader(row) {
    var wordy = row.filter(function (c) {
      c = String(c).trim();
      return c && !/^[\d\s.,()\/-]+$/.test(c);
    }).length;
    return wordy >= Math.max(2, Math.ceil(row.length / 2));
  }

  function money() { return SI.state.money; }
  function goals() { return (money() && money().goals) || []; }

  /* Rows in the chosen direction, after the "only rows containing" filter. */
  function rows() {
    if (!imp) return [];
    var m = imp.map, want = imp.dir, filter = String(imp.filter || "").toLowerCase().trim(), out = [];
    imp.rows.forEach(function (r, idx) {
      if (idx === 0 && imp.hasHead) return;
      var date = impDate(r[m.date], imp.fmt);
      var text = String(r[m.text] == null ? "" : r[m.text]).replace(/\s+/g, " ").trim().slice(0, 80);
      var amt;
      if (imp.twoCol) {
        var inA = impAmount(r[m.inCol]), outA = impAmount(r[m.outCol]);
        amt = outA ? -Math.abs(outA) : inA ? Math.abs(inA) : null;
      } else {
        amt = impAmount(r[m.amount]);
        if (amt != null && imp.sign === "pos") amt = -amt;
      }
      if (!date || amt == null || !amt) return;
      if (want === "in" && amt < 0) return;
      if (want === "out" && amt > 0) return;
      if (filter && text.toLowerCase().indexOf(filter) < 0) return;
      out.push({ date: date, text: text, amount: Math.abs(amt) });
    });
    /* skip anything already logged on that date for that amount */
    var list = imp.as === "income" ? money().income : money().deposits;
    out.forEach(function (x) {
      x.dup = list.some(function (e) {
        return e.date === x.date && Math.abs(parseFloat(e.amt) - x.amount) < 0.005;
      });
    });
    return out;
  }

  SI.importCard = function () {
    if (!imp) {
      return '<section class="card imp-card"><h2 class="card-title">Bring in a bank file</h2>' +
        '<p class="small hint" style="margin:0 0 12px">Most banks let you download your transactions as a CSV file. Sage keeps track of what came in and what you set aside — not everyday spending — so this brings in one of those at a time. Nothing is uploaded; the file is read here on your device.</p>' +
        '<label class="btn">' + ic("plus") + 'Choose a CSV file<input type="file" accept=".csv,text/csv,text/plain" hidden id="si-imp-file" data-act-input="si-imp-file"></label></section>';
    }
    var list = rows(), fresh = list.filter(function (x) { return !x.dup; });
    var dups = list.length - fresh.length;
    var total = fresh.reduce(function (t, x) { return t + x.amount; }, 0);

    var colOpts = function (sel) {
      return imp.head.map(function (h, i) {
        return '<option value="' + i + '"' + (i === sel ? " selected" : "") + ">" + esc(h || "Column " + (i + 1)) + "</option>";
      }).join("");
    };
    var f = function (lbl, inner) { return '<label class="imp-f"><span class="lbl">' + lbl + "</span>" + inner + "</label>"; };

    var controls =
      '<div class="imp-row">' +
      f("Date column", '<select class="field" data-act-input="si-imp" data-k="date">' + colOpts(imp.map.date) + "</select>") +
      f("Description column", '<select class="field" data-act-input="si-imp" data-k="text">' + colOpts(imp.map.text) + "</select>") +
      (imp.twoCol
        ? f("Money in", '<select class="field" data-act-input="si-imp" data-k="inCol">' + colOpts(imp.map.inCol) + "</select>") +
          f("Money out", '<select class="field" data-act-input="si-imp" data-k="outCol">' + colOpts(imp.map.outCol) + "</select>")
        : f("Amount column", '<select class="field" data-act-input="si-imp" data-k="amount">' + colOpts(imp.map.amount) + "</select>")) +
      f("Date order", '<select class="field" data-act-input="si-imp" data-k="fmt">' + DATE_FMTS.map(function (x) {
        return '<option value="' + x[0] + '"' + (x[0] === imp.fmt ? " selected" : "") + ">" + x[1] + "</option>";
      }).join("") + "</select>") + "</div>" +
      '<div class="imp-row">' +
      f("Bring in", '<select class="field" data-act-input="si-imp" data-k="dir">' +
        '<option value="in"' + (imp.dir === "in" ? " selected" : "") + ">Money received</option>" +
        '<option value="out"' + (imp.dir === "out" ? " selected" : "") + ">Money paid out</option></select>") +
      f("Add it as", '<select class="field" data-act-input="si-imp" data-k="as">' +
        '<option value="income"' + (imp.as === "income" ? " selected" : "") + ">Income</option>" +
        '<option value="deposit"' + (imp.as === "deposit" ? " selected" : "") + ">Money set aside</option></select>") +
      (imp.as === "deposit"
        ? f("Toward", '<select class="field" data-act-input="si-imp" data-k="goal"><option value="">No particular goal</option>' +
            goals().map(function (g) { return '<option value="' + esc(g.id) + '"' + (g.id === imp.goal ? " selected" : "") + ">" + esc(g.name || "Goal") + "</option>"; }).join("") + "</select>")
        : "") +
      f("Only rows containing", '<input class="field" type="text" maxlength="40" placeholder="e.g. salary — leave empty for all" value="' + esc(imp.filter || "") + '" data-act-input="si-imp" data-k="filter">') +
      "</div>" +
      '<div class="imp-row imp-checks">' +
      '<label class="imp-chk"><input type="checkbox" data-act-input="si-imp" data-k="twoCol"' + (imp.twoCol ? " checked" : "") + "> Separate &ldquo;money in&rdquo; and &ldquo;money out&rdquo; columns</label>" +
      (imp.twoCol ? "" : '<label class="imp-chk"><input type="checkbox" data-act-input="si-imp" data-k="sign"' + (imp.sign === "pos" ? " checked" : "") + "> Positive numbers mean money out</label>") +
      '<label class="imp-chk"><input type="checkbox" data-act-input="si-imp" data-k="hasHead"' + (imp.hasHead ? " checked" : "") + "> The first row is column titles</label></div>";

    var preview = list.slice(0, 8).map(function (x) {
      return "<li" + (x.dup ? ' class="imp-dup"' : "") + '><span class="imp-d">' + esc(x.date) + '</span><span class="imp-t">' + esc(x.text || "—") + "</span>" +
        '<span class="imp-a">' + SI.moneyFmt(x.amount, 2) + "</span>" +
        (x.dup ? '<span class="imp-note">already logged</span>' : "") + "</li>";
    }).join("");

    var summary = fresh.length
      ? fresh.length + (fresh.length === 1 ? " entry" : " entries") + " ready · " + SI.moneyFmt(total, 2) + " in total" + (dups ? " · " + dups + " already logged will be skipped" : "")
      : (list.length ? "Everything in this file is already logged." : "No rows match yet — try the other direction, or clear the filter.");

    return '<section class="card imp-card"><h2 class="card-title">Bring in a bank file</h2>' +
      '<p class="small"><b>' + esc(imp.name) + "</b></p><p class=\"small hint\" style=\"margin:0 0 12px\">" + summary + "</p>" +
      controls +
      (preview ? '<ul class="money-list imp-prev">' + preview + "</ul>" : '<p class="empty">Nothing to show.</p>') +
      (list.length > 8 ? '<p class="small hint">…and ' + (list.length - 8) + " more.</p>" : "") +
      '<div class="row-actions" style="margin-top:14px">' +
      '<button class="btn" data-act="si-imp-go"' + (fresh.length ? "" : " disabled") + ">" + ic("check") + "Add " + fresh.length + (fresh.length === 1 ? " entry" : " entries") + "</button>" +
      '<button class="btn ghost" data-act="si-imp-cancel">Cancel</button></div></section>';
  };

  SI.actions["si-imp-file"] = function (el) {
    var file = el.files && el.files[0];
    el.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { SI.toast("That file is very large — try a shorter date range."); return; }
    var fr = new FileReader();
    fr.onerror = function () { SI.toast("Couldn’t read that file."); };
    fr.onload = function () {
      var text = String(fr.result || ""), delim = guessDelim(text);
      var all = csvParse(text, delim).filter(function (r) { return r.some(function (x) { return String(x).trim(); }); });
      if (all.length < 2) { SI.toast("That file doesn’t look like a list of transactions."); return; }
      var hasHead = looksLikeHeader(all[0]);
      var head = hasHead ? all[0].map(function (h) { return String(h).trim(); }) : all[0].map(function (_, i) { return "Column " + (i + 1); });
      var body = hasHead ? all.slice(1) : all;
      var di = headGuess(head, ["date", "posted"]);
      var ti = headGuess(head, ["description", "details", "narrative", "payee", "memo", "reference", "name"]);
      var ai = headGuess(head, ["amount", "value"]);
      var ini = headGuess(head, ["money in", "paid in", "credit", "deposit"]);
      var outi = headGuess(head, ["money out", "paid out", "debit", "withdraw"]);
      /* decided before any guessing from the data: a statement with paid in/out usually
         carries a running balance too, and guessing would pick that instead */
      var twoCol = ini >= 0 && outi >= 0 && ini !== outi && ai < 0;
      if (di < 0) for (var i = 0; i < head.length; i++) { if (body.slice(0, 6).filter(function (r) { return impDate(r[i], "dmy"); }).length >= 2) { di = i; break; } }
      if (!twoCol && ai < 0) {
        for (var j = head.length - 1; j >= 0; j--) {
          if (/balance|running|total/i.test(String(head[j]))) continue;
          if (body.slice(0, 6).filter(function (r) { return impAmount(r[j]) != null; }).length >= 2) { ai = j; break; }
        }
      }
      if (ti < 0) for (var k = 0; k < head.length; k++) { if (k !== di && k !== ai && body.slice(0, 6).filter(function (r) { return /[a-z]{3}/i.test(String(r[k])); }).length >= 2) { ti = k; break; } }
      imp = {
        name: file.name, rows: all, head: head, hasHead: hasHead, twoCol: twoCol, sign: "neg",
        dir: "in", as: "income", goal: "", filter: "",
        fmt: guessFmt(body.slice(0, 40).map(function (r) { return r[Math.max(0, di)]; })),
        map: { date: Math.max(0, di), text: Math.max(0, ti), amount: Math.max(0, ai), inCol: Math.max(0, ini), outCol: Math.max(0, outi) }
      };
      SI.render();
    };
    fr.readAsText(file);
  };
  SI.actions["si-imp"] = function (el) {
    if (!imp) return;
    var k = el.dataset.k;
    if (k === "twoCol") imp.twoCol = !!el.checked;
    else if (k === "hasHead") imp.hasHead = !!el.checked;
    else if (k === "sign") imp.sign = el.checked ? "pos" : "neg";
    else if (k === "fmt" || k === "dir" || k === "as" || k === "goal" || k === "filter") imp[k] = el.value;
    else imp.map[k] = +el.value;
    /* money paid out is never income, so keep the two choices sensible together */
    if (k === "dir" && imp.dir === "out" && imp.as === "income") imp.as = "deposit";
    if (k === "as" && imp.as === "deposit" && imp.dir === "in") imp.dir = "out";
    if (k === "as" && imp.as === "income" && imp.dir === "out") imp.dir = "in";
    SI.refocus = "[data-act-input='si-imp'][data-k='" + k + "']";
    SI.render();
  };
  SI.actions["si-imp-cancel"] = function () { imp = null; SI.render(); };
  SI.actions["si-imp-go"] = function () {
    if (!imp) return;
    var fresh = rows().filter(function (x) { return !x.dup; });
    if (!fresh.length) return;
    var m = money(), goal = imp.goal && goals().some(function (g) { return g.id === imp.goal; }) ? imp.goal : "";
    fresh.forEach(function (x) {
      if (imp.as === "income") m.income.push({ id: SI.uid(), date: x.date, src: x.text || "Income", amt: String(x.amount) });
      else m.deposits.push({ id: SI.uid(), date: x.date, goal: goal, amt: String(x.amount), note: x.text || "" });
    });
    var n = fresh.length, as = imp.as;
    imp = null;
    SI.save(); SI.render();
    SI.toast("Added " + n + (n === 1 ? " entry" : " entries") + " to " + (as === "income" ? "income" : "savings") + ".");
  };
})();
