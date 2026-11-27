"""OCR local del Secretario con archivos sinteticos y sin servicios externos.

Uso:
  python3 scripts/secretario-attachments-browser.test.py /ruta/pdfjs-dist/build

El servidor de la prueba solo expone la pagina vacia, los runtimes locales y
los archivos ficticios creados en memoria. No carga la app, Supabase ni OpenAI.
"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
import json
import os
import socket
import sys
import threading

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

repo=Path(__file__).resolve().parents[1]
pdfjs=Path(sys.argv[1]) if len(sys.argv)>1 else None
if not pdfjs or not (pdfjs/'pdf.min.js').is_file() or not (pdfjs/'pdf.worker.min.js').is_file():
 raise SystemExit('Indica el directorio build de pdfjs-dist 3.11.174')

def text_pdf(lines):
 objects=['<< /Type /Catalog /Pages 2 0 R >>',None,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
 kids=[]
 for line in lines:
  page_no=len(objects)+1;content_no=page_no+1;kids.append(f'{page_no} 0 R')
  stream=f'BT /F1 18 Tf 48 740 Td ({line}) Tj ET'
  objects.extend([f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents {content_no} 0 R >>',f'<< /Length {len(stream)} >>\nstream\n{stream}\nendstream'])
 objects[1]=f"<< /Type /Pages /Count {len(kids)} /Kids [{' '.join(kids)}] >>"
 body=b'%PDF-1.4\n';offsets=[0]
 for number,obj in enumerate(objects,1):
  offsets.append(len(body));body+=f'{number} 0 obj\n{obj}\nendobj\n'.encode()
 start=len(body);body+=f'xref\n0 {len(objects)+1}\n0000000000 65535 f \n'.encode()
 body+=b''.join(f'{offset:010d} 00000 n \n'.encode() for offset in offsets[1:])
 body+=f'trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{start}\n%%EOF'.encode()
 return body

font_path=Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
font=ImageFont.truetype(str(font_path),54)
image=Image.new('RGB',(1500,540),'white');draw=ImageDraw.Draw(image)
draw.text((70,85),'DOCUMENTO FICTICIO',font=font,fill='black')
draw.text((70,210),'IMPORTE TOTAL 123,45 EUR',font=font,fill='black')
draw.text((70,335),'NO GUARDAR NI FACTURAR',font=font,fill='black')
png=BytesIO();image.save(png,'PNG')
scan=BytesIO();image.save(scan,'PDF',resolution=144)
fixtures={
 '/fixtures/text.pdf':('application/pdf',text_pdf(['PAGINA UNO FICTICIA TOTAL 42 EUR','PAGINA DOS FICTICIA REFERENCIA ABC123'])),
 '/fixtures/scan.pdf':('application/pdf',scan.getvalue()),
 '/fixtures/image.png':('image/png',png.getvalue()),
 '/fixtures/bad.txt':('text/plain',b'archivo no compatible'),
}
html=b'''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/secretario-attachments.css"><main id="host"></main><script src="/pdf.min.js"></script><script>pdfjsLib.GlobalWorkerOptions.workerSrc='/pdf.worker.min.js';window.loadPdfJs=async()=>pdfjsLib;</script><script src="/secretario-attachments.js"></script>'''
vendor=(repo/'app/vendor/tesseract/6.0.1').resolve()

class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  route=self.path.split('?',1)[0]
  if route=='/':data,mime=html,'text/html; charset=utf-8'
  elif route=='/secretario-attachments.js':data,mime=(repo/'app/secretario-attachments.js').read_bytes(),'application/javascript'
  elif route=='/secretario-attachments.css':data,mime=(repo/'app/secretario-attachments.css').read_bytes(),'text/css'
  elif route=='/pdf.min.js':data,mime=(pdfjs/'pdf.min.js').read_bytes(),'application/javascript'
  elif route=='/pdf.worker.min.js':data,mime=(pdfjs/'pdf.worker.min.js').read_bytes(),'application/javascript'
  elif route in fixtures:mime,data=fixtures[route]
  elif route.startswith('/vendor/tesseract/6.0.1/'):
   target=(vendor/route.removeprefix('/vendor/tesseract/6.0.1/')).resolve()
   if vendor not in target.parents or not target.is_file():self.send_error(404);return
   data=target.read_bytes();mime='application/javascript' if target.suffix=='.js' else 'application/gzip' if target.suffix=='.gz' else 'application/octet-stream'
  else:self.send_error(404);return
  self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
 def log_message(self,*args):pass

with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
server=ThreadingHTTPServer(('127.0.0.1',port),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
origin=f'http://127.0.0.1:{port}'

try:
 with sync_playwright() as playwright:
  browser=playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1100,'height':800},locale='es-ES')
  errors=[];outside=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.on('request',lambda request:outside.append(request.url) if not request.url.startswith(origin) else None)
  page.goto(origin)
  page.evaluate("""async()=>{
   const getFile=async(path,name,type)=>new File([await (await fetch(path)).blob()],name,{type,lastModified:1});
   window.files={
    text:await getFile('/fixtures/text.pdf','texto-ficticio.pdf','application/pdf'),
    scan:await getFile('/fixtures/scan.pdf','escaneo-ficticio.pdf','application/pdf'),
    image:await getFile('/fixtures/image.png','imagen-ficticia.png','image/png'),
    bad:await getFile('/fixtures/bad.txt','no-compatible.txt','text/plain')
   };
   window.refs=[
    {id:'ref-privada-serializada',name:'Privado ficticio.pdf',source:{kind:'document',id:'documento-privado',version:'v1',projectId:'proyecto-demo'}},
    {id:'ref-lenta-serializada',name:'Lectura lenta.pdf',source:{kind:'document',id:'lectura-lenta',version:'v1'}}
   ];
   window.resolveCalls=0;window.changes=[];
   window.api=ModernoSecretaryAttachments.mount({host:document.getElementById('host'),getExisting:()=>refs,resolveExisting:async(ref,{signal})=>{
    window.resolveCalls++;
    if(ref.source.id==='lectura-lenta')await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,2000);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('cancelada','AbortError'));},{once:true});});
    return files.text;
   },onChange:(payload,state)=>changes.push({payload,state})});
  }""")

  page.evaluate("api.attachFiles([files.text])")
  first=page.evaluate('api.snapshot()')
  assert len(first)==1 and first[0]['status']=='complete' and first[0]['totalPages']==2
  assert [item['page'] for item in first[0]['pages']]==[1,2]
  assert 'PAGINA UNO FICTICIA' in first[0]['pages'][0]['text'] and 'ABC123' in first[0]['pages'][1]['text']

  page.evaluate("api.attachFiles([files.image])")
  image_result=page.evaluate('api.snapshot()[1]')
  recognized=image_result['pages'][0]['text'].upper()
  assert 'DOCUMENTO FICTICIO' in recognized and '123,45' in recognized,recognized

  page.evaluate("api.attachFiles([files.scan])")
  scan_result=page.evaluate('api.snapshot()[2]')
  recognized=scan_result['pages'][0]['text'].upper()
  assert scan_result['totalPages']==1 and 'IMPORTE TOTAL' in recognized,recognized
  assert page.evaluate("new TextEncoder().encode(JSON.stringify(api.snapshot())).byteLength")<=23800
  assert page.locator('.secretary-attachment-ready,.secretary-attachment-partial').count()==3
  assert 'NO GUARDAR' in recognized,recognized
  assert '3 de 3 archivos listos' in page.locator('.secretary-attachments-summary').inner_text()

  first_id=first[0]['id'];page.evaluate('(id)=>api.remove(id)',first_id)
  page.evaluate("api.attachExisting(refs[0])")
  before=page.evaluate('api.state().items.length')
  page.evaluate("api.attachExisting(refs[0])")
  assert page.evaluate('api.state().items.length')==before and page.evaluate('resolveCalls')==1
  private=page.evaluate("api.snapshot().find(item=>item.source)")
  assert private['source']['id']=='documento-privado' and private['source']['kind']=='document'
  assert 'token' not in json.dumps(private).lower() and 'blob' not in json.dumps(private).lower()

  private_id=private['id'];page.evaluate('(id)=>api.remove(id)',private_id)
  page.evaluate("api.attachFiles([files.bad])")
  error_item=page.evaluate("api.state().items.find(item=>item.name==='no-compatible.txt')")
  assert error_item['state']=='error';count=page.evaluate('api.state().items.length')
  page.evaluate('(id)=>api.retry(id)',error_item['id'])
  assert page.evaluate('api.state().items.length')==count
  assert page.evaluate('(id)=>api.state().items.find(item=>item.id===id).state',error_item['id'])=='error'

  page.evaluate('(id)=>api.remove(id)',error_item['id'])
  page.evaluate("()=>{window.slow=api.attachExisting(refs[1]);}")
  page.wait_for_function("api.state().items.some(item=>item.name==='Lectura lenta.pdf'&&item.state==='reading')")
  slow_id=page.evaluate("api.state().items.find(item=>item.name==='Lectura lenta.pdf').id")
  assert page.evaluate('(id)=>api.cancel(id)',slow_id) is True
  page.evaluate('slow')
  assert page.evaluate('(id)=>api.state().items.find(item=>item.id===id).state',slow_id)=='cancelled'
  assert page.evaluate('(id)=>api.snapshot().some(item=>item.id===id)',slow_id) is False

  page.set_viewport_size({'width':390,'height':844})
  assert page.evaluate("document.documentElement.scrollWidth<=innerWidth") is True
  assert page.locator('.secretary-attachments-device').bounding_box()['height']>=36
  databases=page.evaluate("async()=>indexedDB.databases?await indexedDB.databases():[]")
  assert not [database for database in databases if database.get('name')],databases

  page.evaluate('api.clear()')
  assert page.evaluate('api.snapshot()')==[] and page.locator('.secretary-attachment').count()==0
  assert not outside,outside
  assert not errors,errors
  browser.close()
  print('PASS: PDF de texto (2 paginas), PDF escaneado e imagen por OCR local; origen privado, deduplicacion, limites, error, retry, cancelacion y limpieza')
finally:
 server.shutdown();server.server_close()
