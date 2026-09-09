var ModernoSync = (() => {
// Conservatively combine independent JSON edits. Conflicting edits must be kept
// pending, never resolved by silently preferring one writer.
const missing = Symbol('missing');
function mergeSavedData(base, local, remote, depth = 0, review = null, path = []) {
  const conflict=message=>{
    if(!review)throw new Error(message);
    const key=JSON.stringify(path),choice=review.choices[key];
    if(choice==='local')return local;if(choice==='remote')return remote;
    const value=v=>v===missing?{missing:true}:{value:v};
    review.conflicts.push({key,path,base:value(base),local:value(local),remote:value(remote)});
    return local;
  };
  const equal = (a,b) => {
    if (a === missing || b === missing) return a === b;
    return canonical(a) === canonical(b);
  };
  if (equal(local,remote)) return local;
  if (equal(base,local)) return remote;
  if (equal(base,remote)) return local;
  if (depth > 100) return conflict('Conflicto: estructura demasiado profunda');
  if ([base,local,remote].every(Array.isArray)) {
    const all = [...base,...local,...remote];
    const key = ['id','ref'].find(k => all.every(x => x && typeof x === 'object' && !Array.isArray(x) && ['string','number'].includes(typeof x[k])));
    if (!key) return conflict('Conflicto: dos cambios en la misma lista');
    const id = x => typeof x[key] + ':' + x[key];
    const maps = [base,local,remote].map(a => new Map(a.map(x => [id(x),x])));
    if (maps.some((m,i) => m.size !== [base,local,remote][i].length)) return conflict('Conflicto: identificadores repetidos');
    for (const a of [local,remote]) {
      const known = a.map(id).filter(k => maps[0].has(k));
      const expected = base.map(id).filter(k => known.includes(k));
      if (JSON.stringify(known) !== JSON.stringify(expected)) return conflict('Conflicto: orden de la lista modificado');
    }
    const keys = [...new Set([...remote.map(id),...local.map(id),...base.map(id)])];
    return keys.map(k => mergeSavedData(...maps.map(m => m.has(k)?m.get(k):missing),depth+1,review,path.concat(k))).filter(v => v !== missing);
  }
  const object = v => v !== missing && v !== null && typeof v === 'object' && !Array.isArray(v);
  if ([base,local,remote].every(object)) {
    const keys = new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)]);
    return Object.fromEntries([...keys].map(k => [k,mergeSavedData(...[base,local,remote].map(v => Object.hasOwn(v,k)?v[k]:missing),depth+1,review,path.concat(k))]).filter(([,v])=>v!==missing));
  }
  return conflict('Conflicto: dos personas cambiaron el mismo dato; se conserva pendiente');
}
function canonical(v) {
  if (Array.isArray(v)) return '['+v.map(canonical).join(',')+']';
  if (v && typeof v === 'object') return '{'+Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
  return JSON.stringify(v);
}

function reviewChanges(base,local,remote,choices={}){const review={choices,conflicts:[]};const value=mergeSavedData(base,local,remote,0,review);return {value,conflicts:review.conflicts};}
return { mergeSavedData, canonical, reviewChanges };
})();
if (typeof module !== 'undefined') module.exports = ModernoSync;

