<?php
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
require_once __DIR__.'/product-clipper-proxy-core.php';
try {
    @set_time_limit(90);
    $raw=file_get_contents('php://input',false,null,0,10001);
    $request=product_clipper_proxy_request($_SERVER,$raw===false?'':$raw);
    $result=product_clipper_proxy_forward($request['token'],$request['raw']);
    http_response_code($result['status']);
    echo json_encode($result['body']);
} catch (ProductClipperProxyError $error) {
    http_response_code($error->getCode()>=400&&$error->getCode()<=599?$error->getCode():502);
    echo json_encode(['error'=>$error->getMessage()]);
} catch (Throwable $error) {
    http_response_code(502);echo json_encode(['error'=>'No se pudo conectar con el importador']);
}
