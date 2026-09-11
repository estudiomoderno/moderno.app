-- Additive v3.36. No accounting document or existing order is rewritten on installation.
begin;
create or replace function public.app_pedido_saldos(c jsonb) returns jsonb
language sql immutable set search_path='' as $$
 with movimientos as (
 select coalesce(sum((x->>'importe')::numeric) filter(where x->>'tipo'='pago'),0) pagado,
 coalesce(sum((x->>'importe')::numeric) filter(where x->>'tipo'='reintegro'),0) reintegrado
 from jsonb_array_elements(coalesce(c->'pagos','[]')) x where coalesce(x->>'anulado','false')<>'true'
 ), abonos as (select coalesce(sum((x->>'importe')::numeric),0) abonado from jsonb_array_elements(coalesce(c->'abonos','[]')) x where coalesce(x->>'anulado','false')<>'true')
 select jsonb_build_object('total',(c#>>'{economia,total}')::numeric,'pagado',pagado,'reintegrado',reintegrado,'abonado',abonado,
 'pendiente',greatest(0,(c#>>'{economia,total}')::numeric-abonado-pagado+reintegrado),
 'a_recuperar',greatest(0,pagado-reintegrado-((c#>>'{economia,total}')::numeric-abonado))) from movimientos,abonos;
$$;
revoke all on function public.app_pedido_saldos(jsonb) from public,anon,authenticated;

-- Read the exact persisted revision; no browser-supplied financial snapshot is trusted.
create or replace function public.app_presupuestos_revision(p_estudio uuid,p_proyecto text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare b jsonb;res jsonb;
begin
 if public.app_rol(p_estudio) is distinct from 'admin' then raise exception 'Solo administradores' using errcode='42501';end if;
 select contenido into b from public.datos_estudio where estudio_id=p_estudio and bloque='presupuestos';
 select coalesce(jsonb_agg(jsonb_build_object('ref',q->>'ref','revision',md5(q::text),'fecha',q->>'date','estado',q->>'status','total',q->'total')),'[]') into res
 from jsonb_array_elements(coalesce(b->'quotes','[]')) q where q->>'projectId'=p_proyecto;
 return res;
end$$;
revoke all on function public.app_presupuestos_revision(uuid,text) from public,anon;
grant execute on function public.app_presupuestos_revision(uuid,text) to authenticated;

create or replace function public.app_pedido_economia(p_estudio uuid,p_proyecto text,p_accion text,p_datos jsonb,p_operacion uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare op public.app_operaciones%rowtype;ev public.app_operacion_eventos%rowtype;c jsonb;s jsonb;l jsonb;ls jsonb:='[]';e jsonb;f jsonb;res jsonb;movs jsonb;
 importe numeric;base numeric:=0;iva numeric:=0;tasa numeric;transporte numeric;retencion numeric;total numeric;cantidad numeric;devuelto numeric;k integer:=0;n integer;nota text;
begin
 if public.app_rol(p_estudio) is distinct from 'admin' then raise exception 'Solo administradores' using errcode='42501';end if;
 if p_operacion is null or jsonb_typeof(p_datos) is distinct from 'object' then raise exception 'Operacion no valida';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
 select * into ev from public.app_operacion_eventos where id=p_operacion;
 if found then
  if ev.estudio_id<>p_estudio or ev.proyecto_id<>p_proyecto or ev.accion<>p_accion or ev.entrada<>p_datos or ev.canal<>'equipo' then raise exception 'Intento repetido con otros datos';end if;
  return ev.salida;
 end if;
 select * into op from public.app_operaciones where estudio_id=p_estudio and proyecto_id=p_proyecto and id=(p_datos->>'id')::uuid for update;
 if op.id is null or op.tipo<>'pedido' or op.version is distinct from (p_datos->>'version')::integer then raise exception 'Pedido modificado; actualiza' using errcode='PT409';end if;
 if op.estado='cancelada' then raise exception 'Pedido cancelado';end if;
 c:=op.contenido;nota:=trim(coalesce(p_datos->>'nota',''));
 if length(nota)<5 or length(nota)>2000 then raise exception 'Indica un detalle de entre 5 y 2000 caracteres para el historial';end if;
 if p_accion in ('fecha_entrega','incidencia','resolver_incidencia') then
  if op.estado not in ('confirmado','parcial','recibido') then raise exception 'Confirma primero el pedido';end if;
  if p_accion='fecha_entrega' then
   if coalesce(p_datos->>'fecha','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Indica una fecha de entrega valida';end if;
   perform (p_datos->>'fecha')::date;
   c:=jsonb_set(c,'{fecha_entrega}',p_datos->'fecha');
  elsif p_accion='incidencia' then
   if coalesce(p_datos->>'categoria','') not in ('retraso','dano','faltante','otra') then raise exception 'Selecciona el tipo de incidencia';end if;
   c:=jsonb_set(c,'{incidencias}',coalesce(c->'incidencias','[]')||jsonb_build_array(jsonb_build_object('id',p_operacion,'categoria',p_datos->>'categoria','nota',nota,'estado','abierta','creada',clock_timestamp(),'actor',auth.uid())));
  else
   n:=0;movs:='[]';for e in select value from jsonb_array_elements(coalesce(c->'incidencias','[]')) loop
    if e->>'id'=p_datos->>'incidencia' and e->>'estado'='abierta' then e:=e||jsonb_build_object('estado','resuelta','solucion',nota,'resuelta',clock_timestamp(),'resuelta_por',auth.uid());n:=n+1;end if;
    movs:=movs||jsonb_build_array(e);
   end loop;
   if n<>1 then raise exception 'Incidencia abierta no disponible';end if;
   c:=jsonb_set(c,'{incidencias}',movs);
  end if;
 elsif p_accion='copiar_presupuesto' then
  select contenido into f from public.datos_estudio where estudio_id=p_estudio and bloque='presupuestos' for share;
  select count(*),jsonb_agg(q)->0 into n,e from jsonb_array_elements(coalesce(f->'quotes','[]')) q where q->>'ref'=p_datos->>'referencia';
  if n<>1 or e->>'projectId' is distinct from p_proyecto then raise exception 'Presupuesto ausente, ambiguo o de otro proyecto';end if;
  if md5(e::text) is distinct from p_datos->>'revision' then raise exception 'El presupuesto ha cambiado; vuelve a seleccionarlo' using errcode='PT409';end if;
  if exists(select 1 from jsonb_array_elements(coalesce(c->'presupuestos','[]')) x where x->>'revision'=md5(e::text) and x->>'referencia'=e->>'ref') then raise exception 'Esta revision ya tiene una copia en el pedido';end if;
  -- Full persisted document, including legacy fields. This ledger is admin-only.
  s:=e;
  c:=jsonb_set(c,'{presupuestos}',coalesce(c->'presupuestos','[]')||jsonb_build_array(jsonb_build_object('id',p_operacion,'referencia',e->>'ref','revision',md5(e::text),'capturada',clock_timestamp(),'actor',auth.uid(),'nota',nota,'snapshot',s)));
 elsif p_accion='condiciones' then
  if c ? 'economia' and op.estado<>'borrador' then raise exception 'El importe confirmado no se reescribe; registra un abono';end if;
  if jsonb_array_length(coalesce(c->'pagos','[]'))>0 or jsonb_array_length(coalesce(c->'abonos','[]'))>0 then raise exception 'El pedido ya tiene movimientos';end if;
  if jsonb_typeof(p_datos->'tipos') is distinct from 'array' or jsonb_array_length(p_datos->'tipos')<>jsonb_array_length(c->'lineas') then raise exception 'Indica el impuesto de cada linea, incluido cero si corresponde';end if;
  for l in select value from jsonb_array_elements(c->'lineas') loop
   tasa:=(p_datos->'tipos'->>k)::numeric;
   if tasa is null or tasa<0 or tasa>100 or tasa::text in ('NaN','Infinity','-Infinity') then raise exception 'Tipo de impuesto no valido';end if;
   importe:=round((l->>'precio')::numeric*(l->>'qty')::numeric,2);
   base:=base+importe;iva:=iva+round(importe*tasa/100,2);
   ls:=ls||jsonb_build_array(jsonb_build_object('base',importe,'tipo',tasa,'impuesto',round(importe*tasa/100,2)));k:=k+1;
  end loop;
  transporte:=(p_datos->>'transporte')::numeric;tasa:=(p_datos->>'tipo_transporte')::numeric;retencion:=(p_datos->>'retencion')::numeric;
  if transporte is null or transporte<0 or transporte>100000000 or transporte<>round(transporte,2) or tasa is null or tasa<0 or tasa>100 or retencion is null or retencion<0 or retencion>100
    or transporte::text in ('NaN','Infinity','-Infinity') or tasa::text in ('NaN','Infinity','-Infinity') or retencion::text in ('NaN','Infinity','-Infinity') then raise exception 'Revisa transporte, impuestos y retencion';end if;
  base:=base+transporte;iva:=iva+round(transporte*tasa/100,2);importe:=round(base*retencion/100,2);total:=base+iva-importe;
  c:=c||jsonb_build_object('economia',jsonb_build_object('moneda','EUR','lineas',ls,'base',base,'impuestos',iva,'transporte',transporte,'tipo_transporte',tasa,'tipo_retencion',retencion,'retencion',importe,'total',total,'fecha',clock_timestamp()));
 elsif p_accion in ('pago','reintegro','anular_pago','anular_abono','abono','devolver','vincular_factura','desvincular_factura') then
  if op.estado not in ('confirmado','parcial','recibido') then raise exception 'Confirma primero el pedido';end if;
  if not c ? 'economia' then raise exception 'Completa los importes e impuestos del pedido';end if;
  s:=public.app_pedido_saldos(c);
  if p_accion in ('pago','reintegro','abono') then
   importe:=(p_datos->>'importe')::numeric;
   if importe is null or importe<=0 or importe<>round(importe,2) or importe>100000000000000 or importe::text in ('NaN','Infinity','-Infinity') then raise exception 'Importe positivo con un maximo de dos decimales';end if;
   if coalesce(p_datos->>'fecha','') !~ '^\d{4}-\d{2}-\d{2}$' or (p_datos->>'fecha')::date>current_date then raise exception 'Indica la fecha real, no futura';end if;
   if p_accion='pago' and importe>(s->>'pendiente')::numeric then raise exception 'El pago supera lo pendiente';end if;
   if p_accion='reintegro' and importe>(s->>'a_recuperar')::numeric then raise exception 'El reintegro supera el saldo a recuperar';end if;
   if p_accion='abono' and importe>(s->>'total')::numeric-(s->>'abonado')::numeric then raise exception 'El abono supera el importe del pedido';end if;
   e:=jsonb_build_object('id',p_operacion,'tipo',p_accion,'importe',importe,'fecha',p_datos->>'fecha','nota',nota,'actor',auth.uid());
   if p_accion='abono' then c:=jsonb_set(c,'{abonos}',coalesce(c->'abonos','[]')||jsonb_build_array(e));
   else c:=jsonb_set(c,'{pagos}',coalesce(c->'pagos','[]')||jsonb_build_array(e));end if;
  elsif p_accion in ('anular_pago','anular_abono') then
   n:=0;movs:='[]';
   for e in select value from jsonb_array_elements(coalesce(c->(case when p_accion='anular_pago' then 'pagos' else 'abonos' end),'[]')) loop
    if e->>'id'=p_datos->>'movimiento' and coalesce(e->>'anulado','false')<>'true' then e:=e||jsonb_build_object('anulado',true,'motivo_anulacion',nota);n:=n+1;end if;movs:=movs||jsonb_build_array(e);
   end loop;
   if n<>1 then raise exception 'Movimiento no disponible';end if;
   c:=jsonb_set(c,array[case when p_accion='anular_pago' then 'pagos' else 'abonos' end],movs);s:=public.app_pedido_saldos(c);
   if (s->>'reintegrado')::numeric>(s->>'pagado')::numeric then raise exception 'Revisa primero los reintegros asociados';end if;
  elsif p_accion='devolver' then
   if jsonb_typeof(p_datos->'cantidades') is distinct from 'array' or jsonb_array_length(p_datos->'cantidades')<>jsonb_array_length(c->'lineas') then raise exception 'Completa las cantidades';end if;
   total:=0;
   for l in select value from jsonb_array_elements(c->'lineas') loop
    cantidad:=(p_datos->'cantidades'->>k)::numeric;devuelto:=coalesce((l->>'devuelto')::numeric,0);
    if cantidad is null or cantidad<0 or cantidad::text in ('NaN','Infinity','-Infinity') or cantidad>coalesce((l->>'recibido')::numeric,0)-devuelto-coalesce((l->>'instalado')::numeric,0) then raise exception 'La devolucion supera lo recibido disponible; registra primero la retirada de lo instalado';end if;
    total:=total+cantidad;ls:=ls||jsonb_build_array(l||jsonb_build_object('devuelto',devuelto+cantidad));k:=k+1;
   end loop;
   if total<=0 then raise exception 'Indica unidades devueltas';end if;
   c:=jsonb_set(c,'{lineas}',ls);op.estado:='parcial';
  elsif p_accion='vincular_factura' then
   select contenido into f from public.datos_estudio where estudio_id=p_estudio and bloque='facturas' for share;
   select count(*),jsonb_agg(x)->0 into n,e from jsonb_array_elements(coalesce(f->'entries','[]')) x where x->'id'=p_datos->'asiento' and x->>'kind'='out' and not coalesce(f->'del','{}') ? (x->>'id');
   if n<>1 or (e->>'pid' is not null and e->>'pid'<>p_proyecto) then raise exception 'Selecciona un gasto existente del mismo proyecto o sin proyecto';end if;
   if exists(select 1 from jsonb_array_elements(coalesce(c->'facturas','[]')) x where x->'asiento'=p_datos->'asiento' and coalesce(x->>'retirado','false')<>'true') then raise exception 'La factura ya esta vinculada';end if;
   c:=jsonb_set(c,'{facturas}',coalesce(c->'facturas','[]')||jsonb_build_array(jsonb_build_object('id',p_operacion,'asiento',e->'id','referencia',e->>'concept','proveedor',e->>'sup','fecha',e->>'date','importe',e->'amount','nota',nota)));
  else
   n:=0;movs:='[]';for e in select value from jsonb_array_elements(coalesce(c->'facturas','[]')) loop
    if e->>'id'=p_datos->>'vinculo' and coalesce(e->>'retirado','false')<>'true' then e:=e||jsonb_build_object('retirado',true,'motivo',nota);n:=n+1;end if;movs:=movs||jsonb_build_array(e);
   end loop;if n<>1 then raise exception 'Vinculo no disponible';end if;c:=jsonb_set(c,'{facturas}',movs);
  end if;
 else raise exception 'Accion desconocida';end if;
 if c ? 'economia' then c:=c||jsonb_build_object('saldos',public.app_pedido_saldos(c));end if;
 update public.app_operaciones set contenido=c,estado=op.estado,version=version+1 where id=op.id;
 select to_jsonb(x) into res from public.app_operaciones x where x.id=op.id;
 insert into public.app_operacion_eventos(id,estudio_id,proyecto_id,accion,entrada,salida,actor,canal) values(p_operacion,p_estudio,p_proyecto,p_accion,p_datos,res,auth.uid(),'equipo');
 return res;
end$$;
revoke all on function public.app_pedido_economia(uuid,text,text,jsonb,uuid) from public,anon;
grant execute on function public.app_pedido_economia(uuid,text,text,jsonb,uuid) to authenticated;
commit;
