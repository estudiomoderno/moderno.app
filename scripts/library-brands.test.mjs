import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';import origin from '../app/library-origin.js';
const source=fs.readFileSync(new URL('../app/library-brands.js',import.meta.url),'utf8');
const product={id:'id',brandId:'brand',brandName:'Real autorizado',revision:1,status:'published',rights:{display:true,saveToStudy:true},product:{name:'Silla'}};
function setup(){let requests=[];const c={ESTUDIO_ID:'A',_accessRole:'admin',state:{sessionUser:{id:'user'},view:'biblioteca'},ModernoLibraryOrigin:origin,render(){},sb:{rpc(name,args){return new Promise(resolve=>requests.push({name,args,resolve}));}}};vm.createContext(c);vm.runInContext(source+';this.api=ModernoBrands',c);return {c,requests};}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('no Marcas tab for empty catalogue, failures or unapproved content',async()=>{
 for(const result of [{data:[]},{error:{}},{data:[{...product,status:'draft'}]}]){const {c,requests}=setup();assert.ok(!c.api.tabs().includes('>Marcas<'));requests[0].resolve(result);await settle();assert.ok(!c.api.tabs().includes('>Marcas<'));}
});
test('published catalogue enables tab and old tenant response is ignored',async()=>{
 const {c,requests}=setup();c.api.tabs();c.ESTUDIO_ID='B';c.api.tabs();requests[0].resolve({data:[product]});await settle();assert.ok(!c.api.tabs().includes('>Marcas<'));requests[1].resolve({data:[product]});await settle();assert.ok(c.api.tabs().includes('>Marcas<'));c.api.choose(true);assert.ok(c.api.view().includes('Guardar en Mi estudio'));
});
test('restricted roles never request catalogue',()=>{const {c,requests}=setup();c._accessRole='gestoria';c.api.tabs();assert.equal(requests.length,0);});
