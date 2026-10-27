"""New project Sheet and metadata in the full app, with fictitious records and no external writes."""
from pathlib import Path
import ast,os,socket,subprocess,time,urllib.request,sys
from playwright.sync_api import sync_playwright,expect
repo=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]) if len(sys.argv)>1 else None
if output:output.mkdir(parents=True,exist_ok=True)
parsed=ast.parse((repo/'scripts/shopping-loading-browser.test.py').read_text())
setup=next(ast.literal_eval(n.value) for n in parsed.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='fixture_setup' for t in n.targets))
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://work-calendar-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_work-calendar-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width,height in [(1440,1000),(1100,850),(390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height},locale='es-ES',timezone_id='Europe/Madrid');errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   page.evaluate("go('proyectos')")
   page.locator('.projects-new:visible').click()
   dialog=page.locator('[data-slot=sheet-content]');expect(dialog).to_be_visible()
   expect(dialog.get_by_role('heading',name='Nuevo proyecto',exact=True)).to_be_visible()
   code=dialog.get_by_label('PR',exact=True);assert code.get_attribute('readonly') is not None
   assert 'Número de proyecto (propuesto' not in dialog.inner_text()
   dialog.evaluate('e=>Promise.all(e.getAnimations().map(a=>a.finished))')
   box=dialog.bounding_box();edge=page.evaluate('document.body.getBoundingClientRect().right');assert abs(box['x']+box['width']-edge)<1 and box['x']>=0 and box['height']>=height-1,box
   dialog.get_by_label('Nombre del proyecto',exact=True).fill('Proyecto nuevo ficticio')
   dialog.get_by_label('Cliente',exact=True).fill('Cliente ficticio')
   for label,value in [('Calle','Calle de Prueba'),('Número','12B'),('Ciudad','Ciudad ficticia'),('Provincia','Provincia ficticia'),('País','España')]:dialog.get_by_label(label,exact=True).fill(value)
   dialog.get_by_label('Tipo de proyecto',exact=True).select_option('Reforma integral')
   dialog.get_by_label('Nombre del proyecto',exact=True).press('Escape');expect(dialog).to_be_visible()
   if output:page.screenshot(path=str(output/f'new-project-{width}.png'))
   reserved=code.input_value()
   page.evaluate("num=>state.projects.push({...structuredClone(state.projects[0]),id:990099,num,name:'Reserva ficticia de numeración',tasks:[]})",reserved)
   before=page.evaluate('state.projects.length');old=page.evaluate('JSON.stringify(state.projects)')
   dialog.get_by_role('button',name='Crear proyecto',exact=True).click()
   page.wait_for_function('state.projects.some(p=>p.name==="Proyecto nuevo ficticio")')
   project=page.evaluate('state.projects.at(-1)');assert project['addr']=='Calle de Prueba 12B, Ciudad ficticia, Provincia ficticia, España',project
   assert project['num']!=reserved
   assert project['type']=='Reforma integral' and project['city']=='Ciudad ficticia' and project['country']=='España'
   assert page.evaluate('state.projects.length')==before+1
   assert page.evaluate('JSON.stringify(state.projects.slice(0,-1))')==old
   page.evaluate("go('proyectos')");page.locator('.projects-new:visible').click();expect(dialog).to_be_visible()
   dialog.get_by_label('Nombre del proyecto',exact=True).fill('Borrador para cliente')
   dialog.get_by_label('Calle',exact=True).fill('Calle conservada')
   dialog.get_by_role('button',name='Crear cliente nuevo',exact=True).click()
   expect(page.locator('#clName')).to_be_visible()
   page.locator('#modalBox .modal-foot .btn-ghost').click()
   expect(dialog).to_be_visible();expect(dialog.get_by_label('Nombre del proyecto',exact=True)).to_have_value('Borrador para cliente');expect(dialog.get_by_label('Calle',exact=True)).to_have_value('Calle conservada')
   # A failed component stylesheet restores the native drawer with all values.
   page.evaluate("document.querySelector('.new-project-sheet-host').shadowRoot.querySelector('link').dispatchEvent(new Event('error'))")
   expect(dialog).to_have_count(0);expect(page.locator('#npName')).to_be_visible();expect(page.locator('#npName')).to_have_value('Borrador para cliente');expect(page.locator('#npStreet')).to_have_value('Calle conservada')
   assert page.locator('#npStreet').get_attribute('autocomplete')=='section-project address-line1'
   page.get_by_role('button',name='Cancelar',exact=True).click();expect(page.locator('.overlay.open')).to_have_count(0)
   # The existing Templates action preselects the source in the new Sheet.
   page.evaluate("state.projects.push({id:991199,num:'TPL-1',brand:'cm',name:'Plantilla ficticia',tpl:true,tasks:[{id:'template-task',title:'Tarea de plantilla',col:'listo',done:true,assignees:[],comments:[]}]});tplUse(991199)")
   expect(dialog).to_be_visible();dialog.get_by_text('Empezar desde',exact=True).click()
   expect(dialog.get_by_label('Origen',exact=True)).to_have_value('tpl')
   expect(dialog.get_by_label('Plantilla',exact=True)).to_have_value('991199')
   dialog.get_by_label('Nombre del proyecto',exact=True).fill('Proyecto de plantilla ficticio')
   dialog.get_by_role('button',name='Crear proyecto',exact=True).click()
   page.wait_for_function("state.projects.some(p=>p.name==='Proyecto de plantilla ficticio')")
   assert page.evaluate("state.projects.at(-1).tasks[0].title==='Tarea de plantilla'&&state.projects.at(-1).tasks[0].col==='pend'&&state.projects.at(-1).tasks[0].done===false")
   page.evaluate("go('proyectos')")
   # A collaborator uses the same safe fields; a new missing stylesheet is recoverable.
   page.evaluate("_accessRole='colaborador';state.myRole='colaborador';go('proyectos')")
   page.locator('.projects-new:visible').click();expect(dialog).to_be_visible()
   page.evaluate("document.querySelector('.new-project-sheet-host').shadowRoot.querySelector('link').dispatchEvent(new Event('error'))")
   expect(page.locator('#npName')).to_be_visible();page.locator('#npName').fill('Proyecto colaborador ficticio')
   page.locator('#npStreet').fill('Calle colaboradora');page.locator('#npNumber').fill('5');page.locator('#npCity').fill('Ciudad ficticia');page.locator('#npProvince').fill('Provincia ficticia');page.locator('#npCountry').fill('España');page.locator('#npType').select_option('Decoración')
   page.get_by_role('button',name='Crear proyecto',exact=True).click()
   page.wait_for_function("state.projects.some(p=>p.name==='Proyecto colaborador ficticio')")
   assert page.evaluate("state.projects.at(-1).type==='Decoración'&&state.projects.at(-1).addr.includes('Calle colaboradora 5')")
   assert not errors,errors;assert not writes,writes
   print(width,'PASS: original Sheet, automatic code, all fields, creation, metadata, client draft recovery, Escape and native fallback; no remote writes',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
