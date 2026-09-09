export function allowedPaths(payload,type,origins) {
 const project=payload?.proyecto;
 if(!project || !payload.estudio_id) return new Set();
 const files=[...(project.files||[]).filter(f=>f&&f.cli!==false),{url:payload.marca?.logo}];
 if(type==='obra'){
  files.push(...(project.obraPlanos||[]));
  for(const phase of project.obraF||[]) for(const item of phase.items||[]) if(item.file)files.push(item.file);
 }
 const paths=new Set();
 for(const f of files){
  const source=f?.url||f?.data;
  if(typeof source!=='string')continue;
  let path;
  if(source.startsWith('storage://archivos/'))path=source.slice(19);
  else {
   let url;try{url=new URL(source);}catch{continue;}
   if(!origins.includes(url.origin)||url.username||url.password)continue;
   const m=/^\/storage\/v1\/object\/(?:public|authenticated)\/archivos\/(.+)$/.exec(url.pathname);
   if(!m)continue;try{path=decodeURIComponent(m[1]);}catch{continue;}
  }
  if(path.split('/')[0]!==payload.estudio_id || path.includes('\\') || /[\x00-\x1f?#%]/.test(path) || path.split('/').some(x=>!x||x==='.'||x==='..'))continue;
  paths.add(path);
 }
 return paths;
}
export function createHandler({readPortal,sign,origins}){
 return async req=>{
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
  const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply(405,{error:'Método no permitido'});
  try{
   const body=await req.text();if(body.length>4096)return reply(413,{error:'Petición demasiado grande'});
   const {token,type,path}=JSON.parse(body);
   if(typeof token!=='string'||!/^[a-zA-Z0-9]{6,128}$/.test(token)||!['cliente','obra'].includes(type)||typeof path!=='string'||path.length>1024)return reply(400,{error:'Petición no válida'});
   const data=await readPortal(token,type);
   if(!allowedPaths(data,type,origins).has(path))return reply(403,{error:'Archivo no autorizado'});
   const url=await sign(path,60);
   return reply(200,{url,expiresIn:60});
  }catch{return reply(403,{error:'No se pudo autorizar el archivo'});}
 };
}
