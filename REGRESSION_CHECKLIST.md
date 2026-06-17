# Match-3 Regression Checklist

When changing the game UI, battle logic, or HTML entry files, always check these items before handing off work:

1. Run `node --test`.
   - This loads the scripts listed in `index.html` using the IDs that are actually present in `index.html`.
   - It must confirm the board renders every cell, visible cells have click handlers, the hint button still works, reset still restores the board, and blank settings do not hide the board.
2. Run `git diff --check`.
3. Confirm `match3.html` redirects to `./index.html`, not just `./`.
   - Redirecting to `./` can fail when the game is opened from local files and can look like the blocks/buttons disappeared.
4. If any code touches `resetGame()`, `render()`, `renderBattleStats()`, script tags, or element IDs, re-check that:
   - `#board` has `size × size` rendered button cells.
   - Each visible cell has a click listener.
   - `#hintButton`, `#resetButton`, and `#magicButton` are present and usable.
   - Empty input values fall back to safe defaults instead of creating a blank board.
