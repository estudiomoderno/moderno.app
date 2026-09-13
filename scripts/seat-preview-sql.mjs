import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.argv[2]).href);const db=new PGlite();let checks=0;
const actor='11111111-1111-4111-8111-111111111111',study='22222222-2222-4222-8222-222222222222',request='33333333-3333-4333-8333-333333333333';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create table estudios(id uuid primary key);insert into estudios values('${study}');create function app_rol_usuario(uuid,uuid) returns text language sql as $$select case when $1='${study}' and $2='${actor}' then 'admin' else 'sin_acceso' end$$;`);
 for(const f of ['suscripciones-test.sql','billing-exemptions.sql','ampliaciones-test.sql'])await db.exec(await fs.readFile(new URL('../SQL/'+f,import.meta.url),'utf8'));
 const stamp=Math.floor(Date.now()/1000),q={subscriptionId:'sub_fixture',currentSeats:1,targetSeats:2,amountDue:1234,currency:'eur',periodEnd:stamp+10000,prorationDate:stamp,expiresAt:stamp+290};
 await db.query("insert into billing_test_accounts(estudio_id,customer_id,subscription_id,status,seats,eligible,period_end) values($1,'cus_fixture','sub_fixture','active',1,true,$2)",[study,q.periodEnd]);
 const save=(a=actor,s=study,id=request,value=q)=>db.query('select billing_test_seat_preview_save($1,$2,$3,$4) v',[a,s,id,value]);
 await db.exec('set role service_role');assert.equal((await save()).rows[0].v.amountDue,1234);checks++;
 assert.equal((await save()).rows[0].v.quoteId,request);checks++;
 for(const change of [{amountDue:999},{currentSeats:2},{targetSeats:5},{expiresAt:stamp-1},{currency:'usd'},{subscriptionId:'sub_other'}]){await assert.rejects(save(actor,study,request,{...q,...change}));checks++;}
 await assert.rejects(save(request));checks++;
 await db.exec('reset role;set role authenticated');await assert.rejects(save());checks++;await assert.rejects(db.query('select * from billing_test_seat_quotes'));checks++;
 await db.exec(`reset role;insert into billing_exemptions(estudio_id,reason,authorization_ref) values('${study}','Ficticio','test');set role service_role`);await assert.rejects(save());checks++;
 await db.exec('reset role');const account=(await db.query('select seats,eligible from billing_test_accounts')).rows[0];assert.equal(account.seats,1);assert.equal(account.eligible,true);checks++;
 console.log(`${checks} comprobaciones de cotizaciones persistentes correctas; sin red ni cargos.`);
}finally{await db.close();}
