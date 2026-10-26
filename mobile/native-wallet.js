import {Capacitor,registerPlugin} from '@capacitor/core';
import {createWalletClient} from './wallet-client.js';
import adsConfig from './ads-config.json';
const vault=registerPlugin('WorkshopVault'),scope=adsConfig.testing?'test':'release';
export const nativeWallet=Capacitor.getPlatform()==='ios'?createWalletClient({load:()=>vault.load({scope}),save:value=>vault.save({...value,scope})},'https://pocket-workshop-purchases.kevojiujitsu.workers.dev',fetch,{testMode:adsConfig.testing===true}):null;
