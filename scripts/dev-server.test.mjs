import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
const script=new URL('./dev-server.mjs',import.meta.url);
function start(extra={}){return spawn(process.execPath,[fileURLToPath(script)],{env:{...process.env,PORT:'0',SUPABASE_URL:'https://pruebasdemo.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_ficticia',MODERNO_SECRETARY_ENABLED:'false',MODERNO_SECRETARY_FEEDBACK_ENABLED:'false',...extra},stdio:['ignore','pipe','pipe']});}
test('local server replaces backend, isolates cache and limits connections',async()=>{
 const child=start();let timer;
 try{
  const ready=new Promise((resolve,reject)=>{let out='';child.stdout.on('data',c=>{out+=c;const m=/localhost:(\d+)/.exec(out);if(m)resolve(Number(m[1]));});child.once('exit',()=>reject(Error('servidor cerrado')));timer=setTimeout(()=>reject(Error('timeout')),5000);});
  const port=await ready;const res=await fetch('http://127.0.0.1:'+port+'/proyectos');const html=await res.text();assert.equal(res.status,200);
  assert.ok(html.includes('const SUPABASE_URL = "https://pruebasdemo.supabase.co";'));
  assert.ok(html.includes('const LS_KEY="moderno_pruebas_pruebasdemo";'));
  assert.ok(!html.includes('const LS_KEY="moderno_prod_v1";'));
  assert.ok(!html.includes('window.MODERNO_SECRETARY_CONFIG=Object.freeze('));
  assert.equal(res.headers.get('content-security-policy'),"connect-src 'self' https://pruebasdemo.supabase.co wss://pruebasdemo.supabase.co");
  const asset=await fetch('http://127.0.0.1:'+port+'/specifications.js');assert.equal(asset.status,200);assert.match(await asset.text(),/var ModernoSpec/);
 }finally{clearTimeout(timer);if(child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}}
});
test('local server refuses production',async()=>{const child=start({SUPABASE_URL:'https://cgqtylvaapwbuwqvpjtb.supabase.co'});child.stderr.resume();assert.notEqual((await once(child,'exit'))[0],0);});
test('local server refuses administrative keys',async()=>{const payload=Buffer.from(JSON.stringify({ref:'pruebasdemo',role:'service_role'})).toString('base64url');const child=start({SUPABASE_ANON_KEY:'eyJ.'+payload+'.ficticio'});child.stderr.resume();assert.notEqual((await once(child,'exit'))[0],0);});

test('secretary only activates on the verified test backend and exposes no provider secret',async()=>{
 const child=start({SUPABASE_URL:'https://chsilowzrtumbcofspwv.supabase.co',MODERNO_SECRETARY_ENABLED:'true',MODERNO_SECRETARY_FEEDBACK_ENABLED:'true',OPENAI_API_KEY:'test-secret-not-for-browser'});let timer;
 try{
  const ready=new Promise((resolve,reject)=>{let out='';child.stdout.on('data',c=>{out+=c;const m=/localhost:(\d+)/.exec(out);if(m)resolve(Number(m[1]));});child.once('exit',()=>reject(Error('servidor cerrado')));timer=setTimeout(()=>reject(Error('timeout')),5000);});
  const port=await ready;const res=await fetch('http://127.0.0.1:'+port+'/');const html=await res.text();
  assert.ok(html.includes('window.MODERNO_SECRETARY_CONFIG=Object.freeze({"enabled":true,"endpoint":"https://chsilowzrtumbcofspwv.supabase.co/functions/v1/secretario","feedbackEnabled":true})'));
  assert.ok(!html.includes('test-secret-not-for-browser'));
  assert.ok(!res.headers.get('content-security-policy').includes('openai.com'));
 }finally{clearTimeout(timer);if(child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}}
});
test('secretary refuses a different backend even if it is not production',async()=>{const child=start({MODERNO_SECRETARY_ENABLED:'true'});child.stderr.resume();assert.notEqual((await once(child,'exit'))[0],0);});
