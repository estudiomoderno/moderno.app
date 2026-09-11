import test from 'node:test';
import assert from 'node:assert/strict';
import C from '../app/catalog-core.js';
const item={id:7,name:'Instalación de enchufe',code:'ELE.01.01',tipo:'Partida',cat:'Electricidad',unit:'ud',price:45,cost:null,brand:'both',synonyms:['punto de luz'],desc:'Incluye mecanismo'};
const cfg=()=>({catalog:[structuredClone(item)],account:{name:'Estudio privado'},docs:[{id:8}],other:{keep:true}});
test('search accents, codes, synonyms, filters and products',()=>{
 const items=[item,{...item,id:8,tipo:'Producto'},{...item,id:9,extra:true,cat:'Otra'}];
 assert.deepEqual(C.search(items,{q:'instalacion ELE.01',brand:'cm'}).map(x=>x.id),[7,9]);
 assert.equal(C.search(items,{q:'punto luz',view:'usual'}).length,1);
 assert.equal(C.search(items,{view:'extras',family:'Otra'}).length,1);
});
test('null price never becomes zero; exact snapshots preserve price and unknown cost',()=>{
 assert.throws(()=>C.line({...item,price:null}),/medición/);
 assert.equal(C.line({...item,price:null},{unitPrice:0}).price,0);
 const l=C.line(item);assert.equal(l.cost,null);assert.equal(l.desc,item.desc);assert.equal(l.catId,7);
 item.price=60;assert.equal(l.price,45);item.price=45;
});
test('variant is explicit and retains its own scope and price',()=>{
 const c={...item,variants:[{code:'ELE.02',name:'Otro alcance',desc:'Solo montaje',price:20}]};
 const l=C.line(c,{variantCode:'ELE.02'});assert.equal(l.price,20);assert.equal(l.desc,'Solo montaje');
 assert.throws(()=>C.priceIntent(l,c,25,'ud',{role:'admin',studyId:'a'}),/variante/);
});
test('price intent requires exact ID, admin, current snapshot and same unit',()=>{
 const l=C.line(item),context={role:'admin',studyId:'a'};
 assert.throws(()=>C.priceIntent({...l,catId:8},item,50,'ud',context),/exacto/);
 assert.throws(()=>C.priceIntent(l,item,50,'ud',{...context,role:'colaborador'}),/administrador/);
 assert.throws(()=>C.priceIntent(l,item,50,'m2',context),/unidad/);
 assert.throws(()=>C.priceIntent(l,{...item,price:46},50,'ud',context),/cambió/);
});
test('draft intent does not mutate config; save affects only selected price',()=>{
 const config=cfg(),before=structuredClone(config),l=C.line(item),ctx={role:'admin',studyId:'a'};
 l.catalogPriceIntent=C.priceIntent(l,item,50,'ud',ctx);l.price=50;
 assert.deepEqual(config,before);
 const next=C.applyPriceIntents(config,[l],ctx);assert.equal(next.catalog[0].price,50);assert.equal(next.catalog[0].cost,null);assert.deepEqual(next.docs,before.docs);assert.deepEqual(config,before);
 assert.deepEqual(C.applyPriceIntents(config,[],ctx),config);
});
test('stale, cross-study and conflicting repeated lines are rejected',()=>{
 const l=C.line(item),ctx={role:'admin',studyId:'a'};l.catalogPriceIntent=C.priceIntent(l,item,50,'ud',ctx);l.price=50;
 assert.throws(()=>C.applyPriceIntents({...cfg(),catalog:[{...item,price:49}]},[l],ctx),/ha cambiado/);
 assert.throws(()=>C.applyPriceIntents(cfg(),[l],{...ctx,studyId:'b'}),/Revisa/);
 assert.throws(()=>C.applyPriceIntents(cfg(),[l,{...l,price:51,catalogPriceIntent:null}],ctx),/distintos/);
});
test('replacement archives old resolver input and keeps unrelated config unchanged',()=>{
 const config=cfg(),before=structuredClone(config),tpl={version:'es-1',locale:'es-ES',items:[item]};
 assert.throws(()=>C.replacement(config,tpl,{studyId:'a',verifiedStudyId:'b'}),/verificar/);
 const next=C.replacement(config,tpl,{studyId:'a',verifiedStudyId:'a',reservedIds:[-1,-2]});
 assert.equal(next.catalog.find(c=>!c.archived).id,-3);assert.equal(next.catalog[0].id,7);assert.equal(next.catalog[0].archived,true);assert.deepEqual(next.docs,config.docs);assert.deepEqual(next.account,config.account);assert.deepEqual(config,before);
 assert.equal(C.displaySource({catId:7},next).desc,item.desc);assert.equal(C.displaySource({name:item.name},next).id,7);
 const restored=C.restoreCatalog({...next,account:{name:'Nuevo nombre'}},config,next.catalogSeed);assert.deepEqual(restored.catalog,config.catalog);assert.equal(restored.account.name,'Nuevo nombre');
});
test('remote unit change after local save cannot merge with a proposed price',()=>{const base={catalog:[{id:8,price:40,unit:'ud'}]},local={catalog:[{id:8,price:60,unit:'ud'}]};assert.throws(()=>C.validatePriceMerge(base,local,{catalog:[{id:8,price:40,unit:'m2'}]}),/Conflicto/);assert.throws(()=>C.validatePriceMerge(base,local,{catalog:[]}),/Conflicto/);assert.doesNotThrow(()=>C.validatePriceMerge(base,local,{catalog:[{id:8,price:40,unit:'ud',name:'Nombre revisado'}]}));});
