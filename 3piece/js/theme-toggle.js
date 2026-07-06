/*
 * Világos/sötét téma kapcsoló. A html elem data-theme="dark" attribútumát
 * billenti, a választást localStorage-ban őrzi (kulcs: hp-theme).
 * A villanásmentes betöltésről az oldalak <head>-jébe tett pár soros
 * bootstrap szkript gondoskodik — ez a fájl csak a gombot kezeli.
 */
(function () {
  var root = document.documentElement;
  var button = document.getElementById("theme-toggle");
  if (!button) {
    return;
  }

  function apply(theme) {
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
    button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  }

  apply(root.getAttribute("data-theme") === "dark" ? "dark" : "light");

  button.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    apply(next);
    try {
      localStorage.setItem("hp-theme", next);
    } catch (e) {
      /* privát mód: a választás csak az oldal bezárásáig él */
    }
  });
})();
