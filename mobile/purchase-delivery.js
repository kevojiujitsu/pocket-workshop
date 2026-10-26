// Finish only this transaction, and only after the server has delivered it.
export function createPurchaseDelivery(origin,session,onWallet,onStatus,fetcher=fetch){
 const pending=new Map(),running=new Map();
 async function deliver(transaction){
  const id=transaction.transactionId;
  if(typeof id!=='string'||!/^\d{1,32}$/.test(id)||typeof transaction.jwsRepresentation!=='string')throw Error('StoreKit transaction proof is unavailable.');
  if(running.has(id))return running.get(id);
  pending.set(id,transaction);
  const task=(async()=>{
   const response=await fetcher(new URL('/receipts/validate',origin),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.accessToken},body:JSON.stringify({transaction:{type:'apple-sk2',jwsRepresentation:transaction.jwsRepresentation}}),signal:AbortSignal.timeout(20000)});
   const verified=await response.json();if(!response.ok||verified.ok!==true||!verified.data?.collection?.some(p=>p.transactionId===id))throw Error('Purchase verification is pending. Use Sync wallet to retry; do not buy again.');
   const walletResponse=await fetcher(new URL('/wallet',origin),{headers:{Authorization:'Bearer '+session.accessToken},cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(!walletResponse.ok)throw Error('Your purchase is verified. Wallet delivery will retry.');
   const wallet=await walletResponse.json();if(!Number.isSafeInteger(wallet.bolts)||wallet.bolts<0||!Number.isSafeInteger(wallet.undos)||wallet.undos<0)throw Error('Wallet delivery will retry.');
   await onWallet(wallet);
   await transaction.finish();pending.delete(id);onStatus('Purchase verified and delivered.');
  })();
  running.set(id,task);
  try{return await task;}finally{running.delete(id);}
 }
 return {deliver,retry:async()=>{for(const transaction of [...pending.values()])await deliver(transaction);}};
}
