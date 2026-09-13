import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../app/',import.meta.url)),base='https://szbswxpkhidywaosdfcg.supabase.co';let key='';
const setup=`<!doctype html><meta charset="utf-8"><h1>Ensayo de la app completa en el clon</h1><p>Solo usuario clipper-ui-20260912@example.invalid y estudio ficticio.</p><form method="post" action="/setup"><label>Clave pública del clon <input name="key"></label><button>Preparar</button></form>`;
http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://local');res.setHeader('Cache-Control','no-store');
if(req.method==='POST'&&u.pathname==='/setup'){let b='';for await(const c of req)b+=c;if(b.length>5000)throw Error('size');key=new URLSearchParams(b).get('key');res.writeHead(303,{Location:'/'}).end();return;}
if(u.pathname==='/setup'||!key){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(setup);return;}
let name=u.pathname.slice(1);if(!name||!path.extname(name))name='index.html';const dest=path.resolve(root,name);if(!dest.startsWith(path.resolve(root)+path.sep))throw Error('path');let data=await fs.readFile(dest);
if(name==='index.html'){data=data.toString().replace(/const SUPABASE_URL = "[^"]+";/,`const SUPABASE_URL = ${JSON.stringify(base)};`).replace(/const SUPABASE_ANON_KEY = "[^"]+";/,`const SUPABASE_ANON_KEY = ${JSON.stringify(key)};`);}
res.setHeader('Content-Type',({'html':'text/html;charset=utf-8','js':'text/javascript','css':'text/css','svg':'image/svg+xml','png':'image/png','json':'application/json'})[path.extname(name).slice(1)]||'application/octet-stream');res.end(data);
}catch{res.writeHead(500).end('Error del ensayo');}}).listen(3194,'127.0.0.1',()=>console.log('Ensayo completo http://127.0.0.1:3194/setup; destino fijo: clon szbswxpkhidywaosdfcg'));
