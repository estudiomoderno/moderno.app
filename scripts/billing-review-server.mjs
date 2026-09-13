// Local review transport for the dashboard editor; serves only checked-in source.
import http from 'node:http';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const bundle=()=>"// @ts-nocheck\n"+[
 read('supabase/functions/billing/plans.mjs'),
 read('supabase/functions/billing/core.mjs').replace(/^import .*from '\.\/plans\.mjs';\r?\n/m,''),
 read('supabase/functions/billing/index.ts').replace(/^import .*from '\.\/core\.mjs';\r?\n/m,'')
].join('\n');
const install=()=>`begin;
do $$ begin if not exists(select 1 from auth.users where id='5fa5231a-216f-42b3-890f-cefe786907c7' and email='clipper-ui-20260912@example.invalid') then raise exception 'Clon esperado no identificado';end if;end $$;
create temp table billing_before on commit drop as
select (select md5(string_agg(to_jsonb(d)::text,'|' order by estudio_id,bloque)) from public.datos_estudio d) datos,
(select md5(string_agg(to_jsonb(m)::text,'|' order by to_jsonb(m)::text)) from public.miembros m) miembros,
(select md5(string_agg(to_jsonb(o)::text,'|' order by id)) from storage.objects o) archivos;
`+[read('SQL/billing-exemptions.sql'),read('SQL/suscripciones-test.sql'),read('SQL/planes-cuotas-test.sql')].map(s=>s.replace(/^begin;\s*$/gmi,'').replace(/^commit;\s*$/gmi,'')).join('\n')+`
do $$ declare b record;begin select * into b from billing_before;
if b.datos is distinct from (select md5(string_agg(to_jsonb(d)::text,'|' order by estudio_id,bloque)) from public.datos_estudio d)
or b.miembros is distinct from (select md5(string_agg(to_jsonb(m)::text,'|' order by to_jsonb(m)::text)) from public.miembros m)
or b.archivos is distinct from (select md5(string_agg(to_jsonb(o)::text,'|' order by id)) from storage.objects o)
then raise exception 'Conservacion de datos fallida';end if;
if exists(select 1 from public.billing_test_policy where enforced) then raise exception 'Politica activa inesperada';end if;
end $$;
commit;
select 'Billing instalado en clon, datos miembros y archivos conservados, politicas desactivadas' resultado;`;
http.createServer((req,res)=>{
 if(!['/billing','/install','/sales','/exemptions'].includes(req.url)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');
 res.end('<pre>'+(req.url==='/billing'?bundle():req.url==='/sales'?read('SQL/ventas-solicitudes-test.sql'):req.url==='/exemptions'?read('SQL/billing-exemptions.sql'):install()).replaceAll('&','&amp;').replaceAll('<','&lt;')+'</pre>');
}).listen(3195,'127.0.0.1');
