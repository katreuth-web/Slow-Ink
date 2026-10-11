/* Aura — Birth Chart: works out your natal chart from your birth date, time and place, and reads it in plain words.
   Positions use low-precision orbital formulas (Paul Schlyter's method): planets to about a fraction of a degree,
   the Moon to about a degree. Everything is calculated on the device; nothing is sent anywhere. */
(function () {
  "use strict";
  var A = window.Aura, esc = A.esc, ic = A.ic, T = A.astroText;
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  var GLYPH = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
  var PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];
  var ABBR = { Sun: "Su", Moon: "Mo", Mercury: "Me", Venus: "Ve", Mars: "Ma", Jupiter: "Ju", Saturn: "Sa", Uranus: "Ur", Neptune: "Ne" };
  /* orbital elements: [value on 2000 Jan 0.0, change per day] */
  var EL = {
    Mercury: { N: [48.3313, 3.24587e-5], i: [7.0047, 5e-8], w: [29.1241, 1.01444e-5], a: [0.387098, 0], e: [0.205635, 5.59e-10], M: [168.6562, 4.0923344368] },
    Venus: { N: [76.6799, 2.4659e-5], i: [3.3946, 2.75e-8], w: [54.891, 1.38374e-5], a: [0.72333, 0], e: [0.006773, -1.302e-9], M: [48.0052, 1.6021302244] },
    Mars: { N: [49.5574, 2.11081e-5], i: [1.8497, -1.78e-8], w: [286.5016, 2.92961e-5], a: [1.523688, 0], e: [0.093405, 2.516e-9], M: [18.6021, 0.5240207766] },
    Jupiter: { N: [100.4542, 2.76854e-5], i: [1.303, -1.557e-7], w: [273.8777, 1.64505e-5], a: [5.20256, 0], e: [0.048498, 4.469e-9], M: [19.895, 0.0830853001] },
    Saturn: { N: [113.6634, 2.3898e-5], i: [2.4886, -1.081e-7], w: [339.3939, 2.97661e-5], a: [9.55475, 0], e: [0.055546, -9.499e-9], M: [316.967, 0.0334442282] },
    Uranus: { N: [74.0005, 1.3978e-5], i: [0.7733, 1.9e-8], w: [96.6612, 3.0565e-5], a: [19.18171, -1.55e-8], e: [0.047318, 7.45e-9], M: [142.5905, 0.011725806] },
    Neptune: { N: [131.7806, 3.0173e-5], i: [1.77, -2.55e-7], w: [272.8461, -6.027e-6], a: [30.05826, 3.313e-8], e: [0.008606, 2.15e-9], M: [260.2471, 0.005995147] }
  };
  var SUN = { w: [282.9404, 4.70935e-5], e: [0.016709, -1.151e-9], M: [356.047, 0.9856002585] };
  var MOON = { N: [125.1228, -0.0529538083], i: [5.1454, 0], w: [318.0634, 0.1643573223], a: [60.2666, 0], e: [0.0549, 0], M: [115.3654, 13.0649929509] };
  var ASPECTS = [["Conjunction", 0, 8], ["Sextile", 60, 5], ["Square", 90, 7], ["Trine", 120, 7], ["Opposition", 180, 8]];

  function norm(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function at(p, d) { return p[0] + p[1] * d; }
  function sind(x) { return Math.sin(x * D2R); }
  function cosd(x) { return Math.cos(x * D2R); }

  /* solve Kepler's equation: mean anomaly M (deg) and eccentricity e -> eccentric anomaly E (deg) */
  function kepler(M, e) {
    var E = M + e * R2D * sind(M) * (1 + e * cosd(M));
    for (var k = 0; k < 30; k++) {
      var dE = (E - e * R2D * sind(E) - M) / (1 - e * cosd(E));
      E -= dE;
      if (Math.abs(dE) < 1e-9) break;
    }
    return E;
  }
  /* the Sun's position as seen from Earth: longitude (deg) and distance (AU) */
  function sunState(d) {
    var M = norm(at(SUN.M, d)), w = norm(at(SUN.w, d)), e = at(SUN.e, d), E = kepler(M, e);
    var xv = cosd(E) - e, yv = Math.sqrt(1 - e * e) * sind(E);
    return { lon: norm(R2D * Math.atan2(yv, xv) + w), r: Math.sqrt(xv * xv + yv * yv), M: M, w: w };
  }
  /* a planet's heliocentric rectangular coordinates */
  function helio(q, d) {
    var M = norm(at(q.M, d)), e = at(q.e, d), a = at(q.a, d), E = kepler(M, e);
    var xv = a * (cosd(E) - e), yv = a * Math.sqrt(1 - e * e) * sind(E);
    var r = Math.sqrt(xv * xv + yv * yv), vw = (R2D * Math.atan2(yv, xv) + norm(at(q.w, d))) * D2R;
    var N = norm(at(q.N, d)) * D2R, I = at(q.i, d) * D2R;
    return {
      x: r * (Math.cos(N) * Math.cos(vw) - Math.sin(N) * Math.sin(vw) * Math.cos(I)),
      y: r * (Math.sin(N) * Math.cos(vw) + Math.cos(N) * Math.sin(vw) * Math.cos(I)),
      z: r * Math.sin(vw) * Math.sin(I)
    };
  }
  /* geocentric ecliptic longitude and latitude of a planet */
  function planetPos(name, d) {
    var s = sunState(d), h = helio(EL[name], d), sl = s.lon * D2R;
    var x = h.x + s.r * Math.cos(sl), y = h.y + s.r * Math.sin(sl), z = h.z;
    return { lon: norm(R2D * Math.atan2(y, x)), lat: R2D * Math.atan2(z, Math.hypot(x, y)) };
  }
  /* the Moon, with the main corrections that matter for its sign and degree */
  function moonPos(d) {
    var M = norm(at(MOON.M, d)), w = norm(at(MOON.w, d)), N = norm(at(MOON.N, d)), e = at(MOON.e, d), a = at(MOON.a, d), i = at(MOON.i, d) * D2R;
    var E = kepler(M, e), xv = a * (cosd(E) - e), yv = a * Math.sqrt(1 - e * e) * sind(E);
    var r = Math.sqrt(xv * xv + yv * yv), vw = (R2D * Math.atan2(yv, xv) + w) * D2R, n = N * D2R;
    var x = r * (Math.cos(n) * Math.cos(vw) - Math.sin(n) * Math.sin(vw) * Math.cos(i));
    var y = r * (Math.sin(n) * Math.cos(vw) + Math.cos(n) * Math.sin(vw) * Math.cos(i));
    var z = r * Math.sin(vw) * Math.sin(i);
    var lon = R2D * Math.atan2(y, x), lat = R2D * Math.atan2(z, Math.hypot(x, y));
    var s = sunState(d), Ls = s.M + s.w, Lm = N + w + M, D = Lm - Ls, F = Lm - N;
    lon += -1.274 * sind(M - 2 * D) + 0.658 * sind(2 * D) - 0.186 * sind(s.M) - 0.059 * sind(2 * M - 2 * D) - 0.057 * sind(M - 2 * D + s.M) +
      0.053 * sind(M + 2 * D) + 0.046 * sind(2 * D - s.M) + 0.041 * sind(M - s.M) - 0.035 * sind(D) - 0.031 * sind(M + s.M) - 0.015 * sind(2 * F - 2 * D) + 0.011 * sind(M - 4 * D);
    lat += -0.173 * sind(F - 2 * D) - 0.055 * sind(M - F - 2 * D) - 0.046 * sind(M + F - 2 * D) + 0.033 * sind(F + 2 * D) + 0.017 * sind(2 * M + F);
    return { lon: norm(lon), lat: lat };
  }
  function pos(name, d) { return name === "Sun" ? { lon: sunState(d).lon, lat: 0 } : name === "Moon" ? moonPos(d) : planetPos(name, d); }

  /* house cusps (Placidus). Input: sidereal time of the MC (deg), obliquity (deg), latitude (deg). Output: cusps[1..12] */
  function houses(theta, eps, phi) {
    var e = eps * D2R, tphi = Math.tan(phi * D2R);
    var asc = norm(R2D * Math.atan2(cosd(theta), -(sind(theta) * Math.cos(e) + tphi * Math.sin(e))));
    var mc = norm(R2D * Math.atan2(sind(theta), cosd(theta) * Math.cos(e)));
    function semiArc(lam) {
      var dec = Math.asin(Math.sin(e) * sind(lam));
      var x = Math.max(-1, Math.min(1, -tphi * Math.tan(dec)));
      return R2D * Math.acos(x);
    }
    function solve(f, below, start) {
      var lam = start;
      for (var k = 0; k < 80; k++) {
        var s = semiArc(lam), ra = theta + (below ? s + f * (180 - s) : f * s);
        var nl = norm(R2D * Math.atan2(sind(ra), cosd(ra) * Math.cos(e)));
        var diff = Math.abs(((nl - lam + 540) % 360) - 180);
        lam = nl;
        if (diff < 1e-7) break;
      }
      return lam;
    }
    var c = [];
    c[1] = asc; c[10] = mc;
    c[11] = solve(1 / 3, false, mc); c[12] = solve(2 / 3, false, mc);
    c[2] = solve(1 / 3, true, asc); c[3] = solve(2 / 3, true, asc);
    c[4] = norm(mc + 180); c[5] = norm(c[11] + 180); c[6] = norm(c[12] + 180);
    c[7] = norm(asc + 180); c[8] = norm(c[2] + 180); c[9] = norm(c[3] + 180);
    return c;
  }
  function houseOf(lon, c) {
    for (var h = 1; h <= 12; h++) {
      var start = c[h], end = c[h % 12 + 1];
      if (norm(lon - start) < norm(end - start)) return h;
    }
    return 12;
  }
  function signOf(lon) { var i = Math.floor(lon / 30); return { index: i, name: SIGNS[i], deg: lon - i * 30 }; }
  function dms(deg) { var d = Math.floor(deg), m = Math.floor((deg - d) * 60); return d + "°" + (m < 10 ? "0" : "") + m + "′"; }

  /* the local time at the birth place, turned into UTC using the zone's own rules for that date */
  function zoneOffset(tz, t) {
    var f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    var p = {};
    f.formatToParts(new Date(t)).forEach(function (x) { p[x.type] = +x.value; });
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000;
  }
  function localToUtc(date, time, tz) {
    var dp = date.split("-").map(Number), tp = time.split(":").map(Number);
    var guess = Date.UTC(dp[0], dp[1] - 1, dp[2], tp[0], tp[1]);
    var off = zoneOffset(tz, guess), utc = guess - off;
    var off2 = zoneOffset(tz, utc);
    return off2 === off ? utc : guess - off2;
  }

  /* the whole chart for one birth record */
  function natal(b) {
    var time = b.time || "12:00", utc = localToUtc(b.date, time, b.place.tz);
    var d = (utc - Date.UTC(1999, 11, 31)) / 86400000;
    var eps = 23.4393 - 3.563e-7 * d;
    var jd = utc / 86400000 + 2440587.5, gmst = norm(280.46061837 + 360.98564736629 * (jd - 2451545));
    var c = houses(norm(gmst + b.place.lon), eps, b.place.lat);
    var list = PLANETS.map(function (name) {
      var p = pos(name, d), before = pos(name, d - 0.5), after = pos(name, d + 0.5);
      var moved = ((after.lon - before.lon + 540) % 360) - 180;
      var s = signOf(p.lon);
      return { name: name, lon: p.lon, sign: s.name, signIndex: s.index, deg: s.deg, house: houseOf(p.lon, c), retro: name !== "Sun" && name !== "Moon" && moved < 0 };
    });
    var aspects = [];
    for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) {
      var sep = Math.abs(list[i].lon - list[j].lon); if (sep > 180) sep = 360 - sep;
      var best = null;
      ASPECTS.forEach(function (a) { var orb = Math.abs(sep - a[1]); if (orb <= a[2] && (!best || orb < best.orb)) best = { type: a[0], orb: orb }; });
      if (best) aspects.push({ a: list[i], b: list[j], type: best.type, orb: best.orb });
    }
    var asc = signOf(c[1]), mc = signOf(c[10]);
    return { planets: list, cusps: c, asc: { lon: c[1], sign: asc.name, deg: asc.deg }, mc: { lon: c[10], sign: mc.name, deg: mc.deg }, aspects: aspects, near: list.filter(function (p) { return p.deg < 1 || p.deg > 29; }) };
  }

  /* the chart wheel: signs outside, houses inside, Ascendant on the left */
  function wheel(ch) {
    var cx = 200, cy = 200, asc = ch.asc.lon;
    function pt(lon, r) { var t = (180 + norm(lon - asc)) * D2R; return [cx + r * Math.cos(t), cy - r * Math.sin(t)]; }
    var s = '<svg class="birth-wheel" viewBox="-14 -14 428 428" role="img" aria-label="Birth chart wheel">';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="190" fill="none" style="stroke:rgba(var(--ac),.3)" stroke-width="1.5"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="160" fill="none" style="stroke:rgba(var(--ac),.25)"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="100" fill="none" style="stroke:rgba(var(--ac),.2)"/>';
    for (var i = 0; i < 12; i++) {
      var a = pt(i * 30, 190), b = pt(i * 30, 160), g = pt(i * 30 + 15, 175);
      s += '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" style="stroke:rgba(var(--ac),.25)"/>';
      s += '<text x="' + g[0].toFixed(1) + '" y="' + g[1].toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" font-size="15" style="fill:var(--ink-2)">' + GLYPH[i] + "</text>";
    }
    for (var h = 1; h <= 12; h++) {
      var c1 = pt(ch.cusps[h], 100), c2 = pt(ch.cusps[h], 160), hn = pt(ch.cusps[h] + (norm(ch.cusps[h % 12 + 1] - ch.cusps[h]) / 2), 120);
      var strong = h === 1 || h === 4 || h === 7 || h === 10;
      s += '<line x1="' + c1[0].toFixed(1) + '" y1="' + c1[1].toFixed(1) + '" x2="' + c2[0].toFixed(1) + '" y2="' + c2[1].toFixed(1) + '" style="stroke:rgba(var(--ac),' + (strong ? ".5" : ".18") + ')" stroke-width="' + (strong ? 1.6 : 1) + '"/>';
      s += '<text x="' + hn[0].toFixed(1) + '" y="' + hn[1].toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" font-size="9" style="fill:var(--muted)">' + h + "</text>";
    }
    var colour = { harmony: "#8FD9C0", tension: "#FF8A9E", neutral: "#B69CFF" };
    ch.aspects.forEach(function (x) {
      var kind = x.type === "Trine" || x.type === "Sextile" ? "harmony" : x.type === "Square" || x.type === "Opposition" ? "tension" : "neutral";
      var p1 = pt(x.a.lon, 96), p2 = pt(x.b.lon, 96);
      s += '<line x1="' + p1[0].toFixed(1) + '" y1="' + p1[1].toFixed(1) + '" x2="' + p2[0].toFixed(1) + '" y2="' + p2[1].toFixed(1) + '" stroke="' + colour[kind] + '" stroke-opacity=".32" stroke-width="1"/>';
    });
    /* planet labels: nudge any that sit too close together */
    var placed = [];
    ch.planets.slice().sort(function (p, q) { return p.lon - q.lon; }).forEach(function (p) {
      var r = 146;
      placed.forEach(function (q) { if (Math.abs(norm(p.lon - q.lon + 180) - 180) < 10 && Math.abs(r - q.r) < 13) r = q.r - 13 < 130 ? q.r + 13 : q.r - 13; });
      placed.push({ lon: p.lon, r: r });
      var dot = pt(p.lon, 160), lb = pt(p.lon, r);
      s += '<circle cx="' + dot[0].toFixed(1) + '" cy="' + dot[1].toFixed(1) + '" r="2.5" style="fill:var(--ink-2)"/>';
      s += '<text x="' + lb[0].toFixed(1) + '" y="' + lb[1].toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" font-size="10.5" font-weight="600" style="fill:var(--ink)">' + ABBR[p.name] + (p.retro ? "℞" : "") + "</text>";
    });
    var ascP = pt(asc, 205), mcP = pt(ch.mc.lon, 205);
    s += '<text x="' + ascP[0].toFixed(1) + '" y="' + ascP[1].toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="700" style="fill:var(--ink-2)">ASC</text>';
    s += '<text x="' + mcP[0].toFixed(1) + '" y="' + mcP[1].toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="700" style="fill:var(--ink-2)">MC</text>';
    return s + "</svg>";
  }

  function saveBirth() {
    var date = document.getElementById("birth-date").value, time = document.getElementById("birth-time").value;
    var unknown = document.getElementById("birth-unknown").checked, pick = document.getElementById("birth-place").value;
    var place;
    if (pick === "other") {
      place = { name: document.getElementById("birth-name").value.trim().slice(0, 80), lat: +document.getElementById("birth-lat").value, lon: +document.getElementById("birth-lon").value, tz: document.getElementById("birth-tz").value };
      if (!place.name) { A.toast("Give your birth place a name."); return; }
      if (!(place.lat >= -90 && place.lat <= 90) || !(place.lon >= -180 && place.lon <= 180)) { A.toast("Latitude must be -90 to 90, and longitude -180 to 180."); return; }
    } else {
      var c = CITIES[+pick];
      place = { name: c[0] + ", " + c[1], lat: c[2], lon: c[3], tz: c[4] };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date + "T12:00:00").getTime())) { A.toast("Enter your birth date."); return; }
    if (!unknown && !/^\d{2}:\d{2}$/.test(time)) { A.toast("Enter your birth time, or tick “I don’t know my birth time”."); return; }
    A.state.birth = { date: date, time: unknown ? "" : time, unknownTime: unknown, place: place };
    A.save(); A.render();
  }
  document.addEventListener("change", function (e) {
    if (e.target.id === "birth-place") document.getElementById("birth-manual").hidden = e.target.value !== "other";
    if (e.target.id === "birth-unknown") document.getElementById("birth-time").disabled = e.target.checked;
  });
  A.acts["birth-save"] = function () { saveBirth(); };
  A.acts["birth-clear"] = function () {
    if (!window.confirm("Remove your birth details and chart from this device?")) return;
    A.state.birth = null; A.save(); A.render();
  };

  /* a short list of places. Anything else: pick “Other place” and type the coordinates */
  var CITIES = [
    ["New York", "USA", 40.7128, -74.006, "America/New_York"], ["Los Angeles", "USA", 34.0522, -118.2437, "America/Los_Angeles"],
    ["Chicago", "USA", 41.8781, -87.6298, "America/Chicago"], ["Houston", "USA", 29.7604, -95.3698, "America/Chicago"],
    ["Phoenix", "USA", 33.4484, -112.074, "America/Phoenix"], ["Philadelphia", "USA", 39.9526, -75.1652, "America/New_York"],
    ["San Antonio", "USA", 29.4241, -98.4936, "America/Chicago"], ["San Diego", "USA", 32.7157, -117.1611, "America/Los_Angeles"],
    ["Dallas", "USA", 32.7767, -96.797, "America/Chicago"], ["San Jose", "USA", 37.3382, -121.8863, "America/Los_Angeles"],
    ["Austin", "USA", 30.2672, -97.7431, "America/Chicago"], ["Jacksonville", "USA", 30.3322, -81.6557, "America/New_York"],
    ["San Francisco", "USA", 37.7749, -122.4194, "America/Los_Angeles"], ["Columbus", "USA", 39.9612, -82.9988, "America/New_York"],
    ["Seattle", "USA", 47.6062, -122.3321, "America/Los_Angeles"], ["Denver", "USA", 39.7392, -104.9903, "America/Denver"],
    ["Boston", "USA", 42.3601, -71.0589, "America/New_York"], ["Nashville", "USA", 36.1627, -86.7816, "America/Chicago"],
    ["Las Vegas", "USA", 36.1699, -115.1398, "America/Los_Angeles"], ["Atlanta", "USA", 33.749, -84.388, "America/New_York"],
    ["Miami", "USA", 25.7617, -80.1918, "America/New_York"], ["Portland", "USA", 45.5152, -122.6784, "America/Los_Angeles"],
    ["Minneapolis", "USA", 44.9778, -93.265, "America/Chicago"], ["Detroit", "USA", 42.3314, -83.0458, "America/Detroit"],
    ["Honolulu", "USA", 21.3069, -157.8583, "Pacific/Honolulu"], ["Anchorage", "USA", 61.2181, -149.9003, "America/Anchorage"],
    ["Washington, D.C.", "USA", 38.9072, -77.0369, "America/New_York"], ["New Orleans", "USA", 29.9511, -90.0715, "America/Chicago"],
    ["Salt Lake City", "USA", 40.7608, -111.891, "America/Denver"], ["Kansas City", "USA", 39.0997, -94.5786, "America/Chicago"],
    ["Toronto", "Canada", 43.6532, -79.3832, "America/Toronto"], ["Montreal", "Canada", 45.5017, -73.5673, "America/Toronto"],
    ["Vancouver", "Canada", 49.2827, -123.1207, "America/Vancouver"], ["Calgary", "Canada", 51.0447, -114.0719, "America/Edmonton"],
    ["Ottawa", "Canada", 45.4215, -75.6972, "America/Toronto"], ["Winnipeg", "Canada", 49.8951, -97.1384, "America/Winnipeg"],
    ["Mexico City", "Mexico", 19.4326, -99.1332, "America/Mexico_City"], ["Guadalajara", "Mexico", 20.6597, -103.3496, "America/Mexico_City"],
    ["São Paulo", "Brazil", -23.5505, -46.6333, "America/Sao_Paulo"], ["Rio de Janeiro", "Brazil", -22.9068, -43.1729, "America/Sao_Paulo"],
    ["Buenos Aires", "Argentina", -34.6037, -58.3816, "America/Argentina/Buenos_Aires"], ["Santiago", "Chile", -33.4489, -70.6693, "America/Santiago"],
    ["Lima", "Peru", -12.0464, -77.0428, "America/Lima"], ["Bogotá", "Colombia", 4.711, -74.0721, "America/Bogota"],
    ["Caracas", "Venezuela", 10.4806, -66.9036, "America/Caracas"], ["Havana", "Cuba", 23.1136, -82.3666, "America/Havana"],
    ["London", "UK", 51.5074, -0.1278, "Europe/London"], ["Manchester", "UK", 53.4808, -2.2426, "Europe/London"],
    ["Edinburgh", "UK", 55.9533, -3.1883, "Europe/London"], ["Dublin", "Ireland", 53.3498, -6.2603, "Europe/Dublin"],
    ["Paris", "France", 48.8566, 2.3522, "Europe/Paris"], ["Lyon", "France", 45.764, 4.8357, "Europe/Paris"],
    ["Marseille", "France", 43.2965, 5.3698, "Europe/Paris"], ["Berlin", "Germany", 52.52, 13.405, "Europe/Berlin"],
    ["Munich", "Germany", 48.1351, 11.582, "Europe/Berlin"], ["Hamburg", "Germany", 53.5511, 9.9937, "Europe/Berlin"],
    ["Madrid", "Spain", 40.4168, -3.7038, "Europe/Madrid"], ["Barcelona", "Spain", 41.3874, 2.1686, "Europe/Madrid"],
    ["Rome", "Italy", 41.9028, 12.4964, "Europe/Rome"], ["Milan", "Italy", 45.4642, 9.19, "Europe/Rome"],
    ["Amsterdam", "Netherlands", 52.3676, 4.9041, "Europe/Amsterdam"], ["Brussels", "Belgium", 50.8503, 4.3517, "Europe/Brussels"],
    ["Lisbon", "Portugal", 38.7223, -9.1393, "Europe/Lisbon"], ["Zurich", "Switzerland", 47.3769, 8.5417, "Europe/Zurich"],
    ["Vienna", "Austria", 48.2082, 16.3738, "Europe/Vienna"], ["Prague", "Czechia", 50.0755, 14.4378, "Europe/Prague"],
    ["Warsaw", "Poland", 52.2297, 21.0122, "Europe/Warsaw"], ["Budapest", "Hungary", 47.4979, 19.0402, "Europe/Budapest"],
    ["Stockholm", "Sweden", 59.3293, 18.0686, "Europe/Stockholm"], ["Oslo", "Norway", 59.9139, 10.7522, "Europe/Oslo"],
    ["Copenhagen", "Denmark", 55.6761, 12.5683, "Europe/Copenhagen"], ["Helsinki", "Finland", 60.1699, 24.9384, "Europe/Helsinki"],
    ["Athens", "Greece", 37.9838, 23.7275, "Europe/Athens"], ["Istanbul", "Turkey", 41.0082, 28.9784, "Europe/Istanbul"],
    ["Moscow", "Russia", 55.7558, 37.6173, "Europe/Moscow"], ["Kyiv", "Ukraine", 50.4501, 30.5234, "Europe/Kyiv"],
    ["Cairo", "Egypt", 30.0444, 31.2357, "Africa/Cairo"], ["Lagos", "Nigeria", 6.5244, 3.3792, "Africa/Lagos"],
    ["Nairobi", "Kenya", -1.2921, 36.8219, "Africa/Nairobi"], ["Johannesburg", "South Africa", -26.2041, 28.0473, "Africa/Johannesburg"],
    ["Cape Town", "South Africa", -33.9249, 18.4241, "Africa/Johannesburg"], ["Casablanca", "Morocco", 33.5731, -7.5898, "Africa/Casablanca"],
    ["Dubai", "UAE", 25.2048, 55.2708, "Asia/Dubai"], ["Riyadh", "Saudi Arabia", 24.7136, 46.6753, "Asia/Riyadh"],
    ["Tel Aviv", "Israel", 32.0853, 34.7818, "Asia/Jerusalem"], ["Tehran", "Iran", 35.6892, 51.389, "Asia/Tehran"],
    ["Karachi", "Pakistan", 24.8607, 67.0011, "Asia/Karachi"], ["Mumbai", "India", 19.076, 72.8777, "Asia/Kolkata"],
    ["Delhi", "India", 28.7041, 77.1025, "Asia/Kolkata"], ["Bangalore", "India", 12.9716, 77.5946, "Asia/Kolkata"],
    ["Dhaka", "Bangladesh", 23.8103, 90.4125, "Asia/Dhaka"], ["Bangkok", "Thailand", 13.7563, 100.5018, "Asia/Bangkok"],
    ["Singapore", "Singapore", 1.3521, 103.8198, "Asia/Singapore"], ["Kuala Lumpur", "Malaysia", 3.139, 101.6869, "Asia/Kuala_Lumpur"],
    ["Jakarta", "Indonesia", -6.2088, 106.8456, "Asia/Jakarta"], ["Manila", "Philippines", 14.5995, 120.9842, "Asia/Manila"],
    ["Hong Kong", "China", 22.3193, 114.1694, "Asia/Hong_Kong"], ["Shanghai", "China", 31.2304, 121.4737, "Asia/Shanghai"],
    ["Beijing", "China", 39.9042, 116.4074, "Asia/Shanghai"], ["Seoul", "South Korea", 37.5665, 126.978, "Asia/Seoul"],
    ["Tokyo", "Japan", 35.6762, 139.6503, "Asia/Tokyo"], ["Osaka", "Japan", 34.6937, 135.5023, "Asia/Tokyo"],
    ["Taipei", "Taiwan", 25.033, 121.5654, "Asia/Taipei"], ["Sydney", "Australia", -33.8688, 151.2093, "Australia/Sydney"],
    ["Melbourne", "Australia", -37.8136, 144.9631, "Australia/Melbourne"], ["Brisbane", "Australia", -27.4698, 153.0251, "Australia/Brisbane"],
    ["Perth", "Australia", -31.9505, 115.8605, "Australia/Perth"], ["Auckland", "New Zealand", -36.8485, 174.7633, "Pacific/Auckland"]
  ];
  var ZONES = ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu", "America/Toronto", "America/Sao_Paulo", "America/Mexico_City", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Rome", "Europe/Moscow", "Africa/Cairo", "Africa/Johannesburg", "Asia/Dubai", "Asia/Kolkata", "Asia/Bangkok", "Asia/Shanghai", "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland"];

  function birthForm(b) {
    var pl = b && b.place, pick = "other";
    CITIES.forEach(function (c, i) { if (pl && c[0] + ", " + c[1] === pl.name && c[2] === pl.lat) pick = String(i); });
    var opts = CITIES.map(function (c, i) { return '<option value="' + i + '"' + (pick === String(i) ? " selected" : "") + ">" + esc(c[0] + ", " + c[1]) + "</option>"; }).join("");
    var zones = ZONES.map(function (z) { return '<option value="' + z + '"' + (pl && pl.tz === z && pick === "other" ? " selected" : "") + ">" + esc(z) + "</option>"; }).join("");
    var manual = pick === "other";
    return '<div class="grid">' +
      '<div class="c4"><label class="lbl" for="birth-date">Date of birth</label><input class="field" type="date" id="birth-date" value="' + esc(b ? b.date : "") + '"></div>' +
      '<div class="c4"><label class="lbl" for="birth-time">Time of birth</label><input class="field" type="time" id="birth-time" value="' + esc(b && b.time ? b.time : "") + '"' + (b && b.unknownTime ? " disabled" : "") + '><label class="small muted" style="display:flex;gap:8px;align-items:center;margin-top:6px"><input type="checkbox" id="birth-unknown"' + (b && b.unknownTime ? " checked" : "") + '> I don’t know my birth time</label></div>' +
      '<div class="c4"><label class="lbl" for="birth-place">Place of birth</label><select class="field" id="birth-place">' + opts + '<option value="other"' + (manual ? " selected" : "") + '>Other place (enter coordinates)</option></select></div>' +
      '<div class="c12" id="birth-manual"' + (manual ? "" : " hidden") + '><div class="grid">' +
        '<div class="c6"><label class="lbl" for="birth-name">Place name</label><input class="field" id="birth-name" maxlength="80" value="' + esc(manual && pl ? pl.name : "") + '" placeholder="Town, country"></div>' +
        '<div class="c3"><label class="lbl" for="birth-lat">Latitude</label><input class="field" id="birth-lat" type="number" step="0.0001" min="-90" max="90" value="' + esc(manual && pl ? pl.lat : "") + '" placeholder="e.g. 51.5"></div>' +
        '<div class="c3"><label class="lbl" for="birth-lon">Longitude</label><input class="field" id="birth-lon" type="number" step="0.0001" min="-180" max="180" value="' + esc(manual && pl ? pl.lon : "") + '" placeholder="e.g. -0.13"></div>' +
        '<div class="c12"><label class="lbl" for="birth-tz">Time zone at that place</label><select class="field" id="birth-tz">' + zones + "</select></div>" +
      "</div><p class=\"small muted\" style=\"margin:8px 0 0\">Not sure of the coordinates? Search the town on a map site and copy the latitude and longitude.</p></div>" +
      "</div>" +
      '<div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap"><button class="btn soft" data-act="birth-save">' + ic("sparkle") + (b ? "Update chart" : "Calculate my chart") + "</button>" +
      (b ? '<button class="btn ghost" data-act="birth-clear">' + ic("trash") + "Remove my details</button>" : "") + "</div>" +
      '<p class="small muted" style="margin:12px 0 0">Your details stay on this device. The chart is worked out here, and nothing is sent anywhere.</p>';
  }

  function placementCard(p, ch) {
    var kw = A.astroKeyword[p.name];
    return '<li class="li" style="display:block"><b>' + esc(p.name) + " in " + esc(p.sign) + "</b> <span class=\"small muted\">" + dms(p.deg) + " · house " + p.house + (p.retro ? " · retrograde" : "") + "</span>" +
      '<p class="small" style="margin:6px 0 0">' + esc(A.astroPlacement[p.name][p.sign]) + " " + esc(A.astroHouse[p.house]) + "</p>" +
      '<p class="small muted" style="margin:4px 0 0">Themes: ' + esc(kw) + "</p></li>";
  }

  function birthPage() {
    var b = A.state.birth;
    var head = A.head("Align", 'Birth <span class="soft">chart</span>', "Your natal chart is the sky as it was the moment you were born. Use it as a mirror for reflection, not as a prediction of what will happen.");
    if (!b) return head + A.card("Your birth details", birthForm(null), { icon: "sun", tone: "butter" });
    var ch = natal(b), lat = b.place.lat;
    var notes = [];
    if (b.unknownTime) notes.push("Birth time unknown: the chart uses 12:00 noon. Your Rising sign and houses are approximate.");
    if (Math.abs(lat) > 60) notes.push("At this latitude, the house divisions become less reliable.");
    if (ch.near.length) notes.push("Close to a sign boundary: " + ch.near.map(function (p) { return p.name + " (" + (p.deg < 1 ? "start of " : "end of ") + p.sign + ")"; }).join(", ") + ". Small differences in time or method can change these.");
    var sunP = ch.planets[0], moonP = ch.planets[1];
    var big = [
      ["Sun", sunP.sign, T.sun[sunP.sign], "sun"],
      ["Moon", moonP.sign, T.moon[moonP.sign], "moon"],
      ["Rising", ch.asc.sign, T.rising[ch.asc.sign], "sparkle"]
    ].map(function (x) {
      return '<div class="c4">' + A.card(x[0] + " in " + x[1], '<p class="small muted" style="margin:0 0 8px">' + dms(x[0] === "Rising" ? ch.asc.deg : x[0] === "Sun" ? sunP.deg : moonP.deg) + "</p><p class=\"small\" style=\"margin:0\">" + esc(x[2]) + "</p>", { icon: x[3], tone: "pink" }) + "</div>";
    }).join("");
    var others = ch.planets.slice(2).map(placementCard).join("");
    var lumin = ['<li class="li" style="display:block"><b>Sun in ' + esc(sunP.sign) + "</b> <span class=\"small muted\">" + dms(sunP.deg) + " · house " + sunP.house + "</span></li>", '<li class="li" style="display:block"><b>Moon in ' + esc(moonP.sign) + "</b> <span class=\"small muted\">" + dms(moonP.deg) + " · house " + moonP.house + "</span></li>"].join("");
    var houseList = [];
    for (var h = 1; h <= 12; h++) houseList.push('<li class="li" style="display:block"><b>House ' + h + " · " + esc(SIGNS[Math.floor(ch.cusps[h] / 30)]) + " " + dms(ch.cusps[h] % 30) + '</b><p class="small" style="margin:4px 0 0">' + esc(A.astroHouse[h]) + "</p></li>");
    var aspects = ch.aspects.length ? ch.aspects.map(function (x) {
      return '<li class="li" style="display:block"><b>' + esc(x.a.name) + " " + esc(x.type.toLowerCase()) + " " + esc(x.b.name) + '</b> <span class="small muted">orb ' + x.orb.toFixed(1) + "°</span>" +
        '<p class="small" style="margin:4px 0 0">' + esc(A.astroAspect[x.type]) + " Together: " + esc(A.astroKeyword[x.a.name]) + " and " + esc(A.astroKeyword[x.b.name]) + ".</p></li>";
    }).join("") : '<li class="li">No major aspects were found within the orbs.</li>';
    return head +
      '<div class="grid">' +
        '<div class="c12">' + A.card("Your chart", '<div class="birth-wheel-wrap">' + wheel(ch) + "</div>" +
          '<p class="small muted" style="text-align:center;margin:8px 0 0">' + esc(b.date) + (b.unknownTime ? "" : " at " + esc(b.time)) + " · " + esc(b.place.name) + " · ASC " + ch.asc.sign + " " + dms(ch.asc.deg) + " · MC " + ch.mc.sign + " " + dms(ch.mc.deg) + "</p>", { icon: "compass", tint: "grad" }) + "</div>" +
        (notes.length ? '<div class="c12">' + A.card("Good to know", '<ul class="insights" style="margin:0">' + notes.map(function (n) { return '<li class="li"><span class="li-text">' + esc(n) + "</span></li>"; }).join("") + "</ul>", { icon: "eye", tone: "" }) + "</div>" : "") +
        big +
        '<div class="c6">' + A.card("Everyday placements", '<ul class="list" style="margin:0">' + lumin + others + "</ul>", { icon: "star", tone: "mint" }) + "</div>" +
        '<div class="c6">' + A.card("Aspects", '<ul class="list" style="margin:0">' + aspects + "</ul>", { icon: "sparkle", tone: "sky" }) + "</div>" +
        '<div class="c12">' + A.card("The twelve houses", '<ul class="list" style="margin:0">' + houseList.join("") + "</ul>", { icon: "home", tone: "" }) + "</div>" +
        '<div class="c12">' + A.card("Your details", birthForm(b), { icon: "feather", tone: "" }) + "</div>" +
      "</div>";
  };

  A.views.birth = function () {
    try { return birthPage(); }
    catch (err) { return A.head("Align", 'Birth <span class="soft">chart</span>') + A.card("Your birth details", birthForm(A.state.birth) + '<p class="small" style="margin:12px 0 0">Something went wrong calculating the chart. Check the date, time and place, then save again.</p>', { icon: "eye", tone: "" }); }
  };

  /* test hooks, used by the scratch tests only */
  A._astro = { natal: natal, sunState: sunState, moonPos: moonPos, houses: houses, localToUtc: localToUtc };
})();
