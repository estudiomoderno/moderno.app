"""Real app + disposable PostgreSQL RPCs as a fictitious collaborator; no external requests.
Install the guarded fixture with build-collaborator-checks.mjs --persist-fixture first.
"""
from pathlib import Path
import ast,json,os,socket,subprocess,time,urllib.request
from playwright.sync_api import sync_playwright
repo=Path(__file__).resolve().parents[1];container='moderno-collab-fixture'
e='00000000-0000-0000-0000-000000000001';user='00000000-0000-0000-0000-000000000012'
def literal(v):return "'"+json.dumps(v,ensure_ascii=False).replace("'","''")+"'::jsonb"
def sql(query,role=False):
 prefix=f'''begin;set local statement_timeout='8s';set local "request.jwt.claim.sub"='{user}';set local role authenticated;''' if role else 'begin;'
 result=subprocess.run(['docker','exec','-i',container,'psql','-U','postgres','-Atq','-v','ON_ERROR_STOP=1'],input=prefix+query+';commit;',text=True,capture_output=True)
 if result.returncode:raise AssertionError(result.stderr)
 return json.loads(result.stdout.strip()) if result.stdout.strip() else None
parsed=ast.parse((repo/'scripts/bulk-duplicate-save-browser.test.py').read_text());setup=next(ast.literal_eval(n.value) for n in parsed.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='fixture_setup' for t in n.targets))
html=(repo/'app/index.html').read_text()
def section(start,end):return html[html.index(start):html.index(end,html.index(start))]
def rpc(name,args):
 assert args['p_estudio']==e
 if name in ['app_leer_bloques','app_leer_versiones']:
  blocks=args.get('p_bloques');b='null' if blocks is None else 'array['+','.join("'"+x.replace("'","''")+"'" for x in blocks)+']::text[]'
  query=f"select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.{name}('{e}',{b}) r"
 elif name in ['app_guardar_lote','app_guardar_lote_delta']:
  query=f"select public.{name}('{e}',{literal(args['p_cambios'])})"
 else:raise AssertionError('Unexpected RPC')
 return {'data':sql(query,True)}
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://collaborator-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_collaborator-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [1440,390]:
   page=browser.new_page(viewport={'width':width,'height':1000});errors=[];writes=[]
   page.on('pageerror',lambda err:errors.append(str(err)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   raw=page.evaluate("()=>{const p=state.projects[0];p.rooms[0].sections[0].items[0].id='original';p.rooms[0].sections[0].items[0].cost=7;p.rooms[0].sections[0].items[0].margin=25;return [p]}")
   if os.environ.get('COLLABORATOR_LARGE_FIXTURE')=='1':
    first=raw[0]['rooms'][0]['sections'][0]['items'][0]
    raw[0]['rooms'][0]['sections'][0]['items']=[dict(first,id=first['id'] if i==0 else 'large-'+str(i),name=first['name'] if i==0 else 'Producto ficticio '+str(i),desc='x'*4000) for i in range(1500)]
   sql(f"update public.datos_estudio set contenido={literal(raw)},updated_at=clock_timestamp() where estudio_id='{e}' and bloque='proyectos'")
   rows=rpc('app_leer_bloques',{'p_estudio':e,'p_bloques':['proyectos']})['data']
   page.expose_function('sqlRpc',rpc)
   page.evaluate('''p=>{
    clearTimeout(_saveT);_accessRole='colaborador';state.myRole='colaborador';state.sessionUser.id=p.user;_cloudUserId=p.user;ESTUDIO_ID=p.study;_cloudLoadedStudy=p.study;
    state.projects=p.rows[0].contenido;state.currentProject=9001;state.currentRoom=8001;state.view='estancia';render();
    cloudSnapshotAll();_cloudSeen.proyectos=p.rows[0].updated_at;_cloudCount.proyectos=state.projects.length;
    window.fakeClient={rpc:(name,args)=>sqlRpc(name,args)};
   }''',{'user':user,'study':e,'rows':rows})
   for start,end in [('async function cloudReadRows(','async function cloudReadBlock('),('async function cloudReadSaveVersions(','async function cloudSaveBatch('),('async function cloudSaveBatch(','async function cloudFlush('),('async function cloudFlush(){','function cloudSnapshotAll(){')]:
    source=section(start,end);name=start.split('function ')[1].split('(')[0]
    page.evaluate("p=>{window[p.name]=new Function('sb','return '+p.source)(fakeClient)}",{'name':name,'source':source})
   page.evaluate('itemModal(0,0)')
   assert not page.get_by_label('Coste profesional (€)',exact=True).is_visible()
   assert page.get_by_label('Coste profesional (€)',exact=True).is_disabled()
   page.locator('#itName').fill('Editado por compañera ficticia');page.locator('#itPrice').fill('29');page.locator('#itQty').fill('3');page.get_by_role('button',name='Guardar',exact=True).click()
   page.evaluate('async()=>{await cloudFlush();clearTimeout(_cloudT);clearTimeout(_saveT)}')
   assert page.evaluate('!syncHasChanges()'),page.evaluate('_syncDetail')
   # Legacy v3.65.99 pending form payload succeeds through the same existing RPC.
   page.evaluate("getRoom().r.sections[0].items[0].cost=null;getRoom().r.sections[0].items[0].margin=null;getRoom().r.sections[0].items[0].note='Pendiente antiguo recuperado'")
   page.evaluate('async()=>{await cloudFlush()}');assert page.evaluate('!syncHasChanges()'),page.evaluate('_syncDetail')
   page.evaluate("newRoom(9001,'pav')");page.locator('#nrName').fill('Lista nueva de colaboradora');page.get_by_role('button',name='Crear',exact=True).click()
   page.evaluate('itemModal(0,-1)');page.locator('#itName').fill('Producto nuevo colaboradora');page.locator('#itPrice').fill('42');page.get_by_role('button',name='Guardar',exact=True).click()
   page.evaluate('async()=>{await cloudFlush();clearTimeout(_cloudT);clearTimeout(_saveT)}');assert page.evaluate('!syncHasChanges()'),page.evaluate('_syncDetail')
   stored=sql(f"select contenido from public.datos_estudio where estudio_id='{e}' and bloque='proyectos'")
   original=stored[0]['rooms'][0]['sections'][0]['items'][0];new=stored[0]['rooms'][-1]
   assert original['cost']==7 and original['margin']==25 and original['price']==29 and original['qty']==3
   assert new['kind']=='pav' and new['icon']=='wall' and new['sections'][0]['items'][0]['name']=='Producto nuevo colaboradora'
   fresh=rpc('app_leer_bloques',{'p_estudio':e,'p_bloques':['proyectos']})['data'][0]['contenido']
   assert 'cost' not in fresh[0]['rooms'][0]['sections'][0]['items'][0]
   page.reload(wait_until='networkidle');page.evaluate(setup);page.evaluate("p=>{state.projects=p;state.view='proyecto';state.projTab='listas';render()}",fresh)
   assert page.get_by_text('Lista nueva de colaboradora',exact=True).is_visible()
   assert not errors,errors
   assert not writes,writes
   print(width,'PASS: real collaborator RPC, product edit, legacy pending payload, new list/product, reload durability, private cost/margin preserved and unreadable',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
