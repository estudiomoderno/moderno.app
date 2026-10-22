import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../app/header-presence.js',import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
function fixture(){
 const events={},changes=[],cursors=[],channels=[],removed=[];
 const doc={hidden:false,addEventListener:(k,fn)=>events[k]=fn,removeEventListener:k=>delete events[k]};
 const current={study:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',key:'persona@example.invalid',name:'Persona ficticia',avatar:''};
 let permission=true,user='person-a',delay=null;
 const client={auth:{getSession:()=>delay||Promise.resolve({data:{session:{user:{id:user}}}})},removeChannel:async ch=>removed.push(ch),channel:(name,config)=>{
  const ch={name,config,tracks:[],untracked:0,state:{},on(type,filter,callback){if(type==='presence')this.sync=callback;else{assert.equal(type,'broadcast');this.cursor=callback;}return this;},subscribe(callback){this.subscribed=callback;return this;},track:async function(payload){this.tracks.push(payload);return 'ok';},untrack:async function(){this.untracked++;},presenceState(){return this.state;}};
  channels.push(ch);return ch;
 }};
 const context=vm.createContext({crypto:{randomUUID:()=> 'session-fixture'},document:doc,addEventListener:(k,fn)=>events[k]=fn,removeEventListener:k=>delete events[k]});
 vm.runInContext(code,context);
 const api=context.ModernoHeaderPresence;
 const presence=api.create({client,identity:()=>current,allowed:()=>permission,onChange:value=>changes.push(JSON.parse(JSON.stringify(value))),onCursor:(payload,peer)=>cursors.push({payload,peer}),document:doc});
 return {api,presence,cursors,channels,removed,events,changes,doc,current,setAllowed:v=>permission=v,setUser:v=>user=v,deferAuth:p=>delay=p};
}
test('private presence confirms subscription, tracking and sync before showing any live count',async()=>{
 const f=fixture();await f.presence.refresh();const ch=f.channels[0];
 assert.equal(ch.name,'equipo:'+f.current.study);assert.equal(ch.config.config.private,true);
 assert.equal(f.presence.snapshot().status,'connecting');assert.equal(f.presence.snapshot().members.length,0);
 ch.subscribed('SUBSCRIBED');await flush();assert.equal(f.presence.snapshot().status,'connecting');
 ch.state={a:[{user:'person-b',name:'Compañera ficticia',avatar:'https://example.invalid/photo.png'},{user:'person-b',name:'Otra pestaña'}]};ch.sync();
 assert.equal(f.presence.snapshot().status,'online');assert.equal(f.presence.snapshot().members.length,2);
 assert.deepEqual(Object.keys(ch.tracks[0]).sort(),['avatar','name','session','user']);
 assert.equal(JSON.stringify(ch.tracks).includes('persona@example.invalid'),false);
 await f.presence.refresh();assert.equal(ch.tracks.length,1,'Routes do not spam presence tracks');
 ch.subscribed('CHANNEL_ERROR');assert.equal(f.presence.snapshot().status,'offline');assert.equal(f.presence.snapshot().members.length,0);
 ch.subscribed('SUBSCRIBED');await flush();assert.equal(f.presence.snapshot().members.length,0);ch.sync();assert.equal(f.presence.snapshot().members.length,2);
});
test('switching study, user or role clears stale callbacks and pending authentication',async()=>{
 const f=fixture();await f.presence.refresh();const old=f.channels[0];old.subscribed('SUBSCRIBED');old.sync();await flush();
 f.current.study='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';f.current.key='otra@example.invalid';f.setUser('person-new');
 await f.presence.refresh();assert.equal(f.removed[0],old);old.subscribed('SUBSCRIBED');old.sync();await flush();assert.equal(f.presence.snapshot().members.length,0);
 const next=f.channels[1];next.subscribed('SUBSCRIBED');next.sync();await flush();assert.equal(f.presence.snapshot().members[0].user,'person-new');
 f.setAllowed(false);await f.presence.refresh();assert.equal(f.presence.snapshot().members.length,0);assert.equal(f.presence.snapshot().status,'idle');
 next.sync();assert.equal(f.presence.snapshot().members.length,0);
 const pending=fixture();let complete;pending.deferAuth(new Promise(resolve=>complete=resolve));const task=pending.presence.refresh();pending.presence.stop();complete({data:{session:{user:{id:'late-user'}}}});await task;assert.equal(pending.channels.length,0);
});
test('hidden tabs untrack and failed tracking never fabricates an online person',async()=>{
 const f=fixture();await f.presence.refresh();const ch=f.channels[0];ch.subscribed('SUBSCRIBED');ch.sync();await flush();
 f.doc.hidden=true;f.events.visibilitychange();assert.equal(ch.untracked,1);assert.equal(f.presence.snapshot().members.length,0);
 f.doc.hidden=false;f.events.visibilitychange();await flush();assert.equal(f.presence.snapshot().status,'online');
 ch.track=async()=> 'timed out';f.current.name='Otro nombre';await f.presence.refresh();assert.equal(f.presence.snapshot().status,'offline');assert.equal(f.presence.snapshot().members.length,0);
 f.presence.destroy();assert.equal(Object.keys(f.events).length,0);
});
test('avatars and names are bounded, deduplicated and reject active content',()=>{
 const f=fixture();const list=f.api.people({a:[{user:'a',name:'<img onerror=alert(1)>',avatar:'javascript:alert(1)'},{user:'a',name:'Duplicate'},{user:'b',name:'B'.repeat(200)},null,{user:'bad',name:3}],b:'invalid'});
 assert.equal(list.length,2);assert.equal(list[0].avatar,'');assert.equal(list[1].name.length,60);
 for(const bad of ['data:image/svg+xml;base64,AA','http://example.invalid/a.png','https://example.invalid/'+'a'.repeat(300000)])assert.equal(f.api.photo(bad),'');
 assert.equal(f.api.photo('data:image/png;base64,AAAA'),'data:image/png;base64,AAAA');
});

test('cursors reuse private websocket, whitelist payloads and require online membership',async()=>{
 const f=fixture();const p={context:'a'.repeat(64),hidden:true,text:'PRIVATE',user:'forged',session:'forged'};
 assert.equal(f.presence.sendCursor(p),false);await f.presence.refresh();const ch=f.channels[0],sent=[];
 ch.send=value=>{sent.push(value);return Promise.resolve('ok');};
 ch.subscribed('SUBSCRIBED');await flush();ch.sync();
 assert.equal(f.presence.sendCursor(p),false,'never fall back to HTTP before joined');
 ch.state='joined';assert.equal(f.presence.sendCursor(p),true);
 assert.deepEqual(JSON.parse(JSON.stringify(sent[0])),{type:'broadcast',event:'project-cursor',payload:{context:p.context,hidden:true,user:'person-a',session:'session-fixture'}});
 assert.equal(ch.config.config.broadcast.self,false);assert.equal(f.channels.length,1);
 const peer={user:'person-b',session:'session-b',name:'Peer',avatar:''};ch.presenceState=()=>({b:[peer]});ch.sync();
 ch.cursor({payload:{...p,user:'person-b',session:'unknown'}});assert.equal(f.cursors.length,0);
 ch.cursor({payload:{...p,user:'person-b',session:'session-b'}});assert.equal(f.cursors.length,1);assert.equal(f.cursors[0].peer.name,'Peer');
 ch.cursor({payload:{...p,user:'person-a',session:'another-tab'}});assert.equal(f.cursors.length,1);
 f.doc.hidden=true;assert.equal(f.presence.sendCursor(p),false);ch.cursor({payload:{...p,...peer}});assert.equal(f.cursors.length,1);
 f.doc.hidden=false;ch.subscribed('CHANNEL_ERROR');assert.equal(f.presence.sendCursor(p),false);
 f.presence.stop();ch.cursor({payload:{...p,...peer}});assert.equal(f.cursors.length,1);
});
