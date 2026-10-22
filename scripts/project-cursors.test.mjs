import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {valid,color,signature,productKey}=createRequire(import.meta.url)('../app/project-cursors.js');
const packet={context:'a'.repeat(64),session:'session-a',user:'person-a',anchor:{kind:'product',key:'product-a'},path:[1,0],tag:'IMG',signature:'IMG:0:ab',x:.3,y:.8};
test('pointer protocol rejects malformed or unbounded coordinates and DOM paths',()=>{
 assert.equal(valid(packet),true);assert.equal(valid({...packet,hidden:true}),true);
 for(const p of [{...packet,context:'raw-project-name'},{...packet,x:NaN},{...packet,y:1.1},{...packet,x:-1},{...packet,path:Array(21).fill(0)},{...packet,path:[-1]},{...packet,path:['0']},{...packet,anchor:{kind:'url',key:'https://invalid'}},{...packet,anchor:{kind:'product',key:'x'.repeat(129)}},{...packet,session:'s'.repeat(65)},{...packet,signature:'x'.repeat(65)}])assert.equal(valid(p),false,JSON.stringify(p));
});
test('colors remain stable by user and target fingerprints contain no text or form values',()=>{
 assert.equal(color('person-a'),color('person-a'));assert.match(color('person-a'),/^#[a-f0-9]{6}$/);
 const node={tagName:'INPUT',children:[],textContent:'',value:'PRIVATE'};
 assert.equal(signature(node),signature({...node,value:'OTHER_PRIVATE'}));
 const text=signature({...node,tagName:'DIV',textContent:'Private project name'});
 assert.equal(text.includes('Private'),false);assert.notEqual(text,signature({...node,tagName:'DIV',textContent:'Another project'}));
});

test('legacy product anchors survive sorting without mutating records or revealing product names',()=>{
 const item={name:'Private product',sku:'sku-a',supplier:'Private shop'};const before=JSON.stringify(item),key=productKey(item);
 assert.equal(key,productKey({...item}));assert.equal(key.includes('Private'),false);
 assert.notEqual(key,productKey({...item,sku:'sku-b'}));assert.equal(before,JSON.stringify(item));
 assert.equal(productKey({...item,id:'stable-id'}),'stable-id');
});
