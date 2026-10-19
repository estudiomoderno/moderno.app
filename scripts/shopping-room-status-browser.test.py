"""No list status + delete confirmation on the official isolated server, fictitious records only."""
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
   assert page.locator('.shopping-list-overview .dl-st').count()==0
   # Decorative plan illustration: full app, original upload handlers, no backend writes.
   page.evaluate("state.projects[0].files=[{name:'Plano ficticio.pdf',type:'application/pdf',data:'contenido-ficticio',cli:false}];window.beforeDocuments=records();projTab('planos')")
   upload=page.get_by_role('button',name='Subir o arrastrar archivos',exact=True)
   illustration=upload.locator('.project-upload-illustration');illustration.evaluate('(img)=>img.decode()')
   assert illustration.evaluate('(img)=>img.naturalWidth')==640
   assert illustration.get_attribute('alt')=='' and illustration.get_attribute('aria-hidden')=='true'
   assert illustration.evaluate('(img)=>getComputedStyle(img).filter')=='grayscale(1)'
   card=page.locator('.project-file-card:not(.project-file-add)').first
   assert abs(upload.bounding_box()['width']-card.bounding_box()['width'])<1
   if output:page.screenshot(path=str(output/f'plan-upload-{width}.png'),full_page=True)
   page.evaluate("()=>{window.originalAddFiles=addFiles;window.uploadCalls=[];addFiles=(pid,files)=>uploadCalls.push([pid,Array.from(files).map(f=>f.name)]);}")
   with page.expect_file_chooser() as chooser:upload.press('Enter')
   chooser.value.set_files({'name':'Elegido ficticio.pdf','mimeType':'application/pdf','buffer':b'fictional'})
   assert page.evaluate('uploadCalls.pop()')==[9001,['Elegido ficticio.pdf']]
   upload.evaluate("e=>{const dt=new DataTransfer();dt.items.add(new File(['fictional'],'Arrastrado ficticio.dwg',{type:'application/octet-stream'}));e.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt}));if(!e.classList.contains('is-dragover'))throw Error('Missing drop feedback');e.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));}")
   assert page.evaluate('uploadCalls.pop()')==[9001,['Arrastrado ficticio.dwg']]
   assert not upload.evaluate("e=>e.classList.contains('is-dragover')")
   illustration.dispatch_event('error');assert illustration.is_hidden()
   expect(upload).to_contain_text('Subir o arrastrar archivos')
   assert page.evaluate('records()===beforeDocuments')
   page.evaluate('addFiles=originalAddFiles;state.projects[0].files=[];render()')
   empty=upload.bounding_box();assert abs(empty['width']-empty['height'])<1,empty
   page.evaluate("openRoom(9001,8001);window.initialRecords=records();window.productsBefore=JSON.stringify(state.projects.map(p=>p.rooms.map(r=>r.sections)))")
   room=page.locator('.shopping-room-view')
   assert room.get_by_role('combobox',name='Estado general de la estancia').count()==0
   assert room.locator('.shopping-room-status,.shopping-room-current-status').count()==0
   assert page.evaluate('records()===initialRecords')
   page.evaluate("state.projects[0].rooms[0].rstatus='Estado antiguo ficticio';render();window.legacyRecords=records()")
   assert room.get_by_role('combobox',name='Estado general de la estancia').count()==0
   assert page.evaluate('records()===legacyRecords')
   room.get_by_role('button',name='Ajustes de la lista',exact=True).click()
   assert page.locator('#modalBox').get_by_text('Estado de la estancia',exact=True).count()==0
   page.locator('#modalBox').get_by_role('button',name='Hecho',exact=True).click()
   assert page.evaluate('records()===legacyRecords')
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
   print(width,'PASS: no list status in header/settings, historical records preserved; original ReUI small delete dialog, focus/keyboard/Escape/cancel, native fallback, guarded explicit fictitious delete; no remote writes')
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
