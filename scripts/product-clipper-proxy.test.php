<?php
require __DIR__.'/../mailer/product-clipper-proxy-core.php';
$tests=0;
function proxy_check($ok){global $tests;$tests++;if(!$ok)throw new RuntimeException('Fallo en comprobación '.$tests);}
function proxy_denied(callable $fn,int $status){try{$fn();proxy_check(false);}catch(ProductClipperProxyError $e){proxy_check($e->getCode()===$status);}}
$server=['REQUEST_METHOD'=>'POST','HTTP_ORIGIN'=>'https://app.moderno.app','HTTP_X_MODERNO_SESSION'=>str_repeat('x',30)];
$read=json_encode(['action'=>'read','id'=>'11111111-1111-4111-8111-111111111111']);
$capture=json_encode(['action'=>'capture','id'=>'11111111-1111-4111-8111-111111111111','studyId'=>'22222222-2222-4222-8222-222222222222','url'=>'https://shop.example.invalid/product','destination'=>['kind'=>'biblioteca','brand'=>'cm']]);
$request=product_clipper_proxy_request($server,$capture);proxy_check($request['token']===str_repeat('x',30));
$bearer=product_clipper_proxy_request(array_replace($server,['HTTP_X_MODERNO_SESSION'=>'Bearer '.str_repeat('y',30)]),$read);proxy_check($bearer['token']===str_repeat('y',30));
proxy_denied(fn()=>product_clipper_proxy_request(array_replace($server,['REQUEST_METHOD'=>'GET']),$read),405);
proxy_denied(fn()=>product_clipper_proxy_request(array_replace($server,['HTTP_ORIGIN'=>'https://app.moderno.app.evil.invalid']),$read),403);
proxy_denied(fn()=>product_clipper_proxy_request(array_diff_key($server,['HTTP_X_MODERNO_SESSION'=>1]),$read),401);
proxy_denied(fn()=>product_clipper_proxy_request(array_replace($server,['HTTP_X_MODERNO_SESSION'=>"token\r\nInjected: yes"]),$read),401);
proxy_denied(fn()=>product_clipper_proxy_request($server,str_repeat('x',10001)),413);
proxy_denied(fn()=>product_clipper_proxy_request($server,'{'),400);
proxy_denied(fn()=>product_clipper_proxy_request($server,json_encode(['action'=>'delete','id'=>'11111111-1111-4111-8111-111111111111'])),400);
proxy_denied(fn()=>product_clipper_proxy_request($server,json_encode(['action'=>'capture','id'=>'11111111-1111-4111-8111-111111111111','studyId'=>'22222222-2222-4222-8222-222222222222','url'=>'file:///tmp/a','destination'=>[]])),400);
$forwardedToken='';$forwardedRaw='';
$response=product_clipper_proxy_forward($request['token'],$request['raw'],function($token,$raw)use(&$forwardedToken,&$forwardedRaw){$forwardedToken=$token;$forwardedRaw=$raw;return ['status'=>401,'body'=>'{"error":"La sesión ha caducado"}'];});
proxy_check($response['status']===401&&$response['body']['error']==='La sesión ha caducado');proxy_check($forwardedToken===$request['token']&&$forwardedRaw===$request['raw']);
proxy_denied(fn()=>product_clipper_proxy_forward($request['token'],$request['raw'],fn()=>['status'=>400,'body'=>'<html>bad gateway</html>']),502);
echo $tests." comprobaciones del puente del importador correctas; ninguna captura enviada\n";
