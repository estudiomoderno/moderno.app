import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../app');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const styles=[...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map(m=>m[0]).join('\n');
const links=[...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)].map(m=>m[0]).join('\n');
const sidebar=html.slice(html.indexOf('<aside class="sidebar"'),html.indexOf('</aside>')+8).replaceAll('Javier Jiménez','Ana · Ejemplo').replaceAll('hola@estudiomoderno.es','ana@example.invalid');
const studyCode=html.slice(html.indexOf('function drawSidebarStudy(){'),html.indexOf('function drawBrandSwitch(){'));
const functions=html.slice(html.indexOf('const taskIdentityIcons='),html.indexOf('function wsDrop('));
const iconCode=html.slice(html.indexOf('const ICONS ='),html.indexOf('/* =================== ROUTER')) ;
const iconInit=html.slice(html.indexOf('  const put=(sel,name)=>'),html.indexOf('})();',html.indexOf('  const put=(sel,name)=>')));
const daily=html.slice(html.indexOf('function dailyTaskCards('),html.indexOf('function openDailyTask('));
const fixture=`
const state={wsMine:true,projects:[{id:1,num:'PR-01',name:'Casa del Olivo · Ejemplo',brand:'cm',tasks:[
{title:'Revisar la propuesta de materiales',col:'pend',due:ModernoDaily.today(),assignees:['Ana'],important:true,type:'Diseño'},
{title:'Preparar los planos de la cocina',col:'pend',due:ModernoDaily.today(),assignees:['Ana'],type:'Diseño'},
{title:'Confirmar las medidas con el equipo',col:'prog',due:'',assignees:['Ana'],type:'Revisión'},
{title:'Validar la propuesta de iluminación',col:'rev',due:'',assignees:['Luis'],type:'Entrega'}]}]};
const LS_KEY='identity-preview',APP_LOCALE=()=> 'es-ES',meName=()=> 'Ana',meMail=()=> 'ana@example.invalid';
const KCOLS=[['pend','Pendientes',''],['prog','En progreso',''],['rev','En revisión',''],['listo','Completadas','']];
const BRAND={cm:{chip:'cm',name:'Estudio de ejemplo'}},_accessRole='admin';
const visibleWsOrder=()=>['cm'];
function drawBrandSwitch(){drawSidebarStudy()}
function profileMenu(){wsNewTask()}function inviteUserModal(){wsNewTask()}function notifModal(){wsNewTask()}function sbLogout(){wsNewTask()}
const sortProjects=x=>x,byBrand=x=>x,taskAssignees=t=>t.assignees||[],fmt=String;
const assigneeChips=t=>'<span>'+ModernoDaily.escape(taskAssignees(t).join(', '))+'</span>';
function render(){document.getElementById('view').innerHTML=vWorkspace()}
function renderKeep(el){const pos=el.selectionStart;render();const next=document.getElementById('wsProjBox');next.focus();next.setSelectionRange(pos,pos)}
function wsProjPick(q){state.wsQuery=q;render()}
function toast(s){alert(s)}
function taskModal(pid,i){const t=state.projects[0].tasks[i];document.getElementById('fixture-title').textContent=t.title;document.getElementById('fixture-important').checked=!!t.important;document.getElementById('fixture-dialog').dataset.index=i;document.getElementById('fixture-dialog').showModal()}
function openDailyTask(pid,i){taskModal(pid,i)}
function wsNewTask(){document.getElementById('fixture-note').showModal()}
function dragTask(){} function wsDrop(e){e.preventDefault()}
`;
const page=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}${links}<style>body{display:flex;padding:20px;gap:24px;height:100vh;background:#f6f4eb}.main{flex:1;min-width:0;padding:32px;overflow:auto}.preview-label{font-size:11px;margin:0 0 18px;color:#57564e}dialog{border:0;border-radius:24px;padding:28px;max-width:90vw}dialog::backdrop{background:#0006}@media(max-width:700px){body{padding:12px}.sidebar{display:none!important}.main{padding:16px!important}}</style></head><body>${sidebar}<main class="main"><p class="preview-label">REVISIÓN LOCAL · Datos ficticios · Sin conexión con tu estudio</p><div id="view"></div></main><dialog id="fixture-dialog"><h3 id="fixture-title"></h3><label class="task-important-option"><input type="checkbox" id="fixture-important"> Importante</label><button class="btn" onclick="state.projects[0].tasks[+document.getElementById('fixture-dialog').dataset.index].important=document.getElementById('fixture-important').checked;document.getElementById('fixture-dialog').close();render()">Aplicar al ejemplo</button></dialog><dialog id="fixture-note"><p>La creación conserva el formulario de la app. Esta vista previa solo permite revisar el diseño con datos ficticios.</p><button onclick="this.closest('dialog').close()">Cerrar</button></dialog><script src="/daily-work.js"></script><script>${iconCode}${fixture}${daily}${functions}${studyCode}${iconInit}
document.querySelectorAll('.sidebar [onclick]:not(.sb-toggle)').forEach(e=>e.removeAttribute('onclick'));
document.querySelector('[data-view="workspace"]').classList.add('active');
drawSidebarStudy();render();</script></body></html>`;
http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);return}
 const target=path.resolve(root,'.'+decodeURIComponent(pathname));
 if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404).end();return}
 res.setHeader('Content-Type',({'.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(target)]||'application/octet-stream');fs.createReadStream(target).pipe(res);
}).listen(3196,'127.0.0.1',()=>console.log('Vista ficticia: http://127.0.0.1:3196'));
