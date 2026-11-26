import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const section=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('a failed plan upload cannot prevent successful files in the same batch from persisting',async()=>{
  const project={id:7,obraPlanos:[]};let persisted=0,rendered=0;
  const c={state:{projects:[project]},obraPlanoTarget:7,fileViewIdentity:()=> 'study|user',obraSnap(){},fileUp:async file=>file.ok?'local-file://aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa':null,persistSoon(){persisted++},render(){rendered++},toast(){}};
  vm.createContext(c);vm.runInContext(section('function obraPlanoLoad(','async function obraPlanoView('),c);
  c.obraPlanoLoad({files:[{name:'bueno.pdf',type:'application/pdf',ok:true},{name:'vacio.pdf',type:'application/pdf',ok:false}],value:'x'});await settle();await settle();
  assert.equal(project.obraPlanos.length,1);assert.equal(project.obraPlanos[0].name,'bueno.pdf');assert.equal(persisted,1);assert.equal(rendered,1);
});

test('a failed moodboard upload cannot prevent successful images in the same batch from persisting',async()=>{
  const mood={id:8,secs:[{items:[]}]},project={id:7,moods:[mood]};let persisted=0,opened=0;
  const c={state:{projects:[project]},moodCur:{pid:7,mid:8},moodGet:()=>({p:project,m:mood}),fileViewIdentity:()=> 'study|user',fileUp:async file=>file.ok?'local-file://aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa':null,persistSoon(){persisted++},moodOpen(){opened++},toast(){}};
  vm.createContext(c);vm.runInContext(section('function moodUpload(','function moodFromLib('),c);
  c.moodUpload(0,[{name:'buena.png',ok:true},{name:'vacia.png',ok:false}]);await settle();await settle();
  assert.equal(mood.secs[0].items.length,1);assert.equal(persisted,1);assert.equal(opened,1);
});
