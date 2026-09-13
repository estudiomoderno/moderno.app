// Server-only preparation. This module never charges or changes a subscription.
import {approvedPrice} from './plans.mjs';
const id=v=>typeof v==='string'?v:v?.id;
const reject=code=>{throw new Error(code);};
export async function previewSeatIncrease({subscription,customerId,target,basePrice,extraPrice,now=Date.now()},stripe){
 if(!Number.isSafeInteger(target)||target<1)reject('invalid_seats');
 if(target>=5)return {salesRequired:true};
 if(subscription.livemode!==false||id(subscription.customer)!==customerId||subscription.status!=='active'||subscription.metadata?.billing_model!=='base_plus_extras')reject('subscription_unavailable');
 if(subscription.pending_update||subscription.schedule||subscription.cancel_at_period_end||subscription.cancel_at)reject('subscription_change_pending');
 if(subscription.latest_invoice?.status!=='paid'||subscription.collection_method!=='charge_automatically')reject('payment_not_settled');
 if(!approvedPrice('pro',basePrice)||!approvedPrice('team',extraPrice))reject('price_unavailable');
 const items=subscription.items?.data||[],base=items.find(i=>id(i.price)===basePrice.id),extra=items.find(i=>id(i.price)===extraPrice.id);
 if(!base||base.quantity!==1||items.length!==(extra?2:1)||extra&&(!Number.isSafeInteger(extra.quantity)||extra.quantity<1))reject('subscription_items_invalid');
 const current=1+(extra?.quantity||0),periodEnd=base.current_period_end;
 if(target<=current)reject('not_an_increase');
 if(!Number.isSafeInteger(periodEnd)||periodEnd<=Math.floor(now/1000)||extra&&extra.current_period_end!==periodEnd)reject('period_invalid');
 const prorationDate=Math.floor(now/1000);
 const itemChanges={'items[0][price]':extraPrice.id,'items[0][quantity]':String(target-1),...(extra?{'items[0][id]':extra.id}:{})};
 const body={customer:customerId,subscription:subscription.id,'subscription_details[proration_behavior]':'always_invoice','subscription_details[proration_date]':String(prorationDate),
 'subscription_details[items][0][price]':extraPrice.id,'subscription_details[items][0][quantity]':String(target-1),...(extra?{'subscription_details[items][0][id]':extra.id}:{})};
 const invoice=await stripe.post('/invoices/create_preview',body);
 if(invoice.livemode!==false||id(invoice.customer)!==customerId||invoice.currency!=='eur'||!Number.isSafeInteger(invoice.amount_due)||invoice.amount_due<0||invoice.automatic_tax?.status!=='complete')reject('preview_unavailable');
 return {salesRequired:false,subscriptionId:subscription.id,currentSeats:current,targetSeats:target,prorationDate,periodEnd,amountDue:invoice.amount_due,currency:'eur',expiresAt:Math.min(prorationDate+300,periodEnd),update:{...itemChanges,proration_date:String(prorationDate),proration_behavior:'always_invoice',payment_behavior:'pending_if_incomplete'}};
}
