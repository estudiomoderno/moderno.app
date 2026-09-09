import test from 'node:test';import assert from 'node:assert/strict';
import {allowedPaths,createHandler} from '../supabase/functions/portal-archivo/core.mjs';
const host='https://clone.example',study='11111111-1111-4111-8111-111111111111',path=study+'/ok.pdf';
const file=(p,extra={})=>({url:host+'/storage/v1/object/public/archivos/'+p,...extra});
const payload={estudio_id:study,proyecto:{files:[file(path),file(study+'/hidden.pdf',{cli:false}),file('other-study/no.pdf')],obraPlanos:[file(study+'/plano.pdf')],obraF:[{items:[{file:file(study+'/obra.pdf')}]}],notes:host+'/storage/v1/object/public/archivos/'+study+'/secret.pdf',cliChat:[{t:host+'/storage/v1/object/public/archivos/'+study+'/secret.pdf'}]}};
test('only explicit visible documents are eligible; text is not permission',()=>{
 assert.deepEqual([...allowedPaths(payload,'cliente',[host])],[path]);
 assert.deepEqual([...allowedPaths(payload,'obra',[host])],[path,study+'/plano.pdf',study+'/obra.pdf']);
});
test('request checks active portal before every signature',async()=>{
 let active=true,signatures=0,reads=0;
 const handler=createHandler({origins:[host],readPortal:async()=>{reads++;return active?payload:null;},sign:async(p,t)=>{assert.equal(p,path);assert.equal(t,60);signatures++;return 'signed';}});
 const req=p=>new Request('https://test',{method:'POST',body:JSON.stringify({token:'ficticio',type:'cliente',path:p})});
 assert.equal((await handler(req(path))).status,200);
 for(const p of [study+'/hidden.pdf','other-study/no.pdf',study+'/secret.pdf',study+'/plano.pdf'])assert.equal((await handler(req(p))).status,403);
 active=false;assert.equal((await handler(req(path))).status,403);assert.equal(signatures,1);assert.equal(reads,6);
});
test('invalid tokens, request types and failures never sign',async()=>{
 let signed=false;const handler=createHandler({origins:[host],readPortal:async()=>{throw Error();},sign:async()=>{signed=true;}});
 for(const body of [{token:'',type:'cliente',path},{token:'ficticio',type:'admin',path},{token:'ficticio',type:'cliente',path}])assert.ok((await handler(new Request('https://test',{method:'POST',body:JSON.stringify(body)}))).status>=400);
 assert.equal(signed,false);
});
