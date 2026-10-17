const carouselTrack = document.getElementById("carousel-track");
const arrowLeft = document.getElementById("arrow-left");
const arrowRight = document.getElementById("arrow-right");
const pillsBox = document.getElementById("carousel-pills");
const carouselSummary = document.getElementById("carousel-summary");
const cards = Array.from(carouselTrack.querySelectorAll(".platform-card"));

const cardNames = {
  steam: "Steam",
  newgrounds: "Newgrounds",
  itch: "itch.io",
  gamejolt: "Game Jolt",
  website: "Your website"
};

const pills = [];
let currentCard = 0;

function cardName(card) {
  return cardNames[card.dataset.platform];
}

function isFilled(card) {
  return document.getElementById(card.dataset.platform + "_url").value.trim() !== "";
}

function updatePills() {
  cards.forEach(function (card, index) {
    const pill = pills[index];
    const filled = isFilled(card);

    pill.textContent = cardName(card) + (filled ? " ✓" : "");
    pill.classList.toggle("active", index === currentCard);
    pill.classList.toggle("filled", filled);
  });

  const names = cards.filter(isFilled).map(cardName);
  carouselSummary.textContent =
    names.length > 0
      ? "Will be listed on: " + names.join(", ")
      : "No links added yet.";
}

function showCard(index) {
  currentCard = index;
  carouselTrack.style.transform = "translateX(-" + index * 100 + "%)";

  cards.forEach(function (card, position) {
    card.inert = position !== index;
  });

  const previous = cards[index - 1];
  const next = cards[index + 1];

  arrowLeft.style.visibility = previous ? "visible" : "hidden";
  arrowRight.style.visibility = next ? "visible" : "hidden";

  const leftText = previous ? "Back to " + cardName(previous) : "";
  const rightText = next ? "Next: " + cardName(next) : "";
  arrowLeft.title = leftText;
  arrowRight.title = rightText;
  arrowLeft.setAttribute("aria-label", leftText || "Previous platform");
  arrowRight.setAttribute("aria-label", rightText || "Next platform");

  updatePills();
}

cards.forEach(function (card, index) {
  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "pill";
  pill.addEventListener("click", function () {
    showCard(index);
  });
  pillsBox.append(pill);
  pills.push(pill);
});

arrowLeft.addEventListener("click", function () {
  if (currentCard > 0) {
    showCard(currentCard - 1);
  }
});

arrowRight.addEventListener("click", function () {
  if (currentCard < cards.length - 1) {
    showCard(currentCard + 1);
  }
});

cards.forEach(function (card) {
  const platform = card.dataset.platform;
  const urlInput = document.getElementById(platform + "_url");
  const typeSelect = document.getElementById(platform + "_type");
  const priceInput = document.getElementById(platform + "_price");

  const warning = document.createElement("p");
  warning.className = "link-warning";
  warning.hidden = true;
  warning.textContent = "Links must start with https://";
  urlInput.after(warning);

  function refresh() {
    const text = urlInput.value.trim();
    warning.hidden = text === "" || text.startsWith("https://");
    priceInput.hidden = typeSelect.value !== "paid";
    updatePills();
  }

  function ignoreEnter(event) {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  }

  urlInput.addEventListener("input", refresh);
  urlInput.addEventListener("keydown", ignoreEnter);
  priceInput.addEventListener("keydown", ignoreEnter);
  typeSelect.addEventListener("change", refresh);
  refresh();
});

showCard(0);