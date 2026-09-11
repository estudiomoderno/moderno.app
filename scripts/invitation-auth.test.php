<?php
require __DIR__.'/../mailer/autorizar-invitacion.php';
$tests=0;
function check($ok){global $tests;$tests++;if(!$ok)throw new RuntimeException('Fallo en comprobación '.$tests);}
function denied(callable $fn,int $status){try{$fn();check(false);}catch(InvitationError $e){check($e->getCode()===$status);}}
$server=['REQUEST_METHOD'=>'POST','HTTP_ORIGIN'=>'https://app.moderno.app','HTTP_AUTHORIZATION'=>'Bearer '.str_repeat('x',30)];
$body=['email'=>'persona@example.invalid','estudio_id'=>'33700000-0000-4000-8000-000000000001'];
$req=invitation_request($server,$body);check($req['email']===$body['email']);
denied(fn()=>invitation_request(array_diff_key($server,['HTTP_AUTHORIZATION'=>1]),$body),401);
denied(fn()=>invitation_request(array_replace($server,['HTTP_AUTHORIZATION'=>"Bearer abc\r\nInjected: yes"]),$body),401);
denied(fn()=>invitation_request(array_replace($server,['HTTP_ORIGIN'=>'https://app.moderno.app.evil.invalid']),$body),403);
denied(fn()=>invitation_request(array_replace($server,['REQUEST_METHOD'=>'GET']),$body),405);
denied(fn()=>invitation_request($server,array_replace($body,['estudio_id'=>'bad'])),400);
denied(fn()=>invitation_request($server,array_replace($body,['email'=>"x@example.invalid\r\nBcc: other@example.invalid"])),400);
function api_fixture($role='admin',$rows=null,$user=null){return function($method,$path,$body)use($role,$rows,$user){
 if($path==='/auth/v1/user')return $user??['id'=>'actor','email'=>'admin@example.invalid'];
 if($path==='/rest/v1/rpc/app_rol')return $role;
 if(strpos($path,'/rest/v1/invitaciones?')===0)return $rows??[['email'=>'persona@example.invalid','rol'=>'miembro']];
 if(strpos($path,'/rest/v1/estudios?')===0)return [['nombre'=>'Estudio verificado']];
 throw new RuntimeException('Ruta inesperada');};}
$authorized=invitation_authorize($req,api_fixture());check($authorized['estudio']==='Estudio verificado');check($authorized['remitente']==='admin@example.invalid');check($authorized['rol']==='Miembro del equipo');
foreach(['colaborador','gestoria','cliente','contratista',null] as $role)denied(fn()=>invitation_authorize($req,api_fixture($role)),403);
denied(fn()=>invitation_authorize($req,api_fixture('admin',[])),403);
denied(fn()=>invitation_authorize($req,api_fixture('admin',[['email'=>'otra@example.invalid','rol'=>'admin']])),403);
denied(fn()=>invitation_authorize($req,api_fixture('admin',null,[])),401);
denied(fn()=>invitation_authorize($req,function(){throw new InvitationError('No disponible',503);}),503);
$paths=[];invitation_authorize($req,function($method,$path,$body)use(&$paths){$paths[]=$path;return api_fixture()($method,$path,$body);});check(strpos($paths[2],'estudio_id=eq.33700000-0000-4000-8000-000000000001&email=eq.persona%40example.invalid')!==false);
$dir=sys_get_temp_dir().'/moderno-mail-test-'.bin2hex(random_bytes(8));mkdir($dir,0700);
try{invitation_throttle($dir,'actor','study','x@example.invalid',10000);denied(fn()=>invitation_throttle($dir,'other','study','x@example.invalid',10001),429);invitation_throttle($dir,'actor','study','x@example.invalid',10061);check(true);
for($i=0;$i<18;$i++)invitation_throttle($dir,'actor','study','other'.$i.'@example.invalid',10062);
denied(fn()=>invitation_throttle($dir,'actor','study','last@example.invalid',10063),429);invitation_throttle($dir,'actor','study','last@example.invalid',14000);check(true);
}finally{foreach(glob($dir.'/*.json') as $file)unlink($file);rmdir($dir);}
echo $tests." comprobaciones de autorización correctas; ningún correo enviado\n";
