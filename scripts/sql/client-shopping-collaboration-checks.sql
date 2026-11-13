-- Runs only inside an outer transaction on the empty Moderno Prueba schema.
-- The runner injects SQL/portal-colaboracion-compras.sql at __MIGRATION__
-- after removing its own BEGIN/COMMIT. This script always rolls back.
begin;
do $guard$ begin
 if current_database()<>'postgres' or to_regclass('public.datos_estudio') is not null then
  raise exception 'Requires the verified empty Moderno Prueba public schema';
 end if;
end $guard$;

create table public.datos_estudio(
 estudio_id uuid not null,
 bloque text not null,
 contenido jsonb not null,
 updated_at timestamptz not null default clock_timestamp(),
 primary key(estudio_id,bloque)
);
revoke all on public.datos_estudio from public,anon,authenticated;

create function public.portal_estudio(p_token text,tipo text) returns uuid
language sql stable security definer set search_path='' as $$
 select case when count(*)=1 then min(d.estudio_id::text)::uuid else null end
 from public.datos_estudio d
 cross join lateral jsonb_array_elements(d.contenido) p
 where d.bloque='proyectos' and tipo='cliente'
   and lower(p#>>'{cliShare,token}')=lower(p_token)
   and p#>>'{cliShare,active}' is distinct from 'false';
$$;
revoke all on function public.portal_estudio(text,text) from public,anon,authenticated;

create function public.portal_cliente_lee(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare study uuid; project jsonb;
begin
 study:=public.portal_estudio(p_token,'cliente');if study is null then return null;end if;
 select p into strict project from public.datos_estudio d
 cross join lateral jsonb_array_elements(d.contenido) p
 where d.estudio_id=study and d.bloque='proyectos' and lower(p#>>'{cliShare,token}')=lower(p_token);
 return jsonb_build_object('proyecto',project,'estudio_id',study);
end $$;
revoke all on function public.portal_cliente_lee(text) from public;
grant execute on function public.portal_cliente_lee(text) to anon,authenticated,service_role;

insert into public.datos_estudio(estudio_id,bloque,contenido) values(
 '20400000-0000-4000-8000-000000000001','proyectos',
 '[{"id":204,"name":"Proyecto ficticio","clientShoppingCollaboration":false,"cliShare":{"token":"clienteficticio204","active":true},"rooms":[{"id":"salon","name":"Salón","cliMode":"ver","sections":[{"id":"general","name":"General","items":[{"id":"existente","name":"Sofá existente","price":1000,"cost":600,"qty":1}]}]},{"id":"privada","name":"Privada","cliMode":"off","sections":[{"id":"oculta","name":"Oculta","items":[]}]}]}]'
);

__MIGRATION__

create temporary table client_shopping_results(test text primary key,ok boolean not null);
create function pg_temp.assert_ok(label text,condition boolean) returns void language plpgsql as $$
begin if condition is not true then raise exception 'FAILED: %',label;end if;insert into client_shopping_results values(label,true);end $$;

select pg_temp.assert_ok('default_off',(public.portal_cliente_lee('clienteficticio204')#>>'{proyecto,clientShoppingCollaboration}')::boolean=false);
update public.datos_estudio set contenido=jsonb_set(contenido,'{0,clientShoppingCollaboration}','true'::jsonb)
where estudio_id='20400000-0000-4000-8000-000000000001' and bloque='proyectos';
select pg_temp.assert_ok('portal_reads_enabled',(public.portal_cliente_lee('clienteficticio204')#>>'{proyecto,clientShoppingCollaboration}')::boolean=true);

set local role anon;
select public.portal_cliente_producto_anadir(
 'clienteficticio204','salon',0,'General',
 '{"name":"Lámpara cliente","url":"https://example.invalid/lampara","supplier":"Tienda ficticia","sku":"L-1","price":149.90,"qty":2,"unit":"ud","dims":"40 cm","material":"Metal","color":"Negro","plazo":"2 semanas"}',
 '20400000-0000-4000-8000-000000000002'
);
select public.portal_cliente_producto_anadir(
 'clienteficticio204','salon',0,'General',
 '{"name":"Lámpara cliente","url":"https://example.invalid/lampara","supplier":"Tienda ficticia","sku":"L-1","price":149.90,"qty":2,"unit":"ud","dims":"40 cm","material":"Metal","color":"Negro","plazo":"2 semanas"}',
 '20400000-0000-4000-8000-000000000002'
);
reset role;

select pg_temp.assert_ok('direct_append_and_marker',(
 select count(*)=1 and bool_and(item.value->>'clientAdded'='true') and bool_and(not (item.value ? 'cost')) and bool_and(item.value->>'createdBy'='Cliente')
 from public.datos_estudio d
 cross join lateral jsonb_array_elements(d.contenido#>'{0,rooms,0,sections,0,items}') item(value)
 where item.value->>'clientOperation'='20400000-0000-4000-8000-000000000002'
));

do $$declare blocked boolean:=false;begin
 begin perform public.portal_cliente_producto_anadir('clienteficticio204','privada',0,'Oculta','{"name":"No","price":1,"qty":1,"unit":"ud"}','20400000-0000-4000-8000-000000000003');exception when insufficient_privilege then blocked:=true;end;
 perform pg_temp.assert_ok('hidden_list_blocked',blocked);
end $$;
do $$declare blocked boolean:=false;begin
 begin perform public.portal_cliente_producto_anadir('clienteficticio204','salon',0,'General','{"name":"No","price":1,"qty":1,"unit":"ud","cost":0}','20400000-0000-4000-8000-000000000004');exception when insufficient_privilege then blocked:=true;end;
 perform pg_temp.assert_ok('internal_fields_blocked',blocked);
end $$;

update public.datos_estudio set contenido=jsonb_set(contenido,'{0,clientShoppingCollaboration}','false'::jsonb)
where estudio_id='20400000-0000-4000-8000-000000000001' and bloque='proyectos';
do $$declare blocked boolean:=false;begin
 begin perform public.portal_cliente_producto_anadir('clienteficticio204','salon',0,'General','{"name":"No","price":1,"qty":1,"unit":"ud"}','20400000-0000-4000-8000-000000000005');exception when insufficient_privilege then blocked:=true;end;
 perform pg_temp.assert_ok('disabled_blocks_new_products',blocked);
end $$;
select pg_temp.assert_ok('disable_preserves_products',(
 select count(*)=2 from public.datos_estudio d
 cross join lateral jsonb_array_elements(d.contenido#>'{0,rooms,0,sections,0,items}') item(value)
 where d.estudio_id='20400000-0000-4000-8000-000000000001'
));
select pg_temp.assert_ok('permissions',has_function_privilege('anon','public.portal_cliente_producto_anadir(text,text,integer,text,jsonb,uuid)','execute')
 and not has_function_privilege('authenticator','public.portal_cliente_producto_anadir(text,text,integer,text,jsonb,uuid)','execute'));

select * from client_shopping_results order by test;
rollback;
