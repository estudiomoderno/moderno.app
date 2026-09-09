import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('async function cloudLoad(){'),html.indexOf('function _dataUrlBlob('));
async function resolve(probe,error=null){
 const ctx={_accessConnecting:false,_accessAttempt:0,cloudConnectionStep:async p=>p,render(){},console:{warn(){}},state:{},ESTUDIO_ID:null,_resumed:false,LS_KEY:'test',syncTag(){},afterLoginOnce(){},localStorage:{getItem:()=> 'old-study',setItem(){}},sb:{
  rpc:async()=>({data:{estudio_id:'new-study',rol:'admin'}}),
  from(){return {
   select(){return this},eq(){return this},limit:async()=>({data:probe,error}),
   then(resolve){resolve({error:new Error('Stop after anchor selection')});}
  };}
 }};
 vm.createContext(ctx);vm.runInContext(code,ctx);await ctx.cloudLoad();return ctx;
}
test('empty RLS result does not authorize old study',async()=>{const c=await resolve([]);assert.equal(c.ESTUDIO_ID,'new-study');});
test('verified membership preserves anchor and its role',async()=>{const c=await resolve([{estudio_id:'old-study',rol:'miembro'}]);assert.equal(c.ESTUDIO_ID,'old-study');assert.equal(c.state.myRole,'miembro');});
test('failed membership lookup does not authorize anchor',async()=>{const c=await resolve(null,new Error('offline'));assert.equal(c.ESTUDIO_ID,'new-study');});
