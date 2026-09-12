import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../app/team-settings.js',import.meta.url),'utf8');
function fixture(cancelled=true){
 const calls=[],messages=[];let confirm;
 const context={window:{},ModernoDaily:{escape:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')},ESTUDIO_ID:'study-a',_accessRole:'admin',state:{view:'ajustes'},render(){},closeModal(){},toast:s=>messages.push(s),askConfirm:(text,label,fn)=>{confirm={text,label,fn};},sb:{rpc:async(name,args)=>{calls.push({name,args});return {data:name==='app_equipo'?{roles:[],miembros:[],invitaciones:[{email:'pending@example.invalid',rol:'miembro'}]}:cancelled};}}};
 vm.runInNewContext(source,context);
 return {context,calls,messages,team:context.window.TeamSettings,get confirm(){return confirm;}};
}
test('pending invitations expose cancellation and request the matching study/email only',async()=>{
 const f=fixture();await f.team.load();assert.match(f.team.view(),/Cancelar invitación/);
 f.team.cancelInvite(0);assert.match(f.confirm.text,/pending@example.invalid/);
 assert.equal(f.calls.length,1);await f.confirm.fn();
 const call=f.calls.find(c=>c.name==='app_equipo_cancelar_invitacion');
 assert.equal(call.args.p_estudio,'study-a');assert.equal(call.args.p_email,'pending@example.invalid');
 assert.equal(f.calls.some(c=>c.name==='app_revocar_acceso'),false);
 assert.equal(f.messages[0],'Invitación cancelada.');
});
test('already accepted invitation reports that access is retained',async()=>{
 const f=fixture(false);await f.team.load();f.team.cancelInvite(0);await f.confirm.fn();
 assert.match(f.messages[0],/el acceso se conserva/);
});
test('switching studies after confirmation prevents cancellation',async()=>{
 const f=fixture();await f.team.load();f.team.cancelInvite(0);f.context.ESTUDIO_ID='study-b';await f.confirm.fn();
 assert.equal(f.calls.length,1);
});
test('non-admin cannot start cancellation',async()=>{
 const f=fixture();await f.team.load();f.context._accessRole='gestoria';f.team.cancelInvite(0);
 assert.equal(f.confirm,undefined);
});
