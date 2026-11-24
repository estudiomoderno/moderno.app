import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const attrsSource=html.slice(html.indexOf('function fileEmbedAttrs('),html.indexOf('\nfunction documentBrandImageAttrs',html.indexOf('function fileEmbedAttrs(')));
const loadSource=html.slice(html.indexOf('const _imageLoads='),html.indexOf("\ndocument.addEventListener('DOMContentLoaded'",html.indexOf('const _imageLoads=')));
const renderSource=html.slice(html.indexOf('function presRenderEl('),html.indexOf('\nfunction presItem(',html.indexOf('function presRenderEl(')));

function attrsContext(){
  const context={URL,SUPABASE_URL:'https://fixture.supabase.co',ModernoFiles:{storagePath(value){return typeof value==='string'&&value.startsWith('storage://archivos/')?value.slice('storage://archivos/'.length):null;}}};
  vm.createContext(context);vm.runInContext(attrsSource,context);return context;
}

test('presentation PDF attributes keep private references out of src and preserve legacy inline PDFs',()=>{
  const context=attrsContext();
  assert.equal(context.fileEmbedAttrs('local-file://00000000-0000-4000-8000-000000000001'),'data-private-file="local-file://00000000-0000-4000-8000-000000000001"');
  assert.equal(context.fileEmbedAttrs('storage://archivos/00000000-0000-4000-8000-000000000001/pending/file.pdf'),'data-private-file="storage://archivos/00000000-0000-4000-8000-000000000001/pending/file.pdf"');
  assert.equal(context.fileEmbedAttrs('data:application/pdf;base64,JVBERg=='),'src="data:application/pdf;base64,JVBERg=="');
  assert.equal(context.fileEmbedAttrs('javascript:alert(1)'),'');
});

test('presentation renderer marks a private PDF for asynchronous hydration',()=>{
  const context=attrsContext();Object.assign(context,{presSel:null,PFONTS:{sora:'Sora'}});
  vm.runInContext(renderSource,context);
  const output=context.presRenderEl({}, {t:'pdf',x:1,y:2,w:70,data:'storage://archivos/00000000-0000-4000-8000-000000000001/pending/file.pdf',name:'Plano <privado>.pdf'},0,false);
  assert.match(output,/data-private-file="storage:\/\/archivos\//);
  assert.doesNotMatch(output,/<embed[^>]+src="storage:\/\//);
  assert.match(output,/aria-label="Plano &lt;privado>/);assert.doesNotMatch(output,/<privado>/);
});

function pending(){let resolve;return {promise:new Promise(done=>{resolve=done;}),resolve};}
test('a signed PDF is attached only while the same session and element remain active',async()=>{
  const gate=pending();let identity='study|user-a|1';
  const context={WeakMap,fileViewIdentity:()=>identity,fileResolveForView:async()=>gate.promise};vm.createContext(context);vm.runInContext(loadSource,context);
  const classes=new Set(),embed={dataset:{privateFile:'storage://archivos/study/pending/file.pdf'},isConnected:true,getAttribute(){return null;},classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)}};
  const hydration=context.fileLoadEmbed(embed);gate.resolve('https://fixture.supabase.co/signed.pdf?token=ficticio');
  assert.equal(await hydration,true);assert.match(embed.src,/signed\.pdf/);assert.ok(classes.has('file-ready'));

  const changed=pending(),second={dataset:{privateFile:'storage://archivos/study/pending/other.pdf'},isConnected:true,getAttribute(){return null;},classList:{add(){},remove(){}}};
  context.fileResolveForView=async()=>changed.promise;const rejected=context.fileLoadEmbed(second);identity='study|user-b|2';changed.resolve('https://fixture.supabase.co/late.pdf?token=ficticio');
  await assert.rejects(rejected,/PDF no disponible/);assert.equal(second.src,undefined);
});
