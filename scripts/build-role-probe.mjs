// Genera un ensayo SQL; no se conecta a ninguna base de datos ni lo ejecuta.
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const candidate=p=>{
 const sql=read(p);
 if(!/^begin;$/m.test(sql)||!/^commit;\s*$/m.test(sql))throw new Error('Transacción no reconocida: '+p);
 return sql.replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'');
};
const body=read('scripts/sql/colaborador-integracion.sql');
if(!/rollback;\s*$/i.test(body))throw new Error('El ensayo debe terminar en ROLLBACK');
const sql='begin;\n'+candidate('SQL/permisos-roles.sql')+'\n'+candidate('SQL/permisos-colaboradores.sql')+'\n'+body;
if(process.argv[2])fs.writeFileSync(process.argv[2],sql);else process.stdout.write(sql);
