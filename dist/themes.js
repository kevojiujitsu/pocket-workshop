const hues=[85,30,165,205,15,275,45,135,340,190];
const patterns=['grain','linen','blueprint','tile','paper'];
const pieceHueOffsets=[-12,14,0,22,-20,8];
const pieceLightness=[45,58,50,64,53,42,60,48,56,65,46,61,51,57,44,63];
export function levelTheme(index){
 const chapter=Math.floor(index/20)%hues.length,hue=(hues[chapter]+(index%20)*.7)%360;
 const color=(offset,s,l)=>`hsl(${(hue+offset+360)%360} ${s}% ${l}%)`;
 return {pattern:patterns[index%patterns.length],page:color(0,19,73),surface:color(0,22,82),board:color(20,25,68),edge:color(20,25,48),accent:color(0,24,39),pieces:Array.from({length:16},(_,i)=>color(pieceHueOffsets[i%pieceHueOffsets.length],8+(i%4)*2,pieceLightness[i]))};
}
export function applyLevelTheme(index){
 const theme=levelTheme(index),style=document.documentElement.style;
 for(const name of ['page','surface','board','edge','accent'])style.setProperty(`--workshop-${name}`,theme[name]);
 document.body.dataset.workshopPattern=theme.pattern;
 return theme;
}
