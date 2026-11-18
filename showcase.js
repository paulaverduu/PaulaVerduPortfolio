/* ==========================================================
   Página de producto (ref. agrumeafarm.it — Mennulata)
   Para proyectos con "layout": "showcase" (Virrika).
   · Nombre gigante detrás y la botella delante, que gira de
     verdad (80 fotos del 360°) y se inclina al hacer scroll.
   · Texto centrado con rombos, como la ficha del bote.
   · Carrusel de fotos con la central grande y las de los lados asomando.
   · Las otras piezas en tarjetas.
   window.showcaseHTML(p) devuelve el HTML; window.showcaseBind(root, scroller, p)
   le da vida y devuelve una función para pararlo.
   ========================================================== */
(function () {
  const pad = (n) => String(n).padStart(2, "0");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.showcaseHTML = function (p) {
    const s = p.spin;
    const [k1, k2] = p.details;
    const pics = p.images.filter((im) => !/360|anuncio/.test(im.src));
    const ad = p.images.find((im) => /anuncio/.test(im.src));
    return `
    <div class="sc" style="--sc-bg:${p.bg || "#fbeedd"};--sc-ink:${p.color}">
      <section class="sc-hero" data-sc-hero>
        <div class="sc-hero__stage">
          <h2 class="sc-hero__title" id="case-title"><span>${p.name}</span></h2>
          <div class="sc-bottle" data-sc-bottle>
            <img src="${s.list[0]}" width="${s.w}" height="${s.h}" alt="Botella de ${p.name} girando">
            <span class="sc-bottle__shadow"></span>
          </div>
          <p class="sc-hero__side sc-hero__side--l">${p.type}<br>${p.role}</p>
          <p class="sc-hero__side sc-hero__side--r">Hecha en el<br>${p.place}</p>
          <p class="sc-hero__hint">Desliza para girarla ↓</p>
        </div>
      </section>

      <section class="sc-info">
        <span class="sc-dia" aria-hidden="true"></span>
        <p class="sc-info__lead">${p.motto}. ${p.summary}</p>
        <p class="sc-info__text">${p.text
          .replace("cerveza rubia con toques tostados", "<b>cerveza rubia con toques tostados</b>")
          .replace("dos tercios de ilustración", "<b>dos tercios de ilustración</b>")
          .replace("un tercio de marca", "<b>un tercio de marca</b>")}</p>
        <span class="sc-dia" aria-hidden="true"></span>
        <div class="sc-specs">
          <div><p class="sc-specs__k">${k1[0]}</p>${k1[1].map((x) => `<span>${x}</span>`).join("")}</div>
          <div><p class="sc-specs__k">${k2[0]}</p>${k2[1].map((x) => `<span>${x}</span>`).join("")}</div>
        </div>
        <ul class="sc-sizes" aria-label="Formato"><li>330 ml</li><li>5,2 % vol.</li><li>Caja de 6</li></ul>
      </section>

      ${ad ? `
      <section class="sc-ad" aria-label="Anuncio de ${p.name}">
        <div class="sc-ad__text">
          <p class="sc-specs__k">El anuncio</p>
          <h3 class="sc-ad__title">${p.motto}</h3>
          <p class="sc-ad__p">Animación vertical para redes: la botella, la cerveza cayendo en el vaso y el cierre con la marca.</p>
        </div>
        <figure class="sc-ad__phone"><img src="${ad.src}" width="${ad.w}" height="${ad.h}" alt="Anuncio animado de ${p.name}"></figure>
      </section>` : ""}

      <section class="sc-slider" data-sc-slider aria-label="Fotos de ${p.name}">
        <div class="sc-slider__track" data-sc-track>
          ${pics.map((im, i) => `<figure class="sc-slide" data-i="${i}" style="--ar:${(im.w / im.h).toFixed(4)}"><img src="${im.src}" width="${im.w}" height="${im.h}" alt="${p.name}, foto ${i + 1}" decoding="async"></figure>`).join("")}
        </div>
        <div class="sc-slider__nav">
          <button type="button" data-sc-prev aria-label="Foto anterior">←</button>
          <span data-sc-count>01 / ${pad(pics.length)}</span>
          <button type="button" data-sc-next aria-label="Foto siguiente">→</button>
        </div>
      </section>

      <section class="sc-big" aria-hidden="true"><span>${p.motto}</span></section>
    </div>`;
  };

  window.showcaseBind = function (root, scroller, p) {
    const s = p.spin;
    const hero = root.querySelector("[data-sc-hero]");
    const bottle = root.querySelector("[data-sc-bottle]");
    const img = bottle.querySelector("img");
    const title = root.querySelector(".sc-hero__title span");

    // precarga de los 80 fotogramas
    const frames = s.list.map((src) => { const im = new Image(); im.decoding = "async"; im.src = src; return im; });
    s.frames = frames.length;
    let shown = -1;
    const setFrame = (f) => {
      f = ((Math.round(f) % s.frames) + s.frames) % s.frames;
      if (f === shown || !frames[f].complete) return;
      img.src = frames[f].src; shown = f;
    };

    // ratón: la botella se inclina hacia él
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    const onMove = (e) => { tmx = e.clientX / window.innerWidth - .5; tmy = e.clientY / window.innerHeight - .5; };
    window.addEventListener("pointermove", onMove, { passive: true });

    let run = true, idle = 0, last = performance.now(), lastTop = -1, sp = 0;
    function tick(now) {
      if (!run) return;
      requestAnimationFrame(tick);
      const dt = Math.min(50, now - last); last = now;
      const r = hero.getBoundingClientRect();
      const vh = window.innerHeight;
      const prog = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));   // 0→1 dentro del hero
      if (r.top !== lastTop) { lastTop = r.top; } else if (!reduce) idle += dt * .012;   // quieta: gira sola despacio
      sp += (prog - sp) * .14;
      mx += (tmx - mx) * .06; my += (tmy - my) * .06;

      // giro: 1,5 vueltas a lo largo del hero + el giro lento cuando no haces scroll
      setFrame(sp * s.frames * 1.5 + idle);
      // entra desde abajo, sube, se inclina y se queda delante del nombre
      const y = (1 - Math.min(1, sp * 2.2)) * 30 - Math.max(0, sp - .75) * 12;     // vh
      const rot = -14 + sp * 26 + mx * 10;
      const sc = .92 + Math.min(1, sp * 2) * .12;
      const fl = reduce ? 0 : Math.sin(now / 900) * .8;
      bottle.style.transform = `translate3d(${(mx * 24).toFixed(1)}px, calc(${y.toFixed(2)}vh + ${(fl + my * 14).toFixed(1)}px), 0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      title.style.transform = `translateY(${(-sp * 8).toFixed(2)}vh) scale(${(1 - sp * .06).toFixed(3)})`;
    }
    requestAnimationFrame(tick);

    // carrusel
    const track = root.querySelector("[data-sc-track]");
    const slides = [...track.children];
    const count = root.querySelector("[data-sc-count]");
    let cur = 0;
    // fila de fotos, cada una con su forma; la actual se centra
    // cada foto cabe entera: alto máximo 70% de la pantalla y ancho máximo 80%
    const fit = () => {
      const maxH = Math.min(window.innerHeight * (window.innerWidth < 760 ? .52 : .7), 640);
      const maxW = window.innerWidth * (window.innerWidth < 760 ? .86 : .8);
      let tallest = 0;
      slides.forEach((el) => {
        const ar = parseFloat(el.style.getPropertyValue("--ar")) || 1;
        let h = maxH, w = h * ar;
        if (w > maxW) { w = maxW; h = w / ar; }
        el.style.width = w + "px"; el.style.height = h + "px";
        tallest = Math.max(tallest, h);
      });
      track.style.height = tallest + "px";
    };
    fit();
    window.addEventListener("resize", fit);
    const go = (i) => {
      cur = (i + slides.length) % slides.length;
      slides.forEach((el, k) => el.classList.toggle("is-cur", k === cur));
      const el = slides[cur];
      const x = el.offsetLeft + el.offsetWidth / 2 - track.parentElement.clientWidth / 2;
      track.style.transform = `translateX(${-x}px)`;
      count.textContent = `${pad(cur + 1)} / ${pad(slides.length)}`;
    };
    window.addEventListener("resize", () => go(cur));
    slides.forEach((el) => el.querySelector("img").addEventListener("load", () => go(cur)));
    root.querySelector("[data-sc-prev]").addEventListener("click", () => go(cur - 1));
    root.querySelector("[data-sc-next]").addEventListener("click", () => go(cur + 1));
    slides.forEach((el, k) => el.addEventListener("click", () => { if (k !== cur) go(k); }));
    // arrastrar para pasar fotos
    let sx = null;
    track.addEventListener("pointerdown", (e) => { sx = e.clientX; });
    window.addEventListener("pointerup", (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1));
    });
    go(0);

    return () => { run = false; window.removeEventListener("pointermove", onMove); };
  };
})();
