import fs from 'node:fs';import {pathToFileURL} from 'node:url';import {buildPerformanceChecks} from './build-collaborator-performance-checks.mjs';
export function buildProductDeleteChecks({persist=false}={}){
 const base=buildPerformanceChecks();
 const candidate=fs.readFileSync(new URL('../SQL/borrado-productos-colaborador.sql',import.meta.url),'utf8').replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
 const checks=fs.readFileSync(new URL('./sql/product-delete-checks.sql',import.meta.url),'utf8');
 const result=base.replace('select count(*) as optimized_collaborator_checks_passed from assertions;',()=>candidate+checks+'\nselect count(*) as product_delete_checks_passed from assertions;');
 return persist?result.replace(/rollback;\s*$/,'commit;'):result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.stdout.write(buildProductDeleteChecks({persist:process.argv.includes('--persist-fixture')}));
