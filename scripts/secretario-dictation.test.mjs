import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const Dictation=require('../app/secretario-dictation.js');

// Deliberate fake of the browser contract: no test below opens a microphone or
// downloads a language pack. Real Chromium capability is checked separately.

class FakeEvent{
  constructor(type,options={}){this.type=type;this.bubbles=options.bubbles===true;}
}
class FakeNode{
  constructor(tag,document){
    this.tagName=String(tag).toUpperCase();this.ownerDocument=document;this.children=[];this.listeners=new Map();
    this.attributes={};this.dataset={};this.className='';this.textContent='';this.type='';this.disabled=false;this.readOnly=false;
    this.value='';this.lang='';this.parentNode=null;this.selectionStart=0;this.selectionEnd=0;
  }
  append(...nodes){for(const node of nodes){this.children.push(node);node.parentNode=this;}}
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  addEventListener(type,handler){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(handler);}
  removeEventListener(type,handler){this.listeners.get(type)?.delete(handler);}
  dispatchEvent(event){for(const handler of this.listeners.get(event.type)||[])handler.call(this,event);return true;}
  click(){this.dispatchEvent(new FakeEvent('click'));}
  remove(){if(!this.parentNode)return;this.parentNode.children=this.parentNode.children.filter(node=>node!==this);this.parentNode=null;}
  setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}
}
class FakeDocument{
  constructor(scope){this.defaultView=scope;this.documentElement={lang:'es-ES'};}
  createElement(tag){return new FakeNode(tag,this);}
}

function recognitionFixture({availability='available',install=true,local=true,startError=null}={}){
  const instances=[],availableCalls=[],installCalls=[];
  class Recognition{
    static async available(options){availableCalls.push(options);return typeof availability==='function'?availability():availability;}
    static async install(options){installCalls.push(options);return install;}
    constructor(){if(local)this.processLocally=false;this.started=false;this.stopped=false;this.aborted=false;instances.push(this);}
    start(){if(startError)throw startError;this.started=true;this.onstart?.();}
    stop(){this.stopped=true;this.onend?.();}
    abort(){this.aborted=true;this.onerror?.({error:'aborted'});this.onend?.();}
    result(items,resultIndex=0){this.onresult?.({resultIndex,results:items.map(item=>Object.assign([{transcript:item.text}],{isFinal:item.final}))});}
    fail(error){this.onerror?.({error});}
    end(){this.onend?.();}
  }
  return {Recognition,instances,availableCalls,installCalls};
}

function fixture(options={}){
  const recognition=options.recognition||recognitionFixture();
  const scope={Event:FakeEvent,navigator:{language:options.navigatorLanguage||'es-ES'}};
  if(options.supported!==false)scope.SpeechRecognition=recognition.Recognition;
  const document=new FakeDocument(scope),form=new FakeNode('form',document),host=new FakeNode('div',document),composer=new FakeNode('textarea',document);
  form.submitCalls=0;form.requestSubmit=()=>{form.submitCalls+=1;};composer.form=form;form.append(composer,host);
  composer.value=options.value||'';composer.lang=options.language||'';composer.disabled=options.disabled===true;
  let inputEvents=0;const changes=[];
  composer.addEventListener('input',()=>{inputEvents+=1;});
  const controller=Dictation.mount({host,composer,onChange:value=>changes.push(value)});
  return {recognition,scope,document,form,host,composer,controller,changes,get submitted(){return form.submitCalls;},get inputEvents(){return inputEvents;}};
}

const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('fails closed when private on-device recognition is unsupported',async()=>{
  const missing=fixture({supported:false});
  assert.deepEqual(missing.controller.getState(),{
    status:'unsupported',active:false,language:'es-ES',supported:false,transcriptAdded:false,error:'local_recognition_unsupported'
  });
  assert.equal(await missing.controller.start(),false);
  assert.equal(missing.host.children[0].children[1].textContent,'Este navegador no admite dictado privado en el dispositivo.');

  const cloudOnly=fixture({recognition:recognitionFixture({local:false})});
  assert.equal(cloudOnly.controller.getState().status,'unsupported');
  assert.equal(await cloudOnly.controller.start(),false);
  assert.equal(cloudOnly.recognition.instances.some(instance=>instance.started),false);
});

test('checks local availability and requires a separate visible language download',async()=>{
  let availability='downloadable';
  const recognition=recognitionFixture({availability:()=>availability});
  const f=fixture({recognition,language:'ca-ES'});
  assert.equal(await f.controller.start(),false);
  assert.equal(f.controller.getState().status,'language_download_required');
  assert.equal(f.host.children[0].children[0].textContent,'Descargar idioma');
  assert.deepEqual(recognition.availableCalls[0],{langs:['ca-ES'],processLocally:true});

  assert.equal(await f.controller.start(),false);
  assert.deepEqual(recognition.installCalls,[{langs:['ca-ES']}]);
  assert.equal(f.controller.getState().status,'idle');
  assert.match(f.host.children[0].children[1].textContent,/Idioma descargado/);
  assert.equal(recognition.instances.some(instance=>instance.started),false);

  availability='available';
  assert.equal(await f.controller.start(),true);
  const active=recognition.instances.at(-1);
  assert.equal(active.processLocally,true);
  assert.equal(active.lang,'ca-ES');
  assert.equal(active.continuous,false);
  assert.equal(active.interimResults,true);
});

test('reports an unavailable or currently downloading local language without starting audio',async()=>{
  for(const [availability,expected] of [['unavailable','language_unavailable'],['downloading','language_downloading']]){
    const recognition=recognitionFixture({availability}),f=fixture({recognition});
    assert.equal(await f.controller.start(),false);
    assert.equal(f.controller.getState().status,expected);
    assert.equal(recognition.instances.some(instance=>instance.started),false);
  }
});

test('reports a failed language installation and keeps recognition stopped',async()=>{
  const recognition=recognitionFixture({availability:'downloadable',install:false}),f=fixture({recognition});
  await f.controller.start();
  assert.equal(await f.controller.start(),false);
  assert.equal(f.controller.getState().status,'language_unavailable');
  assert.equal(f.controller.getState().error,'language_install_failed');
  assert.equal(recognition.instances.some(instance=>instance.started),false);
});

test('appends only final transcription, preserves existing edits and never submits',async()=>{
  const f=fixture({value:'Revisa la factura'});
  assert.equal(await f.controller.start(),true);
  const recognition=f.recognition.instances.at(-1);
  recognition.result([{text:'de Ana',final:false}]);
  assert.equal(f.composer.value,'Revisa la factura');
  assert.match(f.host.children[0].children[1].textContent,/de Ana/);

  f.composer.value+=' urgente';
  recognition.result([{text:'de Ana',final:true}]);
  assert.equal(f.composer.value,'Revisa la factura urgente de Ana');
  assert.deepEqual(f.changes,['Revisa la factura urgente de Ana']);
  assert.equal(f.inputEvents,1);
  assert.equal(f.submitted,0);

  recognition.result([{text:'de Ana',final:true}],0);
  assert.equal(f.composer.value,'Revisa la factura urgente de Ana');
  recognition.result([{text:'de Ana',final:true},{text:'y Patio',final:true}],1);
  assert.equal(f.composer.value,'Revisa la factura urgente de Ana y Patio');
  assert.equal(f.submitted,0);
  recognition.end();
  assert.equal(f.controller.getState().status,'idle');
  assert.match(f.host.children[0].children[1].textContent,/editarlo antes de enviar/);
});

test('maps permission, device, silence, abort and unknown failures to explicit states',async()=>{
  const cases=[
    ['not-allowed','permission_denied',/Permite el acceso/],
    ['audio-capture','device_unavailable',/micrófono disponible/],
    ['no-speech','silence',/No se ha detectado voz/],
    ['aborted','aborted',/interrumpido/],
    ['network','error',/No se ha enviado audio/]
  ];
  for(const [error,status,message] of cases){
    const f=fixture();await f.controller.start();f.recognition.instances.at(-1).fail(error);
    assert.equal(f.controller.getState().status,status);
    assert.match(f.host.children[0].children[1].textContent,message);
  }
});

test('maps a synchronous browser permission failure before listening',async()=>{
  const denied=Object.assign(new Error('denied'),{name:'NotAllowedError'});
  const recognition=recognitionFixture({startError:denied}),f=fixture({recognition});
  assert.equal(await f.controller.start(),false);
  assert.equal(f.controller.getState().status,'permission_denied');
  assert.equal(f.controller.getState().active,false);
  assert.equal(f.composer.value,'');
});

test('a silent natural end is explicit and stop/reset preserve the editable message',async()=>{
  const f=fixture({value:'Texto conservado'});
  await f.controller.start();
  f.recognition.instances.at(-1).end();
  assert.equal(f.controller.getState().status,'silence');
  assert.equal(f.composer.value,'Texto conservado');

  await f.controller.start();
  const second=f.recognition.instances.at(-1);
  assert.equal(f.controller.stop(),true);
  assert.equal(second.stopped,true);
  assert.equal(f.controller.getState().status,'idle');
  assert.equal(f.composer.value,'Texto conservado');

  await f.controller.start();
  const third=f.recognition.instances.at(-1);
  assert.equal(f.controller.reset(),true);
  assert.equal(third.aborted,true);
  assert.equal(f.controller.getState().status,'idle');
  assert.equal(f.composer.value,'Texto conservado');
});

test('reset cancels an availability check and remount/destroy detach only their own UI',async()=>{
  let resolve;
  const pending=new Promise(done=>{resolve=done;});
  const recognition=recognitionFixture({availability:()=>pending}),f=fixture({recognition});
  const starting=f.controller.start();
  assert.equal(f.controller.getState().status,'checking');
  f.controller.reset();resolve('available');
  assert.equal(await starting,false);
  assert.equal(recognition.instances.some(instance=>instance.started),false);

  const other=Dictation.mount({host:f.host,composer:f.composer});
  assert.equal(f.host.children.length,1);
  assert.equal(f.controller.getState().active,false);
  other.destroy();
  assert.equal(f.host.children.length,0);
  other.destroy();
});

test('disabled composer cannot open the microphone',async()=>{
  const f=fixture({disabled:true});
  assert.equal(await f.controller.start(),false);
  assert.equal(f.controller.getState().error,'composer_unavailable');
  assert.equal(f.recognition.instances.some(instance=>instance.started),false);
  await tick();
});
