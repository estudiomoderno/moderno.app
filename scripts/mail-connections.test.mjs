import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {passwordConnection,safeErrorCode,safeErrorMessage,serializeSecret,studyId} from '../supabase/functions/mail-connect/core.mjs';
import {imapFolderMap,parseImapBody,parseImapMessages} from '../supabase/functions/mail-connect/network.ts';
import {buildPlainMessage,mimeAttachment,parseMimeMessage} from '../supabase/functions/mail-connect/mime.mjs';

test('iCloud uses Apple secure endpoints and never the ordinary Apple password label',()=>{
 const account=passwordConnection({provider:'icloud',email:'Persona@icloud.com',password:'abcd-efgh-ijkl-mnop'});
 assert.equal(account.email,'persona@icloud.com');
 assert.deepEqual(account.imap,{host:'imap.mail.me.com',port:993,security:'tls',user:'persona@icloud.com'});
 assert.deepEqual(account.smtp,{host:'smtp.mail.me.com',port:587,security:'starttls',user:'persona@icloud.com'});
 assert.equal(JSON.parse(serializeSecret(account)).password,'abcd-efgh-ijkl-mnop');
});

test('external mail keeps independent IMAP and SMTP encryption modes',()=>{
 const account=passwordConnection({provider:'server',email:'hola@example.com',password:'secret',displayName:'Estudio',user:'mail-user',imapHost:'imap.example.com',imapPort:993,imapSecurity:'tls',smtpHost:'smtp.example.com',smtpPort:587,smtpSecurity:'starttls'});
 assert.equal(account.imap.security,'tls');assert.equal(account.smtp.security,'starttls');assert.equal(account.displayName,'Estudio');
});

test('external mail rejects IP literals, local names, plaintext and unsafe ports before networking',()=>{
 const base={provider:'server',email:'hola@example.com',password:'secret',displayName:'Estudio',user:'hola@example.com',imapHost:'imap.example.com',imapPort:993,imapSecurity:'tls',smtpHost:'smtp.example.com',smtpPort:587,smtpSecurity:'starttls'};
 for(const change of [{imapHost:'127.0.0.1'},{smtpHost:'localhost'},{imapSecurity:'none'},{smtpPort:25}])assert.throws(()=>passwordConnection({...base,...change}));
});

test('public errors do not expose low-level server responses',()=>{
 assert.equal(safeErrorCode({code:'imap_auth'}),'imap_auth');
 assert.equal(safeErrorCode({message:'AUTH failed with password hunter2'}),'connection_failed');
 assert.doesNotMatch(safeErrorMessage('connection_failed'),/hunter2|AUTH/);
 assert.throws(()=>studyId('not-a-uuid'));
});

test('IMAP maps Apple special folders and parses bounded message headers',()=>{
 const folders=imapFolderMap([
  '* LIST (\\HasNoChildren \\Sent) "/" "Sent Messages"',
  '* LIST (\\HasNoChildren \\Drafts) "/" Drafts',
  '* LIST (\\HasNoChildren \\Junk) "/" Junk',
  '* LIST (\\HasNoChildren \\Trash) "/" "Deleted Messages"'
 ]);
 assert.deepEqual(folders,{inbox:'INBOX',sent:'Sent Messages',drafts:'Drafts',spam:'Junk',trash:'Deleted Messages'});
 const messages=parseImapMessages(['* 42 FETCH (UID 99 FLAGS (\\Seen) INTERNALDATE "15-Nov-2026 12:34:56 +0000" BODY[HEADER.FIELDS (FROM TO SUBJECT DATE)] {128}','From: =?UTF-8?B?SmF2aQ==?= <javi@example.com>','To: hola@example.com','Subject: Cuenta Apple','Date: Sun, 15 Nov 2026 12:34:56 +0000','',')']);
 assert.equal(messages[0].id,'imap-99');assert.equal(messages[0].from,'Javi <javi@example.com>');assert.equal(messages[0].subject,'Cuenta Apple');assert.equal(messages[0].unread,false);
 assert.equal(parseImapBody('Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\nSG9sYSBKYXZp'),'Hola Javi');
 assert.equal(parseImapBody('Content-Type: text/html; charset=utf-8\r\n\r\n<p>Hola <strong>Javi</strong></p>'),'Hola  Javi');
});

test('MIME reader keeps HTML signatures, inline images and downloadable attachments',()=>{
 const raw=['From: Cliente <cliente@example.com>','To: hola@estudiomoderno.es','Subject: Propuesta','Content-Type: multipart/related; boundary="demo"','','--demo','Content-Type: text/html; charset=utf-8','','<p>Hola</p><img src="cid:logo">','--demo','Content-Type: image/png; name="logo.png"','Content-Disposition: inline; filename="logo.png"','Content-ID: <logo>','Content-Transfer-Encoding: base64','','aW1hZ2Vu','--demo','Content-Type: application/pdf; name="propuesta.pdf"','Content-Disposition: attachment; filename="propuesta.pdf"','Content-Transfer-Encoding: base64','','cGRm','--demo--'].join('\r\n');
 const parsed=parseMimeMessage(raw);assert.match(parsed.bodyHtml,/data:image\/png;base64,aW1hZ2Vu/);assert.equal(parsed.attachments.length,1);assert.equal(parsed.attachments[0].name,'propuesta.pdf');assert.equal(mimeAttachment(raw,parsed.attachments[0].id).data,'cGRm');
 const outgoing=buildPlainMessage({from:'hola@estudiomoderno.es',to:['cliente@example.com'],cc:[],subject:'Re: Propuesta',body:'Gracias',inReplyTo:'<original@example.com>',references:'<original@example.com>'});assert.match(outgoing,/In-Reply-To: <original@example.com>/);assert.match(outgoing,/R3JhY2lhcw==/);
 const gmailBcc=buildPlainMessage({from:'hola@estudiomoderno.es',to:['cliente@example.com'],cc:[],bcc:['oculta@example.com'],includeBcc:true,subject:'Cco',body:'Privado'});assert.match(gmailBcc,/Bcc: oculta@example\.com/);
 const smtpBcc=buildPlainMessage({from:'hola@estudiomoderno.es',to:['cliente@example.com'],cc:[],bcc:['oculta@example.com'],subject:'Cco',body:'Privado'});assert.doesNotMatch(smtpBcc,/Bcc:/);
 const rich=buildPlainMessage({from:'hola@estudiomoderno.es',to:['cliente@example.com'],cc:[],subject:'Adjunto',body:'Consulta el plano',bodyHtml:'<p><strong>Consulta</strong> el plano</p>',attachments:[{name:'plano.txt',type:'text/plain',data:'cGxhbm8=',inline:false,contentId:''},{name:'foto.png',type:'image/png',data:'aW1hZ2Vu',inline:true,contentId:'foto@moderno.app'}]});assert.match(rich,/multipart\/mixed/);assert.match(rich,/multipart\/alternative/);assert.match(rich,/Content-Disposition: attachment; filename="plano\.txt"/);assert.match(rich,/Content-ID: <foto@moderno\.app>/);assert.match(rich,/cGxhbm8=/);
});

test('mail UI replaces the preparatory placeholder and reuses one connection module',()=>{
 const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../app/mail-connections.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../app/brand/mail-ui.css',import.meta.url),'utf8');
 const settings=readFileSync(new URL('../ui/team-profile/mail-settings.tsx',import.meta.url),'utf8');
 assert.match(html,/mail-connections\.js/);assert.match(html,/ModernoMail\.renderMail\(\)/);assert.match(html,/ModernoMail\.integrationCards\(\)/);
 assert.doesNotMatch(html,/La conexión se activará en el siguiente paso|Configuración preparatoria/);
 assert.match(ui,/action:'gmail_begin'/);assert.match(ui,/action:'connect_password'/);assert.match(ui,/Los tokens y contraseñas se cifran en el servidor/);
assert.match(ui,/Recibidos/);assert.match(ui,/action:'inbox'/);assert.match(ui,/folder=state\.activeFolder/);assert.doesNotMatch(ui,/Añadir otra cuenta/);assert.match(html,/mail-ui\.css\?v=36733/);assert.match(html,/mail-connections\.js\?v=36733/);assert.match(html,/MODERNO_VER="v3\.67\.35"/);
 for(const label of ['Recibidos','Enviados','Borradores','Spam','Papelera','Redactar'])assert.match(ui,new RegExp(label));assert.match(settings,/aria-label="Ajustes"/);
 assert.match(ui,/mail-icons\/compose\.svg/);for(const icon of ['inbox','sent','drafts','spam','trash'])assert.match(ui,new RegExp(`icon:'${icon}\\.svg'`));
 assert.match(ui,/mail-icons\/refresh\.svg/);assert.match(settings,/mail-icons\/settings\.svg/);assert.doesNotMatch(ui,/>Actualizar<|>Ajustes</);
 assert.match(ui,/refresh\.svg[\s\S]*mail-settings-host/);assert.match(ui,/mountMailSettings/);assert.match(ui,/performDisconnect/);assert.match(css,/grid-template-columns:196px/);assert.match(css,/mail-folder-button\{justify-content:space-between;gap:8px/);assert.match(css,/mail-folder-badge\{[^}]*border:1px solid #bdbdbd[^}]*color:#646464/);assert.match(css,/width:min\(320px,100%\)/);assert.match(css,/\.mail-toolbar-actions/);assert.match(css,/\.mail-settings-host/);
 assert.doesNotMatch(ui,/mail-inbox-heading|sin leer/);assert.match(ui,/class="mail-inbox-content\$\{detail\?' mail-inbox-content--reader':' mail-inbox-content--list'\}"/);assert.match(css,/inset:64px 16px 0/);
 assert.match(css,/mail-account-identity \.mail-provider-mark\{display:flex!important[^}]*align-items:center!important[^}]*justify-content:center!important/);assert.match(css,/mail-account-identity \.mail-provider-mark img\{[^}]*width:22px!important[^}]*height:22px!important/);
 assert.match(ui,/connectedAccounts/);assert.match(ui,/selectedConnection/);assert.match(ui,/mark\(account\.provider\)/);assert.match(ui,/ModernoMail\.selectAccount/);assert.doesNotMatch(ui,/mail-account-identity">\$\{mark\('gmail'\)\}/);
 assert.match(css,/\.mail-account-menu\{display:grid[^}]*max-height:264px/);assert.match(css,/\.mail-account-option\{display:grid/);
 assert.match(ui,/action:'message'/);assert.match(ui,/action:'trash_messages'/);assert.match(ui,/mail-message-select/);assert.match(ui,/mail-reader-subject/);assert.match(ui,/trash\.svg[\s\S]*refresh\.svg/);assert.match(css,/\.mail-reader\{/);assert.match(css,/\.mail-message-select input:checked\+span/);
 assert.match(ui,/mountMailDelete/);assert.match(ui,/mail-delete-dialog-host/);assert.match(ui,/¿Mover este correo a la papelera\?/);assert.match(ui,/Mover a la papelera/);assert.match(ui,/function closeDeleteDialog/);assert.match(ui,/function confirmDeleteDialog/);assert.doesNotMatch(ui,/mail-alert-dialog|function deleteDialogKey/);assert.match(css,/\.mail-delete-dialog-host\{[^}]*z-index:30000/);assert.doesNotMatch(css,/\.mail-alert-dialog/);
 assert.match(ui,/action:'attachment'/);assert.match(ui,/action:'send'/);for(const action of ['Responder','Responder a todos','Reenviar','Imprimir','Eliminar'])assert.match(ui,new RegExp(action));for(const icon of ['reply.svg','reply-all.svg','forward.svg','print.svg','delete.svg'])assert.match(ui,new RegExp(icon.replace('.','\\.')));assert.match(ui,/sanitizedEmailHtml/);assert.match(ui,/downloadAttachment/);assert.match(css,/\.mail-reader-html/);assert.match(css,/\.mail-reader-attachments/);assert.match(css,/\.mail-composer/);assert.match(ui,/Mensaje nuevo/);assert.match(ui,/toggleComposerExpand/);assert.match(ui,/toggleComposerMinimize/);assert.match(ui,/updateComposerField/);assert.match(ui,/updateComposerBody/);assert.match(ui,/formatComposer/);assert.match(ui,/mail-composer--floating/);assert.match(ui,/mail-composer-backdrop/);assert.match(ui,/Expandir mensaje/);assert.match(css,/\.mail-composer--floating\{[^}]*position:fixed[^}]*right:22px[^}]*bottom:18px/);assert.match(css,/\.mail-composer-portal \.mail-composer--floating\.is-expanded\{[^}]*inset:12px 18px/);assert.match(css,/\.mail-composer--floating\.is-minimized\{[^}]*height:44px/);assert.match(css,/\.mail-composer-backdrop\{[^}]*position:fixed[^}]*inset:0/);assert.match(ui,/name="bcc"/);assert.match(ui,/Formato de texto/);assert.match(ui,/Adjuntar archivo/);assert.match(ui,/Insertar imagen/);assert.match(ui,/Insertar emoji/);assert.match(ui,/Desde un proyecto/);assert.match(html,/readMailProjectFile/);assert.match(ui,/composerTemplates/);assert.match(css,/\.mail-composer-project-picker/);assert.match(css,/\.mail-composer-emoji-panel/);
 assert.match(ui,/input\.accept='image\/\*'/);assert.match(ui,/mountMailEmoji/);assert.match(ui,/mountMailProjectPicker/);assert.match(ui,/mountMailSignature/);assert.match(ui,/mail-emoji-host/);assert.match(ui,/mail-project-picker-host/);assert.match(ui,/mail-signature-host/);assert.match(ui,/readMailSignature/);assert.match(ui,/data-mail-signature/);assert.match(ui,/signature:true/);assert.match(css,/\.mail-signature-host\{position:fixed;inset:0;z-index:40002/);assert.match(html,/function mailProjectMime/);assert.match(html,/recentRank:recent\.indexOf/);assert.doesNotMatch(html,/mailProjectRows\(\).*filter\(project=>project\.files\.length\)/);
assert.match(ui,/pageSize:10/);assert.match(ui,/\[10,20,50,100\]/);assert.match(ui,/Página <strong>\$\{pageNumber\}<\/strong> de <strong>\$\{pageCount\}/);assert.match(ui,/10,20,50,100/);assert.match(ui,/\$\{size\} \/ página/);assert.match(ui,/mail-pagination-summary/);assert.match(ui,/mail-pagination-pages/);assert.match(ui,/mail-pagination-ellipsis/);assert.match(ui,/mail-pagination-previous/);assert.match(ui,/mail-pagination-next/);assert.match(ui,/aria-current="page"/);assert.match(ui,/function pageSequence/);assert.match(ui,/ModernoMail\.changePageSize/);assert.match(ui,/ModernoMail\.goPage\(\$\{page-1\}\)/);assert.match(ui,/direction:target>0&&!state\.pageTokens\[target\]\?'page':''/);assert.match(ui,/mail-loading-button mail-loading-button--outline/);assert.match(ui,/class="mail-spinner"/);assert.match(ui,/Cargando correos…/);
assert.match(css,/\.mail-inbox-panel\{[^}]*display:flex[^}]*flex-direction:column[^}]*overflow:hidden/);assert.match(css,/\.mail-inbox-content\{[^}]*flex:1 1 auto[^}]*overflow:auto/);assert.match(css,/\.mail-inbox-content--list\{[^}]*display:flex[^}]*flex-direction:column[^}]*overflow:hidden/);assert.match(css,/\.mail-list-scroll\{[^}]*flex:1 1 auto[^}]*overflow:auto/);assert.match(css,/\.mail-reader\{[^}]*max-width:none/);assert.match(css,/\.mail-reader-html\{[^}]*width:90\.91%[^}]*zoom:1\.1/);assert.match(css,/\.mail-inbox-content--list>\.mail-pagination\{[^}]*position:relative[^}]*flex:0 0 auto/);assert.match(css,/\.mail-pagination-content\{[^}]*width:100%[^}]*justify-content:space-between/);assert.match(css,/\.mail-pagination-summary\{[^}]*min-width:110px/);assert.match(css,/\.mail-pagination-pages\{[^}]*justify-content:center[^}]*gap:4px/);assert.match(css,/\.mail-native-select\{[^}]*width:112px/);assert.match(css,/\.mail-pagination-link\.is-active\{/);assert.match(css,/\.mail-pagination-previous,\.mail-pagination-next\{/);assert.match(css,/\.mail-pagination-ellipsis\{/);assert.match(css,/\.mail-loading-button--outline\{/);assert.match(css,/\.mail-inbox-panel \.mail-loading-state\{[^}]*inset:0/);
 assert.doesNotMatch(ui,/Gestionar conexión/);assert.match(ui,/Conectado · \$\{escape\(row\.email\)\}/);
 assert.match(html,/MAIL_FUNCTION_URL = "https:\/\/cgqtylvaapwbuwqvpjtb\.supabase\.co\/functions\/v1\/mail-connect"/);
 assert.match(html,/MAIL_FUNCTION_ANON_KEY = "eyJ[^"]+"/);
 assert.match(ui,/fetch\(c\.mailFunctionUrl/);assert.match(ui,/'apikey':c\.mailFunctionAnonKey/);assert.match(ui,/authToken:accessToken/);assert.doesNotMatch(ui,/X-Moderno-Session/);assert.doesNotMatch(ui,/'Authorization':'Bearer '\+accessToken/);assert.doesNotMatch(ui,/\.functions\.invoke\(/);
 assert.doesNotMatch(ui,/Comprobando tus cuentas de correo/);
});

test('mail Edge Function preflight allows every header sent by supabase-js',()=>{
 const fn=readFileSync(new URL('../supabase/functions/mail-connect/index.ts',import.meta.url),'utf8');
 const allowHeaders=fn.match(/'Access-Control-Allow-Headers':'([^']+)'/)?.[1]?.split(',').map(value=>value.trim());
 assert.deepEqual(allowHeaders,['authorization','x-client-info','apikey','content-type']);
 assert.match(fn,/if\(req\.method==='OPTIONS'\)/);
 assert.match(fn,/const body=await req\.json\(\);action=String\(body\?\.action\|\|''\);const subject=await actor\(req,body\?\.authToken\)/);
 assert.doesNotMatch(fn,/include_granted_scopes/);
 assert.match(fn,/https:\/\/auth\.moderno\.app\/functions\/v1\/mail-connect/);
 assert.match(fn,/body\.action==='inbox'/);assert.match(fn,/body\.action==='message'/);assert.match(fn,/body\.action==='attachment'/);assert.match(fn,/body\.action==='send'/);assert.match(fn,/body\.action==='trash_messages'/);assert.match(fn,/gmail\/v1\/users\/me\/messages/);assert.match(fn,/const gmailFolders=\{inbox:'INBOX',sent:'SENT',drafts:'DRAFT',spam:'SPAM',trash:'TRASH'\}/);assert.match(fn,/includeSpamTrash/);assert.match(fn,/readImapMailbox/);assert.match(fn,/readImapAttachment/);assert.match(fn,/sendSmtpMessage/);assert.match(fn,/trashImapMessages/);assert.match(fn,/folderCounts/);assert.match(fn,/bcc:draft\.bcc/);assert.match(fn,/includeBcc:true/);assert.match(fn,/requestedAttachments/);assert.match(fn,/bodyHtml:draft\.bodyHtml/);assert.match(fn,/attachments:draft\.attachments/);
 assert.match(fn,/function requestedPaging/);assert.match(fn,/\[10,20,30,50,100\]\.includes/);assert.match(fn,/pageToken/);assert.match(fn,/input\.direction==='page'\?'page'/);assert.match(fn,/direction:body\.direction/);assert.match(fn,/page\.direction==='page'/);assert.match(fn,/nextPageToken/);
});
