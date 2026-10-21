"""Private image cache and lazy loading, with fictional records only."""
from pathlib import Path
import os,socket,subprocess,time,urllib.request,sys
from playwright.sync_api import sync_playwright,expect
repo=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]) if len(sys.argv)>1 else None
if output:output.mkdir(parents=True,exist_ok=True)
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://ui-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
fixture_setup="()=>{\n    if(sb!==null)throw Error('Backend must be disabled');\n    state.sessionUser={name:'Persona ficticia',mail:'persona@example.invalid',id:'fixture'};\n    state.onboarded=true;state.myRole='admin';_accessRole='admin';_accessLoading=false;\n    state.account.name='Estudio ficticio';state.account.apiToken='';state.account.billContacts=[];\n    BRAND.cm.name='Estudio ficticio';state.brandFilter='all';\n    const project=structuredClone(state.projects[0]);\n    Object.assign(project,{id:9001,num:'PR-9001',name:'Proyecto ficticio',brand:'cm',tpl:false,client:'Cliente ficticio',tasks:[],files:[],rooms:[\n     {id:8001,kind:'estancia',name:'Salón ficticio',icon:'sofa'},\n     {id:8002,kind:'estancia',name:'Dormitorio ficticio',icon:'bed'},\n     {id:8003,kind:'pav',name:'Pavimentos ficticios',icon:'wall'},\n     {id:8004,kind:'otra',name:'Otras compras ficticias',icon:'bulb'}\n    ].map((room,i)=>({...room,created:'2026-10-19',sections:[{id:'section-'+i,name:'General',items:[{name:'Producto ficticio '+i,price:25+i,qty:2,unit:'ud',status:'Pendiente',supplier:'Proveedor ficticio',sku:'FIC-'+i}]}]}))});\n    state.projects=[project];state.clients=[{name:'Cliente ficticio',type:'Cliente',brand:'cm',email:'cliente@example.invalid'}];\n    state.entries=[];state.invoices=[];state.quotes=[];state.docs=[];state.library=[];state.catalog=[];state.notifs=[];\n    state.collapsed={'g-9001-estancia':false,'g-9001-pav':false,'g-9001-otra':false,'unrelated':true};\n    applySessionUI();drawBrandSwitch();showLogin(false);go('proyecto',9001);projTab('listas');\n    window.records=()=>JSON.stringify({projects:state.projects,clients:state.clients,invoices:state.invoices,quotes:state.quotes,entries:state.entries,collapsed:state.collapsed});\n    window.baseline=records();window.printCount=0;window.print=()=>{printCount++;window.printHTML=document.getElementById('printZone').innerHTML;};\n   }"
import base64
png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jzS0AAAAASUVORK5CYII=')
html=(repo/'app/index.html').read_text();resolver=html[html.index('async function fileResolveForView('):html.index('function fileImageAttrs(')]
try:
 for attempt in range(100):
  try:
   with opener.open(origin,timeout=1) as response:assert 'moderno_pruebas_ui-fixture' in response.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [1440,390]:
   page=browser.new_page(viewport={'width':width,'height':900},locale='es-ES');errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    if '/storage/v1/object/sign/archivos/' in r.request.url:r.fulfill(status=200,content_type='image/png',body=png);return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(fixture_setup)
   page.evaluate("""({source,origin})=>{
    ESTUDIO_ID='00000000-0000-4000-8000-000000000001';_accessRole='admin';clearTimeout(_saveT);
    window.signCalls=0;window.signActive=0;window.signPeak=0;window.denySigning=false;
    const client={storage:{from(bucket){if(bucket!=='archivos')throw Error('Wrong bucket');return {createSignedUrl:async(path,ttl)=>{
      if(ttl!==60)throw Error('Changed expiry');signCalls++;signActive++;signPeak=Math.max(signPeak,signActive);
      await new Promise(r=>setTimeout(r,20));signActive--;
      return denySigning?{error:{status:403,message:'Denegado ficticio'}}:{data:{signedUrl:origin+'/storage/v1/object/sign/archivos/'+path+'?token=fictional-'+signCalls}};
    }};}}};
    fileResolveForView=new Function('sb','SUPABASE_URL',source+';return fileResolveForView;')(client,origin);
    window.drawImages=(same=false)=>{
      document.querySelector('.main').scrollTop=0;
      document.getElementById('view').innerHTML='<div id="fixture-images" style="display:flex;flex-direction:column;gap:20px">'+Array.from({length:50},(_,i)=>'<img data-private-file="storage://archivos/'+ESTUDIO_ID+'/'+(same?'same':i)+'.png" loading="lazy" width="100" height="100" alt="Ficticia">').join('')+'</div>';
    };drawImages(true);
   }""",{'source':resolver,'origin':origin})
   page.wait_for_function("document.querySelectorAll('#fixture-images img.image-ready').length>=2")
   assert page.evaluate("signCalls===1&&document.querySelectorAll('#fixture-images img.image-ready').length<50&&signPeak<=4")
   page.evaluate('drawImages(true)');page.wait_for_function("document.querySelectorAll('#fixture-images img.image-ready').length>=2")
   assert page.evaluate('signCalls===1') # DOM recreation must not trigger another signing wave.
   page.evaluate('drawImages(false)');page.wait_for_function("document.querySelectorAll('#fixture-images img.image-ready').length>=2")
   page.wait_for_timeout(150)
   assert page.evaluate('signPeak<=4&&signCalls<25')
   before=page.evaluate('signCalls');page.evaluate("document.querySelector('.main').scrollTop=4500")
   page.wait_for_function('signCalls>'+str(before));assert page.evaluate('signCalls<50&&signPeak<=4')
   # Printing explicitly loads images even when a hidden print zone never intersects the viewport.
   page.evaluate("window.printed=0;window.print=()=>printed++;const printImage=document.createElement('img');printImage.width=100;printImage.height=100;printImage.dataset.privateFile='storage://archivos/'+ESTUDIO_ID+'/print.png';document.getElementById('printZone').replaceChildren(printImage);")
   assert page.evaluate("printAs('Ficticio')");assert page.evaluate('printed===1')
   # A role change rejects reuse of the old signed capabilities and cannot fall back to a public URL.
   page.evaluate("_accessRole='colaborador';denySigning=true;drawImages(true)")
   page.wait_for_function("!!document.querySelector('#fixture-images img.image-failed')")
   assert page.evaluate("!document.querySelector('#fixture-images img[src]')&&signPeak<=4&&sb===null")
   if output:page.screenshot(path=str(output/f'image-permissions-{width}.png'),full_page=True)
   assert not errors,errors;assert not writes,writes
   print(width,'PASS duplicate images sign once across DOM recreation; true lazy signing; four requests maximum; scroll loads further images; private print waits for decoding; changed role cannot reuse capabilities or public fallback; no real writes',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
