var ModernoProjectSettings=(()=>{
 const running=new WeakMap();
 const components=new Map();let failed=false;
 function remove(menu,entry){entry.component.unmount();entry.host.remove();menu.closest('.project-options-control')?.classList.remove('has-project-settings');components.delete(menu);}
 function sweep(){for(const [menu,entry] of components)if(!menu.isConnected)remove(menu,entry);}
 function recover(){failed=true;queueMicrotask(()=>{for(const [menu,entry] of components)remove(menu,entry);});}
 function refresh(){
  sweep();queueMicrotask(sweep); // Workspace can move/remove its original nodes later in render().
  if(failed||!window.ModernoProfileComponent?.mountProjectSettings)return;
  for(const menu of document.querySelectorAll('.project-options-control>.project-options')){
   if(components.has(menu))continue;
   const control=menu.parentElement,host=document.createElement('span');host.className='project-settings-host';menu.before(host);
   try{
    const component=ModernoProfileComponent.mountProjectSettings(host,recover);components.set(menu,{component,host});
    component.update({items:[...menu.querySelectorAll('.project-options-body>button')].filter(b=>!b.hidden).map(b=>({label:b.textContent.trim(),destructive:b.classList.contains('project-delete-action'),run:()=>b.click()}))});
    control.classList.add('has-project-settings');
   }catch(error){const entry=components.get(menu);if(entry)remove(menu,entry);else host.remove();recover();}
  }
 }
 async function toggle(menu,opening,focus=false){
  running.get(menu)?.cancel();
  if(opening)menu.open=true;
  const trigger=menu.querySelector(':scope>summary'),panel=menu.querySelector('.project-options-body');
  trigger.setAttribute('aria-expanded',String(opening));
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&panel.animate){
   const a=panel.animate(opening?[{opacity:0,transform:'translateY(-8px)'},{opacity:1,transform:'translateY(0)'}]:[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-8px)'}],{duration:180,easing:'ease-out'});
   running.set(menu,a);try{await a.finished}catch{return}finally{if(running.get(menu)===a)running.delete(menu)}
  }
  if(!opening)menu.open=false;
  if(focus)trigger.focus();
 }
 document.addEventListener('click',e=>{
  const trigger=e.target.closest('.project-options>summary');
  if(trigger){e.preventDefault();const menu=trigger.parentElement;toggle(menu,!menu.open);return}
  document.querySelectorAll('.project-options[open]').forEach(menu=>{if(!menu.contains(e.target)||e.target.closest('.project-options-body button'))toggle(menu,false)});
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){const menu=document.querySelector('.project-options[open]');if(menu){e.preventDefault();toggle(menu,false,true)}}});
 const originalRender=render;render=function(){const result=originalRender.apply(this,arguments);refresh();return result;};
 return {refresh};
})();
