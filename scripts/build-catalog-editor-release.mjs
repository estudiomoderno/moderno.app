// SQL Editor has a query-size limit. Keep the template inactive until all chunks
// have been checked. Each chunk is idempotent and refuses a divergent version.
import fs from 'node:fs';
import path from 'node:path';
const out=process.argv[2];if(!out)throw Error('Indica carpeta de salida');fs.mkdirSync(out,{recursive:true});
const data=JSON.parse(fs.readFileSync(new URL('../app/catalog-seeds/es-ES-2026.09.11-1.json',import.meta.url),'utf8'));
const q=s=>"'"+s.replaceAll("'","''")+"'";
const version=q(data.version),locale=q(data.locale);
const ddl=['catalogo-inicial.sql','catalogo-reemplazo.sql'].map(f=>fs.readFileSync(new URL('../SQL/'+f,import.meta.url),'utf8').replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'')).join('\n');
const begin=`begin;set local lock_timeout='5s';set local statement_timeout='60s';
lock table public.datos_estudio in share row exclusive mode;
select set_config('moderno.catalog_before',coalesce((select md5(string_agg(to_jsonb(d)::text,'|' order by estudio_id,bloque)) from public.datos_estudio d),''),true);
select set_config('moderno.catalog_files',(select count(*)::text from storage.objects),true);`;
const end=`do $conservation$begin
if current_setting('moderno.catalog_before') is distinct from coalesce((select md5(string_agg(to_jsonb(d)::text,'|' order by estudio_id,bloque)) from public.datos_estudio d),'') then raise exception 'Los bloques cambiaron';end if;
if current_setting('moderno.catalog_files') is distinct from (select count(*)::text from storage.objects) then raise exception 'Cambió inventario';end if;
end $conservation$;commit;`;
const write=(n,sql)=>fs.writeFileSync(path.join(out,n+'.sql'),sql);
write('00-schema',`${begin}\n${ddl}\n${end}\nselect true as bloques_intactos,true as archivos_intactos;`);
const chunks=[];for(let i=0;i<data.items.length;i+=200)chunks.push(data.items.slice(i,i+200));
for(let n=0,offset=0;n<chunks.length;offset+=chunks[n++].length){
 const items=q(JSON.stringify(chunks[n]));if(items.includes('$payload$'))throw Error('SQL delimiter in data');
 write(String(n+1).padStart(2,'0')+'-items',`${begin}
do $payload$ declare expected jsonb:=${items}::jsonb;actual jsonb;part jsonb;begin
insert into public.app_catalogo_plantillas(version,locale,items) values(${version},${locale},'[]') on conflict(version) do nothing;
select items into actual from public.app_catalogo_plantillas where version=${version} for update;
if jsonb_array_length(actual)=${offset} and not (select activa from public.app_catalogo_plantillas where version=${version}) then
update public.app_catalogo_plantillas set items=items||expected where version=${version};
elsif jsonb_array_length(actual)>=${offset+chunks[n].length} then
select jsonb_agg(value order by ordinality) into part from jsonb_array_elements(actual) with ordinality where ordinality>${offset} and ordinality<=${offset+chunks[n].length};
if part is distinct from expected then raise exception 'Contenido divergente';end if;
else raise exception 'Orden incorrecto o versión activa incompleta';end if;
end $payload$;
${end}
select jsonb_array_length(items) as partidas_cargadas,activa from public.app_catalogo_plantillas where version=${version};`);
}
write('99-activate',`${begin}
do $$begin
if (select jsonb_array_length(items) from public.app_catalogo_plantillas where version=${version}) is distinct from ${data.items.length} then raise exception 'Plantilla incompleta';end if;
end$$;
update public.app_catalogo_plantillas set activa=false where locale=${locale} and activa;
update public.app_catalogo_plantillas set activa=true where version=${version};
${end}
select true as bloques_intactos,true as archivos_intactos,jsonb_array_length(items) as partidas_plantilla,md5(items::text) as contenido_md5 from public.app_catalogo_plantillas where version=${version} and activa;`);
console.log(`${chunks.length+2} pasos SQL generados; ejecutar en orden y comprobar cada resultado.`);
