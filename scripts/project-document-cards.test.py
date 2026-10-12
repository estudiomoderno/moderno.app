"""Offline cards + main documents navigation regression, synthetic records only.
Run: python scripts/project-document-cards.test.py [screenshot-directory]
"""
from pathlib import Path
import re
import sys
from playwright.sync_api import sync_playwright
repo=Path(__file__).resolve().parents[1]
html=(repo/'app/index.html').read_text()
style=html[html.index('<style>')+7:html.index('</style>')]
start=html.rfind('<div style="max-width:820px">',0,html.index('${ModernoProjectDocuments.heading()}'))
end=html.index('  </div>`}',start)+len('  </div>')
project_html=html[start:end]
nav=re.search(r'<button class="nav-item" data-view="plantillas".*?</button>',html).group()
view=re.search(r'function vDocs\(\).*?;}',html).group()
fixture='''window.state={view:'proyecto',sessionUser:{id:'fake-user'},brandFilter:'all',docs:[],projects:[{id:1,num:'PR-1',name:'Proyecto ficticio',notes:'Notas originales <literal>',files:[{name:'Plano ficticio.pdf',type:'application/pdf',data:'fake',cli:false},{name:'Notas previas.txt',body:'Original',signed:{by:'Persona ficticia'}},'Histórico.pdf']}]};window.ESTUDIO_ID='fake-study';window._accessRole='admin';window.wsOrder=['cm'];window.calls=[];
window.fname=f=>typeof f==='string'?f:f.name;window.fileOk=f=>!!(typeof f==='object'&&(f.data||f.url||f.body||f.docRef));window.fileCli=f=>typeof f==='string'||f.cli!==false;window.ico=()=>'';
window.fileView=(id,index)=>calls.push(['open',id,index]);window.trashFile=(id,index)=>calls.push(['delete',id,index]);window.byBrand=x=>x;window.render=function(){const p=state.projects[0];document.querySelector('#view').innerHTML=state.view==='plantillas'?vDocs():PROJECT_HTML;};window.go=v=>{state.view=v;render()};
'''.replace('PROJECT_HTML','`'+project_html+'`')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in [1280,390]:
        page=browser.new_page(viewport={'width':width,'height':900})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.route('**/*',lambda r:r.abort())
        page.set_content('<meta name="viewport" content="width=device-width"><style>'+style+'</style><header>'+nav+'</header><main id="view" style="max-width:900px;margin:24px auto;padding:12px"></main>')
        page.add_style_tag(path=str(repo/'app/plan-editor.css'))
        page.add_script_tag(content=fixture)
        for name in ['project-documents.js','document-builder.js']:
            page.add_script_tag(path=str(repo/'app'/name))
        page.add_script_tag(content=view)
        page.evaluate("()=>{window.ModernoDaily={escape:ModernoDocuments.E};window.projectPlanOpen=(id,index)=>calls.push(['annotate',id,index]);document.querySelector('[data-view=plantillas]').onclick=()=>go('plantillas');window.original=JSON.stringify(state.projects);render();}")
        assert page.locator('.project-file-card').count()==3
        assert page.get_by_role('heading',name='Planos y Archivos',exact=True).count()==1
        assert page.get_by_role('heading',name='Notas del proyecto',exact=True).count()==0
        assert page.evaluate('state.projects[0].notes')=='Notas originales <literal>'
        first=page.locator('.project-file-card').nth(0).bounding_box();second=page.locator('.project-file-card').nth(1).bounding_box()
        assert abs(first['y']-second['y'])<1 and first['x']!=second['x']
        page.get_by_role('button',name='Abrir Plano ficticio.pdf',exact=True).click()
        page.get_by_role('button',name='Ver y anotar',exact=True).click()
        page.get_by_role('button',name='Eliminar archivo Notas previas.txt',exact=True).click()
        assert page.evaluate('calls')==[['open',1,0],['annotate',1,0],['delete',1,1]]
        assert page.evaluate('JSON.stringify(state.projects)===original')
        if len(sys.argv)>1:page.screenshot(path=str(Path(sys.argv[1])/f'cards-{width}.png'),full_page=True)
        page.locator('[data-view=plantillas]').click()
        assert page.evaluate('state.view')=='plantillas'
        assert page.get_by_role('heading',name='Plantillas y documentos',exact=True).count()==1
        assert page.get_by_role('button',name='Generador de documentos',exact=True).count()==1
        page.get_by_role('button',name='Mis plantillas',exact=True).click()
        assert page.get_by_role('button',name='Mis plantillas',exact=True).get_attribute('aria-pressed')=='true'
        page.get_by_role('button',name='Mis documentos',exact=True).click()
        assert page.get_by_text('Todavía no hay documentos guardados.',exact=True).count()==1
        assert page.evaluate('JSON.stringify(state.projects)===original')
        assert not errors,errors
        print(width,'PASS: tarjetas, índices/acciones, notas, menú principal, generador/plantillas/documentos y original intacto')
        page.close()
    browser.close()
