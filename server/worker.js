import {hash,base64url,encryptProof,decryptProof} from './crypto.js';
import {verifyPurchase,RevokedPurchase} from './verify.js';
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
 const id=crypto.randomUUID(),token=base64url(crypto.getRandomValues(new Uint8Array(32)));
 await env.DB.prepare('INSERT INTO players(id,token_hash,created_at) VALUES(?,?,?)').bind(id,await hash(token),Date.now()).run();
 return {playerId:id,accessToken:token,wallet:await wallet(env,id)};
}
function validatedReply(productId,native,transactionId){return {ok:true,data:{id:productId,latest_receipt:true,transaction:native,collection:[{id:productId,transactionId,quantity:1}],date:new Date().toISOString()}};}
export async function validateAndGrant(request,env,id,body){
 if(env.PURCHASES_ENABLED!=='true'||!env.LEDGER_KEY)throw Error('Purchases are not enabled');
 const verified=await verifyPurchase(body,id,env);
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
export default {
 async scheduled(event,env){
  if(env.PURCHASES_ENABLED!=='true'||!env.DB||!env.LEDGER_KEY)return;
  const rows=await env.DB.prepare('SELECT * FROM purchase_receipts WHERE refunded=0 ORDER BY verified_at LIMIT 25').all();
  for(const row of rows.results){
   try{
    const proof=await decryptProof(row.proof_ciphertext,env.LEDGER_KEY);
    const transaction=row.platform==='google'?{type:'android-playstore',purchaseToken:proof}:{type:'apple-sk2',jwsRepresentation:'e30.'+base64url(new TextEncoder().encode(JSON.stringify({transactionId:proof})))+'.eA'};
    await verifyPurchase({transaction},row.player_id,env);
    await env.DB.prepare('UPDATE purchase_receipts SET verified_at=? WHERE proof_key=?').bind(Date.now(),row.proof_key).run();
   }catch(error){
    if(!(error instanceof RevokedPurchase))continue; // Never treat an outage as a refund.
    await env.DB.batch([
     env.DB.prepare('UPDATE purchase_receipts SET refunded=1,verified_at=? WHERE proof_key=?').bind(Date.now(),row.proof_key),
     env.DB.prepare("INSERT INTO wallet_events(id,player_id,currency,amount,kind,receipt_key,created_at) VALUES(?,?,?,?,'refund',?,?) ON CONFLICT(receipt_key,kind) DO NOTHING").bind(crypto.randomUUID(),row.player_id,row.currency,-row.quantity,row.proof_key,Date.now())
    ]);
   }
  }
  await env.DB.prepare('DELETE FROM session_limits WHERE expires_at<?').bind(Math.floor(Date.now()/1000)).run();
 },
 async fetch(request,env){
  const url=new URL(request.url);
  if(request.method==='OPTIONS')return reply(request,{},204);
  const origin=request.headers.get('Origin');if(origin&&!allowedOrigins.has(origin))return reply(request,{error:'Origin not allowed'},403);
  try{
   if(url.pathname==='/health'&&request.method==='GET')return reply(request,{service:'Pocket Workshop purchases',status:'setup',purchasesEnabled:env.PURCHASES_ENABLED==='true',databaseBound:!!env.DB});
   if(!env.DB)throw Error('Wallet database is not configured');
   if(url.pathname==='/session'&&request.method==='POST')return reply(request,await createSession(request,env),201);
   const id=await player(request,env);
   if(url.pathname==='/wallet'&&request.method==='GET')return reply(request,await wallet(env,id));
   if(url.pathname==='/wallet/spend'&&request.method==='POST')return reply(request,await spend(env,id,await bodyJSON(request)));
   if(url.pathname==='/receipts/validate'&&request.method==='POST')return reply(request,await validateAndGrant(request,env,id,await bodyJSON(request)));
   return reply(request,{error:'Not found'},404);
  }catch(error){
   if(error.message==='UNAUTHORIZED')return reply(request,{error:'Unauthorized'},401);
   // Do not leak tokens, upstream store responses, SQL, or secret values.
   return reply(request,url.pathname==='/receipts/validate'?{ok:false,code:6777017,message:'Purchase verification is pending or unavailable. No credits issued.'}:{error:'Request could not be completed. Please try again.'},url.pathname==='/receipts/validate'?200:503);
  }
 }
};
