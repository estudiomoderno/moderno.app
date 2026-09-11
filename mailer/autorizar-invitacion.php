<?php
// No service-role credentials. Every lookup uses the caller's token and RLS.
final class InvitationError extends RuntimeException {}
function invitation_request(array $server, array $body): array {
    if (($server['REQUEST_METHOD'] ?? '') !== 'POST') throw new InvitationError('Solo POST',405);
    if (($server['HTTP_ORIGIN'] ?? '') !== '' && $server['HTTP_ORIGIN'] !== 'https://app.moderno.app') throw new InvitationError('Origen no permitido',403);
    $auth=$server['HTTP_AUTHORIZATION'] ?? $server['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer ([A-Za-z0-9._-]{20,8192})$/D',$auth,$m)) throw new InvitationError('Inicia sesión de nuevo',401);
    $study=$body['estudio_id'] ?? ''; $email=$body['email'] ?? '';
    if (!is_string($study)||!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iD',$study)) throw new InvitationError('Estudio no válido',400);
    if (!is_string($email)||strlen($email)>254||!filter_var($email,FILTER_VALIDATE_EMAIL)) throw new InvitationError('Email no válido',400);
    return ['token'=>$m[1],'study'=>strtolower($study),'email'=>strtolower($email)];
}
function invitation_authorize(array $request, callable $api): array {
    $user=$api('GET','/auth/v1/user',null);
    if (!is_array($user)||empty($user['id'])||empty($user['email'])) throw new InvitationError('Sesión no válida',401);
    if ($api('POST','/rest/v1/rpc/app_rol',['p_estudio'=>$request['study']]) !== 'admin') throw new InvitationError('Solo un administrador puede enviar invitaciones',403);
    $filter='estudio_id=eq.'.rawurlencode($request['study']).'&email=eq.'.rawurlencode($request['email']);
    $rows=$api('GET','/rest/v1/invitaciones?select=email,rol&'.$filter.'&limit=2',null);
    if (!is_array($rows)||count($rows)!==1||strtolower($rows[0]['email']??'')!==$request['email']||!in_array($rows[0]['rol']??'', ['admin','miembro'],true)) throw new InvitationError('La invitación ya no está disponible',403);
    $studies=$api('GET','/rest/v1/estudios?select=nombre&id=eq.'.rawurlencode($request['study']).'&limit=1',null);
    if (!is_array($studies)||count($studies)!==1||empty($studies[0]['nombre'])) throw new InvitationError('No se pudo comprobar el estudio',403);
    return ['email'=>$request['email'],'rol'=>$rows[0]['rol']==='admin'?'Administrador':'Miembro del equipo','estudio'=>$studies[0]['nombre'],'remitente'=>$user['email'],'actor'=>$user['id']];
}
function invitation_api(string $token,string $method,string $path,?array $body) {
    $headers="apikey: sb_publishable_MfUr7rezJhqiX1ujS295aA_aDF-YbLu\r\nAuthorization: Bearer ".$token."\r\nContent-Type: application/json\r\n";
    $ctx=stream_context_create(['http'=>['method'=>$method,'header'=>$headers,'content'=>$body===null?'':json_encode($body),'timeout'=>12,'ignore_errors'=>true,'follow_location'=>0], 'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]);
    $data=@file_get_contents('https://auth.moderno.app'.$path,false,$ctx);
    $status=$http_response_header[0]??'';
    if (!preg_match('/^HTTP\/\S+ 200\b/',$status)) throw new InvitationError('No se pudo verificar la autorización',preg_match('/ 40[13]\b/',$status)?403:503);
    $decoded=json_decode($data?:'',true);
    if (json_last_error()!==JSON_ERROR_NONE) throw new InvitationError('Respuesta de autorización no válida',503);
    return $decoded;
}
function invitation_throttle(string $directory,string $actor,string $study,string $email,int $now): void {
    // One locked file per study; reservations happen before SMTP, including uncertain failures.
    $file=$directory.'/moderno-invite-'.hash('sha256',$study).'.json';
    $fp=@fopen($file,'c+');
    if (!$fp||!flock($fp,LOCK_EX)) throw new InvitationError('No se pudo comprobar el límite de envíos',503);
    try {
        @chmod($file,0600);$raw=stream_get_contents($fp);$events=$raw===''?[]:json_decode($raw,true);
        if (!is_array($events)) throw new InvitationError('No se pudo comprobar el límite de envíos',503);
        $events=array_values(array_filter($events,fn($e)=>is_array($e)&&($e['at']??0)>$now-3600));
        $recipient=hash('sha256',$email);
        foreach($events as $e) if (($e['to']??'')===$recipient&&$e['at']>$now-60) throw new InvitationError('Espera un minuto antes de reenviar esta invitación',429);
        if (count($events)>=20) throw new InvitationError('Límite temporal de invitaciones alcanzado; inténtalo más tarde',429);
        $events[]=['at'=>$now,'to'=>$recipient,'actor'=>hash('sha256',$actor)];$encoded=json_encode($events);
        rewind($fp);if(!ftruncate($fp,0)||fwrite($fp,$encoded)!==strlen($encoded)||!fflush($fp)) throw new InvitationError('No se pudo registrar el intento de envío',503);
    } finally {flock($fp,LOCK_UN);fclose($fp);}
}
