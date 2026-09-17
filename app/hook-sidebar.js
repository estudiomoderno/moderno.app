/* Native adapter; navigation and icons remain owned by the app. */
(()=>{
 const sidebar=document.querySelector('.sidebar');if(!sidebar)return;
 let frame;
 const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update)};
 function rail(group,kind){let el=group.querySelector('.hook-rail.'+kind);if(!el){el=document.createElement('span');el.className='hook-rail '+kind;el.setAttribute('aria-hidden','true');el.innerHTML='<svg viewBox="0 0 13 7" fill="none"><path d="M1 0a6 6 0 0 0 6 6h6" stroke="#bcb7a8" stroke-width="1" stroke-linecap="butt" stroke-dasharray="5 4"/></svg>';group.append(el)}return el}
 function center(item,group){return item.getBoundingClientRect().top-group.getBoundingClientRect().top+item.offsetHeight/2-2}
 function update(){sidebar.querySelectorAll('.nav-sub').forEach(group=>{
 const active=group.querySelector('.nav-item.active'),hover=group.querySelector('.nav-item:hover,.nav-item:focus-visible');
 const current=rail(group,'selected'),preview=rail(group,'preview');
 const icon=group.parentElement.querySelector('.nav-head>span:first-child');
 const box=group.getBoundingClientRect(),ib=icon?.getBoundingClientRect();
 const start=ib?ib.top+ib.height/2-box.top:2;
 for(const [line,item] of [[current,active],[preview,hover]]){
 const edge=item?item.getBoundingClientRect().left-box.left:0;
 const origin=Math.min(ib?ib.left+ib.width/2-box.left:0,edge-6);
 line.style.setProperty('--hook-x',origin+'px');
 line.style.setProperty('--hook-width',Math.max(0,edge-origin)+'px');
 line.style.setProperty('--hook-start',start+'px');
 }
 const y=active?center(active,group)+2-start:0;
 current.style.setProperty('--hook-y',y+'px');current.classList.toggle('visible',!!active&&group.offsetHeight>0);
 const hy=hover?center(hover,group)+2-start:0,from=y&&hy<=y?Math.max(0,hy-6):y;
 preview.style.setProperty('--hook-from',(from+start)+'px');preview.style.setProperty('--hook-y',Math.max(6,hy-from)+'px');preview.classList.toggle('visible',!!hover&&hover!==active&&group.offsetHeight>0);
 })}
 new MutationObserver(schedule).observe(sidebar,{attributes:true,attributeFilter:['class'],subtree:true});
 new ResizeObserver(schedule).observe(sidebar);
 ['pointerover','pointerout','focusin','focusout','click'].forEach(event=>sidebar.addEventListener(event,schedule));
 window.addEventListener('resize',schedule);schedule();
})();
