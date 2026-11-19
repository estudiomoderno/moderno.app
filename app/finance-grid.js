(function(global){
 'use strict';
 let mounted=null;

 function clear(){
  if(!mounted)return;
  try{mounted.component?.unmount();}catch(error){}
  mounted=null;
 }

 function sync(){
  const host=document.querySelector('.finance-reui-grid-host');
  if(!host){clear();return;}
  const book=host.getAttribute('data-finance-grid-book');
  if(!book||typeof global.financeGridComponentData!=='function'){clear();return;}
  const profile=global.ModernoProfileComponent;
  if(!profile?.mountFinanceGrid){host.innerHTML='<div class="finance-empty"><b>La tabla de facturas no está disponible</b><span>Actualiza la página para cargar el componente.</span></div>';return;}
  if(mounted?.host!==host){
   clear();
   const entry={host,component:null};mounted=entry;
   const recover=()=>queueMicrotask(()=>{if(mounted!==entry)return;clear();host.innerHTML='<div class="finance-empty"><b>No se ha podido cargar la tabla</b><span>Vuelve a abrir esta sección.</span></div>';});
   try{entry.component=profile.mountFinanceGrid(host,recover);}catch(error){recover();return;}
  }
  const data=global.financeGridComponentData(book);
  mounted.component.update({...data,onProject:projectId=>{
   const id=(state.projects||[]).find(project=>String(project.id)===String(projectId))?.id;
   if(id==null)return;
   state.projTab='fin';go('proyecto',id);
  }});
 }

 const previous=global.render;
 global.render=function(){clear();const result=previous.apply(this,arguments);sync();return result;};
 sync();
 global.ModernoFinanceGrid={refresh:sync,clear};
})(window);
