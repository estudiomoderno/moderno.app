"""Shopping list switching on the official isolated server, with fictitious records only."""
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
   page.evaluate("""()=>{
    const p=structuredClone(state.projects[0]);p.id=9002;p.num='PR-9002';p.name='Otro proyecto ficticio';p.rooms=[{id:8999,name:'Lista ajena ficticia',icon:'sofa',sections:[{name:'General',items:[]}]}];state.projects.push(p);
    openRoom(9001,8001);window.pickerBaseline=records();
   }""")
   room=page.locator('.shopping-room-view');trigger=room.locator('#shopping-room-trigger');menu=room.get_by_role('menu',name='Listas de compra del proyecto')
   expect(trigger).to_have_accessible_name('Cambiar lista: Salón ficticio')
   expect(menu).not_to_be_visible();trigger.click();expect(menu).to_be_visible()
   choices=menu.get_by_role('menuitemradio')
   expect(choices).to_have_text(['Salón ficticio✓','Dormitorio ficticio','Pavimentos ficticios','Otras compras ficticias'])
   assert choices.locator('svg').count()==4
   assert menu.locator('[aria-checked="true"]').count()==1
   assert 'Lista ajena ficticia' not in menu.inner_text()
   assert menu.get_by_role('menuitemradio',name='Salón ficticio',exact=True).get_attribute('aria-checked')=='true'
   box=menu.bounding_box();assert box['x']>=0 and box['x']+box['width']<=width and box['y']+box['height']<=1000,box
   if output:page.screenshot(path=str(output/f'list-picker-{width}.png'),full_page=True)
   # Closing never changes the selected room, its products or its transient filters.
   choices.nth(1).press('Escape');expect(menu).not_to_be_visible();expect(trigger).to_be_focused()
   trigger.click();budget=room.locator('.dl-budget');budget.click(position={'x':budget.bounding_box()['width']-4,'y':6});expect(menu).not_to_be_visible()
   page.evaluate("state.roomSearch='ficticio';state.rf={label:'none'};render()")
   trigger.click();menu.get_by_role('menuitemradio',name='Salón ficticio',exact=True).click()
   assert page.evaluate("state.currentRoom===8001&&state.roomSearch==='ficticio'&&state.rf.label==='none'")
   # Every other list kind uses the same native route in this project and resets search/filter.
   for index,name in [(1,'Dormitorio ficticio'),(2,'Pavimentos ficticios'),(3,'Otras compras ficticias'),(0,'Salón ficticio')]:
    page.evaluate("state.roomSearch='No existe';state.rf={label:'label:Inexistente'};render()")
    trigger.click();menu.get_by_role('menuitemradio',name=name,exact=True).click()
    assert page.evaluate('(id)=>state.view==="estancia"&&state.currentProject===9001&&state.currentRoom===id&&state.roomSearch===""&&Object.values(state.rf).every(v=>!v)',8001+index)
    expect(trigger).to_have_accessible_name('Cambiar lista: '+name)
    assert room.locator('.shopping-product-card').count()==1
    expect(room.locator('.shopping-product-title')).to_contain_text('Producto ficticio '+str(index))
    expect(room.get_by_role('tab',name='Compras',exact=True)).to_have_attribute('aria-selected','true')
    expect(menu).not_to_be_visible()
   assert page.evaluate('records()===pickerBaseline')
   # Keyboard opens, navigates, selects and exits the menu without trapping focus.
   trigger.press('ArrowDown');expect(choices.first).to_be_focused()
   choices.first.press('ArrowDown');expect(choices.nth(1)).to_be_focused()
   choices.nth(1).press('Enter');assert page.evaluate('state.currentRoom===8002')
   trigger.press('ArrowDown');expect(choices.nth(1)).to_be_focused()
   choices.nth(1).press('End');expect(choices.last).to_be_focused()
   choices.last.press('Home');expect(choices.first).to_be_focused()
   choices.first.press('Tab');expect(menu).not_to_be_visible();expect(room.get_by_role('button',name='Ajustes de la lista',exact=True)).to_be_focused()
   # An unsaved product modal must not be bypassed by a programmatic picker selection.
   room.get_by_role('button',name='Añadir producto',exact=True).click();page.locator('#itName').fill('Borrador ficticio')
   assert page.evaluate('shoppingRoomChoose(0)') is False
   assert page.evaluate('state.currentRoom===8002');expect(page.locator('#itName')).to_have_value('Borrador ficticio')
   page.get_by_role('button',name='Cancelar',exact=True).click();assert page.evaluate('records()===pickerBaseline')
   if width>=1100:
    page.evaluate('ModernoProjectWorkspace.open(9002);ModernoProjectWorkspace.open(9001)')
    assert page.evaluate('state.currentProject===9001&&state.currentRoom===8002&&state.view==="estancia"')
   # A long menu scrolls within the viewport and escapes literal markup in old names.
   page.evaluate("""()=>{
    state.projects[0].rooms.push(...Array.from({length:20},(_,i)=>({id:8100+i,name:i===0?'<img src=x> & lista ficticia':'Lista ficticia con nombre largo '+i,icon:'bulb',sections:[{name:'General',items:[]}]})));render();window.longPickerBaseline=records();
   }""")
   trigger.click();expect(menu).to_be_visible()
   assert menu.get_by_role('menuitemradio').count()==24 and menu.locator('img').count()==0
   expect(menu).to_contain_text('<img src=x> & lista ficticia')
   box=menu.bounding_box();assert box['x']>=0 and box['x']+box['width']<=width and box['y']+box['height']<=1000,box
   assert menu.evaluate('(e)=>e.scrollHeight>e.clientHeight&&getComputedStyle(e).overflowY==="auto"')
   menu.get_by_role('menuitemradio').nth(1).press('Escape');assert page.evaluate('records()===longPickerBaseline')
   assert not writes,writes;assert not errors,errors
   print(width,'PASS: list picker, all project lists and icons, scoped navigation, active state, search reset, keyboard, outside/Escape, drafts, project memory and bounded long menu; no remote writes')
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
