export function unlockedThrough(completed,count){
 const done=new Set(completed);let i=0;
 while(i<count-1&&done.has(i))i++;
 return i;
}
export function isUnlocked(index,completed,count){
 return Number.isInteger(index)&&index>=0&&index<count&&index<=unlockedThrough(completed,count);
}
