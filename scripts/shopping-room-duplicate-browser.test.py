"""Ordinary autosave under real localStorage quota, with fictional records only."""
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
   page=browser.new_page(viewport={'width':width,'height':1000},locale='es-ES');errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(fixture_setup)
   page.evaluate("""()=>{
    openRoom(9001,8001);const p=state.projects[0],r=p.rooms[0];r.sections[0].items[0].id='original-product';r.shareToken='fictional';
    p.pres=[{pages:[{els:[{t:'prod',src:ModernoSpec.refFor('original-product'),rid:r.id,rsi:0,rii:0}]}]}];render();
    window.beforeRoom=JSON.stringify(r);window.beforeRefs=JSON.stringify(p.pres);ESTUDIO_ID='fictional';cloudSnapshotAll();window.fixtureRows={};
    for(const b of Object.keys(CLOUD_BLOCKS))fixtureRows[b]={contenido:JSON.parse(canon(CLOUD_BLOCKS[b].get())),updated_at:'fixture-v0'};
    window.fixtureWrites=0;window.fixtureFail=false;window.fixtureGate=new Promise(r=>window.fixtureRelease=r);
    window.fixtureRead=async b=>({data:structuredClone(fixtureRows[b])});
    window.fixtureClient={rpc:async(name,params)=>{
     if(name!=='app_guardar_lote'||params.p_estudio!=='fictional')throw Error('Unexpected write');
     fixtureWrites++;if(fixtureWrites===1)await fixtureGate;if(fixtureFail)return {error:{message:'Fallo ficticio'}};
     return {data:params.p_cambios.map(c=>{fixtureRows[c.bloque]={contenido:structuredClone(c.contenido),updated_at:'fixture-v'+fixtureWrites};return {bloque:c.bloque,updated_at:fixtureRows[c.bloque].updated_at};})};
    }};
   }""")
   html=(repo/'app/index.html').read_text();flush_source=html.split('async function cloudFlush(){',1)[1].split('function cloudSnapshotAll(){',1)[0]
   dirty_source=html.split('function cloudDirty(){',1)[1].split('const _cloudCount=',1)[0]
   page.evaluate("source=>{cloudFlush=new Function('sb','cloudReadBlock','return async function cloudFlush(){'+source)(fixtureClient,fixtureRead);}",flush_source)
   page.evaluate("source=>{cloudDirty=new Function('sb','return function cloudDirty(){'+source)(fixtureClient);}",dirty_source)
   page.evaluate('roomMenu(9001,8001)');page.get_by_role('button',name='Duplicar lista',exact=True).click()
   page.wait_for_function('_cloudBusy&&fixtureWrites===1')
   assert page.evaluate("roomDuplicationPending()&&state.projects[0].rooms.length===5&&JSON.parse(localStorage.getItem(LS_KEY)).state.projects[0].rooms.length===5&&localStorage.getItem(LS_KEY+'_dirty')==='1'&&syncView().label!=='Guardado en nube'")
   assert page.evaluate("(()=>{const event=new Event('beforeunload',{cancelable:true});dispatchEvent(event);return event.defaultPrevented;})()")
   # Another copy while the first request is in flight must be independent and pending.
   page.evaluate('roomMenu(9001,8001)');page.get_by_role('button',name='Duplicar lista',exact=True).click()
   assert page.evaluate("state.projects[0].rooms.length===6&&JSON.parse(localStorage.getItem(LS_KEY)).state.projects[0].rooms.length===6&&JSON.stringify(state.projects[0].rooms[0])===beforeRoom")
   page.evaluate('fixtureRelease()');page.wait_for_function('!_cloudBusy');page.evaluate('async()=>{clearTimeout(_cloudT);clearTimeout(_cloudRetryT);await cloudFlush();}')
   assert page.evaluate("!roomDuplicationPending()&&!syncHasChanges()&&fixtureRows.proyectos.contenido[0].rooms.length===6&&canon(fixtureRows.proyectos.contenido)===canon(state.projects)")
   assert page.evaluate("""()=>{
    const p=state.projects[0],copies=p.rooms.slice(4),ids=p.rooms.flatMap(r=>r.sections.flatMap(s=>s.items.map(i=>i.id).filter(Boolean)));
    return new Set(p.rooms.map(r=>r.id)).size===6&&new Set(ids).size===ids.length&&copies.every(r=>!r.shareToken&&!r.sections[0].items[0].cli)&&JSON.stringify(p.pres)===beforeRefs&&ModernoSpec.resolve(p,p.pres[0].pages[0].els[0]).item===p.rooms[0].sections[0].items[0];
   }""")
   # Fresh read/JSON rehydration from the fake server keeps both copied lists.
   page.evaluate("async()=>{const {data}=await fixtureRead('proyectos');state.projects=JSON.parse(JSON.stringify(data.contenido));render();projTab('listas');}")
   expect(page.locator('.shopping-list-overview .dl-name').filter(has_text='Salón ficticio (copia)')).to_have_count(2)
   # A rejected save stays pending, can be downloaded, and is archived before a fresh load.
   page.evaluate("openRoom(9001,8001);fixtureFail=true;roomMenu(9001,8001)")
   page.get_by_role('button',name='Duplicar lista',exact=True).click();page.wait_for_function('!_cloudBusy')
   assert page.evaluate("syncHasChanges()&&syncView().label!=='Guardado en nube'&&localStorage.getItem(LS_KEY+'_dirty')==='1'")
   page.evaluate('syncDetails()')
   with page.expect_download() as event:page.get_by_role('button',name='Descargar cambios actuales',exact=True).click()
   import json
   assert len(json.loads(Path(event.value.path()).read_text())['state']['projects'][0]['rooms'])==7
   page.get_by_role('button',name='Cerrar',exact=True).click()
   page.evaluate('_resumed=true;persistNow();clearTimeout(_cloudT);clearTimeout(_cloudRetryT);cloudKeepPendingCopy();window.pendingKey=syncCopyKeys().at(-1)')
   assert page.evaluate("JSON.parse(localStorage.getItem(pendingKey)).state.projects[0].rooms.length===7&&fixtureRows.proyectos.contenido[0].rooms.length===6")
   assert not errors,errors;assert not writes,writes
   print(width,'PASS actual menu duplication, independent IDs, immediate local save/request, sequential copies while uploading, server readback, failures stay pending with download and archived copy; no real writes',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
