// Supply the real registered bundle/package ID before creating native projects.
const appId = process.env.POCKET_APP_ID || 'com.kevthedev.pocketworkshop';
if (!appId || !/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(appId)) {
 throw new Error('Set POCKET_APP_ID to the registered iOS bundle ID or Android package name.');
}
export default {appId,appName:'Pocket Workshop',webDir:'www'};
