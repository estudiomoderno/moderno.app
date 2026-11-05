"""Project sections and diary in the full app, with fictitious records and no external writes."""
from pathlib import Path
import ast,os,socket,subprocess,time,urllib.request,sys
from playwright.sync_api import sync_playwright,expect
repo=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]) if len(sys.argv)>1 else None
if output:output.mkdir(parents=True,exist_ok=True)
parsed=ast.parse((repo/'scripts/shopping-loading-browser.test.py').read_text())
setup=next(ast.literal_eval(n.value) for n in parsed.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='fixture_setup' for t in n.targets))
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://sections-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_sections-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox'])
  for width,height in [(1440,900),(390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height});errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if r.request.url.startswith('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/'):
     path=Path(os.environ['PDFJS_DIR'])/r.request.url.rsplit('/',1)[-1];r.fulfill(path=str(path),content_type='application/javascript');return
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    if r.request.url==origin+'/':
     response=r.fetch();headers=dict(response.headers);headers['content-security-policy']="connect-src 'self' data: blob:";r.fulfill(response=response,headers=headers);return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   page.evaluate("""()=>{
    const canvas=document.createElement('canvas');canvas.width=360;canvas.height=240;
    const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,360,240);ctx.strokeStyle='#333';ctx.lineWidth=3;ctx.strokeRect(30,30,300,180);ctx.beginPath();ctx.moveTo(180,30);ctx.lineTo(180,150);ctx.lineTo(330,150);ctx.stroke();
    const image=canvas.toDataURL('image/png');
    window.planFixtureImage=image;
    state.projects[0].files=[{name:'Contrato.pdf',data:'data:application/pdf;base64,Zg=='},{name:'Distribución.png',cat:'plano',type:'image/png',data:image}];
    state.projects[0].obraPlanos=[{name:'Planta definitiva.png',type:'image/png',data:image},{name:'Sin archivo.pdf',type:'application/pdf'}];
    projTab('planos');
   }""")
   # A real, minimal PDF with a rectangle, parsed by the app's PDF.js version.
   import base64
   parts=[b'%PDF-1.4\n'];offsets=[0]
   objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 360 240] /Resources << >> /Contents 4 0 R >>',b'<< /Length 24 >>\nstream\n30 30 300 180 re S\n\nendstream']
   for i,obj in enumerate(objects,1):
    offsets.append(sum(map(len,parts)));parts.append(str(i).encode()+b' 0 obj\n'+obj+b'\nendobj\n')
   offset=sum(map(len,parts));parts.append(b'xref\n0 5\n0000000000 65535 f \n'+b''.join(f'{n:010d} 00000 n \n'.encode() for n in offsets[1:])+f'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n{offset}\n%%EOF'.encode())
   pdf='data:application/pdf;base64,'+base64.b64encode(b''.join(parts)).decode()
   page.evaluate("data=>{state.projects[0].obraPlanos.splice(1,0,{name:'Plano final.pdf',type:'application/pdf',data});render();window.beforePlans=JSON.stringify(state.projects);}",pdf)
   expect(page.locator('.plan-gallery-open')).to_have_count(3)
   expect(page.locator('.project-plans-section .project-file-add')).to_have_count(1)
   expect(page.get_by_role('button',name='Subir o arrastrar plano',exact=True)).to_be_visible()
   expect(page.locator('.project-plans-section .project-file-plus')).to_have_count(0)
   expect(page.locator('.project-plans-section .project-files-help')).to_have_count(0)
   expect(page.locator('.project-plans-section h2')).to_have_text('Planos')
   with page.expect_file_chooser():
    page.get_by_role('button',name='Subir o arrastrar plano',exact=True).click()
   assert page.evaluate("state.view==='proyecto'&&state.projTab==='planos'")
   assert page.get_by_role('heading',name='Historial de versiones',exact=True).count()==0
   assert page.locator('[onclick*=obraPlanosToggle]').count()==0
   expect(page.locator('[data-collection=files] img')).to_have_count(1)
   page.locator('.plan-gallery').scroll_into_view_if_needed()
   page.locator('[data-collection=obraPlanos][data-index="0"]').scroll_into_view_if_needed()
   expect(page.locator('[data-collection=obraPlanos][data-index="0"] img')).to_have_count(1)
   page.locator('[data-collection=obraPlanos][data-index="1"]').scroll_into_view_if_needed()
   expect(page.locator('[data-collection=obraPlanos][data-index="1"] canvas')).to_have_count(1,timeout=20000)
   assert page.locator('[data-collection=obraPlanos][data-index="1"] canvas').evaluate('(c)=>c.width>0&&c.width<=480&&c.height<=320')
   page.locator('[data-collection=obraPlanos][data-index="2"]').scroll_into_view_if_needed()
   expect(page.locator('[data-collection=obraPlanos][data-index="2"]')).to_have_text('Vista previa no disponible')
   assert page.evaluate("""()=>{const add=document.querySelector('.project-file-add').getBoundingClientRect();return [...document.querySelectorAll('.plan-preview')].every(el=>{const r=el.getBoundingClientRect();return Math.abs(r.width-add.width)<1&&Math.abs(r.height-add.height)<1})}""")
   if width>=1100:
    for name in ['home','proyectos','workspace','agenda','contabilidad','mail','catalogo','biblioteca','plantillas','tutoriales','documentation']:
     assert page.locator('#desktop-header .desktop-mask').evaluate_all("(nodes,name)=>nodes.some(n=>getComputedStyle(n).maskImage.includes('/'+name+'.svg?v='))",name),name
   assert page.evaluate('JSON.stringify(state.projects)===beforePlans')
   page.get_by_role('button',name='Abrir Planta definitiva.png',exact=True).click()
   expect(page.locator('#modalBox').get_by_role('link',name='↓ Descargar')).to_be_visible()
   page.locator('#modalBox').get_by_role('button',name='Cerrar',exact=True).click()
   assert page.evaluate('JSON.stringify(state.projects)===beforePlans')
   image=page.locator('[data-collection=obraPlanos][data-index="0"] img')
   image.hover()
   page.wait_for_function("getComputedStyle(document.querySelector('[data-collection=obraPlanos][data-index=\"0\"] img')).transform !== 'none'")
   page.emulate_media(reduced_motion='reduce')
   expect(image).to_have_css('transform','none')
   page.emulate_media(reduced_motion='no-preference')
   if output:page.screenshot(path=str(output/f'planos-miniaturas-{width}.png'))
   page.evaluate("()=>{window.uploadCalls=[];addFiles=(pid,files,section)=>uploadCalls.push({pid,names:Array.from(files,f=>f.name),section});}")
   page.locator('.project-file-add input').set_input_files({'name':'Prueba.png','mimeType':'image/png','buffer':b'fixture'})
   page.locator('.project-file-add').evaluate("el=>{const dt=new DataTransfer();dt.items.add(new File(['fixture'],'Arrastrado.pdf',{type:'application/pdf'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}))}")
   assert page.evaluate("uploadCalls.length===2&&uploadCalls.every(c=>c.pid===9001&&c.section==='planos')")
   assert page.evaluate('JSON.stringify(state.projects)===beforePlans')
   for collection,name in [('files','Distribución.png'),('obraPlanos','Planta definitiva.png')]:
    page.get_by_role('button',name='Opciones de '+name,exact=True).click()
    panel=page.locator('.plan-options-editor')
    expect(panel).to_be_visible()
    page.locator('#modalBox').evaluate('(el)=>Promise.all(el.getAnimations().map(a=>a.finished))')
    bounds=page.locator('#modalBox').bounding_box()
    assert abs(bounds['x']+bounds['width']-width)<1 and bounds['height']==height,bounds
    before=page.evaluate('JSON.stringify(state.projects)')
    page.get_by_label('Nombre del plano',exact=True).fill('Cambio cancelado')
    panel.get_by_role('button',name='Cancelar',exact=True).click()
    assert page.evaluate('JSON.stringify(state.projects)')==before
    page.get_by_role('button',name='Opciones de '+name,exact=True).click()
    page.get_by_label('Nombre del plano',exact=True).fill('Plano renombrado '+collection)
    if output:page.screenshot(path=str(output/f'opciones-plano-{width}.png'))
    panel.get_by_role('button',name='Guardar',exact=True).click()
    renamed='Plano renombrado '+collection+'.png'
    assert page.evaluate("args=>{const file=state.projects[0][args[0]].find(f=>f.name===args[1]);return file&&file.data===planFixtureImage}",[collection,renamed])
    page.get_by_role('button',name='Opciones de '+renamed,exact=True).click()
    before=page.evaluate('JSON.stringify(state.projects)')
    page.evaluate("args=>{state.projects[0][args[0]].find(f=>f.name===args[1]).name='Nombre remoto.png'}",[collection,renamed])
    remote=page.evaluate('JSON.stringify(state.projects)')
    panel.get_by_role('button',name='Guardar',exact=True).click()
    assert page.evaluate('JSON.stringify(state.projects)')==remote
    page.evaluate("args=>{state.projects[0][args[0]].find(f=>f.name==='Nombre remoto.png').name=args[1]}",[collection,renamed])
    page.evaluate("_accessRole='cliente'")
    panel.get_by_role('button',name='Guardar',exact=True).click()
    assert page.evaluate('JSON.stringify(state.projects)')==before
    page.evaluate("_accessRole='admin'")
    panel.get_by_role('button',name='Eliminar',exact=True).click()
    assert page.evaluate('JSON.stringify(state.projects)')==before
    panel.get_by_role('button',name='Confirmar eliminación',exact=True).click()
    assert page.evaluate("args=>!state.projects[0][args[0]].some(f=>f.name===args[1])",[collection,renamed])
   assert page.evaluate("state.projects[0].files.some(f=>f.name==='Contrato.pdf')")
   page.evaluate("_accessRole='colaborador';state.myRole='colaborador';render()")
   expect(page.locator('.plan-gallery-open')).to_have_count(2)
   assert not errors,errors
   assert not writes,writes
   print(width,'PASS: upload stays in Planos, previews and options drawer, rename/cancel/confirmed deletion, stale and revoked access guards',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
