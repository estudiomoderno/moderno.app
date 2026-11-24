-- First deploy the previous HTML and drain guardado v2. Old tabs automatically
-- fall back only when an RPC is absent. This rollback fails closed: removing
-- the delta interpreter while v2 still accepts work would leave its public RPC
-- installed but unable to complete a new request.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $guard$
declare
  marca_helper text;
  marca_writer text;
  v2_activo boolean:=false;
  v2_rpc_existe boolean:=false;
begin
  if to_regprocedure('public.app_aplicar_delta(jsonb,jsonb)') is null
     or to_regprocedure('public.app_leer_versiones(uuid,text[])') is null
     or to_regprocedure('public.app_guardar_lote_delta(uuid,jsonb)') is null then
    raise exception 'El contrato delta no esta completo; rollback cancelado';
  end if;

  marca_helper:=obj_description(
    'public.app_aplicar_delta(jsonb,jsonb)'::regprocedure,'pg_proc'
  );
  marca_writer:=obj_description(
    'public.app_guardar_lote_delta(uuid,jsonb)'::regprocedure,'pg_proc'
  );
  if marca_helper is distinct from 'moderno.app_aplicar_delta/array-sync-v2'
     and marca_helper is distinct from 'moderno.app_aplicar_delta/legacy-budget-v2' then
    raise exception 'La version de app_aplicar_delta no esta verificada; rollback cancelado';
  end if;
  if marca_writer is distinct from 'moderno.app_guardar_lote_delta/envelope-budget-v2' then
    raise exception 'La version de app_guardar_lote_delta no esta verificada; rollback cancelado';
  end if;

  v2_rpc_existe:=to_regprocedure('public.app_guardar_lote_v2(uuid,jsonb)') is not null;
  if to_regclass('app_private.save_protocol_settings') is null then
    if v2_rpc_existe then
      raise exception 'No se puede demostrar que guardado v2 este drenado; rollback cancelado';
    end if;
  else
    -- Serializa esta comprobacion con cualquier activacion/desactivacion del
    -- protocolo hasta que termine el DROP atomico de los tres RPC delta.
    execute 'lock table app_private.save_protocol_settings in share row exclusive mode';
    execute 'select coalesce((select accept_new from app_private.save_protocol_settings where protocol=2),false)'
      into v2_activo;
    if v2_activo then
      raise exception 'Desactivar primero las solicitudes nuevas de guardado v2; rollback cancelado';
    end if;
  end if;
  if v2_rpc_existe then
    if to_regclass('app_private.save_requests') is null then
      raise exception 'No se puede drenar guardado v2 sin su libro de recibos; rollback cancelado';
    end if;
    -- Cada writer v2 lee este libro antes de usar los helpers delta. Esperar
    -- aqui drena los que ya estaban en vuelo y bloquea los nuevos hasta que el
    -- DROP atomico termine; despues veran accept_new=false.
    execute 'lock table app_private.save_requests in access exclusive mode';
  end if;
end
$guard$;

drop function public.app_guardar_lote_delta(uuid,jsonb);
drop function public.app_leer_versiones(uuid,text[]);
drop function public.app_aplicar_delta(jsonb,jsonb);
notify pgrst,'reload schema';
commit;
