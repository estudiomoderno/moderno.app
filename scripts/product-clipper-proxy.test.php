<?php
require __DIR__.'/../mailer/product-clipper-proxy-core.php';
$tests=0;
function proxy_check($ok){global $tests;$tests++;if(!$ok)throw new RuntimeException('Fallo en comprobación '.$tests);}
function proxy_denied(callable $fn,int $status){try{$fn();proxy_check(false);}catch(ProductClipperProxyError $e){proxy_check($e->getCode()===$status);}}
$server=['REQUEST_METHOD'=>'POST','HTTP_ORIGIN'=>'https://app.moderno.app','HTTP_AUTHORIZATION'=>'Bearer '.str_repeat('x',30)];
$read=json_encode(['action'=>'read','id'=>'11111111-1111-4111-8111-111111111111']);
$capture=json_encode(['action'=>'capture','id'=>'11111111-1111-4111-8111-111111111111','studyId'=>'22222222-2222-4222-8222-222222222222','url'=>'https://shop.example.invalid/product','destination'=>['kind'=>'biblioteca','brand'=>'cm']]);
$file=json_encode(['action'=>'file','path'=>'22222222-2222-4222-8222-222222222222/clipper/11111111-1111-4111-8111-111111111111/image.jpg']);
$request=product_clipper_proxy_request($server,$capture);proxy_check($request['token']===str_repeat('x',30));
$largeToken=str_repeat('z',16000);$envelope=json_encode(['session64'=>base64_encode($largeToken),'payload'=>json_decode($capture,true)]);$wrapped=product_clipper_proxy_request(['REQUEST_METHOD'=>'POST','HTTP_ORIGIN'=>'https://app.moderno.app'],$envelope);proxy_check($wrapped['token']===$largeToken&&json_decode($wrapped['raw'],true)['action']==='capture'&&strpos($wrapped['raw'],'session64')===false);
$wire=json_decode(product_clipper_proxy_wire($wrapped['token'],$wrapped['raw']),true);proxy_check(base64_decode($wire['session64'],true)===$largeToken&&$wire['payload']['action']==='capture');
$fileRequest=product_clipper_proxy_request($server,$file);proxy_check(json_decode($fileRequest['raw'],true)['action']==='file');
$prices=['action'=>'prices','studyId'=>'22222222-2222-4222-8222-222222222222','projectId'=>'9001','roomId'=>'8001','ids'=>['product-1','product-2']];
$priceRequest=product_clipper_proxy_request($server,json_encode($prices));proxy_check(json_decode($priceRequest['raw'],true)===$prices);
foreach ([[],['product-1','product-1'],['a','b','c','d'],['../other'],['0'=>20],['bad'=>'a']] as $ids) {
    proxy_denied(fn()=>product_clipper_proxy_request($server,json_encode(array_replace($prices,['ids'=>$ids]))),400);
}
$redirected=product_clipper_proxy_request(array_diff_key(array_replace($server,['REDIRECT_HTTP_AUTHORIZATION'=>'Bearer '.str_repeat('y',30)]),['HTTP_AUTHORIZATION'=>1]),$read);proxy_check($redirected['token']===str_repeat('y',30));
proxy_denied(fn()=>product_clipper_proxy_request(array_replace($server,['REQUEST_METHOD'=>'GET']),$read),405);
proxy_denied(fn()=>product_clipper_proxy_request(array_replace($server,['HTTP_ORIGIN'=>'https://app.moderno.app.evil.invalid']),$read),403);
proxy_denied(fn()=>product_clipper_proxy_request(array_diff_key($server,['HTTP_AUTHORIZATION'=>1]),$read),401);
proxy_denied(fn()=>product_clipper_proxy_request(array_replace($server,['HTTP_AUTHORIZATION'=>"Bearer token\r\nInjected: yes"]),$read),401);
proxy_denied(fn()=>product_clipper_proxy_request($server,str_repeat('x',65537)),413);
proxy_denied(fn()=>product_clipper_proxy_request($server,'{'),400);
proxy_denied(fn()=>product_clipper_proxy_request($server,json_encode(['action'=>'delete','id'=>'11111111-1111-4111-8111-111111111111'])),400);
proxy_denied(fn()=>product_clipper_proxy_request($server,json_encode(['action'=>'file','path'=>'22222222-2222-4222-8222-222222222222/../secret.jpg'])),400);
proxy_denied(fn()=>product_clipper_proxy_request($server,json_encode(['action'=>'capture','id'=>'11111111-1111-4111-8111-111111111111','studyId'=>'22222222-2222-4222-8222-222222222222','url'=>'file:///tmp/a','destination'=>[]])),400);
$forwardedToken='';$forwardedRaw='';
$response=product_clipper_proxy_forward($request['token'],$request['raw'],function($token,$raw)use(&$forwardedToken,&$forwardedRaw){$forwardedToken=$token;$forwardedRaw=$raw;return ['status'=>401,'body'=>'{"error":"La sesión ha caducado"}'];});
proxy_check($response['status']===401&&$response['body']['error']==='La sesión ha caducado');proxy_check($forwardedToken===$request['token']&&$forwardedRaw===$request['raw']);
proxy_denied(fn()=>product_clipper_proxy_forward($request['token'],$request['raw'],fn()=>['status'=>400,'body'=>'<html>bad gateway</html>']),502);
echo $tests." comprobaciones del puente del importador correctas; ninguna captura enviada\n";
