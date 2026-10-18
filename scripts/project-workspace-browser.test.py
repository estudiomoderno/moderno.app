"""Real project tabs against the official isolated server, with fictitious data and no backend."""
from pathlib import Path
import os,socket,subprocess,time,urllib.request,sys
from playwright.sync_api import sync_playwright
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
  for width in [1440,1100,390]:
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
    state.projects=[9001,9002].map((id,i)=>({...structuredClone(template),id,num:'PR-'+id,name:i?'Proyecto ficticio con un nombre largo para comprobar las pestañas':'Proyecto de ejemplo',client:i?'Cliente Álvaro ficticio':'Cliente ficticio',tpl:false,brand:'cm',tags:['Ejemplo'],tasks:[],files:[{name:'Plano de ejemplo.png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='}],notes:'Nota ficticia conservada',rooms:[{id:id+100,kind:'estancia',name:'Estancia ficticia',sections:[{id:'section-'+id,name:'General',items:[]}]}],links:{drive:'',rayon:''}}));
    state.clients=[{name:'Cliente ficticio',type:'Cliente',brand:'cm',email:'cliente@example.invalid'},{name:'Cliente Álvaro ficticio',type:'Cliente',brand:'cm',email:'alvaro@example.invalid'}];state.users=[{name:'Persona ficticia',email:'persona@example.invalid',role:'Administrador'}];
    state.entries=[];state.invoices=[];state.quotes=[];state.library=[];state.catalog=[];state.docs=[];state.notifs=[];
    applySessionUI();drawBrandSwitch();showLogin(false);
    for(const id of [9001,9002]){go('proyecto',id);for(const section of ['proyecto','planos','tareas','listas','fin','archivos','cliente','utilidades'])projTab(section);}
    go('proyecto',9001);projTab('planos');ModernoProjectWorkspace.close(9002);
    window.records=()=>JSON.stringify({projects:state.projects,clients:state.clients,entries:state.entries,invoices:state.invoices,quotes:state.quotes});window.baseline=records();
   }""")
   assert page.evaluate('sb===null')
   if width<1100:
    assert page.locator('#project-window-bar').count()==0
    assert page.locator('#view .project-detail-head').is_visible()
    page.evaluate('projectOpen(9002)');assert page.evaluate('state.currentProject')==9002 and page.evaluate('state.projTab')=='proyecto'
    assert page.evaluate('records()===baseline')
    assert not errors,errors;assert not writes,writes
    print(width,'PASS: original mobile navigation and project heading unchanged');page.close();continue
   tabs=page.locator('#project-window-bar [role=tab]')
   assert tabs.count()==1
   page.evaluate('window.originalOptions=document.querySelector(".project-options")')
   page.evaluate('ModernoProjectWorkspace.setEnabled(false)')
   before=page.locator('#project-tab-panel').bounding_box()['y']
   assert page.locator('#view .project-detail-head').is_visible()
   page.evaluate('ModernoProjectWorkspace.setEnabled(true)')
   after=page.locator('#project-tab-panel').bounding_box()['y'];assert before-after>100,(before,after)
   assert page.evaluate('originalOptions===document.querySelector(".project-options")')
   assert page.locator('#view .project-detail-head').count()==0
   assert not page.locator('#view .crumbs').is_visible()
   page.get_by_label('Información del proyecto',exact=True).click()
   assert page.locator('.pw-info .project-client-link').inner_text()=='Cliente ficticio'
   assert '#Ejemplo' in page.locator('.pw-info').inner_text()
   page.locator('.pw-info .project-client-link').click();assert 'Cliente ficticio' in page.locator('#modalBox').inner_text();page.evaluate('closeModal()')
   page.locator('.pw-info>summary').press('Escape')
   page.get_by_role('button',name='Abrir otro proyecto',exact=True).click()
   page.get_by_role('searchbox',name='Buscar proyecto para abrir',exact=True).fill('alvaro')
   choices=page.locator('.pw-project-choice');assert choices.count()==1
   choices.click();assert page.evaluate('state.currentProject')==9002 and page.evaluate('state.projTab')=='proyecto'
   assert tabs.count()==2;assert page.locator('.pw-tab-title').last.evaluate('e=>e.scrollWidth>e.clientWidth')
   page.locator('#project-tab-tareas').click()
   page.locator('#project-window-9001').click();assert page.evaluate('state.projTab')=='planos'
   assert page.url.endswith('/es/proyecto/9001')
   page.locator('#project-window-9002').click();assert page.evaluate('state.projTab')=='tareas'
   page.evaluate('window.originalPanel=document.querySelector("#project-tab-panel")')
   page.locator('#project-window-9002').click();assert page.evaluate('originalPanel===document.querySelector("#project-tab-panel")')
   page.locator('#project-tab-utilidades').click();page.locator('#ptM2').fill('48')
   page.locator('#project-window-9001').click();page.locator('#project-tab-utilidades').click();page.locator('#ptM2').fill('24')
   page.locator('#project-window-9002').click();assert page.locator('#ptM2').input_value()=='48' and '8.0 L' in page.locator('#ptRes').inner_text()
   page.locator('#project-window-9001').click();assert page.locator('#ptM2').input_value()=='24' and '4.0 L' in page.locator('#ptRes').inner_text()
   page.locator('#project-tab-listas').click();page.evaluate('openRoom(9001,9101)');assert page.evaluate('state.view')=='estancia'
   page.locator('#project-window-9002').click();page.locator('#project-window-9001').click();assert page.evaluate('state.view')=='estancia' and page.evaluate('state.currentRoom')==9101
   page.evaluate("go('proyecto',9001);projTab('planos')")
   page.locator('.project-options>summary').click();page.get_by_role('button',name='Editar datos',exact=True).click()
   page.locator('#czName').fill('Nombre ficticio sin guardar')
   assert not page.evaluate('ModernoProjectWorkspace.open(9002)');assert not page.evaluate('ModernoProjectWorkspace.close(9001)')
   assert page.locator('#czName').input_value()=='Nombre ficticio sin guardar';assert tabs.count()==2
   assert page.evaluate('state.currentProject')==9001 and page.evaluate('records()===baseline')
   page.wait_for_function('!document.querySelector(".project-options").open');page.evaluate('closeModal()')
   page.locator('.project-options>summary').click();page.get_by_role('button',name='Portal del cliente',exact=True).click()
   page.evaluate('ClientPortalSite.setWelcomeEditing(true)');page.locator('#cliWelTa').fill('Bienvenida ficticia pendiente')
   assert not page.evaluate('ModernoProjectWorkspace.open(9002)');assert page.locator('#cliWelTa').input_value()=='Bienvenida ficticia pendiente'
   page.evaluate('ClientPortalSite.setWelcomeEditing(false)')
   page.evaluate("projTab('planos');projectPlanOpen(9001,0)")
   page.wait_for_function('!!document.querySelector("dialog[open]")')
   assert not page.evaluate('ModernoProjectWorkspace.open(9002)');assert page.locator('dialog[open]').count()==1
   page.evaluate('projectPlanDialog.dismiss(true)');page.wait_for_function('!document.querySelector("dialog[open]")')
   # Closing an inactive tab must preserve current controls and never delete its project.
   page.evaluate('window.originalPanel=document.querySelector("#project-tab-panel")')
   page.get_by_role('button',name='Cerrar pestaña de PR-9002',exact=False).click()
   assert tabs.count()==1 and page.evaluate('state.projects.length')==2
   assert page.evaluate('originalPanel===document.querySelector("#project-tab-panel")')
   page.evaluate('projectOpen(9002)');assert tabs.count()==2
   page.locator('#project-window-9002').press('ArrowLeft');assert page.evaluate('state.currentProject')==9001
   page.locator('#project-window-9001').press('End');assert page.evaluate('state.currentProject')==9002
   page.locator('#project-window-9002').press('Home');assert page.evaluate('state.currentProject')==9001
   if output:
    page.wait_for_function('!document.querySelector("#view").getAnimations().some(a=>a.playState==="running")')
    page.wait_for_function('getComputedStyle(document.querySelector("#toast")).opacity==="0"')
    page.mouse.move(0,0);page.screenshot(path=str(output/f'project-windows-light-{width}.png'),full_page=True)
    page.evaluate("document.body.classList.add('dark')");page.screenshot(path=str(output/f'project-windows-dark-{width}.png'),full_page=True);page.evaluate("document.body.classList.remove('dark')")
   page.locator('#project-window-9001').press('Delete');assert page.evaluate('state.currentProject')==9002 and tabs.count()==1
   page.locator('#project-window-9002').press('Delete');assert page.evaluate('state.view')=='proyectos' and page.locator('#project-window-bar').count()==0 and page.evaluate('state.projects.length')==2
   assert page.evaluate('records()===baseline')
   # Many tabs remain inside the viewport; untrusted names are text, never markup.
   page.evaluate("""()=>{const base=structuredClone(state.projects[0]);for(let i=0;i<12;i++)state.projects.push({...structuredClone(base),id:9020+i,num:'PR-'+(9020+i),name:i===11?'<img src=x onerror=window.attacked=1>':'Proyecto adicional ficticio '+i});for(let i=0;i<12;i++)projectOpen(9020+i);} """)
   assert tabs.count()==12
   assert page.locator('.pw-tabs').evaluate('e=>e.scrollWidth>e.clientWidth')
   box=page.locator('#project-window-9031').bounding_box();assert 0<=box['x'] and box['x']+box['width']<=width,box
   assert page.locator('.pw-tab-title img').count()==0 and page.evaluate('typeof window.attacked')=='undefined'
   page.evaluate("state.brandFilter='not-a-visible-space';render()")
   assert page.locator('#project-window-bar').count()==0
   page.evaluate("state.brandFilter='all';projectOpen(9001);projectOpen(9002)")
   # Session/space and access changes cannot retain names from a previous scope.
   page.evaluate('projectOpen(9001);projectOpen(9002);state.sessionUser.id="another-fictional-user";render()')
   assert tabs.count()==1 and page.locator('#project-window-9001').count()==0
   page.evaluate('state.projects=state.projects.filter(p=>p.id!==9002);render()')
   assert page.locator('#project-window-bar').count()==0
   page.evaluate('_accessRole="cliente";render()');assert page.locator('#project-window-bar').count()==0
   assert not errors,errors;assert not writes,writes
   assert all(not u.startswith(('https://auth.moderno.app','https://app.moderno.app')) for u in external)
   print(width,f'PASS: project tabs, search, sections, room and calculator memory; {before-after:.0f}px gained; safe close, pending drafts, keyboard, identity and access; no writes')
   page.close()
  browser.close()
finally:
 server.terminate()
 try:server.wait(timeout=5)
 except subprocess.TimeoutExpired:server.kill();server.wait()
