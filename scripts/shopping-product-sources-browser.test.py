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
   page.evaluate("openRoom(9001,8001);window.records=()=>JSON.stringify({projects:state.projects,library:state.library,quotes:state.quotes,invoices:state.invoices});window.sourceBaseline=records()")
   room=page.locator('.shopping-room-view');add=room.get_by_role('button',name='Añadir producto',exact=True)
   box=page.locator('#modalBox')
   # The top button stays reachable in a long list; the original add-card remains last.
   page.evaluate("window.originalItems=getRoom().r.sections[0].items;getRoom().r.sections[0].items=Array.from({length:45},(_,i)=>({...structuredClone(originalItems[0]),id:'long-'+i}));render();document.querySelector('.main').scrollTop=0;window.longBefore=records()")
   top=room.locator('.shopping-add-toolbar [data-reui-ready=true]').get_by_role('button',name='Añadir producto a esta lista',exact=True)
   page.wait_for_function("!!document.querySelector('.shopping-add-toolbar [data-reui-ready=true]')")
   expect(top).to_be_visible();tb=top.bounding_box();price=room.locator('.dl-budget .dl-num').bounding_box();tools=room.locator('.shopping-room-tools').bounding_box();fil=room.get_by_role('button',name='Filtrar productos',exact=True).bounding_box()
   assert tb['y']>=price['y']+price['height'] and abs(tb['y']+tb['height']/2-fil['y']-fil['height']/2)<2,(tb,fil)
   assert room.locator('.dl-budget').get_by_role('button').count()==0
   assert top.evaluate("el=>el.classList.contains('cn-button-variant-outline')&&!!el.querySelector('svg')")
   assert abs(tb['height']-fil['height'])<2
   assert tb['y']+tb['height']<1000 and add.bounding_box()['y']>1000
   assert page.evaluate("document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.shopping-product-grid').lastElementChild.classList.contains('shopping-add-wrap')")
   if output:page.screenshot(path=str(output/f'product-add-top-{width}.png'))
   top.click();expect(box.get_by_role('heading',name='Añadir producto',exact=True)).to_be_visible()
   expect(box.locator('[data-product-method] strong')).to_have_text(['Manualmente','Desde URL✦ IA','Desde la biblioteca'])
   box.get_by_role('button',name='Cancelar',exact=True).click();assert page.evaluate('records()===longBefore')
   room.get_by_role('button',name='Filtrar productos',exact=True).click()
   panel=room.locator('.shopping-filter-panel')
   assert panel.locator('select').evaluate_all('(els)=>els.map(e=>e.name)')==['label','supplier']
   assert panel.locator('[name=color],[name=status]').count()==0
   panel.locator('[name=label]').select_option('none');panel.locator('[name=supplier]').select_option('Proveedor ficticio')
   panel.locator('[name=min]').fill('20');panel.locator('[name=max]').fill('30');panel.get_by_role('button',name='Aplicar',exact=True).click()
   expect(room.locator('.shopping-product-card')).to_have_count(45)
   room.get_by_role('button',name='Filtrar productos',exact=True).click();panel.locator('[name=max]').fill('10');panel.get_by_role('button',name='Aplicar',exact=True).click()
   expect(room.locator('.shopping-product-card')).to_have_count(0)
   room.get_by_role('button',name='Filtrar productos',exact=True).click();panel.get_by_role('button',name='Restablecer',exact=True).click()
   expect(room.locator('.shopping-product-card')).to_have_count(45)
   page.evaluate("state.rf={color:'Valor antiguo que no coincide'};render()")
   expect(room.locator('.shopping-product-card')).to_have_count(45);assert room.locator('.shopping-filter-chips').count()==0
   page.evaluate('state.rf=null')
   page.evaluate('getRoom().r.sections[0].items=originalItems;render()');assert page.evaluate('records()===sourceBaseline')
   add.click()
   expect(box.get_by_role('heading',name='Añadir producto',exact=True)).to_be_visible()
   expect(box.locator('[data-product-method] strong')).to_have_text(['Manualmente','Desde URL✦ IA','Desde la biblioteca'])
   assert page.evaluate('records()===sourceBaseline')
   bounds=box.bounding_box();assert bounds['x']>=0 and bounds['x']+bounds['width']<=width,bounds
   box.evaluate('(e)=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished))')
   if output:page.screenshot(path=str(output/f'product-sources-{width}.png'),full_page=True)
   box.get_by_role('button',name='Cancelar',exact=True).click()
   assert page.evaluate('records()===sourceBaseline')
   add.click();box.locator('[data-product-method=manual]').click()
   expect(box.get_by_role('heading',name='Añadir producto',exact=True)).to_be_visible()
   assert box.get_by_role('button',name='Importar producto',exact=True).count()==0
   page.locator('#itName').fill('Manual ficticio');page.locator('#itPrice').fill('29.95')
   # A second programmatic request must preserve the open editor.
   page.evaluate('shoppingRoomAddProduct()');expect(page.locator('#itName')).to_have_value('Manual ficticio')
   box.get_by_role('button',name='Cancelar',exact=True).click();assert page.evaluate('records()===sourceBaseline')
   add.click();box.locator('[data-product-method=manual]').click()
   page.locator('#itName').fill('Manual ficticio');page.locator('#itPrice').fill('29.95')
   box.get_by_role('button',name='Guardar',exact=True).click()
   assert page.evaluate("state.projects[0].rooms[0].sections[0].items.some(x=>x.name==='Manual ficticio'&&x.price===29.95)")
   page.evaluate('window.beforeLibrary=records()')
   add.click();box.locator('[data-product-method=library]').click()
   expect(box.get_by_text('Aún no tienes productos en la biblioteca',exact=True)).to_be_visible()
   assert page.evaluate('records()===beforeLibrary')
   box.get_by_role('button',name='Volver',exact=True).click()
   expect(box.locator('[data-product-method]')).to_have_count(3)
   box.get_by_role('button',name='Cancelar',exact=True).click()
   page.evaluate("""()=>{
    state.library=[{id:7101,name:'Mesa ficticia',supplier:'Proveedor ficticio',sku:'M-1',price:45,cost:20,qty:1,img:'/brand/illustrations/nuevo-producto.webp',files:[{name:'Ficha ficticia',data:'contenido-ficticio'}]},
     {id:7102,name:'<Producto ficticio>',supplier:'Decoración',sku:'J-2',price:5,img:'/brand/illustrations/nueva-estancia.webp'}];
    window.libraryBefore=JSON.stringify(state.library);window.countBefore=state.projects[0].rooms[0].sections[0].items.length;
   }""")
   add.click();box.locator('[data-product-method=library]').click()
   expect(box.locator('.shopping-library-product strong')).to_have_text(['Mesa ficticia','<Producto ficticio>'])
   assert box.locator('producto').count()==0
   search=box.get_by_role('searchbox',name='Buscar en la biblioteca')
   search.fill('sin coincidencias');expect(box.get_by_text('No hay productos que coincidan',exact=True)).to_be_visible()
   search.fill('m-1');expect(box.locator('.shopping-library-product')).to_have_count(1)
   box.evaluate('(e)=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished))')
   if output:page.screenshot(path=str(output/f'product-library-{width}.png'),full_page=True)
   box.get_by_role('button',name='Añadir Mesa ficticia',exact=True).click()
   assert page.evaluate("(()=>{const list=state.projects[0].rooms[0].sections[0].items,it=list.at(-1);return list.length===countBefore+1&&it.libId===7101&&it.id!==7101&&it.price===45&&it.files!==state.library[0].files&&JSON.stringify(state.library)===libraryBefore;})()")
   # Stale library indices and changed room context never add to the wrong destination.
   add.click();box.locator('[data-product-method=library]').click()
   page.evaluate('state.library.reverse();window.beforeStale=records()')
   box.get_by_role('button',name='Añadir Mesa ficticia',exact=True).click()
   assert page.evaluate('records()===beforeStale')
   box.get_by_role('button',name='Cancelar',exact=True).click()
   add.click();box.locator('[data-product-method=library]').click()
   page.evaluate('state.currentRoom=8002;window.beforeOtherRoom=records()')
   box.get_by_role('button',name='Añadir Mesa ficticia',exact=True).click()
   assert page.evaluate('records()===beforeOtherRoom')
   box.get_by_role('button',name='Cancelar',exact=True).click();page.evaluate('state.currentRoom=8001')
   # All URL calls are in-memory fakes; the page still blocks every remote request.
   page.evaluate("""(origin)=>{
    window.urlCalls=[];window.captureIds=[];window.coverRevisions=[];window.failCoverSave=true;window.fakeCapture=null;
    window.savedClient=sb;window.savedFlush=cloudFlush;window.savedRead=cloudReadBlock;window.savedApply=cloudApplyRemote;window.savedPersist=persistNow;
    ESTUDIO_ID='estudio-ficticio';cloudFlush=async()=>{};persistNow=()=>{};
    _cloudBusy=false;_cloudHash.proyectos=canon(CLOUD_BLOCKS.proyectos.get());
    cloudReadBlock=async()=>({data:{contenido:window.coverServer,updated_at:'version-ficticia'}});
    cloudApplyRemote=(block,data)=>{state.projects=data;};
    window.mockClipperSb={functions:{invoke:async(name,{body})=>{
     urlCalls.push(body.action);
     if(body.action==='capture'){
      captureIds.push(body.id);
      if(captureIds.length===1)return {error:{context:{status:429,json:async()=>({code:'PT429',error:'Capturas ocupadas'})}}};
      const root='estudio-ficticio/clipper/'+body.id;
      fakeCapture={id:body.id,estado:'preparado',destino:body.destination,destino_snapshot:{kind:'lista',projectName:'Proyecto ficticio',roomName:'Salón ficticio',sectionName:'General'},
       captura:{fields:{name:{value:'Lámpara importada ficticia'},price:{value:'80'},currency:{value:'EUR'},unit:{value:'ud'}},tax:{status:'included'},variant:{verified:true},dimensions:[],domain:'tienda.example.invalid',capturedAt:'2026-10-20T12:00:00Z',suggestions:{category:'Iluminación'},
        images:[{storagePath:root+'/front.webp',previewUrl:origin+'/brand/illustrations/nuevo-producto.webp'},{storagePath:root+'/side.webp',previewUrl:origin+'/brand/illustrations/nueva-estancia.webp'}]}};
      return {data:{id:body.id}};
     }
     return {data:fakeCapture};
    }},rpc:async(name,args)=>{
     if(name!=='clipper_absorber')throw Error('Unexpected RPC');coverRevisions.push(args.p_revision);
     if(failCoverSave)return {error:{message:'Error ficticio de guardado'}};
     coverServer=structuredClone(CLOUD_BLOCKS.proyectos.get());const dest=fakeCapture.destino;
     const items=coverServer.find(p=>String(p.id)===dest.projectId).rooms.find(r=>String(r.id)===dest.roomId).sections.find(s=>String(s.id)===dest.sectionId).items;
     items.push({id:'producto-importado-ficticio',captureId:fakeCapture.id,name:args.p_revision.name,price:80,qty:1,unit:'ud',img:'storage://archivos/'+args.p_revision.primaryImage,files:[],status:'Borrador',cat:args.p_revision.category});
     return {data:{status:'absorbed',itemId:'producto-importado-ficticio'}};
    },storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:origin+'/brand/illustrations/nuevo-producto.webp'}})})}};
    window.beforeCapture=records();
   }""",origin)
   # Inject only the importer transport. The actual application's SDK stays null.
   page.evaluate("source=>{window.originalClipperOpen=ProductClipper.open;const fixtureClipper=new Function('sb',source+';return ProductClipper;')(mockClipperSb);ProductClipper.open=fixtureClipper.open;}",(repo/'app/product-clipper.js').read_text())
   add.click();box.locator('[data-product-method=url]').click()
   dialog=page.get_by_role('dialog',name='Importar producto desde una tienda',exact=True)
   expect(dialog).to_be_visible();assert box.is_hidden()
   expect(dialog.locator('.clipper-ai-badge')).to_have_text('✦ IA')
   dialog.get_by_role('button',name='Cerrar importador',exact=True).click()
   assert page.evaluate('urlCalls.length===0&&coverRevisions.length===0&&records()===beforeCapture')
   add.click();box.locator('[data-product-method=url]').click();expect(dialog).to_be_visible()
   dialog.get_by_label('Enlace del producto',exact=True).fill('https://tienda.example.invalid/lampara-ficticia')
   dialog.get_by_role('button',name='Obtener datos',exact=True).click()
   expect(dialog.get_by_role('status').first).to_contain_text('se iniciará automáticamente')
   expect(dialog.get_by_label('Enlace del producto',exact=True)).to_be_disabled()
   if output:page.screenshot(path=str(output/f'product-url-waiting-{width}.png'),full_page=True)
   cover=dialog.get_by_role('radio',name='Usar imagen 2 como portada',exact=True)
   expect(cover).to_be_visible();cover.check()
   expect(cover).to_be_checked()
   assert page.evaluate('urlCalls.join()===\'capture,capture,read\'&&captureIds.length===2&&captureIds[0]===captureIds[1]&&coverRevisions.length===0&&records()===beforeCapture')
   assert dialog.locator('.clipper-gallery img').count()==2
   assert cover.locator('..').evaluate("e=>e.getBoundingClientRect().width")==112
   if output:page.screenshot(path=str(output/f'product-url-cover-{width}.png'),full_page=True)
   dialog.get_by_role('button',name='Añadir producto',exact=True).click()
   expect(dialog.get_by_role('status').last).to_contain_text('Error ficticio')
   expect(cover).to_be_checked();assert page.evaluate('records()===beforeCapture')
   page.evaluate('failCoverSave=false');dialog.get_by_role('button',name='Añadir producto',exact=True).click()
   expect(dialog).not_to_be_visible()
   expect(page.locator('#itName')).to_have_value('Lámpara importada ficticia')
   assert page.evaluate("coverRevisions.length===2&&coverRevisions.every(r=>r.primaryImage.endsWith('/side.webp'))&&itImg.endsWith('/side.webp')")
   assert page.evaluate("state.projects[0].rooms[0].sections[0].items.filter(x=>x.id==='producto-importado-ficticio').length===1")
   box.get_by_role('button',name='Cancelar',exact=True).click()
   page.evaluate('ProductClipper.open=originalClipperOpen;cloudFlush=savedFlush;cloudReadBlock=savedRead;cloudApplyRemote=savedApply;persistNow=savedPersist')
   assert page.evaluate('sb===null')
   assert not writes,writes;assert not errors,errors
   print(width,'PASS: three sources, manual save/cancel, library search/copy/guards, URL review without autosave, second cover retained on error and sent on explicit save; no remote writes')
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
