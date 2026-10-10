/* Aura — Reframe Beliefs: name a limiting belief, see what it costs, and write a fairer one to practise. */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic;

  /* starting points you can tap to use: a common limiting belief and a more useful way to say it */
  var LIBRARY = [
    ["I don’t have time.", "I can choose what matters and make room for it."],
    ["I’ll never have enough.", "There is enough, and more is on its way to me."],
    ["I can’t do this.", "I can learn this one step at a time."],
    ["I’m not good enough.", "I bring real strengths, and I’m still growing."],
    ["I’ll never succeed.", "Progress counts, even when it’s slow."],
    ["I always mess things up.", "Mistakes teach me, and I can recover from them."],
    ["I’m a failure.", "I had a setback. It does not define me."],
    ["It’s too risky.", "I can take small, careful steps."],
    ["I don’t deserve happiness.", "Joy is available to me, and I can receive it."],
    ["I’m not worthy of love.", "I deserve the kindness I give to others."],
    ["I’m stuck.", "I can find the next small step."],
    ["I have to do everything perfectly.", "Good enough is a real achievement."],
    ["I’m too old to change.", "It’s never too late to begin something new."]
  ];
  var DEEP = [
    { id: "origin", title: "Where did this belief come from?", prompt: "A person, a moment, a message you absorbed. Write what you remember." },
    { id: "cost", title: "What does it cost me?", prompt: "How does this belief show up in what I do, avoid or say to myself?" },
    { id: "forEv", title: "Evidence for it", prompt: "What seems to support this belief? Stick to facts you can point to." },
    { id: "againstEv", title: "Evidence against it", prompt: "What doesn’t fit? A time it wasn’t true, even a little?" }
  ];
  var TRAPS = [
    ["All or nothing", "Seeing things as either perfect or a failure, with no middle."],
    ["Mind reading", "Assuming you know what others think of you without checking."],
    ["Catastrophising", "Jumping to the worst possible outcome."],
    ["Should statements", "“I should have…” judgements that leave you feeling guilty."],
    ["Labelling", "Calling yourself “a failure” instead of saying you made a mistake."]
  ];

  function pairRow(p, i) {
    return '<div class="belief-row" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:12px">' +
      '<div style="flex:1 1 180px;min-width:0">' + (i === 0 ? '<label class="lbl">Limiting belief</label>' : "") + A.input("beliefs.pairs." + i + ".from", 'placeholder="I don’t have time." aria-label="Limiting belief ' + (i + 1) + '"') + "</div>" +
      '<span class="small muted" aria-hidden="true">→</span>' +
      '<div style="flex:1 1 180px;min-width:0">' + (i === 0 ? '<label class="lbl">Reframed belief</label>' : "") + A.input("beliefs.pairs." + i + ".to", 'placeholder="I can make room for what matters." aria-label="Reframed belief ' + (i + 1) + '"') + "</div>" +
      '<div class="row" style="gap:6px">' +
        '<button class="btn xs soft" data-act="beliefs-affirm" data-i="' + i + '">' + ic("plus") + "Affirm</button>" +
        '<button class="btn xs ghost" data-act="beliefs-del" data-i="' + i + '" aria-label="Remove this pair">' + ic("x") + "</button>" +
      "</div></div>";
  }

  A.views.beliefs = function () {
    var pairs = A.state.beliefs.pairs;
    var rows = pairs.length ? pairs.map(pairRow).join("") : '<p class="small muted">Write a limiting belief and how you’d rather think about it, or pick one from the library below.</p>';
    var lib = LIBRARY.map(function (x, i) {
      return '<li class="li" style="align-items:center"><span class="li-text"><b>' + esc(x[0]) + "</b> → " + esc(x[1]) + '</span><button class="btn xs soft" data-act="beliefs-use" data-i="' + i + '">' + ic("plus") + "Use</button></li>";
    }).join("");
    var deep = DEEP.map(function (d) {
      return '<div class="c6">' + A.card(d.title, A.textarea("beliefs.deep." + d.id, 'rows="4" placeholder="' + esc(d.prompt) + '"', "hand"), { icon: "feather", tone: "" }) + "</div>";
    }).join("");
    var traps = TRAPS.map(function (t) { return '<li class="li"><span class="li-text"><b>' + esc(t[0]) + "</b> · " + esc(t[1]) + "</span></li>"; }).join("");
    return A.head("Manifest", 'Reframe <span class="soft">beliefs</span>',
      "Limiting beliefs quietly decide what you try. Name them, notice what they cost, then write a fairer belief you can practise.") +
      '<div class="grid">' +
      '<div class="c12">' + A.card("How to use this page", '<ol class="insights" style="margin:0;padding-left:20px"><li>Name the belief, in your own words.</li><li>Look at what it costs you and what evidence there really is.</li><li>Write a balanced belief and one small action to test it.</li></ol>', { icon: "sparkle", tint: "grad" }) + "</div>" +
      '<div class="c12">' + A.card("Your reframes", rows + '<button class="btn sm soft" data-act="beliefs-add">' + ic("plus") + "Add a pair</button>", { icon: "refresh", tone: "pink" }) + "</div>" +
      '<div class="c12">' + A.card("Library of shifts", '<p class="small muted" style="margin:0 0 8px">Tap “Use” to copy one into your reframes, then make it your own.</p><ul class="insights" style="margin:0">' + lib + "</ul>", { icon: "book", tone: "mint" }) + "</div>" +
      '<div class="c12">' + A.card("Dig deeper", '<label class="lbl">The belief I’m examining</label>' + A.textarea("beliefs.deep.belief", 'rows="2" placeholder="I can’t change myself."', "hand"), { icon: "target", tone: "" }) + "</div>" +
      deep +
      '<div class="c12">' + A.card("My balanced belief", A.textarea("beliefs.deep.balanced", 'rows="3" placeholder="A fairer statement I can believe today…"', "hand") +
        '<label class="lbl" style="margin-top:14px">One small action to test it this week</label>' + A.textarea("beliefs.deep.action", 'rows="2" placeholder="Something small and specific…"', "hand"), { icon: "sprout", tone: "mint" }) + "</div>" +
      '<div class="c12">' + A.card("Common thinking traps", '<p class="small muted" style="margin:0 0 8px">When a thought feels absolute, check whether it is one of these.</p><ul class="insights" style="margin:0">' + traps + "</ul>", { icon: "eye", tone: "" }) + "</div>" +
      "</div>";
  };

  A.acts["beliefs-add"] = function () {
    A.state.beliefs.pairs.push({ id: A.uid(), from: "", to: "" }); A.save(); A.render();
  };
  A.acts["beliefs-del"] = function (el) {
    A.state.beliefs.pairs.splice(+el.getAttribute("data-i"), 1); A.save(); A.render();
  };
  A.acts["beliefs-use"] = function (el) {
    var x = LIBRARY[+el.getAttribute("data-i")];
    if (!x) return;
    A.state.beliefs.pairs.push({ id: A.uid(), from: x[0], to: x[1] }); A.save(); A.render();
    A.toast("Added. Make it your own.");
  };
  A.acts["beliefs-affirm"] = function (el) {
    var p = A.state.beliefs.pairs[+el.getAttribute("data-i")], t = p && p.to.trim().slice(0, 140);
    if (!t) { A.toast("Write the reframed belief first."); return; }
    if (A.state.affirm.custom.some(function (c) { return c.text === t; })) { A.toast("That one is already in your affirmations."); return; }
    A.state.affirm.custom.unshift({ id: A.uid(), text: t }); A.save(); A.toast("Saved to your affirmations.");
  };
})();
