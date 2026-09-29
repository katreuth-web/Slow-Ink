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
      '<label class="lbl">Currency symbol</label>' + A.input("finance.currency", 'maxlength="3" style="width:80px"') +
      '<label class="lbl">Backup</label><div class="stack" style="gap:8px">' +
      '<button class="btn" data-act="export">' + ic("download") + "Export backup (.json)</button>" +
      '<label class="btn ghost">' + ic("upload") + 'Import backup<input type="file" accept="application/json,.json" hidden id="import-file" /></label>' +
      '<button class="btn danger" data-act="reset">' + ic("trash") + "Reset planner</button></div>" +
      '<label class="lbl">About</label><p class="small muted" style="margin:0">Aura is a static app — no account, no server. The only outside connection is the optional AI coach, which talks to Anthropic when you add your own API key.</p>'
    );
  };
  A.acts["close-drawer"] = function () { A.closeDrawer(); A.render(); };
  document.getElementById("scrim").addEventListener("click", function () { A.closeDrawer(); A.render(); });

  A.acts["export"] = function () {
    A.saveNow();
    A.images.exportAll().then(function (imgs) {
      var blob = new Blob([JSON.stringify({ app: "aura-planner", version: 1, exported: new Date().toISOString(), state: A.state, images: imgs })], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "aura-planner-" + A.todayKey() + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });
  };
  document.addEventListener("change", function (e) {
    if (e.target.id !== "import-file" || !e.target.files[0]) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var data = JSON.parse(fr.result);
        if (!data || data.app !== "aura-planner" || !data.state) throw new Error("bad file");
        if (!confirm("Replace everything in this planner with the backup?")) return;
        A.images.clear();
        A.images.importAll(data.images).then(function () {
          localStorage.setItem("aura-planner-v1", JSON.stringify(data.state));
          A.load(); A.closeDrawer(); A.render(); A.toast("Backup restored");
        });
      } catch (err) { A.toast("That doesn’t look like an Aura backup."); }
    };
    fr.readAsText(e.target.files[0]);
  });
  A.acts["reset"] = function () {
    if (!confirm("Erase all planner data and photos in this browser? Export a backup first if you want to keep it.")) return;
    A.images.clear();
    try { localStorage.removeItem("aura-planner-v1"); } catch (e) { /* ignore */ }
    A.load(); A.closeDrawer(); location.hash = "#/day/today"; A.render(); A.toast("Planner reset");
  };

  /* ------------------------------------------------------------ boot */
  A.load();
  document.querySelector('[data-act="open-settings"]').innerHTML = ic("gear");
  window.addEventListener("hashchange", A.render);
  A.images.init().then(function () {
    if (!location.hash) location.replace("#/day/today");
    A.render();
  });
})();
