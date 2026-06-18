# 3-Match Game Test

This is a basic match-3 puzzle game. You can change how many colors appear, how big the board is, and how fast blocks fall and clear. If there are no more matches, the board shuffles itself. Open `match3.html` in your browser to play. 
test mr

## Baseline Snapshot Before Roguelite Layer

- Baseline commit before this roguelite/layered progression work: `3c9e368bcf444829c34d08ac6a49ffde2040dc48`.
- At that point, the game was a single match-3 battle: players swap adjacent blocks, clear 3+ connected same-colored blocks, build attack/defense/spell/heal values, and fight one enemy using timed player/enemy attacks.
- Existing safety checks live in `REGRESSION_CHECKLIST.md`; keep using them when changing UI, reset/render logic, battle stats, script tags, or element IDs.
