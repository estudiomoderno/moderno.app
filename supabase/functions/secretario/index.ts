import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {SecretarioError} from './core.mjs';
import {createSecretaryHandler} from './handler.mjs';

const names=['SUPABASE_URL','SUPABASE_ANON_KEY','OPENAI_API_KEY','OPENAI_MODEL','SECRETARY_ENABLED','SECRETARY_ENVIRONMENT','SECRETARY_ALLOWED_PROJECT_REF','SECRETARY_ALLOWED_ORIGINS','SECRETARY_ALLOWED_USER_IDS'];
const env=Object.fromEntries(names.map(name=>[name,Deno.env.get(name)||'']));

Deno.serve(createSecretaryHandler({env,logger:console,authenticate:async(token:string)=>{
 try{
  // ES256 sessions are verified locally against this project's cached JWKS.
  // Sending this account's unusually large JWT back to Auth as a header would
  // exceed the hosted gateway limit before Auth could validate it.
  const verifier=createClient(env.SUPABASE_URL,env.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await verifier.auth.getClaims(token);const claims=data?.claims;
  if(error||!claims||claims.role!=='authenticated'||typeof claims.sub!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claims.sub))throw Error('invalid claims');
  const client=createClient(env.SUPABASE_URL,env.SUPABASE_ANON_KEY,{accessToken:async()=>token,auth:{persistSession:false,autoRefreshToken:false}});
  return {userId:claims.sub,client};
 }catch{throw new SecretarioError('unauthorized','Inicia sesión de nuevo para continuar.',401);}
}}));
