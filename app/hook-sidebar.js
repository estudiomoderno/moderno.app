/* Native adapter; navigation and icons remain owned by the app. */
(()=>{
 const sidebar=document.querySelector('.sidebar');if(!sidebar)return;
 let frame;
 const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update)};
 function rail(group,kind){let el=group.querySelector('.hook-rail.'+kind);if(!el){el=document.createElement('span');el.className='hook-rail '+kind;el.setAttribute('aria-hidden','true');el.innerHTML='<svg viewBox="0 0 13 7" fill="none"><path d="M1 0a6 6 0 0 0 6 6h6" stroke="#111" stroke-width="1.5" stroke-dasharray="2 2"/></svg>';group.append(el)}return el}
 function center(item,group){return item.getBoundingClientRect().top-group.getBoundingClientRect().top+item.offsetHeight/2-2}
 function update(){sidebar.querySelectorAll('.nav-sub').forEach(group=>{
 const active=group.querySelector('.nav-item.active'),hover=group.querySelector('.nav-item:hover,.nav-item:focus-visible');
 const current=rail(group,'selected'),preview=rail(group,'preview');const y=active?center(active,group):0;
 current.style.setProperty('--hook-y',y+'px');current.classList.toggle('visible',!!active&&group.offsetHeight>0);
 const hy=hover?center(hover,group):0,from=y&&hy<=y?Math.max(0,hy-6):y;
 preview.style.setProperty('--hook-from',(from+2)+'px');preview.style.setProperty('--hook-y',Math.max(6,hy-from)+'px');preview.classList.toggle('visible',!!hover&&hover!==active&&group.offsetHeight>0);
 })}
 new MutationObserver(schedule).observe(sidebar,{attributes:true,attributeFilter:['class'],subtree:true});
 new ResizeObserver(schedule).observe(sidebar);
 ['pointerover','pointerout','focusin','focusout','click'].forEach(event=>sidebar.addEventListener(event,schedule));
 window.addEventListener('resize',schedule);schedule();
})();
