/* Aura — Self-Care Wheel: nine areas of your life, what you're ready for in each, and a plan for support. */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic;

  /* key, title, icon, tone */
  var AREAS = [
    ["physical", "Physical wellness", "dumbbell", "mint"],
    ["mental", "Mental & anxiety support", "brain", "pink"],
    ["emotional", "Emotional well-being", "drop", "sky"],
    ["relationships", "Relationships & connection", "heart", "pink"],
    ["rest", "Rest & nervous-system recovery", "moon", "sky"],
    ["nutrition", "Nutrition & nourishment", "leaf", "butter"],
    ["spiritual", "Spiritual & soul care", "lotus", "mint"],
    ["identity", "Identity & personal growth", "feather", "butter"],
    ["boundaries", "Boundaries & empowerment", "scale", "pink"]
  ];
  var ALLOWED = ["Take up space", "Change my mind", "Ask for help", "Rest without guilt", "Put myself first", "Grow at my own pace"];

  A.views.selfcare = function () {
    var cards = AREAS.map(function (a) {
      return '<div class="c6">' + A.card(a[1],
        '<label class="lbl">I am ready to…</label>' + A.textarea("selfcare.areas." + a[0] + ".ready", 'rows="3" placeholder="One small thing I can say yes to…"', "hand") +
        '<label class="lbl" style="margin-top:12px">I want to work on…</label>' + A.textarea("selfcare.areas." + a[0] + ".work", 'rows="3" placeholder="What I’d like to grow in…"', "hand"),
        { icon: a[2], tone: a[3] }) + "</div>";
    }).join("");
    var allowed = ALLOWED.map(function (t, i) {
      return '<label class="row" style="gap:10px;align-items:center;margin-bottom:10px">' + A.checkbox("selfcare.allowed." + i) + '<span>' + esc(t) + "</span></label>";
    }).join("") + [0, 1].map(function (i) {
      return '<div class="row" style="gap:10px;align-items:center;margin-bottom:10px"><span aria-hidden="true">♡</span>' + A.input("selfcare.custom." + i, 'placeholder="I am allowed to…" maxlength="120"', "grow") + "</div>";
    }).join("");
    var support = [["reach", "People I can reach out to"], ["pro", "Professional support"], ["tools", "Tools & resources that help"], ["reminders", "Reminders for me"]].map(function (s) {
      return '<div class="c3">' + A.card(s[1], A.textarea("selfcare.support." + s[0], 'rows="4" placeholder="Names, numbers, places…"', "hand"), { icon: "bloom", tone: "" }) + "</div>";
    }).join("");
    return A.head("Align", 'Self-care <span class="soft">wheel</span>',
      "Look at each part of your life, notice what you feel ready for, and write what you’d like to work on. Go at your own pace.") +
      '<div class="grid">' +
      '<div class="c6">' + A.card("My intention", A.textarea("selfcare.intention", 'rows="3" placeholder="This season, I want to care for myself by…"', "hand"), { icon: "sparkle", tint: "grad" }) + "</div>" +
      '<div class="c6">' + A.card("How to use this", '<p class="small" style="margin:0 0 8px">Self-care looks different for everyone, and it can change from season to season. You are allowed to heal, to thrive, and to be yourself.</p><p class="small muted" style="margin:0">Fill in what feels true today. You can come back and change it at any time.</p>', { icon: "eye", tone: "" }) + "</div>" +
      cards +
      '<div class="c6">' + A.card("I am allowed to…", allowed, { icon: "heart", tone: "pink" }) + "</div>" +
      '<div class="c6">' + A.card("I matter", '<p class="hand" style="font-size:22px;margin:0 0 6px;text-align:center">My well-being matters. I am allowed to care for my whole self.</p><p class="small muted" style="margin:0;text-align:center">Small steps still count.</p>', { icon: "lotus", tone: "butter" }) + "</div>" +
      '<div class="c12">' + A.card("My support plan", '<div class="grid">' + support + "</div>", { icon: "compass", tone: "mint" }) + "</div>" +
      '<div class="c12"><div class="tip" style="margin:0">This page is a reflection tool, not therapy. If you are in crisis or thinking about harming yourself, contact your local emergency number or a crisis line now.</div></div>' +
      "</div>";
  };
})();
