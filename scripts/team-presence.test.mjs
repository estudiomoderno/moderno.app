import test from 'node:test';
import assert from 'node:assert/strict';
import presence from '../app/team-presence.js';
test('presence ignores own sessions, malformed payloads and bounds displayed names',()=>{
 const result=presence.peers({a:[{user:'me',session:'1',name:'Yo'},{user:'other',session:'2',name:'A'.repeat(100)},{user:'other',session:'3',name:'Ana'},null,{mail:'private',name:'Legacy'}]},'me');
 assert.equal(result.size,2);assert.equal(result.get('2').name.length,60);assert.equal(result.has('1'),false);
});
test('cursor rejects other page, invalid coordinates and unbounded DOM paths',()=>{
 const p={session:'abc',room:'room',path:[0,2],tag:'DIV',x:.2,y:.3};
 assert.equal(presence.validPointer(p,'room'),true);
 for(const bad of [{room:'other'},{x:Infinity},{y:-1},{path:[-1]},{path:new Array(21).fill(0)},{path:['__proto__']},{path:[]},{x:'0.2'}])assert.equal(presence.validPointer({...p,...bad},'room'),false);
});
test('avatars use two initials',()=>assert.equal(presence.initials('  Ana María López '),'AM'));

test('presence photos reject active content and oversized payloads',()=>{assert.equal(presence.avatar('javascript:alert(1)'),'');assert.equal(presence.avatar('data:image/svg+xml;base64,AAAA'),'');assert.equal(presence.avatar('https://example.com/'+'a'.repeat(300000)),'');assert.equal(presence.avatar('https://example.com/photo.jpg'),'https://example.com/photo.jpg');});
