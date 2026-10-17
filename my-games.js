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

function weekCutoff() {
  return new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function sumRows(rows, field, onlyRecent) {
  const cutoff = weekCutoff();
  let total = 0;
  for (const row of rows) {
    if (!onlyRecent || row.day >= cutoff) {
      total += row[field];
    }
  }
  return total;
}

function showEmpty() {
  const empty = el("p", null, "You haven't published any games yet. ");
  const link = el("a", null, "Publish your first one.");
  link.href = "publish.html";
  empty.append(link);
  list.replaceChildren(empty);
}

function buildStats(game) {
  const stats = el("div", "stats");

  const views = game.game_daily_stats;
  stats.append(
    el(
      "p",
      null,
      "Page views: " +
        sumRows(views, "views", false) +
        " total · " +
        sumRows(views, "views", true) +
        " in the last 7 days"
    )
  );

  const order = Object.keys(platformNames);
  const links = game.game_links.slice().sort(function (a, b) {
    return order.indexOf(a.platform) - order.indexOf(b.platform);
  });

  for (const link of links) {
    stats.append(
      el(
        "p",
        null,
        "Clicks to " +
          platformNames[link.platform] +
          ": " +
          link.clicks +
          " total · " +
          sumRows(link.link_daily_clicks, "clicks", true) +
          " in the last 7 days"
      )
    );
  }

  stats.append(
    el(
      "p",
      "hint",
      "Counted once per visitor session, so numbers are approximate."
    )
  );
  return stats;
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
  if (game.status !== "live") {
    info.append(el("p", "hint", "Hidden games aren't shown on Kiln."));
  }
  info.append(buildStats(game));

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
    .select(
      "id, title, status, cover_path, screenshots, created_at, game_daily_stats(day, views), game_links(id, platform, clicks, link_daily_clicks(day, clicks))"
    )
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