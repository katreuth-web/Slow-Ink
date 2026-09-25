/* Aura — live board sync with monday.com (push tasks with dates & statuses, pull changes back). */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic;
  var busy = false;

  function log(msg) {
    var s = A.state.sync;
    s.log.unshift(new Date().toLocaleTimeString() + "  " + msg);
    s.log = s.log.slice(0, 60);
    A.save();
  }
  function q(query, variables) {
    var s = A.state.sync;
    if (!s.token) return Promise.reject(new Error("Add your monday.com API token first."));
    return fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: s.token, "API-Version": "2024-10" },
      body: JSON.stringify({ query: query, variables: variables || {} })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); }).then(function (res) {
      var j = res.j;
      if (j.errors && j.errors.length) throw new Error(j.errors.map(function (e) { return e.message; }).join("; "));
      if (j.error_message) throw new Error(j.error_message);
      if (!res.ok) throw new Error("HTTP error from monday.com");
      return j.data;
    });
  }
  function range() {
    var t = A.today(), sc = A.state.sync.scope;
    if (sc === "today") return [t, t];
    if (sc === "month") return [new Date(t.getFullYear(), t.getMonth(), 1), new Date(t.getFullYear(), t.getMonth() + 1, 0)];
    var m = A.mondayOf(t); return [m, A.addDays(m, 6)];
  }
  function columns() {
    var s = A.state.sync;
    return q("query($b:[ID!]){ boards(ids:$b){ name columns{ id title type } } }", { b: [String(s.boardId)] }).then(function (d) {
      var b = d.boards && d.boards[0];
      if (!b) throw new Error("Board " + s.boardId + " not found — check the board ID and token permissions.");
      s.boardName = b.name;
      var status = b.columns.filter(function (c) { return c.type === "status"; })[0];
      var date = b.columns.filter(function (c) { return c.type === "date"; })[0];
      return { name: b.name, status: status && status.id, date: date && date.id };
    });
  }
  function run(kind) {
    var s = A.state.sync;
    if (busy) return;
    if (!s.boardId) { A.toast("Add the board ID first."); return; }
    busy = true; A.render();
    var p;
    if (kind === "test") {
      p = columns().then(function (c) { log("Connected to “" + c.name + "” · status column: " + (c.status || "none") + " · date column: " + (c.date || "none")); });
    } else if (kind === "push") {
      p = columns().then(function (cols) {
        var r = range(), jobs = [];
        for (var d = r[0]; d <= r[1]; d = A.addDays(d, 1)) {
          var k = A.ymd(d), day = A.peekDay(k);
          if (day) day.tasks.forEach(function (t) { if (t.text) jobs.push({ t: t, k: k }); });
        }
        var created = 0, updated = 0;
        return jobs.reduce(function (chain, job) {
          return chain.then(function () {
            var v = {};
            if (cols.status) v[cols.status] = { label: job.t.done ? "Done" : "Working on it" };
            if (cols.date) v[cols.date] = { date: job.k };
            var itemId = s.map[job.t.id];
            if (itemId) {
              return q("mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b, item_id:$i, column_values:$v, create_labels_if_missing:true){ id } }", { b: String(s.boardId), i: String(itemId), v: JSON.stringify(v) })
                .then(function () { updated++; });
            }
            return q("mutation($b:ID!,$n:String!,$v:JSON){ create_item(board_id:$b, item_name:$n, column_values:$v, create_labels_if_missing:true){ id } }", { b: String(s.boardId), n: job.t.text, v: JSON.stringify(v) })
              .then(function (dd) { s.map[job.t.id] = dd.create_item.id; created++; });
          });
        }, Promise.resolve()).then(function () { log("Pushed " + jobs.length + " task(s): " + created + " created, " + updated + " updated on “" + cols.name + "”."); });
      });
    } else {
      p = q("query($b:[ID!]){ boards(ids:$b){ name items_page(limit:100){ items{ id name column_values{ id type text } } } } }", { b: [String(s.boardId)] }).then(function (d) {
        var b = d.boards && d.boards[0];
        if (!b) throw new Error("Board not found.");
        s.pulled = b.items_page.items.map(function (it) {
          var st = it.column_values.filter(function (c) { return c.type === "status"; })[0];
          var dt = it.column_values.filter(function (c) { return c.type === "date"; })[0];
          return { id: it.id, name: it.name, status: st ? st.text || "" : "", date: dt && dt.text ? dt.text.slice(0, 10) : "" };
        });
        var inverse = {}, changed = 0;
        Object.keys(s.map).forEach(function (tid) { inverse[s.map[tid]] = tid; });
        s.pulled.forEach(function (it) {
          var f = inverse[it.id] && A.findTask(inverse[it.id]);
          if (!f) return;
          var done = /done|complete/i.test(it.status);
          if (!!f.t.done !== done) { f.t.done = done; changed++; }
          if (f.t.text !== it.name) { f.t.text = it.name; changed++; }
        });
        log("Pulled " + s.pulled.length + " item(s) from “" + b.name + "” · " + changed + " local change(s) applied.");
      });
    }
    p.catch(function (e) { log("⚠ " + e.message); A.toast(e.message); }).then(function () { busy = false; A.save(); A.render(); });
  }
  A.acts["sync-run"] = function (el) { run(el.getAttribute("data-v")); };
  A.acts["sync-scope"] = function (el) { A.state.sync.scope = el.getAttribute("data-v"); A.save(); A.render(); };
  A.acts["sync-import"] = function (el) {
    var s = A.state.sync, it = s.pulled.find(function (x) { return x.id === el.getAttribute("data-id"); });
    if (!it) return;
    var k = /^\d{4}-\d{2}-\d{2}$/.test(it.date) ? it.date : A.todayKey();
    var t = A.addTask(k, it.name, { done: /done|complete/i.test(it.status) });
    s.map[t.id] = it.id; A.save(); A.toast("Imported to " + k); A.render();
  };
  A.acts["sync-forget"] = function () {
    if (!confirm("Forget the token, board and all task links?")) return;
    A.state.sync = { token: "", boardId: "", boardName: "", map: {}, scope: "week", log: [], pulled: [] };
    A.save(); A.render();
  };

  A.views.sync = function () {
    var s = A.state.sync, inverse = {};
    Object.keys(s.map).forEach(function (tid) { inverse[s.map[tid]] = tid; });
    var dis = busy ? " disabled" : "";
    var r = range(), count = 0;
    for (var d = r[0]; d <= r[1]; d = A.addDays(d, 1)) { var day = A.peekDay(A.ymd(d)); if (day) count += day.tasks.filter(function (t) { return t.text; }).length; }
    var pulled = s.pulled.length ? '<div class="scroll-x"><table class="table"><tr><th>Item</th><th>Status</th><th>Date</th><th></th></tr>' + s.pulled.map(function (it) {
      return "<tr><td>" + esc(it.name) + '</td><td><span class="chip">' + esc(it.status || "—") + "</span></td><td>" + esc(it.date || "—") + "</td><td>" +
        (inverse[it.id] ? '<span class="badge mint">linked</span>' : '<button class="btn xs soft" data-act="sync-import" data-id="' + esc(it.id) + '">' + ic("download") + "Import</button>") + "</td></tr>";
    }).join("") + "</table></div>" : '<div class="empty">Pull from your board to see its items here.</div>';
    return A.head("Integrations", 'Live board <span class="soft">sync</span>', "Persist tasks, priorities and action items to your monday.com board with status and date tracking.", s.boardName ? '<span class="badge mint">Connected · ' + esc(s.boardName) + "</span>" : "") +
      '<div class="grid">' +
      '<div class="c5 stack">' +
        A.card("Connect your board", '<p class="small muted" style="margin-top:0">Create a personal API token in monday.com under <i>Avatar → Developers → My access tokens</i>. It stays in this browser and is sent only to api.monday.com.</p>' +
          '<label class="lbl">API token</label><input class="field" type="password" autocomplete="off" data-bind="sync.token" value="' + esc(s.token) + '" placeholder="eyJhbGciOi…" />' +
          '<label class="lbl">Board ID</label>' + A.input("sync.boardId", 'placeholder="e.g. 1234567890" inputmode="numeric"') +
          '<p class="small muted">The number in your board URL: monday.com/boards/<b>1234567890</b></p>' +
          '<div class="row wrap"><button class="btn sm ghost" data-act="sync-run" data-v="test"' + dis + ">" + ic("link") + 'Test connection</button><button class="btn sm danger" data-act="sync-forget">Forget</button></div>', { icon: "link", tone: "sky" }) +
        A.card("Sync tasks", '<div class="seg" style="margin-bottom:12px">' + [["today", "Today"], ["week", "This week"], ["month", "This month"]].map(function (x) { return '<button class="' + (s.scope === x[0] ? "on" : "") + '" data-act="sync-scope" data-v="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>" +
          '<p class="small muted" style="margin-top:0">' + count + " task(s) in range. Push creates an item per task (re-pushing updates it) and fills the board’s first status and date columns. Pull applies status and name changes back.</p>" +
          '<div class="row wrap"><button class="btn" data-act="sync-run" data-v="push"' + dis + ">" + (busy ? '<span class="spinner"></span>' : ic("upload")) + 'Push</button><button class="btn ghost" data-act="sync-run" data-v="pull"' + dis + ">" + ic("download") + "Pull</button></div>", { icon: "sync", tint: "grad" }) +
        A.card("Activity", s.log.length ? '<ul class="list">' + s.log.slice(0, 12).map(function (l) { return '<li class="li small">' + esc(l) + "</li>"; }).join("") + "</ul>" : '<div class="empty">No sync activity yet.</div>', { icon: "clock", tone: "butter" }) +
      "</div>" +
      '<div class="c7">' + A.card("Board items", pulled, { icon: "list", tone: "pink" }) + "</div></div>";
  };
})();
