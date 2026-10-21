import fs from 'node:fs';import {pathToFileURL} from 'node:url';import efficiency from '../app/save-efficiency.js';
export function buildDeltaChecks(){
  const baseline=fs.readFileSync(new URL('./sql/guardado-delta-baseline.sql',import.meta.url),'utf8');
  const candidate=fs.readFileSync(new URL('../SQL/guardado-delta.sql',import.meta.url),'utf8').replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
  let sql=fs.readFileSync(new URL('./sql/guardado-delta-checks.sql',import.meta.url),'utf8').replace('-- BASELINE_HERE',()=>baseline).replace('-- CANDIDATE_HERE',()=>candidate);
  const literal=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
  const cases=[[{}, {'a/b~ñ':null}],[[1,2,3],[1,3]],[[1,2],[2,1]],[[null],[]],[null,{name:'Ficticio'}],[{},JSON.parse('{"__proto__":{"safe":true}}')]];
  for(let i=0;i<100;i++){
    const a=Array.from({length:i%8},(_,j)=>({id:j,name:'Producto ficticio '+j,qty:1,attrs:{color:'azul',note:null}}));const b=structuredClone(a);
    if(i%3===0)b.splice(i%(b.length+1),0,{id:100+i,name:'Alta ficticia'});else if(i%3===1&&b.length)b[0].attrs.color='blanco';else if(b.length)b.splice(0,1);
    cases.push([a,b]);
  }
  const rows=cases.map(([a,b])=>`select pg_temp.assert_true(public.app_aplicar_delta(${literal(a)},${literal(efficiency.delta(a,b))})=${literal(b)},'delta exacto');`).join('\n');
  return sql.replace('-- ROUND_TRIP_HERE',()=>rows);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.stdout.write(buildDeltaChecks());
