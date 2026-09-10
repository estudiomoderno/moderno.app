-- v3.35. Additive operations ledger; existing project, accounting and Storage data stay intact.
begin;
create table if not exists public.app_operaciones (
 id uuid primary key, estudio_id uuid not null references public.estudios(id), proyecto_id text not null,
 tipo text not null check(tipo in ('aprobacion','solicitud','pedido')), estado text not null,
 contenido jsonb not null, version integer not null default 1,
 creado timestamptz not null default clock_timestamp(), actor uuid
);
create index if not exists app_operaciones_proyecto on public.app_operaciones(estudio_id,proyecto_id);
create table if not exists public.app_operacion_eventos (
 id uuid primary key, estudio_id uuid not null, proyecto_id text not null, accion text not null,
 entrada jsonb not null, salida jsonb not null, actor uuid, canal text not null,
 creado timestamptz not null default clock_timestamp()
);
alter table public.app_operaciones enable row level security;
alter table public.app_operacion_eventos enable row level security;
revoke all on public.app_operaciones,public.app_operacion_eventos from public,anon,authenticated;

create or replace function public.app_spec_actual(p jsonb, item_id jsonb) returns jsonb
language plpgsql stable set search_path='' as $$
declare i jsonb;r jsonb;s jsonb;n integer:=0;res jsonb;
begin
 if item_id is null or item_id='null'::jsonb then raise exception 'La ficha necesita identificador';end if;
 for r in select value from jsonb_array_elements(coalesce(p->'rooms','[]')) loop
 for s in select value from jsonb_array_elements(coalesce(r->'sections','[]')) loop
 for i in select value from jsonb_array_elements(coalesce(s->'items','[]')) loop
 if i->'id'=item_id then
 n:=n+1;res:=public.portal_campos(i,array['id','name','sku','qty','unit','price','dims','material','color','img','url','plazo'])||jsonb_build_object('room_id',r->'id','room',r->>'name');
 if (res->>'qty')::numeric is null or (res->>'qty')::numeric<=0 or (res->>'qty')::numeric>1000000 or (res->>'price')::numeric is null or (res->>'price')::numeric<0 or (res->>'price')::numeric>100000000 then raise exception 'Revisa cantidad y precio de la ficha';end if;
 if coalesce(i->>'hidden','false')='true' or coalesce(i->>'alt','false')='true' then raise exception 'La ficha no esta activa';end if;
 end if;end loop;end loop;end loop;
 if n<>1 then raise exception 'Ficha ausente o ambigua; actualiza el proyecto' using errcode='PT409';end if;
 return res;
end $$;
revoke all on function public.app_spec_actual(jsonb,jsonb) from public,anon,authenticated;

create or replace function public.app_operaciones_lee(p_estudio uuid,p_proyecto text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p jsonb;v jsonb;actual jsonb;fila record;salida jsonb:='[]';
begin
 if public.app_rol(p_estudio) is distinct from 'admin' then raise exception 'Solo administradores' using errcode='42501';end if;
 select x into strict p from public.datos_estudio d cross join lateral jsonb_array_elements(d.contenido) x where d.estudio_id=p_estudio and d.bloque='proyectos' and x->>'id'=p_proyecto;
 if p is null then raise exception 'Proyecto no disponible';end if;
 for fila in select * from public.app_operaciones where estudio_id=p_estudio and proyecto_id=p_proyecto order by creado desc loop
 v:=to_jsonb(fila);
 if fila.tipo='aprobacion' then
 begin actual:=public.app_spec_actual(p,fila.contenido->'snapshot'->'id');v:=v||jsonb_build_object('vigente',md5(actual::text)=fila.contenido->>'revision' and not fila.contenido ? 'invalidada_en');
 exception when others then v:=v||'{"vigente":false}'::jsonb;end;
 end if;
 salida:=salida||jsonb_build_array(v);
 end loop;return salida;
end $$;
revoke all on function public.app_operaciones_lee(uuid,text) from public,anon;
grant execute on function public.app_operaciones_lee(uuid,text) to authenticated;

create or replace function public.app_operaciones_accion(p_estudio uuid,p_proyecto text,p_accion text,p_datos jsonb,p_operacion uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
<<cmd>>
declare p jsonb;bloque jsonb;ev record;op public.app_operaciones%rowtype;src public.app_operaciones%rowtype;
 snap jsonb;linea jsonb;lineas jsonb:='[]';oferta jsonb;ofertas jsonb;contenido jsonb;respuesta jsonb;id uuid;
 importe numeric;cantidad numeric;recibido numeric;completo boolean:=true;k integer;total numeric:=0;
begin
 if public.app_rol(p_estudio) is distinct from 'admin' then raise exception 'Solo administradores' using errcode='42501';end if;
 if p_operacion is null or p_datos is null or jsonb_typeof(p_datos)<>'object' then raise exception 'Operacion no valida';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
 select * into ev from public.app_operacion_eventos where id=p_operacion;
 if found then
 if ev.estudio_id<>p_estudio or ev.proyecto_id<>p_proyecto or ev.accion<>p_accion or ev.entrada<>p_datos or ev.canal<>'equipo' then raise exception 'Operacion repetida con otros datos';end if;
 return ev.salida;end if;
 select contenido into bloque from public.datos_estudio where estudio_id=p_estudio and bloque='proyectos' for share;
 select x into strict p from jsonb_array_elements(bloque) x where x->>'id'=p_proyecto;
 if p is null then raise exception 'Proyecto no disponible';end if;
 if p_accion in ('aprobacion','solicitud') then
 id:=p_operacion;
 if p_accion='aprobacion' then
 snap:=public.app_spec_actual(p,p_datos->'item');
 if exists(select 1 from public.app_operaciones where estudio_id=p_estudio and proyecto_id=p_proyecto and tipo='aprobacion' and estado<>'cancelada' and not contenido ? 'invalidada_en' and contenido->>'revision'=md5(snap::text) and contenido->'snapshot'->'id'=snap->'id') then raise exception 'Esta revision ya tiene una solicitud';end if;
 contenido:=jsonb_build_object('snapshot',snap,'revision',md5(snap::text));
 insert into public.app_operaciones(id,estudio_id,proyecto_id,tipo,estado,contenido,actor) values(id,p_estudio,p_proyecto,'aprobacion','pendiente',contenido,auth.uid());
 else
 if jsonb_typeof(p_datos->'items') is distinct from 'array' or jsonb_array_length(p_datos->'items') not between 1 and 200 or length(trim(coalesce(p_datos->>'proveedor','')))=0 then raise exception 'Selecciona productos y proveedor';end if;
 if (select count(distinct x) from jsonb_array_elements(p_datos->'items') x)<>jsonb_array_length(p_datos->'items') then raise exception 'Productos repetidos';end if;
 for linea in select value from jsonb_array_elements(p_datos->'items') loop
 snap:=public.app_spec_actual(p,linea);
 cantidad:=(snap->>'qty')::numeric;if cantidad is null or cantidad<=0 or cantidad>1000000 then raise exception 'Cantidad no valida';end if;
 lineas:=lineas||jsonb_build_array(jsonb_build_object('snapshot',snap,'revision',md5(snap::text),'qty',cantidad));end loop;
 contenido:=jsonb_build_object('proveedor',trim(p_datos->>'proveedor'),'lineas',lineas,'ofertas','[]'::jsonb,'nota',left(coalesce(p_datos->>'nota',''),2000));
 insert into public.app_operaciones(id,estudio_id,proyecto_id,tipo,estado,contenido,actor) values(id,p_estudio,p_proyecto,'solicitud','preparada',contenido,auth.uid());
 end if;
 elsif p_accion='pedido' then
 select * into src from public.app_operaciones where id=(p_datos->>'id')::uuid and estudio_id=p_estudio and proyecto_id=p_proyecto for update;
 if src.id is null or src.tipo<>'solicitud' or src.estado='cancelada' or src.version is distinct from (p_datos->>'version')::integer then raise exception 'Solicitud modificada; actualiza' using errcode='PT409';end if;
 select x into oferta from jsonb_array_elements(src.contenido->'ofertas') x where x->>'id'=p_datos->>'oferta';
 if oferta is null then raise exception 'Selecciona una oferta registrada';end if;
 if exists(select 1 from public.app_operaciones where estudio_id=p_estudio and proyecto_id=p_proyecto and tipo='pedido' and estado<>'cancelada' and contenido->>'solicitud'=src.id::text) then raise exception 'La solicitud ya tiene un pedido activo';end if;
 id:=p_operacion;contenido:=jsonb_build_object('solicitud',src.id,'proveedor',src.contenido->>'proveedor','oferta',oferta,'lineas',oferta->'lineas','total',oferta->'total','moneda','EUR','nota',coalesce(p_datos->>'nota',''));
 insert into public.app_operaciones(id,estudio_id,proyecto_id,tipo,estado,contenido,actor) values(id,p_estudio,p_proyecto,'pedido','borrador',contenido,auth.uid());
 else
 select * into op from public.app_operaciones where id=(p_datos->>'id')::uuid and estudio_id=p_estudio and proyecto_id=p_proyecto for update;
 if op.id is null or op.version is distinct from (p_datos->>'version')::integer then raise exception 'El registro ha cambiado; actualiza' using errcode='PT409';end if;
 id:=op.id;contenido:=op.contenido;
 if p_accion='aprobacion_manual' then
 if op.tipo<>'aprobacion' or op.estado<>'pendiente' or length(trim(coalesce(p_datos->>'nota','')))<5 then raise exception 'Indica como se recibio la aprobacion';end if;
 snap:=public.app_spec_actual(p,contenido->'snapshot'->'id');
 if contenido ? 'invalidada_en' or md5(snap::text)<>contenido->>'revision' then raise exception 'La ficha ha cambiado; solicita una nueva revision' using errcode='PT409';end if;
 op.estado:='aprobada';contenido:=contenido||jsonb_build_object('canal','registro_manual','nota',left(p_datos->>'nota',2000),'fecha',clock_timestamp());
 elsif p_accion='oferta' then
 if op.tipo<>'solicitud' or op.estado='cancelada' then raise exception 'Solicitud no disponible';end if;
 if jsonb_typeof(p_datos->'precios') is distinct from 'array' or jsonb_array_length(p_datos->'precios')<>jsonb_array_length(contenido->'lineas') then raise exception 'Completa todos los precios';end if;
 k:=0;
 for linea in select value from jsonb_array_elements(contenido->'lineas') loop
 importe:=(p_datos->'precios'->>k)::numeric;
 if importe is null or importe<0 or importe>100000000 or importe::text in ('NaN','Infinity','-Infinity') then raise exception 'Precio no valido';end if;
 cantidad:=(linea->>'qty')::numeric;total:=total+round(importe*cantidad,2);
 lineas:=lineas||jsonb_build_array(linea||jsonb_build_object('precio',importe,'recibido',0));k:=k+1;end loop;
 oferta:=jsonb_build_object('id',p_operacion,'referencia',left(coalesce(p_datos->>'referencia',''),200),'fecha',clock_timestamp(),'lineas',lineas,'total',total,'nota',left(coalesce(p_datos->>'nota',''),2000));
 contenido:=jsonb_set(contenido,'{ofertas}',(contenido->'ofertas')||jsonb_build_array(oferta));op.estado:='con_oferta';
 elsif p_accion='confirmar' then
 if op.tipo<>'pedido' or op.estado<>'borrador' then raise exception 'El pedido ya no es un borrador';end if;
 for linea in select value from jsonb_array_elements(contenido->'lineas') loop
 snap:=public.app_spec_actual(p,linea->'snapshot'->'id');
 if md5(snap::text)<>linea->>'revision' then raise exception 'Una ficha ha cambiado; prepara una nueva solicitud' using errcode='PT409';end if;
 if not exists(select 1 from public.app_operaciones where estudio_id=p_estudio and proyecto_id=p_proyecto and tipo='aprobacion' and estado='aprobada' and not contenido ? 'invalidada_en' and contenido->>'revision'=linea->>'revision' and contenido->'snapshot'->'id'=snap->'id') then raise exception 'Falta la aprobacion de esta revision';end if;
 end loop;
 op.estado:='confirmado';contenido:=contenido||jsonb_build_object('confirmado',clock_timestamp());
 elsif p_accion='recibir' then
 if op.tipo<>'pedido' or op.estado not in ('confirmado','parcial') then raise exception 'El pedido no admite recepciones';end if;
 if jsonb_typeof(p_datos->'cantidades') is distinct from 'array' or jsonb_array_length(p_datos->'cantidades')<>jsonb_array_length(contenido->'lineas') then raise exception 'Completa las cantidades';end if;
 k:=0;total:=0;
 for linea in select value from jsonb_array_elements(contenido->'lineas') loop
 cantidad:=(p_datos->'cantidades'->>k)::numeric;
 if cantidad is null or cantidad<0 or cantidad::text in ('NaN','Infinity','-Infinity') then raise exception 'Cantidad no valida';end if;
 recibido:=coalesce((linea->>'recibido')::numeric,0)+cantidad;
 if recibido>(linea->>'qty')::numeric then raise exception 'La recepcion supera lo pedido';end if;
 if recibido<(linea->>'qty')::numeric then completo:=false;end if;
 total:=total+cantidad;lineas:=lineas||jsonb_build_array(linea||jsonb_build_object('recibido',recibido));k:=k+1;end loop;
 if total<=0 then raise exception 'Indica alguna cantidad recibida';end if;
 contenido:=jsonb_set(contenido,'{lineas}',lineas);op.estado:=case when completo then 'recibido' else 'parcial' end;
 elsif p_accion='cancelar' then
 if op.estado in ('aprobada','rechazada','recibido','parcial','cancelada') then raise exception 'No se puede cancelar este registro; conserva su historial';end if;
 if op.tipo='solicitud' and exists(select 1 from public.app_operaciones where estudio_id=p_estudio and proyecto_id=p_proyecto and tipo='pedido' and estado<>'cancelada' and contenido->>'solicitud'=op.id::text) then raise exception 'La solicitud tiene un pedido activo';end if;
 if length(trim(coalesce(p_datos->>'nota','')))<5 then raise exception 'Indica el motivo';end if;
 op.estado:='cancelada';contenido:=contenido||jsonb_build_object('motivo_cancelacion',left(p_datos->>'nota',2000));
 else raise exception 'Accion desconocida';end if;
 update public.app_operaciones set estado=op.estado,contenido=cmd.contenido,version=version+1 where app_operaciones.id=cmd.id;
 end if;
 select to_jsonb(x) into respuesta from public.app_operaciones x where x.id=cmd.id;
 insert into public.app_operacion_eventos(id,estudio_id,proyecto_id,accion,entrada,salida,actor,canal) values(p_operacion,p_estudio,p_proyecto,p_accion,p_datos,respuesta,auth.uid(),'equipo');
 return respuesta;
end $$;
revoke all on function public.app_operaciones_accion(uuid,text,text,jsonb,uuid) from public,anon;
grant execute on function public.app_operaciones_accion(uuid,text,text,jsonb,uuid) to authenticated;


create or replace function public.portal_aprobaciones(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare eid uuid;p jsonb;op record;snap jsonb;salida jsonb:='[]';r jsonb;vigente boolean;
begin
 eid:=public.portal_estudio(p_token,'cliente');if eid is null then return '[]';end if;
 select x into strict p from public.datos_estudio d cross join lateral jsonb_array_elements(d.contenido) x where d.estudio_id=eid and d.bloque='proyectos' and lower(x#>>'{cliShare,token}')=lower(p_token);
 for op in select * from public.app_operaciones where estudio_id=eid and proyecto_id=p->>'id' and tipo='aprobacion' and estado<>'cancelada' order by creado desc loop
 begin
 snap:=public.app_spec_actual(p,op.contenido->'snapshot'->'id');
 select x into r from jsonb_array_elements(p->'rooms') x where x->'id'=snap->'room_id';
 if r->>'cliMode' is distinct from 'aprob' then continue;end if;
 vigente:=not op.contenido ? 'invalidada_en' and md5(snap::text)=op.contenido->>'revision';
 -- The snapshot is a server allowlist; no supplier, costs, internal attachments or staff notes.
 salida:=salida||jsonb_build_array(jsonb_build_object('id',op.id,'estado',op.estado,'version',op.version,'vigente',vigente,'snapshot',op.contenido->'snapshot','revision',op.contenido->>'revision'));
 exception when sqlstate 'PT409' or sqlstate 'P0001' then null;end;
 end loop;return salida;
end $$;
revoke all on function public.portal_aprobaciones(text) from public;
grant execute on function public.portal_aprobaciones(text) to anon,authenticated;

create or replace function public.portal_aprobacion_decidir(p_token text,p_id uuid,p_revision text,p_decision text,p_operacion uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare eid uuid;p jsonb;b jsonb;r jsonb;op public.app_operaciones%rowtype;ev record;snap jsonb;entrada jsonb;salida jsonb;
begin
 eid:=public.portal_estudio(p_token,'cliente');if eid is null then raise exception 'Acceso no disponible' using errcode='42501';end if;
 if p_decision not in ('aprobada','rechazada') or p_decision is null or p_operacion is null then raise exception 'Decision no valida';end if;
 perform pg_advisory_xact_lock(hashtextextended(eid::text,331));
 select contenido into b from public.datos_estudio where estudio_id=eid and bloque='proyectos' for share;
 select x into p from jsonb_array_elements(b) x where lower(x#>>'{cliShare,token}')=lower(p_token) and x#>>'{cliShare,active}' is distinct from 'false';
 if p is null then raise exception 'Acceso revocado' using errcode='42501';end if;
 entrada:=jsonb_build_object('id',p_id,'revision',p_revision,'decision',p_decision);
 select * into ev from public.app_operacion_eventos where id=p_operacion;
 if found then
 if ev.estudio_id<>eid or ev.proyecto_id<>p->>'id' or ev.canal<>'portal' or ev.entrada<>entrada then raise exception 'Operacion repetida con otros datos';end if;
 return ev.salida;end if;
 select * into op from public.app_operaciones where id=p_id and estudio_id=eid and proyecto_id=p->>'id' and tipo='aprobacion' for update;
 if op.id is null then raise exception 'Solicitud no disponible' using errcode='42501';end if;
 snap:=public.app_spec_actual(p,op.contenido->'snapshot'->'id');
 select x into r from jsonb_array_elements(p->'rooms') x where x->'id'=snap->'room_id';
 if r->>'cliMode' is distinct from 'aprob' then raise exception 'Esta estancia no admite decisiones' using errcode='42501';end if;
 if op.contenido ? 'invalidada_en' or op.estado<>'pendiente' or op.contenido->>'revision' is distinct from p_revision or md5(snap::text) is distinct from p_revision then raise exception 'La revision ha cambiado; actualiza el portal' using errcode='PT409';end if;
 update public.app_operaciones set estado=p_decision,version=version+1,contenido=contenido||jsonb_build_object('canal','portal','fecha',clock_timestamp()) where id=p_id;
 salida:=jsonb_build_object('id',p_id,'estado',p_decision,'registrado',true);
 insert into public.app_operacion_eventos(id,estudio_id,proyecto_id,accion,entrada,salida,canal) values(p_operacion,eid,p->>'id','decision',entrada,salida,'portal');
 return salida;
end $$;
revoke all on function public.portal_aprobacion_decidir(text,uuid,text,text,uuid) from public;
grant execute on function public.portal_aprobacion_decidir(text,uuid,text,text,uuid) to anon,authenticated;

-- Legacy name-based decisions cannot authorize a new order or change another product.
do $$begin
 if to_regprocedure('public.portal_cliente_escribe_v334(text,text,text,text)') is null then
 alter function public.portal_cliente_escribe(text,text,text,text) rename to portal_cliente_escribe_v334;
 end if;
end$$;
revoke all on function public.portal_cliente_escribe_v334(text,text,text,text) from public,anon,authenticated;
create or replace function public.portal_cliente_escribe(p_token text,p_tipo text,p_item text,p_texto text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if p_tipo in ('aprobado','rechazado') then raise exception 'Actualiza el portal y responde a una revision concreta' using errcode='PT409';end if;
 return public.portal_cliente_escribe_v334(p_token,p_tipo,p_item,p_texto);
end$$;
revoke all on function public.portal_cliente_escribe(text,text,text,text) from public;
grant execute on function public.portal_cliente_escribe(text,text,text,text) to anon,authenticated;

create or replace function public.app_operaciones_historial(p_estudio uuid,p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if public.app_rol(p_estudio) is distinct from 'admin' then raise exception 'Solo administradores' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('accion',accion,'entrada',entrada,'fecha',creado,'canal',canal,'actor',actor) order by creado) from public.app_operacion_eventos where estudio_id=p_estudio and salida->>'id'=p_id::text),'[]');
end$$;
revoke all on function public.app_operaciones_historial(uuid,uuid) from public,anon;
grant execute on function public.app_operaciones_historial(uuid,uuid) to authenticated;

-- An approval stays historical after any intervening change, including A -> B -> A.
create or replace function public.app_ops_invalidar() returns trigger
language plpgsql security definer set search_path='' as $$
declare o record;p jsonb;snap jsonb;valida boolean;
begin
 if new.bloque<>'proyectos' or new.contenido=old.contenido then return new;end if;
 for o in select * from public.app_operaciones where estudio_id=new.estudio_id and tipo='aprobacion' and not contenido ? 'invalidada_en' loop
 valida:=false;
 begin
 select x into strict p from jsonb_array_elements(new.contenido) x where x->>'id'=o.proyecto_id;
 snap:=public.app_spec_actual(p,o.contenido->'snapshot'->'id');
 valida:=md5(snap::text)=o.contenido->>'revision';
 exception when others then valida:=false;end;
 if not valida then
 update public.app_operaciones set contenido=contenido||jsonb_build_object('invalidada_en',clock_timestamp()),version=version+1 where id=o.id;
 insert into public.app_operacion_eventos(id,estudio_id,proyecto_id,accion,entrada,salida,actor,canal) values(gen_random_uuid(),o.estudio_id,o.proyecto_id,'revision_modificada','{}',jsonb_build_object('id',o.id),auth.uid(),'equipo');
 end if;
 end loop;return new;
end$$;
revoke all on function public.app_ops_invalidar() from public,anon,authenticated;
do $$begin
 if not exists(select 1 from pg_trigger where tgname='app_ops_invalidar' and tgrelid='public.datos_estudio'::regclass) then
 create trigger app_ops_invalidar after update of contenido on public.datos_estudio for each row execute function public.app_ops_invalidar();
 end if;
end$$;
commit;
