# Pocket Workshop — 20-level prototype

A touch-friendly browser prototype for the future iOS and Android game. Real ads and purchases are not connected. A clearly labeled rewarded-ad demo and disabled shop preview are included. No analytics are included.

## Play

Open the published private Site, or serve `dist` with a static HTTP server. Example: `python -m http.server 8080 --directory dist`, then visit http://localhost:8080 on this computer.

Drag a part along its track, or select it and use the arrow controls. Move the brass kit to the right edge to restore an object. Includes 20 repairs, undo, reset, unlimited hints, and device-local collection progress. The current puzzle restarts when the page reloads. Progress does not sync between devices. External Google Fonts are optional; system fonts work offline.

## Verify

Run `node test.mjs` to verify valid layouts and legal solution paths for every puzzle. `node --check dist/app.js` checks application JavaScript syntax.

## Next milestones

Playtest the controls and puzzle difficulty on iPad Safari, playtest the difficulty curve and add sound, and then choose the native packaging route. This browser prototype is not yet an App Store or Google Play build. Native releases still need platform signing, device testing, store assets, privacy disclosures, review, and a macOS build environment for iOS.

## Difficulty progression

Each level has a verified shortest solution of one more slide than the previous: 2 through 21 slides. Five-level groups progress through Beginner, Apprentice, Craftsperson, and Master. One slide can move a part multiple cells. The solver measures minimum slides, not the number of cells traveled. Earlier prototype progress is retained for the unchanged first puzzle; redesigned puzzles begin uncompleted.

## Bolts and attempts

Players start with 5 bolts. Each level allows `4 × minimum slides + 6` square moves. Dragging through multiple squares consumes that many moves, so drag and arrow controls have the same allowance. Running out costs one bolt; winning on the last allowed move succeeds. Undo does not refund moves. Resetting a started repair costs one bolt after confirmation. Attempts and remaining moves persist across reloads and level switches on this device. At zero bolts gameplay is blocked until a reward is earned. The optional-ad demo gives one free bolt up to five; it does not show ads or earn revenue. The shop is a disabled preview, without pricing or billing. Native ad SDK integration, verified rewards and platform purchases remain future work.
