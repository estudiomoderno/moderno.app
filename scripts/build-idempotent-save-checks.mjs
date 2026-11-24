import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

function withoutTransaction(sql){
  return sql.replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
}

export function buildIdempotentSaveChecks(){
  const baseline=fs.readFileSync(new URL('./sql/guardado-delta-baseline.sql',import.meta.url),'utf8');
  const delta=withoutTransaction(fs.readFileSync(new URL('../SQL/guardado-delta.sql',import.meta.url),'utf8'));
  const candidate=withoutTransaction(fs.readFileSync(new URL('../SQL/guardado-idempotente-v2.sql',import.meta.url),'utf8'));
  return fs.readFileSync(new URL('./sql/guardado-idempotente-v2-checks.sql',import.meta.url),'utf8')
    .replace('-- BASELINE_HERE',()=>baseline)
    .replace('-- DELTA_HERE',()=>delta)
    .replace('-- CANDIDATE_HERE',()=>candidate);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  process.stdout.write(buildIdempotentSaveChecks());
}
