export const levels = [
 {name:'A little light',reward:'Desk lamp',icon:'lamp',pieces:[[0,2,2,'h'],[2,1,2,'v'],[3,3,2,'h']]},
 {name:'Time to unwind',reward:'Mantel clock',icon:'clock',pieces:[[0,2,2,'h'],[2,1,3,'v'],[1,4,2,'h'],[4,0,3,'v']]},
 {name:'Find your frequency',reward:'Pocket radio',icon:'radio',pieces:[[0,2,2,'h'],[2,0,3,'v'],[3,1,2,'v'],[1,3,2,'h'],[4,3,2,'v'],[3,5,3,'h']]},
 {name:'A fresh start',reward:'Plant stand',icon:'plant',pieces:[[0,2,2,'h'],[2,1,3,'v'],[4,0,3,'v'],[1,4,2,'h'],[3,3,2,'h'],[5,3,3,'v'],[0,0,2,'h']]},
 {name:'Made with love',reward:'Toy robot',icon:'robot',pieces:[[0,2,2,'h'],[2,0,3,'v'],[3,1,2,'v'],[1,3,2,'h'],[4,2,3,'v'],[0,4,2,'v']]}
];
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
