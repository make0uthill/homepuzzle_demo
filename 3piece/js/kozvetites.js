(function () {
  var SHEETS_CSV_URL = (window.KOZVETITES_SHEETS_CSV_URL || "").trim();

  function parseCsvLine(line, delimiter) {
    var out = [];
    var current = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === delimiter && !inQuotes) {
        out.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    out.push(current.trim());
    return out;
  }

  function parseCsv(text) {
    var lines = text.split(/\r?\n/).filter(function (l) {
      return l.trim();
    });
    if (!lines.length) {
      return [];
    }
    var headerLine = lines[0];
    var delimiter =
      headerLine.split(";").length >= headerLine.split(",").length ? ";" : ",";
    var headers = parseCsvLine(headerLine, delimiter).map(function (h) {
      return h.replace(/^\uFEFF/, "").trim();
    });
    function pickFirst(row, keys) {
      for (var i = 0; i < keys.length; i++) {
        var value = row[keys[i]];
        if (typeof value === "string" && value.trim()) {
          return value;
        }
      }
      return "";
    }

    return lines.slice(1).map(function (line) {
      var values = parseCsvLine(line, delimiter);
      var row = {};
      headers.forEach(function (key, idx) {
        row[key] = values[idx] || "";
        row[key.toLowerCase()] = values[idx] || "";
      });

      row.type = pickFirst(row, ["type", "statusz"]).trim().toUpperCase();
      if (row.type === "LISTING") {
        row.type = "KESZ";
      }
      row.order = Number(pickFirst(row, ["order", "sorszam"]) || 0);
      row.title = pickFirst(row, ["title", "cim", "cím", "ingatlantipus"]);
      row.text = pickFirst(row, ["text", "leiras"]);
      row.images = pickFirst(row, ["images", "kepek"]);
      row.image = pickFirst(row, ["image", "kepek"]);
      row.price = pickFirst(row, ["price", "iranyar"]);
      row.details = pickFirst(row, ["details", "adatok"]);
      row.items = pickFirst(row, ["items", "adatok"]);
      row.general = pickFirst(row, ["general", "altalanos", "általános"]);
      row.technical = pickFirst(row, ["technical", "muszaki", "műszaki"]);
      row.other = pickFirst(row, ["other", "egyeb", "egyéb"]);
      row.alt = pickFirst(row, ["alt"]);
      return row;
    });
  }

  function byType(rows, type) {
    return rows
      .filter(function (r) {
        return r.type === type;
      })
      .sort(function (a, b) {
        return a.order - b.order;
      });
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el && value) {
      el.textContent = value;
    }
  }

  function unique(items) {
    return items.filter(function (item, idx, arr) {
      return arr.indexOf(item) === idx;
    });
  }

  function setDisabled(button, isDisabled) {
    if (button) {
      button.disabled = isDisabled;
    }
  }

  function bindOnce(element, eventName, handler) {
    if (!element) {
      return;
    }

    var flag =
      "bound" + eventName.charAt(0).toUpperCase() + eventName.slice(1);
    if (element.dataset[flag]) {
      return;
    }

    element.addEventListener(eventName, handler);
    element.dataset[flag] = "1";
  }

  /*
   * "|" vagy "," jellel elválasztott elemeket tölt egy listába; a közvetlenül
   * számjegy előtt álló vessző (pl. 59,9 M Ft) nem számít elválasztónak.
   * A "Címke: érték" alakú elemek az első kettőspontnál címke + érték
   * párra bomlanak (külön span-ekbe, a stílust a css adja). Ha nincs
   * egyetlen kitöltött elem sem, a teljes szekciót (a címével együtt)
   * elrejti.
   */
  function fillInfoList(listEl, sectionEl, raw) {
    if (!listEl) {
      return;
    }
    listEl.innerHTML = "";
    (raw || "").split(/\||,(?!\d)/).forEach(function (item) {
      var value = item.trim();
      if (!value) {
        return;
      }
      var li = document.createElement("li");
      var colonIdx = value.indexOf(":");
      if (colonIdx > -1) {
        var label = document.createElement("span");
        label.className = "modal-extra-label";
        label.textContent = value.slice(0, colonIdx).trim() + ":";
        var val = document.createElement("span");
        val.className = "modal-extra-value";
        val.textContent = value.slice(colonIdx + 1).trim();
        li.appendChild(label);
        li.appendChild(val);
      } else {
        li.textContent = value;
      }
      listEl.appendChild(li);
    });
    if (sectionEl) {
      sectionEl.hidden = !listEl.children.length;
    }
  }

  function normalizeDescription(text) {
    return (text || "")
      .replace(/^\s*(?:[•·●◦▪▫◆◇\-*]+|\d+[\.)])\s*/, "")
      .trim();
  }

  function resolveImageSrc(raw) {
    var src = (raw || "").trim().replace(/\\/g, "/");
    if (!src) {
      return "";
    }
    if (/^(https?:|data:)/i.test(src)) {
      return src;
    }
    if (/^assets\//i.test(src)) {
      return src;
    }
    if (src.indexOf("/") === -1) {
      return "assets/" + src;
    }
    return src;
  }

  function fallbackImageCandidates(raw) {
    var src = (raw || "").trim().replace(/\\/g, "/");
    if (!src || /^(https?:|data:)/i.test(src)) {
      return [];
    }
    var fileName = src.split("/").pop();
    var candidates = [];
    if (fileName) {
      candidates.push("assets/ingatlanok/" + fileName);
      candidates.push("assets/" + fileName);
    }
    if (src.indexOf("assets/ingatlanok/") === 0 && fileName) {
      candidates.push("assets/" + fileName);
    }
    if (src.indexOf("assets/") === 0 && fileName) {
      candidates.push("assets/ingatlanok/" + fileName);
    }
    return unique(candidates).filter(function (item) {
      return item !== src;
    });
  }

  function parseImageValues(row) {
    var combined = "";
    if (row.images && row.images.trim()) {
      combined = row.images;
    } else if (row.image && row.image.trim()) {
      combined = row.image;
    }
    if (!combined) {
      return [];
    }
    return combined
      .split(/[|,]/)
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
  }

  function buildGalleryItems(row) {
    var tokens = parseImageValues(row);
    var baseAlt = row.alt || row.title || "Ingatlan kép";
    return tokens
      .map(function (raw) {
        var sources = [];
        var primary = resolveImageSrc(raw);
        if (primary) {
          sources.push(primary);
        }
        fallbackImageCandidates(raw).forEach(function (candidate) {
          sources.push(candidate);
        });
        return {
          alt: baseAlt,
          sources: unique(sources),
        };
      })
      .filter(function (item) {
        return item.sources.length > 0;
      });
  }

  function render(rows) {
    var modal = document.getElementById("listing-modal");
    var modalClose = document.getElementById("modal-close");
    var modalTitle = document.getElementById("modal-title");
    var modalImage = document.getElementById("modal-image");
    var modalGallery = document.getElementById("modal-gallery");
    var modalGalleryPrev = document.getElementById("modal-gallery-prev");
    var modalGalleryNext = document.getElementById("modal-gallery-next");
    var modalGalleryCounter = document.getElementById("modal-gallery-counter");
    var modalText = document.getElementById("modal-text");
    var modalExtra = document.getElementById("modal-extra");
    var modalExtraSection = document.getElementById("modal-extra-section");
    var modalInfoSections = [
      {
        key: "general",
        list: document.getElementById("modal-general"),
        section: document.getElementById("modal-general-section"),
      },
      {
        key: "technical",
        list: document.getElementById("modal-technical"),
        section: document.getElementById("modal-technical-section"),
      },
      {
        key: "other",
        list: document.getElementById("modal-other"),
        section: document.getElementById("modal-other-section"),
      },
    ];
    var modalPrice = document.getElementById("modal-price");
    var modalGalleryItems = [];
    var modalGalleryIndex = 0;
    var modalGalleryFallbackIndex = 0;

    function updateModalGallery() {
      if (!modalImage) {
        return;
      }
      if (!modalGalleryItems.length) {
        modalImage.removeAttribute("src");
        if (modalGalleryCounter) {
          modalGalleryCounter.textContent = "0 / 0";
        }
        setDisabled(modalGalleryPrev, true);
        setDisabled(modalGalleryNext, true);
        return;
      }
      if (modalGalleryIndex < 0) {
        modalGalleryIndex = modalGalleryItems.length - 1;
      }
      if (modalGalleryIndex >= modalGalleryItems.length) {
        modalGalleryIndex = 0;
      }
      if (modalGalleryFallbackIndex < 0) {
        modalGalleryFallbackIndex = 0;
      }
      var item = modalGalleryItems[modalGalleryIndex];
      if (!item || !item.sources.length) {
        return;
      }
      if (modalGalleryFallbackIndex >= item.sources.length) {
        modalGalleryFallbackIndex = 0;
      }
      modalImage.src = item.sources[modalGalleryFallbackIndex];
      modalImage.alt = item.alt || "Ingatlan kép";
      modalImage.classList.remove("is-swapping");
      void modalImage.offsetWidth;
      modalImage.classList.add("is-swapping");
      if (modalGalleryCounter) {
        modalGalleryCounter.textContent =
          modalGalleryIndex + 1 + " / " + modalGalleryItems.length;
      }
      setDisabled(modalGalleryPrev, modalGalleryItems.length <= 1);
      setDisabled(modalGalleryNext, modalGalleryItems.length <= 1);
    }

    function showPrevImage() {
      if (modalGalleryItems.length <= 1) {
        return;
      }
      modalGalleryIndex -= 1;
      modalGalleryFallbackIndex = 0;
      updateModalGallery();
    }

    function showNextImage() {
      if (modalGalleryItems.length <= 1) {
        return;
      }
      modalGalleryIndex += 1;
      modalGalleryFallbackIndex = 0;
      updateModalGallery();
    }

    function closeModal() {
      if (!modal) {
        return;
      }
      modal.classList.remove("is-open");
      modal.classList.remove("is-zoomed");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
    }

    function openModal(row, galleryItems) {
      if (
        !modal ||
        !modalTitle ||
        !modalImage ||
        !modalText ||
        !modalExtra ||
        !modalPrice
      ) {
        return;
      }
      modalTitle.textContent = row.title || "Ingatlan részletek";
      modalGalleryItems = (galleryItems || []).slice();
      if (!modalGalleryItems.length) {
        var fallbackSingle = resolveImageSrc(row.image);
        if (fallbackSingle) {
          modalGalleryItems = [
            {
              sources: [fallbackSingle],
            },
          ];
        }
      }
      modalGalleryIndex = 0;
      modalGalleryFallbackIndex = 0;
      updateModalGallery();
      modalText.textContent = normalizeDescription(row.text);
      modalPrice.textContent = row.price || "";
      fillInfoList(modalExtra, modalExtraSection, row.details);
      modalInfoSections.forEach(function (info) {
        fillInfoList(info.list, info.section, row[info.key]);
      });
      modal.classList.remove("is-zoomed");
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
    }

    bindOnce(modalClose, "click", closeModal);
    bindOnce(modalGalleryPrev, "click", showPrevImage);
    bindOnce(modalGalleryNext, "click", showNextImage);
    bindOnce(modalImage, "click", function () {
      if (modal && modalGalleryItems.length) {
        modal.classList.toggle("is-zoomed");
      }
    });
    bindOnce(modalGallery, "click", function (event) {
      if (
        modal &&
        event.target === modalGallery &&
        modal.classList.contains("is-zoomed")
      ) {
        modal.classList.remove("is-zoomed");
      }
    });
    bindOnce(modalImage, "error", function () {
      if (!modalGalleryItems.length) {
        return;
      }
      var currentItem = modalGalleryItems[modalGalleryIndex];
      if (
        currentItem &&
        modalGalleryFallbackIndex + 1 < currentItem.sources.length
      ) {
        modalGalleryFallbackIndex += 1;
        updateModalGallery();
        return;
      }
      modalGalleryItems.splice(modalGalleryIndex, 1);
      modalGalleryFallbackIndex = 0;
      if (modalGalleryIndex >= modalGalleryItems.length) {
        modalGalleryIndex = 0;
      }
      updateModalGallery();
    });
    if (modal && !modal.dataset.bound) {
      modal.addEventListener("click", function (event) {
        if (event.target === modal) {
          closeModal();
        }
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          if (modal.classList.contains("is-zoomed")) {
            modal.classList.remove("is-zoomed");
            return;
          }
          closeModal();
          return;
        }
        if (!modal.classList.contains("is-open")) {
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          showPrevImage();
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          showNextImage();
        }
      });
      modal.dataset.bound = "1";
    }

    var hero = byType(rows, "HERO")[0];
    if (hero) {
      setText("hero-title", hero.title);
      setText("hero-text", hero.text);
    }

    var chipsWrap = document.getElementById("hero-chips");
    if (chipsWrap) {
      chipsWrap.innerHTML = "";
      var chipRow = byType(rows, "CHIP")[0];
      if (chipRow && chipRow.items) {
        chipRow.items.split("|").forEach(function (item) {
          var text = item.trim();
          if (!text) {
            return;
          }
          var chip = document.createElement("span");
          chip.className = "meta-chip";
          chip.textContent = text;
          chipsWrap.appendChild(chip);
        });
      }
    }

    var listTitle = byType(rows, "LIST_TITLE")[0];
    if (listTitle) {
      setText("listings-title", listTitle.title);
    }

    var grid = document.getElementById("listings-grid");
    if (!grid) {
      return;
    }
    grid.innerHTML = "";
    byType(rows, "KESZ").forEach(function (row) {
      var card = document.createElement("article");
      card.className = "card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute(
        "aria-label",
        (row.title || "Ingatlan") + " részletek megnyitása",
      );

      var img = document.createElement("img");
      var galleryItems = buildGalleryItems(row);
      var firstItem = galleryItems[0] || null;
      var previewSources = firstItem ? firstItem.sources.slice() : [];
      var initialSrc = previewSources[0] || resolveImageSrc(row.image);
      var candidates = previewSources.slice(1);
      img.src = initialSrc;
      img.addEventListener("error", function () {
        if (!candidates.length) {
          return;
        }
        img.src = candidates.shift();
      });
      img.alt = (firstItem && firstItem.alt) || row.alt || row.title;

      var media = document.createElement("div");
      media.className = "card-media";
      media.appendChild(img);

      var status = document.createElement("span");
      status.className = "card-status";
      status.textContent = "Eladó";
      media.appendChild(status);

      if (galleryItems.length > 1) {
        var count = document.createElement("span");
        count.className = "card-count";
        count.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true">' +
          '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
          '<circle cx="9" cy="9" r="2"/>' +
          '<path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>' +
          "</svg>" +
          galleryItems.length +
          " fotó";
        media.appendChild(count);
      }

      if (row.price) {
        var badge = document.createElement("span");
        badge.className = "card-price";
        badge.textContent = row.price;
        media.appendChild(badge);
      }
      card.appendChild(media);

      var content = document.createElement("div");
      content.className = "card-content";

      var h3 = document.createElement("h3");
      h3.textContent = row.title;
      content.appendChild(h3);

      var p = document.createElement("p");
      p.textContent = normalizeDescription(row.text);
      content.appendChild(p);

      var more = document.createElement("span");
      more.className = "card-more";
      more.innerHTML =
        "Részletek megtekintése" +
        '<span class="card-more-arrow" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>' +
        "</span>";
      content.appendChild(more);

      card.appendChild(content);
      card.addEventListener("click", function () {
        openModal(row, galleryItems);
      });
      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openModal(row, galleryItems);
        }
      });
      grid.appendChild(card);
    });
  }

  function hasUsableRows(rows) {
    return rows.some(function (row) {
      return (
        row.type === "HERO" ||
        row.type === "CHIP" ||
        row.type === "LIST_TITLE" ||
        row.type === "KESZ"
      );
    });
  }

  var sources = [];
  if (SHEETS_CSV_URL) {
    sources.push(SHEETS_CSV_URL);
  }
  sources.push("data/kozvetites-content.csv");

  function loadFromSources(index) {
    if (index >= sources.length) {
      console.warn("[kozvetites] Nincs elerheto adatforras.");
      return;
    }
    var sourceUrl = sources[index];
    if (/^https?:\/\//i.test(sourceUrl)) {
      sourceUrl +=
        (sourceUrl.indexOf("?") >= 0 ? "&" : "?") + "_ts=" + Date.now();
    }
    fetch(sourceUrl)
      .then(function (r) {
        if (!r.ok) {
          throw new Error("CSV load failed");
        }
        return r.text();
      })
      .then(function (text) {
        var rows = parseCsv(text);
        if (!hasUsableRows(rows)) {
          throw new Error("Nincs ertelmezheto tartalom a forrasban");
        }
        render(rows);
        console.info("[kozvetites] Betoltve:", sources[index]);
      })
      .catch(function (err) {
        console.warn(
          "[kozvetites] Sikertelen forras:",
          sources[index],
          err,
        );
        loadFromSources(index + 1);
      });
  }

  loadFromSources(0);

  // FAQ Flip Card Animation
  (function () {
    var faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(function (item) {
      function toggleFlip() {
        item.classList.toggle('flipped');
      }

      item.addEventListener('click', toggleFlip);
      item.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleFlip();
        }
      });
    });
  })();
})();
