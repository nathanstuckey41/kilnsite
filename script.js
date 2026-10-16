const games = [
  { title: "Ember Run", developer: "Mara Voss", genre: "Platformer" },
  { title: "The Quiet Archive", developer: "Jonas Bell", genre: "Puzzle" },
  { title: "Saltwater", developer: "Ines Okafor", genre: "Adventure" },
  { title: "Paper Knights", developer: "Theo Lind", genre: "Strategy" },
  { title: "Low Tide Blues", developer: "Mara Voss", genre: "Adventure" },
  { title: "Glass Garden", developer: "Priya Nair", genre: "Puzzle" }
];

const grid = document.getElementById("game-grid");
const searchBox = document.getElementById("search");

function makeCard(game) {
  const card = document.createElement("div");
  card.className = "card";

  const cover = document.createElement("div");
  cover.className = "cover";

  const title = document.createElement("h3");
  title.textContent = game.title;

  const info = document.createElement("p");
  info.textContent = "By " + game.developer + " · " + game.genre;

  card.append(cover, title, info);
  return card;
}

function showGames(list) {
  grid.innerHTML = "";

  if (list.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No games found.";
    grid.append(message);
    return;
  }

  for (const game of list) {
    grid.append(makeCard(game));
  }
}

searchBox.addEventListener("input", function () {
  const text = searchBox.value.toLowerCase();

  const matches = games.filter(function (game) {
    return (
      game.title.toLowerCase().includes(text) ||
      game.developer.toLowerCase().includes(text) ||
      game.genre.toLowerCase().includes(text)
    );
  });

  showGames(matches);
});

showGames(games);