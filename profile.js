const params = new URLSearchParams(window.location.search);
const viewedName = params.get("user");

const nameEl = document.getElementById("profile-name");
const roleEl = document.getElementById("profile-role");
const bioEl = document.getElementById("profile-bio");
const form = document.getElementById("edit-form");
const usernameInput = document.getElementById("username");
const bioInput = document.getElementById("bio");
const devButton = document.getElementById("dev-button");
const message = document.getElementById("profile-message");

async function loadProfile() {
  const { data: sessionData } = await db.auth.getSession();
  const session = sessionData.session;

  let query = db.from("profiles").select("id, username, bio, role");

  if (viewedName) {
    query = query.eq("username", viewedName);
  } else if (session) {
    query = query.eq("id", session.user.id);
  } else {
    window.location.href = "auth.html";
    return;
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    message.textContent = "Profile not found.";
    return;
  }

  nameEl.textContent = data.username;
  roleEl.textContent = data.role;
  bioEl.textContent = data.bio || "No bio yet.";

  const isOwn = session && session.user.id === data.id;

  if (isOwn) {
    form.hidden = false;
    usernameInput.value = data.username;
    bioInput.value = data.bio;

    if (data.role === "player") {
      devButton.hidden = false;
    }
  }
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  message.textContent = "Saving...";

  const { data: sessionData } = await db.auth.getSession();

  const { error } = await db
    .from("profiles")
    .update({
      username: usernameInput.value.trim(),
      bio: bioInput.value.trim()
    })
    .eq("id", sessionData.session.user.id);

  if (error) {
    if (error.code === "23505") {
      message.textContent = "That username is already taken.";
    } else if (error.code === "23514") {
      message.textContent =
        "Usernames are 3 to 24 letters, numbers, or underscores. Bios are up to 280 characters.";
    } else {
      message.textContent = error.message;
    }
  } else {
    nameEl.textContent = usernameInput.value.trim();
    bioEl.textContent = bioInput.value.trim() || "No bio yet.";
    message.textContent = "Saved.";
  }
});

devButton.addEventListener("click", async function () {
  const { error } = await db.rpc("become_developer");

  if (error) {
    message.textContent = error.message;
  } else {
    roleEl.textContent = "developer";
    devButton.hidden = true;
    message.textContent = "You're now a developer.";
  }
});

loadProfile();