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
  if(name==='alert-dialog.tsx')text=text.replace('  size = \"default\",\n  container,\n  ...props','  size = \"default\",\n  ...props').replace('  container?: HTMLElement\n','').replace('<AlertDialogPortal container={container}>','<AlertDialogPortal>');
  if(name==='autocomplete.tsx')text=text.replace('  showBackdrop?: boolean\n  container?: HTMLElement\n','  showBackdrop?: boolean\n').replace('  anchor,\n  container,\n  ...props','  anchor,\n  ...props').replace('<AutocompletePortal container={container}>','<AutocompletePortal>');
  if(['popover.tsx','tooltip.tsx','select.tsx'].includes(name)){const primitive=name.split('.')[0].replace(/^./,c=>c.toUpperCase())+'Primitive';text=text.replace('  className,\n  container,','  className,').replace('  > & {container?: HTMLElement}) {','  >) {').replace('<'+primitive+'.Portal container={container}>','<'+primitive+'.Portal>');}
  if(name==='event-calendar/event-calendar-dnd.tsx')for(const el of ['carryEl','hintEl'])text=text.replace(';((origin.getRootNode() as ShadowRoot).querySelector?.(".reui-portals") ?? document.body).appendChild('+el+')','document.body.appendChild('+el+')');
  if(name==='event-calendar/event-calendar-month-view.tsx')text=text.replace('  const instance = useEventCalendar() // Moderno: overflow reservation\n','').replace(/  \/\/ Moderno: reserve a row[\s\S]*?  \/\/ Moderno: end overflow reservation.\n/,'').replace('const visibleBars = bars.filter((b) => (b.lane ?? 0) < barCap)','const visibleBars = bars.filter((b) => (b.lane ?? 0) < cap)').replace('.filter((b) => (b.lane ?? 0) >= barCap && covers(b, offsets[col]))','.filter((b) => (b.lane ?? 0) >= cap && covers(b, offsets[col]))');
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
 for(const name of ['app/calendar-component.js','app/profile-component.js','app/brand/reui/team-profile.css','app/brand/reui/font.css','app/brand/reui/inter-latin-wght-normal.woff2','ui/team-profile/package-lock.json'])assert.ok(manifest[name]);
 for(const name of ['app/profile-component.js','app/calendar-component.js'])new vm.Script(await readFile(new URL(name,root),'utf8'));
 const html=await readFile(new URL('app/index.html',root),'utf8');
 const profile=html.indexOf('/profile-component.js?');assert.ok(profile>=0&&profile<html.indexOf('/header-actions.js?v=36554'));
});
