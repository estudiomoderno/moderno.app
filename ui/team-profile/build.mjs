import {build} from 'esbuild';
import {readFile,writeFile,copyFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const dir=fileURLToPath(new URL('.',import.meta.url)),repo=path.resolve(dir,'../..'),out=path.join(repo,'app/brand/reui');
await mkdir(out,{recursive:true});
const result=await build({entryPoints:[path.join(dir,'index.tsx')],outfile:path.join(repo,'app/profile-component.js'),bundle:true,minify:true,metafile:true,format:'iife',globalName:'ModernoProfileComponent',jsx:'automatic',target:['es2022'],define:{'process.env.NODE_ENV':'"production"'},legalComments:'linked',banner:{js:'/*! ReUI MIT: /brand/reui/LICENSE-ReUI.txt. Dependency licenses: /brand/reui/THIRD-PARTY-LICENSES.txt. */'},alias:{'@/registry/bases/base/ui/scroll-area':path.join(dir,'vendor/reui/scroll-area.tsx'),'@/registry/bases/base/ui/separator':path.join(dir,'vendor/reui/separator.tsx'),'@/app/(create)/components/icon-placeholder':path.join(dir,'icon-placeholder.tsx')}});
const packages=new Set(Object.keys(result.metafile.inputs).map(name=>name.match(/(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1]).filter(Boolean));
const licenses=[];for(const name of [...packages].sort()){const folder=path.join(dir,'node_modules',name),meta=JSON.parse(await readFile(path.join(folder,'package.json'),'utf8'));const names=(await readdir(folder)).filter(file=>/^licen[cs]e(?:\.|$)/i.test(file));if(!names.length)throw Error('Falta licencia de '+name);for(const file of names)licenses.push(name+' '+meta.version+'\n'+await readFile(path.join(folder,file),'utf8'));}
await writeFile(path.join(out,'THIRD-PARTY-LICENSES.txt'),licenses.join('\n\n--------------------\n\n'));
const css=spawnSync(process.execPath,[path.join(dir,'node_modules/@tailwindcss/cli/dist/index.mjs'),'-i',path.join(dir,'component.css'),'-o',path.join(out,'team-profile.css'),'--minify'],{cwd:dir,encoding:'utf8'});if(css.status!==0)throw Error(css.stderr||css.stdout);
await copyFile(path.join(dir,'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),path.join(out,'inter-latin-wght-normal.woff2'));
await copyFile(path.join(dir,'node_modules/@fontsource-variable/inter/LICENSE'),path.join(out,'LICENSE-Inter.txt'));
// CSS property registrations must be document-wide for Shadow DOM. No global
// selectors: these are the original Tailwind initial values, not app styles.
const properties=(await readFile(path.join(out,'team-profile.css'),'utf8')).match(/@property\s+[^{}]+\{[^{}]*\}/g)||[];
await writeFile(path.join(out,'font.css'),'@font-face{font-family:"Moderno ReUI Inter";font-style:normal;font-weight:100 900;font-display:swap;src:url("/brand/reui/inter-latin-wght-normal.woff2") format("woff2")}\n'+properties.join('\n')+'\n');
const sources=[];async function walk(folder){for(const item of await readdir(folder,{withFileTypes:true})){if(item.name==='node_modules'||item.name==='build-manifest.json')continue;const file=path.join(folder,item.name);if(item.isDirectory())await walk(file);else sources.push(path.relative(repo,file));}}await walk(dir);
const outputs=['app/profile-component.js','app/profile-component.js.LEGAL.txt','app/brand/reui/team-profile.css','app/brand/reui/inter-latin-wght-normal.woff2','app/brand/reui/font.css','app/brand/reui/LICENSE-ReUI.txt','app/brand/reui/LICENSE-Inter.txt','app/brand/reui/THIRD-PARTY-LICENSES.txt'];
const manifest={};for(const name of [...sources.sort(),...outputs])manifest[name]=createHash('sha256').update(await readFile(path.join(repo,name))).digest('hex');
await writeFile(path.join(dir,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Componente original compilado; JS, CSS, fuente y manifiesto locales.');
