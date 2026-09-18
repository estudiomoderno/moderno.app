(()=>{
 const running=new WeakMap();
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
})();
