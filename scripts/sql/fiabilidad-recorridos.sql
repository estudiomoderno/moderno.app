-- Run only against a verified EMPTY moderno-pruebas database. All fixtures are fictional.
-- The transaction rolls back all functions and synthetic rows.
begin;
do $isolation$ begin
 if exists(select 1 from pg_tables where schemaname='public') or exists(select 1 from auth.users) then
  raise exception 'Refusing benchmark: requires an empty isolated database';
 end if;
end $isolation$;
set local statement_timeout='120s'; create schema audit_fiabilidad;
CREATE OR REPLACE FUNCTION audit_fiabilidad.app_colaborador_filtrar(v jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare r jsonb; k text; hijo jsonb;
begin
 if jsonb_typeof(v)='array' then
  select coalesce(jsonb_agg(audit_fiabilidad.app_colaborador_filtrar(x)),'[]') into r
  from jsonb_array_elements(v) x where not (jsonb_typeof(x)='object' and (x ? 'docRef' or x ? 'docKind'));
  return r;
 elsif jsonb_typeof(v)='object' then
  r:='{}';
  for k,hijo in select key,value from jsonb_each(v) loop
   if k='important' and jsonb_typeof(hijo)='boolean' then
    r:=r||jsonb_build_object(k,hijo);
   elsif k=any(array['id','name','num','title','brand','client','clientIdx','status','curPhase','tpl','rooms','sections','items','tasks','files','notes','note','desc','description','url','data','type','when','date','due','start','end','color','done','col','who','assignees','assignee','subs','deps','comments','chat','cliChat','cid','txt','ts','fases','updated','off','showTasks','showObra','pid','src','subtasks','text','t','qty','price','unit','sku','supplier','dims','material','plazo','img','libId','cat','rstatus','code','email','phone','fiscal','nif','cp','folder','createdBy','createdByMail','createdAt','addr','city','country','trade','obraF','obraPlanos','obraContactos','phases','account','logos','BRAND','wsOrder','users','role','ibv','onboarded','idPrefix','series','counters','view','month','year','week','events','weekend','showWeekends','homePage','dateFmt','lang','timezone','n','chip','back','soft']) then
    r:=r||jsonb_build_object(k,audit_fiabilidad.app_colaborador_filtrar(hijo));
   end if;
  end loop;
  return r;
 end if;
 return v;
end $function$
;
CREATE OR REPLACE FUNCTION audit_fiabilidad.app_ruta_storage(enlace text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare ruta text; salida bytea:=''::bytea; i integer:=1; parte text;
begin
 if enlace like 'storage://archivos/%' then ruta:=substr(enlace,20);
 elsif enlace ~ '^https://(auth\.moderno\.app|cgqtylvaapwbuwqvpjtb\.supabase\.co|lypsmptuastbgxvlwfzj\.supabase\.co)/storage/v1/object/(public|authenticated)/archivos/' then
  ruta:=substring(enlace from '/storage/v1/object/(?:public|authenticated)/archivos/(.*)$');
  ruta:=split_part(split_part(ruta,'?',1),'#',1);
  while i<=length(ruta) loop
   if substr(ruta,i,1)='%' then
    parte:=substr(ruta,i+1,2);if parte !~ '^[a-fA-F0-9]{2}$' then return null;end if;
    salida:=salida||decode(parte,'hex');i:=i+3;
   else salida:=salida||convert_to(substr(ruta,i,1),'UTF8');i:=i+1;end if;
  end loop;
  ruta:=convert_from(salida,'UTF8');
 else return null;end if;
 if ruta !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/'
  or ruta ~ '[[:cntrl:]?#%]' or position(chr(92) in ruta)>0
  or exists(select 1 from unnest(string_to_array(ruta,'/')) segmento where segmento in ('','.','..')) then return null;end if;
 return ruta;
exception when others then return null;
end $function$
;
CREATE OR REPLACE FUNCTION audit_fiabilidad.app_rutas_documentos_privados(v jsonb)
 RETURNS SETOF text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare hijo jsonb;
begin
 if jsonb_typeof(v)='object' then
  if v ? 'docRef' or v ? 'docKind' then return query select * from audit_fiabilidad.app_rutas_storage(v);return;end if;
  for hijo in select value from jsonb_each(v) loop return query select * from audit_fiabilidad.app_rutas_documentos_privados(hijo);end loop;
 elsif jsonb_typeof(v)='array' then
  for hijo in select value from jsonb_array_elements(v) loop return query select * from audit_fiabilidad.app_rutas_documentos_privados(hijo);end loop;
 end if;
end $function$
;
CREATE OR REPLACE FUNCTION audit_fiabilidad.app_rutas_storage(v jsonb)
 RETURNS SETOF text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare hijo jsonb; ruta text;
begin
 if jsonb_typeof(v)='string' then
  ruta:=audit_fiabilidad.app_ruta_storage(v#>>'{}');if ruta is not null then return next ruta;end if;
 elsif jsonb_typeof(v)='object' then
  for hijo in select value from jsonb_each(v) loop return query select * from audit_fiabilidad.app_rutas_storage(hijo);end loop;
 elsif jsonb_typeof(v)='array' then
  for hijo in select value from jsonb_array_elements(v) loop return query select * from audit_fiabilidad.app_rutas_storage(hijo);end loop;
 end if;
end $function$
;
CREATE OR REPLACE FUNCTION audit_fiabilidad.old_app_rutas_storage(v jsonb)
 RETURNS SETOF text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare hijo jsonb; ruta text;
begin
 if jsonb_typeof(v)='string' then
  ruta:=audit_fiabilidad.app_ruta_storage(v#>>'{}');if ruta is not null then return next ruta;end if;
 elsif jsonb_typeof(v)='object' then
  for hijo in select value from jsonb_each(v) loop return query select * from audit_fiabilidad.old_app_rutas_storage(hijo);end loop;
 elsif jsonb_typeof(v)='array' then
  for hijo in select value from jsonb_array_elements(v) loop return query select * from audit_fiabilidad.old_app_rutas_storage(hijo);end loop;
 end if;
end $function$
;
CREATE OR REPLACE FUNCTION audit_fiabilidad.old_app_rutas_documentos_privados(v jsonb)
 RETURNS SETOF text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare hijo jsonb;
begin
 if jsonb_typeof(v)='object' then
  if v ? 'docRef' or v ? 'docKind' then return query select * from audit_fiabilidad.old_app_rutas_storage(v);return;end if;
  for hijo in select value from jsonb_each(v) loop return query select * from audit_fiabilidad.old_app_rutas_documentos_privados(hijo);end loop;
 elsif jsonb_typeof(v)='array' then
  for hijo in select value from jsonb_array_elements(v) loop return query select * from audit_fiabilidad.old_app_rutas_documentos_privados(hijo);end loop;
 end if;
end $function$
;
CREATE OR REPLACE FUNCTION audit_fiabilidad.old_app_colaborador_filtrar(v jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare r jsonb; k text; hijo jsonb;
begin
 if jsonb_typeof(v)='array' then
  select coalesce(jsonb_agg(audit_fiabilidad.old_app_colaborador_filtrar(x)),'[]') into r
  from jsonb_array_elements(v) x where not (jsonb_typeof(x)='object' and (x ? 'docRef' or x ? 'docKind'));
  return r;
 elsif jsonb_typeof(v)='object' then
  r:='{}';
  for k,hijo in select key,value from jsonb_each(v) loop
   if k='important' and jsonb_typeof(hijo)='boolean' then
    r:=r||jsonb_build_object(k,hijo);
   elsif k=any(array['id','name','num','title','brand','client','clientIdx','status','curPhase','tpl','rooms','sections','items','tasks','files','notes','note','desc','description','url','data','type','when','date','due','start','end','color','done','col','who','assignees','assignee','subs','deps','comments','chat','cliChat','cid','txt','ts','fases','updated','off','showTasks','showObra','pid','src','subtasks','text','t','qty','price','unit','sku','supplier','dims','material','plazo','img','libId','cat','rstatus','code','email','phone','fiscal','nif','cp','folder','createdBy','createdByMail','createdAt','addr','city','country','trade','obraF','obraPlanos','obraContactos','phases','account','logos','BRAND','wsOrder','users','role','ibv','onboarded','idPrefix','series','counters','view','month','year','week','events','weekend','showWeekends','homePage','dateFmt','lang','timezone','n','chip','back','soft']) then
    r:=r||jsonb_build_object(k,audit_fiabilidad.old_app_colaborador_filtrar(hijo));
   end if;
  end loop;
  return r;
 end if;
 return v;
end $function$
;
-- INSTALL_CANDIDATE_HERE
create temp table audit_results(test text,old_ms numeric,new_ms numeric,bytes bigint);
do $bench$
declare payload jsonb;sample jsonb;before timestamptz;t0 timestamptz;t1 timestamptz;actual text[];expected text[];idx int;old_ms numeric;new_ms numeric;
begin
 if has_function_privilege('anon','audit_fiabilidad.app_rutas_storage(jsonb)','EXECUTE') or has_function_privilege('authenticated','audit_fiabilidad.app_rutas_storage(jsonb)','EXECUTE')
  or has_function_privilege('anon','audit_fiabilidad.app_rutas_documentos_privados(jsonb)','EXECUTE') or has_function_privilege('authenticated','audit_fiabilidad.app_rutas_documentos_privados(jsonb)','EXECUTE') then
  raise exception 'Scanner privilege changed';
 end if;
 -- Edge cases plus arbitrary nested documents. Prefixing routes keeps all paths fictitious.
 for idx in 0..99 loop
  sample:=jsonb_build_object('name','Ficticio','cost',123,'important',case when idx%2=0 then 'true'::jsonb else '"private"'::jsonb end,
   'files',jsonb_build_array('storage://archivos/00000000-0000-4000-8000-000000000001/a.pdf',jsonb_build_object('docRef',null,'data','storage://archivos/00000000-0000-4000-8000-000000000001/b.pdf','nested',jsonb_build_object('docKind','x','data','storage://archivos/00000000-0000-4000-8000-000000000001/c.pdf'))),
   'notes',jsonb_build_array(null,42,false,jsonb_build_object('name','nested','secret','hidden','url','https://untrusted.invalid/storage/v1/object/public/archivos/a')),
   'docRef',case when idx%3=0 then '"r"'::jsonb else null::jsonb end);
  if idx%2=0 then sample:=sample-'docRef';end if;
  if idx%4=0 then sample:=jsonb_build_array(sample,sample,null,'scalar');end if;
  select array_agg(distinct r order by r) into expected from audit_fiabilidad.old_app_rutas_storage(sample) r;
  select array_agg(distinct r order by r) into actual from audit_fiabilidad.app_rutas_storage(sample) r;
  if actual is distinct from expected then raise exception 'Route mismatch %',idx;end if;
  select array_agg(distinct r order by r) into expected from audit_fiabilidad.old_app_rutas_documentos_privados(sample) r;
  select array_agg(distinct r order by r) into actual from audit_fiabilidad.app_rutas_documentos_privados(sample) r;
  if actual is distinct from expected then raise exception 'Private classification mismatch %',idx;end if;
  if audit_fiabilidad.app_colaborador_filtrar(sample) is distinct from audit_fiabilidad.old_app_colaborador_filtrar(sample) then raise exception 'Projection mismatch %',idx;end if;
 end loop;
 insert into audit_results values('100 equivalence cases',null,null,null);
 with items as (
  select jsonb_agg(jsonb_build_object(
   'id',i,'name','Producto ficticio','price',25,'qty',1,'supplier','Proveedor ficticio','cost',20,
   'desc',repeat('x',1000),'capture',jsonb_build_object('fields',jsonb_build_object('description',jsonb_build_object('value',repeat('y',1000)))),
   'files',jsonb_build_array(jsonb_build_object('data','storage://archivos/00000000-0000-4000-8000-000000000001/f-'||i||'.pdf'))
  )) as value from generate_series(1,44) i
 ), rooms as (
  select jsonb_agg(jsonb_build_object('id',r,'name','Lista ficticia','sections',jsonb_build_array(jsonb_build_object('id','s','name','General','items',items.value)))) as value
  from items cross join generate_series(1,12) r
 )
 select jsonb_agg(jsonb_build_object('id',p,'name','Proyecto ficticio','rooms',rooms.value)) into payload
 from rooms cross join generate_series(1,3) p;
 t0:=clock_timestamp();perform * from audit_fiabilidad.old_app_rutas_documentos_privados(payload);t1:=clock_timestamp();old_ms:=extract(epoch from(t1-t0))*1000;
 t0:=clock_timestamp();perform * from audit_fiabilidad.app_rutas_documentos_privados(payload);t1:=clock_timestamp();new_ms:=extract(epoch from(t1-t0))*1000;
 insert into audit_results values('private scanner',old_ms,new_ms,octet_length(payload::text));
 t0:=clock_timestamp();perform * from audit_fiabilidad.old_app_rutas_storage(payload);t1:=clock_timestamp();old_ms:=extract(epoch from(t1-t0))*1000;
 t0:=clock_timestamp();perform * from audit_fiabilidad.app_rutas_storage(payload);t1:=clock_timestamp();new_ms:=extract(epoch from(t1-t0))*1000;
 insert into audit_results values('all routes scanner',old_ms,new_ms,octet_length(payload::text));
 t0:=clock_timestamp();perform audit_fiabilidad.old_app_colaborador_filtrar(payload);t1:=clock_timestamp();old_ms:=extract(epoch from(t1-t0))*1000;
 t0:=clock_timestamp();perform audit_fiabilidad.app_colaborador_filtrar(payload);t1:=clock_timestamp();new_ms:=extract(epoch from(t1-t0))*1000;
 insert into audit_results values('projection unchanged (control)',old_ms,new_ms,octet_length(payload::text));
end $bench$;
select * from audit_results;
rollback;
