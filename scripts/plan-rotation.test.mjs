import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {sourcePoint}=createRequire(import.meta.url)('../app/plan-editor.js');
test('drawing on each rotated page maps back to the same original coordinate',()=>{
 const source={x:.25,y:.75},views=[{x:.25,y:.75},{x:.25,y:.25},{x:.75,y:.25},{x:.75,y:.75}];
 views.forEach((view,turns)=>{assert.deepEqual(sourcePoint(view,turns),source);assert.deepEqual(sourcePoint(view,turns+4),source);});
 assert.deepEqual(sourcePoint(views[3],-1),source);
});
