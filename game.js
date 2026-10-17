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
  db.rpc("record_click", { link_id: linkId }).then(function () {});
}

function buildPlayer(url) {
  let target;
  try {
    target = new URL(url);
  } catch (error) {
    return null;
  }

  if (target.protocol !== "https:" || target.origin === window.location.origin) {
    return null;
  }

  const section = el("section", "player");
  section.append(el("h2", null, "Play it here"));

  const button = el("button", "play-button", "Load the game");
  button.addEventListener("click", function () {
    const frame = document.createElement("iframe");
    frame.className = "play-frame";
    frame.title = "Game";
    frame.src = target.href;
    frame.referrerPolicy = "no-referrer";
    frame.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-pointer-lock allow-fullscreen"
    );
    frame.setAttribute("allow", "fullscreen");
    button.replaceWith(frame);
  });

  section.append(
    button,
    el(
      "p",
      "hint",
      "If the game doesn't appear, its host doesn't allow embedding. Use one of the links above instead."
    )
  );
  return section;
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
  if (game.tagline) {
    info.append(el("p", "tagline", game.tagline));
  }

  const byline = el("p", "byline", "By ");
  const developerLink = el("a", null, developer);
  developerLink.href = "profile.html?user=" + encodeURIComponent(developer);
  byline.append(developerLink);
  info.append(byline);

  const chips = el("div", "chips");
  const chipTexts = [
    genreNames[game.genre],
    lengthNames[game.play_length],
    playerNames[game.players]
  ]
    .concat(
      game.controls.map(function (control) {
        return controlNames[control];
      })
    )
    .concat(game.tags);

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

  if (game.play_url) {
    const player = buildPlayer(game.play_url);
    if (player) {
      page.append(player);
    }
  }

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

  const about = el("section", "about");
  about.append(el("h2", null, "About this game"));
  for (const paragraph of game.description.split(/\n\s*\n/)) {
    if (paragraph.trim()) {
      about.append(el("p", null, paragraph.trim()));
    }
  }
  page.append(about);

  const made = el("section", "made");
  made.append(el("h2", null, "How it was made"));
  made.append(el("p", null, "Art: " + aiNames[game.ai_art]));
  made.append(el("p", null, "Audio: " + aiNames[game.ai_audio]));
  made.append(el("p", null, "Writing: " + aiNames[game.ai_writing]));
  made.append(el("p", null, "Code: " + aiNames[game.ai_code]));
  made.append(el("p", "hint", "Declared by the developer."));
  page.append(made);
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

  renderGame(data);
}

loadGame();