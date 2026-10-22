"""Two fictitious teammates, real Chromium/app, private-channel adapter; all network offline."""
from pathlib import Path
import ast,json,os,socket,subprocess,time,urllib.request
from playwright.sync_api import sync_playwright
repo=Path(__file__).resolve().parents[1]
parsed=ast.parse((repo/'scripts/bulk-duplicate-save-browser.test.py').read_text())
setup=next(ast.literal_eval(n.value) for n in parsed.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='fixture_setup' for t in n.targets))
html=(repo/'app/index.html').read_text();source=html[html.index('function presenceTrack(){'):html.index('function cloudRealtimeStart(){')]
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://cursor-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_cursor-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  ctx=browser.new_context(viewport={'width':1440,'height':1000});pages=[];errors=[];writes=[]
  for i in range(2):
   page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   page.evaluate('''i=>{
    clearTimeout(_saveT);ESTUDIO_ID='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    state.sessionUser.id='fictional-'+i;state.sessionUser.mail='fictional-'+i+'@example.invalid';state.sessionUser.name=i?'Ana ficticia':'Juan ficticio';
    state.currentRoom=8001;state.view='estancia';state.projects[0].rooms[0].sections[0].items[0].id='product-1';render();
    ensureObra(state.projects[0]);obraEnsure(state.projects[0]);window.before=records();window.outgoing=[];window.channelCount=0;
    window.fakeClient={auth:{getSession:async()=>({data:{session:{user:{id:state.sessionUser.id}}}})},removeChannel:async ch=>{ch.bus.postMessage({leave:ch.own?.session});ch.bus.close();},channel:(name,config)=>{
     if(!config.config.private||!name.startsWith('equipo:'))throw Error('Private channel required');channelCount++;
     const ch={state:'joined',peers:{},bus:new BroadcastChannel('fictional-'+name),handlers:{},on(type,filter,fn){this.handlers[type]=fn;return this;},subscribe(fn){queueMicrotask(()=>fn('SUBSCRIBED'));return this;},presenceState(){return this.peers;},async track(p){this.own=p;this.peers[p.session]=[p];this.bus.postMessage({track:p});queueMicrotask(()=>this.handlers.presence());return 'ok';},async untrack(){this.bus.postMessage({leave:this.own.session});},send(p){outgoing.push(p);this.bus.postMessage({cursor:p.payload});return Promise.resolve('ok');}};
     ch.bus.onmessage=({data:d})=>{if(d.track){const fresh=!ch.peers[d.track.session];ch.peers[d.track.session]=[d.track];if(fresh&&ch.own)ch.bus.postMessage({track:ch.own});ch.handlers.presence();}if(d.leave){delete ch.peers[d.leave];ch.handlers.presence();}if(d.cursor)ch.handlers.broadcast({payload:d.cursor});};return ch;
    }};
   }''',i)
   page.evaluate("source=>{presenceTrack=new Function('sb','return '+source)(fakeClient);presenceTrack();}",source);pages.append(page)
  a,b=pages
  for page in pages:page.wait_for_function("teamPresence.snapshot().status==='online'&&teamPresence.snapshot().members.length===2")
  def move(selector='.shopping-product-card .shopping-product-image',page=a):
   # Use actual image container even with offline image URLs.
   target=page.locator(selector).first
   if target.count()==0:target=page.locator('.shopping-product-card').first
   r=target.bounding_box();assert r
   page.mouse.move(r['x']+r['width']*.4,r['y']+min(r['height']*.4,100));page.wait_for_timeout(110)
   page.mouse.move(r['x']+r['width']*.45,r['y']+min(r['height']*.45,110))
  move();b.wait_for_function("document.querySelector('.project-peer-name')?.textContent==='Juan ficticio'")
  assert b.evaluate("getComputedStyle(document.querySelector('.project-peer-cursors')).pointerEvents==='none'")
  assert a.evaluate('channelCount===1') and b.evaluate('channelCount===1')
  # Responsive mapping to the corresponding card, rather than raw desktop pixels.
  b.set_viewport_size({'width':900,'height':1000});move();b.wait_for_function("!!document.querySelector('.project-peer-name')")
  b.screenshot(path='/tmp/moderno-project-cursors.png')
  b.set_viewport_size({'width':390,'height':844});move();b.wait_for_function("!!document.querySelector('.project-peer-name')")
  b.set_viewport_size({'width':1440,'height':1000})
  # Obra shares its own context without changing project data.
  for page in pages:page.evaluate("state.view='proyecto';state.projTab='obra';render();presenceTrack()")
  move('#view h2.sec');b.wait_for_function("!!document.querySelector('.project-peer-name')")
  for page in pages:page.evaluate("state.view='estancia';state.currentRoom=8001;render();presenceTrack()")
  b.set_viewport_size({'width':900,'height':1000})
  # Different project screen and different room never show a teammate cursor.
  b.evaluate("state.view='proyecto';state.projTab='tareas';render();presenceTrack()")
  move();b.wait_for_timeout(150);assert b.locator('.project-peer-cursor').count()==0
  b.evaluate("state.view='estancia';state.currentRoom=8002;render();presenceTrack()")
  move();b.wait_for_timeout(150);assert b.locator('.project-peer-cursor').count()==0
  b.evaluate("state.currentRoom=8001;render();presenceTrack()")
  move();b.wait_for_function("!!document.querySelector('.project-peer-name')")
  # Editing dialog hides markers; input values are never broadcast.
  a.evaluate("window.edit=document.createElement('dialog');edit.innerHTML='<input value=PRIVATE_FORM_VALUE>';document.body.append(edit);edit.showModal();presenceTrack()")
  b.wait_for_function("!document.querySelector('.project-peer-cursor')")
  a.locator('dialog[open] input').hover();assert 'PRIVATE_FORM_VALUE' not in a.evaluate('JSON.stringify(outgoing)')
  a.evaluate('edit.close();edit.remove();presenceTrack()')
  move();b.wait_for_function("!!document.querySelector('.project-peer-name')")
  # Native plan dialog: same file/page/rotation, normalized drawing coordinates.
  for page in pages:
   page.evaluate('''()=>{window.plan=document.createElement('dialog');plan.className='project-plan-dialog';plan.dataset.cursorFile='f'.repeat(64);plan.innerHTML='<section class="plan-editor" data-cursor-page="1" data-cursor-rotation="0"><div class="plan-paper" style="width:400px;height:350px;background:#eee"><canvas></canvas></div></section>';document.body.append(plan);plan.showModal();presenceTrack();}''')
  move('.plan-paper');b.wait_for_function("!!document.querySelector('dialog .project-peer-name')")
  b.evaluate("plan.querySelector('.plan-editor').dataset.cursorPage='2';document.dispatchEvent(new Event('moderno:cursor-context'))")
  move('.plan-paper');b.wait_for_timeout(150);assert b.locator('.project-peer-cursor').count()==0
  b.evaluate("plan.querySelector('.plan-editor').dataset.cursorPage='1';document.dispatchEvent(new Event('moderno:cursor-context'))")
  move('.plan-paper');b.wait_for_function("!!document.querySelector('dialog .project-peer-name')")
  b.evaluate("plan.dataset.cursorFile='e'.repeat(64);document.dispatchEvent(new Event('moderno:cursor-context'))")
  move('.plan-paper');b.wait_for_timeout(150);assert b.locator('.project-peer-cursor').count()==0
  b.evaluate("plan.dataset.cursorFile='f'.repeat(64);document.dispatchEvent(new Event('moderno:cursor-context'))")
  move('.plan-paper');b.wait_for_function("!!document.querySelector('dialog .project-peer-name')")
  # Departures clear cursors immediately; no document persistence side effects.
  a.evaluate('teamPresence.stop()');b.wait_for_function("!document.querySelector('.project-peer-cursor')")
  assert all(page.evaluate('before===records()') for page in pages)
  assert not writes,writes
  assert not errors,errors
  print('PASS: two fictitious peers, one private channel each; scoped screen/room/file/page, responsive card mapping, native plan dialog, private forms, departure cleanup; no business writes')
  browser.close()
finally:server.terminate();server.wait(timeout=5)
