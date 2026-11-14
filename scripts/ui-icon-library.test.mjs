import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root=path.resolve(import.meta.dirname,'..');
const iconDir=path.join(root,'app','brand','icons','ui');

test('la biblioteca renovada contiene los 76 SVG seguros',async()=>{
 const files=(await readdir(iconDir)).filter(file=>file.endsWith('.svg')).sort();
 assert.equal(files.length,76);
 assert.equal(new Set(files).size,files.length);
 for(const file of files){
  const source=await readFile(path.join(iconDir,file),'utf8');
  assert.match(source,/^<svg\b/i,file);
  assert.doesNotMatch(source,/<(?:script|foreignObject)\b|\bon\w+\s*=|javascript:|data:text\/html/i,file);
 }
});

test('los iconos generales heredan color y están conectados sin alterar las herramientas de planos',async()=>{
 const [html,projectUi,documents,header,menu]=await Promise.all([
  readFile(path.join(root,'app','index.html'),'utf8'),
  readFile(path.join(root,'app','project-ui.js'),'utf8'),
  readFile(path.join(root,'app','project-documents.js'),'utf8'),
  readFile(path.join(root,'app','header-actions.js'),'utf8'),
  readFile(path.join(root,'app','brand','menu-finish.css'),'utf8'),
 ]);
 assert.match(html,/\.ui-icon-asset\{[^}]*background:currentColor[^}]*mask:var\(--ui-icon\)/);
 assert.match(projectUi,/collaborate:'colaborar-con-cliente'/);
 assert.match(projectUi,/projectUiIcon\(icons\[key\],'shopping-action-icon'\)/);
 assert.match(documents,/uiIcon\('guardar-como-copia'\)/);
 assert.match(documents,/uiIcon\('eliminar'\)/);
 assert.match(header,/uiIcon\('notificaciones'\)/);
 assert.match(menu,/brand\/icons\/ui\/proyecto\.svg/);
});
