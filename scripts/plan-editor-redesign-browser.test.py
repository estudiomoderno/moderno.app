"""Offline smoke test for the compact plan editor. Uses fictitious raster data only."""
import pathlib
import xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright

repo = pathlib.Path(__file__).resolve().parents[1]
for asset in ['Desplazar.svg','Selector.svg','Flecha.svg','Texto.svg','Comentar.svg','Etiqueta.svg','Borrar.svg']:
    source=(repo/'app/brand/icons/plan-viewer/cursors'/asset).read_text()
    ET.fromstring(source)
    assert 'fill="white"' in source and 'stroke="white"' in source,asset
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
      window.editor=await ModernoPlanEditor.mount(document.querySelector('#editor'),{document:doc,model,author:{id:'user-jj',name:'Javier Jiménez',avatar:''},products:[{id:'fake-product',name:'Lámpara ficticia',room:'Salón',reference:'LF-1'}]});
    }""")
    page.wait_for_function("document.querySelector('.plan-paper canvas').width>0")
    expected=['Desplazar','Selector','Flecha','Texto','Comentario','Etiqueta de producto','Borrador','Deshacer','Rehacer','Girar 90°','Página anterior','Página siguiente','Alejar','Acercar','Ajustar','Exportar PDF']
    for label in expected:
        assert page.get_by_role('button',name=label,exact=True).count()==1, label
    for removed in ['Lápiz','Resaltador','Rectángulo','Círculo','Nota','Páginas','Panel de comentarios','Añadir foto','Hacer foto']:
        assert page.get_by_role('button',name=removed,exact=True).count()==0, removed
    assert page.get_by_role('button',name='Color',exact=True).count()==1
    canvas=page.get_by_label('Lienzo de anotación')
    cursor_icons={'Desplazar':'Desplazar.svg','Selector':'Selector.svg','Flecha':'Flecha.svg','Texto':'Texto.svg','Comentario':'Comentar.svg','Etiqueta de producto':'Etiqueta.svg','Borrador':'Borrar.svg'}
    for label,asset in cursor_icons.items():
        page.get_by_role('button',name=label,exact=True).click()
        assert asset in canvas.evaluate("el=>getComputedStyle(el).cursor"),label
    page.get_by_role('button',name='Color',exact=True).click()
    assert page.get_by_label('Color personalizado',exact=True).count()==1 and page.get_by_label('Opacidad',exact=True).count()==1
    assert page.locator('.plan-color-swatch').count()==8
    assert page.locator('[data-slot="color-picker"]').count()==1 and page.get_by_label('Saturación y brillo',exact=True).count()==1
    assert page.get_by_label('Color personalizado',exact=True).input_value()=='#6366f1'
    page.get_by_role('button',name='Color #3b82f6',exact=True).click()
    assert page.get_by_label('Color personalizado',exact=True).input_value()=='#3b82f6'
    page.get_by_label('Opacidad',exact=True).fill('50');assert page.locator('.plan-color-alpha-value').text_content()=='50%'
    color_panel=page.locator('.plan-color-panel');assert color_panel.is_visible()
    panel_box=color_panel.bounding_box();color_box=page.get_by_role('button',name='Color',exact=True).bounding_box()
    assert panel_box['y']+panel_box['height'] <= color_box['y'] and page.evaluate("getComputedStyle(document.querySelector('.plan-color-panel')).position")=='fixed'
    page.get_by_role('button',name='Color',exact=True).click()
    assert page.get_by_label('Grosor',exact=True).count()==1
    assert page.get_by_text('Grosor',exact=True).count()==0 and 60 <= page.locator('.plan-width-label').bounding_box()['width'] <= 66
    eraser=page.get_by_role('button',name='Borrador',exact=True).bounding_box();rotate=page.get_by_role('button',name='Girar 90°',exact=True).bounding_box()
    assert abs(eraser['y']-rotate['y']) < 1 and 0 < rotate['x']-eraser['x'] < 34
    box=canvas.bounding_box()
    def click_at(x,y): canvas.click(position={'x':box['width']*x,'y':box['height']*y})
    page.get_by_role('button',name='Texto',exact=True).click();click_at(.25,.25)
    inline=page.get_by_label('Texto en el plano',exact=True);assert inline.is_visible();inline.fill('Texto directo seguro');inline.press('Enter');page.wait_for_function('model.items.length===1')
    assert page.evaluate("model.items[0].type==='text'&&model.items[0].text==='Texto directo seguro'")
    page.get_by_role('button',name='Comentario',exact=True).click();click_at(.45,.4)
    assert page.locator('.plan-info-panel').get_attribute('aria-hidden')=='true' and page.get_by_label('Nuevo comentario',exact=True).is_visible()
    page.get_by_role('textbox',name='Comentario',exact=True).fill('Revisar esta cota');page.get_by_role('button',name='Comentar',exact=True).click()
    assert page.evaluate("model.items[1].type==='note'&&model.items[1].thread[0].author.name==='Javier Jiménez'&&model.items[1].text==='Revisar esta cota'")
    marker=page.get_by_role('button',name='Comentario de Javier Jiménez',exact=True);assert marker.is_visible();marker.click()
    assert page.get_by_label('Conversación del plano',exact=True).is_visible() and page.get_by_text('Revisar esta cota',exact=True).is_visible()
    page.get_by_label('Responder al comentario',exact=True).fill('De acuerdo, lo revisamos');page.get_by_role('button',name='Responder',exact=True).click()
    assert page.evaluate("model.items[1].thread.length===2&&model.items[1].thread[1].author.id==='user-jj'")
    page.get_by_label('Cerrar conversación',exact=True).click();before=page.evaluate('model.items[1].points[0]');marker=page.get_by_role('button',name='Comentario de Javier Jiménez',exact=True);m=marker.bounding_box();page.mouse.move(m['x']+m['width']/2,m['y']+m['height']/2);page.mouse.down();page.mouse.move(m['x']+90,m['y']+55,steps=5);page.mouse.up();after=page.evaluate('model.items[1].points[0]');assert abs(after['x']-before['x'])>.03 and abs(after['y']-before['y'])>.03
    page.get_by_role('button',name='Etiqueta de producto',exact=True).click();click_at(.6,.55)
    page.get_by_role('option',name='Lámpara ficticia Salón · LF-1',exact=True).click()
    assert page.evaluate("model.items[2].type==='tag'&&model.items[2].product.id==='fake-product'")
    assert page.evaluate("editor.snapshot().annotations.length===1&&editor.snapshot().annotations[0].type==='note'&&editor.snapshot().annotations[0].thread.length===2")
    assert page.locator('#editor script').count()==0
    assert not errors, errors
    assert page.evaluate("()=>{window.exitPromise=editor.discard();return document.querySelector('.plan-viewer-bar')?.classList.contains('is-leaving')}")
    assert page.locator('body').evaluate("el=>!el.classList.contains('plan-editor-active')")
    page.evaluate('exitPromise');browser.close()
print('PASS: dock animado, color con opacidad, texto, comentario y etiqueta vinculada')
