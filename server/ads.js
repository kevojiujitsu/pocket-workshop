import {decodeBase64} from './crypto.js';
const units=new Set(['6478574518','5744077340','ca-app-pub-3480946078852152/6478574518','ca-app-pub-3480946078852152/5744077340']);
let keysCache;
export function derSignature(bytes){
 let offset=0;
 if(bytes[offset++]!==48)throw Error('Invalid signature');
 const length=bytes[offset++];if(length!==bytes.length-2)throw Error('Invalid signature length');
 const output=new Uint8Array(64);
 for(let part=0;part<2;part++){
  if(bytes[offset++]!==2)throw Error('Invalid signature integer');
  const size=bytes[offset++];let value=bytes.slice(offset,offset+size);offset+=size;
  if(value.length===33&&value[0]===0)value=value.slice(1);
  if(!value.length||value.length>32)throw Error('Invalid signature integer length');
  output.set(value,part*32+32-value.length);
 }
 if(offset!==bytes.length)throw Error('Invalid signature trailing data');return output;
}
export async function verifyAdCallback(url,fetcher=fetch){
 const raw=url.search.slice(1),match=raw.match(/^(.*)&signature=([^&]+)&key_id=(\d+)$/);
 if(!match||raw.length>16000)throw Error('Invalid ad callback');
 const params=url.searchParams;
 const probe=params.get('ad_unit')==='1234567890'&&params.get('transaction_id')==='123456789';
 for(const key of params.keys())if(params.getAll(key).length!==1)throw Error('Duplicate ad callback field');
 if((!probe&&!units.has(params.get('ad_unit')))||params.get('reward_amount')!=='1')throw Error('Unexpected reward');
 const stamp=Number(params.get('timestamp'));
 if(!Number.isSafeInteger(stamp)||Math.abs(Date.now()-stamp)>86400000)throw Error('Expired reward');
 if(!probe&&!/^[a-f0-9]{16,256}$/i.test(params.get('transaction_id')||''))throw Error('Invalid reward ID');
 if(!keysCache||keysCache.expires<Date.now()||!keysCache.keys.some(k=>String(k.keyId)===match[3])){
  const response=await fetcher('https://www.gstatic.com/admob/reward/verifier-keys.json',{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Reward verification unavailable');
  const data=await response.json();if(!Array.isArray(data.keys))throw Error('Invalid verification keys');
  keysCache={keys:data.keys,expires:Date.now()+3600000};
 }
 const record=keysCache.keys.find(k=>String(k.keyId)===match[3]);if(!record)throw Error('Unknown ad verification key');
 const key=await crypto.subtle.importKey('spki',decodeBase64(record.base64),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 const valid=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,derSignature(decodeBase64(decodeURIComponent(match[2]))),new TextEncoder().encode(match[1]));
 if(!valid)throw Error('Invalid ad signature');
 // Google's dashboard uses fixed placeholder IDs for its verification probe.
 // Verify that signature, acknowledge connectivity, and NEVER issue a reward.
 if(probe)return {probe:true};
 return {intentId:params.get('custom_data'),playerId:params.get('user_id'),transactionId:params.get('transaction_id')};
}
export async function grantAd(env,reward,testReward=false){
 const intent=await env.DB.prepare('SELECT player_id,expires_at FROM ad_intents WHERE id=?').bind(reward.intentId).first();
 if(!intent||intent.player_id!==reward.playerId)throw Error('Unknown reward intent');
 const account=await env.DB.prepare('SELECT is_test FROM players WHERE id=?').bind(reward.playerId).first();
 if(!!account?.is_test!==testReward)throw Error('Wrong reward environment');
 const previous=await env.DB.prepare('SELECT player_id,intent_id FROM ad_rewards WHERE transaction_id=?').bind(reward.transactionId).first();
 if(previous){if(previous.player_id!==reward.playerId||previous.intent_id!==reward.intentId)throw Error('Reward conflict');return;}
 if(intent.expires_at<Date.now())throw Error('Expired reward intent');
 // The grant amount and cap are evaluated atomically against the current wallet.
 await env.DB.prepare('INSERT INTO ad_rewards(transaction_id,intent_id,player_id,amount,created_at) SELECT ?,?,?,MIN(1,MAX(0,5-bolts)),? FROM players WHERE id=? ON CONFLICT DO NOTHING').bind(reward.transactionId,reward.intentId,reward.playerId,Date.now(),reward.playerId).run();
}
