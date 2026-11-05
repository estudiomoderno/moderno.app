import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
function run(name,allow=true){
 const start=html.indexOf('async function '+name+'('),end=html.indexOf('\nfunction ',start);
 const code=html.slice(start,end);
 const file={name:'Prueba.pdf',type:'application/pdf',data:'https://old.example/private.pdf'};
 const state={projects:[{id:1,files:[file]}]};const original=JSON.stringify(state);
 const ctx={state,mb:{innerHTML:'sin cambios',classList:{add(){}}},ov:{classList:{add(){}}},fobj:x=>x,ico:()=>'',portalInvoicePrint(){},fileResolveForView:async f=>{assert.equal(f.data,file.data);return allow?'https://clone.example/signed?token=ficticio':false;},modal(s){ctx.mb.innerHTML=s;}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(new URL('../app/daily-work.js',import.meta.url),'utf8'),ctx);vm.runInContext(code,ctx);
 return {ctx,original};
}
for(const name of ['fileView','portalProjFileView']){
 test(name+' resolves access without changing persisted data',async()=>{const {ctx,original}=run(name);await ctx[name](1,0);assert.ok(ctx.mb.innerHTML.includes('/signed?token=ficticio'));assert.ok(!ctx.mb.innerHTML.includes('old.example'));assert.equal(JSON.stringify(ctx.state),original);});
 test(name+' leaves viewer and local work intact when denied',async()=>{const {ctx,original}=run(name,false);await ctx[name](1,0);assert.equal(ctx.mb.innerHTML,'sin cambios');assert.equal(JSON.stringify(ctx.state),original);});
}

test('renamed plans display literal names without injecting markup into the viewer',async()=>{const {ctx}=run('fileView');ctx.state.projects[0].files[0].name='Plano <img id="injected">.pdf';await ctx.fileView(1,0);assert.ok(!ctx.mb.innerHTML.includes('<img id="injected">'));assert.ok(ctx.mb.innerHTML.includes('&lt;img id=&quot;injected&quot;&gt;'));});
