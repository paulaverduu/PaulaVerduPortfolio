/* ==========================================================
   Inicio — movimiento de los objetos (ref. Josh Kern)

   Al cargar: cada objeto aparece en su sitio, uno detrás de otro.
   Al hacer scroll: cambios rápidos con rebote entre escenas:
     0 repartidos → 1 montón bajo la frase → 2 tres protagonistas
     → 3 vuelven a repartirse. La frase no se mueve nunca.

   Para mover un objeto en una escena, edita su línea:
   [x %, y %, ancho, giro en grados]
   ========================================================== */

(function () {
  const hero = document.querySelector("[data-hero]");
  if (!hero) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = window.matchMedia("(max-width: 700px)");
  const objs = [...hero.querySelectorAll("[data-obj]")];
  const nameOf = (el) => el.querySelector("img").getAttribute("src").split("/").pop().replace(/\.\w+$/, "");

  const SCENES = {
    1: { // montón apretado debajo de la frase; los grandes salen por los bordes
      "smiths": [-6, 8, 16, -24], "zapatillas": [104, 96, 14.5, 18], "flor": [103, 6, 15, -12],
      "gafas": [50, 70, 13, 32], "lirio": [45, 66, 9.5, -38], "tabaco": [55, 64, 7, 18],
      "martini": [47, 74, 8, -22], "orquidea": [56, 73, 9, 40],
      "colilla-1": [46, 70, 7.1, 72], "colilla-2": [53, 76, 5.8, -28], "colilla-3": [50, 66, 3.5, 12],
      "colilla-4": [43, 72, 7.6, -58], "colilla-5": [57, 69, 4.5, 125], "colilla-6": [51, 71, 9.5, 14],
    },
    2: { // tres protagonistas encima de la frase; el resto fuera de la pantalla
      "smiths": [50, 27, 17, 0], "gafas": [28, 31, 14, -6], "martini": [72, 29, 8.5, 4],
      "lirio": [-12, 92, 11, -30], "tabaco": [8, 112, 7, 60], "flor": [50, 118, 12, 20],
      "zapatillas": [92, 112, 12, -15], "orquidea": [112, 80, 10, 25],
      "colilla-1": [20, -12, 7.1, 20], "colilla-2": [40, -10, 5.8, 150], "colilla-3": [62, -12, 3.5, 40],
      "colilla-4": [86, -10, 7.6, 190], "colilla-5": [-10, 40, 4.5, 90], "colilla-6": [112, 45, 9.5, 100],
    },
  };
  const MOBILE = {
    2: { "smiths": [50, 30, 19, 0], "gafas": [28, 70, 14, -6], "martini": [76, 70, 8.5, 4] },
  };

  const num = (el, v) => parseFloat(el.style.getPropertyValue(v));
  const state = objs.map((el) => {
    const s = { x: num(el, "--x"), y: num(el, "--y"), w: num(el, "--w"), r: num(el, "--r") };
    return { el, name: nameOf(el), base: { ...s }, cur: { ...s }, from: { ...s }, to: { ...s } };
  });

  function targetFor(st, scene) {
    if (scene === 0 || scene === 3) return st.base;
    return (small.matches && MOBILE[scene] && MOBILE[scene][st.name])
      ? arr(MOBILE[scene][st.name])
      : SCENES[scene][st.name] ? arr(SCENES[scene][st.name]) : st.base;
  }
  const arr = (t) => ({ x: t[0], y: t[1], w: t[2], r: t[3] });

  function paint(st) {
    const el = st.el, c = st.cur;
    el.style.setProperty("--x", `${c.x.toFixed(2)}%`);
    el.style.setProperty("--y", `${c.y.toFixed(2)}%`);
    el.style.setProperty("--mx", `${c.x.toFixed(2)}%`);
    el.style.setProperty("--my", `${c.y.toFixed(2)}%`);
    el.style.setProperty("--w", c.w.toFixed(2));
    el.style.setProperty("--r", `${c.r.toFixed(1)}deg`);
  }

  /* ---------- Entrada: aparecen en su sitio, uno a uno ---------- */
  if (!reduce) {
    objs.forEach((el) => { el.style.opacity = "0"; });
    // espera a que se vaya la pantalla de carga
    (window.pageReady || Promise.resolve()).then(() => objs.forEach((el, i) => {
      el.animate(
        [{ opacity: 0, scale: "1.04" }, { opacity: 1, scale: "1" }],
        { duration: 420, delay: 150 + i * 70, easing: "ease-out", fill: "forwards" }
      ).finished.then(() => { el.style.opacity = ""; });
    }));
  }

  /* ---------- Cambio de escena: rápido y con rebote ---------- */
  // easeOutBack: llega, se pasa un poco y vuelve
  const back = (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  let raf = null;
  function goTo(scene) {
    state.forEach((st) => {
      st.from = { ...st.cur };
      st.to = targetFor(st, scene);
      if (st.el._dragReset) st.el._dragReset();
    });
    if (raf) cancelAnimationFrame(raf);
    const DUR = reduce ? 1 : 520;
    const t0 = performance.now();
    const step = (now) => {
      let done = true;
      state.forEach((st, i) => {
        const local = Math.min(Math.max((now - t0 - i * 14) / DUR, 0), 1);
        if (local < 1) done = false;
        const e = back(local);
        for (const k of ["x", "y", "w", "r"]) st.cur[k] = st.from[k] + (st.to[k] - st.from[k]) * e;
        paint(st);
      });
      if (!done) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  /* ---------- Qué escena toca según el scroll ---------- */
  let current = 0;
  function onScroll() {
    const r = hero.getBoundingClientRect();
    const total = hero.offsetHeight - window.innerHeight;
    const p = Math.min(Math.max(-r.top / Math.max(total, 1), 0), 1);
    const scene = p < 0.12 ? 0 : p < 0.42 ? 1 : p < 0.72 ? 2 : 3;
    if (scene !== current) { current = scene; goTo(scene); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
