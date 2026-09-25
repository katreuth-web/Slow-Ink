/* Aura — life design & mental models: Level 10 Life, Ikigai, Eisenhower, SMART goals, mind map, vision board. */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic;

  /* ------------------------------------------------------------ Level 10 Life wheel */
  function wheelSVG() {
    var areas = A.state.wheel.areas, n = areas.length || 1, cx = 210, cy = 210, R = 150;
    var s = '<svg viewBox="0 0 420 420" role="img" aria-label="Level 10 Life wheel">';
    for (var r = 2; r <= 10; r += 2) s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R * r / 10) + '" fill="none" stroke="rgba(155,123,255,' + (r === 10 ? 0.35 : 0.14) + ')" stroke-dasharray="' + (r === 10 ? "0" : "3 4") + '"/>';
    areas.forEach(function (a, i) {
      var a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
      var rr = R * A.clamp(a.score, 0, 10) / 10;
      var x0 = cx + rr * Math.cos(a0), y0 = cy + rr * Math.sin(a0), x1 = cx + rr * Math.cos(a1), y1 = cy + rr * Math.sin(a1);
      s += '<path d="M' + cx + " " + cy + " L" + x0.toFixed(1) + " " + y0.toFixed(1) + " A" + rr + " " + rr + " 0 0 1 " + x1.toFixed(1) + " " + y1.toFixed(1) + ' Z" fill="' + a.color + '" fill-opacity=".72" stroke="#fff" stroke-width="2"/>';
      var sx = cx + R * Math.cos(a0), sy = cy + R * Math.sin(a0);
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + sx.toFixed(1) + '" y2="' + sy.toFixed(1) + '" stroke="rgba(155,123,255,.18)"/>';
      var am = (a0 + a1) / 2, lx = cx + (R + 26) * Math.cos(am), ly = cy + (R + 26) * Math.sin(am);
      s += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" font-size="11.5" font-weight="600" fill="#4a4460">' + esc(a.name) + "</text>";
      s += '<text x="' + (lx).toFixed(1) + '" y="' + (ly + 13).toFixed(1) + '" text-anchor="middle" font-size="10" fill="#847d99">' + a.score + "/10</text>";
    });
    return s + '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="#fff" stroke="#B69CFF" stroke-width="2"/></svg>';
  }
  A.views.wheel = function () {
    var w = A.state.wheel, areas = w.areas;
    var avg = areas.reduce(function (s, a) { return s + a.score; }, 0) / (areas.length || 1);
    var low = areas.slice().sort(function (a, b) { return a.score - b.score; }).slice(0, 3);
    var rows = areas.map(function (a, i) {
      return '<div class="slider-row"><i class="swatch" style="background:' + a.color + ';width:14px;height:14px"></i>' +
        A.input("wheel.areas." + i + ".name", "", "bare") +
        '<input type="range" min="0" max="10" step="1" value="' + a.score + '" data-bind="wheel.areas.' + i + '.score" data-live="wheel-live" data-i="' + i + '" aria-label="' + esc(a.name) + ' score" />' +
        '<b id="wheel-v' + i + '">' + a.score + "</b></div>";
    }).join("");
    return A.head("Life design", 'Level 10 <span class="soft">Life</span>', "Score each area from 0–10. A 10 is your ideal — then turn the lowest areas into SMART goals.") +
      '<div class="grid">' +
      '<div class="c6">' + A.card("Your wheel", '<div class="wheel-wrap" id="wheel-svg">' + wheelSVG() + "</div>", { icon: "compass", tint: "grad" }) + "</div>" +
      '<div class="c6 stack">' +
        A.card("Scores", rows, { icon: "target", tools: '<span class="badge" id="wheel-avg">avg ' + avg.toFixed(1) + "</span>" }) +
        A.card("Where to grow", '<ul class="list">' + low.map(function (a) {
          return '<li class="li"><i class="swatch" style="background:' + a.color + ';width:12px;height:12px"></i><span class="li-text"><b>' + esc(a.name) + "</b> · " + a.score + '/10</span><button class="btn xs soft" data-act="wheel-goal" data-area="' + esc(a.name) + '">' + ic("flag") + "Set goal</button></li>";
        }).join("") + "</ul>" + '<label class="lbl">What would make each a 10?</label>' + A.textarea("wheel.notes", 'rows="4" placeholder="Describe your level 10 life…"'), { icon: "flag", tone: "pink" }) +
      "</div></div>";
  };
  A.acts["wheel-live"] = function (el) {
    var i = el.getAttribute("data-i"), v = document.getElementById("wheel-v" + i);
    if (v) v.textContent = el.value;
    document.getElementById("wheel-svg").innerHTML = wheelSVG();
    var areas = A.state.wheel.areas, avg = areas.reduce(function (s, a) { return s + a.score; }, 0) / areas.length;
    document.getElementById("wheel-avg").textContent = "avg " + avg.toFixed(1);
  };
  A.newGoal = function (fields) {
    var g = { id: A.uid(), title: "", area: "", s: "", m: "", a: "", r: "", t: "", progress: 0, milestones: [], open: true };
    Object.keys(fields || {}).forEach(function (k) { g[k] = fields[k]; });
    A.state.goals.unshift(g);
    A.save();
    return g;
  };
  A.acts["wheel-goal"] = function (el) {
    var area = el.getAttribute("data-area");
    A.newGoal({ title: "Raise " + area + " to a 10", area: area });
    location.hash = "#/goals";
    A.toast("Goal drafted for " + area + " — make it SMART.");
  };

  /* ------------------------------------------------------------ Ikigai */
  var IKI = [
    ["love", "What you love", "#FF9ED2"],
    ["good", "What you're good at", "#B69CFF"],
    ["need", "What the world needs", "#8FD9C0"],
    ["paid", "What you can be paid for", "#9CC7FF"]
  ];
  function ikigaiSVG() {
    var c = { love: [230, 150], good: [150, 230], need: [310, 230], paid: [230, 310] };
    var s = '<svg class="ikigai-svg" viewBox="0 0 460 460" role="img" aria-label="Ikigai diagram">';
    IKI.forEach(function (x) { s += '<circle cx="' + c[x[0]][0] + '" cy="' + c[x[0]][1] + '" r="112" fill="' + x[2] + '" fill-opacity=".38" stroke="#fff" stroke-width="2"/>'; });
    var t = function (x, y, txt, size, w, col) { return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="' + size + '" font-weight="' + w + '" fill="' + (col || "#4a4460") + '">' + txt + "</text>"; };
    s += t(230, 88, "Love", 13, 600) + t(88, 234, "Skill", 13, 600) + t(372, 234, "Need", 13, 600) + t(230, 382, "Paid", 13, 600);
    s += t(172, 176, "Passion", 11.5, 500) + t(288, 176, "Mission", 11.5, 500) + t(172, 292, "Profession", 11.5, 500) + t(288, 292, "Vocation", 11.5, 500);
    s += '<circle cx="230" cy="230" r="30" fill="#fff" fill-opacity=".9"/>' + t(230, 235, "Ikigai", 13, 700, "#7A5AF0");
    return s + "</svg>";
  }
  A.views.ikigai = function () {
    var ik = A.state.ikigai;
    var lists = IKI.map(function (x) {
      var arr = ik[x[0]] || [];
      return '<div class="c6">' + A.card(x[1], '<div class="chips">' + arr.map(function (it, i) {
        return '<span class="chip" style="background:' + x[2] + '33;color:var(--ink-2)">' + esc(it.text) + '<button class="x-btn" data-act="list-remove" data-list="ikigai.' + x[0] + '" data-idx="' + i + '" aria-label="Remove">' + ic("x") + "</button></span>";
      }).join("") + "</div>" + A.addRow("ikigai." + x[0], "Add…"), { icon: "heart", tone: x[0] === "love" ? "pink" : x[0] === "need" ? "mint" : x[0] === "paid" ? "sky" : "" }) + "</div>";
    }).join("");
    var inter = [["passion", "Passion", "love + skill"], ["mission", "Mission", "love + need"], ["profession", "Profession", "skill + paid"], ["vocation", "Vocation", "need + paid"]].map(function (x) {
      return '<label class="lbl">' + x[1] + ' <span style="text-transform:none;letter-spacing:0;font-weight:400">· ' + x[2] + "</span></label>" + A.input("ikigai." + x[0], 'placeholder="Where these overlap for me…"');
    }).join("");
    return A.head("Life design", 'Ikigai <span class="soft">assessment</span>', "Fill the four circles, then look for the overlaps. Your ikigai lives where all four meet.") +
      '<div class="grid">' +
      '<div class="c6">' + A.card("Your ikigai map", ikigaiSVG(), { icon: "sparkle", tint: "grad" }) + "</div>" +
      '<div class="c6">' + A.card("Intersections", inter + '<label class="lbl">My ikigai statement</label>' + A.textarea("ikigai.statement", 'rows="3" placeholder="I feel most alive when I…"', "hand"), { icon: "target", tone: "pink" }) + "</div>" +
      lists + "</div>";
  };

  /* ------------------------------------------------------------ Eisenhower matrix */
  var QUAD_INFO = {
    do: ["Do first", "Urgent & important", "pink"],
    plan: ["Schedule", "Important, not urgent", ""],
    delegate: ["Delegate", "Urgent, not important", "sky"],
    drop: ["Eliminate", "Neither — let it go", "butter"]
  };
  A.views.matrix = function () {
    var tk = A.todayKey(), today = A.day(tk);
    var quad = function (q) {
      var info = QUAD_INFO[q], arr = A.state.matrix[q];
      var tagged = today.tasks.filter(function (t) { return t.q === q; });
      var items = arr.map(function (it, i) {
        return '<li class="li' + (it.done ? " done" : "") + '">' + A.checkbox("matrix." + q + "." + i + ".done") + A.input("matrix." + q + "." + i + ".text", "", "bare") +
          (q !== "drop" ? '<button class="btn xs soft" data-act="matrix-today" data-q="' + q + '" data-i="' + i + '" title="Add to today’s tasks">' + ic("arrowR") + "Today</button>" : "") +
          '<button class="x-btn" data-act="list-remove" data-list="matrix.' + q + '" data-idx="' + i + '" aria-label="Remove">' + ic("x") + "</button></li>";
      }).join("");
      return A.card(info[0], (items ? '<ul class="list">' + items + "</ul>" : '<div class="empty">Nothing here yet.</div>') + A.addRow("matrix." + q, "Add to " + info[0].toLowerCase()) +
        (tagged.length ? '<p class="lbl" style="margin-top:14px">Tagged on today’s page</p><div class="chips">' + tagged.map(function (t) { return '<span class="chip' + (t.done ? " mint" : "") + '">' + esc(t.text) + "</span>"; }).join("") + "</div>" : ""),
        { icon: q === "do" ? "bolt" : q === "plan" ? "calendar" : q === "delegate" ? "send" : "trash", tone: info[2], sub: info[1], tint: q === "do" ? "pink" : q === "plan" ? "lav" : "" });
    };
    return A.head("Mental models", 'Eisenhower <span class="soft">priority matrix</span>', "Sort by urgency and importance, then send what matters to today’s focus page.", '<a class="btn ghost sm" href="#/day/today">' + ic("calendar") + "Today’s page</a>") +
      '<div class="matrix-axis"><span>Urgent</span><span>Not urgent</span></div>' +
      '<div class="matrix">' + quad("do") + quad("plan") + quad("delegate") + quad("drop") + "</div>";
  };
  A.acts["matrix-today"] = function (el) {
    var q = el.getAttribute("data-q"), it = A.state.matrix[q][+el.getAttribute("data-i")];
    if (!it.text) return;
    A.addTask(A.todayKey(), it.text, { q: q });
    A.toast("Added to today’s tasks");
    A.render();
  };

  /* ------------------------------------------------------------ SMART goals */
  A.views.goals = function () {
    var areas = A.state.wheel.areas.map(function (a) { return a.name; });
    var cards = A.state.goals.map(function (g, gi) {
      var ms = g.milestones || [], done = ms.filter(function (m) { return m.done; }).length;
      var pct = ms.length ? done / ms.length : A.num(g.progress) / 100;
      var p = "goals." + gi;
      var days = g.t ? Math.ceil((A.parseD(g.t) - A.today()) / 864e5) : null;
      var body = '<div class="row" style="gap:14px;align-items:flex-start">' + A.ring(pct, 72) +
        '<div class="grow">' + A.input(p + ".title", 'placeholder="Goal title" style="font-weight:600;font-size:15px"', "bare") +
        '<div class="row wrap" style="margin-top:6px"><select class="field" style="width:auto" data-bind="' + p + '.area"><option value="">Life area…</option>' + areas.map(function (a) { return "<option" + (a === g.area ? " selected" : "") + ">" + esc(a) + "</option>"; }).join("") + "</select>" +
        '<input class="field" type="date" style="width:auto" data-bind="' + p + '.t" data-rerender value="' + esc(g.t) + '" />' +
        (days != null ? '<span class="badge ' + (days < 0 ? "pink" : "mint") + '">' + (days < 0 ? Math.abs(days) + " days over" : days + " days left") + "</span>" : "") + "</div></div>" +
        '<div class="row"><button class="icon-btn sm" data-act="goal-toggle" data-i="' + gi + '" aria-label="Expand">' + ic(g.open ? "chevL" : "chevR") + '</button><button class="x-btn" data-act="goal-del" data-i="' + gi + '" aria-label="Delete goal">' + ic("trash") + "</button></div></div>";
      if (g.open) {
        body += '<div class="smart-grid" style="margin-top:14px">' + [["s", "Specific", "What exactly?"], ["m", "Measurable", "How will I know?"], ["a", "Achievable", "Why is it realistic?"], ["r", "Relevant", "Why does it matter?"]].map(function (x) {
          return '<label><span class="lbl"><span class="letter">' + x[0].toUpperCase() + "</span>" + x[1] + "</span>" + A.textarea(p + "." + x[0], 'rows="2" placeholder="' + x[2] + '"') + "</label>";
        }).join("") + "</div>" +
          '<label class="lbl"><span class="letter" style="display:inline-grid;place-items:center;width:20px;height:20px;border-radius:6px;background:var(--grad);color:#fff;margin-right:5px">T</span>Milestones</label>' +
          A.checklist(p + ".milestones", "Add a milestone", "") +
          (ms.length ? "" : '<label class="lbl">Manual progress · ' + (g.progress || 0) + '%</label><input type="range" min="0" max="100" step="5" value="' + (g.progress || 0) + '" data-bind="' + p + '.progress" data-rerender />');
      }
      return '<div class="c6">' + A.card("", body, { cls: "goal-card" }) + "</div>";
    }).join("");
    return A.head("Life design", 'SMART goals <span class="soft">& milestones</span>', "Specific, measurable, achievable, relevant and time-bound. Progress rings fill as milestones get checked off.", '<button class="btn" data-act="goal-add">' + ic("plus") + "New goal</button>") +
      (cards ? '<div class="grid">' + cards + "</div>" : A.card("", '<div class="empty">No goals yet. Start from your <a href="#/wheel">Level 10 Life</a> wheel or add one above.</div>'));
  };
  A.acts["goal-add"] = function () { A.newGoal(); A.render(); };
  A.acts["goal-toggle"] = function (el) { var g = A.state.goals[+el.getAttribute("data-i")]; g.open = !g.open; A.save(); A.render(); };
  A.acts["goal-del"] = function (el) {
    var i = +el.getAttribute("data-i");
    if (!confirm("Delete this goal?")) return;
    A.state.goals.splice(i, 1); A.save(); A.render();
  };

  /* ------------------------------------------------------------ Mind map */
  function mmPaths(nodes, box) {
    var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; });
    return nodes.filter(function (n) { return n.parent && byId[n.parent]; }).map(function (n) {
      var p = byId[n.parent], x1 = p.x / 100 * box.w, y1 = p.y / 100 * box.h, x2 = n.x / 100 * box.w, y2 = n.y / 100 * box.h, mx = (x1 + x2) / 2;
      return '<path d="M' + x1 + " " + y1 + " C" + mx + " " + y1 + " " + mx + " " + y2 + " " + x2 + " " + y2 + '" fill="none" stroke="' + n.color + '" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>';
    }).join("");
  }
  A.views.mindmap = function () {
    var mm = A.state.mindmap, sel = A.state.ui.mmSel || "root";
    var si = mm.nodes.findIndex(function (n) { return n.id === sel; });
    if (si < 0) { si = 0; sel = mm.nodes[0].id; }
    var tools = '<div class="mm-tools"><input class="field" id="mm-text" data-bind="mindmap.nodes.' + si + '.text" data-live="mm-text" placeholder="Node text" />' +
      '<button class="btn sm" data-act="mm-add">' + ic("plus") + "Branch</button>" +
      '<div class="swatches">' + A.PALETTE.slice(0, 6).map(function (c) { return '<button class="swatch' + (mm.nodes[si].color === c ? " on" : "") + '" style="background:' + c + '" data-act="mm-color" data-c="' + c + '" aria-label="Colour"></button>'; }).join("") + "</div>" +
      (sel !== "root" ? '<button class="btn sm danger" data-act="mm-del">' + ic("trash") + "</button>" : "") + "</div>";
    var nodes = mm.nodes.map(function (n) {
      return '<div class="mm-node' + (n.id === "root" ? " root" : "") + (n.id === sel ? " sel" : "") + '" data-node="' + n.id + '" style="left:' + n.x + "%;top:" + n.y + "%;--c:" + n.color + '">' + esc(n.text || "…") + "</div>";
    }).join("");
    A.afterRender = function () {
      var box = document.getElementById("mm"), svg = document.getElementById("mm-svg");
      var draw = function () { svg.innerHTML = mmPaths(mm.nodes, { w: box.clientWidth, h: box.clientHeight }); };
      draw();
      var drag = null;
      box.addEventListener("pointerdown", function (e) {
        var el = e.target.closest(".mm-node");
        if (!el) return;
        var n = mm.nodes.find(function (x) { return x.id === el.getAttribute("data-node"); });
        drag = { el: el, n: n, moved: false, sx: e.clientX, sy: e.clientY };
        el.setPointerCapture(e.pointerId);
      });
      box.addEventListener("pointermove", function (e) {
        if (!drag) return;
        if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 4) drag.moved = true;
        if (!drag.moved) return;
        var r = box.getBoundingClientRect();
        drag.n.x = A.clamp((e.clientX - r.left) / r.width * 100, 4, 96);
        drag.n.y = A.clamp((e.clientY - r.top) / r.height * 100, 5, 95);
        drag.el.style.left = drag.n.x + "%"; drag.el.style.top = drag.n.y + "%";
        draw();
      });
      box.addEventListener("pointerup", function () {
        if (!drag) return;
        var d = drag; drag = null;
        if (d.moved) A.save();
        else { A.state.ui.mmSel = d.n.id; A.save(); A.render(); var t = document.getElementById("mm-text"); if (t) t.focus(); }
      });
      window.addEventListener("resize", draw);
      A.cleanup = function () { window.removeEventListener("resize", draw); };
    };
    return A.head("Creative brainstorming", 'Mind <span class="soft">map</span>', "Tap a bubble to select it, drag to arrange, and branch out your ideas.") +
      A.card("", '<div class="mindmap" id="mm">' + tools + '<svg id="mm-svg"></svg>' + nodes + "</div>", {});
  };
  A.acts["mm-text"] = function (el) {
    var sel = A.state.ui.mmSel || "root", node = document.querySelector('.mm-node[data-node="' + sel + '"]');
    if (node) node.textContent = el.value || "…";
  };
  A.acts["mm-add"] = function () {
    var mm = A.state.mindmap, sel = A.state.ui.mmSel || "root";
    var p = mm.nodes.find(function (n) { return n.id === sel; }) || mm.nodes[0];
    var kids = mm.nodes.filter(function (n) { return n.parent === p.id; }).length;
    var ang = (kids * 52 + (p.id === "root" ? -90 : 0)) * Math.PI / 180, dist = p.id === "root" ? 24 : 16;
    var n = { id: A.uid(), text: "New idea", x: A.clamp(p.x + Math.cos(ang) * dist, 6, 94), y: A.clamp(p.y + Math.sin(ang) * dist * 1.4, 8, 92), color: p.id === "root" ? A.PALETTE[(kids + 1) % 6] : p.color, parent: p.id };
    mm.nodes.push(n);
    A.state.ui.mmSel = n.id;
    A.save(); A.render();
    var t = document.getElementById("mm-text"); if (t) { t.focus(); t.select(); }
  };
  A.acts["mm-color"] = function (el) {
    var sel = A.state.ui.mmSel || "root", n = A.state.mindmap.nodes.find(function (x) { return x.id === sel; });
    if (n) { n.color = el.getAttribute("data-c"); A.save(); A.render(); }
  };
  A.acts["mm-del"] = function () {
    var mm = A.state.mindmap, sel = A.state.ui.mmSel;
    var kill = [sel], changed = true;
    while (changed) {
      changed = false;
      mm.nodes.forEach(function (n) { if (n.parent && kill.indexOf(n.parent) >= 0 && kill.indexOf(n.id) < 0) { kill.push(n.id); changed = true; } });
    }
    mm.nodes = mm.nodes.filter(function (n) { return kill.indexOf(n.id) < 0; });
    A.state.ui.mmSel = "root"; A.save(); A.render();
  };

  /* ------------------------------------------------------------ Vision board */
  A.views.vision = function () {
    var v = A.state.vision;
    var tiles = v.tiles.map(function (t, i) {
      var x = '<button class="x-btn tile-x" data-act="vision-del" data-i="' + i + '" aria-label="Remove tile">' + ic("trash") + "</button>";
      if (t.type === "quote") return '<div class="v-tile quote">' + A.textarea("vision.tiles." + i + ".text", 'rows="3" placeholder="An inspiring quote…"') + x + "</div>";
      var url = A.images.url(t.img);
      return '<div class="v-tile">' + (url ? '<img src="' + url + '" alt="' + esc(t.caption || "Vision board image") + '" loading="lazy" />' : '<div class="empty" style="margin:10px">Image missing</div>') +
        '<div class="cap">' + A.input("vision.tiles." + i + ".caption", 'placeholder="Add a caption"', "bare") + "</div>" + x + "</div>";
    }).join("");
    return A.head("Aspirations", 'Vision <span class="soft">board</span>', "Collect images and words that feel like the life you’re building.", '<button class="btn ghost sm" data-act="vision-quote">' + ic("quote") + "Add quote</button>") +
      '<div class="grid" style="margin-bottom:16px"><div class="c8">' + A.card("", A.input("vision.title", 'placeholder="Board title"', "bare hand") + '<p class="small muted" style="margin:4px 6px 0">Photos are resized and stored privately in this browser.</p>', { tint: "grad" }) + "</div>" +
      '<div class="c4">' + A.card("", A.dropzone("vision", "Upload images", true), {}) + "</div></div>" +
      (tiles ? '<div class="vision-board">' + tiles + "</div>" : A.card("", '<div class="empty">Your board is empty — upload a few photos or add a quote to begin.</div>'));
  };
  A.uploads.vision = function (files) {
    A.toast("Adding " + files.length + " image" + (files.length > 1 ? "s" : "") + "…");
    Promise.all(files.map(function (f) { return A.images.add(f).catch(function (e) { A.toast(e.message); return null; }); })).then(function (ids) {
      ids.filter(Boolean).forEach(function (id) { A.state.vision.tiles.push({ id: A.uid(), type: "image", img: id, caption: "" }); });
      A.save(); A.render();
    });
  };
  A.acts["vision-quote"] = function () {
    A.state.vision.tiles.unshift({ id: A.uid(), type: "quote", text: "" });
    A.save(); A.render();
    var q = document.querySelector(".v-tile.quote textarea"); if (q) q.focus();
  };
  A.acts["vision-del"] = function (el) {
    var i = +el.getAttribute("data-i"), t = A.state.vision.tiles[i];
    if (t.type === "image") A.images.remove(t.img);
    A.state.vision.tiles.splice(i, 1); A.save(); A.render();
  };
})();
