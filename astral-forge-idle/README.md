# Astral Forge Idle

Astral Forge Idle is an original client-side idle browser RPG prototype. It has persistent skills, gathering, crafting, combat zones, quests, achievements, equipment, consumables, a local NPC market, color themes, and localStorage saving.

## Run it

Open `index.html` in a modern browser. No build step is required.

For a local server, run:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Notes

- This is not a copy or reskin of another game.
- All names, sprites, UI styling, and data are original placeholders.
- It is single-player and client-side only. True MMO features need a backend for accounts, persistence, chat, trading, anti-cheat, and server-authoritative simulation.
- Saves are stored in the browser via localStorage.

## Suggested next steps

- Add backend accounts and server-side saves.
- Add multiplayer chat and a real auction-house economy.
- Replace inline SVG placeholders with production art.
- Expand combat formulas, enemy drops, recipes, quests, and zone unlocks.
- Add automated tests around save migration and progression math.
