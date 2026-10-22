"""Shopping loading feedback and return to top, with fictional records only."""
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
import base64
png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jzS0AAAAASUVORK5CYII=')
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
   page=browser.new_page(viewport={'width':width,'height':900},locale='es-ES');errors=[];writes=[];pending=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    if '/fixture-slow.png' in r.request.url:pending.append(r);return
    if '/fixture-failed.png' in r.request.url:r.fulfill(status=404,body='');return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(fixture_setup)
   page.evaluate("""()=>{
    const items=state.projects[0].rooms[0].sections[0].items;
    items[0].img='/fixture-slow.png';
    items.push({...items[0],id:'failed',name:'Imagen fallida ficticia',img:'/fixture-failed.png'});
    render();window.imageBaseline=records();
   }""")
   frame=page.locator('.dl-mosaic .shopping-image-frame').first
   expect(frame).to_have_attribute('aria-busy','true')
   expect(frame.locator('.shopping-image-progress')).to_be_visible()
   assert frame.locator('img').evaluate("e=>getComputedStyle(e).visibility==='hidden'")
   expect(page.locator('.shopping-image-frame.is-unavailable').first).to_have_attribute('aria-busy','false')
   expect(page.locator('.shopping-image-unavailable').nth(1)).to_be_visible()
   expect(page.locator('#shopping-scroll-up')).to_be_hidden()
   if output:page.screenshot(path=str(output/f'loading-{width}.png'))
   page.wait_for_function("document.querySelector('img[src=\"/fixture-slow.png\"]')!==null")
   assert pending
   for r in pending:r.fulfill(status=200,content_type='image/png',body=png)
   pending.clear()
   expect(frame).to_have_attribute('aria-busy','false')
   expect(frame).to_have_class('shopping-image-frame is-ready')
   assert frame.locator('img').evaluate("e=>e.naturalWidth>0&&getComputedStyle(e).visibility==='visible'")
   assert page.evaluate('records()===imageBaseline')
   page.evaluate("""()=>{
    const room=state.projects[0].rooms[0];
    room.sections[0].items=Array.from({length:60},(_,i)=>({id:'product-'+i,name:'Producto ficticio '+i,qty:1,price:25,img:'/brand/illustrations/nuevo-producto.webp',supplier:'Tienda ficticia'}));
    openRoom(9001,8001);window.scrollBaseline=records();
   }""")
   button=page.get_by_role('button',name='Volver arriba',exact=True)
   expect(page.locator('#shopping-scroll-up')).to_be_hidden()
   page.evaluate("document.querySelector('.main').scrollTo({top:2000,behavior:'instant'})")
   expect(button).to_be_visible()
   geometry=button.bounding_box();sync=page.locator('#syncTag').bounding_box()
   assert geometry['x']+geometry['width']<=width and geometry['y']+geometry['height']<=900
   if sync:assert geometry['y']+geometry['height']<=sync['y']-10,(geometry,sync)
   page.evaluate("""()=>{const sync=document.getElementById('syncTag');sync.style.maxWidth='200px';sync.style.whiteSpace='normal';sync.querySelector('.txt').textContent='Necesita revisión. Mensaje ficticio largo para comprobar que el botón no tapa el indicador cuando ocupa varias líneas.';}""")
   page.wait_for_function("document.getElementById('shopping-scroll-up').getBoundingClientRect().bottom<=document.getElementById('syncTag').getBoundingClientRect().top-10")
   if output:page.screenshot(path=str(output/f'scroll-up-{width}.png'))
   button.click()
   page.wait_for_function("document.querySelector('.main').scrollTop<5")
   expect(page.locator('#shopping-scroll-up')).to_be_hidden()
   page.emulate_media(reduced_motion='reduce')
   assert page.locator('.shopping-rolling-dots').first.evaluate("e=>getComputedStyle(e).animationName==='none'")
   page.evaluate("document.querySelector('.main').scrollTo({top:2000,behavior:'instant'})")
   expect(button).to_be_visible();button.focus();page.keyboard.press('Enter')
   page.wait_for_function("document.querySelector('.main').scrollTop===0")
   expect(page.locator('#shopping-room-trigger')).to_be_focused()
   assert page.evaluate('records()===scrollBaseline')
   page.evaluate("document.querySelector('.main').scrollTo({top:2000,behavior:'instant'})")
   expect(button).to_be_visible()
   page.evaluate('itemModal(0,0)')
   expect(page.locator('#shopping-scroll-up')).to_be_hidden()
   page.locator('#modalBox').get_by_role('button',name='Cancelar',exact=True).click()
   page.evaluate("go('home')")
   expect(page.locator('#shopping-scroll-up')).to_be_hidden()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert not errors,errors;assert not writes,writes
   print(width,'PASS: delayed/failed/cached images, grey loader, actual scroll container, collision, keyboard, reduced motion, route/modal hiding, no record changes or backend writes',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
