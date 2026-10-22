import fs from 'node:fs';import {pathToFileURL} from 'node:url';import {buildCollaboratorChecks} from './build-collaborator-checks.mjs';
export function buildPerformanceChecks({persist=false}={}){
 let sql=buildCollaboratorChecks({persist});
 const baseline=fs.readFileSync(new URL('./sql/guardado-delta-baseline.sql',import.meta.url),'utf8');
 const reference=baseline.slice(baseline.indexOf('CREATE OR REPLACE FUNCTION public.app_colaborador_combinar('),baseline.indexOf('CREATE OR REPLACE FUNCTION public.app_leer_bloques(')).replaceAll('public.app_colaborador_combinar','public.app_colaborador_combinar_reference');
 const candidate=fs.readFileSync(new URL('../SQL/optimizar-combinacion-colaboradores.sql',import.meta.url),'utf8').replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
 sql=sql.replace("select pg_temp.assert_true(not has_function_privilege('anon','public.app_leer_versiones",()=>reference+"\nrevoke all on function public.app_colaborador_combinar_reference(jsonb,jsonb) from public,anon,authenticated;\n"+candidate+"\nselect pg_temp.assert_true(not has_function_privilege('anon','public.app_leer_versiones");
 const check=`
create function pg_temp.outcome(old jsonb,fresh jsonb,reference boolean) returns jsonb language plpgsql as $$
declare result jsonb;begin
 if reference then result:=public.app_colaborador_combinar_reference(old,fresh);else result:=public.app_colaborador_combinar(old,fresh);end if;
 return jsonb_build_object('ok',true,'sql_null',result is null,'value',result);
 exception when others then return jsonb_build_object('ok',false,'state',sqlstate,'message',sqlerrm);
end$$;
`;
 const values=[null,0,1,1.5,'1','id','name',true,false,[],['id'],['name'],{id:null,name:'Mesa',price:20,qty:1,cost:7,margin:15},{name:'Mesa',cost:7,qty:1,price:20},{name:'Mesa',cost:7},{id:1,name:'Mesa',cost:7},{id:'1',name:'Mesa',cost:9},{id:1,name:'Mesa',docRef:'Q-ficticio',docKind:'presupuesto'},{name:'Doc ficticio',docKind:'factura'},{id:1,name:'Documento',docRef:'Q-2'},{id:{a:1,b:[2]},name:'Objeto',cost:7}];
 const cases=[];
 for(const a of values)for(const b of values)cases.push([a,b]);
 for(let i=0;i<400;i++){
  const a=Array.from({length:i%12},(_,j)=>structuredClone(values[(i*7+j*3)%values.length]));let b=structuredClone(a);
  if(i%4===0)b.reverse();else if(i%4===1)b.push({id:i,name:'Alta',price:20,qty:1});else if(i%4===2)b.splice(0,1);else b=b.map(x=>x&&typeof x==='object'&&!Array.isArray(x)?{...x,name:'Editada'}:x);
  cases.push([a,b]);cases.push([{id:1,name:'Proyecto',rooms:[{id:2,name:'Lista',sections:[{name:'General',items:a}]}]},{id:1,name:'Proyecto',rooms:[{id:2,name:'Lista',sections:[{name:'General',items:b}]}]}]);
 }
 const literal=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
 const comparisons=cases.map(([a,b],i)=>`select pg_temp.assert_true(pg_temp.outcome(${literal(a)},${literal(b)},true)=pg_temp.outcome(${literal(a)},${literal(b)},false),'same value or exception ${i}');`).join('\n');
 const edge=`
select pg_temp.assert_true(pg_temp.outcome('{"id":1,"cost":7}',null,true)=pg_temp.outcome('{"id":1,"cost":7}',null,false),'SQL null object contract');
select pg_temp.assert_true(pg_temp.outcome('[{"id":1,"cost":7}]',null,true)=pg_temp.outcome('[{"id":1,"cost":7}]',null,false),'SQL null array contract');
select pg_temp.assert_true(pg_temp.outcome('[{"id":1,"name":"A","cost":7},{"id":2,"name":"B"}]','[{"id":1.0,"name":"A"},{"id":2.0,"name":"B"}]',true)=pg_temp.outcome('[{"id":1,"name":"A","cost":7},{"id":2,"name":"B"}]','[{"id":1.0,"name":"A"},{"id":2.0,"name":"B"}]',false),'numeric IDs with equal scale');
select pg_temp.assert_true(not has_function_privilege('authenticated','public.app_colaborador_indice(jsonb,text,boolean)','execute') and not has_function_privilege('anon','public.app_colaborador_indice(jsonb,text,boolean)','execute'),'index helper internal only');
`;
 const performance=fs.readFileSync(new URL('./sql/collaborator-performance-checks.sql',import.meta.url),'utf8');
 return sql.replace('select count(*) as collaborator_checks_passed from assertions;',()=>check+comparisons+edge+performance+'\nselect count(*) as optimized_collaborator_checks_passed from assertions;');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.stdout.write(buildPerformanceChecks({persist:process.argv.includes('--persist-fixture')}));
