import {createWorkshopAudio} from '../dist/audio.js';
import {applyLevelTheme,levelTheme} from '../dist/themes.js';
import {isUnlocked,unlockedThrough} from '../dist/progression.js';
import {STARTING_BOLTS,STARTING_UNDOS,BOLT_PACKS,UNDO_PACKS,spendUndo,spendAttempt,rewardBolt,moveOutcome} from '../dist/economy.js';
import {levels,initial,moves,apply,solve,won} from '../dist/engine.js';
const $=id=>document.getElementById(id);
const wallet=globalThis.PocketWorkshopWallet;
const storeName=globalThis.PocketWorkshopPlatform==='android'?'Google Play':'Apple';
let billing=null,billingStarting=false,moneyBusy=false,walletConnection=null;
const audio=createWorkshopAudio();
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
let saved={};try{saved=JSON.parse(localStorage.getItem('pocket-workshop-v2')||'{}')||{};}catch{}
// Only the first puzzle is unchanged from the original five-level prototype.
try{if(!localStorage.getItem('pocket-workshop-v2')){const old=JSON.parse(localStorage.getItem('pocket-workshop-v1')||'{}');if(old?.completed?.includes(0))saved={completed:[0],level:1};}}catch{}
let completed=Array.isArray(saved.completed)?saved.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<levels.length):[];
const hintedLevels=new Set(Array.isArray(saved.hintedLevels)?saved.hintedLevels.filter(n=>Number.isInteger(n)&&n>=0&&n<levels.length):[]);
let level=Number.isInteger(saved.level)&&saved.level>=0&&saved.level<levels.length?saved.level:0,state,history=[],selected=null,hinted=null,drag=null;
let bolts=Number.isInteger(saved.bolts)?Math.max(0,saved.bolts):STARTING_BOLTS,used=0,attempts=saved.puzzleRevision===3?(saved.attempts||{}):{},failed=false;
let navPage=0;
const resetsUsed=new Set(Array.isArray(saved.resetsUsed)?saved.resetsUsed:[]);
let undoBalance=Number.isInteger(saved.undoBalance)?Math.max(0,saved.undoBalance):STARTING_UNDOS;
let pendingPayment=saved.pendingPayment&&['undo','reset','fail'].includes(saved.pendingPayment.kind)&&/^[a-f0-9-]{36}$/i.test(saved.pendingPayment.id)&&Number.isInteger(saved.pendingPayment.level)?saved.pendingPayment:null;
if(wallet){bolts=wallet.balance.bolts;undoBalance=wallet.balance.undos;}
const budget=i=>levels[i].moveLimit??levels[i].par*4+6;
function rememberAttempt(){attempts[level]={state,used,history};persist();}
function shopStatus(text){($('purchaseStatus')||$('shopBalance')).textContent=text.replaceAll('Apple',storeName);}
function renderShop(){
 $('shopBalance').textContent=`You have ${bolts} bolts and ${undoBalance} undos. Each failed repair or reset costs 1 bolt.`;
 $('demoAd').disabled=bolts>=STARTING_BOLTS||!wallet?.connected||!globalThis.PocketWorkshopAds?.available||moneyBusy||!!pendingPayment;
 const products=billing?.list()||[];
 for(const [id,packs] of [['boltPacks',BOLT_PACKS],['undoPacks',UNDO_PACKS]]){
  $(id).replaceChildren();
  for(const pack of packs){const item=products.find(p=>p.key===pack.id),row=document.createElement('div'),label=document.createElement('strong'),button=document.createElement('button');row.className='bolt-pack';label.textContent=`${pack.quantity} ${id==='boltPacks'?'bolts':pack.quantity===1?'undo':'undos'}${item?.price?' · '+item.price:''}`;button.textContent=item?.available&&item.price?'Buy':'Store unavailable';button.disabled=!item?.available||!item?.price||moneyBusy||!!pendingPayment;button.onclick=async()=>{if(moneyBusy)return;moneyBusy=true;renderShop();try{shopStatus('Waiting for Apple to complete your purchase…');await billing.buy(pack.id);}catch(error){shopStatus(error.message);}finally{moneyBusy=false;renderShop();}};row.append(label,button);$(id).append(row);}
 }
}
function showShop(){renderShop();if(!$('shopDialog').open)$('shopDialog').showModal();if(wallet&&!billing)connectWallet().catch(error=>shopStatus(error.message));}
function showFailure(){failed=true;delete attempts[level];persist();render();$('failText').textContent=bolts?`You used all your moves. One bolt lost; ${bolts} remaining. Try a different approach.`:'You used your last bolt. Watch an optional ad for a free bolt, or open the shop.';$('retry').disabled=bolts===0;if(!$('failDialog').open)$('failDialog').showModal();}
async function paidAction(kind){
 if(!wallet){if(kind==='fail'){bolts=spendAttempt(bolts);showFailure();}return;}
 if(moneyBusy)return;
 if(!pendingPayment){pendingPayment={id:crypto.randomUUID(),kind,level};persist();}
 moneyBusy=true;
 try{
  const action=pendingPayment;await wallet.spend(action.kind==='undo'?'undos':'bolts',action.id);
  // Clear in memory before any synchronous game-state persistence: the action
  // and its completion marker are committed together to local storage.
  pendingPayment=null;
  level=action.level;
  if(action.kind==='undo'){const previous=history.pop();if(previous){state=previous.state;used=previous.used;hinted=null;rememberAttempt();}}
  if(action.kind==='reset'){resetsUsed.add(level);delete attempts[level];load(level);}
  if(action.kind==='fail')showFailure();
  persist();render();say(action.kind==='undo'?'Last move undone and its move allowance restored.':action.kind==='reset'?'Repair reset. One bolt used.':'One bolt used. Try a different approach.');
 }catch(error){if(error.status===409){const kind=pendingPayment?.kind;pendingPayment=null;if(kind==='fail')showFailure();persist();}say(error.message+' Use Sync wallet in the shop to finish this action.');}
 finally{moneyBusy=false;render();if($('shopDialog').open)renderShop();}
}
function fail(){if(failed)return;failed=true;if(wallet){paidAction('fail');return;}bolts=spendAttempt(bolts);showFailure();}
function persist(){try{localStorage.setItem('pocket-workshop-v2',JSON.stringify({puzzleRevision:3,completed,level,bolts,attempts,undoBalance,pendingPayment,resetsUsed:[...resetsUsed],hintedLevels:[...hintedLevels]}));}catch{}}
function load(i){if(!isUnlocked(i,completed,levels.length))i=unlockedThrough(completed,levels.length);level=i;navPage=Math.floor(i/20);state=attempts[i]?.state||initial(i);used=attempts[i]?.used||0;failed=false;history=Array.isArray(attempts[i]?.history)?attempts[i].history:[];selected=null;hinted=null;persist();render();say('Drag a part along its track with your finger or stylus.');}
let activeScreen='collection';
function showScreen(name){
 activeScreen=name;
 for(const [key,id] of Object.entries({collection:'collectionScreen',play:'playScreen',transition:'transitionScreen'}))$(id).hidden=key!==name;
 document.body.dataset.screen=name;
 selected=null;drag=null;
 window.scrollTo({top:0,behavior:'instant'});
 const heading=name==='transition'?$('transitionTitle'):name==='play'?$('levelName'):$('continueGame');
 heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});
}
function prepareRepair(i){
 if(moneyBusy||pendingPayment){say('Sync your pending wallet action before choosing a repair.');return;}
 if(!isUnlocked(i,completed,levels.length))return;
 load(i);
 $('transitionChapter').textContent=`REPAIR ${String(i+1).padStart(2,'0')} / ${levels.length}`;
 $('transitionArt').innerHTML=svg(levels[i].icon);
 $('transitionTitle').textContent=levels[i].name;
 $('transitionText').textContent=`A ${levels[i].reward.toLowerCase()} with a little more life to give. Make room for the brass kit, and bring it home.`;
 $('transitionDetail').textContent=`${budget(i)} moves · ${resetsUsed.has(i)?'Reset already used':'1 reset available'} · No timer`;
 $('beginRepair').textContent=attempts[i]?'Continue this repair →':'To the workbench →';
 showScreen('transition');
}
function say(t){$('message').textContent=t;}
function render(){
 const theme=applyLevelTheme(level);
 $('chapter').textContent=`REPAIR ${String(level+1).padStart(2,'0')} / ${levels.length}`;$('levelName').textContent=levels[level].name;$('rewardIcon').innerHTML=svg(levels[level].icon);
 $('difficulty').textContent=`${['Apprentice','Craftsperson','Artisan','Specialist','Expert','Virtuoso','Master','Grandmaster','Inventor','Workshop legend'][Math.min(9,Math.floor(level/20))]} · ${levels[level].par} minimum slides`;
 $('moveCount').textContent=`${used} / ${budget(level)}`;$('undo').disabled=!history.length||failed; $('reset').disabled=resetsUsed.has(level)||failed||used===0;$('resetLabel').textContent=resetsUsed.has(level)?'Reset · 0':'Reset · 1'; $('undoLabel').textContent=`Undo · ${undoBalance}`; $('undoStatus').textContent=`${undoBalance} undos remaining · shared across all levels`; $('hint').disabled=hintedLevels.has(level)||failed;$('hintLabel').textContent=hintedLevels.has(level)?'Hint used':'Hint · 1'; $('boltBalance').textContent=`⬢ ${bolts} bolts`; $('movesLeft').textContent=`${Math.max(0,budget(level)-used)} moves left`; 
 const start=Math.floor(level/5)*5; $('shelf').innerHTML=levels.slice(start,start+5).map((l,j)=>{const i=start+j;return `<div class="shelf-item ${completed.includes(i)?'':'locked'}" title="${completed.includes(i)?'Restored: ':'Not yet restored: '}${l.reward}" aria-label="${l.reward}, ${completed.includes(i)?'restored':'not yet restored'}">${svg(l.icon)}<span class="item-number">${String(i+1).padStart(2,'0')}</span></div>`}).join('');
 $('continueGame').textContent=`Continue repair ${level+1} →`;
 $('collected').textContent=`${completed.length} / ${levels.length} restored`;
 const signature=JSON.stringify([level,state.map(p=>[p[2],p[3]])]);
 if($('board').dataset.signature!==signature){
  $('board').innerHTML=state.map((p,i)=>`<button data-i="${i}">${i===0?kit:part}</button>`).join('');
  $('board').dataset.signature=signature;
 }
 state.forEach(([x,y,n,d],i)=>{
  const piece=$('board').children[i];
  piece.className=`piece ${d} ${i===0?'target':''} ${selected===i?'selected':''} ${hinted===i?'hinted':''}`;
  piece.setAttribute('aria-label',`${i===0?'Brass repair kit':'Part '+i}, ${d==='h'?'horizontal':'vertical'}, column ${x+1}, row ${y+1}`);
  piece.setAttribute('aria-pressed',selected===i);
  Object.assign(piece.style,{left:`calc(${x*100/6}% + 4px)`,top:`calc(${y*100/6}% + 4px)`,width:`calc(${(d==='h'?n:1)*100/6}% - 8px)`,height:`calc(${(d==='v'?n:1)*100/6}% - 8px)`,background:theme.pieces[i%theme.pieces.length]});
 });
 const pageStart=navPage*20; $('chapterNav').innerHTML=Array.from({length:Math.ceil(levels.length/20)},(_,j)=>`<button data-chapter="${j}" class="${j===navPage?'active':''}" aria-label="Levels ${j*20+1} to ${Math.min(levels.length,j*20+20)}">${j*20+1}–${Math.min(levels.length,j*20+20)}</button>`).join('');
 $('levelNav').innerHTML=levels.slice(pageStart,pageStart+20).map((l,j)=>{const i=pageStart+j,locked=!isUnlocked(i,completed,levels.length);return `<button ${locked?'disabled':''} title="${locked?'Complete repair '+i+' to unlock':'Play repair '+(i+1)}" data-level="${i}" style="--card-color:${levelTheme(i).surface};--card-edge:${levelTheme(i).accent}" class="${i===level?'active':''} ${completed.includes(i)?'done':''}" aria-label="Repair ${i+1}: ${l.name}${locked?', locked — complete repair '+i+' first':completed.includes(i)?', completed':''}" ${i===level?'aria-current="step"':''}><span class="level-number">${locked?'🔒 ':completed.includes(i)?'✓ ':''}${String(i+1).padStart(2,'0')}</span><span class="level-card-name">${l.name}</span><span class="level-card-status">${locked?'Locked':completed.includes(i)?'Restored':'Ready to repair'}</span></button>`}).join('');
 const vertical=selected!==null&&state[selected][3]==='v';
 $('selectedLabel').textContent=selected===null?'Drag a part with your finger or stylus':selected===0?'Brass kit · slide to the exit':`Part ${selected} · ${vertical?'up or down':'left or right'}`;

}
function move(m){if(failed||moneyBusy||pendingPayment)return false;if(bolts===0){showShop();return false;}if(!moves(state).some(a=>a.i===m.i&&a.delta===m.delta))return false;
 const cost=Math.abs(m.delta),nextState=apply(state,m),outcome=moveOutcome(used,cost,budget(level),won(nextState));
 if(used+cost<=budget(level)){history.push({state,used});state=nextState;}used=Math.min(budget(level),used+cost);hinted=null;rememberAttempt();render();
 if(state===nextState)audio.slide(cost);
 if(outcome==='won')finish();else if(outcome==='failed')fail();else say('A little more room. Keep going.');return true;}
function finish(){audio.celebrate();delete attempts[level];if(!completed.includes(level))completed.push(level);persist();render();$('winIcon').innerHTML=svg(levels[level].icon);$('winTitle').textContent=`${levels[level].reward}, restored.`;$('winText').textContent=completed.length===levels.length?`All ${levels.length} treasures have a home. You completed the workshop collection in your own time. Replay any repair to try fewer moves.`:`${used} moves. One lovely thing brought back to life.${level+1<levels.length?' Repair '+(level+2)+' is now unlocked.':''}`;$('next').textContent=completed.length===levels.length?'Play the collection again ↻':'Next repair →';$('winDialog').showModal();}
function step(sign){if(selected===null)return;move({i:selected,delta:sign});}
function select(i){selected=i;hinted=null;render();}
const board=$('board');
board.addEventListener('pointerdown',e=>{
 const piece=e.target.closest('[data-i]');
 if(!piece||drag||failed||activeScreen!=='play'||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;
 if(!bolts){showShop();return;}
 const i=Number(piece.dataset.i),legal=moves(state).filter(m=>m.i===i).map(m=>m.delta);
 selected=i;hinted=null;render();
 drag={i,pointerId:e.pointerId,x:e.clientX,y:e.clientY,cell:board.clientWidth/6,min:Math.min(0,...legal),max:Math.max(0,...legal),offset:0};
 piece.classList.add('dragging');board.setPointerCapture(e.pointerId);e.preventDefault();
});
board.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.pointerId)return;
 const [x,y,,d]=state[drag.i],distance=d==='h'?e.clientX-drag.x:e.clientY-drag.y;
 drag.offset=Math.max(drag.min*drag.cell,Math.min(drag.max*drag.cell,distance));
 board.children[drag.i].style[d==='h'?'left':'top']=`calc(${(d==='h'?x:y)*100/6}% + ${4+drag.offset}px)`;
 e.preventDefault();
});
function endDrag(e,cancelled=false){
 if(!drag||e.pointerId!==drag.pointerId)return;
 const {i,pointerId,cell,min,max}=drag,[x,y,,d]=state[i];
 const distance=d==='h'?e.clientX-drag.x:e.clientY-drag.y;
 const offset=cancelled?drag.offset:Math.max(min*cell,Math.min(max*cell,distance));
 const piece=board.children[i];piece.style[d==='h'?'left':'top']=`calc(${(d==='h'?x:y)*100/6}% + ${4+offset}px)`;
 void piece.offsetWidth;piece.classList.remove('dragging');drag=null;
 if(board.hasPointerCapture(pointerId))board.releasePointerCapture(pointerId);
 const delta=cancelled?0:Math.max(min,Math.min(max,Math.round(offset/cell)));
 if(delta)move({i,delta});else render();
}
board.addEventListener('pointerup',e=>endDrag(e));
board.addEventListener('pointercancel',e=>endDrag(e,true));
board.addEventListener('lostpointercapture',e=>{if(drag?.pointerId===e.pointerId)endDrag(e,true);});
board.addEventListener('click',e=>{const piece=e.target.closest('[data-i]');if(piece&&e.detail===0)select(Number(piece.dataset.i));});
document.addEventListener('keydown',e=>{if(activeScreen!=='play'||document.querySelector('dialog[open]')||selected===null)return;const d=state[selected][3],sign=(d==='h'?{ArrowLeft:-1,ArrowRight:1}:{ArrowUp:-1,ArrowDown:1})[e.key];if(sign){e.preventDefault();step(sign);board.querySelector(`[data-i="${selected}"]`)?.focus();}});
function undo(){if(!history.length||failed||moneyBusy||pendingPayment)return;if(undoBalance<1){showShop();return;}if(wallet){paidAction('undo');return;}const previous=history.pop();state=previous.state;used=previous.used;undoBalance=spendUndo(undoBalance);hinted=null;rememberAttempt();render();}
function reset(){if(resetsUsed.has(level)||failed||used===0)return;$('resetDialog').showModal();}
function hint(){if(hintedLevels.has(level)){say('You’ve already used this repair’s hint.');return;}const path=solve(state);if(!path?.length){say(won(state)?'Repair complete! Choose another puzzle below.':'Try resetting this repair for a fresh start.');return;}const m=path[0];hintedLevels.add(level);persist();selected=m.i;hinted=m.i;render();const dir=state[m.i][3]==='h'?(m.delta>0?'right':'left'):(m.delta>0?'down':'up');say(`Slide ${m.i===0?'the brass kit':'highlighted part '+m.i} ${dir} ${Math.abs(m.delta)} space${Math.abs(m.delta)===1?'':'s'}.`);}
function next(){ $('winDialog').close();prepareRepair(level+1<levels.length?level+1:0);}
$('undo').onclick=undo;$('reset').onclick=reset;$('hint').onclick=hint;
$('chapterNav').onclick=e=>{const b=e.target.closest('[data-chapter]');if(b){navPage=Number(b.dataset.chapter);render();}};
$('levelNav').onclick=e=>{const b=e.target.closest('[data-level]');if(b)prepareRepair(Number(b.dataset.level));};
$('help').onclick=()=>$('helpDialog').showModal();document.querySelector('.close').onclick=()=>$('helpDialog').close();document.querySelector('.close-help').onclick=()=>$('helpDialog').close();
function syncAudioControls(){
 $('musicToggle').checked=audio.settings.music;$('soundsToggle').checked=audio.settings.sounds;
 $('audioSettings').textContent=audio.settings.music||audio.settings.sounds?'♫ Audio':'♫ Muted';
}
$('audioSettings').onclick=()=>{syncAudioControls();$('audioDialog').showModal();};
$('closeAudio').onclick=()=>$('audioDialog').close();
$('musicToggle').onchange=e=>{audio.set('music',e.target.checked);syncAudioControls();};
$('soundsToggle').onchange=e=>{audio.set('sounds',e.target.checked);syncAudioControls();};
syncAudioControls();
$('boltBalance').onclick=showShop;
$('closeShop').onclick=()=>$('shopDialog').close();
$('demoAd').onclick=()=>{$('adDialog').showModal();};
$('cancelAd').onclick=()=>$('adDialog').close();
let adInProgress=false;
$('completeAd').onclick=async()=>{
 if(adInProgress||bolts>=STARTING_BOLTS)return;
 adInProgress=true;$('completeAd').disabled=true;$('cancelAd').disabled=true;
 try{
  if(globalThis.PocketWorkshopAds){
   const intent=wallet?await wallet.createAdIntent():undefined;
   const reward=await globalThis.PocketWorkshopAds.watch(intent);
   if(reward?.bolts!==1)throw Error('No reward was confirmed.');
   if(wallet)await wallet.waitForAd(intent.intentId);
  }
  if(!wallet)bolts=rewardBolt(bolts);persist();if(failed)load(level);else render();
  $('adDialog').close();$('shopDialog').close();
  say(globalThis.PocketWorkshopAds?'Ad completed. 1 free bolt added.':'Demo reward: 1 bolt added. No real ad was shown; no revenue was earned.');
 }catch(error){
  $('adDialog').close();
  shopStatus(error.message||'The ad was not completed or is unavailable. No bolt was added.');say(error.message||'The ad was not completed or is unavailable. No bolt was added.');
 }finally{adInProgress=false;$('completeAd').disabled=false;$('cancelAd').disabled=false;}
};
if(globalThis.PocketWorkshopAds){
 $('demoAd').textContent='Watch an ad · earn 1 free bolt';
 const adDialog=$('adDialog');
 adDialog.querySelector('.eyebrow').textContent='OPTIONAL REWARDED AD';
 adDialog.querySelector('h2').textContent='One ad. One free bolt.';
 adDialog.querySelector('p').textContent='Choose to watch an ad to earn 1 bolt. Complete the ad to receive your reward. Free rewards refill your jar up to 5 bolts.';
 $('completeAd').textContent='Watch ad & earn 1 bolt';
 const adNote=$('demoAd').nextElementSibling;
 adNote.textContent='Optional ads earn 1 free bolt after completion, up to 5 bolts. If no ad is available, no reward is issued.';
 const privacy=document.createElement('button');privacy.type='button';privacy.className='text-button';privacy.textContent='Ad privacy choices';
 privacy.onclick=async()=>{try{await globalThis.PocketWorkshopAds.privacy();}catch{say('Ad privacy options are unavailable right now.');}};
 $('audioDialog').append(privacy);
}
$('retry').onclick=()=>{$('failDialog').close();load(level);};
$('failShop').onclick=()=>{$('failDialog').close();showShop();};
$('closeFail').onclick=()=>{$('failDialog').close();showScreen('collection');};
$('cancelReset').onclick=()=>$('resetDialog').close();
$('confirmReset').onclick=()=>{$('resetDialog').close();if(resetsUsed.has(level)||moneyBusy||pendingPayment)return;if(bolts===0){showShop();return;}if(wallet){paidAction('reset');return;}resetsUsed.add(level);bolts=spendAttempt(bolts);delete attempts[level];persist();load(level);if(bolts===0)showShop();};
$('next').onclick=next;$('replay').onclick=()=>{$('winDialog').close();showScreen('play');};
$('chooseLevels').onclick=()=>showScreen('collection');
$('continueGame').onclick=()=>prepareRepair(level);
$('beginRepair').onclick=()=>{showScreen('play');render();};
$('transitionLevels').onclick=()=>showScreen('collection');
document.querySelector('.brand').onclick=e=>{e.preventDefault();showScreen('collection');};
load(level);
showScreen('collection');
function connectWallet(){
 if(!wallet)return Promise.resolve();
 if(walletConnection)return walletConnection;
 walletConnection=syncWalletConnection().finally(()=>{walletConnection=null;});
 return walletConnection;
}
async function syncWalletConnection(){
 billingStarting=true;
 try{
  if(!wallet.connected)await wallet.connect();else await wallet.refresh();
  if(pendingPayment)await paidAction(pendingPayment.kind);
  if(!billing){billing=await globalThis.PocketWorkshopBilling.start(wallet.session,value=>wallet.refresh(),text=>shopStatus(text));if(!billing.available){billing=null;throw Error('The Apple store is not available.');}}else await billing.retry();
  if($('shopDialog').open)renderShop();
 }finally{billingStarting=false;}
}
if(wallet){
 function renderWalletTestMode(){
  let note=$('shopDialog').querySelector('.test-wallet-note');
  if(wallet.testMode){
   if(!note){note=document.createElement('p');note.className='shop-note test-wallet-note';$('shopDialog').querySelector('h2').after(note);}
   note.textContent='BETA TEST WALLET · Test ads and Apple sandbox purchases. Test balances are separate from the public release.';
   $('demoAd').textContent='Watch a test ad · earn 1 test bolt';
  }else{
   note?.remove();
   if(globalThis.PocketWorkshopAds)$('demoAd').textContent='Watch an ad · earn 1 free bolt';
  }
 }
 wallet.onChange(value=>{bolts=value.bolts;undoBalance=value.undos;persist();renderWalletTestMode();render();if($('shopDialog').open)renderShop();});
 document.querySelector('footer span:last-child').textContent='Progress saved on this device';
 for(const note of $('shopDialog').querySelectorAll('.shop-note'))if(!note.previousElementSibling?.matches('#demoAd'))note.textContent='Payments are processed by Apple. Credits are delivered after purchase verification. Use Wallet access to recover an existing balance.';
 renderWalletTestMode();
 const controls=document.createElement('div');controls.innerHTML='<p id="purchaseStatus" aria-live="polite"></p><button type="button" class="text-button" id="syncWallet">Sync wallet</button><button type="button" class="text-button" id="walletAccess">Wallet access & recovery</button>';$('shopBalance').after(controls);
 const access=document.createElement('dialog');access.id='walletDialog';access.innerHTML='<button class="close" id="closeWallet" aria-label="Close wallet access">×</button><h2>Your wallet access</h2><p>Save this private code in a password manager to recover your bolts and undos on another device. Anyone with the code can use this wallet. Puzzle progress stays on this device.</p><label for="recoveryCode">Your wallet access code</label><input id="recoveryCode" readonly style="width:100%;padding:12px" autocomplete="off"><h3>Recover an existing wallet</h3><p>This switches to that wallet. Save your current code before switching.</p><label for="restoreCode">Existing wallet access code</label><input id="restoreCode" style="width:100%;padding:12px" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="primary" id="restoreWallet">Recover wallet</button><p id="walletStatus" aria-live="polite"></p>';document.body.append(access);
 $('closeWallet').onclick=()=>access.close();$('walletAccess').onclick=()=>{$('recoveryCode').value=wallet.recoveryCode();access.showModal();};
 $('restoreWallet').onclick=async()=>{if(moneyBusy||pendingPayment){$('walletStatus').textContent='Sync the pending wallet action first.';return;}if(!confirm('Switch to the wallet for this access code? Save your current code first.'))return;$('restoreWallet').disabled=true;try{await wallet.recover($('restoreCode').value);location.reload();}catch(error){$('walletStatus').textContent=error.message;$('restoreWallet').disabled=false;}};
 $('syncWallet').onclick=async()=>{const button=$('syncWallet');button.disabled=true;button.textContent='Syncing…';shopStatus('Checking your wallet and unfinished purchases…');try{await connectWallet();shopStatus(`Wallet synced: ${bolts} bolts and ${undoBalance} undos.`);}catch(error){shopStatus(error.message);}finally{button.disabled=false;button.textContent='Sync wallet';}};
 for(const note of $('shopDialog').querySelectorAll('.shop-note'))note.textContent=note.textContent.replaceAll('Apple',storeName);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)connectWallet().catch(()=>{});});
 connectWallet().catch(error=>{say(error.message);if($('shopDialog').open)shopStatus(error.message);});
}

