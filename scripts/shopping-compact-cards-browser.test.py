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
   page.evaluate("""()=>{
    const p=state.projects[0],r=p.rooms[0];r.sections[0].name='Salón Cocina';r.sections[0].items[1].id='chair';
    p.pres=[{pages:[{els:[{t:'prod',rid:r.id,rsi:0,rii:0},{t:'prod',rid:r.id,rsi:0,rii:1},{t:'prod',src:ModernoSpec.refFor('chair'),rid:r.id,rsi:0,rii:0}]}]}];
    p.moods=[{secs:[{items:[{prodRef:{rid:r.id,rsi:0,rii:0}}]}]}];
    window.libraryBefore=JSON.stringify(state.library);state.rf={status:'Comprado'};render();window.cleanBefore=records();
   }""")
   expect(grid.locator('.shopping-product-card')).to_have_count(3)
   assert grid.locator('.shopping-product-controls,.shopping-product-footer').count()==0
   assert grid.locator('select').count()==0
   first=grid.locator('.shopping-product-card').first
   expect(first.locator('.shopping-product-description')).to_have_text('Proveedor A')
   expect(first.locator('.shopping-product-total')).to_contain_text('200,00')
   expect(first.locator('.shopping-product-unit-price')).to_contain_text('100,00')
   assert first.locator('.shopping-product-total strong').evaluate('(e)=>Number(getComputedStyle(e).fontWeight)>=700')
   media=first.locator('.shopping-product-media').bounding_box();edit=first.get_by_role('button',name='Editar Sillón ficticio',exact=True).bounding_box();move=first.get_by_role('button',name='Mover Sillón ficticio',exact=True).bounding_box()
   assert edit['width']==move['width']==32 and edit['height']==move['height']==32
   assert edit['x']<move['x'] and abs(edit['y']-move['y'])<1
   assert edit['x']>=media['x'] and edit['y']>=media['y']
   assert first.locator('.shopping-product-label').count()==1
   expect(grid.locator('.shopping-product-card').nth(1).locator('.shopping-product-unit-price')).to_contain_text('0,00')
   expect(grid.locator('.shopping-product-card').nth(2).locator('.shopping-product-unit-price')).to_have_text('Por confirmar')
   expect(grid.locator('.shopping-product-card').nth(2).locator('.shopping-product-total strong')).to_have_text('Total por confirmar')
   assert page.evaluate('records()===cleanBefore')
   if output:page.screenshot(path=str(output/f'compact-cards-{width}.png'),full_page=True)
   room.get_by_role('button',name='Filtrar productos',exact=True).click()
   assert room.locator('[name=status]').count()==0
   page.get_by_role('button',name='Aplicar',exact=True).click()
   first.get_by_role('button',name='Editar Sillón ficticio',exact=True).click()
   box=page.locator('#modalBox');box.locator('.shopping-editor-actions>summary').click();expect(box.get_by_role('button',name='Duplicar producto',exact=True)).to_be_attached()
   assert box.locator('#itSt').count()==0
   # Cancel deletion keeps the exact unsaved form and all records.
   box.locator('#itName').fill('Borrador que conservar')
   if page.locator('.shopping-editor-actions:not([open])').count():page.locator('.shopping-editor-actions>summary').click()
   box.get_by_role('button',name='Eliminar producto',exact=True).click()
   confirm=page.locator('#shopping-product-delete');expect(confirm).to_be_visible()
   bounds=confirm.bounding_box()
   assert abs(bounds['x']+bounds['width']/2-width/2)<10 and abs(bounds['y']+bounds['height']/2-500)<10,bounds
   if output:page.screenshot(path=str(output/f'compact-delete-{width}.png'),full_page=True)
   confirm.get_by_role('button',name='Cancelar',exact=True).click();expect(box.locator('#itName')).to_have_value('Borrador que conservar')
   assert page.evaluate('records()===cleanBefore')
   # An action cannot discard the entered values.
   if page.locator('.shopping-editor-actions:not([open])').count():page.locator('.shopping-editor-actions>summary').click()
   box.get_by_role('button',name='Duplicar producto',exact=True).click();expect(box.locator('#itName')).to_have_value('Borrador que conservar');assert page.evaluate('records()===cleanBefore')
   if page.locator('.shopping-editor-actions:not([open])').count():page.locator('.shopping-editor-actions>summary').click()
   box.locator('#itName').fill('Sillón ficticio');box.get_by_role('button',name='Duplicar producto',exact=True).click()
   expect(grid.locator('.shopping-product-card')).to_have_count(4)
   assert page.evaluate("state.projects[0].rooms[0].sections[0].items[1].id!=='chair'")
   # Confirmed delete removes only the selected instance, despite the duplicated historic ID.
   grid.locator('.shopping-product-card').first.get_by_role('button',name='Editar Sillón ficticio',exact=True).click()
   if page.locator('.shopping-editor-actions:not([open])').count():page.locator('.shopping-editor-actions>summary').click()
   box.get_by_role('button',name='Eliminar producto',exact=True).click()
   page.locator('#shopping-product-delete').get_by_role('button',name='Eliminar producto',exact=True).click()
   expect(grid.locator('.shopping-product-card')).to_have_count(3)
   assert page.evaluate("""()=>{
     const p=state.projects[0],r=p.rooms[0],refs=p.pres[0].pages[0].els;
     return r.sections[0].items[1].name==='Mesa ficticia'&&ModernoSpec.resolve(p,refs[0])===null&&ModernoSpec.resolve(p,refs[1]).item.name==='Mesa ficticia'&&ModernoSpec.resolve(p,refs[2])===null&&ModernoSpec.resolve(p,p.moods[0].secs[0].items[0].prodRef)===null&&JSON.stringify(state.library)===libraryBefore;
   }""")
   # Re-opening and saving preserves historic status without showing any status control.
   grid.get_by_role('button',name='Editar Mesa ficticia',exact=True).click();box.locator('#itName').fill('Mesa editada');box.get_by_role('button',name='Guardar',exact=True).click()
   assert page.evaluate("state.projects[0].rooms[0].sections[0].items[1].status==='Revisión Cliente'")
   room.get_by_role('button',name='Vista en filas',exact=True).click()
   assert grid.locator('select').count()==0;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   if output:page.screenshot(path=str(output/f'compact-rows-{width}.png'),full_page=True)
   # A live list change while the confirmation is open cannot delete the new occupant.
   grid.get_by_role('button',name='Editar Mesa editada',exact=True).click()
   if page.locator('.shopping-editor-actions:not([open])').count():page.locator('.shopping-editor-actions>summary').click()
   box.get_by_role('button',name='Eliminar producto',exact=True).click()
   page.evaluate('(()=>{const items=state.projects[0].rooms[0].sections[0].items;items.push(items.shift());})();window.afterExternalChange=records()')
   page.locator('#shopping-product-delete').get_by_role('button',name='Eliminar producto',exact=True).click()
   assert page.evaluate('records()===afterExternalChange')
   box.get_by_role('button',name='Cancelar',exact=True).click()
   # A delayed acknowledgement must not invalidate the next open editor.
   page.evaluate("""()=>{
    const r=getRoom().r;r.sections=[{id:'sequential',name:'General',items:[1,2,3,4].map(i=>({id:'sequential-'+i,name:'Secuencial '+i,price:i,qty:1,files:[]}))}];render();
    ESTUDIO_ID='fixture-only';cloudSnapshotAll();window.fixtureRows={};
    for(const b of Object.keys(CLOUD_BLOCKS))fixtureRows[b]={contenido:JSON.parse(canon(CLOUD_BLOCKS[b].get())),updated_at:'fixture-v0'};
    window.fixtureWrites=0;window.fixtureGate=new Promise(r=>window.fixtureRelease=r);
    window.fixtureRead=async b=>({data:structuredClone(fixtureRows[b])});
    window.fixtureClient={rpc:async(name,params)=>{
      if(name!=='app_guardar_lote'||params.p_estudio!=='fixture-only')throw Error('Unexpected fixture write');
      fixtureWrites++;if(fixtureWrites===1)await fixtureGate;
      return {data:params.p_cambios.map(c=>{fixtureRows[c.bloque]={contenido:structuredClone(c.contenido),updated_at:'fixture-v'+fixtureWrites};return {bloque:c.bloque,updated_at:fixtureRows[c.bloque].updated_at};})};
    }};
   }""")
   flush_source=(repo/'app/index.html').read_text().split('async function cloudFlush(){',1)[1].split('function cloudSnapshotAll(){',1)[0]
   page.evaluate("source=>{window.fixtureFlush=new Function('sb','cloudReadBlock','cloudReadSaveVersions','cloudSaveBatch','return async function cloudFlush(){'+source)(fixtureClient,fixtureRead,async()=>null,(study,plans)=>fixtureClient.rpc('app_guardar_lote',{p_estudio:study,p_cambios:plans.map(p=>({bloque:p.b,contenido:p.merged,base:p.version}))}));}",flush_source)
   def remove_first():
    grid.locator('.shopping-product-card').get_by_role('button',name='Editar Secuencial',exact=False).first.click()
    if page.locator('.shopping-editor-actions:not([open])').count():page.locator('.shopping-editor-actions>summary').click()
    box.get_by_role('button',name='Eliminar producto',exact=True).click()
    page.locator('#shopping-product-delete').get_by_role('button',name='Eliminar producto',exact=True).click()
   remove_first();expect(grid.locator('.shopping-product-card')).to_have_count(3)
   page.evaluate('window.fixtureSaving=fixtureFlush();void 0')
   page.wait_for_function('fixtureWrites===1&&_cloudBusy')
   remove_first();expect(grid.locator('.shopping-product-card')).to_have_count(2)
   grid.locator('.shopping-product-card').get_by_role('button',name='Editar Secuencial',exact=False).first.click()
   page.evaluate('async()=>{fixtureRelease();await fixtureSaving;clearTimeout(_cloudRetryT);}')
   expect(box.locator('#itName')).to_have_value('Secuencial 3')
   if page.locator('.shopping-editor-actions:not([open])').count():page.locator('.shopping-editor-actions>summary').click()
   box.get_by_role('button',name='Eliminar producto',exact=True).click()
   expect(page.locator('#shopping-product-delete')).to_be_visible()
   page.locator('#shopping-product-delete').get_by_role('button',name='Eliminar producto',exact=True).click()
   expect(grid.locator('.shopping-product-card')).to_have_count(1)
   page.evaluate('async()=>{await fixtureFlush();clearTimeout(_cloudRetryT);}')
   assert page.evaluate("canon(fixtureRows.proyectos.contenido)===canon(state.projects)&&fixtureWrites===2&&!syncHasChanges()&&state.projects[0].rooms[0].sections[0].items[0].name==='Secuencial 4'")
   page.evaluate("_accessRole='colaborador';go('proyecto',9001)")
   expect(page.locator('.project-delete-action')).to_have_count(0)
   assert not writes,writes;assert not errors,errors
   print(width,'PASS compact cards, 32px image actions, no states, unknown price, filters, dirty draft/cancel, duplicate and delete exact instance with references preserved; no remote writes',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
