"""Home map with fake Google SDK and fictitious projects; no remote reads/writes."""
from pathlib import Path
import ast,json,os,socket,subprocess,time,urllib.request,sys
from playwright.sync_api import sync_playwright,expect
repo=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]) if len(sys.argv)>1 else None
if output:output.mkdir(parents=True,exist_ok=True)
parsed=ast.parse((repo/'scripts/shopping-loading-browser.test.py').read_text())
setup=next(ast.literal_eval(n.value) for n in parsed.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='fixture_setup' for t in n.targets))
mock=r"""()=>{
 window.mapFixture={calls:[],maps:0,removed:0,active:0,maxActive:0,fail:true,hold:false,pending:[]};
 class LatLng{constructor(p){this.p=p;}lat(){return this.p.lat;}lng(){return this.p.lng;}}
 class Bounds{constructor(){this.points=[];}extend(p){this.points.push(p);}}
 class FakeMap{constructor(host,options){this.host=host;this.zoom=options.zoom;this.listeners={};this.layers=[];this.points=[];mapFixture.maps++;host.innerHTML='<div class="fixture-map" style="position:absolute;inset:0;background:#e5e8e6;background-image:linear-gradient(35deg,transparent 48%,#fff 49%,#fff 51%,transparent 52%),linear-gradient(110deg,transparent 48%,#c8cecb 49%,#c8cecb 53%,transparent 54%);background-size:155px 210px,260px 190px"><span style="position:absolute;bottom:3px;right:4px;font-size:9px">Mapa ficticio · Sin conexión</span></div>';this.pane=document.createElement('div');this.pane.style.cssText='position:absolute;inset:0';host.append(this.pane);}addListener(name,fn){this.listeners[name]=fn;return {remove:()=>delete this.listeners[name]};}setCenter(p){this.points=[p];this.redraw();}panTo(p){this.points=[p];this.redraw();}getZoom(){return this.zoom;}setZoom(z){this.zoom=z;this.redraw();}fitBounds(b,padding){this.points=b.points;this.padding=padding;this.redraw();}redraw(){for(const layer of this.layers)layer.draw();}unbindAll(){mapFixture.removed++;}}
 class Overlay{setMap(map){if(this.map){this.map.layers=this.map.layers.filter(l=>l!==this);this.onRemove();}this.map=map;if(map){map.layers.push(this);this.onAdd();this.draw();}}getPanes(){return {overlayMouseTarget:this.map.pane};}getProjection(){const m=this.map;return {fromLatLngToDivPixel:p=>{const pts=m.points.length?m.points:[{lat:40,lng:-4}],lat=p.lat(),lng=p.lng(),minLat=Math.min(...pts.map(p=>p.lat)),maxLat=Math.max(...pts.map(p=>p.lat)),minLng=Math.min(...pts.map(p=>p.lng)),maxLng=Math.max(...pts.map(p=>p.lng)),w=m.host.clientWidth,h=m.host.clientHeight,left=w>760?350:50;return {x:left+(lng-minLng)/(maxLng-minLng||1)*(w-left-70),y:60+(maxLat-lat)/(maxLat-minLat||1)*(h-130)};}};}static preventMapHitsAndGesturesFrom(){} }
 const Place={searchByText:async request=>{mapFixture.calls.push(request.textQuery);mapFixture.active++;mapFixture.maxActive=Math.max(mapFixture.maxActive,mapFixture.active);try{await new Promise(resolve=>mapFixture.hold?mapFixture.pending.push(resolve):setTimeout(resolve,25));if(request.textQuery.includes('Fallida')&&mapFixture.fail)throw Error('fixture-only');if(request.textQuery.includes('Desconocida'))return {places:[]};const point=request.textQuery.includes('Sur')?{lat:37.4,lng:-5.9}:{lat:40.4,lng:-3.7};return {places:[{id:'fixture-only',location:new LatLng(point)}]};}finally{mapFixture.active--;}}};
 window.google={maps:{LatLng,LatLngBounds:Bounds,event:{trigger:(map)=>map.redraw(),clearInstanceListeners(){}},importLibrary:async name=>name==='maps'?{Map:FakeMap,OverlayView:Overlay}:{Place}}};
}"""
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://home-map-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_home-map-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Isolated official dev server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width,height in [(1440,1000),(1100,900),(390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height},locale='es-ES');errors=[];writes=[];external=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):external.append(r.request.url);r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    if '/places-config.json' in r.request.url:r.fulfill(status=200,content_type='application/json',body=json.dumps({'browserKey':'AIza'+'x'*35,'locationPersistenceReady':False}));return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup);page.evaluate(mock)
   page.evaluate("""()=>{const base=structuredClone(state.projects[0]);state.projects=[
    {...structuredClone(base),id:9001,num:'PR-1',name:'Ático ficticio',addr:'Calle Norte 1',city:'Ciudad',status:'En progreso',tasks:[{id:701,title:'Pendiente',col:'pend',due:'2020-01-01',assignees:[],assignee:''},{id:702,title:'Completada',col:'listo',assignees:[],assignee:''}]},
    {...structuredClone(base),id:9002,num:'PR-2',name:'Casa ficticia',addr:'Calle Sur 2',status:'En revisión',tasks:[]},
    {...structuredClone(base),id:9003,num:'PR-3',name:'Loft sin dirección',addr:'',status:'En progreso',tasks:[]},
    {...structuredClone(base),id:9004,num:'PR-4',name:'Terminado ficticio',addr:'Calle Norte 1',status:'Entregado',tasks:[]},
    {...structuredClone(base),id:9005,num:'PR-5',name:'Archivado ficticio',addr:'Calle Norte 1',status:'Archivado',tasks:[]},
    {...structuredClone(base),id:9006,num:'PR-6',name:'Error recuperable',addr:'Calle Fallida',status:'En progreso',tasks:[]},
    {...structuredClone(base),id:9007,num:'PR-7',name:'Dirección desconocida',addr:'Calle Desconocida',status:'En progreso',tasks:[]},
    {...structuredClone(base),id:9008,num:'PR-8',name:'No autorizado',addr:'No enviar a Google',brand:'not-visible',status:'En progreso',tasks:[]},
    {...structuredClone(base),id:9009,num:'TPL-1',name:'Plantilla',addr:'No enviar plantilla',tpl:true,tasks:[]}];
    state.cal={events:[]};go('home');window.baseline=records();}""")
   home=page.locator('.home-map');expect(home).to_be_visible();expect(home.locator('.hm-count')).to_have_text('2 de 5 proyectos ubicados')
   assert page.evaluate('mapFixture.calls.length')==4
   assert not page.evaluate("mapFixture.calls.some(q=>q.includes('No enviar'))")
   assert page.evaluate('mapFixture.maxActive')<=2
   if width<760:home.get_by_role('button',name='Resumen del estudio',exact=True).click()
   expect(home.get_by_role('button',name='Ático ficticio',exact=False).first).to_be_visible()
   expect(home.locator('.hm-ring strong')).to_have_text('50%')
   if output:page.screenshot(path=str(output/f'home-map-{width}.png'))
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   # Select an actual marker and open the exact project.
   if width<760:home.get_by_role('button',name='Ocultar resumen',exact=True).click()
   home.locator('.hm-pin').filter(has_text='PR-1').click();expect(home.locator('.hm-detail h2')).to_have_text('Ático ficticio');expect(home.locator('.hm-detail progress')).to_have_attribute('value','50')
   home.get_by_role('button',name='Abrir proyecto',exact=True).click();page.wait_for_function("state.view==='proyecto'&&state.currentProject===9001");assert page.evaluate('mapFixture.removed')>=1
   page.evaluate("go('home')");expect(home.locator('.hm-count')).to_have_text('2 de 5 proyectos ubicados');assert page.evaluate('mapFixture.calls.filter(q=>q===\'Calle Norte 1\').length')==1
   # Filter/search, list view, unknown/empty addresses and successful retry.
   home.get_by_label('Filtrar proyectos del mapa').select_option('all');expect(home.locator('.hm-count')).to_have_text('4 de 7 proyectos ubicados')
   assert page.evaluate('mapFixture.calls.filter(q=>q===\'Calle Norte 1\').length')==1
   home.locator('.hm-pin').filter(has_text='3 proyectos').click();expect(home.locator('.hm-detail [data-hm-project]')).to_have_count(3);home.get_by_role('button',name='Cerrar ficha',exact=True).click()
   home.get_by_role('button',name='Lista',exact=True).click();expect(home.locator('.hm-project-list>button')).to_have_count(7)
   home.get_by_label('Buscar proyecto en el mapa').fill('atico');expect(home.locator('.hm-project-list>button')).to_have_count(1)
   home.get_by_label('Buscar proyecto en el mapa').fill('');home.get_by_label('Filtrar proyectos del mapa').select_option('missing');expect(home.locator('.hm-project-list>button')).to_have_count(1);home.locator('[data-hm-project="9003"]').click();expect(home.locator('.hm-detail')).to_contain_text('Añade una dirección')
   home.get_by_role('button',name='Cerrar ficha',exact=True).click();home.get_by_label('Filtrar proyectos del mapa').select_option('active')
   page.evaluate('mapFixture.fail=false');home.get_by_role('button',name='Reintentar ubicaciones',exact=True).click();expect(home.locator('.hm-count')).to_have_text('3 de 5 proyectos ubicados')
   home.get_by_role('button',name='Mapa',exact=True).click()
   # Returning to the route uses the transient cache, address changes invalidate it.
   before=page.evaluate('mapFixture.calls.length');page.evaluate("go('proyectos');go('home')");expect(home.locator('.hm-count')).to_have_text('3 de 5 proyectos ubicados');assert page.evaluate('mapFixture.calls.length')==before
   assert page.evaluate('records()===baseline'),page.evaluate("(()=>{const a=JSON.parse(baseline),b=JSON.parse(records());return Object.keys(a).filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])).map(k=>({key:k,fields:k==='projects'?b.projects.flatMap((p,i)=>Object.keys(p).filter(k=>JSON.stringify(p[k])!==JSON.stringify(a.projects[i][k])).map(key=>({id:p.id,key}))):[]}));})()")
   page.evaluate("state.projects[0].addr='Calle Norte nueva';render()");expect(home.locator('.hm-count')).to_have_text('3 de 5 proyectos ubicados');assert page.evaluate("mapFixture.calls.includes('Calle Norte nueva')")
   # Same map for collaborators; no finance controls are exposed.
   page.evaluate("_accessRole='colaborador';state.myRole='colab';render()");expect(home.locator('.hm-count')).to_have_text('3 de 5 proyectos ubicados');expect(page.locator('.home-finance')).to_have_count(0)
   # If Google cannot load, projects stay accessible and retry restores the map.
   page.evaluate("window.originalMapCreate=ModernoPlaces.createMap;ModernoPlaces.createMap=async()=>{throw Error('fixture-unavailable')};render()")
   expect(home.locator('.hm-map-message')).to_contain_text('No se pudo cargar el mapa');home.get_by_role('button',name='Lista',exact=True).click();expect(home.locator('.hm-project-list>button')).to_have_count(5)
   home.locator('[data-hm-project="9001"]').click();expect(home.get_by_role('button',name='Abrir proyecto',exact=True)).to_be_visible();home.get_by_role('button',name='Cerrar ficha',exact=True).click()
   # Retry is visible in map mode; retain the selected scope.
   home.get_by_role('button',name='Mapa',exact=True).click();page.evaluate('()=>{ModernoPlaces.createMap=originalMapCreate;}');home.get_by_role('button',name='Reintentar mapa',exact=True).click();expect(home.locator('.hm-count')).to_have_text('3 de 5 proyectos ubicados')
   # New project action and retained activity remain functional.
   home.get_by_role('button',name='Nuevo proyecto',exact=True).click();expect(page.locator('[data-slot=sheet-content]')).to_be_visible();page.evaluate('closeModal()')
   page.locator('.home-activity>summary').click();expect(page.locator('.home-welcome')).to_be_visible()
   # Session/role changes discard a pending lookup, prevent new lookups and clear the map.
   page.evaluate("mapFixture.hold=true;state.projects[0].addr='Pendiente ficticia';render()");page.wait_for_function('mapFixture.pending.length>0');before=page.evaluate('mapFixture.calls.length')
   page.evaluate("_accessRole='cliente';state.sessionUser.id='otra-persona-ficticia';render();mapFixture.pending.splice(0).forEach(r=>r())")
   expect(home).to_have_count(0);page.wait_for_timeout(100);assert page.evaluate('mapFixture.calls.length')==before
   assert not errors,errors;assert not writes,writes
   print(width,'PASS: map engine, scope, summary, marker/detail/open, lookup concurrency/cache, filters/search, missing/failed/retry, address edit, creation, activity and stale session; no remote writes',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
