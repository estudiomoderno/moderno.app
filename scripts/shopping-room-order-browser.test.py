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
   page=browser.new_page(viewport={'width':width,'height':1100},locale='es-ES');errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(fixture_setup)
   page.evaluate("""()=>{
    const p=state.projects[0],rooms=p.rooms;rooms.push({...structuredClone(rooms[0]),id:8005,name:'Cocina ficticia'});
    p.rooms=[rooms[0],rooms[2],rooms[1],rooms[3],rooms[4]];
    p.pres=[{pages:[{els:[{t:'prod',rid:8001,rsi:0,rii:0},{t:'prod',rid:8002,rsi:0,rii:0}]}]}];
    window.beforeDetails=p.rooms.map(r=>JSON.stringify(r)).sort().join('|');window.beforeRefs=JSON.stringify(p.pres);render();
    window.names=()=>state.projects[0].rooms.map(r=>r.name);
   }""")
   grid=page.locator('.shopping-list-overview .dl-grid').first
   assert grid.locator('.shopping-room-grip').count()==3
   def drag_to_next(cancel=False):
    a=grid.locator('.shopping-room-grip').first;b=grid.locator('.dl-card').nth(1)
    a.scroll_into_view_if_needed();ab=a.bounding_box();bb=b.bounding_box()
    x=bb['x']+bb['width']*.8;y=bb['y']+bb['height']*.8
    page.mouse.move(ab['x']+16,ab['y']+16);page.mouse.down();page.mouse.move(x,y)
    if cancel:page.keyboard.press('Escape')
    page.mouse.up()
   before=page.evaluate('names()');drag_to_next(True);assert page.evaluate('names()')==before
   drag_to_next();assert page.evaluate('names()')==['Dormitorio ficticio','Pavimentos ficticios','Salón ficticio','Otras compras ficticias','Cocina ficticia']
   assert page.evaluate("state.view==='proyecto'&&state.projTab==='listas'")
   grid.locator('.shopping-room-grip').nth(1).focus();page.keyboard.press('ArrowUp')
   assert page.evaluate('names()')==before
   # Touch uses the same pointer capture path and never opens the room.
   if width==390:
    a=grid.locator('.shopping-room-grip').first;a.scroll_into_view_if_needed();ab=a.bounding_box();bb=grid.locator('.dl-card').nth(1).bounding_box()
    cdp=page.context.new_cdp_session(page)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':ab['x']+16,'y':ab['y']+16}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':bb['x']+bb['width']*.8,'y':bb['y']+bb['height']*.8}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    assert page.evaluate('names()')[0]=='Dormitorio ficticio'
   assert page.evaluate("state.projects[0].rooms.map(r=>JSON.stringify(r)).sort().join('|')===beforeDetails&&JSON.stringify(state.projects[0].pres)===beforeRefs")
   page.evaluate('persistNow();window.savedNames=JSON.stringify(names());state.projects=JSON.parse(localStorage.getItem(LS_KEY)).state.projects;render()')
   assert page.evaluate('JSON.stringify(names())===savedNames')
   expect(grid.locator('.dl-add')).to_be_visible()
   if output:page.screenshot(path=str(output/f'room-order-{width}.png'),full_page=True)
   page.evaluate("_accessRole='colaborador';render()")
   assert page.locator('.shopping-room-grip').count()==0
   assert not errors,errors;assert not writes,writes
   print(width,'PASS mouse drag, Escape, keyboard, touch on mobile, exact content and references retained, serialized order restored and role guard; zero real writes',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
