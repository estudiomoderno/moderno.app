-- Guardado v2: una respuesta perdida se puede reintentar sin repetir la escritura.
-- Migracion aditiva. Los RPC anteriores siguen disponibles para clientes antiguos.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

do $guard$
begin
  if to_regclass('public.estudios') is null
     or to_regclass('auth.users') is null
     or to_regprocedure('public.app_rol(uuid)') is null
     or to_regprocedure('public.app_leer_bloques(uuid,text[])') is null
     or to_regprocedure('public.app_aplicar_delta(jsonb,jsonb)') is null
     or to_regprocedure('public.app_guardar_lote_delta(uuid,jsonb)') is null then
    raise exception 'Falta el contrato vigente de estudios, permisos o guardado delta';
  end if;
  if to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception 'pgcrypto no esta disponible en el esquema extensions';
  end if;
  if obj_description('public.app_aplicar_delta(jsonb,jsonb)'::regprocedure,'pg_proc')
       is distinct from 'moderno.app_aplicar_delta/array-sync-v2'
     or obj_description('public.app_guardar_lote_delta(uuid,jsonb)'::regprocedure,'pg_proc')
       is distinct from 'moderno.app_guardar_lote_delta/envelope-budget-v2' then
    raise exception 'Aplicar primero el upgrade delta con presupuestos y marcadores verificados';
  end if;
end
$guard$;

create schema if not exists app_private;
revoke all on schema app_private from public,anon,authenticated;

create table if not exists app_private.save_protocol_settings(
  protocol smallint primary key,
  accept_new boolean not null,
  updated_at timestamptz not null default clock_timestamp(),
  check(protocol=2)
);
do $verify_settings$
declare rel regclass:='app_private.save_protocol_settings'::regclass;
begin
  if (select count(*) from pg_attribute a where a.attrelid=rel and a.attnum>0 and not a.attisdropped)<>3
     or (select count(*) from pg_attribute a where a.attrelid=rel and a.attnum>0 and not a.attisdropped
       and ((a.attname='protocol' and a.atttypid='pg_catalog.int2'::regtype and a.attnotnull)
         or (a.attname='accept_new' and a.atttypid='pg_catalog.bool'::regtype and a.attnotnull)
         or (a.attname='updated_at' and a.atttypid='pg_catalog.timestamptz'::regtype and a.attnotnull)))<>3
     or not exists(select 1 from pg_constraint c where c.conrelid=rel and c.contype='p'
       and c.conkey=array[(select attnum from pg_attribute where attrelid=rel and attname='protocol')]::smallint[])
     or not exists(select 1 from pg_constraint c where c.conrelid=rel and c.contype='c'
       and pg_get_constraintdef(c.oid)~'protocol = 2')
     or not exists(select 1 from pg_attrdef d join pg_attribute a on a.attrelid=d.adrelid and a.attnum=d.adnum
       where d.adrelid=rel and a.attname='updated_at' and pg_get_expr(d.adbin,d.adrelid)~'clock_timestamp') then
    raise exception 'app_private.save_protocol_settings tiene una estructura incompatible';
  end if;
end
$verify_settings$;
insert into app_private.save_protocol_settings(protocol,accept_new)
values(2,true)
on conflict(protocol) do update
set accept_new=true,updated_at=clock_timestamp();
revoke all on app_private.save_protocol_settings from public,anon,authenticated;

create table if not exists app_private.save_requests(
  estudio_id uuid not null references public.estudios(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  protocol smallint not null check(protocol=2),
  request_hash bytea not null check(octet_length(request_hash)=32),
  result jsonb not null,
  committed_at timestamptz not null default clock_timestamp(),
  acknowledged_at timestamptz,
  primary key(estudio_id,actor_id,request_id)
);
alter table app_private.save_requests
  add column if not exists acknowledged_at timestamptz;
do $verify_requests$
declare rel regclass:='app_private.save_requests'::regclass;
begin
  if (select count(*) from pg_attribute a where a.attrelid=rel and a.attnum>0 and not a.attisdropped)<>8
     or (select count(*) from pg_attribute a where a.attrelid=rel and a.attnum>0 and not a.attisdropped
       and ((a.attname in ('estudio_id','actor_id','request_id') and a.atttypid='pg_catalog.uuid'::regtype and a.attnotnull)
         or (a.attname='protocol' and a.atttypid='pg_catalog.int2'::regtype and a.attnotnull)
         or (a.attname='request_hash' and a.atttypid='pg_catalog.bytea'::regtype and a.attnotnull)
         or (a.attname='result' and a.atttypid='pg_catalog.jsonb'::regtype and a.attnotnull)
         or (a.attname='committed_at' and a.atttypid='pg_catalog.timestamptz'::regtype and a.attnotnull)
         or (a.attname='acknowledged_at' and a.atttypid='pg_catalog.timestamptz'::regtype and not a.attnotnull)))<>8
     or not exists(select 1 from pg_constraint c where c.conrelid=rel and c.contype='p'
       and c.conkey=array[
         (select attnum from pg_attribute where attrelid=rel and attname='estudio_id'),
         (select attnum from pg_attribute where attrelid=rel and attname='actor_id'),
         (select attnum from pg_attribute where attrelid=rel and attname='request_id')]::smallint[])
     or not exists(select 1 from pg_constraint c where c.conrelid=rel and c.contype='f'
       and c.confrelid='public.estudios'::regclass and c.confdeltype='c'
       and c.conkey=array[(select attnum from pg_attribute where attrelid=rel and attname='estudio_id')]::smallint[])
     or not exists(select 1 from pg_constraint c where c.conrelid=rel and c.contype='f'
       and c.confrelid='auth.users'::regclass and c.confdeltype='c'
       and c.conkey=array[(select attnum from pg_attribute where attrelid=rel and attname='actor_id')]::smallint[])
     or not exists(select 1 from pg_constraint c where c.conrelid=rel and c.contype='c'
       and pg_get_constraintdef(c.oid)~'protocol = 2')
     or not exists(select 1 from pg_constraint c where c.conrelid=rel and c.contype='c'
       and pg_get_constraintdef(c.oid)~'octet_length\(request_hash\) = 32')
     or not exists(select 1 from pg_attrdef d join pg_attribute a on a.attrelid=d.adrelid and a.attnum=d.adnum
       where d.adrelid=rel and a.attname='committed_at' and pg_get_expr(d.adbin,d.adrelid)~'clock_timestamp') then
    raise exception 'app_private.save_requests tiene una estructura incompatible';
  end if;
end
$verify_requests$;
create index if not exists save_requests_committed_at_idx
  on app_private.save_requests(committed_at);
create index if not exists save_requests_actor_id_idx
  on app_private.save_requests(actor_id);
create index if not exists save_requests_owner_committed_idx
  on app_private.save_requests(estudio_id,actor_id,committed_at);
create index if not exists save_requests_ack_ttl_idx
  on app_private.save_requests(acknowledged_at)
  where acknowledged_at is not null;
create index if not exists save_requests_unack_ttl_idx
  on app_private.save_requests(committed_at)
  where acknowledged_at is null;
do $verify_request_index$
declare
  rel regclass:='app_private.save_requests'::regclass;
  idx regclass:=to_regclass('app_private.save_requests_owner_committed_idx');
  ack_idx regclass:=to_regclass('app_private.save_requests_ack_ttl_idx');
  unack_idx regclass:=to_regclass('app_private.save_requests_unack_ttl_idx');
begin
  if idx is null or not exists(
    select 1 from pg_index i
    where i.indexrelid=idx and i.indrelid=rel
      and i.indisvalid and i.indisready and i.indislive
      and i.indpred is null and i.indexprs is null
      and i.indnkeyatts=3 and i.indnatts=3
      and i.indkey[0]=(select attnum from pg_attribute where attrelid=rel and attname='estudio_id')
      and i.indkey[1]=(select attnum from pg_attribute where attrelid=rel and attname='actor_id')
      and i.indkey[2]=(select attnum from pg_attribute where attrelid=rel and attname='committed_at')
  ) or ack_idx is null or not exists(
    select 1 from pg_index i
    where i.indexrelid=ack_idx and i.indrelid=rel
      and i.indisvalid and i.indisready and i.indislive
      and i.indpred is not null and i.indexprs is null
      and i.indnkeyatts=1 and i.indnatts=1
      and i.indkey[0]=(select attnum from pg_attribute where attrelid=rel and attname='acknowledged_at')
      and (select am.amname from pg_class ic join pg_am am on am.oid=ic.relam where ic.oid=i.indexrelid)='btree'
      and lower(pg_get_expr(i.indpred,i.indrelid)) like '%acknowledged_at is not null%'
  ) or unack_idx is null or not exists(
    select 1 from pg_index i
    where i.indexrelid=unack_idx and i.indrelid=rel
      and i.indisvalid and i.indisready and i.indislive
      and i.indpred is not null and i.indexprs is null
      and i.indnkeyatts=1 and i.indnatts=1
      and i.indkey[0]=(select attnum from pg_attribute where attrelid=rel and attname='committed_at')
      and (select am.amname from pg_class ic join pg_am am on am.oid=ic.relam where ic.oid=i.indexrelid)='btree'
      and lower(pg_get_expr(i.indpred,i.indrelid)) like '%acknowledged_at is null%'
  ) then
    raise exception 'Los indices de app_private.save_requests tienen una estructura incompatible';
  end if;
end
$verify_request_index$;
alter table app_private.save_requests enable row level security;
revoke all on app_private.save_requests from public,anon,authenticated;

create or replace function public.app_guardar_lote_v2(p_estudio uuid,p_solicitud jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  actor uuid:=auth.uid();
  solicitud_normalizada jsonb;
  solicitud_hash bytea;
  solicitud_id uuid;
  cambio jsonb;
  actual record;
  base_solicitada timestamptz;
  candidato jsonb;
  efectivos jsonb:='[]'::jsonb;
  guardados jsonb:='[]'::jsonb;
  bloques jsonb:='[]'::jsonb;
  bloque_guardado jsonb;
  respuesta jsonb;
  recibo record;
  visto text[]:='{}'::text[];
  operaciones_bloque integer:=0;
  operaciones_total integer:=0;
  sincronizaciones_bloque integer:=0;
  sincronizaciones_total integer:=0;
  identidades_bloque bigint:=0;
  identidades_total bigint:=0;
  trabajo_delta bigint:=0;
  presupuesto_delta_excedido boolean:=false;
begin
  if actor is null or not coalesce(public.app_rol(p_estudio) in ('admin','colaborador'),false) then
    raise exception 'No autorizado' using errcode='42501';
  end if;
  if jsonb_typeof(p_solicitud) is distinct from 'object'
     or p_solicitud->'v' is distinct from '2'::jsonb
     or jsonb_typeof(p_solicitud->'requestId') is distinct from 'string'
     or coalesce(p_solicitud->>'requestId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     or jsonb_typeof(p_solicitud->'cambios') is distinct from 'array'
     or jsonb_array_length(p_solicitud->'cambios') not between 1 and 9
     or (select count(*) from jsonb_object_keys(p_solicitud))<>3
     or exists(select 1 from jsonb_object_keys(p_solicitud) k where k not in ('v','requestId','cambios')) then
    raise exception 'Solicitud v2 no valida' using errcode='22023';
  end if;
  if octet_length(p_solicitud::text)>24*1024*1024 then
    raise exception 'Solicitud v2 demasiado grande' using errcode='54000';
  end if;

  for cambio in select value from jsonb_array_elements(p_solicitud->'cambios') loop
    if jsonb_typeof(cambio) is distinct from 'object'
       or not(cambio ? 'bloque') or not(cambio ? 'base')
       or coalesce(cambio->>'bloque','') not in ('proyectos','compras','presupuestos','facturas','contactos','contratistas','fases','agenda','config')
       or cambio->>'bloque'=any(visto)
       or (cambio ? 'contenido')=(cambio ? 'cambios')
       or (select count(*) from jsonb_object_keys(cambio))<>3
       or exists(select 1 from jsonb_object_keys(cambio) k where k not in ('bloque','base','contenido','cambios'))
       or jsonb_typeof(cambio->'base') not in ('string','null') then
      raise exception 'Cambio v2 no valido' using errcode='22023';
    end if;
    visto:=array_append(visto,cambio->>'bloque');
    if cambio ? 'contenido' then
      if octet_length((cambio->'contenido')::text)>16*1024*1024 then
        raise exception 'Documento demasiado grande' using errcode='54000';
      end if;
    else
      if jsonb_typeof(cambio->'cambios') is distinct from 'array'
         or jsonb_array_length(cambio->'cambios')>64
         or octet_length((cambio->'cambios')::text)>12*1024*1024
         or exists(select 1 from jsonb_array_elements(cambio->'cambios') op where octet_length(op::text)>8*1024*1024) then
        raise exception 'Delta demasiado grande o no valido' using errcode='54000';
      end if;
      operaciones_bloque:=jsonb_array_length(cambio->'cambios');
      select count(*) filter(where op.value->>'op'='array_sync')::integer,
             coalesce(sum(case when op.value->>'op'='array_sync' then
               case when jsonb_typeof(op.value->'order')='array' and jsonb_typeof(op.value->'items')='array'
                 then jsonb_array_length(op.value->'order')+jsonb_array_length(op.value->'items') else 8001 end
             else 0 end),0)::bigint
        into sincronizaciones_bloque,identidades_bloque
      from jsonb_array_elements(cambio->'cambios') op(value);
      operaciones_total:=operaciones_total+operaciones_bloque;
      sincronizaciones_total:=sincronizaciones_total+sincronizaciones_bloque;
      identidades_total:=identidades_total+identidades_bloque;
      if sincronizaciones_bloque>8 or identidades_bloque>8000
         or operaciones_total>64 or sincronizaciones_total>8 or identidades_total>8000 then
        presupuesto_delta_excedido:=true;
      end if;
    end if;
  end loop;

  solicitud_id:=(p_solicitud->>'requestId')::uuid;
  select jsonb_build_object(
    'v',2,
    'requestId',solicitud_id::text,
    'cambios',jsonb_agg(c.value order by c.value->>'bloque')
  ) into solicitud_normalizada
  from jsonb_array_elements(p_solicitud->'cambios') c(value);
  solicitud_hash:=extensions.digest(convert_to(solicitud_normalizada::text,'UTF8'),'sha256');

  -- Mismo bloqueo que los escritores canonicos: recibo y datos confirman juntos.
  perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
  select * into recibo
  from app_private.save_requests r
  where r.estudio_id=p_estudio and r.actor_id=actor and r.request_id=solicitud_id;
  if found then
    if recibo.request_hash is distinct from solicitud_hash then
      raise exception 'El requestId ya pertenece a otro contenido' using errcode='PT409';
    end if;
    return recibo.result||jsonb_build_object('replayed',true);
  end if;
  if not coalesce((select s.accept_new from app_private.save_protocol_settings s where s.protocol=2),false) then
    raise exception 'El guardado v2 no acepta solicitudes nuevas temporalmente' using errcode='55000';
  end if;
  -- Un recibo exacto anterior siempre se reproduce arriba. Los limites nuevos
  -- solo bloquean trabajo nuevo y nunca rompen un ACK perdido ya comprometido.
  if presupuesto_delta_excedido then
    raise exception 'Solicitud v2 excede el presupuesto acumulado de delta' using errcode='54000';
  end if;

  -- Comprobar todas las versiones y todos los tamanos antes de escribir nada.
  for cambio in
    select value from jsonb_array_elements(p_solicitud->'cambios') order by value->>'bloque'
  loop
    select * into actual
    from public.app_leer_bloques(p_estudio,array[cambio->>'bloque']);
    if found then
      if jsonb_typeof(cambio->'base') is distinct from 'string' then
        raise exception 'La version ha cambiado; conservar cambios' using errcode='PT409';
      end if;
      begin
        base_solicitada:=(cambio->>'base')::timestamptz;
      exception when others then
        raise exception 'Version base no valida' using errcode='22023';
      end;
      if actual.updated_at is distinct from base_solicitada then
        raise exception 'La version ha cambiado; conservar cambios' using errcode='PT409';
      end if;
      if cambio ? 'cambios' then
        -- El candidato se calcula aqui y el escritor delta lo vuelve a aplicar si
        -- cambia. Acotar ambas pasadas evita multiplicar documentos grandes por
        -- muchos ops o bloques dentro del mismo envelope.
        operaciones_bloque:=jsonb_array_length(cambio->'cambios');
        trabajo_delta:=trabajo_delta
          +(octet_length(actual.contenido::text)::bigint
            +octet_length((cambio->'cambios')::text)::bigint)
           *operaciones_bloque*2;
        if trabajo_delta>256::bigint*1024*1024 then
          raise exception 'Solicitud v2 excede el presupuesto acumulado de trabajo' using errcode='54000';
        end if;
        candidato:=public.app_aplicar_delta(actual.contenido,cambio->'cambios');
      else
        candidato:=cambio->'contenido';
      end if;
      if octet_length(candidato::text)>16*1024*1024 then
        raise exception 'Documento resultante demasiado grande' using errcode='54000';
      end if;
      if candidato is not distinct from actual.contenido then
        bloques:=bloques||jsonb_build_array(jsonb_build_object(
          'bloque',cambio->>'bloque','updated_at',actual.updated_at,'changed',false));
      else
        efectivos:=efectivos||jsonb_build_array(cambio);
      end if;
    else
      if cambio->'base' is distinct from 'null'::jsonb or cambio ? 'cambios' then
        raise exception 'La version ha cambiado; conservar cambios' using errcode='PT409';
      end if;
      if octet_length((cambio->'contenido')::text)>16*1024*1024 then
        raise exception 'Documento resultante demasiado grande' using errcode='54000';
      end if;
      efectivos:=efectivos||jsonb_build_array(cambio);
    end if;
  end loop;

  if jsonb_array_length(efectivos)>0 then
    guardados:=public.app_guardar_lote_delta(p_estudio,efectivos);
    for bloque_guardado in select value from jsonb_array_elements(guardados) loop
      bloques:=bloques||jsonb_build_array(jsonb_build_object(
        'bloque',bloque_guardado->>'bloque',
        'updated_at',bloque_guardado->'updated_at',
        'changed',true));
    end loop;
  end if;
  select coalesce(jsonb_agg(b.value order by b.value->>'bloque'),'[]'::jsonb)
    into bloques from jsonb_array_elements(bloques) b(value);
  respuesta:=jsonb_build_object(
    'v',2,'requestId',solicitud_id::text,'replayed',false,'bloques',bloques);

  insert into app_private.save_requests(
    estudio_id,actor_id,request_id,protocol,request_hash,result
  ) values(p_estudio,actor,solicitud_id,2,solicitud_hash,respuesta);
  -- Nunca expulsar por cantidad: un ACK perdido debe conservar su resultado aunque
  -- otra pestana ya lo haya confirmado. La confirmacion solo marca el recibo. Dos
  -- lotes globales, pequenos, indexables y no bloqueantes conservan 24 horas los
  -- ACK confirmados y 30 dias los ACK perdidos. Limpiar globalmente evita que
  -- cuentas inactivas acumulen recibos para siempre. Despues del TTL, las versiones
  -- base impiden repetir una escritura ya aplicada (y un no-op sigue siendo inocuo).
  delete from app_private.save_requests r
  using (
    select old.estudio_id,old.actor_id,old.request_id
    from app_private.save_requests old
    where old.acknowledged_at<statement_timestamp()-interval '24 hours'
    order by old.acknowledged_at,old.estudio_id,old.actor_id,old.request_id
    limit 8
    for update skip locked
  ) expired
  where (r.estudio_id,r.actor_id,r.request_id)
      =(expired.estudio_id,expired.actor_id,expired.request_id);
  delete from app_private.save_requests r
  using (
    select old.estudio_id,old.actor_id,old.request_id
    from app_private.save_requests old
    where old.acknowledged_at is null
      and old.committed_at<statement_timestamp()-interval '30 days'
    order by old.committed_at,old.estudio_id,old.actor_id,old.request_id
    limit 8
    for update skip locked
  ) expired
  where (r.estudio_id,r.actor_id,r.request_id)
      =(expired.estudio_id,expired.actor_id,expired.request_id);
  return respuesta;
end
$function$;

revoke all on function public.app_guardar_lote_v2(uuid,jsonb) from public,anon;
grant execute on function public.app_guardar_lote_v2(uuid,jsonb) to authenticated;

create or replace function public.app_confirmar_guardado_v2(p_estudio uuid,p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $function$
declare
  actor uuid:=auth.uid();
  acknowledged bigint;
begin
  if actor is null then
    raise exception 'No autorizado' using errcode='42501';
  end if;
  -- No tomar el lock para UUID arbitrarios: solo el propietario de un recibo
  -- existente puede entrar en la seccion que serializa ACK y replay.
  if not exists(
    select 1 from app_private.save_requests r
    where r.estudio_id=p_estudio and r.actor_id=actor and r.request_id=p_request_id
  ) then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
  -- No borrar aqui: otra pestana puede haber enviado exactamente el mismo
  -- requestId y haber perdido su respuesta. El resultado permanece reproducible
  -- hasta el TTL aunque una de las pestanas ya haya recibido y confirmado el ACK.
  update app_private.save_requests r
     set acknowledged_at=coalesce(r.acknowledged_at,clock_timestamp())
   where r.estudio_id=p_estudio and r.actor_id=actor and r.request_id=p_request_id;
  get diagnostics acknowledged=row_count;
  return acknowledged=1;
end
$function$;

revoke all on function public.app_confirmar_guardado_v2(uuid,uuid) from public,anon,authenticated;
grant execute on function public.app_confirmar_guardado_v2(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
