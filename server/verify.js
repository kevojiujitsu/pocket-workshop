import {BUNDLE_ID,catalogGrant} from './catalog.js';
import {decodeJWT,signJWT,hash} from './crypto.js';
let googleCache,appleCache;
export class RevokedPurchase extends Error {}
const now=()=>Math.floor(Date.now()/1000);
async function jsonFetch(url,options,fetcher){
 const response=await fetcher(url,{...options,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Store verification unavailable or transaction invalid');
 return response.json();
}
async function googleAccess(env,fetcher){
 if(googleCache?.expiry>now()+60)return googleCache.token;
 const credentials=JSON.parse(env.GOOGLE_SERVICE_ACCOUNT||'{}');
 if(!credentials.client_email||!credentials.private_key)throw Error('Google verification not configured');
 const assertion=await signJWT({iss:credentials.client_email,scope:'https://www.googleapis.com/auth/androidpublisher',aud:'https://oauth2.googleapis.com/token',iat:now(),exp:now()+3500},credentials.private_key,'RS256',credentials.private_key_id);
 const response=await jsonFetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})},fetcher);
 if(!response.access_token)throw Error('Store authentication failed');
 googleCache={token:response.access_token,expiry:now()+Math.min(response.expires_in||3000,3500)};return googleCache.token;
}
async function appleAccess(env){
 if(appleCache?.expiry>now()+60)return appleCache.token;
 if(!env.APPLE_PRIVATE_KEY||!env.APPLE_KEY_ID||!env.APPLE_ISSUER_ID)throw Error('Apple verification not configured');
 const token=await signJWT({iss:env.APPLE_ISSUER_ID,iat:now(),exp:now()+600,aud:'appstoreconnect-v1',bid:BUNDLE_ID},env.APPLE_PRIVATE_KEY,'ES256',env.APPLE_KEY_ID);
 appleCache={token,expiry:now()+600};return token;
}
export function normalizeGoogle(data,playerId,environment){
 if(data.purchaseStateContext?.purchaseState==='CANCELLED')throw new RevokedPurchase('Purchase cancelled');
 if(data.purchaseStateContext?.purchaseState!=='PURCHASED'||!data.purchaseCompletionTime)throw Error('Purchase is not completed');
 if(data.obfuscatedExternalAccountId!==playerId)throw Error('Purchase belongs to a different player');
 if(!!data.testPurchaseContext!==(environment==='sandbox'))throw Error('Wrong store environment');
 if(data.productLineItem?.length!==1)throw Error('Unexpected purchase contents');
 const line=data.productLineItem[0],offer=line.productOfferDetails;
 if(!Number.isSafeInteger(offer?.quantity))throw Error('Missing store quantity');
 const grant=catalogGrant(line.productId,offer.quantity);
 if(Number.isSafeInteger(offer.refundableQuantity)&&offer.refundableQuantity<offer.quantity)throw new RevokedPurchase('Purchase refunded');
 if(offer.refundableQuantity!==offer.quantity||offer.rentOfferDetails||offer.preorderOfferDetails)throw Error('Unsupported purchase');
 return {platform:'google',productId:line.productId,...grant,transactionId:data.orderId||null};
}
export function normalizeApple(data,playerId,environment,transactionId){
 if(data.bundleId!==BUNDLE_ID||data.transactionId!==transactionId||data.type!=='Consumable')throw Error('Unexpected Apple transaction');
 if(data.appAccountToken?.toLowerCase()!==playerId.toLowerCase())throw Error('Purchase belongs to a different player');
 if(data.environment!==(environment==='sandbox'?'Sandbox':'Production'))throw Error('Wrong store environment');
 if(data.revocationDate||data.revocationReason!==undefined)throw new RevokedPurchase('Purchase revoked');
 if(!data.purchaseDate)throw Error('Invalid Apple purchase');
 if(!Number.isSafeInteger(data.quantity))throw Error('Missing store quantity');
 return {platform:'apple',productId:data.productId,...catalogGrant(data.productId,data.quantity),transactionId};
}
export async function verifyPurchase(body,playerId,env,fetcher=fetch){
 const transaction=body.transaction;
 if(!['sandbox','production'].includes(env.STORE_ENV))throw Error('Store environment not configured');
 if(transaction?.type==='android-playstore'){
  const proof=transaction.purchaseToken;
  if(typeof proof!=='string'||proof.length<10||proof.length>4096)throw Error('Invalid purchase token');
  const data=await jsonFetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${BUNDLE_ID}/purchases/productsv2/tokens/${encodeURIComponent(proof)}`,{headers:{Authorization:'Bearer '+await googleAccess(env,fetcher)}},fetcher);
  return {...normalizeGoogle(data,playerId,env.STORE_ENV),proof,proofKey:'google:'+await hash(proof),native:{type:'android-playstore',orderId:data.orderId,purchaseState:0,quantity:1}};
 }
 if(transaction?.type==='apple-sk2'){
  // Client JWS is used only to locate a transaction. Its claims never grant credits.
  const id=decodeJWT(transaction.jwsRepresentation).transactionId;
  if(typeof id!=='string'||!/^\d{1,32}$/.test(id))throw Error('Invalid Apple transaction ID');
  const origin=env.STORE_ENV==='sandbox'?'https://api.storekit-sandbox.apple.com':'https://api.storekit.apple.com';
  const result=await jsonFetch(`${origin}/inApps/v1/transactions/${id}`,{headers:{Authorization:'Bearer '+await appleAccess(env)}},fetcher);
  // Only the response fetched directly from Apple's authenticated HTTPS API is
  // decoded here. Never substitute a client-supplied JWS for this response.
  const trusted=decodeJWT(result.signedTransactionInfo);
  return {...normalizeApple(trusted,playerId,env.STORE_ENV,id),proof:id,proofKey:'apple:'+await hash(id),native:{type:'apple-sk2'}};
 }
 throw Error('Unsupported store receipt; StoreKit 2 is required on iOS');
}
