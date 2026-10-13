/* Aura — Self-Care Wheel: nine areas of your life drawn as a wheel. Each slice grows with how you're doing (0–10),
   and under the wheel are the things you're ready for, what you want to work on, and a support plan. */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic;

  /* key, title, short label for the wheel, icon, tone, slice colour */
  var AREAS = [
    ["physical", "Physical wellness", "Physical", "dumbbell", "mint", "#C7CBC0"],
    ["mental", "Mental & anxiety support", "Mental", "brain", "pink", "#E3B4B0"],
    ["emotional", "Emotional well-being", "Emotional", "drop", "sky", "#C9B4CC"],
    ["relationships", "Relationships & connection", "Relationships", "heart", "pink", "#EBC6B3"],
    ["rest", "Rest & nervous-system recovery", "Rest", "moon", "sky", "#B9C1B5"],
    ["nutrition", "Nutrition & nourishment", "Nutrition", "leaf", "butter", "#F0CFA0"],
    ["spiritual", "Spiritual & soul care", "Spirit", "lotus", "mint", "#A9C1CC"],
    ["identity", "Identity & personal growth", "Identity", "feather", "butter", "#B7A9CF"],
    ["boundaries", "Boundaries & empowerment", "Boundaries", "scale", "pink", "#F2D7AE"]
  ];
  var ALLOWED = ["Take up space", "Change my mind", "Ask for help", "Rest without guilt", "Put myself first", "Grow at my own pace"];
  var CX = 200, CY = 200, R = 170;

  function pt(deg, r) { var t = (deg - 90) * Math.PI / 180; return [CX + r * Math.cos(t), CY + r * Math.sin(t)]; }
  function slice(i, r) {
    var a0 = i * 40, a1 = a0 + 40, p0 = pt(a0, r), p1 = pt(a1, r);
    return "M" + CX + " " + CY + " L" + p0[0].toFixed(1) + " " + p0[1].toFixed(1) + " A" + r + " " + r + " 0 0 1 " + p1[0].toFixed(1) + " " + p1[1].toFixed(1) + " Z";
  }

  /* the wheel itself: a faint full ring behind, and each slice sized by its rating */
  function wheelSVG(s) {
    var out = '<svg class="birth-wheel" viewBox="-14 -14 428 428" role="img" aria-label="Self-care wheel, one slice per life area">';
    out += '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="none" style="stroke:rgba(var(--ac),.25)"/>';
    [0.5, 1].forEach(function (f) { out += '<circle cx="' + CX + '" cy="' + CY + '" r="' + (R * f) + '" fill="none" style="stroke:rgba(var(--ac),.15)" stroke-dasharray="3 4"/>'; });
    AREAS.forEach(function (a, i) {
      var rate = s.areas[a[0]].rate, rr = R * Math.max(1, rate) / 10;
      out += '<path d="' + slice(i, R) + '" fill="' + a[5] + '" fill-opacity=".22" stroke="var(--paper)" stroke-width="2"/>';
      out += '<path d="' + slice(i, rr) + '" fill="' + a[5] + '" fill-opacity=".9" stroke="var(--paper)" stroke-width="2"/>';
      var lp = pt(i * 40 + 20, 142); lp[1] -= 6;
      out += '<text x="' + lp[0].toFixed(1) + '" y="' + lp[1].toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="600" style="fill:var(--ink)">' + esc(a[2]) + "</text>";
      var vp = [lp[0], lp[1] + 13];
      out += '<text x="' + vp[0].toFixed(1) + '" y="' + vp[1].toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" font-size="10" style="fill:var(--ink-2)">' + rate + "/10</text>";
    });
    out += '<circle cx="' + CX + '" cy="' + CY + '" r="62" style="fill:var(--paper);stroke:rgba(var(--ac),.4)" stroke-width="1.5"/>';
    out += '<text x="' + CX + '" y="' + (CY - 10) + '" text-anchor="middle" font-size="13" font-weight="700" style="fill:var(--ink)">I matter.</text>';
    out += '<text x="' + CX + '" y="' + (CY + 10) + '" text-anchor="middle" font-size="9.5" style="fill:var(--ink-2)">I am allowed to</text>';
    out += '<text x="' + CX + '" y="' + (CY + 23) + '" text-anchor="middle" font-size="9.5" style="fill:var(--ink-2)">care for my whole self.</text>';
    return out + "</svg>";
  }

  A.acts["selfcare-live"] = function (el) {
    var k = el.getAttribute("data-k"), v = Math.max(0, Math.min(10, +el.value || 0));
    A.state.selfcare.areas[k].rate = v; A.save();
    var badge = document.getElementById("sc-v-" + k); if (badge) badge.textContent = v + "/10";
    var wrap = document.getElementById("selfcare-wheel"); if (wrap) wrap.innerHTML = wheelSVG(A.state.selfcare);
  };

  A.views.selfcare = function () {
    var s = A.state.selfcare;
    var cards = AREAS.map(function (a) {
      var rate = s.areas[a[0]].rate;
      return '<div class="c6">' + A.card(a[1],
        '<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px"><label class="lbl" for="sc-r-' + a[0] + '" style="margin:0">How I’m doing</label><span class="badge pink" id="sc-v-' + a[0] + '">' + rate + '/10</span></div>' +
        '<input type="range" id="sc-r-' + a[0] + '" min="0" max="10" step="1" value="' + rate + '" data-bind="selfcare.areas.' + a[0] + '.rate" data-k="' + a[0] + '" data-live="selfcare-live" aria-label="' + esc(a[1]) + ' rating">' +
        '<label class="lbl" style="margin-top:12px">I am ready to…</label>' + A.textarea("selfcare.areas." + a[0] + ".ready", 'rows="3" placeholder="One small thing I can say yes to…"', "hand") +
        '<label class="lbl" style="margin-top:12px">I want to work on…</label>' + A.textarea("selfcare.areas." + a[0] + ".work", 'rows="3" placeholder="What I’d like to grow in…"', "hand"),
        { icon: a[3], tone: a[4] }) + "</div>";
    }).join("");
    var allowed = ALLOWED.map(function (t, i) {
      return '<label class="row" style="gap:10px;align-items:center;margin-bottom:10px">' + A.checkbox("selfcare.allowed." + i) + "<span>" + esc(t) + "</span></label>";
    }).join("") + [0, 1].map(function (i) {
      return '<div class="row" style="gap:10px;align-items:center;margin-bottom:10px"><span aria-hidden="true">♡</span>' + A.input("selfcare.custom." + i, 'placeholder="I am allowed to…" maxlength="120"', "grow") + "</div>";
    }).join("");
    var support = [["reach", "People I can reach out to"], ["pro", "Professional support"], ["tools", "Tools & resources that help"], ["reminders", "Reminders for me"]].map(function (x) {
      return '<div class="c3">' + A.card(x[1], A.textarea("selfcare.support." + x[0], 'rows="4" placeholder="Names, numbers, places…"', "hand"), { icon: "bloom", tone: "" }) + "</div>";
    }).join("");
    return A.head("Align", 'Self-care <span class="soft">wheel</span>',
      "Move each slider to how you’re doing today. The wheel grows and shrinks with you. Go at your own pace.") +
      '<div class="grid">' +
      '<div class="c12">' + A.card("Your wheel", '<div class="birth-wheel-wrap" id="selfcare-wheel">' + wheelSVG(s) + "</div>" +
        '<p class="small muted" style="text-align:center;margin:8px 0 0">Bigger slices show areas that are going well. Smaller slices show where you may want support.</p>', { icon: "compass", tint: "grad" }) + "</div>" +
      '<div class="c6">' + A.card("My intention", A.textarea("selfcare.intention", 'rows="3" placeholder="This season, I want to care for myself by…"', "hand"), { icon: "sparkle", tone: "" }) + "</div>" +
      '<div class="c6">' + A.card("How to use this", '<p class="small" style="margin:0 0 8px">Self-care looks different for everyone, and it can change from season to season. You are allowed to heal, to thrive, and to be yourself.</p><p class="small muted" style="margin:0">Fill in what feels true today. You can come back and change it at any time.</p>', { icon: "eye", tone: "" }) + "</div>" +
      cards +
      '<div class="c6">' + A.card("I am allowed to…", allowed, { icon: "heart", tone: "pink" }) + "</div>" +
      '<div class="c6">' + A.card("I matter", '<p class="hand" style="font-size:22px;margin:0 0 6px;text-align:center">My well-being matters. I am allowed to care for my whole self.</p><p class="small muted" style="margin:0;text-align:center">Small steps still count.</p>', { icon: "lotus", tone: "butter" }) + "</div>" +
      '<div class="c12">' + A.card("My support plan", '<div class="grid">' + support + "</div>", { icon: "compass", tone: "mint" }) + "</div>" +
      '<div class="c12"><div class="tip" style="margin:0">This page is a reflection tool, not therapy. If you are in crisis or thinking about harming yourself, contact your local emergency number or a crisis line now.</div></div>' +
      "</div>";
  };
})();
