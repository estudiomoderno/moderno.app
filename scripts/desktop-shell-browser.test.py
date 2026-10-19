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
window.meMail=()=> 'persona@example.invalid';
window.toast=s=>calls.push(['toast',s]);window.presenceTrack=()=>{};window.homeRemember=()=>{};window.wsSessionViews=new Set();window.wsViewKey=()=>'';window.portalBootDone=()=>{};
window.ModernoBrands={reset:()=>{}};window.ico=()=>'<svg class="svgi" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';
window.V=document.getElementById('view');window.render=()=>{
 V.innerHTML=state.view==='proyecto'?'<div class="project-detail"><div class="crumbs">Proyectos / <b>PR-1 Proyecto ficticio</b></div><h1>Proyecto ficticio</h1>'+projectTabsHtml(state.projTab)+'<section class="project-tab-panel" id="project-tab-panel" role="tabpanel" aria-labelledby="project-tab-'+state.projTab+'"><h2>'+state.projTab+'</h2><input aria-label="Borrador ficticio" value="Borrador conservado"><p>Contenido ficticio conservado</p></section></div>':'<h1>'+state.view+'</h1>';
};
"""
finance=['facturas','presupuestos','contabilidad','informes','prevision']
def settle_header(page):
 page.wait_for_function('!document.querySelector(".desktop-row").classList.contains("is-toggling")')
def sample_fold(page):
 result=page.evaluate("""()=>{
  const clip=document.querySelector('.desktop-nav-clip'),start=clip.getBoundingClientRect().height;
  document.querySelector('.desktop-toggle').click();
  return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
   const animation=clip.getAnimations().find(a=>a.transitionProperty==='height');
   if(!animation){resolve({start,missing:true});return;}
   animation.pause();animation.currentTime=120;
   const middle=clip.getBoundingClientRect().height;
   animation.finish();resolve({start,middle});
  })));
 }""")
 assert not result.get('missing'),result
 return result
def reveal_route(page,view):
 button=page.locator('#desktop-header [data-desktop-view="'+view+'"]')
 button.evaluate('(b)=>{const d=b.closest("details");if(d)d.open=true;}')
 return button
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
  assert page.locator('#desktop-primary>.desktop-link').evaluate_all('(bs)=>bs.map(b=>b.getAttribute("aria-label"))')==['Inicio','Proyectos','Tareas','Calendario','Agenda','Finanzas','Mail']
  assert page.locator('#desktop-primary .desktop-icon-only>.desktop-label').evaluate_all('(es)=>es.every(e=>getComputedStyle(e).clip!=="auto")')
  brand=page.locator('.desktop-brand');background=brand.evaluate('(e)=>getComputedStyle(e).backgroundColor')
  brand.hover();assert brand.evaluate('(e)=>getComputedStyle(e).backgroundColor')==background
  assert brand.evaluate('(e)=>e.tagName')=='DIV'
  assert brand.get_attribute('tabindex') is None and brand.get_attribute('data-desktop-view') is None
  brand.click();assert page.evaluate('state.view')=='proyecto'
  page.get_by_role('button',name='Inicio',exact=True).click();assert page.evaluate('state.view')=='home'
  assert brand.evaluate('(e)=>getComputedStyle(e).backgroundColor')==background,'Home selection must not tint the logo'
  page.evaluate("go('proyecto',1)")
  page.locator('#desktop-primary [data-desktop-view=proyectos]').hover()
  assert page.locator('#desktop-primary [data-desktop-view=proyectos] .desktop-label').evaluate('(e)=>getComputedStyle(e).clip')=='auto'
  page.mouse.move(0,0)
  page.locator('#desktop-header .desktop-actions>button').click()
  assert page.evaluate('calls.pop()')==['notifications']
  assert page.locator('#desktop-header .desktop-actions>button').evaluate('(e)=>e===originalBell')
  bell=page.locator('#desktop-header .desktop-actions>button').bounding_box()
  profile=page.locator('.desktop-profile>summary').bounding_box()
  row=page.locator('.desktop-row').bounding_box()
  assert page.locator('.desktop-row').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(17, 17, 17)'
  assert page.locator('#desktop-header .logo-mini svg').evaluate('(e)=>getComputedStyle(e).filter')=='invert(1)'
  assert bell['width']==bell['height']==44
  assert profile['x']>=bell['x']+bell['width']
  assert row['x']+row['width']<bell['x']
  assert max(row['y'],bell['y'])-min(row['y'],bell['y'])<12
  assert row['width']==68 and row['height']==1000-48,'Expanded rail must use the available screen height'
  for rect in page.locator('.desktop-nav .desktop-icon-only:visible').evaluate_all('(els)=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width,height:r.height}})'):
   assert rect['x']>=row['x'] and rect['right']<=row['x']+row['width'],rect
   assert rect['width']==rect['height']==44,rect
  assert page.evaluate("originalNodes.every(n=>n.isConnected)")
  assert page.locator('#desktop-header [data-desktop-view]').count()==page.locator('aside.sidebar .nav-item[data-view]:not([data-view=utilidades]):not([data-view=conversaciones]):not([data-view=plantillas])').count()-len(finance)
  assert page.locator('#desktop-header [data-desktop-view=utilidades]').count()==0
  assert page.locator('#desktop-header [data-desktop-view=plantillas],#desktop-header [data-desktop-view=conversaciones]').count()==0
  assert page.locator('.desktop-nav [data-desktop-view]:is([data-desktop-view=automatizaciones],[data-desktop-view=plugins],[data-desktop-view=integraciones])').count()==0
  assert page.locator('.desktop-profile [data-desktop-view]').evaluate_all('(bs)=>bs.map(b=>b.dataset.desktopView)')==['automatizaciones','plugins','integraciones']
  assert page.locator('#desktop-header [data-desktop-view=proyectos]').get_attribute('aria-current')=='page'
  assert page.locator('.project-tabs').bounding_box()['y']>850
  keys=['proyecto','planos','obra','tareas','listas','fin','archivos','ai','conversaciones','utilidades']
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
  # Changing only the navigation group must keep the same editor and unsaved input.
  page.get_by_role('textbox',name='Borrador ficticio').fill('Cambios sin guardar')
  page.evaluate('window.originalDraft=document.querySelector("#view input");dirty=true')
  brand.click();assert page.evaluate('state.view')=='proyecto'
  page.get_by_role('button',name='Inicio',exact=True).click()
  assert page.evaluate('calls.pop()')==['draft','home',None]
  assert page.evaluate('state.view')=='proyecto'
  if width==1440:
   result=sample_fold(page);assert 0<result['middle']<result['start'],result
   page.locator('#desktop-navigation').wait_for(state='hidden');settle_header(page)
   result=sample_fold(page);assert result['start']==0 and 0<result['middle'],result
   settle_header(page)
  page.get_by_role('button',name='Comprimir menú lateral',exact=True).click()
  settle_header(page)
  assert page.locator('#desktop-navigation').is_hidden()
  assert page.locator('#desktop-navigation').evaluate('(e)=>e.inert')
  assert page.locator('.desktop-row [data-desktop-view]:visible').count()==0
  assert page.locator('.desktop-brand .logo-mini').is_visible()
  assert page.locator('.desktop-row').bounding_box()['width']<100
  assert page.locator('.desktop-row').bounding_box()['height']<row['height']/3
  assert page.get_by_role('button',name='Desplegar menú lateral',exact=True).get_attribute('aria-expanded')=='false'
  assert page.get_by_role('button',name='Desplegar menú lateral',exact=True).evaluate('(e)=>document.activeElement===e')
  assert page.evaluate('document.querySelector("#view input")===originalDraft')
  assert page.get_by_role('textbox',name='Borrador ficticio').input_value()=='Cambios sin guardar'
  page.locator('.desktop-profile>summary').click()
  assert page.get_by_role('button',name='Ajustes',exact=True).is_visible()
  page.locator('.desktop-profile>summary').press('Escape')
  page.get_by_role('button',name='Desplegar menú lateral',exact=True).press('Enter')
  settle_header(page)
  assert page.locator('#desktop-navigation').is_visible()
  assert not page.locator('#desktop-navigation').evaluate('(e)=>e.inert')
  page.get_by_role('button',name='Finanzas',exact=True).click()
  assert page.locator('#desktop-primary').is_visible() and page.locator('#desktop-finance-nav').count()==0
  assert page.evaluate('calls.pop()')==['draft','informes',None]
  assert page.evaluate('state.view')=='proyecto'
  assert page.get_by_role('textbox',name='Borrador ficticio').input_value()=='Cambios sin guardar'
  assert page.evaluate('document.querySelector("#view input")===originalDraft')
  page.get_by_role('button',name='Comprimir menú lateral',exact=True).click()
  page.get_by_role('button',name='Desplegar menú lateral',exact=True).click()
  settle_header(page)
  assert page.locator('#desktop-primary').is_visible(),'Finance must keep the general navigation'
  page.evaluate('dirty=false')
  page.get_by_role('button',name='Finanzas',exact=True).click()
  assert page.evaluate('state.view')=='informes'
  assert page.locator('.desktop-finance').evaluate('(e)=>e.classList.contains("is-current")')
  page.evaluate("go('proyecto',1)")
  page.get_by_role('textbox',name='Borrador ficticio').fill('Cambios sin guardar')
  # Compact state and the original unsaved editor survive removal/rebuild at tablet width.
  page.get_by_role('button',name='Comprimir menú lateral',exact=True).click()
  page.set_viewport_size({'width':1024,'height':1000});page.wait_for_function("!document.querySelector('#desktop-header')")
  assert page.get_by_role('textbox',name='Borrador ficticio').input_value()=='Cambios sin guardar'
  page.set_viewport_size({'width':width,'height':1000});page.wait_for_function("!!document.querySelector('#desktop-header')")
  assert page.locator('#desktop-navigation').is_hidden()
  page.get_by_role('button',name='Desplegar menú lateral',exact=True).press('Space')
  settle_header(page)
  assert page.locator('#desktop-navigation').is_visible()
  # Reversing during the actual transition must not leave the navigation clipped or hidden.
  page.evaluate("() => {document.querySelector('.desktop-toggle').click();return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{document.querySelector('.desktop-toggle').click();resolve();})));}")
  settle_header(page)
  assert page.locator('#desktop-navigation').is_visible() and not page.locator('#desktop-navigation').evaluate('(e)=>e.inert')
  page.emulate_media(reduced_motion='reduce')
  page.get_by_role('button',name='Comprimir menú lateral',exact=True).click()
  assert page.locator('#desktop-navigation').is_hidden()
  assert page.locator('.desktop-nav-clip').evaluate('(e)=>e.getAnimations().length')==0
  page.get_by_role('button',name='Desplegar menú lateral',exact=True).click()
  assert page.locator('#desktop-navigation').is_visible()
  page.emulate_media(reduced_motion='no-preference')
  page.evaluate('dirty=true')
  page.locator('#desktop-header [data-desktop-view=workspace]').click()
  assert page.evaluate('state.view')=='proyecto'
  assert page.get_by_role('textbox',name='Borrador ficticio').input_value()=='Cambios sin guardar'
  assert page.evaluate('calls.pop()')==['draft','workspace',None]
  page.evaluate('dirty=false')
  for view in page.locator('#desktop-header [data-desktop-view]').evaluate_all('(bs)=>bs.map(b=>b.dataset.desktopView)'):
   reveal_route(page,view).click()
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
  assert page.locator('.desktop-finance').is_hidden()
  assert page.locator('#project-tab-fin').count()==0
  assert page.locator('#project-tab-utilidades').count()==0
  assert page.locator('#project-tab-conversaciones').count()==0
  assert page.locator('.desktop-profile [data-desktop-view]').evaluate_all('(bs)=>bs.every(b=>b.hidden)')
  page.evaluate("_accessRole='miembro';state.myRole='miembro';render()")
  page.get_by_role('button',name='Finanzas',exact=True).click()
  assert page.evaluate('state.view')=='presupuestos','Finance must open the first authorized section'
  assert page.locator('#desktop-finance-nav').count()==0
  page.evaluate("_accessRole='colaborador';render()")
  assert page.locator('#desktop-primary').is_visible(),'Revoked section must return to the primary menu'
  for role in ['gestoria','cliente','contratista']:
   page.evaluate('(role)=>{_accessRole=role;render()}',role)
   assert page.locator('#desktop-header').count()==0
  page.evaluate("_accessRole='admin';_accessLoading=true;render()")
  assert page.locator('#desktop-header').count()==0
  page.evaluate("_accessLoading=false;render()")
  page.evaluate("_accessRole='admin';state.myRole='admin';state.projTab='archivos';render()")
  if len(sys.argv)>1:page.screenshot(path=str(Path(sys.argv[1])/f'desktop-shell-light-{width}.png'),full_page=True)
  page.evaluate("document.body.classList.add('dark')")
  assert page.locator('#desktop-header .logo-mini svg').evaluate('(el)=>getComputedStyle(el).filter')=='invert(1)'
  # Check accessible header bounds and the project content remains above the dock.
  assert page.locator('.desktop-profile').bounding_box()['x']+page.locator('.desktop-profile').bounding_box()['width']<=width
  assert page.locator('.desktop-nav').bounding_box()['y']>=page.locator('.desktop-brand').bounding_box()['y']+page.locator('.desktop-brand').bounding_box()['height']
  if len(sys.argv)>1:page.screenshot(path=str(Path(sys.argv[1])/f'desktop-shell-{width}.png'),full_page=True)
  # Short windows keep every icon reachable and open the product menu inside the viewport.
  for height in [500,400]:
   page.set_viewport_size({'width':width,'height':height})
   page.wait_for_function('Math.abs(document.querySelector(".desktop-nav-clip").getBoundingClientRect().height-document.querySelector("#desktop-navigation").getBoundingClientRect().height)<0.5&&Math.abs(document.querySelector(".desktop-row").getBoundingClientRect().height-(innerHeight-48))<0.5&&!document.querySelector(".desktop-nav-clip").getAnimations().some(a=>a.playState==="running")')
   last=page.locator('.desktop-group>summary').first
   last.click()
   menu=page.locator('.desktop-group[open]>.desktop-menu');menu.wait_for(state='visible')
   page.wait_for_function('(()=>{const r=document.querySelector(".desktop-group[open]>.desktop-menu").getBoundingClientRect();return r.top>=11&&r.bottom<=innerHeight-11})()')
   box=menu.bounding_box();rail=page.locator('.desktop-row').bounding_box();toggle=page.locator('.desktop-toggle').bounding_box()
   assert abs(rail['height']-(height-48))<0.5,(rail,height)
   assert box['x']>rail['x']+rail['width'] and box['y']>=11 and box['y']+box['height']<=height-11,(box,rail,height)
   assert toggle['y']+toggle['height']<=height,(toggle,height)
   for control in page.locator('.desktop-nav .desktop-icon-only:visible').all():
    rect=control.bounding_box();assert rect['y']>=0 and rect['y']+rect['height']<=height and rect['height']>=28,(rect,height)
   if len(sys.argv)>1:page.screenshot(path=str(Path(sys.argv[1])/f'desktop-shell-short-{width}-{height}.png'),full_page=True)
   last.press('Escape')
   page.locator('.desktop-profile>summary').click()
   box=page.locator('.desktop-profile>.desktop-menu').bounding_box()
   assert box['y']>=0 and box['y']+box['height']<=height-12,(box,height)
   page.locator('.desktop-profile>summary').press('Escape')
  page.set_viewport_size({'width':width,'height':1000})
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
