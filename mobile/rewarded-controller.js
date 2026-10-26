// Only the SDK's earned-reward result can authorize a free bolt.
// Never use dismissal, a timer, an ad click, or a load event as a reward.
export function createRewardedController(sdk, config, platform) {
 let initialized=false, busy=false;
 const adId=platform==='ios'?config.iosRewardedId:config.androidRewardedId;
 const available=!!config.enabled&&/^(android|ios)$/.test(platform)&&/^ca-app-pub-\d+\/\d+$/.test(adId||'');
 async function consent(){
  let info=await sdk.requestConsentInfo();
  if(info.isConsentFormAvailable&&info.status==='REQUIRED')info=await sdk.showConsentForm();
  if(!info.canRequestAds)throw Error('Ads are unavailable with the current privacy settings.');
  if(!initialized){await sdk.initialize({initializeForTesting:config.testing===true});initialized=true;}
 }
 return {
  available,
  async watch(){
   if(!available)throw Error('Rewarded ads are still being set up. Please try again later.');
   if(busy)throw Error('An ad is already in progress.');
   busy=true;
   try{
    await consent();
    await sdk.prepareRewardVideoAd({adId,isTesting:config.testing===true,npa:true});
    const reward=await sdk.showRewardVideoAd();
    if(!reward||!Number.isFinite(reward.amount)||reward.amount<=0)throw Error('The ad was not completed. No bolt was added.');
    return {bolts:1};
   }finally{busy=false;}
  },
  async privacy(){await sdk.showPrivacyOptionsForm();}
 };
}
