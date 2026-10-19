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
   page.evaluate("openRoom(9001,8001);window.initialRecords=records();window.productsBefore=JSON.stringify(state.projects.map(p=>p.rooms.map(r=>r.sections)))")
   room=page.locator('.shopping-room-view');status=room.get_by_role('combobox',name='Estado general de la estancia')
   expect(status).to_have_value('Borrador');assert page.evaluate('records()===initialRecords')
   assert status.bounding_box()['height']==24
   assert status.locator('option').all_text_contents()==['Borrador','Especificación','En curso','Revisión','Terminado']
   # The compact trigger and every popup label stay centered, including the selected row.
   status.click()
   assert status.evaluate("e=>e.matches(':open')")
   geometry=status.evaluate('''(select)=>{
    const center=e=>{const b=e.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2,h:b.height};};
    return {trigger:center(select),title:center(document.querySelector('.shopping-room-trigger')),
     options:[...select.options].map(option=>{const range=document.createRange();range.selectNodeContents(option);const text=range.getBoundingClientRect();return {box:center(option),text:{x:text.x+text.width/2,y:text.y+text.height/2}};})};
   }''')
   # Long room names may wrap the badge onto the next line on small screens.
   if width>=1100:assert abs(geometry['trigger']['y']-geometry['title']['y'])<1,geometry
   for row in geometry['options']:
    assert row['box']['h']==30,row
    assert abs(row['box']['x']-geometry['trigger']['x'])<1,row
    assert abs(row['box']['x']-row['text']['x'])<1,row
    assert abs(row['box']['y']-row['text']['y'])<2,row
   if output:page.screenshot(path=str(output/f'room-status-picker-{width}.png'),full_page=True)
   status.press('Escape');assert page.evaluate('records()===initialRecords')
   status.select_option('En curso');expect(status).to_have_value('En curso')
   assert page.evaluate("state.projects[0].rooms[0].rstatus==='En curso'&&state.projects[0].rooms[1].rstatus===undefined")
   assert page.evaluate('JSON.stringify(state.projects.map(p=>p.rooms.map(r=>r.sections)))===productsBefore')
   page.evaluate("state.projects[0].rooms[0].rstatus='Estado antiguo ficticio';render();window.legacyRecords=records()")
   expect(status).to_have_value('Estado antiguo ficticio');assert page.evaluate('records()===legacyRecords')
   status.select_option('Terminado');expect(status).to_have_value('Terminado')
   page.evaluate('window.beforeDelete=records()')
   delete=room.get_by_role('button',name='Eliminar lista',exact=True);delete.click()
   dialog=page.get_by_role('alertdialog');expect(dialog).to_be_visible()
   expect(dialog).to_have_accessible_name('¿Eliminar «Salón ficticio»?')
   expect(dialog).to_contain_text('Esta acción no se puede deshacer.')
   cancel=dialog.get_by_role('button',name='Cancelar',exact=True);confirm=dialog.get_by_role('button',name='Eliminar',exact=True)
   expect(cancel).to_be_focused()
   dialog.evaluate('(e)=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished))')
   assert dialog.get_attribute('data-size')=='sm'
   assert abs(dialog.bounding_box()['width']-320)<1,dialog.bounding_box()
   title=dialog.locator('[data-slot=alert-dialog-title]')
   assert title.evaluate('(e)=>getComputedStyle(e).fontSize')=='16px'
   assert 'Moderno ReUI Inter' in title.evaluate('(e)=>getComputedStyle(e).fontFamily')
   media=dialog.locator('[data-slot=alert-dialog-media]');assert media.locator('svg').count()==1
   assert media.bounding_box()['width']==40 and media.locator('svg').bounding_box()['width']==24
   cancel.press('Tab');expect(confirm).to_be_focused()
   confirm.press('Tab');expect(cancel).to_be_focused()
   cancel.press('Shift+Tab');expect(confirm).to_be_focused()
   if output:page.screenshot(path=str(output/f'room-delete-dialog-{width}.png'),full_page=True)
   # Alert backdrop never confirms deletion; Escape cancels and restores focus.
   page.mouse.click(2,500);expect(dialog).to_be_visible();assert page.evaluate('records()===beforeDelete')
   confirm.press('Escape');expect(dialog).not_to_be_visible();expect(delete).to_be_focused()
   assert page.evaluate('records()===beforeDelete')
   delete.click();page.get_by_role('alertdialog').get_by_role('button',name='Cancelar',exact=True).click()
   expect(page.get_by_role('alertdialog')).not_to_be_visible();assert page.evaluate('records()===beforeDelete')
   assert page.locator('.shopping-delete-host').count()==0
   # Missing component retains the original native confirmation without modifying records.
   page.evaluate('()=>{window.originalProfileBundle=ModernoProfileComponent;window.ModernoProfileComponent={...ModernoProfileComponent,mountShoppingDelete:undefined};}')
   delete.click();expect(page.locator('#modalBox')).to_be_visible()
   page.locator('#modalBox').get_by_role('button',name='Cancelar',exact=True).click()
   assert page.evaluate('records()===beforeDelete')
   page.evaluate('window.ModernoProfileComponent=originalProfileBundle')
   # Explicit confirm deletes only this fictitious list through the existing callback.
   delete.click();page.get_by_role('alertdialog').get_by_role('button',name='Eliminar',exact=True).click()
   page.wait_for_function("state.view==='proyecto'&&state.projTab==='listas'")
   assert page.evaluate('state.projects[0].rooms.length===3&&state.projects[0].rooms.every(r=>r.id!==8001)')
   assert page.locator('.shopping-delete-host').count()==0
   assert not writes,writes;assert not errors,errors
   print(width,'PASS: explicit room status, historical/default values preserved; original ReUI small delete dialog, focus/keyboard/Escape/cancel, native fallback, guarded explicit fictitious delete; no remote writes')
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
