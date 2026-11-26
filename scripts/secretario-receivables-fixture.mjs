import {fileURLToPath} from 'node:url';
import {createSecretaryHandler} from '../supabase/functions/secretario/handler.mjs';
import {TEST_PROJECT_REF, SECRETARY_MODEL} from '../supabase/functions/secretario/core.mjs';

export const studyId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const stamp = '2026-11-22T09:00:00Z';
export const acceptanceNow = '2026-11-26T12:00:00Z';
export const projects = [
  {id:9001,name:'Proyecto ficticio',num:'PR-0901',brand:'cm'},
  {id:9002,name:'Reforma Lino',num:'PR-0902',brand:'cm'},
  {id:9003,name:'Proyecto vacío',num:'PR-0903',brand:'cm'}
];

export function invoiceFixture({extra = 0, acceptance = false} = {}) {
  const examples = acceptance ? [
    ['Cliente A',1000,'2026-11-12','pend',[],'env'],
    ['Cliente B',1200,'2026-12-15','env',[{amount:700}],'env'],
    ['Cliente C',800,'2025-11-01','pend',[],'env'],
    ['Cliente cobrado',900,'2026-10-15','cobr',[{amount:900}],'pag'],
    ['Cliente factura anulada',650,'2026-10-15','pend',[],'anulada'],
    ['Cliente factura borrador',530,'2026-12-20','pend',[],'borrador']
  ] : [
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
  if(acceptance)clients.push({name:'Casa Sol',type:'Cliente',brand:'cm'});
  const invoices = [], entries = [];
  for (const [index, [client,total,due,entryStatus,collections,docStatus]] of examples.entries()) {
    const ref = acceptance?'F-DEMO-'+String(index+1).padStart(3,'0'):'FC-'+String(index+1).padStart(4,'0');
    const date = acceptance?(['2026-10-13','2026-11-15','2025-10-02'][index]??'2026-09-15'):
      (['2025-10-01','2026-02-15','2026-03-01'][index]??'2025-10-01');
    const brand = 'cm', projectId = index===1?9002:9001;
    invoices.push({ref,brand,projectId,client,clientIdx:index,status:docStatus,total,date,due,
      iva:{on:false,pct:21},irpf:{on:false,pct:0},disc:{on:false,pct:10},
      lines:[{name:'Servicios de interiorismo',qty:1,price:total,unit:'ud'}]});
    entries.push({id:100+index,link:ref,brand,pid:projectId,kind:'in',concept:`Factura ${ref} · ${client}`,
      amount:total,base:total,cobros:collections,status:entryStatus,date:date.split('-').reverse().join('/'),due:due.split('-').reverse().join('/')});
  }
  return {clients,invoices,entries};
}

export async function fixtureRequest(input,{origin='http://127.0.0.1:3000',role='admin',extra=0,version=stamp,blocks,acceptance=false,now=acceptanceNow,failRead,pendingPlan=false}={}){
  const values={
    ...fixtureBlocks({extra,acceptance}),...blocks
  };
  const calls=[];
  const client={async rpc(name,args){
    calls.push({name,args});
    if(args.p_estudio!==studyId)return {data:null,error:{code:'forbidden'}};
    if(name===failRead)return {data:null,error:{code:'test_read_error'}};
    if(name==='app_rol')return {data:role};
    if(name==='secretary_request_reserve'&&pendingPlan)return {data:{accepted:true}};
    if(name==='app_leer_bloques'||name==='app_leer_versiones'){
      return {data:args.p_bloques.map(bloque=>({bloque,rol:role,updated_at:version,...(name==='app_leer_bloques'?{contenido:values[bloque]}:{})}))};
    }
    throw Error('Unexpected provider quota or database write: '+name);
  }};
  const handler=createSecretaryHandler({
    env:{SECRETARY_ENABLED:'true',SECRETARY_ENVIRONMENT:'test',SECRETARY_ALLOWED_PROJECT_REF:TEST_PROJECT_REF,SECRETARY_ALLOWED_ORIGINS:origin,
      SUPABASE_URL:'https://'+TEST_PROJECT_REF+'.supabase.co',SUPABASE_ANON_KEY:'fixture-publishable',OPENAI_API_KEY:'fixture-unused',OPENAI_MODEL:SECRETARY_MODEL},
    authenticate:async token=>token==='fictional-token-no-credentials'?{client,userId:actorId}:null,
    now:()=>Date.parse(now),
    planner:async()=>{if(pendingPlan)return {intent:'pending_invoices'};throw Error('The fixture must never call the planner');}
  });
  const response=await handler(new Request('https://'+TEST_PROJECT_REF+'.supabase.co/functions/v1/secretario',{
    method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
    body:JSON.stringify({session:'fictional-token-no-credentials',payload:input})
  }));
  return {status:response.status,body:await response.json(),calls};
}

export function fixtureBlocks(options){
  const {clients,invoices,entries}=invoiceFixture(options);
  const scopedProjects=options?.acceptance?projects.map(project=>project.id===9001?{...project,name:'Casa Sol'}:project):projects;
  return {config:{account:{currency:'EUR'},series:{fc:'FC'}},contactos:clients,proyectos:scopedProjects,
    presupuestos:{quotes:[],drafts:[]},facturas:{invoices,entries}};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  process.stdin.setEncoding('utf8');
  let raw='';
  for await(const part of process.stdin)raw+=part;
  if(!raw.trim())process.stdout.write(JSON.stringify(invoiceFixture({acceptance:process.argv.includes('--acceptance')})));
  else {const {input,options}=JSON.parse(raw);process.stdout.write(JSON.stringify(await fixtureRequest(input,options)));}
}
