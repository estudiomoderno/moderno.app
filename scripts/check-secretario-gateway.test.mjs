import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSecretaryGateway} from './check-secretario-gateway.mjs';

const endpoint='https://cgqtylvaapwbuwqvpjtb.supabase.co/functions/v1/secretario';
const html=`const SUPABASE_ANON_KEY = "sb_publishable_fixture";window.MODERNO_SECRETARY_CONFIG=Object.freeze({enabled:true,endpoint:"${endpoint}",feedbackEnabled:false});`;
const headers=values=>new Headers(values);
function fixture(changes={}){
  const calls=[];
  const fetcher=async(url,options)=>{
    calls.push([url,options]);
    if(options.method==='OPTIONS')return {ok:true,status:200,headers:headers({
      'Access-Control-Allow-Origin':'https://app.moderno.app',
      'Access-Control-Allow-Methods':'POST, OPTIONS',
      'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
      ...changes.preflightHeaders
    }),...changes.preflight};
    return {ok:false,status:401,headers:headers({'Access-Control-Allow-Origin':'https://app.moderno.app','Content-Type':'application/json',...changes.gatewayHeaders}),json:async()=>({error:{code:'unauthorized'},requestId:'fixture-request'}),...changes.gateway};
  };
  return {calls,fetcher};
}

test('production probe validates CORS and reaches the protected handler without a session',async()=>{
  const f=fixture(),result=await checkSecretaryGateway({html,fetcher:f.fetcher});
  assert.deepEqual(result,{ok:true,preflight:200,gateway:401});
  assert.equal(f.calls.length,2);
  assert.equal(f.calls[0][0],endpoint);assert.equal(f.calls[0][1].method,'OPTIONS');
  assert.equal(f.calls[0][1].headers['Access-Control-Request-Headers'],'authorization,apikey,content-type');
  assert.equal(f.calls[1][1].method,'POST');assert.equal(f.calls[1][1].credentials,'omit');
  assert.equal(f.calls[1][1].headers.apikey,'sb_publishable_fixture');
  assert.equal(f.calls[1][1].headers.Authorization,'Bearer probe');
  assert.equal(f.calls[1][1].body,'{}');
  assert.ok(!JSON.stringify(result).includes('sb_publishable'));
});

test('probe fails closed for another endpoint or malformed public configuration',async()=>{
  const f=fixture();
  await assert.rejects(checkSecretaryGateway({html:html.replace(endpoint,'https://auth.moderno.app/functions/v1/secretario'),fetcher:f.fetcher}),/no reconocida/);
  await assert.rejects(checkSecretaryGateway({html:html.replace('sb_publishable_fixture','not-a-public-key'),fetcher:f.fetcher}),/no reconocida/);
  assert.equal(f.calls.length,0);
});

test('probe rejects incomplete preflight and gateway responses before reporting healthy',async()=>{
  for(const changes of [
    {preflightHeaders:{'Access-Control-Allow-Origin':'https://outside.invalid'}},
    {preflightHeaders:{'Access-Control-Allow-Headers':'authorization, content-type'}},
    {preflight:{ok:false,status:503}},
    {gateway:{status:400,json:async()=>null}},
    {gatewayHeaders:{'Content-Type':'text/html'}}
  ])await assert.rejects(checkSecretaryGateway({html,fetcher:fixture(changes).fetcher}));
});
