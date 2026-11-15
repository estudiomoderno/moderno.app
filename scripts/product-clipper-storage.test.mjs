import test from 'node:test';import assert from 'node:assert/strict';
import {signCaptureImage,uploadCaptureImage} from '../supabase/functions/product-clipper/storage.mjs';

const study='22222222-2222-4222-8222-222222222222',capture='11111111-1111-4111-8111-111111111111',actorId='33333333-3333-4333-8333-333333333333';
const path=`${study}/clipper/${capture}/${'a'.repeat(64)}.jpg`;
function fixture({row={id:capture},accessError=null,uploadError=null,signError=null}={}){
 const filters=[],uploads=[],signatures=[];const query={select(value){assert.equal(value,'id');return this;},eq(key,value){filters.push([key,value]);return this;},async maybeSingle(){return {data:row,error:accessError};}};
 const bucket={async upload(...args){uploads.push(args);return {error:uploadError};},getPublicUrl(value){return {data:{publicUrl:'https://storage.example/'+value}};},async createSignedUrl(...args){signatures.push(args);return {data:{signedUrl:'https://signed.example/'+args[0]},error:signError};}};
 return {actor:{id:actorId,client:{from(table){assert.equal(table,'productos_entrantes');return query;}}},server:{storage:{from(name){assert.equal(name,'archivos');return bucket;}}},filters,uploads,signatures};
}
test('large-session uploads recheck user access before the server-side Storage write',async()=>{
 const f=fixture(),bytes=new Uint8Array([1,2,3]);
 const url=await uploadCaptureImage({...f,path,bytes,contentType:'image/jpeg'});
 assert.equal(url,'https://storage.example/'+path);
 assert.deepEqual(f.filters,[['id',capture],['estudio_id',study],['actor',actorId],['estado','procesando']]);
 assert.equal(f.uploads.length,1);assert.equal(f.uploads[0][0],path);assert.equal(f.uploads[0][1],bytes);assert.deepEqual(f.uploads[0][2],{contentType:'image/jpeg',upsert:false,cacheControl:'31536000'});
});
test('invalid paths and revoked capture access never reach privileged Storage',async()=>{
 const invalid=fixture();await assert.rejects(uploadCaptureImage({...invalid,path:'../outside.jpg',bytes:new Uint8Array(),contentType:'image/jpeg'}),{code:'invalid_storage_path'});assert.equal(invalid.uploads.length,0);
 const denied=fixture({row:null});await assert.rejects(uploadCaptureImage({...denied,path,bytes:new Uint8Array(),contentType:'image/jpeg'}),{code:'42501'});assert.equal(denied.uploads.length,0);
});
test('Storage failures remain failures and are never reported as uploaded',async()=>{
 const error=Object.assign(new Error('Storage rejected upload'),{code:'storage_error'}),f=fixture({uploadError:error});
 await assert.rejects(uploadCaptureImage({...f,path,bytes:new Uint8Array(),contentType:'image/jpeg'}),error);
});
test('preview signing rechecks user access but does not require a processing capture',async()=>{
 const f=fixture(),url=await signCaptureImage({...f,path,expiresIn:60});
 assert.equal(url,'https://signed.example/'+path);assert.deepEqual(f.filters,[['id',capture],['estudio_id',study],['actor',actorId]]);assert.deepEqual(f.signatures,[[path,60]]);
});
test('preview signing never uses privileged Storage after access is revoked',async()=>{
 const f=fixture({row:null});await assert.rejects(signCaptureImage({...f,path}),{code:'42501'});assert.equal(f.signatures.length,0);
});
