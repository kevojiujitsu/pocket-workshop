import assert from 'node:assert/strict';
import {createPurchaseDelivery} from './purchase-delivery.js';
let confirmations=new Set(),finished=[],delivered=[],failWallet=true;
const transactions=['1001','1002'].map(id=>({transactionId:id,jwsRepresentation:'proof-'+id,finish:async()=>finished.push(id)}));
const fetcher=async(url,options)=>{
 if(url.pathname==='/receipts/validate'){const proof=JSON.parse(options.body).transaction.jwsRepresentation;const id=proof.slice(6);confirmations.add(id);return Response.json({ok:true,data:{collection:[{transactionId:id}]}});}
 if(failWallet){failWallet=false;return new Response('',{status:503});}
 return Response.json({bolts:5+confirmations.size*5,undos:3});
};
const delivery=createPurchaseDelivery('https://test.invalid',{accessToken:'secret'},async wallet=>delivered.push(wallet),()=>{},fetcher);
await assert.rejects(delivery.deliver(transactions[0]),/retry/);assert.deepEqual(finished,[],'A wallet outage cannot finish the transaction');
await delivery.retry();assert.deepEqual(finished,['1001']);assert.equal(confirmations.size,1,'Verification retry grants once');
await Promise.all([delivery.deliver(transactions[1]),delivery.deliver(transactions[1])]);assert.deepEqual(finished,['1001','1002'],'Concurrent callbacks finish only their confirmed transaction once');
assert.equal(delivered.at(-1).bolts,15);
const rejected=createPurchaseDelivery('https://test.invalid',{accessToken:'secret'},async()=>{},()=>{},async()=>Response.json({ok:false}));
await assert.rejects(rejected.deliver(transactions[0]),/pending/);assert.equal(finished.length,2);
console.log('Purchase delivery checks pass: retry after verification, wallet outage, concurrent callback deduplication, and finish only the delivered transaction.');
