"""Work calendar presentation and actions in the full app, with fictitious records and no external writes."""
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
   page.evaluate("""()=>{
    state.cal={view:'mes',off:0,showTasks:true,showObra:true,events:[{title:'Cita global',date:'2026-10-22'}]};
    Object.assign(state.projects[0],{obraF:[{name:'Fase ficticia',color:'#95b8a0',start:'2026-10-20',end:'2026-10-24',items:[]},{name:'Fase sin fechas',items:[]}],obraPlanos:[],obraAgenda:[]});
    state.projects.push({...structuredClone(state.projects[0]),id:9002,name:'Otro proyecto',obraF:[{name:'Fase de otro proyecto',start:'2026-10-20',end:'2026-10-24',items:[]}]});
    projTab('calobra');window.globalBefore=JSON.stringify(state.cal);window.otherBefore=JSON.stringify(state.projects[1]);window.before=JSON.stringify(state.projects);
   }""")
   root=page.locator('#work-calendar-reui .calendar-component-host');expect(root.locator('[data-slot=event-calendar]')).to_be_visible()
   expect(page.locator('.calendar-native')).to_be_hidden()
   panel=page.locator('#project-tab-panel')
   frame=panel.evaluate("e=>{const s=getComputedStyle(e);return {border:s.borderTopWidth,padding:s.paddingTop,background:s.backgroundColor,shadow:s.boxShadow}}")
   assert frame=={'border':'0px','padding':'0px','background':'rgba(0, 0, 0, 0)','shadow':'none'},frame
   assert 'Las fechas y el avance' not in panel.inner_text() and 'Exportar calendario' not in panel.inner_text() and 'Sin fechas todavía' not in panel.inner_text()
   expect(root.get_by_label('Filtrar por proyecto',exact=True)).to_have_count(0)
   expect(root.get_by_text('Fase de otro proyecto',exact=True)).to_have_count(0)
   expect(root.get_by_text('Cita global',exact=True)).to_have_count(0)
   expect(root.get_by_text('Fase ficticia',exact=True).first).to_be_visible()
   if width>=1100:
    bar=root.get_by_text('Fase ficticia',exact=True).first.locator('xpath=ancestor::*[@data-slot="event-calendar-event"]');r=bar.bounding_box();delta=root.locator('[data-slot=event-calendar-month-cell]').first.bounding_box()['width']
    page.mouse.move(r['x']+30,r['y']+r['height']/2);page.mouse.down();page.mouse.move(r['x']+30+delta,r['y']+r['height']/2,steps=16);page.mouse.up()
    page.wait_for_function("state.projects[0].obraF[0].start==='2026-10-21'")
    assert page.evaluate("state.projects[0].obraF[0].end==='2026-10-25'")
   page.wait_for_timeout(600)
   root.get_by_text('Fase ficticia',exact=True).first.click();expect(page.locator('#planIni')).to_be_visible();page.get_by_role('button',name='Cancelar',exact=True).click()
   for name,slot in [('Semana','event-calendar-time-grid'),('Día','event-calendar-time-grid'),('5 días','event-calendar-time-grid'),('Agenda','event-calendar-agenda-view'),('Mes','event-calendar-month-view')]:
    root.get_by_role('button',name='Vista del calendario',exact=True).click();root.get_by_role('menuitem',name=name,exact=False).first.click();expect(root.locator('[data-slot='+slot+']').first).to_be_visible()
   if output:page.wait_for_timeout(600);page.screenshot(path=str(output/f'work-calendar-{width}.png'))
   page.evaluate("_accessRole='colaborador';state.myRole='colaborador';render()")
   root.get_by_role('button',name='Añadir fase',exact=True).click();form=page.locator('#work-calendar-phase');expect(form).to_be_visible()
   form.locator('[name=title]').fill('Nueva fase ficticia');form.locator('[name=start]').fill('2026-10-27');form.locator('[name=end]').fill('2026-10-30');form.get_by_role('button',name='Guardar fase',exact=True).click()
   page.wait_for_function("state.projects[0].obraF.some(f=>f.name==='Nueva fase ficticia'&&f.start==='2026-10-27'&&f.end==='2026-10-30')")
   assert page.evaluate('JSON.stringify(state.cal)===globalBefore&&JSON.stringify(state.projects[1])===otherBefore')
   assert page.evaluate("state.projects[0].obraF[1].name==='Fase sin fechas'&&!state.projects[0].obraF[1].start")
   # A stylesheet failure restores the native calendar with all requested extras removed.
   page.evaluate("document.querySelector('.calendar-component-host').shadowRoot.querySelector('link').dispatchEvent(new Event('error'))")
   expect(page.locator('.calendar-native')).to_be_visible();assert 'Sin fechas todavía' not in panel.inner_text()
   assert not errors,errors;assert not writes,writes
   print(width,'PASS: project scope, removed text/export/undated notice, views, phase edit, pointer drag, collaborator phase creation and native fallback',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
