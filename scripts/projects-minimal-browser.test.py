"""Issue 187: isolated fictitious projects; all external traffic and writes blocked."""
from pathlib import Path
import ast,os,socket,subprocess,time,urllib.request,sys
from playwright.sync_api import sync_playwright,expect
repo=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]) if len(sys.argv)>1 else None
if output:output.mkdir(parents=True,exist_ok=True)
parsed=ast.parse((repo/'scripts/shopping-loading-browser.test.py').read_text())
setup=next(ast.literal_eval(n.value) for n in parsed.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='fixture_setup' for t in n.targets))
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://minimal-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_187'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_minimal-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,headless=True,args=['--no-sandbox'])
  for width,height in [(1920,1080),(1440,1000),(1200,900),(1000,900),(768,1024),(390,844),(320,700)]:
   page=browser.new_page(viewport={'width':width,'height':height},locale='es-ES',timezone_id='Europe/Madrid');errors=[];writes=[];external=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):external.append(r.request.url);r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   page.evaluate("""()=>{
    window.makeProjects=n=>{const base=state.projects[0]||window.baseProject;window.baseProject=structuredClone(base);state.projects=Array.from({length:n},(_,i)=>({...structuredClone(base),id:9100+i,num:'PR-'+(9100+i),name:i===0?'Casa con nombre muy largo '+ 'arquitectura '.repeat(60):'Casa ficticia '+(i+1),client:i%2?'':'Cliente ficticio',files:[],tasks:i%3===0?[{id:'a',col:'listo'},{id:'b',col:'pend',due:'2000-01-01'}]:[]}));state.projQ='';state.showArchived=false;go('proyectos')};makeProjects(27);window.before=JSON.stringify(state.projects);
   }""")
   cards=page.locator('.projects-identity .project-overview-card');expect(cards).to_have_count(27)
   # Compact by default; both alternate views retain the same identity and records.
   selector=page.get_by_role('group',name='Vista de proyectos')
   expect(selector).to_be_visible()
   compact=selector.get_by_role('button',name='Compacta')
   visual=selector.get_by_role('button',name='Visual')
   listing=selector.get_by_role('button',name='Lista')
   expect(compact).to_have_attribute('aria-pressed','true')
   assert page.locator('.projects-identity').evaluate("e=>e.classList.contains('projects-mode-compact')")
   assert cards.first.evaluate('e=>e.getBoundingClientRect().height>=220')
   expect(cards.first.locator('.project-card-reference-head')).to_be_visible()
   expect(cards.first.locator('.project-card-folder-symbol')).to_be_visible()
   expect(cards.first.locator('.project-card-reference-meta')).to_contain_text('PR-9100')
   expect(cards.first.locator('.project-card-reference-progress')).to_contain_text('1/2 tareas')
   expect(cards.nth(1).locator('.project-card-reference-progress')).to_have_count(0)
   assert cards.first.locator('.project-card-cover').evaluate("e=>getComputedStyle(e).display==='none'")
   visual.click()
   expect(visual).to_have_attribute('aria-pressed','true')
   expect(cards).to_have_count(27)
   assert cards.first.locator('.project-card-cover').evaluate("e=>getComputedStyle(e).aspectRatio==='16 / 10'")
   listing.click()
   expect(listing).to_have_attribute('aria-pressed','true')
   expect(cards).to_have_count(27)
   assert page.locator('.project-cards-grid').first.evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ').length")==1
   compact.click()
   expect(compact).to_have_attribute('aria-pressed','true')
   assert page.evaluate('JSON.stringify(state.projects)===before')
   cw=page.locator('.projects-identity').evaluate('e=>e.clientWidth');columns=3 if cw>=1650 else 2 if cw>=850 else 1
   actual=page.locator('.project-cards-grid').first.evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ').length")
   assert actual==columns,(width,cw,actual,columns)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
   assert cards.first.locator('h2').evaluate('e=>e.clientHeight<=parseFloat(getComputedStyle(e).lineHeight)*2+1')
   assert cards.first.locator('h2').evaluate("e=>getComputedStyle(e).fontFamily.startsWith('Acorn')")
   expect(cards.nth(1).locator('.project-card-client')).to_have_count(0)
   expect(cards.nth(1).locator('.project-card-progress')).to_have_count(0)
   assert 'Sin tareas' not in page.locator('.projects-identity').inner_text()
   link=cards.first.locator('.project-card-open');page.keyboard.press('Tab');link.focus();assert link.evaluate("e=>e.matches(':focus-visible')&&getComputedStyle(e).outlineStyle==='solid'")
   link.press('Space');assert page.evaluate('state.currentProject===9100')
   page.evaluate("go('proyectos')")
   # A modified click retains the original href and is not intercepted by the opener.
   assert cards.first.locator('a').evaluate("e=>{const click=new MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true});e.dispatchEvent(click);return !click.defaultPrevented}")
   page.evaluate("go('proyectos')")
   assert page.evaluate('JSON.stringify(state.projects)===before')
   # Real explicit embedded cover, error fallback, unselected image and external URL.
   page.evaluate("""()=>{
    const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1kAAAAASUVORK5CYII=';
    state.projects[0].files=[{docKind:'portal-cover',cli:true,type:'image/png',data:png,body:JSON.stringify({coverPosition:{x:25,y:75}})}];
    state.projects[1].files=[{docKind:'portal-cover',cli:true,type:'image/png',data:'data:image/png;base64,AAAA'}];
    state.projects[2].files=[{type:'image/png',data:png}];
    state.projects[3].files=[{docKind:'portal-cover',type:'image/png',url:'https://stock.invalid/never-load.png'}];render();
   }""")
   visual.click()
   image=cards.first.locator('.project-card-cover img');expect(image).to_have_class('image-ready');expect(image).to_have_css('object-position','25% 75%')
   cards.nth(1).scroll_into_view_if_needed();expect(cards.nth(1).locator('img')).to_have_class('image-failed');expect(cards.nth(1).locator('.project-card-monogram')).to_be_visible()
   expect(cards.nth(2).locator('img')).to_have_count(0);expect(cards.nth(3).locator('img')).to_have_count(0)
   assert not any('stock.invalid' in x for x in external)
   compact.click()
   expect(cards.first.locator('.project-card-reference-head')).to_be_visible()
   if output:
    page.evaluate('scrollTo(0,0)');page.screenshot(path=str(output/f'minimal-projects-{width}.png'))
   for count in [0,1,80]:
    page.evaluate('(n)=>makeProjects(n)',count);expect(cards).to_have_count(count)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   # At 125–200% zoom the same container sizing reflows rather than overflows.
   for scale in [1.25,2]:
    page.evaluate('(scale)=>{document.body.style.zoom=scale}',scale)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,scale)
   page.evaluate("document.body.style.zoom='';makeProjects(27);window.before=JSON.stringify(state.projects);_accessRole='col';render()")
   expect(cards).to_have_count(27)
   assert page.evaluate('JSON.stringify(state.projects)===before')
   page.evaluate("state.projects[1].status='Archivado';state.projQ='PR-9101';state.showArchived=false;render()")
   expect(cards).to_have_count(1);expect(page.locator('.projects-identity .empty')).to_contain_text('Hay coincidencias archivadas')
   page.evaluate("state.showArchived=true;state.projQ='';render()");expect(cards).to_have_count(1)
   page.evaluate("state.projQ='ninguna coincidencia';render()");expect(cards).to_have_count(0)
   expect(page.locator('.projects-identity .empty')).to_contain_text('No hay proyectos que coincidan')
   assert not writes,writes;assert not errors,errors
   print(width,'PASS: responsive',columns,'columns; empty/1/27/80, cover/fallback, long names, keyboard, roles, zoom and unchanged records',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
