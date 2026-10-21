"""Shopping labels on the official isolated server, with fictitious records only."""
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
    const p=state.projects[0],base=p.rooms[0].sections[0].items[0];
    p.rooms[0].sections=[
     {id:'light',name:'Iluminación',_c:true,items:[{...structuredClone(base),id:'light-item',name:'Lámpara ficticia',files:[{name:'Ficha ficticia',data:'storage://archivos/ficticio'}],custom:'Conservar',cost:12}]},
     {id:'furniture',name:'Mobiliario',items:[{...structuredClone(base),id:'chair-item',name:'Silla ficticia',price:50}]},
     {id:'general',name:'General',items:[{...structuredClone(base),id:'plain-item',name:'Producto sin etiqueta ficticio',price:75}]},
     {id:'textiles',name:'Textiles',items:[]}
    ];
    p.pres=[{pages:[{els:[{t:'prod',rid:8001,rsi:0,rii:0}]}]}];
    p.moods=[{secs:[{items:[{prodRef:{rid:8001,rsi:0,rii:0}}]}]}];
    openRoom(9001,8001);window.labelBaseline=records();
   }""")
   room=page.locator('.shopping-room-view')
   assert room.locator('.shopping-product-grid').count()==1
   assert room.locator('.shopping-product-card').count()==3
   assert room.locator('.dl-sec,.shopping-section-jump').count()==0
   assert room.get_by_role('button',name='Añadir sección',exact=True).count()==0
   assert room.get_by_role('button',name='Añadir producto',exact=True).count()==1
   assert room.locator('.shopping-product-label').all_inner_texts()==['Iluminación','Mobiliario']
   assert page.evaluate('records()===labelBaseline'),'Opening flattened view must not rewrite legacy data or collapse flags'
   if output:page.screenshot(path=str(output/f'shopping-labels-{width}.png'),full_page=True)
   room.get_by_role('button',name='Filtrar etiqueta Iluminación',exact=True).click()
   assert room.locator('.shopping-product-card').count()==1
   expect(room.locator('.shopping-product-title')).to_contain_text('Lámpara ficticia')
   room.get_by_role('button',name='Quitar filtro Etiqueta',exact=True).click()
   filt=room.get_by_role('button',name='Filtrar productos',exact=True)
   filt.click();panel=room.locator('#shopping-filter-panel')
   panel.get_by_label('Etiqueta',exact=True).select_option('none')
   panel.get_by_role('button',name='Aplicar',exact=True).click()
   assert room.locator('.shopping-product-card').count()==1
   expect(room.locator('.shopping-product-title')).to_contain_text('Producto sin etiqueta ficticio')
   room.get_by_role('button',name='Quitar filtro Etiqueta',exact=True).click()
   assert page.evaluate('records()===labelBaseline'),'Filters must not modify any products'
   # Editing a formerly collapsed label uses its original indices; cancel keeps everything.
   room.get_by_role('button',name='Editar Lámpara ficticia',exact=True).click()
   expect(page.locator('#itLabel')).to_have_value('Iluminación')
   page.locator('#itLabel').fill('Etiqueta sin guardar')
   page.get_by_role('button',name='Cancelar',exact=True).click()
   assert page.evaluate('records()===labelBaseline')
   room.get_by_role('button',name='Editar Lámpara ficticia',exact=True).click()
   page.locator('#itLabel').fill('Textiles')
   page.locator('#modalBox').get_by_role('button',name='Guardar',exact=True).click()
   assert page.evaluate("""()=>{
    const p=state.projects[0],r=p.rooms[0],it=r.sections[3].items[0];
    return r.sections.length===4&&r.sections[0].items.length===0&&it.id==='light-item'&&it.files[0].name==='Ficha ficticia'&&it.custom==='Conservar'&&it.price===25&&it.cost===12&&ModernoSpec.resolve(p,p.pres[0].pages[0].els[0]).item===it&&ModernoSpec.resolve(p,p.moods[0].secs[0].items[0].prodRef).item===it;
   }"""),'Relabel must preserve identity, attachments, prices and both legacy links'
   expect(room.get_by_role('button',name='Filtrar etiqueta Textiles',exact=True)).to_be_visible()
   # Clear label without deleting the historic empty group.
   room.get_by_role('button',name='Editar Lámpara ficticia',exact=True).click()
   page.locator('#itLabel').fill('');page.locator('#modalBox').get_by_role('button',name='Guardar',exact=True).click()
   assert page.evaluate("state.projects[0].rooms[0].sections.length===4&&state.projects[0].rooms[0].sections[2].items.some(it=>it.id==='light-item')")
   assert room.get_by_role('button',name='Filtrar etiqueta Textiles',exact=True).count()==0
   page.evaluate('window.beforeAddLabel=records()')
   room.get_by_role('button',name='Añadir producto',exact=True).click();page.locator('[data-product-method=manual]').click()
   expect(page.locator('#itLabel')).to_have_value('')
   page.locator('#itName').fill('Jarrón ficticio');page.locator('#itPrice').fill('10');page.locator('#itLabel').fill('Decoración ficticia')
   page.get_by_role('button',name='Cancelar',exact=True).click();assert page.evaluate('records()===beforeAddLabel')
   room.get_by_role('button',name='Añadir producto',exact=True).click();page.locator('[data-product-method=manual]').click()
   page.locator('#itName').fill('Jarrón ficticio');page.locator('#itPrice').fill('10');page.locator('#itLabel').fill('Decoración ficticia')
   page.locator('#modalBox').get_by_role('button',name='Guardar',exact=True).click()
   assert page.evaluate("state.projects[0].rooms[0].sections.length===5&&state.projects[0].rooms[0].sections[4].items[0].name==='Jarrón ficticio'")
   assert room.locator('.shopping-product-card').count()==4
   # Reordering must not change a product's label or break its existing references.
   page.evaluate('window.beforeCrossLabel=records();shoppingReorder(1,0,2,0)')
   assert page.evaluate('records()===beforeCrossLabel')
   page.evaluate('shoppingReorder(2,1,2,0)')
   assert page.evaluate("ModernoSpec.resolve(state.projects[0],state.projects[0].pres[0].pages[0].els[0]).item.id==='light-item'")
   # Export still contains all products with their current labels, including historic groups.
   room.get_by_role('button',name='Exportar lista',exact=True).click()
   page.evaluate("exOpts().fmt='xlsx'")
   with page.expect_download() as downloaded:page.get_by_role('button',name='Exportar estancia',exact=True).click()
   csv=Path(downloaded.value.path()).read_text(encoding='utf-8-sig')
   assert all(name in csv for name in ['Lámpara ficticia','Silla ficticia','Producto sin etiqueta ficticio','Jarrón ficticio'])
   # Legacy lists with no General group can add a plain product; cancel creates nothing.
   page.evaluate("state.projects[0].rooms[1].sections[0].name='Mobiliario';openRoom(9001,8002);window.noGeneralBaseline=records()")
   room.get_by_role('button',name='Añadir producto',exact=True).click();page.locator('[data-product-method=manual]').click()
   expect(page.locator('#itLabel')).to_have_value('');page.get_by_role('button',name='Cancelar',exact=True).click()
   assert page.evaluate('records()===noGeneralBaseline')
   room.get_by_role('button',name='Añadir producto',exact=True).click();page.locator('[data-product-method=manual]').click()
   page.locator('#itName').fill('Nuevo sin etiqueta');page.locator('#itPrice').fill('0')
   page.locator('#modalBox').get_by_role('button',name='Guardar',exact=True).click()
   assert page.evaluate("state.projects[0].rooms[1].sections.length===2&&state.projects[0].rooms[1].sections[1].name==='General'&&state.projects[0].rooms[1].sections[1].items[0].price===0")
   # The exact label editor also works with duplicated historical identifiers elsewhere.
   page.evaluate("""()=>{
     const p=state.projects[0],r=p.rooms[0],selected=r.sections.flatMap(s=>s.items).find(it=>it.id==='light-item');
     r.sections[0].id='legacy-repeated-section';r.sections[1].id='legacy-repeated-section';
     p.rooms[1].sections[0].items[0].id=selected.id;
     p.rooms[2].id=p.rooms[3].id;
     const source=r.sections.findIndex(s=>s.items.includes(selected)),index=r.sections[source].items.indexOf(selected);
     p.pres=[{pages:[{els:[{t:'prod',rid:r.id,rsi:source,rii:index}]}]}];
     p.moods=[{secs:[{items:[{prodRef:{rid:r.id,rsi:source,rii:index}}]}]}];
     window.duplicateOther=JSON.stringify(p.rooms.slice(1));window.duplicateProduct=JSON.stringify(selected);
     if(!ModernoSpec.diagnose(p).some(x=>x.blocking))throw Error('Missing duplicate fixture');
     openRoom(9001,r.id);
   }""")
   room.get_by_role('button',name='Editar Lámpara ficticia',exact=True).click()
   page.locator('#itLabel').fill('Etiqueta con duplicados')
   page.locator('#modalBox').get_by_role('button',name='Guardar',exact=True).click()
   expect(page.locator('#overlay')).not_to_have_class('overlay open')
   expect(room.get_by_role('button',name='Filtrar etiqueta Etiqueta con duplicados',exact=True)).to_be_visible()
   assert page.evaluate("""()=>{
     const p=state.projects[0],it=p.rooms[0].sections.at(-1).items.at(-1);
     return JSON.stringify(it)===duplicateProduct&&JSON.stringify(p.rooms.slice(1))===duplicateOther&&
       ModernoSpec.resolve(p,p.pres[0].pages[0].els[0]).item===it&&ModernoSpec.resolve(p,p.moods[0].secs[0].items[0].prodRef).item===it;
   }""")
   if output:page.screenshot(path=str(output/f'shopping-labels-duplicate-ids-{width}.png'),full_page=True)
   assert not writes,writes;assert not errors,errors
   print(width,'PASS: one grid, labels from collapsed legacy groups, optional labels, filtering, cancel/create/edit, references/files preserved, export and guarded reorder; no remote writes')
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
