(function () {
  var header = document.querySelector(".site-header");
  var heroInner = document.querySelector(".hero-inner");
  var quoteFormUrl = document.body.getAttribute("data-quote-form-url");
  var quoteLinks = document.querySelectorAll(".js-quote-link");

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

  function toggleFaqCard(card) {
    var isFlipped = card.classList.toggle("flipped");
    card.setAttribute("aria-pressed", String(isFlipped));
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

  document.querySelectorAll(".faq-item").forEach(function (card) {
    card.setAttribute("aria-pressed", "false");

    card.addEventListener("click", function () {
      toggleFaqCard(card);
    });

    card.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      toggleFaqCard(card);
    });
  });

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

  quoteLinks.forEach(function (link) {
    if (quoteFormUrl) {
      link.href = quoteFormUrl;
    }

    link.addEventListener("click", function (event) {
      if (!quoteFormUrl || quoteFormUrl.indexOf("REPLACE_WITH_FORM_ID") !== -1) {
        event.preventDefault();
        window.alert(
          "Az ajánlatkérő Google Form linkje még nincs beállítva. Cseréld a body data-quote-form-url értékét a publikált űrlap linkjére."
        );
      }
    });
  });

  document
    .querySelectorAll(
      ".intro-grid, .request-flow, .process-timeline, .info-grid, .faq-grid, .fee-table tbody"
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

  if (window.scrollY > HEADER_DOCK_AT) {
    headerDocked = true;
    setHeaderProgress(1);
  }

  queueScrollFrame();
  window.addEventListener("scroll", queueScrollFrame, { passive: true });
  window.addEventListener("resize", queueScrollFrame);
})();
