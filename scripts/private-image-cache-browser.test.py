"""Private image cache and lazy loading, with fictional records only."""
from pathlib import Path
import os,socket,subprocess,time,urllib.request,sys
from playwright.sync_api import TimeoutError, sync_playwright, expect
repo=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]) if len(sys.argv)>1 else None
if output:output.mkdir(parents=True,exist_ok=True)
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://ui-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
fixture_setup="()=>{\n    if(sb!==null)throw Error('Backend must be disabled');\n    state.sessionUser={name:'Persona ficticia',mail:'persona@example.invalid',id:'fixture'};\n    state.onboarded=true;state.myRole='admin';_accessRole='admin';_accessLoading=false;\n    state.account.name='Estudio ficticio';state.account.apiToken='';state.account.billContacts=[];\n    BRAND.cm.name='Estudio ficticio';state.brandFilter='all';\n    const project=structuredClone(state.projects[0]);\n    Object.assign(project,{id:9001,num:'PR-9001',name:'Proyecto ficticio',brand:'cm',tpl:false,client:'Cliente ficticio',tasks:[],files:[],rooms:[\n     {id:8001,kind:'estancia',name:'Salón ficticio',icon:'sofa'},\n     {id:8002,kind:'estancia',name:'Dormitorio ficticio',icon:'bed'},\n     {id:8003,kind:'pav',name:'Pavimentos ficticios',icon:'wall'},\n     {id:8004,kind:'otra',name:'Otras compras ficticias',icon:'bulb'}\n    ].map((room,i)=>({...room,created:'2026-10-19',sections:[{id:'section-'+i,name:'General',items:[{name:'Producto ficticio '+i,price:25+i,qty:2,unit:'ud',status:'Pendiente',supplier:'Proveedor ficticio',sku:'FIC-'+i}]}]}))});\n    state.projects=[project];state.clients=[{name:'Cliente ficticio',type:'Cliente',brand:'cm',email:'cliente@example.invalid'}];\n    state.entries=[];state.invoices=[];state.quotes=[];state.docs=[];state.library=[];state.catalog=[];state.notifs=[];\n    state.collapsed={'g-9001-estancia':false,'g-9001-pav':false,'g-9001-otra':false,'unrelated':true};\n    applySessionUI();drawBrandSwitch();showLogin(false);go('proyecto',9001);projTab('listas');\n    window.records=()=>JSON.stringify({projects:state.projects,clients:state.clients,invoices:state.invoices,quotes:state.quotes,entries:state.entries,collapsed:state.collapsed});\n    window.baseline=records();window.printCount=0;window.print=()=>{printCount++;window.printHTML=document.getElementById('printZone').innerHTML;};\n   }"
import base64
png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=')
html=(repo/'app/index.html').read_text()
resolver=html[html.index('function fileSrc('):html.index('function fileImageAttrs(')]
resolver+=html[html.index('function fileViewIdentity('):html.index('const _imageLoads')]
try:
 for attempt in range(100):
  try:
   with opener.open(origin,timeout=1) as response:assert 'moderno_pruebas_ui-fixture' in response.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official server unavailable')
 with sync_playwright() as p:
  launch={'headless':True,'args':['--no-sandbox']}
  if os.environ.get('CHROMIUM_PATH'):launch['executable_path']=os.environ['CHROMIUM_PATH']
  browser=p.chromium.launch(**launch)
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
    const client={auth:{getSession:async()=>({data:{session:{access_token:'fictional-session'}}})}};
    const fakeFetch=async(url,options)=>{
      const envelope=JSON.parse(options?.body||'{}');
      if(url!=='/api/product-clipper.php'||options?.method!=='POST'||atob(envelope.session64)!=='fictional-session'||envelope.payload?.action!=='file')throw Error('Invalid private proxy request');
      signCalls++;signActive++;signPeak=Math.max(signPeak,signActive);await new Promise(r=>setTimeout(r,20));signActive--;
      if(denySigning)return new Response('{}',{status:403,headers:{'content-type':'application/json'}});
      return new Response(JSON.stringify({url:origin+'/storage/v1/object/sign/archivos/'+envelope.payload.path+'?token=fictional-'+signCalls}),{status:200,headers:{'content-type':'application/json'}});
    };
    fileResolveForView=new Function('sb','SUPABASE_URL','SUPABASE_ANON_KEY','fetch',source+';return fileResolveForView;')(client,origin,'sb_publishable_offline_fixture_only_no_credentials_49',fakeFetch);
    window.drawImages=(same=false)=>{
      document.querySelector('.main').scrollTop=0;
      document.getElementById('view').innerHTML='<div id="fixture-images" style="display:flex;flex-direction:column;gap:20px">'+Array.from({length:50},(_,i)=>'<img data-private-file="storage://archivos/'+ESTUDIO_ID+'/'+(same?'same':i)+'.png" loading="lazy" width="100" height="100" alt="Ficticia">').join('')+'</div>';
    };drawImages(true);
   }""",{'source':resolver,'origin':origin})
   try:
    page.wait_for_function("document.querySelectorAll('#fixture-images img.image-ready').length>=2")
   except TimeoutError as error:
    counts=page.evaluate("""()=>({signCalls,
      observed:[...document.querySelectorAll('#fixture-images img')].slice(0,2).map(img=>({
        hasSource:img.hasAttribute('src'),complete:img.complete,width:img.naturalWidth,
        status:img.className,top:img.getBoundingClientRect().top
      }))})""")
    raise AssertionError(f'{width}: private images did not load: {counts}; page errors: {errors}') from error
   assert page.evaluate("signCalls===1&&document.querySelectorAll('#fixture-images img.image-ready').length<50&&signPeak<=4")
   assert page.evaluate("document.querySelector('#fixture-images img.image-ready').loading==='eager'&&document.querySelector('#fixture-images img:last-child').loading==='lazy'")
   page.evaluate('drawImages(true)');page.wait_for_function("document.querySelectorAll('#fixture-images img.image-ready').length>=2")
   assert page.evaluate('signCalls===1') # DOM recreation must not trigger another signing wave.
   page.evaluate('drawImages(false)');page.wait_for_function("document.querySelectorAll('#fixture-images img.image-ready').length>=2")
   page.wait_for_timeout(150)
   assert page.evaluate('signPeak<=4&&signCalls<25')
   before=page.evaluate('signCalls');page.evaluate("document.querySelector('.main').scrollTop=4500")
   page.wait_for_function('signCalls>'+str(before));assert page.evaluate('signCalls<50&&signPeak<=4')
   # Presentation PDFs use the same private resolver; storage:// is never sent
   # directly to <embed>, and hydration is bound to the active session.
   before=page.evaluate('signCalls')
   page.evaluate("const pdf=document.createElement('embed');pdf.type='application/pdf';pdf.dataset.privateFile='storage://archivos/'+ESTUDIO_ID+'/presentation-private.pdf';document.getElementById('view').append(pdf)")
   page.wait_for_function("document.querySelector('embed[data-private-file].file-ready')?.src.includes('/storage/v1/object/sign/archivos/')")
   assert page.evaluate(f"signCalls>{before}&&!document.querySelector('embed[data-private-file]').src.startsWith('storage://')")
   # Printing explicitly loads images even when a hidden print zone never intersects the viewport.
   page.evaluate("window.printed=0;window.print=()=>printed++;const printImage=document.createElement('img');printImage.width=100;printImage.height=100;printImage.dataset.privateFile='storage://archivos/'+ESTUDIO_ID+'/print.png';document.getElementById('printZone').replaceChildren(printImage);")
   assert page.evaluate("printAs('Ficticio')");assert page.evaluate('printed===1')
   # An obsolete optional document logo falls back to the study name without blocking the PDF.
   page.evaluate("denySigning=true;document.getElementById('printZone').innerHTML='<div><img data-private-file=\"storage://archivos/'+ESTUDIO_ID+'/missing-logo.png\" data-document-brand=\"Estudio ficticio\" data-document-brand-size=\"22\"></div>'")
   assert page.evaluate("printAs('Presupuesto ficticio')");assert page.evaluate("printed===2&&document.querySelector('#printZone .document-brand-fallback')?.textContent==='Estudio ficticio'&&!document.querySelector('#printZone img')")
   # The application may restore the inline hidden state before Chromium snapshots print media.
   # Print CSS must still expose the prepared pages, otherwise the dialog contains blank sheets.
   page.evaluate("document.getElementById('printZone').style.display='none'")
   page.emulate_media(media='print')
   print_state=page.evaluate("()=>{const zone=document.getElementById('printZone'),content=zone.querySelector('.document-brand-fallback');return {display:getComputedStyle(zone).display,visibility:content&&getComputedStyle(content).visibility,text:content&&content.textContent}}")
   assert print_state=={'display':'block','visibility':'visible','text':'Estudio ficticio'},(width,print_state)
   page.emulate_media(media='screen')
   page.evaluate('denySigning=false')
   # A role change rejects reuse of the old signed capabilities and cannot fall back to a public URL.
   page.evaluate("_accessRole='colaborador';denySigning=true;drawImages(true)")
   page.wait_for_function("!!document.querySelector('#fixture-images img.image-failed')")
   assert page.evaluate("!document.querySelector('#fixture-images img[src]')&&signPeak<=4&&sb===null")
   if output:page.screenshot(path=str(output/f'image-permissions-{width}.png'),full_page=True)
   assert not errors,errors;assert not writes,writes
   print(width,'PASS duplicate images sign once through bounded same-origin proxy; true lazy loading; four requests maximum; scroll loads further images; private print waits for decoding; changed role cannot reuse capabilities or public fallback; no real writes',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
