import {createHash} from 'node:crypto';

// capacitor-plugin-cdv-purchase's default "legacy" obfuscator always applies
// md5toUUID, even to UUID usernames. MD5 is only the SDK's account identifier
// encoding here; bearer authentication and Apple's verified receipt remain
// required. Match only the encoding of the authenticated wallet's own ID.
export function appleAccountToken(playerId){
 const hex=createHash('md5').update(playerId).digest('hex');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-3${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20)}`;
}
