/* ==========================================================
   Letra viva (ref. klim.co.nz/collections/soehne)
   Una letra enorme de la tipografía La Bella, en blanco y negro
   puro, que gira despacio en 3D mientras una luz la recorre y
   unas burbujas/manchas la van comiendo y devolviendo.
   Se dibuja con WebGL (sin librerías) y solo se anima cuando
   está a la vista.

   Uso: window.klimLetter(canvas, { glyph: "B" })
   ========================================================== */
(function () {
  const VERT = `
    attribute vec2 a; varying vec2 v;
    void main(){ v = a * .5 + .5; gl_Position = vec4(a, 0., 1.); }`;

  const FRAG = `
    precision highp float;
    varying vec2 v;
    uniform sampler2D uL;      // letra nítida
    uniform sampler2D uB;      // letra desenfocada (relieve)
    uniform float t;
    uniform vec2 res;
    uniform vec3 col;
    uniform vec3 mo;           // ratón: posición (x, y) y fuerza

    float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p + n)); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
      return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
    }
    float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a * noise(p); p *= 2.03; a *= .5; } return s; }
    // burbujas: distancia al centro de la celda más cercana y su radio
    vec3 bubbles(vec2 p){
      vec2 i = floor(p), f = fract(p); float best = 9.; float r = 0.; float id = 0.;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
        vec2 g = vec2(x, y); vec2 o = h22(i + g);
        float d = length(g + o - f);
        float rr = .18 + .3 * h21(i + g + 7.);
        if (d - rr < best){ best = d - rr; r = rr; id = h21(i + g + 3.); }
      }
      return vec3(best, r, id);
    }
    float letter(sampler2D s, vec2 uv){
      if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return 0.;
      return texture2D(s, uv).r;
    }

    void main(){
      vec2 p = (v * 2. - 1.) * res / min(res.x, res.y);   // la letra cabe en el lado corto

      // giro lento en 3D con perspectiva
      // el ratón empuja la letra: la inclina hacia él y la deforma a su alrededor
      float md = length(p - mo.xy);
      float near = exp(-md * 2.6) * mo.z;
      p += normalize(p - mo.xy + 1e-4) * near * .09;
      float ay = .55 * sin(t * .23) + .12 * sin(t * .61) + mo.x * .45 * mo.z;
      float ax = .22 * sin(t * .19 + 1.3) - mo.y * .35 * mo.z;
      float z = 1. + p.x * sin(ay) * .55 - p.y * sin(ax) * .55;
      vec2 q = vec2(p.x / max(cos(ay), .35), p.y / max(cos(ax), .5)) * z;
      q *= .98 + .04 * sin(t * .17);   // letra grande, con aire alrededor
      vec2 uv = q * .5 + .5;
      uv.y = 1. - uv.y;

      float m = letter(uL, uv);
      // relieve: normal a partir de la letra desenfocada
      float e = 1.5 / 1024.;
      float dx = letter(uB, uv + vec2(e, 0)) - letter(uB, uv - vec2(e, 0));
      float dy = letter(uB, uv + vec2(0, e)) - letter(uB, uv - vec2(0, e));
      vec3 n = normalize(vec3(-dx * 9., dy * 9., 1.));
      vec3 L = normalize(vec3(cos(t * .31) * .9, sin(t * .23) * .7, .55));
      float diff = dot(n, L);

      // suciedad, poros y burbujas que barren la letra
      float grime = fbm(uv * 7. + t * .03);
      float fine = fbm(uv * 38. - t * .02);
      float wave = smoothstep(.42, .72, fbm(uv * 1.6 + vec2(t * .055, -t * .04)) + .25 * sin(t * .21) + near * .8);
      // espuma: burbujas de muchos tamaños con volumen (luz arriba, sombra abajo)
      vec3 b1 = bubbles(uv * 14. + vec2(t * .07, -t * .11));
      vec3 b2 = bubbles(uv * 31. + vec2(-t * .05, t * .09) + 4.);
      float in1 = smoothstep(.01, -.03, b1.x), in2 = smoothstep(.01, -.02, b2.x);
      float rim1 = smoothstep(.03, .0, abs(b1.x + .015)), rim2 = smoothstep(.02, .0, abs(b2.x + .01));
      float bub = wave * (-(rim1 * .9 + rim2 * .6) + in1 * .15 + in2 * .1 - (in1 + in2) * fine * .6);
      // bordes gastados: la letra se rompe más cerca del contorno
      float edge = 1. - abs(letter(uB, uv) * 2. - 1.);
      bub -= edge * smoothstep(.45, .8, fine) * .8;

      // gran sombra que entra y sale
      float sweep = smoothstep(-.6, .9, dot(p, vec2(cos(t * .13), sin(t * .13))) + .9 * sin(t * .29));

      float shade = .62 + diff * .55 + (grime - .5) * .55 + (fine - .5) * .35 + bub;
      shade *= mix(.35, 1.1, sweep);
      float val = m * shade + (h21(v * res + fract(t)) - .5) * .03;
      float ink = smoothstep(.5, .53, val);
      gl_FragColor = vec4(col * ink, ink);   // sin fondo: solo la letra
    }`;

  function makeLetter(glyph, family, blur) {
    const c = document.createElement("canvas");
    c.width = c.height = 1024;
    const x = c.getContext("2d");
    x.fillStyle = "#000"; x.fillRect(0, 0, 1024, 1024);
    x.fillStyle = "#fff";
    x.textAlign = "center"; x.textBaseline = "alphabetic";
    let size = 900;
    x.font = `700 ${size}px ${family}`;
    let m = x.measureText(glyph);
    const h = (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) || size * .7;
    const w = m.width || size * .6;
    size *= Math.min(820 / h, 820 / w);
    x.font = `700 ${size}px ${family}`;
    m = x.measureText(glyph);
    if (blur) x.filter = `blur(${blur}px)`;
    const asc = m.actualBoundingBoxAscent || size * .7, desc = m.actualBoundingBoxDescent || 0;
    x.fillText(glyph, 512, 512 + (asc - desc) / 2);
    return c;
  }

  function tex(gl, img) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  window.klimLetter = function (canvas, opts = {}) {
    const glyph = opts.glyph || "B";
    const family = opts.family || '"LaBella", Georgia, serif';
    // Si WebGL falla (o el navegador lo corta), se muestra la letra con CSS
    const fallback = () => { return null;
      canvas.classList.add("is-fallback");
      let fb = canvas.parentNode && canvas.parentNode.querySelector(".klim-fb");
      if (!fb && canvas.parentNode) {
        fb = document.createElement("span"); fb.className = "klim-fb"; fb.textContent = glyph;
        fb.style.color = opts.color || "#171512";
        canvas.parentNode.insertBefore(fb, canvas.nextSibling);
      }
      return fb;
    };
    const gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true });
    if (!gl) { const fb = fallback(); return { start() { fb && fb.classList.add("is-on"); }, stop() { fb && fb.classList.remove("is-on"); }, destroy() {} }; }

    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("klim:", gl.getProgramInfoLog(prog));
      const fb = fallback(); return { start() { fb && fb.classList.add("is-on"); }, stop() { fb && fb.classList.remove("is-on"); }, destroy() {} };
    }
    gl.useProgram(prog);
    let lost = false, fbEl = null, checked = false, frames = 0;
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); lost = true; canvas.closest(".case") && canvas.closest(".case").classList.remove("klim-ok"); });
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uT = gl.getUniformLocation(prog, "t"), uRes = gl.getUniformLocation(prog, "res");
    const c = (opts.color || "#171512").match(/\w\w/g).map((h) => parseInt(h, 16) / 255);
    gl.uniform3f(gl.getUniformLocation(prog, "col"), c[0], c[1], c[2]);

    const uMo = gl.getUniformLocation(prog, "mo");
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, s: 0, ts: 0 };
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      const m = Math.min(r.width, r.height) || 1;
      mouse.tx = ((e.clientX - r.left) / r.width * 2 - 1) * r.width / m;
      mouse.ty = -((e.clientY - r.top) / r.height * 2 - 1) * r.height / m;
      mouse.ts = inside ? 1 : 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let ready = false;
    const build = () => {
      gl.activeTexture(gl.TEXTURE0); tex(gl, makeLetter(glyph, family, 0));
      gl.uniform1i(gl.getUniformLocation(prog, "uL"), 0);
      gl.activeTexture(gl.TEXTURE1); tex(gl, makeLetter(glyph, family, 22));
      gl.uniform1i(gl.getUniformLocation(prog, "uB"), 1);
      ready = true;
    };
    // espera a que la tipografía esté cargada para dibujar la letra
    (document.fonts ? document.fonts.load(`700 100px ${family}`, glyph).catch(() => {}) : Promise.resolve()).then(build);

    let raf = 0, running = false;
    const t0 = performance.now() - 4000;
    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (w && h && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (!ready || lost) return;
      size();
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      mouse.x += (mouse.tx - mouse.x) * .08; mouse.y += (mouse.ty - mouse.y) * .08; mouse.s += (mouse.ts - mouse.s) * .05;
      gl.uniform3f(uMo, mouse.x, mouse.y, mouse.s);
      gl.uniform1f(uT, (now - t0) / 1000);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // comprobación: si tras unos fotogramas el lienzo sigue vacío, usar la letra de reserva
      if (!checked && ++frames > 20) {
        checked = true;
        const w = Math.min(64, canvas.width), h = Math.min(64, canvas.height);
        const px = new Uint8Array(w * h * 4);
        try { gl.readPixels(((canvas.width - w) / 2) | 0, ((canvas.height - h) / 2) | 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); } catch (e) {}
        let sum = 0; for (let i = 3; i < px.length; i += 4) sum += px[i];
        if (sum === 0) { lost = true; if (opts.onFail) opts.onFail(); }
        else if (opts.onReady) opts.onReady();
      }
    }
    return {
      start() { if (fbEl) fbEl.classList.add("is-on"); if (!running) { running = true; raf = requestAnimationFrame(frame); } },
      stop() { if (fbEl) fbEl.classList.remove("is-on"); running = false; cancelAnimationFrame(raf); },
      destroy() {   // libera el contexto WebGL (los navegadores solo permiten unos pocos)
        running = false; cancelAnimationFrame(raf); window.removeEventListener("pointermove", onMove);
        const ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext();
      },
    };
  };
})();
