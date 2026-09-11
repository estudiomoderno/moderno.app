"""Read the deployed api directory through FTPS; verify a private Drive backup.
Never prints source code, filenames, remote locations or credentials.
"""
import ftplib, ssl, os, json, tempfile, pathlib, subprocess, hashlib, datetime, uuid

def safe_name(name):
    return bool(name) and name not in ('.', '..') and not any(c in name for c in '/\\\r\n\x00')

def inventory(ftp, folder='api', depth=0):
    if depth > 10:
        raise ValueError('depth')
    result=[]
    for name, info in ftp.mlsd(folder):
        if info.get('type') in ('cdir','pdir'):
            continue
        if not safe_name(name):
            raise ValueError('name')
        item=folder+'/'+name
        if info.get('type') == 'dir':
            result.extend(inventory(ftp,item,depth+1))
        elif info.get('type') == 'file':
            result.append({'path':item,'size':int(info['size']),'modified':info.get('modify','')})
        else:
            raise ValueError('unsupported entry')
        if len(result)>1000:
            raise ValueError('count')
    return sorted(result,key=lambda x:x['path'])

def run():
    config=json.loads(os.environ['GOOGLE_CONFIG'])
    env={**os.environ,'RCLONE_CONFIG_DESTINATION_TYPE':'drive','RCLONE_CONFIG_DESTINATION_SCOPE':'drive',
         'RCLONE_CONFIG_DESTINATION_ROOT_FOLDER_ID':config['folder_id'],'RCLONE_CONFIG_DESTINATION_TEAM_DRIVE':config['team_drive'],
         'RCLONE_CONFIG_DESTINATION_TOKEN':json.dumps({'access_token':os.environ['GOOGLE_ACCESS_TOKEN'],'token_type':'Bearer',
           'expiry':(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(minutes=55)).isoformat()})}
    def rclone(*args):
        result=subprocess.run(['rclone',*args,'--log-level','ERROR','--stats','0'],env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        if result.returncode:
            raise RuntimeError('private copy')
    with tempfile.TemporaryDirectory(prefix='moderno-service-') as directory:
        root=pathlib.Path(directory)
        with ftplib.FTP_TLS(context=ssl.create_default_context(),timeout=60) as ftp:
            ftp.connect(os.environ['FTP_HOST'],21);ftp.login(os.environ['FTP_USER'],os.environ['FTP_PASSWORD']);ftp.prot_p()
            ftp.cwd(os.environ['FTP_SERVER_DIR'])
            before=inventory(ftp)
            if not before or not any(x['path']=='api/enviar-invitacion.php' for x in before) or sum(x['size'] for x in before)>50_000_000:
                raise ValueError('scope')
            for item in before:
                dest=root/'objects'/item['path'];dest.parent.mkdir(parents=True,exist_ok=True)
                with dest.open('wb') as output:
                    ftp.retrbinary('RETR '+item['path'],output.write)
                if dest.stat().st_size!=item['size']:
                    raise ValueError('size')
            if before!=inventory(ftp):
                raise ValueError('source changed')
        for item in before:
            item['sha256']=hashlib.sha256((root/'objects'/item['path']).read_bytes()).hexdigest()
        (root/'manifest.json').write_text(json.dumps({'version':1,'scope':'api','files':before}),encoding='utf8')
        stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        destination='destination:servicio-'+stamp+'-'+str(uuid.uuid4())
        rclone('copy',str(root),destination,'--immutable')
        rclone('check',str(root),destination,'--download')
        marker=root/'COMPLETE.json';marker.write_text(json.dumps({'version':1,'scope':'api','count':len(before),'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}),encoding='utf8')
        rclone('copyto',str(marker),destination+'/COMPLETE.json','--immutable')
        print('Private server source backup verified. Files:',len(before))

if __name__=='__main__':
    try:
        run()
    except Exception:
        print('Server source backup failed. No server files were modified.')
        raise SystemExit(1)
