// Real local PostgreSQL persistence, no Supabase or production connection.
// node scripts/task-importance-sql.mjs /path/to/pglite/dist/index.js
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const {PGlite}=await import(process.argv[2]?pathToFileURL(path.resolve(process.argv[2])).href:'@electric-sql/pglite');
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'moderno-task-importance-'));
let db=new PGlite(dir),checks=0;
const sql=await fs.readFile(new URL('../SQL/permisos-colaboradores.sql',import.meta.url),'utf8');
const migration=await fs.readFile(new URL('../SQL/tareas-importancia.sql',import.meta.url),'utf8');
await db.exec('create role anon;create role authenticated;create table fixture(id int primary key,contenido jsonb);');
await db.exec(migration);
await db.exec(sql.slice(sql.indexOf('create or replace function public.app_colaborador_combinar'),sql.indexOf('create or replace function public.guardar_bloque_versionado(')));
const initial=[{id:1,total:900,tasks:[{id:7,title:'Ficticia',amount:80,files:[{id:3,name:'Visible'},{id:4,docRef:'privado',name:'Privado'}],col:'pend',comments:[{cid:'1',txt:'Comentario'}]}]}];
await db.query('insert into fixture values (1,$1::jsonb)',[JSON.stringify(initial)]);
const visible=(await db.query('select public.app_colaborador_filtrar(contenido) v from fixture')).rows[0].v;
assert.equal(visible[0].tasks[0].amount,undefined);checks++;
visible[0].tasks[0].important=true;
await db.query('update fixture set contenido=public.app_colaborador_combinar(contenido,$1::jsonb) where id=1',[JSON.stringify(visible)]);
await db.close();db=new PGlite(dir);
let saved=(await db.query('select contenido v from fixture')).rows[0].v;
assert.equal(saved[0].tasks[0].important,true);checks++;
const expected=structuredClone(initial);expected[0].tasks[0].important=true;assert.deepEqual(saved,expected);checks++;
let reread=(await db.query('select public.app_colaborador_filtrar(contenido) v from fixture')).rows[0].v;
assert.equal(reread[0].tasks[0].important,true);checks++;
reread[0].tasks[0].important=false;
await db.query('update fixture set contenido=public.app_colaborador_combinar(contenido,$1::jsonb)',[JSON.stringify(reread)]);
await db.close();db=new PGlite(dir);
saved=(await db.query('select contenido v from fixture')).rows[0].v;expected[0].tasks[0].important=false;assert.deepEqual(saved,expected);checks++;
for(const invalid of ['yes',{amount:99}]){reread[0].tasks[0].important=invalid;await assert.rejects(()=>db.query('select public.app_colaborador_combinar(contenido,$1::jsonb) from fixture',[JSON.stringify(reread)]));checks++;}
reread[0].tasks[0].important=true;reread[0].tasks[0].amount=1;
await assert.rejects(()=>db.query('select public.app_colaborador_combinar(contenido,$1::jsonb) from fixture',[JSON.stringify(reread)]));checks++;
await db.close();console.log(`${checks} comprobaciones PostgreSQL correctas; persistencia verificada tras cerrar y reabrir. Solo datos ficticios en ${dir}`);
