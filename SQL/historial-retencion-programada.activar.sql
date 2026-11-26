-- Activacion operativa opcional. Ejecutar solo despues de aplicar
-- historial-retencion-programada.sql y de validar backup/carga.
-- IMPORTANTE: ejecutar con psql -v ON_ERROR_STOP=1 -f ...; no envolver este
-- archivo en una transaccion porque CREATE INDEX CONCURRENTLY lo prohibe.

do $preflight$
begin
  if to_regclass('public.datos_estudio_hist') is null
     or to_regclass('app_private.history_retention_status') is null
     or to_regprocedure('app_private.limpiar_historial_guardado(integer)') is null then
    raise exception 'Primero debe instalarse la retencion programada';
  end if;
  if not pg_catalog.has_function_privilege(current_user,'app_private.limpiar_historial_guardado(integer)','EXECUTE') then
    raise exception 'El usuario que activa pg_cron no puede ejecutar limpiar_historial_guardado';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_extension where extname='pg_cron'
  ) or to_regclass('cron.job') is null or not exists (
    select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid=p.pronamespace
     where n.nspname='cron' and p.proname='schedule' and p.pronargs=3
  ) then
    raise exception 'pg_cron oficial no esta instalado; no se activa ningun trabajo';
  end if;

  if exists(select 1 from cron.job where jobname='moderno-history-retention' and username<>current_user) then
    raise exception 'El trabajo moderno-history-retention pertenece a otro usuario; no se reemplaza';
  end if;

  if not exists (
    select 1
      from pg_catalog.pg_index i
      join pg_catalog.pg_class ic on ic.oid=i.indexrelid
      join pg_catalog.pg_am am on am.oid=ic.relam
     where i.indrelid='public.datos_estudio_hist'::regclass
       and i.indisvalid and i.indisready
       and i.indnkeyatts>=3
       and i.indpred is null
       and am.amname='btree'
       and pg_catalog.pg_get_indexdef(i.indexrelid,1,true)='estudio_id'
       and pg_catalog.pg_get_indexdef(i.indexrelid,2,true)='bloque'
       and pg_catalog.pg_get_indexdef(i.indexrelid,3,true)
             ~ '^guardado_en( DESC)?( NULLS (FIRST|LAST))?$'
  ) then
    raise exception 'Falta el indice valido por estudio, bloque y fecha; no se activa la limpieza';
  end if;

  -- Un intento concurrente fallido puede dejar un indice invalido. IF NOT
  -- EXISTS lo ocultaria, por lo que se bloquea el reintento hasta revisarlo.
  if to_regclass('public.datos_estudio_hist_retencion_idx') is not null
     and not exists (
       select 1
         from pg_catalog.pg_index i
         join pg_catalog.pg_class ic on ic.oid=i.indexrelid
         join pg_catalog.pg_am am on am.oid=ic.relam
        where i.indexrelid=to_regclass('public.datos_estudio_hist_retencion_idx')
          and i.indrelid='public.datos_estudio_hist'::regclass
          and i.indisvalid and i.indisready
          and i.indnkeyatts=2
          and i.indpred is null
          and am.amname='btree'
          and pg_catalog.pg_get_indexdef(i.indexrelid,1,true)='guardado_en'
          and pg_catalog.pg_get_indexdef(i.indexrelid,2,true)='id'
     ) then
    raise exception 'El indice de retencion existe pero no es valido o no coincide; revisarlo antes de continuar';
  end if;
end
$preflight$;

create index concurrently if not exists datos_estudio_hist_retencion_idx
  on public.datos_estudio_hist (guardado_en,id);

-- Dimensiona con la entrada observada, no con una promesa de usuarios. El
-- job usa 50 filas/minuto y cada transaccion se corta tambien en ~16 MiB:
-- 72.000 filas y ~24 GiB almacenados al dia son capacidades nominales. Solo
-- se activa si la proyeccion deja un factor de seguridad 2x en ambos ejes.
-- El timeout debe fijarse antes de iniciar el DO: configurarlo dentro de la
-- funcion llegaria despues de que PostgreSQL haya armado el timeout de la
-- sentencia exterior.
set statement_timeout='30s';
do $capacity_and_activate$
declare
  lote constant integer:=50;
  ejecuciones_dia constant bigint:=1440;
  presupuesto_bytes constant bigint:=16*1024*1024;
  factor_seguridad constant integer:=2;
  capacidad_filas constant bigint:=lote*ejecuciones_dia;
  capacidad_bytes constant bigint:=presupuesto_bytes*ejecuciones_dia;
  ahora timestamptz:=statement_timestamp();
  primera_revision timestamptz;
  inicio_observacion timestamptz;
  pendiente_desde timestamptz;
  segundos bigint:=86400;
  filas_observadas bigint:=0;
  bytes_observados bigint:=0;
  filas_6h bigint:=0;
  bytes_6h bigint:=0;
  filas_1h bigint:=0;
  bytes_1h bigint:=0;
  filas_proyectadas bigint:=0;
  bytes_proyectados bigint:=0;
  activado boolean:=false;
begin
  -- Esta segunda comprobacion es deliberada. CREATE INDEX CONCURRENTLY obliga
  -- a separar sentencias, y algunos ejecutores siguen tras un error. Por eso la
  -- unica sentencia que puede programar el job vuelve a validar por si misma
  -- todos los requisitos; el preflight anterior es solo un fail-fast.
  if to_regclass('public.datos_estudio_hist') is null
     or to_regclass('app_private.history_retention_status') is null
     or to_regprocedure('app_private.limpiar_historial_guardado(integer)') is null then
    raise exception 'Primero debe instalarse la retencion programada';
  end if;
  if not pg_catalog.has_function_privilege(
    current_user,'app_private.limpiar_historial_guardado(integer)','EXECUTE'
  ) then
    raise exception 'El usuario que activa pg_cron no puede ejecutar limpiar_historial_guardado';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_extension where extname='pg_cron'
  ) or to_regclass('cron.job') is null or not exists (
    select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid=p.pronamespace
     where n.nspname='cron' and p.proname='schedule' and p.pronargs=3
  ) then
    raise exception 'pg_cron oficial no esta instalado; no se activa ningun trabajo';
  end if;
  if exists(
    select 1 from cron.job
     where jobname='moderno-history-retention' and username<>current_user
  ) then
    raise exception 'El trabajo moderno-history-retention pertenece a otro usuario; no se reemplaza';
  end if;
  if not exists (
    select 1
      from pg_catalog.pg_index i
      join pg_catalog.pg_class ic on ic.oid=i.indexrelid
      join pg_catalog.pg_am am on am.oid=ic.relam
     where i.indrelid='public.datos_estudio_hist'::regclass
       and i.indisvalid and i.indisready
       and i.indnkeyatts>=3
       and i.indpred is null
       and am.amname='btree'
       and pg_catalog.pg_get_indexdef(i.indexrelid,1,true)='estudio_id'
       and pg_catalog.pg_get_indexdef(i.indexrelid,2,true)='bloque'
       and pg_catalog.pg_get_indexdef(i.indexrelid,3,true)
             ~ '^guardado_en( DESC)?( NULLS (FIRST|LAST))?$'
  ) then
    raise exception 'Falta el indice valido por estudio, bloque y fecha; no se activa la limpieza';
  end if;
  if not exists (
    select 1
      from pg_catalog.pg_index i
      join pg_catalog.pg_class ic on ic.oid=i.indexrelid
      join pg_catalog.pg_am am on am.oid=ic.relam
     where i.indexrelid=to_regclass('public.datos_estudio_hist_retencion_idx')
       and i.indrelid='public.datos_estudio_hist'::regclass
       and i.indisvalid and i.indisready
       and i.indnkeyatts=2
       and i.indpred is null
       and am.amname='btree'
       and pg_catalog.pg_get_indexdef(i.indexrelid,1,true)='guardado_en'
       and pg_catalog.pg_get_indexdef(i.indexrelid,2,true)='id'
  ) then
    raise exception 'El indice concurrente de retencion no quedo valido';
  end if;

  select min(h.guardado_en) into primera_revision
    from public.datos_estudio_hist h;

  if primera_revision is null then
    raise exception
      'Observacion insuficiente: el historial esta vacio; no se activa por una proyeccion cero';
  else
    inicio_observacion:=greatest(
      primera_revision,ahora-interval '24 hours'
    );
    segundos:=floor(extract(epoch from ahora-inicio_observacion))::bigint;
    if segundos<21600 then
      raise exception
        'Observacion insuficiente: % segundos; hacen falta al menos 21600 antes de activar',
        greatest(segundos,0);
    end if;

    select count(*)::bigint,
           coalesce(sum(pg_catalog.pg_column_size(h.contenido)::bigint),0)::bigint,
           count(*) filter(where h.guardado_en>=ahora-interval '6 hours')::bigint,
           coalesce(sum(pg_catalog.pg_column_size(h.contenido)::bigint)
             filter(where h.guardado_en>=ahora-interval '6 hours'),0)::bigint,
           count(*) filter(where h.guardado_en>=ahora-interval '1 hour')::bigint,
           coalesce(sum(pg_catalog.pg_column_size(h.contenido)::bigint)
             filter(where h.guardado_en>=ahora-interval '1 hour'),0)::bigint
      into filas_observadas,bytes_observados,
           filas_6h,bytes_6h,filas_1h,bytes_1h
      from public.datos_estudio_hist h
     where h.guardado_en>=inicio_observacion
       and h.guardado_en<=ahora;

    if filas_observadas=0 then
      raise exception
        'Observacion insuficiente: no hay entradas en la ventana; no se activa sin muestra';
    end if;

    -- Toma la peor proyeccion de la ventana disponible, seis horas y una
    -- hora. Asi una aceleracion reciente no queda diluida en el promedio 24h.
    filas_proyectadas:=greatest(
      ceil(filas_observadas::numeric*86400/segundos)::bigint,
      filas_6h*4,
      filas_1h*24
    );
    bytes_proyectados:=greatest(
      ceil(bytes_observados::numeric*86400/segundos)::bigint,
      bytes_6h*4,
      bytes_1h*24
    );
  end if;

  if filas_proyectadas*factor_seguridad>capacidad_filas then
    raise exception
      'NO-GO: entrada proyectada % filas/dia; capacidad segura % (nominal %, margen %x)',
      filas_proyectadas,capacidad_filas/factor_seguridad,
      capacidad_filas,factor_seguridad;
  end if;
  if bytes_proyectados*factor_seguridad>capacidad_bytes then
    raise exception
      'NO-GO: entrada proyectada % bytes/dia; capacidad segura % (nominal %, margen %x)',
      bytes_proyectados,capacidad_bytes/factor_seguridad,
      capacidad_bytes,factor_seguridad;
  end if;

  -- Senal inicial de atraso, acotada a una fila; no cuenta el historial.
  select h.guardado_en into pendiente_desde
    from public.datos_estudio_hist h
   where h.guardado_en < ahora-interval '30 days'
     and exists (
       select 1
         from public.datos_estudio_hist reciente
        where reciente.estudio_id=h.estudio_id
          and reciente.bloque=h.bloque
          and (reciente.guardado_en,reciente.id)>(h.guardado_en,h.id)
     )
   order by h.guardado_en,h.id
   limit 1;

  update app_private.history_retention_status
     set activation_preflight_at=clock_timestamp(),
         observation_seconds=segundos,
         observed_rows=filas_observadas,
         observed_bytes=bytes_observados,
         projected_rows_per_day=filas_proyectadas,
         projected_bytes_per_day=bytes_proyectados,
         nominal_rows_per_day=capacidad_filas,
         nominal_bytes_per_day=capacidad_bytes,
         pending=pendiente_desde is not null,
         oldest_pending_at=pendiente_desde,
         updated_at=clock_timestamp()
   where singleton=1;

  raise notice
    'Preflight OK: proyectadas % filas/% bytes por dia; nominal % filas/% bytes por dia',
    filas_proyectadas,bytes_proyectados,capacidad_filas,capacidad_bytes;

  -- El techo teorico de 250 estudios x 9 bloques x 288 ventanas/dia es
  -- 648.000 revisiones/dia: supera deliberadamente esta configuracion y el
  -- preflight la rechazaria. Esta activacion sirve a la carga observada; no
  -- certifica 1.000 usuarios ni autoriza aumentar el lote.
  -- El mismo nombre reemplaza de forma idempotente el trabajo, segun pg_cron.
  execute pg_catalog.format(
    'select cron.schedule(%L,%L,%L)',
    'moderno-history-retention',
    '* * * * *',
    'begin; set local statement_timeout=''30s''; set local lock_timeout=''1s''; select app_private.limpiar_historial_guardado(50); commit;'
  );

  execute $verify_job$
    select count(*)=1
      from cron.job
       where jobname='moderno-history-retention'
         and username=current_user
         and schedule='* * * * *'
         and command='begin; set local statement_timeout=''30s''; set local lock_timeout=''1s''; select app_private.limpiar_historial_guardado(50); commit;'
         and active
  $verify_job$ into activado;
  if not activado then
    raise exception 'El trabajo de retencion no quedo activo';
  end if;
end
$capacity_and_activate$;
reset statement_timeout;
