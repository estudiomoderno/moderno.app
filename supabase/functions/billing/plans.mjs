// User-approved terms, 2026-09-13. Null is undecided, NEVER unlimited.
export const PLANS=Object.freeze({
 free:{name:'Free',unitAmount:0,currency:'eur',interval:'month',internalUsers:1,projects:null,fullEditing:true,capturesPerMonth:25,pdfsPerMonth:10,modernoBrand:true,clientPortal:false,personalLibrary:null,sharedLibrary:false,teamManagement:false},
 pro:{name:'Pro',unitAmount:2200,currency:'eur',interval:'month',internalUsers:1,projects:null,fullEditing:true,capturesPerMonth:null,capturesPending:true,pdfsPerMonth:null,pdfsUnlimited:true,modernoBrand:false,clientPortal:true,personalLibrary:true,sharedLibrary:false,teamManagement:false},
 team:{name:'Team',unitAmount:3800,currency:'eur',interval:'month',perInternalUser:true,internalUsers:null,projects:null,fullEditing:true,capturesPerMonth:null,capturesPending:true,pdfsPerMonth:null,pdfsUnlimited:true,modernoBrand:false,clientPortal:true,personalLibrary:true,sharedLibrary:true,teamManagement:true}
});
export function approvedPrice(slug,price){const plan=PLANS[slug];return !!plan&&slug!=='free'&&price?.livemode===false&&price.active===true&&price.type==='recurring'&&price.unit_amount===plan.unitAmount&&price.currency===plan.currency&&price.recurring?.interval==='month'&&price.recurring?.interval_count===1&&price.tax_behavior==='inclusive';}
