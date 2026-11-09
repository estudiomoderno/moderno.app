/* Local, read-only ASCII DXF preview. No file bytes leave the browser. */
var ModernoCadViewer=(()=>{
 const MAX_BYTES=50*1024*1024,MAX_PAIRS=1500000,MAX_ENTITIES=100000;
 const ACI=['#000000','#e5484d','#e5b72f','#55a85a','#32a7a0','#3d76d2','#8b5fc7','#d7d7d7'];
 function number(value){const n=Number(value);return Number.isFinite(n)?n:null;}
 function pairs(text){
  if(/^AutoCAD Binary DXF/i.test(text))throw Error('Este DXF es binario. Expórtalo como DXF ASCII para verlo aquí.');
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);if(lines.length/2>MAX_PAIRS)throw Error('El DXF es demasiado complejo para la vista previa.');
  const out=[];for(let i=0;i+1<lines.length;i+=2){const code=Number(lines[i].trim());if(Number.isInteger(code))out.push({code,value:lines[i+1].trim()});}
  return out;
 }
 function parse(text){
  const input=pairs(text),layers=new Map([['0',{name:'0',color:'#343434'}]]),entities=[];let section='';
  for(let i=0;i<input.length;i++){
   const pair=input[i];
   if(pair.code===0&&pair.value==='SECTION'){section=input[i+1]?.code===2?input[++i].value:'';continue;}
   if(pair.code===0&&pair.value==='ENDSEC'){section='';continue;}
   if(section==='TABLES'&&pair.code===0&&pair.value==='LAYER'){
    let name='0',color=7;for(i++;i<input.length&&input[i].code!==0;i++){if(input[i].code===2)name=input[i].value||'0';if(input[i].code===62)color=Math.abs(Number(input[i].value)||7);}i--;
    layers.set(name,{name,color:ACI[color]||ACI[color%ACI.length]||'#343434'});continue;
   }
   if(section!=='ENTITIES'||pair.code!==0||!['LINE','LWPOLYLINE','CIRCLE','ARC','TEXT','MTEXT','POINT'].includes(pair.value))continue;
   if(entities.length>=MAX_ENTITIES)throw Error('El DXF contiene demasiadas entidades para la vista previa.');
   const entity={type:pair.value,layer:'0',points:[],text:'',radius:0,start:0,end:360,closed:false,color:null};let x=null;
   for(i++;i<input.length&&input[i].code!==0;i++){
    const p=input[i],n=number(p.value);if(p.code===8)entity.layer=p.value||'0';else if(p.code===62)entity.color=ACI[Math.abs(n)||7]||null;
    else if(p.code===10){x=n;if(entity.type!=='LWPOLYLINE')entity.points[0]={x:n,y:entity.points[0]?.y};}
    else if(p.code===20){if(entity.type==='LWPOLYLINE'&&x!==null){entity.points.push({x,y:n});x=null;}else entity.points[0]={x:entity.points[0]?.x,y:n};}
    else if(p.code===11)entity.points[1]={x:n,y:entity.points[1]?.y};else if(p.code===21)entity.points[1]={x:entity.points[1]?.x,y:n};
    else if(p.code===40)entity.radius=n||0;else if(p.code===50)entity.start=n||0;else if(p.code===51)entity.end=n||0;
    else if(p.code===1||p.code===3)entity.text+=(entity.text?' ':'')+p.value.replace(/\\P/g,' ');else if(p.code===70)entity.closed=Boolean((n||0)&1);
   }i--;if(entity.points.some(p=>p&&p.x!==null&&p.y!==null))entities.push(entity);
  }
  if(!entities.length)throw Error('No se han encontrado entidades compatibles en este DXF.');
  for(const entity of entities)if(!layers.has(entity.layer))layers.set(entity.layer,{name:entity.layer,color:'#343434'});
  return {entities,layers:[...layers.values()]};
 }
 function bounds(model){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;const add=(x,y)=>{if(Number.isFinite(x)&&Number.isFinite(y)){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}};
  for(const e of model.entities){e.points.forEach(p=>p&&add(p.x,p.y));if(['CIRCLE','ARC'].includes(e.type)&&e.points[0]){add(e.points[0].x-e.radius,e.points[0].y-e.radius);add(e.points[0].x+e.radius,e.points[0].y+e.radius);}}
  if(!Number.isFinite(minX)||maxX===minX||maxY===minY)throw Error('El DXF no contiene una extensión visible.');return {minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY};
 }
 function paint(model,canvas,{quality='display'}={}){
  const box=bounds(model),density=quality==='display'?Math.max(1,Math.min(2,Number(globalThis.devicePixelRatio)||1)):1,max=Math.min(3600,2400*density),ratio=box.width/box.height;canvas.width=Math.max(640*density,Math.min(max,Math.round(ratio>=1?max:max*ratio)));canvas.height=Math.max(480*density,Math.min(max,Math.round(ratio>=1?max/ratio:max)));
  const ctx=canvas.getContext('2d'),pad=Math.max(28,Math.min(canvas.width,canvas.height)*.05),scale=Math.min((canvas.width-pad*2)/box.width,(canvas.height-pad*2)/box.height),sx=x=>pad+(x-box.minX)*scale,sy=y=>canvas.height-pad-(y-box.minY)*scale;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.lineWidth=Math.max(1,Math.min(2,scale*.02));ctx.lineCap='round';ctx.lineJoin='round';
  for(const e of model.entities){ctx.strokeStyle=e.color||model.layers.find(l=>l.name===e.layer)?.color||'#343434';ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();
   if(e.type==='LINE'&&e.points[1]){ctx.moveTo(sx(e.points[0].x),sy(e.points[0].y));ctx.lineTo(sx(e.points[1].x),sy(e.points[1].y));ctx.stroke();}
   else if(e.type==='LWPOLYLINE'){e.points.forEach((p,i)=>i?ctx.lineTo(sx(p.x),sy(p.y)):ctx.moveTo(sx(p.x),sy(p.y)));if(e.closed)ctx.closePath();ctx.stroke();}
   else if(e.type==='CIRCLE'){ctx.arc(sx(e.points[0].x),sy(e.points[0].y),Math.abs(e.radius*scale),0,Math.PI*2);ctx.stroke();}
   else if(e.type==='ARC'){ctx.arc(sx(e.points[0].x),sy(e.points[0].y),Math.abs(e.radius*scale),-e.end*Math.PI/180,-e.start*Math.PI/180);ctx.stroke();}
   else if(e.type==='POINT'){ctx.arc(sx(e.points[0].x),sy(e.points[0].y),2.5,0,Math.PI*2);ctx.fill();}
   else if(e.text){ctx.font='24px system-ui,sans-serif';ctx.fillText(e.text.slice(0,500),sx(e.points[0].x),sy(e.points[0].y));}
  }
  return box;
 }
 async function open(file){
  if(!file||file.size>MAX_BYTES)throw Error('Límite de archivo CAD: 50 MB');const text=await file.text(),model=parse(text),box=bounds(model);
  return {pages:1,format:'DXF',readOnly:true,metadata:{layers:model.layers,entities:model.entities.length,bounds:box},async pageSize(){return {width:box.width,height:box.height};},async render(page,canvas,options){if(page!==1)throw Error('Página CAD no válida');paint(model,canvas,options);},close:async()=>{}};
 }
 return {open,parse,paint};
})();
if(typeof module!=='undefined')module.exports=ModernoCadViewer;
