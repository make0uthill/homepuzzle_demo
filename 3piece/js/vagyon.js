(function () {
  function toggleFaqCard(card) {
    var isFlipped = card.classList.toggle("flipped");
    card.setAttribute("aria-pressed", String(isFlipped));
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
})();
