import assert from 'node:assert/strict';
import {levels,initial,moves,apply,solve,won} from './dist/engine.js';
import {STARTING_BOLTS,spendAttempt,rewardBolt,moveOutcome} from './dist/economy.js';
assert.equal(STARTING_BOLTS,5);
assert.equal(spendAttempt(1),0);assert.equal(spendAttempt(0),0);
assert.equal(rewardBolt(0),1);assert.equal(rewardBolt(5),5);
assert.equal(moveOutcome(9,1,10,true),'won','Win on final move must not cost a bolt');
assert.equal(moveOutcome(9,1,10,false),'failed');
assert.equal(moveOutcome(9,2,10,true),'failed','Over-budget win must fail');
assert.equal(moveOutcome(8,1,10,false),'playing');
for(let i=0;i<levels.length;i++){
 let s=initial(i);const cells=new Set();
 for(const [x,y,n,d] of s)for(let k=0;k<n;k++){const xx=x+(d==='h'?k:0),yy=y+(d==='v'?k:0),key=`${xx},${yy}`;assert(xx>=0&&xx<6&&yy>=0&&yy<6);assert(!cells.has(key),'Overlapping pieces');cells.add(key);}
 const path=solve(s);assert(path?.length,'Level must be solvable');
 assert(path.reduce((total,m)=>total+Math.abs(m.delta),0)<=levels[i].par*4+6,'Move allowance must permit a legal solution with arrow controls');
 assert.equal(path.length,levels[i].par,'Displayed minimum must match shortest solution');
 if(i)assert(levels[i].par>levels[i-1].par,'Each level must require more slides than the previous level');
 for(const m of path){assert(moves(s).some(a=>a.i===m.i&&a.delta===m.delta));const before=JSON.stringify(s);const t=apply(s,m);assert.equal(JSON.stringify(s),before,'Move must not mutate history');s=t;}
 assert(won(s));console.log(`Repair ${i+1}: solvable in ${path.length} moves`);
}
