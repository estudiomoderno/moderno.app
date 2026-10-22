"""Invitation screen and real local PostgreSQL acceptance; no real users, mail or writes."""
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
import json
study='33333333-3333-4333-8333-333333333333'
uid='10000000-0000-4000-8000-000000000001'
def pg(sql):
 result=subprocess.run(['docker','exec','-i','moderno-invitation-fixture','psql','-U','postgres','-Atq','-v','ON_ERROR_STOP=1'],input=sql,text=True,capture_output=True)
 return result
try:
 for attempt in range(100):
  try:
   with opener.open(origin,timeout=1) as response:assert 'moderno_pruebas_login-fixture' in response.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [1440,390]:
   for scenario in ['accepted','wrong-email','cancelled']:
    setup=pg("delete from public.miembros where user_id='"+uid+"';delete from public.invitaciones where lower(email)='invited@example.invalid';"+("insert into public.invitaciones values('"+study+"','invited@example.invalid','miembro','55555555-5555-4555-8555-555555555555');" if scenario!='cancelled' else ''))
    assert setup.returncode==0,setup.stderr
    page=browser.new_page(viewport={'width':width,'height':900},locale='es-ES');errors=[];writes=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    def accept(args):
     assert args=={'p_estudio':study},args
     r=pg("begin;set local role authenticated;select set_config('request.jwt.claim.sub','"+uid+"',true);select public.app_aceptar_invitacion('"+study+"');commit;")
     if r.returncode:return {'error':{'code':'42501','message':'La invitación no está disponible para esta cuenta.'}}
     return {'data':json.loads([line for line in r.stdout.splitlines() if line.startswith('{')][-1])}
    page.expose_function('fixtureAccept',accept)
    page.add_init_script("""
     window.authCalls=[];window.rpcCalls=[];window.fixtureUser={id:'10000000-0000-4000-8000-000000000001',email:'invited@example.invalid',user_metadata:{name:'Persona ficticia'},app_metadata:{provider:'email'}};
     window.supabase={createClient(url){if(url!=='https://login-fixture.supabase.co')throw Error('Wrong backend');return {
      auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:fixtureUser}}),onAuthStateChange:cb=>{window.fixtureAuthEvent=cb;return {data:{subscription:{unsubscribe(){}}}};},
      signUp:async args=>{authCalls.push({kind:'signup',args});return {data:{user:{id:fixtureUser.id},session:null}};},
      signInWithPassword:async args=>{authCalls.push({kind:'password',args});return {error:null};},
      signInWithOAuth:async args=>{authCalls.push({kind:'oauth',args});return {error:null};}},
      rpc:async(name,args)=>{rpcCalls.push({name,args});if(name==='app_aceptar_invitacion')return fixtureAccept(args);if(name==='app_rol')return {data:'colaborador'};if(name==='app_leer_bloques')return {data:fixtureRows};return {error:{message:'Unexpected RPC '+name}};},
      channel(){throw Error('Offline presence fixture');}
     };}};
    """)
    def route(r):
     if not r.request.url.startswith(origin+'/'):r.abort();return
     if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
     r.continue_()
    page.route('**/*',route)
    page.goto(origin+'/?invitacion='+study+'&correo=invited%40example.invalid',wait_until='networkidle')
    page.wait_for_function("document.querySelector('#login-invite-confirm').hidden===false")
    expect(page.locator('#lgEmail')).to_be_hidden()
    expect(page.locator('#login-signup')).to_be_hidden()
    expect(page.locator('#lgPassConfirm')).to_be_visible()
    assert page.locator('#lgEmail').input_value()=='invited@example.invalid'
    page.get_by_label('Contraseña',exact=True).fill('Fictional-password-123')
    page.get_by_label('Repite tu contraseña',exact=True).fill('Different-password-123')
    page.get_by_role('button',name='Aceptar invitación',exact=True).click()
    expect(page.locator('#toast')).to_contain_text('no coinciden')
    assert page.evaluate('authCalls.length===0')
    page.get_by_label('Repite tu contraseña',exact=True).fill('Fictional-password-123')
    if output and scenario=='accepted':page.screenshot(path=str(output/f'invitation-{width}.png'))
    page.get_by_role('button',name='Aceptar invitación',exact=True).click()
    page.wait_for_function("authCalls.some(x=>x.kind==='signup')")
    assert page.evaluate("authCalls[0].args.email==='invited@example.invalid'&&authCalls[0].args.options.emailRedirectTo.includes('invitacion=')")
    assert page.evaluate('rpcCalls.length===0'), 'No study acceptance before verified sign-in'
    page.get_by_role('button',name='Continuar con Google',exact=True).click()
    assert page.evaluate("authCalls.some(x=>x.kind==='oauth'&&x.args.options.queryParams.login_hint==='invited@example.invalid'&&x.args.options.redirectTo.includes('invitacion='))")
    page.evaluate("""()=>{
     const project=structuredClone(state.projects[0]);Object.assign(project,{id:9001,name:'Proyecto compartido ficticio',num:'PR-9001',brand:'cm',tpl:false,client:'Cliente ficticio',tasks:[],files:[],rooms:[{id:8001,kind:'estancia',name:'Lista del equipo',sections:[{id:'general',name:'General',items:[{id:'fixture-item',name:'Producto compartido ficticio',price:25,qty:1}]}]}]});
     const cfg=structuredClone(CLOUD_BLOCKS.config.get());cfg.account.name='Equipo ficticio';cfg.users=[];cfg.onboarded=true;
     window.fixtureRows=[{bloque:'config',contenido:cfg,updated_at:'2026-10-22T00:00:00Z',rol:'colaborador'},{bloque:'proyectos',contenido:[project],updated_at:'2026-10-22T00:00:00Z',rol:'colaborador'}];
    }""")
    if scenario=='wrong-email':page.evaluate("fixtureUser.email='wrong@example.invalid'")
    page.evaluate("fixtureAuthEvent('SIGNED_IN',{user:fixtureUser})")
    if scenario=='accepted':
     page.wait_for_function("!_accessLoading&&ESTUDIO_ID==='33333333-3333-4333-8333-333333333333'",timeout=15000)
     assert page.evaluate("state.projects.some(p=>p.name==='Proyecto compartido ficticio'&&p.rooms[0].name==='Lista del equipo')")
     assert page.evaluate('ModernoInvitations.context()===null')
    else:
     page.wait_for_function('!!_accessError',timeout=15000)
     assert page.evaluate('_accessLoading&&ESTUDIO_ID===null')
     expect(page.get_by_role('button',name='Cerrar sesión y usar la cuenta invitada',exact=True)).to_be_visible()
     if scenario=='wrong-email':assert page.evaluate('rpcCalls.length===0')
    assert page.evaluate("rpcCalls.every(x=>!['unirse_al_estudio','app_guardar_lote','app_guardar_operacion'].includes(x.name))")
    count=pg('select count(*) from public.estudios;');assert count.stdout.strip()=='2'
    assert not errors,errors;assert not writes,writes
    print(width,scenario,'PASS: hidden invitation email, double password, Google hint, verified identity, real local acceptance and role trigger, no generic study creation',flush=True)
    page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
