import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
const script=new URL('./dev-server.mjs',import.meta.url);
function start(extra={}){return spawn(process.execPath,[fileURLToPath(script)],{env:{...process.env,PORT:'0',SUPABASE_URL:'https://pruebasdemo.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_ficticia',...extra},stdio:['ignore','pipe','pipe']});}
test('local server replaces backend, isolates cache and limits connections',async()=>{
 const child=start();let timer;
 try{
  const ready=new Promise((resolve,reject)=>{let out='';child.stdout.on('data',c=>{out+=c;const m=/localhost:(\d+)/.exec(out);if(m)resolve(Number(m[1]));});child.once('exit',()=>reject(Error('servidor cerrado')));timer=setTimeout(()=>reject(Error('timeout')),5000);});
  const port=await ready;const res=await fetch('http://127.0.0.1:'+port+'/proyectos');const html=await res.text();assert.equal(res.status,200);
  assert.ok(html.includes('const SUPABASE_URL = "https://pruebasdemo.supabase.co";'));
  assert.ok(html.includes('const LS_KEY="moderno_pruebas_pruebasdemo";'));
  assert.ok(!html.includes('const LS_KEY="moderno_prod_v1";'));
  assert.equal(res.headers.get('content-security-policy'),"connect-src 'self' https://pruebasdemo.supabase.co wss://pruebasdemo.supabase.co");
 }finally{clearTimeout(timer);if(child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}}
});
test('local server refuses production',async()=>{const child=start({SUPABASE_URL:'https://cgqtylvaapwbuwqvpjtb.supabase.co'});child.stderr.resume();assert.notEqual((await once(child,'exit'))[0],0);});
test('local server refuses administrative keys',async()=>{const payload=Buffer.from(JSON.stringify({ref:'pruebasdemo',role:'service_role'})).toString('base64url');const child=start({SUPABASE_ANON_KEY:'eyJ.'+payload+'.ficticio'});child.stderr.resume();assert.notEqual((await once(child,'exit'))[0],0);});
