"""Issue #204: contextual project tools reuse the plan-editor dock without external writes."""
from pathlib import Path
import ast,base64,os,socket,subprocess,time,urllib.request,sys
from playwright.sync_api import sync_playwright,expect

repo=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]) if len(sys.argv)>1 else None
if output: output.mkdir(parents=True,exist_ok=True)
parsed=ast.parse((repo/'scripts/shopping-loading-browser.test.py').read_text())
setup=next(ast.literal_eval(n.value) for n in parsed.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='fixture_setup' for t in n.targets))
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://issue-204-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_204'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))

def toolbar_shot(page,name,bar):
 dock=page.locator('.project-dock').bounding_box();tools=bar.bounding_box()
 box={'x':min(dock['x'],tools['x'])-8,'y':min(dock['y'],tools['y'])-8,'width':max(dock['x']+dock['width'],tools['x']+tools['width'])-min(dock['x'],tools['x'])+16,'height':max(dock['y']+dock['height'],tools['y']+tools['height'])-min(dock['y'],tools['y'])+16}
 page.screenshot(path=str(output/name),clip=box)

try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as response: assert 'moderno_pruebas_issue-204-fixture' in response.read().decode()
   break
  except OSError: time.sleep(.05)
 else: raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as playwright:
  browser=playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':900});errors=[];writes=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  def route(r):
   if r.request.url.startswith('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/'):
    path=Path(os.environ['PDFJS_DIR'])/r.request.url.rsplit('/',1)[-1];r.fulfill(path=str(path),content_type='application/javascript');return
   if not r.request.url.startswith(origin+'/'):r.abort();return
   if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
   if r.request.url==origin+'/':
    response=r.fetch();headers=dict(response.headers);headers['content-security-policy']="connect-src 'self' data: blob:";r.fulfill(response=response,headers=headers);return
   r.continue_()
  page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
  page.evaluate("""()=>{
   ESTUDIO_ID='moderno-prueba';_accessRole='admin';state.myRole='admin';
   const canvas=document.createElement('canvas');canvas.width=720;canvas.height=480;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,720,480);ctx.strokeStyle='#222';ctx.lineWidth=3;ctx.strokeRect(50,50,620,380);ctx.moveTo(360,50);ctx.lineTo(360,430);ctx.stroke();
   state.projects[0].files=[{id:'issue-204-plan',name:'Plano comparativo.png',cat:'plano',type:'image/png',data:canvas.toDataURL('image/png')}];state.projects[0].events=[];state.projects[0].obraF=state.projects[0].obraF||[];state.projTab='planos';render();
  }""")
  expect(page.locator('.project-context-tools')).to_have_count(0)
  page.get_by_role('button',name='Abrir Plano comparativo.png',exact=True).click()
  original=page.locator('.plan-editor .plan-viewer-bar');page.wait_for_function("document.querySelector('.plan-editor .plan-viewer-bar')?.classList.contains('is-mounted')")
  original_style=original.evaluate("""bar=>{const button=bar.querySelector('.plan-icon-button'),separator=bar.querySelector('.plan-tool-separator'),bs=getComputedStyle(bar),bb=getComputedStyle(button),ss=getComputedStyle(separator);return {background:bs.backgroundColor,shadow:bs.boxShadow,height:bs.height,padding:bs.padding,color:bb.color,button:[bb.width,bb.height,bb.borderRadius],separator:[ss.width,ss.height,ss.backgroundColor]}}""")
  if output: toolbar_shot(page,'01-barra-original-planos.png',original)
  page.get_by_role('dialog',name='Plano del proyecto',exact=True).get_by_role('button',name='Cerrar',exact=True).click();expect(page.get_by_role('dialog',name='Plano del proyecto',exact=True)).to_be_hidden()

  page.evaluate("""()=>{window.contextCalls=[];window.taskModal=(...args)=>contextCalls.push(['taskModal',...args]);window.taskImportModal=(...args)=>contextCalls.push(['taskImportModal',...args]);projTab('tareas');}""")
  tasks=page.locator('.project-context-tools[data-module=tareas]');page.wait_for_function("document.querySelector('.project-context-tools[data-module=tareas]')?.classList.contains('is-mounted')")
  context_style=tasks.evaluate("""bar=>{const button=bar.querySelector('.plan-icon-button'),separator=bar.querySelector('.plan-tool-separator'),bs=getComputedStyle(bar),bb=getComputedStyle(button),ss=getComputedStyle(separator);return {background:bs.backgroundColor,shadow:bs.boxShadow,height:bs.height,padding:bs.padding,color:bb.color,button:[bb.width,bb.height,bb.borderRadius],separator:[ss.width,ss.height,ss.backgroundColor]}}""")
  assert context_style==original_style,(original_style,context_style)
  assert page.evaluate("document.body.classList.contains('project-context-dock-joined')")
  page.wait_for_timeout(350)
  joined=page.evaluate("""()=>{const dock=document.querySelector('.project-dock'),bar=document.querySelector('.project-context-tools'),surface=document.querySelector('.plan-dock-unified-surface:not([hidden])'),style=el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,border:s.borderColor,shadow:s.boxShadow}},d=dock.getBoundingClientRect(),b=bar.getBoundingClientRect(),u=surface.getBoundingClientRect(),rect=r=>({left:r.left,right:r.right,width:r.width});return {dock:style(dock),bar:style(bar),surface:style(surface),rects:{dock:rect(d),bar:rect(b),surface:rect(u)},aligned:Math.abs(d.right-b.left)<=2&&u.left<=d.left+1&&u.right>=b.right-1}}""")
  assert joined['dock']=={'background':'rgba(0, 0, 0, 0)','border':'rgba(0, 0, 0, 0)','shadow':'none'},joined
  assert joined['bar']=={'background':'rgba(0, 0, 0, 0)','border':'rgba(0, 0, 0, 0)','shadow':'none'},joined
  assert joined['surface']['background']=='rgb(255, 255, 255)' and joined['aligned'],joined
  tasks.get_by_role('button',name='Nueva tarea',exact=True).click();assert page.evaluate("contextCalls.at(-1)[0]==='taskModal'")
  if output: toolbar_shot(page,'02-desplegable-tareas.png',tasks)

  page.evaluate("""()=>{window.newRoom=(...args)=>contextCalls.push(['newRoom',...args]);window.shoppingListExport=(...args)=>contextCalls.push(['shoppingListExport',...args]);projTab('listas');}""")
  shopping=page.locator('.project-context-tools[data-module=listas]');page.wait_for_function("document.querySelector('.project-context-tools[data-module=listas]')?.classList.contains('is-mounted')")
  shopping.get_by_role('button',name='Crear nueva lista',exact=True).click();assert page.evaluate("contextCalls.at(-1)[0]==='newRoom'")
  shopping.get_by_role('button',name='Exportar listas',exact=True).click();assert page.evaluate("contextCalls.at(-1)[0]==='shoppingListExport'")
  if output: toolbar_shot(page,'03-desplegable-compras.png',shopping)

  page.evaluate("""()=>{window.obraPlanToggle=(...args)=>contextCalls.push(['obraPlanToggle',...args]);window.obraAgendaModal=(...args)=>contextCalls.push(['obraAgendaModal',...args]);window.obraShareModal=(...args)=>contextCalls.push(['obraShareModal',...args]);projTab('obra');}""")
  works=page.locator('.project-context-tools[data-module=obra]');page.wait_for_function("document.querySelector('.project-context-tools[data-module=obra]')?.classList.contains('is-mounted')")
  works.get_by_role('button',name='Cronograma',exact=True).click();assert page.evaluate("contextCalls.at(-1)[0]==='obraPlanToggle'")
  works.get_by_role('button',name='Contratistas',exact=True).click();assert page.evaluate("contextCalls.at(-1)[0]==='obraAgendaModal'")
  if output: toolbar_shot(page,'04-desplegable-obra.png',works)

  page.evaluate("""()=>{window.projectDiaryOpen=(...args)=>contextCalls.push(['projectDiaryOpen',...args]);projTab('diario');}""")
  diary=page.locator('.project-context-tools[data-module=diario]');page.wait_for_function("document.querySelector('.project-context-tools[data-module=diario]')?.classList.contains('is-mounted')")
  diary.get_by_role('button',name='Nueva visita',exact=True).click();assert page.evaluate("contextCalls.at(-1)[0]==='projectDiaryOpen'")
  if output: toolbar_shot(page,'05-desplegable-diario.png',diary)

  for excluded in ['ai','planos','estudio','mediciones','conversaciones']:
   page.evaluate("tab=>{state.projTab=tab;render();}",excluded);expect(page.locator('.project-context-tools')).to_have_count(0,timeout=1000)
  page.set_viewport_size({'width':390,'height':844});page.evaluate("()=>{state.projTab='obra';render();}")
  mobile=page.locator('.project-context-tools[data-module=obra]');page.wait_for_function("document.querySelector('.project-context-tools[data-module=obra]')?.classList.contains('is-mounted')")
  expect(mobile).to_have_class('plan-viewer-bar project-context-tools is-detached-compact is-mounted')
  mobile_box=mobile.bounding_box();dock_box=page.locator('.project-dock').bounding_box();assert mobile_box['x']>=0 and mobile_box['x']+mobile_box['width']<=390 and mobile_box['y']+mobile_box['height']<=dock_box['y']
  assert not errors,errors
  assert not writes,writes
  print('PASS: exact plan dock styles, real contextual actions, excluded modules and isolated fixture',flush=True)
  browser.close()
finally:
 server.terminate();server.wait(timeout=5)
