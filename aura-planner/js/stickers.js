/* Aura — the sticker library.
   Every sticker is a small hand-built SVG drawing, so it stays sharp at any size and the pack
   adds almost nothing to the download. Colours come from the palette P below, so another
   planner can recolour the whole set by changing that one object. */
(function () {
  "use strict";
  var A = window.Aura;

  var P = {
    leaf: "#7FCBB0", leafL: "#BFEAD9", dark: "#4B4A7A", warm: "#F47BBD", blush: "#FFC6DE",
    sand: "#E3D6F7", gold: "#F2B84B", goldL: "#FFE8B0", cool: "#9B7BFF", coolL: "#E4DAFF",
    paper: "#FFFFFF", ink: "#3B3560", sky: "#8DBBFF", skyL: "#DCEBFF", night: "#4A3F7A",
    moon: "#FFF1C9", soil: "#9B7B8F"
  };
  var FONT = "Caveat, Poppins, sans-serif";

  var CATS = [["manifest", "Manifest"], ["nature", "Nature"], ["hearts", "Hearts & stars"], ["sky", "Sky & moon"], ["cozy", "Cozy"], ["tape", "Tape & labels"]];
  var LIST = [];
  function add(key, cat, name, w, h, inner) { LIST.push({ k: key, c: cat, n: name, w: w, h: h, s: inner }); }

  function poly(cx, cy, n, ro, ri, rot) {
    var pts = [], i, r, a;
    for (i = 0; i < n * 2; i++) {
      r = i % 2 ? ri : ro; a = Math.PI * i / n + (rot == null ? -Math.PI / 2 : rot);
      pts.push((cx + r * Math.cos(a)).toFixed(1) + " " + (cy + r * Math.sin(a)).toFixed(1));
    }
    return "M" + pts.join("L") + "Z";
  }
  function petals(n, cx, cy, rx, ry, off, fill, extra) {
    var s = "", i;
    for (i = 0; i < n; i++) s += '<ellipse cx="' + cx + '" cy="' + (cy - off) + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + (360 / n * i) + " " + cx + " " + cy + ')" fill="' + fill + '"' + (extra || "") + "/>";
    return s;
  }
  function line(d, color, w) { return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + (w || 3) + '"/>'; }

  /* ---- nature ---- */
  add("leaf", "nature", "Leaf", 100, 100,
    '<path d="M50 92C18 72 16 36 50 8c34 28 32 64 0 84z" fill="' + P.leaf + '"/>' + line("M50 90V24", P.dark, 3) + line("M50 62L36 50M50 48L64 36M50 74L38 64", P.dark, 2.2));
  add("leaf2", "nature", "Round leaf", 100, 100,
    '<ellipse cx="50" cy="50" rx="27" ry="40" transform="rotate(28 50 50)" fill="' + P.leafL + '"/>' + line("M30 80L68 20", P.leaf, 3.2));
  add("sprig", "nature", "Sprig", 100, 100,
    line("M50 95C47 70 53 40 50 14", P.dark, 3) + '<ellipse cx="50" cy="16" rx="7" ry="12" fill="' + P.leaf + '"/>' +
    '<ellipse cx="35" cy="42" rx="15" ry="7" transform="rotate(-38 35 42)" fill="' + P.leafL + '"/><ellipse cx="65" cy="52" rx="15" ry="7" transform="rotate(38 65 52)" fill="' + P.leaf + '"/>' +
    '<ellipse cx="34" cy="68" rx="15" ry="7" transform="rotate(-38 34 68)" fill="' + P.leaf + '"/><ellipse cx="66" cy="78" rx="15" ry="7" transform="rotate(38 66 78)" fill="' + P.leafL + '"/>');
  add("branch", "nature", "Branch", 100, 100,
    line("M10 90C38 72 62 46 90 12", P.dark, 3.2) +
    '<ellipse cx="30" cy="70" rx="13" ry="6" transform="rotate(-62 30 70)" fill="' + P.leaf + '"/><ellipse cx="38" cy="84" rx="13" ry="6" transform="rotate(10 38 84)" fill="' + P.leafL + '"/>' +
    '<ellipse cx="52" cy="52" rx="13" ry="6" transform="rotate(-70 52 52)" fill="' + P.leafL + '"/><ellipse cx="62" cy="64" rx="13" ry="6" transform="rotate(15 62 64)" fill="' + P.leaf + '"/>' +
    '<ellipse cx="72" cy="32" rx="13" ry="6" transform="rotate(-72 72 32)" fill="' + P.leaf + '"/><ellipse cx="82" cy="44" rx="13" ry="6" transform="rotate(20 82 44)" fill="' + P.leafL + '"/><ellipse cx="90" cy="14" rx="12" ry="6" transform="rotate(-50 90 14)" fill="' + P.leaf + '"/>');
  add("flower", "nature", "Flower", 100, 100, petals(5, 50, 50, 15, 24, 22, P.blush) + '<circle cx="50" cy="50" r="11" fill="' + P.gold + '"/><circle cx="50" cy="50" r="5" fill="' + P.goldL + '"/>');
  add("daisy", "nature", "Daisy", 100, 100, petals(12, 50, 50, 7, 21, 25, P.paper, ' stroke="' + P.sand + '" stroke-width="1.5"') + '<circle cx="50" cy="50" r="12" fill="' + P.gold + '"/>');
  add("tulip", "nature", "Tulip", 100, 100,
    line("M50 46V92", P.dark, 3.4) + '<path d="M50 92C30 84 24 64 28 58C44 62 50 76 50 92z" fill="' + P.leaf + '"/>' +
    '<path d="M28 18C28 56 72 56 72 18L61 30L50 14L39 30z" fill="' + P.warm + '"/>');
  add("blossom", "nature", "Blossom", 100, 100,
    '<g fill="' + P.coolL + '" stroke="' + P.cool + '" stroke-width="2">' + [0, 72, 144, 216, 288].map(function (d) { return '<circle cx="50" cy="28" r="17" transform="rotate(' + d + ' 50 50)"/>'; }).join("") + '</g><circle cx="50" cy="50" r="9" fill="' + P.gold + '"/>');
  add("mushroom", "nature", "Mushroom", 100, 100,
    '<path d="M38 54h24l-3 30q-9 7-18 0z" fill="' + P.goldL + '" stroke="' + P.sand + '" stroke-width="2"/>' +
    '<path d="M10 56C10 28 28 10 50 10s40 18 40 46z" fill="' + P.warm + '"/><circle cx="32" cy="34" r="6" fill="' + P.paper + '"/><circle cx="56" cy="26" r="5" fill="' + P.paper + '"/><circle cx="72" cy="42" r="6" fill="' + P.paper + '"/><circle cx="48" cy="46" r="4" fill="' + P.paper + '"/>');
  add("cactus", "nature", "Cactus", 100, 100,
    '<path d="M24 50H16a6 6 0 0 1-6-6V32" transform="translate(14 4)" fill="none" stroke="' + P.leaf + '" stroke-width="11"/>' +
    '<path d="M76 58H84a6 6 0 0 0 6-6V40" transform="translate(-14 -2)" fill="none" stroke="' + P.leaf + '" stroke-width="11"/>' +
    '<rect x="39" y="16" width="22" height="62" rx="11" fill="' + P.leaf + '"/><circle cx="50" cy="16" r="5" fill="' + P.blush + '"/>' +
    '<path d="M30 72h40l-6 22H36z" fill="' + P.warm + '"/><rect x="28" y="68" width="44" height="8" rx="3" fill="' + P.blush + '"/>');
  add("seedling", "nature", "Seedling", 100, 100,
    '<path d="M18 90Q50 62 82 90z" fill="' + P.soil + '"/>' + line("M50 84V52", P.dark, 3.4) +
    '<path d="M50 58C30 58 22 44 24 30c20 0 28 12 26 28z" fill="' + P.leaf + '"/><path d="M50 52C66 52 78 42 78 26c-20 2-30 12-28 26z" fill="' + P.leafL + '"/>');
  add("clover", "nature", "Clover", 100, 100,
    '<g fill="' + P.leaf + '"><circle cx="50" cy="30" r="16"/><circle cx="70" cy="50" r="16"/><circle cx="50" cy="70" r="16"/><circle cx="30" cy="50" r="16"/></g><circle cx="50" cy="50" r="8" fill="' + P.leafL + '"/>' + line("M50 78C50 88 56 94 66 96", P.dark, 3));
  add("feather", "nature", "Feather", 100, 100,
    '<path d="M24 92C16 50 38 16 80 8C86 46 68 84 24 92z" fill="' + P.sand + '"/>' + line("M24 92L70 20", P.ink, 2.6) + line("M40 70L52 74M48 56L62 60M56 42L70 44M34 80L42 86", P.warm, 2));
  add("pine", "nature", "Pine tree", 100, 100,
    '<rect x="44" y="82" width="12" height="12" fill="' + P.soil + '"/><path d="M50 44L88 86H12z" fill="' + P.dark + '"/><path d="M50 26L82 64H18z" fill="' + P.leaf + '"/><path d="M50 6L76 40H24z" fill="' + P.leafL + '"/>');

  /* ---- hearts, stars & sparkles ---- */
  var HEART = "M50 88C8 58 12 20 36 20c8 0 14 6 14 12c0-6 6-12 14-12c24 0 28 38-14 68z";
  add("heart", "hearts", "Heart", 100, 100, '<path d="' + HEART + '" fill="' + P.warm + '"/><path d="M30 34c4-6 12-6 14 2" fill="none" stroke="' + P.blush + '" stroke-width="3.5" opacity=".7"/>');
  add("heart2", "hearts", "Soft heart", 100, 100, '<path d="' + HEART + '" fill="' + P.blush + '"/>');
  add("hearts", "hearts", "Two hearts", 100, 100,
    '<g transform="translate(-4 -2) scale(.8)"><path d="' + HEART + '" fill="' + P.blush + '"/></g><g transform="translate(46 34) scale(.5)"><path d="' + HEART + '" fill="' + P.warm + '"/></g>');
  add("star", "hearts", "Star", 100, 100, '<path d="' + poly(50, 54, 5, 44, 19) + '" fill="' + P.gold + '" stroke="' + P.gold + '" stroke-width="5"/>');
  add("sparkle", "hearts", "Sparkle", 100, 100, '<path d="M50 6C54 36 64 46 94 50C64 54 54 64 50 94C46 64 36 54 6 50C36 46 46 36 50 6z" fill="' + P.gold + '"/>');
  add("sparkles", "hearts", "Sparkles", 100, 100,
    '<path d="M42 14C45 40 54 48 80 52C54 56 45 64 42 90C39 64 30 56 4 52C30 48 39 40 42 14z" fill="' + P.goldL + '" stroke="' + P.gold + '" stroke-width="2.5"/>' +
    '<path d="M80 10C81 20 85 24 94 25C85 26 81 30 80 40C79 30 75 26 66 25C75 24 79 20 80 10z" fill="' + P.gold + '"/><path d="M82 66C83 74 86 77 94 78C86 79 83 82 82 90C81 82 78 79 70 78C78 77 81 74 82 66z" fill="' + P.gold + '"/>');
  add("burst", "hearts", "Burst", 100, 100, '<path d="' + poly(50, 50, 12, 46, 36) + '" fill="' + P.goldL + '" stroke="' + P.gold + '" stroke-width="3"/><circle cx="50" cy="50" r="14" fill="' + P.gold + '" opacity=".35"/>');
  add("confetti", "hearts", "Confetti", 100, 100,
    '<circle cx="20" cy="24" r="6" fill="' + P.warm + '"/><circle cx="62" cy="14" r="5" fill="' + P.gold + '"/><circle cx="84" cy="40" r="7" fill="' + P.leaf + '"/><circle cx="36" cy="58" r="5" fill="' + P.cool + '"/><circle cx="70" cy="78" r="6" fill="' + P.blush + '"/><circle cx="20" cy="84" r="7" fill="' + P.gold + '"/><circle cx="50" cy="38" r="4" fill="' + P.leafL + '"/>' +
    '<rect x="44" y="70" width="14" height="5" rx="2" transform="rotate(-30 51 72)" fill="' + P.warm + '"/><rect x="72" y="58" width="14" height="5" rx="2" transform="rotate(35 79 60)" fill="' + P.cool + '"/>');
  add("circle", "hearts", "Circle doodle", 100, 100, '<ellipse cx="50" cy="50" rx="42" ry="30" transform="rotate(-8 50 50)" fill="none" stroke="' + P.warm + '" stroke-width="4"/>');

  /* ---- sky & moon ---- */
  function moon(lit, flip) {
    return '<circle cx="50" cy="50" r="42" fill="' + P.night + '"/>' +
      (lit ? '<path d="' + lit + '" fill="' + P.moon + '"' + (flip ? ' transform="translate(100 0) scale(-1 1)"' : "") + "/>" : "") +
      '<circle cx="50" cy="50" r="42" fill="none" stroke="' + P.cool + '" stroke-width="2.5"/>';
  }
  var HALF = "M50 8A42 42 0 0 1 50 92";
  add("moon-new", "sky", "New moon", 100, 100, moon(null));
  add("moon-wax-cres", "sky", "Waxing crescent", 100, 100, moon(HALF + "A26 42 0 0 0 50 8Z"));
  add("moon-first", "sky", "First quarter", 100, 100, moon(HALF + "Z"));
  add("moon-wax-gib", "sky", "Waxing gibbous", 100, 100, moon(HALF + "A26 42 0 0 1 50 8Z"));
  add("moon-full", "sky", "Full moon", 100, 100,
    '<circle cx="50" cy="50" r="42" fill="' + P.moon + '" stroke="' + P.gold + '" stroke-width="2.5"/><circle cx="36" cy="38" r="7" fill="' + P.goldL + '"/><circle cx="62" cy="60" r="9" fill="' + P.goldL + '"/><circle cx="58" cy="30" r="4" fill="' + P.goldL + '"/>');
  add("moon-wan-gib", "sky", "Waning gibbous", 100, 100, moon(HALF + "A26 42 0 0 1 50 8Z", true));
  add("moon-last", "sky", "Last quarter", 100, 100, moon(HALF + "Z", true));
  add("moon-wan-cres", "sky", "Waning crescent", 100, 100, moon(HALF + "A26 42 0 0 0 50 8Z", true));
  add("crescent", "sky", "Crescent moon", 100, 100,
    '<path d="M64 8A42 42 0 1 0 92 66A34 34 0 0 1 64 8z" fill="' + P.moon + '" stroke="' + P.gold + '" stroke-width="3"/><path d="' + poly(74, 30, 4, 9, 2.5) + '" fill="' + P.gold + '"/>');
  add("sun", "sky", "Sun", 100, 100,
    '<g stroke="' + P.gold + '" stroke-width="6">' + [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(function (d) { return '<path d="M50 8V20" transform="rotate(' + d + ' 50 50)"/>'; }).join("") + '</g><circle cx="50" cy="50" r="24" fill="' + P.goldL + '" stroke="' + P.gold + '" stroke-width="4"/>');
  add("cloud", "sky", "Cloud", 100, 100, '<path d="M26 76C10 76 6 56 20 50C18 32 40 24 50 38C58 26 80 32 78 50C94 52 94 76 78 76z" fill="' + P.paper + '" stroke="' + P.sky + '" stroke-width="3.5"/>');
  add("rainbow", "sky", "Rainbow", 100, 100,
    '<g fill="none" stroke-width="7"><path d="M10 74A40 40 0 0 1 90 74" stroke="' + P.warm + '"/><path d="M17 74A33 33 0 0 1 83 74" stroke="' + P.gold + '"/><path d="M24 74A26 26 0 0 1 76 74" stroke="' + P.leaf + '"/><path d="M31 74A19 19 0 0 1 69 74" stroke="' + P.sky + '"/></g>' +
    '<circle cx="14" cy="76" r="8" fill="' + P.paper + '" stroke="' + P.sky + '" stroke-width="2.5"/><circle cx="86" cy="76" r="8" fill="' + P.paper + '" stroke="' + P.sky + '" stroke-width="2.5"/>');
  add("drop", "sky", "Raindrop", 100, 100, '<path d="M50 8C50 8 22 42 22 62a28 28 0 0 0 56 0C78 42 50 8 50 8z" fill="' + P.sky + '"/><path d="M36 62a14 14 0 0 0 10 14" fill="none" stroke="' + P.paper + '" stroke-width="4" opacity=".8"/>');
  add("stars", "sky", "Little stars", 100, 100,
    '<path d="' + poly(34, 40, 5, 22, 9) + '" fill="' + P.gold + '"/><path d="' + poly(72, 30, 5, 13, 5.5) + '" fill="' + P.goldL + '" stroke="' + P.gold + '" stroke-width="2"/><path d="' + poly(68, 72, 5, 17, 7) + '" fill="' + P.gold + '"/>');
  add("shooting", "sky", "Shooting star", 100, 100,
    '<g stroke="' + P.gold + '" stroke-width="4" opacity=".65"><path d="M10 84L50 50"/><path d="M6 70L36 46"/><path d="M24 92L54 64"/></g><path d="' + poly(68, 34, 5, 24, 10) + '" fill="' + P.gold + '"/>');

  /* ---- cozy ---- */
  add("teacup", "cozy", "Tea cup", 100, 100,
    '<ellipse cx="48" cy="82" rx="36" ry="7" fill="' + P.sand + '"/><path d="M20 44h56v8a28 28 0 0 1-56 0z" fill="' + P.paper + '" stroke="' + P.warm + '" stroke-width="3"/><path d="M76 48h5a9 9 0 0 1 0 18h-9" fill="none" stroke="' + P.warm + '" stroke-width="3"/>' +
    '<path d="M20 52h56" stroke="' + P.warm + '" stroke-width="3"/><path d="M38 34c-7-7 7-11 0-20M56 34c-7-7 7-11 0-20" fill="none" stroke="' + P.cool + '" stroke-width="3"/>');
  add("mug", "cozy", "Mug", 100, 100,
    '<rect x="20" y="36" width="50" height="48" rx="8" fill="' + P.leafL + '"/><path d="M70 46h6a10 10 0 0 1 0 22h-6" fill="none" stroke="' + P.leaf + '" stroke-width="5"/><path d="M20 52h50" stroke="' + P.paper + '" stroke-width="4"/>' +
    '<path d="M36 28c-6-6 6-10 0-18M54 28c-6-6 6-10 0-18" fill="none" stroke="' + P.cool + '" stroke-width="3"/>');
  add("book", "cozy", "Open book", 100, 100,
    '<path d="M50 28C38 18 22 18 8 22V78C22 74 38 74 50 84z" fill="' + P.paper + '" stroke="' + P.dark + '" stroke-width="3"/><path d="M50 28C62 18 78 18 92 22V78C78 74 62 74 50 84z" fill="' + P.paper + '" stroke="' + P.dark + '" stroke-width="3"/>' +
    line("M18 34C26 32 34 32 42 36M18 46C26 44 34 44 42 48M18 58C26 56 34 56 42 60M58 36C66 32 74 32 82 34M58 48C66 44 74 44 82 46", P.sand, 2.5) + '<path d="M64 18v26l5-4 5 4V18z" fill="' + P.warm + '"/>');
  add("pencil", "cozy", "Pencil", 100, 100,
    '<g transform="rotate(45 50 50)"><rect x="40" y="6" width="20" height="14" rx="4" fill="' + P.blush + '"/><rect x="40" y="20" width="20" height="8" fill="' + P.sand + '"/><rect x="40" y="28" width="20" height="46" fill="' + P.gold + '"/><path d="M40 74h20L50 94z" fill="' + P.goldL + '"/><path d="M46 86h8L50 94z" fill="' + P.ink + '"/><path d="M50 28v46" stroke="' + P.goldL + '" stroke-width="3"/></g>');
  add("candle", "cozy", "Candle", 100, 100,
    '<rect x="32" y="40" width="36" height="46" rx="6" fill="' + P.paper + '" stroke="' + P.sand + '" stroke-width="3"/><path d="M32 52c6 8 12-2 18 4s12-2 18 4" fill="none" stroke="' + P.blush + '" stroke-width="4"/><path d="M50 40v-6" stroke="' + P.ink + '" stroke-width="3"/>' +
    '<path d="M50 8C60 20 62 30 50 34C38 30 40 20 50 8z" fill="' + P.gold + '"/><path d="M50 20C55 26 55 30 50 32C45 30 45 26 50 20z" fill="' + P.goldL + '"/>');
  add("key", "cozy", "Key", 100, 100,
    '<g transform="rotate(-40 50 50)"><circle cx="24" cy="50" r="15" fill="none" stroke="' + P.gold + '" stroke-width="7"/><path d="M38 50H90" stroke="' + P.gold + '" stroke-width="7"/><path d="M76 50v12M86 50v9" stroke="' + P.gold + '" stroke-width="6"/></g>');
  add("envelope", "cozy", "Love letter", 100, 100,
    '<rect x="8" y="22" width="84" height="58" rx="6" fill="' + P.paper + '" stroke="' + P.sand + '" stroke-width="3"/><path d="M10 26L50 56L90 26" fill="none" stroke="' + P.sand + '" stroke-width="3"/><path d="' + HEART + '" transform="translate(38 44) scale(.24)" fill="' + P.warm + '"/>');
  add("bow", "cozy", "Bow", 100, 100,
    '<path d="M50 48C30 22 6 30 10 50C6 70 30 76 50 48z" fill="' + P.blush + '" stroke="' + P.warm + '" stroke-width="2.5"/><path d="M50 48C70 22 94 30 90 50C94 70 70 76 50 48z" fill="' + P.blush + '" stroke="' + P.warm + '" stroke-width="2.5"/>' +
    '<path d="M46 58L32 92L46 84L52 94L56 60z" fill="' + P.blush + '" stroke="' + P.warm + '" stroke-width="2.5"/><path d="M54 58L68 92L54 84L50 94L48 60z" fill="' + P.blush + '" stroke="' + P.warm + '" stroke-width="2.5"/><rect x="43" y="40" width="14" height="18" rx="5" fill="' + P.warm + '"/>');
  add("butterfly", "cozy", "Butterfly", 100, 100,
    '<ellipse cx="30" cy="36" rx="22" ry="17" transform="rotate(-25 30 36)" fill="' + P.cool + '"/><ellipse cx="70" cy="36" rx="22" ry="17" transform="rotate(25 70 36)" fill="' + P.cool + '"/>' +
    '<ellipse cx="34" cy="66" rx="15" ry="12" transform="rotate(20 34 66)" fill="' + P.blush + '"/><ellipse cx="66" cy="66" rx="15" ry="12" transform="rotate(-20 66 66)" fill="' + P.blush + '"/>' +
    '<circle cx="28" cy="34" r="5" fill="' + P.paper + '"/><circle cx="72" cy="34" r="5" fill="' + P.paper + '"/><rect x="47" y="26" width="6" height="52" rx="3" fill="' + P.dark + '"/>' + line("M48 28C44 18 40 14 36 12M52 28C56 18 60 14 64 12", P.dark, 2.2));
  add("crystal", "cozy", "Crystal", 100, 100,
    '<path d="M50 6L80 34L66 94H34L20 34z" fill="' + P.coolL + '" stroke="' + P.cool + '" stroke-width="3"/><path d="M50 6L38 34L34 94M50 6L62 34L66 94M20 34H80M38 34L50 94L62 34" fill="none" stroke="' + P.cool + '" stroke-width="2" opacity=".8"/>');

  /* ---- tape, labels & doodles ---- */
  var TORN = "M4 6L156 6L160 12L155 18L160 24L155 30L160 36L156 42L4 42L0 36L5 30L0 24L5 18L0 12Z";
  function tape(key, name, fill, decor) {
    add(key, "tape", name, 160, 48,
      '<clipPath id="clip-' + key + '"><path d="' + TORN + '"/></clipPath><g clip-path="url(#clip-' + key + ')"><path d="' + TORN + '" fill="' + fill + '" opacity=".88"/>' + (decor || "") + "</g>");
  }
  tape("tape-sage", "Sage tape", P.leafL);
  tape("tape-clay", "Clay tape", P.blush);
  tape("tape-stripe", "Striped tape", P.goldL, [14, 38, 62, 86, 110, 134].map(function (x) { return '<rect x="' + x + '" y="0" width="10" height="48" fill="' + P.gold + '" opacity=".45"/>'; }).join(""));
  tape("tape-dots", "Dotted tape", P.coolL, [16, 44, 72, 100, 128].map(function (x) { return '<circle cx="' + x + '" cy="17" r="4.5" fill="' + P.cool + '"/><circle cx="' + (x + 14) + '" cy="32" r="4.5" fill="' + P.cool + '"/>'; }).join(""));
  tape("tape-check", "Checked tape", P.skyL, '<g fill="' + P.sky + '" opacity=".55">' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return '<rect x="' + (i * 20) + '" y="' + (i % 2 ? 0 : 12) + '" width="10" height="12"/><rect x="' + (i * 20 + 10) + '" y="' + (i % 2 ? 12 : 24) + '" width="10" height="12"/>'; }).join("") + "</g>");

  function label(key, text, fill, stroke) {
    add(key, "tape", text, 160, 54,
      '<rect x="4" y="4" width="152" height="46" rx="23" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3"/><text x="80" y="35" text-anchor="middle" font-family="' + FONT + '" font-weight="600" font-size="30" fill="' + P.ink + '">' + text + "</text>");
  }
  label("label-todo", "To do", P.leafL, P.leaf);
  label("label-ideas", "Ideas", P.goldL, P.gold);
  label("label-grateful", "Grateful", P.blush, P.warm);
  label("label-goals", "Goals", P.coolL, P.cool);
  label("label-notes", "Notes", P.paper, P.sand);
  label("label-today", "Today", P.skyL, P.sky);

  add("arrow", "tape", "Arrow", 100, 100, line("M14 74C18 36 52 20 84 32", P.warm, 4.5) + line("M70 18L86 32L66 42", P.warm, 4.5));
  add("squiggle", "tape", "Squiggle", 160, 40, line("M8 22q10-14 20 0t20 0t20 0t20 0t20 0t20 0t20 0", P.warm, 4.5));
  add("underline", "tape", "Underline", 160, 40, line("M8 24C50 14 110 30 152 16", P.leaf, 5) + line("M20 32C60 24 100 36 140 28", P.leafL, 3.5));
  add("highlight", "tape", "Highlight", 160, 48, '<path d="M6 12L152 6L154 38L10 42z" fill="' + P.gold + '" opacity=".38"/>');
  add("check", "tape", "Tick", 100, 100, '<circle cx="50" cy="50" r="40" fill="' + P.leaf + '"/>' + line("M30 52L45 66L72 34", P.paper, 7));

  /* ---- manifestation ---- */
  add("lotus", "manifest", "Lotus", 100, 100,
    '<path d="M50 20C64 34 66 56 50 78C34 56 36 34 50 20z" fill="' + P.blush + '" stroke="' + P.warm + '" stroke-width="2.5"/>' +
    '<path d="M16 38C36 38 48 54 50 78C28 76 16 62 16 38z" fill="' + P.coolL + '" stroke="' + P.cool + '" stroke-width="2.5"/><path d="M84 38C64 38 52 54 50 78C72 76 84 62 84 38z" fill="' + P.coolL + '" stroke="' + P.cool + '" stroke-width="2.5"/>' +
    '<path d="M8 74C28 90 72 90 92 74" fill="none" stroke="' + P.sky + '" stroke-width="4"/>');
  add("infinity", "manifest", "Infinity", 100, 100,
    line("M50 50C38 30 14 30 14 50s24 20 36 0C62 30 86 30 86 50S62 70 50 50z", P.cool, 8) + line("M50 50C38 30 14 30 14 50s24 20 36 0C62 30 86 30 86 50S62 70 50 50z", P.coolL, 2.5));
  add("third-eye", "manifest", "Inner eye", 100, 100,
    '<path d="M6 54C24 26 76 26 94 54C76 82 24 82 6 54z" fill="' + P.paper + '" stroke="' + P.dark + '" stroke-width="3.5"/><circle cx="50" cy="54" r="18" fill="' + P.cool + '"/><circle cx="50" cy="54" r="8" fill="' + P.night + '"/><circle cx="55" cy="48" r="3.5" fill="' + P.paper + '"/>' +
    line("M50 8V20M28 14L34 24M72 14L66 24", P.gold, 4));
  add("seed-packet", "manifest", "Seed packet", 100, 100,
    '<path d="M22 12H78V90H22z" fill="' + P.paper + '" stroke="' + P.cool + '" stroke-width="3"/><path d="M22 12H78V26H22z" fill="' + P.cool + '"/><path d="M34 74C34 54 50 44 50 44C50 44 66 54 66 74z" fill="' + P.leafL + '"/>' + line("M50 74V52", P.leaf, 3.5) + '<path d="M50 60C42 60 38 54 38 48c8 0 12 4 12 12z" fill="' + P.leaf + '"/>' +
    '<path d="M50 56C58 56 62 50 62 44c-8 0-12 4-12 12z" fill="' + P.leaf + '"/>');
  add("wings", "manifest", "Angel wings", 100, 100,
    '<path d="M46 52C34 30 14 28 6 34C10 52 22 64 46 66z" fill="' + P.paper + '" stroke="' + P.cool + '" stroke-width="3"/><path d="M46 62C32 52 20 54 14 60C22 72 32 76 46 74z" fill="' + P.coolL + '" stroke="' + P.cool + '" stroke-width="2.5"/>' +
    '<path d="M54 52C66 30 86 28 94 34C90 52 78 64 54 66z" fill="' + P.paper + '" stroke="' + P.cool + '" stroke-width="3"/><path d="M54 62C68 52 80 54 86 60C78 72 68 76 54 74z" fill="' + P.coolL + '" stroke="' + P.cool + '" stroke-width="2.5"/>' +
    '<circle cx="50" cy="52" r="4" fill="' + P.gold + '"/>');
  add("wish", "manifest", "Wish star", 100, 100,
    '<path d="' + poly(50, 54, 5, 40, 17) + '" fill="' + P.goldL + '" stroke="' + P.gold + '" stroke-width="4"/><path d="M78 14C79 22 82 25 90 26C82 27 79 30 78 38C77 30 74 27 66 26C74 25 77 22 78 14z" fill="' + P.warm + '"/><path d="M16 12C17 18 19 20 25 21C19 22 17 24 16 30C15 24 13 22 7 21C13 20 15 18 16 12z" fill="' + P.cool + '"/>');
  function bubble(key, text, fill, stroke, size, w) {
    add(key, "manifest", text, w || 160, 54,
      '<rect x="4" y="4" width="' + ((w || 160) - 8) + '" height="46" rx="23" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3"/><text x="' + ((w || 160) / 2) + '" y="36" text-anchor="middle" font-family="' + FONT + '" font-weight="600" font-size="' + (size || 30) + '" fill="' + P.ink + '">' + text + "</text>");
  }
  bubble("label-iam", "I am", P.coolL, P.cool);
  bubble("label-grateful2", "Gratitude", P.goldL, P.gold);
  bubble("label-intent", "Intentions", P.blush, P.warm);
  bubble("label-manifested", "Manifested!", P.leafL, P.leaf);
  bubble("label-trust", "Trust", P.skyL, P.sky);
  bubble("label-receive", "I receive", P.coolL, P.cool);
  bubble("label-dream", "Dream big", P.blush, P.warm);
  function angel(n, fill, stroke) {
    add("angel-" + n, "manifest", "Angel number " + n, 100, 100,
      '<circle cx="50" cy="50" r="42" fill="' + fill + '" stroke="' + stroke + '" stroke-width="4"/><circle cx="50" cy="50" r="34" fill="none" stroke="' + P.paper + '" stroke-width="2" stroke-dasharray="3 5"/><text x="50" y="62" text-anchor="middle" font-family="Poppins, sans-serif" font-weight="600" font-size="32" fill="' + P.ink + '">' + n + "</text>");
  }
  angel(111, P.coolL, P.cool); angel(222, P.blush, P.warm); angel(333, P.goldL, P.gold); angel(444, P.leafL, P.leaf);

  /* ---- public API ---- */
  var byKey = Object.create(null);
  LIST.forEach(function (s) { byKey[s.k] = s; });
  A.STICKER_CATS = CATS;
  A.STICKERS = LIST;
  A.sticker = function (key) { return byKey[key] || null; };
  A.stickerSvg = function (key) {
    var s = byKey[key];
    if (!s) return "";
    return '<svg viewBox="0 0 ' + s.w + " " + s.h + '" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + s.s + "</svg>";
  };
})();
