# Pocket Workshop — 200-level prototype

A touch-friendly browser prototype for the future iOS and Android game. Real ads and purchases are not connected. A clearly labeled rewarded-ad demo and disabled shop preview are included. No analytics are included.

## Play

Open the published private Site, or serve `dist` with a static HTTP server. Example: `python -m http.server 8080 --directory dist`, then visit http://localhost:8080 on this computer.

Drag a part along its track with a finger, stylus, or mouse. Blocks follow the pointer and settle into legal grid spaces on release. On-screen movement arrows are removed; keyboard arrow controls remain accessible after selecting a part with Enter. Move the brass kit to the right edge to restore an object. Includes 200 repairs, undo, reset, unlimited hints, and device-local collection progress. The current puzzle restarts when the page reloads. Progress does not sync between devices. External Google Fonts are optional; system fonts work offline.

## Verify

Run `node test.mjs` to verify valid layouts and legal solution paths for every puzzle. `node --check dist/app.js` checks application JavaScript syntax.

## Next milestones

Playtest the controls and puzzle difficulty on iPad Safari, playtest the difficulty curve and add sound, and then choose the native packaging route. This browser prototype is not yet an App Store or Google Play build. Native releases still need platform signing, device testing, store assets, privacy disclosures, review, and a macOS build environment for iOS.

## Difficulty progression

The redesigned collection contains 200 distinct puzzles across 29 piece configurations. Minimum solutions increase by tiers from 8 to 26 slides, rather than beginning with a 2-slide puzzle. Every board has a solver-verified legal solution. Adjacent puzzles may share a difficulty tier. Existing completion and currency balances are retained. Old in-progress boards and undo histories are discarded once when migrating to puzzle revision 3, without charging a bolt; reset usage is retained.

## Bolts and attempts

Players start with 5 bolts. Limits use a verified shortest-slide solution’s square travel plus 5 spare square moves for levels 1–20, 4 for 21–80, and 3 for 81–200. These are tight solvable allowances, not claims of globally minimum square travel. Dragging through multiple squares consumes that many moves, so drag and arrow controls have the same allowance. Running out costs one bolt; winning on the last allowed move succeeds. Players receive 3 undos total across the entire game. Undo restores the previous position and its move allowance. Remaining undos and undo history persist across reloads and level changes; they never refill on retries or level completion. Shop previews: 1 undo for $0.99 USD, 3 for $1.99 USD. Purchases are disabled until native billing is connected. Resetting a started repair costs one bolt after confirmation. Attempts and remaining moves persist across reloads and level switches on this device. At zero bolts gameplay is blocked until a reward is earned. The optional-ad demo gives one free bolt up to five; it does not show ads or earn revenue. The shop is a disabled preview, without pricing or billing. Native ad SDK integration, verified rewards and platform purchases remain future work.

The 200-level picker uses ten pages of 20 repairs. Original 20-level progress is preserved.

## Sequential unlocking

Level 1 starts unlocked. Finish every preceding repair to unlock the next one. Completed repairs can be replayed. Level pages can be browsed, but locked repairs are disabled and guarded by the load function, including when restoring a saved level. Existing completions are retained; gaps must be finished before later levels become playable.

Each level permits one reset in total, including across retries/reloads. It costs one bolt and does not replenish undos. Confirmed bolt packs: 5 for $0.99, 12 for $1.99, 35 for $4.99 USD. Native purchases are being prepared in mobile/; they are not live.

## Music and visual themes
Original synthesized workshop music, wooden slide effects, and completion chimes use Web Audio. Music and effects have independent saved switches in Audio settings; audio begins after a gesture and pauses in the background. No third-party music files or tracking are used. Each of 200 repairs has a distinct coordinated palette and one of five workbench textures. Tool buttons and typography share the workshop visual style.
