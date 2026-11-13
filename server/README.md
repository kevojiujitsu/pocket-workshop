# Wallet and purchase service

This Cloudflare Worker uses D1 for player wallets, purchase receipts, ad intents, and the ledger. Bind a D1 database as `DB`, apply `schema.sql` to a new database, and apply `wallet-modes.sql` once to databases created with the earlier schema.

## Configuration

The worker reads deployment settings from `wrangler.jsonc`. Configure these secrets with Wrangler; never put their values in source control:

- `SESSION_SALT` is required for session creation and is used to hash daily rate-limit buckets. If it is absent, session creation fails closed.
- `LEDGER_KEY` encrypts stored purchase proofs.
- `APPLE_PRIVATE_KEY`, `APPLE_KEY_ID`, and `APPLE_ISSUER_ID` authenticate Apple receipt verification.
- `GOOGLE_SERVICE_ACCOUNT` contains the Google Play service-account JSON used for receipt verification.

Set `APP_ENV=production` in production. A client can request a test wallet only when `APP_ENV=test` and `TEST_MODE_ENABLED=true` are both configured on the server. Client-confirmed test rewards additionally require `AD_TEST_REWARDS_ENABLED=true`, and are accepted only in that test environment. Keep all test flags disabled in production.

For an explicitly local test deployment, override the test-only variables when starting the worker:

```sh
npx wrangler dev --var APP_ENV:test --var TEST_MODE_ENABLED:true --var AD_TEST_REWARDS_ENABLED:true
```

Do not copy those overrides into production configuration.

## Development checks

Run the focused backend and monetization checks from the repository root:

```sh
node server/backend.test.mjs
node server/monetization.test.mjs
node server/catalog.test.mjs
node mobile/purchase-delivery.test.mjs
node mobile/rewarded-controller.test.mjs
```

Before enabling purchases or live ads, configure and verify the store integrations, database, server secrets, and native client setup. Test purchase validation, wallet recovery, refund handling, and ad callbacks in the appropriate non-production environments first.
