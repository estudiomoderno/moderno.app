import model from '../app/new-project.js';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const save=html.slice(html.indexOf('function saveCustomize('),html.indexOf('function deleteProject('));
function fixture(){const p={id:1,name:'Proyecto ficticio',client:null,status:'En progreso',addr:'Dirección original',cp:'00123',rooms:[{id:4}],color:'#123456',placeId:'old-reference'};let persisted=0;const c={window:{ModernoPlaces:{canPersistLocation:()=>false}},ModernoNewProject:model,cz:{mode:'data',busy:false,name:p.name,status:p.status,tags:'',client:'',addr:p.addr},state:{projects:[p]},projectClientValidate:()=>true,projectChangeStart:()=>null,projectChangeEnd(){},persistSoon(){persisted++;},closeModal(){},render(){},toast(){}};vm.createContext(c);vm.runInContext(save,c);return {c,p,persisted:()=>persisted};}
test('address-only edits persist without creating an absent tags field or changing unrelated data',()=>{const f=fixture();f.c.cz.addr='Dirección nueva, Portal B';f.c.saveCustomize(1);assert.equal(f.p.addr,'Dirección nueva, Portal B');assert.equal(f.persisted(),1);assert.equal(Object.hasOwn(f.p,'placeId'),false);assert.equal(Object.hasOwn(f.p,'tags'),false);assert.equal(f.p.cp,'00123');assert.equal(f.p.color,'#123456');assert.deepEqual(f.p.rooms,[{id:4}]);});
test('unchanged address preserves its reference and invalid client prevents all changes',()=>{const f=fixture();f.c.cz.name='Otro nombre';f.c.projectClientValidate=()=>false;f.c.saveCustomize(1);assert.equal(f.p.name,'Proyecto ficticio');assert.equal(f.p.placeId,'old-reference');assert.equal(f.persisted(),0);f.c.projectClientValidate=()=>true;f.c.saveCustomize(1);assert.equal(f.p.name,'Otro nombre');assert.equal(f.p.placeId,'old-reference');});

test('create/edit address adapter recovers canonical fields including manual unit and leading postal zero',()=>{
 const fields={street:'Calle ficticia',number:'12B',address2:'Portal B, 2.º A',city:'Ciudad',province:'Provincia',cp:'00123',country:'España'};
 const project={addr:model.formatAddress(fields),city:fields.city,cp:fields.cp,country:fields.country};
 assert.deepEqual(model.addressFields(project),{...fields,placeId:''});
 const f=fixture();Object.assign(f.c.cz,fields,{addressChanged:true,placeId:'fake-only'});f.c.saveCustomize(1);
 assert.equal(f.p.addr,project.addr);assert.equal(f.p.city,'Ciudad');assert.equal(f.p.cp,'00123');assert.equal(f.p.country,'España');assert.equal(f.persisted(),1);assert.equal('placeId' in f.p,false);
 assert.deepEqual(model.addressFields(f.p),{...fields,placeId:''});
});
test('unrecognised historical addresses remain whole and an unrelated edit does not rewrite them',()=>{
 const f=fixture();const parsed=model.addressFields(f.p);assert.equal(parsed.street,f.p.addr);Object.assign(f.c.cz,parsed);f.c.cz.name='Cambio de nombre';f.c.saveCustomize(1);assert.equal(f.p.addr,'Dirección original');assert.equal(f.p.cp,'00123');assert.equal(f.persisted(),0);
});

test('a city with the same name as its province stays in the correct fields',()=>{const fields={street:'Avenida ficticia',number:'',address2:'',city:'Córdoba',province:'Córdoba',cp:'14010',country:'España'};assert.deepEqual(model.addressFields({addr:model.formatAddress(fields),city:fields.city,cp:fields.cp,country:fields.country}),{...fields,placeId:''});});
