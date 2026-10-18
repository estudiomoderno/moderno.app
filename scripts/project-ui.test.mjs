import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app/project-ui.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const insights=fs.readFileSync(new URL('../app/project-insights.js',import.meta.url),'utf8');
function fixture(extra={}){
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const c={ModernoDaily:{escape},state:{clients:[],projects:[],afterClient:null},myAccessLevel:()=> 'owner',canView:()=>true,ico:()=>'',...extra};vm.createContext(c);vm.runInContext(source,c);return c;
}
test('avatar safely labels historical client names without downloading portraits',()=>{
 const c=fixture(),avatar=c.projectClientAvatar({client:'<Cliente> "Prueba"'});
 assert.match(avatar,/&lt;Cliente&gt;/);assert.doesNotMatch(avatar,/<Cliente>|<img|https?:/);assert.match(avatar,/aria-label="Cliente:/);
 assert.equal(c.projectClientAvatar({client:null}),'');
});
test('archive is a reversible view filter and leaves projects intact',()=>{
 const projects=[{id:1,status:'En progreso'},{id:2,status:'Archivado'}],before=JSON.stringify(projects),calls=[];
 const c=fixture({state:{projects},render:()=>calls.push('render'),projectsFadeRows:()=>calls.push('fade')});
 c.projectsArchivedToggle();assert.equal(c.state.showArchived,true);c.projectsArchivedToggle();assert.equal(c.state.showArchived,false);
 assert.equal(JSON.stringify(projects),before);assert.deepEqual(calls,['render','fade','render','fade']);
});
test('switching to the current grid still exits archives without mutating records',()=>{
 const c=fixture({state:{showArchived:true,projView:'grid'},render(){},document:{querySelector:()=>null,addEventListener(){}},wsSlideView(){}});
 vm.runInContext(html.slice(html.indexOf('function projectsViewSet('),html.indexOf('function vProjects(')),c);
 c.projectsViewSet('grid');assert.equal(c.state.showArchived,false);assert.equal(c.state.projView,'grid');
});
test('overdue notification uses the original task index after filtering',()=>{
 const c=fixture({ModernoProjectInsights:{escape:String,metrics:()=>({}),validDate:()=>true,today:()=> '2026-10-11'},projectPendingQuotes:()=>[],state:{}});
 vm.runInContext(insights.slice(insights.indexOf('const projectNoticeCounts='),insights.indexOf("if(typeof document!=='undefined')",insights.indexOf('const projectNoticeCounts='))),c);
 const out=c.projectFolderNotifications({id:4,num:'PR-4',tasks:[{title:'Done',col:'listo',due:'2020-01-01'},{title:'Future',col:'pend',due:'2099-01-01'},{title:'Late',col:'pend',due:'2020-01-01'}]});
 assert.match(out,/openDailyTask\(4,2\)/);assert.doesNotMatch(out,/openDailyTask\(4,0\)|openDailyTask\(4,1\)/);
});
test('project navigation preserves legacy aliases and existing finance and utility restrictions',()=>{
 const c=fixture({myAccessLevel:()=> 'colab',canView:v=>!['utilidades','conversaciones'].includes(v)});assert.equal(c.projectTabKey('resumen'),'proyecto');assert.equal(c.projectTabKey('chat'),'cliente');
 const tabs=c.projectTabsHtml('proyecto');assert.doesNotMatch(tabs,/project-tab-fin|project-tab-utilidades|project-tab-conversaciones/);assert.match(tabs,/aria-label="Inicio"/);assert.match(tabs,/aria-selected="true"/);
});
test('restricted project tools are rejected without changing the active project section',()=>{
 const calls=[],c=fixture({state:{projTab:'tareas'},canView:()=>false,toast:message=>calls.push(message),render(){throw Error('Must not render forbidden project tools');}});
 vm.runInContext(html.slice(html.indexOf('function projTab(t)'),html.indexOf('var _accessRole=')),c);
 for(const section of ['utilidades','conversaciones']){c.projTab(section);assert.equal(c.state.projTab,'tareas');}assert.equal(calls.length,2);
});
test('client search alone cannot save an unknown client or change the selected contact',()=>{
 const input={value:'Inexistente',focus(){}},draft={client:'Histórico'},c=fixture({cz:draft,document:{getElementById:()=>input,addEventListener(){}},toast(){}});
 assert.equal(c.projectClientValidate(),false);assert.equal(draft.client,'Histórico');input.value='Histórico';assert.equal(c.projectClientValidate(),true);
 input.value='';assert.equal(c.projectClientValidate(),true);assert.equal(draft.client,'');
});
test('creating or cancelling a contact returns the complete unsaved project draft',()=>{
 const fields={czClient:{value:'Nuevo'},clName:{value:''}},draft={mode:'data',name:'Nombre sin guardar',tags:'Reforma',status:'En revisión',client:'Original',folderPhotos:['original']};
 let returned;
 const cancel={};const c=fixture({cz:draft,document:{getElementById:id=>fields[id],addEventListener(){}},mb:{querySelector:()=>cancel},clientModal(){},customizeModal:(...args)=>returned=args});
 c.projectClientCreate(8);assert.equal(c.state.afterClient,'projectedit');cancel.onclick();
 assert.equal(returned[0],8);assert.equal(returned[2].name,'Nombre sin guardar');assert.equal(returned[2].client,'Original');assert.equal(c.state.afterClient,null);
 c.projectClientCreate(8);c.projectClientCreateReturn('Nuevo');assert.equal(returned[2].client,'Nuevo');assert.equal(returned[2].tags,'Reforma');assert.equal(draft.client,'Original');
});
test('existing contact save returns to the project editor after validation',()=>{
 const values={clNum:'2',clFolder:'',clName:'Nuevo cliente',clFiscal:'',clPhone:'',clEmail:'',clNif:'',clCountry:'España',clAddr:'',clCp:'',clCity:'',clNotes:''};
 let returned;
 const c=fixture({state:{clients:[],projects:[],afterClient:'projectedit'},wsOrder:['cm'],document:{addEventListener(){},getElementById:id=>({value:values[id]||''}),querySelector:selector=>({dataset:{v:selector.includes('clType')?'Cliente':'cm'}})},idPre:()=> 'CL',nextClientNum:()=> 'CL-2',clNumTaken:()=>false,closeModal(){},toast(){},render(){}});
 c.projectClientCreateReturn=name=>returned=name;
 vm.runInContext(html.slice(html.indexOf('function saveClient('),html.indexOf('let enFile=',html.indexOf('function saveClient('))),c);
 c.saveClient();assert.equal(c.state.clients.length,1);assert.equal(c.state.clients[0].name,'Nuevo cliente');assert.equal(returned,'Nuevo cliente');assert.equal(c.state.afterClient,null);
});
