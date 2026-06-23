(function () {
  "use strict";

  const VERSION = "0.1.0";
  const STORAGE_KEY = "astralForgeIdleSaveV1";
  const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
  const AUTOSAVE_MS = 12000;

  const stateTemplate = () => ({
    version: VERSION,
    created: false,
    name: "Wanderer",
    path: "Stargazer",
    theme: "aurora",
    view: "overview",
    gold: 25,
    hp: 48,
    currentAction: null,
    actionProgress: 0,
    lastTick: Date.now(),
    lastSave: Date.now(),
    inventory: {
      "Moonleaf Brew": 2,
      "Glassfin Stew": 1
    },
    equipment: {
      weapon: null,
      armor: null,
      charm: null,
      tool: null
    },
    skills: Object.fromEntries(SKILL_KEYS.map((key) => [key, { xp: 0 }])),
    kills: {},
    crafted: {},
    gathered: {},
    quests: {},
    achievements: {},
    stats: {
      playTimeSec: 0,
      actionsCompleted: 0,
      deaths: 0,
      monstersDefeated: 0,
      offlineGains: 0
    },
    log: []
  });

  const SKILL_KEYS = [
    "Blade", "Guard", "Pulse", "Vitality", "Prospecting", "Angling", "Grovekeeping", "Herbcraft", "Forging", "Cookery", "Weaving", "Alchemy"
  ];

  const SKILL_INFO = {
    Blade: { group: "Combat", note: "Boosts weapon damage." },
    Guard: { group: "Combat", note: "Reduces incoming damage." },
    Pulse: { group: "Combat", note: "Improves arcane strikes." },
    Vitality: { group: "Combat", note: "Raises maximum health." },
    Prospecting: { group: "Gathering", note: "Finds ore, shards, and coal." },
    Angling: { group: "Gathering", note: "Catches strange fish." },
    Grovekeeping: { group: "Gathering", note: "Gathers living wood and fiber." },
    Herbcraft: { group: "Gathering", note: "Harvests herbs and spores." },
    Forging: { group: "Processing", note: "Makes blades, armor, and tools." },
    Cookery: { group: "Processing", note: "Turns food into healing meals." },
    Weaving: { group: "Processing", note: "Makes charms and light armor." },
    Alchemy: { group: "Processing", note: "Brews potions and strange catalysts." }
  };

  const ITEMS = {
    "Prism Ore": { type: "material", value: 3, desc: "Mineral that refracts little stars." },
    "Ember Coal": { type: "material", value: 5, desc: "Warm coal that never quite goes dark." },
    "Lumenwood": { type: "material", value: 3, desc: "Pale wood with a faint inner glow." },
    "Echo Silk": { type: "material", value: 6, desc: "Thread that hums after it is touched." },
    "Glassfin": { type: "material", value: 4, desc: "A clear fish with a silver spine." },
    "Moonleaf": { type: "material", value: 4, desc: "Soft leaf used in gentle potions." },
    "Sporecap": { type: "material", value: 5, desc: "Tiny cap that pops with glittering dust." },
    "Stardust": { type: "material", value: 2, desc: "Grainy dust left by small astral creatures." },
    "Clock Spring": { type: "material", value: 10, desc: "A spring that twitches to unheard ticks." },
    "Prism Dagger": { type: "equipment", slot: "weapon", value: 50, stats: { attack: 4 }, desc: "A starter weapon with a sharp split-light edge." },
    "Cinder Pike": { type: "equipment", slot: "weapon", value: 140, stats: { attack: 9, pulse: 2 }, desc: "A hot spear made for longer hunts." },
    "Lumen Vest": { type: "equipment", slot: "armor", value: 85, stats: { defense: 5, maxHp: 12 }, desc: "Light armor woven around living bark." },
    "Echo Mantle": { type: "equipment", slot: "armor", value: 210, stats: { defense: 9, maxHp: 26 }, desc: "A soft mantle that repeats incoming force." },
    "Mote Lens": { type: "equipment", slot: "charm", value: 120, stats: { attack: 2, defense: 2, pulse: 3 }, desc: "A charm that focuses nervous starlight." },
    "Prospector Kit": { type: "equipment", slot: "tool", value: 60, stats: { gathering: 1 }, desc: "A compact kit for careful gathering." },
    "Glassfin Stew": { type: "consumable", value: 18, heal: 35, desc: "A warm meal. Restores 35 health." },
    "Moonleaf Brew": { type: "consumable", value: 22, heal: 52, desc: "A sweet potion. Restores 52 health." },
    "Star Salt Tonic": { type: "consumable", value: 48, heal: 90, desc: "A bright tonic. Restores 90 health." }
  };

  const SPRITES = {
    hero: `<svg viewBox="0 0 128 128" role="img" aria-label="stellar wanderer"><defs><linearGradient id="h1" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7dd3fc"/><stop offset="1" stop-color="#c084fc"/></linearGradient></defs><circle cx="64" cy="64" r="58" fill="#16213b"/><path d="M33 95c4-20 17-31 31-31s28 11 31 31" fill="url(#h1)"/><circle cx="64" cy="45" r="21" fill="#f6d8b9"/><path d="M42 47c5-27 37-31 45-3-10-7-24-11-45 3z" fill="#271a35"/><path d="M28 96h72l10 22H18z" fill="#0b1020"/><circle cx="50" cy="48" r="3" fill="#1d2540"/><circle cx="77" cy="48" r="3" fill="#1d2540"/><path d="M54 61c5 4 14 4 19 0" stroke="#7f4f46" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M97 22l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" fill="#fef3c7"/></svg>`,
    ore: `<svg viewBox="0 0 128 128" role="img" aria-label="prism ore"><path d="M64 8l41 28-9 62-32 22-32-22-9-62z" fill="#172033"/><path d="M64 12l29 27-7 52-22 21-22-21-7-52z" fill="#7dd3fc"/><path d="M64 12v100L42 91l22-79z" fill="#c084fc" opacity="0.85"/><path d="M64 12l22 79-22 21z" fill="#38bdf8" opacity="0.82"/><path d="M40 40h48M45 77h38" stroke="#f8fafc" stroke-width="4" opacity="0.5"/></svg>`,
    wood: `<svg viewBox="0 0 128 128" role="img" aria-label="lumenwood"><path d="M61 111c-6-25-9-50-5-88l17-5c-3 33 1 63 10 91z" fill="#8b5e34"/><path d="M52 23c-17 8-25 23-20 38 13-3 24-11 32-28z" fill="#5eead4"/><path d="M73 19c20 3 33 15 35 34-18 1-30-7-39-25z" fill="#86efac"/><path d="M62 36c-21 5-33 19-34 38 21 3 37-7 45-28z" fill="#34d399"/><path d="M80 45c19 3 30 15 33 33-18 2-32-6-40-25z" fill="#2dd4bf"/></svg>`,
    fish: `<svg viewBox="0 0 128 128" role="img" aria-label="glassfin"><path d="M18 68c20-31 64-32 88-5 5-7 11-12 17-15-1 13-1 26 0 39-7-3-13-8-18-15-25 24-67 22-87-4z" fill="#7dd3fc" opacity="0.78"/><circle cx="44" cy="61" r="5" fill="#0f172a"/><path d="M70 46c-8-18-20-24-38-22 8 11 17 18 34 28z" fill="#c084fc" opacity="0.78"/><path d="M68 84c-7 12-18 17-34 17 9-11 17-18 34-27z" fill="#5eead4" opacity="0.72"/><path d="M21 68h88" stroke="#f8fafc" stroke-width="3" opacity="0.65"/></svg>`,
    herb: `<svg viewBox="0 0 128 128" role="img" aria-label="moonleaf"><path d="M63 113c4-30 4-61 1-93" stroke="#b2f5ea" stroke-width="8" stroke-linecap="round"/><path d="M60 46C37 17 17 18 9 29c14 26 34 34 55 24z" fill="#86efac"/><path d="M68 39c18-31 41-32 52-19-11 27-29 38-53 27z" fill="#5eead4"/><path d="M62 76c-25-17-44-12-51 1 18 19 37 23 55 8z" fill="#34d399"/><path d="M68 78c21-22 42-20 52-8-15 23-35 30-56 17z" fill="#a7f3d0"/></svg>`,
    forge: `<svg viewBox="0 0 128 128" role="img" aria-label="astral forge"><path d="M24 91h80v23H24z" fill="#273449"/><path d="M32 61h64l8 30H24z" fill="#475569"/><path d="M40 64c-2-21 10-31 24-48 14 17 26 27 24 48-3 25-45 25-48 0z" fill="#fb923c"/><path d="M54 68c-1-12 5-20 10-29 8 10 13 18 11 29-1 15-20 15-21 0z" fill="#fde68a"/><path d="M35 92h58" stroke="#94a3b8" stroke-width="5"/></svg>`,
    brew: `<svg viewBox="0 0 128 128" role="img" aria-label="potion"><path d="M49 13h30v26l24 42c9 16-2 35-21 35H46c-19 0-30-19-21-35l24-42z" fill="#23304d"/><path d="M50 15h28v12H50z" fill="#94a3b8"/><path d="M39 76h50l13 25c-5 9-10 13-20 13H46c-10 0-16-4-20-13z" fill="#5eead4"/><circle cx="54" cy="89" r="5" fill="#ecfeff" opacity="0.74"/><circle cx="75" cy="97" r="7" fill="#ecfeff" opacity="0.46"/></svg>`,
    mossMote: `<svg viewBox="0 0 128 128" role="img" aria-label="moss mote"><circle cx="64" cy="67" r="38" fill="#65a30d"/><path d="M31 57c-15-3-21-12-20-25 13 1 23 8 28 22zM91 51c9-14 20-19 32-15-2 14-12 22-29 22zM47 32c-7-15-3-27 7-35 8 10 9 22 0 36z" fill="#86efac"/><circle cx="50" cy="61" r="6" fill="#0f172a"/><circle cx="78" cy="61" r="6" fill="#0f172a"/><path d="M51 83c9 6 19 6 28 0" stroke="#17321a" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
    cinderLynx: `<svg viewBox="0 0 128 128" role="img" aria-label="cinderhorn lynx"><path d="M27 55l12-30 15 25 22-1 16-25 10 34c13 13 13 35 0 48-18 18-58 18-76 0-14-14-13-37 1-51z" fill="#b45309"/><path d="M38 29l12 22-19-7zM91 29l-12 22 20-7z" fill="#fed7aa"/><circle cx="50" cy="70" r="5" fill="#111827"/><circle cx="78" cy="70" r="5" fill="#111827"/><path d="M58 82h12l-6 7z" fill="#111827"/><path d="M40 102c15 9 33 9 49 0" stroke="#7c2d12" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M21 36l9 7 4-12M106 36l-8 8-5-13" stroke="#f97316" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
    glassEel: `<svg viewBox="0 0 128 128" role="img" aria-label="glassfin eel"><path d="M15 74c22-44 68-48 101-16-7 4-13 9-18 16 7 4 13 9 18 16-41 20-73 13-101-16z" fill="#67e8f9" opacity="0.72"/><path d="M20 74c28 8 57 8 87 0" stroke="#f8fafc" stroke-width="4" opacity="0.7"/><circle cx="44" cy="63" r="5" fill="#0f172a"/><path d="M70 44l7-25 14 27M75 101l8-22 13 18" fill="#a78bfa" opacity="0.8"/></svg>`,
    clockHeron: `<svg viewBox="0 0 128 128" role="img" aria-label="clockwork heron"><path d="M66 23c17 4 29 17 30 34 0 19-14 34-33 34-17 0-31-12-34-28L7 47l24-6c5-15 19-22 35-18z" fill="#94a3b8"/><path d="M70 36c10 4 16 12 16 22 0 12-10 22-22 22-11 0-20-8-22-18l-12-9 15-4c3-10 13-15 25-13z" fill="#334155"/><circle cx="64" cy="58" r="16" fill="#f8fafc"/><path d="M64 46v12l8 6" stroke="#0f172a" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="82" cy="46" r="4" fill="#111827"/><path d="M62 90l-8 26M75 89l13 24" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/><path d="M39 53L6 47l33-8" fill="#fbbf24"/></svg>`,
    prismWyrm: `<svg viewBox="0 0 128 128" role="img" aria-label="prism wyrm"><path d="M22 85c4-37 32-61 72-59 20 1 33 17 24 33-6 11-19 12-31 7-20-9-36 2-43 23 23-17 48-8 61 16-27 15-65 16-83-20z" fill="#7c3aed"/><path d="M78 26l19-18 3 27M43 64l-26-6 16 21" fill="#22d3ee"/><circle cx="99" cy="44" r="5" fill="#f8fafc"/><path d="M58 82c15-10 29-9 44 4" stroke="#f0abfc" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M43 95c20 13 43 13 70 0" stroke="#312e81" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,
    boss: `<svg viewBox="0 0 128 128" role="img" aria-label="hollow star guardian"><defs><linearGradient id="b1" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fbbf24"/><stop offset="0.5" stop-color="#38bdf8"/><stop offset="1" stop-color="#c084fc"/></linearGradient></defs><path d="M64 6l13 39 41 1-33 24 12 40-33-24-33 24 12-40-33-24 41-1z" fill="url(#b1)"/><circle cx="64" cy="64" r="28" fill="#101727"/><circle cx="54" cy="60" r="5" fill="#f8fafc"/><circle cx="75" cy="60" r="5" fill="#f8fafc"/><path d="M52 77c8 5 17 5 25 0" stroke="#f8fafc" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`
  };

  const SKILL_ACTIONS = [
    {
      id: "prism_outcrop",
      name: "Chip Prism Outcrops",
      skill: "Prospecting",
      level: 1,
      duration: 5200,
      sprite: "ore",
      xp: 16,
      desc: "Break small crystalline rocks for basic metal and dust.",
      rewards: [
        { item: "Prism Ore", min: 1, max: 2, chance: 1 },
        { item: "Stardust", min: 1, max: 2, chance: 0.35 },
        { item: "Ember Coal", min: 1, max: 1, chance: 0.18 }
      ]
    },
    {
      id: "ember_vein",
      name: "Trace Ember Veins",
      skill: "Prospecting",
      level: 6,
      duration: 7800,
      sprite: "ore",
      xp: 31,
      desc: "Follow warm seams below the floating roadstones.",
      rewards: [
        { item: "Prism Ore", min: 2, max: 4, chance: 1 },
        { item: "Ember Coal", min: 1, max: 3, chance: 0.72 },
        { item: "Clock Spring", min: 1, max: 1, chance: 0.08 }
      ]
    },
    {
      id: "lumen_grove",
      name: "Prune Lumen Groves",
      skill: "Grovekeeping",
      level: 1,
      duration: 5000,
      sprite: "wood",
      xp: 15,
      desc: "Gather glowing boughs without waking the roots.",
      rewards: [
        { item: "Lumenwood", min: 1, max: 2, chance: 1 },
        { item: "Echo Silk", min: 1, max: 1, chance: 0.16 }
      ]
    },
    {
      id: "echo_copse",
      name: "Listen to Echo Copse",
      skill: "Grovekeeping",
      level: 7,
      duration: 8500,
      sprite: "wood",
      xp: 36,
      desc: "Harvest wood and silk by following repeated birdcalls.",
      rewards: [
        { item: "Lumenwood", min: 2, max: 4, chance: 1 },
        { item: "Echo Silk", min: 1, max: 3, chance: 0.65 },
        { item: "Stardust", min: 2, max: 5, chance: 0.25 }
      ]
    },
    {
      id: "glass_stream",
      name: "Angle in Glass Streams",
      skill: "Angling",
      level: 1,
      duration: 5600,
      sprite: "fish",
      xp: 18,
      desc: "Catch clear fish slipping between mirrored reeds.",
      rewards: [
        { item: "Glassfin", min: 1, max: 2, chance: 1 },
        { item: "Stardust", min: 1, max: 2, chance: 0.22 }
      ]
    },
    {
      id: "silver_tide",
      name: "Skim the Silver Tide",
      skill: "Angling",
      level: 8,
      duration: 9000,
      sprite: "fish",
      xp: 42,
      desc: "Pull bigger catches from rivers that only appear at night.",
      rewards: [
        { item: "Glassfin", min: 3, max: 5, chance: 1 },
        { item: "Clock Spring", min: 1, max: 1, chance: 0.1 },
        { item: "Stardust", min: 2, max: 4, chance: 0.38 }
      ]
    },
    {
      id: "moonleaf_patches",
      name: "Tend Moonleaf Patches",
      skill: "Herbcraft",
      level: 1,
      duration: 5400,
      sprite: "herb",
      xp: 17,
      desc: "Clip pale leaves before sunrise burns the dew away.",
      rewards: [
        { item: "Moonleaf", min: 1, max: 2, chance: 1 },
        { item: "Sporecap", min: 1, max: 1, chance: 0.2 }
      ]
    },
    {
      id: "spore_cavern",
      name: "Map Spore Caverns",
      skill: "Herbcraft",
      level: 6,
      duration: 8200,
      sprite: "herb",
      xp: 33,
      desc: "Gather luminous caps while the cavern breathes.",
      rewards: [
        { item: "Moonleaf", min: 2, max: 4, chance: 0.8 },
        { item: "Sporecap", min: 1, max: 3, chance: 1 },
        { item: "Stardust", min: 1, max: 3, chance: 0.42 }
      ]
    }
  ];

  const RECIPES = [
    {
      id: "glassfin_stew",
      name: "Glassfin Stew",
      result: "Glassfin Stew",
      qty: 1,
      skill: "Cookery",
      level: 1,
      duration: 6200,
      xp: 24,
      sprite: "fish",
      desc: "A simple healing meal for early hunts.",
      ingredients: { "Glassfin": 2, "Moonleaf": 1 }
    },
    {
      id: "moonleaf_brew",
      name: "Moonleaf Brew",
      result: "Moonleaf Brew",
      qty: 1,
      skill: "Alchemy",
      level: 1,
      duration: 6500,
      xp: 25,
      sprite: "brew",
      desc: "A reliable potion brewed from leaves and dust.",
      ingredients: { "Moonleaf": 2, "Stardust": 3 }
    },
    {
      id: "prism_dagger",
      name: "Prism Dagger",
      result: "Prism Dagger",
      qty: 1,
      skill: "Forging",
      level: 2,
      duration: 8200,
      xp: 46,
      sprite: "forge",
      desc: "A sharp first weapon with better attack power.",
      ingredients: { "Prism Ore": 6, "Lumenwood": 2, "Ember Coal": 1 }
    },
    {
      id: "lumen_vest",
      name: "Lumen Vest",
      result: "Lumen Vest",
      qty: 1,
      skill: "Weaving",
      level: 3,
      duration: 9000,
      xp: 52,
      sprite: "wood",
      desc: "Light armor that adds defense and health.",
      ingredients: { "Lumenwood": 7, "Echo Silk": 3, "Stardust": 4 }
    },
    {
      id: "prospector_kit",
      name: "Prospector Kit",
      result: "Prospector Kit",
      qty: 1,
      skill: "Forging",
      level: 5,
      duration: 10500,
      xp: 72,
      sprite: "ore",
      desc: "A utility tool that improves gathering rolls.",
      ingredients: { "Prism Ore": 12, "Ember Coal": 4, "Clock Spring": 1 }
    },
    {
      id: "cinder_pike",
      name: "Cinder Pike",
      result: "Cinder Pike",
      qty: 1,
      skill: "Forging",
      level: 9,
      duration: 12800,
      xp: 110,
      sprite: "forge",
      desc: "A stronger weapon for mid-tier creatures.",
      ingredients: { "Prism Ore": 24, "Ember Coal": 10, "Clock Spring": 2 }
    },
    {
      id: "echo_mantle",
      name: "Echo Mantle",
      result: "Echo Mantle",
      qty: 1,
      skill: "Weaving",
      level: 10,
      duration: 13200,
      xp: 122,
      sprite: "wood",
      desc: "A stronger armor piece woven from echo silk.",
      ingredients: { "Echo Silk": 16, "Lumenwood": 18, "Sporecap": 5 }
    },
    {
      id: "mote_lens",
      name: "Mote Lens",
      result: "Mote Lens",
      qty: 1,
      skill: "Alchemy",
      level: 7,
      duration: 11200,
      xp: 90,
      sprite: "brew",
      desc: "A combat charm tuned with dust and spores.",
      ingredients: { "Stardust": 22, "Sporecap": 6, "Clock Spring": 1 }
    },
    {
      id: "star_salt_tonic",
      name: "Star Salt Tonic",
      result: "Star Salt Tonic",
      qty: 1,
      skill: "Alchemy",
      level: 9,
      duration: 11600,
      xp: 105,
      sprite: "brew",
      desc: "A stronger healing tonic for dangerous areas.",
      ingredients: { "Moonleaf": 8, "Sporecap": 4, "Stardust": 12 }
    }
  ];

  const AREAS = [
    {
      id: "mote_garden",
      name: "Mote Garden",
      req: 1,
      sprite: "mossMote",
      desc: "A quiet ruin full of rolling green sparks.",
      enemies: [
        { name: "Moss Mote", sprite: "mossMote", hp: 20, attack: 3, defense: 0, gold: [2, 5], xp: { Blade: 9, Guard: 5, Vitality: 6 }, loot: [{ item: "Stardust", min: 1, max: 2, chance: 0.9 }, { item: "Moonleaf", min: 1, max: 1, chance: 0.22 }] },
        { name: "Sprig Glimmer", sprite: "mossMote", hp: 26, attack: 4, defense: 1, gold: [3, 6], xp: { Blade: 11, Guard: 6, Vitality: 7 }, loot: [{ item: "Lumenwood", min: 1, max: 2, chance: 0.55 }, { item: "Stardust", min: 1, max: 3, chance: 0.65 }] }
      ]
    },
    {
      id: "cinder_court",
      name: "Cinder Court",
      req: 4,
      sprite: "cinderLynx",
      desc: "Burnt tiles, orange grass, and prowling horned cats.",
      enemies: [
        { name: "Cinderhorn Lynx", sprite: "cinderLynx", hp: 48, attack: 8, defense: 2, gold: [7, 13], xp: { Blade: 22, Guard: 13, Vitality: 14 }, loot: [{ item: "Ember Coal", min: 1, max: 3, chance: 0.72 }, { item: "Prism Ore", min: 1, max: 2, chance: 0.36 }] },
        { name: "Ash Prowler", sprite: "cinderLynx", hp: 62, attack: 9, defense: 3, gold: [9, 16], xp: { Blade: 27, Guard: 16, Vitality: 17 }, loot: [{ item: "Ember Coal", min: 2, max: 4, chance: 0.75 }, { item: "Clock Spring", min: 1, max: 1, chance: 0.1 }] }
      ]
    },
    {
      id: "mirror_marsh",
      name: "Mirror Marsh",
      req: 8,
      sprite: "glassEel",
      desc: "A mirrored wetland where fish bite back.",
      enemies: [
        { name: "Glassfin Eel", sprite: "glassEel", hp: 78, attack: 12, defense: 4, gold: [14, 24], xp: { Blade: 41, Guard: 23, Pulse: 10, Vitality: 23 }, loot: [{ item: "Glassfin", min: 2, max: 5, chance: 0.9 }, { item: "Echo Silk", min: 1, max: 2, chance: 0.23 }] },
        { name: "Clockwork Heron", sprite: "clockHeron", hp: 92, attack: 13, defense: 5, gold: [18, 28], xp: { Blade: 50, Guard: 28, Pulse: 16, Vitality: 26 }, loot: [{ item: "Clock Spring", min: 1, max: 2, chance: 0.42 }, { item: "Glassfin", min: 2, max: 4, chance: 0.7 }] }
      ]
    },
    {
      id: "prism_spire",
      name: "Prism Spire",
      req: 13,
      sprite: "prismWyrm",
      desc: "A vertical maze that sheds color like rain.",
      enemies: [
        { name: "Prism Wyrm", sprite: "prismWyrm", hp: 132, attack: 18, defense: 7, gold: [28, 46], xp: { Blade: 78, Guard: 42, Pulse: 32, Vitality: 38 }, loot: [{ item: "Prism Ore", min: 4, max: 8, chance: 0.85 }, { item: "Clock Spring", min: 1, max: 3, chance: 0.34 }, { item: "Stardust", min: 8, max: 16, chance: 0.75 }] },
        { name: "Hollow Star", sprite: "boss", hp: 190, attack: 24, defense: 9, gold: [55, 90], xp: { Blade: 115, Guard: 75, Pulse: 55, Vitality: 60 }, loot: [{ item: "Clock Spring", min: 2, max: 5, chance: 0.72 }, { item: "Sporecap", min: 4, max: 9, chance: 0.55 }, { item: "Stardust", min: 15, max: 30, chance: 1 }] }
      ]
    }
  ];

  const QUESTS = [
    {
      id: "first_glow",
      name: "First Glow",
      desc: "Gather 10 Prism Ore for the observatory lanterns.",
      type: "collect",
      item: "Prism Ore",
      qty: 10,
      rewards: { gold: 55, xp: { Prospecting: 80 }, items: { "Moonleaf Brew": 1 } }
    },
    {
      id: "quiet_garden",
      name: "Quiet the Garden",
      desc: "Defeat 8 Moss Motes or Sprig Glimmers in the Mote Garden.",
      type: "killAny",
      enemies: ["Moss Mote", "Sprig Glimmer"],
      qty: 8,
      rewards: { gold: 90, xp: { Blade: 120, Guard: 60 }, items: { "Prospector Kit": 1 } }
    },
    {
      id: "warm_pantry",
      name: "Warm Pantry",
      desc: "Craft 3 Glassfin Stews for the night watch.",
      type: "craft",
      item: "Glassfin Stew",
      qty: 3,
      rewards: { gold: 110, xp: { Cookery: 160 }, items: { "Stardust": 10 } }
    },
    {
      id: "bright_edge",
      name: "Bright Edge",
      desc: "Craft and equip a Prism Dagger.",
      type: "equip",
      item: "Prism Dagger",
      qty: 1,
      rewards: { gold: 135, xp: { Forging: 180, Blade: 90 }, items: { "Ember Coal": 5 } }
    },
    {
      id: "spires_call",
      name: "The Spire Calls",
      desc: "Defeat 3 Prism Wyrms or Hollow Stars.",
      type: "killAny",
      enemies: ["Prism Wyrm", "Hollow Star"],
      qty: 3,
      rewards: { gold: 420, xp: { Blade: 420, Guard: 240, Pulse: 180 }, items: { "Star Salt Tonic": 2, "Clock Spring": 3 } }
    }
  ];

  const ACHIEVEMENTS = [
    { id: "first_action", name: "First Spark", desc: "Complete any action.", check: (s) => s.stats.actionsCompleted >= 1, rewardGold: 15 },
    { id: "ten_kills", name: "Tiny Legend", desc: "Defeat 10 creatures.", check: (s) => s.stats.monstersDefeated >= 10, rewardGold: 60 },
    { id: "hundred_gold", name: "Coin Comet", desc: "Hold 100 gold at once.", check: (s) => s.gold >= 100, rewardGold: 35 },
    { id: "level_10", name: "Bright Apprentice", desc: "Reach level 10 in any skill.", check: (s) => Object.keys(s.skills).some((key) => getLevel(s, key) >= 10), rewardGold: 150 },
    { id: "crafted_gear", name: "Hands of Starlight", desc: "Craft 5 pieces of gear or consumables.", check: (s) => Object.values(s.crafted).reduce((a, b) => a + b, 0) >= 5, rewardGold: 100 }
  ];

  const MARKET = [
    { item: "Glassfin Stew", price: 32, type: "buy" },
    { item: "Moonleaf Brew", price: 44, type: "buy" },
    { item: "Prism Ore", price: 8, type: "buy" },
    { item: "Lumenwood", price: 8, type: "buy" },
    { item: "Moonleaf", price: 10, type: "buy" },
    { item: "Stardust", price: 6, type: "buy" }
  ];

  const NAV = [
    ["overview", "Overview", "Home"],
    ["combat", "Combat", "Hunt"],
    ["skills", "Skills", "Train"],
    ["crafting", "Crafting", "Make"],
    ["quests", "Quests", "Goals"],
    ["market", "Market", "Trade"],
    ["settings", "Settings", "Save"]
  ];

  let state = loadState();
  let app = null;
  let renderQueued = false;

  document.addEventListener("DOMContentLoaded", () => {
    app = document.getElementById("app");
    if (state.created) {
      applyOfflineProgress();
    }
    render();
    setInterval(gameLoop, 1000);
  });

  window.AF = {
    startNew,
    switchView,
    startSkillAction,
    startCraftAction,
    startCombat,
    stopAction,
    equipItem,
    useItem,
    sellItem,
    buyItem,
    claimQuest,
    changeTheme,
    saveNow,
    hardReset,
    exportSave,
    importSave
  };

  function loadState() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (err) {
      saved = null;
    }
    const base = stateTemplate();
    if (!saved || typeof saved !== "object") return base;
    const merged = deepMerge(base, saved);
    if (!merged.skills) merged.skills = {};
    SKILL_KEYS.forEach((key) => {
      if (!merged.skills[key]) merged.skills[key] = { xp: 0 };
    });
    if (!merged.quests) merged.quests = {};
    if (!merged.achievements) merged.achievements = {};
    return merged;
  }

  function deepMerge(base, extra) {
    if (!extra || typeof extra !== "object") return base;
    const out = Array.isArray(base) ? [...base] : { ...base };
    Object.keys(extra).forEach((key) => {
      if (extra[key] && typeof extra[key] === "object" && !Array.isArray(extra[key]) && base[key] && typeof base[key] === "object" && !Array.isArray(base[key])) {
        out[key] = deepMerge(base[key], extra[key]);
      } else {
        out[key] = extra[key];
      }
    });
    return out;
  }

  function startNew() {
    const nameInput = document.getElementById("nameInput");
    const selectedPath = document.querySelector("input[name='pathChoice']:checked");
    const selectedTheme = document.getElementById("themeSelect");
    const fresh = stateTemplate();
    fresh.created = true;
    fresh.name = sanitizeText(nameInput && nameInput.value ? nameInput.value.trim() : "Wanderer").slice(0, 24) || "Wanderer";
    fresh.path = selectedPath ? selectedPath.value : "Stargazer";
    fresh.theme = selectedTheme ? selectedTheme.value : "aurora";

    if (fresh.path === "Ironroot") {
      fresh.gold = 10;
      fresh.inventory = { "Glassfin Stew": 1 };
    }
    if (fresh.path === "Duskbound") {
      fresh.gold = 40;
      fresh.hp = 38;
      fresh.inventory = { "Moonleaf Brew": 1, "Glassfin Stew": 2 };
    }

    state = fresh;
    log(`Welcome, ${state.name}. The sky roads are open.`);
    saveNow(false);
    render();
  }

  function applyOfflineProgress() {
    const now = Date.now();
    const elapsed = Math.max(0, Math.min(now - (state.lastTick || now), MAX_OFFLINE_MS));
    if (elapsed >= 2500) {
      const beforeGold = state.gold;
      const beforeActions = state.stats.actionsCompleted || 0;
      processElapsed(elapsed, true);
      const gainedGold = Math.max(0, state.gold - beforeGold);
      const completed = Math.max(0, (state.stats.actionsCompleted || 0) - beforeActions);
      if (completed > 0 || gainedGold > 0) {
        state.stats.offlineGains += completed;
        log(`Offline progress: ${completed} action${completed === 1 ? "" : "s"} completed, ${gainedGold} gold gained.`);
      }
    }
    state.lastTick = now;
    saveNow(false);
  }

  function gameLoop() {
    if (!state.created) return;
    const now = Date.now();
    const elapsed = Math.max(0, Math.min(now - (state.lastTick || now), 5000));
    state.lastTick = now;
    if (elapsed > 0) processElapsed(elapsed, false);
    state.stats.playTimeSec += Math.floor(elapsed / 1000);
    checkAchievements();
    if (now - (state.lastSave || 0) > AUTOSAVE_MS) saveNow(false);
    requestRender();
  }

  function processElapsed(ms, offline) {
    const action = state.currentAction;
    if (!action) return;

    if (action.type === "skill") {
      state.actionProgress += ms;
      const def = SKILL_ACTIONS.find((a) => a.id === action.id);
      if (!def) return stopAction();
      while (state.actionProgress >= def.duration) {
        state.actionProgress -= def.duration;
        completeSkillAction(def, offline);
      }
      return;
    }

    if (action.type === "craft") {
      state.actionProgress += ms;
      const recipe = RECIPES.find((r) => r.id === action.id);
      if (!recipe) return stopAction();
      while (state.actionProgress >= recipe.duration) {
        state.actionProgress -= recipe.duration;
        if (!canCraft(recipe)) {
          log(`Stopped crafting ${recipe.result}: missing materials.`);
          stopAction();
          break;
        }
        completeRecipe(recipe, offline);
      }
      return;
    }

    if (action.type === "combat") {
      const seconds = Math.floor(ms / 1000);
      state.actionProgress += ms % 1000;
      if (state.actionProgress >= 1000) {
        state.actionProgress -= 1000;
        simulateCombatSecond(offline);
      }
      for (let i = 0; i < seconds; i += 1) simulateCombatSecond(offline);
    }
  }

  function completeSkillAction(def, offline) {
    const toolBonus = getEquipStats().gathering || 0;
    const xpBonus = 1 + toolBonus * 0.04;
    addXp(def.skill, Math.round(def.xp * xpBonus));
    grantRewards(def.rewards, toolBonus);
    state.stats.actionsCompleted += 1;
    addGathered(def.skill, 1);
    if (!offline) log(`${def.name} completed.`);
  }

  function completeRecipe(recipe, offline) {
    Object.entries(recipe.ingredients).forEach(([item, qty]) => removeItem(item, qty));
    addItem(recipe.result, recipe.qty);
    addXp(recipe.skill, recipe.xp);
    state.crafted[recipe.result] = (state.crafted[recipe.result] || 0) + recipe.qty;
    state.stats.actionsCompleted += 1;
    if (!offline) log(`Crafted ${recipe.qty} ${recipe.result}.`);
  }

  function simulateCombatSecond(offline) {
    const action = state.currentAction;
    if (!action || action.type !== "combat") return;
    const area = AREAS.find((a) => a.id === action.areaId);
    if (!area) return stopAction();
    if (!action.enemy) action.enemy = createEnemy(area);

    const enemy = action.enemy;
    const stats = getCombatStats();
    const playerHit = Math.max(1, rand(Math.floor(stats.attack * 0.55), Math.floor(stats.attack * 1.18)) - Math.floor(enemy.defense * 0.45));
    enemy.hp -= playerHit;

    if (enemy.hp <= 0) {
      finishEnemy(enemy, offline);
      action.enemy = createEnemy(area);
      return;
    }

    const enemyHit = Math.max(0, rand(Math.floor(enemy.attack * 0.62), Math.ceil(enemy.attack * 1.14)) - Math.floor(stats.defense * 0.32));
    state.hp = Math.max(0, state.hp - enemyHit);

    if (state.hp <= 0) {
      state.stats.deaths += 1;
      const maxHp = getMaxHp();
      state.hp = Math.max(1, Math.floor(maxHp * 0.55));
      log(`${state.name} retreated from ${enemy.name} and recovered at camp.`);
      stopAction();
    }
  }

  function finishEnemy(enemy, offline) {
    Object.entries(enemy.xp || {}).forEach(([skill, xp]) => addXp(skill, xp));
    const gold = rand(enemy.gold[0], enemy.gold[1]);
    state.gold += gold;
    grantRewards(enemy.loot || [], 0);
    state.kills[enemy.name] = (state.kills[enemy.name] || 0) + 1;
    state.stats.monstersDefeated += 1;
    state.stats.actionsCompleted += 1;
    if (!offline) log(`Defeated ${enemy.name} and found ${gold} gold.`);
  }

  function createEnemy(area) {
    const base = choose(area.enemies);
    const combatLevel = getCombatLevel();
    const scale = 1 + Math.max(0, combatLevel - area.req) * 0.035;
    return {
      name: base.name,
      sprite: base.sprite,
      maxHp: Math.round(base.hp * scale),
      hp: Math.round(base.hp * scale),
      attack: Math.round(base.attack * scale),
      defense: Math.round(base.defense * scale),
      gold: base.gold,
      xp: base.xp,
      loot: base.loot
    };
  }

  function startSkillAction(id) {
    const def = SKILL_ACTIONS.find((a) => a.id === id);
    if (!def) return;
    if (getLevel(state, def.skill) < def.level) return log(`Need ${def.skill} level ${def.level}.`);
    state.currentAction = { type: "skill", id };
    state.actionProgress = 0;
    log(`Started: ${def.name}.`);
    saveNow(false);
    render();
  }

  function startCraftAction(id) {
    const recipe = RECIPES.find((r) => r.id === id);
    if (!recipe) return;
    if (getLevel(state, recipe.skill) < recipe.level) return log(`Need ${recipe.skill} level ${recipe.level}.`);
    if (!canCraft(recipe)) return log(`Missing materials for ${recipe.result}.`);
    state.currentAction = { type: "craft", id };
    state.actionProgress = 0;
    log(`Started crafting ${recipe.result}.`);
    saveNow(false);
    render();
  }

  function startCombat(areaId) {
    const area = AREAS.find((a) => a.id === areaId);
    if (!area) return;
    if (getCombatLevel() < area.req) return log(`Need combat level ${area.req} for ${area.name}.`);
    state.hp = Math.min(state.hp || getMaxHp(), getMaxHp());
    state.currentAction = { type: "combat", areaId, enemy: createEnemy(area) };
    state.actionProgress = 0;
    log(`Hunting in ${area.name}.`);
    saveNow(false);
    render();
  }

  function stopAction() {
    state.currentAction = null;
    state.actionProgress = 0;
    saveNow(false);
    render();
  }

  function canCraft(recipe) {
    return Object.entries(recipe.ingredients).every(([item, qty]) => getItemQty(item) >= qty);
  }

  function grantRewards(rewards, bonus) {
    rewards.forEach((reward) => {
      const chance = Math.min(1, reward.chance + bonus * 0.025);
      if (Math.random() <= chance) {
        addItem(reward.item, rand(reward.min, reward.max));
      }
    });
  }

  function addItem(item, qty) {
    state.inventory[item] = (state.inventory[item] || 0) + qty;
  }

  function removeItem(item, qty) {
    state.inventory[item] = Math.max(0, (state.inventory[item] || 0) - qty);
    if (state.inventory[item] <= 0) delete state.inventory[item];
  }

  function getItemQty(item) {
    return state.inventory[item] || 0;
  }

  function addGathered(skill, qty) {
    state.gathered[skill] = (state.gathered[skill] || 0) + qty;
  }

  function equipItem(item) {
    const def = ITEMS[item];
    if (!def || def.type !== "equipment") return;
    if (getItemQty(item) <= 0) return;
    const slot = def.slot;
    const old = state.equipment[slot];
    removeItem(item, 1);
    if (old) addItem(old, 1);
    state.equipment[slot] = item;
    state.hp = Math.min(state.hp, getMaxHp());
    updateEquipQuest(item);
    log(`Equipped ${item}.`);
    saveNow(false);
    render();
  }

  function useItem(item) {
    const def = ITEMS[item];
    if (!def || def.type !== "consumable") return;
    if (getItemQty(item) <= 0) return;
    removeItem(item, 1);
    const before = state.hp;
    state.hp = Math.min(getMaxHp(), state.hp + (def.heal || 0));
    log(`Used ${item}. Restored ${state.hp - before} health.`);
    saveNow(false);
    render();
  }

  function sellItem(item, qty) {
    const def = ITEMS[item];
    const amount = Math.min(qty || 1, getItemQty(item));
    if (!def || amount <= 0) return;
    removeItem(item, amount);
    const value = Math.max(1, Math.floor((def.value || 1) * 0.55)) * amount;
    state.gold += value;
    log(`Sold ${amount} ${item} for ${value} gold.`);
    saveNow(false);
    render();
  }

  function buyItem(item) {
    const listing = MARKET.find((entry) => entry.item === item);
    if (!listing) return;
    if (state.gold < listing.price) return log(`Need ${listing.price} gold for ${item}.`);
    state.gold -= listing.price;
    addItem(item, 1);
    log(`Bought ${item}.`);
    saveNow(false);
    render();
  }

  function claimQuest(id) {
    const quest = QUESTS.find((q) => q.id === id);
    if (!quest) return;
    if (!isQuestReady(quest)) return log(`${quest.name} is not ready yet.`);
    if (state.quests[id] && state.quests[id].claimed) return;
    const rewards = quest.rewards || {};
    state.gold += rewards.gold || 0;
    Object.entries(rewards.items || {}).forEach(([item, qty]) => addItem(item, qty));
    Object.entries(rewards.xp || {}).forEach(([skill, xp]) => addXp(skill, xp));
    state.quests[id] = { claimed: true };
    log(`Quest complete: ${quest.name}.`);
    saveNow(false);
    render();
  }

  function updateEquipQuest(item) {
    QUESTS.filter((q) => q.type === "equip" && q.item === item).forEach((quest) => {
      if (!state.quests[quest.id]) state.quests[quest.id] = {};
      state.quests[quest.id].equipped = true;
    });
  }

  function isQuestReady(quest) {
    if (state.quests[quest.id] && state.quests[quest.id].claimed) return false;
    if (quest.type === "collect") return getItemQty(quest.item) >= quest.qty;
    if (quest.type === "craft") return (state.crafted[quest.item] || 0) >= quest.qty;
    if (quest.type === "equip") return Boolean(state.quests[quest.id] && state.quests[quest.id].equipped) || Object.values(state.equipment).includes(quest.item);
    if (quest.type === "killAny") {
      return quest.enemies.reduce((sum, enemy) => sum + (state.kills[enemy] || 0), 0) >= quest.qty;
    }
    return false;
  }

  function questProgress(quest) {
    if (quest.type === "collect") return Math.min(quest.qty, getItemQty(quest.item));
    if (quest.type === "craft") return Math.min(quest.qty, state.crafted[quest.item] || 0);
    if (quest.type === "equip") return isQuestReady(quest) ? 1 : 0;
    if (quest.type === "killAny") return Math.min(quest.qty, quest.enemies.reduce((sum, enemy) => sum + (state.kills[enemy] || 0), 0));
    return 0;
  }

  function checkAchievements() {
    ACHIEVEMENTS.forEach((ach) => {
      if (!state.achievements[ach.id] && ach.check(state)) {
        state.achievements[ach.id] = true;
        state.gold += ach.rewardGold || 0;
        log(`Achievement: ${ach.name}.`);
      }
    });
  }

  function addXp(skill, amount) {
    if (!state.skills[skill]) state.skills[skill] = { xp: 0 };
    const before = getLevel(state, skill);
    state.skills[skill].xp += Math.max(0, Math.round(amount));
    const after = getLevel(state, skill);
    if (after > before) log(`${skill} reached level ${after}.`);
  }

  function getLevel(s, skill) {
    const xp = (s.skills[skill] && s.skills[skill].xp) || 0;
    let level = 1;
    while (level < 99 && xp >= xpForLevel(level + 1)) level += 1;
    return level;
  }

  function xpForLevel(level) {
    if (level <= 1) return 0;
    return Math.floor(52 * Math.pow(level - 1, 2.08));
  }

  function xpProgress(s, skill) {
    const level = getLevel(s, skill);
    const xp = (s.skills[skill] && s.skills[skill].xp) || 0;
    const current = xpForLevel(level);
    const next = xpForLevel(level + 1);
    return {
      level,
      xp,
      into: xp - current,
      needed: next - current,
      pct: next === current ? 100 : clamp(((xp - current) / (next - current)) * 100, 0, 100)
    };
  }

  function getEquipStats() {
    const stats = {};
    Object.values(state.equipment || {}).forEach((item) => {
      const def = ITEMS[item];
      if (!def || !def.stats) return;
      Object.entries(def.stats).forEach(([key, val]) => {
        stats[key] = (stats[key] || 0) + val;
      });
    });
    return stats;
  }

  function getCombatStats() {
    const eq = getEquipStats();
    return {
      attack: getLevel(state, "Blade") * 2 + getLevel(state, "Pulse") + (eq.attack || 0) + (eq.pulse || 0),
      defense: getLevel(state, "Guard") * 2 + Math.floor(getLevel(state, "Vitality") / 2) + (eq.defense || 0),
      maxHp: getMaxHp()
    };
  }

  function getMaxHp() {
    const eq = getEquipStats();
    return 42 + getLevel(state, "Vitality") * 8 + (eq.maxHp || 0);
  }

  function getCombatLevel() {
    return Math.max(1, Math.floor((getLevel(state, "Blade") + getLevel(state, "Guard") + getLevel(state, "Pulse") + getLevel(state, "Vitality")) / 4));
  }

  function switchView(view) {
    state.view = view;
    render();
  }

  function changeTheme(value) {
    state.theme = value;
    saveNow(false);
    render();
  }

  function saveNow(showLog) {
    state.lastSave = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (showLog) log("Saved.");
    } catch (err) {
      log("Save failed. Browser storage may be full or disabled.");
    }
    requestRender();
  }

  function hardReset() {
    const ok = window.confirm("Reset this save and return to character creation?");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    state = stateTemplate();
    render();
  }

  function exportSave() {
    const area = document.getElementById("saveText");
    if (!area) return;
    area.value = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    area.select();
    log("Save exported into the text box.");
  }

  function importSave() {
    const area = document.getElementById("saveText");
    if (!area || !area.value.trim()) return;
    try {
      const imported = JSON.parse(decodeURIComponent(escape(atob(area.value.trim()))));
      const merged = deepMerge(stateTemplate(), imported);
      state = merged;
      state.lastTick = Date.now();
      saveNow(false);
      log("Imported save.");
      render();
    } catch (err) {
      log("Import failed. The save text was not valid.");
    }
  }

  function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    window.requestAnimationFrame(() => {
      renderQueued = false;
      render();
    });
  }

  function render() {
    if (!app) return;
    document.body.className = themeClass();
    if (!state.created) {
      app.innerHTML = renderStart();
      return;
    }
    app.innerHTML = `
      <div class="app-shell">
        ${renderTopbar()}
        <div class="game-grid">
          ${renderNav()}
          <main class="main-panel">${renderMain()}</main>
          <aside class="right-panel">${renderRightPanel()}</aside>
        </div>
        <div class="footer-note">Prototype build ${VERSION}. Client-side only. Autosaves in this browser.</div>
      </div>`;
  }

  function themeClass() {
    if (state.theme === "ember") return "theme-ember";
    if (state.theme === "jade") return "theme-jade";
    if (state.theme === "void") return "theme-void";
    return "";
  }

  function renderStart() {
    return `
      <section class="start-screen">
        <div class="start-card">
          <div class="hero-panel">
            <div class="brand-kicker">Original idle browser RPG prototype</div>
            <h1>Astral Forge Idle</h1>
            <p class="lede">Gather weird materials, train persistent skills, craft your first gear, and battle hand-drawn astral creatures while your character keeps moving forward.</p>
            <div class="feature-grid">
              <div class="feature"><strong>Idle actions</strong>Skills and crafts repeat until you switch tasks.</div>
              <div class="feature"><strong>Combat loop</strong>Hunt creatures, gain levels, loot materials, and push into harder zones.</div>
              <div class="feature"><strong>Crafting web</strong>Resources feed recipes for meals, potions, weapons, armor, and tools.</div>
              <div class="feature"><strong>Local save</strong>No account system. Progress stays in this browser.</div>
            </div>
            <div class="big-sprite-wrap">${SPRITES.hero}</div>
          </div>
          <div class="form-panel">
            <div>
              <h2>Create a wanderer</h2>
              <p class="muted">This is a distinct original game shell with fresh sprites and a shifted color UI.</p>
            </div>
            <label>Adventurer name
              <input id="nameInput" maxlength="24" placeholder="Nova" value="Nova" />
            </label>
            <div>
              <div class="small muted" style="margin-bottom:0.45rem">Starting path</div>
              <div class="mode-grid">
                <label class="mode-choice"><input type="radio" name="pathChoice" value="Stargazer" checked><div><strong>Stargazer</strong><span>Balanced start with extra healing supplies.</span></div></label>
                <label class="mode-choice"><input type="radio" name="pathChoice" value="Ironroot"><div><strong>Ironroot</strong><span>Low gold, fewer supplies, self-reliant progression.</span></div></label>
                <label class="mode-choice"><input type="radio" name="pathChoice" value="Duskbound"><div><strong>Duskbound</strong><span>More gold, lower health, riskier early combat.</span></div></label>
              </div>
            </div>
            <label>Interface colors
              <select id="themeSelect">
                <option value="aurora">Aurora blue and violet</option>
                <option value="ember">Ember orange and rose</option>
                <option value="jade">Jade teal and green</option>
                <option value="void">Void violet and pink</option>
              </select>
            </label>
            <button onclick="AF.startNew()">Enter the sky roads</button>
          </div>
        </div>
      </section>`;
  }

  function renderTopbar() {
    return `
      <header class="topbar">
        <div class="logo-lockup">
          <div class="logo-mark">AF</div>
          <div>
            <div class="logo-title">Astral Forge Idle</div>
            <div class="logo-subtitle">${escapeHtml(state.name)} the ${escapeHtml(state.path)} | Combat ${getCombatLevel()}</div>
          </div>
        </div>
        <div class="top-actions">
          <span class="pill"><strong>${formatNum(state.gold)}</strong> gold</span>
          <span class="pill"><strong>${formatNum(state.stats.monstersDefeated || 0)}</strong> defeated</span>
          <span class="pill"><strong>${formatTime(state.stats.playTimeSec || 0)}</strong> played</span>
          <button class="compact-button" onclick="AF.saveNow(true)">Save</button>
        </div>
      </header>`;
  }

  function renderNav() {
    return `
      <nav class="nav-panel">
        ${NAV.map(([view, label, hint]) => `<button class="nav-button ${state.view === view ? "active" : ""}" onclick="AF.switchView('${view}')"><span>${label}</span><span class="tiny">${hint}</span></button>`).join("")}
      </nav>`;
  }

  function renderMain() {
    const view = state.view || "overview";
    if (view === "combat") return renderCombatView();
    if (view === "skills") return renderSkillsView();
    if (view === "crafting") return renderCraftingView();
    if (view === "quests") return renderQuestsView();
    if (view === "market") return renderMarketView();
    if (view === "settings") return renderSettingsView();
    return renderOverviewView();
  }

  function renderOverviewView() {
    const readyQuests = QUESTS.filter(isQuestReady).length;
    const bestArea = [...AREAS].reverse().find((area) => getCombatLevel() >= area.req) || AREAS[0];
    const suggested = SKILL_ACTIONS.find((a) => getLevel(state, a.skill) >= a.level) || SKILL_ACTIONS[0];
    return `
      <section class="card">
        <div class="card-title-row">
          <div>
            <h2>Camp at the Broken Moon</h2>
            <p class="muted">Your character can train, craft, or hunt on repeat. Pick one active task and let the numbers climb.</p>
          </div>
          <div class="inline-sprite">${SPRITES.hero}</div>
        </div>
        <div class="grid-3">
          <div class="stat-box"><div class="stat-label">Combat level</div><div class="stat-value">${getCombatLevel()}</div></div>
          <div class="stat-box"><div class="stat-label">Ready quests</div><div class="stat-value">${readyQuests}</div></div>
          <div class="stat-box"><div class="stat-label">Actions done</div><div class="stat-value">${formatNum(state.stats.actionsCompleted || 0)}</div></div>
        </div>
      </section>
      <section class="grid-2">
        <div class="action-card">
          <div class="action-card-header">
            <div class="sprite-box">${SPRITES[suggested.sprite]}</div>
            <div><h3>Suggested gathering</h3><div class="muted small">${suggested.name}</div></div>
          </div>
          <p class="muted small">${suggested.desc}</p>
          <button onclick="AF.startSkillAction('${suggested.id}')">Start gathering</button>
        </div>
        <div class="action-card">
          <div class="action-card-header">
            <div class="sprite-box">${SPRITES[bestArea.sprite]}</div>
            <div><h3>Suggested hunt</h3><div class="muted small">${bestArea.name}</div></div>
          </div>
          <p class="muted small">${bestArea.desc}</p>
          <button onclick="AF.startCombat('${bestArea.id}')">Start hunt</button>
        </div>
      </section>
      <section class="card">
        <div class="card-title-row"><div><h2>Skill snapshot</h2><p class="muted">Your highest skills are shown first.</p></div><button class="compact-button" onclick="AF.switchView('skills')">All skills</button></div>
        <div class="skill-list">${renderSkillRows(SKILL_KEYS.slice().sort((a, b) => getLevel(state, b) - getLevel(state, a)).slice(0, 6))}</div>
      </section>`;
  }

  function renderCombatView() {
    return `
      <section class="card">
        <div class="card-title-row">
          <div>
            <h2>Combat</h2>
            <p class="muted">Hunt zones scale with your combat level. Combat grants Blade, Guard, Vitality, and sometimes Pulse XP.</p>
          </div>
          <span class="pill"><strong>${getCombatLevel()}</strong> combat</span>
        </div>
        <div class="stat-grid">
          ${statBox("Attack", getCombatStats().attack)}
          ${statBox("Defense", getCombatStats().defense)}
          ${statBox("Max health", getMaxHp())}
          ${statBox("Deaths", state.stats.deaths || 0)}
        </div>
      </section>
      <section class="grid-2">
        ${AREAS.map(renderAreaCard).join("")}
      </section>`;
  }

  function renderAreaCard(area) {
    const unlocked = getCombatLevel() >= area.req;
    return `
      <div class="area-card">
        <div class="action-card-header">
          <div class="sprite-box">${SPRITES[area.sprite]}</div>
          <div>
            <h3>${area.name}</h3>
            <div class="muted small">Requires combat ${area.req}</div>
          </div>
        </div>
        <p class="muted small">${area.desc}</p>
        <div class="tag-row">${area.enemies.map((e) => `<span class="tag">${e.name}</span>`).join("")}</div>
        <button ${unlocked ? "" : "disabled"} onclick="AF.startCombat('${area.id}')">${unlocked ? "Hunt here" : "Locked"}</button>
      </div>`;
  }

  function renderSkillsView() {
    const groups = ["Gathering", "Processing", "Combat"];
    return `
      <section class="card">
        <h2>Skills</h2>
        <p class="muted">Gathering and processing actions repeat automatically. Equipment can improve combat and gathering.</p>
      </section>
      ${groups.map((group) => `
        <section class="card">
          <div class="card-title-row"><h2>${group}</h2></div>
          <div class="skill-list">${renderSkillRows(SKILL_KEYS.filter((key) => SKILL_INFO[key].group === group))}</div>
        </section>`).join("")}
      <section class="card">
        <h2>Gathering actions</h2>
        <div class="grid-2">${SKILL_ACTIONS.map(renderSkillActionCard).join("")}</div>
      </section>`;
  }

  function renderSkillRows(keys) {
    return keys.map((key) => {
      const p = xpProgress(state, key);
      return `
        <div class="skill-row">
          <div><div class="skill-name">${key}</div><div class="tiny muted">${SKILL_INFO[key].note}</div></div>
          <div class="skill-level">${p.level}</div>
          <div>
            <div class="progress-shell"><div class="progress-bar" style="width:${p.pct}%"></div></div>
            <div class="tiny muted">${formatNum(p.into)} / ${formatNum(p.needed)} XP</div>
          </div>
        </div>`;
    }).join("");
  }

  function renderSkillActionCard(action) {
    const unlocked = getLevel(state, action.skill) >= action.level;
    const rewardText = action.rewards.map((r) => `${r.item}${r.chance < 1 ? "?" : ""}`).join(", ");
    return `
      <div class="action-card">
        <div class="action-card-header">
          <div class="sprite-box">${SPRITES[action.sprite]}</div>
          <div><h3>${action.name}</h3><div class="muted small">${action.skill} ${action.level} | ${formatMs(action.duration)}</div></div>
        </div>
        <p class="muted small">${action.desc}</p>
        <div class="tag-row"><span class="tag">${action.xp} XP</span><span class="tag">${rewardText}</span></div>
        <button ${unlocked ? "" : "disabled"} onclick="AF.startSkillAction('${action.id}')">${unlocked ? "Start" : "Locked"}</button>
      </div>`;
  }

  function renderCraftingView() {
    return `
      <section class="card">
        <h2>Crafting</h2>
        <p class="muted">Recipes consume materials each completion. The game stops the recipe if you run out.</p>
      </section>
      <section class="grid-2">
        ${RECIPES.map(renderRecipeCard).join("")}
      </section>`;
  }

  function renderRecipeCard(recipe) {
    const unlocked = getLevel(state, recipe.skill) >= recipe.level;
    const hasMaterials = canCraft(recipe);
    return `
      <div class="recipe-card">
        <div class="action-card-header">
          <div class="sprite-box">${SPRITES[recipe.sprite]}</div>
          <div><h3>${recipe.result}</h3><div class="muted small">${recipe.skill} ${recipe.level} | ${formatMs(recipe.duration)}</div></div>
        </div>
        <p class="muted small">${recipe.desc}</p>
        <div class="tag-row">${Object.entries(recipe.ingredients).map(([item, qty]) => `<span class="tag ${getItemQty(item) >= qty ? "good" : "bad"}">${item}: ${getItemQty(item)}/${qty}</span>`).join("")}</div>
        <button ${unlocked && hasMaterials ? "" : "disabled"} onclick="AF.startCraftAction('${recipe.id}')">${unlocked ? (hasMaterials ? "Craft repeatedly" : "Need materials") : "Locked"}</button>
      </div>`;
  }

  function renderQuestsView() {
    return `
      <section class="card">
        <h2>Quests and achievements</h2>
        <p class="muted">These are local goals that reward gold, XP, and items.</p>
      </section>
      <section class="grid-2">${QUESTS.map(renderQuestCard).join("")}</section>
      <section class="card">
        <h2>Achievements</h2>
        <div class="grid-2">${ACHIEVEMENTS.map(renderAchievement).join("")}</div>
      </section>`;
  }

  function renderQuestCard(quest) {
    const claimed = state.quests[quest.id] && state.quests[quest.id].claimed;
    const ready = isQuestReady(quest);
    const progress = questProgress(quest);
    const required = quest.type === "equip" ? 1 : quest.qty;
    const pct = clamp((progress / required) * 100, 0, 100);
    return `
      <div class="quest-card">
        <div class="row-between">
          <div><h3>${quest.name}</h3><p class="muted small">${quest.desc}</p></div>
          <span class="tag ${claimed ? "good" : ready ? "warn" : ""}">${claimed ? "Claimed" : ready ? "Ready" : "Active"}</span>
        </div>
        <div>
          <div class="progress-shell"><div class="progress-bar" style="width:${pct}%"></div></div>
          <div class="tiny muted">${progress} / ${required}</div>
        </div>
        <div class="tag-row">${renderRewards(quest.rewards)}</div>
        <button ${ready && !claimed ? "" : "disabled"} onclick="AF.claimQuest('${quest.id}')">${claimed ? "Done" : "Claim rewards"}</button>
      </div>`;
  }

  function renderRewards(rewards) {
    const parts = [];
    if (rewards.gold) parts.push(`<span class="tag">${rewards.gold} gold</span>`);
    Object.entries(rewards.xp || {}).forEach(([skill, xp]) => parts.push(`<span class="tag">${xp} ${skill} XP</span>`));
    Object.entries(rewards.items || {}).forEach(([item, qty]) => parts.push(`<span class="tag">${qty} ${item}</span>`));
    return parts.join("");
  }

  function renderAchievement(ach) {
    const done = Boolean(state.achievements[ach.id]);
    return `
      <div class="quest-card">
        <div class="row-between"><h3>${ach.name}</h3><span class="tag ${done ? "good" : ""}">${done ? "Unlocked" : "Locked"}</span></div>
        <p class="muted small">${ach.desc}</p>
        <div class="tag-row"><span class="tag">Reward ${ach.rewardGold} gold</span></div>
      </div>`;
  }

  function renderMarketView() {
    const sellables = Object.keys(state.inventory).filter((item) => getItemQty(item) > 0);
    return `
      <section class="card">
        <h2>Traveler Market</h2>
        <p class="muted">A local NPC exchange for testing the economy loop. It is not a multiplayer market.</p>
      </section>
      <section class="card">
        <div class="card-title-row"><h2>Buy supplies</h2><span class="pill"><strong>${state.gold}</strong> gold</span></div>
        <div class="skill-list">${MARKET.map((entry) => `<div class="market-row"><div><strong>${entry.item}</strong><div class="muted small">${ITEMS[entry.item].desc}</div></div><span class="tag">${entry.price} gold</span><button onclick="AF.buyItem('${entry.item}')" ${state.gold >= entry.price ? "" : "disabled"}>Buy</button></div>`).join("")}</div>
      </section>
      <section class="card">
        <h2>Sell inventory</h2>
        <div class="skill-list">${sellables.length ? sellables.map((item) => {
          const def = ITEMS[item];
          const value = Math.max(1, Math.floor((def.value || 1) * 0.55));
          return `<div class="market-row"><div><strong>${item}</strong><div class="muted small">Owned ${getItemQty(item)} | Sell value ${value}</div></div><button onclick="AF.sellItem('${item}',1)">Sell 1</button><button onclick="AF.sellItem('${item}',${getItemQty(item)})">Sell all</button></div>`;
        }).join("") : `<p class="muted">Your inventory is empty.</p>`}</div>
      </section>`;
  }

  function renderSettingsView() {
    return `
      <section class="card">
        <h2>Settings</h2>
        <p class="muted">Switch the UI palette, export a save, or reset this prototype.</p>
        <div class="grid-2">
          <label>Palette
            <select onchange="AF.changeTheme(this.value)">
              ${[["aurora", "Aurora blue and violet"], ["ember", "Ember orange and rose"], ["jade", "Jade teal and green"], ["void", "Void violet and pink"]].map(([value, label]) => `<option value="${value}" ${state.theme === value ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </label>
          <div>
            <div class="small muted" style="margin-bottom:0.45rem">Save actions</div>
            <div class="tag-row"><button onclick="AF.saveNow(true)">Save now</button><button onclick="AF.hardReset()">Reset</button></div>
          </div>
        </div>
      </section>
      <section class="card">
        <h2>Export or import</h2>
        <p class="muted">Copy the text to back up your progress. Paste it back here to restore.</p>
        <textarea id="saveText" rows="8" spellcheck="false"></textarea>
        <div class="tag-row" style="margin-top:0.75rem"><button onclick="AF.exportSave()">Export save</button><button onclick="AF.importSave()">Import save</button></div>
      </section>`;
  }

  function renderRightPanel() {
    return `
      ${renderActionPanel()}
      ${renderCharacterPanel()}
      ${renderEquipmentPanel()}
      ${renderInventoryPanel()}
      ${renderLogPanel()}`;
  }

  function renderActionPanel() {
    const action = state.currentAction;
    if (!action) {
      return `<section class="side-card"><h3>Current action</h3><p class="muted small">No active action. Choose a hunt, gathering action, or recipe.</p></section>`;
    }
    if (action.type === "skill") {
      const def = SKILL_ACTIONS.find((a) => a.id === action.id);
      const pct = def ? clamp((state.actionProgress / def.duration) * 100, 0, 100) : 0;
      return `<section class="side-card"><div class="row-between"><h3>${def ? def.name : "Action"}</h3><button class="compact-button" onclick="AF.stopAction()">Stop</button></div><div class="progress-shell"><div class="progress-bar" style="width:${pct}%"></div></div><div class="tiny muted">${def ? `${def.skill} XP every ${formatMs(def.duration)}` : ""}</div></section>`;
    }
    if (action.type === "craft") {
      const recipe = RECIPES.find((r) => r.id === action.id);
      const pct = recipe ? clamp((state.actionProgress / recipe.duration) * 100, 0, 100) : 0;
      return `<section class="side-card"><div class="row-between"><h3>${recipe ? `Crafting ${recipe.result}` : "Crafting"}</h3><button class="compact-button" onclick="AF.stopAction()">Stop</button></div><div class="progress-shell"><div class="progress-bar" style="width:${pct}%"></div></div><div class="tiny muted">${recipe ? `${recipe.skill} XP every ${formatMs(recipe.duration)}` : ""}</div></section>`;
    }
    const area = AREAS.find((a) => a.id === action.areaId);
    const enemy = action.enemy;
    const pct = enemy ? clamp((enemy.hp / enemy.maxHp) * 100, 0, 100) : 0;
    return `<section class="side-card"><div class="row-between"><h3>${area ? area.name : "Hunting"}</h3><button class="compact-button" onclick="AF.stopAction()">Stop</button></div>${enemy ? `<div class="action-card-header"><div class="sprite-box">${SPRITES[enemy.sprite]}</div><div><strong>${enemy.name}</strong><div class="tiny muted">Enemy HP ${enemy.hp}/${enemy.maxHp}</div></div></div><div class="progress-shell health"><div class="progress-bar" style="width:${pct}%"></div></div>` : ""}</section>`;
  }

  function renderCharacterPanel() {
    const hpPct = clamp((state.hp / getMaxHp()) * 100, 0, 100);
    const stats = getCombatStats();
    return `
      <section class="side-card">
        <div class="row-between"><h3>${escapeHtml(state.name)}</h3><span class="tag">${escapeHtml(state.path)}</span></div>
        <div class="action-card-header">
          <div class="sprite-box">${SPRITES.hero}</div>
          <div>
            <div class="muted small">Health</div>
            <div class="progress-shell health"><div class="progress-bar" style="width:${hpPct}%"></div></div>
            <div class="tiny muted">${state.hp}/${getMaxHp()} HP</div>
          </div>
        </div>
        <div class="stat-grid" style="margin-top:0.75rem">
          ${statBox("Attack", stats.attack)}
          ${statBox("Defense", stats.defense)}
        </div>
      </section>`;
  }

  function renderEquipmentPanel() {
    const slots = ["weapon", "armor", "charm", "tool"];
    return `
      <section class="side-card">
        <h3>Equipment</h3>
        <div class="equipment-grid">
          ${slots.map((slot) => `<div class="equip-slot"><strong>${titleCase(slot)}</strong><span>${state.equipment[slot] || "Empty"}</span></div>`).join("")}
        </div>
      </section>`;
  }

  function renderInventoryPanel() {
    const items = Object.entries(state.inventory || {}).filter(([, qty]) => qty > 0).sort((a, b) => a[0].localeCompare(b[0]));
    return `
      <section class="side-card">
        <div class="row-between"><h3>Inventory</h3><span class="tag">${items.length} types</span></div>
        <div class="inventory-list">
          ${items.length ? items.map(([item, qty]) => renderInventoryRow(item, qty)).join("") : `<p class="muted small">Nothing here yet.</p>`}
        </div>
      </section>`;
  }

  function renderInventoryRow(item, qty) {
    const def = ITEMS[item] || { type: "material", desc: "Unknown item." };
    const buttons = [];
    if (def.type === "equipment") buttons.push(`<button onclick="AF.equipItem('${escapeAttr(item)}')">Equip</button>`);
    if (def.type === "consumable") buttons.push(`<button onclick="AF.useItem('${escapeAttr(item)}')">Use</button>`);
    buttons.push(`<button onclick="AF.sellItem('${escapeAttr(item)}',1)">Sell</button>`);
    return `
      <div class="inventory-row">
        <div><strong>${item}</strong> <span class="muted">x${qty}</span><div class="tiny muted">${def.desc}</div></div>
        <div class="inventory-actions">${buttons.join("")}</div>
      </div>`;
  }

  function renderLogPanel() {
    const lines = (state.log || []).slice(-8).reverse();
    return `
      <section class="side-card">
        <h3>Activity log</h3>
        <div class="log-list">
          ${lines.length ? lines.map((line) => `<div class="log-line small">${escapeHtml(line)}</div>`).join("") : `<p class="muted small">No activity yet.</p>`}
        </div>
      </section>`;
  }

  function statBox(label, value) {
    return `<div class="stat-box"><div class="stat-label">${label}</div><div class="stat-value">${formatNum(value)}</div></div>`;
  }

  function log(message) {
    const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    state.log = state.log || [];
    state.log.push(`${stamp} ${message}`);
    if (state.log.length > 80) state.log = state.log.slice(-80);
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function choose(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatNum(num) {
    return Math.round(num).toLocaleString();
  }

  function formatMs(ms) {
    const sec = Math.round(ms / 1000);
    return `${sec}s`;
  }

  function formatTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function titleCase(text) {
    return text.slice(0, 1).toUpperCase() + text.slice(1);
  }

  function sanitizeText(text) {
    return text.replace(/[<>]/g, "");
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(text) {
    return String(text).replace(/'/g, "\\'").replace(/"/g, "&quot;");
  }
})();
