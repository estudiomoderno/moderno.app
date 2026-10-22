import fs from 'node:fs';import {pathToFileURL} from 'node:url';import {buildDeltaChecks} from './build-delta-checks.mjs';
export function buildCollaboratorChecks({persist=false}={}){
 let sql=buildDeltaChecks().replace('"sections":[{"items":', '"sections":[{"id":"section-original","name":"General","items":');
 const candidate=fs.readFileSync(new URL('../SQL/guardado-colaborador-listas.sql',import.meta.url),'utf8').replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
 const reproduction=`
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',true);
set local role authenticated;
do $$declare e uuid:='00000000-0000-0000-0000-000000000001';r record;v jsonb;blocked boolean:=false;
begin
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 v:=jsonb_set(r.contenido,'{0,rooms,0,sections,0,items,0}',(r.contenido#>'{0,rooms,0,sections,0,items,0}')||'{"cost":null,"margin":null,"addedAt":"2026-10-22T09:00:00Z"}');
 begin perform public.app_guardar_lote(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','contenido',v,'base',r.updated_at)));exception when insufficient_privilege then blocked:=sqlerrm='El cambio contiene campos no autorizados';end;
 perform pg_temp.assert_true(blocked,'reproduces legacy shopping form permission failure');
end$$;
reset role;
`;
 sql=sql.replace("select pg_temp.assert_true(not has_function_privilege",()=>reproduction+candidate+"\nselect pg_temp.assert_true(not has_function_privilege");
 const extra=fs.readFileSync(new URL('./sql/collaborator-shopping-checks.sql',import.meta.url),'utf8');
 sql=sql.replace('select count(*) as delta_checks_passed from assertions;',()=>extra+'\nselect count(*) as collaborator_checks_passed from assertions;');
 if(persist)sql=sql.replace(/rollback;\s*$/,'commit;');
 return sql;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.stdout.write(buildCollaboratorChecks({persist:process.argv.includes('--persist-fixture')}));
