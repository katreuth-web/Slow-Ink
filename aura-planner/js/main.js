/* Aura — settings drawer (backup, restore, reset) and boot. */
(function () {
  "use strict";
  var A = window.Aura, ic = A.ic;

  A.acts["open-settings"] = function () {
    var used = 0;
    try { used = (localStorage.getItem("aura-planner-v1") || "").length; } catch (e) { /* ignore */ }
    A.openDrawer(
      '<div class="card-head"><h2 class="card-title"><span class="ico">' + ic("gear") + '</span>Settings</h2><button class="icon-btn sm" data-act="close-drawer" aria-label="Close">' + ic("x") + "</button></div>" +
      '<p class="small muted">Everything is saved automatically in this browser — planner data in local storage (' + Math.round(used / 1024) + " KB), photos in IndexedDB.</p>" +
      '<label class="lbl">Backup</label><div class="stack" style="gap:8px">' +
      '<button class="btn" data-act="export">' + ic("download") + "Export backup (.json)</button>" +
      '<label class="btn ghost">' + ic("upload") + 'Import backup<input type="file" accept="application/json,.json" hidden id="import-file" /></label>' +
      '<button class="btn danger" data-act="reset">' + ic("trash") + "Reset planner</button></div>" +
      '<label class="lbl">About</label><p class="small muted" style="margin:0">Aura is a private planner for reflection and intention-setting. There is no account and no server. The only outside connection is the optional written reflection, which talks to Anthropic only if you add your own API key.</p>'
    );
  };
  A.acts["close-drawer"] = function () { A.closeDrawer(); A.render(); };
  document.getElementById("scrim").addEventListener("click", function () { A.closeDrawer(); A.render(); });

  A.acts["export"] = function () {
    A.state.ui.backedUp = true;
    A.saveNow();
    if (A.route.name === "home") A.render();
    A.images.exportAll().then(function (imgs) {
      var blob = new Blob([JSON.stringify({ app: "aura-planner", version: 2, exported: new Date().toISOString(), state: A.state, images: imgs })], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "aura-planner-" + A.todayKey() + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });
  };
  /* ------------------------------------------------------------ safe restore */
  /* A backup file is untrusted: rebuild the state from known fields only, so a tampered file
     can't smuggle in markup, odd ids or oversized data. */
  var ID = /^[A-Za-z0-9_-]{1,40}$/, DKEY = /^\d{4}-\d{2}-\d{2}$/, MKEY = /^\d{4}-\d{2}$/, YKEY = /^\d{4}$/, HEX = /^#[0-9a-f]{3,8}$/i;
  var PAPERS = ["lined", "blank", "dot", "grid", "cornell", "col2", "col3"], TONES = ["lav", "pink", "mint", "sky", "butter"];
  var STATUSES = ["planted", "growing", "manifested", "released"], KINDS = ["win", "sign", "step"];
  function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }
  function str(v, n) { return typeof v === "string" ? v.slice(0, n || 4000) : ""; }
  function num(v, lo, hi, d) { v = typeof v === "number" && isFinite(v) ? v : (d == null ? lo : d); return Math.max(lo, Math.min(hi, v)); }
  function arr(v, max) { return Array.isArray(v) ? v.slice(0, max || 2000) : []; }
  function dkey(v) { return typeof v === "string" && DKEY.test(v) ? v : ""; }
  /* Plain data only: no prototype tricks, colours checked, strings capped. Used for the lightly structured parts. */
  function plain(v, depth) {
    if (depth > 6) return null;
    if (typeof v === "string") return v.slice(0, 20000);
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (typeof v === "boolean" || v === null) return v;
    if (Array.isArray(v)) return v.slice(0, 2000).map(function (x) { return plain(x, depth + 1); });
    if (isObj(v)) {
      var o = {};
      Object.keys(v).slice(0, 500).forEach(function (k) {
        if (k === "__proto__" || k === "constructor" || k === "prototype") return;
        var x = plain(v[k], depth + 1);
        if ((k === "color" || k === "c") && typeof x === "string" && !HEX.test(x)) x = "#B69CFF";
        o[k] = x;
      });
      return o;
    }
    return null;
  }
  function cleanDay(d) {
    if (!isObj(d)) return null;
    var r = isObj(d.reflect) ? d.reflect : {};
    var o = plain(d, 0);
    o.top3 = [0, 1, 2].map(function (i) { var t = isObj(d.top3 && d.top3[i]) ? d.top3[i] : {}; return { t: str(t.t, 200), done: !!t.done }; });
    o.tasks = arr(d.tasks, 200).filter(isObj).map(function (t) { return { id: ID.test(t.id) ? t.id : A.uid(), text: str(t.text, 300), done: !!t.done }; });
    o.mood = num(d.mood, 0, 10, 0); o.energy = num(d.energy, 0, 5, 0); o.water = num(d.water, 0, 20, 0); o.affirmed = num(d.affirmed, 0, 9999, 0);
    ["brain", "intention", "feeling", "actAsIf", "sign"].forEach(function (f) { o[f] = str(d[f], 6000); });
    o.gratitude = [0, 1, 2].map(function (i) { return str(d.gratitude && d.gratitude[i], 300); });
    if (!o.gratitude.some(Boolean) && r.grateful) o.gratitude = String(r.grateful).split("\n").map(function (x) { return str(x, 300); }).concat(["", "", ""]).slice(0, 3);
    o.emotions = arr(d.emotions, 30).filter(function (e) { return typeof e === "string"; }).map(function (e) { return e.slice(0, 30); });
    o.practice = {}; if (isObj(d.practice)) A.PRACTICES.forEach(function (p) { if (d.practice[p[0]]) o.practice[p[0]] = true; });
    o.r369 = { m: !!(d.r369 && d.r369.m), a: !!(d.r369 && d.r369.a), e: !!(d.r369 && d.r369.e) };
    o.care = {}; 
    o.reflect = { wins: str(r.wins, 6000), felt: str(r.felt || r.learned, 6000), shifted: str(r.shifted, 6000), release: str(r.release, 6000), tomorrow: str(r.tomorrow, 6000) };
    ["focus", "schedule", "meals", "breaks"].forEach(function (f) { delete o[f]; });
    return o;
  }
  function cleanPage(p) {
    if (!isObj(p) || !ID.test(p.id)) return null;
    var cols = arr(p.cols, 3).map(function (c) { c = isObj(c) ? c : {}; return { h: str(c.h, 80), t: str(c.t, 60000) }; });
    while (cols.length < 3) cols.push({ h: "", t: "" });
    var c = isObj(p.cornell) ? p.cornell : {};
    var html = typeof p.html === "string" ? A.sanitizeHtml(p.html) : A.textToHtml(str(p.text, 60000));
    return {
      id: p.id, section: ID.test(p.section) ? p.section : "", title: str(p.title, 80) || "Untitled page", paper: PAPERS.indexOf(p.paper) >= 0 ? p.paper : "lined",
      html: html, text: str(p.text, 60000), cornell: { topic: str(c.topic, 200), cue: str(c.cue, 60000), notes: str(c.notes, 60000), summary: str(c.summary, 60000) }, cols: cols,
      strokes: arr(p.strokes, 4000).filter(function (s) { return isObj(s) && Array.isArray(s.p); }).map(function (s) {
        return { tool: ["pen", "marker", "pencil"].indexOf(s.tool) >= 0 ? s.tool : "pen", c: typeof s.c === "string" && HEX.test(s.c) ? s.c : "#2E2A3B", s: num(s.s, 0.1, 6, 1),
          p: s.p.slice(0, 4000).filter(Array.isArray).map(function (q) { return [num(q[0], -2, 3, 0), num(q[1], -2, 60, 0), num(q[2], 0, 1, 0.5)]; }) };
      }),
      objects: arr(p.objects, 300).filter(function (o) { return isObj(o) && ID.test(o.id) && (o.type === "img" ? ID.test(o.imgId) : (o.type === "sticker" && typeof o.key === "string" && A.sticker(o.key))); }).map(function (o) {
        var r = { id: o.id, type: o.type, x: num(o.x, -1, 2, 0), y: num(o.y, -1, 60, 0), w: num(o.w, 0.04, 1.2, 0.2), rot: num(o.rot, -360, 360, 0) };
        if (o.type === "img") { r.imgId = o.imgId; r.ar = num(o.ar, 0.1, 10, 0.75); } else r.key = o.key;
        return r;
      }),
      extra: num(p.extra, 0, 20000, 0), created: num(p.created, 0, 4e12, Date.now()), updated: num(p.updated, 0, 4e12, Date.now())
    };
  }
  A.cleanState = function (raw) {
    if (!isObj(raw)) return null;
    var out = A.defaults();
    out.days = {}; Object.keys(isObj(raw.days) ? raw.days : {}).slice(0, 4000).forEach(function (k) { if (DKEY.test(k)) { var d = cleanDay(raw.days[k]); if (d) out.days[k] = d; } });
    ["weeks"].forEach(function (f) { out[f] = {}; Object.keys(isObj(raw[f]) ? raw[f] : {}).slice(0, 1000).forEach(function (k) { if (DKEY.test(k)) out[f][k] = plain(raw[f][k], 1); }); });
    out.months = {}; Object.keys(isObj(raw.months) ? raw.months : {}).slice(0, 600).forEach(function (k) { if (MKEY.test(k)) out.months[k] = plain(raw.months[k], 1); });
    out.years = {}; Object.keys(isObj(raw.years) ? raw.years : {}).slice(0, 100).forEach(function (k) { if (YKEY.test(k)) out.years[k] = plain(raw.years[k], 1); });
    if (Array.isArray(raw.habits)) out.habits = raw.habits.slice(0, 40).filter(isObj).map(function (h, i) { return { id: ID.test(h.id) ? h.id : A.uid() + i, name: str(h.name, 80), color: typeof h.color === "string" && HEX.test(h.color) ? h.color : A.PALETTE[i % A.PALETTE.length] }; });
    out.habitLog = {}; Object.keys(isObj(raw.habitLog) ? raw.habitLog : {}).slice(0, 4000).forEach(function (k) {
      if (!DKEY.test(k) || !isObj(raw.habitLog[k])) return;
      var o = {}; Object.keys(raw.habitLog[k]).forEach(function (h) { if (ID.test(h) && raw.habitLog[k][h]) o[h] = true; }); out.habitLog[k] = o;
    });
    ["wheel", "ikigai", "mindmap", "vision"].forEach(function (f) { if (isObj(raw[f])) out[f] = plain(raw[f], 0); });
    if (!isObj(out.wheel) || !Array.isArray(out.wheel.areas) || !out.wheel.areas.length) out.wheel = A.defaults().wheel;
    if (!isObj(out.mindmap) || !Array.isArray(out.mindmap.nodes) || !out.mindmap.nodes.length) out.mindmap = A.defaults().mindmap;
    if (!isObj(out.vision) || !Array.isArray(out.vision.tiles)) out.vision = A.defaults().vision;
    if (isObj(raw.manifest)) out.manifest = { items: arr(raw.manifest.items, 500).filter(isObj).map(function (m) {
      return { id: ID.test(m.id) ? m.id : A.uid(), title: str(m.title, 120), category: str(m.category, 40), why: str(m.why, 4000), feeling: str(m.feeling, 4000), affirm: str(m.affirm, 140), next: str(m.next, 140), outcome: str(m.outcome, 4000),
        target: dkey(m.target), status: STATUSES.indexOf(m.status) >= 0 ? m.status : "planted", align: Math.round(num(m.align, 1, 10, 5)), created: dkey(m.created), doneDate: dkey(m.doneDate),
        checks: arr(m.checks, 400).filter(isObj).map(function (c) { return { date: dkey(c.date), score: Math.round(num(c.score, 1, 10, 5)), note: str(c.note, 160) }; }),
        evidence: arr(m.evidence, 1000).filter(isObj).map(function (e) { return { id: ID.test(e.id) ? e.id : A.uid(), date: dkey(e.date), kind: KINDS.indexOf(e.kind) >= 0 ? e.kind : "win", text: str(e.text, 300) }; }) };
    }), view: "board" };
    out.scripts = arr(raw.scripts, 500).filter(isObj).map(function (s) { return { id: ID.test(s.id) ? s.id : A.uid(), title: str(s.title, 80), type: str(s.type, 20), text: str(s.text, 100000), manifestId: ID.test(s.manifestId) ? s.manifestId : "", date: dkey(s.date), updated: dkey(s.updated) || A.todayKey() }; });
    if (isObj(raw.viz)) out.viz = { sessions: arr(raw.viz.sessions, 400).filter(isObj).map(function (s) { return { date: dkey(s.date), mins: Math.round(num(s.mins, 1, 180, 5)), manifestId: ID.test(s.manifestId) ? s.manifestId : "", note: str(s.note, 400) }; }), sound: raw.viz.sound !== false, minutes: [3, 5, 10].indexOf(raw.viz.minutes) >= 0 ? raw.viz.minutes : 5, focus: ID.test(raw.viz.focus) ? raw.viz.focus : "" };
    if (isObj(raw.affirm)) {
      out.affirm = { favs: arr(raw.affirm.favs, 500).filter(function (x) { return ID.test(x); }), cat: str(raw.affirm.cat, 20) || "all", counts: {},
        custom: arr(raw.affirm.custom, 300).filter(isObj).map(function (c) { return { id: ID.test(c.id) ? c.id : A.uid(), text: str(c.text, 140) }; }) };
      if (isObj(raw.affirm.counts)) Object.keys(raw.affirm.counts).slice(0, 800).forEach(function (k) { if (ID.test(k)) out.affirm.counts[k] = Math.round(num(raw.affirm.counts[k], 0, 99999, 0)); });
    }
    if (isObj(raw.rituals)) {
      var r = raw.rituals, r5 = isObj(r.r555) ? r.r555 : {};
      out.rituals = { tab: ["369", "555", "gratitude", "signs", "moon"].indexOf(r.tab) >= 0 ? r.tab : "369", r369: { text: str(isObj(r.r369) ? r.r369.text : "", 140) },
        r555: { text: str(r5.text, 140), start: dkey(r5.start), days: {} },
        signs: arr(r.signs, 2000).filter(isObj).map(function (s) { return { id: ID.test(s.id) ? s.id : A.uid(), date: dkey(s.date), text: str(s.text, 300) }; }), moon: {} };
      if (isObj(r5.days)) Object.keys(r5.days).slice(0, 10).forEach(function (k) { if (DKEY.test(k) && r5.days[k]) out.rituals.r555.days[k] = true; });
      if (isObj(r.moon)) Object.keys(r.moon).slice(0, 300).forEach(function (k) { if (DKEY.test(k) && isObj(r.moon[k])) out.rituals.moon[k] = { intentions: str(r.moon[k].intentions, 6000), release: str(r.moon[k].release, 6000) }; });
    }
    if (isObj(raw.notebook)) {
      var nb = raw.notebook, secs = arr(nb.sections, 30).filter(isObj).filter(function (s) { return ID.test(s.id); }).map(function (s) { return { id: s.id, name: str(s.name, 40) || "Section", tone: TONES.indexOf(s.tone) >= 0 ? s.tone : "lav" }; });
      if (!secs.length) secs = A.defaults().notebook.sections;
      var pages = arr(nb.pages, 1000).map(cleanPage).filter(Boolean);
      pages.forEach(function (p) { if (!secs.some(function (s) { return s.id === p.section; })) p.section = secs[0].id; });
      out.notebook = { sections: secs, pages: pages, current: ID.test(nb.current) ? nb.current : "", section: ID.test(nb.section) ? nb.section : secs[0].id };
    }
    if (isObj(raw.coach)) out.coach = { key: str(raw.coach.key, 300), model: ["claude-opus-5", "claude-sonnet-5"].indexOf(raw.coach.model) >= 0 ? raw.coach.model : "claude-opus-5", analysis: str(raw.coach.analysis, 20000), analysisAt: str(raw.coach.analysisAt, 60), synthInput: str(raw.coach.synthInput, 20000), synth: null, synthAt: "" };
    var rui = isObj(raw.ui) ? raw.ui : {};
    out.ui = { mmSel: str(rui.mmSel, 40) || "root", nbMode: rui.nbMode === "markup" ? "markup" : "type", look: A.validLook(rui.look),
      onboardHidden: rui.onboardHidden === true, backedUp: rui.backedUp === true, sample: rui.sample === true };
    return out;
  };
  function cleanImages(map) {
    var out = {};
    if (!isObj(map)) return out;
    Object.keys(map).slice(0, 600).forEach(function (id) {
      if (ID.test(id) || /^img_[A-Za-z0-9_-]{1,40}$/.test(id)) { var v = map[id]; if (typeof v === "string" && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(v)) out[id] = v; }
    });
    return out;
  }

  document.addEventListener("change", function (e) {
    if (e.target.id !== "import-file" || !e.target.files[0]) return;
    var fr = new FileReader();
    fr.onload = function () {
      var clean;
      try {
        var data = JSON.parse(fr.result);
        if (!data || data.app !== "aura-planner" || !isObj(data.state)) throw new Error("bad file");
        clean = A.cleanState(data.state);
        if (!clean) throw new Error("bad state");
        if (!confirm("Replace everything in this planner with the backup?")) return;
        A.images.clear();
        A.images.importAll(cleanImages(data.images)).then(function () {
          localStorage.setItem("aura-planner-v1", JSON.stringify(clean));
          A.load(); A.applyLook(); A.closeDrawer(); location.hash = "#/home"; A.render(); A.toast("Backup restored");
        });
      } catch (err) { A.toast("That doesn’t look like an Aura backup."); }
    };
    fr.readAsText(e.target.files[0]);
  });
  A.acts["reset"] = function () {
    if (!confirm("Erase all planner data and photos in this browser? Export a backup first if you want to keep it.")) return;
    A.images.clear();
    try { localStorage.removeItem("aura-planner-v1"); } catch (e) { /* ignore */ }
    A.load(); A.applyLook(); A.closeDrawer(); location.hash = "#/home"; A.render(); A.toast("Planner reset");
  };

  /* ------------------------------------------------------------ boot */
  A.load();
  A.applyLook();
  document.querySelector('[data-act="open-settings"]').innerHTML = ic("gear");
  window.addEventListener("hashchange", A.render);
  A.images.init().then(function () {
    if (!location.hash) location.replace("#/home");
    A.render();
  });
})();
