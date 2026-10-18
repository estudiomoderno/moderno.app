import test from 'node:test';import assert from 'node:assert/strict';
import {verifyPublication} from './verify-app-publication.mjs';
test('publication checks every public entry/module with no credentials and a fixed host',async()=>{
 const seen=[];await verifyPublication({readResource:async name=>Buffer.from(name),revision:'fictional-revision',fetchResource:async(url,options)=>{assert.equal(url.hostname,'app.moderno.app');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(url.searchParams.get('publication'),'fictional-revision');const name=url.pathname==='/'?'index.html':url.pathname.slice(1);seen.push(name);return new Response(name);}});
 assert.equal(seen.length,14);assert.ok(seen.includes('index.html')&&seen.includes('accounting-report.js')&&seen.includes('accounting-report.css')&&seen.includes('plan-editor.css')&&seen.includes('client-portal-site.js')&&seen.includes('client-portal-site.css')&&seen.includes('brand/project-ui.css')&&seen.includes('desktop-shell.js')&&seen.includes('brand/desktop-shell.css')&&seen.includes('brand/desktop-project-overview.css'));
});
test('HTTP success cannot disguise an old entry, login proxy, or changed asset',async()=>{
 await assert.rejects(verifyPublication({readResource:async()=>Buffer.from('expected'),fetchResource:async()=>new Response('old or intermediary page')}),/no coincide/);
 await assert.rejects(verifyPublication({readResource:async()=>Buffer.from('expected'),fetchResource:async()=>new Response('missing',{status:404})}),/HTTP 404/);
});
