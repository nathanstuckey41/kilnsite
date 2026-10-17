const list = document.getElementById("my-list");
const messageBox = document.getElementById("my-message");

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

function totalClicks(game) {
  return game.game_links.reduce(function (sum, link) {
    return sum + link.clicks;
  }, 0);
}

function showEmpty() {
  const empty = el("p", null, "You haven't published any games yet. ");
  const link = el("a", null, "Publish your first one.");
  link.href = "publish.html";
  empty.append(link);
  list.replaceChildren(empty);
}

function buildRow(game) {
  const row = el("div", "my-row");

  const thumb = el("img", "my-thumb");
  thumb.alt = game.title + " cover";
  if (game.cover_path) {
    thumb.src = imageUrl(game.cover_path);
  }

  const info = el("div", "my-info");
  info.append(el("h3", null, game.title));
  info.append(
    el(
      "span",
      "status " + game.status,
      game.status === "live" ? "Live" : "Hidden"
    )
  );
  info.append(
    el("p", "hint", "Clicks sent to your store pages: " + totalClicks(game))
  );
  if (game.status !== "live") {
    info.append(el("p", "hint", "Hidden games aren't shown on Kiln."));
  }

  const actions = el("div", "my-actions");

  if (game.status === "live") {
    const view = el("a", "row-button", "View");
    view.href = "game.html?id=" + game.id;
    actions.append(view);
  }

  const edit = el("a", "row-button", "Edit");
  edit.href = "publish.html?edit=" + game.id;
  actions.append(edit);

  const remove = el("button", "row-button danger", "Delete");
  remove.type = "button";
  remove.addEventListener("click", async function () {
    if (!window.confirm("Delete " + game.title + "? This cannot be undone.")) {
      return;
    }

    remove.disabled = true;
    messageBox.textContent = "";

    const { error } = await db.from("games").delete().eq("id", game.id);

    if (error) {
      messageBox.textContent = "Couldn't delete: " + error.message;
      remove.disabled = false;
      return;
    }

    const files = [game.cover_path].concat(game.screenshots).filter(Boolean);
    if (files.length > 0) {
      await db.storage.from("covers").remove(files);
    }

    row.remove();
    if (list.children.length === 0) {
      showEmpty();
    }
  });
  actions.append(remove);

  row.append(thumb, info, actions);
  return row;
}

async function loadMyGames() {
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
    const link = el("a", null, "Open your profile");
    link.href = "profile.html";
    messageBox.append(
      "You need a developer account to list games. ",
      link,
      " and choose Become a developer."
    );
    return;
  }

  const { data, error } = await db
    .from("games")
    .select("id, title, status, cover_path, screenshots, created_at, game_links(clicks)")
    .eq("developer_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    messageBox.textContent = "Couldn't load your games. Try refreshing the page.";
    return;
  }

  if (data.length === 0) {
    showEmpty();
    return;
  }

  list.replaceChildren(...data.map(buildRow));
}

loadMyGames();