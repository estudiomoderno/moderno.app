"""Shopping overview actions on the official isolated server, with fictitious records only."""
from pathlib import Path
import os,socket,subprocess,time,urllib.request,sys
from playwright.sync_api import sync_playwright,expect

repo=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]) if len(sys.argv)>1 else None
if output:output.mkdir(parents=True,exist_ok=True)
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://ui-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for attempt in range(100):
  try:
   with opener.open(origin,timeout=1) as response:html=response.read().decode()
   assert 'const LS_KEY="moderno_pruebas_ui-fixture";' in html
   assert 'const SUPABASE_URL = "https://auth.moderno.app";' not in html
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server did not start')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [1440,1100,390]:
   page=browser.new_page(viewport={'width':width,'height':1000},locale='es-ES');errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle')
   page.wait_for_function('!!window.ModernoProjectWorkspace')
   page.evaluate("""()=>{
    if(sb!==null)throw Error('Backend must be disabled');
    state.sessionUser={name:'Persona ficticia',mail:'persona@example.invalid',id:'fixture'};
    state.onboarded=true;state.myRole='admin';_accessRole='admin';_accessLoading=false;
    state.account.name='Estudio ficticio';state.account.apiToken='';state.account.billContacts=[];
    BRAND.cm.name='Estudio ficticio';state.brandFilter='all';
    const project=structuredClone(state.projects[0]);
    Object.assign(project,{id:9001,num:'PR-9001',name:'Proyecto ficticio',brand:'cm',tpl:false,client:'Cliente ficticio',tasks:[],files:[],rooms:[
     {id:8001,kind:'estancia',name:'Salón ficticio',icon:'sofa'},
     {id:8002,kind:'estancia',name:'Dormitorio ficticio',icon:'bed'},
     {id:8003,kind:'pav',name:'Pavimentos ficticios',icon:'wall'},
     {id:8004,kind:'otra',name:'Otras compras ficticias',icon:'bulb'}
    ].map((room,i)=>({...room,created:'2026-10-19',sections:[{id:'section-'+i,name:'General',items:[{name:'Producto ficticio '+i,price:25+i,qty:2,unit:'ud',status:'Pendiente',supplier:'Proveedor ficticio',sku:'FIC-'+i}]}]}))});
    state.projects=[project];state.clients=[{name:'Cliente ficticio',type:'Cliente',brand:'cm',email:'cliente@example.invalid'}];
    state.entries=[];state.invoices=[];state.quotes=[];state.docs=[];state.library=[];state.catalog=[];state.notifs=[];
    state.collapsed={'g-9001-estancia':false,'g-9001-pav':false,'g-9001-otra':false,'unrelated':true};
    applySessionUI();drawBrandSwitch();showLogin(false);go('proyecto',9001);projTab('listas');
    window.records=()=>JSON.stringify({projects:state.projects,clients:state.clients,invoices:state.invoices,quotes:state.quotes,entries:state.entries,collapsed:state.collapsed});
    window.baseline=records();window.printCount=0;window.print=()=>{printCount++;window.printHTML=document.getElementById('printZone').innerHTML;};
   }""")
   overview=page.locator('.shopping-list-overview');overview.wait_for(state='visible')
   assert 'Estancias, pavimentos' not in overview.inner_text()
   assert overview.get_by_role('button',name='Importar desde hoja',exact=True).count()==0
   assert overview.locator('.dl-ghead .collbtn,.dl-ghead [aria-expanded]').count()==0
   assert overview.locator('.dl-grid').count()==3 and overview.locator('.dl-card').count()==4
   assert overview.get_by_role('button',name='Exportar PDF',exact=True).count()==0
   assert overview.get_by_role('button',name='Hoja de cálculo',exact=True).count()==0
   buttons=overview.locator('.shopping-action')
   assert buttons.evaluate_all('(es)=>es.map(e=>e.getAttribute("aria-label"))')==['Crear','Exportar','Imprimir']
   boxes=[b.bounding_box() for b in buttons.all()]
   assert all(abs(b['width']-50)<.02 and abs(b['height']-50)<.02 for b in boxes),boxes
   assert len(set(b['y'] for b in boxes))==1,boxes
   for button in buttons.all():
    assert button.get_attribute('title')==button.get_attribute('aria-label')
    assert button.evaluate('(e)=>getComputedStyle(e).borderRadius')=='15px'
    button.focus();assert button.evaluate('(e)=>e===document.activeElement')
   quote=overview.get_by_role('button',name='Generar presupuesto',exact=True)
   assert quote.bounding_box()['width']==200 and quote.bounding_box()['height']==40
   assert quote.locator('.shopping-quote-paper svg').count()==1
   label=quote.locator(':scope>span').nth(1).bounding_box();arrow=quote.locator('.shopping-quote-arrow').bounding_box()
   assert label['x']+label['width']<=arrow['x'],(label,arrow)
   assert page.evaluate('records()===baseline')
   if output:page.screenshot(path=str(output/f'shopping-overview-{width}.png'),full_page=True)
   if output:
    quote.scroll_into_view_if_needed()
    page.screenshot(path=str(output/f'shopping-budget-{width}.png'),full_page=True)
   buttons.first.hover()
   buttons.first.evaluate('(e)=>Promise.all(e.getAnimations().map(a=>a.finished))')
   assert buttons.first.evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(51, 51, 51)'
   assert buttons.first.locator('svg').evaluate('(e)=>getComputedStyle(e).fill')=='rgb(255, 255, 255)'
   page.emulate_media(reduced_motion='reduce')
   assert buttons.first.locator('svg').evaluate('(e)=>getComputedStyle(e).animationName')=='none'
   page.emulate_media(reduced_motion='no-preference');page.mouse.move(0,0)
   # Creation opens the existing form; cancel must not add a room.
   buttons.first.press('Enter');expect(page.locator('#modalBox h3')).to_have_text('Nueva estancia')
   page.get_by_role('button',name='Cancelar',exact=True).click();assert page.evaluate('records()===baseline')
   # PDF and sheet retain the existing list selector; an empty selection stays disabled.
   overview.get_by_role('button',name='Exportar',exact=True).click()
   page.get_by_role('button',name='PDF',exact=True).click()
   assert page.locator('.expR:checked').count()==4
   page.evaluate("expSet('none')");assert page.locator('#expGo').is_disabled()
   page.locator('.expR[value="8001"]').check();page.locator('#expGo').click()
   page.wait_for_function('printCount===1')
   assert 'Salón ficticio' in page.evaluate('printHTML') and 'Dormitorio ficticio' not in page.evaluate('printHTML')
   overview.get_by_role('button',name='Exportar',exact=True).click()
   page.get_by_role('button',name='Hoja de cálculo (CSV)',exact=True).click()
   page.evaluate("expSet('none')");page.locator('.expR[value="8002"]').check()
   with page.expect_download() as downloaded:page.locator('#expGo').click()
   download=downloaded.value;csv=Path(download.path()).read_text(encoding='utf-8-sig')
   assert download.suggested_filename=='PR-9001-listas-de-compra.csv'
   assert 'Producto ficticio 1' in csv and 'Producto ficticio 0' not in csv
   # Print has its own entry and labels, using the same document renderer.
   overview.get_by_role('button',name='Imprimir',exact=True).click()
   expect(page.locator('#modalBox h3')).to_have_text('Imprimir listas')
   expect(page.locator('#expGo')).to_have_text('Imprimir')
   page.evaluate("expSet('none')");page.locator('.expR[value="8003"]').check();page.locator('#expGo').click()
   page.wait_for_function('printCount===2')
   assert 'Pavimentos ficticios' in page.evaluate('printHTML') and 'Salón ficticio' not in page.evaluate('printHTML')
   assert page.evaluate('records()===baseline'),'Presentation/export changed stored records'
   # The budget button delegates to the existing guarded quotation handler.
   page.evaluate('()=>{window.originalQuoteHandler=listToQuote;window.quoteCalls=[];listToQuote=pid=>quoteCalls.push(pid);}')
   quote.click();assert page.evaluate('quoteCalls')==[9001],page.evaluate('quoteCalls')
   page.evaluate("listToQuote=originalQuoteHandler;_accessRole='colaborador';render()")
   overview.get_by_role('button',name='Generar presupuesto',exact=True).click()
   assert page.evaluate("state.view==='proyecto'&&state.projTab==='listas'&&!state.draft")
   assert page.evaluate('records()===baseline')
   # Confirm creation still adds one fictitious room through the unchanged native flow.
   page.evaluate("_accessRole='admin';render()")
   overview.get_by_role('button',name='Crear',exact=True).click();page.locator('#nrName').fill('Estancia nueva ficticia')
   page.locator('#modalBox').get_by_role('button',name='Crear',exact=True).click()
   assert page.evaluate("state.projects[0].rooms.length===5&&state.projects[0].rooms[4].name==='Estancia nueva ficticia'&&state.view==='estancia'")
   assert not writes,writes;assert not errors,errors
   print(width,'PASS: 50px aligned actions, supplied styles, expanded groups, CSV/PDF/print selection, guarded quote, native room creation; no remote writes')
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
