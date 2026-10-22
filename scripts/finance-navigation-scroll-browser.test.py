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
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://finance-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_finance-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width,height in [(1440,900),(1100,700),(1024,768),(390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height});errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   page.evaluate("go('contabilidad')")
   tabs=page.locator('#page-route-bar .finance-sections');expect(tabs).to_be_visible()
   baseline=page.evaluate('JSON.stringify({projects:state.projects,entries:state.entries,invoices:state.invoices,quotes:state.quotes})')
   # Force actual horizontal overflow, as on narrower windows, without a vertical scrollbar.
   tabs.evaluate("e=>{e.style.width='220px';e.scrollLeft=0;}")
   current=tabs.locator('[data-finance-view=contabilidad]');current.scroll_into_view_if_needed()
   current.hover();page.mouse.down();page.wait_for_timeout(250)
   info=tabs.evaluate("e=>({y:getComputedStyle(e).overflowY,bar:getComputedStyle(e).scrollbarWidth,hidden:getComputedStyle(e,'::-webkit-scrollbar').display,ch:e.clientHeight,sh:e.scrollHeight,sw:e.scrollWidth,cw:e.clientWidth,top:e.scrollTop})")
   assert info['y']=='hidden' and info['bar']=='none' and info['hidden']=='none',info
   assert info['sh']<=info['ch'] and info['top']==0 and info['sw']>info['cw'],info
   if output:page.screenshot(path=str(output/f'finance-pressed-{width}.png'))
   page.mouse.up()
   # Last tab remains reachable by keyboard; hidden bars must not disable horizontal scrolling.
   tabs.locator('button').first.focus()
   for _ in range(4):page.keyboard.press('Tab')
   expect(tabs.locator('[data-finance-view=prevision]')).to_be_focused()
   assert tabs.evaluate('e=>e.scrollLeft>0')
   page.keyboard.press('Enter');page.wait_for_function("state.view==='prevision'")
   expect(page.locator('#page-route-bar [data-finance-view=prevision]')).to_have_attribute('aria-current','page')
   assert page.evaluate('JSON.stringify({projects:state.projects,entries:state.entries,invoices:state.invoices,quotes:state.quotes})')==baseline
   assert not errors,errors;assert not writes,writes
   print(width,'PASS: long press without vertical overflow/bars, horizontal overflow and keyboard navigation retained, records unchanged',flush=True)
   page.close()
  # The native fallback has the same axis restriction when the component cannot load.
  page=browser.new_page(viewport={'width':390,'height':844})
  def fallback_route(r):
   if not r.request.url.startswith(origin+'/') or r.request.method not in ['GET','HEAD']:r.abort();return
   if '/profile-component.js' in r.request.url:r.abort();return
   r.continue_()
  page.route('**/*',fallback_route);page.goto(origin,wait_until='networkidle');page.evaluate(setup);page.evaluate("go('contabilidad')")
  fallback=page.locator('.finance-fallback');expect(fallback).to_be_visible()
  assert fallback.evaluate("e=>getComputedStyle(e).overflowY==='hidden'&&getComputedStyle(e).scrollbarWidth==='none'")
  fallback.locator('[data-finance-view=prevision]').click();page.wait_for_function("state.view==='prevision'")
  print('fallback PASS: horizontal navigation with no vertical scrollbar',flush=True)
  browser.close()
finally:server.terminate();server.wait(timeout=5)
