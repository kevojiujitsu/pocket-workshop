export const STARTING_BOLTS=5;
export const STARTING_UNDOS=3;
export const BOLT_PACKS=[{id:'bolts_5',quantity:5,previewPrice:'$0.99'},{id:'bolts_12',quantity:12,previewPrice:'$1.99'},{id:'bolts_35',quantity:35,previewPrice:'$4.99'}];
export const UNDO_PACKS=[{id:'undo_1',quantity:1,previewPrice:'$0.99'},{id:'undo_3',quantity:3,previewPrice:'$1.99'}];
export function spendUndo(balance){return balance>0?balance-1:null;}
export function spendAttempt(bolts){return Math.max(0,bolts-1);}
export function rewardBolt(bolts){return bolts>=STARTING_BOLTS?bolts:bolts+1;}
export function moveOutcome(used,cost,limit,isWin){return used+cost>limit?'failed':isWin?'won':used+cost===limit?'failed':'playing';}
