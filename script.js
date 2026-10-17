const grid = document.getElementById("game-grid");
const searchBox = document.getElementById("search");
const genreFilter = document.getElementById("f-genre");
const priceFilter = document.getElementById("f-price");
const platformFilter = document.getElementById("f-platform");
const lengthFilter = document.getElementById("f-length");
const playersFilter = document.getElementById("f-players");
const sortSelect = document.getElementById("f-sort");
const noAiBox = document.getElementById("f-noai");
const tagFilter = document.getElementById("f-tag");
const tagChips = document.getElementById("f-tag-chips");
const clearButton = document.getElementById("clear-filters");
const resultCount = document.getElementById("result-count");

const filterPlatforms = {
  steam: "Steam",
  itch: "itch.io",
  newgrounds: "Newgrounds",
  gamejolt: "Game Jolt",
  website: "Developer's own website"
};

let allGames = [];
let activity = {};
const chosenTags = [];

fillSelect(genreFilter, genreNames, "All genres");
fillSelect(platformFilter, filterPlatforms, "Any platform");
fillTagSelect(tagFilter, "Filter by tag...");

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text) {
  return normalize(text).split(" ").filter(Boolean);
}

function editDistance(a, b) {
  let previous = [];
  for (let j = 0; j <= b.length; j++) {
    previous.push(j);
  }

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current.push(
        Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
      );
    }
    previous = current;
  }
  return previous[b.length];
}

function wordMatch(queryWord, fieldWords) {
  const allowed = queryWord.length >= 7 ? 2 : queryWord.length >= 4 ? 1 : 0;
  let best = 0;

  for (const word of fieldWords) {
    if (word.includes(queryWord)) {
      return 2;
    }
    if (
      allowed > 0 &&
      Math.abs(word.length - queryWord.length) <= allowed &&
      editDistance(queryWord, word) <= allowed
    ) {
      best = 1;
    }
  }
  return best;
}

function searchScore(game, queryWords) {
  let total = 0;

  for (const queryWord of queryWords) {
    let best = 0;
    for (const field of game.index) {
      const match = wordMatch(queryWord, field.words);
      if (match > 0) {
        best = Math.max(best, field.weight * (match / 2));
      }
    }
    if (best === 0) {
      return 0;
    }
    total += best;
  }
  return total;
}

function buildIndex(game) {
  const developer = game.profiles ? game.profiles.username : "";
  game.index = [
    { weight: 5, words: words(game.title) },
    {
      weight: 3,
      words: words(
        (genreNames[game.genre] || "") +
          " " +
          knownLabels(game.tags, tagNames).join(" ")
      )
    },
    { weight: 3, words: words(developer) },
    { weight: 2, words: words(taglineNames[game.tagline] || "") },
    { weight: 1, words: words(game.description) }
  ];
}

function lowestPrice(game) {
  let lowest = null;
  for (const link of game.game_links) {
    const cents = link.price_type === "paid" ? link.price_cents : 0;
    if (lowest === null || cents < lowest) {
      lowest = cents;
    }
  }
  return lowest;
}

function priceRank(game) {
  const lowest = lowestPrice(game);
  return lowest === null ? Infinity : lowest;
}

function activityOf(game) {
  return activity[game.id] || { views: 0, clicks: 0 };
}

function gemScore(game) {
  const stats = activityOf(game);
  return ((stats.clicks + 1) / (stats.views + 3)) * (50 / (50 + stats.views));
}

function passesFilters(game) {
  if (genreFilter.value && game.genre !== genreFilter.value) {
    return false;
  }
  if (lengthFilter.value && game.play_length !== lengthFilter.value) {
    return false;
  }
  if (playersFilter.value === "single" && game.players === "multi") {
    return false;
  }
  if (playersFilter.value === "multi" && game.players === "single") {
    return false;
  }
  if (noAiBox.checked && game.category !== "human") {
    return false;
  }

  if (
    platformFilter.value &&
    !game.game_links.some(function (link) {
      return link.platform === platformFilter.value;
    })
  ) {
    return false;
  }

  const price = priceFilter.value;
  if (
    price === "free" &&
    !game.game_links.some(function (link) { return link.price_type === "free"; })
  ) {
    return false;
  }
  if (
    price === "pwyw" &&
    !game.game_links.some(function (link) { return link.price_type === "pwyw"; })
  ) {
    return false;
  }
  if (price.startsWith("under_")) {
    const limit = Number(price.slice(6)) * 100;
    const lowest = lowestPrice(game);
    if (lowest === null || lowest > limit) {
      return false;
    }
  }

  for (const tag of chosenTags) {
    if (!game.tags.includes(tag)) {
      return false;
    }
  }
  return true;
}

function newestFirst(a, b) {
  return b.game.created_at.localeCompare(a.game.created_at);
}

function sortResults(items, searching) {
  const mode = sortSelect.value;

  items.sort(function (a, b) {
    let difference = 0;

    if (mode === "relevance" && searching) {
      difference = b.score - a.score;
    } else if (mode === "trending") {
      difference =
        activityOf(b.game).clicks - activityOf(a.game).clicks ||
        activityOf(b.game).views - activityOf(a.game).views;
    } else if (mode === "unseen") {
      difference = activityOf(a.game).views - activityOf(b.game).views;
    } else if (mode === "gems") {
      difference = gemScore(b.game) - gemScore(a.game);
    } else if (mode === "cheap") {
      difference = priceRank(a.game) - priceRank(b.game);
    } else if (mode === "title") {
      difference = a.game.title.localeCompare(b.game.title);
    }

    return difference || newestFirst(a, b);
  });
}

function filtersActive() {
  return (
    searchBox.value.trim() !== "" ||
    genreFilter.value !== "" ||
    priceFilter.value !== "" ||
    platformFilter.value !== "" ||
    lengthFilter.value !== "" ||
    playersFilter.value !== "" ||
    noAiBox.checked ||
    chosenTags.length > 0
  );
}

function renderTagChips() {
  tagChips.replaceChildren();

  for (const tag of chosenTags) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "filter-chip";
    chip.textContent = tagNames[tag] + " ✕";
    chip.addEventListener("click", function () {
      chosenTags.splice(chosenTags.indexOf(tag), 1);
      renderTagChips();
      render();
    });
    tagChips.append(chip);
  }
}

function render() {
  const queryWords = words(searchBox.value);
  const items = [];

  for (const game of allGames) {
    if (!passesFilters(game)) {
      continue;
    }
    const score = queryWords.length > 0 ? searchScore(game, queryWords) : 1;
    if (score > 0) {
      items.push({ game: game, score: score });
    }
  }

  sortResults(items, queryWords.length > 0);

  clearButton.hidden = !filtersActive();
  grid.replaceChildren();

  if (allGames.length === 0) {
    const empty = document.createElement("p");
    empty.append("No games yet. ");
    const publish = document.createElement("a");
    publish.href = "publish.html";
    publish.textContent = "Be the first to list one.";
    empty.append(publish);
    grid.append(empty);
    resultCount.textContent = "";
    return;
  }

  if (items.length === 0) {
    const none = document.createElement("p");
    none.textContent =
      "No games match. Try fewer filters or a different word.";
    grid.append(none);
    resultCount.textContent = "";
    return;
  }

  for (const item of items) {
    grid.append(buildGameCard(item.game));
  }
  resultCount.textContent =
    items.length + (items.length === 1 ? " game" : " games");
}

async function loadGames() {
  const [gamesResult, activityResult] = await Promise.all([
    db
      .from("games")
      .select(
        "id, title, tagline, description, genre, tags, play_length, players, cover_path, category, created_at, profiles(username), game_links(platform, price_type, price_cents, currency)"
      )
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(200),
    db.rpc("game_activity")
  ]);

  if (gamesResult.error) {
    const problem = document.createElement("p");
    problem.textContent = "Couldn't load games. Try refreshing the page.";
    grid.replaceChildren(problem);
    return;
  }

  if (!activityResult.error && activityResult.data) {
    for (const row of activityResult.data) {
      activity[row.game_id] = {
        views: Number(row.views_7d),
        clicks: Number(row.clicks_7d)
      };
    }
  }

  allGames = gamesResult.data;
  allGames.forEach(buildIndex);
  render();
}

tagFilter.addEventListener("change", function () {
  const tag = tagFilter.value;
  tagFilter.value = "";

  if (tag && !chosenTags.includes(tag)) {
    chosenTags.push(tag);
    renderTagChips();
    render();
  }
});

clearButton.addEventListener("click", function () {
  searchBox.value = "";
  for (const select of [
    genreFilter, priceFilter, platformFilter, lengthFilter, playersFilter
  ]) {
    select.value = "";
  }
  noAiBox.checked = false;
  chosenTags.length = 0;
  renderTagChips();
  render();
});

for (const control of [
  searchBox, genreFilter, priceFilter, platformFilter,
  lengthFilter, playersFilter, sortSelect, noAiBox
]) {
  control.addEventListener("input", render);
}

loadGames();