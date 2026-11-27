(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else if(root)root.ModernoSecretaryMentions=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  // This component is deliberately local-only. Candidate discovery, authorization
  // and authenticated transport remain responsibilities of the owning app/server.
  const KINDS=Object.freeze(['client','supplier','project','document','invoice','quote','project_file']);
  const IDENTITY_KINDS=Object.freeze(['client','supplier','project','invoice','quote','project_file']);
  const GROUP_ORDER=Object.freeze(['client','supplier','project','document']);
  const GROUPS=Object.freeze({client:'Clientes',supplier:'Proveedores',project:'Proyectos',document:'Documentos'});
  const TYPE_LABELS=Object.freeze({client:'Cliente',supplier:'Proveedor',project:'Proyecto',document:'Documento',invoice:'Factura',quote:'Presupuesto',project_file:'Archivo'});
  const MAX_CANDIDATES=1000,MAX_PER_GROUP=12,MAX_QUERY=120,MAX_REFERENCES=8;
  const instances=new WeakMap();
  let nextInstance=0;

  function ownData(value,required,optional=[]){
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    const prototype=Object.getPrototypeOf(value);
    if(prototype!==Object.prototype&&prototype!==null)return null;
    const allowed=new Set([...required,...optional]),descriptors=Object.getOwnPropertyDescriptors(value);
    for(const key of Reflect.ownKeys(descriptors)){
      if(typeof key!=='string'||!allowed.has(key)||!Object.hasOwn(descriptors[key],'value'))return null;
    }
    for(const key of required)if(!Object.hasOwn(descriptors,key))return null;
    return descriptors;
  }
  function opaque(value,max=256){
    if(Number.isSafeInteger(value)&&value>=0)value=String(value);
    return typeof value==='string'&&value.length>0&&value.length<=max&&!/[\s\x00-\x1f\x7f]/u.test(value)?value:null;
  }
  function identityText(value,max,{nullable=false}={}){
    if(value===null&&nullable)return null;
    return typeof value==='string'&&value.length>0&&value.length<=max&&value.trim()&&
      !/[\x00-\x1f\x7f]/u.test(value)?value:undefined;
  }
  function entityIdentity(value){
    try{
      if(!value||typeof value!=='object'||Array.isArray(value))return null;
      const kindDescriptor=Object.getOwnPropertyDescriptor(value,'kind');
      const kind=kindDescriptor&&Object.hasOwn(kindDescriptor,'value')?kindDescriptor.value:null;
      if(!IDENTITY_KINDS.includes(kind))return null;
      const legacy=/^(?:legacy|party):[0-9a-f]{16}$/.test(Object.getOwnPropertyDescriptor(value,'id')?.value);
      const required=kind==='client'||kind==='supplier'?['kind','id','brand',...(legacy?['version']:[])]:
        kind==='project'?['kind','id']:kind==='project_file'?['kind','id','projectId']:['kind','id','brand','projectId'];
      const data=ownData(value,required);if(!data)return null;
      const id=identityText(data.id.value,160);if(id===undefined)return null;
      const out={kind,id};
      if(kind==='client'||kind==='supplier'){
        const brand=identityText(data.brand.value,80,{nullable:true});if(brand===undefined)return null;out.brand=brand;
        if(legacy){const version=identityText(data.version.value,240);if(version===undefined)return null;out.version=version;}
      }else if(kind==='invoice'||kind==='quote'){
        const brand=identityText(data.brand.value,80,{nullable:true}),projectId=identityText(data.projectId.value,160,{nullable:true});
        if(brand===undefined||projectId===undefined)return null;out.brand=brand;out.projectId=projectId;
      }else if(kind==='project_file'){
        const projectId=identityText(data.projectId.value,160);if(projectId===undefined)return null;out.projectId=projectId;
      }
      return Object.freeze(out);
    }catch{return null;}
  }
  const groupKind=kind=>['invoice','quote','project_file'].includes(kind)?'document':kind;
  function candidate(value){
    try{
      const data=ownData(value,['kind','id','label'],['brand','projectId','identity','detail']);
      if(!data||!KINDS.includes(data.kind.value))return null;
      const id=opaque(data.id.value),rawLabel=data.label.value;
      if(!id||typeof rawLabel!=='string')return null;
      const label=rawLabel.trim();
      if(!label||label.length>220||/[\x00-\x1f\x7f]/u.test(label))return null;
      const out={kind:data.kind.value,id,label};
      if(Object.hasOwn(data,'detail')){
        const detail=identityText(data.detail.value,160);if(detail===undefined)return null;out.detail=detail;
      }
      if(Object.hasOwn(data,'brand')){
        const brand=opaque(data.brand.value,80);if(!brand)return null;out.brand=brand;
      }
      if(Object.hasOwn(data,'projectId')){
        const projectId=opaque(data.projectId.value,160);if(!projectId)return null;out.projectId=projectId;
      }
      if(Object.hasOwn(data,'identity')){
        const identity=entityIdentity(data.identity.value);if(!identity)return null;
        if(out.kind==='document'&&!['invoice','quote','project_file'].includes(identity.kind))return null;
        if(out.kind!=='document'&&(out.kind!==identity.kind||out.id!==identity.id))return null;
        if(out.brand&&Object.hasOwn(identity,'brand')&&identity.brand!==null&&out.brand!==identity.brand)return null;
        if(out.projectId&&Object.hasOwn(identity,'projectId')&&identity.projectId!==null&&out.projectId!==identity.projectId)return null;
        out.identity=identity;
      }
      return Object.freeze(out);
    }catch{return null;}
  }
  const pointerKey=value=>JSON.stringify([value.kind,value.id,value.brand??null,value.projectId??null]);
  const candidateKey=value=>JSON.stringify([value.kind,value.id,value.label,value.brand??null,value.projectId??null,value.identity??null]);
  const sameCandidate=(left,right)=>!!left&&!!right&&candidateKey(left)===candidateKey(right);
  function normalize(value){
    return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
  }
  function candidatesFrom(raw){
    if(!Array.isArray(raw))return {items:[],truncated:false};
    const items=[],byPointer=new Map(),conflicts=new Set(),limit=Math.min(raw.length,MAX_CANDIDATES);
    for(let index=0;index<limit;index+=1){
      const item=candidate(raw[index]);if(!item)continue;
      const key=pointerKey(item);
      if(conflicts.has(key))continue;
      const previous=byPointer.get(key);
      if(previous){
        if(!sameCandidate(previous,item)){
          conflicts.add(key);byPointer.delete(key);
          const at=items.indexOf(previous);if(at>=0)items.splice(at,1);
        }
        continue;
      }
      byPointer.set(key,item);items.push(item);
    }
    return {items,truncated:raw.length>MAX_CANDIDATES};
  }
  function validComposer(value){
    return !!value&&typeof value.value==='string'&&typeof value.addEventListener==='function'&&
      typeof value.removeEventListener==='function'&&typeof value.setSelectionRange==='function';
  }
  function validHost(value){
    return !!value&&typeof value.append==='function'&&typeof value.addEventListener==='function';
  }
  function restoreAttribute(node,name,value){
    if(value===null)node.removeAttribute(name);else node.setAttribute(name,value);
  }
  function frozenReference(reference){
    const {candidate:item,start,end,text}=reference;
    return Object.freeze({kind:item.kind,id:item.id,label:item.label,
      ...(item.brand?{brand:item.brand}:{}),...(item.projectId?{projectId:item.projectId}:{}),
      ...(item.identity?{identity:item.identity}:{}),
      range:Object.freeze({start,end}),text});
  }

  function mount(options){
    if(!options||typeof options!=='object')throw new TypeError('Configuración de menciones no válida.');
    const {composer,host,getCandidates,onChange}=options;
    if(!validComposer(composer)||!validHost(host)||typeof getCandidates!=='function'||
      onChange!==undefined&&typeof onChange!=='function')throw new TypeError('Configuración de menciones no válida.');
    const previous=instances.get(composer);if(previous)previous.destroy();
    const doc=composer.ownerDocument||host.ownerDocument;
    if(!doc||typeof doc.createElement!=='function')throw new TypeError('Documento de menciones no disponible.');

    const instance=++nextInstance,panel=doc.createElement('div');
    panel.id='secretary-mentions-'+instance;panel.className='secretary-mentions-panel';panel.hidden=true;
    panel.setAttribute('role','listbox');panel.setAttribute('aria-label','Referencias disponibles');
    const hostHadClass=host.classList?.contains('secretary-mentions-host')===true;
    host.classList?.add('secretary-mentions-host');host.append(panel);
    const oldAttributes=Object.fromEntries(['aria-autocomplete','aria-haspopup','aria-controls','aria-expanded','aria-activedescendant']
      .map(name=>[name,composer.getAttribute(name)]));
    composer.setAttribute('aria-autocomplete','list');composer.setAttribute('aria-haspopup','listbox');
    composer.setAttribute('aria-controls',panel.id);composer.setAttribute('aria-expanded','false');

    let available=[],availableTruncated=false,references=[],visible=[],optionNodes=[],active=-1,menuRange=null;
    let lastValue=composer.value,destroyed=false,notifying=false;

    function buildSnapshot(){
      return Object.freeze({version:1,value:composer.value,
        references:Object.freeze(references.slice().sort((a,b)=>a.start-b.start).map(frozenReference))});
    }
    function referenceMatches(value,reference,start=reference.start,end=reference.end){
      return start>=0&&end<=value.length&&value.slice(start,end)===reference.text&&
        (start===0||!/[\p{L}\p{N}_@]/u.test(value[start-1]))&&
        (end===value.length||!/[\p{L}\p{N}_]/u.test(value[end]));
    }
    function emit(){
      if(!onChange||notifying||destroyed)return;
      notifying=true;try{onChange(buildSnapshot());}catch{}finally{notifying=false;}
    }
    function reconcileText(){
      const value=composer.value,old=lastValue;
      if(value===old)return false;
      let prefix=0;
      while(prefix<old.length&&prefix<value.length&&old[prefix]===value[prefix])prefix+=1;
      let suffix=0;
      while(suffix<old.length-prefix&&suffix<value.length-prefix&&
        old[old.length-1-suffix]===value[value.length-1-suffix])suffix+=1;
      const oldEnd=old.length-suffix,newEnd=value.length-suffix,delta=newEnd-oldEnd;
      const next=[];
      for(const reference of references){
        let start=reference.start,end=reference.end;
        if(end<=prefix){/* The edit is after this reference. */}
        else if(start>=oldEnd){start+=delta;end+=delta;}
        else continue;
        if(!referenceMatches(value,reference,start,end))continue;
        next.push({...reference,start,end});
      }
      const changed=next.length!==references.length||next.some((item,index)=>
        item.start!==references[index]?.start||item.end!==references[index]?.end);
      references=next;lastValue=value;return changed;
    }
    function authorize(){
      let result;
      try{result=getCandidates();if(result&&typeof result.then==='function')throw new TypeError('Los candidatos deben ser locales.');}
      catch{
        const changed=references.length>0;available=[];availableTruncated=false;references=[];
        return {ok:false,changed};
      }
      if(!Array.isArray(result)){
        const changed=references.length>0;available=[];availableTruncated=false;references=[];
        return {ok:false,changed};
      }
      const parsed=candidatesFrom(result);available=parsed.items;availableTruncated=parsed.truncated;
      const allowed=new Map(available.map(item=>[pointerKey(item),item])),next=[];
      for(const reference of references){
        const current=allowed.get(pointerKey(reference.candidate));
        if(current&&sameCandidate(current,reference.candidate))next.push(reference);
      }
      const changed=next.length!==references.length;references=next;
      return {ok:true,changed};
    }
    function sync(reload=true){
      let changed=reconcileText(),ok=true;
      if(reload){const result=authorize();ok=result.ok;changed=result.changed||changed;}
      if(changed)emit();return ok;
    }
    function close(){
      panel.hidden=true;visible=[];optionNodes=[];active=-1;menuRange=null;
      composer.setAttribute('aria-expanded','false');composer.removeAttribute('aria-activedescendant');
    }
    function queryAtCaret(){
      const start=composer.selectionStart,end=composer.selectionEnd,value=composer.value;
      if(!Number.isInteger(start)||start!==end||start<0||start>value.length)return null;
      const before=value.slice(0,start),trigger=before.lastIndexOf('@');if(trigger<0)return null;
      if(trigger>0&&/[\p{L}\p{N}_]/u.test(value[trigger-1]))return null;
      const query=value.slice(trigger+1,start);
      if(query.length>MAX_QUERY||/[\r\n@]/u.test(query))return null;
      if(references.some(reference=>reference.start===trigger&&start>=reference.end))return null;
      return {start:trigger,end:start,query};
    }
    function score(item,query){
      if(!query)return 3;
      const label=normalize(item.label);if(label===query)return 0;if(label.startsWith(query))return 1;if(label.includes(query))return 2;
      const secondary=normalize([item.id,item.brand,item.projectId,GROUPS[groupKind(item.kind)]].filter(Boolean).join(' '));
      return secondary.includes(query)?4:99;
    }
    function matches(query){
      const normalized=normalize(query),result=[],counts=new Map();let total=0;
      for(const kind of GROUP_ORDER){
        const group=available.map(item=>({item,score:score(item,normalized)})).filter(row=>groupKind(row.item.kind)===kind&&row.score<99)
          .sort((left,right)=>left.score-right.score||left.item.label.localeCompare(right.item.label,'es',{sensitivity:'base'})||left.item.id.localeCompare(right.item.id));
        total+=group.length;counts.set(kind,group.length);
        result.push(...group.slice(0,MAX_PER_GROUP).map(row=>row.item));
      }
      return {items:result,total,limited:availableTruncated||[...counts.values()].some(count=>count>MAX_PER_GROUP)};
    }
    function setActive(index){
      if(!visible.length){active=-1;composer.removeAttribute('aria-activedescendant');return;}
      active=(index+visible.length)%visible.length;
      optionNodes.forEach((node,nodeIndex)=>node.setAttribute('aria-selected',String(nodeIndex===active)));
      const node=optionNodes[active];composer.setAttribute('aria-activedescendant',node.id);
      if(typeof node.scrollIntoView==='function')node.scrollIntoView({block:'nearest'});
    }
    function render(query){
      const previousKey=active>=0&&visible[active]?candidateKey(visible[active]):null;
      const result=matches(query.query);visible=result.items;panel.replaceChildren();optionNodes=[];
      for(const kind of GROUP_ORDER){
        const groupItems=visible.map((item,index)=>({item,index})).filter(row=>groupKind(row.item.kind)===kind);if(!groupItems.length)continue;
        const group=doc.createElement('div');group.className='secretary-mentions-group';group.setAttribute('role','group');group.setAttribute('aria-label',GROUPS[kind]);
        const heading=doc.createElement('div');heading.className='secretary-mentions-group-label';heading.textContent=GROUPS[kind];group.append(heading);
        for(const {item,index} of groupItems){
          const button=doc.createElement('button');button.type='button';button.className='secretary-mentions-option';
          button.id=panel.id+'-option-'+index;button.dataset.secretaryMentionIndex=String(index);button.setAttribute('role','option');button.setAttribute('aria-selected','false');
          const label=doc.createElement('span');label.className='secretary-mentions-label';label.textContent=item.label;button.append(label);
          const meta=doc.createElement('span');meta.className='secretary-mentions-meta';
          meta.textContent=[TYPE_LABELS[item.kind],item.detail||item.brand,item.detail?null:item.projectId].filter(Boolean).join(' · ');button.append(meta);
          group.append(button);optionNodes[index]=button;
        }
        panel.append(group);
      }
      if(!visible.length){
        const empty=doc.createElement('div');empty.className='secretary-mentions-empty';empty.setAttribute('role','status');empty.textContent='No hay referencias accesibles con ese texto.';panel.append(empty);
      }else if(result.limited){
        const more=doc.createElement('div');more.className='secretary-mentions-more';more.textContent='Hay más resultados. Escribe para acotar la búsqueda.';panel.append(more);
      }
      panel.hidden=false;menuRange={start:query.start,end:query.end};composer.setAttribute('aria-expanded','true');
      const retained=previousKey?visible.findIndex(item=>candidateKey(item)===previousKey):-1;setActive(retained>=0?retained:0);
    }
    function updateMenu(ok=true){
      if(!ok){close();return;}
      const query=queryAtCaret();if(!query){close();return;}render(query);
    }
    function dispatchInput(){
      const EventCtor=doc.defaultView?.Event||globalThis.Event;
      if(typeof EventCtor==='function')composer.dispatchEvent(new EventCtor('input',{bubbles:true}));
    }
    function select(index){
      const selected=visible[index],range=menuRange;if(!selected||!range){close();return false;}
      const ok=sync(true),query=queryAtCaret();
      if(!ok||!query||query.start!==range.start||query.end!==range.end){close();return false;}
      const current=available.find(item=>sameCandidate(item,selected));if(!current){close();return false;}
      const old=composer.value,before=old.slice(0,query.start),after=old.slice(query.end),text='@'+current.label;
      const space=after===''||!/^[\s.,;:!?…\)\]\}]/u.test(after)?' ':'';
      if(references.filter(reference=>reference.end<=query.start||reference.start>=query.end).length>=MAX_REFERENCES){close();return false;}
      const nextValue=before+text+space+after,maxLength=Number(composer.maxLength);
      if(Number.isFinite(maxLength)&&maxLength>0&&nextValue.length>maxLength){close();return false;}
      composer.value=nextValue;
      reconcileText();const start=query.start,end=start+text.length;
      references=references.filter(reference=>reference.end<=start||reference.start>=end);
      references.push({candidate:current,start,end,text});references.sort((left,right)=>left.start-right.start);
      lastValue=composer.value;composer.setSelectionRange(end+space.length,end+space.length);
      if(typeof composer.focus==='function')composer.focus({preventScroll:true});close();emit();dispatchInput();
      return true;
    }
    function consume(event){
      event.preventDefault?.();event.stopPropagation?.();event.stopImmediatePropagation?.();
    }
    function handleKey(event){
      if(destroyed||!event||event.isComposing)return false;
      const ok=sync(true);updateMenu(ok);
      if(panel.hidden)return false;
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        consume(event);setActive(active+(event.key==='ArrowDown'?1:-1));return true;
      }
      if(event.key==='Escape'){consume(event);close();return true;}
      if(event.key==='Enter'&&!event.shiftKey&&!event.altKey&&!event.ctrlKey&&!event.metaKey){
        consume(event);if(active>=0)select(active);else close();return true;
      }
      return false;
    }
    function snapshot(){sync(true);return buildSnapshot();}
    function refresh(){const ok=sync(true);updateMenu(ok);return buildSnapshot();}
    function reset(){
      if(destroyed)return buildSnapshot();
      const changed=references.length>0;references=[];lastValue=composer.value;close();if(changed)emit();return buildSnapshot();
    }
    function onInput(){const ok=sync(true);updateMenu(ok);}
    function onSelection(){const ok=sync(true);updateMenu(ok);}
    function onBlur(event){if(!panel.contains(event.relatedTarget))close();}
    function onPanelPointer(event){
      const option=event.target?.closest?.('[data-secretary-mention-index]');if(!option||!panel.contains(option))return;
      const index=Number(option.dataset.secretaryMentionIndex);if(Number.isInteger(index))setActive(index);
      if(event.type==='mousedown')event.preventDefault?.();
    }
    function onPanelClick(event){
      const option=event.target?.closest?.('[data-secretary-mention-index]');if(!option||!panel.contains(option))return;
      const index=Number(option.dataset.secretaryMentionIndex);if(Number.isInteger(index))select(index);
    }
    function onDocumentPointer(event){if(event.target!==composer&&!panel.contains(event.target))close();}
    function destroy(){
      if(destroyed)return;
      reset();destroyed=true;composer.removeEventListener('input',onInput);composer.removeEventListener('click',onSelection);
      composer.removeEventListener('select',onSelection);composer.removeEventListener('blur',onBlur);panel.removeEventListener('mousedown',onPanelPointer);
      panel.removeEventListener('pointerdown',onPanelPointer);panel.removeEventListener('click',onPanelClick);doc.removeEventListener?.('pointerdown',onDocumentPointer);
      panel.remove();if(!hostHadClass)host.classList?.remove('secretary-mentions-host');
      for(const [name,value] of Object.entries(oldAttributes))restoreAttribute(composer,name,value);
      if(instances.get(composer)===controller)instances.delete(composer);
    }
    const controller=Object.freeze({handleKey,snapshot,reset,refresh,destroy});instances.set(composer,controller);
    composer.addEventListener('input',onInput);composer.addEventListener('click',onSelection);composer.addEventListener('select',onSelection);
    composer.addEventListener('blur',onBlur);panel.addEventListener('mousedown',onPanelPointer);panel.addEventListener('pointerdown',onPanelPointer);
    panel.addEventListener('click',onPanelClick);doc.addEventListener?.('pointerdown',onDocumentPointer);
    authorize();return controller;
  }

  return Object.freeze({mount});
});
