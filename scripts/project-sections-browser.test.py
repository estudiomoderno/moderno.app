"""Project sections and diary in the full app, with fictitious records and no external writes."""
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
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://sections-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_sections-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width,height in [(1440,900),(390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height});errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   page.evaluate("""()=>{
    Object.assign(state.projects[0],{events:[{id:'other-event',cat:'other',txt:'Keep'}],notes:'Keep project notes',files:[{id:'doc',name:'Contrato.pdf',data:'data:application/pdf;base64,Zg=='},{id:'plan',cat:'plano',name:'Plano.pdf',data:'data:application/pdf;base64,Zg=='}],obraF:[{name:'Fase ficticia',color:'#333333',start:'2026-10-20',end:'2026-10-24',items:[{t:'Revisar',done:false}]}],obraPlanos:[{name:'Definitivo.pdf',type:'application/pdf',data:'data:application/pdf;base64,Zg=='}],obraAgenda:[]});
    projTab('archivos');window.before=JSON.stringify(state.projects[0]);
   }""")
   expect(page.locator('.project-document-name')).to_have_text(['Contrato.pdf'])
   page.locator('.project-file-category').click();expect(page.locator('.project-document-name')).to_have_count(0)
   page.evaluate("projTab('planos')")
   expect(page.locator('.project-document-name')).to_have_text(['Contrato.pdf','Plano.pdf'])
   expect(page.locator('text=Planos definitivos').first).to_be_visible()
   page.locator('.project-file-category').first.click()
   page.evaluate("projTab('obra')")
   expect(page.locator('text=Planos definitivos')).to_have_count(0)
   expect(page.locator('#project-tab-panel').get_by_role('button',name='Calendario',exact=True)).to_have_count(0)
   dates=page.evaluate('JSON.stringify(state.projects[0].obraF)')
   page.evaluate("projTab('calobra')")
   expect(page.get_by_role('heading',name='Calendario de obra',exact=True)).to_be_visible()
   assert page.evaluate('JSON.stringify(state.projects[0].obraF)')==dates
   page.locator('#project-tab-obra').focus();page.keyboard.press('ArrowRight')
   expect(page.locator('#project-tab-diario')).to_be_focused()
   page.keyboard.press('Enter')
   expect(page.get_by_role('heading',name='Diario de obra',exact=True)).to_be_visible()
   page.get_by_role('button',name='Nueva visita',exact=True).click()
   form=page.locator('#project-diary-form');form.locator('[name=date]').fill('2026-10-22');form.locator('[name=notes]').fill('Visita ficticia. Comprobar acabados.')
   form.locator('[name=photos]').set_input_files({'name':'foto.png','mimeType':'image/png','buffer':__import__('base64').b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jzS0AAAAASUVORK5CYII=')})
   form.get_by_role('button',name='Guardar visita',exact=True).click()
   page.wait_for_timeout(300)
   expect(page.locator('.project-diary-entry')).to_have_count(1)
   expect(page.locator('.project-diary-entry img')).to_have_count(1)
   saved=page.evaluate('JSON.stringify(state.projects)')
   assert page.evaluate("state.projects[0].events[0].id==='other-event'&&state.projects[0].notes==='Keep project notes'")
   page.get_by_role('button',name='Editar visita',exact=True).click();page.locator('#project-diary-form [name=notes]').fill('Notas actualizadas')
   page.locator('#project-diary-form').get_by_role('button',name='Guardar visita',exact=True).click()
   expect(page.locator('.project-diary-notes')).to_have_text('Notas actualizadas')
   page.evaluate("()=>{_accessRole='colaborador';state.myRole='colaborador';projTab('archivos');}")
   expect(page.locator('.project-document-name')).to_have_text(['Contrato.pdf'])
   page.evaluate("projTab('diario')")
   expect(page.locator('.project-diary-entry')).to_have_count(1)
   page.wait_for_timeout(600)
   if output:page.screenshot(path=str(output/f'project-diary-{width}.png'))
   assert not errors,errors;assert not writes,writes
   print(width,'PASS: categories and original file indices, definitive plans, separate work calendar, keyboard, diary create/edit/photo, collaborator access',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
