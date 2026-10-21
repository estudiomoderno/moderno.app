import test from 'node:test';
import assert from 'node:assert/strict';
import spec from '../app/specifications.js';
function fixture(){
 const moved={id:'same-product',name:'Elegido',files:[{name:'Ficha',data:'storage://fictional'}],cost:7,price:10,qty:4,libId:9,addedAt:'2026-10-18T10:00:00Z'};
 const neighbour={id:'next',name:'Vecino'},destination={id:'target-product',name:'Destino'};
 const room={id:1,sections:[{id:'same-section',name:'A',items:[moved,neighbour]},{id:'same-section',name:'B',items:[destination]}]};
 const positional={t:'prod',rid:1,rsi:0,rii:0},next={t:'pin',rid:1,rsi:0,rii:1},stable={t:'prod',src:spec.refFor('next'),rid:1,rsi:0,rii:1},ambiguous={t:'prod',src:spec.refFor('same-product'),rid:1,rsi:0,rii:0},mood={rid:1,rsi:0,rii:0};
 const p={rooms:[room,{id:2,sections:[{id:'same-section',items:[{id:'same-product',name:'Otro',custom:'intacto'}]}]}],pres:[{pages:[{els:[positional,next,stable,ambiguous]}]}],moods:[{secs:[{items:[{prodRef:mood}]}]}]};
 return {p,room,moved,neighbour,destination,positional,next,stable,ambiguous,mood};
}
test('reclassification tolerates repeated IDs while positional and unique stable links keep their exact targets',()=>{
 const f=fixture(),other=JSON.stringify(f.p.rooms[1]),ambiguous=JSON.stringify(f.ambiguous),saved={...f.moved};assert.throws(()=>spec.prepare(f.p));
 spec.reclassifyItem(f.p,f.room,0,0,1,saved,'B');
 for(const ref of [f.positional,f.mood])assert.equal(spec.resolve(f.p,ref).item,saved);
 for(const ref of [f.next,f.stable])assert.equal(spec.resolve(f.p,ref).item,f.neighbour);
 assert.equal(spec.resolve(f.p,f.ambiguous),null);assert.equal(JSON.stringify(f.ambiguous),ambiguous);assert.equal(JSON.stringify(f.p.rooms[1]),other);
 assert.deepEqual(saved,f.moved);assert.equal(f.positional.src,undefined);assert.equal(f.room.sections[0].id,'same-section');
});
test('adding a destination label preserves missing IDs and all data through JSON roundtrip',()=>{
 const f=fixture();delete f.moved.id;const saved={...f.moved};spec.reclassifyItem(f.p,f.room,0,0,-1,saved,'Textiles',()=> 'new-section');
 const restored=JSON.parse(JSON.stringify(f.p));assert.equal(restored.rooms[0].sections.at(-1).name,'Textiles');assert.equal('id' in saved,false);assert.deepEqual(spec.resolve(restored,restored.pres[0].pages[0].els[0]).item,saved);
});
test('unrelated duplicate room IDs do not block this list',()=>{
 const f=fixture();f.p.rooms.push({id:2,sections:[]});spec.reclassifyItem(f.p,f.room,0,0,1,{...f.moved},'B');assert.equal(f.room.sections[1].items.at(-1).name,'Elegido');
});
test('a dangling positional destination cannot silently start targeting the moved product',()=>{
 const f=fixture();f.p.pres[0].pages[0].els.push({t:'prod',rid:1,rsi:1,rii:1});const before=JSON.stringify(f.p);
 assert.throws(()=>spec.reclassifyItem(f.p,f.room,0,0,1,{...f.moved},'B'),/vínculo sin resolver/);assert.equal(JSON.stringify(f.p),before);
});
test('unresolved links into a new section block the move without creating a partial label',()=>{
 const f=fixture();f.p.pres[0].pages[0].els.push({t:'prod',rid:1,rsi:2,rii:0});const before=JSON.stringify(f.p);
 assert.throws(()=>spec.reclassifyItem(f.p,f.room,0,0,-1,{...f.moved},'C'),/vínculo sin resolver/);assert.equal(JSON.stringify(f.p),before);
});
test('ambiguous room positions are refused without rewriting identifiers or references',()=>{
 const f=fixture();f.p.rooms[1].id=1;const before=JSON.stringify(f.p);
 assert.throws(()=>spec.reclassifyItem(f.p,f.room,0,0,1,{...f.moved},'B'),/vínculo sin resolver/);assert.equal(JSON.stringify(f.p),before);
});
test('replacement cannot change product identity and an invalid target cannot partially mutate the list',()=>{
 for(const invalid of ['identity','target']){const f=fixture(),before=JSON.stringify(f.p);assert.throws(()=>spec.reclassifyItem(f.p,f.room,0,0,invalid==='target'?99:1,{...f.moved,id:invalid==='identity'?'other':f.moved.id},'B'));assert.equal(JSON.stringify(f.p),before);}
});
