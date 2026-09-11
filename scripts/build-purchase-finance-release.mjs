import fs from 'node:fs';
const strip=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
const sql=`begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
lock table public.datos_estudio,public.app_operaciones,public.app_operacion_eventos in share row exclusive mode;
select set_config('moderno.before_data',coalesce((select md5(string_agg(to_jsonb(d)::text,'|' order by estudio_id,bloque)) from public.datos_estudio d),''),true);
select set_config('moderno.before_ops',coalesce((select md5(string_agg(to_jsonb(d)::text,'|' order by id)) from public.app_operaciones d),''),true);
select set_config('moderno.before_events',coalesce((select md5(string_agg(to_jsonb(d)::text,'|' order by id)) from public.app_operacion_eventos d),''),true);
select set_config('moderno.before_files',(select count(*)::text from storage.objects),true);
${strip('SQL/operaciones-producto.sql')}
${strip('SQL/pedidos-economia.sql')}
do $$begin
 if current_setting('moderno.before_data') is distinct from coalesce((select md5(string_agg(to_jsonb(d)::text,'|' order by estudio_id,bloque)) from public.datos_estudio d),'') then raise exception 'Datos modificados';end if;
 if current_setting('moderno.before_ops') is distinct from coalesce((select md5(string_agg(to_jsonb(d)::text,'|' order by id)) from public.app_operaciones d),'') then raise exception 'Pedidos modificados';end if;
 if current_setting('moderno.before_events') is distinct from coalesce((select md5(string_agg(to_jsonb(d)::text,'|' order by id)) from public.app_operacion_eventos d),'') then raise exception 'Historial modificado';end if;
 if current_setting('moderno.before_files') is distinct from (select count(*)::text from storage.objects) then raise exception 'Inventario cambiado; repetir comprobacion';end if;
end$$;
commit;
select true as datos_intactos,true as pedidos_intactos,true as historial_intacto,true as archivos_intactos;
`;
if(!process.argv[2])throw Error('Indica archivo de salida');fs.writeFileSync(process.argv[2],sql);
