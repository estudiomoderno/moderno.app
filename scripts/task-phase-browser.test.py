"""Task phase dialog and delete confirmation, fake study and offline backend."""
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
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://phase-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_phase-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width,height in [(1440,1000),(1100,900),(390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height},locale='es-ES');errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   page.evaluate("""()=>{const p=state.projects[0];p.phases=[{id:'a',name:'Diseño',color:'#fdf880',start:'2026-10-01',end:'2026-10-31'},{id:'b',name:'Obra',color:'#abcdef',start:'2026-11-01',end:'2026-12-21',extra:'retain'},{id:'c',name:'Cierre',color:'#BFD9C8',start:'2026-12-22',end:'2026-12-31'}];p.curPhase=2;p.tasks=[{id:701,title:'Tarea conservada',col:'pend',assignees:[],assignee:''}];projTab('tareas');window.baseline=records();window.phasePersists=0;persistSoon=()=>{phasePersists++};}""")
   page.get_by_title('Editar fase (nombre, fechas, color)',exact=True).nth(1).click()
   dialog=page.locator('#modalBox.task-phase-dialog');expect(dialog).to_be_visible();expect(dialog.get_by_label('Nombre',exact=True)).to_have_value('Obra')
   save=dialog.get_by_role('button',name='Guardar',exact=True)
   page.mouse.move(0,0)
   expect(save).to_have_css('background-color','rgb(6, 102, 255)')
   expect(save).to_have_css('border-radius','8px')
   expect(dialog.get_by_label('Nombre',exact=True)).to_have_css('border-radius','8px')
   assert dialog.bounding_box()['width']<=width
   dialog.get_by_label('Nombre',exact=True).fill('Obra editada');dialog.locator('label.task-phase-color[title="Lila"]').click();dialog.get_by_label('Inicio',exact=True).fill('2026-11-02');dialog.get_by_label('Fin',exact=True).fill('2026-12-20')
   if output:page.screenshot(path=str(output/f'phase-edit-{width}.png'))
   dialog.get_by_role('button',name='Eliminar fase',exact=True).click()
   confirmation=page.get_by_role('dialog',name='Eliminar fase',exact=True);expect(confirmation).to_be_visible();assert page.evaluate('records()===baseline&&phasePersists===0')
   expect(confirmation).to_contain_text('Las tareas del proyecto se conservarán.')
   page.mouse.move(0,0)
   expect(confirmation.get_by_role('button',name='Eliminar fase',exact=True)).to_have_css('border-radius','8px')
   expect(confirmation.get_by_role('button',name='Eliminar fase',exact=True)).to_have_css('background-color','rgb(220, 38, 38)')
   if output:page.screenshot(path=str(output/f'phase-confirm-{width}.png'))
   confirmation.get_by_role('button',name='Cancelar',exact=True).click();expect(dialog).to_be_visible();expect(dialog.get_by_label('Nombre',exact=True)).to_have_value('Obra editada');expect(dialog.get_by_role('radio',name='Lila',exact=True)).to_be_checked();expect(dialog.get_by_label('Inicio',exact=True)).to_have_value('2026-11-02');expect(dialog.get_by_label('Fin',exact=True)).to_have_value('2026-12-20');assert page.evaluate('records()===baseline')
   dialog.get_by_role('button',name='Guardar',exact=True).click();expect(page.locator('.overlay.open')).to_have_count(0)
   assert page.evaluate("state.projects[0].phases[1].id==='b'&&state.projects[0].phases[1].extra==='retain'&&state.projects[0].phases[1].name==='Obra editada'&&state.projects[0].phases[1].color==='#CBBBF2'&&phasePersists>0")
   # Delete only the selected phase; preserve all tasks and the active phase identity.
   page.evaluate("window.tasksBefore=JSON.stringify(state.projects[0].tasks);window.phasePersists=0;phaseModal(9001,1)")
   dialog.get_by_role('button',name='Eliminar fase',exact=True).click();expect(confirmation).to_be_visible();assert page.evaluate('state.projects[0].phases.length===3&&phasePersists===0')
   confirmation.get_by_role('button',name='Eliminar fase',exact=True).click();expect(page.locator('.overlay.open')).to_have_count(0)
   assert page.evaluate("state.projects[0].phases.length===2&&state.projects[0].phases.every(p=>p.id!=='b')&&state.projects[0].curPhase===1&&state.projects[0].phases[1].id==='c'&&JSON.stringify(state.projects[0].tasks)===tasksBefore&&phasePersists>0")
   # New phase uses the same compact editor, then cancellation changes nothing.
   page.get_by_role('button',name='Nueva fase',exact=True).click();expect(dialog).to_be_visible();expect(dialog.get_by_role('button',name='Eliminar fase',exact=True)).to_have_count(0)
   dialog.get_by_label('Nombre',exact=True).fill('Fase nueva ficticia');dialog.get_by_role('button',name='Guardar',exact=True).click();expect(page.locator('.overlay.open')).to_have_count(0);assert page.evaluate("state.projects[0].phases.at(-1).name==='Fase nueva ficticia'")
   page.evaluate("window.latestBaseline=records();phaseModal(9001,0)");dialog.get_by_label('Nombre',exact=True).fill('No guardar');dialog.get_by_role('button',name='Cancelar',exact=True).click();assert page.evaluate('records()===latestBaseline')
   # Backend/session changes while confirming must not delete a different or changed phase.
   page.evaluate("phaseModal(9001,0)");dialog.get_by_role('button',name='Eliminar fase',exact=True).click();page.evaluate("state.projects[0].phases[0].name='Cambio externo ficticio';window.phasePersists=0")
   confirmation.get_by_role('button',name='Eliminar fase',exact=True).click();assert page.evaluate("state.projects[0].phases[0].id==='a'&&phasePersists===0")
   page.evaluate("_accessRole='colaborador';phaseModal(9001,0)");expect(dialog).to_be_visible();dialog.get_by_role('button',name='Eliminar fase',exact=True).click();page.evaluate("state.sessionUser.id='otra-sesion-ficticia';window.phasePersists=0");confirmation.get_by_role('button',name='Eliminar fase',exact=True).click();assert page.evaluate("state.projects[0].phases[0].id==='a'&&phasePersists===0")
   assert not errors,errors;assert not writes,writes
   print(width,'PASS: compact blue actions, phase fields/metadata, explicit confirmation, cancel draft, exact delete, preserved tasks/current phase, create/cancel and stale phase/session; no remote writes',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
