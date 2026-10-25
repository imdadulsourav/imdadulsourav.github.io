(function () {
  "use strict";
  document.documentElement.classList.add("js");

  // mobile menu
  var btn = document.querySelector(".menu-btn");
  var nav = document.getElementById("nav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }


  // slide viewers
  Array.prototype.forEach.call(document.querySelectorAll(".deck"), function (deck) {
    var base = deck.getAttribute("data-deck"), n = +deck.getAttribute("data-count"), title = deck.getAttribute("data-title");
    var img = deck.querySelector(".deck-img"), count = deck.querySelector(".deck-count"), bar = deck.querySelector(".deck-progress i");
    var prev = deck.querySelector('[data-dir="-1"]'), next = deck.querySelector('[data-dir="1"]'), full = deck.querySelector(".deck-full");
    var i = 1, cache = {};
    function src(k) { return base + "/" + (k < 10 ? "0" : "") + k + ".webp"; }
    function warm(k) { if (k >= 1 && k <= n && !cache[k]) { cache[k] = new Image(); cache[k].src = src(k); } }
    function show(k) {
      if (k < 1 || k > n) return;
      i = k;
      img.classList.add("loading");
      img.onload = function () { img.classList.remove("loading"); };
      img.src = src(i);
      img.alt = "Slide " + i + " of " + n + ": " + title;
      count.textContent = i + " / " + n;
      bar.style.width = (i / n * 100) + "%";
      prev.disabled = i === 1; next.disabled = i === n;
      warm(i + 1); warm(i - 1);
    }
    prev.addEventListener("click", function () { show(i - 1); });
    next.addEventListener("click", function () { show(i + 1); });
    deck.querySelector(".deck-frame").addEventListener("click", function (e) {
      if (document.fullscreenElement === deck) return;
      var r = this.getBoundingClientRect();
      show(e.clientX - r.left < r.width * 0.3 ? i - 1 : i + 1);
    });
    deck.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { show(i + 1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { show(i - 1); e.preventDefault(); }
    });
    var x0 = null;
    deck.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    deck.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) show(dx < 0 ? i + 1 : i - 1);
    });
    if (full) {
      if (!deck.requestFullscreen) full.hidden = true;
      full.addEventListener("click", function () {
        if (document.fullscreenElement === deck) document.exitFullscreen();
        else deck.requestFullscreen().then(function () { deck.focus(); }).catch(function () {});
      });
    }
    prev.disabled = true;
    deck.addEventListener("mouseenter", function () { warm(2); }, { once: true });
  });

  var stage = document.getElementById("stage");
  if (!stage) return;
  var hero = document.querySelector(".hero");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var NS = "http://www.w3.org/2000/svg";
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var seed = 11;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  var INK = "#2e251f", MOSS = "#6f9150", RUST = "#c55b3e";
  var svg = el("svg", { viewBox: "0 0 760 375", role: "img",
    "aria-label": "A retinal image made of hexagonal pixels is scanned and passed through a small neural network. The network then outputs a class, 0 or 1." });
  stage.appendChild(svg);

  // ---------- the input image: a fundus photo built from hexagonal pixels ----------
  var CX = 150, CY = 210, DISK = 120, r = 11.5;
  var tiles = [];
  var tileG = el("g", { stroke: "#ffffff", "stroke-width": "2", "stroke-linejoin": "round" }, svg);
  function hexPath(x, y, rr) {
    var p = [];
    for (var i = 0; i < 6; i++) {
      var t = Math.PI / 180 * (60 * i - 90);
      p.push((x + rr * Math.cos(t)).toFixed(1) + "," + (y + rr * Math.sin(t)).toFixed(1));
    }
    return "M" + p.join("L") + "Z";
  }
  var w = Math.sqrt(3) * r, dy = 1.5 * r;
  for (var row = -9; row <= 9; row++) {
    for (var col = -8; col <= 8; col++) {
      var x = CX + col * w + (row % 2 ? w / 2 : 0), y = CY + row * dy;
      var d = Math.hypot(x - CX, y - CY);
      if (d > DISK - 4) continue;
      var disc = Math.hypot(x - (CX + 40), y - (CY - 18));
      var lesion = Math.hypot(x - (CX - 44), y - (CY + 46));
      var fill;
      if (disc < 22) fill = disc < 11 ? "#efd3a0" : "#e0bd7f";
      else if (lesion < 13) fill = RUST;
      else if (lesion < 26 && rnd() < 0.55) fill = "#d98a6a";
      else {
        var shade = rnd();
        fill = d > DISK - 26 ? (shade < 0.5 ? "#c7d3c3" : "#b9c8b2")
          : shade < 0.45 ? "#dfe7dc" : shade < 0.8 ? "#cfdccb" : "#b5c79f";
      }
      var t = el("path", { class: "tile", d: hexPath(x, y, r), fill: fill }, tileG);
      t.style.transitionDelay = (d / DISK * 0.7).toFixed(2) + "s";
      tiles.push({ el: t, x: x, y: y });
    }
  }
  var clip = el("clipPath", { id: "disk" }, svg);
  el("circle", { cx: CX, cy: CY, r: DISK }, clip);
  var scan = el("line", { x1: 0, y1: CY - DISK, x2: 0, y2: CY + DISK, stroke: MOSS, "stroke-width": "2", "clip-path": "url(#disk)", opacity: 0 }, svg);

  // ---------- the network ----------
  var net = el("g", { class: "net" }, svg);
  var cols = [
    { x: 362, n: 6, gap: 46 },
    { x: 478, n: 5, gap: 50 },
    { x: 590, n: 3, gap: 56 }
  ];
  var layers = cols.map(function (c, li) {
    var a = [];
    for (var i = 0; i < c.n; i++) a.push({ x: c.x, y: CY + (i - (c.n - 1) / 2) * c.gap, li: li, act: 0, fired: -1, out: [] });
    return a;
  });
  var outputs = [
    { x: 700, y: CY - 32, label: "0", hot: MOSS, act: 0, out: [] },
    { x: 700, y: CY + 32, label: "1", hot: RUST, act: 0, out: [] }
  ];
  var risk = { x: 590, y: 372, act: 0, out: [] };

  // sample points on the image that feed the first layer
  var samples = [];
  for (var s = 0; s < 7; s++) {
    var ang = -0.9 + s * 0.3;
    samples.push({ x: CX + Math.cos(ang) * (DISK - 6), y: CY + Math.sin(ang) * (DISK - 6), out: [] });
  }

  var edgeG = el("g", { stroke: "#c4cdc8", "stroke-width": "1" }, net);
  var edges = [];
  function connect(a, b, attrs) {
    var line = el("line", Object.assign({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }, attrs || {}), edgeG);
    var e = { a: a, b: b, el: line, glow: 0, base: attrs && attrs.stroke };
    a.out.push(e); edges.push(e);
    return e;
  }
  samples.forEach(function (sp) { layers[0].forEach(function (n) { connect(sp, n, { opacity: 0.45 }); }); });
  for (var l = 0; l < layers.length - 1; l++) layers[l].forEach(function (a) { layers[l + 1].forEach(function (b) { connect(a, b); }); });
  layers[2].forEach(function (a) { outputs.forEach(function (o) { connect(a, o); }); });

  var pulseG = el("g", {}, net);
  var nodeG = el("g", { stroke: "#7d7a74", "stroke-width": "1.6" }, net);
  layers.forEach(function (c) { c.forEach(function (n) { n.el = el("circle", { cx: n.x, cy: n.y, r: 7, fill: "#fff" }, nodeG); }); });
  outputs.forEach(function (o) {
    o.el = el("circle", { cx: o.x, cy: o.y, r: 10, fill: "#fff", stroke: INK, "stroke-width": "1.6" }, net);
    o.text = el("text", { x: o.x + 18, y: o.y + 5, "font-size": "17" }, net);
    o.text.textContent = o.label;
  });
  var il = el("text", { x: CX, y: CY + DISK + 30, "font-size": "13", "text-anchor": "middle" }, net);
  il.textContent = "Image";

  function mix(t, to) {
    var c = to === RUST ? [197, 91, 62] : [111, 145, 80];
    return "rgb(" + [0, 1, 2].map(function (i) { return Math.round(255 + (c[i] - 255) * t); }).join(",") + ")";
  }

  function go() { hero.classList.add("ready"); }

  if (reduce) {
    go();
    layers[0][2].el.setAttribute("fill", mix(0.7)); layers[1][1].el.setAttribute("fill", mix(0.7)); layers[2][0].el.setAttribute("fill", mix(0.7));
    outputs[0].el.setAttribute("fill", RUST); outputs[0].text.setAttribute("font-weight", "700");
    return;
  }
  requestAnimationFrame(function () { requestAnimationFrame(go); });

  // ---------- signal flow ----------
  var pulses = [], wave = 0, target = outputs[1], TRAVEL = 560;
  var scanStart = -1, SCAN = 1200;

  function send(e, now, delay) {
    var dot = el("circle", { r: 3.2, fill: e.a === risk ? "#d9a86a" : MOSS, opacity: 0 }, pulseG);
    pulses.push({ e: e, t0: now + (delay || 0), el: dot });
  }
  function shuffle(a) { return a.slice().sort(function () { return Math.random() - 0.5; }); }

  function fire(node, now) {
    node.act = 1;
    if (node.fired === wave) return;
    node.fired = wave;
    if (outputs.indexOf(node) >= 0) return;
    if (node.li === 2) {
      node.out.forEach(function (e) { if (e.b === target) send(e, now); });
      return;
    }
    var outs = shuffle(node.out), k = 2 + (Math.random() < 0.4 ? 1 : 0);
    for (var i = 0; i < Math.min(k, outs.length); i++) send(outs[i], now, i * 60);
  }

  function startWave(now) {
    wave++;
    target = target === outputs[0] ? outputs[1] : outputs[0];
    scanStart = now;
  }
  function endScan(now) {
    shuffle(samples).slice(0, 3).forEach(function (sp, i) {
      shuffle(sp.out).slice(0, 2).forEach(function (e, j) { send(e, now, i * 90 + j * 40); });
    });
  }

  var t0 = null, last = 0, nextWave = 1700;
  function frame(now) {
    if (t0 === null) { t0 = now; last = now; }
    var dt = Math.min(64, now - last); last = now;
    var el2 = now - t0;
    if (el2 > nextWave) { startWave(now); nextWave = el2 + 4300; }

    // scan line sweeps the image; pixels it passes dim briefly, as if being read
    if (scanStart >= 0) {
      var u = (now - scanStart) / SCAN;
      if (u >= 1) {
        scanStart = -1; scan.setAttribute("opacity", 0);
        tiles.forEach(function (t) { t.el.style.opacity = ""; });
        endScan(now);
      } else {
        var sx = CX - DISK + u * DISK * 2;
        scan.setAttribute("x1", sx); scan.setAttribute("x2", sx); scan.setAttribute("opacity", 0.9);
        tiles.forEach(function (t) {
          var dd = t.x - sx;
          t.el.style.opacity = dd > 0 ? 1 : (1 - 0.35 * Math.exp(dd / 40)).toFixed(2);
        });
      }
    }

    for (var i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i], v = (now - p.t0) / TRAVEL;
      if (v < 0) continue;
      if (v >= 1) { p.e.glow = 1; fire(p.e.b, now); pulseG.removeChild(p.el); pulses.splice(i, 1); continue; }
      var ease = v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;
      p.el.setAttribute("cx", p.e.a.x + (p.e.b.x - p.e.a.x) * ease);
      p.el.setAttribute("cy", p.e.a.y + (p.e.b.y - p.e.a.y) * ease);
      p.el.setAttribute("opacity", 1);
      p.e.glow = Math.max(p.e.glow, 0.6);
    }

    var decay = Math.pow(0.5, dt / 420), slow = Math.pow(0.5, dt / 1100);
    layers.forEach(function (c) { c.forEach(function (n) {
      if (n.act > 0.01) { n.act *= decay; n.el.setAttribute("fill", mix(n.act)); }
      else if (n.act) { n.act = 0; n.el.setAttribute("fill", "#fff"); }
    }); });
    outputs.forEach(function (o) {
      if (o.act > 0.02) { o.act *= slow; o.el.setAttribute("fill", mix(o.act, o.hot)); o.text.setAttribute("font-weight", o.act > 0.3 ? "700" : "400"); }
      else if (o.act) { o.act = 0; o.el.setAttribute("fill", "#fff"); o.text.setAttribute("font-weight", "400"); }
    });
    edges.forEach(function (e) {
      if (e.glow > 0.01) {
        e.glow *= decay;
        e.el.setAttribute("stroke", e.a === risk ? "#c9893f" : "rgba(111,145,80," + (0.3 + 0.6 * e.glow).toFixed(2) + ")");
        e.el.setAttribute("stroke-width", (1 + e.glow).toFixed(2));
      } else if (e.glow) {
        e.glow = 0;
        if (e.base) e.el.setAttribute("stroke", e.base); else e.el.removeAttribute("stroke");
        e.el.setAttribute("stroke-width", "1");
      }
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  setTimeout(go, 1500);
})();
