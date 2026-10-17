const genreNames = {
  action: "Action",
  platformer: "Platformer",
  puzzle: "Puzzle",
  adventure: "Adventure",
  rpg: "RPG",
  strategy: "Strategy",
  simulation: "Simulation",
  horror: "Horror",
  narrative: "Narrative",
  shooter: "Shooter",
  sports_racing: "Sports and racing",
  other: "Other"
};

const lengthNames = {
  under_15_min: "Under 15 min",
  "15_to_60_min": "15 to 60 min",
  "1_to_3_hours": "1 to 3 hours",
  over_3_hours: "Over 3 hours"
};

const playerNames = {
  single: "Single player",
  multi: "Multiplayer",
  both: "Single and multiplayer"
};

const controlNames = {
  keyboard: "Keyboard",
  mouse: "Mouse",
  gamepad: "Gamepad",
  touch: "Touch"
};

const platformNames = {
  steam: "Steam",
  itch: "itch.io",
  newgrounds: "Newgrounds",
  gamejolt: "Game Jolt",
  website: "the developer's website",
  other: "another site"
};

const aiNames = {
  none: "No generative AI",
  assisted: "AI-assisted",
  mostly: "Mostly AI-generated"
};

function imageUrl(path) {
  return db.storage.from("covers").getPublicUrl(path).data.publicUrl;
}

function formatMoney(cents, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency
  }).format(cents / 100);
}

function priceSummary(links) {
  if (!links || links.length === 0) {
    return "";
  }
  if (links.some(function (link) { return link.price_type === "free"; })) {
    return "Free";
  }
  if (links.some(function (link) { return link.price_type === "pwyw"; })) {
    return "Pay what you want";
  }
  const prices = links
    .filter(function (link) { return link.price_type === "paid"; })
    .map(function (link) { return link.price_cents; });

  if (prices.length === 0) {
    return "";
  }
  return "From " + formatMoney(Math.min(...prices), links[0].currency);
}

function buttonLabel(link) {
  const name = platformNames[link.platform];

  if (link.price_type === "paid") {
    return "Buy on " + name + " · " + formatMoney(link.price_cents, link.currency);
  }
  if (link.price_type === "pwyw") {
    return "Get on " + name + " · Pay what you want";
  }
  return "Get it free on " + name;
}