const page = document.getElementById("game-page");
const gameId = new URLSearchParams(window.location.search).get("id");

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function showMessage(text) {
  page.replaceChildren(el("p", "message", text));
}

function trackClick(linkId) {
  let seen = [];
  try {
    seen = JSON.parse(sessionStorage.getItem("kiln-clicks") || "[]");
  } catch (error) {
    seen = [];
  }
  if (seen.includes(linkId)) {
    return;
  }
  seen.push(linkId);
  try {
    sessionStorage.setItem("kiln-clicks", JSON.stringify(seen));
  } catch (error) {
    // storage unavailable, the click is still counted once below
  }
  db.rpc("record_click", { p_link_id: linkId }).then(function () {});
}

function trackView(id) {
  let seen = [];
  try {
    seen = JSON.parse(sessionStorage.getItem("kiln-views") || "[]");
  } catch (error) {
    seen = [];
  }
  if (seen.includes(id)) {
    return;
  }
  seen.push(id);
  try {
    sessionStorage.setItem("kiln-views", JSON.stringify(seen));
  } catch (error) {
    // storage unavailable, the view is still counted once below
  }
  db.rpc("record_view", { p_game_id: id }).then(function () {});
}

function renderGame(game) {
  document.title = game.title + " - Kiln";
  const developer = game.profiles ? game.profiles.username : "unknown";

  const hero = el("div", "game-hero");

  const cover = el("img", "game-cover");
  cover.alt = game.title + " cover";
  if (game.cover_path) {
    cover.src = imageUrl(game.cover_path);
  }

  const info = el("div", "game-info");
  info.append(el("h1", null, game.title));

  if (taglineNames[game.tagline]) {
    info.append(el("p", "tagline", taglineNames[game.tagline]));
  }

  const byline = el("p", "byline", "By ");
  const developerLink = el("a", null, developer);
  developerLink.href = "profile.html?user=" + encodeURIComponent(developer);
  byline.append(developerLink);
  info.append(byline);

  const chips = el("div", "chips");
  const chipTexts = [
    genreNames[game.genre] || "Other",
    lengthNames[game.play_length],
    playerNames[game.players]
  ].concat(knownLabels(game.tags, tagNames));

  for (const text of chipTexts) {
    chips.append(el("span", null, text));
  }
  info.append(chips);
  hero.append(cover, info);

  const buy = el("section", "buy");
  buy.append(el("h2", null, "Where to get it"));

  const order = Object.keys(platformNames);
  const links = game.game_links.slice().sort(function (a, b) {
    return order.indexOf(a.platform) - order.indexOf(b.platform);
  });

  const paidPrices = links
    .filter(function (link) { return link.price_type === "paid"; })
    .map(function (link) { return link.price_cents; });
  const lowestPaid = paidPrices.length > 0 ? Math.min(...paidPrices) : null;
  const showBadge =
    paidPrices.length >= 2 && lowestPaid < Math.max(...paidPrices);

  if (links.length === 0) {
    buy.append(el("p", "hint", "No store links yet."));
  }

  for (const link of links) {
    const button = el("a", "buy-button", buttonLabel(link));
    button.href = link.url;
    button.target = "_blank";
    button.rel = "noopener noreferrer";
    button.addEventListener("click", function () {
      trackClick(link.id);
    });

    if (
      showBadge &&
      link.price_type === "paid" &&
      link.price_cents === lowestPaid
    ) {
      button.append(" ", el("span", "badge", "Lowest price"));
    }
    buy.append(button);
  }

  if (links.some(function (link) { return link.price_type === "paid"; })) {
    buy.append(
      el(
        "p",
        "hint",
        "Prices are set by the developer and may have changed. Check the store for the current price."
      )
    );
  }

  page.replaceChildren(hero, buy);

  if (game.screenshots.length > 0) {
    const shots = el("section", "shots");
    shots.append(el("h2", null, "Screenshots"));
    const row = el("div", "shots-row");

    for (const path of game.screenshots) {
      const link = el("a");
      link.href = imageUrl(path);
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      const image = el("img");
      image.src = imageUrl(path);
      image.alt = game.title + " screenshot";
      image.loading = "lazy";

      link.append(image);
      row.append(link);
    }
    shots.append(row);
    page.append(shots);
  }

  if (game.description.trim()) {
    const about = el("section", "about");
    about.append(el("h2", null, "About this game"));
    for (const paragraph of game.description.split(/\n\s*\n/)) {
      if (paragraph.trim()) {
        about.append(el("p", null, paragraph.trim()));
      }
    }
    page.append(about);
  }

  const made = el("section", "made");
  made.append(el("h2", null, "How it was made"));
  made.append(el("p", null, "Art: " + aiNames[game.ai_art]));
  made.append(el("p", null, "Audio: " + aiNames[game.ai_audio]));
  made.append(el("p", null, "Writing: " + aiNames[game.ai_writing]));
  made.append(el("p", null, "Code: " + aiNames[game.ai_code]));
  made.append(el("p", "hint", "Declared by the developer."));
  page.append(made);
}

async function renderSimilar(game) {
  const { data, error } = await db
    .from("games")
    .select(
      "id, title, genre, tags, play_length, cover_path, profiles(username), game_links(price_type, price_cents, currency)"
    )
    .eq("status", "live")
    .neq("id", game.id)
    .limit(200);

  if (error || !data) {
    return;
  }

  const matches = data
    .map(function (other) {
      let score = 0;
      if (other.genre === game.genre) {
        score += 3;
      }
      if (other.play_length === game.play_length) {
        score += 1;
      }
      for (const tag of other.tags) {
        if (game.tags.includes(tag)) {
          score += 2;
        }
      }
      return { other: other, score: score };
    })
    .filter(function (item) {
      return item.score >= 3;
    })
    .sort(function (a, b) {
      return b.score - a.score;
    })
    .slice(0, 4);

  if (matches.length === 0) {
    return;
  }

  const section = el("section", "similar");
  section.append(el("h2", null, "More like this"));

  const row = el("div", "grid");
  for (const item of matches) {
    row.append(buildGameCard(item.other));
  }
  section.append(row);
  page.append(section);
}

async function loadGame() {
  if (!gameId || !/^[0-9a-f-]{36}$/i.test(gameId)) {
    showMessage("Game not found.");
    return;
  }

  const { data, error } = await db
    .from("games")
    .select(
      "*, profiles(username), game_links(id, platform, url, price_type, price_cents, currency)"
    )
    .eq("id", gameId)
    .eq("status", "live")
    .maybeSingle();

  if (error || !data) {
    showMessage("Game not found.");
    return;
  }

  trackView(data.id);
  renderGame(data);
  renderSimilar(data);
}

loadGame();