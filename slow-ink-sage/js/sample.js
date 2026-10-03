/* Slow Ink Sage — sample data. A made-up planner (dates are relative to today) so a new buyer can see how
   a lived-in planner looks, and so the listing photos aren't of empty pages. "Start fresh" wipes it. */
(function () {
  "use strict";
  var SI = window.SI;

  function build() {
    var s = SI.defaultState(), t = SI.today(), K = function (n) { return SI.key(SI.addDays(t, n)); };
    function item(txt, done, key) { return { id: SI.uid(), t: txt, done: !!done, key: !!key }; }
    function day(k, intention, items, mood) { s.days[k] = { intention: intention || "", items: items, mood: mood || "", note: "" }; }

    day(K(-6), "Ease back in", [item("Plan the week", 1), item("Water the plants", 1), item("Call the dentist", 1)], "calm");
    day(K(-5), "", [item("Long walk after lunch", 1), item("Tidy the desk", 1)], "bright");
    day(K(-4), "Finish one thing well", [item("Draft the garden plan", 1), item("Reply to Sam", 1), item("Post the parcel", 0)], "okay");
    day(K(-3), "", [item("Book train tickets", 1), item("Meal prep", 1)], "calm");
    day(K(-2), "Say no to one thing", [item("Library books back", 1), item("Stretch for ten minutes", 1), item("Email the landlord", 1)], "bright");
    day(K(-1), "", [item("Batch-cook soup", 1), item("Sort the photos", 0)], "tired");
    day(K(0), "One calm, finished thing", [item("Write the outline for the garden project", 1), item("Pick up the repaired bike", 0), item("Order seeds for spring", 0), item("Ten minutes of stretching", 1)], "calm");
    day(K(1), "", [item("Farmers' market", 0), item("Call Gran", 0)]);
    day(K(2), "", [item("Finish the first draft", 0)]);
    day(K(5), "", [item("Dentist, 10:15", 0, true)]);
    day(K(12), "", [item("Mum's birthday dinner", 0, true), item("Buy a card", 0)]);
    day(K(24), "", [item("Garden project: first review", 0, true)]);
    day(K(41), "", [item("Weekend away", 0, true)]);

    var hw = "h-water", hm = "h-move", hr = "h-read", L = s.habitLog;
    L[hw] = {}; L[hm] = {}; L[hr] = {};
    for (var i = 0; i < 24; i++) {
      if (i % 9 !== 7) L[hw][K(-i)] = 1;                 /* mostly kept */
      if (i < 5 || i % 3 === 0) L[hm][K(-i)] = 1;        /* a current streak */
      if (i % 2 === 0 && i < 18) L[hr][K(-i)] = 1;
    }

    function steps(list) { return list.map(function (x) { return { id: SI.uid(), t: x[0], done: !!x[1] }; }); }
    s.goals = [
      { id: SI.uid(), title: "Run a 10k", why: "I want to feel strong, and to see the city on foot.", steps: steps([["Buy proper shoes", 1], ["Run 3k without stopping", 1], ["Run 5k", 1], ["Sign up for a race", 0], ["Run 8k", 0], ["Race day", 0]]) },
      { id: SI.uid(), title: "Read 24 books", why: "Two a month, no pressure. Short ones count.", steps: steps([["Make a reading list", 1], ["Finish book 6", 1], ["Finish book 12", 0], ["Finish book 18", 0], ["Finish book 24", 0]]) },
      { id: SI.uid(), title: "Learn to bake sourdough", why: "Slow, hands-on, and the house smells wonderful.", steps: steps([["Start a starter", 1], ["First loaf", 1], ["Try a rye blend", 0]]) }
    ];

    var mk = SI.monthKey(t.getFullYear(), t.getMonth());
    s.months[mk] = { focus: "Finish the garden plan and keep evenings free for reading." };
    s.reflections[mk] = { a: "Finished the outline early and walked every day.", b: "Small, steady steps beat big pushes.", c: "A calmer morning routine." };

    var page1 = {
      id: SI.uid(), section: "s-journal", title: "A slow Sunday", paper: "lined",
      html: "<h1>A slow Sunday</h1><p>Rain on the window, soup on the stove, and nowhere I have to be.</p><p><br></p><h2>Three good things</h2><ol><li>The market had the first plums</li><li>Finished a chapter, then a nap</li><li>A long phone call with Gran</li></ol><hr><p>Tomorrow: one small thing, done well.</p>",
      strokes: [], objects: [
        { id: SI.uid(), type: "sticker", key: "sprig", x: 0.72, y: 0.06, w: 0.14, rot: 14 },
        { id: SI.uid(), type: "sticker", key: "teacup", x: 0.7, y: 0.42, w: 0.16, rot: -8 }
      ], extra: 0, created: Date.now() - 86400000 * 2, updated: Date.now() - 86400000 * 2
    };
    var page2 = {
      id: SI.uid(), section: "s-ideas", title: "Garden project", paper: "dot",
      html: "<h1>Garden project</h1><h3>Ideas</h3><ul><li>A raised bed for herbs by the kitchen door</li><li>Sweet peas along the fence</li><li>A bench in the sunny corner</li></ul><h3>Next</h3><p>Measure the corner, then sketch it out.</p>",
      strokes: [], objects: [{ id: SI.uid(), type: "sticker", key: "seedling", x: 0.74, y: 0.08, w: 0.16, rot: 6 }], extra: 0, created: Date.now() - 86400000, updated: Date.now() - 86400000
    };
    [page1, page2].forEach(function (p) { p.text = SI.htmlToText(p.html); });
    s.notebook.pages[0].updated = Date.now() - 86400000 * 9; s.notebook.pages[0].created = s.notebook.pages[0].updated;
    s.notebook.pages.push(page1, page2);
    s.notebook.current = s.notebook.pages[0].id;
    s.sample = true;
    s.ui.onboardHidden = true;
    return s;
  }

  function hasContent() {
    var s = SI.state;
    return Object.keys(s.days).some(function (k) { return (s.days[k].items || []).length || s.days[k].intention; }) || s.goals.length || s.notebook.pages.length > 1 || Object.keys(s.habitLog).some(function (h) { return Object.keys(s.habitLog[h]).length; });
  }
  function replace(state, msg) {
    SI.images.replaceAll({}).then(function () {
      if (SI.state.ui.look) state.ui.look = SI.state.ui.look;   /* keep the chosen colours and font */
      SI.state = state;
      SI.saveNow();
      SI.toast(msg);
      window.location.hash = "#/today";
      SI.render();
    });
  }

  SI.actions["load-sample"] = function () {
    if (hasContent() && !window.confirm("Replace what's in this planner with the sample planner? You can start fresh again afterwards, but what you've written now will be lost. Back it up first if you want to keep it.")) return;
    replace(build(), "Sample planner loaded. Have a look around.");
  };
  SI.actions["start-fresh"] = function () {
    if (!window.confirm(SI.state.sample ? "Clear the sample planner and start with an empty one?" : "Erase everything in this planner and start fresh? Back it up first if you want to keep it.")) return;
    replace(SI.defaultState(), "Fresh planner ready.");
  };
  SI.actions["hide-start"] = function () { SI.state.ui.onboardHidden = true; SI.save(); SI.render(); };
  SI.actions["show-start"] = function () { SI.state.ui.onboardHidden = false; SI.save(); window.location.hash = "#/today"; SI.render(); };
})();
