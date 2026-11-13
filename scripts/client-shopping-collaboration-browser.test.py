"""Visual regression for client shopping collaboration with fictitious data only.
Run: python scripts/client-shopping-collaboration-browser.test.py [screenshot-directory]
"""
from pathlib import Path
import re
import sys
from playwright.sync_api import sync_playwright

repo=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]) if len(sys.argv)>1 else None
if output: output.mkdir(parents=True,exist_ok=True)
base=(repo/'app/index.html').read_text(encoding='utf-8')
base_style='\n'.join(re.findall(r'<style[^>]*>(.*?)</style>',base,flags=re.S))
project_js=(repo/'app/project-ui.js').read_text(encoding='utf-8')

with sync_playwright() as playwright:
    browser=playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1280,'height':1000},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content('<meta name="viewport" content="width=device-width"><style>'+base_style+'</style><main id="view"></main><div class="overlay" id="overlay"><div class="modal" id="modalBox"></div></div>')
    page.add_style_tag(path=str(repo/'app/brand/project-ui.css'))
    page.add_style_tag(path=str(repo/'app/client-portal-site.css'))
    page.add_script_tag(content="""
      window.ModernoDaily={escape:value=>String(value??'').replace(/[&<>\"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[char]))};
      window.state={projects:[{id:101,name:'Proyecto ficticio',num:'PR-TEST',clientShoppingCollaboration:true,rooms:[]}],account:{currency:'EUR'},portalAnon:''};
      window.CURR={EUR:{s:'€'}};window._accessLoading=false;window.myAccessLevel=()=> 'owner';window.canView=()=>true;
      if(!window.crypto.randomUUID)Object.defineProperty(window.crypto,'randomUUID',{value:()=> '00000000-0000-4000-8000-000000000001'});
      window.persistSoon=()=>{};window.cloudFlush=()=>{};window.render=()=>{};window.toast=()=>{};window.newRoom=()=>{};window.shoppingListExport=()=>{};window.exportListsModal=()=>{};
    """)
    page.add_script_tag(content=project_js)
    page.evaluate("""()=>{document.querySelector('#view').innerHTML='<section class="shopping-list-overview" style="max-width:980px;margin:80px auto;padding:28px;border:1px solid #ddd;border-radius:18px;background:#fff"><div class="shopping-list-header"><h2 class="sec" style="margin:0">Listas de compra</h2>'+shoppingListActions(101)+'</div><p style="color:#777;margin:28px 0 0">La colaboración está activada para las listas compartidas de este proyecto.</p></section>'}""")
    collab=page.locator('[data-shopping-action=collaborate]')
    assert collab.count()==1 and collab.get_attribute('aria-pressed')=='true'
    assert collab.get_attribute('aria-label')=='Desactivar colaboración con cliente'
    if output: page.screenshot(path=str(output/'designer-collaboration-button.png'))

    page.evaluate("""()=>{
      document.querySelector('#view').innerHTML='<div id="portal"></div>';
      state={portalAnon:'token-ficticio',projects:[{id:101,name:'Proyecto ficticio',num:'PR-TEST',clientShoppingCollaboration:true,rooms:[{id:'salon',name:'Salón comedor',cliMode:'ver',sections:[{name:'General',items:[{name:'Sofá existente',price:1200,qty:1,unit:'ud'}]},{name:'Iluminación',items:[]}]}]}]};
      window.cliModeOf=room=>room.cliMode;window.fmt=value=>Number(value).toLocaleString('es-ES',{style:'currency',currency:'EUR'});window.fileImageAttrs=()=>'';
      window.modal=html=>{const overlay=document.querySelector('#overlay');document.querySelector('#modalBox').innerHTML=html;overlay.classList.add('open')};
      window.closeModal=()=>document.querySelector('#overlay').classList.remove('open');
      window.sb={rpc:async(name,args)=>{window.lastRpc={name,args};return {data:{created:true},error:null}}};window.portalAnonBoot=()=>{};
    }""")
    page.add_script_tag(path=str(repo/'app/client-portal-site.js'))
    page.evaluate("document.querySelector('#portal').innerHTML=ClientPortalSite.shoppingHTML(state.projects[0])")
    assert page.get_by_role('button',name='Añadir producto').count()==1
    assert page.get_by_role('button',name='Editar').count()==0
    assert page.get_by_role('button',name='Eliminar').count()==0
    page.get_by_role('button',name='Añadir producto').click()
    assert page.get_by_role('heading',name='Añadir producto').count()==1,(errors,page.locator('#modalBox').inner_text(),page.locator('#overlay').get_attribute('class'))
    assert page.locator('.client-product-form [name=cost],.client-product-form [name=margin]').count()==0
    page.locator('[name=name]').fill('Lámpara propuesta por el cliente')
    page.locator('[name=url]').fill('https://example.invalid/lampara')
    page.locator('[name=price]').fill('149.90')
    if output: page.screenshot(path=str(output/'client-add-product-form.png'))
    page.locator('.client-product-form').evaluate("form=>form.requestSubmit()")
    page.wait_for_function("window.lastRpc?.name==='portal_cliente_producto_anadir'")
    sent=page.evaluate('lastRpc.args.p_producto')
    assert sent['name']=='Lámpara propuesta por el cliente' and sent['price']==149.9
    assert 'cost' not in sent and 'margin' not in sent
    assert not errors,errors
    print('PASS: botón del estudio, estado activo, alta directa del portal y payload sin campos internos')
    browser.close()
