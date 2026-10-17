async function updateNav() {
  const link = document.getElementById("auth-link");
  const { data } = await db.auth.getSession();

  if (data.session) {
    link.textContent = "Log out";
    link.href = "#";
    link.addEventListener("click", async function (event) {
      event.preventDefault();
      await db.auth.signOut();
      window.location.href = "index.html";
    });
  }
}

updateNav();