import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),base=new URL('ui/team-profile/',root);
test('the original ReUI components retain their upstream source identity',async()=>{
 const source=JSON.parse(await readFile(new URL('vendor/reui/SOURCE.json',base),'utf8'));
 assert.equal(source.repository,'https://github.com/keenthemes/reui');
 for(const [name,info] of Object.entries(source.files)){
  let text=await readFile(new URL('vendor/reui/'+name,base),'utf8');
  if(name==='dropdown-menu.tsx')text=text.replace('  className,\n  container,\n  ...props\n}: MenuPrimitive.Popup.Props & {container?: HTMLElement}','  className,\n  ...props\n}: MenuPrimitive.Popup.Props').replace('<MenuPrimitive.Portal container={container}>','<MenuPrimitive.Portal>');
  const bytes=Buffer.from(text),blob=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
  assert.equal(blob,info.git_blob,name+' differs from the original source beyond the declared portal adaptation');
 }
});
test('the published profile artifacts match the checked-in sources and local font',async()=>{
 const manifest=JSON.parse(await readFile(new URL('build-manifest.json',base),'utf8'));
 for(const [name,expected] of Object.entries(manifest)){
  assert.ok(!name.includes('..')&&!name.includes('node_modules'));
  assert.equal(createHash('sha256').update(await readFile(new URL(name,root))).digest('hex'),expected,name+' needs rebuilding');
 }
 for(const name of ['app/profile-component.js','app/brand/reui/team-profile.css','app/brand/reui/font.css','app/brand/reui/inter-latin-wght-normal.woff2','ui/team-profile/package-lock.json'])assert.ok(manifest[name]);
 new vm.Script(await readFile(new URL('app/profile-component.js',root),'utf8'));
 const html=await readFile(new URL('app/index.html',root),'utf8');
 assert.ok(html.indexOf('/profile-component.js?v=36552')<html.indexOf('/header-actions.js?v=36552'));
});
