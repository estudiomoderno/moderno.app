import test from 'node:test';
import assert from 'node:assert/strict';
import files from '../app/private-files.js';
const host='https://clone.example',study='11111111-1111-4111-8111-111111111111',path=study+'/planos/a.pdf';
const old=host+'/storage/v1/object/public/archivos/'+path;
const signed=host+'/storage/v1/object/sign/archivos/'+path+'?token=ficticio';
test('legacy and stable references resolve to the same exact path',()=>{
 assert.equal(files.storagePath(old,[host]),path);
 assert.equal(files.storagePath('storage://archivos/'+path,[host]),path);
 assert.equal(files.storagePath('https://evil.example/storage/v1/object/public/archivos/'+path,[host]),null);
});
test('malformed paths cannot reach signer',()=>{
 for(const bad of ['storage://archivos/'+study+'/../secret','storage://archivos/'+study+'//x',host+'/storage/v1/object/public/archivos/'+study+'/%252e%252e/x'])assert.throws(()=>files.storagePath(bad,[host]));
});
test('member access checks study and preserves reference',async()=>{
 let calls=0;const resolve=files.createResolver({origins:[host],signMember:async p=>{assert.equal(p,path);calls++;return signed;}});
 assert.equal(await resolve(old,{study}),signed);assert.equal(calls,1);
 await assert.rejects(resolve(old,{study:'22222222-2222-4222-8222-222222222222'}));assert.equal(calls,1);
 assert.equal(old,host+'/storage/v1/object/public/archivos/'+path);
});
test('portal access uses its token and never member authority',async()=>{
 let member=0;const resolve=files.createResolver({origins:[host],signMember:async()=>{member++;},signPortal:async req=>{assert.deepEqual(req,{path,token:'ficticio',type:'obra'});return signed;}});
 assert.equal(await resolve(old,{study,portalToken:'ficticio',portalType:'obra'}),signed);assert.equal(member,0);
});
test('denial and substituted download cannot fall back to public access',async()=>{
 const denied=files.createResolver({origins:[host],signMember:async()=>{throw Error('denegado');}});await assert.rejects(denied(old,{study}));
 for(const target of ['https://evil.example/a',signed.replace('a.pdf','b.pdf'),old]){
  const resolve=files.createResolver({origins:[host],signMember:async()=>target});await assert.rejects(resolve(old,{study}));
 }
});
test('existing embedded office documents remain downloadable without signing',async()=>{
 const resolve=files.createResolver({origins:[host],signMember:async()=>{throw Error('no debe llamar');}});
 const source='data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,ZmFrZQ==';
 assert.equal(await resolve(source,{study}),source);await assert.rejects(resolve('javascript:alert(1)',{study}));
});
