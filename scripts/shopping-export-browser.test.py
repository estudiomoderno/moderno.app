"""Finance tab press/scroll in the full app, with fictitious records and no external writes."""
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
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://shopping-export-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_shopping-export-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width,height in [(1440,1000),(390,900)]:
   page=browser.new_page(viewport={'width':width,'height':height},locale='es-ES');errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   page.evaluate(r"""()=>{
    const p=state.projects[0];p.rooms=p.rooms.slice(0,2);
    p.rooms[0].name='Estancia A';p.rooms[1].name='Estancia B';
    p.rooms[0].sections[0].items=[{id:'a',name:'Producto A',price:121,qty:2,unit:'ud',supplier:'=A1;Proveedor\nsegunda línea',cost:77,margin:20,note:'NOTA INTERNA PROHIBIDA',cliNote:'Nota pública'},{id:'alt',name:'Alternativa excluida',price:12.1,qty:1,alt:true},{id:'hidden',name:'Producto oculto',price:999,qty:1,hidden:true}];
    p.rooms[1].sections[0].items=[{id:'b',name:'Producto B',price:100,qty:1}];
    state.exOpts={};render();window.productsBefore=JSON.stringify(state.projects);window.printCount=0;
    window.print=()=>{printCount++;window.printHTML=document.getElementById('printZone').innerHTML;window.printCSS=document.getElementById('shopping-export-page')?.textContent;};
    shoppingListExport(9001);
   }""")
   modal=page.locator('#modalBox');expect(modal.get_by_role('heading',name='Selecciona el diseño')).to_be_visible()
   expect(modal.get_by_role('button',name='Diseño de lista',exact=False)).to_be_visible();expect(modal.get_by_role('button',name='Diseño de cuadrícula',exact=False)).to_be_visible()
   modal.locator('.expR[value="8002"]').uncheck()
   modal.get_by_role('button',name='Ajustes de exportación en lista',exact=True).click()
   modal.get_by_label('Mostrar opciones alternativas',exact=True).uncheck()
   modal.get_by_role('button',name='Atrás',exact=True).click()
   assert not modal.locator('.expR[value="8002"]').is_checked()
   if output:page.screenshot(path=str(output/f'export-dialog-{width}.png'))
   modal.get_by_role('button',name='Exportar listas',exact=True).click();page.wait_for_function('printCount===1')
   html=page.evaluate('printHTML');assert html.index('Resumen de listas de compra')<html.index('Cantidad:')
   assert '242,00' in html and '200,00' in html and '42,00' in html,html[-1000:]
   assert all(x not in html for x in ['Estancia B','Producto B','Producto oculto','Alternativa excluida','NOTA INTERNA PROHIBIDA'])
   assert page.evaluate('JSON.stringify(state.projects)===productsBefore')
   page.wait_for_function("!document.getElementById('shopping-export-page')")
   # Select all and exercise grid, landscape and VAT exclusive through the real controls.
   page.evaluate('shoppingListExport(9001)')
   modal.get_by_role('button',name='Diseño de cuadrícula',exact=False).click();modal.get_by_role('button',name='Horizontal',exact=False).click()
   modal.get_by_role('button',name='IVA no incluido',exact=False).click();modal.locator('#shopping-export-tax').fill('10')
   modal.get_by_role('button',name='Exportar listas',exact=True).click();page.wait_for_function('printCount===2')
   html=page.evaluate('printHTML');assert 'IVA no incluido' in html and '376,20' in html and '34,20' in html and '342,00' in html
   assert 'Estancia A' in html and 'Estancia B' in html and 'ex-grid' in html
   assert 'A4 landscape' in page.evaluate('printCSS')
   if output and width==1440:
    page.evaluate("""()=>{const z=document.getElementById('printZone');z.innerHTML=printHTML;z.style.display='block';const style=document.createElement('style');style.id='fixture-pdf-orientation';style.textContent='@page{size:A4 landscape}#printZone .ex-doc.pdf-page{min-height:175mm}';document.head.append(style);}""")
    page.emulate_media(media='print');pdf=output/'shopping-lists-landscape.pdf';page.pdf(path=str(pdf),prefer_css_page_size=True,print_background=True)
    from pypdf import PdfReader
    reader=PdfReader(str(pdf));assert len(reader.pages)==3,len(reader.pages)
    text='\n'.join(p.extract_text() for p in reader.pages);assert 'Resumen de listas de compra' in reader.pages[0].extract_text();assert 'Estancia A' in reader.pages[1].extract_text();assert 'Estancia B' in reader.pages[2].extract_text()
    assert reader.pages[0].mediabox.width>reader.pages[0].mediabox.height
    page.emulate_media(media='screen');page.evaluate("document.getElementById('fixture-pdf-orientation').remove();document.getElementById('printZone').style.display='none'")
   # CSV has the same summary, options and fiscal amounts, with safe spreadsheet text.
   page.evaluate('shoppingListExport(9001)');modal.get_by_role('button',name='Hoja de cálculo',exact=False).click()
   with page.expect_download() as download:modal.get_by_role('button',name='Exportar listas',exact=True).click()
   csv=Path(download.value.path()).read_text(encoding='utf-8-sig')
   assert csv.index('Resumen de listas de compra')<csv.index('Precio unitario aportado')
   assert '376,2' in csv and 'Cuota IVA' in csv and "'=A1;Proveedor" in csv
   assert 'NOTA INTERNA PROHIBIDA' not in csv and 'Alternativa excluida' not in csv
   # Individual room export opens the same design; hiding prices removes tax and financial columns.
   page.evaluate('openRoom(9001,8001);exportRoomModal()')
   expect(modal.get_by_role('heading',name='Selecciona el diseño')).to_be_visible();expect(modal.locator('.expR')).to_have_count(0)
   modal.get_by_role('button',name='Ajustes de exportación en lista',exact=True).click();modal.get_by_label('Mostrar precios',exact=True).uncheck()
   expect(modal.get_by_text('IVA de los precios aportados',exact=True)).to_have_count(0)
   with page.expect_download() as download:modal.get_by_role('button',name='Exportar estancia',exact=True).click()
   text=Path(download.value.path()).read_text(encoding='utf-8-sig');assert all(x not in text for x in ['IVA','Base imponible','Precio unitario','Estancia B','NOTA INTERNA PROHIBIDA'])
   assert page.evaluate('JSON.stringify(state.projects)===productsBefore')
   assert not errors,errors;assert not writes,writes
   print(width,'PASS: shared dialog, selected-only summary, IVA included/excluded, filters, landscape grid, CSV, individual export, hidden prices, source unchanged',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
