import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const part=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
function role(name,dbRole='miembro'){
 const c={sb:{},ESTUDIO_ID:'ficticio',state:{myRole:dbRole,users:[{email:'prueba@example.invalid',role:name}]},meMail:()=> 'prueba@example.invalid'};
 vm.createContext(c);vm.runInContext(part('const VIEW_DENY =','function applyRoleNav()'),c);return c;
}
test('existing admin sees finance and administration',()=>{const c=role('Administrador','admin');for(const v of ['contabilidad','facturas','admin'])assert.equal(c.canView(v),true);});
test('existing collaborator navigation denies accounting invoices and admin',()=>{const c=role('Colaborador');assert.equal(c.myAccessLevel(),'colab');for(const v of ['contabilidad','facturas','admin'])assert.equal(c.canView(v),false);assert.equal(c.canView('proyectos'),true);});
test('documented gap: accounting read-only role maps to member and cannot see accounting',()=>{const c=role('Gestoría (solo lectura)');assert.equal(c.myAccessLevel(),'miembro');assert.equal(c.canView('contabilidad'),false);});
test('local admin label cannot override server membership role',()=>{const c=role('Administrador','miembro');assert.equal(c.myAccessLevel(),'miembro');assert.equal(c.canView('facturas'),false);assert.equal(c.canView('admin'),false);});
function mail(response){let request;const c={state:{account:{name:'ESTUDIO FICTICIO'},userName:'PRUEBA'},fetch:async(url,options)=>{request={url,...options};return {json:async()=>{if(response instanceof Error)throw response;return response;}};}};vm.createContext(c);vm.runInContext(part('const MAIL_FN=','function saveUser('),c);return {c,request:()=>request};}
test('mail client targets existing endpoint and preserves invitation payload without actual sending',async()=>{const f=mail({ok:true});await f.c.mailFnSend({email:'prueba@example.invalid',nombre:'Ficticio',rol:'Colaborador'});const r=f.request();assert.equal(r.url,'/api/enviar-invitacion.php');assert.equal(r.method,'POST');assert.deepEqual(JSON.parse(r.body),{nombre:'Ficticio',email:'prueba@example.invalid',rol:'Colaborador',estudio:'ESTUDIO FICTICIO',remitente:'PRUEBA'});});
test('mail client rejects provider error rather than confirming delivery',async()=>{for(const response of [{ok:false,error:'rechazado'},null,new SyntaxError('respuesta no JSON')]){const f=mail(response);await assert.rejects(f.c.mailFnSend({email:'prueba@example.invalid'}));}});
