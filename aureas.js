/* Áureas: símbolo interactivo + logotipo debajo.
   - El símbolo gira solo; el scroll le da impulso.
   - Al acercar el ratón los cuatro pétalos se abren y el más cercano crece.
   - Clic: el símbolo da un latigazo de giro, los pétalos salen disparados y
     vuelven con muelle, y una onda de color recorre la pantalla.
   - Cada letra del logotipo se tiñe de un color de la marca al pasar por encima. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const COLORS = ["#009DE0", "#C4007A", "#E8B319", "#5EA443"];

  window.aureasHTML = function (name) {
    const A = window.AUREAS_ART;
    if (!A) return "";
    const petals = A.petals.map((p, i) =>
      `<g class="au-petal" data-i="${i}"><path d="${p.d}" fill="${p.c}"/></g>`).join("");
    const W = A.word.w, H = A.word.h;
    const letters = A.word.letters.map((d, i) =>
      `<path class="au-letter" data-i="${i}" style="--c:${COLORS[i % 4]};--d:${i * 70}ms" fill-rule="evenodd" d="${d}"/>`).join("");
    return `
      <div class="au-hero__stage">
        <span class="au-hero__ripples" aria-hidden="true"></span>
        <svg class="au-hero__sym" viewBox="-200 -200 400 400" role="img" aria-label="Símbolo de ${name}">
          <g class="au-hero__spin">${petals}</g>
        </svg>
        <svg class="au-hero__word" viewBox="-4 -4 ${W + 8} ${H + 8}" role="img" aria-label="${name}">${letters}</svg>
        <p class="au-hero__hint"><span class="au-hint--mouse">Mueve el ratón · haz clic</span><span class="au-hint--touch">Toca el símbolo</span></p>
      </div>`;
  };

  window.aureasHero = function (sec, scroller) {
    const A = window.AUREAS_ART;
    const sym = sec.querySelector(".au-hero__sym");
    const spin = sec.querySelector(".au-hero__spin");
    const gs = [...sec.querySelectorAll(".au-petal")];
    const ripples = sec.querySelector(".au-hero__ripples");
    const letters = [...sec.querySelectorAll(".au-letter")];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const P = gs.map((g, i) => ({ g, dx: A.petals[i].dx, dy: A.petals[i].dy, x: 0, y: 0, vx: 0, vy: 0, s: 1 }));
    let raf = 0, ang = 0, vel = 0, open = 0, openT = 0, hot = -1, mx = 0, my = 0, px = 0, py = 0;
    let lastTop = scroller ? scroller.scrollTop : 0, tick = 0;

    const onMove = (e) => {
      const r = sym.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy, R = r.width * 0.9;
      const d = Math.hypot(dx, dy);
      openT = Math.max(0, 1 - d / R);
      mx = Math.max(-1, Math.min(1, dx / R)); my = Math.max(-1, Math.min(1, dy / R));
      // pétalo más cercano a la dirección del ratón (teniendo en cuenta el giro)
      if (d < R) {
        const a = Math.atan2(dy, dx) - ang * Math.PI / 180;
        let best = -1, bd = 9;
        P.forEach((p, i) => { const pa = Math.atan2(p.dy, p.dx); let k = Math.abs(Math.atan2(Math.sin(a - pa), Math.cos(a - pa))); if (k < bd) { bd = k; best = i; } });
        hot = best;
      } else hot = -1;
    };
    const onLeave = () => { openT = 0; hot = -1; mx = my = 0; };
    let ci = 0;
    const onDown = (e) => {
      if (e.target.closest("a,button")) return;
      vel += 22;
      P.forEach((p) => { p.vx += p.dx * 26; p.vy += p.dy * 26; });
      const r = sec.getBoundingClientRect();
      const s = document.createElement("span");
      s.className = "au-ripple";
      s.style.left = e.clientX - r.left + "px"; s.style.top = e.clientY - r.top + "px";
      s.style.background = COLORS[ci++ % 4];
      ripples.appendChild(s);
      setTimeout(() => s.remove(), 1400);
      sec.classList.remove("is-wave"); void sec.offsetWidth; sec.classList.add("is-wave");
    };
    sec.addEventListener("pointermove", onMove);
    sec.addEventListener("pointerleave", onLeave);
    sec.addEventListener("pointerdown", onDown);
    letters.forEach((l) => l.addEventListener("pointerenter", () => {
      l.classList.remove("is-pop"); void l.getBBox(); l.classList.add("is-pop");
    }));

    const frame = () => {
      raf = requestAnimationFrame(frame);
      tick++;
      if (scroller) { const t = scroller.scrollTop; vel += Math.max(-30, Math.min(30, (t - lastTop) * 0.06)); lastTop = t; }
      vel *= 0.94;
      ang += (reduce ? 0 : 0.18) + vel * 0.25;
      open += (openT - open) * 0.08;
      px += (mx - px) * 0.06; py += (my - py) * 0.06;
      const breathe = reduce ? 0 : Math.sin(tick / 60) * 3;
      spin.setAttribute("transform", `rotate(${ang.toFixed(2)})`);
      sym.style.transform = `translate(${(px * 18).toFixed(1)}px, ${(py * 18).toFixed(1)}px)`;
      P.forEach((p, i) => {
        const spread = 6 + breathe + open * 46;
        const tx = p.dx * spread, ty = p.dy * spread;
        p.vx += (tx - p.x) * 0.09; p.vy += (ty - p.y) * 0.09;
        p.vx *= 0.8; p.vy *= 0.8;
        p.x += p.vx; p.y += p.vy;
        p.s += ((i === hot ? 1.12 : 1) - p.s) * 0.15;
        p.g.setAttribute("transform", `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${p.s.toFixed(3)})`);
      });
    };
    return {
      start() { if (!raf) { lastTop = scroller ? scroller.scrollTop : 0; sec.classList.add("is-in"); raf = requestAnimationFrame(frame); } },
      stop() { cancelAnimationFrame(raf); raf = 0; },
    };
  };
})();

/* ==========================================================
   Página propia de Áureas (layout "aureas")
   1. Símbolo interactivo + logotipo
   2. Manifiesto: Explorar · Conectar · Evolucionar, que entran de lado al hacer scroll
   3. Los cuatro colores como columnas que se abren al pasar (clic = copiar el código)
   4. Aplicaciones en una tira horizontal que avanza con el scroll
   5. Cinta con el lema que corre (más rápido si haces scroll deprisa)
   6. Ficha y fotos horizontales a todo el ancho
   ========================================================== */
(function () {
  const COLORS = [["Verde", "#5EA443"], ["Azul", "#009DE0"], ["Amarillo", "#E8B319"], ["Magenta", "#C4007A"]];
  const pad = (n) => String(n).padStart(2, "0");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.aureasPageHTML = function (p) {
    const A = window.AUREAS_ART;
    const pics = p.images.filter((im) => !im.full);
    const wides = p.images.filter((im) => im.full && im.wide);
    const [piezas, tipo] = p.details;
    const mini = A ? `<svg class="au-mini" viewBox="-152 -152 304 304" aria-hidden="true">${A.petals.map((q) => `<path d="${q.d}" fill="currentColor"/>`).join("")}</svg>` : "✺";
    const band = Array.from({ length: 4 }, () => `<span>${p.motto}</span>${mini}`).join("");
    return `
    <div class="au-page">
      <section class="au-hero" data-aureas>${window.aureasHTML(p.name)}</section>

      <section class="au-mani" data-au-mani>
        <p class="au-kicker">${p.type} · ${p.place}</p>
        <h2 class="au-mani__words" id="case-title">
          <span data-au-word="-1" style="--c:${COLORS[0][1]}">Explorar.</span>
          <span data-au-word="1" style="--c:${COLORS[1][1]}">Conectar.</span>
          <span data-au-word="-1" style="--c:${COLORS[3][1]}">Evolucionar.</span>
        </h2>
        <div class="au-mani__cols">
          <p class="au-mani__lead">${p.summary}</p>
          <p class="au-mani__text">${p.text}</p>
        </div>
      </section>

      <section class="au-colors" aria-label="Colores de ${p.name}">
        ${COLORS.map(([n, h], i) => `
          <button type="button" class="au-col" style="--c:${h};--i:${i}" data-au-hex="${h}">
            <span class="au-col__n">${pad(i + 1)}</span>
            <span class="au-col__name">${n}</span>
            <span class="au-col__hex">${h}</span>
            <span class="au-col__copy">Copiado</span>
          </button>`).join("")}
      </section>

      <section class="au-h" data-au-h style="--n:${pics.length}">
        <div class="au-h__sticky">
          <div class="au-h__head">
            <p class="au-kicker">Aplicaciones</p>
            <p class="au-h__count"><b data-au-count>01</b> / ${pad(pics.length)}</p>
          </div>
          <div class="au-h__track" data-au-track>
            ${pics.map((im, i) => `
              <figure class="au-h__item" style="--ar:${(im.w / im.h).toFixed(4)};--c:${COLORS[i % 4][1]}">
                <img src="${im.src.replace("-tall", "")}" alt="${p.name}: ${im.label || "aplicación"}" loading="lazy" decoding="async">
                <figcaption><span>${pad(i + 1)}</span>${im.label || ""}</figcaption>
              </figure>`).join("")}
          </div>
          <div class="au-h__bar"><i data-au-bar></i></div>
        </div>
      </section>

      <section class="au-band" aria-label="${p.motto}">
        <div class="au-band__track" data-au-band>${band}${band}</div>
      </section>

      <section class="au-ficha">
        <div><p class="au-kicker">${piezas[0]}</p><ul>${piezas[1].map((x) => `<li>${x}</li>`).join("")}</ul></div>
        <div><p class="au-kicker">${tipo[0]}</p><p class="au-ficha__type">${tipo[1][0]}</p><p class="au-ficha__abc">Aa Bb Cc 123</p></div>
        <div><p class="au-kicker">Para</p><p class="au-ficha__big">${p.place}</p><p class="au-mani__text">${p.role}</p></div>
      </section>

      ${wides.map((im) => `
        <figure class="au-wide" data-au-wide><img src="${im.src}" width="${im.w}" height="${im.h}" alt="${p.name}" loading="lazy" decoding="async"></figure>`).join("")}
    </div>`;
  };

  window.aureasPageBind = function (root, scroller) {
    const stops = [];
    // 1. símbolo
    const heroSec = root.querySelector("[data-aureas]");
    if (heroSec && window.aureasHero) {
      const h = window.aureasHero(heroSec, scroller);
      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? h.start() : h.stop()), { root: scroller });
      io.observe(heroSec);
      stops.push(() => { io.disconnect(); h.stop(); });
    }
    // 3. colores: entran escalonados; clic copia el código
    const cols = [...root.querySelectorAll(".au-col")];
    const colIO = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")), { root: scroller, threshold: .3 });
    cols.forEach((c) => {
      colIO.observe(c);
      c.addEventListener("click", () => {
        if (navigator.clipboard) navigator.clipboard.writeText(c.dataset.auHex).catch(() => {});
        c.classList.remove("is-copied"); void c.offsetWidth; c.classList.add("is-copied");
      });
    });
    stops.push(() => colIO.disconnect());

    // 2, 4, 5, 6: todo lo que va con el scroll en un solo bucle
    const words = [...root.querySelectorAll("[data-au-word]")];
    const mani = root.querySelector("[data-au-mani]");
    const hsec = root.querySelector("[data-au-h]");
    const track = root.querySelector("[data-au-track]");
    const bar = root.querySelector("[data-au-bar]");
    const count = root.querySelector("[data-au-count]");
    const items = track ? [...track.children] : [];
    const band = root.querySelector("[data-au-band]");
    const wides = [...root.querySelectorAll("[data-au-wide] img")];
    const horizontal = () => window.innerWidth > 860;
    let raf = 0, last = scroller.scrollTop, vel = 0, bx = 0, run = true;
    const tick = () => {
      if (!run) return;
      raf = requestAnimationFrame(tick);
      const vh = window.innerHeight, top = scroller.scrollTop;
      vel += ((top - last) - vel) * .2; last = top;
      // manifiesto
      if (mani) {
        const r = mani.getBoundingClientRect();
        const k = Math.max(0, Math.min(1, 1 - (r.top + r.height * .25) / vh));
        words.forEach((w, i) => {
          const dir = +w.dataset.auWord, e = Math.max(0, Math.min(1, k * 1.6 - i * .18));
          w.style.transform = `translateX(${((1 - e) * dir * 40).toFixed(2)}vw)`;
          w.style.opacity = (.15 + e * .85).toFixed(3);
        });
      }
      // tira horizontal
      if (hsec && track) {
        if (horizontal()) {
          const r = hsec.getBoundingClientRect();
          const pr = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - vh)));
          const max = Math.max(0, track.scrollWidth - track.parentNode.clientWidth + 48);
          track.style.transform = `translate3d(${(-pr * max).toFixed(1)}px,0,0)`;
          bar.style.transform = `scaleX(${pr.toFixed(4)})`;
          const n = Math.min(items.length, 1 + Math.floor(pr * items.length * .999));
          if (count.textContent !== pad(n)) count.textContent = pad(n);
        } else track.style.transform = "";
      }
      // cinta: corre sola y acelera con el scroll
      if (band && !reduce) {
        bx -= .6 + Math.min(14, Math.abs(vel) * .35);
        const half = band.scrollWidth / 2;
        if (half && -bx > half) bx += half;
        band.style.transform = `translate3d(${bx.toFixed(1)}px,0,0)`;
      }
      // fotos anchas: un poco de zoom al pasar
      wides.forEach((im) => {
        const r = im.parentNode.getBoundingClientRect();
        const k = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
        im.style.transform = `scale(${(1.08 - (1 - Math.abs(k)) * .08).toFixed(3)}) translateY(${(k * 3).toFixed(2)}%)`;
      });
    };
    raf = requestAnimationFrame(tick);
    stops.push(() => { run = false; cancelAnimationFrame(raf); });
    scroller.scrollTop = 0;
    return () => stops.forEach((f) => f());
  };
})();
