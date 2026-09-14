// Local-only fixture: two genuine clone identities, no business writes.
import http from 'node:http';import fs from 'node:fs/promises';
let key='',password='';
const page=(body)=>'<!doctype html><meta charset="utf-8">'+body;
http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html;charset=utf-8');
 const url=new URL(req.url,'http://localhost');
 if(req.method==='POST'&&url.pathname==='/setup'){let text='';for await(const part of req){text+=part;if(text.length>6000){res.writeHead(413).end();return;}}const form=new URLSearchParams(text);key=form.get('key');password=form.get('password');res.writeHead(303,{Location:'/'}).end();return;}
 if(!key){res.end(page('<form action="/setup" method="post"><label>Clave pública <input name="key"></label><label>Contraseña ficticia <input type="password" name="password"></label><button>Ensayar</button></form>'));return;}
 if(url.pathname==='/team-presence.js'||url.pathname==='/team-presence.css'){res.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript':'text/css');res.end(await fs.readFile(new URL('../app'+url.pathname,import.meta.url)));return;}
 if(url.pathname==='/'){res.end(page('<h1>Ensayo aislado: dos personas</h1><p>Solo cuentas ficticias del clon. Haz clic en una tarjeta para comprobar el cursor del otro lado.</p><iframe title="Persona A" src="/person?a=1" style="width:48%;height:520px"></iframe><iframe title="Persona B" src="/person?a=2" style="width:48%;height:520px"></iframe>'));return;}
 const first=url.searchParams.get('a')==='1',email=first?'clipper-ui-20260912@example.invalid':'presence-355@example.invalid',name=first?'Persona A':'Persona B';
 res.end(page(`<link rel="stylesheet" href="/team-presence.css"><style>body{margin:0;background:#f6f4eb;font:14px sans-serif}.main{height:500px;overflow:auto;padding:16px}#view button{display:block;margin:25px;padding:35px;border-radius:20px;border:0;background:#ddd5bc;width:80%}#status{font-size:11px}</style><main class="main"><div id="view"><h2>Proyectos de ensayo</h2><button>Proyecto ficticio Uno</button><button>Proyecto ficticio Dos</button></div><p id="status">Conectando…</p><button id="other">Comprobar otro estudio</button><button id="exit">Desconectar presencia</button></main><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="/team-presence.js"></script><script>
 const sb=supabase.createClient('https://szbswxpkhidywaosdfcg.supabase.co',${JSON.stringify(key)},{auth:{persistSession:false,autoRefreshToken:false}});
 const status=document.getElementById('status');let presence;
 (async()=>{const {error}=await sb.auth.signInWithPassword({email:${JSON.stringify(email)},password:${JSON.stringify(password)}});if(error){status.textContent='Error de acceso ficticio';return;}
 presence=ModernoTeamPresence.create({client:sb,identity:()=>({study:'b25c0772-3db1-46ad-a4ed-8f191d1e9781',name:${JSON.stringify(name)}}),context:()=> 'ensayo-compartido',allowed:()=>true});await presence.refresh();status.textContent='Identidad real autenticada';})();
 document.getElementById('exit').onclick=()=>{presence.stop();status.textContent='Presencia desconectada';};
 document.getElementById('other').onclick=()=>{const c=sb.channel('equipo:b25c0772-3db1-46ad-a4ed-8f191d1e9782',{config:{private:true}});c.subscribe(s=>{if(s==='CLOSED')return;status.textContent=s==='CHANNEL_ERROR'?'Otro estudio: acceso denegado':s==='SUBSCRIBED'?'ERROR: acceso ajeno permitido':s;sb.removeChannel(c);});};
 </script>`));
}).listen(3201,'127.0.0.1',()=>console.log('Ensayo de presencia: http://127.0.0.1:3201'));
