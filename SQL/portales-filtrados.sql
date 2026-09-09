-- Candidato. Aplicar primero solo al clon; conservar las funciones originales.
begin;
create or replace function public.portal_campos(v jsonb, campos text[]) returns jsonb
language sql immutable set search_path='' as $$
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)
 from jsonb_each(case when jsonb_typeof(v)='object' then v else '{}'::jsonb end)
 where key=any(campos);
$$;
revoke all on function public.portal_campos(jsonb,text[]) from public,anon,authenticated;

create or replace function public.portal_filtrar(datos jsonb, tipo text) returns jsonb
language plpgsql immutable set search_path='' as $$
declare p jsonb:=datos->'proyecto'; resultado jsonb; salas jsonb; fases jsonb;
begin
 if p is null or tipo not in ('cliente','obra') then return null; end if;
 resultado:=public.portal_campos(p,array['id','num','name','brand','client','status','curPhase']);
 resultado:=resultado||jsonb_build_object(
 'phases',coalesce((select jsonb_agg(case when jsonb_typeof(x)='string' then x else public.portal_campos(x,array['name','n','start','end','color']) end) from jsonb_array_elements(coalesce(p->'phases','[]')) x),'[]'),
 'files',coalesce((select jsonb_agg(public.portal_campos(x,array['name','type','data','url','when','body','docRef','docKind','signed','cli'])) from jsonb_array_elements(coalesce(p->'files','[]')) x where jsonb_typeof(x)='object' and x->>'cli' is distinct from 'false' and (tipo='cliente' or (x->>'docRef' is null and x->>'docKind' is null and x->>'body' is null))),'[]'),
 'rooms','[]'::jsonb,'tasks','[]'::jsonb,'obraF','[]'::jsonb,'obraPlanos','[]'::jsonb,'obraContactos','[]'::jsonb);
 if tipo='obra' or coalesce(p#>>'{cliShare,obra}','true')<>'false' then
   select coalesce(jsonb_agg(public.portal_campos(f,array['name','start','end','color'])||jsonb_build_object('items',
     coalesce((select jsonb_agg(public.portal_campos(i,array['t','done'])||case when tipo='obra' and jsonb_typeof(i->'file')='object' then jsonb_build_object('file',public.portal_campos(i->'file',array['name','type','data','url'])) else '{}'::jsonb end) from jsonb_array_elements(coalesce(f->'items','[]')) i),'[]'))),'[]') into fases from jsonb_array_elements(coalesce(p->'obraF','[]')) f;
   resultado:=resultado||jsonb_build_object('obraF',fases);
 end if;
 if tipo='obra' or coalesce(p#>>'{cliShare,obraContactos}','true')<>'false' then
   resultado:=resultado||jsonb_build_object('obraContactos',coalesce((select jsonb_agg(public.portal_campos(x,array['name','fiscal','phone','email','trade'])) from jsonb_array_elements(coalesce(p->'obraContactos','[]')) x),'[]'));
 end if;
 if tipo='obra' then
   resultado:=resultado||jsonb_build_object('obraShare',public.portal_campos(p->'obraShare',array['token','active']),
    'obraPlanos',coalesce((select jsonb_agg(public.portal_campos(x,array['name','type','data','url'])) from jsonb_array_elements(coalesce(p->'obraPlanos','[]')) x),'[]'));
 else
   select coalesce(jsonb_agg(public.portal_campos(r,array['id','name','cliMode'])||jsonb_build_object('sections',
    coalesce((select jsonb_agg(public.portal_campos(s,array['name'])||jsonb_build_object('items',coalesce((select jsonb_agg(public.portal_campos(i,array['id','name','qty','price','cli'])) from jsonb_array_elements(coalesce(s->'items','[]')) i),'[]'))) from jsonb_array_elements(coalesce(r->'sections','[]')) s),'[]'))),'[]') into salas from jsonb_array_elements(coalesce(p->'rooms','[]')) r where r->>'cliMode' is distinct from 'off';
   resultado:=resultado||public.portal_campos(p,array['cliWelcome'])||jsonb_build_object('rooms',salas,'cliShare',public.portal_campos(p->'cliShare',array['token','active','money','obra','obraContactos']),
   'cliChat',coalesce((select jsonb_agg(public.portal_campos(x,array['de','t','d'])) from jsonb_array_elements(coalesce(p->'cliChat','[]')) x),'[]'));
   if p#>>'{cliShare,money}'='true' then resultado:=resultado||public.portal_campos(p,array['total']); end if;
 end if;
 datos:=jsonb_build_object('proyecto',resultado,'marca',public.portal_campos(datos->'marca',array['nombre','logo','tel','estudio']))||case when tipo='cliente' then
   jsonb_build_object('emisor',public.portal_campos(datos->'emisor',array['name','nif','addr','city','iban']),
   'cobrado',case when p#>>'{cliShare,money}'='true' then datos->'cobrado' else '0'::jsonb end,
   'respuestas',coalesce((select jsonb_agg(public.portal_campos(x,array['tipo','item','texto','d'])) from jsonb_array_elements(coalesce(datos->'respuestas','[]')) x),'[]'),
   'facturas',coalesce((select jsonb_agg(public.portal_campos(f,array['ref','date','total','status'])||jsonb_build_object('lines',coalesce((select jsonb_agg(public.portal_campos(l,array['c','concept','name','q','qty','p','price','desc','d','unit','cap','on'])) from jsonb_array_elements(coalesce(f->'lines','[]')) l),'[]'))) from jsonb_array_elements(coalesce(datos->'facturas','[]')) f),'[]')) else '{}'::jsonb end;
 return datos;
end;
$$;
revoke all on function public.portal_filtrar(jsonb,text) from public,anon,authenticated;
do $$ begin
 if to_regprocedure('public.portal_cliente_lee_original(text)') is null then alter function public.portal_cliente_lee(text) rename to portal_cliente_lee_original; end if;
 if to_regprocedure('public.portal_obra_lee_original(text)') is null then alter function public.portal_obra_lee(text) rename to portal_obra_lee_original; end if;
 if to_regprocedure('public.portal_cliente_escribe_original(text,text,text,text)') is null then alter function public.portal_cliente_escribe(text,text,text,text) rename to portal_cliente_escribe_original; end if;
end $$;
revoke all on function public.portal_cliente_lee_original(text),public.portal_obra_lee_original(text) from public,anon,authenticated;
revoke all on function public.portal_cliente_escribe_original(text,text,text,text) from public,anon,authenticated;
create or replace function public.portal_estudio(p_token text, tipo text) returns uuid language sql stable set search_path='' as $$
 select case when count(*)=1 then min(d.estudio_id::text)::uuid else null end
 from public.datos_estudio d cross join lateral jsonb_array_elements(case when jsonb_typeof(d.contenido)='array' then d.contenido else '[]'::jsonb end) p
 where d.bloque='proyectos' and lower(p->(case when tipo='cliente' then 'cliShare' else 'obraShare' end)->>'token')=lower(p_token)
 and p->(case when tipo='cliente' then 'cliShare' else 'obraShare' end)->>'active' is distinct from 'false';
$$;
revoke all on function public.portal_estudio(text,text) from public,anon,authenticated;
create or replace function public.portal_cliente_lee(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare estudio uuid;
begin
 if p_token is null or p_token !~ '^[a-zA-Z0-9]{6,128}$' then return null; end if;
 estudio:=public.portal_estudio(p_token,'cliente'); if estudio is null then return null; end if;
 return public.portal_filtrar(public.portal_cliente_lee_original(p_token),'cliente')||jsonb_build_object('estudio_id',estudio);
end $$;
create or replace function public.portal_obra_lee(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare estudio uuid;
begin
 if p_token is null or p_token !~ '^[a-z0-9]{6,128}$' then return null; end if;
 estudio:=public.portal_estudio(p_token,'obra'); if estudio is null then return null; end if;
 return public.portal_filtrar(public.portal_obra_lee_original(p_token),'obra')||jsonb_build_object('estudio_id',estudio);
end $$;
revoke all on function public.portal_cliente_lee(text),public.portal_obra_lee(text) from public;
grant execute on function public.portal_cliente_lee(text),public.portal_obra_lee(text) to anon,authenticated,service_role;
create or replace function public.portal_cliente_escribe(p_token text,p_tipo text,p_item text,p_texto text) returns boolean language plpgsql security definer set search_path='' as $$
declare datos jsonb;
begin
 datos:=public.portal_cliente_lee(p_token); if datos is null then return false; end if;
 if p_tipo not in ('mensaje','aprobado','rechazado','comentario') or p_tipo is null then return false; end if;
 if p_tipo<>'mensaje' and not exists(
  select 1 from jsonb_array_elements(datos#>'{proyecto,rooms}') r
  cross join lateral jsonb_array_elements(r->'sections') s cross join lateral jsonb_array_elements(s->'items') i
  where i->>'name'=p_item and (r->>'cliMode'='aprob' or (p_tipo='comentario' and r->>'cliMode'='coment'))
 ) then return false; end if;
 return public.portal_cliente_escribe_original(p_token,p_tipo,p_item,p_texto);
end $$;
revoke all on function public.portal_cliente_escribe(text,text,text,text) from public;
grant execute on function public.portal_cliente_escribe(text,text,text,text) to anon,authenticated,service_role;
commit;
