/* Slow Calc — a small calculator widget with a few money shortcuts.
   The same file is used by Slow Ink Life (Finance) and Slow Ink Sage (Debt payoff).
   Nothing is sent anywhere; the only thing remembered is the last few calculations, in this browser. */
(function () {
  "use strict";

  var HIST_KEY = "slow-calc-history", HIST_MAX = 10;

  /* ------------------------------------------------------------ the maths (no eval) */
  /* Understands + − × ÷ ( ) and %. "200 + 10%" means 200 plus 10% of 200, like a phone calculator. */
  function evaluate(src) {
    var s = String(src).replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−").replace(/\s+/g, ""), i = 0;
    function fail(m) { var e = new Error(m || "Check the sum"); e.calc = true; throw e; }
    function peek() { return s.charAt(i); }
    function number() {
      var m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
      if (!m) fail();
      i += m[0].length;
      return parseFloat(m[0]);
    }
    function primary() {
      var c = peek(), r;
      if (c === "(") {
        i++;
        r = expr();
        if (peek() !== ")") fail();
        i++;
        r = { v: r.v, pct: false };
      } else r = { v: number(), pct: false };
      while (peek() === "%") { i++; r = { v: r.v / 100, pct: true }; }
      return r;
    }
    function unary() {
      var c = peek();
      if (c === "−") { i++; var r = unary(); return { v: -r.v, pct: r.pct }; }
      if (c === "+") { i++; return unary(); }
      return primary();
    }
    function term() {
      var left = unary(), single = true;
      while (peek() === "×" || peek() === "÷") {
        var op = s.charAt(i++), right = unary();
        single = false;
        if (op === "×") left = { v: left.v * right.v, pct: false };
        else { if (right.v === 0) { var z = new Error("Can’t divide by zero"); z.calc = true; throw z; } left = { v: left.v / right.v, pct: false }; }
      }
      return single ? left : { v: left.v, pct: false };
    }
    function expr() {
      var left = term();
      while (peek() === "+" || peek() === "−") {
        var op = s.charAt(i++), right = term(), rv = right.pct ? left.v * right.v : right.v;
        left = { v: op === "+" ? left.v + rv : left.v - rv, pct: false };
      }
      return left;
    }
    if (!s) fail("");
    var out = expr();
    if (i < s.length) fail();
    if (!isFinite(out.v)) fail("Too big to show");
    return parseFloat(out.v.toPrecision(12));
  }

  function plain(n) { var t = String(n); return t.indexOf("e") >= 0 ? n.toFixed(10).replace(/\.?0+$/, "") : t; }
  function nice(n, maxDp) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString(undefined, { maximumFractionDigits: maxDp == null ? 10 : maxDp });
  }
  function money(n, cur, dp) {
    if (!isFinite(n)) return "—";
    var neg = n < 0;
    return (neg ? "−" : "") + (cur || "$") + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: dp == null ? 2 : dp, maximumFractionDigits: dp == null ? 2 : dp });
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ------------------------------------------------------------ money shortcuts */
  function monthName(monthsAhead) {
    var d = new Date(); d = new Date(d.getFullYear(), d.getMonth() + Math.ceil(monthsAhead), 1);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  var TOOLS = {
    tip: {
      title: "Tip & split",
      fields: [["bill", "Bill", "0"], ["tip", "Tip %", "15"], ["people", "People", "1"]],
      run: function (v, cur) {
        var bill = v.bill, tip = bill * v.tip / 100, total = bill + tip, n = Math.max(1, Math.floor(v.people) || 1);
        if (!(bill > 0)) return null;
        return [["Tip", money(tip, cur)], ["Total", money(total, cur)], [n > 1 ? "Each person pays" : "You pay", money(total / n, cur)]];
      }
    },
    sale: {
      title: "Sale price",
      fields: [["price", "Original price", ""], ["off", "Discount %", "30"], ["tax", "Tax % (optional)", "0"]],
      run: function (v, cur) {
        if (!(v.price > 0)) return null;
        var saved = v.price * v.off / 100, after = v.price - saved, tax = after * v.tax / 100;
        var rows = [["You save", money(saved, cur)], ["Sale price", money(after, cur)]];
        if (v.tax > 0) rows.push(["With tax", money(after + tax, cur)]);
        return rows;
      }
    },
    goal: {
      title: "Savings goal",
      fields: [["target", "Goal", ""], ["have", "Saved so far", "0"], ["month", "Saving per month", ""], ["months", "…or reach it in (months)", ""]],
      run: function (v, cur) {
        var left = v.target - v.have, rows = [];
        if (!(v.target > 0)) return null;
        if (left <= 0) return [["Goal", "Already reached 🎉"]];
        if (v.month > 0) { var m = Math.ceil(left / v.month); rows.push(["Time to go", m + (m === 1 ? " month" : " months")], ["Around", monthName(m)]); }
        if (v.months > 0) rows.push(["Save each month", money(left / v.months, cur)]);
        return rows.length ? rows : [["Left to save", money(left, cur)]];
      }
    },
    loan: {
      title: "Loan payment",
      fields: [["amount", "Amount borrowed", ""], ["apr", "Interest rate % a year", ""], ["years", "Years", ""]],
      run: function (v, cur) {
        if (!(v.amount > 0) || !(v.years > 0)) return null;
        var n = Math.round(v.years * 12), r = v.apr / 1200, pay = r > 0 ? v.amount * r / (1 - Math.pow(1 + r, -n)) : v.amount / n;
        return [["Monthly payment", money(pay, cur)], ["Total interest", money(pay * n - v.amount, cur)], ["Total paid", money(pay * n, cur)]];
      }
    }
  };

  /* ------------------------------------------------------------ markup */
  var KEYS = [
    ["C", "clear", "fn", "Clear"], ["⌫", "back", "fn", "Delete last"], ["%", "%", "fn", "Percent"], ["÷", "÷", "op", "Divide"],
    ["7", "7"], ["8", "8"], ["9", "9"], ["×", "×", "op", "Multiply"],
    ["4", "4"], ["5", "5"], ["6", "6"], ["−", "−", "op", "Subtract"],
    ["1", "1"], ["2", "2"], ["3", "3"], ["+", "+", "op", "Add"],
    ["(", "(", "fn", "Open bracket"], ["0", "0"], [".", "."], [")", ")", "fn", "Close bracket"]
  ];
  function html() {
    return '<div class="calc" tabindex="0" aria-label="Calculator. You can also type on your keyboard.">' +
      '<div class="calc-display" aria-live="polite"><div class="calc-expr" data-calc="expr"></div><div class="calc-res" data-calc="res">0</div></div>' +
      '<div class="calc-keys">' + KEYS.map(function (k) {
        return '<button type="button" class="calc-key ' + (k[2] || "") + '" data-calc-key="' + k[1] + '"' + (k[3] ? ' aria-label="' + k[3] + '"' : "") + ">" + k[0] + "</button>";
      }).join("") + '<button type="button" class="calc-key eq" data-calc-key="=" aria-label="Equals">=</button></div>' +
      '<div class="calc-bar"><button type="button" class="calc-link" data-calc-copy>Copy result</button><span class="calc-note" data-calc="note" aria-live="polite"></span></div>' +
      '<details class="calc-hist"><summary>Recent calculations</summary><ul data-calc="hist"></ul><button type="button" class="calc-link" data-calc-clear-hist>Clear history</button></details>' +
      '<div class="calc-tools"><p class="calc-tools-h">Money shortcuts</p><div class="calc-tabs" role="tablist">' + Object.keys(TOOLS).map(function (k, i) {
        return '<button type="button" role="tab" class="calc-tab' + (i === 0 ? " on" : "") + '" data-calc-tool="' + k + '" aria-selected="' + (i === 0) + '">' + TOOLS[k].title + "</button>";
      }).join("") + '</div><div class="calc-form" data-calc="form"></div></div></div>';
  }

  /* ------------------------------------------------------------ behaviour */
  function loadHist() { try { var h = JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); return Array.isArray(h) ? h.filter(function (x) { return x && typeof x.e === "string" && typeof x.r === "string"; }).slice(0, HIST_MAX).map(function (x) { return { e: x.e.slice(0, 80), r: x.r.slice(0, 40), v: typeof x.v === "string" ? x.v.slice(0, 40) : "" }; }) : []; } catch (e) { return []; } }
  function saveHist(h) { try { localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, HIST_MAX))); } catch (e) { /* storage blocked: the calculator still works */ } }

  function mount(root, opts) {
    var el = root.querySelector ? root.querySelector(".calc") : null;
    if (!el || el.getAttribute("data-ready")) return;
    el.setAttribute("data-ready", "1");
    var cur = (opts && opts.currency) || "$", expr = "", fresh = false, tool = "tip", hist = loadHist();
    var $ = function (n) { return el.querySelector('[data-calc="' + n + '"]'); };

    function show() {
      var res = "0";
      $("expr").textContent = expr;
      if (expr) {
        try { res = nice(evaluate(expr)); }
        catch (e) { try { res = nice(evaluate(expr.replace(/[+−×÷(.]+$/, ""))); } catch (e2) { res = ""; } }   /* unfinished sum: show the answer so far */
      }
      $("res").textContent = res === "" ? "…" : res;
      el.classList.toggle("has-expr", !!expr);
    }
    function note(t) { $("note").textContent = t || ""; if (t) setTimeout(function () { if ($("note").textContent === t) $("note").textContent = ""; }, 2200); }
    function drawHist() {
      var ul = $("hist");
      ul.innerHTML = hist.length ? hist.map(function (h, i) { return '<li><button type="button" class="calc-h" data-calc-use="' + i + '"><span>' + esc(h.e) + '</span><b>= ' + esc(h.r) + "</b></button></li>"; }).join("") : '<li class="calc-empty">Nothing yet.</li>';
    }
    function press(k) {
      var last = expr.slice(-1), isOp = "+−×÷".indexOf(k) >= 0;
      if (k === "clear") { expr = ""; fresh = false; }
      else if (k === "back") { expr = expr.slice(0, -1); fresh = false; }
      else if (k === "=") {
        if (!expr) return;
        try {
          var r = evaluate(expr), rs = plain(r).replace(/-/g, "−");
          hist.unshift({ e: expr, r: nice(r), v: rs }); hist = hist.slice(0, HIST_MAX); saveHist(hist); drawHist();
          expr = rs; fresh = true;
        } catch (e) { note(e.calc ? e.message : "Check the sum"); }
      } else if (isOp) {
        if (!expr) { if (k === "−") expr = "−"; }
        else if ("+−×÷".indexOf(last) >= 0) { if (expr.length > 1 || k === "−" || last !== "−") expr = expr.slice(0, -1) + k; }
        else if (last === "(") { if (k === "−") expr += k; }
        else expr += k;
        fresh = false;
      } else if (k === ".") {
        if (fresh) { expr = "0."; fresh = false; }
        else { var cur2 = expr.split(/[+−×÷()%]/).pop(); if (cur2.indexOf(".") < 0) expr += cur2 === "" ? "0." : "."; }
      } else if (k === "%") { if (/[\d)]/.test(last)) expr += "%"; fresh = false; }
      else if (k === "(") { if (fresh) { expr = ""; fresh = false; } if (/[\d)%]/.test(expr.slice(-1))) expr += "×"; expr += "("; }
      else if (k === ")") { var open = (expr.match(/\(/g) || []).length - (expr.match(/\)/g) || []).length; if (open > 0 && /[\d)%]/.test(last)) expr += ")"; }
      else if (/\d/.test(k)) { if (fresh) { expr = ""; fresh = false; } else if (last === ")" || last === "%") expr += "×"; if (expr.length < 60) expr += k; }
      show();
    }

    el.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("button") : null;
      if (!t) return;
      if (t.hasAttribute("data-calc-key")) { press(t.getAttribute("data-calc-key")); return; }
      if (t.hasAttribute("data-calc-copy")) {
        var text = $("res").textContent.replace(/,/g, ""), done = function () { note("Copied " + $("res").textContent); };
        if (!text || text === "…" || text === "0" && !expr) { note("Nothing to copy yet"); return; }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { note(text); });
        else { try { var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); done(); } catch (e2) { note(text); } }
        return;
      }
      if (t.hasAttribute("data-calc-use")) { var h = hist[+t.getAttribute("data-calc-use")]; if (h) { expr = /^−?\d*\.?\d+$/.test(h.v || "") ? h.v : ""; fresh = true; show(); } return; }
      if (t.hasAttribute("data-calc-clear-hist")) { hist = []; saveHist(hist); drawHist(); return; }
      if (t.hasAttribute("data-calc-tool")) { tool = t.getAttribute("data-calc-tool"); Array.prototype.forEach.call(el.querySelectorAll(".calc-tab"), function (b) { var on = b === t; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); }); drawForm(); }
    });

    /* keyboard: when a calculator button or the calculator itself has focus (or nothing else does) */
    function onKey(e) {
      if (!document.body.contains(el) || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target, inField = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (inField || (t && t.tagName === "BUTTON" && !el.contains(t)) || (t && t !== document.body && !el.contains(t))) return;
      var k = e.key, map = { "*": "×", "/": "÷", "-": "−", "x": "×", "X": "×", ",": "." };
      if (/^[0-9.+()%]$/.test(k) || map[k]) { press(map[k] || k); e.preventDefault(); }
      else if (k === "Enter" || k === "=") { if (t && t.tagName === "BUTTON" && el.contains(t) && k === "Enter") return; press("="); e.preventDefault(); }
      else if (k === "Backspace") { press("back"); e.preventDefault(); }
      else if (k === "Escape" || k === "Delete") { press("clear"); e.preventDefault(); }
    }
    if (window.SlowCalc && window.SlowCalc._key) document.removeEventListener("keydown", window.SlowCalc._key);
    window.SlowCalc._key = onKey;
    document.addEventListener("keydown", onKey);

    function drawForm() {
      var T = TOOLS[tool], f = $("form");
      f.innerHTML = '<div class="calc-fields">' + T.fields.map(function (x) {
        return '<label class="calc-f"><span>' + esc(x[1]) + '</span><input type="number" inputmode="decimal" step="any" min="0" data-calc-f="' + x[0] + '" value="' + esc(x[2]) + '"></label>';
      }).join("") + '</div><div class="calc-out" data-calc="out" aria-live="polite"></div>';
      calcForm();
    }
    function calcForm() {
      var T = TOOLS[tool], v = {}, any = false;
      T.fields.forEach(function (x) { var i = el.querySelector('[data-calc-f="' + x[0] + '"]'); var n = parseFloat(i && i.value); v[x[0]] = isFinite(n) && n >= 0 ? n : 0; if (i && i.value !== "") any = true; });
      var rows = T.run(v, cur), out = $("out");
      out.innerHTML = rows ? rows.map(function (r) { return "<div><span>" + esc(r[0]) + "</span><b>" + esc(r[1]) + "</b></div>"; }).join("") : '<p class="calc-empty">Fill in the boxes to see the answer.</p>';
    }
    el.addEventListener("input", function (e) { if (e.target.hasAttribute && e.target.hasAttribute("data-calc-f")) calcForm(); });

    show(); drawHist(); drawForm();
  }
  function mountAll(root, opts) { mount(root || document, opts); }

  window.SlowCalc = { _key: null, html: html, mount: mountAll, evaluate: evaluate, TOOLS: TOOLS };
})();
