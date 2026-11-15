import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {passwordConnection,safeErrorCode,safeErrorMessage,serializeSecret,studyId} from '../supabase/functions/mail-connect/core.mjs';

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

test('mail UI replaces the preparatory placeholder and reuses one connection module',()=>{
 const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../app/mail-connections.js',import.meta.url),'utf8');
 assert.match(html,/mail-connections\.js/);assert.match(html,/ModernoMail\.renderMail\(\)/);assert.match(html,/ModernoMail\.integrationCards\(\)/);
 assert.doesNotMatch(html,/La conexión se activará en el siguiente paso|Configuración preparatoria/);
 assert.match(ui,/action:'gmail_begin'/);assert.match(ui,/action:'connect_password'/);assert.match(ui,/Los tokens y contraseñas se cifran en el servidor/);
 assert.match(html,/MAIL_FUNCTION_URL = "https:\/\/cgqtylvaapwbuwqvpjtb\.supabase\.co\/functions\/v1\/mail-connect"/);
 assert.match(ui,/fetch\(c\.mailFunctionUrl/);assert.match(ui,/'apikey':c\.publicKey/);assert.doesNotMatch(ui,/\.functions\.invoke\(/);
});

test('mail Edge Function preflight allows every header sent by supabase-js',()=>{
 const fn=readFileSync(new URL('../supabase/functions/mail-connect/index.ts',import.meta.url),'utf8');
 const allowHeaders=fn.match(/'Access-Control-Allow-Headers':'([^']+)'/)?.[1]?.split(',').map(value=>value.trim());
 assert.deepEqual(allowHeaders,['authorization','x-client-info','apikey','content-type']);
 assert.match(fn,/if\(req\.method==='OPTIONS'\)/);
});
