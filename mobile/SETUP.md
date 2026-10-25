# Mobile purchases — integration status

The Capacitor dependencies and a native store adapter are installed. This is not a connected or released payment system. The browser shop cannot use Apple or Google native purchase APIs.

## Pending account work

- Google draft prepared in Kev The Dev: Pocket Workshop, free game, package `com.kevthedev.pocketworkshop` checked available. Draft created with owner approval.
- Apple draft created: Pocket Workshop: Cozy Puzzles, app ID 6826495134, bundle ID com.kevthedev.pocketworkshop. The plain name Pocket Workshop was unavailable. First consumable created: com.kevthedev.pocketworkshop.undo1, Apple purchase ID 6826495928.
- All five consumables now exist as drafts in both stores, with IDs recorded in `billing-config.json`. Native UI must use localized prices returned by the store, not hardcoded USD prices.
- Bolt packs confirmed: 5 at US $0.99, 12 at US $1.99, 35 at US $4.99; undo packs: one at US $0.99 and three at US $1.99.

## Backend required before enabling purchases

Implement authenticated player accounts and a durable wallet ledger. `POST /receipts/validate` must follow the purchase plugin validator response protocol, verify the package/bundle, product, quantity, purchased state and receipt with Apple/Google, reject refunded/invalid/sandbox receipts in production, bind purchases to the player, and atomically grant once per store transaction or purchase token. Derive rewards from the server catalog, never client quantities. Handle duplicate deliveries, pending payments and refunds. Do not acknowledge/finish until verified credits are durably committed. Process signed store refund notifications. Do not persist raw credentials in source or browser storage.

`GET /wallet` returns verified integer `bolts` and `undos` for the authenticated player. Add authoritative idempotent debit endpoints for spending both currencies; browser localStorage is not the paid wallet. Wire native game actions to the server wallet and recover pending transactions after restart. `billing.js` provides store verification hooks; these server endpoints and game-wallet wiring are NOT implemented yet.

Only then set the HTTPS `verificationOrigin`, registered product IDs and `enabled:true`; provide a short-lived authenticated session to the adapter. The adapter is deliberately not started automatically by `entry.js` while prerequisites are missing. Developer signing credentials remain outside the app.

## Build

From this directory run `npm ci` and `npm run build`. Set `POCKET_APP_ID` to the registered application ID before `npx cap add android` or `npx cap add ios`, then `npx cap sync`. If the two platforms use different IDs, configure each native project separately before signing. iOS needs macOS/Xcode. Android needs JDK and the Android SDK. Use store sandbox/license testers before production; test canceled, pending, duplicate, refunded and interrupted purchases as well as localized prices. Do not test with real charges.

Do not enable browser preview purchases or deploy merchant secrets to the private Site.

Android release compilation verified with C:/Users/kwjiu/.jdks/jbr-21.0.11 and the installed Android SDK. The default Android Studio JBR is Java 25 and is incompatible with this Gradle version. iOS project generated, but not compiled on Windows. Upload signing materials are outside the Git checkout in the task work/pocket-signing directory; passwords are protected with Windows DPAPI and not in source.

## Store setup checkpoint (October 24, 2026)

Both app drafts exist. All five consumable IDs in billing-config.json have been created in both stores. Apple base prices are configured: undo1 and bolts5 $0.99, undo3 and bolts12 $1.99, bolts35 $4.99. Apple availability, localized display descriptions and review screenshots are still pending. Google purchase options are saved as drafts (standard, Buy) with USD base pricing and regional conversion, not activated. A signed Android version 1 (1.0), target API 36 bundle with BILLING permission is uploaded and saved in the closed Alpha draft; it has NOT been rolled out. iOS has not been compiled or uploaded. Receipt-validation endpoints, player authentication, authoritative wallet spending and native game shop wiring are NOT implemented. Purchases remain disabled.

Private GitHub repository: https://github.com/kevojiujitsu/pocket-workshop (main). Do not commit signing keys, DPAPI password files or private store API credentials.

Google Cloud project created with explicit owner approval: `pocket-workshop-512605` (project number `689405200219`), display name Pocket Workshop. The Billing page confirms no linked billing account. Google Play Android Developer API is enabled after explicit owner approval of its terms. Google service account pocket-purchase-verifier@pocket-workshop-512605.iam.gserviceaccount.com was created with owner approval, without a Cloud project role. Google reports a private key was saved by the browser, but its downloaded file has not yet been located and copied to the protected work directory. Do not generate a duplicate key without resolving that download. App-scoped Play permissions are still pending.
