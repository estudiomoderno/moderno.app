import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {SecretarioError} from './core.mjs';
import {createSecretaryHandler} from './handler.mjs';

const names=['SUPABASE_URL','SUPABASE_ANON_KEY','OPENAI_API_KEY','OPENAI_MODEL','SECRETARY_ENABLED','SECRETARY_ENVIRONMENT','SECRETARY_ALLOWED_PROJECT_REF','SECRETARY_ALLOWED_ORIGINS'];
const env=Object.fromEntries(names.map(name=>[name,Deno.env.get(name)||'']));

Deno.serve(createSecretaryHandler({env,authenticate:async(token:string)=>{
 const client=createClient(env.SUPABASE_URL,env.SUPABASE_ANON_KEY,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.getUser(token);
 if(error||!data.user)throw new SecretarioError('unauthorized','Inicia sesión de nuevo para continuar.',401);
 return {userId:data.user.id,client};
}}));
