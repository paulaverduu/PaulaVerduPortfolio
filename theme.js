/* Interruptor de color de fondo (ref. mesalobo.com):
   cambia el crema por un azul intenso y el texto a crema. Se recuerda entre visitas. */
(function () {
  const root = document.documentElement;
  const btns = [...document.querySelectorAll("[data-mode]")];
  const sync = () => btns.forEach((b) => b.setAttribute("aria-checked", root.classList.contains("is-night") ? "true" : "false"));
  sync();
  btns.forEach((b) => b.addEventListener("click", () => {
    root.classList.add("mode-anim");
    root.classList.toggle("is-night");
    try { localStorage.setItem("pv-mode", root.classList.contains("is-night") ? "night" : "day"); } catch (e) {}
    sync();
    clearTimeout(root._modeT);
    root._modeT = setTimeout(() => root.classList.remove("mode-anim"), 900);
  }));
})();
