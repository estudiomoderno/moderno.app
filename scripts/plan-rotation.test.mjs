import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {sourcePoint,pdfRasterScale}=createRequire(import.meta.url)('../app/plan-editor.js');
test('drawing on each rotated page maps back to the same original coordinate',()=>{
 const source={x:.25,y:.75},views=[{x:.25,y:.75},{x:.25,y:.25},{x:.75,y:.25},{x:.75,y:.75}];
 views.forEach((view,turns)=>{assert.deepEqual(sourcePoint(view,turns),source);assert.deepEqual(sourcePoint(view,turns+4),source);});
 assert.deepEqual(sourcePoint(views[3],-1),source);
});
test('PDF raster quality follows screen density and stays inside its memory limit',()=>{
 const previous=globalThis.devicePixelRatio;
 Object.defineProperty(globalThis,'devicePixelRatio',{value:1,writable:true,configurable:true});
 assert.equal(pdfRasterScale(600,800),3);
 globalThis.devicePixelRatio=2;assert.equal(pdfRasterScale(600,800),6);
 assert.ok(Math.abs(pdfRasterScale(2000,2000)-Math.sqrt(5))<1e-12);
 assert.throws(()=>pdfRasterScale(5000,5000),/demasiado grande/);
 if(previous===undefined)delete globalThis.devicePixelRatio;else globalThis.devicePixelRatio=previous;
});
