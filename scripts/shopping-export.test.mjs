import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ex=require('../app/shopping-export.js'),defaults=ex.options();
function project(){return {id:1,num:'PR-1',name:'Fictional',brand:'cm',rooms:[{id:'a',name:'Room A',sections:[{name:'Main',items:[{name:'Table',price:121,qty:2,supplier:'Supplier',unit:'ud',cost:66,margin:10,note:'NEVER INTERNAL',cliNote:'PUBLIC NOTE'},{name:'Hidden',price:999,qty:1,hidden:true},{name:'Alternative',price:12.1,qty:1,alt:true}]}]},{id:'b',name:'Room B',sections:[{name:'Main',items:[{name:'Chair',price:100,qty:1}]}]}]};}
test('inclusive and exclusive IVA preserve apportioned prices and exact cents',()=>{
 assert.equal(ex.amounts(10.075,1,'excluded',0).quoted,1008);assert.equal(ex.amounts(1.005,1,'excluded',0).quoted,101);
 assert.deepEqual(ex.amounts(121,2,'included',21),{quoted:24200,base:20000,tax:4200,total:24200});
 assert.deepEqual(ex.amounts(100,2,'excluded',21),{quoted:20000,base:20000,tax:4200,total:24200});
 assert.deepEqual(ex.amounts(19.99,1.5,'included',10),{quoted:2999,base:2726,tax:273,total:2999});
 for(const mode of ['included','excluded'])for(const rate of [0,4,5.5,10,21])for(const amount of [0,.01,.03,1.005,19.99,121]){const a=ex.amounts(amount,3,mode,rate);assert.equal(a.base+a.tax,a.total);assert.ok(Number.isInteger(a.base)&&Number.isInteger(a.tax));}
});
test('selected lists, hidden products and alternatives share one summary/detail source',()=>{
 const p=project(),before=JSON.stringify(p),o={...defaults,alts:false};
 const selected=ex.collect(p,['a'],o);assert.equal(selected.rooms.length,1);assert.equal(selected.count,1);assert.equal(selected.amounts.total,24200);assert.equal(selected.amounts.base,20000);
 const both=ex.collect(p,null,o);assert.equal(both.count,2);assert.equal(both.amounts.total,34200);assert.equal(both.amounts.base+both.amounts.tax,both.amounts.total);
 const alternate=ex.collect(p,['a'],{...o,alts:true});assert.equal(alternate.count,2);assert.equal(alternate.amounts.total,25410);assert.equal(JSON.stringify(p),before);assert.doesNotMatch(JSON.stringify(both),/NEVER INTERNAL|"cost"|"margin"|Hidden/);
});
test('unknown amounts and invalid IVA are refused instead of becoming a misleading zero',()=>{
 for(const v of [null,undefined,'',NaN,Infinity,-1,'wrong'])assert.throws(()=>ex.amounts(v,1,'included',21));
 for(const v of ['',-1,101,NaN,'x'])assert.throws(()=>ex.amounts(1,1,'included',v));
 assert.throws(()=>ex.amounts(1,1,'unknown',21));assert.throws(()=>ex.amounts(Number.MAX_VALUE,1,'included',21));
 const p=project();p.rooms[0].sections[0].items[0].price=null;assert.throws(()=>ex.collect(p,['a'],defaults),/sin precio/);assert.equal(ex.collect(p,['a'],{...defaults,prices:false}).amounts.total,0);
});
test('CSV has summary first, selected totals, IVA columns, escaped cells and no private fields',()=>{
 const p=project();p.rooms[0].sections[0].items[0].name='=HYPERLINK("bad");\nline';const o={...defaults,alts:false},model=ex.collect(p,['a'],o),csv=ex.csv(p,model,o,true);
 assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.indexOf('Resumen')<csv.indexOf('Precio unitario aportado'));assert.match(csv,/Base imponible/);assert.match(csv,/Cuota IVA/);assert.match(csv,/IVA incluido/);assert.match(csv,/'=HYPERLINK\(""bad""\);\nline/);assert.doesNotMatch(csv,/Room B|Hidden|Alternative|NEVER INTERNAL|cost|margin/);
 assert.match(ex.csv(p,model,{...o,taxMode:'excluded'},true),/IVA no incluido/);
 const hidden={...o,prices:false},text=ex.csv(p,ex.collect(p,['a'],hidden),hidden,true);assert.doesNotMatch(text,/IVA|Precio unitario|121|242|Base imponible/);
});
test('PDF list/grid share summary and exact fiscal totals; user text and links remain safe',()=>{
 const ctx=vm.createContext({state:{logos:{},account:{name:'Fake studio'}},BRAND:{cm:{name:'Fake'}},fmt:v=>Number(v).toFixed(2),hoyEs:()=> '22/10/2026',pdfFoot:()=>'<small>Footer</small>',fileImageAttrs:()=>'',URL});
 vm.runInContext(fs.readFileSync(new URL('../app/shopping-export.js',import.meta.url),'utf8'),ctx);const p=project(),o={...defaults,alts:false};p.rooms[0].name='<img src=x onerror=1>';p.rooms[0].sections[0].items[0].url='javascript:alert(1)';
 for(const lay of ['lista','grid']){const model=ctx.ModernoShoppingExport.collect(p,['a'],o),html=ctx.ModernoShoppingExport.html(p,model,{...o,lay},true);assert.ok(html.indexOf('Resumen de listas')<html.indexOf('Cantidad:')||lay==='grid');assert.match(html,/200.00/);assert.match(html,/42.00/);assert.match(html,/242.00/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/onerror=1>|javascript:|NEVER INTERNAL|Room B|Hidden|Alternative/);assert.equal((html.match(/class="pdf-page ex-doc"/g)||[]).length,2);}
});

test('PDF orientation remains applied throughout asynchronous preparation, then cleans up without changing products',async()=>{
 const p=project(),before=JSON.stringify(p),styles=[],z={innerHTML:'',style:{}},state={projects:[p],sessionUser:{id:'fictional'},brandFilter:'all',exOpts:{...defaults,ori:'landscape',alts:false},logos:{},account:{}};let release;
 const gate=new Promise(r=>release=r),ctx=vm.createContext({state,_accessLoading:false,_accessRole:'colaborador',byBrand:x=>x,fileViewIdentity:()=> 'fictional-study',fmt:n=>n.toFixed(2),BRAND:{cm:{name:'Fake'}},hoyEs:()=> 'Today',fileImageAttrs:()=>'',pdfFoot:()=>'',mb:{classList:{add(){}}},modal(){},closeModal(){},toast(){},document:{getElementById:()=>z,head:{append(el){styles.push(el);}},createElement:()=>({remove(){styles.splice(styles.indexOf(this),1);}})},printAs:async()=>{await gate;return true;},URL});
 vm.runInContext(fs.readFileSync(new URL('../app/shopping-export.js',import.meta.url),'utf8'),ctx);ctx.ModernoShoppingExport.open(1,['a'],true);
 const pending=ctx.ModernoShoppingExport.run();assert.equal(styles.length,1);assert.match(styles[0].textContent,/A4 landscape/);await Promise.resolve();assert.equal(styles.length,1);release();assert.equal(await pending,true);assert.equal(styles.length,0);assert.equal(z.style.display,'none');assert.equal(JSON.stringify(p),before);
});
