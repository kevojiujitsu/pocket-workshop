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

Google Cloud project created with explicit owner approval: `pocket-workshop-512605` (project number `689405200219`), display name Pocket Workshop. The Billing page confirms no linked billing account. Google Play Android Developer API is enabled after explicit owner approval of its terms. Google service account pocket-purchase-verifier@pocket-workshop-512605.iam.gserviceaccount.com was created with owner approval, without a Cloud project role. Google reports a private key was saved by the browser, but its downloaded file has not yet been located and copied to the protected work directory. Do not generate a duplicate key without resolving that download. Google Play access is active, scoped only to Pocket Workshop: view app information and app quality (default read permissions), view financial data, and manage orders/subscriptions. No account-wide permission was granted. Cloudflare hosting sign-in is pending; no backend has been deployed.

## Release candidate (October 26, 2026)

The web game is published as Site version 16. The Android app bundle `pocket-workshop-1.1.aab` has been built for package `com.kevthedev.pocketworkshop`, versionCode 2, and signed with the existing upload key. It is ready for upload to the existing Play Console draft; it has not been uploaded or submitted. The iOS project has updated web assets, but producing an App Store build requires macOS and Xcode. Store listing screenshots, privacy details, and review metadata remain incomplete. Keep purchases disabled until the receipt verification and wallet backend above are complete.

## Backend checkpoint (October 26, 2026)
The Cloudflare purchase backend is deployed at https://pocket-workshop-purchases.kevojiujitsu.workers.dev. Its health check confirms the DB binding and disabled purchases. Session creation is disabled, STORE_ENV is sandbox, preview URLs are disabled, and no refund cron is enabled. Store secrets, identity/recovery, signed refund notifications, native wallet wiring, and device purchase testing remain unfinished. This checkpoint supersedes earlier statements that no backend exists. Purchases remain disabled.

## Store and rewarded-ad checkpoint (October 26, 2026)

Owner confirmed that purchases must be finished before launch and that optional completed rewarded ads earn 1 free bolt, capped at 5 bolts. Paid packs remain separate. Do not submit the prototype or remove the agreed monetization to accelerate submission.

Both store description drafts have been saved. Google Play's dashboard explicitly requires a closed test with at least 12 opted-in testers for 14 continuous days; currently 0 testers are opted in. Store screenshots, public support/privacy URLs, content declarations, and review metadata remain unfinished. The owner has a tablet; no Mac/Xcode or cloud Mac build route has been established.

AdMob Android app 6014620217 and iOS app 4851254349 have been created with one optional Rewarded placement each, reward amount 1, item bolt. IDs are recorded in ads-config.json and native application metadata. AdMob reports account verification pending. UMP privacy messages, audience settings, app-ads.txt/domain setup where required, app-store linking, and device ad tests remain pending. ads-config.json stays disabled and in testing mode; do not enable live requests before setup and device checks.

The Capacitor AdMob 8.2.0 integration and native-only reward flow are implemented. Native builds never use the browser demo button to grant a reward. Completion, dismissal, consent denial, repeated requests, disabled configuration, and invalid reward behavior pass controller tests. Android assembleDebug succeeds with the SDK; Android/iOS web assets and plugin references are synced. The iOS native project has not been compiled. The older signed 1.1 AAB predates this integration and the latest jazz recording; do not upload it as the final release.

APPLE_PRIVATE_KEY, APPLE_KEY_ID, and APPLE_ISSUER_ID are installed on pocket-workshop-purchases as Cloudflare secrets with owner authorization. An Apple sandbox probe with a deliberately nonexistent transaction returns HTTP 400; this is not an end-to-end purchase test.

Owner authorized replacing the missing Google key, revoking the old key ending c450, and installing Google/Apple server secrets. Google created replacement key db6b243832eca935f750f5c2eea5ca490dd810b7 and reports download filename pocket-workshop-512605-db6b243832ec.json. Browser download capture timed out, and the file was not found in checked Downloads, task workspace, OpenAI local app data, Temp, or Roaming paths. Do not generate another replacement. The old-key deletion was confirmed by Google's deletion notification. The new Google key is NOT installed on Cloudflare; obtain the downloaded file first. Neither store's purchases are enabled.

