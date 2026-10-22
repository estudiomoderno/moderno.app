"""Original split login: responsive presentation and existing auth handlers, fictitious client only."""
from pathlib import Path
import os,socket,subprocess,time,urllib.request,sys
from playwright.sync_api import sync_playwright,expect
repo=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]) if len(sys.argv)>1 else None
if output:output.mkdir(parents=True,exist_ok=True)
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://login-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for attempt in range(100):
  try:
   with opener.open(origin,timeout=1) as response:assert 'moderno_pruebas_login-fixture' in response.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width,height in [(1440,1000),(1024,768),(900,500),(800,900),(390,844),(320,568)]:
   page=browser.new_page(viewport={'width':width,'height':height},locale='es-ES');errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.add_init_script("""
    window.authCalls=[];
    window.supabase={createClient(url,key){if(url!=='https://login-fixture.supabase.co')throw Error('Unexpected backend');return {auth:{
     getSession:async()=>({data:{session:null},error:null}),
     onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
     signInWithPassword:async args=>{authCalls.push({kind:'password',args});await new Promise(r=>setTimeout(r,30));return {error:{message:'Invalid credentials'}};},
     signUp:async args=>{authCalls.push({kind:'signup',args});return {error:null};},
     resetPasswordForEmail:async(email,args)=>{authCalls.push({kind:'reset',email,args});return {error:null};},
     signInWithOAuth:async args=>{authCalls.push({kind:'oauth',args});return {error:null};}
    }};}};
   """)
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle')
   screen=page.locator('#loginScreen');expect(screen).to_be_visible()
   page.wait_for_function("!document.getElementById('appLoading')||getComputedStyle(document.getElementById('appLoading')).display==='none'",timeout=15000)
   expect(page.get_by_role('region',name='Inicio de sesión',exact=True)).to_be_visible()
   expect(page.locator('.studio-login-scene-logo,.studio-login-story,.studio-login-heading')).to_have_count(0)
   logo=page.locator('.studio-login-wordmark').bounding_box();field=page.locator('#lgEmail').bounding_box()
   assert abs(logo['x']+logo['width']/2-field['x']-field['width']/2)<1,(logo,field)
   assert logo['y']+logo['height']<field['y']
   assert page.locator('#lg-apple').is_hidden(), 'Unconfigured Apple must remain hidden'
   assert page.locator('#lgEmail').get_attribute('autocomplete')=='username'
   assert page.locator('#lgPass').get_attribute('autocomplete')=='current-password'
   assert page.locator('.studio-login-scene').is_visible()==(width>800)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert screen.evaluate('e=>e.scrollWidth<=e.clientWidth')
   page.wait_for_function("document.querySelector('.studio-login-photo').complete&&document.querySelector('.studio-login-photo').naturalWidth>0")
   if output:page.screenshot(path=str(output/f'login-{width}-{height}.png'))
   page.get_by_label('Correo electrónico',exact=True).fill('persona@example.invalid')
   page.get_by_label('Contraseña',exact=True).fill('Fictional-password-123')
   page.locator('#lgPass').press('Enter')
   page.wait_for_function("authCalls.filter(x=>x.kind==='password').length===1")
   expect(page.locator('#toast')).to_contain_text('Correo o contraseña incorrectos')
   expect(page.locator('#lg-mail')).to_be_enabled();expect(screen).to_be_visible()
   page.get_by_role('button',name='Crear cuenta',exact=True).click()
   page.wait_for_function("authCalls.some(x=>x.kind==='signup')")
   page.get_by_role('button',name='¿La has olvidado?',exact=True).click()
   expect(page.locator('#rstMail')).to_have_value('persona@example.invalid')
   page.get_by_role('button',name='Enviar enlace',exact=True).click()
   page.wait_for_function("authCalls.some(x=>x.kind==='reset')")
   page.get_by_role('button',name='Continuar con Google',exact=True).click()
   page.wait_for_function("authCalls.some(x=>x.kind==='oauth'&&x.args.provider==='google')")
   assert page.evaluate("authCalls.every(x=>x.kind!=='oauth'||x.args.options.redirectTo.startsWith(location.origin))")
   page.evaluate("document.body.classList.add('dark')")
   assert page.locator('#lgEmail').evaluate("e=>getComputedStyle(e).backgroundColor==='rgb(255, 255, 255)'")
   page.evaluate("showLogin(false)");expect(screen).to_be_hidden()
   page.evaluate("showLogin(true)");expect(screen).to_be_visible()
   assert not errors,errors;assert not writes,writes
   print(width,height,'PASS: layout, small/short screens, labelled fields, Enter login, failed login, signup, reset, Google, Apple hidden, dark mode, visibility; fictitious auth only',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
