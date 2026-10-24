import {levels,initial,moves,apply,solve,won} from './engine.js';
const $=id=>document.getElementById(id);
const art={
lamp:'<path d="M29 25L39 8h12l10 17z" fill="#d8aa54"/><path d="M45 25v37m-16 0h32" stroke="#46685a" stroke-width="5" stroke-linecap="round"/><path d="M32 65h26" stroke="#b88b4d" stroke-width="6"/>',
clock:'<path d="M23 62V30a22 22 0 0144 0v32z" fill="#ad7852"/><circle cx="45" cy="32" r="17" fill="#f5ecd5"/><path d="M45 20v13l9 5" fill="none" stroke="#35564a" stroke-width="3" stroke-linecap="round"/><path d="M19 64h52" stroke="#35564a" stroke-width="6"/>',
radio:'<rect x="14" y="24" width="62" height="40" rx="7" fill="#75917b"/><path d="M25 22L58 6" stroke="#b28f54" stroke-width="3"/><circle cx="35" cy="45" r="14" fill="#35594c"/><path d="M26 39h18m-20 6h22m-20 6h18" stroke="#91a692" stroke-width="2"/><rect x="55" y="31" width="13" height="7" rx="2" fill="#e5cc8f"/><circle cx="61" cy="51" r="5" fill="#e5cc8f"/>',
plant:'<path d="M45 43V16" stroke="#4b7455" stroke-width="4"/><path d="M45 28C22 31 20 13 23 10c16 0 23 9 22 18m0-8C49 5 64 6 67 8c0 15-12 20-22 12" fill="#78976a"/><path d="M28 37h34l-5 24H33z" fill="#bf815f"/><path d="M25 64h40m-34 0l-4 9m32-9l4 9" stroke="#936d48" stroke-width="3"/>',
robot:'<path d="M45 14V6" stroke="#a88345" stroke-width="3"/><circle cx="45" cy="5" r="4" fill="#d9ab57"/><rect x="25" y="15" width="40" height="26" rx="5" fill="#84a090"/><circle cx="36" cy="27" r="4" fill="#243e37"/><circle cx="54" cy="27" r="4" fill="#243e37"/><path d="M38 35h14" stroke="#fff4d7" stroke-width="2"/><rect x="29" y="44" width="32" height="21" rx="4" fill="#d3a44e"/><path d="M20 45v15m50-15v15M36 66v9m18-9v9" stroke="#658472" stroke-width="6" stroke-linecap="round"/>'};
const svg=(type)=>`<svg viewBox="0 0 90 80" aria-hidden="true">${art[type]}</svg>`;
const kit='<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect x="7" y="13" width="26" height="20" rx="4" stroke="currentColor" stroke-width="2.3"/><path d="M15 13V9h10v4M7 21h26m-15-3h4v6h-4z" stroke="currentColor" stroke-width="2"/></svg>';
const part='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M25 5a11 11 0 00-12 14L4 28a5 5 0 007 7l9-9A11 11 0 0034 14l-8 5-6-6z" fill="currentColor"/></svg>';
const colors=['#c59b50','#799581','#aa7764','#6c8792','#9a9c70','#b38d68','#728b7a','#9c8294'];
let saved={};try{saved=JSON.parse(localStorage.getItem('pocket-workshop-v1')||'{}')||{};}catch{}
let completed=Array.isArray(saved.completed)?saved.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<5):[];
let level=Number.isInteger(saved.level)&&saved.level>=0&&saved.level<5?saved.level:0,state,history=[],selected=null,hinted=null,drag=null;
function persist(){try{localStorage.setItem('pocket-workshop-v1',JSON.stringify({completed,level}));}catch{}}
function load(i){level=i;state=initial(i);history=[];selected=null;hinted=null;persist();render();say('Select a part, then slide it along its track.');}
function say(t){$('message').textContent=t;}
function render(){
 $('chapter').textContent=`REPAIR ${String(level+1).padStart(2,'0')} / 05`;$('levelName').textContent=levels[level].name;$('rewardIcon').innerHTML=svg(levels[level].icon);
 $('moveCount').textContent=String(history.length).padStart(2,'0');$('undo').disabled=!history.length;
 $('shelf').innerHTML=levels.map((l,i)=>`<div class="shelf-item ${completed.includes(i)?'':'locked'}" title="${completed.includes(i)?'Restored: ':'Not yet restored: '}${l.reward}" aria-label="${l.reward}, ${completed.includes(i)?'restored':'not yet restored'}">${svg(l.icon)}<span class="item-number">0${i+1}</span></div>`).join('');
 $('collected').textContent=`${completed.length} / 5 restored`;
 $('board').innerHTML=state.map(([x,y,n,d],i)=>`<button class="piece ${d} ${i===0?'target':''} ${selected===i?'selected':''} ${hinted===i?'hinted':''}" data-i="${i}" aria-label="${i===0?'Brass repair kit':'Part '+i}, ${d==='h'?'horizontal':'vertical'}, column ${x+1}, row ${y+1}" aria-pressed="${selected===i}" style="left:calc(${x*100/6}% + 4px);top:calc(${y*100/6}% + 4px);width:calc(${(d==='h'?n:1)*100/6}% - 8px);height:calc(${(d==='v'?n:1)*100/6}% - 8px);background:${colors[i%colors.length]}">${i===0?kit:part}</button>`).join('');
 $('levelNav').innerHTML=levels.map((l,i)=>`<button data-level="${i}" class="${i===level?'active':''} ${completed.includes(i)?'done':''}" aria-label="Repair ${i+1}: ${l.name}${completed.includes(i)?', completed':''}" ${i===level?'aria-current="step"':''}>${completed.includes(i)?'✓':i+1}</button>`).join('');
 const vertical=selected!==null&&state[selected][3]==='v';$('back').textContent=vertical?'↑':'←';$('forward').textContent=vertical?'↓':'→';
 $('selectedLabel').textContent=selected===null?'Select a part to move':selected===0?'Brass kit · slide to the exit':`Part ${selected} · ${vertical?'up or down':'left or right'}`;
 $('back').disabled=selected===null||!moves(state).some(m=>m.i===selected&&m.delta<0);$('forward').disabled=selected===null||!moves(state).some(m=>m.i===selected&&m.delta>0);
}
function move(m){if(!moves(state).some(a=>a.i===m.i&&a.delta===m.delta))return false;history.push(state);state=apply(state,m);hinted=null;render();say('A little more room. Keep going.');if(won(state))finish();return true;}
function finish(){if(!completed.includes(level))completed.push(level);persist();render();$('winIcon').innerHTML=svg(levels[level].icon);$('winTitle').textContent=`${levels[level].reward}, restored.`;$('winText').textContent=completed.length===5?`All five treasures have a home. You completed this first collection in your own time. Replay any repair to try fewer moves.`:`${history.length} moves. One lovely thing brought back to life. Your workshop is looking a little brighter.`;$('next').textContent=completed.length===5?'Play the collection again ↻':'Next repair →';$('winDialog').showModal();}
function step(sign){if(selected===null)return;move({i:selected,delta:sign});}
function select(i){selected=i;hinted=null;render();}
const board=$('board');
board.addEventListener('pointerdown',e=>{const piece=e.target.closest('[data-i]');if(!piece)return;const i=Number(piece.dataset.i);drag={i,x:e.clientX,y:e.clientY};selected=i;board.setPointerCapture(e.pointerId);render();e.preventDefault();});
board.addEventListener('pointerup',e=>{if(!drag)return;const {i,x,y}=drag;drag=null;const d=state[i][3],distance=d==='h'?e.clientX-x:e.clientY-y,cell=board.clientWidth/6;let delta=Math.round(distance/cell);if(delta){const legal=moves(state).filter(m=>m.i===i&&Math.sign(m.delta)===Math.sign(delta));const max=Math.max(0,...legal.map(m=>Math.abs(m.delta)));delta=Math.sign(delta)*Math.min(Math.abs(delta),max);if(delta)move({i,delta});else say('That path is blocked. Move another part first.');}else render();});
board.addEventListener('pointercancel',()=>{drag=null;});
board.addEventListener('click',e=>{const piece=e.target.closest('[data-i]');if(piece&&e.detail===0)select(Number(piece.dataset.i));});
document.addEventListener('keydown',e=>{if($('helpDialog').open||$('winDialog').open||selected===null)return;const d=state[selected][3],sign=(d==='h'?{ArrowLeft:-1,ArrowRight:1}:{ArrowUp:-1,ArrowDown:1})[e.key];if(sign){e.preventDefault();step(sign);board.querySelector(`[data-i="${selected}"]`)?.focus();}});
function undo(){if(history.length){state=history.pop();hinted=null;render();say('One move back. A fresh perspective.');}}
function reset(){load(level);}
function hint(){const path=solve(state);if(!path?.length){say(won(state)?'Repair complete! Choose another puzzle below.':'Try resetting this repair for a fresh start.');return;}const m=path[0];selected=m.i;hinted=m.i;render();const dir=state[m.i][3]==='h'?(m.delta>0?'right':'left'):(m.delta>0?'down':'up');say(`Slide ${m.i===0?'the brass kit':'highlighted part '+m.i} ${dir} ${Math.abs(m.delta)} space${Math.abs(m.delta)===1?'':'s'}.`);}
function next(){ $('winDialog').close();load(completed.length===5?0:(()=>{for(let k=1;k<=5;k++){let i=(level+k)%5;if(!completed.includes(i))return i;}return 0;})());}
$('undo').onclick=undo;$('reset').onclick=reset;$('hint').onclick=hint;$('back').onclick=()=>step(-1);$('forward').onclick=()=>step(1);
$('levelNav').onclick=e=>{const b=e.target.closest('[data-level]');if(b)load(Number(b.dataset.level));};
$('help').onclick=()=>$('helpDialog').showModal();document.querySelector('.close').onclick=()=>$('helpDialog').close();document.querySelector('.close-help').onclick=()=>$('helpDialog').close();
$('next').onclick=next;$('replay').onclick=()=>$('winDialog').close();
load(level);
