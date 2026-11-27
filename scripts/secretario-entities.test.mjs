import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildEntityCatalog,contactRole,normalizeEntityText,parseEntityIdentity,resolveEntity,serializeEntityIdentity
} from '../supabase/functions/secretario/entities.mjs';

const versions={contactos:'2026-11-27T10:00:00.000Z',proyectos:'2026-11-27T10:00:01.000Z',
  presupuestos:'2026-11-27T10:00:02.000Z',facturas:'2026-11-27T10:00:03.000Z'};

function snapshot(){
  return {
    versions,
    config:{BRAND:{cm:{name:'Casa Moderno'},em:{name:'Estudio Moderno'}}},
    clients:[
      {id:'amador',name:'Amador Chica Moral',fiscal:'Amador Chica Moral y Otra C.B.',num:'CL-001',brand:'cm',type:'Cliente'},
      {id:'digi',name:'Inmobiliaria Evol',fiscal:'Digi',num:'CL-002',brand:'em',type:'Cliente'},
      {id:'lumen',name:'Lumen Demo',fiscal:'Lumen Demo S.L.',num:'PRV-001',trade:'Iluminación',brand:'cm',type:'Proveedor'},
      {id:'both',name:'Proveedor Común',brand:'both',type:'Contratista'},
      {id:'team',name:'Persona del equipo',brand:'cm',type:'Team'},
      {name:'Cliente Antiguo',fiscal:'Antiguo S.L.',num:'CL-099',brand:'cm',type:'Cliente'}
    ],
    projects:[
      {id:9001,name:'Patio Demo',num:'PR-PATIO',brand:'cm',files:[{id:71,name:'Plano general.pdf'}]},
      {id:9002,name:'Alba Demo',num:'PR-ALBA',brand:'em',files:[]}
    ],
    invoices:[
      {ref:'F-DEMO-01',brand:'cm',projectId:9001,client:'Amador Chica Moral',clientIdx:0},
      {ref:'F-DEMO-02',brand:'em',projectId:9002,client:'Cliente solo factura'}
    ],
    quotes:[{ref:'P-DEMO-01',brand:'cm',projectId:9001,client:'Amador Chica Moral',clientIdx:0}],
    entries:[
      {id:501,kind:'out',brand:'cm',pid:9001,sup:'Lumen Demo'},
      {id:502,kind:'out',brand:'cm',pid:9001,sup:'Proveedor solo apunte'}
    ],
    invoiceData:{del:{},ddel:{}}
  };
}

const pick=(catalog,kind,id)=>catalog.entities.find(entity=>entity.kind===kind&&entity.id===String(id));

test('builds typed authorized entities and stable document pointers without treating positions as identities',()=>{
  const catalog=buildEntityCatalog(snapshot());
  assert.ok(Object.isFrozen(catalog.entities));
  assert.equal(catalog.entities.some(entity=>entity.label==='Persona del equipo'),false);
  assert.equal(contactRole({type:'Técnico'}),'supplier');
  assert.equal(contactRole({type:'Team'}),'team');

  const client=pick(catalog,'client','amador');
  assert.deepEqual(client.identity,{kind:'client',id:'amador',brand:'cm'});
  assert.equal(client.contactIndex,0);
  assert.equal(client.identity.contactIndex,undefined);
  assert.ok(client.aliases.includes('amador chica moral y otra c b'));
});

test('catalog records, aliases, indexes and compatible pointers retain their exact snapshot links',()=>{
  const data=snapshot(),catalog=buildEntityCatalog(data);
  const client=pick(catalog,'client','amador');
  assert.strictEqual(client.record,data.clients[0]);
  assert.deepEqual(client.entryIndexes,[]);
  const supplier=pick(catalog,'supplier','lumen');
  assert.strictEqual(supplier.record,data.clients[2]);
  assert.deepEqual(supplier.entryIndexes,[0]);
  assert.deepEqual(supplier.entryIds,['501']);

  const project=pick(catalog,'project','9001');
  assert.deepEqual(project.identity,{kind:'project',id:'9001'});
  assert.equal(project.projectId,'9001');
  const invoice=pick(catalog,'invoice','F-DEMO-01');
  assert.deepEqual(invoice.identity,{kind:'invoice',id:'F-DEMO-01',brand:'cm',projectId:'9001'});
  assert.deepEqual(invoice.pointer,{kind:'invoice',id:'F-DEMO-01',brand:'cm',projectId:'9001'});
  const quote=pick(catalog,'quote','P-DEMO-01');
  assert.deepEqual(quote.pointer,{kind:'quote',id:'P-DEMO-01',brand:'cm',projectId:'9001'});
  const file=pick(catalog,'project_file','71');
  assert.deepEqual(file.identity,{kind:'project_file',id:'71',projectId:'9001'});
  assert.deepEqual(file.pointer,{kind:'document',id:'9001:71',projectId:'9001'});
});

test('registered aliases win before an unequivocal token-prefix partial match',()=>{
  const data=snapshot();
  data.clients.push({id:'provider-a',name:'Proveedor A',brand:'cm',type:'Proveedor'});
  const catalog=buildEntityCatalog(data);
  const exact=resolveEntity(catalog,{query:'@Digi',types:['client']});
  assert.equal(exact.status,'resolved');
  assert.equal(exact.method,'exact');
  assert.equal(exact.entity.id,'digi');

  const partial=resolveEntity(catalog,{query:'cliente Amador',types:['client']});
  assert.equal(partial.status,'resolved');
  assert.equal(partial.method,'partial');
  assert.equal(partial.entity.id,'amador');
  const literal=resolveEntity(catalog,{query:'Proveedor A',types:['supplier']});
  assert.equal(literal.status,'resolved');
  assert.equal(literal.method,'exact');
  assert.equal(literal.entity.id,'provider-a');
  assert.equal(normalizeEntityText('  @Ámador  '),'amador');
});

test('missing or stale client indexes do not bind a document to contact zero',()=>{
  const data=snapshot();
  delete data.invoices[1].clientIdx;
  data.invoices.push({ref:'F-WRONG',brand:'cm',projectId:9001,client:'Otra persona',clientIdx:0});
  const catalog=buildEntityCatalog(data);
  const fallback=resolveEntity(catalog,{query:'Cliente solo factura',types:['client']}).entity;
  assert.equal(fallback.origin,'document_party');
  assert.equal(pick(catalog,'invoice','F-DEMO-02').contactIndex,null);
  const wrong=resolveEntity(catalog,{query:'Otra persona',types:['client']}).entity;
  assert.equal(wrong.origin,'document_party');
  assert.notEqual(wrong.id,'amador');
  assert.equal(pick(catalog,'invoice','F-WRONG').contactIndex,null);
});

test('partial and typo matching never select among multiple authorized candidates',()=>{
  const data=snapshot();
  data.clients.push(
    {id:'alfonso-a',name:'Alfonso Cerropuerta',brand:'cm',type:'Cliente'},
    {id:'alfonso-b',name:'Alfonso Oliver',brand:'cm',type:'Cliente'}
  );
  let catalog=buildEntityCatalog(data);
  const partial=resolveEntity(catalog,{query:'Alfonso',types:'client'});
  assert.equal(partial.status,'ambiguous');
  assert.equal(partial.method,'partial');
  assert.deepEqual(partial.candidates.map(entity=>entity.id),['alfonso-a','alfonso-b']);

  const typo=resolveEntity(catalog,{query:'Amadpr',types:['client']});
  assert.equal(typo.status,'resolved');
  assert.equal(typo.method,'typo');
  assert.equal(typo.entity.id,'amador');

  data.clients.push({id:'amador-2',name:'Amador Chico',brand:'cm',type:'Cliente'});
  catalog=buildEntityCatalog(data);
  assert.equal(resolveEntity(catalog,{query:'Amadpr',types:['client']}).status,'ambiguous');
  assert.equal(resolveEntity(catalog,{query:'F-DEM0-01',types:['invoice']}).status,'not_found');
});

test('client and supplier scopes, brand scopes and the complete catalog prevent cross-type guesses',()=>{
  const data=snapshot();
  data.clients.push({id:'lumen-client',name:'Lumen Demo',brand:'cm',type:'Cliente'});
  const catalog=buildEntityCatalog(data);
  assert.equal(resolveEntity(catalog,{query:'Lumen Demo'}).status,'ambiguous');
  assert.equal(resolveEntity(catalog,{query:'Lumen Demo',types:['supplier']}).entity.id,'lumen');
  assert.equal(resolveEntity(catalog,{query:'Lumen Demo',types:['client']}).entity.id,'lumen-client');
  assert.equal(resolveEntity(catalog,{query:'Proveedor Común',types:['supplier'],brand:'em'}).entity.id,'both');
  assert.equal(resolveEntity(catalog,{query:'Patio',types:['project'],brand:'em'}).status,'not_found');
});

test('structured selections are not reinterpreted as query text and legacy references are version guarded',()=>{
  const catalog=buildEntityCatalog(snapshot());
  const selected=resolveEntity(catalog,{selected:{kind:'client',id:'amador',brand:'cm'},query:'Digi',types:['client']});
  assert.equal(selected.status,'resolved');
  assert.equal(selected.entity.id,'amador');
  assert.equal(resolveEntity(catalog,{selected:'Amador',query:'Amador',types:['client']}).status,'invalid');
  assert.equal(resolveEntity(catalog,{selected:{kind:'client',id:'missing',brand:'cm'},query:'Amador',types:['client']}).status,'not_found');

  const legacy=resolveEntity(catalog,{query:'Cliente Antiguo',types:['client']}).entity;
  assert.equal(legacy.legacy,true);
  assert.match(legacy.id,/^legacy:[0-9a-f]{16}$/);
  assert.equal(JSON.stringify(legacy.identity).includes('contactIndex'),false);
  const encoded=serializeEntityIdentity(legacy.identity);
  assert.ok(encoded.length<400);
  assert.deepEqual(parseEntityIdentity(encoded),legacy.identity);
  assert.equal(resolveEntity(catalog,{selected:{...legacy.identity,version:'contactos@otra-version'},types:['client']}).status,'stale');
});

test('legacy duplicates and duplicate stable ids remain ambiguous instead of acquiring an array-position identity',()=>{
  const data=snapshot();
  data.clients.push({...data.clients[5]});
  data.clients.push({id:'same',name:'Duplicado A',brand:'cm',type:'Cliente'},{id:'same',name:'Duplicado B',brand:'cm',type:'Cliente'});
  const catalog=buildEntityCatalog(data);
  const old=resolveEntity(catalog,{query:'Cliente Antiguo',types:['client']});
  assert.equal(old.status,'ambiguous');
  assert.equal(new Set(old.candidates.map(entity=>serializeEntityIdentity(entity.identity))).size,1);
  assert.equal(resolveEntity(catalog,{selected:old.candidates[0].identity,types:['client']}).status,'ambiguous');
  assert.equal(resolveEntity(catalog,{selected:{kind:'client',id:'same',brand:'cm'},types:['client']}).status,'ambiguous');
  for(const entity of old.candidates){
    assert.equal(Object.hasOwn(entity.identity,'contactIndex'),false);
    assert.doesNotMatch(entity.identity.id,/contact:/);
  }
});

test('document-only parties use bounded versioned references and known duplicate contacts do not create a third fallback',()=>{
  const data=snapshot(),catalog=buildEntityCatalog(data);
  const supplier=resolveEntity(catalog,{query:'Proveedor solo apunte',types:['supplier']}).entity;
  assert.equal(supplier.origin,'document_party');
  assert.match(supplier.id,/^party:[0-9a-f]{16}$/);
  assert.match(supplier.identity.version,/facturas@/);
  assert.deepEqual(supplier.entryIndexes,[1]);
  assert.deepEqual(supplier.entryIds,['502']);
  const client=resolveEntity(catalog,{query:'Cliente solo factura',types:['client']}).entity;
  assert.equal(client.origin,'document_party');

  data.clients.push({id:'lumen-2',name:'Lumen Demo',brand:'cm',type:'Proveedor'});
  const duplicateCatalog=buildEntityCatalog(data);
  const matches=duplicateCatalog.entities.filter(entity=>entity.kind==='supplier'&&entity.aliases.includes('lumen demo'));
  assert.equal(matches.length,2);
  assert.equal(matches.some(entity=>entity.origin==='document_party'),false);
});

test('invoice, quote and file identities or pointers resolve exactly and respect project scope',()=>{
  const catalog=buildEntityCatalog(snapshot());
  const invoice=pick(catalog,'invoice','F-DEMO-01');
  assert.equal(resolveEntity(catalog,{selected:invoice.identity,types:['invoice']}).entity,invoice);
  const file=pick(catalog,'project_file','71');
  assert.equal(resolveEntity(catalog,{selected:file.pointer,types:['project_file']}).entity,file);
  assert.equal(resolveEntity(catalog,{query:'F-DEMO-01',types:['invoice'],projectId:'9002'}).status,'not_found');
  assert.equal(resolveEntity(catalog,{query:'Plano general',types:['project_file'],projectId:'9001'}).entity,file);
});
