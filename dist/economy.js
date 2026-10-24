export const STARTING_BOLTS=5;
export function spendAttempt(bolts){return Math.max(0,bolts-1);}
export function rewardBolt(bolts){return Math.min(STARTING_BOLTS,bolts+1);}
export function moveOutcome(used,cost,limit,isWin){return used+cost>limit?'failed':isWin?'won':used+cost===limit?'failed':'playing';}
