/* ==========================================================
   Paula Verdú Carbonell — Portfolio
   1. Objetos arrastrables del Inicio
   2. Palabra manuscrita que "tiembla"
   3. Navegación: enlace activo + menú móvil
   4. Mes actual en la esquina del Inicio
   ========================================================== */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 1. Objetos arrastrables ---------- */
(function draggableObjects() {
  let topZ = 10;
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  document.querySelectorAll("[data-board]").forEach((board) =>
  board.querySelectorAll("[data-obj]").forEach((el) => {
    let pointerId = null;
    let startX = 0, startY = 0;      // posición del puntero al empezar
    let baseX = 0, baseY = 0;        // desplazamiento acumulado
    let curX = 0, curY = 0;
    let lastX = 0, lastT = 0;        // para inclinar según la velocidad
    let bounds = null;

    const apply = (x, y) => {
      el.style.setProperty("--dx", `${x}px`);
      el.style.setProperty("--dy", `${y}px`);
    };

    // Lo usan las escenas del Inicio para devolver el objeto a su sitio
    el._dragReset = () => {
      baseX = baseY = curX = curY = 0;
      el.classList.add("is-settling");
      apply(0, 0);
    };

    // Límites: el centro del objeto no puede salir del tablero
    const computeBounds = () => {
      const b = board.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2 - curX;
      const cy = r.top + r.height / 2 - curY;
      return {
        minX: b.left + 20 - cx, maxX: b.right - 20 - cx,
        minY: b.top + 60 - cy,  maxY: b.bottom - 20 - cy,
      };
    };

    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      pointerId = e.pointerId;
      el.setPointerCapture(pointerId);
      startX = e.clientX; startY = e.clientY;
      lastX = e.clientX; lastT = performance.now();
      bounds = computeBounds();
      el.style.zIndex = ++topZ;
      el.classList.remove("is-settling");
      el.classList.add("is-dragging");
    });

    el.addEventListener("pointermove", (e) => {
      if (e.pointerId !== pointerId) return;
      curX = clamp(baseX + e.clientX - startX, bounds.minX, bounds.maxX);
      curY = clamp(baseY + e.clientY - startY, bounds.minY, bounds.maxY);
      apply(curX, curY);

      if (!reduceMotion) {
        const now = performance.now();
        const vx = (e.clientX - lastX) / Math.max(now - lastT, 1);
        el.style.setProperty("--tilt", `${clamp(vx * 6, -14, 14)}deg`);
        lastX = e.clientX; lastT = now;
      }
    });

    const release = (e) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      baseX = curX; baseY = curY;
      el.classList.remove("is-dragging");
      el.classList.add("is-settling");
      el.style.setProperty("--tilt", "0deg");
    };
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);

    // Teclado: flechas para mover (Mayús = pasos grandes)
    el.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 40 : 10;
      const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const m = moves[e.key];
      if (!m) return;
      e.preventDefault();
      bounds = computeBounds();
      curX = baseX = clamp(baseX + m[0], bounds.minX, bounds.maxX);
      curY = baseY = clamp(baseY + m[1], bounds.minY, bounds.maxY);
      el.style.zIndex = ++topZ;
      el.classList.add("is-settling");
      apply(curX, curY);
    });
  }));
})();

/* ---------- 2. Tinta que tiembla (boil) ---------- */
(function boilInk() {
  if (reduceMotion) return;
  const words = [...document.querySelectorAll("[data-boil]")];
  if (!words.length) return;
  // Solo tiemblan las palabras que están en pantalla
  const visible = new Set();
  let frame = 0, timer = null;
  const tick = () => {
    frame = (frame % 3) + 1;
    visible.forEach((w) => { w.style.filter = `url(#boil-${frame})`; });
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    if (visible.size && !timer) timer = setInterval(tick, 180);
    if (!visible.size && timer) { clearInterval(timer); timer = null; }
  });
  words.forEach((w) => io.observe(w));
})();

/* ---------- 3. Navegación ---------- */
(function navigation() {
  // Enlace activo según la sección visible
  const links = document.querySelectorAll("[data-link]");
  const sections = [...links]
    .map((l) => document.getElementById(l.dataset.link))
    .filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.toggle("is-active", l.dataset.link === entry.target.id));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => observer.observe(s));

  // Al volver al inicio no hay ninguno activo
  const hero = document.getElementById("inicio");
  if (hero) {
    new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) links.forEach((l) => l.classList.remove("is-active")); },
      { rootMargin: "-45% 0px -50% 0px" }
    ).observe(hero);
  }

  // Menú móvil
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add("is-open"));
    } else {
      menu.classList.remove("is-open");
      setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 600);
    }
  };

  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
})();

/* ---------- 5. Apariciones al hacer scroll ---------- */
(function reveal() {
  const els = document.querySelectorAll("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-in"));
    return;
  }
  // Los textos enmascarados ("up") empiezan fuera de su máscara:
  // se observa su contenedor, que sí está en pantalla.
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      (el.matches("[data-reveal]") ? [el] : el.querySelectorAll("[data-reveal]"))
        .forEach((r) => r.classList.add("is-in"));
      io.unobserve(el);
    });
  }, { rootMargin: "0px 0px -12% 0px" });
  els.forEach((el) => io.observe(el.dataset.reveal === "up" ? el.parentElement : el));
})();

/* ---------- 4. Mes actual ---------- */
(function currentMonth() {
  const el = document.querySelector("[data-month]");
  if (!el) return;
  const txt = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" })
    .format(new Date())
    .replace(" de ", " ");
  el.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
})();
