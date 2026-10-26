const encoder=new TextEncoder();
export const base64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
export function decodeBase64(value){return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}
export async function hash(value){return base64url(await crypto.subtle.digest('SHA-256',encoder.encode(value)));}
export function decodeJWT(token){
 if(typeof token!=='string'||token.length>32000)throw Error('Invalid transaction');
 const segments=token.split('.');if(segments.length!==3)throw Error('Invalid transaction');
 return JSON.parse(new TextDecoder().decode(decodeBase64(segments[1])));
}
export async function signJWT(payload,pem,algorithm,keyId){
 const alg=algorithm==='RS256'?{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}:{name:'ECDSA',namedCurve:'P-256'};
 const bytes=decodeBase64(pem.replace(/-----[^-]+-----/g,'').replace(/\s/g,''));
 const key=await crypto.subtle.importKey('pkcs8',bytes,alg,false,['sign']);
 const data=base64url(encoder.encode(JSON.stringify({alg:algorithm,typ:'JWT',...(keyId?{kid:keyId}:{})})))+'.'+base64url(encoder.encode(JSON.stringify(payload)));
 const signature=await crypto.subtle.sign(algorithm==='RS256'?alg:{name:'ECDSA',hash:'SHA-256'},key,encoder.encode(data));
 return data+'.'+base64url(signature);
}
async function cipherKey(secret){if(!secret)throw Error('Ledger secret not configured');return crypto.subtle.importKey('raw',decodeBase64(secret),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function encryptProof(value,secret){const iv=crypto.getRandomValues(new Uint8Array(12)),key=await cipherKey(secret);return base64url(iv)+'.'+base64url(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(value)));}
export async function decryptProof(value,secret){const [iv,data]=value.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decodeBase64(iv)},await cipherKey(secret),decodeBase64(data)));}
