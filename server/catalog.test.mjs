import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {catalogGrant,BUNDLE_ID} from './catalog.js';
const config=JSON.parse(readFileSync(new URL('../mobile/billing-config.json',import.meta.url)));
for(const product of config.products){
 const expected={currency:product.kind==='undo'?'undos':'bolts',quantity:product.quantity};
 assert.deepEqual(catalogGrant(product.googleId),expected);
 assert.deepEqual(catalogGrant(product.appleId),expected);
}
assert.throws(()=>catalogGrant(`${BUNDLE_ID}.bolts999`));
for(const quantity of [0,-1,2,Infinity,'1',null])assert.throws(()=>catalogGrant(`${BUNDLE_ID}.bolts5`,quantity));
const mutable=catalogGrant(`${BUNDLE_ID}.bolts5`);mutable.quantity=999;
assert.equal(catalogGrant(`${BUNDLE_ID}.bolts5`).quantity,5);
console.log('Five server catalog grants match both stores; invalid products and quantities rejected.');
