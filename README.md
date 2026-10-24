# Pocket Workshop — first playable prototype

A touch-friendly browser prototype for the future iOS and Android game. No ads, purchases, accounts, or analytics are included.

## Play

Open the published private Site, or serve `dist` with a static HTTP server. Example: `python -m http.server 8080 --directory dist`, then visit http://localhost:8080 on this computer.

Drag a part along its track, or select it and use the arrow controls. Move the brass kit to the right edge to restore an object. Includes five repairs, undo, reset, unlimited hints, and device-local collection progress. The current puzzle restarts when the page reloads. Progress does not sync between devices. External Google Fonts are optional; system fonts work offline.

## Verify

Run `node test.mjs` to verify valid layouts and legal solution paths for every puzzle. `node --check dist/app.js` checks application JavaScript syntax.

## Next milestones

Playtest the controls and puzzle difficulty on iPad Safari, add levels and sound, and then choose the native packaging route. This browser prototype is not yet an App Store or Google Play build. Native releases still need platform signing, device testing, store assets, privacy disclosures, review, and a macOS build environment for iOS.
