// Genera un ensayo SQL; no se conecta a ninguna base de datos ni lo ejecuta.
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const candidate=p=>{
 const sql=read(p);
 if(!/^begin;$/m.test(sql)||!/^commit;\s*$/m.test(sql))throw new Error('Transacción no reconocida: '+p);
 return sql.replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'');
};
let body=read('scripts/sql/colaborador-integracion.sql');
if(!/rollback;\s*$/i.test(body))throw new Error('El ensayo debe terminar en ROLLBACK');
body=body.replace('select * from resultado_prueba;',()=>read('scripts/sql/archivos-integracion.sql')+'\n'+candidate('SQL/permisos-archivos.sql')+"\ninsert into resultado_prueba select 'reinstalar_no_concede_ruta_ajena',not exists(select 1 from public.app_archivos_compartidos where nombre='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_oculto.pdf');\n"+read('scripts/sql/calendario-integracion.sql')+'\nselect count(*) as comprobaciones,bool_and(correcto is true) as todas_correctas,jsonb_agg(nombre) filter(where correcto is distinct from true) as fallos from resultado_prueba;');
const sql='begin;\n'+candidate('SQL/permisos-roles.sql')+'\n'+candidate('SQL/permisos-colaboradores.sql')+'\n'+candidate('SQL/permisos-calendario.sql')+'\n'+candidate('SQL/permisos-archivos.sql')+'\n'+body;
if(process.argv[2])fs.writeFileSync(process.argv[2],sql);else process.stdout.write(sql);
