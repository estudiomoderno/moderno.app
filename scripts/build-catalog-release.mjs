// Builds an additive SQL package; never connects to any database.
import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(new URL('../app/catalog-seeds/es-ES-2026.09.11-1.json',import.meta.url),'utf8'));
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const ddl=['catalogo-inicial.sql','catalogo-reemplazo.sql'].map(f=>fs.readFileSync(new URL('../SQL/'+f,import.meta.url),'utf8').replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'')).join('\n');
const sql=`begin;
set local lock_timeout='5s';set local statement_timeout='60s';
lock table public.datos_estudio in share row exclusive mode;
select set_config('moderno.catalog_before',coalesce((select md5(string_agg(to_jsonb(d)::text,'|' order by estudio_id,bloque)) from public.datos_estudio d),''),true);
select set_config('moderno.catalog_files',(select count(*)::text from storage.objects),true);
${ddl}
do $catalog_payload$ declare esperado jsonb:=${quote(JSON.stringify(data.items))}::jsonb;begin
 insert into public.app_catalogo_plantillas(version,locale,items) values(${quote(data.version)},${quote(data.locale)},esperado) on conflict(version) do nothing;
 if (select items from public.app_catalogo_plantillas where version=${quote(data.version)}) is distinct from esperado then raise exception 'La versión ya existe con contenido diferente';end if;
end $catalog_payload$;
update public.app_catalogo_plantillas set activa=false where locale=${quote(data.locale)} and activa;
update public.app_catalogo_plantillas set activa=true where version=${quote(data.version)};
do $$begin
 if current_setting('moderno.catalog_before') is distinct from coalesce((select md5(string_agg(to_jsonb(d)::text,'|' order by estudio_id,bloque)) from public.datos_estudio d),'') then raise exception 'Los bloques del estudio cambiaron';end if;
 if current_setting('moderno.catalog_files') is distinct from (select count(*)::text from storage.objects) then raise exception 'Cambió el inventario de archivos; repetir comprobación';end if;
end$$;
commit;
select true as bloques_intactos,true as inventario_archivos_intacto,(select jsonb_array_length(items) from public.app_catalogo_plantillas where version=${quote(data.version)}) as partidas_plantilla;
`;
if(!process.argv[2])throw Error('Indica ruta de salida');fs.writeFileSync(process.argv[2],sql);
