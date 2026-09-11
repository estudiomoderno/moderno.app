import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('new brand preserves supplied path and transform without active SVG content',()=>{
 const original=read('app/brand/simbolo-original.svg');
 for(const name of ['simbolo-grafito.svg','simbolo-claro.svg','favicon.svg']){const svg=read('app/brand/'+name);assert.equal(svg.match(/\sd="([^"]+)"/)[1],original.match(/\sd="([^"]+)"/)[1]);assert.equal(svg.match(/transform="([^"]+)"/)[1],original.match(/transform="([^"]+)"/)[1]);assert.doesNotMatch(svg,/<script|<foreignObject|\bhref=|\bon\w+=|url\(/i);}
});
test('document fallback stays on original wordmark independently of app identity',()=>{
 const html=read('app/index.html');const source=html.match(/function legacyDocumentLogo\(\)\{[^}]+\}/)[0];
 const context={};vm.runInNewContext(source+';result=legacyDocumentLogo()',context);assert.match(context.result,/src="\/brand\/modernoapp-grafito.svg"/);
 assert.doesNotMatch(html,/document\.querySelector\("\.logo"\)\.outerHTML/);assert.match(html,/function pdfFoot\(extra\)\{\s+return[^\n]+fileImageAttrs\("\/brand\/modernoapp-grafito.svg"\)/);
});
