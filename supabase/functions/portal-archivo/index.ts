import {createClient} from 'npm:@supabase/supabase-js@2';
import {createHandler} from './core.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
const publicClient=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
// Explicit aliases preserve existing references after restoring to a new project.
const origins=[new URL(url).origin,...(Deno.env.get('STORAGE_REFERENCE_ORIGINS')||'https://auth.moderno.app,https://cgqtylvaapwbuwqvpjtb.supabase.co').split(',').filter(Boolean).map(x=>new URL(x).origin)];
Deno.serve(createHandler({origins,
 async readPortal(token:string,type:string){
  const {data,error}=await publicClient.rpc(type==='obra'?'portal_obra_lee':'portal_cliente_lee',{p_token:token});
  if(error)throw error;return data;
 },
 async sign(path:string,seconds:number){
  const {data,error}=await admin.storage.from('archivos').createSignedUrl(path,seconds);
  if(error||!data?.signedUrl)throw error||new Error('No disponible');return data.signedUrl;
 }
}));
