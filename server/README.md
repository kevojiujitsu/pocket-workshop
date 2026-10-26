# Pocket Workshop native monetization

Apple billing and wallet/ad backend integration are enabled for the next beta build. `mobile/ads-config.json` still has `testing: true`; beta wallets are isolated from release wallets and cannot be recovered into the release app.

The iOS app keeps its wallet access code in the Keychain. The backend stores only its hash. Wallet access/recovery is available in the shop. Puzzle progress remains local. Retry identifiers prevent duplicate debits after interrupted responses. Apple transactions finish individually only after authenticated store verification and wallet delivery.

Production ad rewards require Google's ECDSA-signed server callback, a matching wallet/ad intent, an allowed ad unit, and a unique transaction. Rewards add one bolt only while the total balance is below five. Google's signed dashboard probe is acknowledged without issuing a reward. Client-confirmed test-ad rewards are accepted only for isolated test wallets. Paid packs can exceed five bolts.

Refund notifications are hints only: `/apple/notifications` looks up an existing receipt and re-fetches its authoritative status from Apple before changing a balance. Hourly rechecks provide a second path. Store outages never count as refunds. Apple sandbox and production API responses are validated; test wallets accept only sandbox purchases.

The authorized Cloudflare Worker is `pocket-workshop-purchases`, bound to D1 `pocket-workshop-wallet`. Apply `schema.sql` for a new DB. Existing installations from the previous schema also need the one-time `wallet-modes.sql` migration. Secrets stay outside Git: APPLE_PRIVATE_KEY, APPLE_KEY_ID, APPLE_ISSUER_ID, LEDGER_KEY, SESSION_SALT.

Verification: `node server/backend.test.mjs`, `node server/monetization.test.mjs`, `node server/catalog.test.mjs`, `node mobile/purchase-delivery.test.mjs`, and `node mobile/rewarded-controller.test.mjs`.

Still required before review submission: native iPad sandbox purchase/cancellation/recovery tests, published UMP messages, final release-mode build and IAP review screenshots. AdMob app approval requires linking the public App Store listing; no-fill is handled without issuing rewards.
