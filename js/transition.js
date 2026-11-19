/* ==========================================================
   Transición entre pantallas (ref. Extrafazant)
   Un trazo naranja muy grueso dibuja la V del logo hasta tapar la
   pantalla; en el centro aparece la firma, se cambia el contenido
   y el trazo se retira.

   Uso:  window.pageTransition(() => { ...cambiar contenido... });
   ========================================================== */

(function () {
  const wrap = document.querySelector("[data-ptrans]");
  if (!wrap) { window.pageTransition = (fn) => fn(); return; }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const path = wrap.querySelector("[data-ptrans-path]");
  const fill = wrap.querySelector("[data-ptrans-fill]");
  const logo = wrap.querySelector("[data-ptrans-logo]");
  const L = path.getTotalLength();
  path.style.strokeDasharray = `${L} ${L}`;
  path.style.strokeDashoffset = L;

  const ease = "cubic-bezier(.65,0,.35,1)";
  let busy = false;

  window.pageTransition = async function (swap) {
    if (busy) return;
    busy = true;
    wrap.classList.add("is-on");

    if (reduce) {
      await fill.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, fill: "forwards" }).finished;
      swap();
      await fill.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" }).finished;
      wrap.classList.remove("is-on");
      busy = false;
      return;
    }

    // 1. Se dibuja la V
    const draw = path.animate(
      [{ strokeDashoffset: L }, { strokeDashoffset: 0 }],
      { duration: 700, easing: ease, fill: "forwards" }
    );
    fill.animate([{ opacity: 0 }, { opacity: 0, offset: 0.7 }, { opacity: 1 }], { duration: 700, fill: "forwards" });
    await draw.finished;

    // 2. Firma en el centro y cambio de contenido
    logo.animate(
      [{ opacity: 0, transform: "translate(-50%, -50%) scale(.8) rotate(-6deg)" },
       { opacity: 1, transform: "translate(-50%, -50%) scale(1) rotate(0deg)" }],
      { duration: 260, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "forwards" }
    );
    swap();
    await new Promise((r) => setTimeout(r, 380));

    // 3. Se retira: la firma desaparece y el trazo se "desdibuja"
    logo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: "forwards" });
    fill.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" });
    const undraw = path.animate(
      [{ strokeDashoffset: 0 }, { strokeDashoffset: -L }],
      { duration: 700, easing: ease, fill: "forwards" }
    );
    await undraw.finished;

    path.getAnimations().forEach((a) => a.cancel());
    wrap.classList.remove("is-on");
    busy = false;
  };
})();
