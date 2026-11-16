"""Floating Mail composer: Gmail-like window, resize controls and real send path."""
from pathlib import Path
import json,os,socket,subprocess,time,urllib.request
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
  page=browser.new_page(viewport={'width':1440,'height':900},locale='es-ES');errors=[];mail_calls=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  def route(request):
   if request.request.url==origin+'/fake-mail':
    body=request.request.post_data_json;mail_calls.append(body);action=body.get('action')
    if action=='status':payload={'ok':True,'connections':[{'id':'mail-fixture','provider':'gmail','status':'connected','email':'persona@example.invalid'}]}
    elif action=='inbox':payload={'ok':True,'messages':[{'id':'message-fixture','from':'cliente@example.invalid','to':'persona@example.invalid','subject':'Correo ficticio','snippet':'Contenido de prueba','timestamp':1794823200000,'unread':True}],'unreadCount':1,'folderCounts':{'inbox':1},'pageIndex':0,'total':1}
    elif action=='send':payload={'ok':True}
    else:payload={'ok':True}
    request.fulfill(status=200,content_type='application/json',body=json.dumps(payload));return
   request.continue_() if request.request.url.startswith(origin+'/') else request.abort()
  page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.wait_for_function('!!window.ModernoMail')
  page.evaluate("""()=>{const root=document.createElement('div');root.id='mail-compose-fixture';root.style.cssText='position:fixed;inset:0;background:white;z-index:40000';document.body.append(root);window.mailToasts=[];const renderFixture=()=>root.innerHTML=ModernoMail.renderMail();ModernoMail.configure({context:()=>({sb:{auth:{getSession:async()=>({data:{session:{access_token:'fixture-token'}},error:null})}},studyId:'study-fixture',userId:'persona@example.invalid',role:'admin',mailFunctionUrl:'/fake-mail',mailFunctionAnonKey:'fixture-anon',setMailUnread:()=>{}}),render:renderFixture,toast:value=>mailToasts.push(value),confirm:()=>{}});renderFixture();ModernoMail.load(true);}""")
  page.wait_for_function("document.querySelector('.mail-message-row')")
  page.get_by_role('button',name='Redactar',exact=True).click()
  composer=page.get_by_role('form',name='Mensaje nuevo');expect(composer).to_be_visible();expect(page.locator('.mail-message-row')).to_be_visible()
  assert composer.evaluate('(e)=>getComputedStyle(e).position')=='fixed'
  box=composer.bounding_box();assert abs(box['width']-620)<1 and abs((900-box['y']-box['height'])-18)<1,box
  assert composer.evaluate('(e)=>getComputedStyle(e).right')=='22px'
  to=composer.get_by_role('textbox',name='Para');subject=composer.get_by_role('textbox',name='Asunto');body=composer.get_by_role('textbox',name='Mensaje')
  to.fill('destino@example.invalid');composer.get_by_role('button',name='Cco',exact=True).click();bcc=composer.get_by_role('textbox',name='Cco',exact=True);bcc.fill('oculta@example.invalid');subject.fill('Asunto ficticio');body.fill('Texto que debe conservarse')
  expect(composer.get_by_role('button',name='Formato de texto')).to_be_visible();expect(composer.get_by_role('button',name='Adjuntar archivo')).to_be_visible();expect(composer.get_by_role('button',name='Insertar imagen')).to_be_visible();expect(composer.get_by_role('button',name='Insertar plantilla')).to_be_visible()
  assert composer.get_by_role('button',name='Enviar',exact=True).evaluate("e=>getComputedStyle(e).backgroundColor")=='rgb(6, 102, 255)'
  composer.get_by_role('button',name='Expandir mensaje').click();assert composer.evaluate("e=>e.classList.contains('is-expanded')");expect(page.locator('.mail-composer-backdrop')).to_be_visible()
  expanded_box=composer.bounding_box();assert abs(expanded_box['x']-18)<1 and abs(expanded_box['y']-12)<1 and expanded_box['width']>1380 and abs(expanded_box['height']-876)<1,expanded_box
  assert to.input_value()=='destino@example.invalid' and bcc.input_value()=='oculta@example.invalid' and subject.input_value()=='Asunto ficticio' and body.input_value()=='Texto que debe conservarse'
  composer.get_by_role('button',name='Restaurar tamaño').click();expect(page.locator('.mail-composer-backdrop')).to_have_count(0)
  composer.get_by_role('button',name='Minimizar mensaje').click();assert composer.evaluate("e=>e.classList.contains('is-minimized')");assert abs(composer.bounding_box()['height']-44)<1
  composer.get_by_role('button',name='Restaurar mensaje').click();expect(body).to_be_visible();assert body.input_value()=='Texto que debe conservarse'
  composer.get_by_role('button',name='Enviar',exact=True).click();expect(composer).to_have_count(0)
  sent=[call for call in mail_calls if call.get('action')=='send'];assert len(sent)==1
  assert sent[0]['to']==['destino@example.invalid'] and sent[0]['bcc']==['oculta@example.invalid'] and sent[0]['subject']=='Asunto ficticio' and sent[0]['body']=='Texto que debe conservarse'
  assert page.evaluate("mailToasts.includes('✓ Correo enviado')") and not errors,errors
  browser.close()
finally:
 server.terminate();server.wait(timeout=5)
