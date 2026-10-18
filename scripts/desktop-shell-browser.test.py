"""Offline #49 navigation regression: actual shell, tabs and go/projTab handlers, synthetic state."""
from pathlib import Path
import re,sys,json
from playwright.sync_api import sync_playwright

repo=Path(__file__).resolve().parents[1]
source=(repo/'app/index.html').read_text()
shell=source[source.index('<div class="app">'):source.index('<div id="loginScreen"')]
inline=source[source.index('<style>')+7:source.index('</style>')]
go=source[source.index('function go(view, arg)'):source.index('drawBrandSwitch();',source.index('function go(view, arg)'))]
proj=source[source.index('function projTab(t)'):source.index('var _accessRole=',source.index('function projTab(t)'))]
fixture="""
window.calls=[];window._wantProject=null;window._accessLoading=false;window._accessRole='admin';
window.state={view:'proyecto',myRole:'admin',currentProject:1,projTab:'archivos',account:{name:'Estudio ficticio'},sessionUser:{name:'Persona ficticia'},projects:[{id:1,num:'PR-1',name:'Proyecto ficticio',tasks:[{id:'task-original',title:'Tarea conservada',col:'pend',who:['Equipo ficticio']}],files:[{id:'file-original',name:'Plano ficticio.pdf',ref:'private-path-original'}],rooms:[{id:8,name:'Estancia ficticia'}]}],invoices:[{ref:'FA-1',total:123}],quotes:[{id:9}],entries:[{id:5}],history:[{id:4}]};
window.baseline=JSON.stringify({projects:state.projects,invoices:state.invoices,quotes:state.quotes,entries:state.entries,history:state.history});
window.dirty=false;window.draftEditing=()=>dirty;window.draftDirty=()=>dirty;window.draftExitModal=(...args)=>calls.push(['draft',...args]);
window.SettingsUI={open:s=>{calls.push(['settings',s]);go('ajustes');}};window.userModal=()=>calls.push(['profile']);window.notifModal=()=>calls.push(['notifications']);
window.sb={};window.ESTUDIO_ID='fictional-study';
window.toast=s=>calls.push(['toast',s]);window.presenceTrack=()=>{};window.homeRemember=()=>{};window.wsSessionViews=new Set();window.wsViewKey=()=>'';window.portalBootDone=()=>{};
window.ModernoBrands={reset:()=>{}};window.ico=()=>'<svg class="svgi" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';
window.V=document.getElementById('view');window.render=()=>{
 V.innerHTML=state.view==='proyecto'?'<div class="project-detail"><div class="crumbs">Proyectos / <b>PR-1 Proyecto ficticio</b></div><h1>Proyecto ficticio</h1>'+projectTabsHtml(state.projTab)+'<section class="project-tab-panel" id="project-tab-panel" role="tabpanel" aria-labelledby="project-tab-'+state.projTab+'"><h2>'+state.projTab+'</h2><input aria-label="Borrador ficticio" value="Borrador conservado"><p>Contenido ficticio conservado</p></section></div>':'<h1>'+state.view+'</h1>';
};
"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [1440,1280,1100,1024,390]:
  page=browser.new_page(viewport={'width':width,'height':1000});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def route(r):
   # Font assets only: no SDK, no backend, no private content and no network.
   pathname=r.request.url.split('://',1)[-1].split('/',1)[-1].split('?',1)[0]
   if pathname.startswith('brand/acorn/') and '..' not in pathname:
    f=repo/'app'/pathname
    if f.is_file():r.fulfill(body=f.read_bytes(),content_type='font/ttf');return
   r.abort()
  page.route('**/*',route)
  page.set_content('<meta name="viewport" content="width=device-width"><base href="http://offline.invalid/"><style>'+inline+'</style>'+shell+'<button id="syncTag">Guardado ficticio</button>')
  for css in re.findall(r'<link[^>]+href="(/[^"?]+\.css)',source):
   path=repo/'app'/css.lstrip('/')
   if path.is_file():page.add_style_tag(path=str(path))
  page.evaluate("document.querySelector('#sidebarStudy').innerHTML='<details id=\"settings-switch\" class=\"settings-switch\"><summary>Estudio ficticio</summary><div class=\"settings-popup\"><button>Historial de versiones</button></div></details>';document.querySelector('#topUserName').textContent='Persona';document.querySelector('#brandSwitch').innerHTML='<button>Espacio ficticio</button>'")
  page.add_script_tag(content=fixture)
  page.add_script_tag(content=source[source.index('const VIEW_DENY ='):source.index('function applyRoleNav()')])
  page.add_script_tag(content=source[source.index('const ICONS ='):source.index('/* =================== ROUTER')])
  page.add_script_tag(content=(repo/'app/project-ui.js').read_text())
  page.add_script_tag(content=proj+go)
  page.evaluate('render()')
  logos=page.locator('.sb-head').evaluate('(el)=>el.innerHTML')
  page.evaluate("window.originalBell=document.querySelector('#nBadge').closest('button');window.originalBellHTML=originalBell.innerHTML;window.originalBellLabel=originalBell.getAttribute('aria-label')")
  nodes=page.evaluate("()=>{window.originalNodes=['.sb-head','#topUser','#sidebarStudy','.topbar'].map(s=>document.querySelector(s));return true}")
  page.add_script_tag(path=str(repo/'app/settings-icons.js'))
  page.add_script_tag(path=str(repo/'app/desktop-shell.js'))
  assert page.locator('#desktop-header').count()==(1 if width>=1100 else 0)
  page.evaluate('ModernoDesktopShell.setEnabled(false)')
  assert page.locator('#desktop-header').count()==0,'explicit rollback must restore the old UI'
  page.evaluate('ModernoDesktopShell.setEnabled(true)')
  if width<1100:
   assert page.locator('#desktop-header').count()==0
   assert page.locator('aside.sidebar .sb-head').evaluate('(el)=>el.innerHTML')==logos
   print(width,'PASS: unchanged tablet/mobile navigation, inactive desktop shell')
   assert not errors,errors;page.close();continue
  assert page.locator('#desktop-header .sb-head').evaluate('(el)=>el.innerHTML')==logos
  assert page.locator('#desktop-header .logo').is_hidden()
  assert page.locator('#desktop-header .logo-mini').is_visible()
  assert page.locator('.main>.topbar').is_hidden()
  assert page.locator('#themeBtn').is_hidden()
  assert page.locator('#brandSwitch').is_hidden()
  assert page.locator('#desktop-header').evaluate('(e)=>getComputedStyle(e).position')=='fixed'
  assert page.locator('#desktop-header .desktop-context').count()==0
  assert page.locator('#desktop-header .desktop-nav').locator('> .desktop-link').all_inner_texts()==['Proyectos','Tareas','Calendario','Agenda','Mail']
  page.locator('#desktop-header .desktop-actions>button').click()
  assert page.evaluate('calls.pop()')==['notifications']
  assert page.locator('#desktop-header .desktop-actions>button').evaluate('(e)=>e===originalBell')
  bell=page.locator('#desktop-header .desktop-actions>button').bounding_box()
  profile=page.locator('.desktop-profile>summary').bounding_box()
  row=page.locator('.desktop-row').bounding_box()
  assert bell['width']==bell['height']==44
  assert profile['x']>=bell['x']+bell['width']
  assert row['x']+row['width']<bell['x']
  assert max(row['y'],bell['y'])-min(row['y'],bell['y'])<12
  for rect in page.locator('.desktop-nav>button,.desktop-nav>details>summary,.desktop-collapse').evaluate_all('(els)=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right}})'):
   assert rect['x']>=row['x'] and rect['right']<=row['x']+row['width'],rect
  assert page.evaluate("originalNodes.every(n=>n.isConnected)")
  assert page.locator('#desktop-header [data-desktop-view]').count()==page.locator('aside.sidebar .nav-item[data-view]:not([data-view=utilidades])').count()
  assert page.locator('#desktop-header [data-desktop-view=utilidades]').count()==0
  assert page.locator('#desktop-header [data-desktop-view=proyectos]').get_attribute('aria-current')=='page'
  assert page.locator('.project-tabs').bounding_box()['y']>850
  keys=['proyecto','planos','obra','tareas','listas','fin','archivos','ai','utilidades']
  assert page.locator('.project-tabs [role=tab]').evaluate_all('(bs)=>bs.map(b=>b.id.replace("project-tab-",""))')==keys
  assert page.locator('.project-tabs [role=separator]').count()==5
  dock=page.locator('.project-tabs').bounding_box()
  assert dock['x']>0 and dock['x']+dock['width']<width
  assert page.locator('.project-tabs').evaluate('(e)=>e.scrollWidth<=e.clientWidth')
  for key in keys:
   page.locator('#project-tab-'+key).click();assert page.evaluate('state.projTab')==key
   assert page.locator('#project-tab-'+key).get_attribute('aria-selected')=='true'
  page.locator('#project-tab-utilidades').press('Home');assert page.evaluate('state.projTab')=='proyecto'
  page.locator('#project-tab-proyecto').press('ArrowRight');assert page.evaluate('state.projTab')=='planos'
  page.locator('#project-tab-planos').press('End');assert page.evaluate('state.projTab')=='utilidades'
  page.locator('#project-tab-utilidades').hover()
  label=page.locator('#project-tab-utilidades .project-tab-label')
  assert label.inner_text()=='Utilidades' and label.bounding_box()['y']<dock['y']
  page.mouse.move(0,0);page.locator('#project-tab-utilidades').blur()
  assert label.evaluate('(e)=>getComputedStyle(e).clip')!='auto'
  page.get_by_role('button',name='Comprimir menú superior',exact=True).click()
  assert page.get_by_role('button',name='Expandir menú superior',exact=True).get_attribute('aria-expanded')=='false'
  page.get_by_role('button',name='Expandir menú superior',exact=True).click()
  # Open/close/collapse/resizing never rerender or discard the active editor input.
  page.get_by_role('textbox',name='Borrador ficticio').fill('Cambios sin guardar')
  page.set_viewport_size({'width':1024,'height':1000});page.wait_for_function("!document.querySelector('#desktop-header')")
  assert page.get_by_role('textbox',name='Borrador ficticio').input_value()=='Cambios sin guardar'
  page.set_viewport_size({'width':width,'height':1000});page.wait_for_function("!!document.querySelector('#desktop-header')")
  page.evaluate('dirty=true')
  page.locator('#desktop-header [data-desktop-view=workspace]').click()
  assert page.evaluate('state.view')=='proyecto'
  assert page.get_by_role('textbox',name='Borrador ficticio').input_value()=='Cambios sin guardar'
  assert page.evaluate('calls.pop()')==['draft','workspace',None]
  page.evaluate('dirty=false')
  for view in page.locator('#desktop-header [data-desktop-view]').evaluate_all('(bs)=>bs.map(b=>b.dataset.desktopView)'):
   page.evaluate('(view)=>{const b=document.querySelector(`[data-desktop-view="${view}"]`);const d=b.closest("details");if(d)d.open=true;b.click();}',view)
   assert page.evaluate('state.view')==view,view
  # Profile uses original actions; settings fall back to the unchanged sidebar UI.
  page.locator('.desktop-profile>summary').click();page.get_by_role('button',name='Mi perfil',exact=True).click();assert page.evaluate('calls.pop()')==['profile']
  page.locator('.desktop-profile>summary').click();page.locator('#settings-switch>summary').click()
  assert page.locator('.desktop-profile').get_attribute('open') is not None
  assert page.locator('#settings-switch').get_attribute('open') is not None
  page.locator('#settings-switch>summary').press('Escape')
  page.locator('.desktop-profile>summary').click();page.get_by_role('button',name='Ajustes',exact=True).click();assert page.evaluate('state.view')=='ajustes';assert page.locator('#desktop-header').count()==0
  page.evaluate("go('proyecto',1)")
  page.locator('.desktop-group>summary').first.click();page.locator('.desktop-group>summary').first.press('Escape');assert page.locator('.desktop-group[open]').count()==0
  page.evaluate("_accessRole='colaborador';render()")
  assert page.locator('#desktop-header [data-desktop-view=contabilidad]').is_hidden()
  assert page.locator('#project-tab-fin').count()==0
  assert page.locator('#project-tab-utilidades').count()==0
  for role in ['gestoria','cliente','contratista']:
   page.evaluate('(role)=>{_accessRole=role;render()}',role)
   assert page.locator('#desktop-header').count()==0
  page.evaluate("_accessRole='admin';_accessLoading=true;render()")
  assert page.locator('#desktop-header').count()==0
  page.evaluate("_accessLoading=false;render()")
  page.evaluate("_accessRole='admin';state.projTab='archivos';render()")
  if len(sys.argv)>1:page.screenshot(path=str(Path(sys.argv[1])/f'desktop-shell-light-{width}.png'),full_page=True)
  page.evaluate("document.body.classList.add('dark')")
  assert page.locator('#desktop-header .logo-mini svg').evaluate('(el)=>getComputedStyle(el).filter')=='invert(1)'
  # Check accessible header bounds and the project content remains above the dock.
  assert page.locator('.desktop-profile').bounding_box()['x']+page.locator('.desktop-profile').bounding_box()['width']<=width
  assert page.locator('.desktop-nav').bounding_box()['x']>=page.locator('.desktop-brand').bounding_box()['x']+page.locator('.desktop-brand').bounding_box()['width']
  if len(sys.argv)>1:page.screenshot(path=str(Path(sys.argv[1])/f'desktop-shell-{width}.png'),full_page=True)
  page.evaluate('ModernoDesktopShell.setEnabled(false)')
  assert page.locator('#desktop-header').count()==0
  assert page.locator('aside.sidebar .sb-head').evaluate('(el)=>el.innerHTML')==logos
  assert page.evaluate("originalBell.parentElement.classList.contains('topbar')&&originalBell.innerHTML===originalBellHTML&&originalBell.getAttribute('aria-label')===originalBellLabel")
  assert page.evaluate("originalNodes.every(n=>n.isConnected)")
  assert page.evaluate("JSON.stringify({projects:state.projects,invoices:state.invoices,quotes:state.quotes,entries:state.entries,history:state.history})===baseline")
  assert not errors,errors
  print(width,'PASS: all original routes/tabs, keyboard, role filtering, drafts, original logo nodes and rollback; records unchanged')
  page.close()
 browser.close()
