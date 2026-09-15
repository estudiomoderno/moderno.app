// Synthetic, in-memory PostgreSQL. Never connects to production.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.argv[2]).href),db=new PGlite();
const study='11111111-1111-4111-8111-111111111111',other='11111111-1111-4111-8111-111111111112',user='22222222-2222-4222-8222-222222222222',brand='33333333-3333-4333-8333-333333333333',product='44444444-4444-4444-8444-444444444444',copy='55555555-5555-4555-8555-555555555555';
const q=async(sql,args=[])=> (await db.query(sql,args)).rows;
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid,email text);create table miembros(user_id uuid,estudio_id uuid,rol text);create table datos_estudio(estudio_id uuid,bloque text,contenido jsonb,updated_at timestamptz default now(),primary key(estudio_id,bloque));create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;`);
 const roles=await fs.readFile(new URL('../sql/permisos-roles.sql',import.meta.url),'utf8');await db.exec(roles.slice(roles.indexOf('create or replace function public.app_rol_usuario'),roles.indexOf('-- Lista explícita')));
 await db.exec(`insert into auth.users values('${user}','test@example.invalid');insert into miembros values('${user}','${study}','admin');insert into datos_estudio values('${study}','compras','[{"id":"old","name":"Antiguo","price":20}]',now()),('${other}','compras','[]',now()),('${study}','presupuestos','[{"total":200}]',now());set "test.uid"='${user}';`);
 const before=await q('select * from datos_estudio order by estudio_id,bloque');
 await db.exec(await fs.readFile(new URL('../sql/biblioteca-marcas.sql',import.meta.url),'utf8'));
 assert.deepEqual(await q('select * from datos_estudio order by estudio_id,bloque'),before);
 await db.exec(`insert into biblioteca_marcas values('${brand}','Marca sintética','publicada');insert into biblioteca_marca_productos values('${product}','${brand}',1,'borrador',false,false,'{"name":"Sintético","files":["privado"],"price":10}',null);set role authenticated;`);
 assert.deepEqual((await q('select biblioteca_marcas_leer($1) data',[study]))[0].data,[]);
 await assert.rejects(q('select biblioteca_marcas_leer($1)',[other]));
 await assert.rejects(q('select * from biblioteca_marca_productos'));
 await assert.rejects(q('update biblioteca_marcas set estado=\'publicada\''));
 await db.exec(`reset role;update biblioteca_marca_productos set estado='publicado',derecho_consulta=true,publicado_en=now();set role authenticated;`);
 const list=(await q('select biblioteca_marcas_leer($1) data',[study]))[0].data;assert.equal(list.length,1);assert.equal(list[0].product.files,undefined);
 const save=()=>q('select biblioteca_marca_guardar($1,$2,1,$3,$4) data',[study,product,copy,JSON.stringify({price:33,notes:'Privado',supplier:'Propio'})]);
 await assert.rejects(save());
 await db.exec('reset role;update biblioteca_marca_productos set derecho_copia=true;set role authenticated;');
 assert.equal((await save())[0].data.status,'saved');assert.equal((await save())[0].data.status,'already_saved');
 await assert.rejects(q('select biblioteca_marca_guardar($1,$2,1,$3)',[other,product,copy]));
 await db.exec('reset role');
 const saved=(await q("select contenido from datos_estudio where estudio_id=$1 and bloque='compras'",[study]))[0].contenido;
 assert.equal(saved.length,2);assert.equal(saved[0].price,20);assert.equal(saved[1].price,33);assert.equal(saved[1].files,undefined);
 await db.exec(`update biblioteca_marca_productos set producto='{"name":"Nueva revisión"}',estado='retirado';set role authenticated;`);
 assert.deepEqual((await q('select biblioteca_marcas_leer($1) data',[study]))[0].data,[]);await assert.rejects(save());
 await db.exec('reset role');assert.deepEqual((await q("select contenido from datos_estudio where estudio_id=$1 and bloque='compras'",[study]))[0].contenido,saved);
 assert.deepEqual((await q("select contenido from datos_estudio where bloque='presupuestos'"))[0].contenido,[{total:200}]);
 console.log('Brand SQL checks passed: additive install, tenant isolation, denied direct access, published-only reads, copy rights, idempotence, independent copies and existing documents.');
}finally{await db.close();}
