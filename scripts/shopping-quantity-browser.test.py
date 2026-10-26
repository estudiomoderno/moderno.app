"""Shopping product quantities in the full app, with fictitious records and no external writes."""
from pathlib import Path
import ast,os,socket,subprocess,time,urllib.request,sys
from playwright.sync_api import sync_playwright,expect
repo=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]) if len(sys.argv)>1 else None
if output:output.mkdir(parents=True,exist_ok=True)
parsed=ast.parse((repo/'scripts/shopping-loading-browser.test.py').read_text())
setup=next(ast.literal_eval(n.value) for n in parsed.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='fixture_setup' for t in n.targets))
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://work-calendar-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_work-calendar-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width,height in [(1440,1000),(1100,850),(390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height},locale='es-ES',timezone_id='Europe/Madrid');errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   page.evaluate("""()=>{
    state.projects[0].rooms[0].sections[0].items=[
     {name:'Producto múltiple ficticio',qty:90,unit:'ud',price:9.99},
     {name:'Producto individual ficticio',qty:1,unit:'ud',price:23.95},
     {name:'Superficie ficticia',qty:12.5,unit:'m2',price:10},
     {name:'Cantidad cero ficticia',qty:0,unit:'ud',price:20},
     {name:'Cantidad desconocida ficticia',qty:null,unit:'ud',price:20},
     {name:'Unidad implícita ficticia',qty:2,price:null}
    ].map((x,i)=>({...x,id:'quantity-'+i,supplier:'Proveedor ficticio',img:'/brand/illustrations/nuevo-producto.webp'}));
    openRoom(9001,8001);window.quantityBaseline=records();
   }""")
   cards=page.locator('.shopping-product-card')
   expect(cards).to_have_count(6)
   expect(cards.locator('.shopping-product-quantity')).to_have_text(['90 uds','1 ud','12,5 m²','0 uds','Cantidad por confirmar','2 uds'])
   expect(cards.locator('.shopping-product-total>strong')).to_have_text(['899,10 €','23,95 €','125,00 €','0,00 €','Total por confirmar','Total por confirmar'])
   for card in cards.all():
    quantity=card.locator('.shopping-product-quantity');expect(quantity).to_be_visible()
    box=quantity.bounding_box();area=card.bounding_box();assert box['x']>=area['x'] and box['x']+box['width']<=area['x']+area['width']+1
   if output:page.screenshot(path=str(output/f'quantities-{width}.png'))
   page.evaluate("shoppingRoomViewMode='rows';render()")
   expect(cards.locator('.shopping-product-quantity')).to_have_text(['90 uds','1 ud','12,5 m²','0 uds','Cantidad por confirmar','2 uds'])
   expect(cards.first).to_have_class('shopping-product-card shopping-product-row')
   if output:page.screenshot(path=str(output/f'quantities-rows-{width}.png'))
   assert page.evaluate('records()===quantityBaseline')
   assert not errors,errors;assert not writes,writes
   print(width,'PASS: unit quantities, single units, fractional measures, zero, unknown quantity, unknown price, grid and rows, unchanged data',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
