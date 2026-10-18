"""Real print output with synthetic accounting entries; no SDK, credentials or external requests."""
from pathlib import Path
import json,re,sys,tempfile
import fitz
from playwright.sync_api import sync_playwright

repo=Path(__file__).resolve().parents[1]
source=(repo/'app/index.html').read_text()
def function(name):
 start=re.search(r'^(?:async )?function '+name+r'\(',source,re.M).start()
 end=re.search(r'^(?:async )?function ',source[start+1:],re.M)
 return source[start:start+1+end.start()]
output=Path(sys.argv[1]) if len(sys.argv)>1 else Path(tempfile.mkdtemp(prefix='moderno-report-'))
output.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(locale='es-ES');errors=[];external=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 def route(r):
  path=(repo/'app'/r.request.url.removeprefix('https://fixture.invalid/').split('?')[0]).resolve()
  if r.request.url.startswith('https://fixture.invalid/') and path.is_relative_to(repo/'app') and path.is_file():r.fulfill(path=str(path))
  else:external.append(r.request.url);r.abort()
 page.route('**/*',route)
 style=source[source.index('<style>')+7:source.index('</style>')]
 page.set_content('<base href="https://fixture.invalid/"><title>Aplicación ficticia</title><style>'+style+'</style><div id="printZone" style="display:none"></div>')
 for path in ['brand/tasks-identity.css','accounting-report.css']:page.add_style_tag(path=str(repo/'app'/path))
 page.add_script_tag(path=str(repo/'app/accounting-report.js'))
 page.add_script_tag(content="""
 window.state={brandFilter:'all',period:{mode:'rango',from:'2025-01-01',to:'2027-02-06'},accSort:'asc',emitter:{name:'Estudio de ejemplo',nif:'NIF ficticio',addr:'Dirección ficticia'},account:{},projects:[{id:1,brand:'a',num:'PR-9001',name:'Proyecto de ejemplo'}],invoices:[{ref:'F-TEST-1',brand:'a',client:'Cliente de ejemplo',projectId:1,irpf:{on:true,pct:15},iva:{on:true,pct:21}}],entries:[]};
 window.BRAND={a:{name:'Estudio de ejemplo'}};window.wsOrder=['a'];window.byBrand=x=>x;
 window.isoToEs=s=>s.split('-').reverse().join('/');window.hoyEs=()=> '18/10/2026';window.fmt=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(v);
 window.toast=t=>{throw Error(t)};window.fileViewIdentity=()=> 'fictitious-view';window.fileImageAttrs=url=>'src="'+url+'"';window.fileLoadImage=img=>img.decode();window.printCalls=[];window.print=()=>printCalls.push(document.title);
 state.entries=Array.from({length:25},(_,i)=>({id:i,brand:'a',kind:i%2?'out':'in',concept:'Movimiento ficticio '+String(i).padStart(2,'0'),date:'02/01/2026',amount:121,base:100,iva:21,status:'pend',pid:1,sup:i%2?'Proveedor de ejemplo':'Cliente de ejemplo',cat:'Servicios ficticios',files:[{name:'Justificante de ejemplo.pdf',url:'https://private.invalid/must-not-load'}]}));
 Object.assign(state.entries[0],{concept:'Factura con retención',link:'F-TEST-1',amount:106,due:'2026-02-01',cobros:[{date:'2026-01-04',amount:50,note:'Primer abono'},{date:'2026-01-12',amount:25,note:'Segundo abono'}]});
 Object.assign(state.entries[1],{concept:'Gasto con descripción extensa '+('información de ejemplo '.repeat(10)),vat:21,irpf:0});
 Object.assign(state.entries[2],{base:undefined,iva:undefined,status:'cobr',sup:'Cliente histórico ficticio'});
 window.original=JSON.stringify({entries:state.entries,invoices:state.invoices,projects:state.projects});
 """)
 for name in ['accountingISODate','inPeriod','accVisible','periodoLabel','exportAccountingPDF','printAs','pdfBrandLogo','pdfFoot']:page.add_script_tag(content=function(name))
 page.evaluate("exportAccountingPDF('both')")
 assert page.evaluate('printCalls.length')==1
 assert '01-01-2025 al 06-02-2027' in page.evaluate('printCalls[0]')
 assert page.title()=='Aplicación ficticia' and page.locator('#printZone').is_hidden()
 assert page.evaluate('original===JSON.stringify({entries:state.entries,invoices:state.invoices,projects:state.projects})')
 html=page.locator('#printZone').inner_html();assert 'private.invalid' not in html
 page.locator('#printZone').evaluate("e=>e.style.display='block'")
 page.emulate_media(media='print');page.evaluate('document.fonts.ready')
 page.pdf(path=str(output/'accounting-report.pdf'),format='A4',print_background=True,margin={'top':'12mm','bottom':'12mm','left':'12mm','right':'12mm'})
 pdf=fitz.open(output/'accounting-report.pdf');texts=[page.get_text() for page in pdf];text='\n'.join(texts)
 assert 3<len(pdf)<20,len(pdf)
 for term in ['Total ingresos:','Total gastos:','Balance:','Base imponible','Retención','Primer abono','Segundo abono','No consta','sin desglose de cobros','Justificante de ejemplo.pdf','F-TEST-1','PR-9001','Movimiento 25 de 25']:
  assert term in text,term
 for n in range(2,25):assert 'Movimiento ficticio '+str(n).zfill(2) in text,n
 for n,page_text in enumerate(texts):
  assert 'Movimiento' in page_text,(n,page_text)
  assert 'FECHA' in page_text and 'IMPORTE REGISTRADO' in page_text,(n,page_text)
 for n in [0,1,len(pdf)-1]:pdf[n].get_pixmap(matrix=fitz.Matrix(1.3,1.3)).save(output/f'accounting-page-{n+1}.png')
 # A single unusually large record may span pages, but must not lose its final payments.
 page.evaluate("""()=>{state.entries=[{...state.entries[0],cobros:Array.from({length:90},(_,i)=>({amount:1,date:'2026-01-04',note:'Abono ficticio '+i+' '+('Nota extensa '.repeat(8))}))}];window.original=JSON.stringify(state.entries);} """)
 page.evaluate("exportAccountingPDF('in')")
 assert page.evaluate('JSON.stringify(state.entries)===original')
 page.locator('#printZone').evaluate("e=>e.style.display='block'")
 page.pdf(path=str(output/'accounting-oversized.pdf'),format='A4',print_background=True,margin={'top':'12mm','bottom':'12mm','left':'12mm','right':'12mm'})
 oversized=fitz.open(output/'accounting-oversized.pdf');oversized_text='\n'.join(p.get_text() for p in oversized)
 for n in range(90):assert 'Abono ficticio '+str(n) in oversized_text,n
 assert 'Movimiento 1 de 1' in oversized_text
 assert not errors,errors
 assert not external,external
 print(f'PASS: {len(pdf)} A4 pages, 25 records, totals, tax, retention, partial payments, real print lifecycle, no writes or external requests')
 browser.close()
