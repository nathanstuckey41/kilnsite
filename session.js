async function updateNav() {
  const link = document.getElementById("auth-link");
  const { data } = await db.auth.getSession();

  if (!data.session) {
    return;
  }

  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", data.session.user.id)
    .maybeSingle();

  if (profile && (profile.role === "developer" || profile.role === "admin")) {
    const gamesLink = document.createElement("a");
    gamesLink.href = "my-games.html";
    gamesLink.textContent = "My games";
    link.before(gamesLink);
  }

  const profileLink = document.createElement("a");
  profileLink.href = "profile.html";
  profileLink.textContent = "Profile";
  link.before(profileLink);

  link.textContent = "Log out";
  link.href = "#";
  link.addEventListener("click", async function (event) {
    event.preventDefault();
    await db.auth.signOut();
    window.location.href = "index.html";
  });
}

updateNav();