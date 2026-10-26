import {Capacitor} from '@capacitor/core';
import {store,ProductType,Platform} from 'capacitor-plugin-cdv-purchase';
import config from './billing-config.json';
import {createPurchaseDelivery} from './purchase-delivery.js';

// The caller must provide an authenticated player session from the backend.
// No merchant credentials, validation keys, or service-account secrets belong here.
export async function startBilling(session,onWallet,onStatus){
 if(!Capacitor.isNativePlatform())return {available:false,reason:'Purchases are available in the mobile app.'};
 if(!config.enabled)return {available:false,reason:'Store products and receipt verification are not configured yet.'};
 if(!session?.playerId||!session?.accessToken)throw Error('Sign in before purchasing.');
 const origin=new URL(config.verificationOrigin);
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/')throw Error('A secure verification origin is required.');
 const platform=Capacitor.getPlatform()==='ios'?Platform.APPLE_APPSTORE:Platform.GOOGLE_PLAY;
 // Wallet IDs are random pseudonymous UUIDs; send this exact identifier to
 // Google so the authenticated server can enforce ownership. Apple keeps its
 // existing SDK identifier encoding for unfinished transactions.
 if(platform===Platform.GOOGLE_PLAY)store.obfuscator='disabled';
 const products=config.products.map(p=>({...p,id:platform===Platform.APPLE_APPSTORE?p.appleId:p.googleId}));
 if(!products.length||products.some(p=>!p.id))throw Error('Store product IDs are missing.');
 store.applicationUsername=()=>session.playerId;
 if(platform!==Platform.APPLE_APPSTORE)store.validator={url:new URL('/receipts/validate',origin).href,headers:{Authorization:`Bearer ${session.accessToken}`},timeout:20000};
 store.validator_privacy_policy=['fraud','support'];
 store.register(products.map(p=>({id:p.id,type:ProductType.CONSUMABLE,platform})));
 const appleDelivery=platform===Platform.APPLE_APPSTORE?createPurchaseDelivery(origin,session,onWallet,onStatus):null;
 store.when().pending(()=>onStatus('Apple reports this purchase as pending approval. No credits have been added; do not buy again.')).approved(transaction=>{onStatus('Apple approved the purchase. Verifying delivery…');if(appleDelivery)appleDelivery.deliver(transaction).catch(error=>onStatus(error.message));else transaction.verify();}).verified(async receipt=>{
  if(appleDelivery)return;
  // The validator must verify the store receipt and commit an idempotent ledger
  // grant before it reports success. Never grant credits from an approved event.
  try{
   const response=await fetch(new URL('/wallet',origin),{headers:{Authorization:`Bearer ${session.accessToken}`},cache:'no-store'});
   if(!response.ok)throw Error('Could not retrieve your verified purchase balance.');
   const wallet=await response.json();
   if(!Number.isSafeInteger(wallet.bolts)||wallet.bolts<0||!Number.isSafeInteger(wallet.undos)||wallet.undos<0)throw Error('Invalid purchase balance.');
   await onWallet(wallet);
   const delivered=new Set(receipt.collection.map(p=>p.transactionId));
   for(const transaction of receipt.sourceReceipt.transactions)if(delivered.has(transaction.transactionId))await transaction.finish();
   onStatus('Purchase verified and delivered.');
  }catch(error){onStatus(error.message+' Your transaction will be retried.');}
 }).unverified(()=>onStatus('Purchase verification is pending. No credits have been added.'));
 store.error(()=>onStatus('The store could not complete this request. Please try again.'));
 const errors=await store.initialize([platform]);
 if(errors?.length)throw Error('Store initialization failed.');
 return {
  available:true,
  list:()=>products.map(p=>{const product=store.get(p.id,platform);return {...p,price:product?.pricing?.price,available:!!product?.getOffer()};}),
  buy:async key=>{const p=products.find(p=>p.key===key);if(!p)throw Error('Unknown product.');const offer=store.get(p.id,platform)?.getOffer();if(!offer)throw Error('This product is not currently available.');const error=await offer.order();if(error)throw Error(error.message);},
  retry:async()=>{if(appleDelivery){for(const transaction of store.localTransactions)if(transaction.platform===platform&&transaction.state==='approved'&&!transaction.isAcknowledged)await appleDelivery.deliver(transaction);await appleDelivery.retry();}await store.update();if(store.localTransactions.some(transaction=>transaction.platform===platform&&transaction.state==='pending'))throw Error('Apple reports a pending purchase. No credits have been added; do not buy again.');}
 };
}
