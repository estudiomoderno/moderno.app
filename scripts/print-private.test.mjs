import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const section=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
function setup({sign,decode}={}){
  const img={dataset:{privateFile:'storage://archivos/ficticio/plano.png'},isConnected:true,naturalWidth:50,src:'',getAttribute(){return this.src;},decode:decode||async function(){}};
  const zone={childNodes:[{}],style:{display:'none'},querySelectorAll(){return [img];}};
  let prints=0,notices=0,signs=0;
  const c={ESTUDIO_ID:'ficticio',state:{},WeakMap,Promise,Array,Error,String,setTimeout(){},fileResolveForView:async()=>{signs++;return sign?await sign():'https://example.invalid/signed';},document:{title:'Original',getElementById(){return zone;}},window:{print(){prints++;assert.equal(zone.style.display,'block');}},toast(){notices++;}};
  vm.createContext(c);vm.runInContext(section('function fileViewIdentity(){',"document.addEventListener('DOMContentLoaded',()=>{\n  const scan=")+section('async function printAs(title){','function pdfBrandLogo('),c);
  return {c,img,zone,get prints(){return prints;},get notices(){return notices;},get signs(){return signs;}};
}
test('private print waits for signed image decoding and restores document',async()=>{
  let release;const f=setup({decode:()=>new Promise(r=>release=r)});const pending=f.c.printAs('Plano');
  await new Promise(r=>setImmediate(r));assert.equal(f.prints,0);release();assert.equal(await pending,true);assert.equal(f.prints,1);assert.equal(f.c.document.title,'Original');assert.equal(f.zone.style.display,'none');
});
test('denied private image cancels printing rather than outputting missing content',async()=>{const f=setup({sign:async()=>false});assert.equal(await f.c.printAs('Plano'),false);assert.equal(f.prints,0);assert.equal(f.notices,1);});
test('broken image decoding cancels printing',async()=>{const f=setup({decode:async()=>{throw Error('broken');}});assert.equal(await f.c.printAs('Plano'),false);assert.equal(f.prints,0);});
test('identity change during image loading cancels printing',async()=>{let release;const f=setup({decode:()=>new Promise(r=>release=r)});const pending=f.c.printAs('Plano');await new Promise(r=>setImmediate(r));f.c.ESTUDIO_ID='otro';release();assert.equal(await pending,false);assert.equal(f.prints,0);});
test('replacement of print document while loading cancels old print request',async()=>{let release;const f=setup({decode:()=>new Promise(r=>release=r)});const pending=f.c.printAs('Plano');await new Promise(r=>setImmediate(r));f.zone.childNodes=[{}];release();assert.equal(await pending,false);assert.equal(f.prints,0);});
test('reprinting signs again rather than reusing an expired signature',async()=>{const f=setup();assert.equal(await f.c.printAs('Plano'),true);assert.equal(await f.c.printAs('Plano'),true);assert.equal(f.signs,2);});
