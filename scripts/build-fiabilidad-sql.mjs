import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export function buildSQL({candidate=readFileSync(new URL('../SQL/optimizar-recorridos-guardado.sql',import.meta.url),'utf8'),fixture=readFileSync(new URL('./sql/fiabilidad-recorridos.sql',import.meta.url),'utf8')}={}){
 const marker='-- INSTALL_CANDIDATE_HERE';
 if(fixture.split(marker).length!==2)throw Error('Expected one isolated candidate placeholder');
 let testCandidate=candidate.replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'').replaceAll('public.','audit_fiabilidad.').replaceAll("'public'::regnamespace","'audit_fiabilidad'::regnamespace");
 for(const name of ['app_ruta_storage','app_rutas_storage','app_rutas_documentos_privados']){
  const start=fixture.indexOf('CREATE OR REPLACE FUNCTION audit_fiabilidad.'+name+'('),end=fixture.indexOf('$function$',fixture.indexOf('AS $function$',start)+13);
  if(start<0||end<0)throw Error('Missing reference function '+name);
  const body=fixture.slice(fixture.indexOf('AS $function$',start)+13,end).replaceAll('\r','');
  const md5=value=>createHash('md5').update(value).digest('hex');
  const original=md5(body.replaceAll('audit_fiabilidad.','public.'));
  if(!testCandidate.includes(original))throw Error('Reference function or candidate source guard changed: '+name);
  testCandidate=testCandidate.replaceAll(original,md5(body));
 }
 if(testCandidate.includes('FUNCTION public.')||testCandidate.includes('function public.'))throw Error('Unscoped candidate');
 return fixture.replace(marker,testCandidate);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.stdout.write(buildSQL());
