// Native build includes the billing SDK; the live shop remains gated until
// account sign-in, the verification backend, and store products are configured.
import {startBilling} from './billing.js';
import {rewardedAds} from './rewarded-ads.js';
window.PocketWorkshopBilling={start:startBilling};
window.PocketWorkshopAds=rewardedAds;
await import('../dist/app.js');
