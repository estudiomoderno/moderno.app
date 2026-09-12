import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';import {createRequire}from'node:module';
const C=createRequire(import.meta.url)('../app/settings-core.js');
const source=fs.readFileSync(new URL('../app/settings-ui.js',import.meta.url),'utf8');
function harness(role='admin'){
 const listeners={},nodes=new Map(),make=()=>({dataset:{},className:'',innerHTML:'',textContent:'',classList:{remove(){},toggle(){}},setAttribute(){},after(){},querySelectorAll(){return[];},reportValidity(){return true;},querySelector(){return {focus(){}};}});
 const node=id=>{if(!nodes.has(id))nodes.set(id,make());return nodes.get(id);};
 const state={view:'home',account:{name:'Ensayo',vat:0,irpf:'',country:'España',currency:'EUR',taxName:'IVA',iban:'BANCO'},emitter:{name:'Emisor original'},irpf:false,defMargin:0,series:{fc:'FC',ps:'PS'},sessionUser:{mail:'test@example.invalid',name:'Persona Ficticia'},users:[],projects:[],entries:[{id:1,total:33.25}],quotes:[{id:2,total:99.23}]};
 let savedMeta={},update,fail=false;
 const ctx={state,ModernoDaily:{escape:x=>String(x??'')},ModernoSettingsCore:C,ModernoSettingsIcons:{},ModernoPhone:{field:()=>''},_accessRole:role,_accessLoading:false,ESTUDIO_ID:'ficticio',meMail:()=>state.sessionUser.mail,visibleWsOrder:()=>[],BRAND:{},PAISES:['España'],PAIS_ISO:{},CURR:{EUR:{}},ROLES:{},serie:b=>state.series[b?'fc':'ps'],fileImageAttrs:()=>'',ico:()=>'',render(){},go(v){state.view=v;},vAdmin(){},vAjustes(){},themeToggle(){},prepareAppReload:async()=>true,localStorage:{getItem(){return null},setItem(){}},document:{body:make(),getElementById:node,querySelector:()=>make(),createElement:make,addEventListener:(k,fn)=>listeners[k]=fn},addEventListener(){},toast(){},askConfirm(){},persistNow(){},_cloudBusy:false,_saveErr:false,_cloudHash:{},canon:JSON.stringify,CLOUD_BLOCKS:{config:{get:()=>({account:state.account,emitter:state.emitter,series:state.series,irpf:state.irpf,defMargin:state.defMargin})}},cloudFlush:async()=>{if(!fail)ctx._cloudHash.config=JSON.stringify(ctx.CLOUD_BLOCKS.config.get());},sb:{auth:{getUser:async()=>({data:{user:{email:'test@example.invalid',user_metadata:savedMeta}}}),updateUser:async u=>{update=u;if(fail)return {error:{message:'Fallo simulado'}};savedMeta=u.data;return {data:{user:{email:'test@example.invalid',user_metadata:savedMeta}}};}}},sbUserToSession:u=>({mail:u.email,name:u.user_metadata.full_name||'Persona Ficticia'}),applySessionUI(){},setTimeout,Intl};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,state,fail:()=>{fail=true},update:()=>update,field:(key,value)=>listeners.input({target:{dataset:{setting:key},type:typeof value==='boolean'?'checkbox':'text',value,checked:value}}),open:async k=>{ctx.SettingsUI.open(k);ctx.SettingsUI.view();await new Promise(r=>setImmediate(r));},status:()=>node('settings-status').textContent};
}
test('saving a study field preserves taxes, documents, files and unedited settings',async()=>{
 const h=harness();const before=JSON.stringify(h.state);await h.open('estudio');h.field('type','Interiorismo');await h.ctx.SettingsUI.save();
 const expected=JSON.parse(before);expected.view='ajustes';expected.account.studioDetails={type:'Interiorismo'};assert.deepEqual(JSON.parse(JSON.stringify(h.state)),expected);assert.equal(h.ctx.SettingsUI.dirty(),false);
});
test('an unconfirmed cloud save retains the draft and blocks reload',async()=>{
 const h=harness();await h.open('estudio');h.field('type','Pendiente');h.fail();await h.ctx.SettingsUI.save();assert.equal(h.ctx.SettingsUI.dirty(),true);assert.equal(await h.ctx.prepareAppReload(),false);
});
test('personal email confirmation does not alter the shared team or current login',async()=>{
 const h=harness();await h.open('cuenta');const before=JSON.stringify(h.state.users);h.field('email','new@example.invalid');await h.ctx.SettingsUI.save();assert.equal(h.update().email,'new@example.invalid');assert.equal(h.state.sessionUser.mail,'test@example.invalid');assert.equal(JSON.stringify(h.state.users),before);
});
test('failed personal save retains entered values',async()=>{
 const h=harness();await h.open('cuenta');h.field('first','Nuevo');h.fail();await h.ctx.SettingsUI.save();assert.equal(h.ctx.SettingsUI.dirty(),true);assert.match(h.ctx.SettingsUI.view(),/Nuevo/);
});
test('collaborator cannot enter study or taxes through settings actions',async()=>{
 const h=harness('colaborador');await h.open('cuenta');h.ctx.SettingsUI.open('impuestos');assert.match(h.ctx.SettingsUI.view(),/Perfil personal/);h.ctx.SettingsUI.open('estudio');assert.match(h.ctx.SettingsUI.view(),/Perfil personal/);
});
test('settings screens do not expose implementation notes',async()=>{
 const h=harness();
 for(const section of ['cuenta','estudio','equipo','facturacion','ordenes','impuestos','idioma','notificaciones']){
  await h.open(section);assert.doesNotMatch(h.ctx.SettingsUI.view(),/Supabase|backend|infraestructura|plan facturado verificable|calendario original|conectad[oa]/i);
 }
});
test('service errors are shown as useful user messages',()=>{
 assert.equal(C.explain({code:'email_exists',message:'AuthApiError'}),'Ese correo ya está en uso. Prueba con otro.');
 assert.match(C.explain({message:'Failed to fetch'}),/Revisa tu conexión/);
 assert.doesNotMatch(C.explain({message:'PostgREST backend JWT error'}),/PostgREST|backend|JWT/);
 assert.match(C.explain(C.problem('Escribe tu nombre.')),/Escribe tu nombre/);
});
