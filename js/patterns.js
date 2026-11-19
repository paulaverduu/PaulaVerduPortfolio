/* ==========================================================
   Patrones interactivos de Terraza Cantina
   "waves": líneas de horizonte que ondulan y se apartan del ratón.
   "suns":  soles de rayos que giran; los cercanos al ratón crecen.
   Uso: window.tcPattern(canvas, "waves" | "suns") → { start, stop }
   ========================================================== */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.tcPattern = function (canvas, kind) {
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, dpr = 1, raf = 0, run = false;
    const m = { x: -9999, y: -9999, tx: -9999, ty: -9999, on: 0 };
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const move = (e) => {
      const r = canvas.getBoundingClientRect();
      m.tx = e.clientX - r.left; m.ty = e.clientY - r.top;
      m.on = m.tx >= 0 && m.ty >= 0 && m.tx <= r.width && m.ty <= r.height ? 1 : 0;
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("resize", size);

    // ruido suave para las líneas
    const n1 = (x, s) => Math.sin(x * 1.7 + s) * .5 + Math.sin(x * 3.1 + s * 1.9) * .3 + Math.sin(x * 6.3 + s * .7) * .2;

    function waves(t) {
      ctx.fillStyle = "#df3f17"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#f9d77c"; ctx.lineWidth = Math.max(3, W / 360); ctx.lineCap = "round"; ctx.lineJoin = "round";
      const L = 13, R = Math.min(W, H) * .28;
      for (let i = 0; i < L; i++) {
        const base = H * (.06 + i * .9 / (L - 1));
        ctx.beginPath();
        for (let x = -10; x <= W + 10; x += 8) {
          const u = x / W;
          let y = base + n1(u * 3, i * 2.3 + t * .35) * H * .025;
          const dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy);
          if (d < R) { const k = (1 - d / R) ** 2; y += Math.tanh(dy / (R * .18)) * k * R * .45; }   // se apartan del ratón, sin picos
          x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    function suns(t) {
      ctx.fillStyle = "#2a1a10"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#e8461d"; ctx.lineCap = "round";
      const cell = Math.max(150, Math.min(W, H) / 3.2);
      const cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / cell) + 1;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const cx = c * cell + (r % 2 ? cell / 2 : 0), cy = r * cell + cell * .25;
        const d = Math.hypot(cx - m.x, cy - m.y);
        const k = Math.max(0, 1 - d / (cell * 1.6));                 // cercanía al ratón
        const rad = cell * (.16 + k * .07);
        const rays = 22, len = cell * (.17 + k * .16);
        const rot = t * (.15 + k * 1.2) * (((r + c) % 2) ? 1 : -1);
        ctx.lineWidth = Math.max(2, cell / 70) * (1 + k * .5);
        ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
        for (let j = 0; j < rays; j++) {
          const a = rot + j / rays * Math.PI * 2;
          const l = len * (j % 2 ? .7 : 1) * (1 + Math.sin(t * 3 + j + c) * .08 * k);
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * (rad + 6), cy + Math.sin(a) * (rad + 6));
          ctx.lineTo(cx + Math.cos(a) * (rad + 6 + l), cy + Math.sin(a) * (rad + 6 + l));
          ctx.stroke();
        }
      }
    }

    const t0 = performance.now();
    function frame(now) {
      if (!run || !canvas.isConnected) { run = false; return; }
      raf = requestAnimationFrame(frame);
      if (canvas.clientWidth !== W || canvas.clientHeight !== H) size();
      const e = m.on ? .14 : .05;
      m.x += ((m.on ? m.tx : -9999) - m.x) * (m.on && m.x < -999 ? 1 : e);
      m.y += ((m.on ? m.ty : -9999) - m.y) * (m.on && m.y < -999 ? 1 : e);
      const t = reduce ? 0 : (now - t0) / 1000;
      kind === "suns" ? suns(t) : waves(t);
    }
    size();
    return {
      start() { if (!run) { run = true; raf = requestAnimationFrame(frame); } },
      stop() { run = false; cancelAnimationFrame(raf); },
    };
  };
})();

/* ==========================================================
   Amanecer de Terraza Cantina con SU logo
   Al hacer scroll el sol del logo sale por detrás de la línea
   del horizonte: primero el círculo, los rayos crecen y giran
   hasta su sitio y al final sale la copa. El fondo pasa de crema
   a naranja y el mar sube por abajo.
   window.tcSunrise(section, scroller)
   ========================================================== */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const back = (t) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  window.tcSunrise = function (sec, scroller) {
    const canvas = sec.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const L = (n) => sec.querySelector(`[data-sun="${n}"]`);
    const rays = L("rays"), ring = L("ring"), glass = L("glass"), base = sec.querySelector(".tc-sun__base"), logo = sec.querySelector(".tc-sun"), word = L("word");
    let W = 0, H = 0, run = false, raf = 0, p = 0, sp = 0, mx = 0, tmx = 0, pmx = -9999, pmy = -9999, tpx = -9999, tpy = -9999;
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const onScroll = () => {
      const r = sec.getBoundingClientRect();
      p = clamp(-r.top / Math.max(1, sec.offsetHeight - window.innerHeight));
    };
    const onMove = (e) => { tmx = e.clientX / window.innerWidth - .5; const r = canvas.getBoundingClientRect(); tpx = e.clientX - r.left; tpy = e.clientY - r.top; };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    const mix = (a, b, k) => Math.round(a + (b - a) * k);
    const C2 = [223, 63, 23];
    // el cielo empieza del color de fondo de la web (crema, o azul con el interruptor)
    const skyStart = () => (document.documentElement.classList.contains("is-night") ? [42, 62, 177] : [245, 241, 230]);

    function draw(t) {
      sp += (p - sp) * .12; mx += (tmx - mx) * .05;
      pmx += (tpx - pmx) * (pmx < -999 ? 1 : .14); pmy += (tpy - pmy) * (pmy < -999 ? 1 : .14);
      // fases del amanecer
      const eLine = ease(clamp((sp - .04) / .22));      // la línea del horizonte se dibuja después
      const eSun = ease(clamp((sp - .12) / .4));        // el círculo sale
      const eRay = ease(clamp((sp - .25) / .4));        // los rayos crecen desde el sol
      const eGlass = back(clamp((sp - .45) / .35));     // la copa sale del sol
      const eBg = clamp((sp - .25) / .5);               // cielo crema → naranja
      const C1 = skyStart();
      const bg = `rgb(${mix(C1[0], C2[0], eBg)},${mix(C1[1], C2[1], eBg)},${mix(C1[2], C2[2], eBg)})`;
      sec.style.setProperty("--sky", bg);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // mar: líneas que suben por debajo del horizonte del logo
      const wr = word.getBoundingClientRect(), crect = canvas.getBoundingClientRect();
      const horizon = wr.bottom - crect.top + 14;     // el mar empieza debajo del nombre
      ctx.strokeStyle = eBg > .5 ? "#f9d77c" : "#df3f17"; ctx.lineCap = "round"; ctx.lineWidth = Math.max(2.5, W / 460);
      // mismas líneas que el patrón "Horizonte": dunas irregulares que se mueven
      // despacio y se apartan del ratón
      const n1 = (x, sd) => Math.sin(x * 1.7 + sd) * .5 + Math.sin(x * 3.1 + sd * 1.9) * .3 + Math.sin(x * 6.3 + sd * .7) * .2;
      const lines = 10, top = horizon + 16 + (1 - ease(clamp((sp - .1) / .7))) * (H - horizon);
      const gap = Math.max(26, H * .07);
      const R = Math.min(W, H) * .22;
      ctx.lineWidth = Math.max(3, W / 360); ctx.lineJoin = "round";
      for (let i = 0; i < lines; i++) {
        const y0 = top + i * gap;
        if (y0 > H + 30) break;
        ctx.beginPath();
        for (let x = -10; x <= W + 10; x += 8) {
          const u = x / W;
          let y = y0 + n1(u * 3, i * 2.3 + t * .35) * gap * .34;
          const dx = x - pmx, dy = y - pmy, dd = Math.hypot(dx, dy);
          if (dd < R) { const k = (1 - dd / R) ** 2; y += Math.tanh(dy / (R * .18)) * k * R * .4; }
          x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // logo: el sol y la copa salen de detrás del horizonte
      ring.style.transform = `translateY(${((1 - eSun) * 62).toFixed(2)}%)`;
      // los rayos salen del borde del sol hacia fuera (sin encogerse: así no pisan el círculo)
      const rw = rays.offsetWidth, rr = rw * (.17 + eRay * .5);
      const m = `radial-gradient(circle at 52.7% 74.7%, #000 ${rr.toFixed(1)}px, transparent ${(rr + 2).toFixed(1)}px)`;
      rays.style.webkitMaskImage = m; rays.style.maskImage = m;
      rays.style.transform = `translateY(${((1 - eSun) * 62).toFixed(2)}%) rotate(${((1 - eRay) * -8 + mx * 3).toFixed(2)}deg)`;
      rays.style.opacity = eRay > 0 ? "1" : "0";
      base.style.transform = `scaleX(${eLine.toFixed(3)})`;
      glass.style.transform = `translateY(${((1 - eGlass) * 105).toFixed(2)}%) rotate(${(mx * -4).toFixed(2)}deg)`;
      // el nombre también se mueve: sube, se abre un poco y se balancea con el ratón
      const eWord = ease(clamp(sp / .8));
      word.style.transform = `translate(${(mx * -14).toFixed(1)}px, ${((1 - eWord) * 5).toFixed(2)}vh) scale(${(1.08 - eWord * .08).toFixed(3)}) rotate(${(Math.sin(t * .6) * .4 * (1 - eWord * .5)).toFixed(2)}deg)`;
      word.style.letterSpacing = "";
      sec.classList.toggle("is-sunset", eBg > .5);
    }
    const t0 = performance.now();
    function frame(now) {
      if (!run || !canvas.isConnected) { run = false; return; }
      raf = requestAnimationFrame(frame);
      if (canvas.clientWidth !== W || canvas.clientHeight !== H) size();
      draw(reduce ? 0 : (now - t0) / 1000);
    }
    size(); onScroll();
    return {
      start() { if (!run) { run = true; raf = requestAnimationFrame(frame); } },
      stop() { run = false; cancelAnimationFrame(raf); },
    };
  };
})();
