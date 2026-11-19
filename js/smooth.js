/* ==========================================================
   Velocidad del scroll
   El scroll es el nativo del navegador (más fluido y fiable).
   Aquí solo se mide su velocidad para la banda de Contacto.
   ========================================================== */

(function () {
  window.scrollVelocity = 0;
  let last = window.scrollY;
  let idle = 0;
  function track() {
    const y = window.scrollY;
    window.scrollVelocity += ((y - last) - window.scrollVelocity) * 0.2;
    last = y;
    // se detiene cuando no hay scroll, y vuelve a arrancar al hacer scroll
    if (Math.abs(window.scrollVelocity) < 0.01 && ++idle > 30) { window.scrollVelocity = 0; running = false; return; }
    if (Math.abs(window.scrollVelocity) >= 0.01) idle = 0;
    requestAnimationFrame(track);
  }
  let running = false;
  window.addEventListener("scroll", () => {
    if (!running) { running = true; idle = 0; requestAnimationFrame(track); }
  }, { passive: true });
})();
