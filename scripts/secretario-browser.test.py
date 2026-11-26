"""Secretary browser integration using fictional in-memory records only.

Runs the official test server. The Supabase SDK is an in-memory stub, every
external request is blocked, and the Secretary endpoint is intercepted locally.
No OpenAI key, real login, production record or live database is used.
"""
from pathlib import Path
import ast
import json
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
backend = "https://chsilowzrtumbcofspwv.supabase.co"
endpoint = backend + "/functions/v1/secretario"
stamp = "2026-11-22T09:00:00Z"
source_versions = {key: stamp for key in ["config", "contactos", "proyectos", "presupuestos", "facturas"]}
invoice_fixture_script = ["node", "scripts/secretario-receivables-fixture.mjs"]
invoice_fixture = json.loads(subprocess.check_output(invoice_fixture_script, cwd=repo, input=b""))
acceptance_fixture = json.loads(subprocess.check_output([*invoice_fixture_script, "--acceptance"], cwd=repo, input=b""))

parsed = ast.parse((repo / "scripts/shopping-loading-browser.test.py").read_text())
fixture = next(ast.literal_eval(node.value) for node in parsed.body if isinstance(node, ast.Assign)
               and any(isinstance(target, ast.Name) and target.id == "fixture_setup" for target in node.targets))
fixture = fixture.replace("if(sb!==null)throw Error('Backend must be disabled');", "if(!window.__secretaryFakeBackend)throw Error('Fictional SDK required');")
fixture = fixture.replace("structuredClone(state.projects[0])", "structuredClone(state.projects[0]||{})")

fake_sdk = r"""
window.__secretaryFakeBackend=true;
window.__secretaryAuth=null;
window.__secretaryConsent={enabled:false,version:1,revision:0};
window.__secretaryRpc=[];window.__secretaryFeedbackEvents=[];window.__secretaryAuthListeners=[];
window.__secretaryFailWithdrawal=false;
const emptyQuery=()=>({
 select(){return this},eq(){return this},order(){return this},limit(){return this},maybeSingle(){return this},single(){return this},in(){return this},
 insert(){throw Error('Unexpected insert')},update(){throw Error('Unexpected update')},upsert(){throw Error('Unexpected upsert')},delete(){throw Error('Unexpected delete')},
 then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)}
});
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:window.__secretaryAuth},error:null}),getUser:async()=>({data:{user:window.__secretaryAuth?.user||null},error:null}),
   onAuthStateChange(fn){window.__secretaryAuthListeners.push(fn);return {data:{subscription:{unsubscribe(){}}}}},
   async signOut(){window.__secretaryAuth=null;for(const fn of window.__secretaryAuthListeners)fn('SIGNED_OUT',null);return {error:null}}},
 async rpc(name,args){
   window.__secretaryRpc.push({name,args:structuredClone(args)});
   if(name==='secretary_feedback_consent_get')return {data:{...window.__secretaryConsent},error:null};
   if(name==='secretary_feedback_consent_set'){
     if(!args.p_enabled&&window.__secretaryFailWithdrawal)return {data:null,error:{message:'Fictional outage'}};
     if(args.p_enabled&&args.p_expected_revision!==window.__secretaryConsent.revision)return {data:null,error:{message:'revision_conflict'}};
     window.__secretaryConsent={enabled:args.p_enabled,version:1,revision:window.__secretaryConsent.revision+1};
     if(!args.p_enabled)window.__secretaryFeedbackEvents=[];
     return {data:{...window.__secretaryConsent},error:null};
   }
   if(name==='secretary_feedback_submit'){
     if(!window.__secretaryConsent.enabled)return {data:null,error:{message:'consent_required'}};
     window.__secretaryFeedbackEvents.push(structuredClone(args.p_event));return {data:{accepted:true},error:null};
   }
   return {data:[],error:null};
 },
 from(){return emptyQuery()},
 channel(){return {on(){return this},subscribe(){return this},track(){return Promise.resolve()},untrack(){return Promise.resolve()},presenceState(){return {}},unsubscribe(){return Promise.resolve()}}},
 removeChannel(){return Promise.resolve()},removeAllChannels(){return Promise.resolve()},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:'No fictional file'}})})}
})};
"""

def proposal(mode="create", draft_id=None):
    payload = {
        "mode": mode, "kind": "factura", "brand": "cm", "clientId": "contact:0", "clientIndex": 0,
        "clientLabel": "Cliente ficticio", "clientBrand": "cm", "projectId": 9001,
        "lines": [{"name": "Asesoría ficticia", "qty": 2, "unit": "h", "price": 100, "cap": "Servicios"}],
        "iva": {"on": True, "pct": 21}, "irpf": {"on": False, "pct": 0}, "disc": {"on": False, "pct": 10},
        "legend": "", "sourceVersions": source_versions,
    }
    if draft_id is not None:
        payload["draftId"] = draft_id
        payload["lines"][0]["qty"] = 4
        payload["lines"][0]["price"] = 125
    return {"requestId": "fixture-" + mode, "status": "proposal", "message": "El borrador está preparado para revisar.",
            "sources": [{"kind": "project", "id": "9001", "label": "PR-9001 · Proyecto ficticio", "projectId": 9001, "brand": "cm"}],
            "questions": [], "actions": [{"id": "draft", "type": "prepare_draft", "label": "Revisar factura", "payload": payload}],
            "trace": [{"label": "Partidas confirmadas en la prueba", "status": "done"}]}

setup = r"""()=>{
 ESTUDIO_ID='11111111-1111-4111-8111-111111111111';
 state.sessionUser.id='22222222-2222-4222-8222-222222222222';
 window.__secretaryAuth={access_token:'fictional-token-no-credentials',user:{id:state.sessionUser.id}};
 state.account.vat=21;state.irpf=false;state.borradores=[];state.draft=null;state.fView=null;state.qView=null;
 state.financeSearch='';state.financeSummaryPeriod='year:2026';
 _accessRole='admin';state.myRole='admin';_accessLoading=false;
 cloudDirty=()=>{};cloudFlush=async()=>{};persistNow=()=>{};persistSoon=()=>{};
 window.fixtureVersions=()=>{for(const key of ModernoSecretaryBridge.BLOCKS){_cloudSeen[key]='2026-11-22T09:00:00Z';_cloudHash[key]=canon(CLOUD_BLOCKS[key].get());}};
 window.fixtureDocuments=()=>JSON.stringify({invoices:state.invoices,quotes:state.quotes,entries:state.entries,counter:state.invCounter});
 go('informes');ModernoSecretary.openFinance();fixtureVersions();window.fixtureBaseline=fixtureDocuments();
}"""

def wait_for_stable_view(page):
    """Wait for the app's actual finite route fade, without disabling animation."""
    page.evaluate("""async()=>{
      const nodes=[document.getElementById('view'),document.getElementById('moderno-secretary')].filter(Boolean);
      const animations=nodes.flatMap(node=>node.getAnimations()).filter(animation=>animation.playState==='running'&&animation.effect?.getTiming().iterations!==Infinity);
      await Promise.all(animations.map(animation=>animation.finished.catch(()=>{})));
      await document.fonts.ready;
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    }""")
    page.wait_for_function("""()=>['view','moderno-secretary'].every(id=>{const node=document.getElementById(id);return !node||Number(getComputedStyle(node).opacity)>.999})""")


def assert_secretary_clearance(page):
    page.wait_for_function("""()=>{
      const panel=document.getElementById('moderno-secretary'),sync=document.getElementById('syncTag');
      if(!panel||!sync)return false;
      const p=panel.getBoundingClientRect(),s=sync.getBoundingClientRect(),button=panel.querySelector('button[type=submit]')?.getBoundingClientRect();
      if(!button)return false;
      const disjoint=rect=>rect.right<=s.left||rect.left>=s.right||rect.bottom<=s.top-10||rect.top>=s.bottom+10;
      return panel.parentElement===document.body&&disjoint(p)&&disjoint(button)&&p.top>=0&&p.bottom<=innerHeight;
    }""")


def assert_launcher_clearance(page):
    """The folded control must remain usable beside real chrome and save status."""
    page.wait_for_function("""()=>{
      const launcher=document.getElementById('secretary-reopen');
      if(!launcher)return false;
      const r=launcher.getBoundingClientRect();
      if(r.width<44||r.height<44||r.top<0||r.left<0||r.bottom>innerHeight||r.right>innerWidth)return false;
      return [...document.querySelectorAll('#syncTag,#project-window-bar,.project-tabs.project-dock')].every(node=>{
        const style=getComputedStyle(node),box=node.getBoundingClientRect();
        if(style.display==='none'||style.visibility==='hidden'||!box.width||!box.height)return true;
        return r.right<=box.left||r.left>=box.right||r.bottom<=box.top-10||r.top>=box.bottom+10;
      });
    }""")


def assert_static_history(panel):
    avatars = panel.locator('.secretary-turn-assistant .secretary-character')
    assert avatars.count() > 0
    assert avatars.evaluate_all("async nodes=>{await Promise.all(nodes.map(node=>node.decode()));return nodes.every(node=>node.dataset.animated==='false'&&new URL(node.src).pathname.endsWith('.png')&&node.naturalWidth>0)}")


with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
origin = f"http://127.0.0.1:{port}"
cors_headers = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Vary": "Origin",
}
server = subprocess.Popen(
    ["node", "scripts/dev-server.mjs"], cwd=repo,
    env=dict(os.environ, PORT=str(port), SUPABASE_URL=backend,
             SUPABASE_ANON_KEY="sb_publishable_fictional_only_no_credentials_secretary",
             MODERNO_SECRETARY_ENABLED="true", MODERNO_SECRETARY_FEEDBACK_ENABLED="true"),
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

try:
    for _ in range(100):
        try:
            with opener.open(origin, timeout=1) as response:
                assert "MODERNO_SECRETARY_CONFIG" in response.read().decode()
            break
        except OSError:
            time.sleep(.05)
    else:
        raise AssertionError("Official isolated server unavailable")

    with sync_playwright() as playwright:
        executable = os.environ.get("CHROMIUM_EXECUTABLE")
        if not executable and Path("/usr/bin/chromium").exists():
            executable = "/usr/bin/chromium"
        options = {"headless": True, "args": ["--no-sandbox"]}
        if executable:
            options["executable_path"] = executable
        browser = playwright.chromium.launch(**options)
        for width, height in [(1440, 1000), (390, 844)]:
            page = browser.new_page(viewport={"width": width, "height": height}, locale="es-ES")
            errors, requests, forbidden_writes, pending = [], [], [], []
            pending_receivables = []
            failed_invoice_reads = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.add_init_script(fake_sdk)

            def route(request_route):
                request = request_route.request
                if request.url == endpoint:
                    if request.method == "OPTIONS":
                        assert request.headers.get("origin") == origin
                        assert request.headers.get("access-control-request-method") == "POST"
                        requested_headers = {header.strip().lower() for header in request.headers.get("access-control-request-headers", "").split(",") if header.strip()}
                        assert requested_headers.issubset({"apikey", "content-type"})
                        assert "apikey" in requested_headers
                        request_route.fulfill(status=204, headers=cors_headers, body="")
                        return
                    assert request.method == "POST"
                    assert request.headers.get("authorization") is None
                    assert request.headers.get("x-moderno-session") is None
                    assert request.headers.get("apikey") == "sb_publishable_fictional_only_no_credentials_secretary"
                    envelope = request.post_data_json
                    assert set(envelope) == {"session", "payload"}
                    assert envelope["session"] == "fictional-token-no-credentials"
                    body = envelope["payload"]
                    assert set(body).issubset({"studyId", "message", "automatic", "history", "context", "answers", "invoicePage", "receivableContext"})
                    assert body["studyId"] == "11111111-1111-4111-8111-111111111111"
                    if not body.get("invoicePage"):
                        assert isinstance(body.get("automatic"), bool)
                        assert body["automatic"] is bool(body.get("answers"))
                    requests.append(body)
                    message = body["message"]
                    if "consulta lenta" in message:
                        pending.append(request_route)
                        return
                    if "fallo red" in message:
                        request_route.abort()
                        return
                    if "fallo disponible" in message:
                        request_route.fulfill(status=503, headers=cors_headers, content_type="application/json", body=json.dumps({"error": {"code": "not_configured", "message": "Fixture"}}))
                        return
                    demo_questions = {
                        "que facturas quedan por que me pagen", "solo las de este año", "enséñame solo las vencidas",
                        "¿Cuánto falta por cobrar de la F-DEMO-002?", "¿Qué ingresos de facturas faltan?",
                        "pendientes de cobro y solo de este año", "Muéstrame las pendientes de Casa Sol de este año",
                        "Cliente Casa Sol", "Proyecto Casa Sol", "solo las de 2024", "solo las de 2025",
                    }
                    if message in demo_questions:
                        options = {"origin": origin, "acceptance": True, "pendingPlan": message == "¿Qué ingresos de facturas faltan?"}
                        if message == "solo las de 2025" and not failed_invoice_reads:
                            failed_invoice_reads.append(message)
                            options["failRead"] = "app_leer_bloques"
                        result = json.loads(subprocess.check_output(invoice_fixture_script, cwd=repo,
                            input=json.dumps({"input": body, "options": options}).encode()))
                        request_route.fulfill(status=result["status"], headers=cors_headers, content_type="application/json", body=json.dumps(result["body"]))
                        return
                    if message in ("Dime qué facturas tengo pendientes de cobrar", "¿Cuántas facturas tengo pendientes de cobrar?", "Abre la factura FC-0002", "Facturas pendientes de cobrar de Casa Lino en febrero de 2026"):
                        result = json.loads(subprocess.check_output(invoice_fixture_script, cwd=repo,
                            input=json.dumps({"input": body, "options": {"origin": origin, "extra": 12 if message.startswith("¿Cuántas") else 0}}).encode()))
                        assert result["status"] == 200, result["body"]
                        if message == "Dime qué facturas tengo pendientes de cobrar":
                            pending_receivables.append((request_route,result["body"]))
                            return
                        request_route.fulfill(status=200, headers=cors_headers, content_type="application/json", body=json.dumps(result["body"]))
                        return
                    if "editar guardado" in message:
                        response = proposal("edit_saved_draft", 42)
                    elif "Abre facturas" in message:
                        response = {"requestId": "navigation", "status": "answer", "message": "Abrimos las facturas.", "sources": [], "questions": [],
                                    "actions": [{"id": "nav", "type": "navigate", "label": "Abrir facturas", "payload": {"view": "facturas"}}], "trace": []}
                    elif "respuesta segura" in message:
                        response = {"requestId": "escaped", "status": "answer", "message": '<img src=x onerror="window.injected=true">',
                                    "sources": [{"kind": "project", "id": "9001", "label": f"Fuente ficticia {i}", "projectId": 9001} for i in range(25)],
                                    "sourceCount": 25, "questions": [], "actions": [], "trace": []}
                    elif body.get("answers"):
                        assert body["answers"]["clientId"] == "contact:0"
                        response = proposal()
                    else:
                        response = {"requestId": "clarify", "status": "clarifying", "message": "¿Para qué cliente preparamos la factura?",
                                    "sources": [], "actions": [], "trace": [],
                                    "questions": [{"id": "clientId", "prompt": "Elige el cliente", "freeText": True,
                                                   "options": [{"id": "client-0", "label": "Cliente ficticio", "value": "contact:0"}]}]}
                    request_route.fulfill(status=200, headers=cors_headers, content_type="application/json", body=json.dumps(response))
                elif not request.url.startswith(origin + "/"):
                    request_route.abort()
                elif request.method not in ("GET", "HEAD"):
                    forbidden_writes.append((request.method, request.url))
                    request_route.abort()
                else:
                    request_route.continue_()

            page.route("**/*", route)
            page.goto(origin, wait_until="networkidle")
            page.evaluate(fixture)
            page.evaluate(setup)
            print(f"Secretary fixture loaded at {width}px", flush=True)
            if output:
                page.screenshot(path=str(output / f"secretario-inicial-{width}.png"), full_page=True)
            panel = page.locator("#moderno-secretary")
            expect(panel).to_be_visible()
            expect(page.locator("body")).to_have_class(__import__("re").compile(r".*secretary-home.*"))
            expect(page.get_by_role("heading", name="¿Qué hacemos hoy?", exact=True)).to_be_visible()
            expect(panel.get_by_role("button", name="Facturas", exact=True)).to_be_visible()
            expect(page.locator(".finance-overview")).to_be_hidden()
            wait_for_stable_view(page)
            welcome = panel.locator('.secretary-welcome .secretary-character')
            expect(welcome).to_be_visible()
            expect(welcome).to_have_attribute('data-character-state', 'espera')
            welcome.evaluate("node=>node.decode()")
            assert welcome.evaluate("(node,minimum)=>node.naturalWidth>0&&node.getBoundingClientRect().width>=minimum", 140 if width >= 1100 else 80)
            assert welcome.evaluate("node=>new URL(node.src).pathname.startsWith('/brand/secretario/lavanda/')")
            assert page.locator('img[data-secretary-presence][data-animated=true]').count() <= 1

            # The supplied static pose is used when motion is reduced, including
            # a preference change during an already visible animation.
            page.emulate_media(reduced_motion="reduce")
            expect(welcome).to_have_attribute('data-animated', 'false')
            assert welcome.evaluate("node=>new URL(node.src).pathname.endsWith('.png')")
            expect(page.locator('img[data-secretary-presence][data-animated=true]')).to_have_count(0)
            page.evaluate("document.body.classList.add('dark')")
            assert welcome.evaluate("node=>getComputedStyle(node).filter==='none'")
            page.evaluate("document.body.classList.remove('dark')")
            page.emulate_media(reduced_motion="no-preference")
            if output:
                page.screenshot(path=str(output / f"secretario-central-{width}.png"), full_page=True)

            # The HTTP response comes from the real handler and financial calculation.
            page.evaluate("""data=>{
              window.originalInvoicesFixture={clients:state.clients,invoices:state.invoices,entries:state.entries};
              Object.assign(state,data);
            }""", invoice_fixture)
            page.locator("#secretary-message").fill("Dime qué facturas tengo pendientes de cobrar")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            activity = panel.locator(".secretary-working")
            expect(activity).to_contain_text("Sesión comprobada")
            live = activity.locator('[aria-current="step"]')
            expect(live).to_contain_text("Comprobando las facturas y sus cobros")
            detail = activity.get_by_text("La consulta sigue en curso.", exact=False)
            expect(detail).to_be_visible()
            live.click()
            expect(detail).to_be_hidden()
            live.click()
            expect(detail).to_be_visible()
            assert len(pending_receivables) == 1
            expect(panel).to_have_attribute('data-character-state', 'trabajando')
            expect(panel.locator('[data-secretary-presence=header]')).to_have_attribute('data-animated', 'true')
            expect(page.locator('img[data-secretary-presence][data-animated=true]')).to_have_count(1)
            if output:
                wait_for_stable_view(page)
                page.screenshot(path=str(output / f"secretario-traza-activa-{width}.png"))

            # Folding a running query preserves it. Receiving real results keeps
            # the surface folded, marks them unread and leaves focus on the control.
            panel.get_by_role('button', name='Plegar el Secretario', exact=True).click()
            launcher = page.locator('#secretary-reopen')
            expect(panel).to_be_hidden()
            expect(launcher).to_have_attribute('data-character-state', 'trabajando')
            expect(launcher).to_have_attribute('data-unread', 'false')
            assert_launcher_clearance(page)
            pending_route, result = pending_receivables.pop()
            pending_route.fulfill(status=200, headers=cors_headers, content_type="application/json", body=json.dumps(result))
            expect(launcher).to_have_attribute('data-unread', 'true')
            expect(launcher).to_have_attribute('data-character-state', 'terminado')
            expect(panel).to_be_hidden()
            expect(launcher).to_be_focused()
            if output:
                page.screenshot(path=str(output / f"secretario-plegado-{width}.png"))
            expect(launcher).to_have_attribute('data-character-state', 'espera', timeout=5500)
            expect(launcher).to_have_attribute('data-unread', 'true')
            expect(launcher.locator('.secretary-character')).to_have_attribute('data-animated', 'false')
            assert launcher.locator('.secretary-character').evaluate("node=>new URL(node.src).pathname.endsWith('.png')")
            launcher.click()
            expect(launcher).to_have_count(0)
            expect(panel).to_be_visible()
            answer = panel.locator(".secretary-turn-assistant").last
            expect(answer.locator(".secretary-bubble")).to_contain_text("Tienes 3 facturas pendientes de cobro por 1.680")
            expect(answer.locator(".secretary-bubble")).to_contain_text("Una está vencida")
            expect(answer.locator(".secretary-invoice")).to_have_count(3)
            expect(answer.locator(".secretary-invoice").filter(has_text="FC-0001")).to_contain_text("Vencida")
            expect(answer.locator(".secretary-invoice").filter(has_text="FC-0002")).to_contain_text("Vence")
            expect(answer.locator(".secretary-invoice").filter(has_text="FC-0003")).to_contain_text("450,00")
            expect(answer).not_to_contain_text("1250")
            for absent in ("FC-0004", "FC-0005", "FC-0006", "Presupuestos aceptados", "Costes registrados"):
                expect(answer).not_to_contain_text(absent)
            assert page.evaluate("state.view==='informes'&&document.body.classList.contains('secretary-home')")
            expect(page.locator(".finance-invoices, .finance-document-editor")).to_have_count(0)
            expect(activity).to_have_count(0)
            expect(answer.locator(".secretary-trace summary").first).to_contain_text("Actividad realizada")
            assert page.evaluate("""()=>{
              const user=document.querySelector('.secretary-turn-user .secretary-message-line');
              const bot=document.querySelector('.secretary-turn-assistant .secretary-message-line');
              return [user,bot].every(row=>{
                const avatar=row.querySelector('.secretary-avatar').getBoundingClientRect(),bubble=row.querySelector('.secretary-bubble').getBoundingClientRect();
                return Math.abs(avatar.bottom-bubble.bottom)<1 && (row===user?avatar.left>bubble.right:avatar.right<bubble.left);
              })
            }""")
            expect(answer.locator(".secretary-avatar-badge")).to_be_visible()
            assert_static_history(panel)
            wait_for_stable_view(page)
            if output:
                page.screenshot(path=str(output / f"secretario-facturas-centro-{width}.png"))
            answer.locator(".secretary-invoice").filter(has_text="FC-0001").get_by_role("button", name="Abrir factura").click()
            expect(page.locator(".finance-document-editor")).to_contain_text("Editando FC-0001")
            expect(page.locator("#paper")).to_contain_text("Espacio Olivo")
            assert page.locator(".inv-form").evaluate("node=>getComputedStyle(node).position==='static'")
            assert_secretary_clearance(page)
            wait_for_stable_view(page)
            if output:
                if width >= 1100:
                    page.locator("#paper").evaluate("(node)=>node.scrollIntoView({block:'start'})")
                expect(page.locator("#toast")).not_to_have_class(__import__("re").compile(r".*\bshow\b.*"))
                page.screenshot(path=str(output / f"secretario-factura-lateral-{width}.png"))
            panel.get_by_role("button", name="Volver al chat", exact=True).click()
            expect(answer.locator(".secretary-invoice")).to_have_count(3)
            assert page.evaluate("document.body.classList.contains('secretary-home')&&state.draft===null")
            page.locator("#secretary-message").fill("Abre la factura FC-0002")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            expect(page.locator(".finance-document-editor")).to_contain_text("Editando FC-0002")
            # The normal native editor close also returns to the conversation.
            page.get_by_role("button", name="← Todas las facturas", exact=True).click()
            expect(panel.locator(".secretary-invoice")).to_have_count(3)
            assert page.evaluate("document.body.classList.contains('secretary-home')")
            page.locator("#secretary-message").fill("¿Cuántas facturas tengo pendientes de cobrar?")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            paged = panel.locator(".secretary-turn-assistant").last
            expect(paged.locator(".secretary-invoice")).to_have_count(12)
            expect(paged).to_contain_text("Viendo 12 de 15 facturas")
            paged.get_by_role("button", name="Ver más", exact=True).click()
            expect(paged.locator(".secretary-invoice")).to_have_count(15)
            assert requests[-1]["invoicePage"]["offset"] == 12
            assert page.evaluate("document.body.classList.contains('secretary-home')")
            page.locator("#secretary-message").fill("Facturas pendientes de cobrar de Casa Lino en febrero de 2026")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            filtered = panel.locator(".secretary-turn-assistant").last
            expect(filtered.locator(".secretary-bubble")).to_contain_text("Tienes 1 factura pendiente de cobro por 750")
            expect(filtered).to_contain_text("Casa Lino · Emisión: 2026-02-01 a 2026-02-28")
            expect(filtered.locator(".secretary-invoice")).to_have_count(1)
            expect(filtered.locator(".secretary-invoice")).to_contain_text("FC-0002")
            assert page.evaluate("document.body.classList.contains('secretary-home')")
            print(f"{width} PASS: verified pending rows, click and explicit open, native close, return and paging", flush=True)
            page.evaluate("data=>{Object.assign(state,data);ModernoSecretary.reset();go('informes');ModernoSecretary.openFinance();fixtureVersions();window.demoRecords=fixtureDocuments()}", acceptance_fixture)

            def ask_demo(question, message, docs):
                page.locator("#secretary-message").fill(question)
                panel.get_by_role("button", name="Enviar", exact=True).click()
                turn = panel.locator(".secretary-turn-assistant").last
                expect(turn.locator(".secretary-bubble")).to_have_text(message)
                expect(turn.locator(".secretary-invoice strong").filter(has_text=__import__("re").compile(r"^F-DEMO-\d+$"))).to_have_text(docs)
                assert page.evaluate("document.body.classList.contains('secretary-home')")
                return turn

            all_text = "Tienes 3 facturas pendientes de cobro por 2.300 €. De ellas, 2 están vencidas."
            year_text = "De las emitidas en 2026, tienes 2 facturas pendientes por 1.500 €. Una está vencida."
            ask_demo("que facturas quedan por que me pagen", all_text, ["F-DEMO-003", "F-DEMO-001", "F-DEMO-002"])
            ask_demo("solo las de este año", year_text, ["F-DEMO-001", "F-DEMO-002"])
            ask_demo("enséñame solo las vencidas", "De esas facturas de 2026, queda 1 vencida por 1.000 €.", ["F-DEMO-001"])
            detail = ask_demo("¿Cuánto falta por cobrar de la F-DEMO-002?",
                "Quedan 500 € por cobrar. La factura es de 1.200 € y tiene 700 € de cobros registrados.", ["F-DEMO-002"])
            expect(detail.locator(".secretary-invoice")).to_contain_text("500,00")
            if output:
                wait_for_stable_view(page)
                page.screenshot(path=str(output / f"secretario-continuidad-{width}.png"))
            detail.get_by_role("button", name="Abrir factura", exact=True).click()
            expect(page.locator(".finance-document-editor")).to_contain_text("Editando F-DEMO-002")
            expect(page.locator("body")).to_have_class(__import__("re").compile(r".*secretary-lateral.*"))
            expect(detail.locator(".secretary-invoice")).to_contain_text("F-DEMO-002")
            assert page.evaluate("fixtureDocuments()===demoRecords")
            panel.get_by_role("button", name="Volver al chat", exact=True).click()
            expect(detail.locator(".secretary-invoice")).to_contain_text("F-DEMO-002")
            assert page.evaluate("document.body.classList.contains('secretary-home')&&fixtureDocuments()===demoRecords")

            for use_form in [True, False]:
                ask_demo("¿Qué ingresos de facturas faltan?", "¿Te refieres a facturas pendientes de cobro?", [])
                reply = "pendientes de cobro y solo de este año"
                if use_form:
                    panel.get_by_role("textbox", name="Otra respuesta: ¿Te refieres a facturas pendientes de cobro?", exact=True).fill(reply)
                    panel.get_by_role("button", name="Continuar", exact=True).click()
                    expect(panel.locator(".secretary-turn-assistant .secretary-bubble").last).to_have_text(year_text)
                    expect(panel.locator(".secretary-turn-user .secretary-bubble").last).to_have_text(reply)
                    assert requests[-1]["automatic"] is True and requests[-1]["message"] == reply
                else:
                    ask_demo(reply, year_text, ["F-DEMO-001", "F-DEMO-002"])
                    assert requests[-1]["automatic"] is False

            ambiguity = "¿Te refieres al cliente Casa Sol o al proyecto Casa Sol?"
            ask_demo("Muéstrame las pendientes de Casa Sol de este año", ambiguity, [])
            expect(panel.get_by_role("button", name="Cliente Casa Sol", exact=True)).to_be_visible()
            expect(panel.get_by_role("button", name="Proyecto Casa Sol", exact=True)).to_be_visible()
            ask_demo("Cliente Casa Sol", "No tienes facturas pendientes de cobro con esos filtros.", [])
            ask_demo("Muéstrame las pendientes de Casa Sol de este año", ambiguity, [])
            panel.get_by_role("button", name="Proyecto Casa Sol", exact=True).click()
            panel.get_by_role("button", name="Continuar", exact=True).click()
            expect(panel.locator(".secretary-turn-assistant .secretary-bubble").last).to_have_text(
                "De las emitidas en 2026, tienes 1 factura pendiente por 1.000 €. Una está vencida.")
            expect(panel.locator(".secretary-turn-user .secretary-bubble").last).to_have_text("Proyecto Casa Sol")
            ask_demo("solo las de 2024", "No tienes facturas pendientes de cobro con esos filtros.", [])
            error = ask_demo("solo las de 2025", "No he podido consultar las facturas ahora. Puedes reintentarlo.", [])
            error.get_by_role("button", name="Volver a intentar", exact=True).click()
            last = panel.locator(".secretary-turn-assistant").last
            expect(last.locator(".secretary-invoice")).to_contain_text("F-DEMO-003")
            assert requests[-1]["receivableContext"]["scope"]["projectId"] == "9001"
            print(f"{width} PASS: exact acceptance dialogue, form and composer, invoice detail, choices, empty and failed read", flush=True)
            page.evaluate("Object.assign(state,window.originalInvoicesFixture);ModernoSecretary.reset();go('informes');ModernoSecretary.openFinance();fixtureVersions()")

            # A requested draft may finish while folded. It becomes reviewable
            # without opening an editor until the user chooses its action.
            page.locator('#secretary-message').fill('consulta lenta preparar factura')
            panel.get_by_role('button', name='Enviar', exact=True).click()
            expect(panel).to_have_attribute('data-character-state', 'trabajando')
            page.wait_for_timeout(30)
            assert len(pending) == 1
            panel.get_by_role('button', name='Plegar el Secretario', exact=True).click()
            pending.pop().fulfill(status=200, headers=cors_headers, content_type='application/json', body=json.dumps(proposal()))
            expect(page.locator('#secretary-reopen')).to_have_attribute('data-unread', 'true')
            expect(panel).to_be_hidden()
            assert page.evaluate("state.draft===null&&state.invoices.length===0&&state.view==='informes'")
            page.locator('#secretary-reopen').click()
            expect(panel.get_by_role('button', name='Abrir borrador', exact=True)).to_be_visible()
            panel.get_by_role('button', name='Abrir borrador', exact=True).click()
            expect(page.locator('.finance-document-editor')).to_be_visible()
            assert page.evaluate("state.draft.lines[0].qty===2&&state.invoices.length===0")
            page.evaluate("state.draft=null;state.fView=null;ModernoSecretary.reset();go('informes');ModernoSecretary.openFinance();fixtureVersions()")

            page.locator("#secretary-message").fill("Crear una factura de 2 horas de asesoría a 100 por hora")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            expect(panel.get_by_role("button", name="Cliente ficticio", exact=True)).to_be_visible()
            expect(panel).to_have_attribute('data-character-state', 'aviso')
            assert page.evaluate("document.body.classList.contains('secretary-home')")
            expect(panel.get_by_role("textbox", name="Otra respuesta: Elige el cliente", exact=True)).to_be_visible()
            panel.get_by_role("button", name="Cliente ficticio", exact=True).click()
            panel.get_by_role("button", name="Continuar", exact=True).click()
            page.wait_for_function("state.view==='facturas'&&state.draft?.lines?.[0]?.qty===2")
            expect(page.locator("body")).to_have_class(__import__("re").compile(r".*secretary-lateral.*"))
            expect(page.locator(".finance-document-editor")).to_be_visible()
            expect(page.locator("#paper")).to_contain_text("242,00")
            assert page.evaluate("fixtureDocuments()===fixtureBaseline")
            assert requests[-1]["history"][0]["role"] == "user"
            assert page.evaluate("state.draft.editRef===null&&state.invoices.length===0")
            expect(panel.locator(".secretary-thread")).not_to_contain_text("contact:0")
            expect(panel.locator(".secretary-turn-user .secretary-bubble").last).to_have_text("Cliente ficticio")
            wait_for_stable_view(page)
            assert_secretary_clearance(page)
            assert page.locator("#secretary-message").evaluate("element=>getComputedStyle(element).borderTopWidth==='0px'&&getComputedStyle(element).boxShadow==='none'")
            assert panel.locator("label[for=secretary-message]").evaluate("element=>element.getBoundingClientRect().width<=1&&element.getBoundingClientRect().height<=1")
            if output:
                page.screenshot(path=str(output / f"secretario-borrador-{width}.png"), full_page=True)

            # A new request must not overwrite or silently leave the active draft.
            page.locator("#secretary-message").fill("Abre facturas")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            panel.get_by_role("button", name="Abrir facturas", exact=True).click()
            expect(page.locator("#modalBox")).to_contain_text("a medias")
            assert page.evaluate("state.draft.lines[0].qty===2")
            page.locator("#modalBox").get_by_role("button", name="Seguir editando", exact=True).click()
            panel.get_by_role("button", name="Plegar el Secretario", exact=True).click()
            expect(panel).to_be_hidden()
            assert_launcher_clearance(page)
            page.locator('#secretary-reopen').click()
            expect(panel.locator(".secretary-bubble").get_by_text("El borrador está preparado para revisar.", exact=True)).to_be_visible()

            # Resume + edit a saved draft, preserving its original metadata and date.
            page.evaluate("""()=>{
              state.borradores=[{id:42,kind:'factura',draft:{...structuredClone(state.draft),date:'2026-10-01',num:37,due:'2026-12-31',lines:[{...state.draft.lines[0],sourceProof:{revision:'original'}}]}}];
              state.draft=null;state.fView=null;render();fixtureVersions();
            }""")
            page.locator("#secretary-message").fill("editar guardado: 4 horas a 125 por hora")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            page.wait_for_function("state.draft?._draftId===42&&state.draft.lines[0].qty===4")
            assert page.evaluate("state.draft.lines[0].price===125&&state.draft.lines[0].sourceProof.revision==='original'&&state.draft.date==='2026-10-01'&&state.draft.num===37")
            assert page.evaluate("state.borradores[0].draft.lines[0].qty===2&&state.invoices.length===0")

            # Consent is optional. Only a deliberate rating sends an enumerated event.
            panel.get_by_label("Opciones del Secretario", exact=True).click()
            consent = panel.get_by_label("Ayudar a mejorar el Secretario", exact=True)
            expect(consent).to_be_enabled()
            consent.check()
            expect(consent).to_be_checked()
            panel.get_by_label("Opciones del Secretario", exact=True).click()
            panel.get_by_role("button", name="Sí", exact=True).last.click()
            panel.get_by_role("combobox", name="Motivo de la valoración", exact=True).select_option("saved_time")
            panel.get_by_role("button", name="Compartir valoración", exact=True).click()
            page.wait_for_function("window.__secretaryFeedbackEvents.length===1")
            event = page.evaluate("window.__secretaryFeedbackEvents[0]")
            assert set(event) == {"version", "event", "task", "outcome", "reason"}
            assert event["task"] == "invoice_create"
            panel.get_by_label("Opciones del Secretario", exact=True).click()
            page.evaluate("window.__secretaryFailWithdrawal=true")
            consent.uncheck()
            expect(panel.get_by_role("button", name="Reintentar retirada", exact=True)).to_be_visible()
            expect(consent).not_to_be_checked()
            page.evaluate("window.__secretaryFailWithdrawal=false")
            panel.get_by_role("button", name="Reintentar retirada", exact=True).click()
            page.wait_for_function("!window.__secretaryConsent.enabled&&window.__secretaryFeedbackEvents.length===0")
            panel.get_by_label("Opciones del Secretario", exact=True).click()
            expect(panel.get_by_role("button", name="Sí", exact=True)).to_have_count(0)

            # One conversation follows the current project, including after folding.
            page.evaluate("state.draft=null;state.fView=null;go('proyecto',9001)")
            expect(panel).to_be_visible()
            expect(panel.locator(".secretary-context")).to_have_text("Proyecto ficticio")
            expect(panel.locator(".secretary-bubble").get_by_text("El borrador está preparado para revisar.", exact=True).first).to_be_visible()
            page.locator("#secretary-message").fill("respuesta segura")
            wait_for_stable_view(page)
            assert_secretary_clearance(page)
            # A growing save-status message must move the composer above it too.
            page.evaluate("""()=>{
              const sync=document.getElementById('syncTag');
              window.fixtureSyncPresentation={style:sync.getAttribute('style'),text:sync.querySelector('.txt').textContent};
              sync.style.maxWidth='200px';sync.style.whiteSpace='normal';
              sync.querySelector('.txt').textContent='Estado ficticio de guardado con varias líneas para comprobar que todos los controles permanecen accesibles.';
            }""")
            assert_secretary_clearance(page)
            if output:
                page.screenshot(path=str(output / f"secretario-proyecto-{width}.png"), full_page=True)
            page.evaluate("""()=>{const sync=document.getElementById('syncTag'),saved=window.fixtureSyncPresentation;
              if(saved.style===null)sync.removeAttribute('style');else sync.setAttribute('style',saved.style);
              sync.querySelector('.txt').textContent=saved.text;
            }""")
            assert_secretary_clearance(page)
            panel.get_by_role("button", name="Enviar", exact=True).click()
            expect(panel.locator(".secretary-bubble").get_by_text('<img src=x onerror="window.injected=true">', exact=True)).to_be_visible()
            assert page.evaluate("window.injected!==true")
            panel.locator(".secretary-more-sources summary").click()
            expect(panel.get_by_role("button", name="Fuente ficticia 24", exact=True)).to_be_visible()
            page.locator("#secretary-message").fill("fallo disponible")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            expect(panel.locator(".secretary-bubble").get_by_text("El Secretario todavía no está disponible. Puedes seguir usando las pantallas y editores de Finanzas.", exact=True)).to_be_visible()
            expect(panel).to_have_attribute('data-character-state', 'aviso')

            # Browser network failures stay in Spanish and offer an explicit retry.
            page.locator("#secretary-message").fill("fallo red")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            expect(panel.locator(".secretary-bubble").get_by_text("No se ha podido conectar con el Secretario. Comprueba la conexión y vuelve a intentarlo.", exact=True)).to_be_visible()
            expect(panel.get_by_role("button", name="Volver a intentar", exact=True).last).to_be_visible()
            expect(panel).to_have_attribute('data-character-state', 'aviso')

            page.locator("#secretary-message").fill("consulta lenta para detener")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            expect(panel.locator('.secretary-working [aria-current="step"]')).to_be_visible()
            panel.get_by_role("button", name="Detener", exact=True).click()
            stopped = panel.locator(".secretary-turn-assistant").last
            expect(stopped.locator(".secretary-bubble")).to_contain_text("Consulta detenida.")
            stopped.locator(".secretary-activity-heading").click()
            expect(stopped.locator('[data-status="stopped"]')).to_contain_text("Consulta detenida")
            expect(stopped.get_by_role("button", name="Volver a intentar", exact=True)).to_be_visible()
            expect(panel.locator('.secretary-working')).to_have_count(0)
            expect(panel).not_to_have_attribute('data-character-state', 'terminado')
            expect(page.locator('img[data-secretary-presence][data-character-state=trabajando][data-animated=true]')).to_have_count(0)
            for request_route in pending:
                try:
                    request_route.abort()
                except Exception:
                    pass
            pending.clear()

            # A slow answer cannot cross from one project context into another.
            page.locator("#secretary-message").fill("consulta lenta del proyecto")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            expect(panel.locator(".secretary-working").get_by_text("Consultando las tareas y documentos autorizados de este proyecto…", exact=True)).to_be_visible()
            page.wait_for_timeout(50)
            page.evaluate("""()=>{state.projects.push({id:9002,num:'PR-9002',name:'Segundo proyecto ficticio',brand:'cm',client:'Cliente ficticio',status:'En progreso',tasks:[],files:[]});go('proyecto',9002)}""")
            expect(panel.locator(".secretary-bubble").get_by_text("La consulta se detuvo porque cambiaste de pantalla o de proyecto. Puedes volver a hacerla en el contexto actual.", exact=True)).to_be_visible()
            for request_route in list(pending):
                try:
                    request_route.fulfill(status=200, headers=cors_headers, content_type="application/json", body=json.dumps({"requestId": "late-project", "status": "answer", "message": "RESPUESTA DEL PROYECTO ANTERIOR", "sources": [], "questions": [], "actions": [], "trace": []}))
                except Exception:
                    pass
            pending.clear()
            expect(panel.get_by_text("RESPUESTA DEL PROYECTO ANTERIOR", exact=True)).to_have_count(0)

            # Date/tax-only changes in a new editor are protected like line edits.
            page.evaluate("""()=>{state.draft=null;state.fView='nuevo';go('facturas')}""")
            page.wait_for_function("state.draft&&state.view==='facturas'")
            page.locator("input[type=date]").nth(1).fill("2027-01-31")
            page.locator("input[type=date]").nth(1).dispatch_event("change")
            page.locator("#secretary-message").fill("Abre facturas")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            panel.get_by_role("button", name="Abrir facturas", exact=True).last.click()
            expect(page.locator("#modalBox")).to_contain_text("a medias")
            page.locator("#modalBox").get_by_role("button", name="Seguir editando", exact=True).click()

            # A response belonging to a signed-out user cannot repopulate the chat.
            page.locator("#secretary-message").fill("consulta lenta")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            page.wait_for_timeout(100)
            assert pending
            page.evaluate("""()=>{
              state.sessionUser={id:'33333333-3333-4333-8333-333333333333',name:'Otra persona',mail:'other@example.invalid'};
              window.__secretaryAuth.user.id=state.sessionUser.id;render();
            }""")
            expect(panel.get_by_text("El borrador está preparado para revisar.", exact=True)).to_have_count(0)
            for request_route in pending:
                try:
                    request_route.fulfill(status=200, headers=cors_headers, content_type="application/json", body=json.dumps({"requestId": "late", "status": "answer", "message": "PRIVATE OLD RESPONSE", "sources": [], "questions": [], "actions": [], "trace": []}))
                except Exception:
                    pass  # AbortController may already have closed the intercepted request.
            expect(panel.get_by_text("PRIVATE OLD RESPONSE", exact=True)).to_have_count(0)
            assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
            assert not forbidden_writes, forbidden_writes
            assert not errors, errors
            print(width, "PASS: central/lateral, questions, real drafts, draft guards, saved edits, consent and withdrawal, sources, unavailable backend, stale identity", flush=True)
            page.close()
        browser.close()
finally:
    server.terminate()
    server.wait(timeout=5)
