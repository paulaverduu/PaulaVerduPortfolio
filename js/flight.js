/* ==========================================================
   Línea de scroll (ref. twohalves.co)
   Una línea de puntos baja por la página serpenteando entre
   las secciones y se dibuja a medida que haces scroll.
   En la punta viaja una estrella: el "trazo" de Paula.
   ========================================================== */

(function () {
  const canvas = document.querySelector("[data-flight]");
  if (!canvas) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d");
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  let W = 0, H = 0, docH = 0, pts = [], lens = [], total = 0;

  // Por qué lado pasa la línea en cada sección (0 = izquierda, 1 = derecha)
  const STOPS = [
    ["#sobre-mi", 0.92],
    ["#cubos", 0.06],
    ["#contacto", 0.55],
  ];

  function build() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    docH = document.documentElement.scrollHeight;

    // Puntos de control en coordenadas de documento
    const ctrl = [{ x: W * 0.78, y: H * 0.55 }];
    STOPS.forEach(([sel, fx], i) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const h = el.offsetHeight;
      ctrl.push({ x: W * fx, y: top + Math.min(h * 0.18, H * 0.4) });
      ctrl.push({ x: W * (i % 2 ? 0.7 : 0.3), y: top + h * 0.85 });
    });
    const last = ctrl[ctrl.length - 1];
    last.y = Math.min(last.y, docH - H * 0.35);

    // Curva suave (Catmull-Rom) muestreada
    pts = [];
    for (let i = 0; i < ctrl.length - 1; i++) {
      const p0 = ctrl[Math.max(i - 1, 0)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(i + 2, ctrl.length - 1)];
      for (let t = 0; t < 1; t += 0.02) {
        const t2 = t * t, t3 = t2 * t;
        pts.push({
          x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        });
      }
    }
    pts.push(last);
    lens = [0]; total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      lens.push(total);
    }
    draw();
  }

  // Punto de la curva en la longitud L
  function at(L) {
    let i = 1;
    while (i < lens.length - 1 && lens[i] < L) i++;
    const a = pts[i - 1], b = pts[i];
    const f = (L - lens[i - 1]) / ((lens[i] - lens[i - 1]) || 1);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, i, ang: Math.atan2(b.y - a.y, b.x - a.x) };
  }

  function star(x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const rr = k % 2 ? r * 0.38 : r;
      const a = (k / 8) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  let shown = 0, target = 0, raf = 0;
  function progress() {
    // La punta de la línea va siempre un poco por debajo del centro de la pantalla
    const front = window.scrollY + H * 0.62;
    let L = 0;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].y >= front) {
        const f = (front - pts[i - 1].y) / ((pts[i].y - pts[i - 1].y) || 1);
        L = lens[i - 1] + (lens[i] - lens[i - 1]) * Math.max(0, Math.min(1, f));
        return L;
      }
    }
    return total;
  }

  function draw() {
    const sy = window.scrollY;
    ctx.clearRect(0, 0, W, H);
    if (!pts.length || shown <= 1) return;
    const tip = at(shown);
    ctx.strokeStyle = "#171512";
    ctx.fillStyle = "#171512";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.setLineDash([0.1, 9]);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < tip.i; i++) {
      const y = pts[i].y - sy;
      if (y < -40 || y > H + 40) { started = false; continue; }
      if (!started) { ctx.moveTo(pts[i].x, y); started = true; } else ctx.lineTo(pts[i].x, y);
    }
    ctx.lineTo(tip.x, tip.y - sy);
    ctx.stroke();
    ctx.setLineDash([]);
    star(tip.x, tip.y - sy, 9, tip.ang + shown * 0.01);
  }

  function tick() {
    shown += (target - shown) * (reduce ? 1 : 0.12);
    draw();
    if (Math.abs(target - shown) > 0.5) raf = requestAnimationFrame(tick);
    else { shown = target; draw(); raf = 0; }
  }
  function onScroll() {
    target = progress();
    if (!raf) raf = requestAnimationFrame(tick);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { build(); onScroll(); }, 150); });
  window.addEventListener("load", () => { build(); onScroll(); });
  build(); onScroll();
})();
