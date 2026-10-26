"""Direct shopping product links in the full app, with fictitious records and no external writes."""
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
    if r.request.url.startswith(origin+'/fixture-product?'):r.fulfill(status=200,content_type='text/html',body='<p>Producto ficticio</p>');return
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.context.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   page.evaluate("""origin=>{
    state.projects[0].rooms[0].sections[0].items=[
     {name:'Producto con enlace ficticio',url:origin+'/fixture-product?variant=blue&size=2'},
     {name:'Producto sin enlace ficticio',url:''},
     {name:'Enlace no válido ficticio',url:'javascript:alert(1)'},
     {name:'Enlace de datos ficticio',url:'data:text/html,invalid'},
     {name:'Enlace incorrecto ficticio',url:'not a URL'},
     {name:'Nombre con <caracteres> ficticio',url:'https://tienda.example.invalid/item?variant="blue"&size=2'}
    ].map((x,i)=>({...x,id:'link-'+i,price:25,qty:2,unit:'ud',supplier:'Proveedor ficticio',img:'/brand/illustrations/nuevo-producto.webp'}));
    openRoom(9001,8001);window.linkBaseline=records();
   }""",origin)
   cards=page.locator('.shopping-product-card');links=cards.locator('.shopping-product-quick-link')
   expect(links).to_have_count(2)
   link=cards.first.get_by_role('link',name='Abrir web de Producto con enlace ficticio (nueva pestaña)',exact=True)
   expect(link).to_be_visible();expect(link).to_have_attribute('target','_blank');expect(link).to_have_attribute('rel','noopener noreferrer')
   expect(link).to_have_attribute('href',origin+'/fixture-product?variant=blue&size=2')
   shape=link.bounding_box();media=cards.first.locator('.shopping-product-media').bounding_box()
   assert abs(shape['x']+shape['width']-(media['x']+media['width']-8))<1
   assert abs(shape['y']+shape['height']-(media['y']+media['height']-8))<1
   badges=cards.first.locator('.shopping-product-badges').bounding_box();assert badges['x']+badges['width']<shape['x']
   for card in cards.all()[1:5]:expect(card.locator('.shopping-product-quick-link')).to_have_count(0)
   if output:page.screenshot(path=str(output/f'product-links-{width}.png'))
   for keyboard in [False,True]:
    with page.expect_popup() as event:
     if keyboard:link.focus();page.keyboard.press('Enter')
     else:link.click()
    popup=event.value;popup.wait_for_load_state('domcontentloaded')
    assert popup.url==origin+'/fixture-product?variant=blue&size=2',popup.url
    assert popup.evaluate('window.opener===null');popup.close()
    assert page.evaluate('state.view==="estancia"&&records()===linkBaseline')
    expect(page.locator('.overlay.open')).to_have_count(0)
   cards.first.get_by_role('button',name='Editar Producto con enlace ficticio',exact=True).click()
   expect(page.locator('.overlay.open')).to_be_visible();page.evaluate('closeModal()')
   page.evaluate("shoppingRoomViewMode='rows';render()")
   expect(cards.locator('.shopping-product-quick-link')).to_have_count(0)
   expect(cards.first.locator('.shopping-product-title>.shopping-product-link')).to_be_visible()
   assert page.evaluate('records()===linkBaseline')
   assert not errors,errors;assert not writes,writes
   print(width,'PASS: direct product link, bottom-right geometry, keyboard and pointer open new tab without opener, safe/absent URLs, edit and row link preserved, unchanged data',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
