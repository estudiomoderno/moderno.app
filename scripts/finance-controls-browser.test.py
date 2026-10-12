"""Offline finance presentation regression. Synthetic records, no network or SDK."""
from pathlib import Path
import re,sys
from playwright.sync_api import sync_playwright
repo=Path(__file__).resolve().parents[1];source=(repo/'app/index.html').read_text()
style=source[source.index('<style>')+7:source.index('</style>')]
start=source.index('${tb!=="fin"');start=source.index('`',start)+1;end=source.index('    `}\n${tb===',start);finance=source[start:end]
def function(name):
    start=source.index('function '+name+'(');end=re.search(r'^function ',source[start+1:],re.M)
    return source[start:start+1+end.start()]
helpers=source[source.index('const CURR ='):source.index('function wsVisible(')] if 'const CURR =' in source else source[source.index('const CURR='):source.index('function wsVisible(')]
plan=source[source.index('let pp ='):source.index('function ppSplit(')] if 'let pp =' in source else source[source.index('let pp='):source.index('function ppSplit(')]
fixture="""window.state={account:{currency:'GBP'},projects:[{id:1,name:'Proyecto ficticio',num:'PR-1',total:1200,payPlan:[{id:11,concept:'Primer pago',amount:1200,due:'2030-01-01'}]}],invoices:[],quotes:[],entries:[{id:21,pid:1,kind:'in',concept:'Ingreso ficticio',amount:100,status:'cobr',date:'01/10/2026'}]};window.calls=[];window.APP_LOCALE=()=> 'es-ES';window.ico=()=>'<svg class="svgi" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';window.fmt=n=>String(n);window.planHitos=p=>p.payPlan;window.hitoStatus=()=> 'previsto';window.hitoChip=()=>'<span class="chip">Previsto</span>';window.projValor=()=>({total:1200,facturado:0,previsto:1200});window.entryBase=e=>e.amount;window.planMigrateBanner=()=>'';window.planPrevisto=()=>1200;window.otherPayTotals=()=>'';window.hitoSet=(...args)=>calls.push(['amount',...args]);window.hitoInvoiceDraft=(...args)=>calls.push(['invoice',...args]);window.setEntryStatus=(...args)=>calls.push(['status',...args]);window.modal=s=>document.querySelector('#modalBox').innerHTML=s;window.ppDraw=()=>{};
window.render=()=>{const p=state.projects[0],fin=state.entries,pc={front:'#e7e2d2'},cobrado=100,pend=0,gastosProj=0;document.querySelector('#view').innerHTML=FINANCE;};
""".replace('FINANCE','`'+finance+'`')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in [1280,390]:
        page=browser.new_page(viewport={'width':width,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/*',lambda r:r.abort())
        page.set_content('<meta name="viewport" content="width=device-width"><style>'+style+'</style><main class="main"><section id="view" data-page="proyecto"></section></main><div id="modalBox"></div>')
        for path in re.findall(r'<link[^>]+href="(/[^"?]+\.css)',source):
            f=repo/'app'/path.lstrip('/')
            if f.exists():page.add_style_tag(path=str(f))
        page.add_script_tag(content=fixture);page.add_script_tag(content=helpers);page.add_script_tag(content=(repo/'app/project-ui.js').read_text().splitlines()[0]);page.add_script_tag(content="const ST_LABEL={pend:'Pendiente',env:'Factura enviada',cobr:'Cobrado'};"+function('stSelect'))
        page.add_script_tag(content=plan);page.evaluate('render()')
        button=page.get_by_role('button',name='Emitir factura',exact=True);box=button.bounding_box();assert box['height']<=34 and box['width']<160,box
        assert button.locator('svg').bounding_box()['width']==16
        selector=page.locator('select.finance-status');assert selector.bounding_box()['height']<=34,selector.bounding_box()
        assert selector.input_value()=='cobr';selector.select_option('pend');assert page.evaluate('calls.pop()')==['status',21,'pend']
        for currency,symbol in [('GBP','£'),('USD','$'),('EUR','€')]:
            page.evaluate('(currency)=>{state.account.currency=currency;render()}',currency)
            assert page.locator('.finance-amount-field>span').inner_text()==symbol
            assert page.get_by_role('spinbutton',name=f'Importe ({symbol})',exact=True).input_value()=='1200'
            page.get_by_role('button',name=f'{symbol} Valor y reparto',exact=True).click()
            assert f'Importe del contrato ({symbol})' in page.locator('#modalBox').inner_text()
        page.get_by_role('spinbutton',name='Importe (€)',exact=True).fill('900');page.get_by_role('spinbutton',name='Importe (€)',exact=True).press('Tab');assert page.evaluate('calls.pop()')==['amount',1,11,'amount','900']
        page.get_by_role('button',name='Emitir factura',exact=True).click();assert page.evaluate('calls.pop()')==['invoice',1,11]
        assert page.evaluate('state.projects[0].payPlan[0].amount')==1200
        page.evaluate("document.querySelector('#modalBox').innerHTML=''")
        if len(sys.argv)>1:page.screenshot(path=str(Path(sys.argv[1])/f'finance-controls-{width}.png'),full_page=True)
        assert not errors,errors
        print(width,'PASS: compact invoice/status controls, settings currency, contract dialog, original actions and synthetic amounts preserved')
        page.close()
    browser.close()
