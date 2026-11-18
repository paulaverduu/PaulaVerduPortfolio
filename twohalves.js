/* ==========================================================
   Secciones tras el Inicio (ref. twohalves.co)
   1. Utilidades: scramble, títulos que se escriben, contacto, reloj
   2. Trabajos: lista + ventana flotante que sigue al cursor
   3. Sobre mí: copiar email
   4. Cubos 3D: arrastrar para girar, clic para abrir
   5. Contacto: botón magnético y marquee ligado al scroll
   ========================================================== */

(function () {
  const projects = window.PROJECTS || [];
  const contact = window.CONTACT || {};
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const pad = (n) => String(n).padStart(2, "0");
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const lerp = (a, b, t) => a + (b - a) * t;

  // Marca si un elemento está en pantalla (para no animar lo que no se ve)
  function watch(el, margin = "120px") {
    const st = { on: false };
    if (!el) return st;
    if (!("IntersectionObserver" in window)) { st.on = true; return st; }
    new IntersectionObserver(([e]) => { st.on = e.isIntersecting; if (st.on && st.wake) st.wake(); }, { rootMargin: margin }).observe(el);
    return st;
  }

  /* ---------- 1. Utilidades ---------- */
  const GLYPHS = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ*#%&/+";
  function scramble(el, text = el.dataset.text || el.textContent, duration = 420) {
    el.dataset.text = text;
    if (reduce) { el.textContent = text; return; }
    cancelAnimationFrame(el._raf);
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const fixed = Math.floor(p * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) out += i < fixed || text[i] === " " ? text[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = out;
      if (p < 1) el._raf = requestAnimationFrame(tick);
    };
    el._raf = requestAnimationFrame(tick);
  }
  window.scrambleText = scramble;
  document.querySelectorAll("[data-scramble-hover]").forEach((a) =>
    a.addEventListener("mouseenter", () => scramble(a, a.dataset.text || a.textContent, 360)));

  // Contacto: un solo sitio para el email y el Instagram (js/projects.js → CONTACT)
  document.querySelectorAll("[data-contact-mail]").forEach((a) => {
    if (contact.email) a.href = `mailto:${contact.email}`;
    else a.removeAttribute("href");
    if (a.hasAttribute("data-contact-text")) a.innerHTML = contact.email || '<span class="todo">[tu email]</span>';
  });
  document.querySelectorAll("[data-contact-ig]").forEach((a) => {
    if (contact.instagram) { a.hidden = false; a.href = `https://instagram.com/${contact.instagram.replace("@", "")}`; a.textContent = contact.instagram; }
  });

  // Reloj en hora de Almería
  const clocks = document.querySelectorAll("[data-clock]");
  const fmt = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
  const tickClock = () => clocks.forEach((c) => { c.textContent = fmt.format(new Date()); });
  tickClock();
  setInterval(tickClock, 15000);

  // Aparición al entrar en pantalla
  function onEnter(els, fn, margin = "0px 0px -15% 0px") {
    if (!("IntersectionObserver" in window) || reduce) { els.forEach(fn); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); }
    }), { rootMargin: margin });
    els.forEach((el) => io.observe(el));
  }

  // Títulos grandes: se escriben letra a letra como a máquina
  function typeIn(el, speed = 45) {
    if (el._typed) return;
    el._typed = true;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const texts = nodes.map((n) => n.textContent);
    nodes.forEach((n) => { n.textContent = ""; });
    el.classList.add("is-typing");
    let ni = 0, ci = 0;
    const step = () => {
      if (ni >= nodes.length) { el.classList.remove("is-typing"); return; }
      ci++;
      nodes[ni].textContent = texts[ni].slice(0, ci);
      if (ci >= texts[ni].length) { ni++; ci = 0; }
      setTimeout(step, speed);
    };
    step();
  }
  onEnter([...document.querySelectorAll("[data-type]")], (el) => typeIn(el, 55));

  /* ---------- 3. Sobre mí: copiar email ---------- */
  const toast = document.querySelector("[data-copy-toast]");
  const say = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("is-on");
    clearTimeout(say.t);
    say.t = setTimeout(() => toast.classList.remove("is-on"), 2200);
  };
  document.querySelectorAll("[data-copy-mail]").forEach((b) => b.addEventListener("click", async () => {
    if (!contact.email) { say("Pronto: aún falta añadir el email"); return; }
    try { await navigator.clipboard.writeText(contact.email); say(`Copiado: ${contact.email}`); }
    catch (e) { say(contact.email); }
  }));

  /* ---------- 4. Cubos 3D ---------- */
  const cubesSec = document.querySelector("[data-cubes]");
  if (cubesSec && projects.length) {
    const stage = cubesSec.querySelector("[data-cubes-stage]");
    if (projects.length <= 4) stage.setAttribute("data-few", "");
    // Cubo hecho de cuadraditos (ref. twohalves.co "Selected work."):
    // cada cara es una cuadrícula de N×N piezas. En reposo se ve la
    // imagen con la rejilla y unas pocas piezas que asoman; al pasar el
    // ratón todas las piezas se separan de la cara.
    const N = 8;
    const FACES = ["front", "back", "right", "left", "top", "bottom"];
    // Cara k del cubo: la que marque el proyecto (cubeFaces) o una de sus imágenes
    function faceOf(p, k) {
      if (p.cubeFaces && p.cubeFaces[k]) return p.cubeFaces[k];
      return { src: p.images[(k + (p.cover || 0)) % p.images.length].src };
    }
    // Las texturas de los cubos son cuadradas y ligeras (assets/cubes/),
    // así cada pieza solo tiene que desplazar el fondo: 8×8 trozos exactos.
    // Cada textura se declara UNA vez en una hoja de estilos (clase .tx-N):
    // así el HTML de los cubos es ligero aunque las imágenes vengan incrustadas.
    const TX = new Map();
    const txSheet = document.createElement("style");
    document.head.appendChild(txSheet);
    const tx = (src) => {
      if (!TX.has(src)) {
        const n = TX.size;
        TX.set(src, `tx-${n}`);
        // ruta absoluta: dentro de una variable CSS, una ruta relativa se resolvería desde css/
        let abs = src;
        try { abs = new URL(src, document.baseURI).href; } catch (e) {}
        txSheet.textContent += `.tx-${n}{--img:url("${abs}")}\n`;
      }
      return TX.get(src);
    };
    // pseudo-aleatorio estable (cada pieza siempre sale igual)
    const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

    // Normales de las caras (front, back, right, left, top, bottom)
    const NORMALS = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, -1, 0], [0, 1, 0]];
    const D2R = Math.PI / 180;
    // ¿La cara k mira hacia nosotros con el giro actual del cubo?
    function facing(rx, ry, k) {
      const [x, y, z] = NORMALS[k];
      const b = ry * D2R, a = rx * D2R;
      const z1 = -x * Math.sin(b) + z * Math.cos(b);            // rotateY
      const z2 = y * Math.sin(a) + z1 * Math.cos(a);            // rotateX
      return z2 > -0.15;
    }
    function tilesHTML(p, rx = 0, ry = 0) {
      return FACES.map((f, k) => {
        const fc = faceOf(p, k);
        // las caras de atrás no se ven: se quedan como cara normal (mucho más ligero)
        if (!facing(rx, ry, k)) return simpleFace(p, f, k);
        let tiles = "";
        for (let v = 0; v < N; v++) for (let u = 0; u < N; u++) {
          const i = k * 100 + v * N + u;
          const du = (u - (N - 1) / 2) / ((N - 1) / 2), dv = (v - (N - 1) / 2) / ((N - 1) / 2);
          tiles += `<span class="tl" style="--u:${u};--v:${v};--du:${du.toFixed(2)};--dv:${dv.toFixed(2)};` +
            `--rd:${rnd(i).toFixed(2)};--rx:${((rnd(i + 7) - .5) * 44).toFixed(0)}deg;--ry:${((rnd(i + 13) - .5) * 44).toFixed(0)}deg;` +
            `--dl:${Math.round(rnd(i + 3) * 160 + Math.hypot(du, dv) * 60)}ms"></span>`;
        }
        return `<span class="cube__face cube__face--${f} tl-face ${tx(fc.src)}">${tiles}</span>`;
      }).join("");
    }

    const simpleHTML = (p) => FACES.map((f, k) => simpleFace(p, f, k)).join("");
    function simpleFace(p, f, k) {
      return `<span class="cube__face cube__face--${f} ${tx(faceOf(p, k).src)}"></span>`;
    }

    const cubes = projects.map((p, i) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "cube";
      el.setAttribute("aria-label", `Abrir ${p.name}`);
      el.innerHTML = `
        <span class="cube__body">${simpleHTML(p)}</span>
        <span class="cube__label th-mono">${pad(i + 1)} · ${p.name}</span>`;
      stage.appendChild(el);
      return {
        el, body: el.querySelector(".cube__body"), slug: p.slug, p, mode: "simple", timer: null,
        angle: (i / projects.length) * Math.PI * 2,
        // los cubos con caras propias empiezan mirando de frente (en 3D)
        rx: p.cubeFaces ? -16 : -18 + i * 7, ry: p.cubeFaces ? -28 : 25 + i * 40, vrx: 0, vry: 0,
        hover: 0, tiltX: 0, tiltY: 0, drag: null,
      };
    });

    // Se desmonta al pasar el ratón (o al tocarlo en móvil)
    // Solo el cubo bajo el ratón se convierte en Rubik (así la página va ligera)
    const setOpen = (c, on) => {
      clearTimeout(c.timer);
      if (on) {
        if (c.mode !== "rubik") { c.body.innerHTML = tilesHTML(c.p, c.rx + c.tiltX, c.ry + c.tiltY); c.mode = "rubik"; void c.body.offsetWidth; }
        requestAnimationFrame(() => c.el.classList.add("is-open"));
      } else {
        c.el.classList.remove("is-open");
        c.timer = setTimeout(() => { c.body.innerHTML = simpleHTML(c.p); c.mode = "simple"; }, 1000);
      }
    };

    // Arrastrar para girar (con inercia), clic sin arrastrar para abrir
    cubes.forEach((c) => {
      c.el.addEventListener("pointerdown", (e) => {
        c.el.setPointerCapture(e.pointerId);
        c.drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: 0, t: performance.now() };
        c.el.classList.add("is-drag");
      });
      c.el.addEventListener("pointermove", (e) => {
        if (fine && !c.drag) {
          const r = c.el.getBoundingClientRect();
          c.tiltX = ((e.clientY - r.top) / r.height - 0.5) * -24;
          c.tiltY = ((e.clientX - r.left) / r.width - 0.5) * 24;
        }
        if (!c.drag) return;
        const dx = e.clientX - c.drag.x, dy = e.clientY - c.drag.y;
        c.drag.x = e.clientX; c.drag.y = e.clientY;
        c.drag.moved += Math.abs(dx) + Math.abs(dy);
        c.ry += dx * 0.6; c.rx -= dy * 0.6;
        c.vry = dx * 0.6; c.vrx = -dy * 0.6;
      });
      const end = () => {
        if (!c.drag) return;
        const wasClick = c.drag.moved < 6 && performance.now() - c.drag.t < 450;
        c.drag = null;
        c.el.classList.remove("is-drag");
        if (wasClick && window.openProject) window.openProject(c.slug);
      };
      c.el.addEventListener("pointerup", end);
      c.el.addEventListener("pointercancel", end);
      c.el.addEventListener("mouseenter", () => { c.hoverOn = true; setOpen(c, true); });
      c.el.addEventListener("mouseleave", () => { c.hoverOn = false; c.tiltX = c.tiltY = 0; setOpen(c, false); });
      if (!fine) {
        c.el.addEventListener("pointerdown", () => setOpen(c, true));
        c.el.addEventListener("pointerup", () => setTimeout(() => setOpen(c, false), 700));
      }
      c.el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); window.openProject && window.openProject(c.slug); } });
    });

    let t = 0;
    const vis = watch(cubesSec);
    // las piezas sueltas solo se animan con la sección a la vista
    new IntersectionObserver(([e]) => cubesSec.classList.toggle("is-vis", e.isIntersecting)).observe(cubesSec);
    let looping = false;
    vis.wake = () => { if (!looping) { looping = true; requestAnimationFrame(frame); } };
    function frame() {
      if (!vis.on) { looping = false; return; }
      requestAnimationFrame(frame);
      const r = cubesSec.getBoundingClientRect();
      const scrollP = clamp(-r.top / Math.max(r.height - window.innerHeight, 1), 0, 1);
      // si hay un cubo desmontado, la órbita se para: la escena queda quieta y fluida
      const anyOpen = cubes.some((c) => c.mode === "rubik");
      t += reduce || anyOpen ? 0 : 0.0016;
      const W = stage.clientWidth, H = stage.clientHeight;
      const small = W < 700;
      const rx = W * (small ? 0.36 : 0.42), ry = H * (small ? 0.34 : 0.3);
      const orbit = t + scrollP * Math.PI * 0.9;      // giro ambiental ligado al scroll

      cubes.forEach((c, i) => {
        const a = c.angle + orbit;
        const x = Math.cos(a) * rx;
        const y = Math.sin(a) * ry;
        const depth = (Math.sin(a) + 1) / 2;          // 0 al fondo, 1 delante
        c.hover = lerp(c.hover, c.hoverOn ? 1 : 0, 0.15);
        const s = (0.62 + depth * 0.48) * (1 + c.hover * 0.12);
        const open = c.mode === "rubik";
        if (!c.drag) {
          c.vrx *= 0.94; c.vry *= 0.94;              // fricción
          // mientras está desmontado no gira solo: así no hay que recolocar sus 200 piezas en cada fotograma
          c.rx += c.vrx; c.ry += c.vry + (reduce || open ? 0 : 0.12 + (window.scrollVelocity || 0) * 0.02);
        }
        const z = String(Math.round(depth * 100));
        if (c._z !== z) c.el.style.zIndex = c._z = z;
        const tr = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(3)})`;
        if (c._tr !== tr) c.el.style.transform = c._tr = tr;
        const body = `rotateX(${(c.rx + c.tiltX).toFixed(1)}deg) rotateY(${(c.ry + c.tiltY).toFixed(1)}deg)`;
        if (c._body !== body) c.body.style.transform = c._body = body;
      });
    }
  }

  /* ---------- 5. Contacto ---------- */
  // Botón magnético
  document.querySelectorAll("[data-magnetic]").forEach((btn) => {
    if (!fine || reduce) return;
    const inner = btn.querySelector(".cta__btn-in") || btn;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const vis = watch(btn, "200px");
    window.addEventListener("pointermove", (e) => {
      if (!vis.on) return;
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      const reach = Math.max(r.width, r.height) * 1.4;
      if (dist < reach) { const k = 1 - dist / reach; tx = dx * 0.45 * k; ty = dy * 0.45 * k; }
      else { tx = 0; ty = 0; }
    }, { passive: true });
    (function loop() {
      requestAnimationFrame(loop);
      if (!vis.on) return;
      cx = lerp(cx, tx, 0.15); cy = lerp(cy, ty, 0.15);
      btn.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`;
      inner.style.transform = `translate(${(cx * 0.4).toFixed(1)}px, ${(cy * 0.4).toFixed(1)}px)`;
    })();
  });

  // Marquee infinito: va más rápido al hacer scroll y cambia de sentido con él
  const track = document.querySelector("[data-marquee-track]");
  if (track && projects.length) {
    const one = projects.map((p) => `<span>${p.name}</span>`).join("");
    track.innerHTML = one + one + one;
    let x = 0, dir = 1;
    const vis = watch(track);
    (function run() {
      requestAnimationFrame(run);
      if (!vis.on) return;
      const v = window.scrollVelocity || 0;
      if (Math.abs(v) > 0.5) dir = v > 0 ? 1 : -1;
      x -= (reduce ? 0 : 0.6 + Math.min(Math.abs(v) * 0.25, 18)) * dir;
      const w = track.scrollWidth / 3;
      if (w > 0) { if (x <= -w) x += w; if (x > 0) x -= w; }
      track.style.transform = `translateX(${x.toFixed(1)}px)`;
    })();
  }
})();
