var OrdersDashboard=(()=>{
 let rows=[],projectId='',active='all',query='';
 const escape=v=>ModernoDaily.escape(v??'');
 function stage(r){return r.estado==='borrador'?'prepare':r.estado==='recibido'?'received':'ordered';}
 function project(records){return records.filter(r=>r.tipo==='pedido'&&['borrador','confirmado','parcial','recibido'].includes(r.estado));}
 function show(data,id){rows=project(data);projectId=id;draw();}
 function filter(value){active=value;draw();}
 function search(value){query=value;drawCards();}
 function cards(){const shown=rows.filter(r=>(active==='all'||stage(r)===active)&&[r.contenido.proveedor,...(r.contenido.lineas||[]).map(l=>l.snapshot?.name)].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase()));return shown.map(r=>{
 const c=r.contenido,lines=c.lineas||[],label={prepare:'Por pedir',ordered:r.estado==='parcial'?'Entrega parcial':'Pedido',received:'Recibido'}[stage(r)];
 return `<article class="order-summary"><header><span class="order-stage ${stage(r)}">${label}</span><small>${escape(r.id.slice(0,8).toUpperCase())}</small></header><h3>${escape(c.proveedor||'Sin proveedor')}</h3><ul>${lines.map(l=>`<li><span>${escape(l.snapshot?.name)}</span><b>${escape(l.qty)} ${escape(l.snapshot?.unit||'ud')}</b></li>`).join('')}</ul><div class="order-delivery">${c.fecha_entrega?'Entrega prevista · '+escape(c.fecha_entrega.split('-').reverse().join('/')):'Entrega sin fecha prevista'}</div><footer><div><small>${c.economia?'Total del pedido':'Sin impuestos'}</small><strong>${fmt(c.economia?.total??c.total??0)}</strong></div><button class="btn btn-dark" data-order-id="${escape(r.id)}">Ver pedido</button></footer></article>`;
 }).join('')||'<div class="orders-empty">'+(rows.length?'No hay pedidos con estos filtros.':'No hay pedidos confirmados ni borradores en este proyecto. Prepara el primero con «Gestionar pedidos».')+'</div>';}
 function drawCards(){const el=document.getElementById('ordersCards');if(!el)return;el.innerHTML=cards();el.querySelectorAll('[data-order-id]').forEach(b=>b.addEventListener('click',()=>ProductOps.openOrder(projectId,b.dataset.orderId)));}
 function draw(){const box=document.getElementById('opsOverview');if(!box)return;box.innerHTML=`<nav class="orders-stages" aria-label="Estado de los pedidos">${[['all','Todos'],['prepare','Por pedir'],['ordered','Pedido'],['received','Recibido']].map(([key,label])=>`<button type="button" aria-pressed="${active===key}" onclick="OrdersDashboard.filter('${key}')"><span>${label}</span><b>${rows.filter(r=>key==='all'||stage(r)===key).length}</b></button>`).join('')}</nav><label class="orders-search">Buscar pedidos<input type="search" placeholder="Proveedor o producto…" value="${escape(query)}" oninput="OrdersDashboard.search(this.value)"></label><div id="ordersCards" class="orders-grid"></div>`;drawCards();}
 return {show,filter,search,stage,project};
})();
