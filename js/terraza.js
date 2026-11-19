/* ==========================================================
   Terraza Cantina: página propia (layout "terraza")
   1. Amanecer con el logo (el de antes, al hacer scroll)
   2. "El Sol que se bebe": lema gigante con un sol que gira detrás
   3. La mesa: las fotos sueltas sobre una mesa terracota; se pueden arrastrar
   4. La paleta en posavasos que se dan la vuelta (clic = copiar el color)
   5. Cinta "Cocina & Bar" que corre
   6. La carta del proyecto (ficha con puntitos, como un menú)
   7. Patrón de soles interactivo a pantalla completa
   ========================================================== */
(function () {
  const PAL = [
    ["Terracota", "#E0421F", "#f3e4c8"],
    ["Teja", "#B5502E", "#f3e4c8"],
    ["Ocre", "#D9963A", "#2a190f"],
    ["Crema", "#F3E4C8", "#2a190f"],
    ["Chocolate", "#2A190F", "#f3e4c8"],
  ];
  const LABELS = ["La entrada", "Posavasos", "Posavasos", "Tote bag", "Gorro"];
  const pad = (n) => String(n).padStart(2, "0");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SUN = `<svg class="tc-bigsun" viewBox="-100 -100 200 200" aria-hidden="true">${Array.from({ length: 24 }, (_, i) =>
    `<line x1="0" y1="-56" x2="0" y2="${i % 2 ? -78 : -96}" transform="rotate(${i * 15})"/>`).join("")}<circle r="44"/></svg>`;

  window.tcPageHTML = function (p) {
    const rise = p.images.find((im) => im.rise);
    const pat = p.images.find((im) => im.pattern);
    const pics = p.images.filter((im) => !im.full);
    const S = rise.sun;
    const [apps, tipos] = p.details;
    // posiciones de las fotos sobre la mesa (en % del área), con su giro
    const band = Array.from({ length: 6 }, () => `<span>Cocina &amp; Bar</span><i>☀</i><span>${p.motto}</span><i>☀</i>`).join("");
    return `
    <div class="tc-page">
      <section class="tc-rise" data-k="0" data-rise>
        <div class="tc-rise__stage">
          <canvas class="tc-rise__sky" aria-hidden="true"></canvas>
          <div class="tc-rise__logo" role="img" aria-label="${p.name}">
            <div class="tc-sun">
              <div class="tc-sun__clip">
                <img data-sun="rays" src="${S.rays}" alt="">
                <img data-sun="ring" src="${S.ring}" alt="">
                <div data-sun="glass" class="tc-sun__glass"><span class="tc-sun__fill" style="-webkit-mask-image:url(${S.glassfill});mask-image:url(${S.glassfill})"></span><img src="${S.glass}" alt=""></div>
              </div>
              <img class="tc-sun__base" src="${S.base}" alt="">
            </div>
            <img class="tc-sun__word" data-sun="word" src="${S.word}" alt="">
          </div>
          <p class="tc-pattern__hint tc-rise__hint">Desliza ↓</p>
        </div>
      </section>

      <section class="tc-motto" data-tc-motto>
        ${SUN}
        <p class="tc-kicker">${p.type} · ${p.role} · ${p.place}</p>
        <h2 class="tc-motto__title" id="case-title"><span>El Sol</span><span>que se</span><span>bebe</span></h2>
        <div class="tc-motto__cols">
          <p class="tc-motto__lead">${p.summary}</p>
          <p class="tc-motto__text">${p.text}</p>
        </div>
      </section>

      <section class="tc-gal" data-tc-table aria-label="Fotos de ${p.name}">
        <div class="tc-gal__head"><p class="tc-kicker">Aplicaciones</p><p class="tc-gal__hint">Clic en una foto para verla a pantalla completa</p></div>
        ${(() => {
          // las verticales van de dos en dos; las horizontales, solas a todo el ancho
          const fig = (im) => { const i = pics.indexOf(im); return `<figure class="tc-shot${im.h > im.w ? " is-tall" : ""}" data-tc-photo style="--ar:${(im.w / im.h).toFixed(4)}">
            <img src="${im.src}" alt="${p.name}: ${LABELS[i] || "foto"}" loading="lazy" decoding="async">
            <figcaption><span>${pad(i + 1)}</span>${LABELS[i] || ""}</figcaption>
          </figure>`; };
          const tall = pics.filter((im) => im.h > im.w), wide = pics.filter((im) => im.h <= im.w);
          let out = "";
          for (let i = 0; i < tall.length; i += 2) out += `<div class="tc-gal__pair">${tall.slice(i, i + 2).map(fig).join("")}</div>`;
          return out + wide.map(fig).join("");
        })()}
      </section>

      <section class="tc-pal" aria-label="Paleta de ${p.name}">
        <div class="tc-pal__head"><p class="tc-kicker">La paleta</p></div>
        <div class="tc-pal__row">
          ${PAL.map(([n, h, ink], i) => `
            <button type="button" class="tc-coaster" style="--c:${h};--t:${ink};--i:${i}" data-hex="${h}" aria-label="${n} ${h}">
              <span class="tc-coaster__in">
                <span class="tc-coaster__f">${SUN}<b>${n}</b></span>
                <span class="tc-coaster__b"><b>${h}</b><small>Copiar</small></span>
              </span>
            </button>`).join("")}
        </div>
      </section>


      <section class="tc-menu">
        <div class="tc-menu__card">
          <p class="tc-menu__brand">${p.name}</p>
          <h3 class="tc-menu__title">Carta del proyecto</h3>
          <p class="tc-menu__sec">${apps[0]}</p>
          <ul>${apps[1].map((x, i) => `<li><span>${x}</span><i></i><span>${pad(i + 1)}</span></li>`).join("")}</ul>
          <p class="tc-menu__sec">${tipos[0]}</p>
          <ul>${tipos[1].map((x) => { const [a, b] = x.split(" — "); return `<li><span>${a}</span><i></i><span>${b || ""}</span></li>`; }).join("")}</ul>
          <p class="tc-menu__foot">${p.place} · Cocina &amp; Bar</p>
        </div>
      </section>

      ${pat ? `
      <section class="case__block--pattern tc-patsec" data-k="9">
        <canvas class="tc-pattern" data-pattern="${pat.pattern}" aria-label="${pat.label || "Patrón"} de ${p.name}, interactivo"></canvas>
        <p class="tc-pattern__label">${pat.label || "Patrón"}</p>
        <p class="tc-pattern__hint">Mueve el ratón por encima</p>
      </section>` : ""}
    </div>`;
  };

  window.tcPageBind = function (root, scroller) {
    const stops = [];
    const watch = (el, start, stop) => {
      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { root: scroller });
      io.observe(el); stops.push(() => { io.disconnect(); stop(); });
    };
    // 1. amanecer
    const riseSec = root.querySelector("[data-rise]");
    if (riseSec && window.tcSunrise) { const r = window.tcSunrise(riseSec, scroller); watch(riseSec, r.start, r.stop); }
    // 7. patrón
    const pc = root.querySelector("[data-pattern]");
    if (pc && window.tcPattern) { const t = window.tcPattern(pc, pc.dataset.pattern); watch(pc, t.start, t.stop); }

    // 3. fotos grandes: aparecen al llegar y se abren a pantalla completa con un clic
    const table = root.querySelector("[data-tc-table]");
    const photos = [...root.querySelectorAll("[data-tc-photo]")];
    photos.forEach((ph, i) => ph.addEventListener("click", () => openLb(i)));
    const shotIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); shotIO.unobserve(e.target); } }), { root: scroller, threshold: .12 });
    photos.forEach((ph) => shotIO.observe(ph));
    stops.push(() => shotIO.disconnect());
    // foto en grande (con flechas y Esc)
    const lb = document.createElement("div");
    lb.className = "tc-lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-label", "Foto en grande");
    lb.innerHTML = `<img alt=""><p></p><button type="button" data-lb-close aria-label="Cerrar">✕</button><button type="button" data-lb-prev aria-label="Anterior">←</button><button type="button" data-lb-next aria-label="Siguiente">→</button>`;
    document.body.appendChild(lb);
    const lbImg = lb.querySelector("img"), lbCap = lb.querySelector("p");
    let lbI = 0;
    function showLb(i) {
      lbI = (i + photos.length) % photos.length;
      const im = photos[lbI].querySelector("img");
      lbImg.src = im.src; lbImg.alt = im.alt;
      lbCap.textContent = photos[lbI].querySelector("figcaption").textContent + "  ·  " + pad(lbI + 1) + " / " + pad(photos.length);
    }
    function openLb(i) { showLb(i); lb.classList.add("is-open"); }
    const closeLb = () => lb.classList.remove("is-open");
    lb.addEventListener("click", (e) => { if (e.target === lb || e.target.closest("[data-lb-close]")) closeLb(); });
    lb.querySelector("[data-lb-prev]").addEventListener("click", () => showLb(lbI - 1));
    lb.querySelector("[data-lb-next]").addEventListener("click", () => showLb(lbI + 1));
    const onKey = (e) => {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLb(); else if (e.key === "ArrowRight") showLb(lbI + 1); else if (e.key === "ArrowLeft") showLb(lbI - 1);
    };
    document.addEventListener("keydown", onKey);
    stops.push(() => { document.removeEventListener("keydown", onKey); lb.remove(); });

    // las fotos caen sobre la mesa al llegar
    if (table) {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { table.classList.add("is-in"); io.disconnect(); } }, { root: scroller, threshold: .25 });
      io.observe(table); stops.push(() => io.disconnect());
    }

    // 4. posavasos: se dan la vuelta y copian el color
    root.querySelectorAll(".tc-coaster").forEach((c) => c.addEventListener("click", () => {
      c.classList.toggle("is-flip");
      if (c.classList.contains("is-flip") && navigator.clipboard) navigator.clipboard.writeText(c.dataset.hex).then(() => {
        const s = c.querySelector("small"); s.textContent = "Copiado"; setTimeout(() => (s.textContent = "Copiar"), 1200);
      }).catch(() => {});
    }));

    // 2 y 5: lema y cinta con el scroll
    const motto = root.querySelector("[data-tc-motto]");
    const words = motto ? [...motto.querySelectorAll(".tc-motto__title span")] : [];
    const bigsun = motto ? motto.querySelector(".tc-bigsun") : null;
    const band = root.querySelector("[data-tc-band]");
    let raf = 0, run = true, last = scroller.scrollTop, vel = 0, bx = 0, rot = 0;
    const tick = () => {
      if (!run) return;
      raf = requestAnimationFrame(tick);
      const vh = window.innerHeight, top = scroller.scrollTop;
      vel += ((top - last) - vel) * .2; last = top;
      if (motto) {
        const r = motto.getBoundingClientRect();
        const k = Math.max(0, Math.min(1, 1 - (r.top + vh * .1) / vh));
        words.forEach((w, i) => {
          const e = Math.max(0, Math.min(1, k * 1.7 - i * .22));
          w.style.transform = `translateY(${((1 - e) * 60).toFixed(1)}%) rotate(${((1 - e) * (i % 2 ? 6 : -6)).toFixed(2)}deg)`;
          w.style.opacity = e.toFixed(3);
        });
        rot += reduce ? 0 : .08 + Math.abs(vel) * .05;
        if (bigsun) bigsun.style.transform = `translate(-50%, -50%) rotate(${rot.toFixed(2)}deg) scale(${(.7 + k * .5).toFixed(3)})`;
      }
      if (band && !reduce) {
        bx -= .7 + Math.min(16, Math.abs(vel) * .4);
        const half = band.scrollWidth / 2;
        if (half && -bx > half) bx += half;
        band.style.transform = `translate3d(${bx.toFixed(1)}px,0,0)`;
      }
    };
    raf = requestAnimationFrame(tick);
    stops.push(() => { run = false; cancelAnimationFrame(raf); });
    scroller.scrollTop = 0;
    return () => stops.forEach((f) => f());
  };
})();
