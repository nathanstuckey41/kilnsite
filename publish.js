const gate = document.getElementById("gate-message");
const form = document.getElementById("publish-form");
const message = document.getElementById("publish-message");
const categoryNote = document.getElementById("category-note");
const submitButton = form.querySelector("button[type='submit']");
const taglineSelect = document.getElementById("tagline");
const genreSelect = document.getElementById("genre");
const tagPicker = document.getElementById("tag-picker");
const tagChips = document.getElementById("tag-chips");
const tagCount = document.getElementById("tag-count");

const aiIds = ["ai_art", "ai_audio", "ai_writing", "ai_code"];
const platforms = ["steam", "itch", "newgrounds", "gamejolt", "website"];
const platformLabels = {
  steam: "Steam",
  itch: "itch.io",
  newgrounds: "Newgrounds",
  gamejolt: "Game Jolt",
  website: "your website"
};
const extensions = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const maxImageSize = 2 * 1024 * 1024;

let currentUser = null;
const chosenTags = [];

function value(id) {
  return document.getElementById(id).value.trim();
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

async function checkAccess() {
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

  const currency = value("currency");
  const links = [];

  for (const platform of platforms) {
    const url = value(platform + "_url");
    if (url === "") {
      continue;
    }

    const priceType = value(platform + "_type");
    let priceCents = null;

    if (priceType === "paid") {
      const amount = Number(value(platform + "_price"));
      if (!(amount >= 0.01 && amount <= 1000)) {
        message.textContent =
          "Enter a price between 0.01 and 1000 for " + platformLabels[platform] + ".";
        return;
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
    message.textContent = "Add at least one link so players can find your game.";
    return;
  }

  if (links.some(function (link) { return !link.url.startsWith("https://"); })) {
    message.textContent = "Every link must start with https://";
    return;
  }

  const coverFile = document.getElementById("cover").files[0];
  const screenshotFiles = Array.from(document.getElementById("screenshots").files);

  if (!coverFile) {
    message.textContent = "Choose a cover image.";
    return;
  }
  if (screenshotFiles.length < 1 || screenshotFiles.length > 5) {
    message.textContent = "Add between 1 and 5 screenshots.";
    return;
  }

  for (const file of [coverFile, ...screenshotFiles]) {
    const problem = checkImage(file);
    if (problem) {
      message.textContent = problem;
      return;
    }
  }

  submitButton.disabled = true;
  message.textContent = "Publishing...";

  const uploaded = [];
  let coverPath;
  const screenshotPaths = [];

  try {
    coverPath = await uploadImage(coverFile);
    uploaded.push(coverPath);

    for (const file of screenshotFiles) {
      const path = await uploadImage(file);
      uploaded.push(path);
      screenshotPaths.push(path);
    }
  } catch (error) {
    await removeImages(uploaded);
    message.textContent = "Image upload failed: " + error.message;
    submitButton.disabled = false;
    return;
  }

  const { data: game, error: gameError } = await db
    .from("games")
    .insert({
      title: value("title"),
      tagline: value("tagline"),
      description: value("description"),
      genre: value("genre"),
      tags: chosenTags,
      play_length: value("play_length"),
      players: value("players"),
      cover_path: coverPath,
      screenshots: screenshotPaths,
      ai_art: value("ai_art"),
      ai_audio: value("ai_audio"),
      ai_writing: value("ai_writing"),
      ai_code: value("ai_code")
    })
    .select("id")
    .single();

  if (gameError) {
    await removeImages(uploaded);

    if (gameError.code === "23514") {
      message.textContent =
        "Some details don't pass the checks: titles are up to 80 characters, the about text up to 2000, and you can pick up to 10 tags.";
    } else if (gameError.code === "42501") {
      message.textContent = "You need a developer account to publish.";
    } else {
      message.textContent = gameError.message;
    }
    submitButton.disabled = false;
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

    message.textContent =
      linkError.code === "23514"
        ? "A link or price didn't pass the checks. For example, the Steam link must be a store.steampowered.com/app/ address."
        : linkError.message;
    submitButton.disabled = false;
    return;
  }

  form.hidden = true;
  const home = document.createElement("a");
  home.href = "index.html";
  home.textContent = "Back to Kiln";
  message.replaceChildren("Published! Your game is live. ", home);
});

checkAccess();