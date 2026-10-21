"""Bulk duplication with stalled cloud/local operations, with fictional records only."""
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
   page.evaluate("""async()=>{
    clearTimeout(_saveT);ESTUDIO_ID='fictional';const p=state.projects[0];
    const template=structuredClone(p.rooms[0]);
    p.rooms=Array.from({length:8},(_,ri)=>({...structuredClone(template),id:8001+ri,kind:'estancia',name:'Lista ficticia '+ri,sections:[{id:'s-'+ri,name:'General',items:Array.from({length:44},(_,i)=>({id:'i-'+ri+'-'+i,name:'Producto ficticio '+i,price:25+i,qty:2,unit:'ud',supplier:'Tienda ficticia',desc:'d'.repeat(4500),capture:{fields:{description:{value:'e'.repeat(4500),source:{raw:'f'.repeat(4500)}}}}}))}]}));
    state.catalog=Array.from({length:180},(_,i)=>({id:'catalog-'+i,name:'Catálogo ficticio '+i,desc:'c'.repeat(10000)}));
    for(let i=0;i<55;i++){const key=LS_KEY+'_pendiente_'+(2100000000000+i),raw=JSON.stringify({v:1,fictional:i});await pendingArchiveStore().write(key,raw);localStorage.setItem(key,ModernoPendingArchive.marker(key));}
    state.currentRoom=8001;state.view='estancia';render();cloudSnapshotAll();window.fixtureRows={};
    for(const b of Object.keys(CLOUD_BLOCKS))fixtureRows[b]={contenido:JSON.parse(canon(CLOUD_BLOCKS[b].get())),updated_at:'fixture-v0'};
    window.fixtureMode='hang';window.fixtureWrites=0;window.fixtureSignals=[];
    window.fixtureGate=new Promise(r=>window.fixtureRelease=r);
    window.fixtureRead=async b=>({data:structuredClone(fixtureRows[b])});
    window.fixtureClient={rpc(name,params){
      if(name!=='app_guardar_lote'||params.p_estudio!=='fictional')throw Error('Unexpected write');
      const mode=fixtureMode;fixtureWrites++;
      return {abortSignal(signal){fixtureSignals.push(signal);return (async()=>{
        if(mode==='hang')await fixtureGate;
        if(params.p_cambios.some(c=>fixtureRows[c.bloque]?.updated_at!==c.base))return {error:{message:'Version changed'}};
        return {data:params.p_cambios.map(c=>{fixtureRows[c.bloque]={contenido:structuredClone(c.contenido),updated_at:'fixture-v'+fixtureWrites};return {bloque:c.bloque,updated_at:fixtureRows[c.bloque].updated_at};})};
      })();}};
    }};
    window.realTimeout=window.setTimeout;window.realClear=window.clearTimeout;window.deadlines=[];
    window.setTimeout=(fn,ms,...args)=>{if(ms===20000||ms===30000||ms===90000){const token={fn,ms};deadlines.push(token);return token;}return realTimeout(fn,ms,...args);};
    window.clearTimeout=token=>{if(token&&typeof token==='object'&&token.fn)token.cancelled=true;else realClear(token);};
   }""")
   html=(repo/'app/index.html').read_text();flush_source=html.split('async function cloudFlush(){',1)[1].split('function cloudSnapshotAll(){',1)[0]
   dirty_source=html.split('function cloudDirty(){',1)[1].split('const _cloudCount=',1)[0]
   page.evaluate("source=>{cloudFlush=new Function('sb','cloudReadBlock','return async function cloudFlush(){'+source)(fixtureClient,fixtureRead);}",flush_source)
   page.evaluate("source=>{cloudDirty=new Function('sb','return function cloudDirty(){'+source)(fixtureClient);}",dirty_source)
   # Trigger the actual native menu action repeatedly while the first upload is stalled.
   for i in range(4):
    page.evaluate('roomMenu(9001,8001)');page.get_by_role('button',name='Duplicar lista',exact=True).click()
   page.wait_for_function('fixtureWrites===1&&_cloudBusy&&!_localWrite',timeout=30000)
   assert page.evaluate("state.projects[0].rooms.length===12&&roomDuplicationPending()&&!!ModernoPendingArchive.pointer(localStorage.getItem(LS_KEY))")
   page.evaluate('syncDetails()');expect(page.locator('[data-sync-title]')).to_contain_text('Guardando')
   page.evaluate('deadlines.find(t=>t.ms===90000&&!t.cancelled).fn()');page.wait_for_function('!_cloudBusy')
   expect(page.locator('[data-sync-title]')).to_have_text('Necesita revisión');expect(page.locator('[data-sync-detail]')).to_contain_text('tarda demasiado')
   assert page.evaluate('fixtureSignals[0].aborted&&syncCopyKeys().length===55&&syncHasChanges()')
   if output:page.screenshot(path=str(output/f'bulk-stalled-{width}.png'),full_page=True)
   with page.expect_download() as event:page.get_by_role('button',name='Descargar cambios actuales',exact=True).click()
   import json
   data=json.loads(Path(event.value.path()).read_text());assert len(data['state']['projects'][0]['rooms'])==12;assert data['appVersion']=='v3.65.97'
   page.evaluate("fixtureMode='ok'")
   page.get_by_role('button',name='Reintentar guardado',exact=True).click()
   page.wait_for_function("!_cloudBusy&&!_localWrite&&!syncHasChanges()&&syncView().label==='Guardado en nube'",timeout=30000)
   # A late old RPC cannot undo the versioned retry; local acknowledgement remains exact.
   page.evaluate('fixtureRelease()');page.wait_for_timeout(100)
   assert page.evaluate('fixtureRows.proyectos.contenido[0].rooms.length===12&&!roomDuplicationPending()&&canon(fixtureRows.proyectos.contenido)===canon(state.projects)')
   assert page.evaluate("new Set(state.projects[0].rooms.flatMap(r=>r.sections.flatMap(s=>s.items.map(it=>it.id)))).size===12*44")
   # Stalled local storage is separately bounded; native Retry can proceed before it finishes.
   page.evaluate("""()=>{
    window.nativeStore=pendingArchiveStore();window.localGate=new Promise(r=>window.localRelease=r);window.localStarted=false;
    _pendingArchiveStore={read:k=>nativeStore.read(k),write:async(k,v)=>{localStarted=true;await localGate;return nativeStore.write(k,v);},remove:k=>nativeStore.remove(k)};
    _localRepairAfter=Date.now()+60000;state.account.localNote='old pending note';persistNow();clearTimeout(_cloudT);clearTimeout(_cloudRetryT);clearTimeout(_saveT);
   }""")
   page.wait_for_function('localStarted');page.evaluate('syncDetails()');expect(page.locator('[data-sync-title]')).to_have_text('Guardando')
   page.evaluate('deadlines.filter(t=>t.ms===20000&&!t.cancelled).at(-1).fn()');page.wait_for_function('!_localWrite')
   expect(page.locator('[data-sync-detail]')).to_contain_text('La copia local tarda demasiado')
   page.evaluate("_pendingArchiveStore=nativeStore;state.account.localNote='newest retry note'")
   page.get_by_role('button',name='Reintentar guardado',exact=True).click()
   page.wait_for_function("!_localWrite&&!_saveErr&&!_cloudBusy&&!syncHasChanges()",timeout=30000)
   page.evaluate('localRelease()');page.wait_for_timeout(200)
   assert page.evaluate("""async()=>{
    const saved=JSON.parse(await ModernoPendingArchive.resolve(localStorage,LS_KEY,pendingArchiveStore()));
    for(let i=0;i<55;i++){const key=LS_KEY+'_pendiente_'+(2100000000000+i);if(JSON.parse(await ModernoPendingArchive.resolve(localStorage,key,pendingArchiveStore())).fictional!==i)return false;}
    return saved.state.account.localNote==='newest retry note'&&saved.state.projects[0].rooms.length===12&&syncView().label==='Guardado en nube'&&sb===null;
   }""")
   assert not errors,errors;assert not writes,writes
   print(width,'PASS 12 lists x44 products, >6 MB, repeated native duplication; stalled RPC abort+live error+download+native retry+late version rejection; stalled local write expires+retry+late write ignored; 55 historical copies intact; no real writes',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
