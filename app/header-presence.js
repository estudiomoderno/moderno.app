/* Ephemeral, private team presence. No documents, email, routes or pointer data. */
(function(root){
 'use strict';
 const photo=value=>typeof value==='string'&&value.length<=300000&&(/^https:\/\/[^\s]+$/i.test(value)||/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value))?value:'';
 const person=m=>m&&typeof m.user==='string'&&m.user.length>0&&m.user.length<=64&&typeof m.name==='string'?{user:m.user,name:m.name.slice(0,60),avatar:photo(m.avatar)}:null;
 function people(state,me){
  const found=new Map();if(me)found.set(me.user,me);
  for(const entries of Object.values(state||{}))if(Array.isArray(entries))for(const entry of entries){const m=person(entry);if(m&&!found.has(m.user))found.set(m.user,m);}
  return [...found.values()];
 }
 function create({client,identity,allowed,onChange,document:doc=root.document}){
  let channel=null,generation=0,owner='',studyId='',identityKey='',user='',subscribed=false,tracked=false,synced=false,status='idle',members=[],lastPayload='',tracking=0;
  const session=root.crypto.randomUUID();
  const snapshot=()=>({status,study:studyId,key:identityKey,members:status==='online'?members.map(m=>({...m})):[]});
  const publish=(next=status)=>{status=next;onChange(snapshot());};
  const valid=()=>allowed()&&!doc.hidden;
  function draw(){
   if(!valid()||!channel||!subscribed||!tracked||!synced)return;
   const me=person({user,name:identity().name||'Tú',avatar:identity().avatar});
   members=people(channel.presenceState(),me);publish('online');
  }
  function stop(){
   generation++;tracking++;owner='';studyId='';identityKey='';user='';subscribed=false;tracked=false;synced=false;members=[];lastPayload='';
   const old=channel;channel=null;publish('idle');
   if(old)Promise.resolve(client.removeChannel(old)).catch(()=>{});
  }
  async function track(){
   if(!valid()||!subscribed||!channel)return;
   const gen=generation,serial=++tracking;
   const payload={user,session,name:String(identity().name||'Tú').slice(0,60),avatar:photo(identity().avatar)};
   const encoded=JSON.stringify(payload);if(tracked&&encoded===lastPayload){draw();return;}
   try{
    const result=await channel.track(payload);
    if(gen!==generation||serial!==tracking||!valid())return;
    tracked=result==='ok';lastPayload=tracked?encoded:'';
    if(tracked)draw();else{members=[];publish('offline');}
   }catch(error){if(gen===generation&&serial===tracking){tracked=false;members=[];publish('offline');}}
  }
  async function refresh(){
   const next=identity();
   if(!allowed()||!next.study||!next.key){stop();return;}
   const key=JSON.stringify([next.study,next.key]);
   if(owner===key){if(valid())await track();return;}
   stop();owner=key;studyId=next.study;identityKey=next.key;publish('connecting');const gen=generation;
   try{
    const {data,error}=await client.auth.getSession();
    if(gen!==generation)return;
    if(error||!data?.session?.user?.id||!allowed()){stop();return;}
    user=data.session.user.id;
    channel=client.channel('equipo:'+next.study,{config:{private:true,presence:{key:session}}});
    channel.on('presence',{event:'sync'},()=>{if(gen!==generation)return;synced=true;draw();});
    channel.subscribe(value=>{
     if(gen!==generation)return;
     subscribed=value==='SUBSCRIBED';tracked=false;lastPayload='';members=[];
     if(subscribed){publish('connecting');track();}
     else{synced=false;tracking++;if(value==='CLOSED')owner='';publish('offline');}
    });
   }catch(error){if(gen===generation){owner='';members=[];publish('offline');}}
  }
  function visibility(){
   tracking++;tracked=false;lastPayload='';members=[];
   if(doc.hidden){publish('idle');if(channel)Promise.resolve(channel.untrack()).catch(()=>{});}
   else refresh();
  }
  doc.addEventListener('visibilitychange',visibility);root.addEventListener('pagehide',stop);root.addEventListener('pageshow',refresh);
  return {refresh,stop,snapshot,destroy(){stop();doc.removeEventListener('visibilitychange',visibility);root.removeEventListener('pagehide',stop);root.removeEventListener('pageshow',refresh);}};
 }
 const api={create,people,photo};root.ModernoHeaderPresence=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
