"""Neutral client portal presentation on the official isolated server, with fictitious records only."""
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
try:
 for attempt in range(100):
  try:
   with opener.open(origin,timeout=1) as response:html=response.read().decode()
   assert 'const LS_KEY="moderno_pruebas_ui-fixture";' in html
   assert 'const SUPABASE_URL = "https://auth.moderno.app";' not in html
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server did not start')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [1440,1100,768,390]:
   page=browser.new_page(viewport={'width':width,'height':1000},locale='es-ES');errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle')
   page.wait_for_function('!!window.ModernoProjectWorkspace')
   page.evaluate("""()=>{
    if(sb!==null)throw Error('Backend must be disabled');
    state.sessionUser={name:'Persona ficticia',mail:'persona@example.invalid',id:'fixture'};
    state.onboarded=true;state.myRole='admin';_accessRole='admin';_accessLoading=false;
    state.account.name='Estudio ficticio';state.account.apiToken='';state.account.billContacts=[];
    BRAND.cm.name='Estudio ficticio';state.brandFilter='all';
    const project=structuredClone(state.projects[0]);
    Object.assign(project,{id:9001,num:'PR-9001',name:'Proyecto ficticio',brand:'cm',tpl:false,client:'Cliente ficticio',tasks:[],files:[],rooms:[
     {id:8001,kind:'estancia',name:'Salón ficticio',icon:'sofa'},
     {id:8002,kind:'estancia',name:'Dormitorio ficticio',icon:'bed'},
     {id:8003,kind:'pav',name:'Pavimentos ficticios',icon:'wall'},
     {id:8004,kind:'otra',name:'Otras compras ficticias',icon:'bulb'}
    ].map((room,i)=>({...room,created:'2026-10-19',sections:[{id:'section-'+i,name:'General',items:[{name:'Producto ficticio '+i,price:25+i,qty:2,unit:'ud',status:'Pendiente',supplier:'Proveedor ficticio',sku:'FIC-'+i}]}]}))});
    state.projects=[project];state.clients=[{name:'Cliente ficticio',type:'Cliente',brand:'cm',email:'cliente@example.invalid'}];
    state.entries=[];state.invoices=[];state.quotes=[];state.docs=[];state.library=[];state.catalog=[];state.notifs=[];
    state.collapsed={'g-9001-estancia':false,'g-9001-pav':false,'g-9001-otra':false,'unrelated':true};
    applySessionUI();drawBrandSwitch();showLogin(false);go('proyecto',9001);projTab('listas');
    window.records=()=>JSON.stringify({projects:state.projects,clients:state.clients,invoices:state.invoices,quotes:state.quotes,entries:state.entries,collapsed:state.collapsed});
    window.baseline=records();window.printCount=0;window.print=()=>{printCount++;window.printHTML=document.getElementById('printZone').innerHTML;};
   }""")
   page.evaluate("openRoom(9001,8001);window.records=()=>JSON.stringify({projects:state.projects,library:state.library,quotes:state.quotes,invoices:state.invoices});window.sourceBaseline=records()")
   page.evaluate("""()=>{
    const p=state.projects[0];
    Object.assign(p,{name:'Casa ficticia',num:'PR-9001',client:'Cliente ficticio',cliShare:{token:'portal-ficticio',active:true,money:false,obra:true,obraContactos:false},
     cliWelcome:'Bienvenida ficticia al proyecto.',cliChat:[{de:'estudio',t:'Mensaje ficticio del estudio',d:'20/10/2026'}],cliChatLocal:[],
     tasks:[{id:'t-1',title:'Medición ficticia',col:'pend',due:'2026-11-01',notes:'NOTA INTERNA PRIVADA',files:['ARCHIVO DE TAREA PRIVADO']},{id:'t-2',title:'Plano ficticio',col:'prog',due:'2026-11-05'},{id:'t-3',title:'Revisión ficticia',col:'rev',due:'2026-11-08'},{id:'t-4',title:'Entrega ficticia',col:'listo'}],
     phases:[{name:'Diseño',color:'#666'}],curPhase:0,obraF:[{name:'Fase ficticia',start:'2026-10-19',end:'2026-11-30',items:[{t:'Punto ficticio',done:false}]}],obraContactos:[],
     files:[{name:'Portada ficticia.webp',type:'image/webp',data:'/brand/illustrations/nueva-estancia.webp',docKind:'portal-cover',cli:true},{name:'Documento compartido.pdf',type:'application/pdf',data:'data:application/pdf;base64,JVBERi0xLjQK',cli:true},{name:'Documento interno.pdf',body:'DOCUMENTO PRIVADO',cli:false},{name:'Enlace ficticio',url:'https://proyecto.example.invalid',docKind:'portal-link',cli:true}]
    });
    p.rooms=[{id:8001,name:'Salón ficticio',kind:'estancia',icon:'sofa',cliMode:'ver',sections:[{id:'s-1',name:'Mobiliario',items:[{id:'i-1',name:'Sillón ficticio',img:'/brand/illustrations/nuevo-producto.webp',price:100,cost:80,qty:2,unit:'ud',note:'COSTE Y NOTA PRIVADOS'}]}]},{id:8002,name:'Estancia privada',kind:'estancia',icon:'bed',cliMode:'off',sections:[]}];
    state.logos={};state.portalAnon=true;state.portalBrandToken='portal-ficticio';state.portalCapabilities={customBranding:false};state.portalEstudio='Estudio ficticio';state.portalFacturas=[{ref:'F-9001',date:'2026-10-20',status:'pend',total:242}];
    state.portalCobrado=0;state.portalTel='';state.emitter.phone='';_accessRole='cliente';state.myRole='cliente';
    go('portalcli',9001);window.portalBaseline=records();
   }""")
   root=page.locator('.client-site');nav=root.get_by_role('navigation',name='Menú del portal')
   expect(root).to_be_visible();expect(nav.get_by_role('button')).to_have_count(7)
   assert page.evaluate('sb===null&&document.body.classList.contains("portalmode")')
   assert root.evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(255, 255, 255)'
   sidebar=root.locator('.client-sidebar')
   assert sidebar.evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(255, 255, 255)'
   assert sidebar.evaluate('(e)=>getComputedStyle(e).borderRadius')=='0px'
   expect(root.locator('.client-brand-symbol')).to_be_visible();assert root.locator('.client-brand-full').count()==0
   assert root.locator('.client-brand-symbol svg').count()==1
   assert root.locator('.client-brand-symbol [id]').count()==0
   assert page.locator('.logo-mini.new-brand svg[id]').count()==1
   assert root.locator('.client-brand-symbol').evaluate('(e)=>getComputedStyle(e).filter')=='none'
   assert root.locator('.client-overview').locator(':scope > *').evaluate_all('(es)=>es.every(e=>getComputedStyle(e).backgroundColor==="rgb(255, 255, 255)")')
   assert root.get_by_role('button',name='Hablar con el estudio',exact=True).evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(24, 24, 24)'
   assert root.evaluate('(e)=>e.scrollWidth<=e.clientWidth'),width
   assert root.bounding_box()['width']>=width-18,(width,root.bounding_box())
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
   all_text=root.text_content()
   assert all(x not in all_text for x in ['NOTA INTERNA PRIVADA','ARCHIVO DE TAREA PRIVADO','DOCUMENTO PRIVADO','Documento interno.pdf','COSTE Y NOTA PRIVADOS','Estancia privada'])
   if width>760:
    assert sidebar.bounding_box()['width']==224
    assert sidebar.bounding_box()['height']==1000
   if output:page.screenshot(path=str(output/f'portal-home-{width}.png'),full_page=True)
   nav.get_by_role('button',name='Tareas',exact=True).click()
   expect(root.locator('.client-task-column')).to_have_count(4)
   assert root.locator('.client-task-card').evaluate_all('(es)=>es.every(e=>getComputedStyle(e).backgroundColor==="rgb(255, 255, 255)")')
   assert all(x in root.inner_text() for x in ['Medición ficticia','Plano ficticio','Revisión ficticia','Entrega ficticia'])
   if output:page.screenshot(path=str(output/f'portal-tasks-{width}.png'),full_page=True)
   nav.get_by_role('button',name='Listas de compra',exact=True).click()
   expect(root.get_by_role('button',name='Ampliar imagen de Sillón ficticio',exact=True)).to_be_visible()
   expect(root.locator('.client-product-subtotal')).to_contain_text('200,00')
   root.get_by_role('button',name='Ampliar imagen de Sillón ficticio',exact=True).click()
   image=page.get_by_role('dialog',name='Sillón ficticio',exact=True);expect(image).to_be_visible()
   assert image.evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(255, 255, 255)'
   image.get_by_role('button',name='Cerrar imagen',exact=True).click();expect(image).not_to_be_visible()
   assert root.get_by_role('button',name='Ampliar imagen de Sillón ficticio',exact=True).evaluate('(e)=>e===document.activeElement')
   if output:page.screenshot(path=str(output/f'portal-shopping-{width}.png'),full_page=True)
   nav.get_by_role('button',name='Documentos',exact=True).click()
   expect(root.get_by_text('Documento compartido.pdf',exact=False)).to_be_visible()
   expect(root.get_by_role('link',name='Enlace ficticio',exact=False)).to_have_attribute('href','https://proyecto.example.invalid/')
   nav.get_by_role('button',name='Facturas',exact=True).click()
   expect(root.get_by_text('F-9001',exact=True)).to_be_visible()
   assert root.locator('[onclick*=portalInvoicePrint]').count()>=1
   nav.get_by_role('button',name='Obra',exact=True).click()
   expect(root.locator('.portal-cal')).to_be_visible()
   nav.get_by_role('button',name='Mensajes',exact=True).click()
   draft=page.locator('#pChatIn');draft.fill('Mensaje ficticio sin enviar')
   original=draft.element_handle()
   if width>760:
    root.get_by_role('button',name='Contraer el menú',exact=True).click()
    root.evaluate('(e)=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished))')
    assert sidebar.bounding_box()['width']==64
    assert draft.evaluate('(e)=>e===window.document.querySelector("#pChatIn")')
    assert original.evaluate('(e)=>e.isConnected')
    expect(draft).to_have_value('Mensaje ficticio sin enviar')
    nav.get_by_role('button',name='Inicio',exact=True).click();nav.get_by_role('button',name='Mensajes',exact=True).click()
    expect(draft).to_have_value('Mensaje ficticio sin enviar')
    root.get_by_role('button',name='Expandir el menú',exact=True).click()
    root.evaluate('(e)=>Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished))')
    assert sidebar.bounding_box()['width']==224
   page.emulate_media(reduced_motion='reduce');nav.get_by_role('button',name='Inicio',exact=True).click()
   assert root.locator('[data-client-panel=inicio]').evaluate('(e)=>e.getAnimations().length')==0
   page.emulate_media(reduced_motion='no-preference')
   assert page.evaluate('records()===portalBaseline')
   # Existing server branding capability remains authoritative; images fall back as before.
   page.evaluate("state.portalCapabilities={customBranding:true};state.logos.cm='/brand/Isotipo.svg';render()")
   expect(root.locator('[data-client-brand]')).to_be_visible()
   assert root.locator('[data-client-brand]').get_attribute('alt')=='Estudio ficticio'
   page.evaluate('state.portalCapabilities={customBranding:false};render()')
   assert root.locator('[data-client-brand]').count()==0;expect(root.locator('.client-brand-symbol')).to_be_visible()
   assert page.evaluate('records()===portalBaseline')
   # The project configuration stays on the CRM palette and keeps its unsaved editor.
   page.evaluate("state.portalAnon=false;_accessRole='admin';state.myRole='admin';go('proyecto',9001);projTab('cliente');window.settingsBaseline=records()")
   editor=page.locator('.client-project-editor');expect(editor).to_be_visible()
   editor.locator('[data-client-welcome]').get_by_role('button',name='Editar',exact=True).click()
   page.locator('#cliWelTa').fill('Bienvenida ficticia sin guardar')
   editor.get_by_role('button',name='Cancelar',exact=True).click()
   assert page.evaluate('records()===settingsBaseline')
   expect(editor.locator('.client-shared-documents .project-file-card')).to_have_count(2)
   expect(editor.get_by_role('checkbox',name='Compartir Documento interno.pdf',exact=True)).not_to_be_checked()
   if output:page.screenshot(path=str(output/f'portal-settings-{width}.png'),full_page=True)
   assert page.evaluate('sb===null')
   assert not writes,writes;assert not errors,errors
   print(width,'PASS: neutral portal/sidebar, responsive layout, all sections, image zoom/focus, unsent message preserved on fold/navigation, reduced motion, branding capability, private fields excluded and unchanged CRM settings; no remote writes')
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
