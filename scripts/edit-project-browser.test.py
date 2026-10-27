"""Original edit Sheet, fictitious records, no remote app/backend writes."""
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
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://edit-project-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_edit-project-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width,height in [(1440,1000),(1100,850),(390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height},locale='es-ES');errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   page.evaluate("Object.assign(state.projects[0],{addr:'Calle ficticia 12, Portal B 2º A, Ciudad, Provincia, 00123, España',cp:'00123',city:'Ciudad',country:'España',tags:['Reforma'],color:'#abcabc'});state.clients.push({name:'Cliente alternativo ficticio',type:'Cliente'});window.editBaseline=JSON.stringify(state.projects[0]);newProject()")
   dialog=page.locator('[data-slot=sheet-content]');expect(dialog).to_be_visible();dialog.evaluate('e=>Promise.all(e.getAnimations().map(a=>a.finished))');new_width=dialog.bounding_box()['width'];input_style=dialog.get_by_label('Nombre del proyecto',exact=True).evaluate('e=>({radius:getComputedStyle(e).borderRadius,font:getComputedStyle(e).fontFamily})')
   page.evaluate('closeModal();customizeModal(9001,"data")');expect(dialog).to_be_visible();dialog.evaluate('e=>Promise.all(e.getAnimations().map(a=>a.finished))')
   assert dialog.bounding_box()['width']==new_width
   assert dialog.get_by_label('Nombre del proyecto',exact=True).evaluate('e=>({radius:getComputedStyle(e).borderRadius,font:getComputedStyle(e).fontFamily})')==input_style
   assert 'Editar datos del proyecto' not in dialog.inner_text() and 'Nombre, estado, cliente y etiquetas.' not in dialog.inner_text()
   expect(dialog.get_by_role('button',name='Crear cliente nuevo',exact=True)).to_have_count(0);expect(dialog.get_by_role('button',name='Sin cliente',exact=True)).to_have_count(0)
   expect(page.locator('.project-client-matches,.project-create-client')).to_have_count(0)
   address=dialog.get_by_label('Calle',exact=True);expect(address).to_have_value('Calle ficticia')
   for label,value in [('Número','12'),('Dirección 2','Portal B 2º A'),('Ciudad','Ciudad'),('Provincia','Provincia'),('Código postal','00123'),('País','España')]:expect(dialog.get_by_label(label,exact=True)).to_have_value(value)
   def fill_address(text):
    for label in ['Número','Dirección 2','Ciudad','Provincia','Código postal','País']:dialog.get_by_label(label,exact=True).fill('')
    dialog.get_by_label('Calle',exact=True).fill(text)
   assert dialog.get_by_label('PR',exact=True).get_attribute('readonly') is not None
   if output:page.screenshot(path=str(output/f'edit-project-{width}.png'))
   name=dialog.get_by_label('Nombre del proyecto',exact=True);name.fill('abcd');name.press('End');name.press('Backspace');expect(name).to_have_value('abc')
   name.press('Escape');expect(dialog).to_be_visible();assert page.evaluate('JSON.stringify(state.projects[0])===editBaseline')
   dialog.get_by_role('button',name='Cancelar',exact=True).click();expect(dialog).to_have_count(0);assert page.evaluate('JSON.stringify(state.projects[0])===editBaseline')
   page.evaluate('customizeModal(9001,"data")');expect(dialog).to_be_visible()
   client=dialog.get_by_label('Cliente',exact=True);client.fill('Cliente inexistente ficticio')
   dialog.get_by_role('button',name='Guardar cambios',exact=True).click();expect(dialog).to_be_visible();assert page.evaluate('JSON.stringify(state.projects[0])===editBaseline')
   client.fill('Cliente alternativo ficticio');dialog.get_by_label('Nombre del proyecto',exact=True).fill('Proyecto editado ficticio');dialog.get_by_label('Estado',exact=True).select_option('En revisión');dialog.get_by_label('Etiquetas',exact=True).fill('Reforma, Piso');fill_address('Dirección editada, Portal B, 00123, España')
   dialog.get_by_role('button',name='Guardar cambios',exact=True).click();expect(dialog).to_have_count(0)
   saved=page.evaluate('state.projects[0]');assert saved['name']=='Proyecto editado ficticio' and saved['addr']=='Dirección editada, Portal B, 00123, España' and saved['client']=='Cliente alternativo ficticio' and saved['status']=='En revisión' and saved['tags']==['Reforma','Piso']
   assert saved['id']==9001 and saved['color']=='#abcabc' and saved['cp']=='' and saved['rooms'][0]['id']==8001
   # Same lookup component as creation, saves all location fields, manual unit survives.
   page.evaluate("""window.ModernoPlaces={available:async()=>true,canPersistLocation:()=>false,session:async()=>({close(){},search:async()=>[{label:'Calle sugerida 27, Ciudad de prueba',prediction:{}}],select:async()=>({street:'Calle sugerida',number:'27',city:'Ciudad de prueba',province:'Provincia de prueba',cp:'00123',country:'España',placeId:'fixture-only'})})};customizeModal(9001,'data')""")
   expect(dialog).to_be_visible();dialog.get_by_label('Dirección 2',exact=True).fill('Portal C, 3º B')
   search=dialog.get_by_label('Buscar dirección',exact=True);expect(search).to_be_visible();search.fill('Calle su');expect(dialog.get_by_role('option',name='Calle sugerida 27, Ciudad de prueba')).to_be_visible();search.press('ArrowDown');search.press('Enter')
   expect(search).to_have_value('Calle sugerida 27, Ciudad de prueba');expect(dialog.get_by_label('Dirección 2',exact=True)).to_have_value('Portal C, 3º B')
   dialog.get_by_role('button',name='Guardar cambios',exact=True).click();expect(dialog).to_have_count(0)
   assert page.evaluate("state.projects[0].addr==='Calle sugerida 27, Portal C, 3º B, Ciudad de prueba, Provincia de prueba, 00123, España'&&state.projects[0].cp==='00123'&&!('placeId' in state.projects[0])")
   page.evaluate("customizeModal(9001,'data')");expect(dialog).to_be_visible()
   for label,value in [('Calle','Calle sugerida'),('Número','27'),('Dirección 2','Portal C, 3º B'),('Ciudad','Ciudad de prueba'),('Provincia','Provincia de prueba'),('Código postal','00123'),('País','España')]:expect(dialog.get_by_label(label,exact=True)).to_have_value(value)
   dialog.get_by_label('Dirección 2',exact=True).fill('Portal D, 4º A');dialog.get_by_role('button',name='Guardar cambios',exact=True).click();expect(dialog).to_have_count(0)
   page.evaluate("customizeModal(9001,'data')");expect(dialog).to_be_visible();expect(dialog.get_by_label('Dirección 2',exact=True)).to_have_value('Portal D, 4º A');dialog.get_by_role('button',name='Cancelar',exact=True).click();expect(dialog).to_have_count(0)
   # Address-only change schedules persistence, and an unchanged historical client remains valid.
   page.evaluate("state.projects[0].client='Cliente histórico ficticio';window.oldPersist=persistSoon;window.editPersistCount=0;persistSoon=()=>{editPersistCount++};customizeModal(9001,'data')")
   expect(dialog).to_be_visible();fill_address('Solo cambia la dirección')
   dialog.get_by_role('button',name='Guardar cambios',exact=True).click();expect(dialog).to_have_count(0)
   assert page.evaluate("editPersistCount>0&&state.projects[0].addr==='Solo cambia la dirección'&&state.projects[0].client==='Cliente histórico ficticio'")
   page.evaluate('persistSoon=oldPersist;customizeModal(9001,"data")');expect(dialog).to_be_visible()
   fill_address('Borrador de dirección conservado')
   page.evaluate("document.querySelector('.new-project-sheet-host').shadowRoot.querySelector('link').dispatchEvent(new Event('error'))")
   expect(dialog).to_have_count(0);expect(page.locator('#czStreet')).to_be_visible();expect(page.locator('#czStreet')).to_have_value('Borrador de dirección conservado')
   page.get_by_role('button',name='Guardar cambios',exact=True).click();expect(page.locator('#czStreet')).not_to_be_visible()
   assert page.evaluate("state.projects[0].addr==='Borrador de dirección conservado'")
   # The same fields are available to collaborators; stale identity cannot save.
   page.evaluate("_accessRole='colaborador';customizeModal(9001,'data')");expect(dialog).to_be_visible();fill_address('Dirección colaboradora ficticia');dialog.get_by_role('button',name='Guardar cambios',exact=True).click();expect(dialog).to_have_count(0)
   assert page.evaluate("state.projects[0].addr==='Dirección colaboradora ficticia'")
   page.evaluate("customizeModal(9001,'data')");expect(dialog).to_be_visible();fill_address('No se debe guardar');page.evaluate("state.sessionUser.id='otra-sesion-ficticia'");dialog.get_by_role('button',name='Guardar cambios',exact=True).click();expect(dialog).to_be_visible();assert page.evaluate("state.projects[0].addr==='Dirección colaboradora ficticia'")
   dialog.get_by_role('button',name='Cancelar',exact=True).click();expect(dialog).to_have_count(0);assert not errors,errors;assert not writes,writes
   print(width,'PASS: shared Sheet, saved address, clean client field, validation, save/cancel, address-only persistence, fallback, collaborator and session isolation; no remote writes',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
