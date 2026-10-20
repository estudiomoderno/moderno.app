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
   tile=overview.get_by_role('button',name='Nueva estancia',exact=True)
   illustration=tile.locator('img')
   expect(tile).to_be_visible()
   illustration.evaluate('(img)=>img.decode()')
   assert illustration.evaluate('(img)=>img.naturalWidth')==640
   assert illustration.get_attribute('alt')=='' and illustration.get_attribute('aria-hidden')=='true'
   assert illustration.evaluate('(img)=>getComputedStyle(img).filter')=='grayscale(1)'
   assert tile.locator('.room-create-plus').inner_text()=='+'
   assert overview.locator('.room-create-illustration').count()==1,'Only the room creator receives the illustration'
   if output:tile.screenshot(path=str(output/f'new-room-card-{width}.png'))
   tile.press('Enter');expect(page.locator('#modalBox h3')).to_have_text('Nueva estancia')
   page.get_by_role('button',name='Cancelar',exact=True).click()
   assert page.evaluate('records()===baseline')
   # Losing the decorative image must leave the label and existing creator usable.
   illustration.dispatch_event('error');assert illustration.is_hidden()
   tile.click();expect(page.locator('#modalBox h3')).to_have_text('Nueva estancia')
   page.get_by_role('button',name='Cancelar',exact=True).click()
   illustration.evaluate('(img)=>{img.hidden=false;}')
   assert 'Estancias, pavimentos' not in overview.inner_text()
   assert overview.get_by_role('button',name='Importar desde hoja',exact=True).count()==0
   assert overview.locator('.dl-ghead .collbtn,.dl-ghead [aria-expanded]').count()==0
   assert overview.locator('.dl-grid').count()==3 and overview.locator('.dl-card').count()==4
   assert overview.get_by_role('button',name='Exportar PDF',exact=True).count()==0
   assert overview.get_by_role('button',name='Hoja de cálculo',exact=True).count()==0
   expect(overview.locator('.shopping-list-header .shopping-room-count')).to_have_text('2')
   assert overview.locator('.shopping-list-header h2').inner_text().strip().startswith('Listas de compra')
   assert 'Estancias' not in overview.locator('.dl-ghead>b').all_inner_texts()
   assert overview.locator('.shopping-list-header .line').count()==0
   assert overview.locator('.shopping-list-header .shopping-action').count()==3
   footers=overview.locator('.dl-card .dl-cfoot')
   expect(footers).to_have_text(['Salón ficticio','Dormitorio ficticio','Pavimentos ficticios','Otras compras ficticias'])
   assert footers.locator('.dl-date,.dl-grip,button').count()==0
   assert footers.locator('.dl-name svg').count()==4
   overview.locator('.dl-card').first.hover()
   assert overview.locator('[title="Opciones de la lista"]').count()==0
   overview.locator('.dl-card').first.click()
   assert page.evaluate('state.view==="estancia"&&state.currentRoom===8001')
   room=page.locator('.shopping-room-view')
   assert room.locator('.crumbs,.shopping-add-options').count()==0
   assert 'Board de la estancia' not in room.inner_text() and 'Compras y aprobaciones' not in room.inner_text()
   dock=room.get_by_role('tablist',name='Secciones del proyecto')
   expect(dock).to_be_visible()
   assert dock.evaluate('(e)=>getComputedStyle(e).position')=='fixed'
   box=dock.bounding_box();assert 0<=box['y']<1000 and box['y']+box['height']<=1000,box
   assert dock.get_by_role('tab',name='Compras',exact=True).get_attribute('aria-selected')=='true'
   actions=room.locator('.shopping-actions button')
   assert actions.evaluate_all('(es)=>es.map(e=>e.title)')==['Ajustes de la lista','Exportar lista','Eliminar lista']
   boxes=[b.bounding_box() for b in actions.all()]
   assert all(b['width']==40 and b['height']==40 for b in boxes) and boxes[0]['y']==boxes[1]['y']==boxes[2]['y'],boxes
   back=room.get_by_role('button',name='Volver a listas de compra',exact=True)
   assert back.bounding_box()['width']==32 and back.bounding_box()['height']==32
   assert room.get_by_role('button',name='Margen general',exact=True).count()==0
   assert room.get_by_role('button',name='Compartir con el cliente',exact=True).count()==0
   assert room.get_by_role('button',name='Exportar PDF / hoja',exact=True).count()==0
   assert 'Pulsa el nombre o el botón de editar' not in room.inner_text()
   assert room.get_by_role('button',name='Añadir sección',exact=True).count()==0
   assert room.locator('.shopping-product-grid').count()==1
   assert room.locator('.dl-sec,.shopping-section-jump').count()==0
   filter_button=room.get_by_role('button',name='Filtrar productos',exact=True)
   search_button=room.get_by_role('button',name='Buscar producto',exact=True)
   assert filter_button.inner_text()=='' and search_button.inner_text()==''
   for button in [filter_button,search_button]:
    assert button.bounding_box()['width']==32 and button.bounding_box()['height']==32
   panel=room.locator('#shopping-filter-panel')
   expect(panel).not_to_be_visible()
   assert filter_button.evaluate('(e)=>getComputedStyle(e,"::after").display')=='none'
   filter_button.click();expect(panel).to_be_visible()
   panel_box=panel.bounding_box();assert panel_box['x']>=0 and panel_box['x']+panel_box['width']<=width,panel_box
   assert panel.locator('input,select').evaluate_all('(es)=>es.every(e=>e.getBoundingClientRect().height===32)')
   if output:page.screenshot(path=str(output/f'shopping-room-filters-{width}.png'),full_page=True)
   panel.get_by_label('Desde',exact=True).fill('26')
   panel.get_by_role('button',name='Cancelar',exact=True).click()
   assert page.evaluate("!state.rf.min") and room.locator('.shopping-product-card').count()==1
   filter_button.click();panel.get_by_label('Desde',exact=True).fill('26')
   panel.get_by_role('button',name='Aplicar',exact=True).click()
   assert room.locator('.shopping-product-card').count()==0
   expect(room.get_by_role('button',name='Quitar filtro Desde',exact=True)).to_be_visible()
   room.get_by_role('button',name='Quitar filtro Desde',exact=True).click()
   assert room.locator('.shopping-product-card').count()==1
   filter_button.click();panel.get_by_label('Hasta',exact=True).fill('24')
   panel.get_by_role('button',name='Aplicar',exact=True).click()
   assert room.locator('.shopping-product-card').count()==0
   filter_button.click();panel.get_by_role('button',name='Restablecer',exact=True).click()
   assert room.locator('.shopping-product-card').count()==1
   filter_button.click();panel.get_by_label('Proveedor',exact=True).select_option('Proveedor ficticio')
   panel.get_by_role('button',name='Aplicar',exact=True).click()
   assert room.locator('.shopping-product-card').count()==1
   filter_button.click();filter_button.press('Escape');expect(panel).not_to_be_visible()
   filter_button.click();panel.get_by_role('button',name='Restablecer',exact=True).click()
   search=room.get_by_role('searchbox',name='Buscar producto por nombre, SKU o proveedor')
   expect(search).not_to_be_visible()
   search_button.click()
   room.locator('.shopping-search-collapse').evaluate('(e)=>Promise.all(e.getAnimations().map(a=>a.finished))')
   expect(search).to_be_visible();expect(search).to_be_focused()
   assert search.bounding_box()['height']==32
   assert room.locator('.shopping-search-collapse').bounding_box()['x']>=search_button.bounding_box()['x']+32
   search.fill('inexistente');assert room.locator('.shopping-product-card').count()==0
   search.fill('ficticio');assert room.locator('.shopping-product-card').count()==1
   search.fill('Proveedor ficticio');assert room.locator('.shopping-product-card').count()==1
   if output:page.screenshot(path=str(output/f'shopping-room-search-{width}.png'),full_page=True)
   search.press('Escape');expect(search).not_to_be_visible();expect(search_button).to_be_focused()
   assert page.evaluate("state.roomSearch===''")
   page.emulate_media(reduced_motion='reduce');search_button.click()
   assert room.locator('.shopping-search-collapse').evaluate('(e)=>getComputedStyle(e).transitionDuration')=='0s'
   search.press('Escape');page.emulate_media(reduced_motion='no-preference')
   room.get_by_role('button',name='Exportar lista',exact=True).click()
   expect(page.locator('#modalBox')).to_contain_text('Exportar')
   page.get_by_role('button',name='Cancelar',exact=True).click()
   assert page.evaluate('records()===baseline')
   settings=room.get_by_role('button',name='Ajustes de la lista',exact=True)
   settings.click();expect(page.locator('#rmName')).to_have_value('Salón ficticio')
   page.get_by_role('button',name='Hecho',exact=True).click();assert page.evaluate('records()===baseline')
   delete=room.get_by_role('button',name='Eliminar lista',exact=True)
   delete.hover();delete.evaluate('(e)=>Promise.all(e.getAnimations().map(a=>a.finished))')
   assert delete.evaluate('(e)=>getComputedStyle(e).color')=='rgb(220, 38, 38)'
   delete.click();expect(page.locator('#modalBox')).to_contain_text('Salón ficticio')
   page.get_by_role('alertdialog').get_by_role('button',name='Cancelar',exact=True).click();assert page.evaluate('records()===baseline')
   add=room.get_by_role('button',name='Añadir producto',exact=True)
   expect(add).to_have_text('+ Añadir producto')
   image=add.locator('img');image.evaluate('(img)=>img.decode()')
   assert image.evaluate('(img)=>img.naturalWidth')==640 and image.get_attribute('alt')==''
   add.press('Enter');expect(page.locator('#modalBox h3')).to_have_text('Añadir producto')
   page.get_by_role('button',name='Cancelar',exact=True).click();assert page.evaluate('records()===baseline')
   image.dispatch_event('error');assert image.is_hidden()
   add.click();expect(page.locator('#modalBox h3')).to_have_text('Añadir producto')
   page.get_by_role('button',name='Cancelar',exact=True).click();page.evaluate('render()')
   if output:page.screenshot(path=str(output/f'shopping-room-{width}.png'),full_page=True)
   # A dock selection must leave the room, even when Compras was already selected.
   dock.get_by_role('tab',name='Compras',exact=True).click()
   assert page.evaluate("state.view==='proyecto'&&state.projTab==='listas'")
   overview.locator('.dl-card').first.click()
   page.locator('.shopping-room-view').get_by_role('button',name='Volver a listas de compra',exact=True).click()
   assert page.evaluate("state.view==='proyecto'&&state.projTab==='listas'")
   overview.locator('.dl-card').first.click()
   page.locator('.shopping-room-view').get_by_role('tab',name='Tareas',exact=True).click()
   assert page.evaluate("state.view==='proyecto'&&state.projTab==='tareas'")
   page.evaluate("projTab('listas')")
   overview.evaluate('(e)=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished))')
   assert page.evaluate('records()===baseline')
   buttons=overview.locator('.shopping-action')
   assert buttons.evaluate_all('(es)=>es.map(e=>e.getAttribute("aria-label"))')==['Crear','Exportar','Imprimir']
   assert buttons.locator('.shopping-action-tray').count()==0
   assert buttons.evaluate_all('(es)=>es.every(e=>e.children.length===1&&e.firstElementChild.tagName.toLowerCase()==="svg")')
   boxes=[b.bounding_box() for b in buttons.all()]
   assert all(abs(b['width']-40)<.02 and abs(b['height']-40)<.02 for b in boxes),boxes
   assert len(set(b['y'] for b in boxes))==1,boxes
   for button in buttons.all():
    assert button.get_attribute('title')==button.get_attribute('aria-label')
    assert button.evaluate('(e)=>getComputedStyle(e).borderRadius')=='12px'
    button.focus();assert button.evaluate('(e)=>e===document.activeElement')
   quote=overview.get_by_role('button',name='Generar presupuesto',exact=True)
   assert abs(quote.bounding_box()['width']-200)<.02 and abs(quote.bounding_box()['height']-40)<.02,quote.bounding_box()
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
   assert buttons.first.evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(241, 241, 241)'
   assert buttons.first.locator('svg').evaluate('(e)=>getComputedStyle(e).fill')=='rgb(70, 70, 70)'
   for button in buttons.all():
    page.mouse.move(0,0);button.hover()
    icon=button.locator('svg')
    assert icon.evaluate('(e)=>getComputedStyle(e).animationName')=='none'
    assert icon.evaluate('(e)=>getComputedStyle(e).transform')=='none'
    assert icon.evaluate('(e)=>e.getAnimations().length')==0
    assert icon.evaluate('(e)=>getComputedStyle(e).opacity')=='1'
   buttons.first.hover()
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
   # Confirm deletion only on the newly created fictitious list, through the native prompt.
   page.locator('.shopping-room-view').get_by_role('button',name='Eliminar lista',exact=True).click()
   page.get_by_role('alertdialog').get_by_role('button',name='Eliminar',exact=True).click()
   assert page.evaluate("state.projects[0].rooms.length===4&&state.view==='proyecto'&&state.projTab==='listas'")
   assert not writes,writes;assert not errors,errors
   print(width,'PASS: 40px aligned actions without trays, soft gray hover, supplied styles, expanded groups, CSV/PDF/print selection, guarded quote, native room creation; no remote writes')
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
