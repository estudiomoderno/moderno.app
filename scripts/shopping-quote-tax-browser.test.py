"""Shopping quote tax choice, fictitious study, no production requests/writes."""
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
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://quote-tax-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_quote-tax-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width,height in [(1440,1000),(1100,900),(390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height},locale='es-ES');errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   page.evaluate("""()=>{const p=state.projects[0];p.rooms=[{id:8001,name:'Salón ficticio',kind:'estancia',sections:[{id:'fake-sec',name:'Mobiliario',items:[{id:'chair',name:'Silla ficticia',qty:2,price:121,cost:40,unit:'ud'},{id:'hidden',name:'Oculto ficticio',qty:1,price:900,hidden:true},{id:'alt',name:'Alternativa ficticia',qty:1,price:800,alt:true}]}]}];state.quotes=[];state.draft=null;state.account.country='España';state.account.taxName='IVA';state.account.vat=21;state.account.currency='EUR';window.flushCalls=0;window.persistCalls=0;persistNow=()=>{persistCalls++};persistSoon=()=>{};cloudFlush=async()=>{flushCalls++;_cloudBusy=false;_saveErr=false;_cloudHash.proyectos=canon(CLOUD_BLOCKS.proyectos.get());};render();window.originalProducts=JSON.stringify(state.projects[0].rooms);}""")
   page.get_by_role('button',name='Generar presupuesto',exact=True).click();dialog=page.locator('#modalBox.shopping-quote-tax-dialog');expect(dialog).to_be_visible()
   expect(dialog).to_contain_text('España');expect(dialog).to_contain_text('IVA 21 %');expect(dialog.get_by_role('button',name='Generar presupuesto',exact=True)).to_be_disabled()
   assert page.evaluate('state.draft===null&&state.quotes.length===0&&flushCalls===0&&persistCalls===0')
   dialog.get_by_role('radio',name='IVA incluido',exact=True).check();expect(dialog.locator('#shopping-quote-tax-preview')).to_contain_text('200,00 €');expect(dialog.locator('#shopping-quote-tax-preview')).to_contain_text('42,00 €');expect(dialog.locator('#shopping-quote-tax-preview')).to_contain_text('242,00 €')
   if output:page.screenshot(path=str(output/f'quote-tax-{width}.png'))
   dialog.get_by_role('button',name='Cancelar',exact=True).click();expect(page.locator('.overlay.open')).to_have_count(0);assert page.evaluate('state.draft===null&&flushCalls===0&&persistCalls===0&&JSON.stringify(state.projects[0].rooms)===originalProducts')
   # Included gross prices become net once; the snapshot retains the source values.
   page.get_by_role('button',name='Generar presupuesto',exact=True).click();dialog.get_by_role('radio',name='IVA incluido',exact=True).check();dialog.get_by_role('button',name='Generar presupuesto',exact=True).click()
   page.wait_for_function("state.view==='presupuestos'&&state.qView==='nuevo'&&state.draft?.lines.length===1")
   assert page.evaluate("state.draft.iva.pct===21&&state.draft.lines[0].price===100&&state.draft.lines[0].qty===2&&state.draft.lines[0].source.snapshot.price===121&&state.draft.lines[0].source.tax.mode==='included'&&JSON.stringify(state.projects[0].rooms)===originalProducts&&state.quotes.length===0")
   # Saving the fixture document retains metadata and the correct total.
   page.evaluate('saveDoc()');assert page.evaluate("state.quotes.length===1&&state.quotes[0].total===242&&state.quotes[0].lines[0].source.tax.rate===21")
   # Another fiscal country uses its configured name/rate; excluded prices add tax.
   page.evaluate("state.draft=null;state.account.country='Reino Unido';state.account.taxName='VAT';state.account.vat=20;state.account.currency='GBP';state.projects[0].rooms[0].sections[0].items[0].price=100;go('proyecto',9001);projTab('listas')")
   page.get_by_role('button',name='Generar presupuesto',exact=True).click();expect(dialog).to_contain_text('Reino Unido');expect(dialog).to_contain_text('VAT 20 %');dialog.get_by_role('radio',name='VAT excluido',exact=True).check();expect(dialog.locator('#shopping-quote-tax-preview')).to_contain_text('240,00')
   dialog.get_by_role('button',name='Generar presupuesto',exact=True).click();page.wait_for_function("state.view==='presupuestos'&&state.draft?.iva.pct===20");assert page.evaluate("state.draft.lines[0].price===100&&state.draft.lines[0].source.tax.name==='VAT'")
   # Fiscal settings edited while choosing do not silently convert with another rate.
   page.evaluate("state.draft=null;go('proyecto',9001);projTab('listas');listToQuote(9001)");dialog.get_by_role('radio',name='VAT incluido',exact=True).check();page.evaluate('state.account.vat=10');dialog.get_by_role('button',name='Generar presupuesto',exact=True).click();expect(dialog.locator('#shopping-quote-tax-error')).to_contain_text('han cambiado');assert page.evaluate("state.view==='proyecto'&&state.draft===null")
   dialog.get_by_role('button',name='Cancelar',exact=True).click()
   # A source-price change during the save boundary cannot replace a document.
   page.evaluate("state.account.vat=20;window.flushRelease=null;cloudFlush=()=>new Promise(r=>{flushRelease=r});listToQuote(9001)");dialog.get_by_role('radio',name='VAT incluido',exact=True).check();dialog.get_by_role('button',name='Generar presupuesto',exact=True).click();page.wait_for_function('!!flushRelease');page.evaluate("state.projects[0].rooms[0].sections[0].items[0].price=99;_cloudHash.proyectos=canon(CLOUD_BLOCKS.proyectos.get());flushRelease()")
   expect(dialog.locator('#shopping-quote-tax-error')).to_contain_text('han cambiado');assert page.evaluate('state.draft===null');dialog.get_by_role('button',name='Cancelar',exact=True).click()
   # Cancelling during the save boundary prevents a late draft and navigation.
   page.evaluate("window.flushRelease=null;window.quoteTaxMessages=[];window.originalTaxToast=toast;toast=s=>quoteTaxMessages.push(s);listToQuote(9001)");dialog.get_by_role('radio',name='VAT incluido',exact=True).check();dialog.get_by_role('button',name='Generar presupuesto',exact=True).click();page.wait_for_function('!!flushRelease')
   dialog.get_by_role('button',name='Cancelar',exact=True).click();page.evaluate("_cloudHash.proyectos=canon(CLOUD_BLOCKS.proyectos.get());flushRelease()");page.wait_for_timeout(100);assert page.evaluate("state.draft===null&&state.view==='proyecto'&&quoteTaxMessages.length===0");page.evaluate('()=>{toast=originalTaxToast;}')
   # A role change while the dialog is open cannot create a draft.
   page.evaluate('listToQuote(9001)');dialog.get_by_role('radio',name='VAT excluido',exact=True).check();page.evaluate("_accessRole='colaborador'");dialog.get_by_role('button',name='Generar presupuesto',exact=True).click();expect(dialog.locator('#shopping-quote-tax-error')).to_contain_text('han cambiado');assert page.evaluate('state.draft===null');dialog.get_by_role('button',name='Cancelar',exact=True).click()
   assert not errors,errors;assert not writes,writes
   print(width,'PASS: explicit tax choice, fiscal labels/rate, live breakdown, cancel without writes, included/excluded conversion, saved snapshot/total and stale fiscal/product/role guards; no remote writes',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
