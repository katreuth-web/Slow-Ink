/* Aura — Dream Life Script: write your ideal life in the present tense, one area at a time. */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic;

  /* each area: the question, a sentence starter, and a short affirmation you can save */
  var AREAS = [
    { id: "who", title: "Who I am", icon: "feather", tone: "pink", prompt: "Describe the person you are becoming: your mindset, values, habits and energy.", start: "I am…", affirm: "I am becoming the best version of myself." },
    { id: "health", title: "Health & wellness", icon: "lotus", tone: "mint", prompt: "How do you feel, move and care for your body? What does your daily routine look like?", start: "I enjoy…", affirm: "I choose health, energy and peace." },
    { id: "career", title: "Career & finances", icon: "wallet", tone: "sky", prompt: "What work lights you up? What income, financial freedom and impact do you create?", start: "I am so grateful that…", affirm: "Money flows to me easily and abundantly." },
    { id: "relations", title: "Relationships", icon: "heart", tone: "pink", prompt: "Who fills your life with love and support? Family, friends, partner and community.", start: "I am surrounded by…", affirm: "I attract and nurture loving, loyal relationships." },
    { id: "home", title: "Home & lifestyle", icon: "home", tone: "mint", prompt: "Describe your dream home, your surroundings and the things you love in your everyday life.", start: "I live in…", affirm: "My home is my happy place." },
    { id: "growth", title: "Personal growth", icon: "sprout", tone: "sky", prompt: "What are you learning, mastering and becoming? Skills, confidence and inner growth.", start: "I love that I…", affirm: "I grow every day in every way." },
    { id: "experiences", title: "Experiences & adventures", icon: "mountain", tone: "pink", prompt: "Where will you go? What will you experience and what memories will you make?", start: "I get to experience…", affirm: "Life is an amazing adventure and I enjoy every moment." }
  ];
  var REMINDERS = ["I think positive thoughts.", "I take aligned action every day.", "I trust the process.", "I am open to receive.", "I deserve all my desires."];

  A.views.dream = function () {
    var cards = AREAS.map(function (a) {
      return '<div class="c6">' + A.card(a.title,
        A.textarea("dream.parts." + a.id, 'rows="4" placeholder="' + esc(a.start) + '"', "hand") +
        '<div class="row" style="justify-content:space-between;margin-top:10px;flex-wrap:wrap;gap:8px"><span class="small muted">“' + esc(a.affirm) + '”</span>' +
        '<button class="btn xs soft" data-act="dream-affirm" data-text="' + esc(a.affirm) + '">' + ic("plus") + "Save as affirmation</button></div>",
        { icon: a.icon, tone: a.tone, sub: esc(a.prompt) }) + "</div>";
    }).join("");
    return A.head("Align", 'Dream life <span class="soft">script</span>',
      "Write your dream life in the present tense, as if it is already happening. Be specific, add feelings and gratitude, then read it every day.") +
      '<div class="grid">' +
      '<div class="c12">' + A.card("How to use this script", '<p class="small muted" style="margin:0">Write each part as “I am…”, “I live in…”, “I get to…”. Don’t worry about how it will happen yet. Read it slowly, feel it, then let the affirmations carry it into your day.</p>', { icon: "sparkle", tint: "grad" }) + "</div>" +
      cards +
      '<div class="c6">' + A.card("I am deeply grateful for…", A.textarea("dream.grateful", 'rows="6" placeholder="One thing per line…"', "hand"), { icon: "heart", tone: "pink" }) + "</div>" +
      '<div class="c6">' + A.card("My dream life in one paragraph", A.textarea("dream.paragraph", 'rows="6" placeholder="Describe your ideal day, as if it is already happening…"', "hand"), { icon: "star", tone: "mint", sub: "Bring it all together. Write your perfect day in detail." }) + "</div>" +
      '<div class="c12">' + A.card("Daily reminders", '<ul class="insights" style="margin:0">' + REMINDERS.map(function (r) { return '<li class="li"><span class="li-text">' + esc(r) + "</span></li>"; }).join("") + "</ul>" +
        '<p class="hand" style="text-align:center;font-size:24px;margin:16px 0 0">I don’t just dream my life, I create it.</p>', { icon: "check", tone: "" }) + "</div>" +
      "</div>";
  };

  A.acts["dream-affirm"] = function (el) {
    var t = (el.getAttribute("data-text") || "").slice(0, 140), list = A.state.affirm.custom;
    if (list.some(function (c) { return c.text === t; })) { A.toast("That one is already in your affirmations."); return; }
    list.unshift({ id: A.uid(), text: t });
    A.save(); A.toast("Saved to your affirmations.");
  };
})();
