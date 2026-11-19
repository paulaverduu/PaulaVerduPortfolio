/* ==========================================================
   Cursor y navegación (ref. twohalves.co)
   1. La barra se esconde al bajar y vuelve al subir
   2. Cursor: bola metálica + aro que la sigue con retraso.
      Crece sobre enlaces y muestra un texto sobre proyectos.
   3. Rastro: gotas de sombra al moverse y ondas al pararse
   ========================================================== */

(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- 1. Barra que se esconde ---------- */
  const nav = document.querySelector("[data-nav]");
  if (nav) {
    let lastY = window.scrollY;
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 6) return;
      const menuOpen = document.querySelector("[data-menu-toggle]")?.getAttribute("aria-expanded") === "true";
      nav.dataset.hide = y > lastY && y > 120 && !menuOpen ? "1" : "0";
      lastY = y;
    }, { passive: true });
  }

  if (!fine) return;

  /* ---------- 2. Cursor ---------- */
  const cur = document.querySelector("[data-cur]");
  const ring = document.querySelector("[data-cur-ring]");
  const dot = document.querySelector("[data-cur-dot]");
  const label = document.querySelector("[data-cur-label]");
  if (!cur) return;
  document.documentElement.classList.add("cur-on");

  let mx = -100, my = -100, rx = -100, ry = -100, dx = -100, dy = -100;
  let moving = false, tilt = -18;

  // Qué hay debajo del cursor: 2 = proyecto (con texto), 1 = enlace o botón
  function hotOf(el) {
    if (!el || !el.closest) return [0, ""];
    if (el.closest(".hcard, .cube")) return [2, el.closest(".cube") ? "Abrir" : "Ver"];
    if (el.closest("a, button, [data-obj], .mcard, [role='button']")) return [1, ""];
    return [0, ""];
  }

  window.addEventListener("pointermove", (e) => {
    mx = e.clientX; my = e.clientY;
    if (cur.dataset.on === "0") { rx = dx = mx; ry = dy = my; cur.dataset.on = "1"; }
    const [hot, text] = hotOf(e.target);
    cur.dataset.hot = String(hot);
    if (label.textContent !== text) label.textContent = text;
    trail(e.clientX, e.clientY);
    if (!moving) { moving = true; requestAnimationFrame(follow); }
  }, { passive: true });
  document.addEventListener("pointerdown", () => { cur.dataset.down = "1"; });
  document.addEventListener("pointerup", () => { cur.dataset.down = "0"; });
  // doble clic: la aceituna se machaca contra la pantalla
  const smashLayer = document.createElement("div");
  smashLayer.className = "smash";
  smashLayer.setAttribute("aria-hidden", "true");
  document.body.appendChild(smashLayer);
  const R = (a, b) => a + Math.random() * (b - a);
  // pulpa machacada: mancha irregular y aplastada, con piel rota y el pimiento reventado
  function blob(cx, cy, rx, ry, rough, n = 22) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, k = 1 + R(-rough, rough);
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    let d = "";
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      d += (i ? "Q" : `M${((pts[n - 1][0] + p[0]) / 2).toFixed(1)} ${((pts[n - 1][1] + p[1]) / 2).toFixed(1)}Q`) + `${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
    });
    return d + "Z";
  }
  // Aplastado tipo "tomate estampado": jugo que salpica en chorros desde el centro,
  // con gotas en las puntas, y en medio la piel arrugada con el pimiento asomando.
  function tendril(cx, cy, a, L, w0, w1, bend) {
    const N = 7, L1 = [], L2 = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, ang = a + bend * t * t;
      const x = cx + Math.cos(ang) * L * t, y = cy + Math.sin(ang) * L * t;
      const w = (w0 + (w1 - w0) * Math.pow(t, .7)) / 2 * (1 + R(-.15, .15));
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      L1.push([x + nx * w, y + ny * w]); L2.unshift([x - nx * w, y - ny * w]);
    }
    const end = [cx + Math.cos(a + bend) * L, cy + Math.sin(a + bend) * L];
    const pts = L1.concat(L2);
    return { d: "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z", end };
  }
  function mashSVG() {
    const id = "m" + Math.random().toString(36).slice(2, 7);
    const C = 100;
    let juice = `<path d="${blob(C, C, 50, 46, .2, 30)}"/>`, hi = "", drops = "";
    const n = 6 + Math.floor(R(0, 4));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R(-.35, .35), L = R(i % 3 ? 62 : 78, i % 3 ? 82 : 96);
      const t = tendril(C, C, a, L, R(20, 30), R(5, 9), R(-.25, .25));
      juice += `<path d="${t.d}"/><circle cx="${t.end[0].toFixed(1)}" cy="${t.end[1].toFixed(1)}" r="${R(5, 9).toFixed(1)}"/>`;
      // brillo húmedo a lo largo del chorro
      const h = tendril(C, C, a + .08, L * .85, 4, 1.2, R(-.2, .2));
      hi += `<path d="${h.d}" opacity="${R(.25, .45).toFixed(2)}"/>`;
    }
    for (let i = 0; i < 14; i++) {
      const a = R(0, Math.PI * 2), r = R(70, 99);
      drops += `<circle cx="${(C + Math.cos(a) * r).toFixed(1)}" cy="${(C + Math.sin(a) * r).toFixed(1)}" r="${R(1, 3.2).toFixed(1)}"/>`;
    }
    // piel arrugada: varias láminas solapadas con pliegues oscuros y brillos
    let skin = "";
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + R(-.4, .4), r = R(6, 14);
      skin += `<path d="${blob(C + Math.cos(a) * r, C + Math.sin(a) * r, R(17, 23), R(14, 19), .3, 12)}" fill="url(#${id}s)" stroke="#2f3f08" stroke-width=".8" stroke-opacity=".55"/>`;
      skin += `<path d="M${(C + Math.cos(a) * r - 6).toFixed(1)} ${(C + Math.sin(a) * r - 4).toFixed(1)}q${R(3, 6).toFixed(1)} ${R(-4, -1).toFixed(1)} ${R(9, 12).toFixed(1)} ${R(-1, 2).toFixed(1)}" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".5"/>`;
    }
    const pim = Array.from({ length: 3 }, () => {
      const a = R(0, Math.PI * 2), r = R(2, 16);
      return `<path d="${blob(C + Math.cos(a) * r, C + Math.sin(a) * r, R(6, 10), R(4, 7), .45, 10)}" fill="url(#${id}p)"/>`;
    }).join("");
    return `<svg viewBox="0 0 200 200" width="120" height="120">
      <defs>
        <radialGradient id="${id}s" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#b9c858"/><stop offset=".45" stop-color="#7d9426"/><stop offset="1" stop-color="#43570f"/></radialGradient>
        <radialGradient id="${id}p" cx="40%" cy="35%"><stop offset="0" stop-color="#ff6a45"/><stop offset=".6" stop-color="#d42a1a"/><stop offset="1" stop-color="#8a1410"/></radialGradient>
        <radialGradient id="${id}j" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#b8b54a"/><stop offset=".6" stop-color="#9da23a"/><stop offset="1" stop-color="#7f8b28"/></radialGradient>
      </defs>
      <g class="smash__juice" style="transform-origin:100px 100px">
        <g fill="#6d7a1c" opacity=".55" transform="translate(0 1.4)">${juice}</g>
        <g fill="url(#${id}j)" opacity=".94">${juice}${drops}</g>
        <g fill="#fffbe0">${hi}</g>
      </g>
      <g class="smash__core" style="transform-origin:100px 100px">
        <path d="${blob(C, C + 2, 36, 32, .22, 18)}" fill="#d6cf86"/>
        ${skin}${pim}
      </g>
    </svg>`;
  }
  function smash(x, y) {
    cur.classList.remove("is-back"); cur.classList.add("is-smashed");
    const rot = R(0, 360);
    const m = document.createElement("div");
    m.className = "smash__mash";
    m.style.left = x - 60 + "px"; m.style.top = y - 60 + "px";
    m.style.transform = `rotate(${rot}deg)`;
    m.innerHTML = mashSVG();
    smashLayer.appendChild(m);
    m.querySelector(".smash__juice").animate([
      { transform: "scale(.15)", opacity: .6 }, { transform: "scale(1.06)", opacity: 1, offset: .55 }, { transform: "scale(1)", opacity: 1 },
    ], { duration: 220, easing: "cubic-bezier(.2,.9,.3,1)", fill: "forwards" });
    m.querySelector(".smash__core").animate([
      { transform: "scale(1.35, .5)" }, { transform: "scale(.92, 1.06)", offset: .5 }, { transform: "scale(1)" },
    ], { duration: 260, easing: "ease-out", fill: "forwards" });
    m.animate([{ opacity: 1 }, { opacity: 1, offset: .7 }, { opacity: 0 }], { duration: 1800, fill: "forwards" }).onfinish = () => m.remove();
    // unas pocas gotas que salen volando
    for (let i = 0; i < 10; i++) {
      const s = R(2, 4.5), a = R(0, Math.PI * 2), v = R(90, 200), T = R(.25, .45);
      const el = document.createElement("span");
      el.className = "smash__bit";
      el.style.width = el.style.height = s + "px";
      el.style.background = i < 8 ? "#9aa23a" : "#d8301e";
      smashLayer.appendChild(el);
      const ex = x + Math.cos(a) * v * T, ey = y + Math.sin(a) * v * T;
      el.animate([
        { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: .9 },
        { transform: `translate(${ex.toFixed(1)}px, ${ey.toFixed(1)}px) scale(.8)`, opacity: .9, offset: .7 },
        { transform: `translate(${ex.toFixed(1)}px, ${ey.toFixed(1)}px) scale(.8)`, opacity: 0 },
      ], { duration: T * 1000 + 700, easing: "cubic-bezier(.1,.8,.3,1)", fill: "forwards" }).onfinish = () => el.remove();
    }
    clearTimeout(cur._sq);
    cur._sq = setTimeout(() => { cur.classList.remove("is-smashed"); cur.classList.add("is-back"); }, 1300);
  }
  document.addEventListener("dblclick", (e) => smash(e.clientX, e.clientY));

  function follow() {
    dx = lerp(dx, mx, 0.55);   // la bola va casi pegada
    dy = lerp(dy, my, 0.55);
    rx = lerp(rx, mx, 0.16);   // el aro la sigue con retraso
    ry = lerp(ry, my, 0.16);
    // la aceituna se inclina hacia donde se mueve
    const vx = mx - dx;
    tilt = lerp(tilt, -18 + Math.max(-40, Math.min(40, vx * 2.2)), 0.2);
    dot.style.setProperty("--tilt", tilt.toFixed(1) + "deg");
    dot.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${tilt.toFixed(1)}deg)`;
    ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
    if (Math.abs(rx - mx) + Math.abs(ry - my) > 0.3 || Math.abs(tilt + 18) > 0.3) requestAnimationFrame(follow);
    else moving = false;
  }

  /* ---------- 3. Rastro de sombra y ondas ---------- */
  const canvas = document.querySelector("[data-water]");
  if (!canvas || reduce) return;
  const ctx = canvas.getContext("2d");
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  let W = 0, H = 0;
  function size() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  size();
  window.addEventListener("resize", size);

  const drops = [];     // gotas de sombra que deja al moverse
  const ripples = [];   // ondas que salen al pararse
  let lastDrop = { x: -999, y: -999 }, stillTimer = null, running = false;

  function trail(x, y) {
    const d = Math.hypot(x - lastDrop.x, y - lastDrop.y);
    if (d > 26) {
      drops.push({ x, y, r: 5 + Math.random() * 6, life: 1 });
      lastDrop = { x, y };
      if (drops.length > 60) drops.shift();
    }
    clearTimeout(stillTimer);
    stillTimer = setTimeout(() => {
      ripples.push({ x, y, r: 6, life: 1 });
      setTimeout(() => ripples.push({ x, y, r: 6, life: 1 }), 260);
      start();
    }, 140);
    start();
  }
  function start() { if (!running) { running = true; requestAnimationFrame(draw); } }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // gotas: sombra suave con un brillo, como la bola dejando huella
    for (let i = drops.length - 1; i >= 0; i--) {
      const p = drops[i];
      p.life -= 0.022;
      if (p.life <= 0) { drops.splice(i, 1); continue; }
      const a = p.life;
      const g = ctx.createRadialGradient(p.x, p.y + 2, 0, p.x, p.y + 2, p.r * 2.2);
      g.addColorStop(0, `rgba(0,0,0,${0.28 * a})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y + 2, p.r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.35 * a})`;
      ctx.beginPath(); ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.35, 0, Math.PI * 2); ctx.fill();
    }
    // ondas: anillo oscuro con borde claro, que crece y se apaga
    for (let i = ripples.length - 1; i >= 0; i--) {
      const q = ripples[i];
      q.life -= 0.016;
      q.r += 1.1 + q.r * 0.012;
      if (q.life <= 0) { ripples.splice(i, 1); continue; }
      ctx.lineWidth = 6 * q.life + 1;
      ctx.strokeStyle = `rgba(0,0,0,${0.22 * q.life})`;
      ctx.beginPath(); ctx.arc(q.x, q.y + 1.5, q.r, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = `rgba(255,255,255,${0.35 * q.life})`;
      ctx.beginPath(); ctx.arc(q.x, q.y - 1, q.r - 2, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
    }
    if (drops.length || ripples.length) requestAnimationFrame(draw);
    else { running = false; ctx.clearRect(0, 0, W, H); }
  }
})();
