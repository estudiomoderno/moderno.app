import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const require=createRequire(import.meta.url);
const mentions=require('../app/secretario-mentions.js');

class FakeEvent{
  constructor(type,options={}){this.type=type;this.bubbles=!!options.bubbles;Object.assign(this,options);this.defaultPrevented=false;}
  preventDefault(){this.defaultPrevented=true;}
  stopPropagation(){this.cancelBubble=true;}
  stopImmediatePropagation(){this.cancelBubble=true;this.immediateStopped=true;}
}
class FakeClassList{
  constructor(node){this.node=node;this.values=new Set();}
  from(value){this.values=new Set(String(value||'').split(/\s+/).filter(Boolean));}
  sync(){this.node._className=[...this.values].join(' ');}
  add(...values){values.forEach(value=>this.values.add(value));this.sync();}
  remove(...values){values.forEach(value=>this.values.delete(value));this.sync();}
  contains(value){return this.values.has(value);}
}
class FakeElement{
  constructor(tagName,ownerDocument){
    this.tagName=String(tagName).toUpperCase();this.ownerDocument=ownerDocument;this.parentNode=null;this.childNodes=[];
    this.attributes=new Map();this.listeners=new Map();this.dataset={};this.hidden=false;this._text='';this._className='';this.classList=new FakeClassList(this);
  }
  set className(value){this._className=String(value);this.classList.from(value);}
  get className(){return this._className;}
  set textContent(value){this._text=String(value);this.childNodes=[];}
  get textContent(){return this._text+this.childNodes.map(node=>node.textContent).join('');}
  append(...nodes){for(const node of nodes){node.parentNode=this;this.childNodes.push(node);}}
  replaceChildren(...nodes){for(const child of this.childNodes)child.parentNode=null;this.childNodes=[];this._text='';this.append(...nodes);}
  remove(){if(!this.parentNode)return;const index=this.parentNode.childNodes.indexOf(this);if(index>=0)this.parentNode.childNodes.splice(index,1);this.parentNode=null;}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  getAttribute(name){return this.attributes.has(name)?this.attributes.get(name):null;}
  removeAttribute(name){this.attributes.delete(name);}
  addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);}
  removeEventListener(type,listener){this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item!==listener));}
  dispatchEvent(event){
    if(!event.target)event.target=this;event.currentTarget=this;
    for(const listener of [...(this.listeners.get(event.type)||[])]){listener.call(this,event);if(event.immediateStopped)break;}
    if(event.bubbles&&!event.cancelBubble&&this.parentNode)this.parentNode.dispatchEvent(event);
    return !event.defaultPrevented;
  }
  contains(node){for(let current=node;current;current=current.parentNode)if(current===this)return true;return false;}
  closest(selector){
    if(selector==='[data-secretary-mention-index]')for(let node=this;node;node=node.parentNode)
      if(Object.hasOwn(node.dataset||{},'secretaryMentionIndex'))return node;
    return null;
  }
  focus(){this.ownerDocument.activeElement=this;}
  scrollIntoView(){}
}
class FakeComposer extends FakeElement{
  constructor(ownerDocument){super('textarea',ownerDocument);this.value='';this.selectionStart=0;this.selectionEnd=0;}
  setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}
}
class FakeDocument extends FakeElement{
  constructor(){super('#document',null);this.ownerDocument=this;this.defaultView={Event:FakeEvent};this.activeElement=null;}
  createElement(tagName){return new FakeElement(tagName,this);}
}
const walk=(node,predicate,out=[])=>{if(predicate(node))out.push(node);for(const child of node.childNodes||[])walk(child,predicate,out);return out;};

function fixture(initial){
  const document=new FakeDocument(),host=document.createElement('div'),composer=new FakeComposer(document);host.append(composer);document.append(host);
  let current=initial||[
    {kind:'client',id:'contact-1',label:'Ácme',brand:'casa'},
    {kind:'supplier',id:'supplier-1',label:'Ácme',brand:'casa'},
    {kind:'project',id:73,label:'Reforma Norte',brand:'casa'},
    {kind:'document',id:'73:file-9',label:'Acta inicial.pdf',projectId:73}
  ];
  const changes=[];
  const controller=mentions.mount({composer,host,getCandidates:()=>current,onChange:value=>changes.push(value)});
  const panel=walk(host,node=>node.getAttribute?.('role')==='listbox')[0];
  const setCandidates=value=>{current=value;};
  const input=(value,selectionStart=value.length,selectionEnd=selectionStart)=>{
    composer.value=value;composer.setSelectionRange(selectionStart,selectionEnd);composer.dispatchEvent(new FakeEvent('input',{bubbles:true}));
  };
  const key=(value,options={})=>{const event=new FakeEvent('keydown',{key:value,...options});const handled=controller.handleKey(event);return {event,handled};};
  const options=()=>walk(panel,node=>Object.hasOwn(node.dataset||{},'secretaryMentionIndex'));
  return {document,host,composer,panel,controller,changes,input,key,options,setCandidates};
}

test('publishes only the mount API as CommonJS and as the requested browser global',async()=>{
  assert.deepEqual(Object.keys(mentions),['mount']);assert.ok(Object.isFrozen(mentions));
  const source=await readFile(new URL('../app/secretario-mentions.js',import.meta.url),'utf8'),context=vm.createContext({});
  vm.runInContext(source,context);assert.equal(typeof context.ModernoSecretaryMentions.mount,'function');
  assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\b/);
});

test('opens a grouped, accessible, text-only list and preserves homonyms by entity type',()=>{
  const f=fixture();f.input('@ácme');
  assert.equal(f.panel.hidden,false);assert.equal(f.panel.getAttribute('role'),'listbox');assert.equal(f.composer.getAttribute('aria-expanded'),'true');
  const options=f.options();assert.equal(options.length,2);assert.deepEqual(options.map(node=>node.textContent),['ÁcmeCliente · casa','ÁcmeProveedor · casa']);
  assert.ok(options.every(node=>node.type==='button'&&node.getAttribute('role')==='option'));
  f.input('persona@example.com');assert.equal(f.panel.hidden,true,'email addresses must not trigger a mention');
  f.input('@ac',1,2);assert.equal(f.panel.hidden,true,'a range selection must not open the listbox');
});

test('Enter selects the active authorized pointer and cannot fall through to message submit',()=>{
  const f=fixture();f.input('@ac');
  const down=f.key('ArrowDown');assert.equal(down.handled,true);assert.equal(down.event.defaultPrevented,true);
  const enter=f.key('Enter');assert.equal(enter.handled,true);assert.equal(enter.event.defaultPrevented,true);assert.equal(enter.event.immediateStopped,true);
  assert.equal(f.composer.value,'@Ácme ');assert.equal(f.panel.hidden,true);assert.equal(f.composer.selectionStart,6);
  const snapshot=f.controller.snapshot();
  assert.deepEqual(snapshot,{version:1,value:'@Ácme ',references:[{kind:'supplier',id:'supplier-1',label:'Ácme',brand:'casa',range:{start:0,end:5},text:'@Ácme'}]});
  assert.ok(Object.isFrozen(snapshot)&&Object.isFrozen(snapshot.references)&&Object.isFrozen(snapshot.references[0])&&Object.isFrozen(snapshot.references[0].range));
  const closed=f.key('Enter');assert.equal(closed.handled,false,'Enter is available to the composer after the list closes');
});

test('click and touch-compatible pointer selection use the current local authorization snapshot',()=>{
  const f=fixture();f.input('Ver @ref');const project=f.options().find(node=>node.textContent.includes('Reforma Norte'));
  project.dispatchEvent(new FakeEvent('pointerdown',{bubbles:true,pointerType:'touch'}));project.dispatchEvent(new FakeEvent('click',{bubbles:true}));
  assert.equal(f.composer.value,'Ver @Reforma Norte ');assert.equal(f.controller.snapshot().references[0].id,'73');

  f.input(f.composer.value+' y @act');const stale=f.options()[0];f.setCandidates([]);stale.dispatchEvent(new FakeEvent('click',{bubbles:true}));
  assert.equal(f.composer.value,'Ver @Reforma Norte  y @act','a stale option cannot be inserted');
  assert.deepEqual(f.controller.snapshot().references,[],'authorization loss also removes existing pointers');
});

test('candidate DTOs are cloned defensively and conflicting or malformed identities fail closed',()=>{
  let getterReads=0;const accessor={kind:'client',id:'getter',label:'No leer'};
  Object.defineProperty(accessor,'brand',{enumerable:true,get(){getterReads+=1;return 'secret';}});
  const polluted=Object.assign(Object.create({private:'value'}),{kind:'client',id:'proto',label:'Prototipo'});
  const extra={kind:'client',id:'extra',label:'Extra',private:'never'};
  const source={kind:'client',id:'safe',label:'Seguro'};
  const f=fixture([accessor,polluted,extra,source,{...source,label:'Conflicto'}]);f.input('@');
  assert.equal(getterReads,0);assert.equal(f.options().length,0,'a conflicting stable pointer must not choose the first label');
  source.label='Mutado';f.setCandidates([{kind:'client',id:'safe-2',label:'Visible <img src=x>'}]);f.controller.refresh();
  assert.equal(f.options()[0].textContent,'Visible <img src=x>Cliente');
});

test('preserves only canonical resolver identities, including null scope and legacy versions',()=>{
  const legacy={kind:'client',id:'legacy:0123456789abcdef',brand:null,version:'contactos@v7'};
  const invoice={kind:'invoice',id:'F-100',brand:null,projectId:null};
  const file={kind:'project_file',id:'file-9',projectId:'73'};
  const f=fixture([
    {kind:'client',id:legacy.id,label:'Contacto histórico',identity:legacy},
    {kind:'invoice',id:'F-100',label:'Factura F-100',identity:invoice},
    {kind:'project_file',id:'file-9',label:'Acta.pdf',projectId:'73',identity:file},
    {kind:'client',id:'bad',label:'No válida',identity:{kind:'client',id:'bad',brand:null,version:'unexpected'}},
    {kind:'document',id:'wrong',label:'No válida',identity:{kind:'client',id:'wrong',brand:null}}
  ]);
  f.input('@contacto');f.key('Enter');let selected=f.controller.snapshot().references[0];
  assert.deepEqual(selected.identity,legacy);assert.ok(Object.isFrozen(selected.identity));
  f.input(f.composer.value+'@factura');f.key('Enter');selected=f.controller.snapshot().references.at(-1);
  assert.deepEqual(selected.identity,invoice);assert.equal(selected.identity.brand,null);assert.equal(selected.identity.projectId,null);
  f.input(f.composer.value+'@acta');f.key('Enter');selected=f.controller.snapshot().references.at(-1);
  assert.deepEqual(selected.identity,file);assert.equal(selected.kind,'project_file');
});

test('text edits shift intact ranges and invalidate changed or deleted references without relinking',()=>{
  const f=fixture();f.input('@ac');f.key('Enter');
  f.input('Hola '+f.composer.value);let reference=f.controller.snapshot().references[0];assert.deepEqual(reference.range,{start:5,end:10});
  f.input(f.composer.value+'después');reference=f.controller.snapshot().references[0];assert.deepEqual(reference.range,{start:5,end:10});
  const changed=f.composer.value.replace('Á','A');f.input(changed);assert.deepEqual(f.controller.snapshot().references,[]);
  f.input(changed.replace('Acme','Ácme'));assert.deepEqual(f.controller.snapshot().references,[],'manually restoring the label cannot restore trust');
});

test('token boundaries, multiple ranges and the server mention limit remain fail closed',()=>{
  const boundary=fixture();boundary.input('@ac');boundary.key('Enter');
  const end=boundary.controller.snapshot().references[0].range.end;
  boundary.input(boundary.composer.value.slice(0,end)+'x'+boundary.composer.value.slice(end),end+1);
  assert.deepEqual(boundary.controller.snapshot().references,[],'typing onto the end changes the mention token');

  const multiple=fixture();multiple.input('@ac');multiple.key('Enter');multiple.input(multiple.composer.value+'y @ref');multiple.key('Enter');
  multiple.input('Inicio '+multiple.composer.value);
  assert.deepEqual(multiple.controller.snapshot().references.map(reference=>reference.range),[{start:7,end:12},{start:15,end:29}]);

  const limited=fixture();
  for(let index=0;index<8;index+=1){limited.input(limited.composer.value+'@ac');limited.key('Enter');}
  const before=limited.composer.value;limited.input(before+'@ac');const ninth=limited.key('Enter');
  assert.equal(ninth.handled,true);assert.equal(limited.composer.value,before+'@ac');assert.equal(limited.controller.snapshot().references.length,8);
  limited.composer.maxLength=limited.composer.value.length;limited.input(limited.composer.value+' @ref');limited.key('Enter');
  assert.doesNotMatch(limited.composer.value,/Reforma Norte/);
});

test('refresh and reset revoke pointers, fail closed on errors, and do not change the draft text',()=>{
  const f=fixture();f.input('@act');f.key('Enter');const value=f.composer.value;assert.equal(f.controller.snapshot().references.length,1);
  f.setCandidates([]);const refreshed=f.controller.refresh();assert.deepEqual(refreshed.references,[]);assert.equal(f.composer.value,value);
  f.input('@ref');f.setCandidates([{kind:'project',id:73,label:'Reforma Norte',brand:'casa'}]);f.controller.refresh();f.key('Enter');
  assert.equal(f.controller.snapshot().references.length,1);assert.equal(f.controller.reset().references.length,0);assert.match(f.composer.value,/Reforma Norte/);
  f.setCandidates({then(){}});assert.deepEqual(f.controller.refresh().references,[]);assert.equal(f.panel.hidden,true,'async discovery is rejected');
});

test('Escape, composition, empty results and teardown keep keyboard and aria state predictable',()=>{
  const f=fixture([]);f.input('@nada');assert.equal(f.panel.hidden,false);assert.match(f.panel.textContent,/No hay referencias/);
  const enter=f.key('Enter');assert.equal(enter.handled,true);assert.equal(enter.event.defaultPrevented,true);assert.equal(f.panel.hidden,true);
  f.input('@');const composing=f.key('Enter',{isComposing:true});assert.equal(composing.handled,false);
  const escape=f.key('Escape');assert.equal(escape.handled,true);assert.equal(f.composer.getAttribute('aria-expanded'),'false');
  const second=mentions.mount({composer:f.composer,host:f.host,getCandidates:()=>[],onChange(){}});
  assert.equal(walk(f.host,node=>node.getAttribute?.('role')==='listbox').length,1,'remount destroys the old panel');
  second.destroy();assert.equal(f.composer.getAttribute('aria-expanded'),null);assert.equal(f.host.classList.contains('secretary-mentions-host'),false);
  f.composer.setAttribute('aria-expanded','legacy');const third=mentions.mount({composer:f.composer,host:f.host,getCandidates:()=>[]});
  third.destroy();assert.equal(f.composer.getAttribute('aria-expanded'),'legacy');
});
