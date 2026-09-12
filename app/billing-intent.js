(function(root){
 'use strict';
 const key='moderno.billing.intent.v1';
 const slug=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9_-]{0,63}$/.test(v);
 function read(storage,now=Date.now()){
  try{const v=JSON.parse(storage.getItem(key));return v&&slug(v.plan)&&Number.isFinite(v.createdAt)&&v.createdAt<=now&&now-v.createdAt<86400000?v:null;}catch{return null;}
 }
 function capture(location,storage,now=Date.now()){
  try{const q=new URLSearchParams(location.search);if(q.get('section')!=='facturacion'||!slug(q.get('plan')))return read(storage,now);
   const value={plan:q.get('plan'),createdAt:now};storage.setItem(key,JSON.stringify(value));return value;
  }catch{return null;}
 }
 function clear(storage){try{storage.removeItem(key);}catch{}}
 function destination(value){return value&&slug(value.plan)?'/es/ajustes?section=facturacion&plan='+encodeURIComponent(value.plan):null;}
 const api={read,capture,clear,destination,slug};root.ModernoBillingIntent=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
