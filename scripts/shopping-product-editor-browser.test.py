"""Product editor layout, draft actions and preservation on the isolated official server."""
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
   page.evaluate("openRoom(9001,8001);window.records=()=>JSON.stringify({projects:state.projects,library:state.library,quotes:state.quotes,invoices:state.invoices});window.sourceBaseline=records()")
   page.evaluate("""()=>{
    Object.assign(state.projects[0].rooms[0].sections[0].items[0],{
     id:'product-fictional',price:100,cost:80,qty:2,margin:null,unit:'ud',status:'Revisión Cliente',
     name:'Sillón ficticio',url:'https://tienda.example.invalid/producto',sku:'FIC-001',supplier:'Proveedor ficticio',
     dims:'76 × 79 × 80 cm',material:'Poliéster',color:'Azul índigo',plazo:'2-3 semanas',note:'Nota ficticia',
     img:'/brand/illustrations/nuevo-producto.webp',files:[{name:'Ficha ficticia.pdf',data:'archivo-ficticio',type:'application/pdf'}],
     custom:{preserve:true},libId:7101
    });
    state.library=[{id:7101,name:'Maestro ficticio',price:110,cost:85,unit:'ud'}];
    window.editorBaseline=records();itemModal(0,0);
   }""")
   box=page.locator('#modalBox');body=box.locator('.product-editor-body')
   footer=box.locator('.product-editor-footer');save=footer.get_by_role('button',name='Guardar',exact=True)
   expect(box.get_by_role('heading',name='Editar producto',exact=True)).to_be_visible()
   box.evaluate('(e)=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished))')
   bounds=box.bounding_box();f=footer.bounding_box()
   assert bounds['x']>=0 and bounds['y']>=0 and bounds['x']+bounds['width']<=width and bounds['y']+bounds['height']<=height,(width,bounds)
   assert f['y']>=0 and f['y']+f['height']<=height,(width,f)
   assert body.evaluate('(e)=>e.scrollWidth<=e.clientWidth'),width
   assert box.evaluate('(e)=>e.scrollWidth<=e.clientWidth'),width
   columns=body.evaluate('(e)=>getComputedStyle(e).gridTemplateColumns.split(" ").length')
   assert columns==1,(width,columns)
   viewport_width=page.locator('#overlay').bounding_box()['width']
   assert abs(bounds['x']+bounds['width']-viewport_width)<1,bounds
   assert bounds['y']==0 and abs(bounds['height']-height)<1,bounds
   assert abs(bounds['width']-min(480,viewport_width))<1,bounds
   expect(save).to_have_css('background-color','rgb(6, 102, 255)')
   expect(box).to_have_css('border-top-left-radius','0px')
   assert page.evaluate('records()===editorBaseline')
   # The enlarged image is a keyboard-accessible upload button, with the same file control.
   expect(box.get_by_role('button',name='Cambiar imagen del producto')).to_be_visible()
   with page.expect_file_chooser() as chooser:box.get_by_role('button',name='Cambiar imagen del producto').click()
   assert chooser.value.element.get_attribute('id')=='itImgFile'
   if output:page.screenshot(path=str(output/f'product-editor-{width}.png'),full_page=True)
   close=box.get_by_role('button',name='Cerrar edición de producto',exact=True)
   close.focus();page.keyboard.press('Shift+Tab');expect(save).to_be_focused()
   page.keyboard.press('Tab');expect(close).to_be_focused()
   footer_before=footer.bounding_box()
   body.evaluate('(e)=>e.scrollTop=e.scrollHeight')
   assert abs(footer.bounding_box()['y']-footer_before['y'])<1
   expect(save).to_be_in_viewport()
   # Library comparison remains inside the unsaved draft, and cancel discards it.
   box.get_by_role('button',name='Revisar datos de biblioteca',exact=True).click()
   box.locator('#itMasterPick0').check()
   box.get_by_role('button',name='Aplicar selección al formulario',exact=True).click()
   expect(box.locator('#itName')).to_have_value('Maestro ficticio')
   assert page.evaluate('records()===editorBaseline')
   box.locator('#itName').fill('Cambio descartado')
   footer.get_by_role('button',name='Cancelar',exact=True).click()
   assert page.evaluate('records()===editorBaseline')
   # Width and scrolling are scoped to this editor; another native dialog keeps its size.
   page.evaluate('modal(`<h3>Otro diálogo ficticio</h3><button onclick="closeModal()">Cerrar</button>`)')
   box.evaluate('(e)=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished))')
   if width>700:assert box.bounding_box()['width']<600
   box.get_by_role('button',name='Cerrar',exact=True).click()
   page.evaluate('itemModal(0,0)')
   box.get_by_role('button',name='Cerrar edición de producto',exact=True).click()
   assert page.evaluate('records()===editorBaseline')
   page.evaluate('itemModal(0,0)')
   expect(box.locator('#itName')).to_have_value('Sillón ficticio')
   box.locator('#itPrice').fill('120')
   box.locator('#itMgPills').get_by_role('button',name='20%',exact=True).click()
   expect(box.locator('#itCost')).to_have_value('100.00')
   box.locator('#itCost').fill('80')
   expect(box.locator('#itPrice')).to_have_value('96.00')
   box.locator('#itMgInp').fill('25')
   expect(box.locator('#itPrice')).to_have_value('100.00')
   box.locator('#itQty').fill('3')
   expect(box.locator('#itSum')).to_contain_text('300,00')
   box.locator('#itName').fill('Sillón actualizado ficticio')
   # Tab onto the action remains possible even when the last body control was scrolled to.
   box.get_by_role('button',name='Eliminar producto',exact=True).focus();expect(save).to_be_in_viewport()
   save.click()
   assert page.evaluate("""()=>{
    const it=state.projects[0].rooms[0].sections[0].items[0];
    return it.id==='product-fictional'&&it.libId===7101&&it.custom.preserve&&it.files[0].data==='archivo-ficticio'&&
     it.img==='/brand/illustrations/nuevo-producto.webp'&&it.name==='Sillón actualizado ficticio'&&it.price===100&&it.cost===80&&it.qty===3&&it.margin===25&&
     it.url==='https://tienda.example.invalid/producto'&&it.sku==='FIC-001'&&it.material==='Poliéster'&&it.color==='Azul índigo'&&it.note==='Nota ficticia'&&it.plazo==='2-3 semanas'&&it.status==='Revisión Cliente';
   }"""),'Editing must preserve the original product data and attachments'
   assert page.evaluate('sb===null')
   assert not writes,writes;assert not errors,errors
   print(width,height,'PASS: responsive editor, visible footer, keyboard image action, scoped width, comparison/cancel, price/margin/quantity, preserved fields/files; no remote writes')
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
