// Read-only rehearsal. Input is a local JSON export via stdin; output has counts only.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import spec from '../app/specifications.js';
const input=JSON.parse(readFileSync(0,'utf8'));
const projects=Array.isArray(input)?input:input.projects||input.state?.projects;
if(!Array.isArray(projects))throw Error('Se requiere un JSON con projects o state.projects');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const protectedContent=p=>spec.rows(p).map(({item})=>{const {id,...rest}=item;return rest;});
let items=0,refs=0,unresolved=0;let serial=0;
for(const original of projects){
 const candidate=structuredClone(original),before=hash(protectedContent(original));
 spec.prepare(candidate,()=>`rehearsal-${++serial}`);spec.reindex(candidate);
 if(hash(protectedContent(candidate))!==before)throw Error('El ensayo cambió información protegida de productos');
 const snapshot=JSON.stringify(candidate);spec.prepare(candidate);spec.reindex(candidate);
 if(JSON.stringify(candidate)!==snapshot)throw Error('El ensayo no es idempotente');
 items+=spec.rows(candidate).length;
 for(const pr of candidate.pres||[])for(const page of pr.pages||[])for(const ref of page.els||[])if(['prod','pin'].includes(ref.t)){refs++;if(!spec.resolve(candidate,ref))unresolved++;}
}
console.log(JSON.stringify({projects:projects.length,items,presentationReferences:refs,unresolvedReferences:unresolved,productFieldsPreserved:true,idempotent:true,writes:0}));
