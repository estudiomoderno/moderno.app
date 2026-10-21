"""Real offline Chromium, fake RPC server, real IndexedDB; no external network."""
from pathlib import Path
import ast,json,os,socket,subprocess,time,urllib.request
from playwright.sync_api import sync_playwright
repo=Path(__file__).resolve().parents[1]
parsed=ast.parse((repo/'scripts/bulk-duplicate-save-browser.test.py').read_text())
setup=next(ast.literal_eval(n.value) for n in parsed.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='fixture_setup' for t in n.targets))
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://efficiency-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
html=(repo/'app/index.html').read_text()
def section(start,end):return html[html.index(start):html.index(end,html.index(start))]
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_efficiency-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [1440,390]:
   page=browser.new_page(viewport={'width':width,'height':1000},locale='es-ES');errors=[];external=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):external.append(r.request.url);r.abort();return
    assert r.request.method in ['GET','HEAD'];r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   page.evaluate("""async()=>{
    clearTimeout(_saveT);ESTUDIO_ID='fictional';_cloudLoadedStudy=ESTUDIO_ID;_cloudUserId=state.sessionUser.id;
    const first=state.projects[0];first.rooms=first.rooms.slice(0,1);
    first.rooms[0].sections[0].items=Array.from({length:414},(_,i)=>({id:'p-'+i,name:'Producto ficticio '+i,price:20,qty:1,supplier:'Tienda ficticia',desc:'x'.repeat(2000)}));
    state.projects=Array.from({length:15},(_,i)=>({...structuredClone(first),id:9001+i,name:'Proyecto ficticio '+i}));
    window.rows={};window.calls=[];window.revision=0;
    for(const b of Object.keys(CLOUD_BLOCKS)){const value=JSON.parse(canon(CLOUD_BLOCKS[b].get()));rows[b]={bloque:b,contenido:value,updated_at:'v0',rol:'admin'};_cloudHash[b]=canon(value);_cloudSeen[b]='v0';_cloudCount[b]=blockCount(value);}
    window.applyFake=(before,ops)=>{let value=structuredClone(before);for(const op of ops){let parent=value;for(const k of op.path.slice(0,-1))parent=parent[k];const key=op.path.at(-1);if(op.op==='splice'){(op.path.length?parent[key]:value).splice(op.index,op.delete,...structuredClone(op.items));}else if(op.op==='remove')delete parent[key];else if(op.path.length)parent[key]=structuredClone(op.value);else value=structuredClone(op.value);}return value;};
    window.fakeClient={rpc(name,args){calls.push({name,bytes:JSON.stringify(args).length});return Promise.resolve().then(()=>{
     const selected=args.p_bloques||Object.keys(rows);
     if(name==='app_leer_versiones')return {data:selected.filter(b=>rows[b]).map(b=>({bloque:b,updated_at:rows[b].updated_at,rol:'admin'}))};
     if(name==='app_leer_bloques')return {data:selected.filter(b=>rows[b]).map(b=>structuredClone(rows[b]))};
     if(!['app_guardar_lote','app_guardar_lote_delta'].includes(name))throw Error('Unexpected RPC');
     if(args.p_cambios.some(c=>c.base!==rows[c.bloque]?.updated_at))return {error:{code:'PT409',message:'Version conflict'}};
     const next=args.p_cambios.map(c=>({bloque:c.bloque,contenido:c.cambios?applyFake(rows[c.bloque].contenido,c.cambios):structuredClone(c.contenido),updated_at:'v'+(++revision),rol:'admin'}));
     for(const row of next)rows[row.bloque]=row;
     return {data:next.map(r=>({bloque:r.bloque,updated_at:r.updated_at}))};
    });}};
    window.originalLocalSet=Storage.prototype.setItem;window.largeSyncWrites=0;
    Storage.prototype.setItem=function(k,v){if(k===LS_KEY&&String(v).length>524288){largeSyncWrites++;throw Error('Large synchronous storage write');}return originalLocalSet.call(this,k,v);};
    for(let i=0;i<58;i++){const k=LS_KEY+'_pendiente_'+i;await pendingArchiveStore().write(k,JSON.stringify({v:1,fictional:i}));localStorage.setItem(k,ModernoPendingArchive.marker(k));}
    state.currentRoom=first.rooms[0].id;state.view='estancia';render();
   }""")
   # Bind exactly the production read/save helpers to the fake RPC transport.
   for start,end in [('async function cloudReadRows(','async function cloudReadBlock('),('async function cloudReadSaveVersions(','async function cloudSaveBatch('),('async function cloudSaveBatch(','async function cloudFlush('),('async function cloudFlush(){','function cloudSnapshotAll(){'),('async function cloudPoll(','function cloudRealtimeChange(')]:
    source=section(start,end);name=start.split('function ')[1].split('(')[0]
    page.evaluate("p=>{window[p.name]=new Function('sb','return '+p.source)(fakeClient)}",{'name':name,'source':source})
   # Global function declarations can be replaced through window; const state is retained.
   assert page.locator('.shopping-product-card').count()==60
   page.get_by_role('button',name='Mostrar más productos (60 de 414)',exact=True).click()
   assert page.locator('.shopping-product-card').count()==120
   page.evaluate("state.roomSearch='Producto ficticio 413';render()")
   assert page.locator('.shopping-product-card').count()==1
   page.evaluate("state.roomSearch='';render();state.projects[0].rooms[0].sections[0].items[0].qty=2;persistNow()")
   page.wait_for_function('!_localWrite',timeout=60000)
   page.evaluate('clearTimeout(_cloudT);clearTimeout(_saveT)');page.evaluate('async()=>{await cloudFlush();if(_localWrite)await _localWrite;clearTimeout(_cloudT);clearTimeout(_saveT)}')
   result=page.evaluate("""async()=>({calls,dirty:syncHasChanges(),saved:rows.proyectos.contenido[0].rooms[0].sections[0].items[0].qty,largeSyncWrites,copies:syncCopyKeys().length,localPointer:!!ModernoPendingArchive.pointer(localStorage.getItem(LS_KEY)),metrics:efficiencyMetrics.snapshot(),fullBytes:JSON.stringify(rows.proyectos.contenido).length})""")
   assert not result['dirty'],result
   assert result['saved']==2 and result['copies']==58 and result['largeSyncWrites']==0 and result['localPointer'],result
   assert [c['name'] for c in result['calls']]==['app_leer_versiones','app_guardar_lote_delta'],result['calls']
   assert result['calls'][1]['bytes']<result['fullBytes']/1000
   print(width,'fictional wire bytes:',result['calls'][1]['bytes'],'vs full block',result['fullBytes'],flush=True)
   # Unchanged polls only fetch tiny version metadata, never all project payloads.
   page.evaluate('async()=>{calls.length=0;await cloudPoll()}')
   assert page.evaluate("calls.length===1&&calls[0].name==='app_leer_versiones'")
   # A concurrent remote edit is downloaded and merged before a fresh small patch.
   page.evaluate("""async()=>{
    rows.proyectos.contenido[1].name='Cambio de compañero ficticio';rows.proyectos.updated_at='remote-v2';
    state.projects[0].rooms[0].sections[0].items[0].qty=3;calls.length=0;await cloudFlush();
   }""")
   assert page.evaluate("rows.proyectos.contenido[1].name==='Cambio de compañero ficticio'&&rows.proyectos.contenido[0].rooms[0].sections[0].items[0].qty===3&&!syncHasChanges()")
   assert not errors,errors
   print(width,'PASS: 15 projects × 414 products; 60/120 card pagination and full search; large IndexedDB copy; 58 archives preserved; unchanged save uses 2 RPCs; tiny delta; unchanged poll metadata only; remote edit merged',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
