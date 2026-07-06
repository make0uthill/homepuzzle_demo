/*
 * Közös animációs motor a vagyon és közvetítés oldalakhoz.
 * Az energetika oldal mozgásvilágát adja: dokkolós header tween,
 * hero parallax, scroll progress csík, reveal + stagger beúszások.
 */
(function () {
  var header = document.querySelector(".site-header");
  var heroInner = document.querySelector(".hero-inner");

  var HEADER_DOCK_AT = 48;
  var HEADER_UNDOCK_AT = 14;
  var HEADER_ANIM_MS = 650;
  var PARALLAX_LIMIT = 900;

  var headerDocked = false;
  var headerHp = 0;
  var headerAnim = null;
  var scrollFrame = null;

  function clamp01(value) {
    return Math.min(1, Math.max(0, value));
  }

  function pageProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? clamp01(window.scrollY / max) : 0;
  }

  function setHeaderProgress(value) {
    headerHp = value;

    if (header) {
      header.style.setProperty("--hp", value.toFixed(4));
    }
  }

  /*
   * A header nem a scroll pozíciót követi: a küszöb átlépésekor egy
   * önálló, idő alapú tween viszi végig a --hp értéket 0 és 1 között.
   */
  function animateHeaderTo(target) {
    if (headerAnim !== null) {
      cancelAnimationFrame(headerAnim);
      headerAnim = null;
    }

    if (!header) {
      return;
    }

    var from = headerHp;
    var start = performance.now();

    function tick(now) {
      var t = clamp01((now - start) / HEADER_ANIM_MS);
      var eased = 1 - Math.pow(1 - t, 4);

      setHeaderProgress(from + (target - from) * eased);
      headerAnim = t < 1 ? requestAnimationFrame(tick) : null;
    }

    headerAnim = requestAnimationFrame(tick);
  }

  function updateDockState() {
    var y = window.scrollY;

    if (!headerDocked && y > HEADER_DOCK_AT) {
      headerDocked = true;
      animateHeaderTo(1);
    } else if (headerDocked && y < HEADER_UNDOCK_AT) {
      headerDocked = false;
      animateHeaderTo(0);
    }
  }

  function renderScrollFrame() {
    scrollFrame = null;
    updateDockState();

    if (header) {
      header.style.setProperty("--sp", pageProgress().toFixed(4));
    }

    if (heroInner) {
      var shift = Math.min(window.scrollY, PARALLAX_LIMIT) * 0.18;
      heroInner.style.setProperty("--sy", shift.toFixed(2));
    }
  }

  function queueScrollFrame() {
    if (scrollFrame === null) {
      scrollFrame = requestAnimationFrame(renderScrollFrame);
    }
  }

  function getHeaderOffset() {
    if (!header) {
      return 0;
    }

    return header.getBoundingClientRect().height + 24;
  }

  function scrollToTarget(target) {
    var top = target.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({
      top: top - getHeaderOffset(),
      behavior: "smooth",
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      var hash = link.getAttribute("href");
      var target = hash && hash.length > 1 ? document.querySelector(hash) : null;

      if (!target) {
        return;
      }

      event.preventDefault();
      scrollToTarget(target);
      history.pushState(null, "", hash);
    });
  });

  /* Reveal szekciók kijelölése futásidőben, hogy a HTML ne változzon */
  var revealTargets = document.querySelectorAll(
    "main > section:not(.hero):not(.listings), main > .section-kicker, main > .section-title"
  );

  revealTargets.forEach(function (element) {
    element.classList.add("reveal");
  });

  /* Stagger csoportok: a gyerekek késleltetve úsznak be */
  document
    .querySelectorAll(
      ".steps, .process-timeline, .info-grid, .faq-grid, .process-steps, .support-grid, .intro-grid, .service-grid"
    )
    .forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, index) {
        child.classList.add("stagger");
        child.style.setProperty("--d", Math.min(index * 90, 600) + "ms");
      });
    });

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    document.querySelectorAll(".reveal").forEach(function (element) {
      observer.observe(element);
    });
  } else {
    document.querySelectorAll(".reveal").forEach(function (element) {
      element.classList.add("is-visible");
    });
  }

  /*
   * A közvetítés oldal listing kártyái CSV-ből, futásidőben jönnek létre:
   * beszúráskor kapnak sorszámot, amiből a CSS a belépő animáció
   * késleltetését számolja.
   */
  var listingsGrid = document.getElementById("listings-grid");

  if (listingsGrid && "MutationObserver" in window) {
    var cardWatcher = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes, function (node) {
          if (node.nodeType !== 1) {
            return;
          }

          var index = Array.prototype.indexOf.call(
            listingsGrid.children,
            node
          );
          node.style.setProperty("--i", String(Math.min(Math.max(index, 0), 8)));
        });
      });
    });

    cardWatcher.observe(listingsGrid, { childList: true });
  }

  if (window.scrollY > HEADER_DOCK_AT) {
    headerDocked = true;
    setHeaderProgress(1);
  }

  queueScrollFrame();
  window.addEventListener("scroll", queueScrollFrame, { passive: true });
  window.addEventListener("resize", queueScrollFrame);
})();
