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
  for width in [1680,1440,1100,760,390]:
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
    const r=state.projects[0].rooms[0];
    const names=['Lámpara de mesa en cerámica y lino ficticia','Escritorio en madera con cajones ficticio','Maletero plegable ficticio','Armario ficticio de una puerta y un cajón de pino y MDF crema de 80 cm','Mesa auxiliar redonda ficticia'];
    const items=Array.from({length:10},(_,i)=>({id:'fixture-'+i,name:names[i%5]+(i>4?' adicional':''),price:[94.95,299.95,99.99,399,62.95][i%5],cost:30,qty:i===4?2:1,unit:'ud',status:i%2?'Revisión Cliente':'Borrador',img:'/brand/illustrations/nuevo-producto.webp',supplier:i%5===2?'':i%5===3?'Proveedor ficticio con un nombre especialmente largo que ocupa varias líneas':'Proveedor ficticio',dims:i%3===0?'Ancho 110 cm · alto 76 cm · fondo 45 cm':'',color:i%3===0?'Marrón roble':'',plazo:i%4===0?'Entrega en 2–3 semanas':'',files:i%2?[{name:'Ficha ficticia.pdf',data:'contenido ficticio'}]:[]}));
    r.sections=[{id:'a',name:'Dormitorio 1',items:items.slice(0,6)},{id:'b',name:'General',items:items.slice(6,8)},{id:'c',name:'Etiqueta ficticia con un nombre largo',items:items.slice(8)}];
    openRoom(9001,8001);window.alignmentBaseline=records();
   }""")
   grid=page.locator('.shopping-product-grid')
   page.wait_for_function('[...document.querySelectorAll(".shopping-product-photo img")].every(i=>i.complete&&i.naturalWidth>0)')
   if output:page.screenshot(path=str(output/f'cards-alignment-{width}.png'),full_page=True)
   rows=grid.evaluate("""grid=>{
    const result=new Map(),top=e=>e?e.getBoundingClientRect().top:null;
    for(const card of grid.querySelectorAll('.shopping-product-card')){
     const photo=card.querySelector('.shopping-product-photo'),key=Math.round(top(photo));
     const ps=card.querySelectorAll(':scope >p');
     const row={photo:top(photo),title:top(card.querySelector('.shopping-product-title')),price:top(card.querySelector('.shopping-product-unit-price')),description:top(ps[0]),label:card.querySelector('.shopping-product-label')?.getBoundingClientRect().bottom??null,total:top(card.querySelector('.shopping-product-total')),controls:top(card.querySelector('.shopping-product-controls')),footer:top(card.querySelector('.shopping-product-footer'))};
     if(!result.has(key))result.set(key,[]);result.get(key).push(row);
    }return [...result.values()];
   }""")
   assert len(rows)>1,(width,rows)
   for row in rows:
    if len(row)<2:continue
    for key in ['photo','title','description','label','total']:
     values=[entry[key] for entry in row if entry[key] is not None]
     if values:assert max(values)-min(values)<=1,(width,key,values)
   for name in grid.locator('.shopping-product-title>button').all():
    assert name.evaluate('(e)=>e.scrollHeight<=e.clientHeight+1&&getComputedStyle(e).webkitLineClamp==="none"')
   assert page.evaluate('records()===alignmentBaseline')
   assert grid.locator('.shopping-product-controls,.shopping-product-footer,.shopping-product-quantity').count()==0
   assert grid.locator('select').count()==0
   assert grid.locator('.shopping-product-unit-price').count()==10
   for card in grid.locator('.shopping-product-card').all():
    tag=card.locator('.shopping-product-badges>.shopping-product-label')
    if tag.count():
     photo=card.locator('.shopping-product-photo').bounding_box();badge=tag.bounding_box()
     price=card.locator('.shopping-product-unit-price').bounding_box()
     assert abs(price['x']-badge['x'])<1,(width,price,badge)
     assert abs(badge['y']-price['y']-price['height']-6)<1,(width,price,badge)
     assert price['y']>=photo['y'] and price['x']+price['width']<=photo['x']+photo['width'],(width,price,photo)
     assert badge['x']>=photo['x']+8 and badge['y']>=photo['y']+8,(width,photo,badge)
     assert badge['x']+badge['width']<=photo['x']+photo['width']-8,(width,photo,badge)
     assert abs(photo['y']+photo['height']-badge['y']-badge['height']-10)<1,(width,photo,badge)
   grid.locator('.shopping-product-card').first.get_by_role('button',name='Filtrar etiqueta Dormitorio 1',exact=True).click()
   expect(grid.locator('.shopping-product-card')).to_have_count(6);assert page.locator('#overlay.open').count()==0
   page.get_by_role('button',name='Quitar filtro Etiqueta',exact=True).click();expect(grid.locator('.shopping-product-card')).to_have_count(10)
   assert page.evaluate('records()===alignmentBaseline')
   grid.locator('.shopping-product-card').nth(3).get_by_role('button',name='Editar Armario ficticio de una puerta y un cajón de pino y MDF crema de 80 cm',exact=True).click()
   expect(page.locator('#itName')).to_have_value('Armario ficticio de una puerta y un cajón de pino y MDF crema de 80 cm')
   page.locator('#modalBox').get_by_role('button',name='Cancelar',exact=True).click()
   page.get_by_role('button',name='Vista en filas',exact=True).click();expect(grid.locator('.shopping-product-row')).to_have_count(10)
   assert page.evaluate('records()===alignmentBaseline')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert not errors,errors;assert not writes,writes
   print(width,'PASS: shared card rows align photos, image prices/labels, full titles, shops and bold totals; edit and rows view preserve records',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
