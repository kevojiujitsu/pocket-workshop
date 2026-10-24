// Native build includes the billing SDK; the live shop remains gated until
// account sign-in, the verification backend, and store products are configured.
import {startBilling} from './billing.js';
window.PocketWorkshopBilling={start:startBilling};
await import('../dist/app.js');
