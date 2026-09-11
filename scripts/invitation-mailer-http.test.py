import sys
import pathlib, subprocess, tempfile, socket, ssl, threading, json, time, urllib.request, urllib.error, datetime, ipaddress, smtplib, hashlib
from email import policy
from email.parser import BytesParser
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

workspace=tempfile.TemporaryDirectory(prefix='moderno-mail-http-')
ROOT=pathlib.Path(workspace.name)
REPO=pathlib.Path(__file__).resolve().parents[1]
PHP=pathlib.Path(sys.argv[1]).resolve()
results=[]
from http.server import HTTPServer, BaseHTTPRequestHandler
class API(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def do_GET(self):
        if self.path=='/auth/v1/user': obj={'id':'actor','email':'admin@example.invalid'}
        elif self.path.startswith('/rest/v1/invitaciones?'): obj=[{'email':'test@example.invalid','rol':'miembro'}]
        elif self.path.startswith('/rest/v1/estudios?'): obj=[{'nombre':'ESTUDIO FICTICIO'}]
        else: raise AssertionError('Unexpected path')
        self.send_response(200);self.end_headers();self.wfile.write(json.dumps(obj).encode())
    def do_POST(self):
        assert self.path=='/rest/v1/rpc/app_rol'
        self.send_response(200);self.end_headers();self.wfile.write(b'"admin"')
api=HTTPServer(('127.0.0.1',3177),API)
threading.Thread(target=api.serve_forever,daemon=True).start()

def check(name,ok):
    results.append({'test':name,'ok':bool(ok)})
    if not ok: raise AssertionError(name)

with tempfile.TemporaryDirectory(prefix='mailer-test-',dir=ROOT) as temp:
    folder=pathlib.Path(temp)
    source=(REPO/'mailer/enviar-invitacion.php').read_bytes()
    helper=(REPO/'mailer/autorizar-invitacion.php').read_text(encoding='utf-8').replace('https://auth.moderno.app','http://127.0.0.1:3177')
    (folder/'autorizar-invitacion.php').write_text(helper,encoding='utf-8')
    (folder/'enviar-invitacion.php').write_bytes(source)
    (folder/'config.php').write_text("<?php return ['host'=>'127.0.0.1','port'=>465,'user'=>'test@example.invalid','pass'=>'fake-test-only'];",encoding='utf-8')
    key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    subject=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'Local recovery test')])
    now=datetime.datetime.now(datetime.timezone.utc)
    cert=(x509.CertificateBuilder().subject_name(subject).issuer_name(subject).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(now-datetime.timedelta(minutes=1)).not_valid_after(now+datetime.timedelta(hours=1)).add_extension(x509.SubjectAlternativeName([x509.IPAddress(ipaddress.ip_address('127.0.0.1'))]),critical=False).add_extension(x509.BasicConstraints(ca=True,path_length=None),critical=True).sign(key,hashes.SHA256()))
    (folder/'cert.pem').write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    (folder/'key.pem').write_bytes(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.TraditionalOpenSSL,serialization.NoEncryption()))
    context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);context.load_cert_chain(str(folder/'cert.pem'),str(folder/'key.pem'))
    server=socket.socket();server.bind(('127.0.0.1',465));server.listen();server.settimeout(.5)
    stop=threading.Event();messages=[];errors=[]
    def receive():
        while not stop.is_set():
            try: conn,_=server.accept()
            except socket.timeout: continue
            except OSError: break
            try:
                with context.wrap_socket(conn,server_side=True) as secure:
                    stream=secure.makefile('rwb');stream.write(b'220 localhost test\r\n');stream.flush();auth=0
                    while True:
                        line=stream.readline()
                        if not line: break
                        if auth==1: reply=b'334 UGFzc3dvcmQ6\r\n';auth=2
                        elif auth==2: reply=b'235 authenticated\r\n';auth=0
                        elif line.startswith(b'EHLO'): reply=b'250-localhost\r\n250 AUTH LOGIN\r\n'
                        elif line.startswith(b'AUTH LOGIN'): reply=b'334 VXNlcm5hbWU6\r\n';auth=1
                        elif line.startswith((b'MAIL FROM:',b'RCPT TO:')): reply=b'250 accepted\r\n'
                        elif line.startswith(b'DATA'):
                            stream.write(b'354 enter data\r\n');stream.flush();data=[]
                            while True:
                                part=stream.readline()
                                if part in (b'.\r\n',b''): break
                                data.append(part[1:] if part.startswith(b'..') else part)
                            messages.append(b''.join(data));reply=b'250 stored locally\r\n'
                        elif line.startswith(b'QUIT'):
                            stream.write(b'221 bye\r\n');stream.flush();break
                        else: reply=b'500 unsupported\r\n'
                        stream.write(reply);stream.flush()
            except Exception as e: errors.append(type(e).__name__)
    thread=threading.Thread(target=receive,daemon=True);thread.start()
    args=[str(PHP),'-n','-d','extension_dir='+str(PHP.parent/'ext'),'-d','extension=mbstring','-d','extension=openssl','-d','openssl.cafile='+str(folder/'cert.pem'),'-d','disable_functions=mail','-S','127.0.0.1:3172','-t',str(folder)]
    process=subprocess.Popen(args,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
    def request(data=None,origin='https://app.moderno.app'):
        headers={'Content-Type':'application/json','Authorization':'Bearer '+('x'*30)}
        if data is not None: data.setdefault('estudio_id','33700000-0000-4000-8000-000000000001')
        if origin is not None: headers['Origin']=origin
        req=urllib.request.Request('http://127.0.0.1:3172/enviar-invitacion.php',data=json.dumps(data).encode() if data is not None else None,headers=headers)
        try:
            with urllib.request.urlopen(req,timeout=20) as r: return r.status,json.loads(r.read())
        except urllib.error.HTTPError as e: return e.code,json.loads(e.read())
    try:
        for _ in range(40):
            try:
                with socket.create_connection(('127.0.0.1',3172),timeout=.2): break
            except OSError: time.sleep(.1)
        check('GET rejected',request()[0]==405)
        check('Other origin rejected',request({'email':'test@example.invalid'},'https://example.invalid')[0]==403)
        check('Invalid recipient rejected',request({'email':'invalid'})[0]==400)
        status,body=request({'email':'test@example.invalid','nombre':'Ensayo <script>no</script>','estudio':'ESTUDIO FICTICIO','rol':'Colaborador','remitente':'Prueba de recuperación'})
        check('Protected handler SMTP success with isolated Auth fixture',status==200 and body.get('ok') and body.get('version')=='v1.6')
        check('Exactly one local message',len(messages)==1 and not errors)
        message=BytesParser(policy=policy.default).parsebytes(messages[0])
        check('One valid date',len(message.get_all('Date',[]))==1 and message['Date'].datetime is not None)
        check('One message identifier',len(message.get_all('Message-ID',[]))==1 and str(message['Message-ID']).endswith('@moderno.app>'))
        check('SMTP safe ASCII and bounded lines',messages[0].isascii() and max(map(len,messages[0].split(b'\r\n'))) <= 998)
        check('CRLF only',b'\n' not in messages[0].replace(b'\r\n',b''))
        check('Plain and HTML transport encoding',all(p['Content-Transfer-Encoding']=='quoted-printable' for p in message.walk() if p.get_content_type() in ('text/plain','text/html')))
        check('Sender and reply address preserved',message['From'].addresses[0].addr_spec=='test@example.invalid' and message['Reply-To'].addresses[0].addr_spec=='hola@moderno.app')
        check('MIME alternative and embedded logo',{'text/plain','text/html','image/png'}.issubset({p.get_content_type() for p in message.walk()}))
        check('Correct synthetic recipient',len(message['To'].addresses)==1 and message['To'].addresses[0].addr_spec=='test@example.invalid')
        check('Correct study in subject','ESTUDIO FICTICIO' in str(message['Subject']))
        check('HTML input stripped','<script>' not in message.get_body(preferencelist=('html',)).get_content())
        check('Candidate handler byte identical',hashlib.sha256((folder/'enviar-invitacion.php').read_bytes()).digest()==hashlib.sha256(source).digest())
    finally:
        process.terminate();process.wait(timeout=10);stop.set();server.close();thread.join(timeout=2)
(ROOT/'mailer-auth-result.json').write_text(json.dumps({'checks':results,'live_mail_sent':False,'local_captured_messages':1},indent=2),encoding='utf-8')
print(json.dumps({'passed':len(results),'live_mail_sent':False,'local_captured_messages':1}))

api.shutdown();api.server_close()

workspace.cleanup()
