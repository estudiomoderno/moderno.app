"""A broken IndexedDB copy must never block an authenticated cloud startup."""
from pathlib import Path
import os, socket, subprocess, time, urllib.request
from playwright.sync_api import sync_playwright, expect

repo = Path(__file__).resolve().parents[1]
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
origin = f'http://127.0.0.1:{port}'
server = subprocess.Popen(
    ['node', 'scripts/dev-server.mjs'],
    cwd=repo,
    env=dict(os.environ, PORT=str(port), SUPABASE_URL='https://ui-fixture.supabase.co',
             SUPABASE_ANON_KEY='sb_publishable_cloud_first_fixture_only_no_credentials_49'),
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

fake_cloud = """
window.supabase={createClient(){
  const user={id:'cloud-user',email:'cloud@example.invalid',user_metadata:{full_name:'Persona nube'}};
  const rows=[{bloque:'config',contenido:{account:{name:'Estudio desde la nube'},emitter:{},users:[],onboarded:true,counters:{},docs:[],logos:{},BRAND:{cm:{name:'Estudio desde la nube'}},wsOrder:['cm']},updated_at:'2026-11-21T10:00:00Z',rol:'admin'}];
  const emptyQuery={select(){return this},eq(){return this},limit(){return this},order(){return this},then(ok,bad){return Promise.resolve({data:[],error:null}).then(ok,bad)},catch(fn){return Promise.resolve({data:[],error:null}).catch(fn)}};
  return {
    auth:{getSession:async()=>({data:{session:{user}}}),getUser:async()=>({data:{user},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
    rpc:async name=>{
      if(name==='unirse_al_estudio')return {data:{estudio_id:'cloud-study',rol:'admin'},error:null};
      if(name==='app_rol')return {data:'admin',error:null};
      if(name==='app_leer_bloques')return {data:structuredClone(rows),error:null};
      return {data:null,error:{code:'PGRST202',message:'fixture: unsupported RPC'}};
    },
    from:()=>Object.create(emptyQuery),
    channel:()=>({on(){return this},subscribe(){return this}}),removeChannel:async()=>{},
    storage:{from:()=>({})}
  };
}};
const nativeOpen=indexedDB.open.bind(indexedDB);
indexedDB.open=function(){const request={error:new DOMException('Fallo persistente simulado','UnknownError')};setTimeout(()=>request.onerror?.(),0);return request;};
"""

try:
    for _ in range(100):
        try:
            with opener.open(origin, timeout=1) as response:
                assert 'moderno_pruebas_ui-fixture' in response.read().decode()
            break
        except OSError:
            time.sleep(.05)
    else:
        raise AssertionError('Official server unavailable')

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 1440, 'height': 900}, locale='es-ES')
        page = context.new_page()
        page.route('**/*', lambda route: route.abort() if not route.request.url.startswith(origin + '/') else route.continue_())
        page.goto(origin, wait_until='networkidle')
        pointer = '{"modernoPendingArchive":1,"key":"unreadable-cloud-fixture"}'
        page.evaluate("pointer=>localStorage.setItem(LS_KEY,pointer)", pointer)
        context.add_init_script(fake_cloud)
        started = time.monotonic()
        page.reload(wait_until='domcontentloaded')
        page.wait_for_function("_cloudLoadedStudy==='cloud-study'&&!_accessLoading", timeout=15000)
        elapsed = time.monotonic() - started
        page.wait_for_function("!document.documentElement.classList.contains('app-boot')", timeout=5000)
        expect(page.locator('#view')).not_to_contain_text('No se ha podido leer la copia local')
        assert page.evaluate("state.account.name==='Estudio desde la nube'")
        assert page.evaluate("Object.keys(localStorage).some(k=>k.startsWith(LS_KEY+'_pendiente_recuperacion_'))")
        assert elapsed < 8, elapsed
        print(f'PASS authenticated cloud startup with broken IndexedDB in {elapsed:.2f}s', flush=True)
        context.close()
        browser.close()
finally:
    server.terminate()
    server.wait(timeout=5)
