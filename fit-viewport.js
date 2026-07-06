(function () {
  var mobileViewport = window.matchMedia("(max-width: 900px)");
  var container = document.querySelector(".container");
  var header = document.querySelector(".site-header");
  var footer = document.querySelector(".site-footer");

  function getAvailableHeight() {
    return window.innerHeight - header.offsetHeight - footer.offsetHeight - 12;
  }

  function getViewportScale() {
    var availableHeight = getAvailableHeight();
    var contentHeight = container.getBoundingClientRect().height;
    var scale = Math.min(1, availableHeight / contentHeight);

    return Math.max(scale, 0.88);
  }

  function fitToViewport() {
    if (!container || !header || !footer) {
      return;
    }

    if (mobileViewport.matches) {
      container.style.transform = "none";
      return;
    }

    container.style.transform = "none";
    container.style.transform = "scale(" + getViewportScale().toFixed(4) + ")";
  }

  window.addEventListener("load", fitToViewport);
  window.addEventListener("resize", fitToViewport);
})();
