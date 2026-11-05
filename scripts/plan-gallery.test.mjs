import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../app/plan-gallery.js',import.meta.url),'utf8');
const docs=readFileSync(new URL('../app/project-documents.js',import.meta.url),'utf8');
function fixture(){const c=vm.createContext({});vm.runInContext(code,c);vm.runInContext(docs,c);return c;}
test('final plan gallery preserves indices and file data while exposing existing actions',()=>{
 const c=fixture(),p={id:8,obraPlanos:[{name:'<Plano "A">.pdf',data:'private:secret',type:'application/pdf'},{name:'Plano B.png',data:'private:other'}]},before=JSON.stringify(p);
 const out=c.ModernoPlanGallery.html(p);assert.equal(JSON.stringify(p),before);
 assert.match(out,/obraPlanoView\(8,0\)/);assert.match(out,/obraPlanoView\(8,1\)/);assert.match(out,/obraPlanoDel\(8,1\)/);assert.match(out,/obraPlanoPick\(8\)/);
 assert.match(out,/&lt;Plano &quot;A&quot;&gt;/);assert.doesNotMatch(out,/private:|obraPlanosToggle|Desplegar/);
});
test('regular plans preview correct original indices and retain annotations and permissions',()=>{
 const c=fixture(),p={id:9,files:[{name:'doc.pdf'},{name:'Plan.pdf',cat:'plano',data:'private:source',cli:false}]};
 const out=c.ModernoProjectDocuments.card(p,1);assert.match(out,/data-collection="files"/);assert.match(out,/data-index="1"/);assert.match(out,/Ver y anotar/);assert.match(out,/Oculto al cliente/);assert.match(out,/project-file-category/);assert.doesNotMatch(out,/private:source/);
 assert.doesNotMatch(c.ModernoProjectDocuments.card(p,0),/data-plan-preview/);
});
