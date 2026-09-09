// Genera el paquete coordinado. No conecta ni ejecuta SQL.
import fs from 'node:fs';
const files=['guardar-bloque-versionado','portales-filtrados','permisos-roles','permisos-colaboradores','permisos-calendario','permisos-archivos'];
const parts=files.map(name=>{
 const sql=fs.readFileSync(new URL('../SQL/'+name+'.sql',import.meta.url),'utf8');
 if(!/^begin;$/mi.test(sql)||!/^commit;\s*$/mi.test(sql))throw Error('Transacción no reconocida: '+name);
 return '-- '+name+'\n'+sql.replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
});
const result='-- Aplicar solo en la ventana coordinada y con copia comprobada.\nbegin;\n'+parts.join('\n')+'\ncommit;\n';
if(process.argv[2])fs.writeFileSync(process.argv[2],result);else process.stdout.write(result);
