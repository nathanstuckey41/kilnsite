const gate = document.getElementById("gate-message");
const form = document.getElementById("publish-form");
const message = document.getElementById("publish-message");
const categoryNote = document.getElementById("category-note");
const submitButton = form.querySelector("button[type='submit']");

const aiIds = ["ai_art", "ai_audio", "ai_writing", "ai_code"];
let currentUser = null;

function value(id) {
  return document.getElementById(id).value.trim();
}

function parseTags(text) {
  const tags = [];
  for (const raw of text.split(",")) {
    const tag = raw.trim().toLowerCase();
    if (tag && tag.length <= 30 && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags.slice(0, 10);
}

function updateCategoryNote() {
  const allHuman = aiIds.every(function (id) {
    return value(id) === "none";
  });
  categoryNote.textContent = allHuman
    ? "This game will be labeled: no generative AI."
    : "This game will be labeled: uses generative AI.";
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
    gate.append("You need a developer account to publish. ", link, " and choose Become a developer.");
    return;
  }

  currentUser = session.user;
  form.hidden = false;
  updateCategoryNote();
}

for (const id of aiIds) {
  document.getElementById(id).addEventListener("change", updateCategoryNote);
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  message.textContent = "";

  if (!currentUser) {
    return;
  }

  const playUrl = value("play_url");
  const links = [
    { platform: "steam", url: value("steam_url") },
    { platform: "itch", url: value("itch_url") },
    { platform: "newgrounds", url: value("newgrounds_url") },
    { platform: "gamejolt", url: value("gamejolt_url") },
    { platform: "website", url: value("website_url") }
  ].filter(function (link) {
    return link.url !== "";
  });

  if (!playUrl && links.length === 0) {
    message.textContent = "Add at least one link so players can find your game.";
    return;
  }

  const allUrls = links.map(function (link) { return link.url; });
  if (playUrl) {
    allUrls.push(playUrl);
  }
  if (allUrls.some(function (url) { return !url.startsWith("https://"); })) {
    message.textContent = "Every link must start with https://";
    return;
  }

  const coverFile = document.getElementById("cover").files[0];
  const extensions = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

  if (!coverFile || !extensions[coverFile.type]) {
    message.textContent = "Choose a PNG, JPEG or WebP cover image.";
    return;
  }
  if (coverFile.size > 2 * 1024 * 1024) {
    message.textContent = "The cover image must be 2 MB or smaller.";
    return;
  }

  submitButton.disabled = true;
  message.textContent = "Publishing...";

  const coverPath =
    currentUser.id + "/" + crypto.randomUUID() + "." + extensions[coverFile.type];

  const { error: uploadError } = await db.storage
    .from("covers")
    .upload(coverPath, coverFile, { contentType: coverFile.type });

  if (uploadError) {
    message.textContent = "Cover upload failed: " + uploadError.message;
    submitButton.disabled = false;
    return;
  }

  const controls = Array.from(
    form.querySelectorAll("input[name='controls']:checked")
  ).map(function (box) {
    return box.value;
  });

  const { data: game, error: gameError } = await db
    .from("games")
    .insert({
      title: value("title"),
      tagline: value("tagline"),
      description: value("description"),
      genre: value("genre"),
      tags: parseTags(value("tags")),
      play_length: value("play_length"),
      players: value("players"),
      controls: controls,
      cover_path: coverPath,
      play_url: playUrl || null,
      ai_art: value("ai_art"),
      ai_audio: value("ai_audio"),
      ai_writing: value("ai_writing"),
      ai_code: value("ai_code")
    })
    .select("id")
    .single();

  if (gameError) {
    await db.storage.from("covers").remove([coverPath]);

    if (gameError.code === "23514") {
      message.textContent =
        "Some details don't pass the checks: titles up to 80 characters, taglines up to 120, descriptions up to 2000, and at most 10 tags.";
    } else if (gameError.code === "42501") {
      message.textContent = "You need a developer account to publish.";
    } else {
      message.textContent = gameError.message;
    }
    submitButton.disabled = false;
    return;
  }

  if (links.length > 0) {
    const rows = links.map(function (link) {
      return { game_id: game.id, platform: link.platform, url: link.url };
    });

    const { error: linkError } = await db.from("game_links").insert(rows);

    if (linkError) {
      await db.from("games").delete().eq("id", game.id);
      await db.storage.from("covers").remove([coverPath]);

      message.textContent =
        linkError.code === "23514"
          ? "One link doesn't match its platform. For example, the Steam link must be a store.steampowered.com/app/ address."
          : linkError.message;
      submitButton.disabled = false;
      return;
    }
  }

  form.hidden = true;
  const home = document.createElement("a");
  home.href = "index.html";
  home.textContent = "Back to Kiln";
  message.replaceChildren("Published! Your game is live. ", home);
});

checkAccess();