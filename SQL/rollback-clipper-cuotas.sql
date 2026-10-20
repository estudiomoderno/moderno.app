-- Reversión acotada: solo la función de inicio, sin restaurar datos ni archivos.
CREATE OR REPLACE FUNCTION public.clipper_iniciar(p_id uuid, p_estudio uuid, p_url text, p_destino jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare prev public.productos_entrantes; snap jsonb; cuota integer;
begin
 snap:=public.clipper_destino(p_estudio,p_destino);
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,7281));
 select * into prev from public.productos_entrantes where id=p_id;
 if found then
  if prev.actor<>auth.uid() or prev.estudio_id<>p_estudio or prev.url<>p_url or prev.destino<>p_destino then raise exception 'La solicitud no coincide' using errcode='42501';end if;
  return jsonb_build_object('start',false,'id',prev.id,'estado',prev.estado);
 end if;
 select count(*) into cuota from public.productos_entrantes where estudio_id=p_estudio and creado>clock_timestamp()-interval '1 day';
 if cuota>=100 then raise exception 'Límite diario del estudio alcanzado' using errcode='PT429';end if;
 select count(*) into cuota from public.productos_entrantes where estudio_id=p_estudio and actor=auth.uid() and creado>clock_timestamp()-interval '1 hour';
 if cuota>=15 then raise exception 'Espera antes de importar más productos' using errcode='PT429';end if;
 select count(*) into cuota from public.productos_entrantes where estudio_id=p_estudio and estado='procesando' and creado>clock_timestamp()-interval '2 minutes';
 if cuota>=3 then raise exception 'Hay otras capturas en curso; espera un momento' using errcode='PT429';end if;
 insert into public.productos_entrantes(id,estudio_id,actor,url,destino,destino_snapshot) values(p_id,p_estudio,auth.uid(),p_url,p_destino,snap);
 return jsonb_build_object('start',true,'id',p_id,'estado','procesando');
end $function$;
