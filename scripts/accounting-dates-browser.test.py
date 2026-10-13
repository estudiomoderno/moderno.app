"""Accounting dates and export UI, offline with synthetic entries only."""
from pathlib import Path
import re,sys
from playwright.sync_api import sync_playwright
repo=Path(__file__).resolve().parents[1];source=(repo/'app/index.html').read_text();style=source[source.index('<style>')+7:source.index('</style>')]
def function(name):
    start=re.search(r'^(?:async )?function '+name+r'\(',source,re.M).start();end=re.search(r'^(?:async )?function ',source[start+1:],re.M)
    return source[start:start+1+end.start()]
fixture="""window.state={account:{name:'Estudio ficticio'},emitter:{},period:{mode:'todo',year:2026,month:10,quarter:4},entries:['31/12/2024','1/1/2025','6/2/2027','7/2/2027'].flatMap((date,n)=>['in','out'].map(kind=>({id:n*2+(kind==='in'?1:2),kind,date,concept:kind+'-registro-'+n,brand:'fake',status:'cobr',amount:10}))),brandFilter:'all',projects:[],invoices:[],accF:{},accQ:{},accTab:'in'};window.BRAND={fake:{name:'Estudio ficticio',chip:'cm'}};window.wsOrder=['fake'];window.MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];window.ST_LABEL={pend:'Pendiente',env:'Enviada',cobr:'Cobrado'};window.byBrand=x=>x;window.fmt=String;window.meName=()=> 'Ficticio';window.planMigrateBanner=()=>'';window.ico=()=>'';window.rowDropAttr=()=>'';window.cobrado=()=>0;window.daysLate=()=>0;window.pdfBrandLogo=()=>'';window.pdfFoot=()=>'';window.legacyDocumentLogo=()=>'';window.hoyEs=()=> '13/10/2026';window.toast=t=>window.lastToast=t;window.render=()=>{document.querySelector('#view').innerHTML=vAccounting()};window.closeModal=()=>{document.querySelector('#modalBox').innerHTML=''};window.modal=s=>document.querySelector('#modalBox').innerHTML=s;window.prints=[];window.printAs=async title=>prints.push({title,html:document.querySelector('#printZone').innerHTML});window.isoToEs=s=>s.split('-').reverse().join('/');window.V=document.querySelector('#view');HTMLAnchorElement.prototype.click=function(){window.csv=decodeURIComponent(this.href)};
"""
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in [1280,390]:
        page=browser.new_page(viewport={'width':width,'height':1000},locale='es-ES');errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/*',lambda r:r.fulfill(path=str(repo/'app/select-arrow.svg'),content_type='image/svg+xml') if r.request.url.split('?')[0]=='https://fixture.invalid/select-arrow.svg' else r.abort())
        page.set_content('<base href="https://fixture.invalid/"><meta name="viewport" content="width=device-width"><style>'+style+'</style><main class="main"><section id="view" data-page="contabilidad"></section></main><div id="modalBox"></div><div id="printZone" style="display:none"></div>')
        for path in re.findall(r'<link[^>]+href="(/[^"?]+\.css)',source):
            f=repo/'app'/path.lstrip('/')
            if f.exists():page.add_style_tag(path=str(f))
        page.add_script_tag(content=fixture)
        for name in ['vAccounting','accountingISODate','applyAccountingDates','clearAccountingDates','inPeriod','accVisible','periodoLabel','exportAccountingPDF','exportCSV','stSelect','toggleAccountingDates','accountingExport','exportPeriodInvoices']:page.add_script_tag(content=function(name))
        page.add_script_tag(path=str(repo/'app/workflow-polish.js'));page.evaluate('window.original=JSON.stringify(state.entries);render()')
        assert page.get_by_role('button',name='Resumen fiscal',exact=True).count()==0
        assert page.get_by_role('button',name='Recurrentes',exact=True).count()==0
        assert not page.locator('#account-date-filter').is_visible()
        page.get_by_role('button',name='Filtrar por fechas',exact=True).click()
        assert page.get_by_role('button',name='Filtrar por fechas',exact=True).get_attribute('aria-expanded')=='true'
        assert page.get_by_role('button',name='Restablecer',exact=True).get_attribute('title')=='Restablecer'
        assert page.locator('.account-date-label').count()==0
        assert page.locator('.icon-tabler-filter-plus,.icon-tabler-restore').count()==2
        page.get_by_label('Desde',exact=True).fill('2025-01-01');page.get_by_label('Hasta',exact=True).fill('2027-02-06');page.get_by_role('button',name='Aplicar fechas',exact=True).click()
        assert page.locator('.acc-row').count()==2
        rows=page.locator('.acc-row').all_inner_texts();assert any('in-registro-1' in s for s in rows) and any('in-registro-2' in s for s in rows)
        page.get_by_role('button',name='Filtrar por fechas',exact=True).click();assert not page.locator('#account-date-filter').is_visible();assert page.evaluate('state.period.mode')=='rango'
        page.get_by_role('button',name='Filtrar por fechas',exact=True).click()
        page.get_by_role('button',name='Gastos',exact=True).click();assert page.locator('.acc-row').count()==2
        rows=page.locator('.acc-row').all_inner_texts();assert any('out-registro-1' in s for s in rows) and any('out-registro-2' in s for s in rows)
        page.wait_for_function("!document.querySelector('#view').getAnimations().some(a=>a.playState==='running')")
        if len(sys.argv)>1:page.screenshot(path=str(Path(sys.argv[1])/f'accounting-dates-{width}.png'),full_page=True)
        page.get_by_role('button',name='Exportar',exact=True).click()
        dialog=page.locator('#modalBox')
        assert dialog.get_by_role('combobox',name='Periodo para exportar',exact=True).input_value()=='rango'
        assert dialog.get_by_role('combobox',name='Movimientos para exportar',exact=True).input_value()=='out'
        dialog.get_by_role('button',name='CSV',exact=True).click();csv=page.evaluate('csv')
        assert 'out-registro-1' in csv and 'out-registro-2' in csv and 'in-registro' not in csv and 'registro-0' not in csv and 'registro-3' not in csv
        dialog.get_by_role('combobox',name='Movimientos para exportar',exact=True).select_option('in')
        dialog.get_by_role('button',name='CSV',exact=True).click();csv=page.evaluate('csv')
        assert 'in-registro-1' in csv and 'out-registro' not in csv
        dialog.get_by_role('button',name='Exportar PDF',exact=True).click();page.wait_for_function('prints.length===1');assert 'in-registro-1' in page.evaluate('prints[0].html');assert 'out-registro' not in page.evaluate('prints[0].html')
        page.get_by_role('button',name='Exportar',exact=True).click();dialog.get_by_role('combobox',name='Movimientos para exportar',exact=True).select_option('out');dialog.get_by_role('button',name='Exportar PDF',exact=True).click();page.wait_for_function('prints.length===2');assert 'out-registro-2' in page.evaluate('prints[1].html');assert 'in-registro' not in page.evaluate('prints[1].html')
        page.get_by_role('button',name='Exportar',exact=True).click()
        dialog.get_by_role('combobox',name='Periodo para exportar',exact=True).select_option('mes');assert dialog.get_by_role('combobox',name='Año para exportar',exact=True).count()==1
        dialog.get_by_role('combobox',name='Año para exportar',exact=True).select_option('2025');dialog.get_by_role('combobox',name='Mes para exportar',exact=True).select_option('1');dialog.get_by_role('button',name='CSV',exact=True).click();csv=page.evaluate('csv');assert 'out-registro-1' in csv and 'registro-2' not in csv
        dialog.get_by_role('combobox',name='Periodo para exportar',exact=True).select_option('rango')
        if len(sys.argv)>1:page.screenshot(path=str(Path(sys.argv[1])/f'accounting-export-{width}.png'),full_page=True)
        dialog.get_by_role('button',name='Facturas del periodo',exact=True).click();page.wait_for_function('prints.length===3');assert 'out-registro-1' in page.evaluate('prints[2].html') and 'in-registro' not in page.evaluate('prints[2].html')
        page.get_by_role('button',name='Exportar',exact=True).click()
        page.get_by_role('button',name='Cerrar',exact=True).click()
        page.get_by_label('Desde',exact=True).fill('2027-02-07');page.get_by_role('button',name='Aplicar fechas',exact=True).click();assert page.evaluate('state.period.from')=='2025-01-01';assert 'posterior' in page.evaluate('lastToast')
        page.get_by_role('button',name='Restablecer',exact=True).click();assert page.locator('.acc-row').count()==4
        assert page.evaluate('JSON.stringify(state.entries)===original');assert not errors,errors
        print(width,'PASS: dates across years, inclusive list/totals and PDF/CSV, invalid interval, reset and removed buttons')
        page.close()
    browser.close()
