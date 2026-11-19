/* ==========================================================
   Página de proyecto (ref. Extrafazant)
   Izquierda: el texto avanza en bloques con el scroll.
   Derecha: mitad fija del color del proyecto con una imagen que
   cambia en cada bloque. Al final, "Más proyectos" y contacto.
   Se entra y se sale con la transición de la V (js/transition.js).
   ========================================================== */

(function () {
  const projects = window.PROJECTS || [];
  const view = document.querySelector("[data-case]");
  if (!view || !projects.length) return;

  const pad = (n) => String(n).padStart(2, "0");
  const transition = (fn) => (window.pageTransition ? window.pageTransition(fn) : fn());

  const scroller = view.querySelector("[data-case-scroll]");
  const textBox = view.querySelector("[data-case-text]");
  const media = view.querySelector("[data-case-media]");
  const frameImgs = [...view.querySelectorAll("[data-case-img]")];
  const counter = view.querySelector("[data-case-counter]");
  const more = view.querySelector("[data-case-more]");
  let current = -1;

  // Cambia la dirección (#proyecto-…) si el navegador lo permite.
  // En vistas previas dentro de un marco protegido no se puede: se ignora.
  const setHash = (hash) => {
    try { history.pushState(null, "", hash); } catch (e) { /* vista previa: sin cambio de dirección */ }
  };
  let front = 0;
  let lastFocus = null;
  let io = null;

  // Bloques de texto a partir de los datos del proyecto
  function blocks(p) {
    const list = [
      `<span class="case__type label">${p.type}</span>
       <h2 class="case__title" id="case-title"><span class="ink">${p.name}<svg class="ink__scribble" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true"><path d="M3 13c30-7 62-9 96-6 26 2 50 0 98-5"/></svg></span></h2>
       <p class="case__sub">${p.motto}</p>
       <p class="case__lead">${p.summary}</p>`,
      `<h3 class="case__h">¿Y de qué va?</h3>
       <p class="case__p">${p.text}</p>`,
      ...p.details.map(([k, v]) => `
       <h3 class="case__h">${k}</h3>
       <ul class="case__ul">${v.map((x) => `<li>${x}</li>`).join("")}</ul>`),
    ];
    if (p.place) list.push(`<h3 class="case__h">Dónde</h3><p class="case__p">${p.place}</p>`);
    // un bloque por imagen como mínimo, para recorrerlas todas
    while (list.length < p.images.length) list.push("");
    return list;
  }

  // Alfabeto de la tipografía en Regular y Bold (texto real con la fuente)
  // Cada letra es un elemento: al pasar el ratón crece como una lupa,
  // cambia de grosor (Regular ↔ Bold) y rebota.
  const PAIRS = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("").map((l) => l + l.toLowerCase());
  const letters = () => PAIRS.map((pr) => `<span class="abc__w">${[...pr].map((c) => `<span class="abc__l">${c}</span>`).join("")}</span>`).join(" ");
  const abcHTML = (p) => `
    <div class="abc" data-abc>
      <p class="abc__label">${p.name} Regular</p>
      <p class="abc__set abc__set--r">${letters()}</p>
      <p class="abc__label">${p.name} Bold</p>
      <p class="abc__set abc__set--b">${letters()}</p>
      <div class="abc__try is-open" data-abc-try>
        <div class="abc__try-bar">
          <p class="abc__label abc__label--try">Probador · ${p.name}</p>
          <label class="abc__size">Tamaño <input type="range" min="40" max="260" value="160" data-abc-size></label>
          <span class="abc__weights">
            <button type="button" data-w="400">Regular</button>
            <button type="button" data-w="700">Bold</button>
          </span>
        </div>
        <div class="abc__field is-idle" data-abc-field>
          <div class="abc__input" contenteditable="true" spellcheck="false" autocapitalize="off" role="textbox" aria-label="Escribe para probar la tipografía" data-abc-input>Escribe aquí</div>
        </div>
        <p class="abc__hint">Haz clic en el texto y escribe lo que quieras · o pulsa una letra del alfabeto</p>
      </div>
    </div>`;
  // efecto lupa: las letras cerca del ratón crecen, las lejanas no
  function bindAbc(root) {
    root.querySelectorAll("[data-abc]").forEach((box) => {
      if (box._bound) return; box._bound = true;
      const ls = [...box.querySelectorAll(".abc__l")];
      let raf = 0, mx = -1e4, my = -1e4;
      const paint = () => {
        raf = 0;
        ls.forEach((l) => {
          const r = l.getBoundingClientRect();
          const d = Math.hypot(r.left + r.width / 2 - mx, r.top + r.height / 2 - my);
          const k = Math.max(0, 1 - d / 95);
          l.style.setProperty("--k", k.toFixed(3));
          l.classList.toggle("is-on", k > .62);       // la más cercana cambia de grosor
        });
      };
      box.addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; if (!raf) raf = requestAnimationFrame(paint); });

      // Pulsar una letra abre el probador: escribe una palabra y mira cómo queda
      const tryBox = box.querySelector("[data-abc-try]");
      const input = box.querySelector("[data-abc-input]");
      const setW = (w) => {
        input.style.fontWeight = w;
        tryBox.querySelectorAll("[data-w]").forEach((b) => b.classList.toggle("is-on", b.dataset.w === String(w)));
      };
      // la palabra ocupa media pantalla; si es larga, se encoge para caber
      const sizeEl = box.querySelector("[data-abc-size]");
      const field = box.querySelector("[data-abc-field]");
      const fit = () => {
        input.style.fontSize = (sizeEl ? sizeEl.value : 160) + "px";
        let fs = parseFloat(input.style.fontSize);
        while (input.scrollWidth > input.clientWidth + 2 && fs > 24) { fs *= .92; input.style.fontSize = fs + "px"; }
      };
      const caretEnd = () => {
        const r = document.createRange(); r.selectNodeContents(input); r.collapse(false);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      };
      ls.forEach((l) => l.addEventListener("click", () => {
        const bold = !!l.closest(".abc__set--b") !== l.classList.contains("is-on");
        tryBox.classList.add("is-open"); first = false; field.classList.remove("is-idle");
        input.textContent = l.textContent;
        setW(bold ? 700 : 400);
        fit();
        input.focus({ preventScroll: true }); caretEnd();
        tryBox.scrollIntoView({ behavior: "smooth", block: "center" });
      }));
      setW(400);
      sizeEl && sizeEl.addEventListener("input", fit);
      // la primera vez que entras, se selecciona el texto de ejemplo para escribir encima
      let first = true;
      input.addEventListener("focus", () => {
        field.classList.remove("is-idle");
        if (first) { first = false; const r = document.createRange(); r.selectNodeContents(input); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      });
      input.addEventListener("blur", () => { if (!input.textContent.trim()) { input.textContent = "Escribe aquí"; first = true; } field.classList.add("is-idle"); fit(); });
      requestAnimationFrame(fit);
      tryBox.addEventListener("click", (e) => { if (!e.target.closest("[data-w], [data-abc-size], .abc__size") && document.activeElement !== input) input.focus(); });
      input.addEventListener("input", fit);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); input.blur(); } });
      tryBox.querySelectorAll("[data-w]").forEach((b) => b.addEventListener("click", () => { setW(b.dataset.w); fit(); input.focus(); caretEnd(); }));
      box.addEventListener("pointerleave", () => { mx = my = -1e4; if (!raf) raf = requestAnimationFrame(paint); });
    });
  }
  const frameVid = view.querySelector("[data-case-vid]");
  const frameAbc = view.querySelector("[data-case-abc]");
  // Letra viva (ref. Klim): un solo lienzo que se reutiliza
  const klimCanvas = view.querySelector("[data-case-klim]");
  let klim = null, klimGlyph = "";
  // La letra SIEMPRE se ve: primero la versión CSS (tipografía real) y, solo cuando
  // WebGL demuestra que ha dibujado algo, se cambia a la versión animada con burbujas.
  const klimFb = view.querySelector("[data-klim-fb]");
  function showKlim(glyph, color) {
    if (klimFb) { klimFb.textContent = glyph; klimFb.style.color = color || "#171512"; }
    view.classList.add("is-klim");
    try {
      if (!window.klimLetter) return;
      if (!klim || klimGlyph !== glyph) {
        if (klim) { klim.stop(); }
        view.classList.remove("klim-ok");
        klim = window.klimLetter(klimCanvas, { glyph, color, onReady: () => view.classList.add("klim-ok") });
        klimGlyph = glyph;
      }
      klimCanvas.classList.add("is-front");
      klim.start();
    } catch (e) { console.warn("klim", e); view.classList.remove("klim-ok"); }
  }
  function hideKlim() {
    view.classList.remove("is-klim");
    klimCanvas.classList.remove("is-front");
    if (klim) klim.stop();
  }
  function showImage(p, k) {
    const n = Math.min(k, p.images.length - 1);
    const im = p.images[n];
    if (im.full) return;
    showImage._t = (showImage._t || 0) + 1;      // cualquier cambio anula los anteriores pendientes            // va a pantalla completa: el panel derecho no cambia
    counter.textContent = `${pad(n + 1)} / ${pad(p.images.length)}`;
    view.classList.toggle("is-big", !!im.big);
    // cada diapositiva puede pedir su propio fondo
    view.style.setProperty("--accent", im.bg || p.color || "#f5f1e6");
    if (im.abc) {
      frameVid.classList.remove("is-front"); frameVid.pause();
      frameImgs.forEach((i) => i.classList.remove("is-front"));
      return;
    }
    frameAbc.classList.remove("is-front");
    if (im.klim) {
      showKlim(im.klim, im.color);
      frameVid.classList.remove("is-front");
      frameVid.pause();
      frameImgs.forEach((i) => i.classList.remove("is-front"));
      return;
    }
    hideKlim();
    if (im.video) {
      // vídeo: se reproduce solo, en silencio y en bucle
      if (frameVid.dataset.src !== im.video) {
        frameVid.dataset.src = im.video;
        frameVid.poster = im.src;
        frameVid.src = im.video;
      }
      frameVid.classList.add("is-front");
      frameVid.play().catch(() => {});
      frameImgs.forEach((i) => i.classList.remove("is-front"));
      return;
    }
    frameVid.classList.remove("is-front");
    frameVid.pause();
    // misma foto que ya se ve: no hacer nada (antes parpadeaba al cambiar de texto)
    const cur = frameImgs[front];
    if (cur.classList.contains("is-front") && cur.getAttribute("src") === im.src) return;
    // la foto nueva se descodifica ANTES de mostrarse (si no, se veía un hueco o un tirón)
    const token = showImage._t;
    const next = frameImgs[1 - front];
    const old = frameImgs[front];
    next.style.objectPosition = im.pos || "";
    next.src = im.src;
    const swap = () => {
      if (token !== showImage._t) return;          // ya se pidió otra foto: no la enseñes
      next.classList.add("is-front");
      old.classList.remove("is-front");
      front = 1 - front;
    };
    (next.decode ? next.decode() : Promise.resolve()).then(swap, swap);
  }

  function render(pi) {
    const p = projects[pi];
    current = pi;
    view.style.setProperty("--accent", p.color || "#f5f1e6");

    // Página de producto (Virrika): diseño propio a pantalla completa
    if (view._scStop) { view._scStop(); view._scStop = null; }
    // Páginas con diseño propio: Virrika (showcase) y Áureas
    const LAY = { showcase: [window.showcaseHTML, window.showcaseBind], aureas: [window.aureasPageHTML, window.aureasPageBind], terraza: [window.tcPageHTML, window.tcPageBind] }[p.layout];
    const show = !!(LAY && LAY[0]);
    view.dataset.layout = show ? p.layout : "";
    view.classList.toggle("case--show", !!show);
    view.classList.toggle("case--fill", !!p.fill);
    view.classList.toggle("case--wideframe", !!p.wideFrame);
    if (show) {
      hideKlim();
      frameVid.pause();
      if (io) io.disconnect();
      textBox.innerHTML = LAY[0](p);
    }

    // Cada imagen tiene su bloque de texto; el alfabeto ocupa la pantalla entera
    const texts = blocks(p).filter((t) => t !== "");
    // Cada bloque lleva su imagen (n). Los textos que sobran van ANTES de los
    // patrones finales, con la última foto a la derecha (nada de bloques vacíos).
    const items = [];
    let lastHalf = 0;
    const firstPattern = p.images.findIndex((im) => im.pattern);
    p.images.forEach((im, n) => {
      if (n === firstPattern) while (texts.length) items.push({ html: texts.shift(), n: lastHalf });
      if (im.abc) items.push({ abc: true, n });
      else if (im.full) items.push({ full: true, n });
      else { items.push({ html: texts.shift() || "", n }); lastHalf = n; }
    });
    while (texts.length) items.push({ html: texts.shift(), n: lastHalf });
    if (!show) textBox.innerHTML = items.map((it) => {
      const k = it.n;
      const im = p.images[k];
      if (it.full && im.pattern) return `
        <section class="case__block case__block--full case__block--pattern" data-k="${k}">
          <canvas class="tc-pattern" data-pattern="${im.pattern}" aria-label="${im.label || "Patrón"} de ${p.name}, interactivo"></canvas>
          <p class="tc-pattern__label">${im.label || "Patrón"}</p>
          <p class="tc-pattern__hint">Mueve el ratón por encima</p>
        </section>`;
      if (it.full && im.aureas && window.aureasHTML) return `
        <section class="case__block case__block--full au-hero" data-k="${k}" data-aureas>${window.aureasHTML(p.name)}</section>`;
      if (it.full && im.rise) {
        const S = im.sun;
        return `
        <section class="case__block case__block--full tc-rise" data-k="${k}" data-rise>
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
        </section>`;
      }
      if (it.full) return `
        <section class="case__block case__block--full${im.wide ? " case__block--wide" : ""}" data-k="${k}">
          <img src="${im.src}" width="${im.w}" height="${im.h}" alt="${p.name}" decoding="async">
        </section>`;
      if (it.abc) return `
        <section class="case__block case__block--abc" data-k="${k}">${abcHTML(p)}</section>`;
      return `
        <section class="case__block${k === 0 ? " case__block--intro" : ""}" data-k="${k}">
          <div class="case__block-in">${it.html || ``}</div>
          ${im.klim
            ? `<canvas class="case__inline case__klim-inline" data-klim="${im.klim}" data-color="${im.color || ""}" width="600" height="600" aria-label="Letra ${im.klim} de la tipografía ${p.name}"></canvas>`
            : `<img class="case__inline" style="object-position:${im.pos || "50% 50%"}" src="${im.src}" width="${im.w}" height="${im.h}" alt="${p.name}, imagen ${Math.min(k, p.images.length - 1) + 1}" loading="lazy" decoding="async">`}
        </section>`;
    }).join("");

    // Más proyectos: los tres siguientes
    const others = [1, 2, 3].map((d) => projects[(pi + d) % projects.length]);
    more.innerHTML = `
      <div class="mlist__head">
        <h3 class="mlist__title">Más proyectos</h3>
        <span class="mlist__count">(${String(others.length).padStart(2, "0")})</span>
      </div>
      <ol class="mlist">
        ${others.map((o, i) => {
          const im = o.images[o.cover || 0];
          const src = o.card || im.src;
          return `
          <li><a class="mrow" href="#proyecto-${o.slug}" data-slug="${o.slug}" data-mrow data-img="${src}">
            <span class="mrow__n">${String(i + 1).padStart(2, "0")}</span>
            <img class="mrow__thumb" src="${src}" alt="" loading="lazy">
            <span class="mrow__name">${o.name}</span>
            <span class="mrow__tags">${o.type}</span>
            <span class="mrow__arrow" aria-hidden="true">→</span>
          </a></li>`;
        }).join("")}
      </ol>
      <span class="mlist__peek" data-mpeek aria-hidden="true"><img alt=""></span>
      <div class="case__cta">
        <p class="case__cta-title">¿Hacemos algo <em>juntos</em>?</p>
        <p class="label">Disponible para prácticas de empresa</p>
        ${(window.CONTACT && window.CONTACT.email)
          ? `<a class="case__cta-mail" href="mailto:${window.CONTACT.email}">${window.CONTACT.email}</a>`
          : `<a class="case__cta-mail" href="#contacto" data-case-close-link>Ir a contacto →</a>`}
      </div>`;
    // vista previa que sigue al ratón al pasar por cada proyecto
    {
      const peek = more.querySelector("[data-mpeek]"), pimg = peek.querySelector("img");
      let px = 0, py = 0, tx = 0, ty = 0, praf = 0;
      const move = () => { px += (tx - px) * .18; py += (ty - py) * .18; peek.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`; praf = Math.abs(tx - px) + Math.abs(ty - py) > .5 ? requestAnimationFrame(move) : 0; };
      more.querySelectorAll("[data-mrow]").forEach((r) => {
        r.addEventListener("pointerenter", (e) => { pimg.src = r.dataset.img; const b = more.getBoundingClientRect(); px = tx = e.clientX - b.left; py = ty = e.clientY - b.top; peek.classList.add("is-on"); move(); });
        r.addEventListener("pointermove", (e) => { const b = more.getBoundingClientRect(); tx = e.clientX - b.left; ty = e.clientY - b.top; if (!praf) praf = requestAnimationFrame(move); });
        r.addEventListener("pointerleave", () => peek.classList.remove("is-on"));
      });
    }

    // el logo de arriba pasa a tinta sobre el naranja de "Más proyectos"
    const logoBtn = view.querySelector(".case__logo");
    if (view._moreIO) view._moreIO.disconnect();
    // tinta sobre el naranja; vuelve a naranja sobre el blanco de "¿Hacemos algo juntos?"
    const ctaBox = more.querySelector(".case__cta");
    const seen = new Map();
    view._moreIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target, e.isIntersecting));
      if (logoBtn) logoBtn.classList.toggle("is-ink", !!seen.get(more) && !seen.get(ctaBox));
    }, { root: scroller, rootMargin: "0px 0px -92% 0px" });
    view._moreIO.observe(more);
    if (ctaBox) view._moreIO.observe(ctaBox);

    if (show) {
      view._scStop = LAY[1](textBox, scroller, p);
      scroller.scrollTop = 0;
      return;
    }
    frameImgs.forEach((im) => { im.classList.remove("is-front"); im.removeAttribute("src"); });
    frameVid.classList.remove("is-front");
    const firstHalf = Math.max(0, p.images.findIndex((im) => !im.full));
    showImage(p, firstHalf);

    bindAbc(textBox);
    // amanecer al empezar (Terraza Cantina)
    textBox.querySelectorAll("[data-rise]").forEach((sec) => {
      if (!window.tcSunrise) return;
      const r = window.tcSunrise(sec, scroller);
      new IntersectionObserver(([e]) => (e.isIntersecting ? r.start() : r.stop()), { root: scroller }).observe(sec);
    });
    // símbolo interactivo de Áureas
    textBox.querySelectorAll("[data-aureas]").forEach((sec) => {
      if (!window.aureasHero) return;
      const h = window.aureasHero(sec, scroller);
      new IntersectionObserver(([e]) => (e.isIntersecting ? h.start() : h.stop()), { root: scroller }).observe(sec);
    });
    // patrones interactivos: solo se animan cuando se ven
    textBox.querySelectorAll("[data-pattern]").forEach((c) => {
      if (!window.tcPattern) return;
      const pt = window.tcPattern(c, c.dataset.pattern);
      new IntersectionObserver(([e]) => (e.isIntersecting ? pt.start() : pt.stop()), { root: scroller }).observe(c);
    });

    // la B se queda siempre visible (el alfabeto entra por encima con su degradado)
    if (scroller._fade) { scroller.removeEventListener("scroll", scroller._fade); scroller._fade = null; }
    klimCanvas.style.opacity = "";
    // en móvil la letra viva va dentro del texto: se anima solo cuando se ve
    // (solo se crea si de verdad se ve: en ordenador está oculta y no gasta un contexto WebGL)
    (view._inlineKlims || []).forEach((k) => k.destroy && k.destroy());
    view._inlineKlims = [];
    textBox.querySelectorAll("[data-klim]").forEach((c) => {
      if (!window.klimLetter) return;
      let k = null;
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting && c.offsetParent) {
          if (!k) { k = window.klimLetter(c, { glyph: c.dataset.klim, color: c.dataset.color }); view._inlineKlims.push(k); }
          k.start();
        } else if (k) k.stop();
      }, { root: scroller }).observe(c);
    });

    // La imagen de la derecha cambia según el bloque que está en el centro
    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) showImage(p, +e.target.dataset.k);
      });
    }, { root: scroller, rootMargin: "-45% 0px -45% 0px" });
    textBox.querySelectorAll(".case__block").forEach((b) => io.observe(b));
    scroller.scrollTop = 0;
  }

  // siempre empezar arriba del todo (también en Safari y al venir de "Más proyectos")
  const toTop = () => { scroller.scrollTop = 0; scroller.scrollLeft = 0; };
  try { history.scrollRestoration = "manual"; } catch (e) {}
  function show(pi) {
    render(pi);
    toTop();
    requestAnimationFrame(() => { toTop(); requestAnimationFrame(toTop); });
    setTimeout(toTop, 120);
    setTimeout(toTop, 450);
    view.hidden = false;
    document.documentElement.classList.add("has-case");
    view.focus({ preventScroll: true });
  }
  function hide() {
    if (view._scStop) { view._scStop(); view._scStop = null; }
    frameVid.pause();
    hideKlim();
    view.hidden = true;
    document.documentElement.classList.remove("has-case");
    current = -1;
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  function openCase(pi, push = true) {
    if (view.hidden) lastFocus = document.activeElement;
    if (push) setHash(`#proyecto-${projects[pi].slug}`);
    transition(() => show(pi));
  }
  function closeCase(push = true) {
    if (view.hidden) return;
    if (push) setHash("#cubos");
    transition(hide);
  }

  view.querySelectorAll("[data-case-close]").forEach((b) => b.addEventListener("click", () => closeCase()));
  more.addEventListener("click", (e) => {
    const a = e.target.closest("[data-slug]");
    if (!a) return;
    e.preventDefault();
    openCase(projects.findIndex((p) => p.slug === a.dataset.slug));
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !view.hidden) closeCase(); });

  function route() {
    const m = location.hash.match(/^#proyecto-(.+)$/);
    const pi = m ? projects.findIndex((p) => p.slug === m[1]) : -1;
    if (pi >= 0) { if (pi !== current) openCase(pi, false); }
    else if (!view.hidden) closeCase(false);
  }
  window.addEventListener("popstate", route);
  window.addEventListener("hashchange", route);
  if (/^#proyecto-/.test(location.hash)) {
    const pi = projects.findIndex((p) => `#proyecto-${p.slug}` === location.hash);
    if (pi >= 0) show(pi);       // al cargar directamente un proyecto, sin transición
  }

  // Para abrir un proyecto desde las tarjetas o la nube
  window.openProject = (slug) => {
    const pi = projects.findIndex((p) => p.slug === slug);
    if (pi >= 0) openCase(pi);
  };
})();
