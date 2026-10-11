/* Plan annotations: independent from original files. Persistence must be supplied by an authorized backend. */
var ModernoPlanAnnotations=(()=>{
 const tools=['pen','highlight','arrow','rect','ellipse','text','note'];
 const clone=v=>JSON.parse(JSON.stringify(v));
 function point(x,y,rect){if(!rect||rect.width<=0||rect.height<=0)throw Error('Área de dibujo no válida');return {x:Math.max(0,Math.min(1,(x-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(y-rect.top)/rect.height))};}
 function annotation(value,pages){
  const a=clone(value);
  if(!tools.includes(a.type)||!Number.isInteger(a.page)||a.page<1||a.page>pages||typeof a.id!=='string'||!a.id||a.id.length>100)throw Error('Anotación no válida');
  if(!/^#[a-f0-9]{6}$/i.test(a.color)||!Number.isFinite(a.width)||a.width<1||a.width>30)throw Error('Estilo no válido');
  if(!Array.isArray(a.points)||!a.points.length||a.points.length>10000||a.points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1))throw Error('Coordenadas no válidas');
  a.text=String(a.text||'');if(a.text.length>1000)throw Error('Texto demasiado largo');
  return a;
 }
 class Model{
  constructor({reference,pages,authorize=()=>false}){
   if(!Number.isInteger(pages)||pages<1||pages>100)throw Error('Máximo 100 páginas');
   for(const k of ['studyId','projectId','fileId','revisionId'])if(!String(reference?.[k]||''))throw Error('Referencia incompleta');
   this.reference=Object.freeze({...reference});this.pages=pages;this.authorize=authorize;this.items=[];this.undoStack=[];this.redoStack=[];this.revision=null;this.dirty=false;this.saving=false;
  }
  check(edit=false){if(!this.authorize(edit))throw Error('No autorizado');}
  snapshot(){this.check();return {schema:1,reference:{...this.reference},pages:this.pages,annotations:clone(this.items)};}
  load(record,revision){this.check();if(record.schema!==1||record.pages!==this.pages||Object.keys(this.reference).some(k=>record.reference?.[k]!==this.reference[k]))throw Error('Documento o revisión distintos');
   if(!Array.isArray(record.annotations)||record.annotations.length>2000)throw Error('Demasiadas anotaciones');
   const validated=record.annotations.map(a=>annotation(a,this.pages));if(new Set(validated.map(a=>a.id)).size!==validated.length)throw Error('Identificadores duplicados');
   this.items=validated;this.revision=revision;this.undoStack=[];this.redoStack=[];this.dirty=false;
  }
  change(fn){this.check(true);const before=clone(this.items);fn();this.undoStack.push(before);if(this.undoStack.length>50)this.undoStack.shift();this.redoStack=[];this.dirty=true;}
  add(value){const a=annotation(value,this.pages);if(this.items.length>=2000||this.items.some(x=>x.id===a.id))throw Error('Límite o identificador duplicado');this.change(()=>this.items.push(a));}
  remove(id){if(this.items.some(a=>a.id===id))this.change(()=>this.items=this.items.filter(a=>a.id!==id));}
  undo(){this.check(true);if(!this.undoStack.length)return;this.redoStack.push(clone(this.items));this.items=this.undoStack.pop();this.dirty=true;}
  redo(){this.check(true);if(!this.redoStack.length)return;this.undoStack.push(clone(this.items));this.items=this.redoStack.pop();this.dirty=true;}
  async save(adapter){this.check(true);if(typeof adapter?.write!=='function')throw Error('Guardado integrado pendiente de verificar');if(this.saving)throw Error('Guardado en curso');
   const record=this.snapshot(),base=this.revision;this.saving=true;
   try{const result=await adapter.write({record,base});this.check(true);if(!result||typeof result.revision!=='string'||!result.revision||result.revision===base)throw Error('Confirmación de guardado no válida');
    this.revision=result.revision;this.dirty=JSON.stringify(record)!==JSON.stringify(this.snapshot());return result;
   }finally{this.saving=false;}
  }
 }
 return {Model,point,annotation,tools};
})();
if(typeof module!=='undefined')module.exports=ModernoPlanAnnotations;
