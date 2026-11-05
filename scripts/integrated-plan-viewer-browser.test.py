"""Offline visual proof for #202. Uses only fictitious PDF/DXF files."""
import pathlib
import sys
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
  name=r.request.url.rsplit('/',1)[-1]
  if name=='index.html':r.fulfill(body='<meta name="viewport" content="width=device-width"><body></body>',content_type='text/html')
  elif name in ['pdf.min.js','pdf.worker.min.js']:r.fulfill(path=str(pdfjs/name),content_type='application/javascript')
  else:r.abort()
 page.route('**/*',route);page.goto('https://planos-prueba.invalid/index.html')
 page.add_style_tag(content=':root{--ink:#242424;--ink-soft:#6d706f;--white:#fff;--bg:#f4f5f4;--card:#ecefed;--ui-line:#dfe2e0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}.btn{border:1px solid var(--ui-line);background:#fff;border-radius:9px;padding:8px 12px;color:var(--ink)}')
 page.add_style_tag(path=str(repo/'app/plan-editor.css'))
 page.add_script_tag(url='https://planos-prueba.invalid/pdf.min.js');page.evaluate("pdfjsLib.GlobalWorkerOptions.workerSrc='https://planos-prueba.invalid/pdf.worker.min.js'")
 for name in ['plan-annotations.js','cad-viewer.js','plan-editor.js']:page.add_script_tag(path=str(repo/'app'/name))
 page.evaluate("""()=>{window.shell=name=>{document.body.innerHTML='<dialog class="project-plan-dialog" aria-label="Plano del proyecto" open><header><strong>'+name+'</strong><div class="plan-dialog-actions"><button class="btn">Descargar original</button><button class="btn">Pantalla completa</button><button class="btn">Cerrar</button></div></header><section id="viewer"></section></dialog>';};}""")
 page.evaluate("""async()=>{
  shell('PR-70 · Planta general.pdf');const pages=[];
  for(let n=1;n<=2;n++){const c=document.createElement('canvas');c.width=1200;c.height=760;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.strokeStyle='#252525';x.lineWidth=6;x.strokeRect(90,90,1020,560);x.lineWidth=3;x.beginPath();x.moveTo(510,90);x.lineTo(510,650);x.moveTo(90,360);x.lineTo(510,360);x.stroke();x.strokeRect(650,190,330,220);x.beginPath();x.arc(815,300,58,0,Math.PI*2);x.stroke();x.fillStyle='#252525';x.font='bold 30px Arial';x.fillText(n===1?'PLANTA GENERAL · PR-70':'PLANTA DE ILUMINACIÓN · PR-70',90,55);x.font='18px Arial';x.fillText('Documento ficticio para revisión visual',90,710);const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.94));pages.push({width:c.width,height:c.height,jpeg:new Uint8Array(await blob.arrayBuffer())});}
  window.pdfSource=ModernoPlanEditor.pdf(pages);window.doc=await ModernoPlanEditor.openFile(new File([pdfSource],'PR-70 - Planta general.pdf',{type:'application/pdf'}),{pdfjs:pdfjsLib});window.model=new ModernoPlanAnnotations.Model({reference:{studyId:'moderno-prueba',projectId:'PR-70',fileId:'pdf-ficticio',revisionId:'original'},pages:doc.pages,authorize:()=>true});window.editor=await ModernoPlanEditor.mount(document.querySelector('#viewer'),{document:doc,model,filename:'PR-70 - Planta general.pdf'});
 }""")
 page.wait_for_function("document.querySelector('.plan-paper canvas').width>0");page.wait_for_timeout(350)
 assert page.locator('.plan-viewer-bar').bounding_box()['y'] < page.locator('.plan-viewport').bounding_box()['y']
 assert page.get_by_role('button',name='Página 2').count()==1
 page.screenshot(path=str(out/'visor-pdf-202.png'),full_page=True)
 page.evaluate('editor.discard()')
 page.evaluate("""async source=>{shell('PR-70 · Planta general.dxf');window.doc=await ModernoCadViewer.open(new File([source],'PR-70 - Planta general.dxf',{type:'application/dxf'}));window.model=new ModernoPlanAnnotations.Model({reference:{studyId:'moderno-prueba',projectId:'PR-70',fileId:'dxf-ficticio',revisionId:'original'},pages:1,authorize:()=>true});window.editor=await ModernoPlanEditor.mount(document.querySelector('#viewer'),{document:doc,model,filename:'PR-70 - Planta general.dxf',readOnly:true,metadata:doc.metadata});}""",dxf)
 page.wait_for_function("document.querySelector('.plan-paper canvas').width>0");page.wait_for_timeout(350)
 assert page.get_by_text('DXF',exact=True).count()==1
 assert page.get_by_text('Muros, Mobiliario, Cotas',exact=True).count()==1
 assert page.get_by_role('button',name='Lápiz',exact=True).count()==0
 assert page.get_by_role('button',name='Desplazar',exact=True).count()==1
 page.screenshot(path=str(out/'visor-cad-dxf-202.png'),full_page=True)
 assert not errors,errors
 page.evaluate('editor.discard()');page.close();browser.close()
 print('PASS: visor PDF y DXF integrado, toolbar superior, paneles, capas CAD y solo lectura')
