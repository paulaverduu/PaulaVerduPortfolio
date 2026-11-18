/* ==========================================================
   Pantalla de carga
   Espera a que estén listas las fuentes, las imágenes del Inicio
   y las texturas de los cubos, y entonces enseña la web entera
   de golpe. La firma de Verdú se va "rellenando" con el progreso.
   window.pageReady se resuelve cuando la pantalla de carga se va.
   ========================================================== */
(function () {
  const root = document.documentElement;
  const el = document.querySelector("[data-loader]");
  const bar = el && el.querySelector("[data-loader-fill]");
  const num = el && el.querySelector("[data-loader-num]");
  let resolveReady;
  window.pageReady = new Promise((r) => (resolveReady = r));
  if (!el) { root.classList.remove("is-loading"); resolveReady(); return; }

  const t0 = performance.now();
  const MIN = 1100;          // tiempo mínimo para que se vea la firma
  const MAX = 9000;          // si algo tarda demasiado, entramos igualmente
  let shown = 0, target = 0, total = 1, loaded = 0, finished = false;

  // pinta el progreso suavemente
  (function paint() {
    shown += (target - shown) * 0.12;
    const p = Math.min(100, Math.round(shown));
    bar.style.setProperty("--p", `${shown.toFixed(2)}%`);
    num.textContent = String(p).padStart(3, "0");
    if (!finished || shown < 99.5) requestAnimationFrame(paint);
  })();

  const tick = () => { loaded++; target = (loaded / total) * 100; };
  const loadImg = (src) => new Promise((res) => {
    const im = new Image();
    im.decoding = "async";
    im.onload = im.onerror = () => {
      (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => { tick(); res(); });
    };
    im.src = src;
  });

  document.addEventListener("DOMContentLoaded", () => {
    // imágenes que se ven nada más entrar + texturas de los cubos
    const srcs = new Set();
    document.querySelectorAll(".hero img, .nav img, .me img, .cubes img").forEach((i) => srcs.add(i.currentSrc || i.src));
    (window.PROJECTS || []).forEach((p) => (p.cubeFaces || []).forEach((f) => {
      try { srcs.add(new URL(f.src, document.baseURI).href); } catch (e) { srcs.add(f.src); }
    }));
    const jobs = [...srcs].map(loadImg);
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready.then(tick) : Promise.resolve(tick());
    total = jobs.length + 1;

    const all = Promise.all([...jobs, fonts]);
    const timeout = new Promise((r) => setTimeout(r, MAX));
    Promise.race([all, timeout]).then(() => {
      target = 100;
      const wait = Math.max(0, MIN - (performance.now() - t0));
      setTimeout(leave, wait + 350);
    });
  });

  function leave() {
    finished = true;
    el.classList.add("is-done");
    root.classList.remove("is-loading");
    resolveReady();
    setTimeout(() => el.remove(), 1100);
  }
})();
