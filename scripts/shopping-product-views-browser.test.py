"""Shopping cards/rows, add-last placement and restored client portal, with fictitious records only."""
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
  for width in [1680,1440,1100,390]:
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
   page.evaluate("openRoom(9001,8001);window.records=()=>JSON.stringify({projects:state.projects,library:state.library,quotes:state.quotes,invoices:state.invoices});window.sourceBaseline=records()")
   page.evaluate("""()=>{
    const p=state.projects[0],r=p.rooms[0];p.cliShare={token:'portal-ficticio',active:true,money:false};
    const image=(w,h)=>'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#e3e6e9"/><circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)/2}" fill="#b4bbc3"/></svg>`);
    r.sections=[{id:'section-0',name:'General',items:[
     {id:'chair',addedAt:'2026-10-18T12:00:00Z',name:'Sillón ficticio',url:'https://tienda.example.invalid/sillon',img:'/brand/illustrations/nuevo-producto.webp',price:100,cost:80,qty:2,unit:'ud',supplier:'Proveedor A',dims:'76 × 79 × 80 cm',material:'Poliéster',color:'Azul índigo',plazo:'2-3 semanas',sku:'S-001',status:'Revisión Cliente',note:'Nota ficticia',files:[{name:'Ficha ficticia.pdf',data:'contenido-ficticio'}],custom:'Conservar'},
     {id:'table',createdAt:'2026-10-20T12:00:00Z',name:'Mesa ficticia',img:image(800,200),price:0,cost:0,qty:3,unit:'ud',supplier:'Proveedor B',status:'Revisión Cliente'},
     {id:'lamp',name:'Lámpara ficticia',img:image(180,800),price:null,cost:null,qty:1,unit:'ud',supplier:'Proveedor A',status:'Revisión Cliente'}
    ]}];
    p.rooms[1].sections[0].items=[];
    projTab('cliente');projTab('listas');openRoom(9001,8001);window.viewBaseline=records();
   }""")
   room=page.locator('.shopping-room-view');grid=room.locator('.shopping-product-grid')
   def last_add():
    assert grid.evaluate('(e)=>e.lastElementChild.classList.contains("shopping-add-wrap")')
    assert grid.locator('.shopping-add-wrap').count()==1
   last_add()
   page.wait_for_function('[...document.querySelectorAll(".shopping-product-photo img")].every(i=>i.complete&&i.naturalWidth>0)')
   for img in grid.locator('.shopping-product-photo img').all():
    assert img.evaluate('(e)=>getComputedStyle(e).objectFit')=='cover'
    b=img.bounding_box();photo=img.locator('..').bounding_box()
    assert b['width']>=photo['width']-1 and b['height']>=photo['height']-1,(b,photo)
   if output:page.screenshot(path=str(output/f'shopping-cards-{width}.png'),full_page=True)
   tools=room.locator('.shopping-room-tools')
   toggle=tools.get_by_role('button',name='Vista en filas',exact=True)
   assert tools.locator(':scope > *').evaluate_all('(es)=>es.map(e=>e.className)')==['shopping-filter-control','shopping-tool-button','shopping-sort-control','shopping-search-group']
   sizes=[tools.get_by_role('button',name=name,exact=True).bounding_box() for name in ['Filtrar productos','Vista en filas','Ordenar productos','Buscar producto']]
   assert all(x['width']==32 and x['height']==32 for x in sizes),sizes
   toggle.click();expect(toggle).to_have_attribute('aria-pressed','true')
   assert page.evaluate('records()===viewBaseline')
   assert page.evaluate('document.activeElement.id')=='shopping-view-toggle'
   expect(grid.locator('.shopping-product-row')).to_have_count(3);last_add()
   assert page.locator('.shopping-room-view').evaluate('(e)=>e.scrollWidth<=e.clientWidth'),width
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
   first=grid.locator('.shopping-product-card').first
   expect(first.locator('dt')).to_have_text(['Dimensiones','Color','Plazo de entrega','Precio unitario','Coste profesional','Material','Proveedor','Referencia / SKU','Cantidad','Precio total','Nota interna'])
   expect(first.locator('dd')).to_contain_text(['76 × 79 × 80 cm','Azul índigo','2-3 semanas','100,00','80,00','Poliéster','Proveedor A','S-001','2 ud','200,00','Nota ficticia'])
   expect(first.locator('a.shopping-product-link')).to_have_attribute('href','https://tienda.example.invalid/sillon')
   expect(first.locator('a.shopping-product-link')).to_have_attribute('rel','noopener noreferrer')
   expect(grid.locator('.shopping-product-card').nth(1).locator('dd').nth(9)).to_contain_text('0,00')
   expect(grid.locator('.shopping-product-card').nth(2).locator('dd').nth(9)).to_have_text('Por confirmar')
   if output:page.screenshot(path=str(output/f'shopping-rows-{width}.png'),full_page=True)
   # Sort all labels without mutating records; every action retains its source indices.
   sorter=tools.get_by_role('button',name='Ordenar productos',exact=True)
   expected=[('Más recientes primero',['Mesa ficticia','Sillón ficticio','Lámpara ficticia']),('Más antiguos primero',['Sillón ficticio','Mesa ficticia','Lámpara ficticia']),('Precio: menor a mayor',['Mesa ficticia','Sillón ficticio','Lámpara ficticia']),('Precio: mayor a menor',['Sillón ficticio','Mesa ficticia','Lámpara ficticia'])]
   for option,names in expected:
    sorter.click();menu=page.get_by_role('menu',name='Orden de productos',exact=True)
    expect(menu).to_be_visible();menu.get_by_role('menuitemradio',name=option,exact=True).click()
    expect(grid.locator('.shopping-product-title>button')).to_have_text(names);last_add()
    assert page.evaluate('records()===viewBaseline')
    assert grid.locator('[draggable=true]').count()==0
    assert all(b.is_disabled() for b in grid.locator('.shopping-product-grip').all())
    assert page.evaluate('document.activeElement.id')=='shopping-sort-toggle'
   sorter.click();menu.get_by_role('menuitemradio',name='Precio: menor a mayor',exact=True).click()
   grid.locator('.shopping-product-card').first.get_by_role('button',name='Editar Mesa ficticia',exact=True).click()
   expect(page.locator('#itName')).to_have_value('Mesa ficticia');page.locator('#itName').fill('Borrador conservado')
   page.evaluate("shoppingRoomSortSet('manual')");expect(page.locator('#itName')).to_have_value('Borrador conservado')
   assert page.evaluate("shoppingRoomSort==='price-asc'")
   page.locator('#modalBox').get_by_role('button',name='Cancelar',exact=True).click()
   toggle.click();expect(grid.locator('.shopping-product-title>button')).to_have_text(['Mesa ficticia','Sillón ficticio','Lámpara ficticia'])
   toggle.click();sorter.click()
   menu.evaluate('(e)=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished))')
   if output:page.screenshot(path=str(output/f'shopping-sort-{width}.png'),full_page=True)
   bounds=menu.bounding_box();assert bounds['x']>=0 and bounds['x']+bounds['width']<=width,bounds
   sorter.press('ArrowDown');page.keyboard.press('End');page.keyboard.press('Escape')
   expect(menu).not_to_be_visible();assert page.evaluate('document.activeElement.id')=='shopping-sort-toggle'
   sorter.click();menu.get_by_role('menuitemradio',name='Orden manual',exact=True).click()
   assert page.evaluate('records()===viewBaseline');expect(grid.locator('.shopping-product-title>button')).to_have_text(['Sillón ficticio','Mesa ficticia','Lámpara ficticia'])
   assert all(b.is_enabled() for b in grid.locator('.shopping-product-grip').all())
   # Filters and search remain active across both presentations.
   tools.get_by_role('button',name='Filtrar productos',exact=True).click()
   page.locator('#shopping-filter-panel').get_by_role('combobox',name='Proveedor',exact=True).select_option('Proveedor A')
   page.locator('#shopping-filter-panel').get_by_role('button',name='Aplicar',exact=True).click()
   expect(grid.locator('.shopping-product-card')).to_have_count(2)
   sorter.click();menu.get_by_role('menuitemradio',name='Precio: menor a mayor',exact=True).click()
   expect(grid.locator('.shopping-product-card')).to_have_count(2)
   assert page.evaluate("shoppingRoomSort==='price-asc'")
   toggle.click();expect(grid.locator('.shopping-product-row')).to_have_count(0)
   expect(grid.locator('.shopping-product-card')).to_have_count(2);last_add()
   assert page.evaluate('records()===viewBaseline')
   room.get_by_role('button',name='Quitar filtro Proveedor',exact=True).click()
   tools.get_by_role('button',name='Buscar producto',exact=True).click()
   page.locator('#rsearch').fill('Mesa');expect(grid.locator('.shopping-product-card')).to_have_count(1)
   toggle.click();expect(page.locator('#rsearch')).to_have_value('Mesa');last_add()
   page.locator('#rsearch').fill('sin coincidencias');expect(grid.locator('.shopping-product-card')).to_have_count(0)
   expect(grid.get_by_text('No hay productos que coincidan con los filtros.',exact=True)).to_be_visible();last_add()
   page.locator('#rsearch').press('Escape');expect(grid.locator('.shopping-product-card')).to_have_count(3)
   assert page.evaluate('records()===viewBaseline')
   sorter.click();menu.get_by_role('menuitemradio',name='Orden manual',exact=True).click()
   # Existing editor/actions work from a row, and cancellation preserves the original.
   first.get_by_role('button',name='Editar Sillón ficticio',exact=True).click()
   page.locator('#itName').fill('Descartado')
   page.locator('#modalBox').get_by_role('button',name='Cancelar',exact=True).click()
   assert page.evaluate('records()===viewBaseline')
   room.get_by_role('button',name='Añadir producto',exact=True).click()
   page.locator('[data-product-method=manual]').click()
   page.locator('#itName').fill('Producto nuevo ficticio');page.locator('#itPrice').fill('20')
   page.locator('#modalBox').get_by_role('button',name='Guardar',exact=True).click()
   expect(grid.locator('.shopping-product-card')).to_have_count(4);last_add()
   expect(grid.locator('.shopping-product-card').last.get_by_role('button',name='Producto nuevo ficticio',exact=True)).to_be_visible()
   # Keyboard ordering is still available. Pointer ordering in rows follows the vertical midpoint.
   grid.get_by_role('button',name='Mover Mesa ficticia',exact=True).press('ArrowUp')
   assert page.evaluate("state.projects[0].rooms[0].sections[0].items[0].id==='table'")
   if width>=1100:
    target=grid.locator('.shopping-product-card').first;target.scroll_into_view_if_needed()
    moved=grid.get_by_role('button',name='Mover Sillón ficticio',exact=True);moved.scroll_into_view_if_needed()
    a=moved.bounding_box();b=target.bounding_box()
    page.mouse.move(a['x']+a['width']/2,a['y']+a['height']/2);page.mouse.down()
    page.mouse.move(b['x']+b['width']-110,b['y']+20,steps=8);page.mouse.up()
    assert page.evaluate("state.projects[0].rooms[0].sections[0].items[0].id==='chair'")
   assert page.evaluate("(()=>{const i=state.projects[0].rooms[0].sections[0].items.find(i=>i.id==='chair');return i.custom==='Conservar'&&i.files[0].data==='contenido-ficticio'&&i.price===100&&i.cost===80&&i.qty===2;})()")
   last_add();toggle.click();last_add()
   page.evaluate('openRoom(9001,8002)');expect(grid.locator('.shopping-product-card')).to_have_count(0);last_add()
   expect(room.get_by_role('button',name='Añadir producto',exact=True)).to_be_visible()
   # Portal access is restored in the dock, including when a shopping list is open.
   portal=room.get_by_role('tab',name='Portal del cliente',exact=True)
   assert portal.count()==1;portal.click()
   assert page.evaluate("state.view==='proyecto'&&state.projTab==='cliente'&&state.currentProject===9001")
   expect(page.locator('.client-project-editor').get_by_role('heading',name='Portal del cliente',exact=True)).to_be_visible()
   expect(page.get_by_role('tab',name='Portal del cliente',exact=True)).to_have_attribute('aria-selected','true')
   assert page.evaluate("state.projects[0].cliShare.token==='portal-ficticio'")
   assert page.evaluate('sb===null')
   assert not writes,writes;assert not errors,errors
   print(width,'PASS: cover images, add last/empty/filter/create/reorder, rows toggle, four aligned tools, date/price/manual sorting, stable action indices, keyboard, detail prices, filters/search, edit cancel and restored native portal; no remote writes')
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
