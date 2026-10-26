import {Capacitor} from '@capacitor/core';
import {AdMob} from '@capacitor-community/admob';
import config from './ads-config.json';
import {createRewardedController} from './rewarded-controller.js';
export const rewardedAds=createRewardedController(AdMob,{...config,enabled:config.enabled&&Capacitor.getPlatform()==='ios'},Capacitor.isNativePlatform()?Capacitor.getPlatform():'web');
