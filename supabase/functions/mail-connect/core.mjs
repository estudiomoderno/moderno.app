const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOST=/^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export class MailInputError extends Error{
 constructor(message,code='invalid_request'){super(message);this.name='MailInputError';this.code=code;}
}
const text=(value,max)=>{
 if(typeof value!=='string')throw new MailInputError('Falta información de la cuenta');
 const result=value.trim();
 if(!result||result.length>max)throw new MailInputError('Revisa los datos de la cuenta');
 return result;
};
const email=value=>{const result=text(value,254).toLowerCase();if(!EMAIL.test(result))throw new MailInputError('Escribe una dirección de correo válida');return result;};
const host=value=>{const result=text(value,253).toLowerCase().replace(/\.$/,'');if(!HOST.test(result))throw new MailInputError('Escribe un servidor de correo válido');return result;};
const port=(value,allowed,label)=>{const result=Number(value);if(!Number.isInteger(result)||!allowed.includes(result))throw new MailInputError(`${label} debe usar un puerto seguro compatible`);return result;};
const security=(value,label)=>{if(!['tls','starttls'].includes(value))throw new MailInputError(`${label} debe usar TLS o STARTTLS`);return value;};

export function studyId(value){if(typeof value!=='string'||!UUID.test(value))throw new MailInputError('Estudio no válido');return value.toLowerCase();}
export function connectionId(value){if(typeof value!=='string'||!UUID.test(value))throw new MailInputError('Conexión no válida');return value.toLowerCase();}

export function passwordConnection(body){
 const provider=body?.provider;
 if(provider==='icloud'){
  const account=email(body.email),password=text(body.password,1024);
  return {provider,email:account,displayName:account,password,imap:{host:'imap.mail.me.com',port:993,security:'tls',user:account},smtp:{host:'smtp.mail.me.com',port:587,security:'starttls',user:account}};
 }
 if(provider!=='server')throw new MailInputError('Proveedor de correo no válido');
 const account=email(body.email),password=text(body.password,1024);
 return {
  provider,email:account,password,displayName:typeof body.displayName==='string'?body.displayName.trim().slice(0,160):'',
  imap:{host:host(body.imapHost),port:port(body.imapPort,[143,993],'IMAP'),security:security(body.imapSecurity,'IMAP'),user:text(body.user,254)},
  smtp:{host:host(body.smtpHost),port:port(body.smtpPort,[465,587],'SMTP'),security:security(body.smtpSecurity,'SMTP'),user:text(body.user,254)}
 };
}

export function publicConnection(row){
 return {id:String(row.id),provider:String(row.provider),email:String(row.email),displayName:String(row.displayName||''),status:row.status==='error'?'error':'connected',errorCode:row.errorCode||null,lastCheckedAt:row.lastCheckedAt||null,createdAt:row.createdAt||null,updatedAt:row.updatedAt||null};
}

export function safeErrorCode(error){
 const code=String(error?.code||'').toLowerCase();
 if(['dns','tls','timeout','imap_auth','smtp_auth','gmail_auth','not_configured'].includes(code))return code;
 return 'connection_failed';
}

export function safeErrorMessage(code){
 return ({dns:'No se ha podido localizar el servidor de correo.',tls:'El servidor no ofrece una conexión segura válida.',timeout:'El servidor ha tardado demasiado en responder.',imap_auth:'IMAP ha rechazado el usuario o la contraseña.',smtp_auth:'SMTP ha rechazado el usuario o la contraseña.',gmail_auth:'Google no ha autorizado el acceso al correo.',not_configured:'La conexión de Gmail aún no está configurada en el servidor.'})[code]||'No se ha podido comprobar la cuenta de correo.';
}

export function serializeSecret(connection){
 return JSON.stringify({version:1,provider:connection.provider,password:connection.password,imap:connection.imap,smtp:connection.smtp});
}

