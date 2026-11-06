"""Offline smoke test for the compact plan editor. Uses fictitious raster data only."""
import pathlib
from playwright.sync_api import sync_playwright

repo = pathlib.Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox','--disable-crash-reporter','--disable-crashpad'])
    page = browser.new_page(viewport={'width': 1280, 'height': 840})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/*',lambda route:route.fulfill(body='<main id="editor" style="height:760px"></main>',content_type='text/html'))
    page.goto('https://planos-prueba.invalid/')
    page.add_style_tag(path=str(repo/'app/plan-editor.css'))
    for name in ['plan-annotations.js', 'plan-editor.js']:
        page.add_script_tag(path=str(repo/'app'/name))
    page.evaluate("""async()=>{
      const source=document.createElement('canvas');source.width=900;source.height=600;const x=source.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,900,600);x.strokeStyle='#222';x.strokeRect(80,80,740,440);
      const blob=await new Promise(resolve=>source.toBlob(resolve,'image/png'));
      window.doc=await ModernoPlanEditor.openFile(blob);window.model=new ModernoPlanAnnotations.Model({reference:{studyId:'fake-study',projectId:'fake-project',fileId:'fake-plan',revisionId:'original'},pages:1,authorize:()=>true});
      window.editor=await ModernoPlanEditor.mount(document.querySelector('#editor'),{document:doc,model,products:[{id:'fake-product',name:'Lámpara ficticia',room:'Salón',reference:'LF-1'}]});
    }""")
    page.wait_for_function("document.querySelector('.plan-paper canvas').width>0")
    expected=['Desplazar','Selector','Flecha','Texto','Comentario','Etiqueta de producto','Borrador','Deshacer','Rehacer','Girar 90°','Página anterior','Página siguiente','Alejar','Acercar','Ajustar','Exportar PDF']
    for label in expected:
        assert page.get_by_role('button',name=label,exact=True).count()==1, label
    for removed in ['Lápiz','Resaltador','Rectángulo','Círculo','Nota','Páginas','Panel de comentarios','Añadir foto','Hacer foto']:
        assert page.get_by_role('button',name=removed,exact=True).count()==0, removed
    assert page.get_by_label('Color',exact=True).count()==1
    assert page.get_by_label('Grosor',exact=True).count()==1
    canvas=page.get_by_label('Lienzo de anotación');box=canvas.bounding_box()
    def click_at(x,y): canvas.click(position={'x':box['width']*x,'y':box['height']*y})
    page.get_by_role('button',name='Texto',exact=True).click();click_at(.25,.25)
    inline=page.get_by_label('Texto en el plano',exact=True);assert inline.is_visible();inline.fill('Texto directo seguro');inline.press('Enter');page.wait_for_function('model.items.length===1')
    assert page.evaluate("model.items[0].type==='text'&&model.items[0].text==='Texto directo seguro'")
    page.get_by_role('button',name='Comentario',exact=True).click();click_at(.45,.4)
    assert page.locator('.plan-info-panel').get_attribute('aria-hidden')=='false'
    page.get_by_placeholder('Escribe un comentario',exact=True).fill('Revisar esta cota');page.get_by_role('button',name='Añadir comentario',exact=True).click()
    assert page.evaluate("model.items[1].type==='note'&&model.items[1].text==='Revisar esta cota'")
    page.get_by_role('button',name='Etiqueta de producto',exact=True).click();click_at(.6,.55)
    page.get_by_role('option',name='Lámpara ficticia Salón · LF-1',exact=True).click()
    assert page.evaluate("model.items[2].type==='tag'&&model.items[2].product.id==='fake-product'")
    assert page.locator('#editor script').count()==0
    assert not errors, errors
    page.evaluate('editor.discard()');browser.close()
print('PASS: barra compacta, texto directo, comentario en sheet y etiqueta vinculada a producto')
