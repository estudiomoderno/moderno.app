<?php
// Moderno.app invitation mailer; SMTP configuration stays private on the server.
$MOTOR_VERSION='v1.6';
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
require_once __DIR__.'/autorizar-invitacion.php';
try {
  $raw=file_get_contents('php://input',false,null,0,8193);
  if (strlen($raw)>8192) throw new InvitationError('Solicitud demasiado grande',413);
  $b=json_decode($raw,true);
  if (!is_array($b)) $b=[];
  $req=invitation_request($_SERVER,$b);
  $verified=invitation_authorize($req,fn($method,$path,$body)=>invitation_api($req['token'],$method,$path,$body));
  $rateDir=sys_get_temp_dir().'/moderno-invitations-'.hash('sha256',__DIR__);
  if(is_link($rateDir)||(!is_dir($rateDir)&&!@mkdir($rateDir,0700)&&!is_dir($rateDir)))throw new InvitationError('No se pudo comprobar el límite de envíos',503);
  invitation_throttle($rateDir,$verified['actor'],$req['study'],$verified['email'],time());
} catch (InvitationError $e) {
  http_response_code($e->getCode());echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);exit;
} catch (Throwable $e) {
  http_response_code(503);echo json_encode(['ok'=>false,'error'=>'No se pudo verificar la invitación']);exit;
}
$CFG=@include __DIR__.'/config.php';if(!is_array($CFG))$CFG=[];
$limpia=fn($s,$n)=>mb_substr(trim(strip_tags((string)$s)),0,$n);
$email=$verified['email'];
$nombre='Hola';
$rol=$limpia($verified['rol'],40);
$estudio=$limpia($verified['estudio'],80);
$remitente=$limpia($verified['remitente'],254);
$h = fn($s)=> htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
$logo = 'cid:logomoderno';

$html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4F3F0;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3F0;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:18px;overflow:hidden;border:1px solid #ECECE8">
<tr><td style="padding:28px 36px 18px 36px"><img src="'.$logo.'" alt="Moderno.app" width="132" style="display:block;border:0"></td></tr>
<tr><td style="padding:0 36px"><div style="height:4px;background:#F6D64B;border-radius:99px;width:56px"></div></td></tr>
<tr><td style="padding:22px 36px 6px 36px">
<h1 style="margin:0 0 10px 0;font-size:24px;line-height:1.25;color:#141412;font-weight:800">'.$h($nombre).', te han invitado a <span style="background:#FBEFA9;border-radius:6px;padding:0 6px">'.$h($estudio).'</span></h1>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#4A4A45">Ya tienes un sitio en el espacio de trabajo de <b>'.$h($estudio).'</b> en <b>Moderno.app</b>, con el rol de <b>'.$h($rol).'</b>. Proyectos, listas de compra, obra y facturación — todo en un mismo lugar.</p></td></tr>
<tr><td style="padding:8px 36px 4px 36px"><a href="https://app.moderno.app" target="_blank" style="display:inline-block;background:#141412;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:99px">Aceptar invitación &rarr;</a></td></tr>
<tr><td style="padding:18px 36px 8px 36px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF9F6;border:1px solid #EEEDE8;border-radius:12px"><tr><td style="padding:14px 18px">
<p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#141412">Cómo entrar</p>
<p style="margin:0;font-size:13.5px;line-height:1.7;color:#4A4A45">Entra con <b>Google</b> o <b>crea tu cuenta con tu correo</b> en app.moderno.app.<br>Importante: usa este mismo email — <b>'.$h($email).'</b> — para que el sistema te reconozca.</p>
</td></tr></table></td></tr>
<tr><td style="padding:10px 36px 26px 36px"><p style="margin:0;font-size:14px;color:#4A4A45">¡Nos vemos dentro!<br><b>'.$h($remitente).'</b></p></td></tr>
<tr><td style="padding:16px 36px;background:#141412"><p style="margin:0;font-size:12px;color:#B9B8B2"><b style="color:#F6D64B">Moderno.app</b> — la única que llega hasta la obra.<br>Este correo se envió porque '.$h($remitente).' te invitó a su espacio de trabajo.</p></td></tr>
</table><p style="margin:14px 0 0 0;font-size:11px;color:#9A9993">&copy; Moderno.app &middot; hola@moderno.app</p></td></tr></table></body></html>';


/* ---- envío SMTP autenticado (sin dependencias) ---- */
function smtp_enviar($cfg, $to, $subjectB64, $html, &$diag){
  $host=$cfg['host']??''; $port=(int)($cfg['port']??587); $user=$cfg['user']??''; $pass=$cfg['pass']??'';
  if(!$host||!$user||!$pass){ $diag='sin config'; return false; }
  $errno=0; $errstr='';
  $dir = ($port===465? 'ssl://' : 'tcp://').$host;
  $fp=@stream_socket_client($dir.':'.$port, $errno, $errstr, 12);
  if(!$fp){ $diag='conexión: '.$errstr; return false; }
  stream_set_timeout($fp,12);
  $lee=function() use($fp){ $s=''; while($l=fgets($fp,515)){ $s.=$l; if(strlen($l)<4||$l[3]!=='-') break; } return $s; };
  $di =function($c) use($fp,$lee){ fputs($fp,$c."\r\n"); return $lee(); };
  $r=$lee(); if(strpos($r,'220')!==0){ $diag='saludo: '.trim($r); fclose($fp); return false; }
  $r=$di('EHLO moderno.app');
  if($port!==465){
    $r=$di('STARTTLS');
    if(strpos($r,'220')!==0){ $diag='starttls: '.trim($r); fclose($fp); return false; }
    if(!stream_socket_enable_crypto($fp,true,STREAM_CRYPTO_METHOD_TLS_CLIENT)){ $diag='tls'; fclose($fp); return false; }
    $r=$di('EHLO moderno.app');
  }
  $r=$di('AUTH LOGIN');            if(strpos($r,'334')!==0){ $diag='auth: '.trim($r); fclose($fp); return false; }
  $r=$di(base64_encode($user));    if(strpos($r,'334')!==0){ $diag='usuario: '.trim($r); fclose($fp); return false; }
  $r=$di(base64_encode($pass));    if(strpos($r,'235')!==0){ $diag='contraseña rechazada'; fclose($fp); return false; }
  $r=$di('MAIL FROM:<'.$user.'>'); if(strpos($r,'250')!==0){ $diag='mail from: '.trim($r); fclose($fp); return false; }
  $r=$di('RCPT TO:<'.$to.'>');     if(strpos($r,'250')!==0 && strpos($r,'251')!==0){ $diag='rcpt: '.trim($r); fclose($fp); return false; }
  $r=$di('DATA');                  if(strpos($r,'354')!==0){ $diag='data: '.trim($r); fclose($fp); return false; }
  $msg ="From: =?UTF-8?B?".base64_encode('Moderno.app')."?= <".$user.">\r\n";
  $msg.="To: <".$to.">\r\n";
  $msg.="Reply-To: hola@moderno.app\r\n";
  $msg.="Date: ".date(DATE_RFC2822)."\r\n";
  $msg.="Message-ID: <".bin2hex(random_bytes(16))."@moderno.app>\r\n";
  $msg.="Subject: ".$subjectB64."\r\n";
  $msg.="MIME-Version: 1.0\r\nContent-Type: ".$GLOBALS['ctHeader']."\r\n\r\n";
  $msg.=str_replace("\n.","\n..",$GLOBALS['cuerpoMime'])."\r\n.";
  $r=$di($msg);                    if(strpos($r,'250')!==0){ $diag='envío: '.trim($r); fclose($fp); return false; }
  $di('QUIT'); fclose($fp); $diag='ok'; return true;
}

$asuntoRaw = 'Invitación a '.$estudio.' en Moderno.app';
$asunto = '=?UTF-8?B?'.base64_encode($asuntoRaw).'?=';

$texto = $nombre.", te han invitado a ".$estudio." en Moderno.app con el rol de ".$rol.".\r\n\r\n".
  "Entra en https://app.moderno.app con Google o creando tu cuenta con tu correo. Importante: usa este mismo email (".$email.").\r\n\r\n".
  "¡Nos vemos dentro! — ".$remitente;

$LOGO_B64 = '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';
$bR='REL_'.bin2hex(random_bytes(12)); $bA='ALT_'.bin2hex(random_bytes(12));
$ctHeader = 'multipart/related; boundary="'.$bR.'"';
$cuerpoMime =
 "--".$bR."\r\n".
 "Content-Type: multipart/alternative; boundary=\"".$bA."\"\r\n\r\n".
 "--".$bA."\r\n".
 "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n".
 quoted_printable_encode(preg_replace('/\r\n|\r|\n/', "\r\n", $texto))."\r\n\r\n".
 "--".$bA."\r\n".
 "Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n".
 quoted_printable_encode(preg_replace('/\r\n|\r|\n/', "\r\n", $html))."\r\n\r\n".
 "--".$bA."--\r\n\r\n".
 "--".$bR."\r\n".
 "Content-Type: image/png; name=\"logo.png\"\r\n".
 "Content-Transfer-Encoding: base64\r\n".
 "Content-ID: <logomoderno>\r\n".
 "Content-Disposition: inline; filename=\"logo.png\"\r\n\r\n".
 chunk_split($LOGO_B64, 76, "\r\n").
 "--".$bR."--";

$cab  = "MIME-Version: 1.0\r\n";
$cab .= "Content-Type: ".$ctHeader."\r\n";
$cab .= "From: =?UTF-8?B?".base64_encode('Moderno.app')."?= <team@moderno.app>\r\n";
$cab .= "Reply-To: hola@moderno.app\r\n";

$diag='';
$ok = smtp_enviar($CFG, $email, $asunto, $html, $diag);
if ($ok) echo json_encode(['ok'=>true,'version'=>$MOTOR_VERSION]);
else { http_response_code(502); echo json_encode(['ok'=>false,'error'=>'No se ha podido confirmar el envío. Comprueba si llegó antes de reenviarlo.','version'=>$MOTOR_VERSION]); }
