"""Offline visual proof for #202. Uses only fictitious PDF/DXF files."""
import pathlib
import sys
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright

repo=pathlib.Path(__file__).resolve().parents[1]
pdfjs=pathlib.Path(sys.argv[1])
out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
dxf="""0
SECTION
2
TABLES
0
LAYER
2
Muros
62
7
0
LAYER
2
Mobiliario
62
5
0
LAYER
2
Cotas
62
1
0
ENDSEC
0
SECTION
2
ENTITIES
0
LWPOLYLINE
8
Muros
70
1
10
0
20
0
10
1200
20
0
10
1200
20
700
10
0
20
700
0
LINE
8
Muros
10
520
20
0
11
520
21
700
0
LINE
8
Muros
10
0
20
360
11
520
21
360
0
LWPOLYLINE
8
Mobiliario
70
1
10
650
20
120
10
1060
20
120
10
1060
20
340
10
650
20
340
0
CIRCLE
8
Mobiliario
10
855
20
230
40
65
0
LINE
8
Cotas
10
0
20
-70
11
1200
21
-70
0
TEXT
8
Cotas
10
520
20
-45
1
12,00 m
0
TEXT
8
Muros
10
40
20
650
1
PLANTA GENERAL
0
ENDSEC
0
EOF
"""

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 def route(r):
  parsed=urlparse(r.request.url);name=unquote(pathlib.PurePosixPath(parsed.path).name)
  if name=='index.html':r.fulfill(body='<meta name="viewport" content="width=device-width"><body><aside id="app-sidebar">Menú lateral</aside><header id="app-header">Cabecera Moderno</header><main><div id="project-heading">PR-70 · Proyecto ficticio</div><section id="project-tab-panel"></section><div class="project-tabs project-dock" role="tablist" aria-label="Secciones del proyecto"><button aria-label="Tareas"></button><button aria-label="Compras"></button><span class="project-tab-separator"></span><button aria-label="Planos"></button><button aria-label="Obra"></button><span class="project-tab-separator"></span><button aria-label="Estudio"></button><button aria-label="Presentaciones"></button><span class="project-tab-separator"></span><button aria-label="Documentos"></button><button aria-label="Ajustes"></button></div></main></body>',content_type='text/html')
  elif name in ['pdf.min.js','pdf.worker.min.js']:r.fulfill(path=str(pdfjs/name),content_type='application/javascript')
  elif parsed.path.startswith('/brand/icons/plan-viewer/') and (repo/'app/brand/icons/plan-viewer'/name).is_file():r.fulfill(path=str(repo/'app/brand/icons/plan-viewer'/name),content_type='image/svg+xml')
  else:r.abort()
 page.route('**/*',route);page.goto('https://planos-prueba.invalid/index.html')
 page.add_style_tag(content=':root{--ink:#242424;--ink-soft:#6d706f;--white:#fff;--bg:#f4f5f4;--card:#ecefed;--ui-line:#dfe2e0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;display:grid;grid-template-columns:190px 1fr;grid-template-rows:56px 1fr;height:100vh}#app-sidebar{grid-row:1/3;padding:20px;border-right:1px solid var(--ui-line)}#app-header{padding:18px;border-bottom:1px solid var(--ui-line)}main{padding:16px;min-width:0}#project-heading{padding:0 0 12px;font-weight:700}.btn{border:1px solid var(--ui-line);background:#fff;border-radius:9px;padding:8px 12px;color:var(--ink)}')
 page.add_style_tag(path=str(repo/'app/brand/project-dock.css'))
 page.add_style_tag(path=str(repo/'app/plan-editor.css'))
 page.add_script_tag(url='https://planos-prueba.invalid/pdf.min.js');page.evaluate("pdfjsLib.GlobalWorkerOptions.workerSrc='https://planos-prueba.invalid/pdf.worker.min.js'")
 for name in ['plan-annotations.js','cad-viewer.js','plan-editor.js']:page.add_script_tag(path=str(repo/'app'/name))
 page.evaluate("""()=>{window.shell=name=>{document.querySelector('#project-tab-panel').innerHTML='<section class="project-plan-dialog" role="dialog" aria-label="Plano del proyecto"><header><strong>'+name+'</strong><div class="plan-dialog-actions"><button class="btn btn-ghost project-plan-save">Guardar</button><button class="btn btn-ghost">Guardar como copia</button><button class="btn btn-ghost project-plan-delete">Eliminar</button><button class="btn btn-ghost project-plan-edit">Editar</button><button class="btn btn-ghost project-plan-close">Cerrar</button></div></header><section id="viewer"></section></section>';const dialog=document.querySelector('.project-plan-dialog'),top=Math.max(0,Math.round(dialog.getBoundingClientRect().top));dialog.style.height=`calc(100dvh - ${top}px)`;dialog.style.minHeight='0';};}""")
 page.evaluate("""async()=>{
  shell('PR-70 · Planta general.pdf');const pages=[];
  for(let n=1;n<=2;n++){const c=document.createElement('canvas');c.width=1200;c.height=760;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.strokeStyle='#252525';x.lineWidth=6;x.strokeRect(90,90,1020,560);x.lineWidth=3;x.beginPath();x.moveTo(510,90);x.lineTo(510,650);x.moveTo(90,360);x.lineTo(510,360);x.stroke();x.strokeRect(650,190,330,220);x.beginPath();x.arc(815,300,58,0,Math.PI*2);x.stroke();x.fillStyle='#252525';x.font='bold 30px Arial';x.fillText(n===1?'PLANTA GENERAL · PR-70':'PLANTA DE ILUMINACIÓN · PR-70',90,55);x.font='18px Arial';x.fillText('Documento ficticio para revisión visual',90,710);const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.94));pages.push({width:c.width,height:c.height,jpeg:new Uint8Array(await blob.arrayBuffer())});}
  window.pdfSource=ModernoPlanEditor.pdf(pages);window.doc=await ModernoPlanEditor.openFile(new File([pdfSource],'PR-70 - Planta general.pdf',{type:'application/pdf'}),{pdfjs:pdfjsLib});window.model=new ModernoPlanAnnotations.Model({reference:{studyId:'moderno-prueba',projectId:'PR-70',fileId:'pdf-ficticio',revisionId:'original'},pages:doc.pages,authorize:()=>true});window.editor=await ModernoPlanEditor.mount(document.querySelector('#viewer'),{document:doc,model,filename:'PR-70 - Planta general.pdf',products:[{id:'producto-ficticio',name:'Sillón de muestra',room:'Salón',reference:'SF-1'}]});
 }""")
 page.wait_for_function("document.querySelector('.plan-paper canvas').width>0");page.wait_for_function("[...document.querySelectorAll('.plan-icon-button img')].every(img=>img.complete&&img.naturalWidth>0)");page.wait_for_timeout(350)
 assert page.locator('.plan-viewer-bar').bounding_box()['y'] > page.locator('.plan-viewport').bounding_box()['y']
 dock_box=page.locator('.project-dock').bounding_box();tools_box=page.locator('.plan-viewer-bar').bounding_box();assert abs((dock_box['x']+dock_box['width'])-tools_box['x']) < 3
 assert abs(dock_box['y']-tools_box['y']) < 1 and abs(dock_box['height']-tools_box['height']) < 1
 assert page.locator('.project-dock').evaluate("el=>getComputedStyle(el).backgroundColor")==page.locator('.plan-viewer-bar').evaluate("el=>getComputedStyle(el).backgroundColor")
 assert page.locator('.plan-toolbox').evaluate("el=>getComputedStyle(el).backgroundColor")=='rgba(0, 0, 0, 0)'
 assert page.locator('.plan-tool-separator').count()==4 and page.locator('.plan-viewer-bar').evaluate("el=>getComputedStyle(el).opacity")=='1'
 assert page.locator('#app-header').is_visible() and page.locator('#app-sidebar').is_visible() and page.locator('#project-heading').is_visible()
 assert page.get_by_role('button',name='Páginas',exact=True).count()==0
 assert page.get_by_text('Propiedades',exact=True).count()==0 and page.get_by_text('Mediciones',exact=True).count()==0
 assert page.get_by_text('Añade notas desde la barra superior.',exact=True).count()==0
 assert page.get_by_role('button',name='Pantalla completa',exact=True).count()==0 and page.get_by_role('button',name='Descargar original',exact=True).count()==0
 assert page.get_by_role('button',name='Guardar',exact=True).count()==1 and page.get_by_role('button',name='Guardar como copia',exact=True).count()==1
 assert page.get_by_role('button',name='Eliminar',exact=True).count()==1 and page.get_by_role('button',name='Editar',exact=True).count()==1 and page.get_by_role('button',name='Cerrar',exact=True).count()==1
 for removed in ['Rectángulo','Círculo','Nota','Lápiz','Resaltador','Panel de comentarios']:
  assert page.get_by_role('button',name=removed,exact=True).count()==0
 assert 'Selector de Color.svg?v=203' in page.get_by_role('button',name='Color',exact=True).locator('img').get_attribute('src')
 assert page.get_by_text('Grosor',exact=True).count()==0 and 60 <= page.locator('.plan-width-label').bounding_box()['width'] <= 66
 project_button=page.locator('.project-dock button').first.bounding_box();plan_button=page.get_by_role('button',name='Color',exact=True).bounding_box();assert abs(project_button['y']-plan_button['y']) < 1 and abs(project_button['height']-plan_button['height']) < 1
 dialog_box=page.locator('.project-plan-dialog').bounding_box();viewport_box=page.locator('.plan-viewport').bounding_box();assert abs(dialog_box['y']+dialog_box['height']-900) < 2 and viewport_box['y']+viewport_box['height'] > tools_box['y']
 eraser=page.get_by_role('button',name='Borrador',exact=True).bounding_box();rotate=page.get_by_role('button',name='Girar 90°',exact=True).bounding_box();assert abs(eraser['y']-rotate['y']) < 1 and 0 < rotate['x']-eraser['x'] < 34
 assert page.get_by_role('button',name='Desplazar',exact=True).locator('img').evaluate("el=>getComputedStyle(el).filter")=='brightness(0) invert(0.45)'
 page.get_by_role('button',name='Color',exact=True).click();assert page.get_by_label('Opacidad',exact=True).is_visible() and page.locator('.plan-color-swatch').count()==8
 page.screenshot(path=str(out/'visor-pdf-202.png'),full_page=True)
 page.evaluate('editor.discard()')
 page.evaluate("""async source=>{shell('PR-70 · Planta general.dxf');window.doc=await ModernoCadViewer.open(new File([source],'PR-70 - Planta general.dxf',{type:'application/dxf'}));window.model=new ModernoPlanAnnotations.Model({reference:{studyId:'moderno-prueba',projectId:'PR-70',fileId:'dxf-ficticio',revisionId:'original'},pages:1,authorize:()=>true});window.editor=await ModernoPlanEditor.mount(document.querySelector('#viewer'),{document:doc,model,filename:'PR-70 - Planta general.dxf',readOnly:true,metadata:doc.metadata});}""",dxf)
 page.wait_for_function("document.querySelector('.plan-paper canvas').width>0");page.wait_for_function("[...document.querySelectorAll('.plan-icon-button img')].every(img=>img.complete&&img.naturalWidth>0)");page.wait_for_timeout(350)
 assert page.get_by_text('Propiedades',exact=True).count()==0 and page.get_by_text('Mediciones',exact=True).count()==0 and page.get_by_text('DXF',exact=True).count()==0
 assert page.get_by_role('button',name='Lápiz',exact=True).count()==0
 assert page.get_by_role('button',name='Desplazar',exact=True).count()==1
 assert page.get_by_role('button',name='Desplazar',exact=True).locator('img').get_attribute('src').endswith('/Desplazar.svg?v=203')
 assert page.get_by_role('button',name='Medir',exact=True).count()==0
 page.screenshot(path=str(out/'visor-cad-dxf-202.png'),full_page=True)
 assert not errors,errors
 page.evaluate('editor.discard()');page.close();browser.close()
 print('PASS: visor PDF y DXF integrado, dock inferior animado, paneles y solo lectura')
