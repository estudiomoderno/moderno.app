"""Offline client-project editor regression with fictitious records and mocked saves.
Run: python scripts/client-portal-editor-browser.test.py [screenshot-directory]
No SDK, app server, production data or external network.
"""
from pathlib import Path
import re
import sys
from playwright.sync_api import sync_playwright
repo=Path(__file__).resolve().parents[1];html=(repo/'app/index.html').read_text()
style=html[html.index('<style>')+7:html.index('</style>')]
start=html.index('(function(){',html.index('${tb!=="cliente"'))
end=html.index('})()}',start)+len('})()');portal=html[start:end]
start=html.rfind('<div style="max-width:820px">',0,html.index('${ModernoProjectDocuments.heading()}'));end=html.index('  </div>`}',start)+len('  </div>');files=html[start:end]
toggle=html[html.index('function fileCliToggle(pid,i)'):html.index('async function fileView(pid,i,fromPortal)')]
fixture='''window.state={view:'client',projects:[{id:1,name:'Proyecto ficticio',num:'PR-1',notes:'Notas conservadas',cliShare:{money:false,token:'fake'},rooms:[{id:'salon',name:'Salón',cliMode:'ver',sections:[{items:[{name:'Sofá',img:'fake'}]}]},{id:'cocina',name:'Cocina',cliMode:'off',sections:[]}],files:[{name:'Portada.png',type:'image/png',docKind:'portal-cover',data:'fake',cli:true},{name:'Enlace',docKind:'portal-link',url:'https://fake.invalid/link',cli:true},{name:'Plano.pdf',type:'application/pdf',data:'fake',cli:false},{name:'Acta.txt',body:'Texto ficticio',cli:true},'Histórico.pdf'],chat:[{txt:'Conversación conservada'}],cliMsgs:[{t:'Respuesta conservada'}],cliChat:[]}]};window.saved=0;window.flushed=0;
window.persistSoon=()=>saved++;window.cloudFlush=()=>flushed++;window.toast=()=>{};window.ico=()=>'';window.rico=()=>'';window.fileImageAttrs=()=>'';window.cliEnsure=p=>p.cliShare;window.cliLink=()=> 'https://fake.invalid/portal';window.cliQR=()=>'';window.cliWelcomeDefault=()=> 'Bienvenido';window.cliRespSync=()=>{};window.cliModeOf=r=>r.cliMode||'ver';window.fileOk=f=>!!(typeof f==='object'&&(f.data||f.url||f.body||f.docRef));window.fileCli=f=>typeof f==='string'||f.cli!==false;
window.modal=s=>{const m=document.querySelector('#modal');m.innerHTML=s;m.hidden=false};window.closeModal=()=>{document.querySelector('#modal').hidden=true};window.fileView=(p,i)=>{window.openedFile=[p,i]};window.fname=f=>typeof f==='string'?f:f.name;
window.render=function(){const p=state.projects[0];document.querySelector('#view').innerHTML=state.view==='files'?FILES:PORTAL;};
'''.replace('FILES','`'+files+'`').replace('PORTAL',portal)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in [1280,390]:
        page=browser.new_page(viewport={'width':width,'height':1000});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/*',lambda r:r.abort())
        page.set_content('<meta name="viewport" content="width=device-width"><style>'+style+'</style><main id="view" style="margin:auto;padding:18px"></main><div id="modal" hidden style="position:fixed;inset:8%;overflow:auto;background:#f8f6ef;border:1px solid #ddd;border-radius:20px;padding:24px;z-index:100"></div>')
        for name in ['client-portal-site.css','plan-editor.css','brand/project-options.css','select-controls.css']:page.add_style_tag(path=str(repo/'app'/name))
        page.add_script_tag(content=fixture);page.add_script_tag(content=toggle)
        for name in ['project-documents.js','client-portal-site.js']:page.add_script_tag(path=str(repo/'app'/name))
        page.evaluate("""()=>{const c=document.createElement('canvas');c.width=600;c.height=400;const ctx=c.getContext('2d');ctx.fillStyle='#dfd9cb';ctx.fillRect(0,0,600,400);ctx.fillStyle='#f8f6ef';ctx.fillRect(40,40,240,280);ctx.fillStyle='#aebcb2';ctx.fillRect(320,80,240,240);const image=c.toDataURL('image/png');window.fileImageAttrs=()=> 'src="'+image+'"';window.ModernoDaily={escape:s=>String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;')};window.original=JSON.stringify(state.projects[0]);render();}""")
        text=page.locator('#view').inner_text()
        for removed in ['El cliente nunca ve costes internos','Una imagen para recibir','Aparecerán en Documentos','Respuestas del cliente','Conversación del equipo','Conversación con el cliente','Por cada lista']:
            assert removed not in text
        assert page.locator('.client-room-sharing .dl-card').count()==2
        assert page.locator('.client-room-sharing .dl-mosaic').count()==2
        assert page.locator('.client-room-sharing .client-room-modes button').count()==8
        assert page.locator('.client-shared-documents .project-file-card').count()==3
        assert page.evaluate('JSON.stringify(state.projects[0])===original')
        page.locator('[data-client-welcome]').get_by_role('button',name='Editar',exact=True).click()
        assert page.locator('#cliWelTa').evaluate('(e)=>e===document.activeElement')
        assert page.locator('[data-client-welcome]').evaluate('(e)=>e.getAnimations().some(a=>a.effect.getTiming().duration===220)')
        page.locator('#cliWelTa').fill('Borrador ficticio')
        page.get_by_role('button',name='Cancelar',exact=True).click()
        assert page.locator('#cliWelTa').count()==0
        assert page.evaluate('JSON.stringify(state.projects[0])===original')
        page.emulate_media(reduced_motion='reduce')
        page.locator('[data-client-welcome]').get_by_role('button',name='Editar',exact=True).click()
        assert page.locator('[data-client-welcome]').evaluate('(e)=>e.getAnimations().length')==0
        page.get_by_role('button',name='Cancelar',exact=True).click()
        page.emulate_media(reduced_motion='no-preference')
        assert page.get_by_role('checkbox',name='Compartir Histórico.pdf',exact=True).is_disabled()
        assert not page.get_by_role('checkbox',name='Compartir Plano.pdf',exact=True).is_checked()
        assert page.get_by_role('checkbox',name='Compartir Acta.txt',exact=True).is_checked()
        assert page.get_by_role('checkbox',name='Compartir Portada.png',exact=True).count()==0
        assert page.get_by_role('checkbox',name='Compartir Enlace',exact=True).count()==0
        geometry=page.evaluate("()=>{const root=document.querySelector('.client-project-editor').getBoundingClientRect(),img=document.querySelector('.client-cover-editor>img').getBoundingClientRect();return {root:root.width,img:img.width,ratio:img.width/img.height,overflow:document.documentElement.scrollWidth>innerWidth,first:document.querySelector('.client-project-editor>h2').nextElementSibling.className}}")
        assert geometry['root']>width-60,geometry
        assert abs(geometry['root']-geometry['img'])<2,geometry
        assert abs(geometry['ratio']-(3 if width>600 else 2))<.05,geometry
        assert not geometry['overflow'],geometry
        assert geometry['first']=='client-cover-editor',geometry
        assert page.locator('.client-room-modes:visible').count()==0
        assert page.locator('.client-room-menu>summary').first.evaluate("e=>getComputedStyle(e,'::after').display")=='none'
        assert page.locator('.client-cover-adjust, [data-cover-x], [data-cover-y]').count()==0
        page.get_by_role('checkbox',name='Compartir Plano.pdf',exact=True).check()
        assert page.evaluate('state.projects[0].files[2].cli')
        assert page.evaluate('state.projects[0].files[0].cli&&state.projects[0].files[1].cli&&state.projects[0].files[3].cli')
        page.get_by_role('checkbox',name='Compartir Acta.txt',exact=True).uncheck()
        assert page.evaluate('!state.projects[0].files[3].cli&&state.projects[0].files[2].cli&&state.projects[0].files[0].cli&&state.projects[0].files[1].cli')
        assert page.locator('.client-shared-documents .project-file-card').count()==3
        page.get_by_role('button',name='Abrir Plano.pdf',exact=True).click()
        assert page.evaluate('openedFile')==[1,2]
        room=page.locator('.client-room-sharing .dl-card').nth(0)
        room.locator('details').evaluate("e=>{e.style.position='fixed';e.style.bottom='25px';e.style.right='16px'}")
        room.locator('summary').click()
        page.wait_for_function("document.querySelector('.client-room-menu').dataset.direction==='up'")
        if len(sys.argv)>1:page.screenshot(path=str(Path(sys.argv[1])/f'client-menu-up-{width}.png'))
        box=room.locator('.client-room-modes').bounding_box();trigger=room.locator('summary').bounding_box()
        assert box['y']>=8 and box['y']+box['height']<=trigger['y'],(box,trigger)
        assert box['x']>=8 and box['x']+box['width']<=width-8,(box,width)
        room.locator('details').evaluate("e=>{e.style.top='60px';e.style.bottom='auto';document.dispatchEvent(new Event('scroll'))}")
        page.wait_for_function("document.querySelector('.client-room-menu').dataset.direction==='down'")
        box=room.locator('.client-room-modes').bounding_box();trigger=room.locator('summary').bounding_box()
        assert box['y']>=trigger['y']+trigger['height'],(box,trigger)
        page.set_viewport_size({'width':width,'height':700})
        page.wait_for_timeout(50)
        box=room.locator('.client-room-modes').bounding_box()
        assert box['y']+box['height']<=692,box
        page.set_viewport_size({'width':width,'height':1000})
        page.get_by_role('heading',name='Documentos compartidos',exact=True).click()
        assert page.locator('.client-room-modes:visible').count()==0
        room.locator('summary').click()
        assert room.get_by_role('button',name='Solo ver',exact=True).get_attribute('aria-pressed')=='true'
        page.locator('.client-room-sharing .dl-card').nth(1).locator('summary').click()
        assert not room.locator('details').evaluate('(e)=>e.open')
        room.locator('summary').click()
        room.locator('summary').press('Escape')
        assert page.locator('.client-room-modes:visible').count()==0
        room.locator('summary').click()
        room.get_by_role('button',name='Puede comentar',exact=True).click()
        assert page.locator('.client-room-modes:visible').count()==0
        assert page.evaluate("state.projects[0].rooms[0].cliMode==='coment'&&state.projects[0].rooms[1].cliMode==='off'")
        assert page.evaluate("state.projects[0].notes==='Notas conservadas'&&state.projects[0].chat[0].txt==='Conversación conservada'&&state.projects[0].cliMsgs[0].t==='Respuesta conservada'")
        if len(sys.argv)>1:page.screenshot(path=str(Path(sys.argv[1])/f'client-editor-{width}.png'),full_page=True)
        page.evaluate("state.view='files';render()")
        assert page.get_by_role('heading',name='Notas del proyecto',exact=True).count()==0
        assert page.locator('#view textarea').count()==0
        assert page.evaluate("state.projects[0].notes==='Notas conservadas'")
        assert not errors,errors
        print(width,'PASS: textos y bloques retirados, tarjetas de estancias, selección directa de archivos, portada panorámica a todo el ancho y menú de listas, índices y flags correctos, datos históricos conservados')
        page.close()
    browser.close()
