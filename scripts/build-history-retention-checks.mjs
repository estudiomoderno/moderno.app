import fs from 'node:fs';

export function buildHistoryRetentionChecks(){
  const fixture=fs.readFileSync(new URL('./sql/historial-retencion-programada-checks.sql',import.meta.url),'utf8');
  const migration=fs.readFileSync(new URL('../SQL/historial-retencion-programada.sql',import.meta.url),'utf8')
    .replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
  if(!fixture.includes('-- CANDIDATE_HERE'))throw Error('Falta el marcador de migracion');
  // Callback replacement keeps SQL `$&`, `$`` and `$'` sequences literal.
  return fixture.replace('-- CANDIDATE_HERE',()=>migration);
}

if(import.meta.url===`file://${process.argv[1]}`)process.stdout.write(buildHistoryRetentionChecks());
