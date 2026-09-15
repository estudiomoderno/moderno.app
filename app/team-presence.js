/* Ephemeral team presence. No content, email, clicks or typing are transmitted. */
(function(root){
 'use strict';
 const initials=name=>String(name||'?').trim().split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();
 const avatar=value=>typeof value==='string'&&value.length<=300000&&(/^https:\/\//i.test(value)||/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value))?value:'';
 const color=id=>['#647d6b','#926d5e','#7c729b','#647d91','#977f43'][Array.from(String(id)).reduce((n,c)=>n+c.charCodeAt(0),0)%5];
 function contextText(view){
  if(!view)return '';
  const copy=view.cloneNode(true);
  // Personal greetings and ticking clocks are not differences in shared content.
  copy.querySelectorAll('h1,#clock,script,style').forEach(node=>node.remove());
  return copy.textContent;
 }
 function peers(state,own){
  const result=new Map();
  for(const entries of Object.values(state||{}))for(const m of entries||[]){
   if(!m||typeof m.user!=='string'||typeof m.name!=='string'||typeof m.session!=='string'||m.user===own)continue;
   if(m.user.length>64||m.session.length>64)continue;
   result.set(m.session,{user:m.user,session:m.session,name:m.name.slice(0,60),avatar:avatar(m.avatar)});
  }
  return result;
 }
 function validPointer(p,room){return !!p&&p.room===room&&typeof p.session==='string'&&Array.isArray(p.path)&&p.path.length>0&&p.path.length<=20&&p.path.every(n=>Number.isInteger(n)&&n>=0&&n<10000)&&Number.isFinite(p.x)&&p.x>=0&&p.x<=1&&Number.isFinite(p.y)&&p.y>=0&&p.y<=1&&typeof p.tag==='string'&&p.tag.length<20;}
 function create({client,identity,context,allowed,document:doc=root.document}){
  let channel=null,study=null,user=null,ready=false,generation=0,room='',members=new Map(),bar=null,layer=null,lastSend=0;
  const session=root.crypto.randomUUID(),cursors=new Map(),main=doc.querySelector('.main');
  const el=(tag,cls,text)=>{const n=doc.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
  function draw(status){
   if(!main)return;
   if(!bar){bar=el('div','team-presence');bar.setAttribute('role','region');bar.setAttribute('aria-label','Equipo conectado');main.prepend(bar);}
   bar.replaceChildren(el('span','team-presence-label','Conectado ahora de tu equipo:'));
   if(!ready){bar.append(el('span','team-presence-status',status||'Conectando…'));return;}
   const me=identity();
   const unique=new Map([[user,{user,name:String(me.name||'Tú').slice(0,60),avatar:avatar(me.avatar)}],...[...members.values()].map(m=>[m.user,m])]);
   const people=el('div','team-presence-people');
   for(const m of unique.values()){
    const badge=el('span','team-presence-avatar',initials(m.name));badge.title=m.name;badge.setAttribute('aria-label',m.name+' · conectado');badge.style.setProperty('--person-color',color(m.user));if(m.avatar){const photo=el('img','');photo.alt='';photo.referrerPolicy='no-referrer';photo.src=m.avatar;photo.onerror=()=>photo.remove();badge.append(photo);}people.append(badge);
   }
   bar.append(people);

  }
  function clearCursors(){for(const c of cursors.values())c.node.remove();cursors.clear();}
  function stop(){generation++;ready=false;room='';members.clear();clearCursors();bar?.remove();bar=null;layer?.remove();layer=null;doc.body.classList.remove('has-team-presence');if(channel){const old=channel;channel=null;client.removeChannel(old).catch(()=>{});}study=null;user=null;}
  function track(){if(!doc.hidden&&ready&&channel)channel.track({user,session,name:String(identity().name||'Compañero').slice(0,60),avatar:avatar(identity().avatar)}).catch(()=>{});}
  async function refresh(){
   if(!allowed()||!identity().study){stop();return;}
   const next=identity();
   if(study!==next.study){
    stop();study=next.study;const gen=generation;
    const {data}=await client.auth.getSession();if(gen!==generation)return;
    user=data?.session?.user?.id;if(!user){stop();return;}
    doc.body.classList.add('has-team-presence');draw();
    channel=client.channel('equipo:'+study,{config:{private:true,presence:{key:session},broadcast:{self:false}}});
    channel.on('presence',{event:'sync'},()=>{if(gen!==generation)return;members=peers(channel.presenceState(),user);for(const [id,c] of cursors)if(!members.has(id)){c.node.remove();cursors.delete(id);}draw();});
    channel.on('broadcast',{event:'cursor'},({payload})=>{if(gen===generation)receive(payload);});
    channel.subscribe(status=>{if(gen!==generation)return;ready=status==='SUBSCRIBED';if(ready)track();else{members.clear();clearCursors();}draw(ready?'':'Reconectando…');});
   }
   // A digest identifies the current layout without sharing routes or search text.
   const value=context();const gen=generation;
   const bytes=await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
   if(gen!==generation||value!==context())return;
   const nextRoom=Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
   if(room!==nextRoom){room=nextRoom;clearCursors();}
  }
  function send(payload){if(ready&&channel)channel.send({type:'broadcast',event:'cursor',payload:{session,room,...payload}}).catch(()=>{});}
  function hide(){send({hidden:true});}
  function move(e){
   if(e.pointerType==='touch'||doc.hidden||!room||!ready)return;
   if(Date.now()-lastSend<65)return;lastSend=Date.now();
   const view=doc.getElementById('view'),target=e.target;
   if(!view?.contains(target)||target.closest('input,textarea,select,[contenteditable],dialog,[role="dialog"]')||doc.querySelector('.overlay.open')){hide();return;}
   const path=[];let node=target;
   while(node&&node!==view&&path.length<=20){path.unshift(Array.prototype.indexOf.call(node.parentElement.children,node));node=node.parentElement;}
   if(node!==view||!path.length||path.length>20){hide();return;}
   const rect=target.getBoundingClientRect();if(!rect.width||!rect.height)return;
   send({path,tag:target.tagName,x:Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height))});
  }
  function receive(p){
   if(doc.hidden||!ready||doc.querySelector('.overlay.open')||!members.has(p?.session))return;
   if(p.hidden){cursors.get(p.session)?.node.remove();cursors.delete(p.session);return;}
   if(!validPointer(p,room))return;
   let target=doc.getElementById('view');for(const i of p.path)target=target?.children[i];
   if(!target||target.tagName!==p.tag||target.closest('input,textarea,select,[contenteditable]'))return;
   const r=target.getBoundingClientRect();const x=r.left+r.width*p.x,y=r.top+r.height*p.y;
   if(!r.width||!r.height||x<0||x>root.innerWidth||y<(bar?.getBoundingClientRect().bottom||0)||y>root.innerHeight)return;
   if(!layer){layer=el('div','team-cursors');layer.setAttribute('aria-hidden','true');doc.body.append(layer);}
   let c=cursors.get(p.session);if(!c){const m=members.get(p.session);const node=el('div','team-cursor');node.style.setProperty('--person-color',color(m.user));node.append(el('span','team-cursor-arrow','➤'),el('span','team-cursor-name',m.name));layer.append(node);c={node,at:0};cursors.set(p.session,c);}
   c.at=Date.now();c.node.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`;
  }
  const timer=root.setInterval(()=>{for(const [id,c] of cursors)if(Date.now()-c.at>3500){c.node.remove();cursors.delete(id);}},1000);
  const visibility=()=>{clearCursors();if(doc.hidden){hide();channel?.untrack().catch(()=>{});}else{track();refresh();}};
  doc.addEventListener('pointermove',move,{passive:true});doc.addEventListener('pointerleave',hide);doc.addEventListener('visibilitychange',visibility);
  doc.addEventListener('scroll',clearCursors,true);root.addEventListener('pagehide',stop);root.addEventListener('pageshow',refresh);root.addEventListener('resize',refresh);
  return {refresh,stop,destroy(){stop();root.clearInterval(timer);doc.removeEventListener('pointermove',move);doc.removeEventListener('pointerleave',hide);doc.removeEventListener('visibilitychange',visibility);doc.removeEventListener('scroll',clearCursors,true);root.removeEventListener('pagehide',stop);root.removeEventListener('pageshow',refresh);root.removeEventListener('resize',refresh);}};
 }
 root.ModernoTeamPresence={create,peers,validPointer,initials,contextText,avatar};
 if(typeof module!=='undefined')module.exports=root.ModernoTeamPresence;
})(typeof window!=='undefined'?window:globalThis);
