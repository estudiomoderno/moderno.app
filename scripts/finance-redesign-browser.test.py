"""Finance workspace regression with fictitious, in-memory records only.

The official isolated server is used with the backend disabled. External
requests and every non-GET request are blocked so this test cannot mutate
production data.
"""
from pathlib import Path
import ast
import os
import socket
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import expect, sync_playwright


repo = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]) if len(sys.argv) > 1 else None
if output:
    output.mkdir(parents=True, exist_ok=True)

parsed = ast.parse((repo / "scripts/shopping-loading-browser.test.py").read_text())
fixture_setup = next(
    ast.literal_eval(node.value)
    for node in parsed.body
    if isinstance(node, ast.Assign)
    and any(isinstance(target, ast.Name) and target.id == "fixture_setup" for target in node.targets)
)

finance_setup = """()=>{
 const p=state.projects[0];
 Object.assign(p,{status:'En progreso',total:15400,payPlan:[
  {id:501,concept:'Segundo pago',amount:3200,due:'2026-12-15'},
  {id:502,concept:'Tercer pago',amount:1800,due:'2027-01-20'}
 ]});
 state.entries=[
  {id:101,kind:'in',brand:'cm',concept:'Factura F-0101 · Cliente ficticio',client:'Cliente ficticio',amount:6050,base:5000,date:'03/11/2026',due:'03/12/2026',status:'env',link:'F-0101',pid:p.id,cobros:[{amount:2000,date:'2026-11-08',note:'Transferencia parcial'}]},
  {id:102,kind:'in',brand:'cm',concept:'Factura F-0102 · Cliente ficticio',client:'Cliente ficticio',amount:3630,base:3000,date:'15/10/2026',due:'14/11/2026',status:'cobr',link:'F-0102',pid:p.id,cobros:[{amount:3630,date:'2026-11-02',note:'Transferencia'}]},
  {id:201,kind:'out',brand:'cm',concept:'Factura de iluminación',sup:'Proveedor ficticio',amount:1250,date:'12/11/2026',status:'pend',pid:p.id,file:{name:'proveedor-201.pdf',type:'application/pdf'}},
  {id:202,kind:'out',brand:'cm',concept:'Honorarios técnicos',sup:'Técnico ficticio',amount:680,date:'21/10/2026',status:'cobr',pid:p.id}
 ];
 state.invoices=[
  {ref:'F-0101',num:101,date:'2026-11-03',client:'Cliente ficticio',brand:'cm',total:6050,sub:5000,projectId:p.id,sourceQuoteRef:'PS-0201',lines:[{name:'Dirección de obra',qty:1,price:5000}]},
  {ref:'F-0102',num:102,date:'2026-10-15',client:'Cliente ficticio',brand:'cm',total:3630,sub:3000,projectId:p.id,lines:[{name:'Proyecto básico',qty:1,price:3000}]}
 ];
 state.quotes=[
  {ref:'PS-0201',num:201,date:'2026-11-04',client:'Cliente ficticio',brand:'cm',total:14520,sub:12000,status:'acc',projectId:p.id,lines:[{name:'Reforma integral',qty:1,price:12000}]},
  {ref:'PS-0202',num:202,date:'2026-11-09',client:'Cliente pendiente',brand:'cm',total:4840,sub:4000,status:'pend',lines:[{name:'Asesoría',qty:1,price:4000}]},
  {ref:'PS-0203',num:203,date:'2026-10-07',client:'Cliente descartado',brand:'cm',total:1210,sub:1000,status:'rej',lines:[{name:'Consulta',qty:1,price:1000}]}
 ];
 state.period={mode:'todo',year:2026,month:11,quarter:4};
 state.financeSummaryPeriod='year:2026';state.financeSearch='';state.invoiceBookTab='emitidas';
 state.accTab='in';state.accF={};state.fFilter={from:'',to:'',client:'',status:''};state.qFilter={from:'',to:'',client:'',status:''};
 window.financeRecords=()=>JSON.stringify({projects:state.projects,entries:state.entries,invoices:state.invoices,quotes:state.quotes});
 go('informes');window.financeBaseline=financeRecords();
}"""


with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
origin = f"http://127.0.0.1:{port}"
server = subprocess.Popen(
    ["node", "scripts/dev-server.mjs"],
    cwd=repo,
    env=dict(
        os.environ,
        PORT=str(port),
        SUPABASE_URL="https://finance-redesign-fixture.supabase.co",
        SUPABASE_ANON_KEY="sb_publishable_offline_fixture_only_no_credentials_51",
    ),
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

try:
    for _ in range(100):
        try:
            with opener.open(origin, timeout=1) as response:
                assert "moderno_pruebas_finance-redesign-fixture" in response.read().decode()
            break
        except OSError:
            time.sleep(0.05)
    else:
        raise AssertionError("Official isolated server unavailable")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"]
        )
        for width, height in [(1440, 1000), (1100, 850), (768, 900), (390, 844)]:
            page = browser.new_page(viewport={"width": width, "height": height})
            errors = []
            writes = []
            page.on("pageerror", lambda error: errors.append(str(error)))

            def route(request_route):
                request = request_route.request
                if not request.url.startswith(origin + "/"):
                    request_route.abort()
                elif request.method not in ("GET", "HEAD"):
                    writes.append((request.method, request.url))
                    request_route.abort()
                else:
                    request_route.continue_()

            page.route("**/*", route)
            page.goto(origin, wait_until="networkidle")
            page.evaluate(fixture_setup)
            page.evaluate(finance_setup)

            route = page.locator("#desktop-header .desktop-inset-breadcrumb")
            if width >= 1100:
                expect(route).to_be_visible()
                expect(route.get_by_role("navigation", name="breadcrumb", exact=True)).to_be_visible()
                expect(route.get_by_text("Resumen", exact=True)).to_be_visible()
                expect(route.locator("svg")).to_have_count(1)
                expect(route.locator('[data-slot="breadcrumb-separator"]')).to_have_count(0)
            sections = page.get_by_role("navigation", name="Secciones de Finanzas", exact=True)
            expect(sections.get_by_role("button")).to_have_text(
                ["Resumen", "Ventas", "Gastos", "Presupuestos", "Previsión"]
            )

            expect(page.locator(".finance-overview")).to_be_visible()
            summary = page.locator(".finance-overview")
            expect(summary.locator(".finance-kpi > span")).to_have_text(
                ["Facturado", "Cobrado", "Pendiente de cobro", "Gastos", "Resultado económico"]
            )
            assert "IVA" not in summary.inner_text() and "IRPF" not in summary.inner_text()
            expect(summary.locator(".finance-kpi strong")).to_have_text(
                ["9.680,00 €", "5.630,00 €", "4.050,00 €", "1.930,00 €", "7.750,00 €"]
            )
            expect(summary.get_by_text("Presupuestos y venta estimada", exact=True)).to_be_visible()

            if output and width in (1440, 390):
                page.screenshot(path=str(output / f"finance-summary-light-{width}.png"), full_page=True)

            page.locator('[data-finance-view="facturas"]').click()
            page.wait_for_function("state.view==='facturas'")
            expect(page.get_by_text("F-0101", exact=True)).to_be_visible()
            grid = page.locator('[data-slot="data-grid-table"]')
            expect(grid.locator("thead th")).to_contain_text(
                ["Factura", "Estado", "Cliente", "Proyecto", "Importe (con IVA)"]
            )
            expect(grid.locator("thead th")).to_have_count(5)
            expect(grid.get_by_text("Cobrada en parte", exact=True)).to_be_visible()
            expect(grid.locator('button:has(img[src*="folder-simple-star-light.svg"])').first).to_be_visible()
            expect(grid.get_by_text("Acciones", exact=True)).to_have_count(0)
            expect(page.get_by_text("Pendiente de cobro", exact=True)).to_have_count(0)
            title_style = page.locator('[data-slot="card-title"]').evaluate(
                "element=>{const style=getComputedStyle(element);return {family:style.fontFamily,size:style.fontSize,weight:style.fontWeight,fontStyle:style.fontStyle,lineHeight:style.lineHeight}}"
            )
            assert "Moderno ReUI Inter" in title_style["family"], title_style
            assert title_style["size"] == "14px", title_style
            assert title_style["weight"] == "500", title_style
            assert title_style["fontStyle"] == "normal", title_style
            assert title_style["lineHeight"] == "19.25px", title_style
            description_style = page.locator('[data-slot="card-description"]').evaluate(
                "element=>{const style=getComputedStyle(element);return {size:style.fontSize,weight:style.fontWeight,lineHeight:style.lineHeight}}"
            )
            assert description_style == {"size": "12px", "weight": "400", "lineHeight": "16px"}, description_style
            if width == 1440:
                page.get_by_role("button", name="Filtro avanzado", exact=True).click()
                expect(page.locator('[data-slot="filters-advanced"]')).to_be_visible()
                if output:
                    page.screenshot(path=str(output / "finance-sales-filters-1440.png"), full_page=True)
                page.keyboard.press("Escape")
            if output and width == 1440:
                page.screenshot(path=str(output / "finance-sales-grid-1440.png"), full_page=True)

            page.locator('[data-finance-view="contabilidad"]').click()
            page.wait_for_function("state.view==='contabilidad'")
            expect(page.get_by_text("Factura de iluminación", exact=False).first).to_be_visible()
            expect(page.locator('[data-slot="data-grid-table"]').get_by_text("Pendiente de pago", exact=True)).to_be_visible()
            if output and width == 1440:
                page.screenshot(path=str(output / "finance-expenses-grid-1440.png"), full_page=True)

            page.locator('[data-finance-view="presupuestos"]').click()
            page.wait_for_function("state.view==='presupuestos'")
            expect(page.get_by_text("PS-0201", exact=True)).to_be_visible()
            expect(page.get_by_text("Convertido en Factura", exact=True)).to_be_visible()

            page.locator('[data-finance-view="prevision"]').click()
            page.wait_for_function("state.view==='prevision'")
            forecast = page.locator(".finance-forecast")
            expect(forecast.get_by_text("Segundo pago", exact=True)).to_be_visible()
            expect(forecast.get_by_text("No representa un saldo bancario", exact=False)).to_be_visible()

            assert page.evaluate("financeRecords()===financeBaseline")
            assert page.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"), width

            page.evaluate("document.body.classList.add('dark');go('informes')")
            expect(page.locator(".finance-overview")).to_be_visible()
            assert page.locator(".finance-panel").first.evaluate(
                "element=>getComputedStyle(element).backgroundColor"
            ) != "rgb(255, 255, 255)"
            if output and width == 1440:
                page.screenshot(path=str(output / "finance-summary-dark-1440.png"), full_page=True)

            page.evaluate("""()=>{
             state.entries=[];state.invoices=[];state.quotes=[];state.projects[0].payPlan=[];
             state.projects[0].total=0;state.invoiceBookTab='emitidas';document.body.classList.remove('dark');go('informes');
            }""")
            expect(page.get_by_text("Sin actividad estimada", exact=True)).to_be_visible()
            page.locator('[data-finance-view="facturas"]').click()
            expect(page.get_by_text("Todavía no has emitido ninguna factura.", exact=True)).to_be_visible()
            page.locator('[data-finance-view="prevision"]').click()
            expect(page.get_by_text("Sin cobros previstos pendientes", exact=True)).to_be_visible()

            assert not errors, errors
            assert not writes, writes
            print(
                width,
                "PASS: five finance sections, real/forecast split, issued/received, empty/dark/responsive, no writes",
                flush=True,
            )
            page.close()
        browser.close()
finally:
    server.terminate()
    server.wait(timeout=5)
