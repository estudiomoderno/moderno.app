"""Browser regression for pending-plan navigation and reopening. Uses fictitious local data only."""
import pathlib
from playwright.sync_api import sync_playwright

repo = pathlib.Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox','--disable-crash-reporter','--disable-crashpad'])
    page = browser.new_page(viewport={'width': 1360, 'height': 900})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/*', lambda route: route.fulfill(body='<main><nav class="project-tabs project-dock"></nav><section id="project-tab-panel" style="height:760px"></section></main>', content_type='text/html'))
    page.goto('https://plan-navigation-prueba.invalid/')
    page.add_style_tag(path=str(repo/'app/plan-editor.css'))
    for name in ['plan-annotations.js', 'plan-editor.js', 'project-documents.js']:
        page.add_script_tag(path=str(repo/'app'/name))
    page.evaluate("""async()=>{
      const source=document.createElement('canvas');source.width=900;source.height=600;const ctx=source.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,900,600);ctx.strokeStyle='#242424';ctx.strokeRect(80,80,740,440);
      const data=source.toDataURL('image/png');
      window.state={projects:[{id:1,files:[{id:'fake-plan',name:'Plano ficticio.png',type:'image/png',cat:'plano',data}],rooms:[]}],sessionUser:{id:'fake-user'},portalAnon:false};
      window._accessLoading=false;window._accessRole='admin';window.ESTUDIO_ID='fake-study';
      window.fileViewIdentity=()=>[ESTUDIO_ID,state.sessionUser.id,_accessRole].join('|');window.fileSrc=file=>file.data;window.fileResolveForView=async file=>file.data;
      window.fileUp=async()=> 'data:application/pdf;base64,JVBERi0xLjQK';window.persistSoon=()=>{window.persisted=true};window.render=()=>{};window.toast=message=>{window.lastToast=message};window.hoyEs=()=> '2026-11-06';window.trashFile=()=>{};window.ModernoDaily={escape:value=>String(value)};
      window.navigated=false;projectPlanOpen(1,0,'files');
    }""")
    page.wait_for_selector('.plan-paper canvas')
    page.wait_for_function("document.querySelector('.plan-paper canvas').width>0")

    def add_text(value):
        page.get_by_role('button', name='Texto', exact=True).click()
        canvas=page.get_by_label('Lienzo de anotación');box=canvas.bounding_box();canvas.click(position={'x':box['width']*.3,'y':box['height']*.3})
        editor=page.get_by_label('Texto en el plano', exact=True);editor.fill(value);editor.press('Enter')

    add_text('Cambio pendiente')
    page.evaluate("projectPlanDialog.navigate(()=>window.navigated=true)")
    alert=page.get_by_role('alertdialog', name='¿Guardar los cambios del plano?')
    assert alert.is_visible() and not page.evaluate('window.navigated')
    alert_box=alert.bounding_box();assert abs((alert_box['x']+alert_box['width']/2)-680)<2 and abs((alert_box['y']+alert_box['height']/2)-450)<2
    assert alert.locator('[data-slot="alert-dialog-media"]').count()==1 and alert.locator('[data-slot="alert-dialog-footer"]').count()==1
    page.get_by_role('button', name='Seguir editando', exact=True).click()
    assert page.locator('.project-plan-dialog').count()==1 and page.locator('.project-plan-exit-alert').count()==0

    page.evaluate("projectPlanDialog.navigate(()=>window.navigated=true)")
    page.get_by_role('button', name='Salir sin guardar', exact=True).click()
    page.wait_for_function('window.navigated===true && document.querySelector(".project-plan-dialog")===null')
    page.evaluate("window.navigated=false;projectPlanOpen(1,0,'files')")
    page.wait_for_selector('.plan-paper canvas')
    page.wait_for_function("document.querySelector('.plan-paper canvas').width>0")
    assert page.get_by_role('button', name='Guardar', exact=True).evaluate("el=>getComputedStyle(el).backgroundColor")=='rgb(6, 102, 255)'
    assert page.get_by_role('button', name='Guardar como copia', exact=True).evaluate("el=>getComputedStyle(el).borderRadius")=='8px'
    header_buttons=page.locator('.plan-dialog-actions>button');assert header_buttons.count()==5
    boxes=[button.bounding_box() for button in header_buttons.all()];assert len({round(box['y']+box['height']/2) for box in boxes})==1
    assert page.get_by_role('button', name='Eliminar', exact=True).inner_text()=='Eliminar' and page.get_by_role('button', name='Editar', exact=True).inner_text()=='Editar'
    assert page.get_by_role('button', name='Eliminar', exact=True).locator('svg').count()==1 and page.get_by_role('button', name='Editar', exact=True).locator('svg').count()==1
    assert page.get_by_role('button', name='Guardar como copia', exact=True).inner_text()=='' and page.get_by_role('button', name='Cerrar', exact=True).inner_text()==''
    page.get_by_role('button', name='Eliminar', exact=True).click();delete_alert=page.get_by_role('alertdialog', name='¿Eliminar plano?');assert delete_alert.is_visible()
    assert delete_alert.locator('[data-slot="alert-dialog-media"]').count()==1 and delete_alert.locator('[data-slot="alert-dialog-footer"]').count()==1
    delete_alert.get_by_role('button', name='Cancelar', exact=True).click()

    add_text('Guardar antes de salir')
    page.evaluate("projectPlanDialog.navigate(()=>window.navigated=true)")
    page.get_by_role('button', name='Guardar y salir', exact=True).click()
    page.wait_for_function('window.navigated===true && window.persisted===true')
    assert page.evaluate("state.projects[0].files[0].type==='application/pdf'")
    assert not errors, errors
    browser.close()
print('PASS: aviso de salida, guardado y reapertura del plano')
