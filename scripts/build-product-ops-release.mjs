// Build an atomic, additive SQL release with conservation checks. Does not execute SQL.
import fs from 'node:fs';
const sql=fs.readFileSync(new URL('../SQL/operaciones-producto.sql',import.meta.url),'utf8').replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
const before=`begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
lock table public.datos_estudio in share row exclusive mode;
select set_config('moderno.ops_before',coalesce((select md5(string_agg(to_jsonb(d)::text,'|' order by estudio_id,bloque)) from public.datos_estudio d),''),true);
select set_config('moderno.files_before',(select count(*)::text from storage.objects),true);
`;
const after=`
do $$begin
 if current_setting('moderno.ops_before') is distinct from coalesce((select md5(string_agg(to_jsonb(d)::text,'|' order by estudio_id,bloque)) from public.datos_estudio d),'') then raise exception 'Conservacion de bloques no demostrada';end if;
 if current_setting('moderno.files_before') is distinct from (select count(*)::text from storage.objects) then raise exception 'El inventario de archivos ha cambiado durante la comprobacion; repetir sin sobrescribir';end if;
end$$;
commit;
select true as bloques_intactos,true as inventario_archivos_intacto,
 (select bool_and(relrowsecurity) from pg_class where oid in ('public.app_operaciones'::regclass,'public.app_operacion_eventos'::regclass)) as rls_activo;
`;
if(!process.argv[2])throw Error('Indica ruta de salida');fs.writeFileSync(process.argv[2],before+sql+after);
