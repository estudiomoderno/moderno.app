"""Desktop profile navigation uses the real image picker and renders its preview."""
from base64 import b64decode
from pathlib import Path
import os,socket,subprocess,time,urllib.request
from playwright.sync_api import sync_playwright

repo=Path(__file__).resolve().parents[1]
with socket.socket() as sock:
 sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
environment=dict(os.environ,PORT=str(port),SUPABASE_URL='https://ui-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49')
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=environment,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as response:response.read()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server did not start')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':1000})
  page.route('**/*',lambda route:route.continue_() if route.request.url.startswith(origin+'/') else route.abort())
  page.goto(origin,wait_until='networkidle')
  page.evaluate("""()=>{
   state.sessionUser={name:'Persona ficticia',mail:'persona@example.invalid',avatar:'',prov:'email'};
   state.onboarded=true;state.myRole='admin';_accessRole='admin';_accessLoading=false;
   applySessionUI();showLogin(false);render();userModal();
  }""")
  assert page.evaluate('state.view')=='ajustes'
  assert page.locator('#settings-photo').count()==1
  assert page.locator('#modalBox').is_hidden()
  png=b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
  page.locator('#settings-photo').set_input_files({'name':'perfil.png','mimeType':'image/png','buffer':png})
  page.wait_for_function("document.querySelector('#settings-status')?.textContent.includes('Imagen preparada')")
  assert page.locator('.settings-photo').count()==1
  assert page.locator('.settings-photo').get_attribute('src').startswith('data:image/webp;base64,')
  assert page.evaluate('SettingsUI.dirty()')
  print('1440 PASS: Mi perfil opens the real account editor and prepares the selected photo')
  browser.close()
finally:
 server.terminate()
 try:server.wait(timeout=5)
 except subprocess.TimeoutExpired:server.kill();server.wait()
