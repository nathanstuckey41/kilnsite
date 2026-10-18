const themes = [
  { key: "violet", name: "Violet night", bg: "#0e0c16", accent: "#9a7bff" },
  { key: "ocean", name: "Ocean", bg: "#0a1220", accent: "#4da3ff" },
  { key: "teal", name: "Teal ink", bg: "#0a1214", accent: "#2ee6c5" },
  { key: "forest", name: "Forest", bg: "#0b130e", accent: "#5ee08a" },
  { key: "rose", name: "Rose", bg: "#150d12", accent: "#ff6fa5" },
  { key: "paper", name: "Paper", bg: "#f5f6fa", accent: "#5b4bdb" }
];

const defaultTheme = "violet";

function savedTheme() {
  try {
    const key = localStorage.getItem("kiln-theme");
    if (themes.some(function (theme) { return theme.key === key; })) {
      return key;
    }
  } catch (error) {
    return defaultTheme;
  }
  return defaultTheme;
}

function applyTheme(key) {
  document.documentElement.setAttribute("data-theme", key);
}

function dotBackground(theme) {
  return (
    "linear-gradient(135deg, " + theme.bg + " 50%, " + theme.accent + " 50%)"
  );
}

function buildSwitcher() {
  const host = document.querySelector("header nav") || document.querySelector("header");
  if (!host) {
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "theme-switcher";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "theme-toggle";
  button.title = "Change color theme";
  button.setAttribute("aria-label", "Change color theme");
  button.setAttribute("aria-haspopup", "true");
  button.setAttribute("aria-expanded", "false");

  const mainDot = document.createElement("span");
  mainDot.className = "theme-dot";
  button.append(mainDot);

  const menu = document.createElement("div");
  menu.className = "theme-menu";
  menu.hidden = true;

  const options = [];

  function setOpen(open) {
    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  }

  function paint() {
    const current = document.documentElement.getAttribute("data-theme");
    for (const option of options) {
      option.element.classList.toggle("active", option.key === current);
    }
    const active = themes.find(function (theme) { return theme.key === current; });
    if (active) {
      mainDot.style.background = dotBackground(active);
    }
  }

  function choose(key) {
    applyTheme(key);
    try {
      localStorage.setItem("kiln-theme", key);
    } catch (error) {
      // storage unavailable, the theme still changes for this visit
    }
    paint();
    setOpen(false);
  }

  for (const theme of themes) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "theme-option";

    const dot = document.createElement("span");
    dot.className = "theme-dot";
    dot.style.background = dotBackground(theme);

    item.append(dot, theme.name);
    item.addEventListener("click", function () {
      choose(theme.key);
    });

    menu.append(item);
    options.push({ key: theme.key, element: item });
  }

  button.addEventListener("click", function (event) {
    event.stopPropagation();
    setOpen(menu.hidden);
  });

  document.addEventListener("click", function (event) {
    if (!wrap.contains(event.target)) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });

  wrap.append(button, menu);
  host.append(wrap);
  paint();
}

applyTheme(savedTheme());
document.addEventListener("DOMContentLoaded", buildSwitcher);