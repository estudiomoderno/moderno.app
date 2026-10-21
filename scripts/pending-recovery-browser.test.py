"""Pending recovery across browser restarts, with fictional records only."""
from pathlib import Path
import os,socket,subprocess,time,urllib.request,sys
from playwright.sync_api import sync_playwright,expect
repo=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]) if len(sys.argv)>1 else None
if output:output.mkdir(parents=True,exist_ok=True)
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://ui-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
fixture_setup="()=>{\n    if(sb!==null)throw Error('Backend must be disabled');\n    state.sessionUser={name:'Persona ficticia',mail:'persona@example.invalid',id:'fixture'};\n    state.onboarded=true;state.myRole='admin';_accessRole='admin';_accessLoading=false;\n    state.account.name='Estudio ficticio';state.account.apiToken='';state.account.billContacts=[];\n    BRAND.cm.name='Estudio ficticio';state.brandFilter='all';\n    const project=structuredClone(state.projects[0]);\n    Object.assign(project,{id:9001,num:'PR-9001',name:'Proyecto ficticio',brand:'cm',tpl:false,client:'Cliente ficticio',tasks:[],files:[],rooms:[\n     {id:8001,kind:'estancia',name:'Salón ficticio',icon:'sofa'},\n     {id:8002,kind:'estancia',name:'Dormitorio ficticio',icon:'bed'},\n     {id:8003,kind:'pav',name:'Pavimentos ficticios',icon:'wall'},\n     {id:8004,kind:'otra',name:'Otras compras ficticias',icon:'bulb'}\n    ].map((room,i)=>({...room,created:'2026-10-19',sections:[{id:'section-'+i,name:'General',items:[{name:'Producto ficticio '+i,price:25+i,qty:2,unit:'ud',status:'Pendiente',supplier:'Proveedor ficticio',sku:'FIC-'+i}]}]}))});\n    state.projects=[project];state.clients=[{name:'Cliente ficticio',type:'Cliente',brand:'cm',email:'cliente@example.invalid'}];\n    state.entries=[];state.invoices=[];state.quotes=[];state.docs=[];state.library=[];state.catalog=[];state.notifs=[];\n    state.collapsed={'g-9001-estancia':false,'g-9001-pav':false,'g-9001-otra':false,'unrelated':true};\n    applySessionUI();drawBrandSwitch();showLogin(false);go('proyecto',9001);projTab('listas');\n    window.records=()=>JSON.stringify({projects:state.projects,clients:state.clients,invoices:state.invoices,quotes:state.quotes,entries:state.entries,collapsed:state.collapsed});\n    window.baseline=records();window.printCount=0;window.print=()=>{printCount++;window.printHTML=document.getElementById('printZone').innerHTML;};\n   }"
import copy
store={};mode='ok';revision=0;project_writes=0

def rpc(name,params=None):
 global mode,revision,project_writes
 params=params or {}
 if name=='unirse_al_estudio':return {'data':{'estudio_id':'fictional','rol':'admin'}}
 if name=='app_rol':return {'data':'admin'}
 if mode=='offline':return {'error':{'message':'Fallo de red ficticio'}}
 if name=='app_leer_bloques':
  return {'data':[dict(copy.deepcopy(row),bloque=b,rol='admin') for b,row in store.items() if params.get('p_bloques') is None or b in params['p_bloques']]}
 assert name=='app_guardar_lote' and params['p_estudio']=='fictional'
 changes=params['p_cambios']
 if any((store.get(c['bloque']) or {}).get('updated_at')!=c['base'] for c in changes):return {'error':{'message':'Version changed'}}
 revision+=1
 for c in changes:
  store[c['bloque']]={'contenido':copy.deepcopy(c['contenido']),'updated_at':'fixture-v'+str(revision)}
  if c['bloque']=='proyectos':project_writes+=1
 if mode=='commit-lost':mode='ok';return {'error':{'message':'Confirmación perdida ficticia'}}
 return {'data':[{'bloque':c['bloque'],'updated_at':store[c['bloque']]['updated_at']} for c in changes]}

html=(repo/'app/index.html').read_text()
read_source=html[html.index('async function cloudReadRows('):html.index('function cloudPrepareFilteredCache(')]
load_source=html.split('async function cloudLoad(){',1)[1].split('function _dataUrlBlob(',1)[0]
flush_source=html.split('async function cloudFlush(){',1)[1].split('function cloudSnapshotAll(){',1)[0]
dirty_source=html.split('function cloudDirty(){',1)[1].split('const _cloudCount=',1)[0]

def wire(page):
 page.expose_function('fixtureRPC',rpc)
 page.evaluate("""sources=>{
  window.fixtureClient={auth:{getUser:async()=>({data:{user:{id:'fixture',email:'persona@example.invalid',user_metadata:{full_name:'Persona ficticia'},app_metadata:{provider:'email'}}}})},rpc:(name,params)=>fixtureRPC(name,params)};
  window.fixtureRead=new Function('sb',sources.read+';return {rows:cloudReadRows,block:cloudReadBlock};')(fixtureClient);
  cloudFlush=new Function('sb','cloudReadBlock','return async function cloudFlush(){'+sources.flush)(fixtureClient,fixtureRead.block);
  cloudDirty=new Function('sb','return function cloudDirty(){'+sources.dirty)(fixtureClient);
  window.fixtureLoad=new Function('sb','cloudReadRows','return async function cloudLoad(){'+sources.load)(fixtureClient,fixtureRead.rows);
 }""",{'read':read_source,'load':load_source,'flush':flush_source,'dirty':dirty_source})

try:
 for attempt in range(100):
  try:
   with opener.open(origin,timeout=1) as response:assert 'moderno_pruebas_ui-fixture' in response.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [1440,390]:
   context=browser.new_context(viewport={'width':width,'height':1000},locale='es-ES');errors=[];writes=[];store.clear();mode='ok';revision=0;project_writes=0
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   context.route('**/*',route)
   def open_page():
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(origin,wait_until='networkidle');wire(page);return page
   page=open_page();page.evaluate(fixture_setup)
   initial=page.evaluate("""()=>{
    clearTimeout(_saveT);const p=state.projects[0],template=structuredClone(p.rooms[0]);
    p.rooms=Array.from({length:8},(_,ri)=>({...structuredClone(template),id:8001+ri,kind:'estancia',name:'Lista ficticia '+ri,sections:[{id:'s-'+ri,name:'General',items:Array.from({length:44},(_,i)=>({id:'i-'+ri+'-'+i,name:'Producto ficticio '+i,price:25+i,qty:2,unit:'ud',supplier:'Tienda ficticia',desc:'d'.repeat(5000),capture:{fields:{description:{value:'e'.repeat(4500)}}}}))}]}));
    state.catalog=Array.from({length:180},(_,i)=>({id:'catalog-'+i,name:'Catálogo ficticio '+i,desc:'c'.repeat(10000)}));
    return Object.fromEntries(Object.entries(CLOUD_BLOCKS).map(([b,io])=>[b,{contenido:JSON.parse(canon(io.get())),updated_at:'fixture-v0'}]));
   }""");store.update(initial)
   page.evaluate('async()=>{await fixtureLoad();clearTimeout(_cloudT);clearTimeout(_cloudRetryT);await cloudFlush();}')
   assert page.evaluate("!_accessError&&_cloudUserId==='fixture'&&_cloudLoadedStudy==='fictional'")
   mode='offline'
   for i in range(4):
    page.evaluate('roomMenu(9001,8001)');page.get_by_role('button',name='Duplicar lista',exact=True).click()
   page.wait_for_function('!_cloudBusy&&!_localWrite',timeout=30000)
   assert page.evaluate("""async()=>{
    persistNow();if(_localWrite)await _localWrite;
    const d=JSON.parse(await ModernoPendingArchive.resolve(localStorage,LS_KEY,pendingArchiveStore()));
    return d.sync.user==='fixture'&&!!d.sync.pending.proyectos&&d.state.projects[0].rooms.length===12&&JSON.stringify(d).length>6*1024*1024;
   }""")
   assert len(store['proyectos']['contenido'][0]['rooms'])==8
   page.close(run_before_unload=False) # Simulated crash after local verification, with no cloud confirmation.
   mode='ok';store['proyectos']['contenido'][0]['name']='Cambio remoto independiente';revision+=1;store['proyectos']['updated_at']='fixture-v'+str(revision)
   page=open_page()
   assert page.evaluate("_resumed&&!!_resumeRaw")
   result=page.evaluate("""async()=>{
    await fixtureLoad();clearTimeout(_cloudT);clearTimeout(_cloudRetryT);
    const recovered=state.projects[0].rooms.length===12&&state.projects[0].name==='Cambio remoto independiente'&&syncHasChanges();
    await cloudFlush();persistNow();if(_localWrite)await _localWrite;
    return recovered&&!syncHasChanges()&&syncView().label==='Guardado en nube'&&Object.keys(JSON.parse(await ModernoPendingArchive.resolve(localStorage,LS_KEY,pendingArchiveStore())).sync.pending).length===0;
   }""");assert result
   assert len(store['proyectos']['contenido'][0]['rooms'])==12
   # Server committed but the response was lost; reopening must recognize it without another duplicate.
   mode='commit-lost';page.evaluate('roomMenu(9001,8001)');page.get_by_role('button',name='Duplicar lista',exact=True).click();page.wait_for_function('!_cloudBusy&&!_localWrite')
   assert len(store['proyectos']['contenido'][0]['rooms'])==13
   page.evaluate('async()=>{persistNow();if(_localWrite)await _localWrite;}');before=project_writes;page.close(run_before_unload=False)
   page=open_page();page.evaluate('async()=>{await fixtureLoad();clearTimeout(_cloudT);clearTimeout(_cloudRetryT);await cloudFlush();}')
   assert project_writes==before;assert page.evaluate("state.projects[0].rooms.length===13&&!syncHasChanges()")
   # An unresolved conflict must survive multiple crashes; a second reload may not turn it into an overwrite.
   mode='offline';page.evaluate("state.projects[0].rooms[0].sections[0].items[0].name='Edición local';persistNow();cloudFlush();")
   page.wait_for_function('!_cloudBusy&&!_localWrite');page.evaluate('async()=>{persistNow();if(_localWrite)await _localWrite;}');page.close(run_before_unload=False)
   mode='ok';store['proyectos']['contenido'][0]['rooms'][0]['sections'][0]['items'][0]['name']='Edición remota';revision+=1;store['proyectos']['updated_at']='fixture-v'+str(revision);before=project_writes
   for reload in range(2):
    page=open_page();page.evaluate('async()=>{await fixtureLoad();clearTimeout(_cloudT);clearTimeout(_cloudRetryT);await cloudFlush();persistNow();if(_localWrite)await _localWrite;}')
    assert page.evaluate("!!_cloudConflicts.proyectos&&state.projects[0].rooms[0].sections[0].items[0].name==='Edición local'&&syncHasChanges()")
    assert project_writes==before;assert store['proyectos']['contenido'][0]['rooms'][0]['sections'][0]['items'][0]['name']=='Edición remota'
    page.evaluate('syncDetails()');expect(page.locator('[data-sync-detail]')).to_contain_text('revisión')
    if output and reload==1:page.screenshot(path=str(output/f'recovery-conflict-{width}.png'),full_page=True)
    page.close(run_before_unload=False)
   assert not errors,errors;assert not writes,writes
   print(width,'PASS verified local >6 MB; crash/reopen; 4 duplicates recovered with independent remote edit; server readback; lost acknowledgement deduplicated; conflict retained across two more crashes; no real writes',flush=True)
   context.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
