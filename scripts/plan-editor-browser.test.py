"""Offline, synthetic phase-1 smoke test. Requires Playwright + Chromium.
Run: python3 scripts/plan-editor-browser.test.py /path/to/pdfjs-dist/build
The PDF.js directory must contain pdf.min.js and pdf.worker.min.js (3.11.174,
the existing app version). No Supabase credentials or app server are used.
"""
import pathlib
import sys
from playwright.sync_api import sync_playwright

repo = pathlib.Path(__file__).resolve().parents[1]
pdfjs = pathlib.Path(sys.argv[1])
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    for viewport in [{"width": 1280, "height": 900}, {"width": 390, "height": 844}, {"width": 844, "height": 390}, {"width": 768, "height": 1024}, {"width": 1024, "height": 768}]:
        page = browser.new_page(viewport=viewport, accept_downloads=True)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        def route(r):
            name = r.request.url.rsplit("/", 1)[-1]
            if name == "index.html":
                r.fulfill(body='<meta name="viewport" content="width=device-width"><main id="editor"></main>', content_type="text/html")
            elif name in ["pdf.min.js", "pdf.worker.min.js"]:
                r.fulfill(path=str(pdfjs / name), content_type="application/javascript")
            else:
                r.abort()
        page.route("**/*", route)
        page.goto("https://planos.invalid/index.html")
        page.add_style_tag(path=str(repo / "app/plan-editor.css"))
        page.add_script_tag(url="https://planos.invalid/pdf.min.js")
        for name in ["plan-annotations.js", "plan-editor.js"]:
            page.add_script_tag(path=str(repo / "app" / name))
        page.evaluate("""async () => {
          pdfjsLib.GlobalWorkerOptions.workerSrc='https://planos.invalid/pdf.worker.min.js';
          const pages=[];
          for(let i=0;i<2;i++) {
            const c=document.createElement('canvas'); c.width=600;c.height=i?800:400;
            const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
            ctx.fillStyle='#222';ctx.font='24px sans-serif';ctx.fillText('Plano ficticio '+(i+1),40,40);
            const blob=await new Promise(r=>c.toBlob(r,'image/jpeg'));
            pages.push({width:c.width,height:c.height,jpeg:new Uint8Array(await blob.arrayBuffer())});
          }
          window.source=ModernoPlanEditor.pdf(pages); window.original=await source.arrayBuffer();
          window.doc=await ModernoPlanEditor.openFile(new File([source],'ficticio.pdf',{type:'application/pdf'}),{pdfjs:pdfjsLib});
          window.model=new ModernoPlanAnnotations.Model({reference:{studyId:'fake-study',projectId:'fake-project',fileId:'fake-file',revisionId:'fake-original'},pages:doc.pages,authorize:()=>true});
          window.editor=await ModernoPlanEditor.mount(document.querySelector('main'),{document:doc,model});
        }""")
        assert page.get_by_role("button", name="Guardar", exact=True).is_disabled()
        canvas = page.get_by_label("Lienzo de anotación")
        paper=page.locator('.plan-paper').bounding_box();area=page.locator('.plan-viewport').bounding_box();box=page.locator('.plan-toolbox').bounding_box()
        assert paper['width'] >= area['width']-1 and paper['height'] >= area['height']-1
        assert paper['y'] <= box['y'] and paper['y']+paper['height'] >= box['y']+box['height']
        assert box['width'] <= 500
        def zoom_out_to_draw():
            for _ in range(4):
                paper=page.locator('.plan-paper').bounding_box()
                if paper['width'] <= viewport['width']-40 and paper['height'] <= viewport['height']*.6: break
                page.get_by_role('button',name='Alejar',exact=True).click()
        zoom_out_to_draw()
        def stroke():
            box = canvas.bounding_box()
            page.mouse.move(box["x"]+box["width"]*.2, box["y"]+box["height"]*.3)
            page.mouse.down()
            page.mouse.move(box["x"]+box["width"]*.4, box["y"]+box["height"]*.4, steps=5)
            page.mouse.up()
        # Palette and thickness are usable without opening an extra menu.
        page.get_by_role('button', name='Color Azul', exact=True).click()
        page.get_by_label('Grosor', exact=True).fill('5')
        assert page.get_by_role('button', name='Color Azul', exact=True).get_attribute('aria-pressed') == 'true'
        assert page.get_by_role('button', name='Lápiz', exact=True).locator('svg').count() == 1
        assert page.locator('.plan-selection').get_attribute('open') is None
        assert page.locator('.plan-toolbox').bounding_box()['width'] <= viewport['width']
        stroke()
        assert page.evaluate("model.items[0].color") == '#1677ff'
        assert page.evaluate("model.items[0].width") == 5
        assert page.evaluate("model.items.length") == 1
        first = page.evaluate("model.items[0].points[0]")
        assert abs(first["x"]-.2) < .01 and abs(first["y"]-.3) < .01
        page.get_by_role("button", name="Deshacer", exact=True).click()
        assert page.evaluate("model.items.length") == 0
        page.get_by_role("button", name="Rehacer", exact=True).click()
        box=page.locator('.plan-toolbox').bounding_box()
        assert box['y'] > viewport['height']*.6
        palette=page.locator('.plan-palette').bounding_box();slider=page.get_by_label('Grosor',exact=True).bounding_box()
        assert abs(slider['x']+slider['width']-palette['x']-palette['width']) < 5
        page.get_by_role('button',name='Girar 90°',exact=True).click()
        zoom_out_to_draw()
        assert page.evaluate('model.items[0].points[0]') == first
        assert page.locator('.plan-paper').bounding_box()['height'] > page.locator('.plan-paper').bounding_box()['width']
        stroke()
        point=page.evaluate('model.items[1].points[0]')
        assert abs(point['x']-.3) < .01 and abs(point['y']-.8) < .01
        page.get_by_role('button',name='Deshacer',exact=True).click()
        assert page.evaluate('model.items.length') == 1
        for x,y in [( .8,.7),(.7,.2),(.2,.3)]:
            page.get_by_role('button',name='Girar 90°',exact=True).click()
            zoom_out_to_draw()
            stroke();point=page.evaluate('model.items[1].points[0]')
            assert abs(point['x']-x)<.01 and abs(point['y']-y)<.01
            page.get_by_role('button',name='Deshacer',exact=True).click()
        page.get_by_role('button',name='Girar 90°',exact=True).click()
        page.get_by_role("button", name="Acercar", exact=True).click()
        assert page.evaluate("model.items[0].points[0]") == first
        page.get_by_role("button", name="Ajustar", exact=True).click()
        page.get_by_role("button", name="Página siguiente", exact=True).click()
        page.wait_for_function("document.querySelector('.plan-page-label').textContent === '2 / 2'")
        zoom_out_to_draw()
        page.get_by_role("button", name="Rectángulo", exact=True).click()
        stroke()
        page.get_by_role("button", name="Texto", exact=True).click()
        page.get_by_label("Texto o nota", exact=True).fill('<script>no ejecutar</script>')
        box = canvas.bounding_box()
        canvas.click(position={"x": box["width"]*.1, "y": box["height"]*.6})
        assert page.evaluate("model.items.length") == 3
        assert page.evaluate("model.items[2].page") == 2
        assert page.locator('main script').count() == 0
        for name in ['Resaltador', 'Flecha', 'Círculo', 'Nota']:
            page.get_by_role('button', name=name, exact=True).click()
            if name == 'Nota':
                page.get_by_label('Texto o nota', exact=True).fill('Revisar medidas')
            stroke()
        assert page.evaluate('model.items.length') == 7
        page.get_by_role('button', name='Borrador', exact=True).click()
        box = canvas.bounding_box()
        canvas.click(position={'x':box['width']*.2, 'y':box['height']*.3})
        assert page.evaluate('model.items.length') == 6
        with page.expect_download() as download:
            page.get_by_role("button", name="Exportar PDF", exact=True).click()
        content = pathlib.Path(download.value.path()).read_bytes()
        page.evaluate("window.exported=new Uint8Array("+str(list(content))+")")
        result = page.evaluate("""async()=>{
          const pdf=await pdfjsLib.getDocument({data:exported,isEvalSupported:false}).promise;
          const pages=pdf.numPages;
          const actual=await pdf.getPage(1),expected=await doc.pageSize(1);
          const viewport=actual.getViewport({scale:1});
          const second=await pdf.getPage(2),secondSize=second.getViewport({scale:1}),originalSecond=await doc.pageSize(2);
          const sameSize=viewport.width===expected.height&&viewport.height===expected.width&&secondSize.width===originalSecond.width&&secondSize.height===originalSecond.height;
          const raster=document.createElement('canvas'),v=actual.getViewport({scale:1.5});raster.width=v.width;raster.height=v.height;await actual.render({canvasContext:raster.getContext('2d'),viewport:v}).promise;
          const ink=raster.getContext('2d').getImageData(Math.round(raster.width*.7)-4,Math.round(raster.height*.2)-4,9,9).data;
          let aligned=false;for(let i=0;i<ink.length;i+=4)if(ink[i+2]>150&&ink[i]<100)aligned=true;
          await pdf.destroy();
          const unchanged=Array.from(new Uint8Array(original)).every((b,i)=>b===new Uint8Array(window.original)[i]);
          // Compare the source Blob again after editing/export.
          const current=new Uint8Array(await source.arrayBuffer());
          return {pages,sameSize,aligned,unchanged:unchanged&&current.every((b,i)=>b===new Uint8Array(original)[i])};
        }""")
        assert result == {"pages": 2, "sameSize": True, "aligned": True, "unchanged": True}
        assert page.evaluate("model.dirty") is True
        assert page.evaluate("async()=>{try{await editor.close();return false}catch{return true}}") is True
        assert not errors, errors
        if len(sys.argv) > 2 and viewport["width"] == 1280:
            page.screenshot(path=sys.argv[2], full_page=True)
        page.evaluate("editor.discard()")
        assert page.evaluate("""async()=>{
          const c=document.createElement('canvas');c.width=100;c.height=50;
          const ctx=c.getContext('2d');ctx.fillStyle='#00ff00';ctx.fillRect(0,0,100,50);
          const blob=await new Promise(r=>c.toBlob(r,'image/png'));
          const image=await ModernoPlanEditor.openFile(blob),target=document.createElement('canvas');
          await image.render(1,target);const correct=target.width===100&&target.height===50&&target.getContext('2d').getImageData(0,0,1,1).data[1]===255;await image.close();
          let errors=0;
          for(const bad of [new Blob(['<svg/>'],{type:'image/svg+xml'}),{size:51*1024*1024,type:'application/pdf'},new Blob(['invalid'],{type:'image/png'})]){
            try{await ModernoPlanEditor.openFile(bad,{pdfjs:pdfjsLib})}catch{errors++}
          }
          const stream='0 0 1 rg 20 20 100 50 re f';
          const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Count 1 /Kids [3 0 R] >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Rotate 90 /Resources << >> /Contents 4 0 R >>','<< /Length '+stream.length+' >>\\nstream\\n'+stream+'\\nendstream'];
          let pdf='%PDF-1.4\\n',offsets=[0];objects.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\\n'+obj+'\\nendobj\\n'});
          const start=pdf.length;pdf+='xref\\n0 5\\n0000000000 65535 f \\n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \\n').join('')+'trailer\\n<< /Size 5 /Root 1 0 R >>\\nstartxref\\n'+start+'\\n%%EOF';
          const rotated=await ModernoPlanEditor.openFile(new Blob([pdf],{type:'application/pdf'}),{pdfjs:pdfjsLib});const size=await rotated.pageSize(1);await rotated.render(1,target);const rotation=size.width===200&&size.height===300&&target.width===300&&target.height===450;await rotated.close();
          return correct&&errors===3&&rotation;
        }""") is True
        # Rotation/export follows the same path for an uploaded image.
        page.evaluate("""async()=>{
          const c=document.createElement('canvas');c.width=100;c.height=50;c.getContext('2d').fillRect(0,0,100,50);
          window.imageSource=await new Promise(r=>c.toBlob(r,'image/png'));window.imageOriginal=new Uint8Array(await imageSource.arrayBuffer());
          const image=await ModernoPlanEditor.openFile(imageSource);
          window.model=new ModernoPlanAnnotations.Model({reference:{studyId:'fake',projectId:'image',fileId:'image',revisionId:'original'},pages:1,authorize:()=>true});
          window.editor=await ModernoPlanEditor.mount(document.querySelector('main'),{document:image,model});
        }""")
        page.get_by_role('button',name='Girar 90°',exact=True).click()
        with page.expect_download() as download:
            page.get_by_role('button',name='Exportar PDF',exact=True).click()
        content=pathlib.Path(download.value.path()).read_bytes()
        page.evaluate('window.imagePdf=new Uint8Array('+str(list(content))+')')
        assert page.evaluate("""async()=>{
          const pdf=await pdfjsLib.getDocument({data:imagePdf,isEvalSupported:false}).promise,p=await pdf.getPage(1),v=p.getViewport({scale:1});await pdf.destroy();
          const bytes=new Uint8Array(await imageSource.arrayBuffer());return v.width===37.5&&v.height===75&&bytes.every((b,i)=>b===imageOriginal[i]);
        }""")
        page.evaluate('editor.discard()')
        print(f"PASS {viewport['width']}px: PDF 2 páginas, anotaciones, zoom, undo/redo, texto seguro, cuatro giros, PDF e imagen exportados, original intacto y cierre protegido")
        page.close()
    browser.close()
