"""One public Google address lookup in an isolated browser. Never opens the app or Supabase."""
from pathlib import Path
from urllib.parse import urlsplit
import json,shutil,sys
from playwright.sync_api import sync_playwright
repo=Path(__file__).resolve().parents[1]
config=json.loads((repo/'app/places-config.json').read_text())
if not config.get('browserKey'):
 print('Google Places: prueba real omitida; no hay clave configurada.')
 sys.exit(0)
try:
 with sync_playwright() as p:
  executable=shutil.which('google-chrome') or shutil.which('chromium')
  if not executable:raise RuntimeError('Chromium unavailable')
  browser=p.chromium.launch(executable_path=executable,headless=True,args=['--no-sandbox'])
  page=browser.new_page(locale='es-ES');blocked=[]
  def route(r):
   u=urlsplit(r.request.url)
   if u.hostname=='app.moderno.app':
    if r.request.method!='GET':blocked.append('app-write');r.abort();return
    if u.path=='/__maps_smoke__':r.fulfill(status=200,content_type='text/html',body='<!doctype html><html lang="es"><head><title>Prueba aislada de direcciones</title></head><body></body></html>');return
    if u.path=='/places.js':r.fulfill(status=200,content_type='application/javascript',body=(repo/'app/places.js').read_text());return
    if u.path=='/places-config.json':r.fulfill(status=200,content_type='application/json',body=json.dumps(config));return
    blocked.append('app-resource');r.abort();return
   if u.hostname and (u.hostname.endswith('.googleapis.com') or u.hostname.endswith('.gstatic.com') or u.hostname=='maps.google.com'):
    r.continue_();return
   blocked.append('other-host');r.abort()
  page.add_init_script('window.gm_authFailure=()=>{window.mapsSmokeAuthFailed=true;}')
  page.route('**/*',route)
  page.goto('https://app.moderno.app/__maps_smoke__',wait_until='domcontentloaded')
  page.add_script_tag(url='https://app.moderno.app/places.js')
  page.add_style_tag(content=(repo/'app/home-map.css').read_text())
  result=page.evaluate("""async()=>{const session=await ModernoPlaces.session();try{const items=await session.search('Calle de Alcalá 1, Madrid, España');if(!items.length)return {suggestions:false};const address=await session.select(items[0]);return {suggestions:true,address:!!(address?.street&&address?.city&&address?.country),postalCode:!!address?.cp,persistence:ModernoPlaces.canPersistLocation()};}finally{session.close();}}""")
  assert result.get('suggestions') and result.get('address') and result.get('postalCode') and not blocked
  assert result.get('persistence')==bool(config.get('locationPersistenceReady'))
  map_result=page.evaluate("""async()=>{const host=document.createElement('div');host.style.cssText='width:800px;height:600px';document.body.append(host);const engine=await ModernoPlaces.createMap(host);try{const point=await ModernoPlaces.locate('Calle de Alcalá 1, Madrid, España');if(!point)return false;engine.markers([{id:'public-smoke',label:'Prueba pública',point}],()=>{});engine.fit([point]);engine.zoom(1);for(let i=0;i<30&&!host.querySelector('.hm-pin');i++)await new Promise(r=>setTimeout(r,100));await new Promise(r=>setTimeout(r,800));if(window.mapsSmokeAuthFailed||!host.querySelector('.hm-pin')||host.querySelector('.gm-err-container'))return false;return point.lat>40&&point.lat<41&&point.lng>-4&&point.lng<-3;}finally{engine.destroy();host.remove();}}""")
  assert map_result and not blocked
  browser.close()
 print('Google Maps: mapa, marcadores y ubicación pública verificados; sin conexiones con Supabase ni guardados.')
 print('Google Places: sugerencias y selección verificadas; sin conexiones con Supabase ni guardados.')
except Exception as error:
 # Do not print exception text, tracebacks or URLs that could contain the key.
 print('Google Places: prueba real fallida ('+type(error).__name__+'). Revisar APIs, facturación y restricciones.',file=sys.stderr)
 sys.exit(1)
