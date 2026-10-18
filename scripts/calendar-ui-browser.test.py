"""Original ReUI calendar against the isolated server; fictitious records, remote/write requests blocked."""
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
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as response:html=response.read().decode()
   assert 'https://ui-fixture.supabase.co' in html
   break
  except OSError:time.sleep(.05)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [1440,1100,390]:
   page=browser.new_page(viewport={'width':width,'height':1000},locale='es-ES',timezone_id='Europe/Madrid');errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle')
   page.evaluate("""()=>{
    if(sb!==null)throw Error('Backend must be disabled');
    state.sessionUser={name:'Persona ficticia',mail:'persona@example.invalid',id:'fictional-user'};state.onboarded=true;state.myRole='admin';_accessRole='admin';_accessLoading=false;
    state.account.name='Estudio ficticio';state.account.apiToken='';state.account.showWeekends=true;state.account.weekend='sd';BRAND.cm.name='Estudio ficticio';state.brandFilter='all';
    const template=structuredClone(state.projects[0]);
    state.projects=[9001,9002].map((id,i)=>({...structuredClone(template),id,num:'PR-'+id,name:i?'Proyecto alternativo':'Proyecto ficticio',tpl:false,brand:'cm',status:'Activo',tasks:[{id:100+id,title:i?'Tarea alternativa':'Tarea ficticia <segura>',col:'todo',due:'2026-10-22',subs:[],people:[],comments:[]}],obraF:[{name:i?'Fase alternativa':'Fase ficticia',color:'#95B8A0',start:'2026-10-20',end:'2026-10-24',items:[]}],rooms:[],files:[],links:{drive:'',rayon:''}}));
    state.entries=[];state.invoices=[];state.quotes=[];state.library=[];state.catalog=[];state.docs=[];state.notifs=[];
    state.cal={view:'mes',off:0,showTasks:true,showObra:true,events:[{title:'Visita ficticia 10:30',date:'2026-10-22',src:null}]};
    applySessionUI();drawBrandSwitch();showLogin(false);for(const p of state.projects)go('proyecto',p.id);go('calendario');
    window.records=()=>JSON.stringify({projects:state.projects,events:state.cal.events});window.baseline=records();
   }""")
   root=page.locator('.calendar-component-host')
   root.locator('[data-slot=event-calendar]').wait_for(state='visible')
   assert page.locator('.calendar-native').is_hidden()
   assert page.locator('#view>h1.big').count()==0
   assert 'Tu calendario' not in page.locator('#view').inner_text()
   assert root.locator('[data-slot=event-calendar-month-view]').is_visible()
   due_timestamp=page.evaluate("new Date('2026-10-22T00:00:00').getTime()")
   due_cell=root.locator('[data-slot=event-calendar-month-cell][data-ec-day="'+str(due_timestamp)+'"]')
   if not root.get_by_text('Tarea ficticia <segura>',exact=True).count():due_cell.locator('[data-slot=event-calendar-more]').click()
   assert root.get_by_text('Tarea ficticia <segura>',exact=True).count()>0
   assert root.get_by_text('Fase ficticia',exact=True).count()>0
   if output:page.screenshot(path=str(output/f'calendar-initial-{width}.png'),full_page=True)
   more=due_cell.locator('[data-slot=event-calendar-more]')
   if not root.get_by_text('Visita ficticia 10:30',exact=True).count():more.first.click()
   assert root.get_by_text('Visita ficticia 10:30',exact=True).count()>0
   page.keyboard.press('Escape')
   assert root.locator('img').count()==0
   assert root.get_by_role('button',name='Hoy',exact=True).evaluate('(e)=>getComputedStyle(e).fontSize')=='12.8px'
   page.wait_for_timeout(180)
   if output:page.screenshot(path=str(output/f'calendar-month-{width}.png'),full_page=True)
   if width>=1100:
    # A real pointer drag reuses the native phase update, including local dates.
    bar=root.get_by_text('Fase ficticia',exact=True).first.locator('xpath=ancestor::*[@data-slot="event-calendar-event"]')
    r=bar.bounding_box();cell=root.locator('[data-slot=event-calendar-month-cell]').first
    delta=cell.bounding_box()['width']
    page.mouse.move(r['x']+30,r['y']+r['height']/2);page.mouse.down();page.mouse.move(r['x']+30+delta,r['y']+r['height']/2,steps=16);page.mouse.up()
    page.wait_for_function("state.projects[0].obraF[0].start==='2026-10-21'")
    assert page.evaluate('state.projects[0].obraF[0].end')=='2026-10-25'
    page.evaluate('baseline=records()')
   root.get_by_role('button',name='Tareas',exact=True).click()
   assert root.get_by_text('Tarea ficticia <segura>',exact=True).count()==0
   root.get_by_role('button',name='Tareas',exact=True).click()
   root.get_by_label('Filtrar por proyecto',exact=True).fill('PR-9001')
   root.get_by_role('button',name='Filtrar',exact=True).click()
   assert root.get_by_text('Tarea alternativa',exact=True).count()==0
   if not root.get_by_text('Tarea ficticia <segura>',exact=True).count():due_cell.locator('[data-slot=event-calendar-more]').click()
   assert root.get_by_text('Tarea ficticia <segura>',exact=True).count()>0
   page.keyboard.press('Escape')
   root.get_by_role('button',name='Abrir proyecto seleccionado',exact=True).click()
   assert page.evaluate('state.view')=='proyecto' and page.evaluate('state.currentProject')==9001
   page.evaluate("go('calendario')");root.locator('[data-slot=event-calendar]').wait_for(state='visible')
   root.get_by_role('button',name='Quitar filtro de proyecto',exact=True).click()
   assert page.evaluate('state.cal.pid') is None
   root.get_by_role('button',name='Ajustes',exact=True).click()
   root.get_by_role('switch',name='Números de semana',exact=True).click()
   page.keyboard.press('Escape')
   # View switcher uses the original menu and stays in the isolated portal.
   root.get_by_role('button',name='Vista del calendario',exact=True).click()
   root.get_by_role('menuitem',name='Semana',exact=False).click()
   assert root.locator('[data-slot=event-calendar-time-grid]').is_visible()
   if output:page.screenshot(path=str(output/f'calendar-week-{width}.png'),full_page=True)
   root.get_by_role('button',name='Vista del calendario',exact=True).click()
   root.get_by_role('menuitem',name='Día',exact=False).click()
   assert page.evaluate('state.cal.view')=='dia'
   root.get_by_role('button',name='Vista del calendario',exact=True).click()
   root.get_by_role('menuitem',name='Agenda',exact=False).click()
   assert root.locator('[data-slot=event-calendar-agenda-view]').is_visible()
   root.get_by_role('button',name='Nuevo evento',exact=True).click()
   assert page.locator('#cvT').is_visible();page.locator('#cvT').fill('Borrador ficticio')
   page.evaluate('closeModal()')
   assert page.evaluate('records()===baseline')
   page.evaluate('ModernoCalendarUI.setEnabled(false)')
   assert root.count()==0 and page.locator('.calendar-native').is_visible()
   page.evaluate('ModernoCalendarUI.setEnabled(true)')
   root.locator('[data-slot=event-calendar]').wait_for(state='visible')
   page.evaluate('document.querySelector(".calendar-component-host").shadowRoot.querySelector("link").dispatchEvent(new Event("error"))')
   root.wait_for(state='detached');assert page.locator('.calendar-native').is_visible()
   assert page.evaluate('records()===baseline') and not writes,writes
   assert not errors,errors
   print(width,'PASS: original calendar, safe events/filter/views/settings/forms and fallback; fictitious records preserved',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
