const grid = document.getElementById("game-grid");
const searchBox = document.getElementById("search");
const genreFilter = document.getElementById("f-genre");
const lengthFilter = document.getElementById("f-length");
const playersFilter = document.getElementById("f-players");
const sortSelect = document.getElementById("f-sort");
const noAiBox = document.getElementById("f-noai");
const resultCount = document.getElementById("result-count");

let allGames = [];

fillSelect(genreFilter, genreNames, "All genres");

function makeCard(game) {
  const link = document.createElement("a");
  link.href = "game.html?id=" + game.id;

  const card = document.createElement("div");
  card.className = "card";

  const cover = document.createElement("img");
  cover.className = "cover-img";
  cover.alt = game.title + " cover";
  cover.loading = "lazy";
  if (game.cover_path) {
    cover.src = imageUrl(game.cover_path);
  }

  const title = document.createElement("h3");
  title.textContent = game.title;

  const developer = document.createElement("p");
  developer.textContent =
    "By " + (game.profiles ? game.profiles.username : "unknown");

  const facts = document.createElement("p");
  facts.className = "facts";
  facts.textContent =
    (genreNames[game.genre] || "Other") + " · " + lengthNames[game.play_length];

  card.append(cover, title, developer, facts);

  const price = priceSummary(game.game_links);
  if (price) {
    const priceLine = document.createElement("p");
    priceLine.className = "price";
    priceLine.textContent = price;
    card.append(priceLine);
  }

  link.append(card);
  return link;
}

function matches(game) {
  const text = searchBox.value.trim().toLowerCase();

  if (text) {
    const haystack = [
      game.title,
      taglineNames[game.tagline] || "",
      game.profiles ? game.profiles.username : "",
      knownLabels(game.tags, tagNames).join(" ")
    ]
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(text)) {
      return false;
    }
  }

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
  return true;
}

function render() {
  const shown = allGames.filter(matches);

  if (sortSelect.value === "title") {
    shown.sort(function (a, b) {
      return a.title.localeCompare(b.title);
    });
  }

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

  if (shown.length === 0) {
    const none = document.createElement("p");
    none.textContent = "No games match those filters.";
    grid.append(none);
    resultCount.textContent = "";
    return;
  }

  for (const game of shown) {
    grid.append(makeCard(game));
  }
  resultCount.textContent =
    shown.length + (shown.length === 1 ? " game" : " games");
}

async function loadGames() {
  const { data, error } = await db
    .from("games")
    .select(
      "id, title, tagline, genre, tags, play_length, players, cover_path, category, created_at, profiles(username), game_links(price_type, price_cents, currency)"
    )
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    const problem = document.createElement("p");
    problem.textContent = "Couldn't load games. Try refreshing the page.";
    grid.replaceChildren(problem);
    return;
  }

  allGames = data;
  render();
}

for (const control of [
  searchBox, genreFilter, lengthFilter, playersFilter, sortSelect, noAiBox
]) {
  control.addEventListener("input", render);
}

loadGames();