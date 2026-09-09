import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');const code=html.slice(html.indexOf('async function prepareAppReload(){'),html.indexOf('async function versionSentinel(){'));
function context({quota=false,busy=false,conflict=false}={}){
 const ctx={_saveErr:false,_cloudBusy:busy,sb:{},ESTUDIO_ID:'ficticio',CLOUD_BLOCKS:{proyectos:{get:()=>['nuevo']}},_cloudHash:{proyectos:'[]'},canon:JSON.stringify,toast(){},persistNow(){ctx._saveErr=quota;},async cloudFlush(){if(!busy&&!conflict)ctx._cloudHash.proyectos='["nuevo"]';}};
 vm.createContext(ctx);vm.runInContext(code,ctx);return ctx;
}
test('reload waits until the exact local changes are saved',async()=>assert.equal(await context().prepareAppReload(),true));
test('reload is refused when local copy fails',async()=>assert.equal(await context({quota:true}).prepareAppReload(),false));
test('reload is refused during an in-flight save',async()=>assert.equal(await context({busy:true}).prepareAppReload(),false));
test('reload is refused when a conflict remains',async()=>assert.equal(await context({conflict:true}).prepareAppReload(),false));
