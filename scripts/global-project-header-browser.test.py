"""Real project tabs against the official isolated server, with fictitious data and no backend."""
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
try:
 for attempt in range(100):
  try:
   with opener.open(origin,timeout=1) as response:html=response.read().decode()
   assert 'https://ui-fixture.supabase.co' in html and 'const LS_KEY="moderno_pruebas_ui-fixture";' in html
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server did not start')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [1440,1100,900,390]:
   page=browser.new_page(viewport={'width':width,'height':1000},locale='es-ES');errors=[];writes=[];external=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):external.append(r.request.url);r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.wait_for_function('!!window.ModernoProjectWorkspace')
   page.evaluate("""()=>{
    if(sb!==null)throw Error('Backend must be disabled');
    state.sessionUser={name:'Persona ficticia',mail:'persona@example.invalid',id:'fictional-user'};state.onboarded=true;state.myRole='admin';_accessRole='admin';_accessLoading=false;
    state.account.name='Estudio ficticio';state.account.apiToken='';state.account.billContacts=[];BRAND.cm.name='Estudio ficticio';state.brandFilter='all';
    const template=structuredClone(state.projects[0]);
    state.projects=[9001,9002].map((id,i)=>({...structuredClone(template),id,num:'PR-'+id,name:i?'Proyecto ficticio con un nombre largo para comprobar las pestañas':'Proyecto de ejemplo',client:i?'Cliente Álvaro ficticio':'Cliente ficticio',tpl:false,brand:'cm',tags:['Ejemplo'],tasks:[],files:[{name:'Plano de ejemplo.png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='}],pres:[{id:id+200,name:'Lámina ficticia',visible:false,orient:'h',foot:{on:false,pos:'auto',logo:true,proj:true,date:true,num:true,txt:'',logoImg:null},pages:[{name:'Página ficticia',els:[]}],comments:[]}],notes:'Nota ficticia conservada',rooms:[{id:id+100,kind:'estancia',name:'Estancia ficticia',sections:[{id:'section-'+id,name:'General',items:[]}]}],links:{drive:'',rayon:''}}));
    state.clients=[{name:'Cliente ficticio',type:'Cliente',brand:'cm',num:'Cliente - 1',email:'cliente@example.invalid'},{name:'Cliente Álvaro ficticio',type:'Cliente',brand:'cm',num:'Cliente - 2',email:'alvaro@example.invalid'}];state.users=[{name:'Persona ficticia',email:'persona@example.invalid',role:'Administrador'}];
    state.entries=[];state.invoices=[];state.quotes=[];state.library=[];state.catalog=[];state.docs=[];state.notifs=[];
    applySessionUI();drawBrandSwitch();showLogin(false);
    go('proyectos');
    if(window.matchMedia('(min-width:1100px)').matches&&!document.querySelector('#project-window-bar'))throw Error('Home must exist before opening a project');
    for(const id of [9001,9002]){go('proyecto',id);for(const section of ['proyecto','planos','tareas','listas','fin','archivos','cliente','utilidades'])projTab(section);}
    go('proyecto',9001);projTab('planos');ModernoProjectWorkspace.close(9002);
    window.records=()=>JSON.stringify({projects:state.projects,clients:state.clients,entries:state.entries,invoices:state.invoices,quotes:state.quotes});window.baseline=records();
   }""")
   assert page.evaluate('sb===null')
   if width<1100:
    expect(page.locator('#project-window-bar')).to_have_count(0)
    expect(page.locator('#desktop-header')).to_have_count(0)
    page.evaluate("go('agenda');go('facturas')")
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors;assert not writes,writes
    print(width,'PASS existing tablet/mobile navigation preserved',flush=True);page.close();continue
   page.evaluate("projectOpen(9002);projTab('tareas');openRoom(9001,9101)")
   tabs=page.locator('#project-window-bar [role=tab]');expect(tabs).to_have_count(2)
   profile=page.locator('[data-profile-trigger]');expect(profile).to_be_visible()
   bar=page.locator('#project-window-bar');rail=page.locator('#desktop-header .desktop-row')
   expected_tabs=tabs.evaluate_all('(es)=>es.map(e=>e.dataset.project)')
   routes=['home','proyectos','workspace','agenda','calendario','informes','facturas','presupuestos','contabilidad','prevision','catalogo','biblioteca','plantillas','tutoriales','soporte','utilidades','automatizaciones','integraciones','plugins','mail','conversaciones','ajustes','admin']
   for view in routes:
    if not page.evaluate('view=>canView(view)',view):continue
    page.evaluate('view=>go(view)',view);assert page.evaluate('state.view')==view
    expect(bar).to_have_count(1);expect(bar).to_be_visible()
    expect(tabs).to_have_count(2);assert tabs.evaluate_all('(es)=>es.map(e=>e.dataset.project)')==expected_tabs
    assert bar.bounding_box()['x']==12 and bar.bounding_box()['y']==10,(view,bar.bounding_box())
    assert rail.bounding_box()['y']==56 and rail.bounding_box()['height']==944
    expect(page.locator('.desktop-brand')).to_be_hidden()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),view
    if page.locator('#page-route-bar').count():
     route=page.locator('#page-route-bar').bounding_box();assert route['y']>=56,(view,route)
     assert float(page.locator('.main').evaluate('(e)=>getComputedStyle(e).paddingTop').removesuffix('px'))>=route['y']+route['height']
    if view in ['home','agenda','contabilidad','ajustes'] and output:page.screenshot(path=str(output/f'global-header-{view}-{width}.png'),full_page=True)
   page.evaluate('presOpen(9001,9201,false)');assert page.evaluate('state.view')=='presedit'
   expect(bar).to_be_visible();expect(profile).to_be_visible();assert bar.bounding_box()['y']==10
   assert page.locator('#view').bounding_box()['y']>=56
   if output:page.screenshot(path=str(output/f'global-header-editor-{width}.png'),full_page=True)
   page.evaluate("go('agenda')")
   # Actual sidebar navigation keeps the project windows mounted and restores their saved room/section.
   page.locator('#desktop-header [data-desktop-view=agenda]').click();expect(tabs).to_have_count(2)
   page.locator('#project-window-9001').click();assert page.evaluate("state.view==='estancia'&&state.currentProject===9001&&state.currentRoom===9101")
   page.locator('#project-window-9002').click();assert page.evaluate("state.view==='proyecto'&&state.currentProject===9002&&state.projTab==='tareas'")
   page.locator('#desktop-header [data-desktop-view=agenda]').click()
   page.get_by_role('button',name='Comprimir menú lateral',exact=True).click();page.wait_for_function('!document.querySelector(".desktop-row").classList.contains("is-toggling")')
   assert rail.bounding_box()['width']==64 and bar.bounding_box()['x']==12
   page.get_by_role('button',name='Desplegar menú lateral',exact=True).click();page.wait_for_function('!document.querySelector(".desktop-row").classList.contains("is-toggling")')
   assert rail.bounding_box()['width']==224 and bar.bounding_box()['x']==12
   page.evaluate('(()=>{document.querySelector(".main").scrollTop=1000})()');assert bar.bounding_box()['y']==10
   # An open form blocks both the tabs and the home button.
   page.locator('#project-window-9001').click();page.evaluate('roomMenu(9001,9101)')
   page.locator('#rmName').fill('Borrador ficticio')
   page.locator('#project-window-9002').dispatch_event('click');expect(page.locator('#rmName')).to_have_value('Borrador ficticio')
   assert page.evaluate("state.view==='estancia'&&state.currentProject===9001")
   page.get_by_role('button',name='Ver todos los proyectos',exact=True).dispatch_event('click');expect(page.locator('#rmName')).to_have_value('Borrador ficticio')
   page.evaluate('closeModal()')
   assert page.evaluate('records()===baseline')
   # The layout fallback keeps the same navigation when the enhanced component is unavailable.
   page.evaluate("ModernoProjectWorkspace.setEnabled(false);window.savedProfileComponent=ModernoProfileComponent;ModernoProfileComponent={...savedProfileComponent,mountProjectWindows:null};ModernoProjectWorkspace.setEnabled(true);go('agenda')")
   expect(bar).to_have_count(1);page.get_by_role('button',name='Abrir otro proyecto',exact=True).click()
   field=page.get_by_role('searchbox',name='Buscar proyecto para abrir');field.fill('9002');page.locator('.pw-project-choice').first.click()
   assert page.evaluate("state.view==='proyecto'&&state.currentProject===9002")
   page.evaluate("ModernoProfileComponent=savedProfileComponent;_accessLoading=true;render()")
   expect(bar).to_have_count(0)
   page.evaluate("_accessLoading=false;_accessRole='colaborador';state.myRole='colaborador';go('agenda')")
   expect(bar).to_have_count(1);expect(page.locator('#project-window-bar [role=tab]')).to_have_count(0)
   assert not writes,writes;assert not errors,errors
   print(width,'PASS permanent header across internal views, sidebar below, preserved project context, collapse, draft guards, component fallback and role reset; no remote writes',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
