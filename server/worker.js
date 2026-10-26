import {hash,base64url,encryptProof,decryptProof,decodeJWT} from './crypto.js';
import {verifyPurchase,RevokedPurchase} from './verify.js';
import {publicPage} from './public-pages.js';
import {verifyAdCallback,grantAd} from './ads.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedOrigins=new Set(['capacitor://localhost','https://localhost','http://localhost']);
function reply(request,value,status=200){
 const origin=request.headers.get('Origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(allowedOrigins.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'});
 return new Response(status===204?null:JSON.stringify(value),{status,headers});
}
async function bodyJSON(request){
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw Error('JSON required');
 const reader=request.body?.getReader();if(!reader)throw Error('Missing request');
 let size=0,parts=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();throw Error('Request too large');}parts.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
 return JSON.parse(new TextDecoder().decode(bytes));
}
async function player(request,env){
 const token=request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
 if(!token)throw Error('UNAUTHORIZED');
 const row=await env.DB.prepare('SELECT id FROM players WHERE token_hash=?').bind(await hash(token)).first();
 if(!row)throw Error('UNAUTHORIZED');return row.id;
}
async function wallet(env,id){
 const row=await env.DB.prepare('SELECT bolts,undos FROM players WHERE id=?').bind(id).first();
 if(!row)throw Error('UNAUTHORIZED');
 return {bolts:Math.max(0,row.bolts),undos:Math.max(0,row.undos)};
}
async function createSession(request,env){
 // Device wallets are disabled until recovery/identity and device sandbox tests
 // are completed. This flag is separate from enabling receipt verification.
 if(env.SESSIONS_ENABLED!=='true'||!env.SESSION_SALT)throw Error('Session setup is not complete');
 const day=Math.floor(Date.now()/86400000),bucket=await hash(env.SESSION_SALT+':'+day+':'+(request.headers.get('CF-Connecting-IP')||'unknown'));
 await env.DB.prepare('INSERT INTO session_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1').bind(bucket,(day+2)*86400).run();
 const limit=await env.DB.prepare('SELECT count FROM session_limits WHERE bucket=?').bind(bucket).first();
 if(limit.count>8)throw Error('Session limit reached');
 const body=await bodyJSON(request);
 // The device creates and securely stores a high-entropy recovery code BEFORE
 // enrollment. Retrying an interrupted enrollment cannot create extra wallets.
 const token=body.accessToken;
 if(typeof token!=='string'||! /^[A-Za-z0-9_-]{43}$/.test(token))throw Error('Invalid wallet access code');
 const tokenHash=await hash(token),existing=await env.DB.prepare('SELECT id,is_test FROM players WHERE token_hash=?').bind(tokenHash).first();
 if(existing)return {playerId:existing.id,accessToken:token,testMode:!!existing.is_test,wallet:await wallet(env,existing.id)};
 const id=crypto.randomUUID();
 await env.DB.prepare('INSERT INTO players(id,token_hash,created_at,is_test) VALUES(?,?,?,?) ON CONFLICT(token_hash) DO NOTHING').bind(id,tokenHash,Date.now(),body.testMode===true?1:0).run();
 const enrolled=await env.DB.prepare('SELECT id,is_test FROM players WHERE token_hash=?').bind(tokenHash).first();
 return {playerId:enrolled.id,accessToken:token,testMode:!!enrolled.is_test,wallet:await wallet(env,enrolled.id)};
}
function validatedReply(productId,native,transactionId){return {ok:true,data:{id:productId,latest_receipt:true,transaction:native,collection:[{id:productId,transactionId,quantity:1}],date:new Date().toISOString()}};}
export async function validateAndGrant(request,env,id,body){
 if(env.PURCHASES_ENABLED!=='true'||!env.LEDGER_KEY)throw Error('Purchases are not enabled');
 const account=await env.DB.prepare('SELECT is_test FROM players WHERE id=?').bind(id).first();
 const verified=await verifyPurchase(body,id,account?.is_test?{...env,STORE_ENV:'sandbox'}:env);
 const existing=await env.DB.prepare('SELECT player_id,refunded FROM purchase_receipts WHERE proof_key=?').bind(verified.proofKey).first();
 if(existing&&(existing.player_id!==id||existing.refunded))throw Error('Purchase cannot be delivered');
 if(!existing){
  const proof=await encryptProof(verified.proof,env.LEDGER_KEY),eventId=crypto.randomUUID(),time=Date.now();
  // A transaction rolls both inserts back on conflict or failure. No credit can
  // be granted without the receipt, nor can a receipt grant twice.
  try{await env.DB.batch([
   env.DB.prepare('INSERT INTO purchase_receipts(proof_key,player_id,platform,product_id,currency,quantity,proof_ciphertext,verified_at) VALUES(?,?,?,?,?,?,?,?)').bind(verified.proofKey,id,verified.platform,verified.productId,verified.currency,verified.quantity,proof,time),
   env.DB.prepare("INSERT INTO wallet_events(id,player_id,currency,amount,kind,receipt_key,created_at) VALUES(?,?,?,?,'purchase',?,?)").bind(eventId,id,verified.currency,verified.quantity,verified.proofKey,time)
  ]);}catch(error){
   const duplicate=await env.DB.prepare('SELECT player_id,refunded FROM purchase_receipts WHERE proof_key=?').bind(verified.proofKey).first();
   if(!duplicate||duplicate.player_id!==id||duplicate.refunded)throw error;
  }
 }
 return validatedReply(verified.productId,verified.native,verified.transactionId);
}
async function spend(env,id,body){
 if(!uuid.test(body.requestId)||!['bolts','undos'].includes(body.currency))throw Error('Invalid spend request');
 const previous=await env.DB.prepare('SELECT player_id,currency,kind FROM wallet_events WHERE id=?').bind(body.requestId).first();
 if(previous){if(previous.player_id!==id||previous.currency!==body.currency||previous.kind!=='spend')throw Error('Request conflict');return wallet(env,id);}
 try{await env.DB.prepare("INSERT INTO wallet_events(id,player_id,currency,amount,kind,created_at) VALUES(?,?,?,-1,'spend',?)").bind(body.requestId,id,body.currency,Date.now()).run();}
 catch(error){const duplicate=await env.DB.prepare('SELECT player_id,currency,kind FROM wallet_events WHERE id=?').bind(body.requestId).first();if(!duplicate||duplicate.player_id!==id||duplicate.currency!==body.currency||duplicate.kind!=='spend')throw error;}
 return wallet(env,id);
}
export async function reconcileReceipt(env,row,verifier=verifyPurchase){
 try{
  const proof=await decryptProof(row.proof_ciphertext,env.LEDGER_KEY);
  const transaction=row.platform==='google'?{type:'android-playstore',purchaseToken:proof}:{type:'apple-sk2',jwsRepresentation:'e30.'+base64url(new TextEncoder().encode(JSON.stringify({transactionId:proof})))+'.eA'};
  await verifier({transaction},row.player_id,env);
  await env.DB.prepare('UPDATE purchase_receipts SET verified_at=? WHERE proof_key=?').bind(Date.now(),row.proof_key).run();
 }catch(error){
  if(!(error instanceof RevokedPurchase))throw error;
  await env.DB.batch([
   env.DB.prepare('UPDATE purchase_receipts SET refunded=1,verified_at=? WHERE proof_key=?').bind(Date.now(),row.proof_key),
   env.DB.prepare("INSERT INTO wallet_events(id,player_id,currency,amount,kind,receipt_key,created_at) VALUES(?,?,?,?,'refund',?,?) ON CONFLICT(receipt_key,kind) DO NOTHING").bind(crypto.randomUUID(),row.player_id,row.currency,-row.quantity,row.proof_key,Date.now())
  ]);
 }
}
export default {
 async scheduled(event,env){
  if(env.PURCHASES_ENABLED!=='true'||!env.DB||!env.LEDGER_KEY)return;
  const rows=await env.DB.prepare('SELECT * FROM purchase_receipts WHERE refunded=0 ORDER BY verified_at LIMIT 25').all();
  for(const row of rows.results){try{await reconcileReceipt(env,row);}catch{/* An outage never authorizes a refund. */}}
  await env.DB.prepare('DELETE FROM session_limits WHERE expires_at<?').bind(Math.floor(Date.now()/1000)).run();
 },
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/ads/ssv'&&request.method==='GET'){
   try{if(env.ADS_ENABLED!=='true')throw Error('Ads disabled');const reward=await verifyAdCallback(url);if(!reward.probe)await grantAd(env,reward);return new Response('OK',{headers:{'Cache-Control':'no-store'}});}
   catch(error){console.warn('Ad reward validation failed:',error.message);return new Response('Reward verification unavailable',{status:400});}
  }
  if(request.method==='GET'){const page=publicPage(url.pathname);if(page)return page;}
  if(request.method==='OPTIONS')return reply(request,{},204);
  const origin=request.headers.get('Origin');if(origin&&!allowedOrigins.has(origin))return reply(request,{error:'Origin not allowed'},403);
  try{
   if(url.pathname==='/health'&&request.method==='GET')return reply(request,{service:'Pocket Workshop purchases',status:env.PURCHASES_ENABLED==='true'?'enabled':'setup',purchasesEnabled:env.PURCHASES_ENABLED==='true',sessionsEnabled:env.SESSIONS_ENABLED==='true',adsEnabled:env.ADS_ENABLED==='true',databaseBound:!!env.DB});
   if(!env.DB)throw Error('Wallet database is not configured');
   if(url.pathname==='/session'&&request.method==='POST')return reply(request,await createSession(request,env),201);
   if(url.pathname==='/apple/notifications'&&request.method==='POST'){
    if(env.PURCHASES_ENABLED!=='true')throw Error('Purchases disabled');
    const body=await bodyJSON(request),payload=decodeJWT(body.signedPayload);
    // A notification is only a hint. Its untrusted claims NEVER grant or revoke
    // credits: look up an existing receipt, then re-fetch its status from Apple.
    if(payload.data?.signedTransactionInfo){
     const transactionId=decodeJWT(payload.data.signedTransactionInfo).transactionId;
     if(typeof transactionId!=='string'||!/^\d{1,32}$/.test(transactionId))throw Error('Invalid notification');
     const row=await env.DB.prepare('SELECT * FROM purchase_receipts WHERE proof_key=? AND platform=\'apple\'').bind('apple:'+await hash(transactionId)).first();
     if(row&&!row.refunded)await reconcileReceipt(env,row);
    }
    return reply(request,{received:true});
   }
   const id=await player(request,env);
   if(url.pathname==='/session/recover'&&request.method==='POST'){const account=await env.DB.prepare('SELECT is_test FROM players WHERE id=?').bind(id).first();return reply(request,{playerId:id,testMode:!!account.is_test,wallet:await wallet(env,id)});}
   if(url.pathname==='/wallet'&&request.method==='GET')return reply(request,await wallet(env,id));
   if(url.pathname==='/wallet/spend'&&request.method==='POST')return reply(request,await spend(env,id,await bodyJSON(request)));
   if(url.pathname==='/ads/intent'&&request.method==='POST'){
    if(env.ADS_ENABLED!=='true'||(await wallet(env,id)).bolts>=5)throw Error('Reward unavailable');
    const intentId=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO ad_intents(id,player_id,expires_at) VALUES(?,?,?)').bind(intentId,id,Date.now()+86400000).run();
    return reply(request,{intentId});
   }
   if(url.pathname==='/ads/status'&&request.method==='GET'){
    const reward=await env.DB.prepare('SELECT amount FROM ad_rewards WHERE intent_id=? AND player_id=?').bind(url.searchParams.get('intentId'),id).first();
    return reply(request,{confirmed:!!reward,amount:reward?.amount??0,wallet:await wallet(env,id)});
   }
   if(url.pathname==='/ads/test-complete'&&request.method==='POST'){
    const account=await env.DB.prepare('SELECT is_test FROM players WHERE id=?').bind(id).first();
    if(env.AD_TEST_REWARDS_ENABLED!=='true'||!account?.is_test)throw Error('Test rewards are not available for this wallet');
    const body=await bodyJSON(request);if(!uuid.test(body.intentId))throw Error('Invalid test reward');
    await grantAd(env,{intentId:body.intentId,playerId:id,transactionId:'test:'+body.intentId},true);
    return reply(request,{wallet:await wallet(env,id)});
   }
   if(url.pathname==='/receipts/validate'&&request.method==='POST')return reply(request,await validateAndGrant(request,env,id,await bodyJSON(request)));
   return reply(request,{error:'Not found'},404);
  }catch(error){
   if(url.pathname==='/receipts/validate'){
    const known=['Apple verification not configured','Apple verification unavailable or transaction invalid','Apple transaction not found','Purchase belongs to a different player','Wrong store environment','Unexpected Apple transaction','Missing store quantity','Invalid Apple transaction ID','Purchase revoked','Invalid Apple purchase'];
    console.warn('Purchase verification failure category',known.includes(error.message)?error.message:'Other verification or ledger failure');
   }
   if(String(error.message).includes('INSUFFICIENT_BALANCE'))return reply(request,{error:'Insufficient balance'},409);
   if(error.message==='UNAUTHORIZED')return reply(request,{error:'Unauthorized'},401);
   // Do not leak tokens, upstream store responses, SQL, or secret values.
   return reply(request,url.pathname==='/receipts/validate'?{ok:false,code:6777017,message:'Purchase verification is pending or unavailable. No credits issued.'}:{error:'Request could not be completed. Please try again.'},url.pathname==='/receipts/validate'?200:503);
  }
 }
};
