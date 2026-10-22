import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {webcrypto} from 'node:crypto';
const ui=fs.readFileSync(new URL('../app/project-ui.js',import.meta.url),'utf8'),documents=fs.readFileSync(new URL('../app/project-documents.js',import.meta.url),'utf8');
function fixture(){
 const project={id:1,notes:'Keep',files:[{id:'f1',name:'Contract.pdf',data:'private-original'}],events:[{id:'other',cat:'other',txt:'Keep'}]},alert={textContent:''},nodes=[{disabled:false}],form={isConnected:true,elements:{date:{value:'2026-10-22'},notes:{value:'Visit <script>text</script>'},photos:{files:[],value:''}},querySelector:()=>alert,querySelectorAll:()=>nodes};
 const c=vm.createContext({state:{projects:[project],sessionUser:{id:'fictional',name:'Ficticia'}},_accessRole:'colaborador',_accessLoading:false,ModernoDaily:{escape:s=>String(s??'').replaceAll('<','&lt;').replaceAll('>','&gt;')},crypto:webcrypto,structuredClone,fileViewIdentity:()=> 'fictional-study|fictional',persistSoon:()=>{},render:()=>{},toast:()=>{},closeModal:()=>{},modal:()=>{},fileUp:async()=> 'storage://archivos/00000000-0000-0000-0000-000000000001/fake.jpg',sb:{},ico:()=>'',fileImageAttrs:()=> 'src="fake"'});
 vm.runInContext(ui+'\n'+documents,c);return {c,project,form,alert};
}
test('categories separate formats, preserve legacy files and original file indices without mutation',()=>{
 const {c}=fixture(),p={files:['Legacy.pdf',{name:'Contract.pdf',type:'application/pdf'},{name:'Plan.png',cat:'plano',type:'image/png'},{name:'Plan.dwg',cat:'plano'}]},before=JSON.stringify(p);
 assert.deepEqual(Array.from(c.ModernoProjectDocuments.plans(p),x=>x.index),[2,3]);assert.equal(c.ModernoProjectDocuments.category(p.files[1]),'archivos');assert.equal(JSON.stringify(p),before);
 const upload=c.ModernoProjectDocuments.uploadCard({id:1},'planos');assert.match(upload,/data-section="planos"/);assert.match(upload,/this.dataset.section/);assert.match(upload,/this.closest\('\[data-project\]'\).dataset.section/);
});
test('moving categories retains original file content, ids, signatures and source positions',()=>{
 const {c,project}=fixture();const first={...project.files[0],signed:{by:'Ficticia'},cli:false};project.files[0]=first;
 c.projectFileMove(1,0);assert.deepEqual(JSON.parse(JSON.stringify(project.files[0])),{...first,cat:'plano'});c.projectFileMove(1,0);assert.deepEqual(JSON.parse(JSON.stringify(project.files[0])),{...first,cat:'documento'});
 const before=JSON.stringify(project);c._accessRole='gestoria';c.projectFileMove(1,0);assert.equal(JSON.stringify(project),before);
});
test('diary create/edit retains unrelated events, notes, author and uploaded references after serialization',async()=>{
 const {c,project,form}=fixture();c.projectDiaryOpen(1);form.elements.photos.files=[{name:'Photo.jpg',type:'image/jpeg',size:42}];assert.equal(await c.projectDiarySave(form),true);
 const entry=project.events[1];assert.equal(entry.cat,'diario-obra');assert.equal(entry.files.length,1);assert.match(entry.files[0].data,/^storage:\/\//);assert.equal(project.notes,'Keep');assert.equal(project.events[0].txt,'Keep');assert.doesNotMatch(c.projectDiaryHtml(project),/<script>/);
 c.state.projects=JSON.parse(JSON.stringify(c.state.projects));c.projectDiaryOpen(1,entry.id);form.elements.photos.files=[];form.elements.notes.value='Edited';assert.equal(await c.projectDiarySave(form),true);
 const saved=c.state.projects[0].events[1];assert.equal(saved.id,entry.id);assert.equal(saved.createdBy,entry.createdBy);assert.equal(saved.files[0].data,entry.files[0].data);assert.equal(saved.txt,'Edited');
});
test('cloud photo failure keeps diary unchanged and preserves the form for retry',async()=>{
 const {c,project,form,alert}=fixture();const before=JSON.stringify(project);c.projectDiaryOpen(1);form.elements.photos.files=[{name:'Photo.jpg',type:'image/jpeg',size:42}];c.fileUp=async()=> 'data:image/jpeg;base64,ZmFrZQ==';
 assert.equal(await c.projectDiarySave(form),false);assert.equal(JSON.stringify(project),before);assert.match(alert.textContent,/No se pudo subir/);assert.equal(form.querySelectorAll()[0].disabled,false);
});
test('session change during photo upload and concurrent edits cannot replace another visit',async()=>{
 const {c,project,form}=fixture();c.projectDiaryOpen(1);const before=JSON.stringify(project);form.elements.photos.files=[{name:'Photo.jpg',type:'image/jpeg',size:42}];c.fileUp=async()=>{c.fileViewIdentity=()=> 'other-study';return 'storage://archivos/fake';};assert.equal(await c.projectDiarySave(form),false);assert.equal(JSON.stringify(project),before);
 const f=fixture();f.project.events.push({id:'visit',cat:'diario-obra',txt:'Old',files:[]});f.c.projectDiaryOpen(1,'visit');f.project.events[1].txt='Colleague edit';assert.equal(await f.c.projectDiarySave(f.form),false);assert.equal(f.project.events[1].txt,'Colleague edit');assert.match(f.alert.textContent,/Otra persona/);
});
