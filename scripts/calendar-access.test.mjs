import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const source=fs.readFileSync(new URL('../supabase/functions/calendario-ics/index.ts',import.meta.url),'utf8').replace(/^import .*;\s*$/m,'');
const code=stripTypeScriptTypes(source);
function fixture(result){let handler;const calls=[];const c={URL,Response,createClient:()=>({from(){assert.fail('No leer tablas sin comprobar permisos');},async rpc(name,args){calls.push({name,args});return result;}}),Deno:{env:{get:()=> 'ficticio'},serve:f=>handler=f}};vm.createContext(c);vm.runInContext(code,c);return {calls,run:token=>handler(new Request('https://example.invalid/?t='+token))};}
test('invalid calendar tokens never query the server',async()=>{const f=fixture({});assert.equal((await f.run('incorrecto')).status,404);assert.equal(f.calls.length,0);});
test('a revoked calendar subscription exposes no events',async()=>{const f=fixture({data:null});const response=await f.run('a'.repeat(48));assert.equal(response.status,404);assert.equal(f.calls[0].name,'app_calendario_consultar');assert.doesNotMatch(await response.text(),/VEVENT/);});
test('calendar permission failures are not presented as an empty successful calendar',async()=>{const f=fixture({error:{message:'fallo'}});assert.equal((await f.run('a'.repeat(48))).status,503);});
test('allowed calendar renders events without caching an authorization result',async()=>{const f=fixture({data:{proyectos:[{id:1,num:'FICTICIO',name:'Prueba',tasks:[{id:2,title:'Entrega',due:'2026-09-10'}]}],agenda:{events:[]}}});const response=await f.run('a'.repeat(48));assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.match(await response.text(),/Entrega/);assert.equal(f.calls[0].args.p_token,'a'.repeat(48));});
