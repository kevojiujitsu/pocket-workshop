# Purchase backend — deployed with purchases disabled

`catalog.js` defines the five approved consumable grants on the server. It is not an HTTP endpoint or a receipt verifier. Run `node server/catalog.test.mjs` to check that it matches both native catalogs and rejects unknown products and unsupported quantities.

The approved Cloudflare Worker `pocket-workshop-purchases` and D1 database `pocket-workshop-wallet` exist. The backend was deployed with Wrangler on October 26, 2026, version `08a729ca-e157-49db-908a-de32a5cf00e9`. The live `/health` endpoint at https://pocket-workshop-purchases.kevojiujitsu.workers.dev/health confirms `purchasesEnabled:false` and `databaseBound:true`. Both purchases and session creation remain disabled, the store environment is sandbox, preview URLs are disabled, and no cron is configured. Resource identifiers and feature flags are saved in `wrangler.jsonc`.

Local code includes bearer-authenticated device sessions (disabled pending recovery/identity design), an idempotent wallet ledger and spends, store verification, ownership/environment checks, and scheduled refund rechecks. Catalog and backend tests pass. This does not establish live store verification or complete refund notification support.

Still required: server secrets, account recovery/identity, signed store refund notifications, native shop/wallet integration, and device sandbox testing. Purchases and session creation remain disabled. Never enable billing merely because local tests pass. Store keys must remain outside Git and be supplied only as server secrets.
