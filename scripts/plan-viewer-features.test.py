"""Offline visor tests with fictitious PDF/photos and real tablet touch events.
Run: python scripts/plan-viewer-features.test.py /path/to/pdfjs-dist/build [screenshot-dir]
No app server, credentials, real photos, camera hardware or external network.
"""
import base64
import pathlib
import sys
from playwright.sync_api import sync_playwright

repo=pathlib.Path(__file__).resolve().parents[1]
pdfjs=pathlib.Path(sys.argv[1])
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width,height in [(1280,900),(768,1024),(1024,768),(390,844)]:
        page=browser.new_page(viewport={'width':width,'height':height},has_touch=True,accept_downloads=True)
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        def route(r):
            name=r.request.url.rsplit('/',1)[-1]
            if name=='index.html':r.fulfill(body='<meta name="viewport" content="width=device-width"><main id="editor"></main>',content_type='text/html')
            elif name in ['pdf.min.js','pdf.worker.min.js']:r.fulfill(path=str(pdfjs/name),content_type='application/javascript')
            else:r.abort()
        page.route('**/*',route);page.goto('https://visor.invalid/index.html')
        page.add_style_tag(path=str(repo/'app/plan-editor.css'))
        page.add_script_tag(url='https://visor.invalid/pdf.min.js')
        for name in ['plan-annotations.js','plan-editor.js']:page.add_script_tag(path=str(repo/'app'/name))
        page.evaluate('''async()=>{
          pdfjsLib.GlobalWorkerOptions.workerSrc='https://visor.invalid/pdf.worker.min.js';
          const pages=[];for(let n=1;n<=3;n++){const c=document.createElement('canvas');c.width=600;c.height=400;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,600,400);ctx.fillStyle='#222';ctx.font='24px sans-serif';ctx.fillText('Página ficticia '+n,40,40);const blob=await new Promise(r=>c.toBlob(r,'image/jpeg'));pages.push({width:600,height:400,jpeg:new Uint8Array(await blob.arrayBuffer())});}
          window.source=ModernoPlanEditor.pdf(pages);window.original=new Uint8Array(await source.arrayBuffer());
          window.doc=await ModernoPlanEditor.openFile(new File([source],'fake.pdf',{type:'application/pdf'}),{pdfjs:pdfjsLib});
          window.authorized=true;window.model=new ModernoPlanAnnotations.Model({reference:{studyId:'fake',projectId:'fake',fileId:'fake',revisionId:'original'},pages:3,authorize:()=>authorized});
          window.editor=await ModernoPlanEditor.mount(document.querySelector('main'),{document:doc,model});
        }''')
        canvas=page.get_by_label('Lienzo de anotación')
        assert page.locator('.plan-toolbar[aria-label="Herramientas"] button[aria-pressed=true]').count()==0
        page.mouse.click(width*.4,height*.45)
        assert page.evaluate('model.items.length')==0 and not page.evaluate('model.dirty')
        client=page.context.new_cdp_session(page)
        def touch(kind,points):
            client.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'id':i+1,'x':x,'y':y,'radiusX':3,'radiusY':3,'force':1} for i,(x,y) in enumerate(points)]})
        x,y=width*.45,height*.45
        before=page.locator('.plan-paper').bounding_box()['width']
        touch('touchStart',[(x-40,y),(x+40,y)]);touch('touchMove',[(x-80,y),(x+80,y)]);touch('touchEnd',[])
        enlarged=page.locator('.plan-paper').bounding_box()['width'];assert enlarged>before*1.6
        touch('touchStart',[(x-80,y),(x+80,y)]);touch('touchMove',[(x-40,y),(x+40,y)]);touch('touchEnd',[])
        assert page.locator('.plan-paper').bounding_box()['width']<enlarged*.7
        left=page.locator('.plan-viewport').evaluate('e=>e.scrollLeft')
        touch('touchStart',[(x,y)]);touch('touchMove',[(x-45,y)]);touch('touchEnd',[])
        assert page.locator('.plan-viewport').evaluate('e=>e.scrollLeft')>left
        assert page.evaluate('model.items.length')==0 and not page.evaluate('model.dirty')
        touch('touchStart',[(x,y)]);touch('touchCancel',[])
        page.get_by_role('button',name='Lápiz',exact=True).click();assert page.get_by_role('button',name='Lápiz',exact=True).get_attribute('aria-pressed')=='true'
        page.get_by_role('button',name='Lápiz',exact=True).click();assert page.get_by_role('button',name='Lápiz',exact=True).get_attribute('aria-pressed')=='false'
        page.get_by_role('button',name='Páginas',exact=True).click()
        page.get_by_role('button',name='Página 2',exact=True).click()
        page.wait_for_function("document.querySelector('.plan-page-label').textContent==='2 / 3'")
        assert page.get_by_role('button',name='Página 2',exact=True).get_attribute('aria-current')=='page'
        page.wait_for_function("document.querySelector('[data-plan-page=\"2\"] canvas').width <= 140")
        if len(sys.argv)>2:
            page.screenshot(path=str(pathlib.Path(sys.argv[2])/f'pages-{width}.png'))
        page.get_by_role('button',name='Cerrar páginas',exact=True).click()
        assert page.get_by_role('button',name='Páginas',exact=True).get_attribute('aria-expanded')=='false'
        page.get_by_role('button',name='Ajustar',exact=True).click()
        page.get_by_role('button',name='Selector',exact=True).click()
        page.mouse.move(width*.4,height*.5);page.mouse.down();page.mouse.move(width*.55,height*.55,steps=8);page.mouse.up()
        assert page.locator('.plan-pointer-layer g').count()==1
        assert page.evaluate('model.items.length')==0 and not page.evaluate('model.dirty')
        page.wait_for_timeout(250)
        assert page.locator('.plan-pointer-layer g').evaluate('e=>Number(getComputedStyle(e).opacity)')<1
        page.wait_for_function("!document.querySelector('.plan-pointer-layer g')",timeout=2500)
        page.mouse.click(width*.4,height*.5)
        assert page.locator('.plan-pointer-layer g').count()==1
        page.get_by_role('button',name='Página siguiente',exact=True).click()
        page.wait_for_function("document.querySelector('.plan-page-label').textContent==='3 / 3'")
        assert page.locator('.plan-pointer-layer g').count()==0
        page.get_by_role('button',name='Página anterior',exact=True).click()
        page.wait_for_function("document.querySelector('.plan-page-label').textContent==='2 / 3'")
        page.get_by_role('button',name='Selector',exact=True).click()
        data=page.evaluate("()=>{const c=document.createElement('canvas');c.width=120;c.height=80;const ctx=c.getContext('2d');ctx.fillStyle='#22aa33';ctx.fillRect(0,0,120,80);return c.toDataURL('image/png')}")
        photo={'name':'ficticia.png','mimeType':'image/png','buffer':base64.b64decode(data.split(',')[1])}
        page.locator('.plan-photo-gallery').set_input_files({'name':'rechazada.svg','mimeType':'image/svg+xml','buffer':b'<svg/>'})
        page.wait_for_function("document.querySelector('.plan-status').textContent.includes('JPG')")
        assert page.evaluate('model.items.length')==0
        page.evaluate('authorized=false')
        page.locator('.plan-photo-gallery').set_input_files(photo)
        page.wait_for_function("document.querySelector('.plan-status').textContent.includes('No autorizado')")
        assert page.evaluate('model.items.length')==0
        page.evaluate('authorized=true')
        with page.expect_file_chooser() as chooser:page.get_by_role('button',name='Añadir foto',exact=True).click()
        chooser.value.set_files(photo)
        page.wait_for_function("document.querySelector('[aria-label=\"Añadir foto\"]').getAttribute('aria-pressed')==='true'")
        page.mouse.click(width*.4,height*.45)
        assert page.evaluate("model.items[0].type==='image'&&model.items[0].imageData.startsWith('data:image/jpeg;base64,/9j/')")
        page.get_by_role('button',name='Deshacer',exact=True).click();assert page.evaluate('model.items.length')==0
        page.get_by_role('button',name='Rehacer',exact=True).click();assert page.evaluate('model.items.length')==1
        assert page.locator('.plan-photo-camera').get_attribute('capture')=='environment'
        with page.expect_file_chooser() as chooser:page.get_by_role('button',name='Hacer foto',exact=True).click()
        chooser.value.set_files(photo)
        page.wait_for_function("document.querySelector('[aria-label=\"Añadir foto\"]').getAttribute('aria-pressed')==='true'")
        page.mouse.click(width*.45,height*.65)
        assert page.evaluate('model.items.length')==2
        page.get_by_role('button',name='Comentarios',exact=True).click()
        page.get_by_label('Texto o nota',exact=True).fill('Revisar esta cota <texto seguro>')
        page.mouse.click(width*.4,height*.6)
        assert page.evaluate("model.items[2].type==='note'&&model.items[2].text==='Revisar esta cota <texto seguro>'")
        assert page.locator('#editor script').count()==0
        page.get_by_role('button',name='Comentarios',exact=True).click()
        with page.expect_download() as download:page.get_by_role('button',name='Exportar PDF',exact=True).click()
        exported=pathlib.Path(download.value.path()).read_bytes();page.evaluate('window.exported=new Uint8Array('+str(list(exported))+')')
        assert page.evaluate('''async()=>{
          const pdf=await pdfjsLib.getDocument({data:exported,isEvalSupported:false}).promise,p=await pdf.getPage(2),v=p.getViewport({scale:1.5}),c=document.createElement('canvas');c.width=v.width;c.height=v.height;await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;
          const a=model.items[0],x=(a.points[0].x+a.points[1].x)/2,y=(a.points[0].y+a.points[1].y)/2,rgba=c.getContext('2d').getImageData(Math.floor(x*c.width),Math.floor(y*c.height),1,1).data;
          await pdf.destroy();const bytes=new Uint8Array(await source.arrayBuffer());return rgba[1]>120&&rgba[0]<80&&rgba[2]<100&&bytes.every((b,i)=>b===original[i]);
        }''')
        if len(sys.argv)>2:page.screenshot(path=str(pathlib.Path(sys.argv[2])/f'features-{width}.png'))
        assert not errors,errors
        assert page.evaluate('async()=>{try{await editor.close();return false}catch{return true}}')
        page.evaluate('editor.discard()');assert page.locator('#editor canvas').count()==0
        page.evaluate('''async()=>{window.doc=await ModernoPlanEditor.openFile(new File([source],'fake.pdf',{type:'application/pdf'}),{pdfjs:pdfjsLib});window.model=new ModernoPlanAnnotations.Model({reference:{studyId:'fake',projectId:'fake',fileId:'fake',revisionId:'original'},pages:3,authorize:()=>true});window.editor=await ModernoPlanEditor.mount(document.querySelector('main'),{document:doc,model});}''')
        page.get_by_role('button',name='Selector',exact=True).click();page.mouse.click(width*.4,height*.5)
        assert page.locator('.plan-pointer-layer g').count()==1
        page.evaluate('editor.close()')
        assert page.locator('#editor svg').count()==0
        page.wait_for_timeout(1600)
        assert not errors,errors
        print(width,'PASS: sin herramienta, pinch/pan táctil, selector fade, páginas, comentario, foto/entrada cámara, undo/redo, exportación y original intacto')
        page.close()
    browser.close()
