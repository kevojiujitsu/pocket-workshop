import {levels} from './levels.js';
export {levels};
export const initial = i => levels[i].pieces.map(p=>[...p]);
export const won = s => s[0][0]===4;
export function moves(s){
 const grid=Array.from({length:6},()=>Array(6).fill(-1));
 s.forEach(([x,y,n,d],i)=>{for(let k=0;k<n;k++)grid[y+(d==='v'?k:0)][x+(d==='h'?k:0)]=i;});
 const out=[];
 s.forEach(([x,y,n,d],i)=>{for(const sign of [-1,1]){for(let step=1;step<6;step++){
 const xx=x+(d==='h'?(sign<0?-step:n-1+step):0), yy=y+(d==='v'?(sign<0?-step:n-1+step):0);
 if(xx<0||yy<0||xx>=6||yy>=6||grid[yy][xx]!==-1)break;
 out.push({i,delta:sign*step});
 }}});return out;
}
export function apply(s,m){const t=s.map(p=>[...p]);t[m.i][t[m.i][3]==='h'?0:1]+=m.delta;return t;}
export function solve(start){
 const key=s=>s.map(p=>p[p[3]==='h'?0:1]).join(',');
 const q=[{s:start,parent:-1,move:null}],seen=new Set([key(start)]);
 for(let h=0;h<q.length&&h<150000;h++){
 if(won(q[h].s)){const path=[];for(let k=h;q[k].parent!==-1;k=q[k].parent)path.unshift(q[k].move);return path;}
 for(const m of moves(q[h].s)){const s=apply(q[h].s,m),k=key(s);if(!seen.has(k)){seen.add(k);q.push({s,parent:h,move:m});}}
 }return null;
}
