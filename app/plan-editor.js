/* Original files are immutable. Cloud saving requires a verified persistence adapter. */
var ModernoPlanEditor=(()=>{
 const labels={pen:'Lápiz',highlight:'Resaltador',arrow:'Flecha',rect:'Rectángulo',ellipse:'Círculo',text:'Texto',note:'Nota',erase:'Borrador',pan:'Desplazar'};
 // Annotations stay in original page coordinates at every viewing angle.
 function sourcePoint(p,turns){const t=((turns%4)+4)%4;return t===1?{x:p.y,y:1-p.x}:t===2?{x:1-p.x,y:1-p.y}:t===3?{x:1-p.y,y:p.x}:{x:p.x,y:p.y};}
 function rotateCanvas(source,turns){
  const t=((turns%4)+4)%4;if(!t)return source;
  const target=window.document.createElement('canvas');target.width=t%2?source.height:source.width;target.height=t%2?source.width:source.height;
  const ctx=target.getContext('2d');ctx.translate(t===1||t===2?target.width:0,t===2||t===3?target.height:0);ctx.rotate(t*Math.PI/2);ctx.drawImage(source,0,0);return target;
 }
 function draw(ctx,items,w,h){
  for(const a of items){const p=a.points.map(p=>({x:p.x*w,y:p.y*h})),first=p[0],last=p[p.length-1];ctx.save();ctx.strokeStyle=a.color;ctx.fillStyle=a.color;ctx.lineWidth=a.width*w/1000;ctx.lineCap='round';ctx.lineJoin='round';
   if(a.type==='highlight'){ctx.globalAlpha=.3;ctx.lineWidth*=5;}
   if(a.type==='rect')ctx.strokeRect(first.x,first.y,last.x-first.x,last.y-first.y);
   else if(a.type==='ellipse'){ctx.beginPath();ctx.ellipse((first.x+last.x)/2,(first.y+last.y)/2,Math.max(.5,Math.abs(last.x-first.x)/2),Math.max(.5,Math.abs(last.y-first.y)/2),0,0,2*Math.PI);ctx.stroke();}
   else if(a.type==='text'||a.type==='note'){ctx.font=Math.max(10,a.width*w/1000*5)+'px sans-serif';a.text.split('\n').forEach((line,i)=>ctx.fillText(line,first.x,first.y+i*18*w/1000));}
   else{ctx.beginPath();ctx.moveTo(first.x,first.y);for(const q of p.slice(1))ctx.lineTo(q.x,q.y);if(p.length===1)ctx.lineTo(first.x+.1,first.y);ctx.stroke();
    if(a.type==='arrow'){const angle=Math.atan2(last.y-first.y,last.x-first.x),size=14*w/1000;ctx.beginPath();ctx.moveTo(last.x-size*Math.cos(angle-.5),last.y-size*Math.sin(angle-.5));ctx.lineTo(last.x,last.y);ctx.lineTo(last.x-size*Math.cos(angle+.5),last.y-size*Math.sin(angle+.5));ctx.stroke();}
   }ctx.restore();
  }
 }
 async function openFile(file,{pdfjs}={}){
  if(!file||file.size>50*1024*1024)throw Error('Límite de archivo: 50 MB');
  if(file.type==='application/pdf'){
   if(!pdfjs)throw Error('Lector PDF no disponible');const doc=await pdfjs.getDocument({data:await file.arrayBuffer(),isEvalSupported:false}).promise;
   if(doc.numPages>100){await doc.destroy();throw Error('Máximo 100 páginas');}
   return {pages:doc.numPages,async pageSize(page){const p=await doc.getPage(page),v=p.getViewport({scale:1});return {width:v.width,height:v.height};},async render(page,canvas){const p=await doc.getPage(page),v=p.getViewport({scale:1.5});if(v.width*v.height>20e6)throw Error('Página demasiado grande');canvas.width=Math.ceil(v.width);canvas.height=Math.ceil(v.height);await p.render({canvasContext:canvas.getContext('2d'),viewport:v}).promise;p.cleanup();},close:()=>doc.destroy()};
  }
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Usa PDF, PNG, JPEG o WebP');
  const img=await createImageBitmap(file);if(img.width*img.height>20e6){img.close();throw Error('Imagen demasiado grande');}
  return {pages:1,async render(page,canvas){if(page!==1)throw Error('Página no válida');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0);},close:()=>img.close()};
 }
 // Flattened JPEG pages in a standards-based PDF. Source bytes are never altered.
 function pdf(pages){
  const enc=new TextEncoder(),parts=[],offsets=[0];let length=0;
  const put=v=>{const b=typeof v==='string'?enc.encode(v):v;parts.push(b);length+=b.length;};
  const obj=(n,v)=>{offsets[n]=length;put(n+' 0 obj\n');put(v);put('\nendobj\n');};
  put('%PDF-1.4\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>');
  pages.forEach((p,i)=>{const n=3+i*3,w=p.pageWidth||p.width*.75,h=p.pageHeight||p.height*.75;obj(n,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+w+' '+h+'] /Resources << /XObject << /Im '+(n+2)+' 0 R >> >> /Contents '+(n+1)+' 0 R >>');const commands='q '+w+' 0 0 '+h+' 0 0 cm /Im Do Q';obj(n+1,'<< /Length '+enc.encode(commands).length+' >>\nstream\n'+commands+'\nendstream');offsets[n+2]=length;put((n+2)+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+p.width+' /Height '+p.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+p.jpeg.length+' >>\nstream\n');put(p.jpeg);put('\nendstream\nendobj\n');});
  const start=length;put('xref\n0 '+offsets.length+'\n0000000000 65535 f \n');for(const o of offsets.slice(1))put(String(o).padStart(10,'0')+' 00000 n \n');put('trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF');return new Blob(parts,{type:'application/pdf'});
 }
 async function mount(root,{document:doc,model,adapter,onError=()=>{}}){
  model.check();let page=1,zoom=1,tool='pen',draft=null,pointer=null,closed=false,sequence=0,busy=false;const listeners=[],rotations=new Map();
  root.classList.add('plan-editor');root.innerHTML='<h2>Plano</h2><div class="plan-toolbox"><div class="plan-palette" role="group" aria-label="Colores y grosor"></div><div class="plan-toolbar" role="group" aria-label="Herramientas"></div></div><textarea aria-label="Texto o nota" placeholder="Escribe y toca el plano para colocar el texto" maxlength="1000" hidden></textarea><div class="plan-viewport" tabindex="0" aria-label="Área del plano"><div class="plan-paper"><div class="plan-sheet"><canvas></canvas><canvas tabindex="0" aria-label="Lienzo de anotación"></canvas></div></div></div><div class="plan-toolbar plan-navigation" role="group" aria-label="Páginas, zoom y exportación"></div><details class="plan-selection"><summary>Anotaciones</summary><label class="plan-sr-only" for="plan-annotation-selection">Seleccionar anotación</label><select id="plan-annotation-selection" aria-label="Seleccionar anotación"><option value="">Ninguna</option></select><button type="button" data-action="delete">Eliminar seleccionada</button></details><p class="plan-status" role="status" aria-live="polite"></p>';
  const $=s=>root.querySelector(s),toolbar=$('.plan-toolbar'),nav=$('.plan-navigation'),base=$('canvas'),overlay=$('canvas+canvas'),paper=$('.plan-paper'),sheet=$('.plan-sheet'),viewport=$('.plan-viewport'),status=$('.plan-status'),text=$('textarea'),selection=$('select');
  const listen=(el,event,fn)=>{el.addEventListener(event,fn);listeners.push(()=>el.removeEventListener(event,fn));};
  const report=e=>{status.textContent=e.message||String(e);onError(e);};
  const paths={
   'Lápiz':'<path d="m4 16 11-11 4 4-11 11H4v-4Z M13 7l4 4"/>',
   'Resaltador':'<path d="m8 16-3-3 10-10 6 6-10 10-3-3Z M5 13l-3 7h7 M3 22h16"/>',
   'Borrador':'<path d="m3 14 9-10a2 2 0 0 1 3 0l6 6-10 11H9l-6-5v-2Z M8 9l8 8 M11 21h10"/>',
   'Texto':'<path d="M4 5h16 M12 5v15 M8 20h8 M4 5v3 M20 5v3"/>',
   'Nota':'<path d="M4 3h16v12l-6 6H4V3Z M14 21v-6h6 M8 7h8 M8 11h5"/>',
   'Flecha':'<path d="M4 20 20 4 M8 4h12v12"/>',
   'Rectángulo':'<rect x="4" y="5" width="16" height="14" rx="2"/>',
   'Círculo':'<ellipse cx="12" cy="12" rx="9" ry="7"/>',
   'Desplazar':'<path d="M7 13V7a2 2 0 0 1 4 0v5-8a2 2 0 0 1 4 0v8-6a2 2 0 0 1 4 0v7-3a2 2 0 0 1 4 0v5c0 5-3 7-8 7-3 0-5-2-7-5l-3-4a2 2 0 0 1 3-2l2 2"/>',
   'Deshacer':'<path d="m9 5-5 5 5 5 M4 10h10a6 6 0 0 1 0 12"/>',
   'Rehacer':'<path d="m15 5 5 5-5 5 M20 10H10a6 6 0 0 0 0 12"/>',
   'Guardar':'<path d="M4 3h13l4 4v14H4V3Z M8 3v6h8V3 M8 21v-7h9v7"/>',
   'Página anterior':'<path d="m15 5-7 7 7 7"/>',
   'Página siguiente':'<path d="m9 5 7 7-7 7"/>',
   'Alejar':'<path d="M5 12h14"/>',
   'Acercar':'<path d="M5 12h14 M12 5v14"/>',
   'Girar 90°':'<path d="M20 8a8 8 0 1 0 0 8 M20 3v5h-5"/>',
   'Ajustar':'<path d="M9 3H3v6 M15 3h6v6 M3 15v6h6 M21 15v6h-6"/>',
   'Exportar PDF':'<path d="M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5"/>'
  };
  function button(label,fn,parent=toolbar){const b=window.document.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.title=label;b.className='plan-icon-button';b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[label]||'')+'</svg>';listen(b,'click',async()=>{try{if(pointer!==null)throw Error('Termina el trazo antes de cambiar de herramienta');await fn();}catch(e){report(e);}});parent.append(b);return b;}
  const toolButtons={};['pen','highlight','erase','text','note','arrow','rect','ellipse','pan'].forEach(key=>toolButtons[key]=button(labels[key],()=>{tool=key;draft=null;text.hidden=!['text','note'].includes(tool);size();redraw();}));
  const palette=$('.plan-palette'),color=window.document.createElement('input');color.type='color';color.value='#242424';color.setAttribute('aria-label','Color');color.title='Otro color';
  const colors=[['Negro','#242424'],['Azul','#1677ff'],['Rosa','#ed43ab'],['Blanco','#ffffff'],['Amarillo','#d9ca4a'],['Verde','#318568'],['Rojo','#ed4d3d']];
  const swatches=[];
  function syncColors(){swatches.forEach(([value,b])=>b.setAttribute('aria-pressed',color.value===value));}
  colors.forEach(([name,value])=>{const b=button('Color '+name,()=>{color.value=value;syncColors();},palette);b.className='plan-color';b.style.setProperty('--swatch',value);b.innerHTML='<span aria-hidden="true"></span>';swatches.push([value,b]);});palette.append(color);listen(color,'input',syncColors);syncColors();
  const width=window.document.createElement('input');width.type='range';width.min=1;width.max=12;width.value=3;width.setAttribute('aria-label','Grosor');width.title='Grosor';palette.append(width);
  const undo=button('Deshacer',()=>{model.undo();redraw();}),redo=button('Rehacer',()=>{model.redo();redraw();});
  const save=button('Guardar',async()=>{await model.save(adapter);status.textContent=model.dirty?'Hay cambios posteriores pendientes':'Guardado confirmado';redraw();},nav);save.disabled=!adapter;
  if(!adapter){save.title='Guardado en la nube pendiente de activación';const notice=window.document.createElement('p');notice.className='project-plan-notice';notice.textContent='Anotaciones temporales · Exporta el PDF antes de cerrar.';$('.plan-status').before(notice);}
  const previous=button('Página anterior',()=>changePage(page-1),nav),next=button('Página siguiente',()=>changePage(page+1),nav),pageLabel=window.document.createElement('span');pageLabel.className='plan-page-label';nav.append(pageLabel);
  button('Girar 90°',()=>{if(busy)throw Error('Espera a que termine la página');model.check();rotations.set(page,((rotations.get(page)||0)+1)%4);zoom=1;size();status.textContent='Página girada · Se incluirá en el PDF exportado';},nav);
  button('Alejar',()=>{zoom=Math.max(.25,zoom-.25);size();},nav);button('Acercar',()=>{zoom=Math.min(4,zoom+.25);size();},nav);button('Ajustar',()=>{zoom=1;size();},nav);
  button('Exportar PDF',async()=>{if(busy)throw Error('Espera a que termine la página');model.check();const record=model.snapshot(),angles=new Map(rotations),pages=[];let pixels=0,bytes=0;busy=true;
   try{for(let i=1;i<=doc.pages;i++){model.check();status.textContent='Exportando página '+i+' de '+doc.pages;const c=window.document.createElement('canvas');await doc.render(i,c);pixels+=c.width*c.height;if(pixels>100e6)throw Error('Exporta un documento más pequeño (límite de 100 megapíxeles)');draw(c.getContext('2d'),record.annotations.filter(a=>a.page===i),c.width,c.height);const t=angles.get(i)||0,output=rotateCanvas(c,t);const blob=await new Promise(r=>output.toBlob(r,'image/jpeg',.92));if(!blob)throw Error('No se pudo exportar');bytes+=blob.size;if(bytes>100*1024*1024)throw Error('Exportación demasiado grande');const dimensions=doc.pageSize?await doc.pageSize(i):null;pages.push({width:output.width,height:output.height,pageWidth:t%2?dimensions?.height:dimensions?.width,pageHeight:t%2?dimensions?.width:dimensions?.height,jpeg:new Uint8Array(await blob.arrayBuffer())});c.width=c.height=0;if(output!==c)output.width=output.height=0;}model.check();const url=URL.createObjectURL(pdf(pages)),a=window.document.createElement('a');a.href=url;a.download='plano-anotado.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='PDF exportado (páginas rasterizadas)';}finally{busy=false;}
  },nav);
  nav.append(save);
  function size(){
   if(!base.width)return;
   const css=window.getComputedStyle(viewport),w=Math.max(1,viewport.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight)),h=Math.max(1,viewport.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom));
   const t=rotations.get(page)||0,rotatedW=t%2?base.height:base.width,rotatedH=t%2?base.width:base.height,scale=Math.max(w/rotatedW,h/rotatedH)*zoom,pw=rotatedW*scale,ph=rotatedH*scale;
   paper.style.width=pw+'px';paper.style.height=ph+'px';paper.style.marginTop=Math.max(0,(h-ph)/2)+'px';
   sheet.style.width=base.width*scale+'px';sheet.style.height=base.height*scale+'px';sheet.style.transform='translate('+(t===1||t===2?pw:0)+'px,'+(t===2||t===3?ph:0)+'px) rotate('+(t*90)+'deg)';
  }
  function pointAt(e){return sourcePoint(ModernoPlanAnnotations.point(e.clientX,e.clientY,overlay.getBoundingClientRect()),rotations.get(page)||0);}
  function redraw(){if(closed)return;overlay.getContext('2d').clearRect(0,0,overlay.width,overlay.height);draw(overlay.getContext('2d'),model.items.filter(a=>a.page===page).concat(draft&&!draft.pan?[draft]:[]),overlay.width,overlay.height);Object.entries(toolButtons).forEach(([k,b])=>b.setAttribute('aria-pressed',k===tool));undo.disabled=!model.undoStack.length;redo.disabled=!model.redoStack.length;previous.disabled=page<=1;next.disabled=page>=doc.pages;pageLabel.textContent=page+' / '+doc.pages;const chosen=selection.value;selection.replaceChildren(new Option('Ninguna',''));model.items.filter(a=>a.page===page).forEach((a,i)=>selection.add(new Option(labels[a.type]+' '+(i+1)+(a.text?' · '+a.text.slice(0,30):''),a.id)));selection.value=chosen;}
  async function changePage(n){if(n<1||n>doc.pages||busy)return;if(pointer!==null)throw Error('Termina el trazo antes de cambiar de página');model.check();busy=true;const token=++sequence;
   try{const c=window.document.createElement('canvas');await doc.render(n,c);model.check();if(closed||token!==sequence)return;page=n;base.width=c.width;base.height=c.height;base.getContext('2d').drawImage(c,0,0);overlay.width=c.width;overlay.height=c.height;size();redraw();}finally{busy=false;}
  }
  listen($('[data-action=delete]'),'click',()=>{try{model.remove(selection.value);redraw();}catch(e){report(e);}});
  listen(overlay,'pointerdown',e=>{try{if(busy||pointer!==null)return;if(e.button!==0)return;model.check(tool!=='pan');pointer=e.pointerId;overlay.setPointerCapture(pointer);const p=pointAt(e);
   if(tool==='pan'){draft={pan:true,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};return;}
   if(tool==='erase'){const hit=[...model.items].reverse().find(a=>a.page===page&&a.points.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<.035));if(hit)model.remove(hit.id);redraw();return;}
   if(['text','note'].includes(tool)&&!text.value.trim()){pointer=null;status.textContent='Escribe el texto antes de colocarlo';text.focus();return;}
   draft={id:crypto.randomUUID(),page,type:tool,color:color.value,width:Number(width.value),points:[p],text:text.value.trim(),createdAt:new Date().toISOString()};redraw();
  }catch(e){pointer=null;report(e);}});
  listen(overlay,'pointermove',e=>{if(e.pointerId!==pointer||!draft)return;try{model.check(tool!=='pan');if(draft.pan){viewport.scrollLeft=draft.left+draft.x-e.clientX;viewport.scrollTop=draft.top+draft.y-e.clientY;return;}const p=pointAt(e);if(['pen','highlight'].includes(draft.type)){if(draft.points.length<10000)draft.points.push(p);}else draft.points=[draft.points[0],p];redraw();}catch(e){report(e);}});
  function finish(e){if(e.pointerId!==pointer)return;try{if(draft&&!draft.pan)model.add(draft);}catch(error){report(error);}finally{draft=null;pointer=null;redraw();}}
  listen(overlay,'pointerup',finish);listen(overlay,'pointercancel',finish);listen(overlay,'lostpointercapture',finish);
  listen(root,'keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;try{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?model.redo():model.undo();redraw();}if(e.key==='Delete'&&selection.value){model.remove(selection.value);redraw();}}catch(error){report(error);}});
  listen(window,'beforeunload',e=>{if(model.dirty||draft){e.preventDefault();e.returnValue='';}});
  const resize=new ResizeObserver(size);resize.observe(viewport);resize.observe($('.plan-toolbox'));resize.observe(text);
  try{await changePage(1);}catch(error){closed=true;listeners.forEach(fn=>fn());resize.disconnect();await doc.close?.();throw error;}
  return {async close(){if(model.dirty||draft)throw Error('Hay anotaciones pendientes: exporta o guarda antes de cerrar');closed=true;sequence++;listeners.forEach(fn=>fn());resize.disconnect();await doc.close?.();root.replaceChildren();},discard:async()=>{closed=true;sequence++;listeners.forEach(fn=>fn());resize.disconnect();await doc.close?.();root.replaceChildren();}};
 }
 return {openFile,mount,draw,pdf,sourcePoint};
})();
if(typeof module!=='undefined')module.exports=ModernoPlanEditor;
