// Server-owned grants. Call only after store verification and player binding.
// Browser-provided prices, quantities, and wallet balances never authorize grants.
export const BUNDLE_ID='com.kevthedev.pocketworkshop';
const rows=[['undo1','undos',1],['undo3','undos',3],['bolts5','bolts',5],['bolts12','bolts',12],['bolts35','bolts',35]];
const catalog=new Map(rows.map(([suffix,currency,quantity])=>[`${BUNDLE_ID}.${suffix}`,Object.freeze({currency,quantity})]));
export function catalogGrant(productId,storeQuantity=1){
 const grant=catalog.get(productId);
 if(!grant)throw Error('Unknown store product');
 // These packs are configured for single-quantity checkout. Fail closed until
 // partial multi-quantity refunds and delivery are supported by the ledger.
 if(storeQuantity!==1)throw Error('Unsupported checkout quantity');
 return {...grant};
}
