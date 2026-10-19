"""Full application UI, served by the official isolated server. No SDK or external network.

This exercises actual renderers, router and settings, using synthetic in-memory records.
It does not validate Supabase authentication, RPC or cloud persistence.
"""
from pathlib import Path
import json,os,socket,subprocess,time,urllib.request,sys,re
from playwright.sync_api import sync_playwright,expect

repo=Path(__file__).resolve().parents[1]
def settle_header(page):
 page.wait_for_function('!document.querySelector(".desktop-row").classList.contains("is-toggling")')
finance=['facturas','presupuestos','contabilidad','informes','prevision']
def reveal_route(page,view):
 if view in ['automatizaciones','plugins','integraciones']:
  page.locator('[data-profile-trigger]').click()
  return page.get_by_role('menuitem',name={'automatizaciones':'Automatizaciones','plugins':'Plugins','integraciones':'Integraciones'}[view],exact=True)
 if view in finance:
  if page.locator('#page-route-bar.is-finance').count()==0:page.get_by_role('button',name='Finanzas',exact=True).click()
  return page.locator('#page-route-bar [data-finance-view="'+view+'"]')
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
def neutral_canvas(page):
 # Exercise computed styles on the real renderers, including legacy grid overrides.
 styles=page.evaluate("""()=>{
  const main=getComputedStyle(document.querySelector('.main'));
  const body=getComputedStyle(document.body);
  return {canvas:main.backgroundColor,grid:main.backgroundImage,
   surface:body.getPropertyValue('--app-surface').trim(),control:body.getPropertyValue('--app-control').trim(),
   projects:[...document.querySelectorAll('.projects-identity,#view:has(.projects-identity)')].map(e=>getComputedStyle(e).backgroundImage)};
 }""")
 assert styles['canvas']=='rgb(255, 255, 255)',styles
 assert styles['grid']=='none' and all(v=='none' for v in styles['projects']),styles
 assert styles['surface']=='#fff' and styles['control']=='#eee',styles
def check_header_actions(page,width):
 assert page.locator('.ha-team-group').count()==1
 page.locator('.ha-status').wait_for(state='visible')
 assert page.locator('.ha-status').inner_text()=='Sin conexión'
 assert page.locator('[data-profile-trigger] svg').count()==1
 assert page.locator('.ha-team-group button').count()==2,'No invitation or history actions in the reference'
 page.evaluate("state.notifs=Array.from({length:8},(_,i)=>({txt:'Aviso ficticio '+i,read:false})).concat([{txt:'Leído',read:true}]);notifBadge()")
 assert page.get_by_role('button',name='Notificaciones (8)',exact=True).count()==1
 bell=page.locator('.ha-notification-host .ha-notifications')
 badge=bell.locator('[data-slot=badge]')
 assert badge.inner_text()=='8'
 assert bell.evaluate('(e)=>getComputedStyle(e).height')=='32px'
 assert bell.evaluate('(e)=>getComputedStyle(e).width')=='32px'
 assert bell.locator('svg').evaluate('(e)=>getComputedStyle(e).width')=='16px'
 assert badge.evaluate('(e)=>getComputedStyle(e).height')=='16px'
 assert badge.evaluate('(e)=>getComputedStyle(e).fontSize')=='9.6px'
 assert badge.evaluate('(e)=>getComputedStyle(e).position')=='absolute'
 assert badge.evaluate('(e)=>getComputedStyle(e).top')=='-4px'
 assert badge.evaluate('(e)=>getComputedStyle(e).right')=='-4px'
 assert 'Moderno ReUI Inter' in badge.evaluate('(e)=>getComputedStyle(e).fontFamily')
 assert badge.get_attribute('aria-hidden')=='true'
 assert page.locator('.ha-original-notification').is_hidden()
 if len(sys.argv)>1:page.locator('.ha-notification-host').screenshot(path=str(Path(sys.argv[1])/f'notification-eight-{width}.png'))
 page.get_by_role('button',name='Notificaciones (8)',exact=True).press('Enter')
 assert 'Aviso ficticio 0' in page.locator('#modalBox').inner_text()
 page.get_by_role('button',name='Marcar leídas y cerrar',exact=True).click()
 assert badge.count()==0
 assert bell.get_attribute('aria-label')=='Notificaciones'
 page.evaluate("state.notifs=Array.from({length:123},()=>({txt:'Aviso ficticio',read:false}));notifBadge()")
 assert badge.inner_text()=='99+'
 assert bell.get_attribute('aria-label')=='Notificaciones (123)'
 page.evaluate("state.notifs=[];notifBadge()")
 assert badge.count()==0
 page.evaluate("""()=>{
  const scope=ESTUDIO_ID,key=state.sessionUser.mail;
  const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=';
  teamPresence={snapshot:()=>({status:'online',study:scope,key,members:[{user:'a',name:'Ana ficticia',avatar:image},{user:'b',name:'Luis ficticio',avatar:image},{user:'c',name:'<script>Texto seguro</script>',avatar:'javascript:alert(1)'}]})};
  ModernoHeaderActions.refresh();
 }""")
 assert page.locator('.ha-status').inner_text()=='3 en línea'
 assert page.locator('.ha-status').evaluate('(e)=>getComputedStyle(e).fontSize')=='12px'
 assert page.locator('.ha-avatar').first.evaluate('(e)=>getComputedStyle(e).width')=='20px'
 assert page.locator('[data-profile-trigger]').evaluate('(e)=>getComputedStyle(e).height')=='32px'
 assert 'Moderno ReUI Inter' in page.locator('.ha-status').evaluate('(e)=>getComputedStyle(e).fontFamily')
 page.evaluate('document.fonts.load(\'500 14px "Moderno ReUI Inter"\')')
 assert page.evaluate('document.fonts.check(\'500 14px "Moderno ReUI Inter"\')')
 assert page.locator('.ha-team-group button').first.evaluate('(e)=>getComputedStyle(e).fontSize')=='14px'
 assert page.locator('body').evaluate('(e)=>getComputedStyle(e).fontSize')=='14px'
 assert page.locator('.ha-team-group').get_attribute('data-online')=='true'
 assert page.locator('.ha-members script').count()==0
 page.locator('.ha-members img').first.wait_for()
 assert page.locator('.ha-members img').count()==2
 current_study=page.evaluate('ESTUDIO_ID')
 page.evaluate("ESTUDIO_ID='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';ModernoHeaderActions.refresh()")
 assert page.locator('.ha-status').inner_text()=='Conectando…'
 assert page.locator('.ha-members [title=\"Ana ficticia · conectado\"]').count()==0
 page.evaluate('(study)=>{ESTUDIO_ID=study;ModernoHeaderActions.refresh()}',current_study)
 assert all(s.startswith('data:image/png;') for s in page.locator('.ha-members img').evaluate_all('(es)=>es.map(e=>e.src)'))
 box=page.locator('#desktop-header .desktop-actions,.ha-standalone').bounding_box()
 assert box['x']>=0 and box['x']+box['width']<=width,box
 if width>=1100:
  bar=page.locator('#project-window-bar')
  if bar.count():
   b=bar.bounding_box();assert b['x']+b['width']<=box['x']-8,(b,box)
 else:
  logo=page.locator('#mHeader .mlogo').bounding_box()
  assert logo['x']+logo['width']<box['x'] or logo['y']+logo['height']<box['y'],(logo,box)
  bell=page.locator('.ha-notification-host .ha-notifications').bounding_box()
  group=page.locator('.ha-team-group').bounding_box()
  assert bell['x']>=logo['x']+logo['width'] and bell['y']+bell['height']<group['y'],(bell,group,logo)
 if len(sys.argv)>1:page.screenshot(path=str(Path(sys.argv[1])/f'header-online-{width}.png'),full_page=True)
 page.evaluate("teamPresence=null;state.notifs=[];notifBadge();ModernoHeaderActions.refresh()")
 page.evaluate('ModernoHeaderActions.setEnabled(false)')
 assert page.locator('.ha-team-group,.ha-standalone').count()==0
 if width>=1100:assert page.locator('#desktop-header #topUser').is_visible()
 page.evaluate('ModernoHeaderActions.setEnabled(true)')
 assert page.locator('.ha-team-group').count()==1
 page.locator('.ha-status').wait_for(state='visible')
 assert page.locator('.ha-status').inner_text()=='Sin conexión'
 # Let the rebuilt Base UI root finish its first paint before keyboard input.
 page.locator('.ha-component-host').evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
 page.locator('[data-profile-trigger]').focus()
 page.wait_for_function('(()=>{const s=document.querySelector(".ha-component-host").shadowRoot;return s.activeElement===s.querySelector("[data-profile-trigger]");})()')
 page.locator('[data-profile-trigger]').press('ArrowDown')
 page.get_by_role('menuitem',name='Mi perfil',exact=True).wait_for(state='visible')
 assert page.get_by_role('menuitem',name='Cambiar estudio',exact=True).count()==0
 page.keyboard.press('Escape')
 page.get_by_role('menuitem',name='Mi perfil',exact=True).wait_for(state='hidden')
 page.wait_for_function("(()=>{const s=document.querySelector('.ha-component-host').shadowRoot;return s.activeElement===s.querySelector('[data-profile-trigger]');})()")
def check_finances(page,width):
 # Exercise both original ReUI and native recovery without touching stored records.
 page.evaluate("go('home')")
 if width>=1100:
  page.get_by_role('button',name='Finanzas',exact=True).click()
 else:
  page.evaluate("document.body.classList.add('sbopen')")
  page.locator('#ngFin>.nav-head').click()
  assert not page.evaluate("document.body.classList.contains('sbopen')")
 assert page.evaluate('state.view')=='informes'
 assert page.locator('#ngFin>.nav-head>.nav-group-label').inner_text().strip()=='Finanzas'
 assert page.locator('#ngFin>.nav-head').get_attribute('aria-expanded') is None
 assert page.locator('#ngFin>.nav-sub').is_hidden()
 expected=['Resumen','Facturas','Presupuestos','Contabilidad','Previsión']
 sections=page.get_by_role('navigation',name='Secciones de Finanzas',exact=True)
 sections.wait_for(state='visible')
 expect(sections.get_by_role('button')).to_have_text(expected)
 if width>=1100:
  r=sections.bounding_box();profile=page.locator('[data-profile-trigger]').bounding_box()
  assert abs(r['height']-32)<1 and abs(r['y']+r['height']/2-profile['y']-profile['height']/2)<1,(r,profile)
  assert r['x']+r['width']<profile['x'],(r,profile)
 page.locator('.route-component-host[data-reui-ready=true]').wait_for(state='attached')
 sections.get_by_role('button').first.evaluate('(e)=>Promise.all(e.getAnimations().map(a=>a.finished))')
 if width<1100:
  # The navigation row must not change the widths of the existing finance content.
  original_widths=page.locator('#view .fin-card').evaluate_all('(els)=>els.map(e=>e.getBoundingClientRect().width)')
  page.evaluate('ModernoPageBreadcrumbs.setEnabled(false)')
  assert page.locator('#view .fin-card').evaluate_all('(els)=>els.map(e=>e.getBoundingClientRect().width)')==original_widths
  page.evaluate('ModernoPageBreadcrumbs.setEnabled(true)')
  page.locator('.route-component-host[data-reui-ready=true]').wait_for(state='attached')
  sections.get_by_role('button').first.evaluate('(e)=>Promise.all(e.getAnimations().map(a=>a.finished))')
 if len(sys.argv)>1:page.screenshot(path=str(Path(sys.argv[1])/f'finance-original-{width}.png'),full_page=True)
 for view in ['facturas','presupuestos','contabilidad','prevision','informes']:
  button=page.locator('#page-route-bar [data-finance-view="'+view+'"]')
  button.press('Enter')
  assert page.evaluate('state.view')==view
  active=page.locator('#page-route-bar [data-finance-view="'+view+'"][aria-current=page]')
  active.wait_for(state='visible')
  page.wait_for_function("""(view)=>{const host=document.querySelector('#page-route-bar .route-component-host');const root=host?.shadowRoot||document.querySelector('#page-route-bar');return root.activeElement?.dataset.financeView===view||document.activeElement?.dataset.financeView===view;}""",arg=view)
 # Both invoice/quote drafts retain the native warning; cancel keeps the same data and selected tab.
 for view,kind in [('facturas','factura'),('presupuestos','presupuesto')]:
  page.evaluate('(view)=>go(view)',view)
  page.get_by_role('button',name='Nueva factura' if kind=='factura' else 'Nuevo presupuesto',exact=True).click()
  page.evaluate("state.draft.legend='Borrador financiero ficticio conservado';window.financeDraft=state.draft")
  page.locator('#page-route-bar [data-finance-view=contabilidad]').click()
  assert page.evaluate('state.view')==view
  assert page.locator('#modalBox').inner_text().find('a medias')>=0
  page.get_by_role('button',name='Seguir editando',exact=True).click()
  assert page.evaluate("state.draft===financeDraft && state.draft.legend==='Borrador financiero ficticio conservado'")
  assert page.locator('#page-route-bar [data-finance-view="'+view+'"]').get_attribute('aria-current')=='page'
  page.evaluate("state.draft=null;state.qView=null;state.fView=null;go('home')")
 # Access changes must not expose restricted sections; use the actual native canView().
 page.evaluate("window.financeOriginalAccess=myAccessLevel;myAccessLevel=()=>_accessRole==='miembro'?'miembro':financeOriginalAccess();_accessRole='miembro';state.myRole='miembro';render()")
 if width>=1100:page.get_by_role('button',name='Finanzas',exact=True).click()
 else:
  page.evaluate("document.body.classList.add('sbopen')")
  page.locator('#ngFin>.nav-head').click()
 assert page.evaluate('state.view')=='presupuestos'
 expect(sections.get_by_role('button')).to_have_text(['Presupuestos','Previsión'])
 page.evaluate("_accessRole='colaborador';render()")
 assert page.locator('#page-route-bar.is-finance').count()==0
 assert page.locator('#ngFin').is_hidden()
 page.evaluate("myAccessLevel=financeOriginalAccess;_accessRole='admin';state.myRole='admin';go('home')")
 # Explicit rollback restores the original native Finance group and leaves its handlers usable.
 page.evaluate('ModernoPageBreadcrumbs.setEnabled(false)')
 assert page.locator('#ngFin>.nav-head').inner_text().strip().startswith('Empresa')
 assert page.locator('#ngFin>.nav-head').get_attribute('aria-expanded') is not None
 expanded=page.locator('#ngFin>.nav-head').get_attribute('aria-expanded')
 page.locator('#ngFin>.nav-head').evaluate('(e)=>e.click()')
 assert page.locator('#ngFin>.nav-head').get_attribute('aria-expanded')!=expanded
 page.evaluate('ModernoPageBreadcrumbs.setEnabled(true)')

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
   assert page.evaluate("folderColors({}).front")=='#eeeeee'
   assert page.evaluate("folderColors({color:'#123456'}).front")=='#123456'
   assert page.evaluate("folderColors({color:'salvia'}).front")=='#D3DDC8'
   # The neutral app skin must not recolour printing or the independent client portal.
   for media,portal in [('print',False),('screen',True)]:
    page.emulate_media(media=media)
    page.evaluate('(portal)=>document.body.classList.toggle("portalmode",portal)',portal)
    palette="()=>[getComputedStyle(document.body).getPropertyValue('--bg'),getComputedStyle(document.body).getPropertyValue('--card'),getComputedStyle(document.querySelector('.main')).backgroundColor]"
    before=page.evaluate(palette)
    page.evaluate("document.querySelector('link[href*=\"neutral-theme.css\"]').disabled=true")
    assert page.evaluate(palette)==before,(media,portal)
    page.evaluate("document.querySelector('link[href*=\"neutral-theme.css\"]').disabled=false")
   page.evaluate('document.body.classList.remove("portalmode")')
   page.emulate_media(media='screen')
   assert page.evaluate('LS_KEY')=='moderno_pruebas_ui-fixture'
   check_header_actions(page,width)
   assert page.locator('#desktop-header').count()==(1 if width>=1100 else 0)
   page.evaluate('ModernoDesktopShell.setEnabled(false)')
   assert page.locator('#desktop-header').count()==0
   page.evaluate('ModernoDesktopShell.setEnabled(true)')
   if width>=1100:assert page.locator('#desktop-header').is_visible()
   else:assert page.locator('#desktop-header').count()==0
   if width>=1100:
    page.evaluate("go('proyecto',9001)")
    reference=page.locator('#project-window-bar .pw-tab-select').first
    reference.wait_for(state='visible')
    project_type=reference.evaluate('(e)=>{const s=getComputedStyle(e);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight]}')
    project_box=page.locator('#project-window-bar [data-slot=badge]').first.bounding_box()
   # Warm real renderers once, so their existing normalizations are not attributed to the new shell.
   routes=page.locator('aside.sidebar .nav-item[data-view]:not([data-view=utilidades]):not([data-view=conversaciones])').evaluate_all('(bs)=>bs.map(b=>b.dataset.view)')
   assert page.locator('aside.sidebar [data-view=utilidades]').is_hidden()
   assert page.locator('aside.sidebar [data-view=conversaciones]').is_hidden()
   for view in routes:
    page.evaluate('(view)=>go(view)',view)
    assert page.evaluate('state.view')==view
    assert page.locator('#view').inner_text().strip(),view
    neutral_canvas(page)
    if width>=1100:
     if view=='proyectos':
      assert page.locator('#page-route-bar').count()==0
      page.get_by_role('button',name='Ver todos los proyectos',exact=True).wait_for(state='visible')
     else:
      crumb=page.locator('#page-route-bar [aria-current=page]').last
      crumb.wait_for(state='visible')
      if view in finance:crumb.evaluate('(e)=>Promise.all(e.getAnimations().map(a=>a.finished))')
      expected='Inicio' if view=='home' else 'Agenda' if view=='agenda' else page.locator('aside.sidebar [data-view="'+view+'"]').inner_text().strip()
      if view in finance:expected={'informes':'Resumen','prevision':'Previsión'}.get(view,expected)
      assert crumb.inner_text()==expected,(view,crumb.inner_text())
      assert crumb.evaluate('(e)=>{const s=getComputedStyle(e);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight]}')==project_type,(view,crumb.evaluate('(e)=>{const s=getComputedStyle(e);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight]}'),project_type)
      assert 'Moderno ReUI Inter' in crumb.evaluate('(e)=>getComputedStyle(e).fontFamily')
      card=page.locator('#page-route-bar [data-slot=card]').first.bounding_box()
      assert abs(card['height']-project_box['height'])<1,(view,card,project_box)
      assert abs(card['y']-project_box['y'])<1,(view,card,project_box)
      profile=page.locator('[data-profile-trigger]').bounding_box()
      assert abs(card['y']+card['height']/2-profile['y']-profile['height']/2)<1,(view,card,profile)
      assert card['x']+card['width']<profile['x'],(view,card,profile)
      if view in finance:assert 'Finanzas' in page.locator('#page-route-bar [data-slot=breadcrumb-list]').inner_text()
    else:
     assert page.locator('#page-route-bar').count()==(1 if view in finance else 0)
     if view in finance:
      sections=page.get_by_role('navigation',name='Secciones de Finanzas',exact=True)
      sections.wait_for(state='visible')
      expect(sections.get_by_role('button')).to_have_text(['Resumen','Facturas','Presupuestos','Contabilidad','Previsión'])
      assert sections.locator('[aria-current=page]').inner_text()=={'informes':'Resumen','prevision':'Previsión'}.get(view,page.locator('aside.sidebar [data-view="'+view+'"]').inner_text().strip())
    if view=='workspace':
     page.get_by_role('button',name='Todas las tareas',exact=True).click()
     assert page.locator('.ws-full .kanban .task').count()>0
     assert page.locator('.ws-full .kanban .task').first.evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(245, 245, 245)'
    if len(sys.argv)>1 and view in ['home','proyectos','workspace','contabilidad']:
     page.wait_for_timeout(250)
     page.screenshot(path=str(Path(sys.argv[1])/f'neutral-{view}-{width}.png'),full_page=True)
   check_finances(page,width)
   if width>=1100:
    page.evaluate("go('contabilidad')")
    page.locator('#page-route-bar').get_by_role('button',name='Inicio',exact=True).click()
    assert page.evaluate('state.view')=='home'
    page.evaluate('ModernoPageBreadcrumbs.setEnabled(false)')
    assert page.locator('#page-route-bar').count()==0
    page.evaluate('ModernoPageBreadcrumbs.setEnabled(true)')
    page.locator('#page-route-bar [aria-current=page]').wait_for(state='visible')
    assert page.locator('#page-route-bar [aria-current=page]').inner_text()=='Inicio'
    page.evaluate('document.querySelector(".route-component-host").shadowRoot.querySelector("link").dispatchEvent(new Event("error"))')
    page.locator('.route-component-host').wait_for(state='detached')
    assert page.locator('#page-route-bar [aria-current=page]').inner_text()=='Inicio'
    page.evaluate("go('contabilidad')")
    page.locator('#page-route-bar').get_by_role('button',name='Inicio',exact=True).click()
    assert page.evaluate('state.view')=='home'
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
    neutral_canvas(page)
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
    page.locator('.desktop-brand').click();assert page.evaluate('state.view')=='proyecto'
    assert page.locator('#desktop-primary [data-desktop-view=home] svg').count()==1
    page.get_by_role('button',name='Inicio',exact=True).click();assert page.evaluate('state.view')=='home'
    page.evaluate("go('proyecto',9001);projTab('utilidades')")
    page.locator('#ptM2').fill('24')
    page.evaluate('window.originalCalculator=document.querySelector("#ptM2")')
    page.get_by_role('button',name='Comprimir menú lateral',exact=True).click()
    settle_header(page)
    page.locator('#desktop-navigation').wait_for(state='hidden')
    assert page.locator('#desktop-navigation').is_hidden()
    assert page.locator('.desktop-row').bounding_box()['width']<100
    assert page.locator('.desktop-brand').is_visible()
    assert page.locator('[data-profile-trigger]').is_visible()
    page.locator('[data-profile-trigger]').click();page.get_by_role('menuitem',name='Automatizaciones',exact=True).wait_for(state='visible')
    page.locator('[data-profile-trigger]').press('Escape')
    if len(sys.argv)>1:
     page.mouse.move(0,0)
     page.screenshot(path=str(Path(sys.argv[1])/f'header-collapsed-{width}.png'),full_page=True)
    page.get_by_role('button',name='Desplegar menú lateral',exact=True).press('Enter')
    settle_header(page)
    assert page.locator('#desktop-navigation').is_visible()
    assert page.evaluate('document.querySelector("#ptM2")===originalCalculator')
    assert page.locator('#ptM2').input_value()=='24'
    assert '4.0 L' in page.locator('#ptRes').inner_text()
    assert page.evaluate('state.view')=='proyecto' and page.evaluate('state.currentProject')==9001
   page.locator('[data-project-settings-trigger]').click()
   page.get_by_role('menuitem',name='Portal del cliente',exact=True).click()
   assert page.locator('#project-tab-panel> .client-project-editor').is_visible()
   assert page.locator('.project-tabs [tabindex="0"]').count()==1,'Portal must keep dock reachable by keyboard'
   assert page.evaluate('fixtureRecords()===fixtureBaseline'),'Navigation changed stored records'
   if width>=1100:
    assert page.locator('#desktop-header .logo').is_hidden()
    assert page.locator('#desktop-header .logo-mini').is_visible()
    assert page.locator('[data-profile-trigger]').evaluate('(e)=>e.scrollHeight<=e.clientHeight')
    assert page.locator('#themeBtn').is_hidden() and page.locator('#brandSwitch').is_hidden()
    page.evaluate("state.notifs=[{txt:'Aviso ficticio',when:'Hoy',read:false}];notifBadge()")
    assert page.locator('#desktop-header #nBadge').inner_text()=='1'
    page.get_by_role('button',name=re.compile(r'^Notificaciones')).click()
    assert 'Aviso ficticio' in page.locator('#modalBox').inner_text()
    page.get_by_role('button',name='Marcar leídas y cerrar',exact=True).click()
    assert page.locator('#nBadge').is_hidden()
    page.locator('[data-profile-trigger]').click()
    assert page.get_by_role('menuitem',name='Cambiar estudio',exact=True).count()==0
    for tool in ['Automatizaciones','Plugins','Integraciones']:
     page.get_by_role('menuitem',name=tool,exact=True).wait_for(state='visible')
    if len(sys.argv)>1:page.screenshot(path=str(Path(sys.argv[1])/f'profile-tools-{width}.png'),full_page=True)
    page.locator('[data-profile-trigger]').press('Escape')
    page.get_by_role('button',name='Finanzas',exact=True).click()
    assert page.evaluate('state.view')=='informes'
    assert page.locator('#desktop-primary').is_visible() and page.locator('#desktop-finance-nav').count()==0
    sections=page.get_by_role('navigation',name='Secciones de Finanzas',exact=True)
    expect(sections.get_by_role('button')).to_have_text(['Resumen','Facturas','Presupuestos','Contabilidad','Previsión'])
    rect=sections.bounding_box();profile=page.locator('[data-profile-trigger]').bounding_box()
    assert abs(rect['y']+rect['height']/2-profile['y']-profile['height']/2)<1
    assert rect['x']+rect['width']<profile['x']
    if len(sys.argv)>1:page.screenshot(path=str(Path(sys.argv[1])/f'finance-navigation-{width}.png'),full_page=True)
    page.evaluate("go('proyecto',9001)")
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
    assert page.locator('.main').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(32, 32, 32)'
    assert page.locator('.main').evaluate('(e)=>getComputedStyle(e).backgroundImage')=='none'
    page.wait_for_function('getComputedStyle(document.querySelector("#project-tab-tareas svg")).stroke===getComputedStyle(document.body).color')
    if width>=1100:contrast_total(page)
    if width>=1100:contrast_navigation(page)
    page.screenshot(path=str(Path(sys.argv[1])/f'project-overview-dark-{width}.png'),full_page=True)
    page.evaluate("document.body.classList.remove('dark')")
   if width>=1100:
    page.locator('[data-profile-trigger]').click();page.get_by_role('menuitem',name='Ajustes',exact=True).click()
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
   page.evaluate('ModernoHeaderActions.refresh()')
   assert page.locator('.ha-component-host').count()==1
   page.evaluate('(selector)=>document.querySelector(selector).shadowRoot.querySelector("link").dispatchEvent(new Event("error"))','.ha-notification-host' if width==390 else '.ha-component-host')
   page.locator('.ha-component-host').wait_for(state='detached')
   assert page.locator('.ha-notification-host,.ha-original-notification').count()==0
   assert page.locator('.ha-notifications').is_visible()
   assert page.locator('.ha-team-group').count()==1
   assert page.locator('.desktop-profile>summary').is_visible()
   assert page.evaluate('fixtureRecords()===fixtureBaseline'),'CSS recovery changed records'
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
