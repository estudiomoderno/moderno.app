import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import spec from '../app/specifications.js';
const source=fs.readFileSync(new URL('../app/project-ui.js',import.meta.url),'utf8');
function fixture(){const c={state:{view:'estancia'},toast(){},render(){},document:{addEventListener(){},querySelector(){return null;},getElementById(){return null;}},ModernoDaily:{escape:String}};vm.createContext(c);vm.runInContext(source,c);return c;}
function names(rows){return Array.from(rows,({it})=>it.name);}
test('price sorting keeps zero, negative values and ties; unknown prices are last in both directions',()=>{
 const c=fixture(),room={sections:[{name:'General',items:[{name:'A',price:20},{name:'Zero',price:0},{name:'Missing',price:null}]},{name:'Etiqueta',items:[{name:'B',price:'20'},{name:'Credit',price:-3},{name:'Blank',price:''},{name:'Invalid',price:'bad'}]}]},before=JSON.stringify(room);
 assert.deepEqual(names(c.shoppingRoomSortedRows(room,'price-asc')),['Credit','Zero','A','B','Missing','Blank','Invalid']);
 assert.deepEqual(names(c.shoppingRoomSortedRows(room,'price-desc')),['A','B','Zero','Credit','Missing','Blank','Invalid']);
 assert.equal(JSON.stringify(room),before);
});
test('date sorting uses addition time, supports server-created URL products and never invents historical dates',()=>{
 const c=fixture(),room={sections:[{name:'General',items:[{name:'New',addedAt:'2026-10-20T12:00:00Z'},{name:'Old',addedAt:'2026-10-18T12:00:00Z',createdAt:'2026-10-21T12:00:00Z'},{name:'Legacy'},{name:'URL',createdAt:'2026-10-19T12:00:00Z'},{name:'Broken',addedAt:'invalid'}]}]},before=JSON.stringify(room);
 assert.deepEqual(names(c.shoppingRoomSortedRows(room,'date-asc')),['Old','URL','New','Legacy','Broken']);
 assert.deepEqual(names(c.shoppingRoomSortedRows(room,'date-desc')),['New','URL','Old','Legacy','Broken']);
 assert.equal(JSON.stringify(room),before);assert.equal(c.shoppingProductAddedTime({addedAt:'1'}),null);
});
test('sorted rows retain exact section/item references and returning to manual restores the original display',()=>{
 const c=fixture(),room={sections:[{name:'A',items:[{name:'High',price:100,files:[{data:'keep'}]}]},{name:'B',items:[{name:'Low',price:1}]}]};
 const rows=c.shoppingRoomSortedRows(room,'price-asc');assert.equal(rows[0].si,1);assert.equal(rows[0].ii,0);assert.equal(rows[0].it,room.sections[1].items[0]);
 assert.deepEqual(names(c.shoppingRoomSortedRows(room,'manual')),['High','Low']);assert.equal(room.sections[0].items[0].files[0].data,'keep');
});
test('sort preference is temporary and cannot change under an open draft, on another page or to an unknown option',()=>{
 const c=fixture();c.shoppingRoomSortSet('price-asc');assert.equal(c.shoppingRoomSort,'price-asc');
 c.document.querySelector=()=>({});c.shoppingRoomSortSet('date-desc');assert.equal(c.shoppingRoomSort,'price-asc');
 c.document.querySelector=()=>null;c.state.view='proyecto';c.shoppingRoomSortSet('date-desc');assert.equal(c.shoppingRoomSort,'price-asc');
 c.state.view='estancia';c.shoppingRoomSortSet('invalid');assert.equal(c.shoppingRoomSort,'price-asc');
});
test('library copies and duplicates get their own addition date and preserve the source and its attachments',()=>{
 const original={id:'old',name:'Fixture',addedAt:'2001-01-01T00:00:00Z',createdAt:'2000-01-01T00:00:00Z',files:[{data:'keep'}]},before=JSON.stringify(original),start=Date.now();
 for(const copy of [spec.fromProduct(original,()=> 'library-copy'),spec.duplicate(original,()=> 'duplicate')]){assert.ok(Date.parse(copy.addedAt)>=start);assert.equal(copy.createdAt,original.createdAt);assert.equal(copy.files[0].data,'keep');}
 assert.equal(JSON.stringify(original),before);
});
