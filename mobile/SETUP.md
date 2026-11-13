# Mobile setup

The Capacitor app integrates native Apple and Google in-app purchases, a server-backed wallet, and optional rewarded ads. Store purchases are verified by the backend before credits are granted. Browser builds do not use native store APIs.

## Configure and build

Set the native application ID and store product IDs to the values registered for the app. Configure the HTTPS verification service and enable billing only after its store credentials, database, and receipt-verification setup are ready. Keep signing keys and store credentials out of the repository and client app.

From this directory, install dependencies and build the web assets:

```sh
npm ci
npm run build
```

Set `POCKET_APP_ID` to the registered application ID before adding a Capacitor platform, then sync the native project. Android builds require a compatible JDK and Android SDK. iOS builds require macOS and Xcode.

## Before release

Use store sandbox or license-test accounts and test purchases, cancellations, pending payments, recovery, duplicate deliveries, and refunds on devices. Verify localized prices from the store rather than hardcoding them. Complete each platform's store listing, privacy, and review requirements before submission.

Optional test wallets and client-confirmed test rewards require explicit server-side test configuration. They are disabled for production and must not be used to represent verified ad views or real purchase balances.
