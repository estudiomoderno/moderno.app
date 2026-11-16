"""Exact ReUI Mail delete dialog, rendered from the production bundle."""
from pathlib import Path
import os,socket,subprocess,time,urllib.request
from playwright.sync_api import sync_playwright,expect

repo=Path(__file__).resolve().parents[1]
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://ui-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1):break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server did not start')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':900},locale='es-ES');errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.route('**/*',lambda route:route.continue_() if route.request.url.startswith(origin+'/') else route.abort())
  page.goto(origin,wait_until='networkidle');page.wait_for_function('!!window.ModernoProfileComponent?.mountMailDelete')
  page.evaluate("""()=>{const host=document.createElement('span');host.className='mail-delete-dialog-host';document.body.append(host);let component;const props={count:1,folderLabel:'Recibidos',onCancel:()=>window.mailDeleteResult='cancel',onConfirm:()=>window.mailDeleteResult='confirm'};component=ModernoProfileComponent.mountMailDelete(host,()=>{throw Error('Mail delete component failed');},()=>component.update(props));}""")
  dialog=page.get_by_role('alertdialog');expect(dialog).to_be_visible();expect(dialog).to_have_accessible_name('¿Mover este correo a la papelera?')
  assert dialog.get_attribute('data-size')=='sm'
  assert abs(dialog.bounding_box()['width']-320)<1
  title=dialog.locator('[data-slot=alert-dialog-title]');assert title.evaluate('(e)=>getComputedStyle(e).fontSize')=='16px'
  assert 'Moderno ReUI Inter' in title.evaluate('(e)=>getComputedStyle(e).fontFamily')
  media=dialog.locator('[data-slot=alert-dialog-media]');assert media.bounding_box()['width']==40 and media.locator('svg').bounding_box()['width']==24
  cancel=dialog.get_by_role('button',name='Cancelar',exact=True);confirm=dialog.get_by_role('button',name='Mover a la papelera',exact=True);expect(cancel).to_be_focused()
  cancel.press('Tab');expect(confirm).to_be_focused();confirm.press('Tab');expect(cancel).to_be_focused()
  page.mouse.click(2,450);expect(dialog).to_be_visible();cancel.press('Escape');expect(dialog).not_to_be_visible();assert page.evaluate('mailDeleteResult')=='cancel'
  page.evaluate("""()=>{const host=document.createElement('span');host.className='mail-delete-dialog-host';document.body.append(host);let component;const props={count:2,folderLabel:'Enviados',onCancel:()=>window.mailDeleteResult='cancel-2',onConfirm:()=>window.mailDeleteResult='confirm'};component=ModernoProfileComponent.mountMailDelete(host,()=>{throw Error('Mail delete component failed');},()=>component.update(props));}""")
  plural=page.get_by_role('alertdialog');expect(plural).to_have_accessible_name('¿Mover 2 correos a la papelera?');plural.get_by_role('button',name='Mover a la papelera',exact=True).press('Enter');expect(plural).not_to_be_visible();assert page.evaluate('mailDeleteResult')=='confirm'
  assert not errors,errors
  browser.close()
finally:
 server.terminate();server.wait(timeout=5)
