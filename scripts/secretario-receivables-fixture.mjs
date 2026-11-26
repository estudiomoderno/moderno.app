import {fileURLToPath} from 'node:url';
import {createSecretaryHandler} from '../supabase/functions/secretario/handler.mjs';
import {TEST_PROJECT_REF, SECRETARY_MODEL} from '../supabase/functions/secretario/core.mjs';

export const studyId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const stamp = '2026-11-22T09:00:00Z';
export const projects = [
  {id:9001,name:'Proyecto ficticio',num:'PR-0901',brand:'cm'},
  {id:9002,name:'Reforma Lino',num:'PR-0902',brand:'cm'},
  {id:9003,name:'Proyecto vacío',num:'PR-0903',brand:'cm'}
];

export function invoiceFixture({extra = 0} = {}) {
  const examples = [
    ['Espacio Olivo', 480, '2025-10-10', 'pend', [], 'env'],
    ['Casa Lino', 750, '2030-01-15', 'pend', [], 'env'],
    ['Estudio Arena', 1250, '2030-01-20', 'env', [{amount:800}], 'env'],
    ['Casa Cobro Completo', 980, '2025-10-10', 'cobr', [{amount:980}], 'pag'],
    ['Estudio Factura Anulada', 650, '2025-10-10', 'pend', [], 'anulada'],
    ['Casa Factura Borrador', 530, '2030-02-10', 'pend', [], 'borrador'],
    ...Array.from({length:extra}, (_, index) => ['Cliente adicional '+(index+1), 100, '2030-02-01', 'pend', [], 'env'])
  ];
  const clients = examples.map(([name])=>({name,fiscal:name,type:'Cliente',brand:'cm'}));
  clients.push({name:'Cliente sin facturas',type:'Cliente',brand:'cm'});
  const invoices = [], entries = [];
  for (const [index, [client,total,due,entryStatus,collections,docStatus]] of examples.entries()) {
    const ref = 'FC-'+String(index+1).padStart(4,'0');
    const date = ['2025-10-01','2026-02-15','2026-03-01'][index]??'2025-10-01';
    const brand = 'cm', projectId = index===1?9002:9001;
    invoices.push({ref,brand,projectId,client,clientIdx:index,status:docStatus,total,date,due,
      iva:{on:false,pct:21},irpf:{on:false,pct:0},disc:{on:false,pct:10},
      lines:[{name:'Servicios de interiorismo',qty:1,price:total,unit:'ud'}]});
    entries.push({id:100+index,link:ref,brand,pid:projectId,kind:'in',concept:`Factura ${ref} · ${client}`,
      amount:total,base:total,cobros:collections,status:entryStatus,date:date.split('-').reverse().join('/'),due:due.split('-').reverse().join('/')});
  }
  return {clients,invoices,entries};
}

export async function fixtureRequest(input,{origin='http://127.0.0.1:3000',role='admin',extra=0,version=stamp,blocks}={}){
  const values={
    ...fixtureBlocks({extra}),...blocks
  };
  const calls=[];
  const client={async rpc(name,args){
    calls.push({name,args});
    if(args.p_estudio!==studyId)return {data:null,error:{code:'forbidden'}};
    if(name==='app_rol')return {data:role};
    if(name==='app_leer_bloques'||name==='app_leer_versiones'){
      return {data:args.p_bloques.map(bloque=>({bloque,rol:role,updated_at:version,...(name==='app_leer_bloques'?{contenido:values[bloque]}:{})}))};
    }
    throw Error('Unexpected provider quota or database write: '+name);
  }};
  const handler=createSecretaryHandler({
    env:{SECRETARY_ENABLED:'true',SECRETARY_ENVIRONMENT:'test',SECRETARY_ALLOWED_PROJECT_REF:TEST_PROJECT_REF,SECRETARY_ALLOWED_ORIGINS:origin,
      SUPABASE_URL:'https://'+TEST_PROJECT_REF+'.supabase.co',SUPABASE_ANON_KEY:'fixture-publishable',OPENAI_API_KEY:'fixture-unused',OPENAI_MODEL:SECRETARY_MODEL},
    authenticate:async token=>token==='fictional-token-no-credentials'?{client,userId:actorId}:null,
    planner:async()=>{throw Error('The fixture must never call the planner');}
  });
  const response=await handler(new Request('https://'+TEST_PROJECT_REF+'.supabase.co/functions/v1/secretario',{
    method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
    body:JSON.stringify({session:'fictional-token-no-credentials',payload:input})
  }));
  return {status:response.status,body:await response.json(),calls};
}

export function fixtureBlocks(options){
  const {clients,invoices,entries}=invoiceFixture(options);
  return {config:{account:{currency:'EUR'},series:{fc:'FC'}},contactos:clients,proyectos:projects,
    presupuestos:{quotes:[],drafts:[]},facturas:{invoices,entries}};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  process.stdin.setEncoding('utf8');
  let raw='';
  for await(const part of process.stdin)raw+=part;
  if(!raw.trim())process.stdout.write(JSON.stringify(invoiceFixture()));
  else {const {input,options}=JSON.parse(raw);process.stdout.write(JSON.stringify(await fixtureRequest(input,options)));}
}
