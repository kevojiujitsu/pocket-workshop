// Native storage contains the wallet access code; the backend stores its hash.
export function createWalletClient(storage,origin,fetcher=fetch,options={}){
 let record,connected=false,listener=()=>{},queue=Promise.resolve();
 const validWallet=value=>value&&Number.isSafeInteger(value.bolts)&&value.bolts>=0&&Number.isSafeInteger(value.undos)&&value.undos>=0;
 const validCode=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value);
 async function save(){await storage.save({value:JSON.stringify(record)});}
 async function request(path,body,code=record?.accessToken){
  const response=await fetcher(new URL(path,origin),{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(code?{Authorization:'Bearer '+code}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!response.ok){const error=Error(response.status===401?'The wallet access code was not recognized.':response.status===409?'This wallet does not have enough credits.':'Wallet connection unavailable. Please retry.');error.status=response.status;throw error;}
  return response.json();
 }
 async function update(value){if(!validWallet(value))throw Error('Invalid wallet response.');record.wallet=value;await save();listener(value);return value;}
 function serial(action){const work=queue.then(action);queue=work.catch(()=>{});return work;}
 const client={
  get available(){return true;},get testMode(){return record?.testMode===true;},get connected(){return connected;},get playerId(){return record?.playerId;},get session(){return record?.playerId?{playerId:record.playerId,accessToken:record.accessToken}:null;},get balance(){return record?.wallet||{bolts:0,undos:0};},get pendingSpend(){return record?.pendingSpend;},
  onChange(fn){listener=fn;},
  async load(){const saved=await storage.load();if(saved.value){try{record=JSON.parse(saved.value);}catch{throw Error('Wallet storage could not be read. Restore your wallet access code.');}if(!validCode(record.accessToken)||!validWallet(record.wallet))throw Error('Wallet storage is invalid. Restore your wallet access code.');}else{const bytes=crypto.getRandomValues(new Uint8Array(32));const code=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');record={accessToken:code,wallet:{bolts:0,undos:0}};await save();}return record.wallet;},
  connect:()=>serial(async()=>{
   if(!record)await client.load();
   const data=await request(record.playerId?'/session/recover':'/session',record.playerId?{}:{accessToken:record.accessToken,testMode:options.testMode===true});
   if(data.testMode===true&&options.testMode!==true)throw Error('Test wallets and release wallets are separate. Use the matching wallet access code.');
   if(typeof data.playerId!=='string'||!validWallet(data.wallet))throw Error('Invalid session response.');
   record.playerId=data.playerId;record.testMode=data.testMode===true;connected=true;await update(data.wallet);return client.session;
  }),
  refresh:()=>serial(async()=>{const value=await request('/wallet');connected=true;return update(value);}),
  spend:(currency,requestId)=>serial(async()=>{
   if(!['bolts','undos'].includes(currency)||!/^[-a-f0-9]{36}$/i.test(requestId))throw Error('Invalid wallet operation.');
   if(record.pendingSpend&&(record.pendingSpend.requestId!==requestId||record.pendingSpend.currency!==currency))throw Error('Finish syncing the previous wallet action first.');
   record.pendingSpend={currency,requestId};await save();
   try{const value=await request('/wallet/spend',{currency,requestId});await update(value);delete record.pendingSpend;await save();return value;}
   catch(error){if(error.status===409){delete record.pendingSpend;await save();await update(await request('/wallet'));}throw error;}
  }),
  recoveryCode:()=>record?.accessToken||'',
  recover:code=>serial(async()=>{
   code=code.trim();if(!validCode(code))throw Error('Enter the complete wallet access code.');
   if(record?.pendingSpend)throw Error('Sync the current wallet action before changing wallets.');
   const data=await request('/session/recover',{},code);if(!data.playerId||!validWallet(data.wallet))throw Error('Invalid wallet response.');
   if(data.testMode===true&&options.testMode!==true)throw Error('Test wallets and release wallets are separate.');
   record={accessToken:code,playerId:data.playerId,testMode:data.testMode===true,wallet:data.wallet};await save();connected=true;listener(data.wallet);return data.wallet;
  }),
  async createAdIntent(){const data=await request('/ads/intent',{});if(typeof data.intentId!=='string')throw Error('Ad reward is unavailable.');return {intentId:data.intentId,playerId:record.playerId};},
  async waitForAd(intentId){
   if(record?.testMode===true){const data=await request('/ads/test-complete',{intentId});await update(data.wallet);return {bolts:1,wallet:data.wallet};}
   for(let attempt=0;attempt<20;attempt++){
    const data=await request('/ads/status?intentId='+encodeURIComponent(intentId));
    if(data.confirmed){await update(data.wallet);return {bolts:data.amount,wallet:data.wallet};}
    await new Promise(resolve=>setTimeout(resolve,1000));
   }
   throw Error('Your completed ad reward is awaiting verification. Use Sync wallet to check again shortly.');
  }
 };
 return client;
}
