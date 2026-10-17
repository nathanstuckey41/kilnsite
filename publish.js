const gate = document.getElementById("gate-message");
const form = document.getElementById("publish-form");
const message = document.getElementById("publish-message");
const categoryNote = document.getElementById("category-note");
const submitButton = form.querySelector("button[type='submit']");
const pageTitle = document.querySelector(".publish-box h1");
const taglineSelect = document.getElementById("tagline");
const genreSelect = document.getElementById("genre");
const tagPicker = document.getElementById("tag-picker");
const tagChips = document.getElementById("tag-chips");
const tagCount = document.getElementById("tag-count");

const editId = new URLSearchParams(window.location.search).get("edit");

const aiIds = ["ai_art", "ai_audio", "ai_writing", "ai_code"];
const platforms = ["steam", "newgrounds", "itch", "gamejolt", "website"];
const platformLabels = {
  steam: "Steam",
  newgrounds: "Newgrounds",
  itch: "itch.io",
  gamejolt: "Game Jolt",
  website: "your website"
};
const urlRules = {
  steam: {
    pattern: /^https:\/\/store\.steampowered\.com\/app\/[0-9]+/,
    example: "https://store.steampowered.com/app/123456"
  },
  newgrounds: {
    pattern: /^https:\/\/(www\.)?newgrounds\.com\/.+/,
    example: "https://www.newgrounds.com/portal/view/123456"
  },
  itch: {
    pattern: /^https:\/\/[a-zA-Z0-9-]+\.itch\.io\/.+/,
    example: "https://yourname.itch.io/your-game"
  },
  gamejolt: {
    pattern: /^https:\/\/gamejolt\.com\/games\/.+/,
    example: "https://gamejolt.com/games/your-game/123456"
  },
  website: {
    pattern: /^https:\/\//,
    example: "https://example.com"
  }
};
const extensions = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const maxImageSize = 2 * 1024 * 1024;

let currentUser = null;
let editingGame = null;
const existingLinks = {};
const chosenTags = [];

function value(id) {
  return document.getElementById(id).value.trim();
}

function hintLine(text) {
  const line = document.createElement("p");
  line.className = "hint";
  line.textContent = text;
  return line;
}

function updateCategoryNote() {
  const allHuman = aiIds.every(function (id) {
    return value(id) === "none";
  });
  categoryNote.textContent = allHuman
    ? "This game will be labeled: no generative AI."
    : "This game will be labeled: uses generative AI.";
}

function fillTagPicker() {
  const first = document.createElement("option");
  first.value = "";
  first.textContent = "Add a tag...";
  tagPicker.append(first);

  for (const groupName of Object.keys(tagGroups)) {
    const group = document.createElement("optgroup");
    group.label = groupName;

    for (const key of Object.keys(tagGroups[groupName])) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = tagGroups[groupName][key];
      group.append(option);
    }
    tagPicker.append(group);
  }
}

function renderTagChips() {
  tagChips.replaceChildren();

  for (const tag of chosenTags) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "tag-chip";
    chip.textContent = tagNames[tag] + " ✕";
    chip.addEventListener("click", function () {
      chosenTags.splice(chosenTags.indexOf(tag), 1);
      renderTagChips();
    });
    tagChips.append(chip);
  }

  tagCount.textContent = chosenTags.length + " of 10 chosen";
}

tagPicker.addEventListener("change", function () {
  const tag = tagPicker.value;
  tagPicker.value = "";

  if (!tag || chosenTags.includes(tag)) {
    return;
  }
  if (chosenTags.length >= 10) {
    message.textContent = "You can pick up to 10 tags.";
    return;
  }

  message.textContent = "";
  chosenTags.push(tag);
  renderTagChips();
});

function checkImage(file) {
  if (!extensions[file.type]) {
    return "Images must be PNG, JPEG or WebP.";
  }
  if (file.size > maxImageSize) {
    return "Each image must be 2 MB or smaller.";
  }
  return null;
}

async function uploadImage(file) {
  const path =
    currentUser.id + "/" + crypto.randomUUID() + "." + extensions[file.type];

  const { error } = await db.storage
    .from("covers")
    .upload(path, file, { contentType: file.type });

  if (error) {
    throw new Error(error.message);
  }
  return path;
}

async function removeImages(paths) {
  if (paths.length > 0) {
    await db.storage.from("covers").remove(paths);
  }
}

function gameFields() {
  return {
    title: value("title"),
    tagline: value("tagline"),
    description: value("description"),
    genre: value("genre"),
    tags: chosenTags.slice(),
    play_length: value("play_length"),
    players: value("players"),
    ai_art: value("ai_art"),
    ai_audio: value("ai_audio"),
    ai_writing: value("ai_writing"),
    ai_code: value("ai_code")
  };
}

function collectLinks() {
  const currency = value("currency");
  const links = [];

  for (const platform of platforms) {
    const url = value(platform + "_url");
    if (url === "") {
      continue;
    }

    const rule = urlRules[platform];
    if (!rule.pattern.test(url)) {
      return {
        problem:
          "The " + platformLabels[platform] + " link should look like " + rule.example + "."
      };
    }

    const priceType = value(platform + "_type");
    let priceCents = null;

    if (priceType === "paid") {
      const amount = Number(value(platform + "_price"));
      if (!(amount >= 0.01 && amount <= 1000)) {
        return {
          problem:
            "Enter a price between 0.01 and 1000 for " + platformLabels[platform] + "."
        };
      }
      priceCents = Math.round(amount * 100);
    }

    links.push({
      platform: platform,
      url: url,
      price_type: priceType,
      price_cents: priceCents,
      currency: currency
    });
  }

  if (links.length === 0) {
    return { problem: "Add at least one link so players can find your game." };
  }
  return { links: links };
}

function collectImages(required) {
  const coverFile = document.getElementById("cover").files[0] || null;
  const screenshotFiles = Array.from(document.getElementById("screenshots").files);

  if (required && !coverFile) {
    return { problem: "Choose a cover image." };
  }
  if (required && (screenshotFiles.length < 1 || screenshotFiles.length > 5)) {
    return { problem: "Add between 1 and 5 screenshots." };
  }
  if (screenshotFiles.length > 5) {
    return { problem: "Add up to 5 screenshots." };
  }

  const all = coverFile ? [coverFile].concat(screenshotFiles) : screenshotFiles;
  for (const file of all) {
    const problem = checkImage(file);
    if (problem) {
      return { problem: problem };
    }
  }

  return { coverFile: coverFile, screenshotFiles: screenshotFiles };
}

function describeGameError(error) {
  if (error.code === "23514") {
    return "Some details don't pass the checks: titles are up to 80 characters, the about text up to 2000, and you can pick up to 10 tags.";
  }
  if (error.code === "42501") {
    return "You need a developer account to do that.";
  }
  return error.message;
}

function describeLinkError(error) {
  if (error.code === "23514") {
    return "A link or price didn't pass the checks.";
  }
  if (error.code === "23505") {
    return "There is already a link for that platform.";
  }
  return error.message;
}

function showDone(text, gameId) {
  form.hidden = true;

  const view = document.createElement("a");
  view.href = "game.html?id=" + gameId;
  view.textContent = "View the game";

  const mine = document.createElement("a");
  mine.href = "my-games.html";
  mine.textContent = "My games";

  message.replaceChildren(text, view, " · ", mine);
}

async function createGame(links, images) {
  const uploaded = [];
  const screenshotPaths = [];
  let coverPath = null;

  try {
    coverPath = await uploadImage(images.coverFile);
    uploaded.push(coverPath);

    for (const file of images.screenshotFiles) {
      const path = await uploadImage(file);
      uploaded.push(path);
      screenshotPaths.push(path);
    }
  } catch (error) {
    await removeImages(uploaded);
    message.textContent = "Image upload failed: " + error.message;
    return;
  }

  const fields = gameFields();
  fields.cover_path = coverPath;
  fields.screenshots = screenshotPaths;

  const { data: game, error: gameError } = await db
    .from("games")
    .insert(fields)
    .select("id")
    .single();

  if (gameError) {
    await removeImages(uploaded);
    message.textContent = describeGameError(gameError);
    return;
  }

  const rows = links.map(function (link) {
    return {
      game_id: game.id,
      platform: link.platform,
      url: link.url,
      price_type: link.price_type,
      price_cents: link.price_cents,
      currency: link.currency
    };
  });

  const { error: linkError } = await db.from("game_links").insert(rows);

  if (linkError) {
    await db.from("games").delete().eq("id", game.id);
    await removeImages(uploaded);
    message.textContent = describeLinkError(linkError);
    return;
  }

  showDone("Published! Your game is live. ", game.id);
}

async function saveEdit(links, images) {
  const uploaded = [];
  const oldImages = [];
  const changes = gameFields();

  try {
    if (images.coverFile) {
      const path = await uploadImage(images.coverFile);
      uploaded.push(path);
      changes.cover_path = path;
      if (editingGame.cover_path) {
        oldImages.push(editingGame.cover_path);
      }
    }

    if (images.screenshotFiles.length > 0) {
      const paths = [];
      for (const file of images.screenshotFiles) {
        const path = await uploadImage(file);
        uploaded.push(path);
        paths.push(path);
      }
      changes.screenshots = paths;
      oldImages.push(...editingGame.screenshots);
    }
  } catch (error) {
    await removeImages(uploaded);
    message.textContent = "Image upload failed: " + error.message;
    return;
  }

  const { error: gameError } = await db
    .from("games")
    .update(changes)
    .eq("id", editingGame.id);

  if (gameError) {
    await removeImages(uploaded);
    message.textContent = describeGameError(gameError);
    return;
  }

  const wanted = {};
  for (const link of links) {
    wanted[link.platform] = link;
  }

  for (const platform of platforms) {
    const existing = existingLinks[platform];
    const link = wanted[platform];
    let result = null;

    if (link && existing) {
      result = await db
        .from("game_links")
        .update({
          url: link.url,
          price_type: link.price_type,
          price_cents: link.price_cents,
          currency: link.currency
        })
        .eq("id", existing.id);
    } else if (link) {
      result = await db.from("game_links").insert({
        game_id: editingGame.id,
        platform: link.platform,
        url: link.url,
        price_type: link.price_type,
        price_cents: link.price_cents,
        currency: link.currency
      });
    } else if (existing) {
      result = await db.from("game_links").delete().eq("id", existing.id);
    }

    if (result && result.error) {
      message.textContent =
        "Your details saved, but a link failed: " + describeLinkError(result.error);
      return;
    }
  }

  await removeImages(oldImages);
  showDone("Saved! Your changes are live. ", editingGame.id);
}

function prefill(game, links) {
  document.getElementById("title").value = game.title;
  taglineSelect.value = taglineNames[game.tagline] ? game.tagline : "";
  document.getElementById("description").value = game.description;
  genreSelect.value = genreNames[game.genre] ? game.genre : "other";

  chosenTags.length = 0;
  for (const tag of game.tags) {
    if (tagNames[tag]) {
      chosenTags.push(tag);
    }
  }
  renderTagChips();

  document.getElementById("play_length").value = game.play_length;
  document.getElementById("players").value = game.players;

  for (const id of aiIds) {
    document.getElementById(id).value = game[id];
  }
  updateCategoryNote();

  if (links.length > 0) {
    document.getElementById("currency").value = links[0].currency;
  }

  for (const link of links) {
    if (!platforms.includes(link.platform)) {
      continue;
    }

    const urlInput = document.getElementById(link.platform + "_url");
    const typeSelect = document.getElementById(link.platform + "_type");
    const priceInput = document.getElementById(link.platform + "_price");

    urlInput.value = link.url;
    typeSelect.value = link.price_type;
    if (link.price_type === "paid") {
      priceInput.value = (link.price_cents / 100).toFixed(2);
    }

    urlInput.dispatchEvent(new Event("input"));
    typeSelect.dispatchEvent(new Event("change"));
  }
}

function showCurrentImages(game) {
  const coverBox = document.createElement("div");
  coverBox.className = "current-images";
  if (game.cover_path) {
    const image = document.createElement("img");
    image.src = imageUrl(game.cover_path);
    image.alt = "Current cover";
    coverBox.append(image);
  }
  coverBox.append(hintLine("Current cover. Choose a new file only to replace it."));
  document.getElementById("cover").after(coverBox);

  const shotsBox = document.createElement("div");
  shotsBox.className = "current-images";
  for (const path of game.screenshots) {
    const image = document.createElement("img");
    image.src = imageUrl(path);
    image.alt = "Current screenshot";
    shotsBox.append(image);
  }
  shotsBox.append(
    hintLine("Current screenshots. Choosing new files replaces all of them.")
  );
  document.getElementById("screenshots").after(shotsBox);
}

async function loadForEdit() {
  if (!/^[0-9a-f-]{36}$/i.test(editId)) {
    gate.textContent = "That game wasn't found.";
    return false;
  }

  const { data, error } = await db
    .from("games")
    .select("*, game_links(id, platform, url, price_type, price_cents, currency)")
    .eq("id", editId)
    .eq("developer_id", currentUser.id)
    .maybeSingle();

  if (error || !data) {
    gate.textContent = "That game wasn't found, or it isn't yours.";
    return false;
  }

  editingGame = data;
  for (const link of data.game_links) {
    existingLinks[link.platform] = link;
  }

  pageTitle.textContent = "Edit your game";
  submitButton.textContent = "Save changes";
  document.getElementById("cover").required = false;
  document.getElementById("screenshots").required = false;

  prefill(data, data.game_links);
  showCurrentImages(data);
  return true;
}

async function init() {
  const { data: sessionData } = await db.auth.getSession();
  const session = sessionData.session;

  if (!session) {
    window.location.href = "auth.html";
    return;
  }

  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!profile || (profile.role !== "developer" && profile.role !== "admin")) {
    const link = document.createElement("a");
    link.href = "profile.html";
    link.textContent = "Open your profile";
    gate.append(
      "You need a developer account to publish. ",
      link,
      " and choose Become a developer."
    );
    return;
  }

  currentUser = session.user;

  if (editId) {
    const found = await loadForEdit();
    if (!found) {
      return;
    }
  }

  form.hidden = false;
  updateCategoryNote();
}

fillSelect(taglineSelect, taglineNames, "No tagline");
fillSelect(genreSelect, genreNames, "Choose a genre");
fillTagPicker();
renderTagChips();

for (const id of aiIds) {
  document.getElementById(id).addEventListener("change", updateCategoryNote);
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  message.textContent = "";

  if (!currentUser) {
    return;
  }

  const linkResult = collectLinks();
  if (linkResult.problem) {
    message.textContent = linkResult.problem;
    return;
  }

  const imageResult = collectImages(!editingGame);
  if (imageResult.problem) {
    message.textContent = imageResult.problem;
    return;
  }

  submitButton.disabled = true;
  message.textContent = editingGame ? "Saving..." : "Publishing...";

  if (editingGame) {
    await saveEdit(linkResult.links, imageResult);
  } else {
    await createGame(linkResult.links, imageResult);
  }

  submitButton.disabled = false;
});

window.addEventListener("load", init);