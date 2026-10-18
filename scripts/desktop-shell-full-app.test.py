"""Full application UI, served by the official isolated server. No SDK or external network.

This exercises actual renderers, router and settings, using synthetic in-memory records.
It does not validate Supabase authentication, RPC or cloud persistence.
"""
from pathlib import Path
import json,os,socket,subprocess,time,urllib.request,sys
from playwright.sync_api import sync_playwright

repo=Path(__file__).resolve().parents[1]
finance=['facturas','presupuestos','contabilidad','informes','prevision']
def reveal_route(page,view):
 if view in finance:
  if page.locator('#desktop-finance-nav').is_hidden():page.get_by_role('button',name='Finanzas',exact=True).click()
 elif page.locator('#desktop-primary').is_hidden():page.get_by_role('button',name='Volver al menú principal',exact=True).click()
 button=page.locator('#desktop-header [data-desktop-view="'+view+'"]')
 button.evaluate('(b)=>{const d=b.closest("details");if(d)d.open=true;}')
 return button
def contrast_total(page):
 colors=page.locator('.project-tab-panel>.entry-col>.entry:last-child').evaluate('(e)=>[getComputedStyle(e).backgroundColor,getComputedStyle(e.querySelector(".amt")).color]')
 def luminance(color):
  values=[int(x)/255 for x in color.removeprefix('rgb(').removesuffix(')').split(',')]
  values=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in values]
  return sum(v*w for v,w in zip(values,[.2126,.7152,.0722]))
 a,b=sorted(map(luminance,colors));assert (b+.05)/(a+.05)>=4.5,colors
def contrast_navigation(page):
 def luminance(color):
  values=[int(x)/255 for x in color.removeprefix('rgb(').removesuffix(')').split(',')]
  values=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in values]
  return sum(v*w for v,w in zip(values,[.2126,.7152,.0722]))
 row=page.locator('.desktop-row')
 for selector in ['#desktop-primary [data-desktop-view=proyectos]','#desktop-primary [data-desktop-view=workspace]']:
  colors=page.locator(selector).evaluate('(e)=>[getComputedStyle(e).backgroundColor,getComputedStyle(e).color]')
  if colors[0]=='rgba(0, 0, 0, 0)':colors[0]=row.evaluate('(e)=>getComputedStyle(e).backgroundColor')
  a,b=sorted(map(luminance,colors));assert (b+.05)/(a+.05)>=4.5,colors
with socket.socket() as sock:
 sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
environment=dict(os.environ,PORT=str(port),SUPABASE_URL='https://ui-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49')
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=environment,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for attempt in range(100):
  try:
   with opener.open(origin,timeout=1) as response:html=response.read().decode()
   assert 'https://ui-fixture.supabase.co' in html and 'const LS_KEY="moderno_pruebas_ui-fixture";' in html
   assert 'const SUPABASE_URL = "https://auth.moderno.app";' not in html
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server did not start')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [1440,1100,390]:
   page=browser.new_page(viewport={'width':width,'height':1000});errors=[];writes=[];external=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):
     external.append(r.request.url);r.abort();return
    if r.request.method not in ['GET','HEAD']:
     writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route)
   page.goto(origin,wait_until='networkidle');page.wait_for_function('!!window.ModernoDesktopShell')
   page.evaluate("""()=>{
    if(sb!==null)throw Error('Backend must be disabled');
    state.sessionUser={name:'Persona ficticia',mail:'persona@example.invalid',prov:'email'};
    state.onboarded=true;state.myRole='admin';_accessRole='admin';_accessLoading=false;
    state.account.name='Estudio ficticio';state.account.apiToken='';state.account.billContacts=[];
    BRAND.cm.name='Espacio ficticio';
    const project=structuredClone(state.projects[0]);
    Object.assign(project,{id:9001,num:'PR-9001',name:'Proyecto ficticio',tpl:false,client:'Cliente ficticio',brand:'cm',files:[{id:'text-original',name:'Contrato ficticio.txt',body:'Texto ficticio'},{id:'plan-original',name:'Plano ficticio.pdf',data:'data:application/pdf;base64,ZmljdGl0aW91cw=='},{id:'image-original',name:'Imagen ficticia.png',data:'data:image/png;base64,ZmljdGl0aW91cw=='},'Archivo histórico.txt'],notes:'Nota histórica ficticia',rooms:[{id:8001,kind:'estancia',name:'Estancia ficticia',sections:[{id:'section-fixture',name:'General',items:[]}]}],tasks:[{id:'task-fixture',title:'Tarea ficticia',type:'Diseño',col:'pend',who:['Persona ficticia'],amount:null,acc:false,subs:[],comments:[],files:[]}],links:{drive:'',rayon:''}});
    state.projects=[project];state.clients=[{name:'Cliente ficticio',type:'Cliente',brand:'cm',email:'cliente@example.invalid'},{name:'Persona ficticia',type:'Team',brand:'cm',email:'persona@example.invalid'}];
    state.users=[{name:'Persona ficticia',email:'persona@example.invalid',role:'Administrador'}];
    state.entries=[];state.invoices=[];state.quotes=[];state.library=[];state.catalog=[];state.docs=[];state.notifs=[];
    applySessionUI();drawBrandSwitch();showLogin(false);go('proyectos');
   }""")
   assert page.evaluate('sb===null')
   assert page.evaluate('LS_KEY')=='moderno_pruebas_ui-fixture'
   assert page.locator('#desktop-header').count()==(1 if width>=1100 else 0)
   page.evaluate('ModernoDesktopShell.setEnabled(false)')
   assert page.locator('#desktop-header').count()==0
   page.evaluate('ModernoDesktopShell.setEnabled(true)')
   if width>=1100:assert page.locator('#desktop-header').is_visible()
   else:assert page.locator('#desktop-header').count()==0
   # Warm real renderers once, so their existing normalizations are not attributed to the new shell.
   routes=page.locator('aside.sidebar .nav-item[data-view]:not([data-view=utilidades]):not([data-view=conversaciones])').evaluate_all('(bs)=>bs.map(b=>b.dataset.view)')
   assert page.locator('aside.sidebar [data-view=utilidades]').is_hidden()
   assert page.locator('aside.sidebar [data-view=conversaciones]').is_hidden()
   for view in routes:
    page.evaluate('(view)=>go(view)',view)
    assert page.evaluate('state.view')==view
    assert page.locator('#view').inner_text().strip(),view
   page.evaluate("go('proyecto',9001)")
   keys=['proyecto','planos','obra','tareas','listas','fin','archivos','ai','conversaciones','utilidades']
   for key in keys+['cliente']:page.evaluate('(key)=>projTab(key)',key)
   page.evaluate("window.fixtureRecords=()=>JSON.stringify({projects:state.projects,clients:state.clients,entries:state.entries,invoices:state.invoices,quotes:state.quotes,library:state.library,docs:state.docs});window.fixtureBaseline=fixtureRecords()")
   for view in routes:
    if width>=1100:
     if view=='plantillas':
      assert page.locator('#desktop-header [data-desktop-view=plantillas]').count()==0
      continue
     reveal_route(page,view).click()
    else:page.evaluate('(view)=>document.querySelector(`aside.sidebar .nav-item[data-view="${view}"]`).click()',view)
    assert page.evaluate('state.view')==view
   page.evaluate("go('proyecto',9001)")
   assert page.locator('.project-tabs [role=tab]').evaluate_all('(bs)=>bs.map(b=>b.getAttribute("aria-label"))')==['Inicio','Planos','Obra','Tareas','Compras','Economía','Documentos','AI','Conversaciones','Utilidades']
   for key in keys:
    page.locator('#project-tab-'+key).click(force=width<1100)
    assert page.locator('#project-tab-'+key).get_attribute('aria-selected')=='true'
    if key=='planos':
     assert page.locator('.project-file-open').evaluate_all('(bs)=>bs.map(b=>b.dataset.index)')==['1','2'],'Plan filtering must retain original file indices'
     assert page.locator('.project-plan-open').count()==2
    if key=='archivos':
     assert page.locator('.project-file-open').evaluate_all('(bs)=>bs.map(b=>b.dataset.index)')==['0','1','2','3']
    if key=='ai':assert page.locator('#project-tab-panel').inner_text().strip()=='AI'
    if key=='conversaciones':
     assert page.evaluate('state.view')=='proyecto' and page.evaluate('state.currentProject')==9001
     assert 'Conversaciones' in page.locator('#project-tab-panel').inner_text()
     assert 'Próximamente' in page.locator('#project-tab-panel').inner_text()
    if key=='utilidades':
     assert page.evaluate('state.view')=='proyecto' and page.evaluate('state.currentProject')==9001
     page.locator('#ptM2').fill('24');assert '4.0 L' in page.locator('#ptRes').inner_text()
   if width>=1100:
    page.evaluate('window.originalCalculator=document.querySelector("#ptM2")')
    page.get_by_role('button',name='Comprimir menú superior',exact=True).click()
    assert page.locator('#desktop-navigation').is_hidden()
    assert page.locator('.desktop-row').bounding_box()['width']<100
    assert page.locator('.desktop-brand').is_visible()
    assert page.locator('.desktop-profile>summary').is_visible()
    page.locator('.desktop-profile>summary').click();assert page.get_by_role('button',name='Automatizaciones',exact=True).is_visible()
    page.locator('.desktop-profile>summary').press('Escape')
    if len(sys.argv)>1:
     page.mouse.move(0,0)
     page.screenshot(path=str(Path(sys.argv[1])/f'header-collapsed-{width}.png'),full_page=True)
    page.get_by_role('button',name='Desplegar menú superior',exact=True).press('Enter')
    assert page.locator('#desktop-navigation').is_visible()
    assert page.evaluate('document.querySelector("#ptM2")===originalCalculator')
    assert page.locator('#ptM2').input_value()=='24'
    assert '4.0 L' in page.locator('#ptRes').inner_text()
    assert page.evaluate('state.view')=='proyecto' and page.evaluate('state.currentProject')==9001
   page.locator('.project-options>summary').click()
   page.get_by_role('button',name='Portal del cliente',exact=True).click()
   assert page.locator('#project-tab-panel> .client-project-editor').is_visible()
   assert page.locator('.project-tabs [tabindex="0"]').count()==1,'Portal must keep dock reachable by keyboard'
   assert page.evaluate('fixtureRecords()===fixtureBaseline'),'Navigation changed stored records'
   if width>=1100:
    assert page.locator('#desktop-header .logo').is_hidden()
    assert page.locator('#desktop-header .logo-mini').is_visible()
    assert page.locator('.desktop-profile>summary').evaluate('(e)=>e.scrollHeight<=e.clientHeight')
    assert page.locator('#themeBtn').is_hidden() and page.locator('#brandSwitch').is_hidden()
    page.evaluate("state.notifs=[{txt:'Aviso ficticio',when:'Hoy',read:false}];notifBadge()")
    assert page.locator('#desktop-header #nBadge').inner_text()=='1'
    page.get_by_role('button',name='Notificaciones',exact=True).click()
    assert 'Aviso ficticio' in page.locator('#modalBox').inner_text()
    page.get_by_role('button',name='Marcar leídas y cerrar',exact=True).click()
    assert page.locator('#nBadge').is_hidden()
    page.locator('.desktop-profile>summary').click()
    page.locator('#settings-switch>summary').click()
    assert page.locator('.desktop-profile').get_attribute('open') is not None
    assert page.locator('#settings-switch .settings-popup').is_visible()
    page.locator('#settings-switch>summary').press('Escape')
    page.locator('.desktop-profile>summary').click()
    for tool in ['Automatizaciones','Plugins','Integraciones']:
     assert page.get_by_role('button',name=tool,exact=True).is_visible()
    if len(sys.argv)>1:page.screenshot(path=str(Path(sys.argv[1])/f'profile-tools-{width}.png'),full_page=True)
    page.locator('.desktop-profile>summary').press('Escape')
    if len(sys.argv)>1:
     page.get_by_role('button',name='Finanzas',exact=True).click()
     page.mouse.move(0,0)
     page.locator('#desktop-finance-nav').evaluate('(e)=>Promise.all(e.getAnimations().map(a=>a.finished))')
     page.screenshot(path=str(Path(sys.argv[1])/f'finance-navigation-{width}.png'),full_page=True)
     page.get_by_role('button',name='Volver al menú principal',exact=True).click()
   page.evaluate("projTab('proyecto')")
   metrics=page.locator('.project-overview strong').all_inner_texts()
   assert metrics[:3]==['Sin fecha prevista','1','0%'],metrics
   assert len(metrics)==4
   page.get_by_role('button',name='Ver tareas',exact=True).click();assert page.evaluate('state.projTab')=='tareas'
   page.evaluate("projTab('proyecto')")
   page.get_by_role('button',name='Ver finanzas',exact=True).click();assert page.evaluate('state.projTab')=='fin'
   page.evaluate("projTab('proyecto')")
   page.get_by_role('button',name='Historial de cambios',exact=True).click();assert 'Historial de PR-9001' in page.locator('#modalBox').inner_text()
   page.get_by_role('button',name='Cerrar',exact=True).click()
   assert page.evaluate('fixtureRecords()===fixtureBaseline')
   if width>=1100:
    contrast_navigation(page)
    contrast_total(page)
    cards=page.locator('.project-overview>div').all()
    bounds=[card.bounding_box() for card in cards]
    assert len(set(round(b['y']) for b in bounds))==1,bounds
    assert all(b['width']>=220 for b in bounds),bounds
    for button in ['Ver tareas','Ver finanzas']:
     size=page.get_by_role('button',name=button,exact=True).bounding_box()
     assert size['height']<=40 and size['width']<180,size
   if len(sys.argv)>1:
    page.screenshot(path=str(Path(sys.argv[1])/f'project-overview-light-{width}.png'),full_page=True)
    page.evaluate("document.body.classList.add('dark')")
    page.wait_for_function('getComputedStyle(document.querySelector("#project-tab-tareas svg")).stroke===getComputedStyle(document.body).color')
    if width>=1100:contrast_total(page)
    if width>=1100:contrast_navigation(page)
    page.screenshot(path=str(Path(sys.argv[1])/f'project-overview-dark-{width}.png'),full_page=True)
    page.evaluate("document.body.classList.remove('dark')")
   if width>=1100:
    page.locator('.desktop-profile>summary').click();page.get_by_role('button',name='Ajustes',exact=True).click()
    assert page.evaluate('state.view')=='ajustes'
    assert page.locator('#desktop-header').count()==0
    assert page.locator('aside.sidebar #settings-nav').count()==1
    original_name=page.evaluate('state.sessionUser.name')
    page.locator('#settings-first').fill('Borrador sin guardar')
    page.locator('#settings-nav [data-settings-action=back]').click()
    assert page.evaluate('state.view')=='ajustes'
    assert page.locator('#modalBox').inner_text().find('Tienes cambios sin guardar')>=0
    assert page.evaluate('state.sessionUser.name')==original_name
    page.get_by_role('button',name='Cancelar',exact=True).click()
    assert page.locator('#settings-first').input_value()=='Borrador sin guardar'
    page.locator('#settings-nav [data-settings-action=back]').click()
    page.get_by_role('button',name='Descartar cambios',exact=True).click()
    assert page.evaluate('state.sessionUser.name')==original_name
    page.evaluate("go('proyectos')")
    assert page.locator('#desktop-header').count()==1
   page.evaluate('ModernoDesktopShell.setEnabled(false)')
   assert page.locator('#desktop-header').count()==0
   assert page.locator('aside.sidebar .sb-head').count()==1
   assert not writes,writes
   assert not errors,errors
   assert all(not u.startswith(('https://auth.moderno.app','https://app.moderno.app','https://cgqtylvaapwbuwqvpjtb.supabase.co')) for u in external)
   print(width,'PASS: entire app, all original route renderers and project panels, real SettingsUI, isolated local persistence and rollback; no remote writes')
   page.close()
  browser.close()
finally:
 server.terminate()
 try:server.wait(timeout=5)
 except subprocess.TimeoutExpired:server.kill();server.wait()
