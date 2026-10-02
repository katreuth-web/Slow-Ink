/* Slow Ink Sage — photo storage.
   Photos are far too big for localStorage, so they live in IndexedDB (the browser's built-in
   file-sized storage). If a browser blocks IndexedDB, photos fall back to localStorage and
   the planner warns when that runs out of room. Backups include every photo. */
(function () {
  "use strict";
  var SI = window.SI;

  var DB_NAME = "slow-ink-sage-images", STORE = "img", LS_PREFIX = "slow-ink-sage-img:";
  var db = null, useIdb = true, cache = Object.create(null);

  var ready = new Promise(function (resolve) {
    try {
      var rq = window.indexedDB.open(DB_NAME, 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore(STORE); };
      rq.onsuccess = function () { db = rq.result; resolve(); };
      rq.onerror = rq.onblocked = function () { useIdb = false; resolve(); };
    } catch (e) { useIdb = false; resolve(); }
  });

  function idb(mode, fn) {
    return new Promise(function (resolve, reject) {
      try {
        var tx = db.transaction(STORE, mode), store = tx.objectStore(STORE), out = fn(store);
        tx.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : undefined); };
        tx.onerror = tx.onabort = function () { reject(tx.error); };
      } catch (e) { reject(e); }
    });
  }

  var IMG_RE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
  SI.isImageData = function (s) { return typeof s === "string" && s.length < 14000000 && IMG_RE.test(s); };
  SI.isImageId = function (s) { return typeof s === "string" && /^[A-Za-z0-9_-]{3,40}$/.test(s); };

  var api = SI.images = {};

  api.put = function (id, dataUrl) {
    cache[id] = dataUrl;
    return ready.then(function () {
      if (useIdb) return idb("readwrite", function (s) { s.put(dataUrl, id); });
      try { window.localStorage.setItem(LS_PREFIX + id, dataUrl); }
      catch (e) { SI.toast("Your browser has no room left for photos. Use “Back up planner” and remove some."); }
    });
  };

  api.get = function (id) {
    if (cache[id]) return Promise.resolve(cache[id]);
    return ready.then(function () {
      if (useIdb) return idb("readonly", function (s) { return s.get(id); }).then(function (v) { if (v) cache[id] = v; return v || null; });
      var v = null;
      try { v = window.localStorage.getItem(LS_PREFIX + id); } catch (e) { v = null; }
      if (v) cache[id] = v;
      return v;
    }).catch(function () { return null; });
  };

  api.remove = function (id) {
    delete cache[id];
    return ready.then(function () {
      if (useIdb) return idb("readwrite", function (s) { s.delete(id); });
      try { window.localStorage.removeItem(LS_PREFIX + id); } catch (e) { /* ignore */ }
    }).catch(function () { /* ignore */ });
  };

  /* Every photo, for a backup. */
  api.exportAll = function (ids) {
    return Promise.all(ids.map(function (id) { return api.get(id).then(function (v) { return [id, v]; }); })).then(function (pairs) {
      var out = {};
      pairs.forEach(function (p) { if (p[1]) out[p[0]] = p[1]; });
      return out;
    });
  };

  /* Replace all stored photos with those from a backup. */
  api.replaceAll = function (map) {
    var ids = Object.keys(map || {}).filter(function (id) { return SI.isImageId(id) && SI.isImageData(map[id]); });
    return ready.then(function () {
      if (useIdb) {
        return idb("readwrite", function (s) { s.clear(); }).then(function () {
          return Promise.all(ids.map(function (id) { return idb("readwrite", function (s) { s.put(map[id], id); }); }));
        });
      }
      try {
        Object.keys(window.localStorage).forEach(function (k) { if (k.indexOf(LS_PREFIX) === 0) window.localStorage.removeItem(k); });
        ids.forEach(function (id) { window.localStorage.setItem(LS_PREFIX + id, map[id]); });
      } catch (e) { SI.toast("Some photos couldn’t be restored: the browser is out of room."); }
    }).then(function () {
      cache = Object.create(null);
      ids.forEach(function (id) { cache[id] = map[id]; });
    });
  };

  /* A chosen file becomes a sensibly sized picture (longest side 1600px). */
  api.fromFile = function (file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type || "")) { reject(new Error("not an image")); return; }
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, max = 1600, k = Math.min(1, max / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
        var cv = document.createElement("canvas");
        cv.width = cw; cv.height = ch;
        var ctx = cv.getContext("2d");
        var keepAlpha = /png|webp|gif/.test(file.type);
        var out = null;
        if (keepAlpha) {
          ctx.drawImage(img, 0, 0, cw, ch);
          out = cv.toDataURL("image/png");
          if (out.length > 1500000) out = null;
        }
        if (!out) {
          ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cw, ch);
          ctx.drawImage(img, 0, 0, cw, ch);
          out = cv.toDataURL("image/jpeg", 0.86);
        }
        URL.revokeObjectURL(url);
        resolve({ dataUrl: out, ar: ch / cw });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("couldn’t read that picture")); };
      img.src = url;
    });
  };
})();
