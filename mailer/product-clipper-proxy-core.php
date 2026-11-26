<?php
// Same-origin transport for Product Clipper. No service-role credentials.
final class ProductClipperProxyError extends RuntimeException {}

function product_clipper_proxy_request(array $server,string $raw): array {
    if (($server['REQUEST_METHOD'] ?? '') !== 'POST') throw new ProductClipperProxyError('Solo POST',405);
    $origin=$server['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && $origin !== 'https://app.moderno.app') throw new ProductClipperProxyError('Origen no permitido',403);
    if (strlen($raw)>65536) throw new ProductClipperProxyError('Solicitud demasiado grande',413);
    $decoded=json_decode($raw,true);
    if (!is_array($decoded)) throw new ProductClipperProxyError('Solicitud no válida',400);
    if (isset($decoded['session64'],$decoded['payload'])&&is_string($decoded['session64'])&&is_array($decoded['payload'])) {
        $session=base64_decode($decoded['session64'],true);
        if ($session===false) throw new ProductClipperProxyError('Inicia sesión de nuevo',401);
        $body=$decoded['payload'];$raw=json_encode($body,JSON_UNESCAPED_SLASHES);
        if ($raw===false||strlen($raw)>10000) throw new ProductClipperProxyError('Solicitud demasiado grande',413);
    } else {
        $session=$server['HTTP_AUTHORIZATION'] ?? $server['REDIRECT_HTTP_AUTHORIZATION'] ?? $server['HTTP_X_MODERNO_SESSION'] ?? '';
        $body=$decoded;
    }
    if (strncmp($session,'Bearer ',7)===0) $session=substr($session,7);
    if (!preg_match('/^[A-Za-z0-9._-]{20,32768}$/D',$session)) throw new ProductClipperProxyError('Inicia sesión de nuevo',401);
    $uuid='/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iD';
    if (($body['action'] ?? '')==='prices') {
        $validId=fn($value)=>is_string($value)&&preg_match('/^[a-z0-9_-]{1,120}$/iD',$value);
        $ids=$body['ids'] ?? null;
        if (!is_string($body['studyId'] ?? null)||!preg_match($uuid,$body['studyId'])||
            !$validId($body['projectId'] ?? null)||!$validId($body['roomId'] ?? null)||
            !is_array($ids)||count($ids)<1||count($ids)>3||array_keys($ids)!==range(0,count($ids)-1)||
            count(array_filter($ids,$validId))!==count($ids)||count(array_unique($ids))!==count($ids)) {
            throw new ProductClipperProxyError('Solicitud de precios no válida',400);
        }
        return ['token'=>$session,'raw'=>$raw];
    }
    if (($body['action'] ?? '')==='file') {
        $path=$body['path'] ?? null;$parts=is_string($path)?explode('/',$path):[];
        if (!is_string($path)||strlen($path)>1024||!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//iD',$path)||preg_match('/[\\\\\x00-\x1f?#%]/',$path)||in_array('', $parts,true)||in_array('.', $parts,true)||in_array('..', $parts,true)) throw new ProductClipperProxyError('Solicitud no válida',400);
        return ['token'=>$session,'raw'=>$raw];
    }
    if (!is_string($body['id'] ?? null)||!preg_match($uuid,$body['id'])) throw new ProductClipperProxyError('Solicitud no válida',400);
    if (($body['action'] ?? '')==='read') return ['token'=>$session,'raw'=>$raw];
    if (($body['action'] ?? '')!=='capture'||!is_string($body['studyId'] ?? null)||!preg_match($uuid,$body['studyId'])||!is_array($body['destination'] ?? null)) throw new ProductClipperProxyError('Solicitud no válida',400);
    $url=filter_var($body['url'] ?? '',FILTER_VALIDATE_URL);
    if (!$url||!in_array(strtolower(parse_url($url,PHP_URL_SCHEME)??''),['http','https'],true)||strlen($url)>4096) throw new ProductClipperProxyError('URL no válida',400);
    return ['token'=>$session,'raw'=>$raw];
}

function product_clipper_proxy_http(string $token,string $raw): array {
    $headers="Content-Type: application/json\r\nAccept: application/json\r\nUser-Agent: Moderno-product-clipper-proxy/1.0\r\nConnection: close\r\n";
    $wire=product_clipper_proxy_wire($token,$raw);
    $context=stream_context_create(['http'=>['method'=>'POST','header'=>$headers,'content'=>$wire,'timeout'=>75,'ignore_errors'=>true,'follow_location'=>0,'protocol_version'=>1.1],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]);
    $data=@file_get_contents('https://cgqtylvaapwbuwqvpjtb.supabase.co/functions/v1/product-clipper',false,$context);
    $responseHeaders=$http_response_header ?? [];$status=0;
    foreach($responseHeaders as $header) if(preg_match('/^HTTP\/\S+\s+(\d{3})\b/',$header,$match))$status=(int)$match[1];
    if ($status<200||$status>599) throw new ProductClipperProxyError('No se pudo conectar con el importador',502);
    return ['status'=>$status,'body'=>$data===false?'':$data];
}

function product_clipper_proxy_wire(string $token,string $raw): string {
    $payload=json_decode($raw,true);
    if(!is_array($payload))throw new ProductClipperProxyError('Solicitud no válida',400);
    $wire=json_encode(['session64'=>base64_encode($token),'payload'=>$payload],JSON_UNESCAPED_SLASHES);
    if($wire===false||strlen($wire)>65536)throw new ProductClipperProxyError('Solicitud demasiado grande',413);
    return $wire;
}

function product_clipper_proxy_forward(string $token,string $raw,?callable $transport=null): array {
    $result=($transport ?? 'product_clipper_proxy_http')($token,$raw);
    $status=(int)($result['status'] ?? 0);$decoded=json_decode((string)($result['body'] ?? ''),true);
    if ($status<200||$status>599||!is_array($decoded)) throw new ProductClipperProxyError('El importador no devolvió una respuesta válida',502);
    return ['status'=>$status,'body'=>$decoded];
}
