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
desktop_only = os.environ.get('SECRETARIO_DESKTOP_ONLY') == '1'
mobile_only = os.environ.get('SECRETARIO_MOBILE_ONLY') == '1'
if desktop_only and mobile_only:
    raise ValueError('Choose either SECRETARIO_DESKTOP_ONLY or SECRETARIO_MOBILE_ONLY')
if output:
    output.mkdir(parents=True, exist_ok=True)
backend = "https://chsilowzrtumbcofspwv.supabase.co"
endpoint = backend + "/functions/v1/secretario"
stamp = "2026-11-22T09:00:00Z"
source_versions = {key: stamp for key in ["config", "contactos", "proyectos", "presupuestos", "facturas"]}
invoice_fixture_script = ["node", "scripts/secretario-receivables-fixture.mjs"]
invoice_fixture = json.loads(subprocess.check_output(invoice_fixture_script, cwd=repo, input=b""))
acceptance_fixture = json.loads(subprocess.check_output([*invoice_fixture_script, "--acceptance"], cwd=repo, input=b""))
tiny_png = (repo / "app/brand/icon-16.png").read_bytes()

# Exact fictional records from the conversation guide. This fixture remains
# separate from the older acceptance dataset so both contracts stay covered.
guide_browser_fixture = {
    "clients": [
        {"id": "ana", "name": "Ana Vega", "fiscal": "Ana Vega", "type": "Cliente", "brand": "cm"},
        {"id": "bruno", "name": "Bruno Rey", "fiscal": "Bruno Rey", "type": "Cliente", "brand": "cm"},
        {"id": "alfonso", "name": "Alfonso Cerropuerta", "fiscal": "Alfonso Cerropuerta", "type": "Cliente", "brand": "cm"},
    ],
    "projects": [
        {"id": 9001, "num": "PR-PATIO", "name": "Patio Demo", "brand": "cm", "client": "Ana Vega", "status": "En curso", "tasks": [], "files": []},
        {"id": 9002, "num": "PR-ALBA", "name": "Alba Demo", "brand": "cm", "client": "Bruno Rey", "status": "En curso", "tasks": [], "files": []},
    ],
    "invoices": [
        {"ref": "F-DEMO-01", "client": "Ana Vega", "clientIdx": 0, "projectId": 9001, "brand": "cm", "date": "2026-11-01", "due": "2026-11-10", "total": 1200, "status": "env", "currency": "EUR", "lines": [{"name": "Servicio ficticio", "qty": 1, "unit": "ud", "price": 1200}]},
        {"ref": "F-DEMO-02", "client": "Ana Vega", "clientIdx": 0, "projectId": 9001, "brand": "cm", "date": "2026-11-15", "due": "2026-12-10", "total": 600, "status": "env", "currency": "EUR", "lines": [{"name": "Servicio ficticio", "qty": 1, "unit": "ud", "price": 600}]},
        {"ref": "F-DEMO-03", "client": "Bruno Rey", "clientIdx": 1, "projectId": 9002, "brand": "cm", "date": "2025-12-20", "due": "2026-01-20", "total": 700, "status": "env", "currency": "EUR", "lines": [{"name": "Servicio ficticio", "qty": 1, "unit": "ud", "price": 700}]},
        {"ref": "F-DEMO-04", "client": "Ana Vega", "clientIdx": 0, "projectId": 9001, "brand": "cm", "date": "2026-10-10", "due": "2026-11-10", "total": 900, "status": "pag", "currency": "EUR", "lines": [{"name": "Servicio ficticio", "qty": 1, "unit": "ud", "price": 900}]},
    ],
    "entries": [
        {"id": 101, "link": "F-DEMO-01", "client": "Ana Vega", "pid": 9001, "brand": "cm", "kind": "in", "concept": "Factura F-DEMO-01 · Ana Vega", "date": "01/11/2026", "due": "10/11/2026", "amount": 1200, "base": 1200, "currency": "EUR", "cobros": [{"amount": 400, "date": "05/11/2026"}], "status": "pend"},
        {"id": 102, "link": "F-DEMO-02", "client": "Ana Vega", "pid": 9001, "brand": "cm", "kind": "in", "concept": "Factura F-DEMO-02 · Ana Vega", "date": "15/11/2026", "due": "10/12/2026", "amount": 600, "base": 600, "currency": "EUR", "cobros": [], "status": "pend"},
        {"id": 103, "link": "F-DEMO-03", "client": "Bruno Rey", "pid": 9002, "brand": "cm", "kind": "in", "concept": "Factura F-DEMO-03 · Bruno Rey", "date": "20/12/2025", "due": "20/01/2026", "amount": 700, "base": 700, "currency": "EUR", "cobros": [{"amount": 200, "date": "15/01/2026"}], "status": "pend"},
        {"id": 104, "link": "F-DEMO-04", "client": "Ana Vega", "pid": 9001, "brand": "cm", "kind": "in", "concept": "Factura F-DEMO-04 · Ana Vega", "date": "10/10/2026", "due": "10/11/2026", "amount": 900, "base": 900, "currency": "EUR", "cobros": [{"amount": 900, "date": "20/10/2026"}], "status": "cobr"},
    ],
}

guide_rows = {
    "F-DEMO-01": {"kind": "invoice", "id": "F-DEMO-01", "label": "F-DEMO-01", "brand": "cm", "projectId": "9001", "client": "Ana Vega", "currency": "EUR", "due": "2026-11-10", "overdue": True, "partial": True, "pending": 800},
    "F-DEMO-02": {"kind": "invoice", "id": "F-DEMO-02", "label": "F-DEMO-02", "brand": "cm", "projectId": "9001", "client": "Ana Vega", "currency": "EUR", "due": "2026-12-10", "overdue": False, "partial": False, "pending": 600},
    "F-DEMO-03": {"kind": "invoice", "id": "F-DEMO-03", "label": "F-DEMO-03", "brand": "cm", "projectId": "9002", "client": "Bruno Rey", "currency": "EUR", "due": "2026-01-20", "overdue": True, "partial": True, "pending": 500},
}


def guide_receivables(message, ids, scope):
    rows = [dict(guide_rows[ref]) for ref in ids]
    amount = sum(row["pending"] for row in rows)
    version = json.dumps(["guide", ids, scope], sort_keys=True, ensure_ascii=False)
    return {
        "requestId": "guide-" + str(len(ids)) + "-" + str(amount), "status": "answer", "message": message,
        "sources": rows, "questions": [], "actions": [], "trace": [],
        "receivables": {"count": len(rows), "overdue": sum(bool(row["overdue"]) for row in rows),
                        "amounts": [{"currency": "EUR", "amount": amount}], "review": 0, "reviewReasons": [],
                        "offset": 0, "next": None, "version": version, "projectId": None,
                        "scopeLabel": "Guía ficticia", "intent": "pending_invoices"},
        "receivableContext": {"scope": scope},
    }

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
window.__secretaryRecognitions=[];window.__secretarySpeechAvailability=[];window.__secretaryOcrCalls=[];
window.__secretaryFailWithdrawal=false;
class FictionalLocalSpeechRecognition {
 static async available(options){window.__secretarySpeechAvailability.push(structuredClone(options));return 'available'}
 static async install(){throw Error('The integrated fixture must not download a language')}
 constructor(){this.processLocally=false;window.__secretaryRecognitions.push(this)}
 start(){this.started=true;queueMicrotask(()=>this.onstart?.())}
 stop(){this.stopped=true;this.onend?.()}
 abort(){this.aborted=true;this.onerror?.({error:'aborted'});this.onend?.()}
 emit(text,final=true){const result=Object.assign([{transcript:text}],{isFinal:final});this.onresult?.({resultIndex:0,results:[result]})}
 end(){this.onend?.()}
}
window.SpeechRecognition=FictionalLocalSpeechRecognition;
window.Tesseract={async createWorker(language,workers,options){
 window.__secretaryOcrCalls.push({language,workers,workerPath:options?.workerPath,corePath:options?.corePath,langPath:options?.langPath,cacheMethod:options?.cacheMethod,workerBlobURL:options?.workerBlobURL});
 return {async recognize(){return {data:{text:'DOCUMENTO FICTICIO\nIMPORTE TOTAL 321 EUR'}}},async terminate(){}};
}};
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
    try:
        page.wait_for_function("""()=>{
          const panel=document.getElementById('moderno-secretary'),sync=document.getElementById('syncTag');
          if(!panel||!sync)return false;
          const p=panel.getBoundingClientRect(),s=sync.getBoundingClientRect(),button=panel.querySelector('button[type=submit]')?.getBoundingClientRect();
          if(!button)return false;
          const disjoint=rect=>rect.right<=s.left||rect.left>=s.right||rect.bottom<=s.top-10||rect.top>=s.bottom+10;
          return panel.parentElement===document.body&&disjoint(p)&&disjoint(button)&&p.top>=0&&p.bottom<=innerHeight;
        }""")
    except Exception:
        geometry = page.evaluate("""()=>{
          const panel=document.getElementById('moderno-secretary'),sync=document.getElementById('syncTag'),button=panel?.querySelector('button[type=submit]');
          const rect=node=>node?Object.fromEntries(['top','right','bottom','left','width','height'].map(key=>[key,node.getBoundingClientRect()[key]])):null;
          const style=node=>node?Object.fromEntries(['position','top','right','bottom','left','width','height','paddingBottom','overflow'].map(key=>[key,getComputedStyle(node)[key]])):null;
          return {viewport:{width:innerWidth,height:innerHeight},body:document.body.className,panel:{rect:rect(panel),style:style(panel),parent:panel?.parentElement?.tagName},
            sync:{rect:rect(sync),style:style(sync)},button:{rect:rect(button),style:style(button)}};
        }""")
        print('Secretary clearance geometry:', json.dumps(geometry, ensure_ascii=False, sort_keys=True), flush=True)
        raise


def assert_launcher_clearance(page):
    """The launcher fits the notification row and remains distinct from other tools."""
    page.wait_for_function("""()=>{
      const launcher=document.getElementById('secretary-reopen');
      const bell=launcher?.nextElementSibling;
      if(!bell?.matches('.ha-notification-host,.ha-notifications'))return false;
      const r=launcher.getBoundingClientRect(),b=bell.getBoundingClientRect();
      const touch=matchMedia('(pointer:coarse)').matches;
      const heightFits=touch?r.height>=44:Math.abs(r.height-b.height)<=1;
      return heightFits&&r.width>=(touch?44:36)&&r.top>=0&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight
        &&b.width>0&&r.right<=b.left&&b.left-r.right<=10&&Math.abs((r.top+r.bottom)-(b.top+b.bottom))<=2
        &&getComputedStyle(launcher).backgroundColor==='rgb(255, 186, 122)';
    }""", timeout=6000)


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
        viewports = [(1440, 1000)] if desktop_only else [(390, 844)] if mobile_only else [(1440, 1000), (390, 844)]
        for width, height in viewports:
            page = browser.new_page(viewport={"width": width, "height": height}, locale="es-ES")
            errors, requests, forbidden_writes, pending = [], [], [], []
            pending_receivables = []
            guide_requests = []
            integrated_tool_requests = []
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
                    assert set(body).issubset({"studyId", "message", "automatic", "history", "context", "answers", "invoicePage", "receivableContext", "documentPage", "documentContext", "financeContext", "requestKey", "mentions", "attachments"})
                    assert body["studyId"] == "11111111-1111-4111-8111-111111111111"
                    if not body.get("invoicePage"):
                        assert isinstance(body.get("automatic"), bool)
                        assert body["automatic"] is bool(body.get("answers"))
                    requests.append(body)
                    message = body["message"]
                    if message == "@Proyecto ficticio revisa el contexto":
                        assert isinstance(body.get("requestKey"), str) and body["requestKey"]
                        assert body.get("mentions") == [{
                            "label": "Proyecto ficticio",
                            "identity": {"kind": "project", "id": "9001"},
                        }]
                        assert not body.get("attachments")
                        integrated_tool_requests.append(("mention", body))
                        response = {
                            "requestId": "integrated-mention", "status": "answer",
                            "message": "Referencia ficticia verificada.", "sources": [],
                            "questions": [], "actions": [], "trace": [],
                        }
                        request_route.fulfill(status=200, headers=cors_headers, content_type="application/json", body=json.dumps(response))
                        return
                    if message == "¿Qué pone en el archivo adjunto?":
                        assert isinstance(body.get("requestKey"), str) and body["requestKey"]
                        attachments = body.get("attachments")
                        assert isinstance(attachments, list) and len(attachments) == 1
                        attachment = attachments[0]
                        assert attachment["name"] == "adjunto-ficticio.png"
                        assert attachment["mime"] == "image/png"
                        assert attachment["totalPages"] == 1 and attachment["status"] == "complete"
                        assert attachment["pages"] == [{"page": 1, "text": "DOCUMENTO FICTICIO\nIMPORTE TOTAL 321 EUR"}]
                        assert "source" not in attachment
                        assert not body.get("mentions")
                        integrated_tool_requests.append(("attachment", body))
                        response = {
                            "requestId": "integrated-attachment", "status": "answer",
                            "message": "El adjunto ficticio indica un importe total de 321 EUR.",
                            "sources": [], "questions": [], "actions": [], "trace": [],
                            "attachmentSources": [{"file": "adjunto-ficticio.png", "page": 1,
                                                   "excerpt": "IMPORTE TOTAL 321 EUR"}],
                            "attachmentCoverage": {"processed": 1, "total": 1, "partial": False},
                        }
                        request_route.fulfill(status=200, headers=cors_headers, content_type="application/json", body=json.dumps(response))
                        return
                    if "consulta lenta" in message:
                        pending.append(request_route)
                        return
                    if "fallo red" in message:
                        request_route.abort()
                        return
                    if "fallo disponible" in message:
                        request_route.fulfill(status=503, headers=cors_headers, content_type="application/json", body=json.dumps({"error": {"code": "not_configured", "message": "Fixture"}}))
                        return
                    quota_scopes = {
                        "cuota diaria ficticia": "daily", "cuota mensual ficticia": "monthly",
                        "cuota compartida ficticia": "global_monthly", "cuota antigua ficticia": None,
                    }
                    if message in quota_scopes:
                        scope = quota_scopes[message]
                        error = {"code": "quota_exhausted", "message": "Raw provider error must not become the assistant response"}
                        if scope is not None:
                            error["quotaScope"] = scope
                        request_route.fulfill(status=429, headers=cors_headers, content_type="application/json",
                                              body=json.dumps({"requestId": "quota-fixture-12345678", "error": error}))
                        return
                    guide_questions = {
                        "¿Qué me falta por cobrar?", "Solo las de este año.", "Y de esas, las vencidas.",
                        "Ábrela.", "¿Por qué pone 1.200 si me debe 800?",
                    }
                    if message in guide_questions:
                        guide_requests.append(body)
                        blank_scope = {"projectId": None, "clientKey": None, "date": None, "overdue": None,
                                       "reference": None, "brand": None, "currency": None}
                        annual_scope = {**blank_scope, "date": {"from": "2026-01-01", "to": "2026-12-31", "field": "issued"}}
                        overdue_scope = {**annual_scope, "overdue": "overdue"}
                        if message == "¿Qué me falta por cobrar?":
                            assert not body.get("receivableContext")
                            response = guide_receivables("Te quedan 1.900 € por cobrar en 3 facturas. Aquí las tienes.",
                                                         ["F-DEMO-01", "F-DEMO-02", "F-DEMO-03"], blank_scope)
                        elif message == "Solo las de este año.":
                            assert body["receivableContext"]["scope"] == blank_scope
                            response = guide_receivables("De las emitidas en 2026, quedan 2 facturas por cobrar: 1.400 €.",
                                                         ["F-DEMO-01", "F-DEMO-02"], annual_scope)
                        elif message == "Y de esas, las vencidas.":
                            assert body["receivableContext"]["scope"] == annual_scope
                            response = guide_receivables("Hay una vencida, con 800 € pendientes.", ["F-DEMO-01"], overdue_scope)
                        elif message == "Ábrela.":
                            assert body["receivableContext"]["scope"] == overdue_scope
                            assert [row["id"] for row in body["context"]["focus"]["results"]] == ["F-DEMO-01"]
                            source = dict(guide_rows["F-DEMO-01"])
                            response = {"requestId": "guide-open", "status": "answer", "message": "Te abro F-DEMO-01.",
                                        "sources": [source], "questions": [], "trace": [], "preserveQueryContext": True,
                                        "actions": [{"id": "guide-open-document", "type": "open_document", "label": "Abrir factura",
                                                     "viewMode": "read", "openImmediately": True, "payload": source,
                                                     "sourceVersions": {"facturas": stamp}}]}
                        else:
                            assert body["receivableContext"]["scope"] == overdue_scope
                            assert body["context"]["focus"]["document"]["id"] == "F-DEMO-01"
                            detail_scope = {**overdue_scope, "reference": "f-demo-01"}
                            response = guide_receivables("Los 1.200 € son el total de la factura. Tiene un cobro de 400 € registrado, así que quedan 800 €.",
                                                         ["F-DEMO-01"], detail_scope)
                        request_route.fulfill(status=200, headers=cors_headers, content_type="application/json", body=json.dumps(response))
                        return
                    demo_questions = {
                        "que facturas quedan por que me pagen", "solo las de este año", "enséñame solo las vencidas",
                        "¿Cuánto falta por cobrar de la F-DEMO-002?", "¿Qué ingresos de facturas faltan?",
                        "pendientes de cobro y solo de este año", "Muéstrame las pendientes de Casa Sol de este año",
                        "Cliente Casa Sol", "Proyecto Casa Sol", "solo las de 2024", "solo las de 2025", "Abre la segunda",
                        "quiero ver las facturas que me quedan por pagar", "No que tengo que pagar yo",
                        "las que quiero pagar yo", "facturas", "Abre la primera", "Abre Resumen",
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
                    if message in ("Dime qué facturas tengo pendientes de cobrar", "¿Qué tengo pendiente de cobro?", "¿Cuántas facturas tengo pendientes de cobrar?", "Abre la factura FC-0002", "Edita la factura FC-0002", "Facturas pendientes de cobrar de Casa Lino en febrero de 2026"):
                        result = json.loads(subprocess.check_output(invoice_fixture_script, cwd=repo,
                            input=json.dumps({"input": body, "options": {"origin": origin, "extra": 12 if message.startswith("¿Cuántas") else 0}}).encode()))
                        assert result["status"] == 200, result["body"]
                        if message in ("Dime qué facturas tengo pendientes de cobrar", "¿Qué tengo pendiente de cobro?"):
                            pending_receivables.append((request_route,result["body"]))
                            return
                        request_route.fulfill(status=200, headers=cors_headers, content_type="application/json", body=json.dumps(result["body"]))
                        return
                    if message == 'Ver la factura FC-0002':
                        response = {'requestId': 'inspect-invoice', 'status': 'answer', 'message': 'He localizado FC-0002.', 'sources': [
                            {'kind': 'invoice', 'id': 'FC-0002', 'label': 'FC-0002', 'brand': 'cm', 'projectId': '9002'}],
                            'questions': [], 'actions': [], 'trace': []}
                    elif message == 'Quiero ver una factura':
                        response = {'requestId': 'misdirected-inspection', 'status': 'answer', 'message': 'Vamos a Ventas.',
                            'sources': [], 'questions': [], 'trace': [], 'actions': [
                                {'type': 'navigate', 'label': 'Abrir facturas', 'payload': {'view': 'facturas'}, 'openImmediately': True}]}
                    elif "editar guardado" in message:
                        response = proposal("edit_saved_draft", 42)
                    elif "Abre facturas" in message:
                        response = {"requestId": "navigation", "status": "answer", "message": "Abrimos las facturas.", "sources": [], "questions": [],
                                    "actions": [{"id": "nav", "type": "navigate", "label": "Abrir facturas", "payload": {"view": "facturas"}}], "trace": []}
                    elif "respuesta segura" in message:
                        response = {"requestId": "escaped", "status": "answer", "message": '<img src=x onerror="window.injected=true">',
                                    "sources": [{"kind": "project", "id": "9001", "label": f"Fuente ficticia {i}", "projectId": 9001} for i in range(25)],
                                    "sourceCount": 25, "questions": [], "actions": [], "trace": []}
                    elif message == "Completar partida ficticia":
                        response = {"requestId": "multi", "status": "clarifying", "message": "Faltan los datos de la partida.",
                                    "sources": [], "actions": [], "trace": [], "questions": [
                                        {"id": "line.0.qty", "prompt": "Cantidad de la partida", "freeText": True, "options": []},
                                        {"id": "line.0.price", "prompt": "Precio de la partida", "freeText": True, "options": []}]}
                    elif body.get("answers", {}).get("line.0.qty"):
                        assert body["answers"] == {"line.0.qty": "3 horas", "line.0.price": "125 €"}
                        response = {"requestId": "multi-reply", "status": "answer", "message": "Datos de la partida comprobados.",
                                    "sources": [], "actions": [], "trace": [], "questions": []}
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
            expect(panel).to_have_attribute('aria-label', 'Secretario de Finanzas')
            expect(panel.locator('.secretary-title strong')).to_have_text('Secretario de Finanzas')
            if width >= 1100:
                expect(panel.locator('.secretary-title strong')).to_be_hidden()
            expect(panel.locator('.secretary-context')).to_be_hidden()
            expect(panel.locator('.secretary-context')).to_have_text('')
            expect(page.locator("body")).to_have_class(__import__("re").compile(r".*secretary-home.*"))
            expect(page.get_by_role("heading", name="¿Qué hacemos hoy?", exact=True)).to_be_visible()
            expect(page.locator(".finance-overview")).to_be_hidden()
            nav = panel.locator('.secretary-shortcuts')
            expect(nav).to_be_hidden() if width >= 1100 else expect(nav).to_be_visible()
            expect(panel.get_by_role("button", name="Plegar el Secretario", exact=True)).to_have_count(0)
            expect(panel.get_by_role("button", name="Salir del Modo IA", exact=True)).to_be_visible()
            expect(panel.get_by_role("button", name="Vaciar conversación", exact=True)).to_have_count(0)
            wait_for_stable_view(page)
            welcome = panel.locator('.secretary-welcome .secretary-character')
            expect(welcome).to_be_visible()
            expect(welcome).to_have_attribute('data-character-state', 'espera')
            welcome.evaluate("node=>node.decode()")
            assert welcome.evaluate("(node,minimum)=>node.naturalWidth>0&&node.getBoundingClientRect().width>=minimum", 140 if width >= 1100 else 80)
            assert welcome.evaluate("node=>new URL(node.src).pathname.startsWith('/brand/secretario/lavanda/')")
            if width >= 1100:
                assert welcome.evaluate('node=>node.getBoundingClientRect().top<240')
                shortcuts = panel.get_by_role('group', name='Accesos directos', exact=True)
                expect(shortcuts.get_by_role('button')).to_have_text(['Preparar presupuesto', 'Crear Factura', 'Añadir gasto', '¿Qué tengo pendiente de cobro?'])
                assert panel.locator('.secretary-welcome>p').evaluate("node=>{const range=document.createRange();range.selectNodeContents(node);return range.getClientRects().length===1}")
                before = len(requests)
                for label, kind in [('Preparar presupuesto','presupuesto'), ('Crear Factura','factura')]:
                    shortcuts.get_by_role('button', name=label, exact=True).click()
                    editor = page.locator('.finance-document-editor')
                    expect(editor).to_be_visible()
                    assert page.evaluate('kind=>state.draft?.kind===kind&&state.draft.lines.length===0&&document.body.classList.contains("secretary-lateral")',kind)
                    expect(page.locator('#page-route-bar')).to_be_hidden()
                    expect(nav.locator('.secretary-sections')).to_be_hidden()
                    if output and kind=='presupuesto':
                        wait_for_stable_view(page)
                        page.screenshot(path=str(output / 'secretario-generador-presupuesto.png'))
                    panel.get_by_role('button', name='Volver al chat', exact=True).click()
                    expect(shortcuts).to_be_visible()
                shortcuts.get_by_role('button', name='Añadir gasto', exact=True).click()
                expense = page.get_by_role('dialog', name='Nuevo gasto', exact=True)
                expect(expense).to_be_visible()
                assert page.evaluate("document.body.classList.contains('secretary-lateral')&&document.body.classList.contains('secretary-expense-open')")
                assert expense.evaluate("node=>node.getBoundingClientRect().right<document.getElementById('moderno-secretary').getBoundingClientRect().left")
                expense.get_by_role('button',name='Cancelar',exact=True).click()
                expect(expense).to_be_hidden()
                expect(shortcuts).to_be_visible()
                assert len(requests)==before and page.evaluate("fixtureDocuments()===fixtureBaseline&&state.draft===null")
                page.evaluate('ModernoSecretary.openFinance()')
                print('1440 PASS: focused welcome, one line, native generators by shortcut, expense modal, same chat and no writes',flush=True)
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

            # Integrated composer tools run entirely against browser-local
            # fixtures. Dictation uses a fictional on-device recognition API,
            # attachments use a fictional local OCR worker, and mentions only
            # expose identities already authorized in the in-memory state.
            composer = page.locator('#secretary-message')
            request_count = len(requests)
            composer.fill('Texto escrito')
            dictation = panel.get_by_role('button', name='Dictar mensaje', exact=True)
            expect(dictation).to_be_visible()
            dictation.click()
            expect(dictation).to_have_attribute('aria-pressed', 'true')
            expect(panel.locator('.secretary-dictation')).to_have_attribute('data-state', 'listening')
            page.evaluate("""()=>{
              const recognition=window.__secretaryRecognitions.filter(item=>item.started).at(-1);
              if(!recognition||recognition.processLocally!==true)throw Error('Fictional local recognition did not start');
              recognition.emit('con voz ficticia',true);recognition.end();
            }""")
            expect(composer).to_have_value('Texto escrito con voz ficticia')
            expect(panel.locator('.secretary-dictation-status')).to_contain_text('Puedes editarlo antes de enviar.')
            assert len(requests) == request_count
            assert page.evaluate("window.__secretarySpeechAvailability.at(-1)?.processLocally===true&&window.__secretarySpeechAvailability.at(-1)?.langs?.[0]==='es'")
            composer.fill('')

            composer.fill('@Proyecto ficticio')
            mentions = panel.get_by_role('listbox', name='Referencias disponibles', exact=True)
            expect(mentions).to_be_visible()
            expect(mentions.get_by_role('group', name='Proyectos', exact=True)).to_contain_text('Proyecto ficticio')
            mention_request_count = len(requests)
            composer.press('Enter')
            expect(composer).to_have_value('@Proyecto ficticio ')
            assert len(requests) == mention_request_count
            composer.type('revisa el contexto')
            panel.get_by_role('button', name='Enviar', exact=True).click()
            mention_reply = panel.locator('.secretary-turn-assistant').last
            expect(mention_reply.locator('.secretary-bubble')).to_have_text('Referencia ficticia verificada.')
            expect(composer).to_have_value('')

            attachment_input = panel.locator('.secretary-attachments-device input[type=file]')
            attachment_input.set_input_files({
                'name': 'adjunto-ficticio.png', 'mimeType': 'image/png', 'buffer': tiny_png,
            })
            ready_attachment = panel.locator('.secretary-attachment-ready')
            expect(ready_attachment).to_be_visible(timeout=10000)
            expect(ready_attachment).to_contain_text('adjunto-ficticio.png')
            expect(ready_attachment).to_contain_text('1 página lista para consultar')
            if output:
                page.screenshot(path=str(output / f'secretario-adjunto-listo-{width}.png'), full_page=True)
            attachment_request_count = len(requests)
            panel.get_by_role('button', name='Enviar', exact=True).click()
            attachment_reply = panel.locator('.secretary-turn-assistant').last
            expect(attachment_reply.locator('.secretary-bubble')).to_have_text('El adjunto ficticio indica un importe total de 321 EUR.')
            evidence = attachment_reply.locator('.secretary-attachment-evidence')
            expect(evidence).to_contain_text('adjunto-ficticio.png · página 1')
            expect(evidence).to_contain_text('IMPORTE TOTAL 321 EUR')
            assert len(requests) == attachment_request_count + 1
            expect(panel.locator('.secretary-attachment')).to_have_count(0)
            assert page.evaluate("""()=>window.__secretaryOcrCalls.length===1&&
              window.__secretaryOcrCalls[0].language==='spa'&&
              [window.__secretaryOcrCalls[0].workerPath,window.__secretaryOcrCalls[0].corePath,window.__secretaryOcrCalls[0].langPath]
                .every(value=>new URL(value).origin===location.origin)""")
            assert [kind for kind, _body in integrated_tool_requests] == ['mention', 'attachment']
            if output:
                page.screenshot(path=str(output / f'secretario-herramientas-integradas-{width}.png'), full_page=True)
            print(f'{width} PASS: local fake dictation, authorized mention and local OCR attachment with no implicit send', flush=True)

            # Quota failures explain their scope, keep the conversation central,
            # and offer a native navigation action that consumes no extra AI call.
            for query, expected in [
                ('cuota diaria ficticia', 'tu límite diario'),
                ('cuota mensual ficticia', 'tu límite mensual'),
                ('cuota compartida ficticia', 'límite mensual compartido'),
                ('cuota antigua ficticia', 'límite de la prueba'),
            ]:
                page.locator('#secretary-message').fill(query)
                panel.get_by_role('button', name='Enviar', exact=True).click()
                quota_turn = panel.locator('.secretary-turn-assistant').last
                expect(quota_turn.locator('.secretary-bubble')).to_contain_text(expected)
                expect(quota_turn.locator('.secretary-bubble')).not_to_contain_text('Raw provider error')
                expect(quota_turn.locator('.secretary-bubble')).not_to_contain_text('quota-fi')
                expect(quota_turn.locator('.secretary-reference')).to_contain_text('quota-fi')
                expect(quota_turn.get_by_role('button', name='Volver a intentar', exact=True)).to_have_count(0)
                expect(panel).to_have_attribute('data-character-state', 'aviso')
                assert page.evaluate("state.view==='informes'&&document.body.classList.contains('secretary-home')")
                expect(panel.locator('.secretary-context')).to_be_hidden()
                header_character = panel.locator('[data-secretary-presence=header]')
                expect(header_character).to_be_visible()
                assert header_character.evaluate('(node,size)=>node.getBoundingClientRect().width===size&&node.getBoundingClientRect().height===size', 48 if width >= 1100 else 72)
                if output and query == 'cuota diaria ficticia':
                    page.screenshot(path=str(output / f'secretario-cuota-{width}.png'))
                request_count = len(requests)
                quota_turn.get_by_role('button', name='Abrir Facturas', exact=True).click()
                page.wait_for_function("state.view==='facturas'")
                wait_for_stable_view(page)
                assert len(requests) == request_count
                assert page.evaluate('fixtureDocuments()===fixtureBaseline')
                expect(panel.locator('.secretary-title strong')).to_have_text('Secretario de Finanzas')
                page.evaluate('ModernoSecretary.openFinance()')
            page.evaluate("ModernoSecretary.reset();go('informes');ModernoSecretary.openFinance();fixtureVersions()")
            print(f'{width} PASS: scoped quota recovery, native invoice navigation without extra AI call, Finance header', flush=True)

            # The HTTP response comes from the real handler and financial calculation.
            page.evaluate("""data=>{
              window.originalInvoicesFixture={clients:state.clients,invoices:state.invoices,entries:state.entries,projects:state.projects};
              Object.assign(state,data);
              state.projects=[...state.projects,{id:9002,num:'PR-0902',name:'Reforma Lino',brand:'cm',client:'Casa Lino',status:'En progreso',tasks:[],files:[]}];
              fixtureVersions();
            }""", invoice_fixture)
            if width >= 1100:
                panel.get_by_role('button', name='¿Qué tengo pendiente de cobro?', exact=True).click()
            else:
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

            pending_route, result = pending_receivables.pop()
            pending_route.fulfill(status=200, headers=cors_headers, content_type="application/json", body=json.dumps(result))
            expect(panel).to_be_visible()
            answer = panel.locator(".secretary-turn-assistant").filter(has_text="Tienes 3 facturas pendientes de cobro por 1.680")
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
            if width >= 1100:
                expect(answer.locator('.secretary-invoices-static')).to_be_visible()
                expect(answer.get_by_role('button', name='Ver factura', exact=True)).to_have_count(3)
                replies = panel.locator('.secretary-turn-assistant')
                next_reply = replies.nth(replies.count())
                page.locator('#secretary-message').fill('Ver la factura FC-0002')
                panel.get_by_role('button', name='Enviar', exact=True).click()
                card = next_reply.locator('.secretary-invoice')
                expect(card).to_contain_text('FC-0002')
                expect(card).to_contain_text('Casa Lino')
                expect(card).to_contain_text('15/02/2026')
                expect(card).to_contain_text('Reforma Lino')
                expect(card).to_be_visible()
                expect(card.get_by_role('button', name='Ver factura', exact=True)).to_be_visible()
                expect(page.locator('.finance-document-editor')).to_have_count(0)
                assert page.evaluate("document.body.classList.contains('secretary-home')&&state.draft===null")

                page.locator('#secretary-message').fill('Abre la factura FC-0002')
                panel.get_by_role('button', name='Enviar', exact=True).click()
                preview = page.locator('.secretary-document-preview')
                expect(preview.get_by_role('heading', name='FC-0002', exact=True)).to_be_visible()
                expect(preview).to_contain_text('Versión actual del registro · Solo lectura')
                expect(page.locator('.finance-document-editor')).to_have_count(0)
                expect(page.locator('body')).to_have_class(__import__('re').compile(r'.*secretary-lateral.*'))
                preview.get_by_role('button', name='← Volver a la conversación', exact=True).click()
                assert page.evaluate("document.body.classList.contains('secretary-home')&&state.draft===null")
                if output:
                    page.screenshot(path=str(output / 'secretario-factura-solo-lectura.png'))
                page.locator('#secretary-message').fill('Quiero ver una factura')
                panel.get_by_role('button', name='Enviar', exact=True).click()
                unclear = panel.locator('.secretary-turn-assistant').last
                expect(unclear.locator('.secretary-bubble')).to_have_text('¿Qué factura quieres ver? Indica su número o el cliente.')
                expect(unclear.get_by_role('button', name='Abrir facturas', exact=True)).to_have_count(0)
                assert page.evaluate("state.view==='informes'&&document.body.classList.contains('secretary-home')")
            else:
                answer.locator(".secretary-invoice").filter(has_text="FC-0001").get_by_role("button", name="Abrir factura").click()
                expect(page.locator(".finance-document-editor")).to_contain_text("Editando FC-0001")
                expect(page.locator("#paper")).to_contain_text("Espacio Olivo")
                assert page.locator(".inv-form").evaluate("node=>getComputedStyle(node).position==='static'")
                assert_secretary_clearance(page)
                panel.get_by_role("button", name="Volver al chat", exact=True).click()
            expect(answer.locator(".secretary-invoice")).to_have_count(3)
            assert page.evaluate("document.body.classList.contains('secretary-home')&&state.draft===null")
            page.locator("#secretary-message").fill("Edita la factura FC-0002" if width >= 1100 else "Abre la factura FC-0002")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            if width >= 1100:
                expect(page.locator(".finance-document-editor")).to_contain_text("Editando FC-0002")
                # The normal native editor close also returns to the conversation.
                page.get_by_role("button", name="← Todas las facturas", exact=True).click()
            else:
                preview = page.locator('.secretary-document-preview')
                expect(preview.get_by_role('heading', name='FC-0002', exact=True)).to_be_visible()
                expect(preview).to_contain_text('Versión actual del registro · Solo lectura')
                expect(page.locator('.finance-document-editor')).to_have_count(0)
                assert page.evaluate('state.draft===null')
                preview.get_by_role('button', name='← Volver a la conversación', exact=True).click()
            expect(answer.locator(".secretary-invoice")).to_have_count(3)
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
            expect(filtered.locator(".secretary-bubble")).to_contain_text("A Casa Lino le quedan 750")
            expect(filtered.locator(".secretary-bubble")).to_contain_text("por pagar de 1 factura")
            expect(filtered).to_contain_text("Casa Lino · Emisión: 2026-02-01 a 2026-02-28")
            expect(filtered.locator(".secretary-invoice")).to_have_count(1)
            expect(filtered.locator(".secretary-invoice")).to_contain_text("FC-0002")
            assert page.evaluate("document.body.classList.contains('secretary-home')")
            print(f"{width} PASS: verified pending rows, view and edit, native close, return and paging", flush=True)
            page.evaluate("data=>{Object.assign(state,data);ModernoSecretary.reset();go('informes');ModernoSecretary.openFinance();fixtureVersions();window.demoRecords=fixtureDocuments()}", acceptance_fixture)

            def ask_demo(question, message, docs):
                page.locator("#secretary-message").fill(question)
                panel.get_by_role("button", name="Enviar", exact=True).click()
                turn = panel.locator(".secretary-turn-assistant").last
                expect(turn.locator(".secretary-bubble")).to_have_text(message)
                expect(turn.locator(".secretary-invoice-label strong")).to_have_text(docs)
                assert page.evaluate("document.body.classList.contains('secretary-home')")
                return turn

            all_text = "Tienes 3 facturas pendientes de cobro por 2.300 €. De ellas, 2 están vencidas."
            year_text = "De las emitidas en 2026, tienes 2 facturas pendientes por 1.500 €. Una está vencida."
            ask_demo("que facturas quedan por que me pagen", all_text, ["F-DEMO-003", "F-DEMO-001", "F-DEMO-002"])
            title = panel.locator(".secretary-title strong")
            assert title.evaluate("node=>node.getBoundingClientRect().height<50")
            if width < 500:
                height = page.viewport_size["height"]
                page.set_viewport_size({"width": 320, "height": height})
                expect(panel.get_by_role("button", name="Salir del Modo IA", exact=True)).to_be_in_viewport()
                assert title.evaluate("node=>node.getBoundingClientRect().height<50")
                assert nav.evaluate("node=>node.getBoundingClientRect().top>=document.getElementById('mHeader').getBoundingClientRect().bottom")
                page.set_viewport_size({"width": width, "height": height})
            ask_demo("solo las de este año", year_text, ["F-DEMO-001", "F-DEMO-002"])
            year_turn = panel.locator(".secretary-turn-assistant").filter(has_text=year_text)
            if output:
                wait_for_stable_view(page)
                page.screenshot(path=str(output / f"secretario-consulta-central-{width}.png"))
            page.locator("#secretary-message").fill("Abre la segunda")
            panel.get_by_role("button", name="Enviar", exact=True).click()
            opened = panel.locator('.secretary-turn-assistant').filter(has_text='He localizado F-DEMO-002.')
            expect(opened.locator('.secretary-invoice')).to_contain_text('F-DEMO-002')
            expect(page.locator('.finance-document-editor')).to_have_count(0)
            preview = page.locator('.secretary-document-preview')
            expect(preview.get_by_role('heading', name='F-DEMO-002', exact=True)).to_be_visible()
            expect(preview).to_contain_text('Versión actual del registro · Solo lectura')
            expect(page.locator('body')).to_have_class(__import__('re').compile(r'.*secretary-lateral.*'))
            if output:
                wait_for_stable_view(page)
                page.screenshot(path=str(output / f"secretario-factura-lateral-{width}.png"))
            preview.get_by_role('button', name='← Volver a la conversación', exact=True).click()
            assert page.evaluate("document.body.classList.contains('secretary-home')")
            expect(page.locator("#secretary-message")).to_be_focused()
            expect(year_turn.locator(".secretary-invoice")).to_have_count(2)
            assert [row["id"] for row in requests[-1]["context"]["focus"]["results"]] == ["F-DEMO-001", "F-DEMO-002"]
            assert page.evaluate("fixtureDocuments()===demoRecords")
            ask_demo("enséñame solo las vencidas", "De esas facturas de 2026, queda 1 vencida por 1.000 €.", ["F-DEMO-001"])
            detail = ask_demo("¿Cuánto falta por cobrar de la F-DEMO-002?",
                "Quedan 500 € por cobrar. La factura es de 1.200 € y tiene 700 € de cobros registrados.", ["F-DEMO-002"])
            expect(detail.locator(".secretary-invoice")).to_contain_text("500,00")
            if output:
                wait_for_stable_view(page)
                page.screenshot(path=str(output / f"secretario-continuidad-{width}.png"))
            if width < 1100:
                detail.get_by_role("button", name="Abrir factura", exact=True).click()
                expect(page.locator(".finance-document-editor")).to_contain_text("Editando F-DEMO-002")
                expect(page.locator("body")).to_have_class(__import__("re").compile(r".*secretary-lateral.*"))
                assert page.evaluate("fixtureDocuments()===demoRecords")
                panel.get_by_role("button", name="Volver al chat", exact=True).click()
            expect(detail.locator(".secretary-invoice")).to_contain_text("F-DEMO-002")
            assert page.evaluate("document.body.classList.contains('secretary-home')&&fixtureDocuments()===demoRecords")

            ask_demo("¿Qué ingresos de facturas faltan?", "¿Te refieres a facturas pendientes de cobro?", [])
            expect(panel.get_by_role("textbox")).to_have_count(1)
            expect(panel.locator(".secretary-thread").get_by_text("¿Te refieres a facturas pendientes de cobro?", exact=True)).to_have_count(1)
            expect(panel.get_by_text("Puedes elegir una opción o escribir tu respuesta.", exact=True)).to_have_count(0)
            expect(panel.get_by_text("Puedes preguntar o pedirme que prepare un borrador.", exact=True)).to_have_count(0)
            ask_demo("pendientes de cobro y solo de este año", year_text, ["F-DEMO-001", "F-DEMO-002"])
            assert requests[-1]["automatic"] is False

            ambiguity = "¿Te refieres al cliente Casa Sol o al proyecto Casa Sol?"
            ask_demo("Muéstrame las pendientes de Casa Sol de este año", ambiguity, [])
            expect(panel.get_by_role("button", name="Cliente Casa Sol", exact=True)).to_be_visible()
            expect(panel.get_by_role("button", name="Proyecto Casa Sol", exact=True)).to_be_visible()
            ask_demo("Cliente Casa Sol", "No tienes facturas pendientes de cobro con esos filtros.", [])
            ask_demo("Muéstrame las pendientes de Casa Sol de este año", ambiguity, [])
            panel.get_by_role("button", name="Proyecto Casa Sol", exact=True).click()
            panel.get_by_role("button", name="Enviar", exact=True).click()
            expect(panel.locator(".secretary-turn-assistant .secretary-bubble").last).to_have_text(
                "De las emitidas en 2026, tienes 1 factura pendiente por 1.000 €. Una está vencida.")
            expect(panel.locator(".secretary-turn-user .secretary-bubble").last).to_have_text("Proyecto Casa Sol")
            ask_demo("solo las de 2024", "No tienes facturas pendientes de cobro con esos filtros.", [])
            error = ask_demo("solo las de 2025", "No he podido consultar las facturas ahora. Puedes reintentarlo.", [])
            error.get_by_role("button", name="Volver a intentar", exact=True).click()
            last = panel.locator(".secretary-turn-assistant").last
            expect(last.locator(".secretary-invoice")).to_contain_text("F-DEMO-003")
            assert requests[-1]["receivableContext"]["scope"]["projectId"] == "9001"
            if width >= 1100:
                page.evaluate("go('informes');ModernoSecretary.openFinance()")
                payable_message = 'Tienes 2 facturas pendientes de pago por 830 €. Una está vencida.'
                payable_rows = ['FR-DEMO-001', 'FR-DEMO-002']
                ask_demo('quiero ver las facturas que me quedan por pagar', payable_message, payable_rows)
                ask_demo('que facturas quedan por que me pagen', 'Tienes 3 facturas pendientes de cobro por 2.300 €. De ellas, 2 están vencidas.',
                         ['F-DEMO-003', 'F-DEMO-001', 'F-DEMO-002'])
                result = ask_demo('No que tengo que pagar yo', payable_message, payable_rows)
                expect(result.locator('.secretary-invoice').first).to_contain_text('Proveedor A')
                expect(result.locator('.secretary-invoice').first).to_contain_text('530,00')
                assert page.evaluate("document.body.classList.contains('secretary-home') && state.view==='informes'")
                if output:
                    page.screenshot(path=str(output / f'secretario-facturas-por-pagar-{width}.png'))
                expect(result.get_by_role('button', name='Ver factura', exact=True)).to_have_count(2)
                page.locator('#secretary-message').fill('Abre la primera')
                panel.get_by_role('button', name='Enviar', exact=True).click()
                opened = panel.locator('.secretary-turn-assistant').filter(has_text='He localizado FR-DEMO-001.')
                expect(opened.locator('.secretary-invoice')).to_contain_text('FR-DEMO-001')
                preview = page.locator('.secretary-document-preview')
                expect(preview.get_by_role('heading', name='FR-DEMO-001', exact=True)).to_be_visible()
                expect(preview).to_contain_text('Versión actual del registro · Solo lectura')
                expect(preview).to_contain_text('No hay un PDF adjunto.')
                expect(page.locator('.finance-document-editor')).to_have_count(0)
                expect(page.locator('body')).to_have_class(__import__('re').compile(r'.*secretary-lateral.*'))
                assert page.evaluate("fixtureDocuments()===demoRecords")
                preview.get_by_role('button', name='← Volver a la conversación', exact=True).click()
                assert page.evaluate("document.body.classList.contains('secretary-home') && fixtureDocuments()===demoRecords")
                print('1440 PASS: pending supplier invoices, correction after receivables, readonly preview and no editor', flush=True)
            print(f"{width} PASS: exact acceptance dialogue with one composer, invoice detail, choices, empty and failed read", flush=True)
            composer = panel.get_by_role("textbox", name="Mensaje para el Secretario", exact=True)
            send = panel.get_by_role("button", name="Enviar", exact=True)
            composer.fill("Completar partida ficticia")
            send.click()
            expect(panel.get_by_role("button", name="Cantidad de la partida", exact=True)).to_be_visible()
            initial_requests = len(requests)
            composer.fill("3 horas")
            send.click()
            expect(composer).to_have_attribute("placeholder", "Precio de la partida")
            assert len(requests) == initial_requests
            composer.fill("125 €")
            send.click()
            expect(panel.locator(".secretary-turn-assistant .secretary-bubble").last).to_have_text("Datos de la partida comprobados.")
            expect(panel.get_by_role("textbox")).to_have_count(1)

            composer.fill("consulta lenta para mostrar efecto")
            send.click()
            marker = panel.locator(".secretary-reply-marker")
            expect(marker).to_have_text("Generando respuesta…")
            marker.evaluate("node=>node.dataset.fixtureReply='same-bubble'")
            animated_text = "La respuesta aparece de forma progresiva. " * 8
            animated_text = animated_text.strip()
            pending.pop().fulfill(status=200, headers=cors_headers, content_type="application/json",
                                  body=json.dumps({"requestId": "animation", "status": "answer", "message": animated_text}))
            reveal = panel.locator(".secretary-reply-revealing")
            expect(reveal).to_have_attribute("data-fixture-reply", "same-bubble")
            expect(reveal).to_have_attribute("aria-busy", "true")
            assert reveal.text_content() != animated_text
            expect(reveal.locator(".secretary-reply-caret")).to_have_count(1)
            page.emulate_media(reduced_motion="reduce")
            expect(panel.locator(".secretary-turn-assistant .secretary-bubble").last).to_have_text(animated_text)
            expect(panel.locator(".secretary-reply-caret")).to_have_count(0)
            page.emulate_media(reduced_motion="no-preference")

            composer.fill("Texto conservado al volver")
            page.evaluate("""()=>{
              window.fixtureModes=[];
              new MutationObserver(records=>{
                for(const record of records)for(const node of record.addedNodes){
                  if(!node.matches?.('.secretary-finance-loading'))continue;
                  const mark=node.querySelector('.secretary-mode-mark');
                  const frames=()=>mark.getAnimations().flatMap(a=>a.effect.getKeyframes()).map(frame=>frame.transform);
                  const entry={direction:node.dataset.direction,label:node.textContent,mark:mark.getAttribute('src'),cover:frames()};
                  window.fixtureModes.push(entry);
                  new MutationObserver(()=>{if(node.dataset.phase==='reveal')entry.reveal=frames();}).observe(node,{attributes:true,attributeFilter:['data-phase']});
                }
              }).observe(document.body,{childList:true});
            }""")
            panel.get_by_role("button", name="Salir del Modo IA", exact=True).click()
            expect(panel).to_have_count(0)
            expect(page.locator(".finance-overview")).to_be_visible()
            if width >= 1100:
                expect(page.locator('#page-route-bar')).to_be_visible()
            expect(page.locator(".secretary-finance-loading")).to_have_count(0)
            assert page.evaluate("fixtureDocuments()===demoRecords")
            exit_effect = page.evaluate("window.fixtureModes[0]")
            assert exit_effect["direction"] == "exit" and exit_effect["label"] == "Cargando Finanzas…"
            assert exit_effect["mark"] == "/brand/secretario/lavanda/espera.png"
            assert any("68" in transform for transform in exit_effect["reveal"])
            assert_launcher_clearance(page)
            expect(page.locator("#view button").filter(has_text="Modo IA")).to_have_count(0)
            expect(page.get_by_role("button", name="Modo IA", exact=True)).to_be_focused()
            page.evaluate("ModernoHeaderActions.refresh()")
            assert_launcher_clearance(page)
            expect(page.get_by_role("button", name="Modo IA", exact=True)).to_have_count(1)
            if width >= 1100 and not desktop_only:
                page.set_viewport_size({"width": 390, "height": 844})
                assert_launcher_clearance(page)
                page.set_viewport_size({"width": width, "height": height})
                assert_launcher_clearance(page)
                expect(page.get_by_role("button", name="Modo IA", exact=True)).to_have_count(1)
            if output:
                wait_for_stable_view(page)
                page.screenshot(path=str(output / f"secretario-finanzas-normal-{width}.png"))
            page.evaluate("go('facturas')")
            expect(page.get_by_role("button", name="Modo IA", exact=True)).to_be_visible()
            expect(panel).to_have_count(0)
            page.get_by_role("button", name="Modo IA", exact=True).click()
            expect(composer).to_have_value("Texto conservado al volver")
            expect(panel.locator(".secretary-turn-assistant .secretary-bubble").last).to_have_text(animated_text)
            expect(page.locator("body")).to_have_class(__import__("re").compile(r".*secretary-home.*"))
            expect(page.locator(".secretary-finance-loading")).to_have_count(0)
            expect(composer).to_be_focused()
            entry_effect = page.evaluate("window.fixtureModes[1]")
            assert entry_effect["direction"] == "enter" and entry_effect["label"] == "Abriendo Modo IA…"
            assert entry_effect["mark"] == exit_effect["mark"]
            assert any("78" in transform for transform in entry_effect["cover"])

            page.emulate_media(reduced_motion="reduce")
            panel.get_by_role("button", name="Salir del Modo IA", exact=True).click()
            expect(page.locator(".finance-overview")).to_be_visible()
            page.get_by_role("button", name="Modo IA", exact=True).click()
            expect(composer).to_have_value("Texto conservado al volver")
            expect(composer).to_be_focused()
            assert page.evaluate("window.fixtureModes.length===2 && !document.querySelector('.main').inert")
            page.emulate_media(reduced_motion="no-preference")

            if output:
                composer.fill("")
                wait_for_stable_view(page)
                page.screenshot(path=str(output / f"secretario-modo-ia-{width}.png"))
            page.evaluate("""()=>{
              document.querySelector('.secretary-header .secretary-mode-button').click();
              go('agenda');
            }""")
            expect(page.locator(".secretary-finance-loading")).to_have_count(0)
            assert page.evaluate("state.view==='agenda' && !document.querySelector('.main').inert")
            print(f"{width} PASS: composer, mascot transitions in both directions, reduced motion, preserved chat and navigation", flush=True)
            page.evaluate("Object.assign(state,window.originalInvoicesFixture);ModernoSecretary.reset();go('informes');ModernoSecretary.openFinance();fixtureVersions()")

            # Five exact turns from conversation A of the guide. The endpoint is
            # still intercepted and every external request remains blocked.
            if width >= 1100:
                page.evaluate("""data=>{
                  Object.assign(state,data);state.borradores=[];state.draft=null;state.fView=null;state.qView=null;
                  ModernoSecretary.reset();go('informes');ModernoSecretary.openFinance();fixtureVersions();
                  window.guideDocumentBaseline=fixtureDocuments();
                }""", guide_browser_fixture)

                def ask_guide(question, expected, refs):
                    page.locator("#secretary-message").fill(question)
                    panel.get_by_role("button", name="Enviar", exact=True).click()
                    turn = panel.locator(".secretary-turn-assistant").last
                    expect(turn.locator(".secretary-bubble")).to_have_text(expected)
                    expect(turn.locator(".secretary-invoice-label strong")).to_have_text(refs)
                    return turn

                ask_guide("¿Qué me falta por cobrar?", "Te quedan 1.900 € por cobrar en 3 facturas. Aquí las tienes.",
                          ["F-DEMO-01", "F-DEMO-02", "F-DEMO-03"])
                ask_guide("Solo las de este año.", "De las emitidas en 2026, quedan 2 facturas por cobrar: 1.400 €.",
                          ["F-DEMO-01", "F-DEMO-02"])
                ask_guide("Y de esas, las vencidas.", "Hay una vencida, con 800 € pendientes.", ["F-DEMO-01"])
                if output:
                    wait_for_stable_view(page)
                    page.screenshot(path=str(output / "secretario-guia-a-central-1440.png"))

                page.locator("#secretary-message").fill("Ábrela.")
                panel.get_by_role("button", name="Enviar", exact=True).click()
                expect(panel.locator(".secretary-turn-assistant").last.locator(".secretary-bubble")).to_have_text("Te abro F-DEMO-01.")
                preview = page.locator(".secretary-document-preview")
                expect(preview.get_by_role("heading", name="F-DEMO-01", exact=True)).to_be_visible()
                expect(preview).to_contain_text("Versión actual del registro · Solo lectura")
                expect(page.locator("body")).to_have_class(__import__("re").compile(r".*secretary-lateral.*"))
                assert page.evaluate("fixtureDocuments()===guideDocumentBaseline")
                if output:
                    wait_for_stable_view(page)
                    page.screenshot(path=str(output / "secretario-guia-a-lateral-1440.png"))

                detail = ask_guide("¿Por qué pone 1.200 si me debe 800?",
                    "Los 1.200 € son el total de la factura. Tiene un cobro de 400 € registrado, así que quedan 800 €.",
                    ["F-DEMO-01"])
                expect(detail.locator(".secretary-invoice-balance strong")).to_contain_text("800,00")
                expect(preview.get_by_role("heading", name="F-DEMO-01", exact=True)).to_be_visible()
                assert [request["message"] for request in guide_requests[-5:]] == [
                    "¿Qué me falta por cobrar?", "Solo las de este año.", "Y de esas, las vencidas.",
                    "Ábrela.", "¿Por qué pone 1.200 si me debe 800?",
                ]
                assert guide_requests[-2]["context"]["focus"]["results"] == [
                    {"kind": "invoice", "id": "F-DEMO-01", "brand": "cm", "projectId": "9001"}
                ]
                assert guide_requests[-1]["context"]["focus"]["document"] == {
                    "kind": "invoice", "id": "F-DEMO-01", "brand": "cm", "projectId": "9001"
                }
                assert page.evaluate("fixtureDocuments()===guideDocumentBaseline")

                # Explicit navigation to the already-active Finance family must
                # still leave the center dashboard open and the same chat at the
                # side, without dropping the prior verified query context.
                page.locator("#secretary-message").fill("Abre Resumen")
                panel.get_by_role("button", name="Enviar", exact=True).click()
                expect(page.locator(".finance-overview")).to_be_visible()
                expect(page.locator("body")).to_have_class(__import__("re").compile(r".*secretary-lateral.*"))
                assert requests[-1]["receivableContext"]["scope"]["overdue"] == "overdue"
                assert page.evaluate("state.view==='informes' && fixtureDocuments()===guideDocumentBaseline")
                panel.get_by_role("button", name="Volver al chat", exact=True).click()
                expect(page.locator("body")).to_have_class(__import__("re").compile(r".*secretary-home.*"))
                print("1440 PASS: guide A five-turn continuity, exact cents, readonly center preview and lateral chat", flush=True)

                page.evaluate("""()=>{
                  Object.assign(state,window.originalInvoicesFixture);state.borradores=[];state.draft=null;state.fView=null;state.qView=null;
                  ModernoSecretary.reset();go('informes');ModernoSecretary.openFinance();fixtureVersions();
                }""")

            # Folding remains available from a project. A proposal stays there
            # until the user returns and chooses to open the draft.
            page.evaluate("go('proyecto',9001)")
            page.locator('#secretary-message').fill('consulta lenta preparar factura')
            panel.get_by_role('button', name='Enviar', exact=True).click()
            expect(panel).to_have_attribute('data-character-state', 'trabajando')
            page.wait_for_timeout(30)
            assert len(pending) == 1
            panel.get_by_role('button', name='Plegar el Secretario', exact=True).click()
            launcher = page.locator('#secretary-reopen')
            expect(launcher).to_have_attribute('data-character-state', 'trabajando')
            expect(launcher).to_be_focused()
            assert_launcher_clearance(page)
            pending.pop().fulfill(status=200, headers=cors_headers, content_type='application/json', body=json.dumps(proposal()))
            expect(launcher).to_have_attribute('data-unread', 'true')
            expect(launcher).to_have_attribute('data-character-state', 'terminado')
            expect(panel).to_be_hidden()
            assert page.evaluate("state.draft===null&&state.invoices.length===0&&state.view==='proyecto'")
            if output:
                page.screenshot(path=str(output / f"secretario-plegado-{width}.png"))
            expect(launcher).to_have_attribute('data-character-state', 'espera', timeout=5500)
            expect(launcher.locator('.secretary-character')).to_have_attribute('data-animated', 'false')
            launcher.click()
            expect(launcher).to_have_count(0)
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
            expect(panel.get_by_role("textbox")).to_have_count(1)
            panel.get_by_role("button", name="Cliente ficticio", exact=True).click()
            panel.get_by_role("button", name="Enviar", exact=True).click()
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
            expect(panel.get_by_role("button", name="Plegar el Secretario", exact=True)).to_have_count(0)
            expect(panel.get_by_role("button", name="Salir del Modo IA", exact=True)).to_be_visible()
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

            panel.get_by_role("button", name="Salir del Modo IA", exact=True).click()
            expect(page.locator("#modalBox")).to_contain_text("a medias")
            assert page.evaluate("state.draft.lines[0].qty===4")
            page.locator("#modalBox").get_by_role("button", name="Seguir editando", exact=True).click()
            expect(panel).to_be_visible()

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

            panel.get_by_role("button", name="Salir del Modo IA", exact=True).click()
            page.locator("#modalBox").get_by_role("button", name="Salir sin guardar", exact=True).click()
            expect(page.get_by_role("button", name="Modo IA", exact=True)).to_be_visible()
            expect(page.locator("#moderno-secretary")).to_have_count(0)
            assert page.evaluate("state.draft===null&&state.borradores[0].draft.lines[0].qty===2&&state.invoices.length===0")
            page.get_by_role("button", name="Modo IA", exact=True).click()
            expect(panel.locator(".secretary-turn-user .secretary-bubble").last).to_have_text("editar guardado: 4 horas a 125 por hora")

            # One conversation follows the current project, including after folding.
            page.evaluate("state.draft=null;state.fView=null;go('proyecto',9001)")
            assert page.evaluate("!document.querySelector('.secretary-finance-loading')&&!document.querySelector('.main').inert")
            expect(panel).to_be_visible()
            expect(panel).to_have_attribute('aria-label', 'Nuestro Secretario')
            expect(panel.locator('.secretary-title strong')).to_have_text('Nuestro Secretario')
            expect(panel.locator('.secretary-context')).to_be_visible()
            expect(panel.locator(".secretary-context")).to_have_text("Proyecto ficticio")
            assert panel.locator('[data-secretary-presence=header]').evaluate('(node,size)=>node.getBoundingClientRect().width===size&&node.getBoundingClientRect().height===size', 80 if width > 500 else 72)
            expect(panel.locator(".secretary-bubble").get_by_text("El borrador está preparado para revisar.", exact=True).first).to_be_visible()
            page.locator("#secretary-message").fill("respuesta segura")
            expect(page.locator("#secretary-message")).to_have_value("respuesta segura")
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
