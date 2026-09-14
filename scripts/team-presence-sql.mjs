import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.argv[2]).href);const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema realtime;
create table realtime.messages(extension text);alter table realtime.messages enable row level security;
grant usage on schema realtime to authenticated;grant select,insert on realtime.messages to authenticated;
create function realtime.topic() returns text language sql as $$ select current_setting('test.topic',true) $$;
create function public.app_rol(uuid) returns text language sql as $$ select case when $1::text=current_setting('test.study',true) then current_setting('test.role',true) else 'sin_acceso' end $$;`);
await db.exec(await fs.readFile(new URL('../SQL/presencia-equipo.sql',import.meta.url),'utf8'));
await db.exec("insert into realtime.messages values ('presence'),('broadcast');set role authenticated;");
const study='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';let count=0;
for(const role of ['admin','colaborador','gestoria','cliente','contratista','sin_acceso'])for(const topic of ['equipo:'+study,'equipo:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','equipo:invalid','datos_'+study]){
 await db.query("select set_config('test.study',$1,false),set_config('test.role',$2,false),set_config('test.topic',$3,false)",[study,role,topic]);
 const expected=['admin','colaborador'].includes(role)&&topic==='equipo:'+study;
 assert.equal((await db.query('select * from realtime.messages')).rows.length,expected?2:0);
 if(expected)await db.exec("begin;insert into realtime.messages values ('presence');rollback;");else await assert.rejects(()=>db.exec("insert into realtime.messages values ('presence')"));count++;
}
await db.close();console.log(`${count} combinaciones de estudio y rol verificadas para lectura y envío.`);
