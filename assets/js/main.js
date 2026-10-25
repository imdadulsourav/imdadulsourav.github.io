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

  // deterministic pseudo-random so the ring looks the same on every visit
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  var C = 300, R = 168;
  var svg = el("svg", { viewBox: "0 0 600 600", role: "img", "aria-label": "A small neural network passing signals between its layers, inside a ring of hexagons" }, null);
  stage.insertBefore(svg, stage.firstChild);

  // floating specks outside the ring
  var specks = el("g", { fill: "#d6ddd9" }, svg);
  var speckList = [];
  for (var s = 0; s < 14; s++) {
    var a = rnd() * Math.PI * 2, d = 262 + rnd() * 34;
    var sp = el("circle", { cx: C + Math.cos(a) * d, cy: C + Math.sin(a) * d, r: 2 + rnd() * 5 }, specks);
    if (s % 4 === 0) sp.setAttribute("fill", "#b9c98f");
    speckList.push({ el: sp, a: a, d: d, ph: rnd() * 6 });
  }

  // ring of hexagons
  var order = ["#9daf7e", "#e0bd7f", "#a3a3a0", "#c55b3e", "#e0bd7f", "#7e9b57", "#9daf7e", "#d9a86a", "#a3a3a0", "#e0bd7f", "#c55b3e"];
  var ring = el("g", { stroke: "#2e251f", "stroke-width": "1.4", "stroke-linejoin": "round" }, svg);
  var N = 22;
  function hexPath(cx, cy, r) {
    var p = [];
    for (var i = 0; i < 6; i++) {
      var t = Math.PI / 180 * (60 * i - 90);
      p.push((cx + r * Math.cos(t)).toFixed(1) + "," + (cy + r * Math.sin(t)).toFixed(1));
    }
    return "M" + p.join("L") + "Z";
  }
  // tiny research glyphs drawn on some tiles
  var glyphs = {
    eye: function (g, x, y) {
      el("path", { d: "M" + (x - 9) + "," + y + " Q" + x + "," + (y - 8) + " " + (x + 9) + "," + y + " Q" + x + "," + (y + 8) + " " + (x - 9) + "," + y + "Z", fill: "#fff", "stroke-width": "1.2" }, g);
      el("circle", { cx: x, cy: y, r: 2.6, fill: "#2e251f", stroke: "none" }, g);
    },
    scan: function (g, x, y) {
      el("rect", { x: x - 7, y: y - 7, width: 14, height: 14, rx: 2, fill: "#fff", "stroke-width": "1.2" }, g);
      el("path", { d: "M" + (x - 7) + "," + y + "H" + (x + 7) + "M" + x + "," + (y - 7) + "V" + (y + 7), "stroke-width": "1" }, g);
    },
    wave: function (g, x, y) {
      el("path", { d: "M" + (x - 10) + "," + y + "h5l2,-6l3,11l3,-8l2,3h5", fill: "none", "stroke-width": "1.4" }, g);
    },
    node: function (g, x, y) {
      el("path", { d: "M" + (x - 6) + "," + (y + 5) + "L" + x + "," + (y - 5) + "L" + (x + 6) + "," + (y + 5), fill: "none", "stroke-width": "1" }, g);
      el("circle", { cx: x, cy: y - 5, r: 2.4, fill: "#fff", "stroke-width": "1" }, g);
      el("circle", { cx: x - 6, cy: y + 5, r: 2.4, fill: "#fff", "stroke-width": "1" }, g);
      el("circle", { cx: x + 6, cy: y + 5, r: 2.4, fill: "#fff", "stroke-width": "1" }, g);
    }
  };
  var glyphAt = { 2: "eye", 6: "scan", 10: "wave", 14: "node", 17: "eye", 20: "scan" };
  for (var h = 0; h < N; h++) {
    var ang = (h / N) * Math.PI * 2 - Math.PI / 2 + (rnd() - 0.5) * 0.06;
    var rr = 214 + (rnd() - 0.5) * 22;
    var size = 20 + rnd() * 6;
    var x = C + Math.cos(ang) * rr, y = C + Math.sin(ang) * rr;
    var g = el("g", { class: "hex" }, ring);
    g.style.transitionDelay = (0.25 + h * 0.05) + "s";
    el("path", { d: hexPath(x, y, size), fill: order[h % order.length] }, g);
    if (glyphAt[h]) glyphs[glyphAt[h]](g, x, y);
  }

  // the mist circle
  el("circle", { cx: C, cy: C, r: R, fill: "#e4ebe8" }, svg);

  // neural network
  var layers = [3, 5, 5, 2];
  var xs = [196, 264, 336, 404];
  var gap = 50;
  var nodes = [];
  layers.forEach(function (n, li) {
    var col = [];
    for (var i = 0; i < n; i++) col.push({ x: xs[li], y: C + (i - (n - 1) / 2) * gap, li: li, act: 0, fired: -1 });
    nodes.push(col);
  });
  var edgeG = el("g", { stroke: "#b8c3be", "stroke-width": "1" }, svg);
  var edges = [];
  for (var l = 0; l < layers.length - 1; l++) {
    nodes[l].forEach(function (a) {
      a.out = [];
      nodes[l + 1].forEach(function (b) {
        var line = el("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y }, edgeG);
        var e = { a: a, b: b, el: line, glow: 0 };
        a.out.push(e); edges.push(e);
      });
    });
  }
  var pulseG = el("g", { fill: "#6f9150" }, svg);
  var nodeG = el("g", { stroke: "#7d7a74", "stroke-width": "1.6" }, svg);
  nodes.forEach(function (col) {
    col.forEach(function (n) { n.el = el("circle", { cx: n.x, cy: n.y, r: n.li === 0 || n.li === 3 ? 8 : 7, fill: "#fff" }, nodeG); });
  });

  function mix(t) { // white -> moss
    var r = Math.round(255 + (111 - 255) * t), gg = Math.round(255 + (145 - 255) * t), b = Math.round(255 + (80 - 255) * t);
    return "rgb(" + r + "," + gg + "," + b + ")";
  }

  var ready = false;
  function start() { if (!ready) { ready = true; hero.classList.add("ready"); } }

  if (reduce) {
    nodes[0][1].el.setAttribute("fill", mix(0.8));
    nodes[2][2].el.setAttribute("fill", mix(0.5));
    start();
    return;
  }

  var pulses = [];
  var wave = 0;
  var TRAVEL = 620;

  function fire(node, now) {
    node.act = 1;
    if (node.fired === wave) return;
    node.fired = wave;
    if (!node.out) return;
    // each neuron passes its signal along two or three of its connections
    var outs = node.out.slice().sort(function () { return Math.random() - 0.5; });
    var k = 2 + (Math.random() < 0.4 ? 1 : 0);
    for (var i = 0; i < Math.min(k, outs.length); i++) {
      var dot = el("circle", { r: 3.2 }, pulseG);
      pulses.push({ e: outs[i], t0: now + i * 70, el: dot });
    }
  }

  function startWave(now) {
    wave++;
    var inputs = nodes[0].slice().sort(function () { return Math.random() - 0.5; });
    var k = Math.random() < 0.5 ? 1 : 2;
    for (var i = 0; i < k; i++) fire(inputs[i], now);
  }

  var last = 0, nextWave = 900, t0 = null;
  function frame(now) {
    if (t0 === null) { t0 = now; last = now; }
    var dt = Math.min(64, now - last); last = now;
    var elapsed = now - t0;

    if (elapsed > 1300) start();
    if (elapsed > nextWave) { startWave(now); nextWave = elapsed + 1500 + Math.random() * 700; }

    for (var i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i];
      var u = (now - p.t0) / TRAVEL;
      if (u < 0) { p.el.setAttribute("opacity", 0); continue; }
      if (u >= 1) {
        p.e.glow = 1;
        fire(p.e.b, now);
        pulseG.removeChild(p.el);
        pulses.splice(i, 1);
        continue;
      }
      var ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      p.el.setAttribute("cx", p.e.a.x + (p.e.b.x - p.e.a.x) * ease);
      p.el.setAttribute("cy", p.e.a.y + (p.e.b.y - p.e.a.y) * ease);
      p.el.setAttribute("opacity", 1);
      p.e.glow = Math.max(p.e.glow, 0.6);
    }

    var decay = Math.pow(0.5, dt / 380);
    nodes.forEach(function (col) {
      col.forEach(function (n) {
        if (n.act > 0.01) { n.act *= decay; n.el.setAttribute("fill", mix(n.act)); }
        else if (n.act !== 0) { n.act = 0; n.el.setAttribute("fill", "#fff"); }
      });
    });
    edges.forEach(function (e) {
      if (e.glow > 0.01) {
        e.glow *= decay;
        e.el.setAttribute("stroke", "rgba(111,145,80," + (0.25 + 0.6 * e.glow).toFixed(2) + ")");
        e.el.setAttribute("stroke-width", (1 + e.glow * 0.8).toFixed(2));
      } else if (e.glow !== 0) {
        e.glow = 0; e.el.removeAttribute("stroke"); e.el.setAttribute("stroke-width", "1");
      }
    });

    var tt = now / 1000;
    speckList.forEach(function (sp) {
      var d = sp.d + Math.sin(tt * 0.6 + sp.ph) * 4;
      var a = sp.a + Math.sin(tt * 0.15 + sp.ph) * 0.02;
      sp.el.setAttribute("cx", (C + Math.cos(a) * d).toFixed(1));
      sp.el.setAttribute("cy", (C + Math.sin(a) * d).toFixed(1));
    });

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // in case the tab starts hidden, don't leave the page blank
  setTimeout(start, 2500);
})();
