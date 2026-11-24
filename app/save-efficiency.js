(function(root){
  'use strict';
  const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const ARRAY_SYNC_MAX=2000;
  const ARRAY_SYNC_OPS_MAX=8,ARRAY_SYNC_IDENTITIES_MAX=8000,DELTA_WORK_MAX=128*1024*1024;
  const idKey=v=>typeof v==='string'?'s:'+v:typeof v==='number'&&Number.isFinite(v)?'n:'+String(v):null;
  function indexed(items){
    if(!items.length||items.length>ARRAY_SYNC_MAX)return null;
    const keys=[],byKey=new Map();
    for(const item of items){
      if(!item||typeof item!=='object'||Array.isArray(item)||!own(item,'id'))return null;
      const key=idKey(item.id);if(key===null||byKey.has(key))return null;
      keys.push(key);byKey.set(key,item);
    }
    return {keys,byKey};
  }
  // Paths are arrays, not JavaScript expressions or JSON Pointer strings.
  // Identified arrays send their final ID order plus new rows; legacy arrays use splice.
  function delta(before,after,max=64){
    const ops=[];
    function walk(a,b,path){
      if(equal(a,b))return;
      if(ops.length>=max)throw Error('delta too large');
      if(Array.isArray(a)&&Array.isArray(b)){
        const before=indexed(a),after=indexed(b);
        if(before&&after){
          const structural=a.length!==b.length||before.keys.some((key,index)=>after.keys[index]!==key);
          if(structural){
            const items=b.filter((_,index)=>!before.byKey.has(after.keys[index]));
            ops.push({op:'array_sync',path,order:b.map(item=>item.id),items});
            if(ops.length>max)throw Error('delta too large');
          }
          for(let i=0;i<b.length;i++){
            const previous=before.byKey.get(after.keys[i]);
            if(previous)walk(previous,b[i],path.concat(String(i)));
          }
          return;
        }
        if(a.length===b.length){for(let i=0;i<b.length;i++)walk(a[i],b[i],path.concat(String(i)));return;}
        let first=0,last=0;
        while(first<Math.min(a.length,b.length)&&equal(a[first],b[first]))first++;
        while(last<Math.min(a.length,b.length)-first&&equal(a[a.length-1-last],b[b.length-1-last]))last++;
        ops.push({op:'splice',path,index:first,delete:a.length-first-last,items:b.slice(first,b.length-last)});return;
      }
      if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){
        for(const k of Object.keys(a))if(!own(b,k))ops.push({op:'remove',path:path.concat(k)});
        for(const k of Object.keys(b))if(!own(a,k))ops.push({op:'set',path:path.concat(k),value:b[k]});else walk(a[k],b[k],path.concat(k));
        if(ops.length>max)throw Error('delta too large');return;
      }
      ops.push({op:'set',path,value:b});
    }
    try{
      walk(before,after,[]);
      const sync=ops.filter(op=>op.op==='array_sync');
      if(ops.length>max||sync.length>ARRAY_SYNC_OPS_MAX||sync.reduce((n,op)=>n+op.order.length+op.items.length,0)>ARRAY_SYNC_IDENTITIES_MAX)return null;
      const bytes=new TextEncoder().encode(JSON.stringify(before)).byteLength;
      return bytes*ops.length<=DELTA_WORK_MAX?ops:null;
    }catch{return null;}
  }
  function change(plan){
    const full={bloque:plan.b,contenido:plan.merged,base:plan.version};
    if(plan.base===undefined||plan.version===null)return full;
    let base;try{base=plan.patchBase!==undefined?plan.patchBase:typeof plan.base==='string'?JSON.parse(plan.base):plan.base;}catch{return full;}
    const ops=delta(base,plan.merged);
    const patch={bloque:plan.b,cambios:ops,base:plan.version};
    return ops&&JSON.stringify(patch).length<JSON.stringify(full).length*.8?patch:full;
  }
  function backoff(attempt,random=Math.random){return Math.round(Math.min(120000,15000*2**Math.min(3,Math.max(0,attempt-1)))*(.85+.3*random()));}
  // No names, URLs, user identifiers, input values or server error text.
  function metrics(limit=120){
    const events=[];
    function record(operation,{ms=0,bytes=0,ok=true,delta=false}={}){
      if(!['save','poll','local','render'].includes(operation))return;
      events.push({operation,ms:Math.max(0,Math.round(ms)),bytes:Math.max(0,Math.round(bytes)),ok:!!ok,delta:!!delta,at:Date.now()});
      if(events.length>limit)events.splice(0,events.length-limit);
    }
    function snapshot(){return ['save','poll','local','render'].map(operation=>{
      const rows=events.filter(e=>e.operation===operation),times=rows.map(e=>e.ms).sort((a,b)=>a-b);
      return {operation,count:rows.length,errors:rows.filter(e=>!e.ok).length,p95:times.length?times[Math.ceil(times.length*.95)-1]:0,bytes:rows.reduce((n,e)=>n+e.bytes,0),deltas:rows.filter(e=>e.delta).length};
    });}
    return {record,snapshot};
  }
  const api={delta,change,backoff,metrics};
  root.ModernoEfficiency=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
