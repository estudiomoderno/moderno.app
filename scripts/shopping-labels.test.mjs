import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import spec from '../app/specifications.js';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync(new URL('../app/project-ui.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
function fixture(){
 const item={name:'Lámpara ficticia',price:25,cost:12,qty:2,unit:'ud',status:'Borrador',sku:'FIC',img:'imagen-ficticia',files:[{name:'Ficha ficticia',data:'storage://archivos/ficticio'}],cliNote:'Conservar',libId:77,custom:'histórico'};
 const room={id:80,sections:[{name:'Iluminación',_c:true,items:[item]},{name:'General',items:[{id:123,name:'Silla ficticia',price:40,qty:1}]}]};
 const p={id:90,rooms:[room],pres:[{pages:[{els:[{t:'prod',rid:80,rsi:0,rii:0}]}]}],moods:[{secs:[{items:[{prodRef:{rid:80,rsi:0,rii:0}}]}]}]};
 const values={itLabel:'Iluminación',itName:item.name,itPrice:'25',itCost:'12',itQty:'2',itUnit:'ud',itSt:'Borrador',itSku:'FIC',itMgV:'',itUrl:'',itSup:'',itDims:'',itMat:'',itCol:'',itPlz:'',itNote:''};
 const elements=Object.fromEntries(Object.entries(values).map(([k,value])=>[k,{value}])),messages=[];
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const c={state:{projects:[p]},_accessRole:'admin',ModernoDaily:{escape:E},ModernoSpec:spec,crypto:webcrypto,itFiles:structuredClone(item.files),itImg:item.img,itLibId:item.libId,itemUploadDraft:null,productAmountsValid:()=>true,getRoom:()=>({p,r:room}),toast:m=>messages.push(m),render(){},closeModal(){},document:{getElementById:id=>elements[id],addEventListener(){}}};
 c.specPrepare=project=>{if(c._accessRole==='colaborador')return false;spec.prepare(project);return true;};
 vm.createContext(c);vm.runInContext(source,c);vm.runInContext(html.slice(html.indexOf('function saveItem(si,ii)'),html.indexOf('function refreshPrices()',html.indexOf('function saveItem(si,ii)'))),c);
 return {c,p,room,item,e:elements,messages};
}
test('flattening includes collapsed legacy groups, maps General to no label, and never writes records',()=>{
 const f=fixture(),before=JSON.stringify(f.p),rows=f.c.shoppingRoomRows(f.room);
 assert.deepEqual(Array.from(rows,r=>[r.it.name,r.si,r.ii,r.label]),[['Lámpara ficticia',0,0,'Iluminación'],['Silla ficticia',1,0,'']]);
 f.c.shoppingRoomLabelEditor(0,0);f.c.shoppingRoomLabelMatches('Iluminación','label:iluminacion');assert.equal(JSON.stringify(f.p),before);
 assert.equal(f.c.shoppingRoomLabelMatches('','none'),true);assert.equal(f.c.shoppingRoomLabelMatches('Iluminación','none'),false);
});
test('changing a label preserves files, identity and positional presentation/moodboard references',()=>{
 const f=fixture();f.e.itLabel.value='Textiles';f.c.saveItem(0,0);
 const saved=f.room.sections[2].items[0];assert.equal(f.room.sections[2].name,'Textiles');assert.equal(f.room.sections[0].items.length,0);
 assert.equal(saved.id,f.item.id);assert.equal(saved.cliNote,'Conservar');assert.equal(saved.custom,'histórico');assert.equal(saved.libId,77);assert.deepEqual(JSON.parse(JSON.stringify(saved.files)),f.item.files);
 for(const ref of [f.p.pres[0].pages[0].els[0],f.p.moods[0].secs[0].items[0].prodRef]){assert.equal(spec.resolve(f.p,ref).item,saved);assert.equal(ref.rsi,2);}
 assert.equal(f.item.img,saved.img);assert.equal(saved.price,25);assert.equal(saved.cost,12);
});
test('clearing a label uses General; cancelling a draft does not create a label or section',()=>{
 const f=fixture(),before=JSON.stringify(f.p);f.c.shoppingRoomLabelEditor(0,0);f.e.itLabel.value='Sin guardar';assert.equal(JSON.stringify(f.p),before);
 f.e.itLabel.value='';f.c.saveItem(0,0);assert.equal(f.room.sections.length,2);assert.equal(f.room.sections[1].items[1].name,'Lámpara ficticia');
});
test('saving unchanged duplicate label names keeps the exact source position',()=>{
 const f=fixture();f.room.sections.push({name:'Iluminación',items:[{...f.item,id:'other'}]});const before=JSON.stringify(f.p.pres);
 f.c.saveItem(2,0);assert.equal(f.room.sections[0].items[0],f.item);assert.equal(f.room.sections[2].items.length,1);assert.equal(JSON.stringify(f.p.pres),before);
});
test('collaborator and invalid amounts cannot reclassify products or create labels',()=>{
 for(const denied of ['role','amount']){const f=fixture(),before=JSON.stringify(f.p);f.e.itLabel.value='Nueva';if(denied==='role')f.c._accessRole='colaborador';else f.c.productAmountsValid=()=>false;f.c.saveItem(0,0);assert.equal(JSON.stringify(f.p),before);}
});
test('label text is escaped and drag cannot silently change a product label',()=>{
 const f=fixture(),before=JSON.stringify(f.p),chip=f.c.shoppingRoomLabelChip('\"><img src=x onerror=alert(1)>');
 assert.doesNotMatch(chip,/<img/);assert.match(chip,/&lt;img/);assert.equal(f.c.shoppingRoomReorderAllowed(0,1),false);assert.equal(JSON.stringify(f.p),before);
});

test('new manual products record addition time while editing preserves an existing date',()=>{
 const f=fixture(),date='2026-10-18T12:00:00Z';f.item.addedAt=date;f.c.saveItem(0,0);assert.equal(f.room.sections[0].items[0].addedAt,date);
 const start=Date.now();f.c.saveItem(0,-1);assert.ok(Date.parse(f.room.sections[0].items.at(-1).addedAt)>=start);
});
