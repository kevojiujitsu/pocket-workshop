import assert from 'node:assert/strict';
import {levels,initial,moves,apply,solve,won} from './dist/engine.js';
for(let i=0;i<levels.length;i++){
 let s=initial(i);const cells=new Set();
 for(const [x,y,n,d] of s)for(let k=0;k<n;k++){const xx=x+(d==='h'?k:0),yy=y+(d==='v'?k:0),key=`${xx},${yy}`;assert(xx>=0&&xx<6&&yy>=0&&yy<6);assert(!cells.has(key),'Overlapping pieces');cells.add(key);}
 const path=solve(s);assert(path?.length,'Level must be solvable');
 for(const m of path){assert(moves(s).some(a=>a.i===m.i&&a.delta===m.delta));const before=JSON.stringify(s);const t=apply(s,m);assert.equal(JSON.stringify(s),before,'Move must not mutate history');s=t;}
 assert(won(s));console.log(`Repair ${i+1}: solvable in ${path.length} moves`);
}
