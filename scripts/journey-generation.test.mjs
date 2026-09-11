import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
test('journey SQL retains dollar-quoted blocks and always rolls back',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'moderno-journey-'));
 try{const out=path.join(dir,'probe.sql');execFileSync(process.execPath,[fileURLToPath(new URL('./build-journey-probe.mjs',import.meta.url)),out]);const sql=fs.readFileSync(out,'utf8');assert.match(sql,/do \$\$declare/);assert.doesNotMatch(sql,/^commit;/mi);assert.match(sql,/rollback;\s*$/i);assert.ok(sql.includes('gestoria_sin_registro_comercial'));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('project generate quotation retains product references and project identity',async()=>{
 const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8'),p={id:7,rooms:[]};const lines=[{name:'Silla',source:{project:7}}];const c={_accessRole:'admin',ESTUDIO_ID:'s',state:{projects:[p],clients:[],account:{vat:21}},specPrepare(){},persistNow(){},cloudFlush:async()=>{},_cloudBusy:false,_saveErr:false,_cloudHash:{proyectos:'ok'},CLOUD_BLOCKS:{proyectos:{get:()=>[p]}},canon:()=> 'ok',ModernoSpec:{rows:()=>[{item:{}}]},ProjectQuotes:{line:()=>lines[0]},retPct:()=>15,toast(){},go(){}};
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf('async function listToQuote('),html.indexOf('function delQuote(')),c);await c.listToQuote(7);assert.equal(c.state.draft.projectId,7);assert.equal(c.state.draft.lines[0].source.project,7);
});
