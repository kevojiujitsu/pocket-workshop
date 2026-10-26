// Native build includes the billing SDK; the live shop remains gated until
// account sign-in, the verification backend, and store products are configured.
import {startBilling} from './billing.js';
import {rewardedAds} from './rewarded-ads.js';
import {nativeWallet} from './native-wallet.js';
window.PocketWorkshopBilling={start:startBilling};
window.PocketWorkshopAds=rewardedAds;
window.PocketWorkshopWallet=nativeWallet;
if(nativeWallet){try{await nativeWallet.load();}catch(error){window.PocketWorkshopWalletError=error.message;}}
await import('./game.js');
