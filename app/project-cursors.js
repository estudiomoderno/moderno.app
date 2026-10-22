/* Named pointers are ephemeral hints. They never contain form values or document text. */
(function(root){
 'use strict';
 const palette=['#c74b18','#714fc6','#206ba5','#267b58','#a33c76'];
 const color=user=>palette[Array.from(String(user)).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0)%palette.length];
 function fingerprint(text){let hash=2166136261;
  for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619)>>>0;
  return hash.toString(16);
 }
 function signature(node){return node.tagName+':'+node.children.length+':'+fingerprint((node.textContent||'').slice(0,500));}
 function productKey(item){return item.id!=null?String(item.id):'legacy:'+fingerprint(JSON.stringify([item.name,item.sku,item.supplier,item.url]));}
 function valid(p){return !!p&&/^[a-f0-9]{64}$/.test(p.context||'')&&typeof p.session==='string'&&p.session.length<=64&&typeof p.user==='string'&&p.user.length<=64&&(p.hidden===true||p.hidden===undefined&&Array.isArray(p.path)&&p.path.length<=20&&p.path.every(i=>Number.isInteger(i)&&i>=0&&i<10000)&&['view','product','plan'].includes(p.anchor?.kind)&&typeof p.anchor.key==='string'&&p.anchor.key.length<=128&&typeof p.tag==='string'&&p.tag.length<=24&&typeof p.signature==='string'&&p.signature.length<=64&&Number.isFinite(p.x)&&p.x>=0&&p.x<=1&&Number.isFinite(p.y)&&p.y>=0&&p.y<=1);}
 function create({context,allowed,send,document:doc=root.document}){
  let current=null,key='',digest='',generation=0,layer=null,lastSend=0,visible=false,stopped=false;
  const cursors=new Map(),handlers=[];
  const listen=(target,name,fn,options)=>{target.addEventListener(name,fn,options);handlers.push(()=>target.removeEventListener(name,fn,options));};
  function remove(session){cursors.get(session)?.node.remove();cursors.delete(session);}
  function clear(){for(const c of cursors.values())c.node.remove();cursors.clear();layer?.remove();layer=null;}
  function hide(){if(visible&&digest)send({context:digest,hidden:true});visible=false;}
  function stop(){hide();generation++;key='';digest='';current=null;clear();}
  function scope(){if(stopped||!allowed()||doc.hidden)return null;const c=context();return c?.root?.isConnected&&typeof c.key==='string'?c:null;}
  async function refresh(){
   const next=scope();if(!next){if(key)stop();return;}
   if(key===next.key&&current?.root===next.root)return;
   hide();clear();current=next;key=next.key;digest='';const gen=++generation;
   try{
    const hash=await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));
    if(gen!==generation||!scope()||scope().key!==key)return;
    digest=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
   }catch{if(gen===generation)stop();}
  }
  const safe=node=>!node.closest('input,textarea,select,[contenteditable],dialog:not(.project-plan-dialog),[data-private-cursor]');
  function anchorFor(target){
   const paper=target.closest('.plan-paper');if(paper&&current.root.contains(paper))return {node:paper,anchor:{kind:'plan',key:'paper'},target:paper};
   const card=target.closest('[data-cursor-product]');if(card&&current.root.contains(card))return {node:card,anchor:{kind:'product',key:card.dataset.cursorProduct},target};
   return {node:current.root,anchor:{kind:'view',key:''},target};
  }
  function move(event){
   if(event.pointerType==='touch')return;
   const next=scope();if(!next||next.key!==key||next.root!==current?.root){refresh();return;}
   const target=event.target;if(!digest||!current.root.contains(target)||!safe(target)){hide();return;}
   if(Date.now()-lastSend<80)return;lastSend=Date.now();
   const a=anchorFor(target),path=[];if(a.anchor.kind==='product'&&!a.anchor.key){hide();return;}let n=a.target;
   while(n&&n!==a.node&&path.length<20){path.unshift(Array.prototype.indexOf.call(n.parentElement.children,n));n=n.parentElement;}
   if(n!==a.node){hide();return;}
   const r=a.target.getBoundingClientRect();if(!r.width||!r.height){hide();return;}
   visible=send({context:digest,anchor:a.anchor,path,tag:a.target.tagName,signature:a.anchor.kind==='plan'?'paper':signature(a.target),x:Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(event.clientY-r.top)/r.height))})===true;
  }
  function receive(payload,person){
   const next=scope();if(!next||next.key!==key||next.root!==current?.root){refresh();return;}
   if(!valid(payload)||!digest||payload.context!==digest||payload.user!==person?.user)return;
   if(payload.hidden){remove(payload.session);return;}
   let anchor=current.root;
   if(payload.anchor.kind==='product'){
    const found=[...current.root.querySelectorAll('[data-cursor-product]')].filter(n=>n.dataset.cursorProduct===payload.anchor.key);if(found.length!==1){remove(payload.session);return;}anchor=found[0];
   }else if(payload.anchor.kind==='plan'){anchor=current.root.querySelector('.plan-paper');if(!anchor||payload.anchor.key!=='paper'){remove(payload.session);return;}}
   let target=anchor;for(const i of payload.path)target=target?.children[i];
   if(!target||!safe(target)||target.tagName!==payload.tag||(payload.anchor.kind==='plan'?'paper':signature(target))!==payload.signature){remove(payload.session);return;}
   const r=target.getBoundingClientRect(),x=r.left+r.width*payload.x,y=r.top+r.height*payload.y,clip=current.root.getBoundingClientRect();
   if(!r.width||!r.height||x<Math.max(0,clip.left)||y<Math.max(0,clip.top)||x>Math.min(root.innerWidth,clip.right)||y>Math.min(root.innerHeight,clip.bottom)){remove(payload.session);return;}
   if(!layer){layer=doc.createElement('div');layer.className='project-peer-cursors';layer.setAttribute('aria-hidden','true');(current.root.closest('dialog')||doc.body).append(layer);}
   let c=cursors.get(payload.session);
   if(!c){
    const node=doc.createElement('div');node.className='project-peer-cursor';node.style.setProperty('--peer-color',color(person.user));
    node.innerHTML='<svg viewBox="0 0 24 26" width="24" height="26"><path d="M2 2 21 12 12 14 8 23Z" fill="currentColor" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const label=doc.createElement('span');label.className='project-peer-name';label.textContent=String(person.name||'Compañero').slice(0,60);node.append(label);layer.append(node);c={node,user:person.user,at:0};cursors.set(payload.session,c);
   }
   c.at=Date.now();c.node.style.transform=`translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
   c.node.classList.toggle('near-right',x>root.innerWidth-170);c.node.classList.toggle('near-bottom',y>root.innerHeight-55);
  }
  function sync(snapshot){if(snapshot.status!=='online'){stop();return;}const users=new Set(snapshot.members.map(m=>m.user));for(const[id,c]of cursors)if(!users.has(c.user)){c.node.remove();cursors.delete(id);}refresh();}
  const timer=root.setInterval(()=>{for(const[id,c]of cursors)if(Date.now()-c.at>5000){c.node.remove();cursors.delete(id);}},1000);
  listen(doc,'pointermove',move,{passive:true});listen(doc,'pointerleave',hide);listen(doc,'scroll',()=>{hide();clear();},true);
  listen(doc,'visibilitychange',refresh);listen(doc,'focusin',()=>{hide();clear();});listen(doc,'moderno:cursor-context',refresh);
  listen(root,'resize',()=>{hide();clear();});listen(root,'pagehide',stop);listen(root,'pageshow',refresh);
  return {refresh,receive,sync,stop,destroy(){stop();stopped=true;root.clearInterval(timer);handlers.forEach(fn=>fn());}};
 }
 const api={create,valid,color,signature,productKey};root.ModernoProjectCursors=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
