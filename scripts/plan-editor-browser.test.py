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
    for viewport in [{"width": 1280, "height": 900}, {"width": 390, "height": 844}]:
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
        def stroke():
            box = canvas.bounding_box()
            page.mouse.move(box["x"]+box["width"]*.2, box["y"]+box["height"]*.3)
            page.mouse.down()
            page.mouse.move(box["x"]+box["width"]*.4, box["y"]+box["height"]*.4, steps=5)
            page.mouse.up()
        stroke()
        assert page.evaluate("model.items.length") == 1
        first = page.evaluate("model.items[0].points[0]")
        assert abs(first["x"]-.2) < .01 and abs(first["y"]-.3) < .01
        page.get_by_role("button", name="Deshacer", exact=True).click()
        assert page.evaluate("model.items.length") == 0
        page.get_by_role("button", name="Rehacer", exact=True).click()
        page.get_by_role("button", name="Acercar", exact=True).click()
        assert page.evaluate("model.items[0].points[0]") == first
        page.get_by_role("button", name="Ajustar", exact=True).click()
        page.get_by_role("button", name="Página siguiente", exact=True).click()
        page.wait_for_function("document.querySelector('.plan-navigation span').textContent === '2 / 2'")
        page.get_by_role("button", name="Rectángulo", exact=True).click()
        stroke()
        page.get_by_role("button", name="Texto", exact=True).click()
        page.get_by_label("Texto o nota", exact=True).fill('<script>no ejecutar</script>')
        box = canvas.bounding_box()
        canvas.click(position={"x": box["width"]*.1, "y": 80})
        assert page.evaluate("model.items.length") == 3
        assert page.evaluate("model.items[2].page") == 2
        assert page.locator('main script').count() == 0
        with page.expect_download() as download:
            page.get_by_role("button", name="Exportar PDF", exact=True).click()
        content = pathlib.Path(download.value.path()).read_bytes()
        page.evaluate("window.exported=new Uint8Array("+str(list(content))+")")
        result = page.evaluate("""async()=>{
          const pdf=await pdfjsLib.getDocument({data:exported,isEvalSupported:false}).promise;
          const pages=pdf.numPages;await pdf.destroy();
          const unchanged=Array.from(new Uint8Array(original)).every((b,i)=>b===new Uint8Array(window.original)[i]);
          // Compare the source Blob again after editing/export.
          const current=new Uint8Array(await source.arrayBuffer());
          return {pages,unchanged:unchanged&&current.every((b,i)=>b===new Uint8Array(original)[i])};
        }""")
        assert result == {"pages": 2, "unchanged": True}
        assert page.evaluate("model.dirty") is True
        assert page.evaluate("async()=>{try{await editor.close();return false}catch{return true}}") is True
        assert not errors, errors
        if len(sys.argv) > 2 and viewport["width"] == 1280:
            page.screenshot(path=sys.argv[2], full_page=True)
        page.evaluate("editor.discard()")
        print(f"PASS {viewport['width']}px: PDF 2 páginas, anotaciones, zoom, undo/redo, texto seguro, exportación, original intacto y cierre protegido")
        page.close()
    browser.close()
