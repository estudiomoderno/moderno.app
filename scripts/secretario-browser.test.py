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
                    assert set(body).issubset({"studyId", "message", "history", "context", "answers"})
                    assert body["studyId"] == "11111111-1111-4111-8111-111111111111"
                    requests.append(body)
                    message = body["message"]
                    if "consulta lenta" in message:
                        pending.append(request_route)
                        return
                    if "fallo disponible" in message:
                        request_route.fulfill(status=503, headers=cors_headers, content_type="application/json", body=json.dumps({"error": {"code": "not_configured", "message": "Fixture"}}))
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
            if output:
                page.screenshot(path=str(output / f"secretario-central-{width}.png"), full_page=True)

            page.locator("#secretary-message").fill("Crear una factura de 2 horas de asesoría a 100 por hora")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            expect(panel.get_by_role("button", name="Cliente ficticio", exact=True)).to_be_visible()
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
            expect(panel.locator(".secretary-thread")).to_contain_text("Elige el cliente Cliente ficticio")
            wait_for_stable_view(page)
            assert_secretary_clearance(page)
            assert page.locator("#secretary-message").evaluate("element=>getComputedStyle(element).borderTopWidth==='0px'&&getComputedStyle(element).boxShadow==='none'")
            assert panel.locator("label[for=secretary-message]").evaluate("element=>element.getBoundingClientRect().width<=1&&element.getBoundingClientRect().height<=1")
            if output:
                page.screenshot(path=str(output / f"secretario-borrador-{width}.png"), full_page=True)

            # A new request must not overwrite or silently leave the active draft.
            page.locator("#secretary-message").fill("Abre facturas")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            expect(page.locator("#modalBox")).to_contain_text("a medias")
            assert page.evaluate("state.draft.lines[0].qty===2")
            page.locator("#modalBox").get_by_role("button", name="Seguir editando", exact=True).click()
            panel.get_by_role("button", name="Plegar el Secretario", exact=True).click()
            expect(panel).to_be_hidden()
            page.get_by_role("button", name="Nuestro Secretario", exact=True).click()
            expect(panel.get_by_text("El borrador está preparado para revisar.", exact=True)).to_be_visible()

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
            expect(panel.get_by_text("El borrador está preparado para revisar.", exact=True).first).to_be_visible()
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
            expect(panel.get_by_text('<img src=x onerror="window.injected=true">', exact=True)).to_be_visible()
            assert page.evaluate("window.injected!==true")
            panel.locator(".secretary-more-sources summary").click()
            expect(panel.get_by_role("button", name="Fuente ficticia 24", exact=True)).to_be_visible()
            page.locator("#secretary-message").fill("fallo disponible")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            expect(panel.get_by_text("El Secretario todavía no está disponible. Puedes seguir usando las pantallas y editores de Finanzas.", exact=True)).to_be_visible()

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
