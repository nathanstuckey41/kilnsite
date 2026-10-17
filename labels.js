const genreNames = {
  action: "Action",
  adventure: "Adventure",
  arcade: "Arcade",
  beat_em_up: "Beat 'em up",
  board_card: "Board and card",
  casual: "Casual",
  city_builder: "City builder",
  clicker_idle: "Clicker and idle",
  deckbuilder: "Deckbuilder",
  educational: "Educational",
  fighting: "Fighting",
  horror: "Horror",
  metroidvania: "Metroidvania",
  music_rhythm: "Music and rhythm",
  narrative: "Narrative",
  open_world: "Open world",
  party_trivia: "Party and trivia",
  platformer: "Platformer",
  point_and_click: "Point and click",
  puzzle: "Puzzle",
  roguelike: "Roguelike",
  rpg: "RPG",
  sandbox: "Sandbox",
  shooter: "Shooter",
  simulation: "Simulation",
  sports_racing: "Sports and racing",
  stealth: "Stealth",
  strategy: "Strategy",
  survival: "Survival",
  tactics: "Tactics",
  tower_defense: "Tower defense",
  visual_novel: "Visual novel",
  walking_sim: "Walking sim",
  other: "Other"
};

const taglineNames = {
  short_and_sweet: "Short and sweet",
  cozy_unwind: "A cozy game to unwind with",
  hard_rewarding: "Brutally hard, deeply rewarding",
  one_more_run: "Just one more run",
  easy_to_learn: "Easy to learn, hard to put down",
  made_in_a_jam: "Made for a game jam",
  solo_made: "Made by one person",
  tiny_team: "Made by a tiny team",
  story_first: "A story you'll remember",
  one_sitting: "Finish it in one sitting",
  brain_teaser: "A brain-teaser worth the headache",
  tense_unsettling: "Tense, dark, and unsettling",
  take_your_time: "Relax and take your time",
  fast_frantic: "Fast, frantic, and fun",
  best_with_friends: "Best with friends",
  retro_love_letter: "A love letter to retro games",
  strange_surreal: "Strange, surreal, and unforgettable",
  build_your_way: "Build it your way",
  explore_slowly: "Explore a world at your own pace",
  deep_to_master: "Easy to start, deep to master",
  hidden_gem: "A hidden gem you might have missed",
  still_growing: "Early and still growing",
  funny_throughout: "Funny from start to finish",
  quiet_emotional: "Quiet, emotional, and personal"
};

const tagGroups = {
  "Art style": {
    pixel_art: "Pixel art",
    hand_drawn: "Hand-drawn",
    cartoon: "Cartoon",
    anime: "Anime",
    low_poly: "Low poly",
    "3d": "3D",
    "2d": "2D",
    retro: "Retro",
    minimalist: "Minimalist",
    black_and_white: "Black and white",
    realistic: "Realistic",
    text_based: "Text-based"
  },
  "Mood": {
    cozy: "Cozy",
    relaxing: "Relaxing",
    wholesome: "Wholesome",
    funny: "Funny",
    emotional: "Emotional",
    atmospheric: "Atmospheric",
    dark: "Dark",
    spooky: "Spooky",
    mysterious: "Mysterious",
    surreal: "Surreal",
    challenging: "Challenging",
    fast_paced: "Fast-paced"
  },
  "Features": {
    singleplayer: "Singleplayer",
    multiplayer: "Multiplayer",
    local_coop: "Local co-op",
    online_coop: "Online co-op",
    pvp: "PvP",
    short: "Short",
    replayable: "Replayable",
    story_rich: "Story-rich",
    choices_matter: "Choices matter",
    multiple_endings: "Multiple endings",
    procedural: "Procedurally generated",
    physics: "Physics-based",
    exploration: "Exploration",
    crafting: "Crafting",
    base_building: "Base building",
    resource_management: "Resource management",
    one_button: "One-button controls",
    accessible: "Accessible"
  },
  "Themes": {
    fantasy: "Fantasy",
    sci_fi: "Sci-fi",
    space: "Space",
    medieval: "Medieval",
    post_apocalyptic: "Post-apocalyptic",
    cyberpunk: "Cyberpunk",
    noir: "Noir",
    western: "Western",
    historical: "Historical",
    mythology: "Mythology",
    ocean: "Ocean",
    nature: "Nature",
    cats: "Cats",
    dogs: "Dogs",
    robots: "Robots",
    zombies: "Zombies",
    detective: "Detective",
    magic: "Magic",
    pirates: "Pirates",
    ninjas: "Ninjas",
    dinosaurs: "Dinosaurs"
  }
};

const tagNames = {};
for (const group of Object.values(tagGroups)) {
  Object.assign(tagNames, group);
}

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

function fillSelect(select, names, firstLabel) {
  if (firstLabel !== undefined) {
    const first = document.createElement("option");
    first.value = "";
    first.textContent = firstLabel;
    select.append(first);
  }
  for (const key of Object.keys(names)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = names[key];
    select.append(option);
  }
}

function knownLabels(keys, names) {
  return keys
    .filter(function (key) { return names[key]; })
    .map(function (key) { return names[key]; });
}

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