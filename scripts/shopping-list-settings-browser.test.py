"""List Sheet and product accordion journeys with fictitious records and no remote writes."""
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
  for width,height in [(1440,900),(1100,768),(390,844),(320,568)]:
   page=browser.new_page(viewport={'width':width,'height':height},locale='es-ES');errors=[];writes=[]
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
   expect(page.locator('.shopping-room-count')).to_have_count(0)
   page.evaluate("()=>{const second=structuredClone(state.projects[0]);second.id=9002;second.num='PR-9002';second.name='Destino ficticio';second.rooms.forEach((r,i)=>r.id=8100+i);state.projects.push(second);openRoom(9001,8001);}")
   project_settings=page.locator('[data-project-settings-trigger]')
   expect(project_settings).to_have_count(1);expect(project_settings).to_be_visible()
   project_settings.click();expect(page.get_by_role('menuitem',name='Editar datos',exact=True)).to_be_visible();page.keyboard.press('Escape')
   page.get_by_role('button',name='Ajustes de la lista',exact=True).click()
   form=page.locator('#shopping-list-settings-form');box=page.locator('#modalBox')
   expect(form).to_be_visible();expect(form.locator('#rmName')).to_have_value('Salón ficticio')
   for label in ['Margen general','Compartir / visibilidad','Exportar PDF / hoja']:assert label not in form.inner_text()
   expect(form.get_by_role('button',name='Guardar',exact=True)).to_have_css('background-color','rgb(6, 102, 255)')
   box.evaluate('(e)=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished))')
   bounds=box.bounding_box();overlay=page.locator('#overlay').bounding_box();footer=form.locator('footer').bounding_box()
   assert abs(bounds['x']+bounds['width']-overlay['width'])<1 and bounds['y']==0 and bounds['height']==height
   assert footer['y']+footer['height']<=height and box.evaluate('(e)=>e.scrollWidth<=e.clientWidth')
   if output:page.screenshot(path=str(output/f'list-settings-{width}.png'),full_page=True)
   page.evaluate('window.roomBefore=JSON.stringify(getRoom().r);window.projectBefore=JSON.stringify(getRoom().p)')
   form.locator('#rmName').fill('Nombre pendiente')
   form.locator('.shopping-list-icon-picker>summary').click();form.get_by_title('bulb',exact=True).click()
   assert page.evaluate('JSON.stringify(getRoom().r)===roomBefore')
   form.get_by_role('button',name='Duplicar lista',exact=True).click()
   expect(form.locator('#rmName')).to_have_value('Nombre pendiente');assert page.evaluate('JSON.stringify(getRoom().p)===projectBefore')
   form.get_by_role('button',name='Cerrar ajustes de la lista',exact=True).click()
   assert page.evaluate('JSON.stringify(getRoom().r)===roomBefore')
   page.evaluate('roomMenu(9001,8001)');form.locator('#rmName').fill('Salón actualizado')
   form.locator('.shopping-list-icon-picker>summary').click();form.get_by_title('bulb',exact=True).click();form.get_by_role('button',name='Guardar',exact=True).click()
   assert page.evaluate("(()=>{const before=JSON.parse(roomBefore),r=getRoom().r;before.name='Salón actualizado';before.icon='bulb';return JSON.stringify(r)===JSON.stringify(before)})()")
   expect(project_settings).to_have_count(1);expect(project_settings).to_be_visible()
   # Transfer buttons still enter the established flows and cancel without copying.
   page.evaluate('window.transferBefore=JSON.stringify(state.projects);roomMenu(9001,8001)')
   form.get_by_role('button',name='Exportar a otro proyecto',exact=True).click()
   expect(box.locator('#rxP')).to_be_visible();box.get_by_role('button',name='Cancelar',exact=True).click()
   page.evaluate('roomMenu(9001,8001)');form.get_by_role('button',name='Importar de otro proyecto',exact=True).click()
   expect(box.locator('#riP')).to_be_visible();box.get_by_role('button',name='Cancelar',exact=True).click()
   assert page.evaluate('JSON.stringify(state.projects)===transferBefore')
   # A stale save cannot overwrite changed metadata or a new role.
   page.evaluate("roomMenu(9001,8001);getRoom().r.name='Cambio externo'")
   form.locator('#rmName').fill('Cambio local');form.get_by_role('button',name='Guardar',exact=True).click();assert page.evaluate("getRoom().r.name==='Cambio externo'")
   form.get_by_role('button',name='Cerrar ajustes de la lista',exact=True).click()
   page.evaluate("roomMenu(9001,8001);_accessRole='invitado'")
   form.locator('#rmName').fill('No autorizado');form.get_by_role('button',name='Guardar',exact=True).click();assert page.evaluate("getRoom().r.name==='Cambio externo'")
   page.evaluate("_accessRole='admin';closeModal();roomMenu(9001,8001)")
   form.locator('#rmName').fill('Borrador de eliminación');form.get_by_role('button',name='Eliminar',exact=True).click()
   confirm=page.locator('#shopping-room-delete');
   # The shared ReUI confirmation exposes its buttons through the host Shadow DOM.
   page.get_by_role('alertdialog').get_by_role('button',name='Cancelar',exact=True).click()
   expect(form.locator('#rmName')).to_have_value('Borrador de eliminación');assert page.evaluate("getRoom().r.name==='Cambio externo'")
   form.get_by_role('button',name='Cerrar ajustes de la lista',exact=True).click()
   # Product order and native keyboard activation, animated in both directions.
   page.evaluate('itemModal(0,0)')
   assert page.evaluate("!!(document.getElementById('product-editor-prices').compareDocumentPosition(document.getElementById('product-editor-specs')) & Node.DOCUMENT_POSITION_FOLLOWING)")
   details=box.locator('details[aria-labelledby=product-editor-specs]');summary=details.locator('summary')
   summary.click();assert details.evaluate('(e)=>e.open')
   assert details.evaluate('(e)=>e.getAnimations().length')>0
   page.wait_for_timeout(250);summary.click();assert details.evaluate('(e)=>e.open')
   expect(details).not_to_have_attribute('open','')
   summary.focus();page.keyboard.press('Enter');expect(details).to_have_attribute('open','');page.wait_for_timeout(250)
   summary.click();summary.click();summary.click();page.wait_for_timeout(250);assert not details.evaluate('(e)=>e.open')
   page.emulate_media(reduced_motion='reduce');summary.click();assert details.evaluate('(e)=>e.open&&e.getAnimations().length===0');summary.click();assert not details.evaluate('(e)=>e.open')
   page.evaluate('closeModal();roomMenu(9001,8001)')
   page.evaluate('window.otherLists=JSON.stringify(getRoom().p.rooms.slice(1))')
   form.get_by_role('button',name='Eliminar',exact=True).click();page.get_by_role('alertdialog').get_by_role('button',name='Eliminar',exact=True).click()
   assert page.evaluate("state.view==='proyecto'&&!state.projects[0].rooms.some(r=>r.id===8001)&&JSON.stringify(state.projects[0].rooms)===otherLists")
   assert page.evaluate('sb===null');assert not writes,writes;assert not errors,errors
   print(width,height,'PASS Sheet metadata/cancel/save/stale guards, project settings, confirmed delete, product order and animated keyboard folds; no remote writes',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
